// تست محلی پارسرهای پله‌بات v4 — بدون شبکه و بدون env.
// اجرا:  deno run test_local.ts
//   یا:  node --experimental-strip-types test_local.ts   (Node ≥ 22.6)
import assert from "node:assert/strict";
import {
  addDays, buildNightlySummary, buildWeeklySummary, circleDay, classify, computeStreak, hasPolitical,
  hasProfanity, isAd, missingEnv, parseReadingAnywhere, parseReadingReply, safeEqual, tehranParts, toFa,
  toLatinDigits, SUMMARY_FOOTER,
} from "./lib.ts";

let pass = 0, fail = 0;
function t(name: string, fn: () => void) {
  try { fn(); pass++; console.log("ok   ", name); }
  catch (e) { fail++; console.log("FAIL ", name, "\n      ", (e as Error).message); }
}

// ── سیاسی ──
t("political: clear terms are caught", () => {
  for (const s of ["جمهوری اسلامی باید بره", "خامنه‌ای گفت", "براندازی تنها راهه", "رژیم آخوندی", "سپاه پاسداران",
    "اصلاح‌طلب‌ها", "اصولگراها", "مجاهدین خلق", "سلطنت‌طلب", "ولایت فقیه", "جمهوری‌خواه"]) {
    assert.equal(hasPolitical(s), true, s);
  }
});
t("political: book talk is NOT caught (removed words)", () => {
  for (const s of [
    "آشپزخانه‌ی کرملین درباره‌ی آشپزهای دیکتاتورهاست", "کتاب تاریخ دوره‌ی پهلوی رو خوندم",
    "رمان درباره‌ی انتخابات یه دهکده‌ست", "اعتراضات کارگری تو جوانی ورتر نیست", "بیوگرافی ترامپ",
    "نتانیاهو", "کودتای ۲۸ مرداد تو کتاب", "آدم ارزشی بودن", "ارزشیها", "آخوندزاده نمایشنامه نوشته",
    "سپاه ایران در شاهنامه", "بسیج نیرو برای خوندن", "منافقین در قرآن", "تاریخ مشروطه‌خواهان",
    "سرمایه‌گذار هوشمند کتاب خوبیه", "رضاشاه پهلوی",
  ]) assert.equal(hasPolitical(s), false, s);
});

// ── فحش ──
t("profanity: caught incl. ZWNJ / repeated letters / Arabic ye", () => {
  for (const s of ["کیر", "جااااکش", "پدر‌سگ", "حرومزاده‌ای", "kos", "لاشي"]) assert.equal(hasProfanity(s), true, s);
});
t("profanity: clean words not caught", () => {
  for (const s of ["کتاب کیرکگور", "کونفوسیوس", "کسب و کار", "سلام بچه‌ها", "کیک"]) assert.equal(hasProfanity(s), false, s);
});

// ── تبلیغ ──
t("ads: foreign links, t.me invites, keywords, channel forwards", () => {
  assert.equal(isAd({}, "بیا اینجا https://spam.xyz/x"), true);
  assert.equal(isAd({}, "t.me/somechannel"), true);
  assert.equal(isAd({}, "کسب درآمد دلاری از خانه"), true);
  assert.equal(isAd({ forward_origin: { type: "channel" } }, ""), true);
  assert.equal(isAd({ entities: [{ type: "text_link", url: "https://bad.com" }] }, "اینجا"), true);
});
t("ads: own links allowed, normal text ok", () => {
  assert.equal(isAd({}, "app.pelehapp.ir"), false);
  assert.equal(isAd({}, "https://t.me/pelehapp_official"), false);
  assert.equal(isAd({}, "سرمایه‌گذار هوشمند رو خوندم"), false);
  assert.equal(isAd({ forward_origin: { type: "user" } }, "سلام"), false);
});
t("classify order: profanity > political > ad", () => {
  assert.equal(classify({}, "کیر جمهوری اسلامی spam.xyz"), "profanity");
  assert.equal(classify({}, "جمهوری اسلامی spam.xyz"), "political");
  assert.equal(classify({}, "spam.xyz"), "ad");
  assert.equal(classify({}, "خوندم ۱۲"), null);
});

