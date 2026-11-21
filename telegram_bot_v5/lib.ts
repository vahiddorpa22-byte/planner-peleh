// پله‌بات v4 — توابع خالص (بدون شبکه و بدون env) تا با test_local.ts تست شوند.
// فقط سینتکس قابل‌حذف TypeScript (بدون enum) تا هم در Deno و هم در Node (--experimental-strip-types) اجرا شود.

export const TZ = "Asia/Tehran";
/** پیام‌هایی که بین ۰۰:۰۰ تا ۰۳:۰۰ می‌آیند، برای «شب قبل» دورهمی حساب می‌شوند. */
export const CIRCLE_CUTOFF_HOURS = 3;
export const MAX_PAGES_PER_DAY = 1000;

// ───────────── نرمال‌سازی متن ─────────────
const STRIP_RE = new RegExp("[" + [0x200c, 0x200d, 0x200e, 0x200f, 0x0640].map((c) => String.fromCharCode(c)).join("") + String.fromCharCode(0x064b) + "-" + String.fromCharCode(0x0652) + "]", "g"); // ZWNJ/ZWJ/LRM/RLM/کشیده/اعراب
export function norm(t: string): string {
  return t.toLowerCase().replace(STRIP_RE, "")
    .replace(/ي/g, "ی").replace(/ك/g, "ک").replace(/ة/g, "ه")
    .replace(/[أإ]/g, "ا").replace(/ۀ/g, "ه");
}
export const squash = (s: string): string => s.replace(/(.)\1+/gu, "$1");

/** ارقام فارسی (۰-۹) و عربی (٠-٩) را لاتین می‌کند. */
export function toLatinDigits(s: string): string {
  return s
    .replace(/[۰-۹]/g, (c) => String(c.charCodeAt(0) - 0x06F0))
    .replace(/[٠-٩]/g, (c) => String(c.charCodeAt(0) - 0x0660));
}
export function toFa(n: number | string): string {
  return String(n).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);
}

// ───────────── فحش ─────────────
// exact = فقط کلمهٔ کامل، sub = داخل کلمه هم بررسی می‌شود (بدون تغییر نسبت به v3)
const BAD_EXACT_RAW = [
  "کیر", "کون", "کص", "کونی", "کیری", "کیرم", "کیرت", "کونت", "ریدم", "ریدی",
  "کسشر", "کسشعر", "کصکش", "لاشی", "kir", "kos", "kose", "koskesh", "jende", "kiri",
];
const BAD_SUB_RAW = [
  "جنده", "جاکش", "کسکش", "کسخل", "کصخل", "گایید", "خارکسه", "حرومزاده",
  "حرامزاده", "پدرسگ", "بیناموس", "بیشرف",
];
const BAD_EXACT = new Set(BAD_EXACT_RAW.map((w) => squash(norm(w))));
const BAD_SUB = BAD_SUB_RAW.map((w) => squash(norm(w)));

export function hasProfanity(text: string): boolean {
  for (const tok of norm(text).match(/[\p{L}\p{N}_]+/gu) ?? []) {
    const t = squash(tok);
    if (BAD_EXACT.has(t) || BAD_SUB.some((b) => t.includes(b))) return true;
  }
  return false;
}

// ───────────── سیاسی (فهرست کوتاه‌شده: فقط اصطلاح‌های بی‌ابهام) ─────────────
// حذف‌شده نسبت به v3 چون در گفت‌وگوی کتابی هم می‌آیند:
//   دیکتاتور، پهلوی، رضا پهلوی(*)، انتخابات، اعتراضات، ترامپ، نتانیاهو، کودتا، ارزشی، ارزشیها،
//   آخوند (آخوندزاده، رمان‌ها)، سپاه (شاهنامه)، بسیج/بسیجی (معنای عام، ادبیات جنگ)،
//   منافقین (معنای عام/قرآنی)، مشروطه‌خواه (کتاب‌های تاریخ مشروطه).
//   (*) «رضا پهلوی» هم حذف شد چون «رضاشاه پهلوی» در کتاب‌های تاریخ زیاد است.
export const POLITICAL_SUB_RAW = [
  "جمهوری اسلامی", "حکومت اسلامی", "خامنه ای", "ولایت فقیه",
  "اصلاح طلب", "اصولگرا", "براندازی", "سپاه پاسداران", "رژیم آخوندی",
  "مجاهدین خلق", "سلطنت طلب", "ضدانقلاب", "اپوزیسیون", "جمهوری خواه",
];
export const POLITICAL_EXACT_RAW: string[] = [];
const POL_SUB = POLITICAL_SUB_RAW.map((w) => norm(w).replace(/\s+/g, ""));
const POL_EXACT = new Set(POLITICAL_EXACT_RAW.map((w) => squash(norm(w))));

