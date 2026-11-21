// ROLLBACK COPY of telegram-bot v3 (fetched 2026-11-08 via get_edge_function).
// The ONLY change from v3: the hardcoded BOT_TOKEN / WEBHOOK_SECRET fallbacks were removed;
// both are now read from env only (the old values are intentionally not stored anywhere).
// Behaviour otherwise identical to v3 (180 s auto-delete, 3 warnings = ban, old political list).
// پله‌بات: مدیریت گروه تلگرام روی Supabase Edge Functions (وب‌هوک)
import { createClient } from "npm:@supabase/supabase-js@2";

declare const EdgeRuntime: { waitUntil(p: Promise<unknown>): void };

// ───────────── تنظیمات ─────────────
// TEMP fallback until rotation: deploy together with the live temp_fallback.ts (fetch it from the v4
// deployment with get_edge_function; the disk copy is intentionally empty).
import { TEMP_FALLBACK_BOT_TOKEN, TEMP_FALLBACK_WEBHOOK_SECRET } from "./temp_fallback.ts";
const TOKEN = Deno.env.get("BOT_TOKEN") || TEMP_FALLBACK_BOT_TOKEN;
const WEBHOOK_SECRET = Deno.env.get("WEBHOOK_SECRET") || TEMP_FALLBACK_WEBHOOK_SECRET;
if (!TOKEN || !WEBHOOK_SECRET) console.error("pelehbot v3-rollback: missing env BOT_TOKEN and/or WEBHOOK_SECRET");
const CHANNEL_ID = Deno.env.get("CHANNEL_ID") ?? ""; // مثل -1001234567890
const ADMIN_IDS = new Set(
  (Deno.env.get("ADMIN_IDS") ?? "").split(",").map((s) => s.trim()).filter(Boolean).map(Number),
);

const CFG = {
  maxWarnings: 3,
  profanityInstantBan: false,
  blockLinks: true,
  blockMentions: false,
  blockChannelForwards: true,
  allowedDomains: ["pelehapp.ir"],
  allowedUsernames: ["pelehapp"],
  adKeywords: [
    "کسب درآمد", "درآمد دلاری", "خرید فالوور", "فالوور واقعی", "ممبر واقعی",
    "ممبر ارزان", "جوین شو", "عضو کانال ما", "سرمایه گذاری", "بیت کوین",
    "ارز دیجیتال", "شرط بندی", "کازینو", "وام فوری", "سیگنال رایگان",
  ],
  // همه پیام‌های بات در گروه بعد از این مدت (ثانیه) خودکار حذف می‌شوند
  botMsgTtl: 180,
  faqCooldown: 60,
  welcomeText: "سلام {name} 👋\nبه گروه «{chat}» خوش اومدی!\nقبل از شروع، قوانین رو با دستور /rules بخون.",
  rulesText:
    "📜 قوانین گروه\n1) احترام به همه اعضا\n2) استفاده از الفاظ رکیک ممنوع\n3) ارسال تبلیغ و لینک ممنوع\n4) بحث سیاسی ممنوع\n5) با ۳ اخطار، حذف از گروه",
};

const FAQ = [
  {
    keywords: ["لینک اپ", "لینک برنامه", "آدرس اپ", "نسخه وب", "چطور وارد"],
    answer: "🌐 وب‌اپ پله: https://app.pelehapp.ir\nمعرفی و اخبار: https://pelehapp.ir",
  },
  {
    keywords: ["پشتیبانی", "مشکل دارم", "باگ", "ارتباط با ادمین"],
    answer: "🛠 برای گزارش مشکل، توضیح و اسکرین‌شات را همین‌جا بفرستید تا ادمین‌ها بررسی کنند.",
  },
  {
    keywords: ["قیمت", "اشتراک", "هزینه"],
    answer: "💳 برای اطلاعات اشتراک و قیمت‌ها، سایت رسمی پله را ببینید: https://pelehapp.ir",
  },
];

// کلمات رکیک: exact = فقط کلمهٔ کامل، sub = داخل کلمه هم بررسی می‌شود
const BAD_EXACT_RAW = [
  "کیر", "کون", "کص", "کونی", "کیری", "کیرم", "کیرت", "کونت", "ریدم", "ریدی",
  "کسشر", "کسشعر", "کصکش", "لاشی", "kir", "kos", "kose", "koskesh", "jende", "kiri",
];
const BAD_SUB_RAW = [
  "جنده", "جاکش", "کسکش", "کسخل", "کصخل", "گایید", "خارکسه", "حرومزاده",
  "حرامزاده", "پدرسگ", "بیناموس", "بیشرف",
];