// ── عدد صفحه ──
t("digits: Persian & Arabic → Latin", () => {
  assert.equal(toLatinDigits("۱۲۳٤٥"), "12345");
  assert.equal(toFa(1405), "۱۴۰۵");
});
t("reply parser: bare numbers", () => {
  assert.equal(parseReadingReply("۱۲"), 12);
  assert.equal(parseReadingReply("12"), 12);
  assert.equal(parseReadingReply(" ۲۰ صفحه ✅"), 20);
  assert.equal(parseReadingReply("٣٠"), 30);
  assert.equal(parseReadingReply("0"), 0);
  assert.equal(parseReadingReply("۱۲!"), 12);
});
t("reply parser: rejects non-bare / out of range", () => {
  assert.equal(parseReadingReply("صد سال تنهایی صفحه ۱۲۰"), null);
  assert.equal(parseReadingReply("۱۲ تا ۱۵"), null);
  assert.equal(parseReadingReply("5000"), null);
  assert.equal(parseReadingReply("✅"), null);
  assert.equal(parseReadingReply("سلام"), null);
});
t("anywhere parser: «خوندم ۱۲» forms", () => {
  assert.equal(parseReadingAnywhere("خوندم ۱۲"), 12);
  assert.equal(parseReadingAnywhere("امروز خوندم 25 صفحه"), 25);
  assert.equal(parseReadingAnywhere("خواندم: ۸"), 8);
  assert.equal(parseReadingAnywhere("۱۵ صفحه خوندم"), 15);
  assert.equal(parseReadingAnywhere("۱۵ صفحه رو خوندم 😅"), 15);
});
t("anywhere parser: ignores «نخوندم» and plain numbers", () => {
  assert.equal(parseReadingAnywhere("نخوندم ۱۲ روزه"), null);
  assert.equal(parseReadingAnywhere("۱۲"), null);
  assert.equal(parseReadingAnywhere("کتاب ۳۰۰ صفحه‌ای"), null);
  assert.equal(parseReadingAnywhere("خوندمش"), null);
});

// ── زمان تهران (UTC+03:30، بدون ساعت تابستانی) ──
t("tehranParts: 21:30 Tehran = 18:00 UTC", () => {
  const p = tehranParts(new Date("2026-11-22T18:00:00Z"));
  assert.deepEqual([p.date, p.hh, p.mm, p.weekday], ["2026-11-22", 21, 30, "Sun"]);
});
t("tehranParts: 23:59 UTC is next day in Tehran", () => {
  assert.equal(tehranParts(new Date("2026-11-22T23:59:00Z")).date, "2026-11-23");
});
t("tehranParts: Friday 27 Nov 2026 is Fri", () => {
  assert.equal(tehranParts(new Date("2026-11-27T17:00:00Z")).weekday, "Fri");
});
t("circleDay: 02:00 Tehran counts for previous night, 03:30 for today", () => {
  assert.equal(circleDay(new Date("2026-11-22T22:30:00Z")), "2026-11-22"); // 02:00 Tehran on 23rd
  assert.equal(circleDay(new Date("2026-11-23T00:00:00Z")), "2026-11-23"); // 03:30 Tehran
  assert.equal(circleDay(new Date("2026-11-23T04:30:00Z")), "2026-11-23"); // 08:00 Tehran
});
t("seed math: '2026-11-22 21:30' Asia/Tehran == 18:00Z", () => {
  // همان چیزی که SQL با at time zone می‌سازد
  assert.equal(tehranParts(new Date("2026-11-22T18:00:00Z")).hh, 21);
});
t("addDays across month/year", () => {
  assert.equal(addDays("2026-11-30", 1), "2026-12-01");
  assert.equal(addDays("2027-01-01", -1), "2026-12-31");
});