export function hasPolitical(text: string): boolean {
  const n = norm(text);
  const ns = n.replace(/\s+/g, "");
  if (POL_SUB.some((k) => ns.includes(k))) return true;
  for (const tok of n.match(/[\p{L}\p{N}_]+/gu) ?? []) {
    if (POL_EXACT.has(squash(tok))) return true;
  }
  return false;
}

// ───────────── تبلیغ / لینک ─────────────
export const AD_CFG = {
  blockLinks: true,
  blockMentions: false,
  blockChannelForwards: true,
  allowedDomains: ["pelehapp.ir"],
  allowedUsernames: ["pelehapp", "pelehapp_official"],
  // «سرمایه گذاری» حذف شد: نام کتاب «سرمایه‌گذار هوشمند» و بحث کتاب‌های مالی را می‌گرفت.
  adKeywords: [
    "کسب درآمد", "درآمد دلاری", "خرید فالوور", "فالوور واقعی", "ممبر واقعی",
    "ممبر ارزان", "جوین شو", "عضو کانال ما", "بیت کوین",
    "ارز دیجیتال", "شرط بندی", "کازینو", "وام فوری", "سیگنال رایگان",
  ],
};
const TLDS = "com|ir|org|net|info|xyz|ly|io|co|me|app|shop|site|online|top|click|link|biz|store|ink";
const DOMAIN_RE = new RegExp(`(?:https?://)?(?:www\\.)?((?:[a-z0-9-]+\\.)+(?:${TLDS}))\\b(/[^\\s]*)?`, "gi");
const MENTION_RE = /(?<![\w.])@([A-Za-z0-9_]{4,32})/g;
const ALLOWED_USERS = new Set(AD_CFG.allowedUsernames.map((u) => u.toLowerCase().replace(/^@/, "")));
const AD_KEYWORDS = AD_CFG.adKeywords.map((k) => norm(k).replace(/\s+/g, ""));

export function linkIsBad(domain: string, path?: string): boolean {
  domain = domain.toLowerCase();
  if (["t.me", "telegram.me", "telegram.dog"].includes(domain)) {
    const user = (path ?? "/").replace(/^\/+|\/+$/g, "").split("/")[0].toLowerCase();
    return !ALLOWED_USERS.has(user);
  }
  return !AD_CFG.allowedDomains.some((d) => domain === d || domain.endsWith("." + d));
}

// deno-lint-ignore no-explicit-any
export function isAd(msg: any, text: string): boolean {
  if (AD_CFG.blockLinks) {
    const chunks = [text];
    for (const e of [...(msg.entities ?? []), ...(msg.caption_entities ?? [])]) {
      if (e.type === "text_link" && e.url) chunks.push(e.url);
    }
    for (const c of chunks) {
      for (const m of c.matchAll(DOMAIN_RE)) if (linkIsBad(m[1], m[2])) return true;
    }
  }
  if (AD_CFG.blockMentions) {
    for (const m of text.matchAll(MENTION_RE)) if (!ALLOWED_USERS.has(m[1].toLowerCase())) return true;
  }
  if (text) {
    const ns = norm(text).replace(/\s+/g, "");
    if (AD_KEYWORDS.some((k) => k && ns.includes(k))) return true;
  }
  if (AD_CFG.blockChannelForwards && msg.forward_origin?.type === "channel") return true;
  return false;
}

/** نوع تخلف یک پیام (ترتیب مثل v3: فحش، سیاسی، تبلیغ). */
// deno-lint-ignore no-explicit-any
export function classify(msg: any, text: string): "profanity" | "political" | "ad" | null {
  if (text && hasProfanity(text)) return "profanity";
  if (text && hasPolitical(text)) return "political";
  if (isAd(msg, text)) return "ad";
  return null;
}

// ───────────── دورهمی کتاب‌خونی: خواندن عدد صفحه ─────────────
function okPages(s: string | undefined): number | null {
  if (s === undefined) return null;
  const n = Number(s);
  return Number.isInteger(n) && n >= 0 && n <= MAX_PAGES_PER_DAY ? n : null;
}

/** حداکثر عدد «بی‌واحد» که صفحه حساب می‌شه (تا سال‌هایی مثل ۱۹۸۴ یا ۱۴۰۴ تو اسم کتاب صفحه حساب نشن). */
export const MAX_BARE_PAGES = 500;

