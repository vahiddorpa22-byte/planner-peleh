// پله‌بات v4: مدیریت گروه تلگرام + دورهمی کتاب‌خونی + پست زمان‌بندی‌شده (Supabase Edge Function، وب‌هوک)
// رازها از env خوانده می‌شوند؛ تا چرخش توکن، fallback موقت از temp_fallback.ts (پایین را ببینید).
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";
import {
  buildNightlySummary, buildWeeklySummary, circleDay, classify, computeStreak, missingEnv, norm,
  parseReadingAnywhere, parseReadingReply, safeEqual, tehranParts, toFa, addDays, type ReadingRow,
} from "./lib.ts";

declare const EdgeRuntime: { waitUntil(p: Promise<unknown>): void };

// ───────────── env ─────────────
// حالت موقت (۱۴۰۵/۰۸/۱۷، با تأیید وحید): تا چرخش توکن، اگر env نبود از مقدارهای فعلی استفاده می‌شود.
// TEMP fallback until rotation — مقدارها در temp_fallback.ts هستند: روی دیسک خالی، فقط در نسخه‌ی دیپلوی‌شده پر.
// بعد از چرخش توکن، temp_fallback.ts با رشته‌های خالی دوباره دیپلوی شود.
import { TEMP_FALLBACK_BOT_TOKEN, TEMP_FALLBACK_WEBHOOK_SECRET } from "./temp_fallback.ts";
const env = (k: string) => (Deno.env.get(k) ?? "").trim();
const TOKEN = env("BOT_TOKEN") || TEMP_FALLBACK_BOT_TOKEN;
const WEBHOOK_SECRET = env("WEBHOOK_SECRET") || TEMP_FALLBACK_WEBHOOK_SECRET;
const CHANNEL_ID = env("CHANNEL_ID") || "@pelehapp_official";
/** GROUP_ID: env، وگرنه از جدول tg_bot_settings (کلید group_id) خوانده می‌شود. */
let GROUP_ID = Number(env("GROUP_ID")) || 0;
/** ADMIN_IDS اختیاری است؛ getChatMember ادمین‌های گروه را خودش تشخیص می‌دهد. */
const ADMIN_IDS = new Set(env("ADMIN_IDS").split(",").map((s) => s.trim()).filter((s) => /^\d+$/.test(s)).map(Number));
/** CRON_SECRET: env، وگرنه از Vault (tg_cron_secret) از راه تابع tg_get_cron_secret که فقط service_role اجرا می‌کند. */
let CRON_SECRET = env("CRON_SECRET");

const MISSING = [
  ...(!TOKEN ? ["BOT_TOKEN"] : []),
  ...(!WEBHOOK_SECRET ? ["WEBHOOK_SECRET"] : []),
  ...(!env("SUPABASE_URL") ? ["SUPABASE_URL"] : []),
  ...(!env("SUPABASE_SERVICE_ROLE_KEY") ? ["SUPABASE_SERVICE_ROLE_KEY"] : []),
  ...(env("GROUP_ID") && !/^-\d+$/.test(env("GROUP_ID")) ? ["GROUP_ID(invalid)"] : []),
];
if (MISSING.length) console.error(`pelehbot: config error, missing/invalid env: ${MISSING.join(", ")}`);
if (!env("BOT_TOKEN") || !env("WEBHOOK_SECRET")) console.warn("pelehbot: using TEMP fallback secrets until rotation");
void missingEnv; // اعتبارسنجی سخت‌گیرانه‌ی کامل بعد از چرخش رمزها دوباره فعال می‌شود

async function ensureConfig() {
  if (!GROUP_ID) {
    const { data } = await sb().from("tg_bot_settings").select("value").eq("key", "group_id").maybeSingle();
    if (data?.value && /^-\d+$/.test(data.value)) GROUP_ID = Number(data.value);
  }
}
async function cronSecret(): Promise<string> {
  if (!CRON_SECRET) {
    const { data, error } = await sb().rpc("tg_get_cron_secret");
    if (error) console.error("cron secret", error.message);
    if (typeof data === "string") CRON_SECRET = data;
  }
  return CRON_SECRET;
}

