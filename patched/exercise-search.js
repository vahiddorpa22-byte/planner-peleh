/* =====================================================================================
   exercise-search.js — بانک حرکات سمت کلاینت + جستجوی تحمل‌پذیر (بخش ۶.۶ سند)
   مشترک بین اپ (plus.js) و پنل مربی (coach.js). به هیچ متغیر دیگه‌ای از app.js وابسته نیست.
   فایل exercise-bank.json (تولید tools/exercise_bank.py) یک‌بار گرفته و در حافظه نگه داشته می‌شه؛
   Service Worker هم کشش می‌کنه، پس آفلاین هم کار می‌کنه.
   ===================================================================================== */
let PLUS_BANK = null, PLUS_BANK_LOADING = null, PLUS_BANK_INDEX = null, PLUS_BANK_MAP = null;
const EX_BANK_LISTENERS = []; // صفحه‌ها (plus.js / coach.js) اینجا ثبت می‌کنن تا بعد از بارگذاری دوباره رسم بشن
function plusEnsureBank(){
  if(PLUS_BANK || PLUS_BANK_LOADING) return PLUS_BANK_LOADING;
  PLUS_BANK_LOADING = fetch("exercise-bank.json", { cache: "no-cache" }).then(r => r.ok ? r.json() : Promise.reject(r.status)).then(j => {
    PLUS_BANK = j;
    PLUS_BANK_MAP = {};
    j.ex.forEach(e => { PLUS_BANK_MAP[e.i] = e; });
    PLUS_BANK_INDEX = j.ex.map(exIndexEntry);
    if(EX_PENDING_CUSTOM.length){ const rows = EX_PENDING_CUSTOM; EX_PENDING_CUSTOM = []; exAddCustomExercises(rows); }
    EX_BANK_LISTENERS.forEach(fn => { try{ fn(); }catch(e){} });
  }).catch(e => { console.error("exercise bank load failed:", e); PLUS_BANK_LOADING = null; });
  return PLUS_BANK_LOADING;
}
function plusBankMap(){ return PLUS_BANK_MAP || {}; }