/** جواب به چک‌این امشب (v5: آزادتر — ۱۷ آبان دیدیم همه با «عدد + اسم کتاب» جواب دادن و v4 همه رو رد کرد).
 *  «۱۲»، «۱۲ صفحه ✅»، «۲۰ صفحه از صد سال تنهایی»، «امروز ۱۵ تا»، «حدود ۳۰، کتاب ۱۹۸۴» → ۳۰، «نخوندم» → ۰ */
export function parseReadingReply(text: string): number | null {
  const t = norm(toLatinDigits(text)).trim();
  if (!t) return null;
  // ۱) عددی که کنار «صفحه/ص/تا/ورق» اومده، اولویت داره
  const unit = t.match(/(?:^|[^\d])(\d{1,4})\s*(?:صفحه|صفحات|ص|تا|ورق)(?![\p{L}])/u);
  if (unit) { const n = okPages(unit[1]); if (n !== null) return n; }
  // ۲) اولین عدد بی‌واحد که معقوله (سال/شماره‌ی بزرگ رد می‌شه)
  for (const m of t.matchAll(/(?:^|[^\d])(\d{1,4})(?!\d)/gu)) {
    const n = okPages(m[1]);
    if (n !== null && n <= MAX_BARE_PAGES) return n;
  }
  // ۳) «نخوندم / هیچی / امروز نشد» = صفر (یعنی حاضر بود، ولی زنجیره جلو نمی‌ره)
  if (/(?:^|[^\p{L}])(?:نخوندم|نخواندم|هیچی|نشد|نرسیدم)(?![\p{L}])/u.test(t)) return 0;
  return null;
}

/** هر جای گروه: «خوندم ۱۲»، «امروز خوندم 12 صفحه»، «۱۲ صفحه خوندم». «نخوندم» حساب نمی‌شود. */
export function parseReadingAnywhere(text: string): number | null {
  const t = norm(toLatinDigits(text));
  let m = t.match(/(?:^|[^\p{L}])(?:خوندم|خواندم)\s*[:\-]?\s*(\d{1,4})(?!\d)/u);
  if (m) return okPages(m[1]);
  m = t.match(/(?:^|[^\d])(\d{1,4})\s*(?:صفحه|ص)\s*(?:رو\s*|را\s*)?(?:خوندم|خواندم)(?![\p{L}])/u);
  if (m) return okPages(m[1]);
  // v5: پیام کوتاهِ «امروز ۲۰ صفحه» / «۲۰ صفحه 📖» بدون ریپلای هم حسابه (فقط پیام کوتاه، تا جمله‌های معمولی قاطی نشن)
  if (t.trim().length <= 30) {
    m = t.trim().match(/^(?:امروز|امشب)?\s*(\d{1,4})\s*(?:صفحه|ص)[^\d]*$/u);
    if (m) return okPages(m[1]);
  }
  return null;
}

// ───────────── بحث و نظرسنجی کتابی (v5) ─────────────
/** متن ردیف poll در tg_schedule: خط اول سؤال، خط‌های بعدی که با «-» شروع می‌شن گزینه‌ها (۲ تا ۱۰). */
export function parsePollSpec(text: string): { question: string; options: string[] } | null {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const question = (lines.find((l) => !l.startsWith("-")) ?? "").slice(0, 300);
  const options = lines.filter((l) => l.startsWith("-")).map((l) => l.replace(/^-\s*/, "").slice(0, 100)).filter(Boolean);
  if (!question || options.length < 2 || options.length > 10) return null;
  return { question, options };
}

/** متن ردیف poll_result: «ref=<id شمارهٔ ردیف نظرسنجی>» در خط اول، عنوان در خط دوم. */
export function parsePollResultRef(text: string): { ref: number; title: string } | null {
  const m = text.match(/^ref=(\d+)\s*\n?([\s\S]*)$/);
  return m ? { ref: Number(m[1]), title: m[2].trim() } : null;
}

/** نتیجهٔ نظرسنجی بسته‌شده برای کانال/گروه. */
export function buildPollResult(title: string, poll: { question: string; options: { text: string; voter_count: number }[]; total_voter_count?: number }): string {
  const total = poll.options.reduce((s, o) => s + (o.voter_count || 0), 0);
  const lines = poll.options
    .map((o) => ({ ...o, pct: total ? Math.round((o.voter_count / total) * 100) : 0 }))
    .sort((a, b) => b.voter_count - a.voter_count)
    .map((o, i) => `${i === 0 && total ? "🏆" : "▫️"} ${o.text}: ${toFa(o.pct)}٪`);
  const head = title || `نظر گروه درباره‌ی «${poll.question}» 📊`;
  return `${head}\n\n${lines.join("\n")}\n\n${toFa(total)} نفر رأی دادن · بحث کامل تو گروه «گفت‌وگوی پله»`;
}