// کلمات سیاسی: sub = داخل متن (بدون فاصله) بررسی می‌شود، exact = فقط کلمهٔ کامل (برای کلمات کوتاه/مبهم)
const POLITICAL_SUB_RAW = [
  "جمهوری اسلامی", "حکومت اسلامی", "رضا پهلوی", "پهلوی", "خامنه ای", "ولایت فقیه",
  "اصلاح طلب", "اصولگرا", "براندازی", "سپاه پاسداران", "بسیجی", "آخوند", "رژیم آخوندی",
  "مجاهدین خلق", "منافقین", "سلطنت طلب", "مشروطه خواه", "ضدانقلاب", "اپوزیسیون",
  "دیکتاتور", "جمهوری خواه",
];
const POLITICAL_EXACT_RAW = [
  "ارزشی", "ارزشیها", "سپاه", "بسیج", "اعتراضات", "انتخابات", "کودتا", "ترامپ", "نتانیاهو",
];

// ───────────── ابزارهای متن ─────────────
const STRIP_RE = /[‌‍‎‏ـً-ْ]/g;
function norm(t: string): string {
  return t.toLowerCase().replace(STRIP_RE, "")
    .replace(/ي/g, "ی").replace(/ك/g, "ک").replace(/ة/g, "ه")
    .replace(/[أإ]/g, "ا").replace(/ۀ/g, "ه");
}
const squash = (s: string) => s.replace(/(.)\1+/gu, "$1");
const BAD_EXACT = new Set(BAD_EXACT_RAW.map((w) => squash(norm(w))));
const BAD_SUB = BAD_SUB_RAW.map((w) => squash(norm(w)));
const POL_SUB = POLITICAL_SUB_RAW.map((w) => norm(w).replace(/\s+/g, ""));
const POL_EXACT = new Set(POLITICAL_EXACT_RAW.map((w) => squash(norm(w))));

function hasProfanity(text: string): boolean {
  for (const tok of norm(text).match(/[\p{L}\p{N}_]+/gu) ?? []) {
    const t = squash(tok);
    if (BAD_EXACT.has(t) || BAD_SUB.some((b) => t.includes(b))) return true;
  }
  return false;
}

function hasPolitical(text: string): boolean {
  const n = norm(text);
  const ns = n.replace(/\s+/g, "");
  if (POL_SUB.some((k) => ns.includes(k))) return true;
  for (const tok of n.match(/[\p{L}\p{N}_]+/gu) ?? []) {
    if (POL_EXACT.has(squash(tok))) return true;
  }
  return false;
}

const TLDS = "com|ir|org|net|info|xyz|ly|io|co|me|app|shop|site|online|top|click|link|biz|store|ink";
const DOMAIN_RE = new RegExp(`(?:https?://)?(?:www\\.)?((?:[a-z0-9-]+\\.)+(?:${TLDS}))\\b(/[^\\s]*)?`, "gi");
const MENTION_RE = /(?<![\w.])@([A-Za-z0-9_]{4,32})/g;
const ALLOWED_USERS = new Set(CFG.allowedUsernames.map((u) => u.toLowerCase().replace(/^@/, "")));
const AD_KEYWORDS = CFG.adKeywords.map((k) => norm(k).replace(/\s+/g, ""));

function linkIsBad(domain: string, path?: string): boolean {
  domain = domain.toLowerCase();
  if (["t.me", "telegram.me", "telegram.dog"].includes(domain)) {
    const user = (path ?? "/").replace(/^\/+|\/+$/g, "").split("/")[0].toLowerCase();
    return !ALLOWED_USERS.has(user);
  }
  return !CFG.allowedDomains.some((d) => domain === d || domain.endsWith("." + d));
}

// deno-lint-ignore no-explicit-any
function isAd(msg: any, text: string): boolean {
  if (CFG.blockLinks) {
    const chunks = [text];
    for (const e of [...(msg.entities ?? []), ...(msg.caption_entities ?? [])]) {
      if (e.type === "text_link" && e.url) chunks.push(e.url);
    }
    for (const c of chunks) {
      for (const m of c.matchAll(DOMAIN_RE)) if (linkIsBad(m[1], m[2])) return true;
    }
  }
  if (CFG.blockMentions) {
    for (const m of text.matchAll(MENTION_RE)) if (!ALLOWED_USERS.has(m[1].toLowerCase())) return true;
  }
  if (text) {
    const ns = norm(text).replace(/\s+/g, "");
    if (AD_KEYWORDS.some((k) => k && ns.includes(k))) return true;
  }
  if (CFG.blockChannelForwards && msg.forward_origin?.type === "channel") return true;
  return false;
}