// ───────────── تنظیمات ─────────────
/** عمر پیام‌های بات (ثانیه). "keep" = هرگز حذف نمی‌شود. */
const TTL = { mod: 60, welcome: 600, faq: 600, me: 60, cmd: 180 } as const;
type TtlKind = keyof typeof TTL | "keep";

const CFG = {
  maxWarnings: 3,
  profanityMuteSec: 24 * 3600,
  politicalStrikesForMute: 3,
  politicalWindowHours: 24,
  politicalMuteSec: 3600,
  politicalNoticeCooldownSec: 30,
  faqCooldown: 60,
  reaction: "👍", // ✅ در فهرست واکنش‌های مجاز تلگرام نیست؛ 👍 جایگزین شد.
  politicalNotice: "این گروه فقط درباره‌ی کتاب و عادت‌هاست 🌿",
  checkinFooter: "\n\n✍️ برای ثبت تو دورهمی: روی همین پیام فقط عدد صفحه‌های امروز رو بنویس (مثلاً ۱۲).",
  welcomeText: "سلام {name} 👋\nبه گروه «{chat}» خوش اومدی!\nقبل از شروع، قوانین رو با دستور /rules بخون.",
  rulesText:
    "📜 قوانین گروه\n1) احترام به همه اعضا\n2) استفاده از الفاظ رکیک ممنوع\n3) ارسال تبلیغ و لینک ممنوع\n4) بحث سیاسی ممنوع\n5) فحش: ۳ اخطار = ۲۴ ساعت سایلنت · تبلیغ: ۳ اخطار = حذف از گروه",
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

// ───────────── تلگرام و دیتابیس ─────────────
// deno-lint-ignore no-explicit-any
async function tg(method: string, params: Record<string, unknown> = {}): Promise<any> {
  try {
    const r = await fetch(`https://api.telegram.org/bot${TOKEN}/${method}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(params),
    });
    const j = await r.json();
    if (!j.ok) console.error(method, j.error_code, j.description); // هرگز URL (حاوی توکن) لاگ نمی‌شود
    return j;
  } catch (e) {
    console.error(method, "network error", (e as Error).name);
    return { ok: false, description: "network error" };
  }
}

let _sb: SupabaseClient | null = null;
const sb = () => (_sb ??= createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY")));

type Warns = { count: number; ad_count: number };
async function getWarns(chat: number, user: number): Promise<Warns> {
  const { data } = await sb().from("tg_warns").select("count,ad_count").eq("chat_id", chat).eq("user_id", user)
    .maybeSingle();
  return { count: data?.count ?? 0, ad_count: data?.ad_count ?? 0 };
}
async function setWarns(chat: number, user: number, patch: Partial<Warns>) {
  const row: Record<string, unknown> = { chat_id: chat, user_id: user, updated_at: new Date().toISOString() };
  if (patch.count !== undefined) row.count = Math.max(patch.count, 0);
  if (patch.ad_count !== undefined) row.ad_count = Math.max(patch.ad_count, 0);
  const { error } = await sb().from("tg_warns").upsert(row);
  if (error) console.error("setWarns", error.message);
}

async function trackForDelete(chatId: number, messageId: number, seconds: number) {
  const { error } = await sb().from("tg_bot_messages").insert({
    chat_id: chatId, message_id: messageId, delete_at: new Date(Date.now() + seconds * 1000).toISOString(),
  });
  if (error) console.error("track msg", error.message);
}

/** ارسال پیام؛ در گروه‌ها بر اساس نوع، زمان حذف خودکار ثبت می‌شود. */
async function send(chatId: number, params: Record<string, unknown>, kind: TtlKind) {
  // deno-lint-ignore no-explicit-any
  const r: any = await tg("sendMessage", { chat_id: chatId, parse_mode: "HTML", ...params });
  if (r.ok && chatId < 0 && kind !== "keep") await trackForDelete(chatId, r.result.message_id, TTL[kind]);
  return r;
}

async function sweep(): Promise<number> {
  const { data, error } = await sb().from("tg_bot_messages").select("id,chat_id,message_id")
    .lte("delete_at", new Date().toISOString()).limit(100);
  if (error || !data?.length) return 0;
  await Promise.all(data.map((m) => tg("deleteMessage", { chat_id: m.chat_id, message_id: m.message_id })));
  await sb().from("tg_bot_messages").delete().in("id", data.map((m) => m.id));
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

const NO_SEND = {
  can_send_messages: false, can_send_audios: false, can_send_documents: false, can_send_photos: false,
  can_send_videos: false, can_send_video_notes: false, can_send_voice_notes: false, can_send_polls: false,
  can_send_other_messages: false, can_add_web_page_previews: false,
};
const ALL_SEND = {
  can_send_messages: true, can_send_audios: true, can_send_documents: true, can_send_photos: true,
  can_send_videos: true, can_send_video_notes: true, can_send_voice_notes: true, can_send_polls: true,
  can_send_other_messages: true, can_add_web_page_previews: true, can_invite_users: true,
};

/** سایلنت واقعی: همه‌ی مجوزهای ارسال بسته + until_date. بات باید دسترسی «Ban users» داشته باشد. */
// deno-lint-ignore no-explicit-any
async function mute(chatId: number, userId: number, seconds: number): Promise<any> {
  const secs = Math.min(Math.max(seconds, 60), 365 * 24 * 3600); // تلگرام: کمتر از ۳۰ ثانیه = دائمی
  return await tg("restrictChatMember", {
    chat_id: chatId, user_id: userId, permissions: NO_SEND, use_independent_chat_permissions: true,
    until_date: Math.floor(Date.now() / 1000) + secs,
  });
}

// ───────────── مجازات‌ها ─────────────
/** فحش یا اخطار دستی: اخطار؛ با ۳ اخطار ۲۴ ساعت سایلنت و صفر شدن اخطارها. */
// deno-lint-ignore no-explicit-any
async function warnProfanity(chat: any, user: any, reason: string) {
  const w = await getWarns(chat.id, user.id);
  const n = w.count + 1;
  if (n >= CFG.maxWarnings) {
    const r = await mute(chat.id, user.id, CFG.profanityMuteSec);
    if (r.ok) {
      await setWarns(chat.id, user.id, { count: 0 });
      await send(chat.id, { text: `🔇 ${mention(user)} به دلیل ${reason} (۳ اخطار) ۲۴ ساعت سایلنت شد.` }, "mod");
      return;
    }
    console.error("mute failed; keeping warnings", r.description);
  }
  await setWarns(chat.id, user.id, { count: n });
  await send(chat.id, { text: `⚠️ ${mention(user)}، ${reason}.\nاخطار ${toFa(Math.min(n, CFG.maxWarnings))} از ${toFa(CFG.maxWarnings)}` }, "mod");
}

/** تبلیغ/لینک/فوروارد کانال: اخطار؛ با ۳ اخطار بن (حساب‌های اسپم). */
// deno-lint-ignore no-explicit-any
async function warnAd(chat: any, user: any) {
  const w = await getWarns(chat.id, user.id);
  const n = w.ad_count + 1;
  if (n >= CFG.maxWarnings) {
    const r = await tg("banChatMember", { chat_id: chat.id, user_id: user.id });
    if (r.ok) {
      await setWarns(chat.id, user.id, { ad_count: 0 });
      await send(chat.id, { text: `🚫 ${mention(user)} به دلیل تبلیغ مکرر از گروه حذف شد.` }, "mod");
      return;
    }
  }
  await setWarns(chat.id, user.id, { ad_count: n });
  await send(chat.id, { text: `⚠️ ${mention(user)}، ارسال تبلیغ یا لینک غیرمجاز.\nاخطار ${toFa(Math.min(n, CFG.maxWarnings))} از ${toFa(CFG.maxWarnings)}` }, "mod");
}

/** سیاسی: بدون اخطار؛ اعلان خنثی بدون اسم؛ ۳ مورد در ۲۴ ساعت = ۱ ساعت سایلنت. */
const lastPolNotice = new Map<number, number>();
// deno-lint-ignore no-explicit-any
async function handlePolitical(chat: any, user: any) {
  const { error } = await sb().from("tg_political_strikes").insert({ chat_id: chat.id, user_id: user.id });
  if (error) console.error("strike insert", error.message);
  const since = new Date(Date.now() - CFG.politicalWindowHours * 3600_000).toISOString();
  const { count } = await sb().from("tg_political_strikes").select("id", { count: "exact", head: true })
    .eq("chat_id", chat.id).eq("user_id", user.id).gte("created_at", since);
  if ((count ?? 0) >= CFG.politicalStrikesForMute) await mute(chat.id, user.id, CFG.politicalMuteSec);
  const now = Date.now();
  if (now - (lastPolNotice.get(chat.id) ?? 0) >= CFG.politicalNoticeCooldownSec * 1000) {
    lastPolNotice.set(chat.id, now);
    await send(chat.id, { text: CFG.politicalNotice }, "mod");
  }
}

// ───────────── دورهمی کتاب‌خونی ─────────────
// deno-lint-ignore no-explicit-any
async function recordReading(msg: any, day: string, pages: number): Promise<boolean> {
  const { error } = await sb().from("tg_reading").upsert({
    chat_id: GROUP_ID, user_id: msg.from.id, first_name: (msg.from.first_name ?? "").slice(0, 64),
    day, pages, updated_at: new Date().toISOString(),
  }, { onConflict: "chat_id,user_id,day" });
  if (error) { console.error("reading upsert", error.message); return false; }
  // تأیید فقط با واکنش، بدون پیام اضافه
  await tg("setMessageReaction", {
    chat_id: msg.chat.id, message_id: msg.message_id, reaction: [{ type: "emoji", emoji: CFG.reaction }],
  });
  return true;
}

/** اگر پیام ثبت صفحه بود، ثبت می‌کند و true برمی‌گرداند. */
// deno-lint-ignore no-explicit-any
async function tryReading(msg: any, text: string): Promise<boolean> {
  if (!text || msg.chat.id !== GROUP_ID) return false;
  const reply = msg.reply_to_message;
  if (reply?.from?.is_bot) {
    const pages = parseReadingReply(text);
    if (pages !== null) {
      const { data } = await sb().from("tg_schedule").select("send_at")
        .eq("target", "group").eq("kind", "checkin").eq("message_id", reply.message_id).maybeSingle();
      if (data) {
        const day = tehranParts(new Date(data.send_at)).date;
        const today = circleDay(new Date());
        if (day >= addDays(today, -1) && day <= today) return await recordReading(msg, day, pages);
      }
    }
  }
  const pages = parseReadingAnywhere(text);
  if (pages !== null) return await recordReading(msg, circleDay(new Date()), pages);
  return false;
}

async function userStats(userId: number): Promise<{ streak: number; total: number }> {
  const { data } = await sb().from("tg_reading").select("day,pages").eq("chat_id", GROUP_ID).eq("user_id", userId)
    .order("day", { ascending: false }).limit(400);
  const rows = data ?? [];
  const total = rows.reduce((s, r) => s + (r.pages ?? 0), 0);
  const streak = computeStreak(rows.filter((r) => r.pages > 0).map((r) => r.day), circleDay(new Date()));
  return { streak, total };
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
    await send(msg.chat.id, { text: "روی پیام کاربر ریپلای کن (یا آیدی عددی بده)." }, "mod");
    return null;
  }
  if (await isAdmin(msg.chat.id, target.id)) {
    await send(msg.chat.id, { text: "روی ادمین‌ها قابل اجرا نیست." }, "mod");
    return null;
  }
  return target;
}

// deno-lint-ignore no-explicit-any
async function handleCommand(msg: any) {
  const parts = msg.text.trim().split(/\s+/);
  const cmd = norm(parts[0].slice(1).split("@")[0]);
  const args = parts.slice(1);
  const chat = msg.chat;
  const say = (text: string, kind: TtlKind = "cmd") => send(chat.id, { text }, kind);

  switch (cmd) {
    case "start":
      return say("سلام! من پله‌بات هستم. برای مدیریت، منو ادمین گروه کن 🌱");
    case "id":
      return say(`chat id: <code>${chat.id}</code>\nyour id: <code>${msg.from.id}</code>`);
    case "rules":
      return say(esc(CFG.rulesText));
    case "warnings": {
      const u = msg.reply_to_message?.from ?? msg.from;
      const w = await getWarns(chat.id, u.id);
      return say(`اخطارهای ${esc(fullName(u))}: ${toFa(w.count)} از ${toFa(CFG.maxWarnings)} · تبلیغ: ${toFa(w.ad_count)} از ${toFa(CFG.maxWarnings)}`);
    }
    case "me": {
      const s = await userStats(msg.from.id);
      const text = `📖 ${esc(fullName(msg.from))}\nزنجیره‌ی دورهمی: ${toFa(s.streak)} شب پشت سر هم\nجمع صفحه‌های ثبت‌شده: ${toFa(s.total)}\n\n<i>جدول جوایز فقط از روی تیک‌های اپ حساب می‌شه.</i>`;
      if (isGroup(chat)) await trackForDelete(chat.id, msg.message_id, TTL.me);
      return say(text, "me");
    }
    case "خوندم":
    case "خواندم":
    case "read": {
      if (chat.id !== GROUP_ID) return;
      const pages = parseReadingAnywhere(`خوندم ${args.join(" ")}`);
      if (pages !== null) await recordReading(msg, circleDay(new Date()), pages);
      return;
    }
    case "post": {
      if (!(await requireAdmin(msg))) return;
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
    if (r.ok) await setWarns(chat.id, uid, { count: 0, ad_count: 0 });
    return say(r.ok ? "✅ بن برداشته شد." : `خطا: ${esc(r.description ?? "")}`);
  }

  const target = await getTarget(msg, args);
  if (!target) return;

  if (cmd === "warn") {
    await warnProfanity(chat, target, "اخطار از طرف مدیر");
    await del(chat.id, msg.message_id);
  } else if (cmd === "unwarn") {
    const w = await getWarns(chat.id, target.id);
    await setWarns(chat.id, target.id, { count: w.count - 1 });
    await say(`✅ یک اخطار کم شد. اخطار فعلی: ${toFa(Math.max(w.count - 1, 0))}`);
  } else if (cmd === "ban") {
    const r = await tg("banChatMember", { chat_id: chat.id, user_id: target.id });
    await say(r.ok ? "🚫 کاربر بن شد." : `خطا: ${esc(r.description ?? "")}`);
  } else if (cmd === "mute") {
    const minutes = args[0] && /^\d+$/.test(args[0]) ? Math.min(Math.max(Number(args[0]), 1), 60 * 24 * 30) : 60;
    const r = await mute(chat.id, target.id, minutes * 60);
    await say(r.ok ? `🔇 کاربر برای ${toFa(minutes)} دقیقه سایلنت شد.` : `خطا (بات باید دسترسی Ban users داشته باشد): ${esc(r.description ?? "")}`);
  } else if (cmd === "unmute") {
    const r = await tg("restrictChatMember", {
      chat_id: chat.id, user_id: target.id, permissions: ALL_SEND, use_independent_chat_permissions: true,
    });
    await say(r.ok ? "🔊 سایلنت برداشته شد." : `خطا: ${esc(r.description ?? "")}`);
  }
}

// ───────────── پردازش آپدیت ─────────────
const lastFaq = new Map<string, number>();

// deno-lint-ignore no-explicit-any
async function handleUpdate(u: any) {
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
      await send(chat.id, { text }, "welcome");
    }
    return;
  }
  if (isGroup(chat) && msg.left_chat_member) {
    await del(chat.id, msg.message_id);
    return;
  }
  if (!user) return;

  const text: string = msg.text ?? msg.caption ?? "";
  const isCmd = typeof msg.text === "string" && msg.text.startsWith("/");

  if (!isGroup(chat)) {
    if (isCmd) await handleCommand(msg);
    return;
  }
  if (msg.is_automatic_forward) return;

  // پیام از طرف ادمین ناشناس یا کانال
  if (msg.sender_chat) {
    if (msg.sender_chat.id !== chat.id) await del(chat.id, msg.message_id);
    return;
  }

  const admin = await isAdmin(chat.id, user.id);
  if (!admin) {
    // فیلتر روی دستورها هم اجرا می‌شود (در v3 «/x لینک» از فیلتر رد می‌شد)
    const v = classify(msg, text);
    if (v) {
      await del(chat.id, msg.message_id);
      if (v === "profanity") await warnProfanity(chat, user, "استفاده از الفاظ رکیک");
      else if (v === "ad") await warnAd(chat, user);
      else await handlePolitical(chat, user);
      return;
    }
  }

  if (isCmd) {
    await handleCommand(msg);
    return;
  }

  if (await tryReading(msg, text)) return;
  if (admin) return;

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
          text: FAQ[i].answer, reply_to_message_id: msg.message_id, link_preview_options: { is_disabled: true },
        }, "faq");
        return;
      }
    }
  }
}

// ───────────── کران (هر دقیقه از pg_cron) ─────────────
type ScheduleRow = { id: number; target: "group" | "channel"; kind: string; text: string };

async function dispatchDue(): Promise<number> {
  const { data, error } = await sb().rpc("tg_claim_due", { p_limit: 10 });
  if (error) { console.error("claim", error.message); return 0; }
  let sent = 0;
  for (const row of (data ?? []) as ScheduleRow[]) {
    const chatId = row.target === "group" ? GROUP_ID : CHANNEL_ID;
    const text = row.kind === "checkin" && row.target === "group" ? row.text + CFG.checkinFooter : row.text;
    const r = await tg("sendMessage", { chat_id: chatId, text, link_preview_options: { is_disabled: true } });
    const patch = r.ok
      ? { sent_at: new Date().toISOString(), message_id: r.result.message_id, error: null }
      : { error: String(r.description ?? "send failed").slice(0, 300) };
    const { error: e2 } = await sb().from("tg_schedule").update(patch).eq("id", row.id);
    if (e2) console.error("schedule update", e2.message);
    if (r.ok) sent++;
  }
  return sent;
}

/** یک بار در روز (با dedupe_key یکتا) خلاصه را می‌سازد و می‌فرستد. */
async function postSummaryOnce(key: string, build: () => Promise<string | null>): Promise<string> {
  const now = new Date().toISOString();
  const { data: claimed, error } = await sb().from("tg_schedule").insert({
    target: "group", kind: "summary", send_at: now, text: "", dedupe_key: key, claimed_at: now, attempts: 1,
  }).select("id").maybeSingle();
  if (error) return error.code === "23505" ? "done-before" : `error: ${error.message}`;
  const text = await build();
  if (!text) {
    await sb().from("tg_schedule").update({ sent_at: now, error: "skipped: no readers" }).eq("id", claimed!.id);
    return "skipped";
  }
  const r = await tg("sendMessage", { chat_id: GROUP_ID, text, link_preview_options: { is_disabled: true } });
  await sb().from("tg_schedule").update(
    r.ok ? { text, sent_at: new Date().toISOString(), message_id: r.result.message_id }
      : { text, error: String(r.description ?? "send failed").slice(0, 300) }, // tg_claim_due بعداً دوباره تلاش می‌کند
  ).eq("id", claimed!.id);
  return r.ok ? "sent" : "send-failed";
}

async function readingRows(fromDay: string): Promise<ReadingRow[]> {
  const { data, error } = await sb().from("tg_reading").select("user_id,day,pages")
    .eq("chat_id", GROUP_ID).gte("day", fromDay).limit(20000);
  if (error) console.error("reading rows", error.message);
  return (data ?? []) as ReadingRow[];
}

async function summaries(): Promise<Record<string, string>> {
  const p = tehranParts(new Date());
  const minutes = p.hh * 60 + p.mm;
  const out: Record<string, string> = {};
  if (!GROUP_ID) return { summaries: "skipped: GROUP_ID unknown" };
  if (minutes >= 23 * 60 + 30) {
    out.nightly = await postSummaryOnce(`circle:${p.date}`, async () =>
      buildNightlySummary(await readingRows(addDays(p.date, -40)), p.date));
  }
  if (p.weekday === "Fri" && minutes >= 20 * 60 + 30) {
    out.weekly = await postSummaryOnce(`weekly:${p.date}`, async () =>
      buildWeeklySummary(await readingRows(addDays(p.date, -6)), p.date));
  }
  return out;
}

async function tick() {
  await ensureConfig();
  const deleted = await sweep();
  const sent = await dispatchDue();
  const sum = await summaries();
  return { deleted, sent, ...sum };
}

// ───────────── سرور ─────────────
const json = (o: unknown, status = 200) =>
  new Response(JSON.stringify(o, null, 2), { status, headers: { "content-type": "application/json; charset=utf-8" } });

Deno.serve(async (req) => {
  if (MISSING.length) return json({ error: "config error: missing/invalid env", missing: MISSING }, 500);
  const url = new URL(req.url);

  if (req.method === "GET") {
    const cronKey = req.headers.get("x-cron-secret") ?? url.searchParams.get("cron");
    if (cronKey !== null) {
      if (!safeEqual(cronKey, await cronSecret())) return new Response("forbidden", { status: 401 });
      try { return json(await tick()); } catch (e) { console.error("tick", e); return json({ error: "tick failed" }, 500); }
    }
    const setupKey = url.searchParams.get("setup");
    if (setupKey !== null) {
      if (!safeEqual(setupKey, await cronSecret())) return new Response("forbidden", { status: 401 });
      const hook = `${env("SUPABASE_URL")}/functions/v1/telegram-bot`;
      const set = await tg("setWebhook", {
        url: hook, secret_token: WEBHOOK_SECRET,
        allowed_updates: ["message", "channel_post"], drop_pending_updates: true,
      });
      const me = await tg("getMe");
      const info = await tg("getWebhookInfo");
      return json({
        setWebhook: { ok: set.ok, description: set.description }, bot: me.result?.username,
        webhook: { url: info.result?.url, pending: info.result?.pending_update_count, last_error: info.result?.last_error_message },
      });
    }
    if (url.searchParams.has("status")) {
      // فقط خواندنی و بدون راز: وضعیت وب‌هوک برای بررسی بعد از دیپلوی
      const info = await tg("getWebhookInfo");
      const r = info.result ?? {};
      return json({ ok: info.ok, url_is_this_function: r.url === `${env("SUPABASE_URL")}/functions/v1/telegram-bot`, has_custom_certificate: r.has_custom_certificate, pending: r.pending_update_count, last_error_date: r.last_error_date ?? null, last_error: r.last_error_message ?? null });
    }
    return new Response("pelehbot ok");
  }

  if (!safeEqual(req.headers.get("x-telegram-bot-api-secret-token"), WEBHOOK_SECRET)) {
    return new Response("forbidden", { status: 401 });
  }
  try {
    await ensureConfig();
    await handleUpdate(await req.json());
  } catch (e) {
    console.error(e);
  }
  return new Response("ok");
});