// ───────────── زمان تهران ─────────────
export type TehranParts = { date: string; hh: number; mm: number; weekday: string };

export function tehranParts(d: Date): TehranParts {
  const f = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", weekday: "short", hourCycle: "h23",
  });
  const p: Record<string, string> = {};
  for (const x of f.formatToParts(d)) p[x.type] = x.value;
  return { date: `${p.year}-${p.month}-${p.day}`, hh: Number(p.hour) % 24, mm: Number(p.minute), weekday: p.weekday };
}

/** روز دورهمی (تاریخ تهران با برش ۳ بامداد). */
export function circleDay(d: Date): string {
  return tehranParts(new Date(d.getTime() - CIRCLE_CUTOFF_HOURS * 3600_000)).date;
}

export function addDays(day: string, n: number): string {
  const [y, m, dd] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, dd + n)).toISOString().slice(0, 10);
}

/** زنجیره: تعداد شب‌های پشت سر هم با صفحه > ۰ که به امروز یا دیروز ختم می‌شود. */
export function computeStreak(days: Iterable<string>, today: string): number {
  const set = new Set(days);
  let cur = set.has(today) ? today : set.has(addDays(today, -1)) ? addDays(today, -1) : null;
  let n = 0;
  while (cur && set.has(cur)) { n++; cur = addDays(cur, -1); }
  return n;
}

// ───────────── متن خلاصه‌ها ─────────────
export const SUMMARY_FOOTER = "جدول جوایز آذر فقط از روی تیک‌های اپ حساب می‌شه · app.pelehapp.ir";

export type ReadingRow = { user_id: number; day: string; pages: number; first_name?: string | null };

/** v5 (درخواست وحید، ۱۸ آبان): جدول آخر شب — هر نفر: صفحه‌های امشب + جمع همه‌ی شب‌ها تا امشب.
 *  مرتب بر اساس جمع. اگه هیچ‌کس تا حالا چیزی ثبت نکرده باشه null (پستی نمی‌ره). */
export function buildNightlyTable(rows: ReadingRow[], today: string, maxRows = 25): string | null {
  type U = { name: string; total: number; tonight: number; days: Set<string>; nameDay: string };
  const users = new Map<number, U>();
  for (const r of rows) {
    if (r.day > today) continue;
    const u = users.get(r.user_id) ?? { name: "", total: 0, tonight: 0, days: new Set<string>(), nameDay: "" };
    u.total += Math.max(r.pages || 0, 0);
    if (r.day === today) u.tonight += Math.max(r.pages || 0, 0);
    if (r.pages > 0) u.days.add(r.day);
    if (r.first_name && r.day >= u.nameDay) { u.name = r.first_name; u.nameDay = r.day; }
    users.set(r.user_id, u);
  }
  const list = [...users.values()].filter((u) => u.total > 0)
    .sort((a, b) => b.total - a.total || b.tonight - a.tonight);
  if (!list.length) return null;
  const medal = ["🥇", "🥈", "🥉"];
  const lines = list.slice(0, maxRows).map((u, i) => {
    const name = (u.name || "دوست کتاب‌خون").replace(/\s+/g, " ").trim().slice(0, 18);
    const st = computeStreak(u.days, today);
    const tonight = u.tonight > 0 ? `امشب ${toFa(u.tonight)}` : "امشب —";
    return `${medal[i] ?? `${toFa(i + 1)}.`} ${name} · ${tonight} · جمع ${toFa(u.total)}${st >= 3 ? ` 🔥${toFa(st)}` : ""}`;
  });
  const readersTonight = list.filter((u) => u.tonight > 0).length;
  const pagesTonight = list.reduce((s, u) => s + u.tonight, 0);
  const pagesAll = list.reduce((s, u) => s + u.total, 0);
  const more = list.length > maxRows ? `\n… و ${toFa(list.length - maxRows)} نفر دیگه` : "";
  const head = readersTonight
    ? `📚 جدول دورهمی تا امشب\nامشب ${toFa(readersTonight)} نفر، ${toFa(pagesTonight)} صفحه · جمع گروه تا حالا ${toFa(pagesAll)} صفحه`
    : `📚 جدول دورهمی تا امشب\nامشب هنوز کسی ثبت نکرده · جمع گروه تا حالا ${toFa(pagesAll)} صفحه`;
  return `${head}\n\n${lines.join("\n")}${more}\n\n🔥 = شب‌های پشت سر هم · ثبت: جواب عدد به سؤال ۲۱:۳۰\n${SUMMARY_FOOTER}`;
}