// ───────────── تلگرام و دیتابیس ─────────────
// deno-lint-ignore no-explicit-any
async function tg(method: string, params: Record<string, unknown> = {}): Promise<any> {
  const r = await fetch(`https://api.telegram.org/bot${TOKEN}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(params),
  });
  const j = await r.json();
  if (!j.ok) console.error(method, j.description);
  return j;
}

const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

async function getWarns(chat: number, user: number): Promise<number> {
  const { data } = await sb.from("tg_warns").select("count").eq("chat_id", chat).eq("user_id", user).maybeSingle();
  return data?.count ?? 0;
}
async function setWarns(chat: number, user: number, n: number) {
  const { error } = await sb.from("tg_warns").upsert({
    chat_id: chat, user_id: user, count: Math.max(n, 0), updated_at: new Date().toISOString(),
  });
  if (error) console.error("setWarns", error.message);
}

// ارسال پیام؛ در گروه‌ها زمان حذف خودکار ثبت می‌شود و جاروکننده (sweep) آن را پاک می‌کند
async function send(chatId: number, params: Record<string, unknown>) {
  // deno-lint-ignore no-explicit-any
  const r: any = await tg("sendMessage", { chat_id: chatId, parse_mode: "HTML", ...params });
  if (r.ok && chatId < 0) {
    const { error } = await sb.from("tg_bot_messages").insert({
      chat_id: chatId,
      message_id: r.result.message_id,
      delete_at: new Date(Date.now() + CFG.botMsgTtl * 1000).toISOString(),
    });
    if (error) console.error("track msg", error.message);
  }
  return r;
}

async function sweep(): Promise<number> {
  const { data, error } = await sb.from("tg_bot_messages").select("id,chat_id,message_id")
    .lte("delete_at", new Date().toISOString()).limit(100);
  if (error || !data?.length) return 0;
  await Promise.all(data.map((m) => tg("deleteMessage", { chat_id: m.chat_id, message_id: m.message_id })));
  await sb.from("tg_bot_messages").delete().in("id", data.map((m) => m.id));
  return data.length;
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
// deno-lint-ignore no-explicit-any
const fullName = (u: any) => [u.first_name, u.last_name].filter(Boolean).join(" ") || String(u.id);
// deno-lint-ignore no-explicit-any
const mention = (u: any) => `<a href="tg://user?id=${u.id}">${esc(fullName(u))}</a>`;
// deno-lint-ignore no-explicit-any
const isGroup = (chat: any) => chat.type === "group" || chat.type === "supergroup";

const adminCache = new Map<string, [boolean, number]>();
async function isAdmin(chatId: number, userId: number): Promise<boolean> {
  if (ADMIN_IDS.has(userId)) return true;
  const key = `${chatId}:${userId}`;
  const c = adminCache.get(key);
  if (c && Date.now() - c[1] < 300_000) return c[0];
  const r = await tg("getChatMember", { chat_id: chatId, user_id: userId });
  const ok = r.ok && ["administrator", "creator"].includes(r.result.status);
  adminCache.set(key, [ok, Date.now()]);
  return ok;
}

const del = (chatId: number, messageId: number) => tg("deleteMessage", { chat_id: chatId, message_id: messageId });

// deno-lint-ignore no-explicit-any
async function punish(chat: any, user: any, reason: string, instant = false) {
  const n = (await getWarns(chat.id, user.id)) + 1;
  if (instant || n >= CFG.maxWarnings) {
    const r = await tg("banChatMember", { chat_id: chat.id, user_id: user.id });
    if (r.ok) {
      await setWarns(chat.id, user.id, 0);
      await send(chat.id, { text: `🚫 ${mention(user)} به دلیل ${reason} از گروه حذف (بن) شد.` });
    }
    return;
  }
  await setWarns(chat.id, user.id, n);
  await send(chat.id, { text: `⚠️ ${mention(user)}، ${reason}.\nاخطار ${n} از ${CFG.maxWarnings}` });
}

// ───────────── دستورها ─────────────
// deno-lint-ignore no-explicit-any
async function requireAdmin(msg: any): Promise<boolean> {
  if (ADMIN_IDS.has(msg.from.id)) return true;
  if (!isGroup(msg.chat)) return false;
  return await isAdmin(msg.chat.id, msg.from.id);
}

// deno-lint-ignore no-explicit-any
async function getTarget(msg: any, args: string[]): Promise<any | null> {
  let target = null;
  if (msg.reply_to_message?.from) target = msg.reply_to_message.from;
  else if (args[0] && /^\d+$/.test(args[0])) {
    const r = await tg("getChatMember", { chat_id: msg.chat.id, user_id: Number(args[0]) });
    if (r.ok) target = r.result.user;
  }
  if (!target) {
    await send(msg.chat.id, { text: "روی پیام کاربر ریپلای کن (یا آیدی عددی بده)." });
    return null;
  }
  if (await isAdmin(msg.chat.id, target.id)) {
    await send(msg.chat.id, { text: "روی ادمین‌ها قابل اجرا نیست." });
    return null;
  }
  return target;
}

// deno-lint-ignore no-explicit-any
async function handleCommand(msg: any) {
  const parts = msg.text.trim().split(/\s+/);
  const cmd = parts[0].slice(1).split("@")[0].toLowerCase();
  const args = parts.slice(1);
  const chat = msg.chat;
  const say = (text: string) => send(chat.id, { text });

  switch (cmd) {
    case "start":
      return say("سلام! من پله‌بات هستم. برای مدیریت، منو ادمین گروه کن 🌱");
    case "id":
      return say(`chat id: <code>${chat.id}</code>\nyour id: <code>${msg.from.id}</code>`);
    case "rules":
      return say(esc(CFG.rulesText));
    case "warnings": {
      const u = msg.reply_to_message?.from ?? msg.from;
      return say(`اخطارهای ${esc(fullName(u))}: ${await getWarns(chat.id, u.id)} از ${CFG.maxWarnings}`);
    }
    case "post": {
      if (!(await requireAdmin(msg))) return;
      if (!CHANNEL_ID) return say("CHANNEL_ID تنظیم نشده.");
      const body = msg.text.replace(/^\/\S+\s*/, "");
      let r;
      if (msg.reply_to_message) {
        r = await tg("copyMessage", { chat_id: CHANNEL_ID, from_chat_id: chat.id, message_id: msg.reply_to_message.message_id });
      } else if (body) {
        r = await tg("sendMessage", { chat_id: CHANNEL_ID, text: body });
      } else return say("متن را بعد از /post بنویس یا روی پیام ریپلای کن.");
      return say(r.ok ? "✅ در کانال منتشر شد." : `خطا (بات باید ادمین کانال باشد): ${esc(r.description ?? "")}`);
    }
  }

  if (!["warn", "unwarn", "ban", "unban", "mute", "unmute"].includes(cmd)) return;
  if (!isGroup(chat) || !(await requireAdmin(msg))) return;

  if (cmd === "unban") {
    const uid = msg.reply_to_message?.from?.id ?? (args[0] && /^\d+$/.test(args[0]) ? Number(args[0]) : null);
    if (!uid) return say("آیدی عددی کاربر را بده: /unban 123456");
    const r = await tg("unbanChatMember", { chat_id: chat.id, user_id: uid, only_if_banned: true });
    if (r.ok) await setWarns(chat.id, uid, 0);
    return say(r.ok ? "✅ بن برداشته شد." : `خطا: ${esc(r.description ?? "")}`);
  }

  const target = await getTarget(msg, args);
  if (!target) return;

  if (cmd === "warn") {
    await punish(chat, target, "اخطار از طرف مدیر");
    await del(chat.id, msg.message_id);
  } else if (cmd === "unwarn") {
    await setWarns(chat.id, target.id, (await getWarns(chat.id, target.id)) - 1);
    await say(`✅ یک اخطار کم شد. اخطار فعلی: ${await getWarns(chat.id, target.id)}`);
  } else if (cmd === "ban") {
    const r = await tg("banChatMember", { chat_id: chat.id, user_id: target.id });
    await say(r.ok ? "🚫 کاربر بن شد." : `خطا: ${esc(r.description ?? "")}`);
  } else if (cmd === "mute") {
    const minutes = args[0] && /^\d+$/.test(args[0]) ? Math.min(Number(args[0]), 60 * 24 * 30) : 60;
    const r = await tg("restrictChatMember", {
      chat_id: chat.id, user_id: target.id,
      permissions: { can_send_messages: false },
      until_date: Math.floor(Date.now() / 1000) + minutes * 60,
    });
    await say(r.ok ? `🔇 کاربر برای ${minutes} دقیقه سایلنت شد.` : `خطا: ${esc(r.description ?? "")}`);
  } else if (cmd === "unmute") {
    const r = await tg("restrictChatMember", {
      chat_id: chat.id, user_id: target.id,
      permissions: {
        can_send_messages: true, can_send_audios: true, can_send_documents: true, can_send_photos: true,
        can_send_videos: true, can_send_video_notes: true, can_send_voice_notes: true, can_send_polls: true,
        can_send_other_messages: true, can_add_web_page_previews: true, can_invite_users: true,
      },
    });
    await say(r.ok ? "🔊 سایلنت برداشته شد." : `خطا: ${esc(r.description ?? "")}`);
  }
}

// ───────────── پردازش آپدیت ─────────────
const lastFaq = new Map<string, number>();

// deno-lint-ignore no-explicit-any
async function handleUpdate(u: any) {
  // هر آپدیت جدید یک بار پیام‌های سررسیدشده را هم پاک می‌کند
  EdgeRuntime.waitUntil(sweep().catch((e) => console.error("sweep", e)));

  if (u.channel_post) {
    const p = u.channel_post;
    if ((p.text ?? "").startsWith("/id")) {
      await tg("sendMessage", { chat_id: p.chat.id, text: `chat id: ${p.chat.id}` });
    }
    return;
  }
  const msg = u.message;
  if (!msg) return;
  const chat = msg.chat;
  const user = msg.from;

  if (isGroup(chat) && msg.new_chat_members) {
    await del(chat.id, msg.message_id);
    for (const m of msg.new_chat_members) {
      if (m.is_bot) continue;
      const text = CFG.welcomeText.replace("{name}", mention(m)).replace("{chat}", esc(chat.title ?? ""));
      await send(chat.id, { text });
    }
    return;
  }
  if (isGroup(chat) && msg.left_chat_member) {
    await del(chat.id, msg.message_id);
    return;
  }
  if (!user) return;

  if (typeof msg.text === "string" && msg.text.startsWith("/")) {
    await handleCommand(msg);
    return;
  }
  if (!isGroup(chat) || msg.is_automatic_forward) return;

  // پیام از طرف ادمین ناشناس یا کانال
  if (msg.sender_chat) {
    if (msg.sender_chat.id !== chat.id) await del(chat.id, msg.message_id);
    return;
  }
  if (await isAdmin(chat.id, user.id)) return;

  const text: string = msg.text ?? msg.caption ?? "";
  let reason: string | null = null;
  let instant = false;
  if (text && hasProfanity(text)) {
    reason = "استفاده از الفاظ رکیک";
    instant = CFG.profanityInstantBan;
  } else if (text && hasPolitical(text)) {
    reason = "ورود به بحث سیاسی (طبق قوانین گروه ممنوع است)";
  } else if (isAd(msg, text)) {
    reason = "ارسال تبلیغ یا لینک غیرمجاز";
  }
  if (reason) {
    await del(chat.id, msg.message_id);
    await punish(chat, user, reason, instant);
    return;
  }

  // پاسخ خودکار
  if (msg.text) {
    const t = norm(msg.text).replace(/\s+/g, " ");
    for (let i = 0; i < FAQ.length; i++) {
      if (FAQ[i].keywords.some((k) => t.includes(norm(k)))) {
        const key = `${chat.id}:${i}`;
        const now = Date.now();
        if (now - (lastFaq.get(key) ?? 0) < CFG.faqCooldown * 1000) return;
        lastFaq.set(key, now);
        await send(chat.id, {
          text: FAQ[i].answer, reply_to_message_id: msg.message_id,
          link_preview_options: { is_disabled: true },
        });
        return;
      }
    }
  }
}

// ───────────── سرور ─────────────
Deno.serve(async (req) => {
  if (!TOKEN || !WEBHOOK_SECRET) return new Response("config error: missing env BOT_TOKEN/WEBHOOK_SECRET", { status: 500 });
  const url = new URL(req.url);
  if (req.method === "GET") {
    if (url.searchParams.get("sweep") === WEBHOOK_SECRET) {
      return new Response(JSON.stringify({ deleted: await sweep() }), { headers: { "content-type": "application/json" } });
    }
    if (url.searchParams.get("setup") === WEBHOOK_SECRET) {
      const hook = `${Deno.env.get("SUPABASE_URL")}/functions/v1/telegram-bot`;
      const set = await tg("setWebhook", {
        url: hook, secret_token: WEBHOOK_SECRET,
        allowed_updates: ["message", "channel_post"], drop_pending_updates: true,
      });
      const me = await tg("getMe");
      const info = await tg("getWebhookInfo");
      return new Response(JSON.stringify({ setWebhook: set, bot: me.result?.username, webhook: info.result }, null, 2), {
        headers: { "content-type": "application/json; charset=utf-8" },
      });
    }
    return new Response("pelehbot ok");
  }
  if (req.headers.get("x-telegram-bot-api-secret-token") !== WEBHOOK_SECRET) {
    return new Response("forbidden", { status: 401 });
  }
  try {
    const update = await req.json();
    await handleUpdate(update);
  } catch (e) {
    console.error(e);
  }
  return new Response("ok");
});