// همون نگاشت public.peleh_norm_fa در دیتابیس (015)
const PLUS_NORM_MAP = { "ي":"ی", "ك":"ک", "ى":"ی", "ۀ":"ه", "ة":"ه", "أ":"ا", "إ":"ا", "آ":"ا", "\u200c":" " };
function plusNormFa(t){
  return String(t == null ? "" : t)
    .replace(/[يكىۀةأإآ\u200c]/g, ch => PLUS_NORM_MAP[ch])
    .replace(/[۰-۹]/g, d => String(d.charCodeAt(0) - 0x06F0))
    .replace(/[٠-٩]/g, d => String(d.charCodeAt(0) - 0x0660))
    .replace(/[\u200d\u0640\u200e\u200f]/g, "")
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .toLowerCase()
    .replace(/[-_/.,،()]+/g, " ")
    .replace(/\s+/g, " ").trim();
}
// اصطلاح‌های رایج باشگاه که هنوز به‌صورت alias در بانک نیستن (موقت، تا تکمیل alias ها با بازبینی انسانی)
const PLUS_SLANG = [
  ["بنچ پرس", "پرس سینه"], ["بنچ", "پرس سینه"], ["اسکات", "اسکوات"], ["لیفت مرده", "ددلیفت"], ["ددلیف", "ددلیفت"],
  ["پول اپ", "بارفیکس"], ["پولاپ", "بارفیکس"], ["چین اپ", "بارفیکس دست برعکس"], ["پوش اپ", "شنا"], ["پوشاپ", "شنا"],
  ["لت پول", "لت سیم کش"], ["بایسپ", "جلو بازو"], ["ترایسپ", "پشت بازو"], ["هندستند", "هندستند"], ["muscle up", "ماسل اپ"],
];
// برای کلمه‌های کلی باشگاه، حرکت «اصلی» که اکثر مربی‌ها منظورشونه اول بیاد (نه کوتاه‌ترین اسم).
// کلید: عبارت نرمال‌شده‌ی جستجو؛ مقدار: name_fa دقیق در بانک. (فهرست کوچیک و قابل ویرایش)
const PLUS_CANONICAL = {
  "بنچ": "پرس سینه هالتر تخت", "بنچ پرس": "پرس سینه هالتر تخت", "پرس سینه": "پرس سینه هالتر تخت", "پرس تخت": "پرس سینه هالتر تخت",
  "اسکوات": "اسکوات هالتر از پشت", "اسکات": "اسکوات هالتر از پشت", "ددلیفت": "ددلیفت معمولی", "لیفت مرده": "ددلیفت معمولی",
  "بارفیکس": "بارفیکس دست باز از جلو", "پول اپ": "بارفیکس دست باز از جلو", "شنا": "شنا سوئدی", "پوش اپ": "شنا سوئدی",
  "دیپ": "دیپ سینه", "پرس سرشانه": "پرس سرشانه هالتر ایستاده", "پرس شانه": "پرس سرشانه هالتر ایستاده",
  "جلو بازو": "جلو بازو هالتر ایستاده", "پلانک": "پلانک ساعد", "لت": "لت سیم کش دست باز از جلو",
  "پرس پا": "پرس پا 45 درجه", "هیپ تراست": "هیپ تراست هالتر",
};
function plusEdit1(a, b){
  // فاصله‌ی ویرایشی ≤ ۱ (با خروج زودهنگام)
  if(a === b) return true;
  const la = a.length, lb = b.length;
  if(Math.abs(la - lb) > 1) return false;
  let i = 0, j = 0, diff = 0;
  while(i < la && j < lb){
    if(a[i] === b[j]){ i++; j++; continue; }
    if(++diff > 1) return false;
    if(la > lb) i++; else if(lb > la) j++; else { i++; j++; }
  }
  return diff + (la - i) + (lb - j) <= 1;
}
function plusScoreEntry(entry, q, tokens){
  const { hay, words, compact } = entry;
  const name = plusNormFa(entry.e.n);
  if(name === q) return 100;
  if(name.startsWith(q)) return 85;
  if(hay.includes(q)) return 70;
  const allPrefix = tokens.every(t => words.some(w => w.startsWith(t)));
  if(allPrefix) return 60;
  const qc = q.replace(/ /g, "");
  if(qc.length >= 3 && compact.includes(qc)) return 50;
  const fuzzy = tokens.every(t => words.some(w => w.startsWith(t) || (t.length >= 4 && (plusEdit1(t, w) || plusEdit1(t, w.slice(0, t.length))))));
  return fuzzy ? 30 : 0;
}
function plusSearchExercises(query, opts){
  opts = opts || {};
  if(!PLUS_BANK_INDEX) return [];
  const q = plusNormFa(query);
  const filter = e => (!opts.core || e.k) && (!opts.disc || (e.d || "").includes(opts.disc)) && (!opts.equip || e.q === opts.equip);
  if(!q) return PLUS_BANK_INDEX.filter(x => filter(x.e)).map(x => x.e);
  const variants = [q];
  PLUS_SLANG.forEach(([from, to]) => { const f = plusNormFa(from); if(q.includes(f)) variants.push(q.replace(f, plusNormFa(to))); });
  const canon = PLUS_CANONICAL[q] ? plusNormFa(PLUS_CANONICAL[q]) : null;
  const out = [];
  for(const entry of PLUS_BANK_INDEX){
    if(!filter(entry.e)) continue;
    let best = 0;
    for(const v of variants){ best = Math.max(best, plusScoreEntry(entry, v, v.split(" ").filter(Boolean))); if(best >= 100) break; }
    if(canon && plusNormFa(entry.e.n) === canon) best = Math.max(best, 120);
    if(best) out.push([best + (entry.e.k ? 5 : 0), entry.e]);
  }
  out.sort((a, b) => b[0] - a[0] || a[1].n.length - b[1].n.length);
  return out.map(x => x[1]);
}


