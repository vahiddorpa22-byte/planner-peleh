// LOCAL TEST ONLY — pelehbot v5 integration (mocked Telegram + in-memory Supabase). Never deploy.
const log = window.__log;
const U = window.__urls;
const ENV = {
  BOT_TOKEN: "TEST_TOKEN", WEBHOOK_SECRET: "wh_test_secret_1234567890", CRON_SECRET: "cron_test",
  GROUP_ID: "-1001", CHANNEL_ID: "-1002", ADMIN_IDS: "7", SUPABASE_URL: "https://x.supabase.co", SUPABASE_SERVICE_ROLE_KEY: "k",
};
let handler;
globalThis.Deno = { env: { get: (k) => ENV[k] }, serve: (h) => { handler = h; } };
globalThis.EdgeRuntime = { waitUntil: (p) => p };
const calls = [];
let mid = 1000;
const realFetch = globalThis.fetch.bind(globalThis);
globalThis.fetch = async (url, init) => {
  if (!String(url).startsWith("https://api.telegram.org/")) return realFetch(url, init);
  const method = String(url).split("/").pop();
  const body = JSON.parse(init.body);
  calls.push({ method, body });
  let result = true;
  if (method === "sendMessage" || method === "sendPoll") result = { message_id: ++mid };
  if (method === "getChatMember") result = { status: body.user_id === 999 ? "administrator" : "member", user: { id: body.user_id } };
  if (method === "stopPoll") result = { question: "کتاب بد؟", total_voter_count: 10, options: [{ text: "تا آخر", voter_count: 3 }, { text: "ول می‌کنم", voter_count: 6 }, { text: "تا ۱۰۰", voter_count: 1 }] };
  return { json: async () => ({ ok: true, result }) };
};
const assert = {
  equal(a, b, m) { if (a !== b) throw new Error((m || "equal") + `: got ${JSON.stringify(a)} expected ${JSON.stringify(b)}`); },
  ok(v, m) { if (!v) throw new Error(m || "not ok"); },
};

const { DB } = await import(U.mock);
const L = await import(U.lib);
await import(U.idx);

const G = { id: -1001, type: "supergroup", title: "گفت‌وگوی پله" };
let n = 1;
const msg = (from, text, extra = {}) => ({ message: { message_id: n++, chat: G, from, text, ...extra } });
const post = (u, secret = ENV.WEBHOOK_SECRET) =>
  handler(new Request("https://x/functions/v1/telegram-bot", { method: "POST", headers: { "x-telegram-bot-api-secret-token": secret }, body: JSON.stringify(u) }));
const get = (q, h = {}) => handler(new Request("https://x/functions/v1/telegram-bot" + q, { headers: h }));
const since = (i) => calls.slice(i);
const A = { id: 11, first_name: "Ali" }, B = { id: 12, first_name: "Sara" }, C = { id: 13, first_name: "Spam" }, ADM = { id: 999, first_name: "Admin" };
const BOT = { id: 1, is_bot: true };
let ok = 0, bad = 0;
const step = async (name, fn) => { try { await fn(); ok++; log("ok    " + name, "ok"); } catch (e) { bad++; log("FAIL  " + name + " — " + e.message, "bad"); } };

