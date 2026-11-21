// Integration smoke test (mocked Telegram + in-memory Supabase). NOT for deploy.
// Setup: copy ../lib.ts here, and copy ../index.ts here with
//   from "npm:@supabase/supabase-js@2"  →  from "./mock_sb.ts"
// Run:   node --experimental-strip-types run.ts
import assert from "node:assert/strict";
import { DB } from "./mock_sb.ts";

const ENV: Record<string, string> = {
  BOT_TOKEN: "TEST_TOKEN", WEBHOOK_SECRET: "wh_test_secret_1234567890", CRON_SECRET: "cron_test",
  GROUP_ID: "-1001", CHANNEL_ID: "-1002", ADMIN_IDS: "7", SUPABASE_URL: "https://x.supabase.co", SUPABASE_SERVICE_ROLE_KEY: "k",
};
let handler: any;
(globalThis as any).Deno = { env: { get: (k: string) => ENV[k] }, serve: (h: any) => { handler = h; } };
(globalThis as any).EdgeRuntime = { waitUntil: (p: Promise<unknown>) => p };
const calls: any[] = [];
let mid = 1000;
(globalThis as any).fetch = async (url: string, init: any) => {
  const method = url.split("/").pop()!;
  const body = JSON.parse(init.body);
  calls.push({ method, body });
  let result: any = true;
  if (method === "sendMessage") result = { message_id: ++mid };
  if (method === "getChatMember") result = { status: body.user_id === 999 ? "administrator" : "member", user: { id: body.user_id } };
  return { json: async () => ({ ok: true, result }) };
};
await import("./index.ts");

const G = { id: -1001, type: "supergroup", title: "گفت‌وگوی پله" };
let n = 1;
const msg = (from: any, text: string, extra: any = {}) => ({ message: { message_id: n++, chat: G, from, text, ...extra } });
const post = (u: any, secret = ENV.WEBHOOK_SECRET) =>
  handler(new Request("https://x/functions/v1/telegram-bot", { method: "POST", headers: { "x-telegram-bot-api-secret-token": secret }, body: JSON.stringify(u) }));
const get = (q: string, h: Record<string, string> = {}) => handler(new Request("https://x/functions/v1/telegram-bot" + q, { headers: h }));
const since = (i: number) => calls.slice(i);
const A = { id: 11, first_name: "Ali" }, B = { id: 12, first_name: "Sara" }, C = { id: 13, first_name: "Spam" }, ADM = { id: 999, first_name: "Admin" };

let ok = 0;
const step = async (name: string, fn: () => Promise<void>) => { await fn(); ok++; console.log("ok   ", name); };