/** خلاصه‌ی شبانه. اگر کسی نخوانده باشد null (پستی نمی‌رود). */
export function buildNightlySummary(rows: ReadingRow[], today: string): string | null {
  const byUser = new Map<number, Set<string>>();
  let readers = 0, pages = 0;
  for (const r of rows) {
    if (r.pages <= 0) continue;
    if (!byUser.has(r.user_id)) byUser.set(r.user_id, new Set());
    byUser.get(r.user_id)!.add(r.day);
    if (r.day === today) { readers++; pages += r.pages; }
  }
  if (readers === 0) return null;
  let s7 = 0, s3 = 0;
  for (const days of byUser.values()) {
    if (!days.has(today)) continue;
    const st = computeStreak(days, today);
    if (st >= 7) s7++;
    if (st >= 3) s3++;
  }
  let line = "";
  if (s7 > 0) line = `\n${toFa(s7)} نفر ۷ شب پشت سر هم 🔥`;
  else if (s3 > 0) line = `\n${toFa(s3)} نفر ۳ شب پشت سر هم 🔥`;
  return `دورهمی امشب: ${toFa(readers)} نفر، ${toFa(pages)} صفحه 👏${line}\n\n${SUMMARY_FOOTER}`;
}

/** خلاصه‌ی هفتگی جمعه (۷ روز تا امروز). بدون اسم و رتبه. */
export function buildWeeklySummary(rows: ReadingRow[], today: string): string | null {
  const from = addDays(today, -6);
  const byUser = new Map<number, Set<string>>();
  let pages = 0;
  for (const r of rows) {
    if (r.pages <= 0 || r.day < from || r.day > today) continue;
    if (!byUser.has(r.user_id)) byUser.set(r.user_id, new Set());
    byUser.get(r.user_id)!.add(r.day);
    pages += r.pages;
  }
  if (byUser.size === 0) return null;
  let all7 = 0;
  for (const d of byUser.values()) if (d.size >= 7) all7++;
  const line7 = all7 > 0 ? `\n${toFa(all7)} نفر هر ۷ شب خوندن 🔥` : "";
  return `خلاصه‌ی هفته‌ی دورهمی کتاب‌خونی 📚\n${toFa(byUser.size)} نفر این هفته خوندن، روی هم ${toFa(pages)} صفحه.${line7}\n\n${SUMMARY_FOOTER}`;
}

// ───────────── امنیت ─────────────
export function safeEqual(a: string | null | undefined, b: string): boolean {
  if (!a || !b) return false;
  const ea = new TextEncoder().encode(a), eb = new TextEncoder().encode(b);
  let diff = ea.length ^ eb.length;
  for (let i = 0; i < Math.max(ea.length, eb.length); i++) diff |= (ea[i] ?? 0) ^ (eb[i] ?? 0);
  return diff === 0;
}

/** نام env‌هایی که خالی یا نامعتبرند (فقط نام، هرگز مقدار). */
export function missingEnv(get: (k: string) => string | undefined): string[] {
  const req = ["BOT_TOKEN", "WEBHOOK_SECRET", "CRON_SECRET", "GROUP_ID", "CHANNEL_ID", "ADMIN_IDS",
    "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"];
  const bad = req.filter((k) => !(get(k) ?? "").trim());
  const g = (get("GROUP_ID") ?? "").trim();
  if (g && !/^-\d+$/.test(g)) bad.push("GROUP_ID(invalid: must be a negative number like -100...)");
  const c = (get("CHANNEL_ID") ?? "").trim();
  if (c && !/^-\d+$/.test(c) && !/^@[A-Za-z0-9_]{4,}$/.test(c)) bad.push("CHANNEL_ID(invalid)");
  const ids = (get("ADMIN_IDS") ?? "").trim();
  if (ids && !ids.split(",").every((s) => /^\d+$/.test(s.trim()))) bad.push("ADMIN_IDS(invalid)");
  if ((get("WEBHOOK_SECRET") ?? "").trim() && !/^[A-Za-z0-9_-]{16,256}$/.test(get("WEBHOOK_SECRET")!.trim())) {
    bad.push("WEBHOOK_SECRET(must be 16-256 chars A-Z a-z 0-9 _ -)");
  }
  return bad;
}