// ── زنجیره و خلاصه‌ها ──
t("streak: counts back from today or yesterday", () => {
  assert.equal(computeStreak(["2026-11-22", "2026-11-23", "2026-11-24"], "2026-11-24"), 3);
  assert.equal(computeStreak(["2026-11-22", "2026-11-23"], "2026-11-24"), 2);
  assert.equal(computeStreak(["2026-11-21", "2026-11-22"], "2026-11-24"), 0);
  assert.equal(computeStreak([], "2026-11-24"), 0);
});
t("nightly summary: no names, counts, streak line, footer", () => {
  const today = "2026-11-28";
  const rows = [];
  for (let i = 0; i < 7; i++) rows.push({ user_id: 1, day: addDays(today, -i), pages: 10 });
  for (let i = 0; i < 3; i++) rows.push({ user_id: 2, day: addDays(today, -i), pages: 5 });
  rows.push({ user_id: 3, day: today, pages: 0 });
  const s = buildNightlySummary(rows, today)!;
  assert.ok(s.startsWith("دورهمی امشب: ۲ نفر، ۱۵ صفحه 👏"), s);
  assert.ok(s.includes("۱ نفر ۷ شب پشت سر هم 🔥"), s);
  assert.ok(s.endsWith(SUMMARY_FOOTER));
  assert.equal(buildNightlySummary([{ user_id: 1, day: "2026-11-27", pages: 9 }], today), null);
});
t("nightly summary: 3-night line when nobody has 7", () => {
  const today = "2026-11-24";
  const rows = [0, 1, 2].map((i) => ({ user_id: 5, day: addDays(today, -i), pages: 4 }));
  assert.ok(buildNightlySummary(rows, today)!.includes("۱ نفر ۳ شب پشت سر هم"));
});
t("weekly summary: readers, pages, all-7 count", () => {
  const today = "2026-11-27";
  const rows = [];
  for (let i = 0; i < 7; i++) rows.push({ user_id: 1, day: addDays(today, -i), pages: 10 });
  rows.push({ user_id: 2, day: today, pages: 30 });
  rows.push({ user_id: 3, day: addDays(today, -7), pages: 99 }); // خارج از هفته
  const s = buildWeeklySummary(rows, today)!;
  assert.ok(s.includes("۲ نفر این هفته خوندن، روی هم ۱۰۰ صفحه."), s);
  assert.ok(s.includes("۱ نفر هر ۷ شب خوندن"), s);
  assert.equal(buildWeeklySummary([], today), null);
});

// ── امنیت / env ──
t("safeEqual", () => {
  assert.equal(safeEqual("abc", "abc"), true);
  assert.equal(safeEqual("abd", "abc"), false);
  assert.equal(safeEqual(null, "abc"), false);
  assert.equal(safeEqual("", ""), false);
});
t("missingEnv reports names only and validates format", () => {
  const good: Record<string, string> = {
    BOT_TOKEN: "x", WEBHOOK_SECRET: "a".repeat(32), CRON_SECRET: "y", GROUP_ID: "-1001", CHANNEL_ID: "-1002",
    ADMIN_IDS: "1,2", SUPABASE_URL: "u", SUPABASE_SERVICE_ROLE_KEY: "k",
  };
  assert.deepEqual(missingEnv((k) => good[k]), []);
  assert.deepEqual(missingEnv((k) => ({ ...good, BOT_TOKEN: "" } as Record<string, string>)[k]), ["BOT_TOKEN"]);
  assert.ok(missingEnv((k) => ({ ...good, GROUP_ID: "abc" } as Record<string, string>)[k])[0].startsWith("GROUP_ID"));
  assert.ok(missingEnv((k) => ({ ...good, WEBHOOK_SECRET: "short" } as Record<string, string>)[k])[0].startsWith("WEBHOOK_SECRET"));
});

console.log(`\n${pass} passed, ${fail} failed`);
if (fail) throw new Error(`${fail} test(s) failed`);