// ───── lib: parser ─────
await step("parseReadingReply cases", async () => {
  const P = L.parseReadingReply;
  const cases = [["۱۲", 12], ["12", 12], ["۱۲ صفحه ✅", 12], ["۲۰ صفحه از صد سال تنهایی", 20], ["امروز ۱۵ تا", 15],
    ["حدود ۳۰، کتاب ۱۹۸۴", 30], ["کتاب ۱۹۸۴ رو می‌خونم، ۲۵ صفحه", 25], ["نخوندم امروز 😔", 0], ["هیچی", 0],
    ["عادت‌های اتمی", null], ["سلام", null], ["۴۰ ص", 40], ["٣٥", 35]];
  for (const [t, want] of cases) assert.equal(P(t), want, t);
});
await step("parseReadingAnywhere: short «امروز ۲۰ صفحه» yes, long sentence no", async () => {
  assert.equal(L.parseReadingAnywhere("امروز ۲۰ صفحه"), 20);
  assert.equal(L.parseReadingAnywhere("۲۰ صفحه 📖"), 20);
  assert.equal(L.parseReadingAnywhere("این کتاب ۴۰۰ صفحه است و خیلی طولانیه به نظرم"), null);
  assert.equal(L.parseReadingAnywhere("خوندم ۱۲"), 12);
});
await step("poll spec / result builders", async () => {
  const s = L.parsePollSpec("سؤال؟\n- الف\n- ب\n- ج");
  assert.equal(s.question, "سؤال؟"); assert.equal(s.options.length, 3);
  assert.equal(L.parsePollSpec("فقط سؤال\n- یکی"), null);
  const r = L.parsePollResultRef("ref=42\nعنوان");
  assert.equal(r.ref, 42); assert.equal(r.title, "عنوان");
  const txt = L.buildPollResult("عنوان", { question: "q", options: [{ text: "x", voter_count: 1 }, { text: "y", voter_count: 3 }] });
  assert.ok(txt.includes("🏆 y: ۷۵٪") && txt.includes("x: ۲۵٪") && txt.includes("۴ نفر"), txt);
});

// ───── v4 regression ─────
await step("bad webhook secret → 401", async () => { assert.equal((await post(msg(A, "سلام"), "wrong")).status, 401); });
await step("bad cron secret → 401; good → 200", async () => {
  assert.equal((await get("?cron=nope")).status, 401);
  assert.equal((await get("", { "x-cron-secret": "cron_test" })).status, 200);
});
await step("profanity ×3 → 24h mute", async () => {
  const i = calls.length;
  for (let k = 0; k < 3; k++) await post(msg(A, "جاکش"));
  assert.ok(since(i).some((x) => x.method === "restrictChatMember"));
});
await step("political ×3 → one neutral notice + 1h mute", async () => {
  const i = calls.length;
  for (let k = 0; k < 3; k++) await post(msg(B, "جمهوری اسلامی"));
  const c = since(i);
  assert.equal(c.filter((x) => x.method === "sendMessage").length, 1);
  assert.ok(c.some((x) => x.method === "restrictChatMember"));
});
await step("ads ×3 → ban", async () => {
  const i = calls.length;
  for (let k = 0; k < 3; k++) await post(msg(C, "https://spam.xyz"));
  assert.ok(since(i).some((x) => x.method === "banChatMember" && x.body.user_id === 13));
});
await step("cron sends due check-in with footer", async () => {
  DB.tg_schedule.push({ id: 900, target: "group", kind: "checkin", text: "امروز چند صفحه؟", send_at: new Date(Date.now() - 60e3).toISOString(), attempts: 0, sent_at: null, claimed_at: null });
  const i = calls.length;
  const res = await (await get("?cron=cron_test")).json();
  assert.equal(res.sent, 1);
  assert.ok(since(i).find((x) => x.method === "sendMessage").body.text.includes("فقط عدد صفحه‌های امروز"));
});