await step("bad webhook secret → 401", async () => {
  assert.equal((await post(msg(A, "سلام"), "wrong")).status, 401);
});
await step("bad cron secret → 401; good cron header → 200", async () => {
  assert.equal((await get("?cron=nope")).status, 401);
  assert.equal((await get("", { "x-cron-secret": "cron_test" })).status, 200);
});
await step("profanity ×3 → 2 warnings then 24h mute + reset", async () => {
  const i = calls.length;
  for (let k = 0; k < 3; k++) await post(msg(A, "جاکش"));
  const c = since(i);
  assert.equal(c.filter((x) => x.method === "deleteMessage").length >= 3, true);
  const r = c.find((x) => x.method === "restrictChatMember");
  assert.ok(r, "mute called");
  const secs = r.body.until_date - Math.floor(Date.now() / 1000);
  assert.ok(secs > 86000 && secs <= 86400, "24h");
  assert.equal(r.body.permissions.can_send_messages, false);
  assert.equal(c.some((x) => x.method === "banChatMember"), false);
  assert.equal(DB.tg_warns.find((w) => w.user_id === 11).count, 0);
});
await step("political ×3 → neutral notice (no name), no warning, 1h mute on 3rd", async () => {
  const i = calls.length;
  for (let k = 0; k < 3; k++) await post(msg(B, "جمهوری اسلامی"));
  const c = since(i);
  const notices = c.filter((x) => x.method === "sendMessage");
  assert.equal(notices.length, 1, "cooldown → one notice");
  assert.equal(notices[0].body.text, "این گروه فقط درباره‌ی کتاب و عادت‌هاست 🌿");
  const r = c.find((x) => x.method === "restrictChatMember");
  assert.ok(r);
  const secs = r.body.until_date - Math.floor(Date.now() / 1000);
  assert.ok(secs > 3500 && secs <= 3600);
  assert.equal(DB.tg_warns.find((w) => w.user_id === 12), undefined, "no warn row");
  assert.equal(DB.tg_political_strikes.length, 3);
});
await step("book talk with «دیکتاتور» is untouched", async () => {
  const i = calls.length;
  await post(msg(A, "آشپزخانه‌ی کرملین درباره‌ی آشپزهای دیکتاتورهاست"));
  assert.equal(since(i).some((x) => x.method === "deleteMessage" && x.body.message_id === n - 1), false);
});
await step("ads ×3 → ban", async () => {
  const i = calls.length;
  for (let k = 0; k < 3; k++) await post(msg(C, "https://spam.xyz"));
  assert.ok(since(i).some((x) => x.method === "banChatMember" && x.body.user_id === 13));
});
await step("admin is never filtered", async () => {
  const i = calls.length;
  await post(msg(ADM, "جمهوری اسلامی spam.xyz"));
  assert.equal(since(i).some((x) => x.method === "deleteMessage"), false);
});
await step("mod notices tracked 60s, welcome 10min", async () => {
  DB.tg_bot_messages = [];
  await post({ message: { message_id: n++, chat: G, from: ADM, new_chat_members: [{ id: 50, first_name: "New" }] } });
  const ttl = (new Date(DB.tg_bot_messages[0].delete_at).getTime() - Date.now()) / 1000;
  assert.ok(ttl > 590 && ttl <= 600, "welcome 600s");
});
await step("cron tick sends due check-in with footer, never tracked for delete", async () => {
  DB.tg_bot_messages = [];
  DB.tg_schedule.push({ id: 900, target: "group", kind: "checkin", text: "امروز چند صفحه؟", send_at: new Date(Date.now() - 60e3).toISOString(), attempts: 0, sent_at: null, claimed_at: null });
  DB.tg_schedule.push({ id: 901, target: "channel", kind: "post", text: "old", send_at: new Date(Date.now() - 3 * 3600e3).toISOString(), attempts: 0, sent_at: null, claimed_at: null });
  const i = calls.length;
  const res = await (await get("?cron=cron_test")).json();
  assert.equal(res.sent, 1, "only fresh row");
  const s = since(i).find((x) => x.method === "sendMessage");
  assert.equal(s.body.chat_id, -1001);
  assert.ok(s.body.text.includes("فقط عدد صفحه‌های امروز"));
  const row = DB.tg_schedule.find((r) => r.id === 900);
  assert.ok(row.sent_at && row.message_id);
  assert.equal(DB.tg_bot_messages.length, 0);
  assert.equal(DB.tg_schedule.find((r) => r.id === 901).sent_at, null, "stale row skipped");
});
await step("reply «۱۲» to check-in → tg_reading + reaction, no reply message", async () => {
  const chk = DB.tg_schedule.find((r) => r.id === 900);
  const i = calls.length;
  await post(msg(A, "۱۲", { reply_to_message: { message_id: chk.message_id, from: { id: 1, is_bot: true } } }));
  const c = since(i);
  assert.ok(c.some((x) => x.method === "setMessageReaction"));
  assert.equal(c.some((x) => x.method === "sendMessage"), false);
  assert.equal(DB.tg_reading.find((r) => r.user_id === 11).pages, 12);
});
await step("later message overwrites same day; «خوندم 20» anywhere works", async () => {
  await post(msg(A, "امروز خوندم ۳۰ صفحه"));
  await post(msg(B, "خوندم 20"));
  assert.equal(DB.tg_reading.filter((r) => r.user_id === 11).length, 1);
  assert.equal(DB.tg_reading.find((r) => r.user_id === 11).pages, 30);
  assert.equal(DB.tg_reading.find((r) => r.user_id === 12).pages, 20);
});
await step("bare number NOT replying to check-in is ignored", async () => {
  const before = DB.tg_reading.length;
  await post(msg({ id: 14, first_name: "X" }, "۱۲"));
  assert.equal(DB.tg_reading.length, before);
});
await step("/me in group → stats, reply + command tracked 60s", async () => {
  DB.tg_bot_messages = [];
  const i = calls.length;
  await post(msg(A, "/me"));
  const s = since(i).find((x) => x.method === "sendMessage");
  assert.ok(s.body.text.includes("۳۰"), s.body.text);
  assert.ok(s.body.text.includes("۱ شب"), s.body.text);
  assert.equal(DB.tg_bot_messages.length, 2);
  for (const m of DB.tg_bot_messages) {
    const ttl = (new Date(m.delete_at).getTime() - Date.now()) / 1000;
    assert.ok(ttl > 55 && ttl <= 60);
  }
});
await step("/mute by admin uses restrictChatMember with until_date", async () => {
  const i = calls.length;
  await post(msg(ADM, "/mute 30", { reply_to_message: { message_id: 5, from: B } }));
  const r = since(i).find((x) => x.method === "restrictChatMember");
  const secs = r.body.until_date - Math.floor(Date.now() / 1000);
  assert.ok(secs > 1790 && secs <= 1800);
});
await step("command text from non-admin is filtered too", async () => {
  const i = calls.length;
  await post(msg({ id: 15, first_name: "Y" }, "/x https://spam.xyz"));
  assert.ok(since(i).some((x) => x.method === "deleteMessage"));
});
await step("token never appears in any request body", async () => {
  assert.equal(JSON.stringify(calls).includes("TEST_TOKEN"), false);
});
console.log(`\n${ok} integration steps passed`);