/* ---------- نمودار خطی سبک (SVG، بدون کتابخانه) — مشترک اپ و پنل مربی. points: [{x:"1405/07/20", y:62.5}] ---------- */
function exLineChartSvg(points, opts){
  opts = opts || {};
  const W = opts.w || 320, H = opts.h || 130, P = 24, color = opts.color || "var(--gold)";
  const pts = (points || []).filter(p => p && p.y != null && isFinite(p.y));
  if(pts.length < 2) return `<div style="font-size:12px; opacity:.7; padding:8px 0;">${pts.length ? "برای نمودار حداقل ۲ جلسه لازمه." : "هنوز داده‌ای ثبت نشده."}</div>`;
  const ys = pts.map(p => +p.y), min = Math.min(...ys), max = Math.max(...ys), span = (max - min) || 1;
  const X = i => P + i * (W - 2 * P) / (pts.length - 1), Y = v => H - P - (v - min) * (H - 2 * P) / span;
  const fa = n => String(Math.round(n * 10) / 10).replace(/[0-9]/g, x => "۰۱۲۳۴۵۶۷۸۹"[x]);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const d = pts.map((p, i) => `${i ? "L" : "M"}${X(i).toFixed(1)},${Y(+p.y).toFixed(1)}`).join(" ");
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="${esc(opts.label || "نمودار پیشرفت")}" style="max-width:${W}px; direction:ltr; display:block;">
    <line x1="${P}" y1="${H - P}" x2="${W - P}" y2="${H - P}" stroke="currentColor" stroke-opacity=".15"/>
    <path d="${d}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
    ${pts.map((p, i) => `<circle cx="${X(i).toFixed(1)}" cy="${Y(+p.y).toFixed(1)}" r="3.2" fill="${color}"><title>${esc(p.x)}: ${fa(p.y)}</title></circle>`).join("")}
    <text x="${W - P}" y="${Math.max(10, Y(max) - 6)}" font-size="10" text-anchor="end" fill="currentColor" fill-opacity=".65">${fa(max)}</text>
    <text x="${W - P}" y="${H - 8}" font-size="10" text-anchor="end" fill="currentColor" fill-opacity=".65">${fa(min)}</text>
    <text x="${P}" y="${H - 8}" font-size="10" fill="currentColor" fill-opacity=".5">${esc(pts[0].x)}</text>
  </svg>`;
}
// وضعیت پیشرفت (بخش ۹ سند) — «افت احتمالی» یعنی نیاز به بررسی، نه حکم
const EX_STATUS_FA = { improving: ["بهبود", "green"], stable: ["ثابت", "gray"], possible_decline: ["افت احتمالی", "red"], insufficient: ["داده ناکافی", "gray"] };
function exMetricLabel(logType){ return logType === "reps_weight" ? "e1RM تخمینی (کیلو)" : logType === "reps" ? "بیشترین تکرار یک ست" : "بیشترین زمان (ثانیه)"; }
function exFaDate(iso){ try{ return new Intl.DateTimeFormat("fa-IR-u-ca-persian", { day: "numeric", month: "short" }).format(new Date(iso)); }catch(e){ return String(iso || "").slice(5, 10); } }

/* ---------- حرکت‌های اختصاصی مربی (از جدول exercises با owner_coach_id) — اضافه به همین بانک محلی ---------- */
let EX_PENDING_CUSTOM = [];
function exIndexEntry(e){
  const hay = plusNormFa([e.n, e.e || "", (e.a || []).join(" "), e.cx ? "اختصاصی" : ""].join(" "));
  return { e, hay, words: hay.split(" "), compact: hay.replace(/ /g, "") };
}
function exRowToClient(r){
  const d = { bodybuilding: "b", calisthenics: "c", cardio: "a" };
  const out = { i: r.id, n: r.name_fa, l: r.log_type, c: r.category_id, d: (r.disciplines || []).map(x => d[x] || "").join(""), cx: 1 };
  if(r.name_en) out.e = r.name_en;
  if((r.aliases || []).length) out.a = r.aliases;
  if(r.equipment) out.q = r.equipment;
  if(r.unilateral) out.u = 1;
  if(r.difficulty) out.df = r.difficulty;
  if(r.risk) out.rk = 1;
  if(r.extra && r.extra.notes) out.note = r.extra.notes;
  if(r.owner_coach_id) out.ow = r.owner_coach_id;   // مالک (برای اولویت حرکت‌های اختصاصی خود مربی)
  return out;
}
function exAddCustomExercises(rows){
  if(!PLUS_BANK){ EX_PENDING_CUSTOM = EX_PENDING_CUSTOM.concat(rows || []); return; }
  (rows || []).forEach(r => {
    if(!r || r.status === "archived") return;
    const e = exRowToClient(r);
    if(PLUS_BANK_MAP[e.i]){
      const k = PLUS_BANK.ex.findIndex(x => x.i === e.i);
      if(k >= 0) PLUS_BANK.ex[k] = e;
      const j = PLUS_BANK_INDEX.findIndex(x => x.e.i === e.i);
      if(j >= 0) PLUS_BANK_INDEX[j] = exIndexEntry(e);
    } else { PLUS_BANK.ex.push(e); PLUS_BANK_INDEX.push(exIndexEntry(e)); }
    PLUS_BANK_MAP[e.i] = e;
  });
}
// برچسب‌های مشترک (اپ و پنل مربی)
const EX_EQUIPMENT_FA = {
  bodyweight: "وزن بدن", floor: "زمین", pullup_bar: "میله بارفیکس", rings: "حلقه", parallel_bars: "پارالل", dumbbell: "دمبل",
  barbell: "هالتر", cable: "کابل", machine: "دستگاه", band: "کش", smith: "اسمیت", kettlebell: "کتل‌بل", medicine_ball: "توپ طبی",
  landmine: "لندماین", ez_bar: "میله EZ", suspension: "TRX", trap_bar: "هالتر شش‌ضلعی", bench: "نیمکت", wall: "دیوار", box: "باکس", other: "سایر",
};
const EX_LOG_TYPES_FA = { reps_weight: "وزنه × تکرار", reps: "فقط تکرار", time: "زمان (ثانیه)", distance_or_time: "مسافت و زمان (هوازی)" };
const EX_DISCIPLINES_FA = { bodybuilding: "بدنسازی", calisthenics: "کلستنیکس", cardio: "هوازی" };
function exIsCardio(e){ return !!e && ((e.d || "").includes("a") || e.c === 26); }
// نمایش دوز هر ست (برنامه‌ساز، نمای برنامه، تمرین امروز)
const EX_SCHEME_FA = { straight: "ثابت", pyramid: "هرمی", drop: "دراپ‌ست", superset: "سوپرست" };
function exFmtKm(m){ return m >= 1000 ? `${String(Math.round(m / 100) / 10).replace(/[0-9]/g, x => "۰۱۲۳۴۵۶۷۸۹"[x])} کیلومتر` : `${String(Math.round(m)).replace(/[0-9]/g, x => "۰۱۲۳۴۵۶۷۸۹"[x])} متر`; }

/* ---------- شاخص توده‌ی بدنی (BMI) — مشترک اپ ورزشکار و پنل مربی (v2.4.0) ----------
   rows: [{d: "YYYY-MM-DD", bmi: 24.7}] به ترتیب تاریخ. بازه‌ها طبق WHO برای بزرگسال‌ها:
   زیر ۱۸٫۵ کم‌وزن، ۱۸٫۵ تا ۲۵ نرمال، ۲۵ تا ۳۰ اضافه‌وزن، ۳۰ به بالا چاقی. برای زیر ۱۸ سال، ورزشکارهای خیلی عضلانی
   و بارداری BMI معیار دقیقی نیست — متن زیر نمودار همین رو می‌گه. */
var PELEH_BMI_BANDS = [
  { max: 18.5, label: "کم‌وزن", color: "var(--info, #4f8cff)" },
  { max: 25, label: "نرمال", color: "var(--ok, #2fb67c)" },
  { max: 30, label: "اضافه‌وزن", color: "var(--warn, #e7a33e)" },
  { max: 99, label: "چاقی", color: "var(--danger, #e5484d)" },
];
function pelehBmi(kg, cm){ kg = Number(kg); cm = Number(cm); if(!(kg >= 25 && kg <= 300 && cm >= 100 && cm <= 250)) return null; return Math.round(kg / Math.pow(cm / 100, 2) * 10) / 10; }
function pelehBmiBand(b){ return PELEH_BMI_BANDS.find(x => b < x.max) || PELEH_BMI_BANDS[PELEH_BMI_BANDS.length - 1]; }
function pelehBmiChartSvg(rows, opts){
  opts = opts || {};
  const fa = n => String(n).replace(/[0-9]/g, x => "۰۱۲۳۴۵۶۷۸۹"[x]).replace(".", "٫");
  const pts = (rows || []).filter(r => r && r.bmi != null && isFinite(r.bmi));
  if(!pts.length) return `<div style="font-size:12.5px; opacity:.75; padding:6px 0;">${opts.empty || "برای BMI قد و وزن لازمه."}</div>`;
  const W = opts.w || 320, H = opts.h || 150, L = 30, R = 8, T = 10, B = 22;
  const vals = pts.map(p => +p.bmi);
  const lo = Math.max(10, Math.floor(Math.min(...vals, 18.5) - 1)), hi = Math.min(60, Math.ceil(Math.max(...vals, 25) + 1));
  const Y = v => T + (hi - Math.max(lo, Math.min(hi, v))) * (H - T - B) / (hi - lo);
  const X = i => pts.length === 1 ? (L + W - R) / 2 : L + i * (W - L - R) / (pts.length - 1);
  let prev = lo, bands = "";
  PELEH_BMI_BANDS.forEach(b => {
    const top = Math.min(hi, b.max), bottom = Math.max(lo, prev);
    if(top > bottom) bands += `<rect x="${L}" width="${W - L - R}" y="${Y(top).toFixed(1)}" height="${(Y(bottom) - Y(top)).toFixed(1)}" fill="${b.color}" opacity=".12"/>`
      + `<text x="${W - R - 2}" y="${(Y(top) + 11).toFixed(1)}" font-size="9" text-anchor="end" fill="${b.color}" opacity=".9">${b.label}</text>`;
    prev = b.max;
  });
  const ticks = [18.5, 25, 30].filter(v => v > lo && v < hi).map(v => `<line x1="${L}" x2="${W - R}" y1="${Y(v).toFixed(1)}" y2="${Y(v).toFixed(1)}" stroke="currentColor" opacity=".18"/>`
    + `<text x="${L - 4}" y="${(Y(v) + 3).toFixed(1)}" font-size="9" text-anchor="end" fill="currentColor" opacity=".7">${fa(v)}</text>`).join("");
  const line = pts.map((p, i) => `${X(i).toFixed(1)},${Y(p.bmi).toFixed(1)}`).join(" ");
  const last = pts[pts.length - 1], first = pts[0];
  const lab = d => { try{ return new Date(d + "T12:00:00").toLocaleDateString("fa-IR", { month: "short", day: "numeric" }); }catch(e){ return d; } };
  return `<svg viewBox="0 0 ${W} ${H}" style="width:100%; height:auto; direction:ltr; color:var(--muted, #888);" role="img" aria-label="نمودار شاخص توده‌ی بدنی؛ آخرین مقدار ${fa(last.bmi)} (${pelehBmiBand(last.bmi).label})">
    ${bands}${ticks}
    ${pts.length > 1 ? `<polyline points="${line}" fill="none" stroke="var(--gold, #c9a227)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>` : ``}
    ${pts.map((p, i) => `<circle cx="${X(i).toFixed(1)}" cy="${Y(p.bmi).toFixed(1)}" r="${i === pts.length - 1 ? 4 : 2.5}" fill="var(--gold, #c9a227)"/>`).join("")}
    <text x="${L}" y="${H - 6}" font-size="9" fill="currentColor" opacity=".75">${lab(first.d)}</text>
    ${pts.length > 1 ? `<text x="${W - R}" y="${H - 6}" font-size="9" text-anchor="end" fill="currentColor" opacity=".75">${lab(last.d)}</text>` : ``}
  </svg>`;
}
function pelehBmiSummary(rows){
  const pts = (rows || []).filter(r => r && r.bmi != null);
  if(!pts.length) return null;
  const last = pts[pts.length - 1], first = pts[0], band = pelehBmiBand(last.bmi);
  return { bmi: last.bmi, band, delta: pts.length > 1 ? Math.round((last.bmi - first.bmi) * 10) / 10 : 0, since: first.d, n: pts.length };
}

/* ---------- سقف منطقی وزنه و بدن (v2.4.0) — همون سقف‌های سمت سرور (024) ---------- */
const PELEH_LIMITS = { liftKg: 500, reps: 300, bodyKgMin: 25, bodyKgMax: 300, heightMin: 100, heightMax: 250 };
// وزنه‌ی تمرین: منفی → ۰، بیشتر از ۵۰۰ → ۵۰۰، نیم‌کیلو گرد. خروجی { v, clamped }
function pelehClampLift(v){
  let n = Number(String(v == null ? "" : v).replace(/[۰-۹]/g, d => d.charCodeAt(0) - 0x06F0).replace(/[٫,]/g, "."));
  if(!isFinite(n) || n <= 0) return { v: null, clamped: false };
  const c = n > PELEH_LIMITS.liftKg;
  n = Math.min(n, PELEH_LIMITS.liftKg);
  return { v: Math.round(n * 2) / 2, clamped: c };
}
function pelehClampReps(v){
  let n = Math.round(Number(String(v == null ? "" : v).replace(/[۰-۹]/g, d => d.charCodeAt(0) - 0x06F0)));
  if(!isFinite(n) || n <= 0) return { v: null, clamped: false };
  const c = n > PELEH_LIMITS.reps;
  return { v: Math.min(n, PELEH_LIMITS.reps), clamped: c };
}

/* ---------- حرکت‌های اخیر و اختصاصی مربی اول (v2.4.0) ---------- */
function exRecentKey(){ return "pelehExRecent_" + ((typeof C !== "undefined" && C && C.user && C.user.id) || (typeof currentUser !== "undefined" && currentUser && currentUser.id) || "x"); }
function exRecentList(){ try{ const a = JSON.parse(localStorage.getItem(exRecentKey()) || "[]"); return Array.isArray(a) ? a.slice(0, 40) : []; }catch(e){ return []; } }
function exNoteUsed(id){
  if(id == null) return;
  try{ const a = exRecentList().filter(x => x !== id); a.unshift(id); localStorage.setItem(exRecentKey(), JSON.stringify(a.slice(0, 40))); }catch(e){}
}
// رتبه برای مرتب‌سازی پیشنهادها: ۰ = حرکت اختصاصی خود همین مربی، ۱ = اخیراً استفاده‌شده، ۲ = بقیه (ترتیب جستجو حفظ می‌شه)
function exRankForCoach(e, coachId, recent){
  if(e && e.cx && (!e.ow || e.ow === coachId)) return 0;
  if(recent && recent.indexOf(e.i) >= 0) return 1 + recent.indexOf(e.i) / 100;
  return 2;
}

/* ---------- نمایش ست‌های ثبت‌شده — مشترک ورزشکار و پنل مربی (batch 2026-11-08) ----------
   قبلاً «۷.۵×۱۰، ۵×۱۱» نشون داده می‌شد: معلوم نبود وزنه×تکراره یا تکرار×وزنه، و تو متن راست‌به‌چپ بدتر هم می‌شد.
   حالا هر ست یه خط جدا با واحد صریح: «ست ۱: ۱۰ تکرار × ۷٫۵ کیلو»، «۱۲ تکرار (وزن بدن)»، «۴۵ ثانیه».
   ترتیب ست‌ها از خود جدول workout_sets (set_no) خونده می‌شه؛ RPC exercise_progress ست‌ها رو به ترتیب «بهترین» برمی‌گردونه. */
function exFaNum(n){
  if(n == null || n === "" || !isFinite(+n)) return "";
  return String(Math.round(+n * 100) / 100).replace(".", "٫").replace(/[0-9]/g, x => "۰۱۲۳۴۵۶۷۸۹"[x]);
}
function exFaThousands(n){ return String(Math.round(+n || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, "٬").replace(/[0-9]/g, x => "۰۱۲۳۴۵۶۷۸۹"[x]); }
function exFaDuration(sec){
  sec = Math.round(+sec || 0);
  if(sec < 60) return `${exFaNum(sec)} ثانیه`;
  const m = Math.floor(sec / 60), s = sec % 60;
  return s ? `${exFaNum(m)} دقیقه و ${exFaNum(s)} ثانیه` : `${exFaNum(m)} دقیقه`;
}
// «سه‌شنبه ۱۳ آبان» — تاریخ جلسه (performed_on = تاریخ تهران، YYYY-MM-DD)
function exFaSessionDate(iso){
  try{
    const d = new Date(String(iso).slice(0, 10) + "T12:00:00+03:30");
    const parts = new Intl.DateTimeFormat("fa-IR-u-ca-persian", { weekday: "long", day: "numeric", month: "long", timeZone: "Asia/Tehran" }).formatToParts(d);
    const g = t => (parts.find(p => p.type === t) || {}).value || "";
    return `${g("weekday")} ${g("day")} ${g("month")}`.trim();
  }catch(e){ return exFaDate(iso); }
}
// متن یه ست. s: {reps, weight|weight_kg, sec|duration_sec, distance_m}
function exSetText(s, logType){
  s = s || {};
  const reps = s.reps, w = s.weight != null ? s.weight : s.weight_kg, sec = s.sec != null ? s.sec : s.duration_sec, dist = s.distance_m;
  if(logType === "distance_or_time" || (dist && !reps)){
    const p = [];
    if(sec) p.push(exFaDuration(sec));
    if(dist) p.push(exFmtKm(dist));
    return p.join(" · ") || "—";
  }
  if(logType === "time" || (sec && !reps)) return exFaDuration(sec);
  const r = `${exFaNum(reps || 0)} تکرار`;
  if(w != null && +w > 0) return logType === "reps" ? `${r} (وزن بدن + ${exFaNum(w)} کیلو)` : `${r} × ${exFaNum(w)} کیلو`;
  return `${r} (وزن بدن)`;
}
// جمع‌بندی یه جلسه: «۴ ست · مجموع ۴۳ تکرار · حجم کل ۲۴۰ کیلو»
function exSessionTotals(sets, logType){
  sets = sets || [];
  const out = [`${exFaNum(sets.length)} ست`];
  let reps = 0, vol = 0, sec = 0, dist = 0;
  sets.forEach(s => {
    const w = s.weight != null ? s.weight : s.weight_kg, t = s.sec != null ? s.sec : s.duration_sec;
    reps += +s.reps || 0; sec += +t || 0; dist += +s.distance_m || 0;
    if(w && s.reps) vol += (+w) * (+s.reps);
  });
  if(reps) out.push(`مجموع ${exFaNum(reps)} تکرار`);
  if(vol) out.push(`حجم کل ${exFaThousands(vol)} کیلو`);
  if(!reps && sec) out.push(`مجموع ${exFaDuration(sec)}`);
  if(dist) out.push(`مسافت ${exFmtKm(dist)}`);
  return out.join(" · ");
}
// HTML یه جلسه — sess: {date, sets:[...], ordered:true|false}
function exSessionHtml(sess, logType){
  exEnsureSetCss();
  const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const sets = sess.sets || [];
  return `<div class="ex-sess">
    <div class="ex-sess-h">${esc(exFaSessionDate(sess.date))}</div>
    <ol class="ex-sets">${sets.map((s, k) => `<li><span class="ex-set-n">${sess.ordered === false ? "•" : `ست ${exFaNum(k + 1)}:`}</span> <span class="ex-set-v">${esc(exSetText(s, logType))}</span></li>`).join("")}</ol>
    <div class="ex-sess-t">${esc(exSessionTotals(sets, logType))}</div>
  </div>`;
}
// برچسب متریک نمودار با توضیح کوتاه (روی موبایل title دیده نمی‌شه، پس متن کوتاه هم کنارش هست)
function exMetricLabelHtml(logType){
  if(logType === "reps_weight") return `<abbr title="تخمین حداکثر یک تکرار" style="text-decoration:none;">e1RM</abbr> تخمینی (کیلو) <span class="ex-hint">— تخمین حداکثر یک تکرار</span>`;
  return exMetricLabel(logType);
}
// ست‌های واقعی هر جلسه، به ترتیب set_no (RLS: خود ورزشکار همه‌ی جلسه‌هاش؛ مربی فقط جلسه‌های برنامه‌های خودش — همون دامنه‌ی exercise_progress)
async function exLoadSessions(athleteId, exId){
  try{
    const { data, error } = await sb.from("workout_sets")
      .select("session_id,set_no,reps,weight_kg,duration_sec,distance_m,created_at,workout_sessions!inner(performed_on,started_at,athlete_id)")
      .eq("exercise_id", exId).eq("skipped", false).eq("workout_sessions.athlete_id", athleteId)
      .order("set_no", { ascending: true }).limit(1000);
    if(error || !Array.isArray(data)) return null;
    const by = {};
    data.forEach(r => {
      const ws = r.workout_sessions || {};
      const g = by[r.session_id] || (by[r.session_id] = { date: ws.performed_on, started: ws.started_at || "", sets: [], ordered: true });
      g.sets.push(r);
    });
    return Object.values(by).map(g => { g.sets.sort((a, b) => (a.set_no || 0) - (b.set_no || 0) || String(a.created_at).localeCompare(String(b.created_at))); return g; })
      .sort((a, b) => String(b.date).localeCompare(String(a.date)) || String(b.started).localeCompare(String(a.started)));
  }catch(e){ return null; }
}
// اگه خوندن مستقیم نشد: ست‌های خود RPC (ترتیبشون «بهترین اول»ه، پس شماره‌ی ست نمی‌زنیم)
function exSessionsFromSeries(series){
  return (series || []).slice().reverse().map(p => ({ date: p.date, sets: p.sets || [], ordered: false }));
}
// بعد از باز شدن جزئیات، اگه بیرون از دید بود نرم بیارش تو دید (Safari iOS و WebView اندروید)
function exRevealEl(id){
  const go = () => {
    const el = document.getElementById(id);
    if(!el) return;
    const r = el.getBoundingClientRect(), vh = window.innerHeight || document.documentElement.clientHeight;
    if(r.top >= 60 && r.top < vh - 120) return;   // سرش دیده می‌شه، تکون نده
    try{ el.scrollIntoView({ behavior: "smooth", block: "start" }); }catch(e){ el.scrollIntoView(true); }
  };
  (window.requestAnimationFrame || setTimeout)(() => setTimeout(go, 30));
}
let EX_SET_CSS = false;
function exEnsureSetCss(){
  if(EX_SET_CSS || typeof document === "undefined") return;
  EX_SET_CSS = true;
  const st = document.createElement("style");
  st.textContent = `
  .ex-det{ margin:4px 0 10px; padding:12px; border:1px solid var(--gold-line); border-radius:14px; background:var(--surface-2); scroll-margin-top:72px; }
  .ex-sess{ padding:10px 0; border-top:1px solid var(--divider); }
  .ex-sess:first-child{ border-top:none; }
  .ex-sess-h{ font-weight:800; color:var(--text); font-size:14px; margin-bottom:4px; }
  .ex-sets{ list-style:none; margin:0; padding:0; }
  .ex-sets li{ color:var(--text); font-size:14px; line-height:2; unicode-bidi:plaintext; }
  .ex-set-n{ color:var(--muted); font-weight:700; display:inline-block; min-width:44px; }
  .ex-sess-t{ color:var(--muted); font-size:12.5px; line-height:1.8; margin-top:2px; }
  .ex-hint{ color:var(--faint); font-size:12px; }
  .ex-row-open{ background:var(--gold-faint); }`;
  document.head.appendChild(st);
}