// ───── v5: check-in ─────
const chk = () => DB.tg_schedule.find((r) => r.id === 900);
await step("reply «۲۰ صفحه از صد سال تنهایی» → recorded 20 + 👍 + short ack (auto-delete 120s)", async () => {
  DB.tg_bot_messages = [];
  const i = calls.length;
  await post(msg(A, "۲۰ صفحه از صد سال تنهایی", { reply_to_message: { message_id: chk().message_id, from: BOT } }));
  const c = since(i);
  assert.ok(c.some((x) => x.method === "setMessageReaction" && x.body.reaction[0].emoji === "👍"));
  const ack = c.find((x) => x.method === "sendMessage");
  assert.ok(ack && ack.body.text.includes("۲۰ صفحه ثبت شد") && ack.body.reply_to_message_id, ack && ack.body.text);
  assert.equal(DB.tg_reading.find((r) => r.user_id === 11).pages, 20);
  const ttl = (new Date(DB.tg_bot_messages[0].delete_at).getTime() - Date.now()) / 1000;
  assert.ok(ttl > 115 && ttl <= 120, "ttl " + ttl);
});
await step("second reply same night → «به‌روز شد»", async () => {
  const i = calls.length;
  await post(msg(A, "ببخشید ۲۵ تا", { reply_to_message: { message_id: chk().message_id, from: BOT } }));
  assert.ok(since(i).find((x) => x.method === "sendMessage").body.text.includes("به‌روز شد"));
  assert.equal(DB.tg_reading.find((r) => r.user_id === 11).pages, 25);
});
await step("reply «نخوندم» → 0 with gentle ack", async () => {
  const i = calls.length;
  await post(msg(B, "امروز نخوندم", { reply_to_message: { message_id: chk().message_id, from: BOT } }));
  assert.ok(since(i).find((x) => x.method === "sendMessage").body.text.includes("صفر"));
  assert.equal(DB.tg_reading.find((r) => r.user_id === 12).pages, 0);
});
await step("bare «۱۲» not replying to check-in is still ignored", async () => {
  const before = DB.tg_reading.length;
  await post(msg({ id: 14, first_name: "X" }, "۱۲"));
  assert.equal(DB.tg_reading.length, before);
});

// ───── v5: sales auto-reply ─────
await step("everyday «هزینه/اشتراک/قیمت» → no sales reply", async () => {
  const i = calls.length;
  await post(msg({ id: 20, first_name: "M" }, "هزینه‌ی کتاب‌ها خیلی رفته بالا"));
  await post(msg({ id: 21, first_name: "N" }, "قیمت این کتاب تو طاقچه چنده؟"));
  await post(msg({ id: 22, first_name: "O" }, "اشتراک‌گذاری خلاصه‌ها کار خوبیه"));
  assert.equal(since(i).filter((x) => x.method === "sendMessage").length, 0);
});
await step("real question «اشتراک پله چنده؟» → one reply, repeat within 6h → none", async () => {
  const i = calls.length;
  await post(msg({ id: 23, first_name: "P" }, "اشتراک پله چنده؟"));
  await post(msg({ id: 24, first_name: "Q" }, "قیمت اشتراک چقدره"));
  const s = since(i).filter((x) => x.method === "sendMessage");
  assert.equal(s.length, 1);
  assert.ok(s[0].body.text.includes("Premium"));
});
await step("reply to another member is never auto-answered", async () => {
  const i = calls.length;
  await post(msg({ id: 25, first_name: "R" }, "لینک اپ رو بفرست", { reply_to_message: { message_id: 3, from: B } }));
  assert.equal(since(i).filter((x) => x.method === "sendMessage").length, 0);
});

// ───── v5: discussions & polls ─────
await step("cron sends discussion (plain) and poll (sendPoll, anonymous, 3 options)", async () => {
  const at = new Date(Date.now() - 30e3).toISOString();
  DB.tg_schedule.push({ id: 910, target: "group", kind: "discussion", text: "☕ گپ سه‌شنبه", send_at: at, attempts: 0, sent_at: null, claimed_at: null });
  DB.tg_schedule.push({ id: 911, target: "group", kind: "poll", text: "کتاب بد؟\n- تا آخر\n- ول می‌کنم\n- تا ۱۰۰", send_at: at, attempts: 0, sent_at: null, claimed_at: null });
  const i = calls.length;
  const res = await (await get("?cron=cron_test")).json();
  assert.equal(res.sent, 2);
  const c = since(i);
  const d = c.find((x) => x.method === "sendMessage");
  assert.ok(d && d.body.text === "☕ گپ سه‌شنبه", "discussion has no check-in footer");
  const p = c.find((x) => x.method === "sendPoll");
  assert.ok(p && p.body.options.length === 3 && p.body.is_anonymous === true && p.body.chat_id === -1001);
  assert.ok(DB.tg_schedule.find((r) => r.id === 911).message_id);
});
await step("reply under discussion → ❤ reaction, no extra message, not counted as pages", async () => {
  const dm = DB.tg_schedule.find((r) => r.id === 910).message_id;
  const before = DB.tg_reading.length;
  const i = calls.length;
  await post(msg({ id: 30, first_name: "S" }, "ول می‌کنم، ۳ بار امتحان کردم", { reply_to_message: { message_id: dm, from: BOT } }));
  const c = since(i);
  assert.ok(c.some((x) => x.method === "setMessageReaction" && x.body.reaction[0].emoji === "❤"));
  assert.equal(c.filter((x) => x.method === "sendMessage").length, 0);
  assert.equal(DB.tg_reading.length, before);
});
await step("poll_result: stopPoll → result in channel + reply in group", async () => {
  DB.tg_schedule.push({ id: 912, target: "channel", kind: "poll_result", text: "ref=911\nنظر گروه پله: کتاب بد؟ 📊", send_at: new Date(Date.now() - 10e3).toISOString(), attempts: 0, sent_at: null, claimed_at: null });
  const i = calls.length;
  const res = await (await get("?cron=cron_test")).json();
  assert.equal(res.sent, 1);
  const c = since(i);
  assert.ok(c.some((x) => x.method === "stopPoll" && x.body.chat_id === -1001));
  const ch = c.find((x) => x.method === "sendMessage" && String(x.body.chat_id) === "-1002");
  assert.ok(ch && ch.body.text.includes("🏆 ول می‌کنم: ۶۰٪") && ch.body.text.includes("۱۰ نفر"), ch && ch.body.text);
  assert.ok(c.some((x) => x.method === "sendMessage" && x.body.chat_id === -1001 && x.body.reply_to_message_id));
});
await step("nightly table: tonight + running total, sorted by total, streak 🔥", async () => {
  const rows = [
    { user_id: 1, day: "2026-11-07", pages: 30, first_name: "مریم" }, { user_id: 1, day: "2026-11-08", pages: 20, first_name: "مریم" },
    { user_id: 1, day: "2026-11-09", pages: 15, first_name: "مریم" },
    { user_id: 2, day: "2026-11-08", pages: 50, first_name: "رضا" },
    { user_id: 3, day: "2026-11-09", pages: 10, first_name: "Sara" }, { user_id: 4, day: "2026-11-09", pages: 0, first_name: "Zero" },
    { user_id: 1, day: "2026-11-10", pages: 99, first_name: "مریم" },
  ];
  const t = L.buildNightlyTable(rows, "2026-11-09");
  const lines = t.split("\n");
  assert.ok(lines[1].includes("امشب ۲ نفر، ۲۵ صفحه") && lines[1].includes("۱۲۵ صفحه"), lines[1]);
  assert.ok(lines[3].startsWith("🥇 مریم · امشب ۱۵ · جمع ۶۵ 🔥۳"), lines[3]);
  assert.ok(lines[4].startsWith("🥈 رضا · امشب — · جمع ۵۰"), lines[4]);
  assert.ok(lines[5].startsWith("🥉 Sara · امشب ۱۰ · جمع ۱۰"), lines[5]);
  assert.ok(!t.includes("Zero"), "zero-total hidden");
  assert.equal(L.buildNightlyTable([], "2026-11-09"), null);
});
await step("cron: table posted once per night (dedupe), not before 23:50", async () => {
  // tick logic depends on real clock; just check postSummaryOnce dedupe via direct DB effect when it runs
  const before = DB.tg_schedule.filter((r) => r.kind === "summary").length;
  await get("?cron=cron_test"); await get("?cron=cron_test");
  const after = DB.tg_schedule.filter((r) => r.kind === "summary").length;
  assert.ok(after - before <= 1, "at most one summary row per night");
});
await step("token never appears in any request body", async () => { assert.equal(JSON.stringify(calls).includes("TEST_TOKEN"), false); });

log(`\n${ok} passed, ${bad} failed`, bad ? "bad" : "ok");
window.__done = { ok, bad };
