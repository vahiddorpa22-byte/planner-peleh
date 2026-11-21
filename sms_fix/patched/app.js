/* ===================== پله — Planner App ===================== */

/* ---- XSS safety: escape any text that came FROM a person (their own or someone else's)
   before it goes into innerHTML. Anything a user typed — their name, an activity title, a
   support message — must go through this before landing in a template string, especially
   anywhere it might be shown to someone ELSE (leaderboard, admin panel, challenge lists,
   support chat) where an unescaped <img onerror=...> style payload would actually run in
   that other person's (or the admin's) browser. ---- */
function escapeHtml(str){
  if(str == null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/* ---- Digit normalization: Persian/Arabic-Indic numerals → Latin ----
   Lets people type numbers with a Persian keyboard everywhere in the app. ---- */
function faToEnDigits(str){
  if(str == null) return str;
  const fa = "۰۱۲۳۴۵۶۷۸۹", ar = "٠١٢٣٤٥٦٧٨٩";
  return String(str).replace(/[۰-۹٠-٩]/g, ch=>{
    let i = fa.indexOf(ch);
    if(i>=0) return String(i);
    i = ar.indexOf(ch);
    if(i>=0) return String(i);
    return ch;
  });
}
function numInput(id){
  const el = document.getElementById(id);
  return el ? faToEnDigits(el.value) : "";
}
// Auto-normalize Persian/Arabic digits to Latin while typing, in EVERY text field and
// textarea in the app — not just ones explicitly marked type=number/inputmode=numeric. This
// is deliberately broad (not scoped to a class/id list) so any field added in a future update
// gets this for free, with no per-field opt-in to remember. Only digit characters are touched;
// the rest of whatever's typed (Persian text, punctuation, etc.) is left exactly as typed.
document.addEventListener("input", function(e){
  const el = e.target;
  if(!el || !el.tagName) return;
  const isTextish = (el.tagName==="INPUT" && el.type!=="checkbox" && el.type!=="radio" && el.type!=="file" && el.type!=="color") || el.tagName==="TEXTAREA";
  if(!isTextish) return;
  const converted = faToEnDigits(el.value);
  if(converted !== el.value){
    const pos = el.selectionStart;
    el.value = converted;
    // type=email/number از setSelectionRange پشتیبانی نمی‌کنن و خطا می‌دادن
    if(pos!=null){ try{ el.setSelectionRange(pos, pos); }catch(_e){} }
  }
});

const DAY_KEYS = ["sat","sun","mon","tue","wed","thu","fri"];
const DAY_LABELS = {sat:"شنبه", sun:"یکشنبه", mon:"دوشنبه", tue:"سه‌شنبه", wed:"چهارشنبه", thu:"پنجشنبه", fri:"جمعه"};
const JS_DAY_TO_KEY = {0:"sun",1:"mon",2:"tue",3:"wed",4:"thu",5:"fri",6:"sat"};

/* ---- Jalali (Persian) calendar — offline conversion, no network needed ---- */
const JALALI_MONTHS = ["فروردین","اردیبهشت","خرداد","تیر","مرداد","شهریور","مهر","آبان","آذر","دی","بهمن","اسفند"];
function gregorianToJalali(gy, gm, gd){
  const g_d_m = [0,31,59,90,120,151,181,212,243,273,304,334];
  let jy = (gy <= 1600) ? 0 : 979;
  gy -= (gy <= 1600) ? 621 : 1600;
  const gy2 = (gm > 2) ? (gy + 1) : gy;
  let days = (365*gy) + Math.floor((gy2+3)/4) - Math.floor((gy2+99)/100) + Math.floor((gy2+399)/400) - 80 + gd + g_d_m[gm-1];
  jy += 33 * Math.floor(days/12053);
  days %= 12053;
  jy += 4 * Math.floor(days/1461);
  days %= 1461;
  if(days > 365){
    jy += Math.floor((days-1)/365);
    days = (days-1) % 365;
  }
  let jm, jd;
  if(days < 186){
    jm = 1 + Math.floor(days/31);
    jd = 1 + (days % 31);
  } else {
    jm = 7 + Math.floor((days-186)/30);
    jd = 1 + ((days-186) % 30);
  }
  return [jy, jm, jd];
}
function jalaliOf(dateObj){
  return gregorianToJalali(dateObj.getFullYear(), dateObj.getMonth()+1, dateObj.getDate());
}
function jalaliToGregorian(jy, jm, jd){
  let gy = (jy <= 979) ? 621 : 1600;
  jy -= (jy <= 979) ? 0 : 979;
  let days = (365*jy) + (Math.floor(jy/33)*8) + Math.floor(((jy%33)+3)/4) + 78 + jd + ((jm < 7) ? (jm-1)*31 : ((jm-7)*30)+186);
  gy += 400 * Math.floor(days/146097);
  days %= 146097;
  if(days > 36524){
    gy += 100 * Math.floor(--days/36524);
    days %= 36524;
    if(days >= 365) days++;
  }
  gy += 4 * Math.floor(days/1461);
  days %= 1461;
  if(days > 365){
    gy += Math.floor((days-1)/365);
    days = (days-1) % 365;
  }
  const gd0 = days + 1;
  const isLeapG = (gy%4===0 && gy%100!==0) || gy%400===0;
  const sal_a = [0,31, isLeapG?29:28, 31,30,31,30,31,31,30,31,30,31];
  let gm = 0, gd = gd0;
  for(gm=1; gm<=12; gm++){
    if(gd <= sal_a[gm]) break;
    gd -= sal_a[gm];
  }
  return [gy, gm, gd];
}
function jalaliMonthLength(jy, jm){
  if(jm <= 6) return 31;
  if(jm <= 11) return 30;
  const [gy,gm,gd] = jalaliToGregorian(jy,12,30);
  const back = gregorianToJalali(gy,gm,gd);
  return (back[1]===12 && back[2]===30) ? 30 : 29;
}
const WEEK_ORDER = ["sat","sun","mon","tue","wed","thu","fri"];
function saturdayOf(dateObj){
  const wk = dayKeyOf(dateObj);
  const idx = WEEK_ORDER.indexOf(wk);
  const d = new Date(dateObj);
  d.setDate(d.getDate() - idx);
  return d;
}
const FA_DIGITS = ["۰","۱","۲","۳","۴","۵","۶","۷","۸","۹"];
function toFaDigits(n){
  return String(n).replace(/[0-9]/g, d => FA_DIGITS[+d]);
}
function jalaliDateLabel(dateObj = new Date()){
  const [jy,jm,jd] = jalaliOf(dateObj);
  return `${toFaDigits(jd)} ${JALALI_MONTHS[jm-1]} ${toFaDigits(jy)}`;
}

/* ---- Custom date field: wraps the native <input type=date> so it can never visually overflow.
   The native control is fully transparent and clipped by an overflow:hidden container;
   we render our own Jalali-formatted text on top. ---- */
function dateField(inputId, value, onchangeAttr){
  let display = `<span class="date-display placeholder">انتخاب تاریخ تولد</span>`;
  if(value){
    const [y,m,d] = value.split("-").map(Number);
    if(y && m && d) display = `<span class="date-display">${jalaliDateLabel(new Date(y, m-1, d))}</span>`;
  }
  return `
  <div class="date-field" onclick="openDatePicker(this)">
    ${display}
    <input type="date" id="${inputId}" value="${value||''}" onchange="${onchangeAttr}" style="position:absolute; opacity:0; pointer-events:none; width:1px; height:1px;">
  </div>`;
}
/* Custom Jalali (Shamsi) picker — the native <input type=date> only supports the Gregorian
   calendar in every browser, so we never show it to the person; it's just a hidden storage
   slot we update programmatically and fire a real 'change' event on. */
function openDatePicker(wrap){
  const input = wrap.querySelector('input[type=date]');
  if(!input) return;
  let jy, jm, jd;
  if(input.value){
    const [y,m,d] = input.value.split("-").map(Number);
    [jy, jm, jd] = jalaliOf(new Date(y, m-1, d));
  } else {
    const [cy, cm, cd] = jalaliOf(new Date());
    jy = cy - 20; jm = cm; jd = cd; // sensible default for a birthdate picker
  }
  renderJalaliPicker(input, jy, jm, jd);
}
function renderJalaliPicker(input, jy, jm, jd){
  const [curJy] = jalaliOf(new Date());
  const yearsStart = curJy - 100, yearsEnd = curJy;
  const dayCount = jalaliMonthLength(jy, jm);
  if(jd > dayCount) jd = dayCount;
  openOverlay(`
    <h3>تاریخ تولد</h3>
    <div class="field" style="display:flex; gap:8px;">
      <select id="jdp_day" style="flex:1; padding:11px; border-radius:12px; border:1px solid var(--line); background:var(--surf-a); color:var(--text); text-align:center;">
        ${Array.from({length:dayCount},(_,i)=>i+1).map(d=>`<option value="${d}" ${d===jd?'selected':''}>${toFaDigits(d)}</option>`).join("")}
      </select>
      <select id="jdp_month" style="flex:2; padding:11px; border-radius:12px; border:1px solid var(--line); background:var(--surf-a); color:var(--text); text-align:center;" onchange="onJalaliPickerMonthChange(${jy})">
        ${JALALI_MONTHS.map((name,i)=>`<option value="${i+1}" ${(i+1)===jm?'selected':''}>${name}</option>`).join("")}
      </select>
      <select id="jdp_year" style="flex:1.3; padding:11px; border-radius:12px; border:1px solid var(--line); background:var(--surf-a); color:var(--text); text-align:center;" onchange="onJalaliPickerYearChange()">
        ${Array.from({length:yearsEnd-yearsStart+1},(_,i)=>yearsEnd-i).map(y=>`<option value="${y}" ${y===jy?'selected':''}>${toFaDigits(y)}</option>`).join("")}
      </select>
    </div>
    <div class="sheet-actions">
      <button class="btn btn-ghost" onclick="confirmJalaliPicker(true)">پاک کردن</button>
      <button class="btn btn-primary" onclick="confirmJalaliPicker(false)">تأیید</button>
    </div>
  `);
  window.__jdpTargetInput = input;
}
function onJalaliPickerYearChange(){
  const jy = parseInt(document.getElementById('jdp_year').value);
  const jm = parseInt(document.getElementById('jdp_month').value);
  const jd = parseInt(document.getElementById('jdp_day').value);
  renderJalaliPicker(window.__jdpTargetInput, jy, jm, jd);
}
function onJalaliPickerMonthChange(jy){
  const jm = parseInt(document.getElementById('jdp_month').value);
  const jd = parseInt(document.getElementById('jdp_day').value);
  const yEl = document.getElementById('jdp_year');
  renderJalaliPicker(window.__jdpTargetInput, yEl ? parseInt(yEl.value) : jy, jm, jd);
}
function confirmJalaliPicker(clear){
  const input = window.__jdpTargetInput;
  if(!input) return;
  if(clear){
    input.value = "";
  } else {
    const jy = parseInt(document.getElementById('jdp_year').value);
    const jm = parseInt(document.getElementById('jdp_month').value);
    const jd = parseInt(document.getElementById('jdp_day').value);
    const [gy, gm, gd] = jalaliToGregorian(jy, jm, jd);
    input.value = `${gy}-${String(gm).padStart(2,'0')}-${String(gd).padStart(2,'0')}`;
  }
  closeOverlay();
  input.dispatchEvent(new Event('change'));
}
function onObDateChange(el){
  // Update just the display span in-place so we don't wipe an unsaved name field via a full re-render.
  const span = el.previousElementSibling;
  if(!el.value){ span.textContent = "انتخاب تاریخ تولد"; span.classList.add("placeholder"); return; }
  const [y,m,d] = el.value.split("-").map(Number);
  span.textContent = jalaliDateLabel(new Date(y, m-1, d));
  span.classList.remove("placeholder");
}

/* ---- Daily motivational quotes (rotates every day, deterministic per date, narrated by خود پله) ---- */
const DAILY_QUOTES = [
  "شروع دوباره هم یه‌جور پیشرفته — همین که برگشتی کافیه.",
  "لازم نیست امروز کامل باشه، فقط لازمه شروع بشه.",
  "یه قدم کوچیک امروز، از هزار تا نیت بزرگ فردا بهتره.",
  "هفته رو با یه کار کوچیک ولی واقعی شروع کن، نه با فشار زیاد.",
  "پیشرفت همیشه بلند نیست؛ گاهی فقط ادامه‌دادنه.",
  "امروز فقط باید بهتر از دیروز باشی، نه بهترین.",
  "هر روز یه فرصت تازه‌ست، نه یه امتحان.",
  "ثبات از انگیزه مهم‌تره — همین امتیاز کوچیک امروز رو بگیر.",
  "هیچ روزی هدر نمی‌ره اگه ازش یه چیز کوچیک یاد بگیری.",
  "خسته بودن دلیل نمیشه که هیچی نکنی؛ فقط یعنی سبک‌تر شروع کن.",
  "هیچ‌کس همیشه انگیزه نداره — کسایی که ادامه می‌دن، بدون انگیزه هم شروع می‌کنن.",
  "یه امتیاز کوچیک امروز، بهتر از هزار برنامه‌ی بی‌عمل فرداست.",
  "نتیجه دیر میاد، ولی هیچ‌وقت بدون تلاش امروز نمیاد.",
  "به‌جای کامل بودن، به تکرار فکر کن.",
  "هر تیکی که می‌زنی، داری به خودت ثابت می‌کنی که رو حرفت هستی.",
  "بعضی روزا فقط باید کم‌ترین کارو انجام بدی — همونم قهرمانیه.",
  "خودتو با دیروز مقایسه کن، نه با یه نسخه‌ی ایده‌آل که وجود نداره.",
  "پیشرفت آروم هم پیشرفته، فقط صداش کمتره.",
  "هیچ عادتی یک‌شبه ساخته نمیشه؛ امروز فقط یه آجر بذار.",
  "وقتی حال نداری، همونم فقط یه چیزو انجام بده — کافیه.",
  "استراحت هم بخشی از مسیره، نه دشمن پیشرفت.",
  "هر باری که وسوسه شدی بی‌خیال شی و نشدی، یه پیروزی واقعیه.",
  "کسی که ادامه میده، همیشه از کسی که فقط شروع می‌کنه جلوتره.",
  "لازم نیست انگیزه داشته باشی، فقط لازمه یه قدم برداری.",
  "هرچقدر کوچیک، هرچقدر ناقص — انجام‌شده از نشده بهتره.",
  "امروز رو برای خودت بساز، نه برای نشون‌دادن به کسی.",
  "بهترین روز برای شروع، همینه که توش هستی.",
  "قرار نیست همیشه راحت باشه؛ قراره ارزششو داشته باشه.",
  "هر امتیازی که می‌گیری، یه پله نزدیک‌تری به نسخه‌ی بهتر خودت.",
  "خودتو دست‌کم نگیر؛ همینی که تا اینجا اومدی یعنی داری کار می‌کنی.",
];
function dailyQuoteFor(dateObj){
  const key = todayKey(dateObj);
  let hash = 0;
  for(let i=0;i<key.length;i++) hash += key.charCodeAt(i);
  return DAILY_QUOTES[hash % DAILY_QUOTES.length];
}

const MOOD_OPTIONS = ["😞","😐","🙂","😄","🤩"];


function blankProfileData(){
  return {
    activities: [],
    rewards: [],
    history: {},       // dateKey -> [activityId,...]
    moods: {},          // dateKey -> {emoji, text}
    dailyExtra: {},      // dateKey -> {goal, top3:[..], tasks:[..], notes:{..}, goalActions:{short,medium,long}}
    weekly: {},           // weekKey(saturday dateKey) -> {goal, review:{..}}
    goals: {short:[], medium:[], long:[]},
    events: {},            // dateKey -> [{id, title}]  (birthdays, meetings, any occasion — past or future)
    spent: 0,
    settings: {
      sections: {tasks:true, mainActivity:true, coreActivities:true, notes:true, mood:true, ladder:true},
      puzzleLayout: {}, // tabKey -> {tileId: areaName} — desktop-only drag-to-swap tile positions
      reminderSlot: null,      // فاز A۷: morning | noon | evening | night | none — ساعت ترجیحی یادآوری عادت‌ها
      showAllSections: false,  // فاز A۴: true = حالت ساده‌ی «امروز» برای کاربر تازه خاموش
    },
    nextRewardId: 1,
    nextActivitySeq: 1,
    nextTaskSeq: 1,
    nextEventSeq: 1,
    seenCoach: {},      // {flowId: true} — which coachmark tours have already been shown
    aiCoach: null,      // {date, message, plan:[]} — cached "امروز" (general daily-habit) coach suggestion
    aiCoachBook: null,  // {date, message, plan:[]} — separate, book-reading-specific coach suggestion (shown in تب کتاب)
    importantStep: null, // {date, title, reason, minutes, done} — "مهم‌ترین قدم امروز", Premium-only AI pick
    seenTips: {},       // tipId -> true — one-time contextual "coachmarks", shown once at the exact moment they're relevant instead of all upfront in the intro tour
    checkinMedia: {},   // "{dateKey}:{activityId}" -> {photo, note, ts} — optional photo/note attached to a specific day's check-in ("mini daily journal")
    workProfile: {completed:false, employment:null, workStart:"", workEnd:"", interests:[], interestsCustom:""}, // used to tailor coach/important-step suggestions around what the person actually likes and when they're free
    funnel: {},         // فاز A: زمان اولین‌بارها برای قیف داشبورد ادمین (quickstart_shown, first_habit, first_checkin, reminder_set, ...)
  };
}
/* Backward-compat helper: old versions stored some fields as a single string; normalize to arrays. */
function toArr(v){
  if(Array.isArray(v)) return v;
  return v ? [v] : [];
}

function normalizeProfileData(d){
  const merged = Object.assign(blankProfileData(), d || {});
  merged.settings = Object.assign(blankProfileData().settings, d && d.settings || {});
  merged.settings.sections = Object.assign(blankProfileData().settings.sections, (d && d.settings && d.settings.sections) || {});
  const g = (d && d.goals) || {};
  merged.goals = {short: toArr(g.short), medium: toArr(g.medium), long: toArr(g.long)};
  if(!merged.funnel || typeof merged.funnel !== "object" || Array.isArray(merged.funnel)) merged.funnel = {};
  if(!merged.seenCoach || typeof merged.seenCoach !== "object") merged.seenCoach = {};
  return merged;
}

/* ===================== Cloud sync (Supabase) ===================== */
const SUPABASE_URL = "https://gzcwtrqysjedwdfmhbzx.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_dRr5B_5OygCpBSVE3BZQSQ_MGFOybXL";
const sb = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
}) : null;
// صفحه‌ی واسطه‌ی برگشت از «ورود با گوگل» در نسخه‌ی اندروید. این آدرس باید تو
// Supabase → Authentication → URL Configuration → Redirect URLs اضافه شده باشه.
const NATIVE_AUTH_RETURN_URL = "https://app.pelehapp.ir/auth-return.html";

/* ---- Edge Function calls ----
   supabase-js برای هر پاسخ غیر 2xx از Edge Function، data رو null برمی‌گردونه و متن خطای واقعی
   سرور (مثلاً «حسابی با این شماره پیدا نشد») گم می‌شه — برای همین قبلاً کاربر همیشه یه پیام
   کلی مثل «کد اشتباهه» می‌دید. این تابع بدنه‌ی JSON خطا رو می‌خونه و به‌جای data برمی‌گردونه،
   پس همه‌ی جاهایی که `data?.error` رو نشون می‌دن، حالا پیام واقعی سرور رو نشون می‌دن. */
async function invokeEdge(name, options){
  if(!sb) throw new Error("supabase client not loaded");
  const res = await sb.functions.invoke(name, options || {});
  if(res && res.error && res.data == null){
    const ctx = res.error.context;
    if(ctx && typeof ctx.clone === "function"){
      try{
        const body = JSON.parse(await ctx.clone().text());
        if(body && typeof body === "object") return Object.assign({}, res, { data: body });
      }catch(e){ /* بدنه JSON نبود — همون خطای کلی می‌مونه */ }
    }
  }
  return res;
}

/* ---- Input normalizers ---- */
const PHONE_INVALID_MSG = "شماره موبایل معتبر نیست (مثلاً ۰۹۱۲۳۴۵۶۷۸۹).";
const NET_ERROR_MSG = "مشکل در اتصال — اینترنتت رو چک کن و دوباره امتحان کن.";
// هر شکلی که کاربر شماره رو بنویسه (با فاصله/خط تیره، ارقام فارسی، +98 / 0098 / 98 / بدون صفر)
// رو به فرمت واحد 09xxxxxxxxx تبدیل می‌کنه؛ اگه شماره‌ی موبایل ایرانی معتبر نباشه null برمی‌گردونه.
function normalizeIranMobile(raw){
  let s = faToEnDigits(String(raw || "")).replace(/[\s\-().\u200c\u200e\u200f]/g, "");
  if(s.startsWith("+98")) s = "0" + s.slice(3);
  else if(s.startsWith("0098")) s = "0" + s.slice(4);
  else if(/^989\d{9}$/.test(s)) s = "0" + s.slice(2);
  else if(/^9\d{9}$/.test(s)) s = "0" + s;
  return /^09\d{9}$/.test(s) ? s : null;
}
/* sms-fix 2026-10-26: پیامک پله (MrOTP) فقط به شماره‌های ایران می‌رسه. شماره‌ی خارجی (+1… / 0044… و
   هر پیش‌شماره‌ای غیر از ۹۸) رو تشخیص می‌دیم تا به‌جای «شماره معتبر نیست»، راه درست (ورود با گوگل) رو نشون بدیم. */
const INTL_PHONE_MSG = "پیامک پله فعلاً فقط به شماره‌های ایران می‌رسه. اگه خارج از ایرانی، «ادامه با گوگل» رو بزن — شماره لازم نیست.";
function looksInternationalPhone(raw){
  const s = faToEnDigits(String(raw || "")).replace(/[\s\-().‌‎‏]/g, "");
  if(normalizeIranMobile(s)) return false;
  const m = /^(?:\+|00)(\d{7,15})$/.exec(s);
  return !!m && !m[1].startsWith("98");
}
function phoneErrorFor(raw){ return looksInternationalPhone(raw) ? INTL_PHONE_MSG : PHONE_INVALID_MSG; }
// حساب‌هایی که ایمیل واقعی دارن (گوگل، یا ایمیل قدیمی) می‌تونن بدون شماره‌ی ایرانی وارد اپ بشن.
// حساب موبایلی (ایمیل فنی @phone.pelehapp.ir) همیشه شماره‌ی تأییدشده داره، پس این گزینه رو نمی‌بینه.
const PHONE_SHADOW_DOMAIN = "@phone.pelehapp.ir";
function isPhoneOptionalAccount(){
  const e = String((currentUser && currentUser.email) || "").toLowerCase();
  return !!e && !e.endsWith(PHONE_SHADOW_DOMAIN);
}
function phoneSkipped(){
  return isPhoneOptionalAccount() && !!(DATA && DATA.phoneSkip && DATA.phoneSkip.abroad);
}
function onlyDigits(raw){ return faToEnDigits(String(raw || "")).replace(/\D/g, ""); }
function normalizeEmail(raw){ return String(raw || "").trim().toLowerCase(); }
function looksLikeEmail(s){ return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s); }

let currentUser = null;         // Supabase auth user, or null if signed out
let profileMeta = {name:"", birthdate:"", photo:null, phone:"", phoneVerified:false};
let DATA = blankProfileData();  // replaced with real data after sign-in
let cloudReady = false;         // true once initial session check has resolved
let saveTimer = null;
let authError = "";
// موقتاً غیرفعاله چون سرویس ارسال ایمیل (SMTP) هنوز درست نشده — وقتی حل شد، این رو true کن تا
// دوباره گزینه‌های «با ایمیل» تو صفحه‌های ورود/ثبت‌نام برگردن. کد مربوطه دست‌نخورده باقی مونده.
const EMAIL_AUTH_ENABLED = false;
let authMode = EMAIL_AUTH_ENABLED ? "signin" : "signup_phone";        // "signin" | "signin_phone" | "signin_phone_otp" | "signup_choice" | "signup_email" | "signup_otp" | "signup_phone" | "signup_phone_otp" | "reset_email" | "reset_otp" | "newpassword"
let pendingAuthEmail = "";      // email currently being verified via an emailed OTP (signup or password reset)
let pendingAuthPhone = "";      // phone currently being verified via a 4-digit SMS OTP
let needsPasswordSetup = false; // true between a successful email-OTP verification and the person actually setting a password
let loadError = false;          // true if we couldn't safely determine the profile state — never guess in this case
let profileReady = false;       // true only once THIS user's real profile/data has been loaded — saves are blocked until then
let lastAuthEmail = "";         // keeps what was typed in the auth screens across re-renders (an error used to wipe the field)
let lastAuthPhone = "";
let justVerifiedPhone = null;   // {userId, phone} — number that was JUST verified by SMS during phone signup/sign-in

/* ---- «شماره‌ای که همین الان با کد پیامکی تأیید شد» ----
   مشکل قبلی: کاربری که با شماره موبایل ثبت‌نام می‌کرد، تو صفحه‌ی «خودت رو معرفی کن» دوباره باید
   همون شماره رو تأیید می‌کرد — و چون همین الان یه کد براش رفته بود، باید ۲ دقیقه صبر می‌کرد. علتش:
   صفحه‌ی آنبوردینگ قبل از ذخیره‌شدن شماره رسم می‌شد و وضعیت «تأییدشده» همون لحظه روی «نه» قفل می‌شد
   (و اگه ستون phone_verified تو دیتابیس نبود، ذخیره اصلاً انجام نمی‌شد).
   حالا شماره‌ی تأییدشده قبل از هر چیز همین‌جا ثبت می‌شه (تو حافظه + localStorage به ازای همین حساب،
   که با بسته/باز شدن اپ هم از دست نره) و آنبوردینگ بدون هیچ شرطی اون رو «تأییدشده» نشون می‌ده —
   حتی اگه ذخیره‌ی دیتابیس موقتاً شکست بخوره. با «شروع کن» هم دوباره ذخیره می‌شه. */
function rememberJustVerifiedPhone(userId, phone){
  if(!userId || !phone) return;
  justVerifiedPhone = { userId, phone };
  try{ localStorage.setItem('pelehVerifiedPhone_' + userId, phone); }catch(e){}
}
function getJustVerifiedPhone(){
  if(!currentUser) return null;
  if(justVerifiedPhone && justVerifiedPhone.userId === currentUser.id) return justVerifiedPhone.phone;
  try{ return normalizeIranMobile(localStorage.getItem('pelehVerifiedPhone_' + currentUser.id)); }catch(e){ return null; }
}
function clearJustVerifiedPhone(){
  if(currentUser){ try{ localStorage.removeItem('pelehVerifiedPhone_' + currentUser.id); }catch(e){} }
  justVerifiedPhone = null;
}
// شماره‌ی تأییدشده رو (اگه هنوز تو پروفایل نیست) ذخیره کن. شماره‌ی تأییدشده‌ی دیگه‌ای رو که از قبل
// تو پروفایل هست بازنویسی نمی‌کنه.
async function syncJustVerifiedPhone(){
  const jv = getJustVerifiedPhone();
  if(!jv || !profileReady) return;
  if(profileMeta.phone === jv && profileMeta.phoneVerified) return;
  if(profileMeta.phone && profileMeta.phoneVerified && profileMeta.phone !== jv) return;
  const ok = await updateProfileColumns({ phone: jv, phone_verified: true });
  if(ok){ profileMeta.phone = jv; profileMeta.phoneVerified = true; }
}

function rowToProfileMeta(row){
  return {name: row.name || "", birthdate: row.birthdate || "", photo: row.photo || null, phone: row.phone || "", phoneVerified: !!row.phone_verified, referralCode: row.referral_code || "", createdAt: row.created_at || null};
}

/* Loads the signed-in user's row. Critically: if the read itself fails (network hiccup, RLS
   confusion, anything), we do NOT fall back to "must be a new user" — that fallback is exactly
   what caused real data to be silently overwritten before. We only ever create a blank profile
   when Supabase explicitly confirms zero rows exist, and even then we use an upsert that refuses
   to clobber a row if one turns out to already be there. Any thrown error → loadError (retry
   screen), never a blank onboarding screen for someone who already has data. */
async function loadProfileFromCloud(){
  loadError = false;
  profileReady = false;
  try{
    let { data: row, error } = await sb.from('profiles').select('*').eq('id', currentUser.id).maybeSingle();
    if(error){ console.error("profile load failed:", error); loadError = true; return; }
    if(!row){
      // Genuinely no row yet for this account — create one, but ignore the insert if a row
      // already exists (race condition safety net), then re-read to get the true state.
      const { error: insErr } = await sb.from('profiles').upsert({id: currentUser.id, name:"", email: currentUser.email || null, data: blankProfileData()}, {onConflict:'id', ignoreDuplicates:true});
      if(insErr) console.error("profile create failed (run migration 009 if this is a permission error):", insErr);
      const res2 = await sb.from('profiles').select('*').eq('id', currentUser.id).maybeSingle();
      if(res2.error || !res2.data){ loadError = true; return; }
      row = res2.data;
    }
    profileMeta = rowToProfileMeta(row);
    DATA = normalizeProfileData(row.data);
    markSynced();
    profileReady = true;
    if(currentUser.email && row.email !== currentUser.email){
      sb.from('profiles').update({email: currentUser.email}).eq('id', currentUser.id).then(()=>{}, ()=>{});
    }
  }catch(e){
    console.error("loadProfileFromCloud threw:", e);
    loadError = true;
  }
}
function currentProfileMeta(){
  return profileMeta;
}
function needsOnboarding(){
  // اسم رو داشتن دیگه کافی نیست — شماره موبایل هم باید معتبر باشه، وگرنه (چه کاربر تازه، چه
  // یکی از قبل که این فیلد هنوز اجباری نبود) دوباره برمی‌گرده به همین صفحه تا واردش کنه.
  const meta = currentProfileMeta();
  // sms-fix: کاربر گوگلی/ایمیلی که «خارج از ایرانم» رو زده، شماره نمی‌خواد
  return !!currentUser && !loadError && (!meta.name || (!/^09\d{9}$/.test(meta.phone||"") && !phoneSkipped()));
}
function needsWorkProfile(){
  // فاز A۲/A۳: پروفایل کاری دیگه یه مرحله‌ی اجباری نیست — علایق از «شروع سریع» استنتاج می‌شن و ساعت
  // کاری همون لحظه‌ای که لازمه پرسیده می‌شه. (فقط شُل‌تر شد، نه سخت‌گیرانه‌تر؛ صفحه‌اش از تنظیمات باز می‌شه.)
  return false;
}

/* Updates only the given profile columns. Returns true on success. If the database doesn't have
   one of the columns yet (e.g. phone_verified before migration 009 was run), PostgREST rejects
   the WHOLE update — which used to silently drop the person's name + phone too and send them
   back to onboarding on every login. Here the missing column is dropped and the rest is retried. */
async function updateProfileColumns(patch){
  if(!currentUser || !sb) return false;
  const body = Object.assign({}, patch);
  let retriedTransient = false;
  const retryOnce = async () => {
    // یه قطعی لحظه‌ای شبکه/سرور نباید کاربر رو مجبور به زدن دوباره‌ی دکمه کنه — یه بار خودکار تکرار کن
    if(retriedTransient) return false;
    retriedTransient = true;
    await new Promise(r => setTimeout(r, 800));
    return true;
  };
  for(let attempt = 0; attempt < 6; attempt++){
    try{
      const { error } = await sb.from('profiles').update(body).eq('id', currentUser.id);
      if(!error) return true;
      // هر دو شکل پیام: «Could not find the 'x' column» و «column profiles.x does not exist»
      const m = /'([a-z_]+)' column/i.exec(error.message || "") || /column (?:"?[a-z_]+"?\.)?"?([a-z_]+)"? (?:of relation "?profiles"? )?does not exist/i.exec(error.message || "");
      if(m && (m[1] in body) && Object.keys(body).length > 1){
        console.warn(`profiles.${m[1]} is missing in the database (run migration 009) — saving the other fields without it`);
        delete body[m[1]];
        continue;
      }
      const permanent = error.code === "42501" || /permission denied|row-level security/i.test(error.message || "");
      if(!permanent && await retryOnce()) continue;
      console.error("profile update failed:", error);
      return false;
    }catch(e){
      if(await retryOnce()) continue;
      console.error("profile update threw:", e);
      return false;
    }
  }
  return false;
}

/* Identity (name/birthdate/photo/phone) and habit-data are saved through completely separate calls
   that touch only their own column — so a stale/blank value in one can never overwrite the other. */
async function saveProfileInfo(patch){
  Object.assign(profileMeta, patch);
  if(!currentUser || !profileReady) return false;
  return updateProfileColumns({
    name: profileMeta.name || "",
    birthdate: profileMeta.birthdate || null,
    photo: profileMeta.photo,
    phone: profileMeta.phone || null,
    phone_verified: !!profileMeta.phoneVerified
  });
}

function ageFromBirthdate(birthdate){
  if(!birthdate) return null;
  const b = new Date(birthdate);
  if(isNaN(b.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if(m < 0 || (m===0 && now.getDate() < b.getDate())) age--;
  return age;
}

/* ---- همگام‌سازی امن بین چند دستگاه ----
   قبلاً هر ذخیره، کل ستون data رو بی‌قید و شرط می‌نوشت (آخرین نویسنده برنده). پس اگه گوشی برنامه‌ی
   ورزشی می‌ساخت و تب لپ‌تاپ (که با داده‌ی قدیمی‌تر باز مونده بود) هر ذخیره‌ای می‌کرد، داده‌ی لپ‌تاپ
   داده‌ی گوشی رو پاک می‌کرد — و خطای ذخیره هم به کاربر نشون داده نمی‌شد. حالا:
   ۱) هر ذخیره یه شماره‌ی نسخه (_rev) می‌نویسه و فقط وقتی انجام می‌شه که نسخه‌ی سرور همون نسخه‌ای باشه
      که این دستگاه آخرین بار دیده. اگه نبود، داده‌ی سرور خونده و با تغییرات همین دستگاه ادغام می‌شه
      (هر کلید فقط اگه همین دستگاه عوض کرده باشه؛ داخل health هم زیرکلیدها جدا حساب می‌شن).
   ۲) با برگشتن به اپ/تب، اگه دستگاه دیگه‌ای چیزی ذخیره کرده باشه، داده‌ی جدید خونده می‌شه.
   ۳) اگه ذخیره شکست بخوره، یه هشدار نشون داده می‌شه و خودکار دوباره تلاش می‌شه. */
let serverRev = null;        // _rev نسخه‌ای که این دستگاه آخرین بار از سرور دید/نوشت
let baseSnap = null;         // عکسِ آخرین حالت همگام‌شده (برای تشخیص اینکه این دستگاه چی رو عوض کرده)
let saveInFlight = null;
let saveRetryTimer = null;
let saveFailCount = 0;
let lastPullAt = 0;

function snapOf(d){
  const s = {};
  Object.keys(d || {}).forEach(k => { if(k !== "_rev") s[k] = JSON.stringify(d[k]); });
  s.__h = {};
  if(d && d.health && typeof d.health === "object") Object.keys(d.health).forEach(k => { s.__h[k] = JSON.stringify(d.health[k]); });
  return s;
}
function markSynced(){ baseSnap = snapOf(DATA); serverRev = (DATA && DATA._rev) || null; }
function mergeWithServer(local, server){
  const base = baseSnap || {};
  const out = Object.assign({}, server);
  Object.keys(local).forEach(k => {
    if(k === "_rev") return;
    if(JSON.stringify(local[k]) === base[k]) return;            // این دستگاه عوضش نکرده → نسخه‌ی سرور می‌مونه
    if(k === "health" && local.health && server.health && typeof server.health === "object" && typeof local.health === "object"){
      const hOut = Object.assign({}, server.health);
      Object.keys(local.health).forEach(hk => {
        if(JSON.stringify(local.health[hk]) !== (base.__h || {})[hk]) hOut[hk] = local.health[hk];
      });
      out.health = hOut;
    }else{
      out[k] = local[k];
    }
  });
  return out;
}
function showSaveWarning(on){
  try{
    let el = document.getElementById("save_warning");
    if(!on){ if(el) el.remove(); return; }
    if(!el){
      el = document.createElement("div");
      el.id = "save_warning";
      el.className = "sys-banner";
      el.textContent = "⚠️ ذخیره‌ی آخرین تغییرات انجام نشد — اینترنتت رو چک کن، دوباره تلاش می‌کنم";
      document.body.appendChild(el);
    }
  }catch(e){}
}
function scheduleSaveRetry(){
  if(saveRetryTimer || saveFailCount > 8) return;
  saveRetryTimer = setTimeout(() => { saveRetryTimer = null; performDataSave(); }, Math.min(30000, 4000 * saveFailCount));
}
async function performDataSave(){
  // هیچ‌وقت دیتای خالی/ناقص رو روی دیتای واقعی کاربر ننویس: تا وقتی پروفایل همین کاربر واقعاً لود
  // نشده (یا لودش خطا داده)، DATA ممکنه همون دیتای خالی پیش‌فرض باشه.
  if(!currentUser || !profileReady || loadError) return;
  if(saveInFlight){ try{ await saveInFlight; }catch(e){} }   // ذخیره‌ها پشت سر هم، نه هم‌زمان
  const run = (async () => {
    let merged = false;
    for(let attempt = 0; attempt < 3; attempt++){
      const newRev = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
      const prev = serverRev;
      let q = sb.from('profiles').update({ data: Object.assign({}, DATA, { _rev: newRev }) }).eq('id', currentUser.id);
      if(prev) q = q.eq('data->>_rev', prev);
      const { data: rows, error } = await q.select('id');
      if(error) throw error;
      if(rows && rows.length){ DATA._rev = newRev; markSynced(); return merged; }
      if(!prev) throw new Error("profile row not updated");
      // تداخل: دستگاه دیگه‌ای بین‌ش ذخیره کرده. داده‌ی سرور رو بخون و با تغییرات همین دستگاه ادغام کن.
      const { data: row, error: e2 } = await sb.from('profiles').select('data').eq('id', currentUser.id).maybeSingle();
      if(e2 || !row) throw (e2 || new Error("reload after conflict failed"));
      const serverData = row.data || {};
      DATA = normalizeProfileData(mergeWithServer(DATA, serverData));
      DATA._rev = serverData._rev || null;
      serverRev = serverData._rev || null;
      merged = true;
    }
    throw new Error("save conflict retries exhausted");
  })();
  saveInFlight = run;
  try{
    const merged = await run;
    saveFailCount = 0; showSaveWarning(false);
    if(merged){
      const ov = document.getElementById("overlay"), ae = document.activeElement;
      if(!(ov && ov.classList.contains("show")) && !(ae && (ae.tagName === "INPUT" || ae.tagName === "TEXTAREA"))) renderAll();
    }
  }catch(e){
    console.error("data save failed:", e);
    saveFailCount++; showSaveWarning(true); scheduleSaveRetry();
  }finally{
    if(saveInFlight === run) saveInFlight = null;
  }
}
// اگه دستگاه دیگه‌ای چیزی ذخیره کرده باشه (نسخه‌ی سرور با نسخه‌ی این دستگاه فرق داره)، داده‌ی جدید رو بخون.
async function pullIfServerNewer(){
  if(!currentUser || !profileReady || loadError || !sb) return;
  if(saveTimer || saveInFlight) return;
  if(Date.now() - lastPullAt < 10000) return;
  lastPullAt = Date.now();
  try{
    const { data: r, error } = await sb.from('profiles').select('rev:data->>_rev').eq('id', currentUser.id).maybeSingle();
    if(error || !r || !r.rev || r.rev === serverRev) return;
    const busy = () => { const ov = document.getElementById("overlay"), ae = document.activeElement;
      return saveTimer || saveInFlight || (ov && ov.classList.contains("show")) || (ae && (ae.tagName === "INPUT" || ae.tagName === "TEXTAREA")); };
    if(busy()){ lastPullAt = 0; return; }
    const { data: row } = await sb.from('profiles').select('data').eq('id', currentUser.id).maybeSingle();
    if(!row || busy()) return;
    DATA = normalizeProfileData(row.data);
    markSynced();
    renderAll();
  }catch(e){ /* آفلاین — دفعه‌ی بعد */ }
}
document.addEventListener("visibilitychange", () => {
  if(document.visibilityState === "visible") pullIfServerNewer();
  else flushPendingSave();
});
window.addEventListener("focus", () => pullIfServerNewer());
window.addEventListener("pagehide", () => { flushPendingSave(); });
window.addEventListener("online", () => { if(saveFailCount) performDataSave(); pullIfServerNewer(); });
setInterval(() => { if(document.visibilityState === "visible") pullIfServerNewer(); }, 45000);

/* Debounced cloud save — batches rapid edits (typing, quick taps) into one request. Only ever
   touches the `data` column. */
function save(){
  if(!currentUser) return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => { saveTimer = null; performDataSave(); }, 600);
  if(typeof smartNotifyTouch === "function") smartNotifyTouch(); // یادآورهای اندروید با داده‌ی تازه از نو ساخته بشن
}
/* Immediate (non-debounced) save of habit data — used sparingly for high-value moments. */
function saveImmediate(){
  if(!currentUser) return Promise.resolve();
  clearTimeout(saveTimer);
  saveTimer = null;
  return performDataSave();
}
/* If a debounced save is still waiting, send it right now. Used before anything that re-reads the
   profile from the server (otherwise the re-read would silently discard the last ~0.6s of edits)
   and before signing out. */
function flushPendingSave(){
  if(!saveTimer) return Promise.resolve();
  clearTimeout(saveTimer);
  saveTimer = null;
  return performDataSave();
}
/* For after a server-side change to this user's profile (premium activated by payment, promo,
   referral, welcome gift...): first push local edits, then re-read the server copy. */
async function reloadProfileKeepingLocalEdits(){
  try{ await flushPendingSave(); }catch(e){}
  await loadProfileFromCloud();
}

/* ---- One place that finishes a sign-in ----
   Called explicitly by every sign-in flow right after Supabase confirms the session, AND (deferred)
   from onAuthStateChange. Deduplicated per user, so the same account is never loaded twice in a row.
   Why not just do all of this inside onAuthStateChange like before: supabase-js runs that callback
   while holding its internal auth lock during token refresh / tab-visibility checks, and awaiting
   another Supabase request from inside it can deadlock — one of the ways the app used to get stuck
   on «در حال اتصال...». */
let _signInLoadPromise = null;
let _signInLoadUserId = null;
function completeSignIn(user){
  if(!user) return Promise.resolve();
  if(_signInLoadUserId === user.id && _signInLoadPromise) return _signInLoadPromise;
  const isDifferentUser = !currentUser || currentUser.id !== user.id;
  currentUser = user;
  _signInLoadUserId = user.id;
  _signInLoadPromise = (async () => {
    await loadProfileFromCloud();
    loadClientFlags(); // فیچرفلگ‌ها (شروع سریع، سلامت پلاس، حداقل نسخه) — منتظرش نمی‌مونیم
    await syncJustVerifiedPhone(); // قبل از اولین رسم آنبوردینگ
    if(typeof smartNotifyTouch === "function") smartNotifyTouch(true);
    obPhoneVerified = null;        // آنبوردینگ وضعیت تأیید رو با اطلاعات تازه حساب کنه
    if(isDifferentUser) currentTab = "today";
    startPresenceHeartbeat();
    ensurePushSubscribed();
    if(!loadError) await handleZibalReturnIfAny();
  })();
  return _signInLoadPromise;
}

/* Everything that has to be wiped when the account on this device changes. */
function handleSignedOutState(){
  if(typeof smartNotifyCancelAll === "function") smartNotifyCancelAll();
  welcomeBannerDays = 0;
  CLIENT_FLAGS = Object.assign({}, CLIENT_FLAGS_DEFAULT);
  qsStep = null; qsPicked = [];
  if(typeof plusResetState === "function") plusResetState();
  clearTimeout(saveTimer);
  saveTimer = null;
  clearJustVerifiedPhone();
  currentUser = null;
  _signInLoadPromise = null;
  _signInLoadUserId = null;
  profileReady = false;
  loadError = false;
  needsPasswordSetup = false;
  pendingAuthEmail = "";
  pendingAuthPhone = "";
  authMode = EMAIL_AUTH_ENABLED ? "signin" : "signup_phone";
  profileMeta = {name:"", birthdate:"", photo:null, phone:"", phoneVerified:false};
  obPhoneVerified = null;
  obPhoneOtpSent = false;
  obPendingPhone = "";
  myReferralCount = null;
  editingName = false;
  editingPhone = false;
  settingsPhoneOtpSent = false;
  settingsPendingPhone = "";
  settingsPhoneError = "";
  settingsPhoneDraft = "";
  DATA = blankProfileData();
  currentTab = "today";
  stopPresenceHeartbeat();
  resetPerAccountCaches();
  renderAll();
}
/* Module-level caches in books.js / health.js that belong to the previous account — without this,
   the next person signing in on the same device could briefly see the previous person's book
   recommendations, challenge lists, etc. */
function resetPerAccountCaches(){
  try{ if(typeof bookRecs !== "undefined"){ bookRecs = null; bookRecsLoading = false; bookRecsError = null; } }catch(e){}
  try{ if(typeof FW !== "undefined") FW = null; }catch(e){}
  try{ if(typeof booksSubTab !== "undefined") booksSubTab = "home"; }catch(e){}
  try{ if(typeof challengeParticipantsCache !== "undefined") challengeParticipantsCache = {}; }catch(e){}
  try{ if(typeof leaderboardResyncedThisSession !== "undefined") leaderboardResyncedThisSession = false; }catch(e){}
  try{ if(typeof lastAwardsCheck !== "undefined") lastAwardsCheck = 0; }catch(e){}
  try{ if(typeof leaderboardSyncTimer !== "undefined" && leaderboardSyncTimer){ clearTimeout(leaderboardSyncTimer); leaderboardSyncTimer = null; } }catch(e){}
  try{ if(typeof healthChatInput !== "undefined"){ healthChatInput = ""; healthChatError = ""; } }catch(e){}
  try{ if(typeof selectedHealthGoal !== "undefined"){ selectedHealthGoal = null; selectedHealthActivity = null; } }catch(e){}
  // پله سلامت: فرم‌ها، فروشگاه جوایز و تایمر لحظه‌ی هوس مال حساب قبلی‌ان
  try{ if(typeof healthSubTab !== "undefined"){ healthSubTab = "summary"; healthSetup = null; hForm = null; hLog = null; hPick = null; hFoodForm = null; hHabitForm = null; hCraving = null; hDrafts = {}; hDiscovery = {}; hAi = { busy: {}, error: {} }; hRewardItems = null; hMyRedemptions = null; hHealthPoints = null; hRewardError = ""; hRewardLoading = false; hCheatInput = ""; hWeightInput = ""; healthChatBusy = false; } }catch(e){}
  try{ if(typeof hCravingTimer !== "undefined" && hCravingTimer){ clearInterval(hCravingTimer); hCravingTimer = null; } }catch(e){}
  try{ if(typeof promoCodeMsg !== "undefined"){ promoCodeMsg = ""; promoCodeInput = ""; checkoutPromoInput = ""; } }catch(e){}
}

/* ---- Signup: email -> emailed code -> set password -> profile onboarding ----
   Uses Supabase's built-in email-OTP mechanism instead of a "click this link to confirm"
   email, so the whole flow stays inside the same tab/app.
   IMPORTANT (one-time setup, not code): in Supabase Dashboard → Authentication → Email
   Templates → "Magic Link", the template must show {{ .Token }} (the code) instead of / in
   addition to {{ .ConfirmationURL }} — otherwise people still only get a link.
   ---- Prevents double-tap/double-submit on any button that sends data to the server:
   disables it and swaps its label the instant it's tapped, and restores it afterwards
   (restoring is a no-op if the screen has since moved on and the button no longer exists). */
function lockButton(id, busyLabel){
  const btn = document.getElementById(id);
  if(!btn) return null;
  const original = btn.innerHTML; // innerHTML تا آیکون خطی دکمه بعد از بازگشت از بین نره
  btn.disabled = true;
  btn.style.opacity = "0.6";
  btn.textContent = busyLabel;
  return original;
}
function unlockButton(id, original){
  const btn = document.getElementById(id);
  if(!btn) return;
  btn.disabled = false;
  btn.style.opacity = "";
  if(original != null) btn.innerHTML = original;
}
// Enter/«برو» روی کیبورد موبایل، فرم همون صفحه رو ارسال می‌کنه (قبلاً هیچ کاری نمی‌کرد)
function onAuthEnter(e, fnName){
  if(e.key !== "Enter") return;
  e.preventDefault();
  const fn = window[fnName];
  if(typeof fn === "function") fn();
}

/* ---- Resend-code cooldown: after a verification code is requested, every button that could
   trigger *another* send for the same flow gets locked with a live countdown. verify-otp only ever
   checks the newest code for a mobile number, so firing off a second code before the first is used
   silently invalidates it. The unlock timestamp is kept in localStorage per "family" ('signup_phone',
   'signin_phone', 'ob_phone', 'settings_phone', 'email_otp') so it survives re-renders and reloads.
   Every button of a family carries data-otp-family="<family>"; call resumeResendCooldown(family)
   right after that markup is inserted into the DOM. */
// ۶۰ ثانیه، هم‌اندازه‌ی محدودیت سمت سرور در send-otp (قبلاً ۲ دقیقه بود و کاربر رو معطل می‌کرد)
const OTP_RESEND_COOLDOWN_SECONDS = 60;
const _cooldownTimers = {};
function otpCooldownRemaining(family){
  let until = 0;
  try{ until = Number(localStorage.getItem('otpCooldown_' + family) || 0); }catch(e){}
  return Math.max(0, Math.ceil((until - Date.now()) / 1000));
}
function startResendCooldown(family, seconds){
  const until = Date.now() + (seconds || OTP_RESEND_COOLDOWN_SECONDS) * 1000;
  try{ localStorage.setItem('otpCooldown_' + family, String(until)); }catch(e){ /* private mode etc — cooldown just won't persist across reload */ }
  tickResendCooldown(family);
}
function tickResendCooldown(family){
  clearTimeout(_cooldownTimers[family]);
  const remaining = otpCooldownRemaining(family);
  const buttons = document.querySelectorAll(`[data-otp-family="${family}"]`);
  buttons.forEach(btn => {
    if(!btn.dataset.otpIdleLabel) btn.dataset.otpIdleLabel = btn.textContent;
    if(remaining > 0){
      btn.disabled = true;
      btn.style.opacity = "0.6";
      btn.textContent = `${btn.dataset.otpIdleLabel} (${toFaDigits(remaining)})`;
    } else {
      btn.disabled = false;
      btn.style.opacity = "";
      btn.textContent = btn.dataset.otpIdleLabel;
    }
  });
  if(remaining > 0) _cooldownTimers[family] = setTimeout(() => tickResendCooldown(family), 1000);
  else { try{ localStorage.removeItem('otpCooldown_' + family); }catch(e){} }
}
function resumeResendCooldown(family){
  if(otpCooldownRemaining(family) > 0) tickResendCooldown(family);
}

async function submitSignupEmailStep(){
  const email = normalizeEmail(document.getElementById('auth_email').value);
  lastAuthEmail = email;
  authError = "";
  if(!email){ authError = "ایمیلت رو وارد کن."; renderAll(); return; }
  if(normalizeIranMobile(email)){ lastAuthPhone = normalizeIranMobile(email); authMode = 'signup_phone'; authError = "این یه شماره موبایله — از اینجا با شماره موبایل ثبت‌نام کن."; renderAll(); return; }
  if(!looksLikeEmail(email)){ authError = "ایمیل معتبر نیست."; renderAll(); return; }
  lockButton('btn_signup_email_step', 'در حال ارسال...');
  try{
    const { error } = await sb.auth.signInWithOtp({ email, options:{ shouldCreateUser: true } });
    if(error){ authError = translateAuthError(error); renderAll(); return; }
    pendingAuthEmail = email;
    authMode = 'signup_otp';
    startResendCooldown('email_otp', 60);
    renderAll();
  }catch(e){
    authError = translateAuthError(e);
    renderAll();
  }
}
async function submitEmailOtp(){
  const code = onlyDigits(document.getElementById('auth_otp').value);
  authError = "";
  if(code.length < 6){ authError = "کد تأیید رو کامل وارد کن."; renderAll(); return; }
  if(!pendingAuthEmail){ authMode = 'signin'; renderAll(); return; }
  lockButton('btn_email_otp', 'در حال بررسی...');
  try{
    const { data, error } = await sb.auth.verifyOtp({ email: pendingAuthEmail, token: code, type: 'email' });
    if(error){ authError = translateAuthError(error, "کد اشتباهه یا منقضی شده — دوباره امتحان کن."); renderAll(); return; }
    // A real session now exists. Route to "set a password" before letting the rest of the app
    // (onboarding / main app) take over — set BEFORE loading, so there's no flash of onboarding.
    needsPasswordSetup = true;
    pendingAuthEmail = "";
    authMode = 'newpassword';
    await completeSignIn(data?.user || data?.session?.user);
    renderAll();
  }catch(e){
    authError = translateAuthError(e);
    renderAll();
  }
}
function submitSignupOtpStep(){ return submitEmailOtp(); }
function submitResetOtp(){ return submitEmailOtp(); }
async function resendAuthOtp(){
  if(!pendingAuthEmail || otpCooldownRemaining('email_otp') > 0) return;
  const isReset = authMode === 'reset_otp';
  try{
    // قبلاً اینجا حتی تو بازیابی رمز هم shouldCreateUser:true بود و همیشه «فرستاده شد» می‌گفت، حتی وقتی خطا داشت
    const { error } = await sb.auth.signInWithOtp({ email: pendingAuthEmail, options:{ shouldCreateUser: !isReset } });
    if(error){ authError = translateAuthError(error); renderAll(); return; }
    authError = "";
    startResendCooldown('email_otp', 60);
    renderAll();
    alert("کد جدید فرستاده شد. فقط آخرین کدی که گرفتی معتبره.");
  }catch(e){ authError = translateAuthError(e); renderAll(); }
}

/* verify-otp (نسخه‌ی ۲) با tokenLogin یه token_hash برمی‌گردونه که بدون عوض کردن رمز حساب وارد
   می‌کنه (قبلاً هر ورود با موبایل، رمز واقعی کاربرهای ایمیلی رو با یه رمز تصادفی جایگزین می‌کرد).
   اگه هنوز verify-otp قدیمی روی سرور باشه، همون ایمیل+رمز یک‌بارمصرف رو برمی‌گردونه — هر دو پشتیبانی می‌شن. */
async function signInFromVerifyOtp(data){
  if(data && data.token_hash){
    let res = await sb.auth.verifyOtp({ token_hash: data.token_hash, type: 'email' });
    if(res.error && data.type && data.type !== 'email'){
      res = await sb.auth.verifyOtp({ token_hash: data.token_hash, type: data.type });
    }
    return res;
  }
  if(data && data.email && data.password){
    return sb.auth.signInWithPassword({ email: data.email, password: data.password });
  }
  return { data: null, error: new Error("verify-otp returned no credentials") };
}

/* ---- Phone signup: 4-digit SMS OTP via the send-otp / verify-otp edge functions (MrOTP.ir),
   since Supabase's built-in phone auth doesn't reliably deliver to Iranian numbers. On success,
   verify-otp returns a one-time shadow email+password which we use to sign in immediately.
   Phone accounts always sign in with an SMS code, so — unlike email signup — there is NO
   "choose a password" step: that password would belong to a hidden email the person never sees
   (so it could never be used), and changing it could break the next SMS sign-in. */
async function submitSignupPhoneStep(){
  if(otpCooldownRemaining('signup_phone') > 0) return;
  const raw = document.getElementById('auth_phone').value;
  const phone = normalizeIranMobile(raw);
  lastAuthPhone = phone || raw.trim();
  authError = "";
  if(!phone){ authError = phoneErrorFor(raw); renderAll(); return; }
  lockButton('btn_signup_phone_step', 'در حال ارسال...');
  try{
    const { data, error } = await invokeEdge('send-otp', { body: { mobile: phone } });
    if(error || !data?.success){
      authError = data?.error || "ارسال پیامک ناموفق بود — چند لحظه بعد دوباره امتحان کن.";
      if(data?.retryAfter) startResendCooldown('signup_phone', data.retryAfter);
      renderAll(); return;
    }
    pendingAuthPhone = phone;
    authMode = 'signup_phone_otp';
    startResendCooldown('signup_phone');
    renderAll();
  }catch(e){
    authError = NET_ERROR_MSG;
    renderAll();
  }
}
async function submitSignupPhoneOtpStep(){
  const code = onlyDigits(document.getElementById('auth_phone_otp').value);
  authError = "";
  if(code.length !== 4){ authError = "کد ۴ رقمی رو کامل وارد کن."; renderAll(); return; }
  if(!pendingAuthPhone){ authMode = 'signup_phone'; renderAll(); return; }
  lockButton('btn_signup_phone_otp', 'در حال بررسی...');
  try{
    const { data, error } = await invokeEdge('verify-otp', { body: { mobile: pendingAuthPhone, code, tokenLogin: true } });
    if(error || !data?.success){ authError = data?.error || "کد اشتباهه یا منقضی شده — دوباره امتحان کن."; renderAll(); return; }
    const { data: signInData, error: signInErr } = await signInFromVerifyOtp(data);
    if(signInErr || !signInData?.user){ authError = "ورود ناموفق بود — دوباره امتحان کن."; renderAll(); return; }
    // این شماره همین الان با کد پیامکی تأیید شد — قبل از هر رسمی ثبتش کن تا آنبوردینگ دیگه کد نخواد
    rememberJustVerifiedPhone(signInData.user.id, pendingAuthPhone);
    pendingAuthPhone = "";
    authMode = 'signin';
    await completeSignIn(signInData.user); // ذخیره‌ی شماره تو پروفایل هم داخل همینه (syncJustVerifiedPhone)
    renderAll();
  }catch(e){
    authError = NET_ERROR_MSG;
    renderAll();
  }
}
async function resendPhoneOtpFor(family){
  if(!pendingAuthPhone || otpCooldownRemaining(family) > 0) return;
  try{
    const { data, error } = await invokeEdge('send-otp', { body: { mobile: pendingAuthPhone } });
    if(error || !data?.success){
      authError = data?.error || "ارسال دوباره‌ی پیامک ناموفق بود — کمی بعد امتحان کن.";
      if(data?.retryAfter) startResendCooldown(family, data.retryAfter);
      renderAll(); return;
    }
    authError = "";
    startResendCooldown(family);
    renderAll();
    alert("کد جدید فرستاده شد. فقط آخرین کدی که گرفتی معتبره.");
  }catch(e){ authError = NET_ERROR_MSG; renderAll(); }
}
function resendPhoneOtp(){ return resendPhoneOtpFor('signup_phone'); }
function resendSigninPhoneOtp(){ return resendPhoneOtpFor('signin_phone'); }

/* ---- Phone sign-in: for accounts originally created via phone signup (they have no real email
   to sign in with). Same send-otp/verify-otp functions, but with purpose:'signin' so verify-otp
   errors out instead of silently creating a brand-new account if the phone isn't registered. */
async function submitSigninPhoneStep(){
  if(otpCooldownRemaining('signin_phone') > 0) return;
  const raw = document.getElementById('signin_phone').value;
  const phone = normalizeIranMobile(raw);
  lastAuthPhone = phone || raw.trim();
  authError = "";
  if(!phone){ authError = phoneErrorFor(raw); renderAll(); return; }
  lockButton('btn_signin_phone_step', 'در حال ارسال...');
  try{
    const { data, error } = await invokeEdge('send-otp', { body: { mobile: phone } });
    if(error || !data?.success){
      authError = data?.error || "ارسال پیامک ناموفق بود — چند لحظه بعد دوباره امتحان کن.";
      if(data?.retryAfter) startResendCooldown('signin_phone', data.retryAfter);
      renderAll(); return;
    }
    pendingAuthPhone = phone;
    authMode = 'signin_phone_otp';
    startResendCooldown('signin_phone');
    renderAll();
  }catch(e){
    authError = NET_ERROR_MSG;
    renderAll();
  }
}
async function submitSigninPhoneOtpStep(){
  const code = onlyDigits(document.getElementById('signin_phone_otp').value);
  authError = "";
  if(code.length !== 4){ authError = "کد ۴ رقمی رو کامل وارد کن."; renderAll(); return; }
  if(!pendingAuthPhone){ authMode = 'signin_phone'; renderAll(); return; }
  lockButton('btn_signin_phone_otp', 'در حال ورود...');
  try{
    const { data, error } = await invokeEdge('verify-otp', { body: { mobile: pendingAuthPhone, code, purpose: 'signin', tokenLogin: true } });
    if(error || !data?.success){ authError = data?.error || "کد اشتباهه یا منقضی شده — دوباره امتحان کن."; renderAll(); return; }
    const { data: signInData, error: signInErr } = await signInFromVerifyOtp(data);
    if(signInErr || !signInData?.user){ authError = "ورود ناموفق بود — دوباره امتحان کن."; renderAll(); return; }
    rememberJustVerifiedPhone(signInData.user.id, pendingAuthPhone);
    pendingAuthPhone = "";
    authMode = 'signin';
    await completeSignIn(signInData.user);
    renderAll();
  }catch(e){
    authError = NET_ERROR_MSG;
    renderAll();
  }
}

/* ---- Forgot password: same emailed-code mechanism ---- */
async function submitForgotPassword(){
  const email = normalizeEmail(document.getElementById('auth_email').value);
  lastAuthEmail = email;
  authError = "";
  if(!email){ authError = "ایمیلت رو وارد کن."; renderAll(); return; }
  if(normalizeIranMobile(email)){ lastAuthPhone = normalizeIranMobile(email); authMode = 'signin_phone'; authError = "حساب‌های موبایلی رمز ندارن — با کد پیامکی وارد شو."; renderAll(); return; }
  if(!looksLikeEmail(email)){ authError = "ایمیل معتبر نیست."; renderAll(); return; }
  lockButton('btn_forgot_password', 'در حال ارسال...');
  try{
    const { error } = await sb.auth.signInWithOtp({ email, options:{ shouldCreateUser: false } });
    if(error){ authError = translateAuthError(error); renderAll(); return; }
    pendingAuthEmail = email;
    authMode = 'reset_otp';
    startResendCooldown('email_otp', 60);
    renderAll();
  }catch(e){
    authError = translateAuthError(e);
    renderAll();
  }
}
async function submitNewPassword(){
  const p1 = document.getElementById('newpass1').value;
  const p2 = document.getElementById('newpass2').value;
  authError = "";
  if(!p1 || p1.length < 6){ authError = "رمز باید حداقل ۶ کاراکتر باشه."; renderAll(); return; }
  if(p1 !== p2){ authError = "دو تا رمز یکی نیستن."; renderAll(); return; }
  lockButton('btn_newpass', 'در حال ذخیره...');
  try{
    const { error } = await sb.auth.updateUser({ password: p1 });
    // اگه کاربر همون رمز قبلیش رو دوباره زده باشه، Supabase خطا می‌ده — ولی عملاً رمزش همینه، پس ادامه بده
    const samePassword = error && (error.code === "same_password" || /different from the old password/i.test(error.message || ""));
    if(error && !samePassword){ authError = translateAuthError(error); renderAll(); return; }
    needsPasswordSetup = false;
    authMode = 'signin';
    // Brand-new signups land on onboarding (name/phone/etc), returning users who just reset
    // their password land straight in the app.
    renderAll();
  }catch(e){
    authError = translateAuthError(e);
    renderAll();
  }
}

/* ---- Sign in (existing users, email + password) ---- */
async function submitAuth(){
  const typed = document.getElementById('auth_email').value;
  const email = normalizeEmail(typed);
  const pass = document.getElementById('auth_pass').value;
  lastAuthEmail = email;
  authError = "";
  // خیلی‌ها که با موبایل ثبت‌نام کردن، شماره‌شون رو تو فیلد ایمیل می‌زنن — مستقیم ببرشون به ورود با موبایل
  const asPhone = normalizeIranMobile(typed);
  if(asPhone){ lastAuthPhone = asPhone; authMode = 'signin_phone'; authError = "برای ورود با شماره موبایل، یه کد پیامکی می‌گیری — «فرستادن کد ورود» رو بزن."; renderAll(); return; }
  if(!email || !pass){ authError = "ایمیل و رمز عبور رو وارد کن."; renderAll(); return; }
  if(!looksLikeEmail(email)){ authError = "ایمیل معتبر نیست."; renderAll(); return; }
  lockButton('btn_email_signin', 'در حال ورود...');
  try{
    const { data, error } = await sb.auth.signInWithPassword({email, password: pass});
    if(error){ authError = translateAuthError(error); renderAll(); return; }
    await completeSignIn(data?.user || data?.session?.user);
    renderAll();
  }catch(e){
    authError = translateAuthError(e);
    renderAll();
  }
}
function translateAuthError(err, fallback){
  const msg = String((err && (err.message || err.error_description)) || (typeof err === "string" ? err : "") || "");
  const code = String((err && err.code) || "");
  const status = err && err.status;
  if((err && (err.name === "AuthRetryableFetchError" || err.name === "TypeError")) || /failed to fetch|networkerror|network request failed|load failed|fetch failed|timed? ?out/i.test(msg)) return NET_ERROR_MSG;
  if(code === "invalid_credentials" || /invalid login credentials/i.test(msg)) return "ایمیل یا رمز عبور اشتباهه. اگه رمز نذاشتی یا یادت نیست، «رمزت رو فراموش کردی؟» رو بزن.";
  if(code === "email_not_confirmed" || /email not confirmed/i.test(msg)) return "ایمیلت هنوز تأیید نشده — از «رمزت رو فراموش کردی؟» یه کد بگیر تا هم تأیید بشه هم رمز بذاری.";
  if(code === "otp_expired" || /token has expired|expired or is invalid|otp.*(expired|invalid)/i.test(msg)) return "کد اشتباهه یا منقضی شده — دوباره امتحان کن یا کد جدید بگیر.";
  const wait = /after (\d+) seconds?/i.exec(msg);
  if(wait) return `برای امنیت، ${toFaDigits(wait[1])} ثانیه‌ی دیگه دوباره امتحان کن.`;
  if(code === "over_email_send_rate_limit" || /email rate limit|rate limit exceeded/i.test(msg)) return "تعداد ایمیل‌های ارسالی زیاد شده — چند دقیقه‌ی دیگه دوباره امتحان کن، یا با شماره موبایل ثبت‌نام کن.";
  if(code === "over_request_rate_limit" || status === 429 || /too many requests|request rate limit/i.test(msg)) return "درخواست‌ها زیاد شد — یه کم صبر کن و دوباره امتحان کن.";
  if(code === "otp_disabled" || /signups not allowed for otp|user not found/i.test(msg)) return "حسابی با این ایمیل پیدا نشد. اگه با شماره موبایل ثبت‌نام کردی، از «ورود با موبایل» استفاده کن.";
  if(code === "signup_disabled" || /signups not allowed/i.test(msg)) return "ثبت‌نام جدید فعلاً بسته است.";
  if(code === "user_already_exists" || /already registered|already exists/i.test(msg)) return "این ایمیل قبلاً ثبت شده — وارد شو.";
  if(code === "same_password" || /different from the old password/i.test(msg)) return "رمز جدید باید با رمز قبلیت فرق داشته باشه.";
  if(code === "weak_password" || /password.*(6|at least)|at least 6/i.test(msg)) return "رمز عبور باید حداقل ۶ کاراکتر باشه.";
  if(code === "email_address_invalid" || /valid email|invalid format|unable to validate email/i.test(msg)) return "ایمیل معتبر نیست.";
  if(/error sending|smtp/i.test(msg)) return "سرویس ارسال ایمیل الان جواب نمی‌ده — کمی بعد دوباره امتحان کن یا با شماره موبایل ثبت‌نام کن.";
  // سرویس ایمیل پیش‌فرض Supabase فقط به اعضای تیم پروژه ایمیل می‌فرسته (تا وقتی SMTP اختصاصی تنظیم نشه)
  if(/email address not authorized|not authorized/i.test(msg)) return "ارسال ایمیل به این آدرس فعلاً ممکن نیست — لطفاً با شماره موبایل ثبت‌نام کن.";
  if(/database error/i.test(msg)) return "خطای سرور موقع ساخت حساب — چند دقیقه‌ی دیگه دوباره امتحان کن.";
  return fallback || msg || "یه مشکلی پیش اومد — دوباره امتحان کن.";
}
function switchAuthMode(m){
  authMode = m;
  authError = "";
  renderAll();
}
/* Google sign-in.
   Web: normal redirect back to this same page.
   Android app: the Google page can't run inside the app's WebView (Google blocks embedded
   WebViews, and Capacitor opens external sites in Chrome anyway), which is why this button
   used to leave people signed in inside Chrome instead of the app. Now it opens in the browser
   and comes back through auth-return.html → deep link → handleAppDeepLink(). */
async function signInWithGoogle(){
  authError = "";
  try{
    if(isNativeApp()){
      const { data, error } = await sb.auth.signInWithOAuth({ provider:'google', options:{ redirectTo: NATIVE_AUTH_RETURN_URL, skipBrowserRedirect: true } });
      if(error || !data?.url) throw error || new Error("no oauth url");
      window.location.href = data.url; // Capacitor opens external hosts in the system browser
      return;
    }
    const { error } = await sb.auth.signInWithOAuth({ provider:'google', options:{ redirectTo: location.origin + location.pathname } });
    if(error) throw error;
  }catch(e){
    authError = EMAIL_AUTH_ENABLED ? "ورود با گوگل الان در دسترس نیست — با ایمیل یا شماره موبایل وارد شو." : "ورود با گوگل الان در دسترس نیست — با شماره موبایل وارد شو.";
    renderAll();
  }
}
/* Remove this device's push subscription from the signed-in account before signing out —
   otherwise the next person using this phone/browser keeps receiving the previous account's
   reminders. Best-effort with short timeouts so sign-out never hangs on it. */
async function removeThisDevicePushSubscription(){
  if(!currentUser || !sb || !("serviceWorker" in navigator)) return;
  const timeout = (ms) => new Promise(r => setTimeout(() => r(null), ms));
  const reg = await Promise.race([navigator.serviceWorker.getRegistration(), timeout(1500)]);
  if(!reg || !reg.pushManager) return;
  const sub = await Promise.race([reg.pushManager.getSubscription(), timeout(1500)]);
  if(!sub) return;
  await Promise.race([
    sb.from('push_subscriptions').delete().eq('user_id', currentUser.id).eq('endpoint', sub.endpoint),
    timeout(3000)
  ]);
}
function forceLocalSignOut(){
  try{
    const key = (sb && sb.auth && sb.auth.storageKey) || ('sb-' + new URL(SUPABASE_URL).hostname.split('.')[0] + '-auth-token');
    [key, key + '-code-verifier', key + '-user'].forEach(k => { try{ localStorage.removeItem(k); }catch(e){} });
  }catch(e){}
  handleSignedOutState();
}
async function signOutUser(){
  if(!confirm("از حسابت خارج بشی؟")) return;
  try{ await flushPendingSave(); }catch(e){}
  try{ await removeThisDevicePushSubscription(); }catch(e){}
  let ok = false;
  try{
    // scope:'local' = فقط همین دستگاه. پیش‌فرض Supabase ('global') کاربر رو از همه‌ی گوشی‌ها و
    // مرورگرهاش هم بیرون می‌انداخت. اگه اینترنت نباشه، signOut خطا می‌ده و قبلاً هیچ اتفاقی نمی‌افتاد.
    if(sb){ const { error } = await sb.auth.signOut({ scope: 'local' }); ok = !error; }
  }catch(e){ ok = false; }
  if(!ok) forceLocalSignOut();
  // بارگذاری دوباره، هر حافظه‌ی موقتِ باقی‌مونده از حساب قبلی رو کامل پاک می‌کنه
  setTimeout(() => { try{ location.reload(); }catch(e){} }, 60);
}

function renderAuthScreen(){
  document.getElementById("tabbar").innerHTML = "";
  const app = document.getElementById("app");
  const brandHtml = `<div class="brand" style="justify-content:center; font-size:calc(24px * var(--font-scale)); margin-bottom:4px;"><span class="rungs"><i></i><i></i><i></i></span> پله</div>`;
  // وقتی ورود با ایمیل خاموشه، «ورود» و «ثبت‌نام» یک صفحه‌ست: شماره → کد → تمام. verify-otp خودش
  // تشخیص می‌ده حساب هست (ورود) یا نیست (ساخت حساب)؛ دیگه لازم نیست کاربر بین دو مسیر انتخاب کنه.
  if(!EMAIL_AUTH_ENABLED && (authMode === 'signin_phone' || authMode === 'signup_choice' || authMode === 'signin')) authMode = 'signup_phone';
  const errHtml = `<div class="field-error">${escapeHtml(authError)}</div>`;
  const emailVal = escapeHtml(lastAuthEmail);
  const phoneVal = escapeHtml(lastAuthPhone);
  const linkBtn = (label, onclick) => `<button style="color:var(--gold); font-weight:800; text-decoration:underline;" onclick="${onclick}">${label}</button>`;
  const consentHtml = `<div style="text-align:center; margin-top:18px; font-size:calc(11px * var(--font-scale)); color:var(--muted); line-height:1.9;">ورود یا ثبت‌نام در پله یعنی پذیرش ${linkBtn('سیاست حریم خصوصی', "openPrivacyPolicy()")}</div>`;
  const googleBtn = `<button class="btn btn-ghost" style="width:100%; padding:13px; margin-top:10px; display:flex; align-items:center; justify-content:center; gap:8px;" onclick="signInWithGoogle()">ورود با گوگل</button>`;
  const emailInput = (id, onEnter) => `<input type="email" id="${id}" class="goal-input" placeholder="you@example.com" autocomplete="email" autocapitalize="off" autocorrect="off" spellcheck="false" inputmode="email" style="direction:ltr; text-align:left;" value="${emailVal}" onkeydown="onAuthEnter(event,'${onEnter}')">`;
  const phoneInput = (id, onEnter) => `<input type="tel" id="${id}" class="goal-input" placeholder="09xxxxxxxxx" autocomplete="tel" inputmode="tel" style="direction:ltr; text-align:left;" value="${phoneVal}" onkeydown="onAuthEnter(event,'${onEnter}')">`;

  if(authMode === 'newpassword'){
    app.innerHTML = `
      <div class="onboard-wrap">
        ${brandHtml}
        <div style="text-align:center; color:var(--muted); font-size:calc(12.5px * var(--font-scale)); margin-bottom:26px;">یه رمز عبور انتخاب کن</div>
        <div class="note" style="margin-bottom:16px;">دفعه‌ی بعد با همین ایمیل و این رمز وارد می‌شی.</div>
        <div class="field"><label>رمز عبور (حداقل ۶ کاراکتر)</label><input type="password" id="newpass1" class="goal-input" placeholder="••••••••" autocomplete="new-password" style="direction:ltr; text-align:left;"></div>
        <div class="field"><label>تکرار رمز عبور</label><input type="password" id="newpass2" class="goal-input" placeholder="••••••••" autocomplete="new-password" style="direction:ltr; text-align:left;" onkeydown="onAuthEnter(event,'submitNewPassword')"></div>
        ${errHtml}
        <button id="btn_newpass" class="btn btn-primary" style="width:100%; padding:15px; margin-top:6px;" onclick="submitNewPassword()">ادامه</button>
      </div>`;
    return;
  }

  if(authMode === 'signup_otp' || authMode === 'reset_otp'){
    app.innerHTML = `
      <div class="onboard-wrap">
        ${brandHtml}
        <div style="text-align:center; color:var(--muted); font-size:calc(12.5px * var(--font-scale)); margin-bottom:10px;">کد تأیید رو وارد کن</div>
        <div class="note" style="margin-bottom:18px; text-align:center;">یه کد تأیید به <b style="direction:ltr; display:inline-block;">${escapeHtml(pendingAuthEmail)}</b> فرستادیم.<br>اگه تو اینباکس نیست، پوشه‌ی <b>Spam</b> رو ببین و روی «Not spam / گزارش عدم اسپم» بزن تا دفعه‌های بعد مستقیم به اینباکس بیاد.</div>
        <div class="field">
          <label>کد تأیید</label>
          <input type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="10" id="auth_otp" class="goal-input" placeholder="------" style="direction:ltr; text-align:center; letter-spacing:8px; font-size:calc(20px * var(--font-scale));" onkeydown="onAuthEnter(event,'submitEmailOtp')">
        </div>
        ${errHtml}
        <button id="btn_email_otp" class="btn btn-primary" style="width:100%; padding:15px; margin-top:6px;" onclick="submitEmailOtp()">تأیید کد</button>
        <div style="text-align:center; margin-top:16px; font-size:calc(12px * var(--font-scale));">
          کد نیومد؟ <button id="btn_resend_email" data-otp-family="email_otp" style="color:var(--gold); font-weight:800; text-decoration:underline;" onclick="resendAuthOtp()">دوباره بفرست</button>
        </div>
        <div style="text-align:center; margin-top:10px; font-size:calc(12px * var(--font-scale));">
          <button style="color:var(--muted); text-decoration:underline;" onclick="switchAuthMode('signin')">انصراف</button>
        </div>
      </div>`;
    resumeResendCooldown('email_otp');
    return;
  }

  if(authMode === 'signup_phone_otp' || authMode === 'signin_phone_otp'){
    const isSignin = authMode === 'signin_phone_otp';
    const inputId = isSignin ? 'signin_phone_otp' : 'auth_phone_otp';
    const submitFn = isSignin ? 'submitSigninPhoneOtpStep' : 'submitSignupPhoneOtpStep';
    const family = isSignin ? 'signin_phone' : 'signup_phone';
    app.innerHTML = `
      <div class="onboard-wrap auth-wrap">
        <div class="auth-sub"><button class="ib box" aria-label="بازگشت" onclick="switchAuthMode('${isSignin ? 'signin_phone' : 'signup_phone'}')">${pi("chevR")}</button><h1>کد تأیید</h1></div>
        <div class="hero-card auth-otp-hero"><span class="ic">${pi("mail")}</span><b>کد ۴ رقمی رو وارد کن</b>
          <span class="note">به <b dir="ltr" style="display:inline-block;">${escapeHtml(pendingAuthPhone)}</b> پیامک شد · <button class="link-btn" style="padding:0; min-height:0;" onclick="switchAuthMode('${isSignin ? 'signin_phone' : 'signup_phone'}')">شماره رو عوض کن</button></span></div>
        <div class="card auth-card">
        <div class="field">
          <label for="${inputId}">کد ۴ رقمی</label>
          <input type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="4" id="${inputId}" class="goal-input" placeholder="----" style="direction:ltr; text-align:center; letter-spacing:12px; font-size:calc(20px * var(--font-scale));" onkeydown="onAuthEnter(event,'${submitFn}')">
        </div>
        ${errHtml}
        <button id="btn_${inputId}" class="btn btn-primary" style="width:100%; padding:15px; margin-top:6px;" onclick="${submitFn}()">${isSignin ? 'ورود' : 'تأیید کد'}</button>
        <div style="text-align:center; margin-top:16px; font-size:calc(12px * var(--font-scale));">
          کد نیومد؟ <button id="btn_resend_${family}" data-otp-family="${family}" style="color:var(--gold); font-weight:800; text-decoration:underline;" onclick="${isSignin ? 'resendSigninPhoneOtp' : 'resendPhoneOtp'}()">دوباره بفرست</button>
        </div>
        <div style="text-align:center; margin-top:10px; font-size:calc(12px * var(--font-scale));">
          <button style="color:var(--muted); text-decoration:underline;" onclick="switchAuthMode('${EMAIL_AUTH_ENABLED ? 'signin' : 'signin_phone'}')">انصراف</button>
        </div>
        </div>
        <div class="card list-card auth-next">
          <div class="link-row"><span class="act-icon">${pi("today")}</span><div class="act-title"><b>حساب داشتی؟</b> مستقیم می‌ری به «امروز»</div></div>
          <div class="link-row"><span class="act-icon">${pi("sparkle")}</span><div class="act-title"><b>تازه اومدی؟</b> فقط اسمت و اولین عادت، بعد «امروز»</div></div>
        </div>
        <div class="note" style="text-align:center;">کد رو با کسی در میون نذار؛ پله هیچ‌وقت کد رو ازت نمی‌پرسه.</div>
      </div>`;
    resumeResendCooldown(family);
    return;
  }

  if(authMode === 'signup_phone'){
    // طراحی نهایی: ورود و ثبت‌نام یک قدم — شماره → کد. حساب قدیمی ← «امروز»، کاربر جدید ← اسم و اولین عادت‌ها
    app.innerHTML = `
      <div class="onboard-wrap auth-wrap">
        <div class="auth-brand">${brandHtml}<div class="note">هر روز، یه پله بالاتر از دیروز</div>
          <div class="auth-stairs" aria-hidden="true">${[34,45,56,67,78,89,100].map((h, i) => `<span style="height:${h}%">${i < 6 ? "<i></i>" : ""}</span>`).join("")}</div></div>
        <div class="card auth-card">
        <div class="field">
          <label for="auth_phone">شماره موبایلت رو بنویس</label>
          ${phoneInput('auth_phone', 'submitSignupPhoneStep')}
        </div>
        <div class="note" style="margin-top:-4px;">اگه قبلاً حساب داشتی وارد می‌شی؛ اگه نه، همین‌جا حسابت ساخته می‌شه.</div>
        ${(EMAIL_AUTH_ENABLED || authError === INTL_PHONE_MSG) ? '' : `<div class="note" style="margin-top:4px;">خارج از ایرانی؟ پیامک فقط به شماره‌ی ایران می‌رسه — پایین «ادامه با گوگل» رو بزن.</div>`}
        ${errHtml}
        <button class="btn btn-primary" id="btn_signup_phone_step" data-otp-family="signup_phone" style="width:100%; padding:15px; margin-top:10px;" onclick="submitSignupPhoneStep()">${EMAIL_AUTH_ENABLED ? 'فرستادن کد تأیید' : 'ادامه'}</button>
        ${EMAIL_AUTH_ENABLED ? '' : `<div class="auth-or"><span></span>یا<span></span></div>${googleBtn.replace("ورود با گوگل", "ادامه با گوگل")}`}
        </div>
        ${EMAIL_AUTH_ENABLED ? '' : `<div class="card auth-gift"><span class="ic">${pi("gift")}</span><span>کاربرهای جدید <b>۷ روز Premium</b> هدیه می‌گیرن.</span></div>`}
        ${EMAIL_AUTH_ENABLED ? `<div style="text-align:center; margin-top:20px; font-size:calc(12.5px * var(--font-scale));">
          به‌جاش با ایمیل ثبت‌نام کن؟ ${linkBtn('ایمیل', "switchAuthMode('signup_email')")}
        </div>` : ''}
        ${EMAIL_AUTH_ENABLED ? `<div style="text-align:center; margin-top:20px; font-size:calc(12.5px * var(--font-scale));">
          قبلاً حساب ساختی؟ ${linkBtn('وارد شو', "switchAuthMode('signin')")}
        </div>` : ''}
        ${consentHtml}
      </div>`;
    resumeResendCooldown('signup_phone');
    return;
  }

  if(authMode === 'reset_email'){
    app.innerHTML = `
      <div class="onboard-wrap">
        ${brandHtml}
        <div style="text-align:center; color:var(--muted); font-size:calc(12.5px * var(--font-scale)); margin-bottom:10px;">بازیابی رمز عبور</div>
        <div class="note" style="margin-bottom:18px;">ایمیلت رو بنویس، یه کد تأیید برات می‌فرستیم. (اگه با شماره موبایل ثبت‌نام کردی، رمز نداری — از «ورود با موبایل» وارد شو.)</div>
        <div class="field"><label>ایمیل</label>${emailInput('auth_email', 'submitForgotPassword')}</div>
        ${errHtml}
        <button class="btn btn-primary" id="btn_forgot_password" style="width:100%; padding:15px; margin-top:6px;" onclick="submitForgotPassword()">فرستادن کد</button>
        <div style="text-align:center; margin-top:20px; font-size:calc(12.5px * var(--font-scale));">
          ${linkBtn('برگشت به ورود', "switchAuthMode('signin')")}
        </div>
      </div>`;
    return;
  }

  if(authMode === 'signup_choice'){
    app.innerHTML = `
      <div class="onboard-wrap">
        ${brandHtml}
        <div style="text-align:center; color:var(--muted); font-size:calc(12.5px * var(--font-scale)); margin-bottom:26px;">چطور می‌خوای ثبت‌نام کنی؟</div>
        ${EMAIL_AUTH_ENABLED ? `<button class="btn btn-primary" style="width:100%; padding:15px; margin-bottom:12px;" onclick="switchAuthMode('signup_email')">با ایمیل</button>` : ''}
        <button class="btn ${EMAIL_AUTH_ENABLED ? 'btn-ghost' : 'btn-primary'}" style="width:100%; padding:15px;" onclick="switchAuthMode('signup_phone')">با شماره موبایل</button>
        <div style="text-align:center; margin-top:20px; font-size:calc(12.5px * var(--font-scale));">
          قبلاً حساب ساختی؟ ${linkBtn('وارد شو', "switchAuthMode('signin')")}
        </div>
        ${consentHtml}
      </div>`;
    return;
  }

  if(authMode === 'signup_email'){
    app.innerHTML = `
      <div class="onboard-wrap">
        ${brandHtml}
        <div style="text-align:center; color:var(--muted); font-size:calc(12.5px * var(--font-scale)); margin-bottom:26px;">یه حساب جدید بساز</div>
        <div class="field">
          <label>ایمیل</label>
          ${emailInput('auth_email', 'submitSignupEmailStep')}
        </div>
        ${errHtml}
        <button class="btn btn-primary" id="btn_signup_email_step" style="width:100%; padding:15px; margin-top:6px;" onclick="submitSignupEmailStep()">فرستادن کد تأیید</button>
        ${googleBtn}
        <div style="text-align:center; margin-top:20px; font-size:calc(12.5px * var(--font-scale));">
          به‌جاش با شماره موبایل ثبت‌نام کن؟ ${linkBtn('موبایل', "switchAuthMode('signup_phone')")}
        </div>
        <div style="text-align:center; margin-top:20px; font-size:calc(12.5px * var(--font-scale));">
          قبلاً حساب ساختی؟ ${linkBtn('وارد شو', "switchAuthMode('signin')")}
        </div>
        ${consentHtml}
      </div>`;
    return;
  }

  if(authMode === 'signin_phone'){
    app.innerHTML = `
      <div class="onboard-wrap">
        ${brandHtml}
        <div style="text-align:center; color:var(--muted); font-size:calc(12.5px * var(--font-scale)); margin-bottom:26px;">با شماره موبایل وارد شو</div>
        <div class="field">
          <label>شماره موبایل</label>
          ${phoneInput('signin_phone', 'submitSigninPhoneStep')}
        </div>
        ${errHtml}
        <button class="btn btn-primary" id="btn_signin_phone_step" data-otp-family="signin_phone" style="width:100%; padding:15px; margin-top:6px;" onclick="submitSigninPhoneStep()">فرستادن کد ورود</button>
        ${googleBtn}
        ${EMAIL_AUTH_ENABLED ? `<div style="text-align:center; margin-top:20px; font-size:calc(12.5px * var(--font-scale));">
          با ایمیل ثبت‌نام کردی؟ ${linkBtn('ورود با ایمیل', "switchAuthMode('signin')")}
        </div>` : ''}
        <div style="text-align:center; margin-top:20px; font-size:calc(12.5px * var(--font-scale));">
          حساب نداری؟ ${linkBtn('بساز', "switchAuthMode('signup_choice')")}
        </div>
        ${consentHtml}
      </div>`;
    resumeResendCooldown('signin_phone');
    return;
  }

  // authMode === 'signin' (default) — email+password sign-in for existing accounts
  app.innerHTML = `
    <div class="onboard-wrap">
      ${brandHtml}
      <div style="text-align:center; color:var(--muted); font-size:calc(12.5px * var(--font-scale)); margin-bottom:26px;">وارد حسابت شو</div>

      <div class="field">
        <label>ایمیل</label>
        ${emailInput('auth_email', 'submitAuth')}
      </div>
      <div class="field">
        <label>رمز عبور</label>
        <input type="password" id="auth_pass" class="goal-input" placeholder="••••••••" autocomplete="current-password" style="direction:ltr; text-align:left;" onkeydown="onAuthEnter(event,'submitAuth')">
      </div>
      <div style="text-align:left; margin:-8px 0 12px;"><button style="font-size:calc(11.5px * var(--font-scale)); color:var(--muted); text-decoration:underline;" onclick="goToResetEmail()">رمزت رو فراموش کردی؟</button></div>
      ${errHtml}

      <button id="btn_email_signin" class="btn btn-primary" style="width:100%; padding:15px; margin-top:6px;" onclick="submitAuth()">ورود</button>
      ${googleBtn}

      <div style="text-align:center; margin-top:20px; font-size:calc(12.5px * var(--font-scale));">
        با شماره موبایل ثبت‌نام کردی؟ ${linkBtn('ورود با موبایل', "switchAuthMode('signin_phone')")}
      </div>
      <div style="text-align:center; margin-top:20px; font-size:calc(12.5px * var(--font-scale));">
        حساب نداری؟ ${linkBtn('بساز', "switchAuthMode('signup_choice')")}
      </div>
      ${consentHtml}
    </div>`;
}
// «رمزت رو فراموش کردی؟» ایمیلی که تو صفحه‌ی ورود تایپ شده رو با خودش می‌بره
function goToResetEmail(){
  const el = document.getElementById('auth_email');
  if(el) lastAuthEmail = normalizeEmail(el.value);
  switchAuthMode('reset_email');
}


// true inside the installed Capacitor app — Bazaar or a direct-APK install alike — false in the
// regular web/PWA version. Settings entries that only make sense in a browser (the desktop
// puzzle-tile layout, the "add to home screen" PWA guide) are hidden when this is true.
function isNativeApp(){
  return typeof Capacitor !== "undefined" && typeof Capacitor.getPlatform === "function" && Capacitor.getPlatform() !== "web";
}
function todayKey(d = new Date()){
  const y = d.getFullYear(), m = String(d.getMonth()+1).padStart(2,"0"), day = String(d.getDate()).padStart(2,"0");
  return `${y}-${m}-${day}`;
}
function dayKeyOf(d = new Date()){ return JS_DAY_TO_KEY[d.getDay()]; }

function activitiesForDay(dayKey){
  return DATA.activities.filter(a => a.days.includes("daily") || a.days.includes(dayKey));
}
function completedFor(dateKey){
  return new Set(DATA.history[dateKey] || []);
}
function pointsOf(id){
  const a = DATA.activities.find(a=>a.id===id);
  return a ? a.points : 0;
}
function todayPoints(dateObj = new Date()){
  const dk = todayKey(dateObj);
  const done = completedFor(dk);
  let sum = 0;
  done.forEach(id => sum += pointsOf(id));
  return sum;
}
function maxPointsFor(dayKey){
  const acts = activitiesForDay(dayKey);
  const groups = {};
  let sum = 0;
  acts.forEach(a=>{
    if(a.group){
      groups[a.group] = Math.max(groups[a.group]||0, a.points);
    } else {
      sum += a.points;
    }
  });
  Object.values(groups).forEach(v => sum += v);
  return sum;
}
function totalEverEarned(){
  let sum = 0;
  Object.values(DATA.history).forEach(ids=>{
    ids.forEach(id => sum += pointsOf(id));
  });
  return sum;
}
function cumulativePoints(){
  return Math.max(0, totalEverEarned() + (DATA.bonusPoints||0) - DATA.spent);
}
function sortedRewards(){
  return [...DATA.rewards].sort((a,b)=>a.points-b.points);
}
function nextTier(){
  const cum = cumulativePoints();
  return sortedRewards().find(r => r.points > cum) || null;
}

/* ===================== AI Coach: "پیشنهاد امروز پله" ===================== */
/* TWO independent coach contexts — each with its own signals, its own once-per-day cache,
   and its own call to the book-ai Edge Function — so someone who does their daily routine
   fine but hasn't opened a book (or vice versa) gets an accurate, context-specific nudge
   instead of one blended message shown in both places:
   - "today"  -> DATA.aiCoach     -> general daily-habit engagement (engagementSnapshot, below)
   - "books"  -> DATA.aiCoachBook -> book-reading engagement only (bookEngagementSnapshot, books.js) */
/* برای هر فعالیت، در ۲۸ روز اخیر، از بین روزهایی که واقعاً برنامه‌ریزی‌شده بود (نه هر روز)
   چند درصدش انجام شده — این دقیقاً همون چیزیه که engagementSnapshot قدیم نداشت: یه میانگین
   کلی می‌داد، نه اینکه کدوم فعالیت مشخص عقبه. فعالیت‌هایی که فرصت کمی داشتن (کمتر از ۲ بار
   برنامه‌ریزی‌شده) رد می‌شن تا نویز نده. */
function activityConsistencyReport(lookbackDays = 28){
  const now = new Date();
  const stats = {}; // id -> {scheduled, done}
  for(let i=0;i<lookbackDays;i++){
    const d = new Date(now); d.setDate(d.getDate()-i);
    const dk = dayKeyOf(d);
    const done = completedFor(todayKey(d));
    activitiesForDay(dk).forEach(a=>{
      if(!stats[a.id]) stats[a.id] = {title:a.title, scheduled:0, done:0};
      stats[a.id].scheduled++;
      if(done.has(a.id)) stats[a.id].done++;
    });
  }
  const rows = Object.values(stats)
    .filter(s => s.scheduled >= 2)
    .map(s => ({title:s.title, scheduled:s.scheduled, done:s.done, rate: Math.round((s.done/s.scheduled)*100)}));
  const weak = rows.filter(r=>r.rate < 60).sort((a,b)=>a.rate-b.rate).slice(0,3);
  const strong = rows.filter(r=>r.rate >= 85).map(r=>r.title);
  return {weak, strong};
}
function engagementSnapshot(){
  const now = new Date();
  const activeDays = Object.keys(DATA.history).filter(dk => (DATA.history[dk]||[]).length > 0).sort();
  const lastActive = activeDays.length ? activeDays[activeDays.length-1] : null;
  let daysSinceActive = null;
  if(lastActive){
    daysSinceActive = Math.max(0, Math.round((new Date(todayKey(now)) - new Date(lastActive)) / 86400000));
  }
  let missedCoreStreak = 0;
  for(let i=1;i<=14;i++){
    const d = new Date(now); d.setDate(d.getDate()-i);
    const core = activitiesForDay(dayKeyOf(d)).filter(a=>a.days.includes("daily"));
    if(!core.length) break;
    const done = completedFor(todayKey(d));
    if(core.every(a=>done.has(a.id))) break;
    missedCoreStreak++;
  }
  let earned = 0, possible = 0;
  for(let i=0;i<7;i++){
    const d = new Date(now); d.setDate(d.getDate()-i);
    const max = maxPointsFor(dayKeyOf(d));
    if(max<=0) continue;
    const done = completedFor(todayKey(d));
    let sum = 0; done.forEach(id=>sum+=pointsOf(id));
    earned += Math.min(sum, max);
    possible += max;
  }
  const completionRate7d = possible>0 ? Math.round((earned/possible)*100) : null;
  const coreActivityNames = activitiesForDay(dayKeyOf(now)).filter(a=>a.days.includes("daily")).map(a=>a.title);
  const {weak, strong} = activityConsistencyReport();
  // «حال امروز» و یادداشت‌های امروز رو هم به همون اسنپ‌شاتی که برای AI Coach فرستاده می‌شه اضافه
  // می‌کنیم — دقیقاً همون داده‌ای که تو ویجت‌های «حال امروز» و چک‌این‌های امروز از قبل تو
  // پروفایل کاربر ذخیره شده، فقط الان تو پرامپت هم دیده می‌شه. کوتاه نگه داشتن (اسلایس) که یه
  // یادداشت خیلی بلند بی‌جهت پرامپت رو سنگین نکنه.
  const todayDk = todayKey(now);
  const moodNow = moodFor(todayDk);
  const moodToday = (moodNow.emoji || moodNow.text) ? {emoji: moodNow.emoji || null, text: (moodNow.text||"").slice(0,300)} : null;
  const notesToday = Object.entries(DATA.checkinMedia || {})
    .filter(([k]) => k.startsWith(todayDk + ":"))
    .map(([,m]) => (m && m.note ? String(m.note).trim() : ""))
    .filter(Boolean)
    .slice(0, 5)
    .map(n => n.slice(0,300));
  return {daysSinceActive: daysSinceActive===null?0:daysSinceActive, missedCoreStreak, completionRate7d, coreActivityNames, weakActivities: weak, strongActivities: strong, moodToday, notesToday};
}
/* Book-specific snapshot lives in books.js (bookEngagementSnapshot) since it needs the
   book module's own data — declared here only as a safe fallback if books.js somehow
   hasn't loaded yet when the books coach card tries to render. */
function fallbackBookEngagementSnapshot(){
  return {bookDaysSinceActive:0, bookStreak:0, bookBestStreak:0, monthlyGoal:0, finishedThisMonth:0, hasCurrentBook:false, onboarded:false};
}
function localCoachFallback(context, eng){
  if(context === "books"){
    if(!eng.onboarded || eng.bookDaysSinceActive >= 3){
      return {message:"چند روزیه کتاب رو باز نکردی؛ اتفاقی نیفتاده، امروز فقط چند صفحه بخون.",
        plan:["۱۰ دقیقه از کتاب فعلیت بخون","یه یادداشت کوتاه از چیزی که خوندی بنویس", eng.hasCurrentBook ? "همون کتاب فعلیت رو ادامه بده" : "یه کتاب از کتابخونه انتخاب کن"]};
    }
    if(eng.bookStreak === 0){
      return {message:"دیروز کتاب نخوندی؛ امروز برگرد سر جات، حتی چند صفحه هم کافیه.",
        plan:["۱۰ دقیقه مطالعه ثبت کن","استریکت رو دوباره شروع کن"]};
    }
    return {message:"روند مطالعه‌ت خوبه، همینطوری ادامه بده!", plan: eng.hasCurrentBook ? ["امروز هم چند صفحه از کتاب فعلیت بخون"] : ["یه کتاب جدید از کتابخونه انتخاب کن"]};
  }
  // context === "today" — general daily-habit engagement, no book data mixed in
  if(eng.daysSinceActive >= 3){
    return {message:"چند روزیه سر نزدی؛ اتفاقی نیفتاده، فقط برگرد و از یه قدم کوچیک شروع کن.",
      plan:["فقط یک فعالیت پایه رو امروز تیک بزن","بقیه رو به فردا بسپار"]};
  }
  if(eng.missedCoreStreak >= 2){
    return {message:"به‌نظر می‌رسه برنامه‌ی این چند روزت یکم سنگین بوده؛ بیا سبکش کنیم تا بتونی ادامه بدی.",
      plan:["از تنظیمات یکی از فعالیت‌های پایه رو موقتاً غیرفعال کن","روی مهم‌ترین فعالیتت تمرکز کن","امتیازها رو واقع‌بینانه‌تر تنظیم کن"]};
  }
  return {message:"روند خوبی داری، همینطوری ادامه بده!", plan: eng.coreActivityNames.slice(0,3)};
}
let coachFetchInFlight = {today:false, books:false};
function shouldRefreshCoach(context){
  const key = context==="books" ? "aiCoachBook" : "aiCoach";
  const c = DATA[key];
  return !coachFetchInFlight[context] && (!c || c.date !== todayKey());
}
async function loadCoachSuggestion(context){
  context = context || "today";
  if(coachFetchInFlight[context]) return;
  coachFetchInFlight[context] = true;
  const key = context==="books" ? "aiCoachBook" : "aiCoach";
  const eng = context==="books"
    ? (typeof bookEngagementSnapshot === "function" ? bookEngagementSnapshot() : fallbackBookEngagementSnapshot())
    : engagementSnapshot();
  let result;
  if(typeof callBookAI === "function"){
    const res = await callBookAI("coach", {context, ...eng});
    result = (res && !res.error && res.message) ? {message:res.message, plan:res.plan||[]} : localCoachFallback(context, eng);
  } else {
    result = localCoachFallback(context, eng);
  }
  DATA[key] = {date: todayKey(), message: result.message, plan: result.plan};
  coachFetchInFlight[context] = false;
  save();
  renderAll();
}
function renderCoachCard(context){
  context = context || "today";
  if(shouldRefreshCoach(context)) loadCoachSuggestion(context);
  const key = context==="books" ? "aiCoachBook" : "aiCoach";
  const c = DATA[key];
  const title = context==="books" ? `${pi("books")} پیشنهاد کتاب امروز` : `${pi("robot")} پیشنهاد امروز پله`;
  const msg = c ? c.message : (context==="books" ? "در حال آماده‌سازی پیشنهاد کتاب امروزت..." : "در حال آماده‌سازی پیشنهاد امروزت...");
  const plan = c ? c.plan : [];
  return `
    <div class="card" style="margin-bottom:14px;">
      <div style="font-weight:700; font-size:var(--fs-15); margin-bottom:6px; display:flex; align-items:center; gap:8px;">${title}</div>
      <div class="note" style="margin-bottom:${plan.length?'10px':'0'};">${msg}</div>
      ${plan.length ? `<div style="display:flex; flex-direction:column; gap:6px;">${plan.map(p=>`<div style="font-size:var(--fs-13); background:var(--surface-2); border-radius:12px; padding:9px 12px; display:flex; gap:8px; align-items:flex-start;"><span class="pi-muted">${pi("check")}</span><span>${p}</span></div>`).join("")}</div>` : ``}
    </div>`;
}

/* ===================== "مهم‌ترین قدم امروز" — flagship "Peleh Life" feature =====================
   Reasons across today's tasks, goals, and book status to pick exactly ONE focus for the day —
   not a list, one thing. This is the single most AI-expensive call in the app (real reasoning
   across several data sources, not just one domain like the coach cards above), so it's
   Premium-gated on the client. Free users already get the rule-based equivalent for free via
   the 🔴/🟡/⚪ task-tier grouping on "امروز" — this is the smarter, personalized version of
   that same idea, not a completely separate concept. */
let importantStepLoading = false;
function shouldRefreshImportantStep(){
  const s = DATA.importantStep;
  return !importantStepLoading && (!s || s.date !== todayKey());
}
/* Tries to link the AI-picked step back to an actual task in today's list (exact or
   substring match on text) — this is what lets the two checkboxes (the step card, and the
   real task row below) stay in sync in both directions instead of being two disconnected
   "done" flags for the same real-world thing. */
function findMatchingTaskId(title, tasks){
  if(!title) return null;
  const norm = s => (s||"").trim().toLowerCase();
  const t = norm(title);
  const exact = tasks.find(x => norm(x.text) === t);
  if(exact) return exact.id;
  const partial = tasks.find(x => t.includes(norm(x.text)) || norm(x.text).includes(t));
  return partial ? partial.id : null;
}
/* ===================== Official Iranian holidays + notable occasions =====================
   Two separate datasets, both keyed by Jalali year, because the religious ones are lunar
   (Hijri) and shift ~11 days earlier every Jalali year — a fixed month/day formula would be
   wrong within a year or two. Sourced from Iran's official calendar (time.ir) for 1405.

   IMPORTANT — yearly maintenance: when Nowruz 1406 arrives (~Esfand 1405 / March 2027), add a
   new "1406": [...] block to BOTH objects below with that year's real dates from time.ir. Until
   that's done, holiday dots/streak-detection simply won't show for a year that has no entry —
   safe (no wrong dates shown), but worth remembering to update.

   OFFICIAL_HOLIDAYS = actual days off (تعطیل رسمی) — these are what "how many holiday days in
   a row" (for trip planning) is computed from.
   NOTABLE_OCCASIONS = important cultural/religious/family days that are NOT days off (Mother's
   Day, Father's Day, Yalda, Student's Day, ...) — shown only as calendar info, never counted
   as a break. */
const OFFICIAL_HOLIDAYS_BY_YEAR = {
  1405: [
    {m:1, d:1, label:"نوروز"}, {m:1, d:2, label:"نوروز / عید سعید فطر"}, {m:1, d:3, label:"نوروز"}, {m:1, d:4, label:"نوروز"},
    {m:1, d:12, label:"روز جمهوری اسلامی"}, {m:1, d:13, label:"سیزده‌به‌در"},
    {m:3, d:6, label:"عید سعید قربان"},
    {m:3, d:14, label:"رحلت امام خمینی (ره) / عید سعید غدیر خم"},
    {m:3, d:15, label:"قیام ۱۵ خرداد"},
    {m:4, d:3, label:"تاسوعای حسینی"}, {m:4, d:4, label:"عاشورای حسینی"},
    {m:5, d:13, label:"اربعین حسینی"},
    {m:5, d:21, label:"رحلت رسول اکرم (ص) و شهادت امام حسن مجتبی (ع)"},
    {m:5, d:22, label:"شهادت امام رضا (ع)"},
    {m:6, d:8, label:"میلاد پیامبر اکرم (ص) و امام جعفر صادق (ع)"},
    {m:10, d:16, label:"مبعث رسول اکرم (ص)"},
    {m:11, d:4, label:"نیمه شعبان"},
    {m:11, d:22, label:"پیروزی انقلاب اسلامی"},
    {m:12, d:9, label:"شهادت امام علی (ع)"},
    {m:12, d:19, label:"عید سعید فطر"}, {m:12, d:20, label:"تعطیل به مناسبت عید سعید فطر"},
    {m:12, d:29, label:"روز ملی‌شدن صنعت نفت"},
  ],
};
const NOTABLE_OCCASIONS_BY_YEAR = {
  1405: [
    {m:1, d:30, label:"روز دختر"},
    {m:2, d:12, label:"روز معلم"},
    {m:2, d:22, label:"روز جهانی پرستار"},
    {m:6, d:21, label:"روز سینما"},
    {m:6, d:27, label:"روز شعر و ادب پارسی"},
    {m:8, d:16, label:"روز ملی کودک"},
    {m:8, d:24, label:"روز کتاب و کتابخوانی"},
    {m:8, d:26, label:"روز جهانی دانش‌آموز"},
    {m:9, d:9, label:"روز مادر"},
    {m:9, d:30, label:"شب یلدا"},
    {m:10, d:2, label:"روز پدر"},
    {m:10, d:12, label:"روز حافظ"},
    {m:11, d:29, label:"جشن سپندارمذگان، روز عشق ایرانی"},
  ],
};
function officialHolidaysOf(jy){ return OFFICIAL_HOLIDAYS_BY_YEAR[jy] || []; }
function notableOccasionsOf(jy){ return NOTABLE_OCCASIONS_BY_YEAR[jy] || []; }
function officialHolidayFor(jy, jm, jd){
  return officialHolidaysOf(jy).find(h=>h.m===jm && h.d===jd) || null;
}
function notableOccasionsFor(jy, jm, jd){
  return notableOccasionsOf(jy).filter(o=>o.m===jm && o.d===jd);
}
// Is this calendar date (Jalali y/m/d) a day off — either Friday or an official holiday?
function isDayOff(jy, jm, jd){
  const [gy,gm,gd] = jalaliToGregorian(jy, jm, jd);
  if(dayKeyOf(new Date(gy, gm-1, gd)) === "fri") return true;
  return !!officialHolidayFor(jy, jm, jd);
}
/* Looks ahead day-by-day (up to 40 days, covering the longest realistic gap between breaks)
   for the next day that's a Friday or official holiday, then measures how many consecutive
   days-off it's actually part of (merging adjacent Fridays with the holiday itself — a single
   holiday stuck between two workdays is a 1-day break; one next to a Friday is a real 2-3 day
   window worth planning a trip around). */
function daysUntilNextHoliday(){
  const now = new Date(); now.setHours(0,0,0,0);
  for(let i=1; i<=40; i++){
    const d = new Date(now); d.setDate(d.getDate()+i);
    const [jy,jm,jd] = jalaliOf(d);
    const hol = officialHolidayFor(jy, jm, jd);
    const off = hol || dayKeyOf(d) === "fri";
    if(!off) continue;
    // walk backward/forward from this day to find the full consecutive off-streak
    let start = new Date(d), end = new Date(d);
    while(true){
      const prev = new Date(start); prev.setDate(prev.getDate()-1);
      const [py,pm,pd] = jalaliOf(prev);
      if(!isDayOff(py,pm,pd)) break;
      start = prev;
    }
    while(true){
      const next = new Date(end); next.setDate(next.getDate()+1);
      const [ny,nm,nd] = jalaliOf(next);
      if(!isDayOff(ny,nm,nd)) break;
      end = next;
    }
    const breakLength = Math.round((end - start) / 86400000) + 1;
    return {days:i, label: hol ? hol.label : "آخر هفته", breakLength};
  }
  return null;
}

async function loadImportantStep(){
  if(importantStepLoading) return;
  importantStepLoading = true;
  const extra = dailyExtraFor(todayKey());
  const undoneTasks = extra.tasks.filter(t=>!t.done);
  const eng = engagementSnapshot();
  const bookEng = (typeof bookEngagementSnapshot === "function") ? bookEngagementSnapshot() : fallbackBookEngagementSnapshot();
  const wp = DATA.workProfile || {};
  const holiday = daysUntilNextHoliday();
  const b = (typeof ensureBooksData === "function") ? ensureBooksData() : {library:[]};
  const payload = {
    tasks: undoneTasks.map(t=>({text:t.text, priority:t.priority})),
    goals: DATA.goals,
    daysSinceActive: eng.daysSinceActive,
    bookDaysSinceActive: bookEng.bookDaysSinceActive,
    bookStreak: bookEng.bookStreak,
    hasCurrentBook: bookEng.hasCurrentBook,
    employment: wp.employment || null,
    workHours: (wp.workStart && wp.workEnd) ? `${wp.workStart}-${wp.workEnd}` : null,
    currentTime: new Date().toTimeString().slice(0,5),
    interests: [...(wp.interests||[]).map(id => (INTEREST_PRESETS.find(p=>p.id===id)||{}).label).filter(Boolean), wp.interestsCustom].filter(Boolean).join("، "),
    isWeekend: dayKeyOf(new Date()) === "fri",
    daysUntilHoliday: holiday ? holiday.days : null,
    holidayLabel: holiday ? holiday.label : null,
    holidayBreakDays: holiday ? holiday.breakLength : null,
    likesReading: (wp.interests||[]).includes("reading"),
    libraryEmpty: (b.library||[]).length === 0,
  };
  let result;
  if(typeof callBookAI === "function"){
    const res = await callBookAI("important_step", payload);
    result = (res && !res.error && res.title) ? res : localImportantStepFallback(payload);
  } else {
    result = localImportantStepFallback(payload);
  }
  DATA.importantStep = {
    date: todayKey(), title: result.title, reason: result.reason, minutes: result.minutes || 15,
    done:false, taskId: findMatchingTaskId(result.title, undoneTasks),
  };
  importantStepLoading = false;
  save();
  renderAll();
}
function localImportantStepFallback(payload){
  const urgent = payload.tasks.find(t=>t.priority==="urgent");
  if(urgent) return {title: urgent.text, reason:"این کار امروز اولویت ضروری داره.", minutes:20};
  const important = payload.tasks.find(t=>t.priority==="important");
  if(important) return {title: important.text, reason:"این کار مهمه، بهتره امروز جلو بره.", minutes:20};
  if(payload.likesReading && payload.libraryEmpty) return {title:"اولین کتابت رو به کتابخونه اضافه کن", reason:"گفته بودی اهل کتاب‌خوندنی، ولی هنوز کتابخونه‌ت خالیه.", minutes:5};
  if(payload.bookDaysSinceActive >= 2) return {title:"چند صفحه از کتابت بخون", reason:"چند روزه کتاب نخوندی.", minutes:15};
  if(payload.daysUntilHoliday != null && payload.daysUntilHoliday <= 4){
    const realBreak = (payload.holidayBreakDays || 1) >= 2;
    // یه روز تعطیلی تنها، وسط هفته‌ی کاری، برای شاغل‌ها وقت واقعی سفر نیست — فقط برای
    // فریلنسر/بیکار یا وقتی خودِ تعطیلی چندروزه‌ست پیشنهاد سفر معنی داره.
    const worthTravelSuggestion = realBreak || payload.employment !== "employed";
    if(worthTravelSuggestion){
      const dayWord = (payload.holidayBreakDays||1) >= 2 ? `${toFaDigits(payload.holidayBreakDays)} روز پشت‌سرهم تعطیلی` : `${toFaDigits(payload.daysUntilHoliday)} روز تا ${payload.holidayLabel}`;
      return {title:"برای تعطیلات پیش‌رو یه برنامه بریز", reason:`${dayWord} مونده — وقت خوبیه برای برنامه‌ریزی سفر یا استراحت.`, minutes:15};
    }
    return {title:"برای این یه‌روز تعطیلی یه برنامه‌ی کوچیک بذار", reason:`${toFaDigits(payload.daysUntilHoliday)} روز تا ${payload.holidayLabel} مونده، ولی تنهاست و به تعطیلی بلند وصل نیست — برای یه استراحت نزدیک خونه خوبه، نه سفر.`, minutes:10};
  }
  const goalList = [...(DATA.goals.short||[]), ...(DATA.goals.medium||[]), ...(DATA.goals.long||[])];
  if(goalList.length) return {title: goalList[0], reason:"یه قدم برای این هدفت بردار.", minutes:20};
  if(payload.isWeekend && payload.interests){
    const first = payload.interests.split("،")[0].trim();
    if(first) return {title:`امشب یه‌کم وقت برای ${first} بذار`, reason:"آخر هفته‌ست و کار فوری‌ای نداری — یه فرصت خوبه.", minutes:30};
  }
  return {title:"یه کار کوچیک امروز انجام بده", reason:"هر قدمی، هرچقدم کوچیک، حساب می‌شه.", minutes:10};
}
function completeImportantStep(){
  if(!DATA.importantStep) return;
  DATA.importantStep.done = true;
  if(DATA.importantStep.taskId){
    const dk = todayKey();
    const cur = dailyExtraFor(dk);
    const t = cur.tasks.find(x=>x.id===DATA.importantStep.taskId);
    if(t && !t.done){
      cur.tasks = cur.tasks.map(x=> x.id===t.id ? {...x, done:true} : x);
      saveDailyExtra(dk, {tasks: cur.tasks});
    }
  }
  save();
  renderAll();
  if(typeof playBigCelebration === "function") playBigCelebration();
}
function renderImportantStepCard(){
  const isPremium = (typeof isPremiumActive === "function") && isPremiumActive();
  const tip = ``; // توضیح جداگانه حذف شد — خود کارت کوتاه و گویاست (متن توضیحی کمتر)
  if(!isPremium){
    return `${tip}<div class="card list-card" style="margin-bottom:14px;"><div class="link-row" onclick="switchTab('premium');">
      <div class="act-icon">${pi("target")}</div>
      <div class="act-title">مهم‌ترین قدم امروزت<span class="alt-tag">پله از بین همه‌ی کارهات یکی رو انتخاب می‌کنه · Premium</span></div>
      <span class="badge-soft">${pi("gem")}</span><span class="chev">${pi("chevL")}</span>
    </div></div>`;
  }
  const askHours = renderWorkHoursAskCard();
  if(askHours) return `${tip}${askHours}`;
  if(shouldRefreshImportantStep()){
    loadImportantStep();
    return `${tip}<div class="card" style="margin-bottom:14px;">
      <div style="font-weight:800; margin-bottom:4px;">⭐ مهم‌ترین قدم امروزت</div>
      <div class="note">در حال آماده‌سازی...</div>
    </div>`;
  }
  const s = DATA.importantStep;
  const taskDone = s.taskId ? !!(dailyExtraFor(todayKey()).tasks.find(x=>x.id===s.taskId)||{}).done : false;
  if(s.done || taskDone){
    return `${tip}<div class="card" style="margin-bottom:14px; text-align:center;">
      <div style="font-weight:800; color:var(--ok);">${pi("checkCircle")} انجام شد</div>
      <div class="note" style="margin-top:4px;">عالی. امروز یک پله جلو رفتی.</div>
    </div>`;
  }
  return `${tip}<div class="card accent" style="margin-bottom:14px;">
    <div class="note" style="display:flex; align-items:center; gap:6px; margin-bottom:4px;">${pi("target")} مهم‌ترین قدم امروزت</div>
    <div style="font-size:var(--fs-16); font-weight:800; margin-bottom:4px;">${s.title}</div>
    <div class="note" style="margin-bottom:10px;">${s.reason} · حدود ${toFaDigits(s.minutes)} دقیقه</div>
    <button class="btn btn-primary" style="width:100%;" onclick="completeImportantStep()">${pi("check")} انجام شد</button>
  </div>`;
}

function toggleActivity(id, dateObj = new Date()){
  const dk = todayKey(dateObj);
  // «تمرین سلامت پلاس»: لمس = باز شدن تمرین امروز (تیکش با پایان جلسه خودکار می‌خوره)
  if(id === "plus_workout" && CLIENT_FLAGS.plus_enabled && typeof plusOpenTodayWorkout === "function"
     && dk === todayKey() && !(DATA.history[dk] || []).includes(id)){ plusOpenTodayWorkout(); return; }
  const wk = dayKeyOf(dateObj);
  const list = new Set(DATA.history[dk] || []);
  const activity = DATA.activities.find(a=>a.id===id);
  let becameDone = false, becameUndone = false;
  if(list.has(id)){
    list.delete(id);
    becameUndone = true;
  } else {
    if(activity && activity.group){
      // uncheck any sibling in the same exclusive group
      DATA.activities.filter(a=>a.group===activity.group && a.id!==id).forEach(sib => list.delete(sib.id));
    }
    list.add(id);
    becameDone = true;
  }
  DATA.history[dk] = Array.from(list);
  const firstEver = becameDone && trackFunnel("first_checkin");
  save();
  if(becameDone){
    const nowMax = maxPointsFor(wk);
    const nowPts = todayPoints(dateObj);
    if(nowMax > 0 && nowPts >= nowMax){
      playBigCelebration();
    } else {
      playCompleteChime();
      triggerCompleteCelebration('✨', false);
    }
  }
  if(becameUndone){ playUndoBlip(); }
  renderAll();
  if(firstEver) setTimeout(() => showToast("تیک زدی! امتیازت اضافه شد 🎉", { ms: 3500 }), 350);
}

function claimReward(id){
  const tier = DATA.rewards.find(r=>r.id===id);
  if(!tier || cumulativePoints() < tier.points) return;
  if(!confirm(`${tier.points} امتیاز برای «${tier.title}» خرج بشه؟`)) return;
  DATA.spent += tier.points;
  save();
  playCashRegister();
  renderAll();
}

/* ---- Mood journal ---- */
function moodFor(dateKey){
  return DATA.moods[dateKey] || {emoji:null, text:""};
}
function setMoodEmoji(emoji){
  const dk = todayKey();
  const m = moodFor(dk);
  DATA.moods[dk] = {emoji: (m.emoji===emoji ? null : emoji), text: m.text};
  save();
  renderAll();
}
function setMoodText(val){
  const dk = todayKey();
  const m = moodFor(dk);
  DATA.moods[dk] = {emoji: m.emoji, text: val};
  save();
}

/* ---- Daily goals / top3 / tasks / notes ---- */
function blankDailyExtra(){
  return {goal:"", tasks:[], notes:{ideas:[],quick:[],important:[],tomorrow:[]}, goalActions:{short:[],medium:[],long:[]}};
}
function dailyExtraFor(dateKey){
  if(!DATA.dailyExtra[dateKey]) return blankDailyExtra();
  const d = DATA.dailyExtra[dateKey];
  const n = d.notes || {};
  const ga = d.goalActions || {};
  return Object.assign(blankDailyExtra(), d, {
    tasks: d.tasks || [],
    notes: {ideas:toArr(n.ideas), quick:toArr(n.quick), important:toArr(n.important), tomorrow:toArr(n.tomorrow)},
    goalActions: {short:toArr(ga.short), medium:toArr(ga.medium), long:toArr(ga.long)}
  });
}
function saveDailyExtra(dateKey, patch){
  const cur = dailyExtraFor(dateKey);
  DATA.dailyExtra[dateKey] = Object.assign(cur, patch);
  save();
}
function addGoalItem(horizon, text){
  if(!text.trim()) return;
  DATA.goals[horizon].push(text.trim());
  save();
  openGoalsSheet();
}
function deleteGoalItem(horizon, idx){
  DATA.goals[horizon].splice(idx,1);
  save();
  openGoalsSheet();
}
function addGoalAction(horizon, text){
  if(!text.trim()) return;
  const dk = todayKey();
  const cur = dailyExtraFor(dk);
  cur.goalActions[horizon].push(text.trim());
  saveDailyExtra(dk, {goalActions: cur.goalActions});
  openGoalsSheet();
}
function deleteGoalAction(horizon, idx){
  const dk = todayKey();
  const cur = dailyExtraFor(dk);
  cur.goalActions[horizon].splice(idx,1);
  saveDailyExtra(dk, {goalActions: cur.goalActions});
  openGoalsSheet();
}

/* ---- Calendar events / occasions (any date, past or future) ---- */
function birthdayEventsFor(dateKey){
  if(!profileMeta.birthdate) return [];
  const [by, bm, bd] = profileMeta.birthdate.split("-").map(Number);
  if(!by || !bm || !bd) return [];
  const [, birthJm, birthJd] = jalaliOf(new Date(by, bm-1, bd));
  const [y, m, d] = dateKey.split("-").map(Number);
  const [, jm, jd] = jalaliOf(new Date(y, m-1, d));
  if(jm === birthJm && jd === birthJd){
    const name = profileMeta.name ? profileMeta.name + " عزیز، " : "";
    return [{id:"birthday_"+dateKey, title:`🎂 ${name}تولدت مبارک! 🎉❤️`}];
  }
  return [];
}
function eventsFor(dateKey){
  const manual = DATA.events[dateKey] || [];
  const bookEvents = (typeof ensureBooksData === "function") ? bookEventsFor(dateKey) : [];
  const birthdayEvents = birthdayEventsFor(dateKey);
  return manual.concat(bookEvents).concat(birthdayEvents);
}
function addEvent(dateKey, title){
  if(!title.trim()) return;
  if(!DATA.events[dateKey]) DATA.events[dateKey] = [];
  DATA.events[dateKey].push({id:"ev_"+(DATA.nextEventSeq++), title: title.trim()});
  save();
}
function deleteEvent(dateKey, id){
  if(!DATA.events[dateKey]) return;
  DATA.events[dateKey] = DATA.events[dateKey].filter(e=>e.id!==id);
  if(DATA.events[dateKey].length===0) delete DATA.events[dateKey];
  save();
}
function setTodayGoal(val){
  saveDailyExtra(todayKey(), {goal: val});
}
function addNoteItem(field, text){
  if(!text.trim()) return;
  const dk = todayKey();
  const cur = dailyExtraFor(dk);
  cur.notes[field].push(text.trim());
  saveDailyExtra(dk, {notes: cur.notes});
  renderAll();
}
/* "فردا یادم باشه" notes are written under the day you wrote them on, so without this
   they'd sit invisible in yesterday's data forever once today arrives. Once per day (guarded
   by _migratedTomorrow so it doesn't re-run and duplicate on every render), pull yesterday's
   tomorrow-notes into today's real task list — not delete them, just move them forward. */
function migrateTomorrowNotesToToday(){
  const dk = todayKey();
  const cur = dailyExtraFor(dk);
  if(cur._migratedTomorrow === dk) return;
  const y = new Date(); y.setDate(y.getDate()-1);
  const yk = todayKey(y);
  const yExtra = DATA.dailyExtra[yk];
  if(yExtra && yExtra.notes && Array.isArray(yExtra.notes.tomorrow) && yExtra.notes.tomorrow.length){
    yExtra.notes.tomorrow.forEach(text=>{
      cur.tasks.push({id:"task_"+(DATA.nextTaskSeq++), text, priority:"important", done:false, starred:false, fromTomorrowNote:true});
    });
    yExtra.notes.tomorrow = [];
    DATA.dailyExtra[yk] = yExtra;
  }
  cur._migratedTomorrow = dk;
  DATA.dailyExtra[dk] = cur;
  save();
}
function deleteNoteItem(field, idx){
  const dk = todayKey();
  const cur = dailyExtraFor(dk);
  cur.notes[field].splice(idx,1);
  saveDailyExtra(dk, {notes: cur.notes});
  renderAll();
}

/* ---- Generic reusable "add multiple items" list field ----
   addCallJs: JS expr using local var `v` for the new item's text, e.g. "addGoalItem('short', v)"
   deleteCallPrefix: function-call prefix taking just the index, e.g. "deleteGoalItem('short', " */
function renderListField(items, addCallJs, deleteCallPrefix, placeholder){
  const rows = items.map((text,i) => `
    <div class="list-item-row">
      <button class="icon-btn" style="width:24px;height:24px;" onclick="${deleteCallPrefix}${i})">${ICONS.trash}</button>
      <div class="list-item-text">${text}</div>
    </div>`).join("");
  return `
    <div class="list-field">
      ${rows || `<div class="empty" style="padding:4px 0;">چیزی اضافه نشده</div>`}
      <div style="display:flex; gap:8px; margin-top:8px;">
        <button class="btn btn-primary" style="flex:none; padding:8px 12px; font-size:calc(11.5px * var(--font-scale));" onclick="const inp=this.nextElementSibling; const v=inp.value; if(v.trim()){${addCallJs}; inp.value='';}">افزودن</button>
        <input type="text" class="goal-input" placeholder="${placeholder}">
      </div>
    </div>`;
}
function toggleTask(id){
  const dk = todayKey();
  const cur = dailyExtraFor(dk);
  let becameDone = false;
  let becameUndone = false;
  cur.tasks = cur.tasks.map(t => {
    if(t.id !== id) return t;
    const newDone = !t.done;
    if(newDone) becameDone = true; else becameUndone = true;
    return {...t, done:newDone};
  });
  saveDailyExtra(dk, {tasks: cur.tasks});
  if(becameDone){ playCompleteChime(); triggerCompleteCelebration('✨', false); }
  if(becameUndone){ playUndoBlip(); }
  renderAll();
}
function toggleStar(id){
  const dk = todayKey();
  const cur = dailyExtraFor(dk);
  const starredCount = cur.tasks.filter(t=>t.starred).length;
  const target = cur.tasks.find(t=>t.id===id);
  if(target && !target.starred && starredCount >= 3){
    alert("همین الان ۳ تا کار مهم ستاره‌دار داری. یکیشون رو اول بردار بعد این یکی رو ستاره بزن.");
    return;
  }
  cur.tasks = cur.tasks.map(t => t.id===id ? {...t, starred:!t.starred} : t);
  saveDailyExtra(dk, {tasks: cur.tasks});
  renderAll();
}
function deleteTask(id){
  const dk = todayKey();
  const cur = dailyExtraFor(dk);
  cur.tasks = cur.tasks.filter(t=>t.id!==id);
  saveDailyExtra(dk, {tasks: cur.tasks});
  renderAll();
}
function editTask(id){
  const dk = todayKey();
  const cur = dailyExtraFor(dk);
  const t = cur.tasks.find(x=>x.id===id);
  if(!t) return;
  openOverlay(`
    <h3>ویرایش کار</h3>
    <div class="field">
      <label>متن کار</label>
      <input type="text" id="editTaskInput" class="goal-input" value="${t.text.replace(/"/g,'&quot;')}">
    </div>
    <div class="sheet-actions">
      <button class="btn btn-primary" onclick="saveEditedTask('${id}')">ذخیره</button>
      <button class="btn btn-ghost" onclick="closeOverlay()">انصراف</button>
    </div>
  `);
  setTimeout(()=>{ const el = document.getElementById("editTaskInput"); if(el){ el.focus(); el.select(); } }, 50);
}
function saveEditedTask(id){
  const text = document.getElementById("editTaskInput").value.trim();
  if(!text) return;
  const dk = todayKey();
  const cur = dailyExtraFor(dk);
  cur.tasks = cur.tasks.map(t => t.id===id ? {...t, text} : t);
  saveDailyExtra(dk, {tasks: cur.tasks});
  closeOverlay();
  renderAll();
}
/* "قابل انتقال" tier tasks can be pushed straight to tomorrow's list with one tap — same
   underlying mechanism as the "فردا یادم باشه" migration (dailyExtra is per-date), just
   moving a task instead of a plain note, and immediately rather than waiting for the day
   to roll over. */
function deferTaskToTomorrow(id){
  const dk = todayKey();
  const cur = dailyExtraFor(dk);
  const idx = cur.tasks.findIndex(t=>t.id===id);
  if(idx===-1) return;
  const [task] = cur.tasks.splice(idx,1);
  saveDailyExtra(dk, {tasks: cur.tasks});
  const tmr = new Date(); tmr.setDate(tmr.getDate()+1);
  const tk = todayKey(tmr);
  const tCur = dailyExtraFor(tk);
  tCur.tasks.push({...task, done:false});
  DATA.dailyExtra[tk] = tCur;
  save();
  renderAll();
}
function addTask(text, priority){
  if(!text.trim()) return;
  const dk = todayKey();
  const cur = dailyExtraFor(dk);
  cur.tasks.push({id: "task_"+(DATA.nextTaskSeq++), text: text.trim(), priority, done:false, starred:false});
  saveDailyExtra(dk, {tasks: cur.tasks});
}

/* ---- Sound & celebration feedback: all synthesized (Web Audio API), no external files needed ---- */
function getAudioCtx(){
  try{
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if(!Ctx) return null;
    return new Ctx();
  }catch(e){ return null; }
}
function playTone(ctx, freq, t0, dur, type, peak){
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type || 'sine';
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(peak||0.22, t0+0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0+dur);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0+dur+0.02);
}
/* Happy ascending chime — completing any checkable item (task, daily habit, main activity) */
function playCompleteChime(){
  const ctx = getAudioCtx();
  if(!ctx) return;
  [660, 880, 1175].forEach((freq,i)=> playTone(ctx, freq, ctx.currentTime+i*0.08, 0.32, 'sine', 0.22));
  setTimeout(()=>{ try{ ctx.close(); }catch(e){} }, 700);
}
/* Gentle descending "womp" — un-checking something already done. Not harsh, just a soft cue. */
function playUndoBlip(){
  const ctx = getAudioCtx();
  if(!ctx) return;
  [440, 330].forEach((freq,i)=> playTone(ctx, freq, ctx.currentTime+i*0.07, 0.22, 'sine', 0.14));
  setTimeout(()=>{ try{ ctx.close(); }catch(e){} }, 500);
}
/* Bigger arpeggio + confetti — reached 100% of today's possible points */
function playBigCelebration(){
  const ctx = getAudioCtx();
  if(!ctx) return;
  [523, 659, 784, 988, 1318].forEach((freq,i)=> playTone(ctx, freq, ctx.currentTime+i*0.075, 0.4, 'triangle', 0.2));
  setTimeout(()=>{ try{ ctx.close(); }catch(e){} }, 900);
  triggerCompleteCelebration('🎉', true);
}
/* Louder, longer, unmistakably "an alarm went off" — 3 rounds of a two-tone beep, distinct from
   the soft completion chime everything else uses. Focus-timer end is the one moment in this app
   that's meant to interrupt you, not just quietly acknowledge something. */
function playTimerAlarm(){
  const ctx = getAudioCtx();
  if(!ctx) return;
  const t0 = ctx.currentTime;
  for(let round=0; round<3; round++){
    const rt = t0 + round*0.5;
    playTone(ctx, 880, rt, 0.18, 'square', 0.4);
    playTone(ctx, 1108, rt+0.2, 0.22, 'square', 0.4);
  }
  setTimeout(()=>{ try{ ctx.close(); }catch(e){} }, 2200);
}
/* Two-note "cha-ching" bell — spending points on a reward */
function playCashRegister(){
  const ctx = getAudioCtx();
  if(!ctx) return;
  const t0 = ctx.currentTime;
  playTone(ctx, 1568, t0, 0.14, 'square', 0.10);
  playTone(ctx, 2093, t0+0.09, 0.28, 'square', 0.12);
  setTimeout(()=>{ try{ ctx.close(); }catch(e){} }, 600);
  triggerCompleteCelebration('💸', false);
}
function triggerCompleteCelebration(emoji, big){
  const el = document.createElement('div');
  el.className = 'celebrate-toast' + (big ? ' big' : '');
  el.innerHTML = piEmoji(emoji || '✨', 'sparkle');
  document.body.appendChild(el);
  setTimeout(()=>{ el.remove(); }, big ? 1100 : 850);
}


/* ---- Weekly goal / review ---- */
function weekKeyOf(dateObj){ return todayKey(saturdayOf(dateObj)); }
function blankWeekly(){
  return {goal:"", review:{done:"", delayed:"", achievement:"", timeSink:"", nextFocus:""}};
}
function weeklyFor(weekKey){
  if(!DATA.weekly[weekKey]) return blankWeekly();
  const w = DATA.weekly[weekKey];
  return Object.assign(blankWeekly(), w, {
    review: Object.assign({done:"",delayed:"",achievement:"",timeSink:"",nextFocus:""}, w.review||{})
  });
}
function saveWeekly(weekKey, patch){
  const cur = weeklyFor(weekKey);
  DATA.weekly[weekKey] = Object.assign(cur, patch);
  save();
}

/* ---- Profile photo ---- */
function setProfilePhoto(dataUrl){
  saveProfileInfo({photo: dataUrl});
  renderAll();
}
function triggerPhotoPicker(){
  document.getElementById("photoInput").click();
}
/* HEIC/HEIF (the default format on iPhone, and increasingly on Android too) can't be
   decoded by <img>/<canvas> in almost any browser — that's the "بعضی فرمت‌ها رو نمی‌خونه"
   bug. We convert it to JPEG first with heic2any (loaded on-demand, only when actually
   needed). Every photo — HEIC or not — is also resized/recompressed through a canvas so a
   giant 12-megapixel camera photo doesn't get stored as-is (which was also likely choking
   on some devices and bloating the profile row). */
let heic2anyLoadPromise = null;
function loadHeic2Any(){
  if(window.heic2any) return Promise.resolve();
  if(heic2anyLoadPromise) return heic2anyLoadPromise;
  // نسخه‌ی محلی (vendor/) — اپ اندروید هیچ کد اجرایی‌ای از اینترنت دانلود نمی‌کنه (سیاست فروشگاه‌ها)
  // و اگه CDN فیلتر/کند باشه هم کار می‌کنه. فقط نسخه‌ی وب در صورت نبودِ فایل محلی سراغ CDN می‌ره.
  const load = (src) => new Promise((resolve, reject)=>{
    const s = document.createElement("script");
    s.src = src;
    s.onload = resolve;
    s.onerror = () => { s.remove(); reject(new Error("heic2any load failed: " + src)); };
    document.head.appendChild(s);
  });
  heic2anyLoadPromise = load("vendor/heic2any.min.js").catch((e) => {
    if(isNativeApp()) throw e;
    return load("https://cdn.jsdelivr.net/npm/heic2any@0.0.4/dist/heic2any.min.js");
  }).catch((e) => { heic2anyLoadPromise = null; throw e; });
  return heic2anyLoadPromise;
}
async function normalizeImageFile(file){
  const isHeic = /heic|heif/i.test(file.type) || /\.hei[cf]$/i.test(file.name || "");
  if(isHeic){
    await loadHeic2Any();
    const converted = await window.heic2any({blob:file, toType:"image/jpeg", quality:0.85});
    return Array.isArray(converted) ? converted[0] : converted;
  }
  return file;
}
function blobToResizedDataUrl(blob, maxSize, quality){
  return new Promise((resolve, reject)=>{
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error || new Error("خواندن فایل ناموفق بود"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("این فرمت عکس قابل نمایش نیست"));
      img.onload = () => {
        let {width, height} = img;
        if(width > maxSize || height > maxSize){
          const ratio = Math.min(maxSize/width, maxSize/height);
          width = Math.round(width*ratio);
          height = Math.round(height*ratio);
        }
        const canvas = document.createElement("canvas");
        canvas.width = width; canvas.height = height;
        canvas.getContext("2d").drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(blob);
  });
}
async function onPhotoSelected(input){
  const file = input.files && input.files[0];
  if(!file) return;
  try{
    const normalized = await normalizeImageFile(file);
    const dataUrl = await blobToResizedDataUrl(normalized, 480, 0.82);
    setProfilePhoto(dataUrl);
  }catch(e){
    console.error("Photo processing failed:", e);
    alert("این فرمت عکس پشتیبانی نمی‌شه. لطفاً یه عکس JPG یا PNG امتحان کن.");
  }
  input.value = ""; // allow re-selecting the same file again later
}

/* ===================== Rendering ===================== */

let currentTab = "today";
let installTab = "ios";

/* ===================== Font size (accessibility) ===================== */
const FONT_SCALE_KEY = "pelehFontScale";
const FONT_SCALES = [
  {value:0.9, label:"کوچیک"},
  {value:1, label:"معمولی"},
  {value:1.15, label:"بزرگ"},
  {value:1.3, label:"خیلی بزرگ"},
];
function getFontScale(){
  const v = parseFloat(localStorage.getItem(FONT_SCALE_KEY));
  return FONT_SCALES.some(f=>f.value===v) ? v : 1;
}
function applyFontScale(){
  document.documentElement.style.setProperty("--font-scale", getFontScale());
}
function setFontScale(v){
  localStorage.setItem(FONT_SCALE_KEY, v);
  applyFontScale();
  renderAll();
}

const THEME_KEY = "pelehTheme";
const THEMES = [
  {id:"goldnavy",  cls:"", label:"طلایی و سرمه‌ای"},
  {id:"charcoal",  cls:"theme-charcoal", label:"زغالی و طلایی"},
  {id:"emerald",   cls:"theme-emerald", label:"سبز و طلایی"},
  {id:"light",     cls:"theme-light", label:"روشن مینیمال"},
  {id:"garnet",    cls:"theme-garnet", label:"قرمز جیگری"},
  {id:"crimson",   cls:"theme-crimson", label:"قرمز روشن و سفید"},
];
// تم‌های ویژه‌ی سطحی — هرکدوم دقیقاً با رسیدن به یه سطح باز می‌شن؛ ۶ تم بالا همیشه رایگان و
// جدا از این‌ها می‌مونن (طبق وعده‌ی صفحه‌ی قیمت‌گذاری). ترتیب اینجا = ترتیب باز شدن.
const LEVEL_THEMES = [
  {id:"bronze",      cls:"theme-bronze",      label:"برنزی", unlockLevel:2,  tagline:"اولین قدم رسمی — برنز"},
  {id:"silver",      cls:"theme-silver",      label:"نقره‌ای", unlockLevel:3,  tagline:"براق و خنک"},
  {id:"rosegold",    cls:"theme-rosegold",    label:"رزگلد", unlockLevel:4,  tagline:"ظریف و گرم"},
  {id:"sapphire",    cls:"theme-sapphire",    label:"یاقوت‌کبود", unlockLevel:5,  tagline:"آبی عمیق شب"},
  {id:"emeraldnoir", cls:"theme-emeraldnoir", label:"زمرد مشکی", unlockLevel:6,  tagline:"سبز روی سیاه مطلق"},
  {id:"amethyst",    cls:"theme-amethyst",    label:"آمتیست", unlockLevel:7,  tagline:"بنفش رازآلود"},
  {id:"rubynoir",    cls:"theme-rubynoir",    label:"یاقوت‌سرخ مشکی", unlockLevel:8,  tagline:"قرمز آتشین روی سیاه"},
  {id:"platinum",    cls:"theme-platinum",    label:"پلاتینیوم", unlockLevel:9,  tagline:"براقِ کمیاب"},
  {id:"obsidian",    cls:"theme-obsidian",    label:"طلایی درخشان", unlockLevel:10, tagline:"طلای خالص روی مشکی"},
  {id:"diamond",     cls:"theme-diamond",     label:"الماس", unlockLevel:11, tagline:"بالاترین سطح — نایاب"},
];
function getTheme(){
  return localStorage.getItem(THEME_KEY) || "goldnavy";
}
function allThemes(){ return [...THEMES, ...LEVEL_THEMES]; }
function applyTheme(){
  const t = allThemes().find(x=>x.id===getTheme()) || THEMES[0];
  allThemes().forEach(x=> { if(x.cls) document.body.classList.remove(x.cls); });
  if(t.cls) document.body.classList.add(t.cls);
  if(typeof pelehSyncThemeColor === "function") pelehSyncThemeColor();
}
function setTheme(id){
  const t = allThemes().find(x=>x.id===id);
  if(t && t.unlockLevel && currentLevel().level < t.unlockLevel){
    openThemePreview(id); // locked — show the enticing preview instead of just refusing
    return;
  }
  localStorage.setItem(THEME_KEY, id);
  applyTheme();
  renderAll();
}
function openThemePreview(id){
  const t = allThemes().find(x=>x.id===id);
  if(!t) return;
  const short = t.unlockLevel - currentLevel().level;
  openOverlay(`
    <h3>${t.label} ${t.unlockLevel ? pi("lock") : ""}</h3>
    <div class="theme-preview theme-scope theme-${t.id}">
      <div class="tp-bg"><div class="tp-card"><div class="tp-l1"></div><div class="tp-l2"></div></div><div class="tp-dot"></div></div>
    </div>
    ${t.tagline ? `<div class="note" style="text-align:center; margin-bottom:10px; font-style:italic;">«${t.tagline}»</div>` : ``}
    ${t.unlockLevel ? `<div class="note" style="text-align:center;">با رسیدن به <b>سطح ${toFaDigits(t.unlockLevel)}</b> باز می‌شه${short>0 ? ` — ${toFaDigits(short)} سطح دیگه` : ""}.</div>` : ``}
    <div class="sheet-actions">
      <button class="btn btn-primary" style="width:100%;" onclick="closeOverlay()">باشه</button>
    </div>
  `);
}

/* ===================== Level system =====================
   A level is just a friendlier, milestone-shaped way of reading the SAME cumulative points
   the reward ladder already uses — no separate currency, so it can never drift out of sync
   with points earned/spent. Levels exist to unlock cosmetic-only rewards (exclusive themes);
   they never gate anything that was previously free (the original 6 themes stay exactly as
   free as پله's pricing page already promises). */
const LEVEL_THRESHOLDS = [0, 80, 200, 400, 700, 1100, 1600, 2200, 3000, 4000, 5200];
function currentLevel(){
  const pts = cumulativePoints();
  let level = 1;
  for(let i=1;i<LEVEL_THRESHOLDS.length;i++){
    if(pts >= LEVEL_THRESHOLDS[i]) level = i+1; else break;
  }
  const floor = LEVEL_THRESHOLDS[level-1];
  const ceilIdx = Math.min(level, LEVEL_THRESHOLDS.length-1);
  const ceil = LEVEL_THRESHOLDS[ceilIdx] ?? (floor + 1500);
  const ratio = ceilIdx===level-1 ? 1 : Math.min(1, (pts-floor)/(ceil-floor));
  return {level, pts, floor, ceil, ratio};
}

const ICONS = {
  today: pi("today"), rotation: pi("rotation"), rewards: pi("gift"), settings: pi("gear"), overview: pi("chartUp"),
  calendar: pi("calendar"), weekly: pi("steps"), more: pi("more"), chevronLeft: pi("chevL"), chevronRight: pi("chevR"),
  camera: pi("camera"), check: pi("check"), starOutline: pi("star"), starFilled: pi("star", "pi-fill"),
  edit: pi("pencil"), trash: pi("trash"), books: pi("book"), health: pi("health"),
};

/* منوی پایین ۵ تبه: امروز، کتاب، سلامت، تقویم، بیشتر.
   «هفته» داخل «تقویم» رفته (انتخاب‌گر هفته | ماه)، «جایزه‌ها» اولین گزینه‌ی «بیشتر»ه.
   زیرصفحه‌ها (جایزه‌ها، دعوت، تنظیمات، Premium) Back رو به همون جایی برمی‌گردونن که ازش باز شدن. */
const MAIN_TABS = ["today", "books", "health", "calendar", "more"];
const SUB_PAGES = ["settings", "premium", "invite", "rewards"];
let subpageFrom = "more";
function rewardReady(){
  if(!DATA || !Array.isArray(DATA.rewards) || !DATA.rewards.length) return false;
  const cum = cumulativePoints();
  return DATA.rewards.some(r => cum >= r.points);
}
function tabOwner(id){
  if(id === "plus") return "health";
  if(id === "weekly") return "calendar";
  if(SUB_PAGES.includes(id)) return "more";
  return id;
}
function renderTabbar(){
  const tabs = [
    {id:"today", label:"امروز", icon:ICONS.today},
    {id:"books", label:"کتاب", icon:ICONS.books},
    {id:"health", label:"سلامت", icon:ICONS.health},
    {id:"calendar", label:"تقویم", icon:ICONS.calendar},
    {id:"more", label:"بیشتر", icon:ICONS.more},
  ];
  const owner = tabOwner(currentTab);
  const dot = rewardReady();
  const bar = document.getElementById("tabbar");
  bar.classList.add("has-tabs");
  bar.setAttribute("role", "navigation"); bar.setAttribute("aria-label", "منوی اصلی");
  bar.innerHTML = tabs.map(t => `
    <button class="tabbtn ${owner===t.id?'active':''}" ${owner===t.id?'aria-current="page"':''} onclick="switchTab('${t.id}')"${t.id==='more' && dot ? ' aria-label="بیشتر — جایزه آماده‌ی دریافت"' : ''}>
      ${t.icon}<span>${t.label}</span>${t.id==='more' && dot ? `<i class="badge-dot" aria-hidden="true"></i>` : ``}
    </button>
  `).join("");
}

function switchTab(id){
  if(id === "weekly"){ calView = "week"; id = "calendar"; }   // سازگاری: لینک‌ها/اعلان‌های قدیمی «هفته»
  const isSubPage = (SUB_PAGES.includes(id) || id === "plus");
  if(SUB_PAGES.includes(id) && !SUB_PAGES.includes(currentTab)) subpageFrom = MAIN_TABS.includes(currentTab) ? currentTab : "more";
  if(isSubPage && !suppressHistoryPush){
    history.pushState({pelehNav:"subpage", tab:id}, "", location.href);
  }
  currentTab = id;
  renderAll();
  if(MAIN_TABS.includes(id)) window.scrollTo(0, 0);
}
function openRewards(){ switchTab("rewards"); }
// برگشت از زیرصفحه به جایی که ازش اومده (Back اندروید، popstate مرورگر و دکمه‌ی بازگشت داخل صفحه)
function leaveSubpage(){ currentTab = SUB_PAGES.includes(subpageFrom) ? "more" : (subpageFrom || "more"); renderAll(); }
function navBack(){
  if(history.state && history.state.pelehNav === "subpage") history.back();
  else leaveSubpage();
}
function subpageHeader(title){
  return `<div class="plus-head"><button class="plus-back" aria-label="بازگشت" onclick="navBack()">${pi("chevR")}</button><h2 class="plus-title">${title}</h2></div>`;
}

let myReferralCount = null; // lazily loaded from the referrals table
async function loadReferralCount(){
  if(!currentUser || !sb) return;
  try{
    const { count } = await sb.from('referrals').select('id', { count: 'exact', head: true }).eq('referrer_id', currentUser.id);
    myReferralCount = count || 0;
    renderAll();
  }catch(e){ /* leave as null — screen shows a loading dash */ }
}
function copyReferralCode(){
  const meta = currentProfileMeta();
  const text = `با کد معرف من تو پله ثبت‌نام کن و ۳ روز پرمیوم رایگان بگیر: ${meta.referralCode}`;
  shareText(text);
}
function renderInvite(){
  const meta = currentProfileMeta();
  if(myReferralCount === null) loadReferralCount();
  const count = myReferralCount ?? 0;
  const toNextMilestone = 5 - (count % 5);
  return `
    <div class="section-title" style="margin-top:6px;">دعوت از دوستان</div>
    <div class="card" style="text-align:center;">
      <div style="font-size:calc(13px * var(--font-scale)); color:var(--muted); margin-bottom:14px;">هر دوستی که با کد تو ثبت‌نام کنه، هم اون ۳ روز پرمیوم رایگان می‌گیره، هم تو ۱۰۰ امتیاز — و به ازای هر ۵ دعوت موفق، ۱ ماه پرمیوم رایگان می‌گیری.</div>
      <div style="font-size:calc(26px * var(--font-scale)); font-weight:900; letter-spacing:4px; direction:ltr; color:var(--gold); margin-bottom:14px;">${meta.referralCode || '—'}</div>
      <button class="btn btn-primary" style="width:100%; padding:13px;" onclick="copyReferralCode()">اشتراک‌گذاری کد</button>
    </div>
    <div class="card">
      <div class="row-between" style="margin-bottom:10px;">
        <div style="font-size:calc(12.5px * var(--font-scale)); color:var(--muted);">دعوت‌های موفق</div>
        <div style="font-weight:800; color:var(--gold);">${myReferralCount===null ? '...' : toFaDigits(count)}</div>
      </div>
      ${myReferralCount!==null ? `<div class="note">${toFaDigits(toNextMilestone)} دعوت دیگه تا ۱ ماه پرمیوم رایگان بعدی.</div>` : ``}
    </div>
  `;
}

function renderMore(){
  const cum = cumulativePoints(), lvl = currentLevel(), ready = rewardReady();
  return `
    <div class="page-title">بیشتر</div>
    <div class="card list-card more-list" style="margin-top:12px;">
      <button type="button" class="more-row" onclick="openRewards('more')">
        <span class="mr-ic">${pi("gift")}${ready ? `<i class="badge-dot" aria-hidden="true"></i>` : ``}</span>
        <span class="mr-body"><span class="mr-title">جایزه‌ها</span><span class="mr-sub" style="display:block;">${ready ? "یه جایزه آماده‌ی دریافته" : `سطح ${toFaDigits(lvl.level)}`}</span></span>
        <span class="mr-val">${toFaDigits(cum)}</span><span class="chev">${pi("chevL")}</span>
      </button>
      <button type="button" class="more-row" id="coach-premium-card" onclick="switchTab('premium')">
        <span class="mr-ic">${pi("gem")}</span>
        <span class="mr-body"><span class="mr-title">Premium</span><span class="mr-sub" style="display:block;">پیشنهاد هوشمند، Coach، تحلیل عمیق</span></span>
        <span class="chev">${pi("chevL")}</span>
      </button>
      <button type="button" class="more-row" onclick="switchTab('invite')">
        <span class="mr-ic">${pi("users")}</span>
        <span class="mr-body"><span class="mr-title">دعوت از دوستان</span><span class="mr-sub" style="display:block;">امتیاز و پرمیوم رایگان</span></span>
        <span class="chev">${pi("chevL")}</span>
      </button>
      <button type="button" class="more-row" onclick="switchTab('settings')">
        <span class="mr-ic">${pi("gear")}</span>
        <span class="mr-body"><span class="mr-title">تنظیمات</span><span class="mr-sub" style="display:block;">پروفایل، تم، فونت، یادآوری</span></span>
        <span class="chev">${pi("chevL")}</span>
      </button>
    </div>
  `;
}
/* ===================== Desktop puzzle-dashboard: drag-to-swap tiles =====================
   Shared by every tab that gets the tile-dashboard treatment (today/books/calendar/weekly/
   rewards). A tile's *default* area is just its own data-tile-id (the CSS already does
   `.tile-tip{grid-area:tip}` etc.) — so "effective area" is simply layout[id] || id, no
   separate default-map to keep in sync. Dropping tile A onto tile B swaps their effective
   areas; the result is saved per tab (DATA.settings.puzzleLayout[tabKey]) and re-applied
   after every render, including tabs the user hasn't touched (mapping just stays empty).
   Drag is desktop-only (>=1200px, the true 3-column tier) — below that the inline grid-area
   still gets applied (harmless — tablet's simpler grid either has that named area too, or
   quietly falls back to auto-placement if it doesn't), but no drag handlers attach, and
   below 900px these wrappers aren't grid at all so the inline style has zero effect. */
function applyPuzzleDashboard(tabKey, gridSelector){
  const grid = document.querySelector(gridSelector);
  if(!grid) return;
  DATA.settings.puzzleLayout ||= {};
  const layout = DATA.settings.puzzleLayout[tabKey] || {};
  const areaOf = id => layout[id] || id;
  const tiles = [...grid.querySelectorAll(':scope > .tile[data-tile-id]')];
  const isDesktop = window.innerWidth >= 1200;
  tiles.forEach(t => { t.style.gridArea = isDesktop ? areaOf(t.dataset.tileId) : ""; });
  if(!isDesktop) return; // drag (and the custom area mapping) only at the true 3-col desktop tier
  tiles.forEach(t => {
    t.draggable = true;
    t.classList.add("tile-draggable");
    t.ondragstart = e => { e.dataTransfer.setData("text/plain", t.dataset.tileId); t.classList.add("tile-dragging"); };
    t.ondragend = () => { t.classList.remove("tile-dragging"); tiles.forEach(x=>x.classList.remove("tile-drop-target")); };
    t.ondragover = e => e.preventDefault();
    t.ondragenter = () => { if(!t.classList.contains("tile-dragging")) t.classList.add("tile-drop-target"); };
    t.ondragleave = () => t.classList.remove("tile-drop-target");
    t.ondrop = e => {
      e.preventDefault();
      const aId = e.dataTransfer.getData("text/plain");
      const bId = t.dataset.tileId;
      if(!aId || aId===bId) return;
      const aArea = areaOf(aId), bArea = areaOf(bId);
      // B gets A's old area; A gets B's old area. Clean the entry up (drop it back to the
      // tile's own default id) only when that's genuinely where it landed.
      if(aArea===bId) delete layout[bId]; else layout[bId] = aArea;
      if(bArea===aId) delete layout[aId]; else layout[aId] = bArea;
      DATA.settings.puzzleLayout[tabKey] = layout;
      save();
      applyPuzzleDashboard(tabKey, gridSelector);
    };
  });
}
const PUZZLE_TABS = {
  today: ".today-grid",
  calendar: ".calendar-grid",
  weekly: ".weekly-grid",
  rewards: ".rewards-grid",
};
function applyPuzzleDashboardForCurrentTab(){
  if(currentTab==="books"){ if(typeof booksSubTab!=="undefined" && booksSubTab==="home") applyPuzzleDashboard("books", ".books-grid"); return; }
  if(currentTab === "calendar" && calView === "week"){ applyPuzzleDashboard("weekly", ".weekly-grid"); return; }
  const sel = PUZZLE_TABS[currentTab];
  if(sel) applyPuzzleDashboard(currentTab, sel);
}
let _puzzleResizeTimer = null;
window.addEventListener("resize", () => {
  clearTimeout(_puzzleResizeTimer);
  _puzzleResizeTimer = setTimeout(applyPuzzleDashboardForCurrentTab, 150);
});

function renderAll(){
  if(!cloudReady){
    renderLoadingScreen();
    return;
  }
  if(!currentUser){
    renderAuthScreen();
    return;
  }
  if(loadError){
    renderLoadErrorScreen();
    return;
  }
  if(needsPasswordSetup){
    renderAuthScreen(); // authMode is already 'newpassword' at this point
    return;
  }
  // طراحی نهایی: کاربر تازه‌ای که شماره‌ش همین الان با کد تأیید شده، فقط یه صفحه می‌بینه: اسم + اولین عادت‌ها
  if(needsOnboarding() && qsNamePhone() && needsQuickStart()){
    renderQuickStart();
    return;
  }
  if(needsOnboarding()){
    renderOnboarding();
    return;
  }
  if(needsWorkProfile()){
    renderWorkProfileStep();
    return;
  }
  if(qsStep === "reminder"){
    renderReminderStep();
    return;
  }
  if(needsQuickStart()){
    renderQuickStart();
    return;
  }
  if(currentTab==="books" && !ensureBooksData().onboarded){
    renderBookOnboarding();
    return;
  }
  renderTabbar();
  const app = document.getElementById("app");
  const meta = currentProfileMeta();
  app.innerHTML = `
    <div class="topbar">
      <div class="brand">${brandMark()} پله</div>
      <div class="tb-end">
        <button type="button" class="avatar topbar-profile" onclick="openAccountSheet()" aria-label="حساب من: ${escapeHtml(meta.name)}">${meta.photo ? `<img src="${meta.photo}" alt="">` : pi("user")}</button>
      </div>
    </div>
    <input type="file" id="photoInput" accept="image/*" style="display:none" onchange="onPhotoSelected(this)">
    <div class="screen active">${
      currentTab==="today" ? renderToday() :
      currentTab==="books" ? renderBooks() :
      currentTab==="health" ? renderHealth() :
      currentTab==="rewards" ? renderRewards() :
      currentTab==="calendar" ? renderCalendar() :
      currentTab==="weekly" ? (calView = "week", currentTab = "calendar", renderCalendar()) :
      currentTab==="more" ? renderMore() :
      currentTab==="invite" ? subpageHeader("دعوت از دوستان") + renderInvite() :
      currentTab==="premium" ? subpageHeader("Premium") + renderPremiumTab() :
      currentTab==="plus" ? (typeof renderPlus === "function" ? renderPlus() : renderHealth()) :
      subpageHeader("تنظیمات") + renderSettings()
    }</div>
  `;
  lastRenderedDayKey = todayKey();
  if(currentTab === "settings") resumeResendCooldown('settings_phone');
  applyPuzzleDashboardForCurrentTab();
  // Element-anchored coachmark for whichever tab just rendered — no-ops instantly once this
  // tab's flow has been seen. The timeout lets the innerHTML above actually attach before we
  // go looking for anchor elements.
  // .screen has a 250ms fade/slide-in animation — measuring anchor positions before it
  // finishes was the main cause of the spotlight landing on the wrong spot.
  setTimeout(() => { maybeRunCoach(currentTab); if(currentTab === "today") maybeRunCoachDay2(); }, 300);
  if(typeof syncMyAwards === "function") setTimeout(syncMyAwards, 1500);
}
/* نشان پله: سه پله‌ی طلایی */
function brandMark(){
  return `<svg class="brand-mark" viewBox="0 0 30 22" aria-hidden="true"><rect x="12" y="0" width="18" height="5" rx="2.5" fill="currentColor"/><rect x="6" y="8.5" width="24" height="5" rx="2.5" fill="currentColor"/><rect x="0" y="17" width="30" height="5" rx="2.5" fill="currentColor"/></svg>`;
}
function renderLoadingScreen(){
  document.getElementById("tabbar").innerHTML = "";
  document.getElementById("app").innerHTML = `
    <div class="onboard-wrap" style="text-align:center; padding-top:40vh;">
      <div class="brand" style="justify-content:center;">${brandMark()} پله</div>
      <div style="color:var(--muted); font-size:calc(12px * var(--font-scale)); margin-top:10px;">در حال اتصال...</div>
    </div>
  `;
}
function renderLoadErrorScreen(){
  document.getElementById("tabbar").innerHTML = "";
  document.getElementById("app").innerHTML = `
    <div class="onboard-wrap" style="text-align:center; padding-top:30vh;">
      <div style="font-size:calc(40px * var(--font-scale)); margin-bottom:14px;">⚠️</div>
      <div style="font-weight:800; font-size:calc(15px * var(--font-scale)); margin-bottom:8px;">نشد اطلاعاتت رو بگیریم</div>
      <div style="color:var(--muted); font-size:calc(12.5px * var(--font-scale)); margin-bottom:22px; line-height:1.8;">این یعنی مشکل موقتی تو اتصاله — به‌جای نشون‌دادن یه صفحه‌ی خالی، صبر می‌کنیم تا مطمئن بشیم چیزی از دیتای واقعیت پاک نشه.</div>
      <button class="btn btn-primary" style="width:100%; padding:14px;" onclick="retryLoadProfile()">امتحان دوباره</button>
      <button class="btn btn-ghost" style="width:100%; padding:13px; margin-top:10px;" onclick="signOutUser()">خروج از حساب</button>
    </div>
  `;
}
async function retryLoadProfile(){
  cloudReady = false;
  renderAll();
  await loadProfileFromCloud();
  await syncJustVerifiedPhone();
  obPhoneVerified = null;
  cloudReady = true;
  renderAll();
  if(!loadError) handleZibalReturnIfAny();
}
/* What the person actually signs in with. Phone-signup accounts have an internal technical email
   they never see or use — showing that looked like a bug; show their phone number instead. */
function accountLoginLabel(){
  const meta = currentProfileMeta();
  const email = (currentUser && currentUser.email) || "";
  const provider = currentUser && currentUser.app_metadata && currentUser.app_metadata.provider;
  const looksTechnical = !email || (meta.phone && email.replace(/\D/g, "").includes(meta.phone.replace(/^0/, "")));
  if(provider !== "google" && looksTechnical && meta.phone) return meta.phone;
  return email;
}
function openAccountSheet(){
  const meta = currentProfileMeta();
  openOverlay(`
    <h3>حساب من</h3>
    <div class="card" style="text-align:center; margin-bottom:16px;">
      <div class="avatar avatar-lg" style="margin:0 auto 10px;">${meta.photo ? `<img src="${meta.photo}" alt="">` : pi("user")}</div>
      <div style="font-weight:800; font-size:calc(15px * var(--font-scale));">${escapeHtml(meta.name)}</div>
      <div style="color:var(--muted); font-size:calc(11.5px * var(--font-scale)); margin-top:4px; direction:ltr;">${escapeHtml(accountLoginLabel())}</div>
    </div>
    <div class="note" style="margin-bottom:16px;">اطلاعاتت روی همه‌ی دستگاه‌هایی که با این حساب وارد بشی یکیه.</div>
    <div class="sheet-actions">
      <button class="btn btn-danger" onclick="closeOverlay(); signOutUser();">خروج از حساب</button>
      <button class="btn btn-ghost" onclick="closeOverlay()">بستن</button>
    </div>
  `);
}


/* ---- Onboarding phone verification: reuses the same send-otp/verify-otp edge functions
   as phone signup, but with purpose:'verify_only' so it never creates/touches an auth
   account — it only confirms the person actually typed a real number they control. */
let obPhoneVerified = null; // null = not yet initialized for this session
let obPhoneOtpSent = false;
let obVerifyBusy = false;
let obSkipPhone = false; // sms-fix: کاربر گوگلی/ایمیلی «شماره‌ی ایرانی ندارم» رو زده
function setObSkipPhone(on){
  obSkipPhone = !!on && isPhoneOptionalAccount();
  const errEl = document.getElementById('ob_phone_error');
  if(errEl) errEl.textContent = "";
  renderAll();
}
let obPendingPhone = ""; // شماره‌ای که همین الان کاربر تایپ کرده و کد براش فرستاده شده — چون
// meta.phone (پروفایل ذخیره‌شده) برای کاربری که اولین‌باره شماره می‌زنه هنوز خالیه، و
// renderAll() بعد از ارسال کد، اینپوت رو دوباره از meta.phone پر می‌کنه (یعنی خالی می‌کنه)
function onObPhoneChanged(){
  // هر بار شماره عوض بشه، تاییدیه‌ی قبلی (اگه بود) دیگه معتبر نیست
  if(obPhoneVerified || obPhoneOtpSent){
    obPhoneVerified = false;
    obPhoneOtpSent = false;
    obPendingPhone = "";
    renderAll();
  }
}
async function sendObPhoneOtp(){
  if(otpCooldownRemaining('ob_phone') > 0) return;
  const phone = normalizeIranMobile(document.getElementById('ob_phone').value);
  const errEl = document.getElementById('ob_phone_error');
  if(errEl) errEl.textContent = "";
  if(!phone){
    if(errEl) errEl.textContent = isPhoneOptionalAccount() && looksInternationalPhone(document.getElementById('ob_phone').value)
      ? "پیامک پله فعلاً فقط به شماره‌های ایران می‌رسه. اگه خارج از ایرانی، «شماره‌ی ایرانی ندارم» رو بزن."
      : PHONE_INVALID_MSG;
    return;
  }
  const btn = document.getElementById('ob_phone_verify_btn');
  if(btn){ btn.disabled = true; btn.textContent = "در حال ارسال..."; }
  try{
    const { data, error } = await invokeEdge('send-otp', { body: { mobile: phone } });
    if(error || !data?.success){
      if(errEl) errEl.textContent = data?.error || "ارسال پیامک ناموفق بود.";
      if(btn){ btn.disabled = false; btn.textContent = "تایید شماره"; }
      if(data?.retryAfter) startResendCooldown('ob_phone', data.retryAfter);
      return;
    }
    obPendingPhone = phone;
    obPhoneOtpSent = true;
    startResendCooldown('ob_phone');
    renderAll();
  }catch(e){
    if(errEl) errEl.textContent = "مشکل در اتصال — اینترنتت رو چک کن.";
    if(btn){ btn.disabled = false; btn.textContent = "تایید شماره"; }
  }
}
async function verifyObPhoneOtp(){
  // اول از obPendingPhone (شماره‌ای که واقعاً کدش برای اون فرستاده شده) استفاده کن؛ اگه به هر
  // دلیلی خالی بود، از خودِ اینپوت بخون — تا اگه اینپوت بعد از ارسال کد خالی رندر شد، شماره‌ی
  // درست هنوز به سرور بره.
  const phone = obPendingPhone || normalizeIranMobile(document.getElementById('ob_phone').value);
  const code = onlyDigits(document.getElementById('ob_phone_otp').value);
  const errEl = document.getElementById('ob_phone_error');
  if(errEl) errEl.textContent = "";
  if(code.length !== 4){
    if(errEl) errEl.textContent = "کد ۴ رقمی رو کامل وارد کن.";
    return;
  }
  if(obVerifyBusy) return;
  obVerifyBusy = true;
  try{
    const { data, error } = await invokeEdge('verify-otp', { body: { mobile: phone, code, purpose: 'verify_only' } });
    obVerifyBusy = false;
    if(error || !data?.success){
      if(errEl) errEl.textContent = data?.error || "کد اشتباهه یا منقضی شده.";
      return;
    }
    obPhoneVerified = true;
    obPhoneOtpSent = false;
    // obPendingPhone رو پاک نمی‌کنیم — هنوز تو profiles ذخیره نشده (این کار موقع «شروع کن»
    // تو submitOnboarding انجام می‌شه)، پس تا اون لحظه همچنان لازمه
    renderAll();
  }catch(e){
    obVerifyBusy = false;
    if(errEl) errEl.textContent = "مشکل در اتصال — اینترنتت رو چک کن.";
  }
}

function renderOnboarding(){
  document.getElementById("tabbar").innerHTML = "";
  const app = document.getElementById("app");
  const meta = currentProfileMeta();
  const wp = DATA.workProfile || {};
  // اگه این صفحه همین الان رو صفحه بوده و یه renderAll کامل صدا خورد، مقدارهای تایپ‌شده رو از خود DOM نگه می‌داریم
  const prevName = document.getElementById("ob_name");
  const nameVal = prevName ? prevName.value : (meta.name || "");
  // شماره‌ای که همین الان با کد پیامکی تأیید شد، دوباره کد نمی‌خواد
  const jvPhone = getJustVerifiedPhone();
  if(jvPhone && !obPhoneOtpSent && (!obPendingPhone || obPendingPhone === jvPhone)){
    obPendingPhone = jvPhone;
    obPhoneVerified = true;
  } else if(obPhoneVerified === null){
    obPhoneVerified = !!(meta.phoneVerified && meta.phone);
  }
  // sms-fix: حساب گوگلی/ایمیلی می‌تونه بدون شماره‌ی ایرانی ادامه بده (کاربرهای خارج از ایران)
  const canSkip = !obPhoneVerified && isPhoneOptionalAccount();
  const skipBlock = `
      <div class="card" style="margin-bottom:12px;">
        <div class="note">بدون شماره ادامه می‌دی. هر وقت شماره‌ی ایرانی داشتی، از تنظیمات اضافه‌اش کن.</div>
        <button type="button" style="color:var(--gold); text-decoration:underline; margin-top:6px;" onclick="setObSkipPhone(false)">نه، شماره‌ی ایرانی دارم</button>
      </div>`;
  const phoneBlock = obPhoneVerified ? `` : (canSkip && obSkipPhone) ? skipBlock : `
      <div class="field">
        <label>شماره موبایل</label>
        <div style="display:flex; gap:8px; align-items:flex-start;">
          <input type="tel" id="ob_phone" class="goal-input" placeholder="09xxxxxxxxx" style="direction:ltr; text-align:left; flex:1;" value="${escapeHtml(obPendingPhone || meta.phone || '')}" oninput="onObPhoneChanged()">
          <button type="button" class="btn btn-ghost" id="ob_phone_verify_btn" data-otp-family="ob_phone" style="white-space:nowrap; padding:0 14px;" onclick="sendObPhoneOtp()">تایید شماره</button>
        </div>
        ${obPhoneOtpSent ? `
          <div style="margin-top:10px;">
            <label>کد ۴ رقمی که فرستادیم</label>
            <div style="display:flex; gap:8px;">
              <input type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="4" id="ob_phone_otp" class="goal-input" placeholder="----" style="direction:ltr; text-align:center; letter-spacing:10px; flex:1;" onkeydown="onAuthEnter(event,'verifyObPhoneOtp')">
              <button type="button" class="btn btn-primary" style="white-space:nowrap; padding:0 14px;" onclick="verifyObPhoneOtp()">تایید کد</button>
            </div>
            <div class="note" style="margin-top:4px;">کد نیومد؟ <button id="ob_phone_resend_link" data-otp-family="ob_phone" style="color:var(--gold); text-decoration:underline;" onclick="sendObPhoneOtp()">دوباره بفرست</button></div>
          </div>` : `<div class="note" style="margin-top:4px;">قبل از ادامه، باید شماره‌ت رو با یه کد پیامکی تایید کنی.</div>`}
        ${canSkip ? `<div class="note" style="margin-top:6px;">خارج از ایرانی؟ <button type="button" style="color:var(--gold); text-decoration:underline;" onclick="setObSkipPhone(true)">شماره‌ی ایرانی ندارم</button></div>` : ``}
      </div>`;
  app.innerHTML = `
    <div class="onboard-wrap">
      <div class="brand" style="justify-content:center; font-size:calc(24px * var(--font-scale)); margin-bottom:8px;"><span class="rungs"><i></i><i></i><i></i></span> پله</div>
      <div style="text-align:center; margin-bottom:20px;">
        <span style="display:inline-block; background:var(--gold-soft); color:var(--gold); border-radius:20px; padding:5px 14px; font-weight:800; font-size:calc(11.5px * var(--font-scale));">آخرین قدم 🎁 — بعدش ۷ روز Premium رایگان برات فعال می‌شه</span>
      </div>

      <div class="field">
        <label>اسمت چیه؟</label>
        <input type="text" id="ob_name" class="goal-input" placeholder="مثلاً: وحید محمدی" value="${escapeHtml(nameVal)}" autocomplete="name" onkeydown="if(event.key==='Enter'){event.preventDefault(); submitOnboarding();}">
      </div>
      ${phoneBlock}

      <div class="field-error" id="ob_phone_error"></div>
      <div class="field-error" id="ob_error"></div>
      <button id="btn_ob_submit" class="btn btn-primary" style="width:100%; padding:15px; margin-top:10px;" onclick="submitOnboarding()">شروع کن 🚀</button>
      <div class="note" style="text-align:center; margin-top:10px;">بقیه‌ی چیزها (عکس، تاریخ تولد، علاقه‌مندی‌ها) رو هر وقت خواستی از تنظیمات اضافه کن.</div>
    </div>
  `;
  resumeResendCooldown('ob_phone');
}

const INTEREST_PRESETS = [
  {id:"sport", label:"ورزش"}, {id:"reading", label:"کتاب‌خوانی"}, {id:"music", label:"موسیقی"},
  {id:"travel", label:"سفر"}, {id:"cooking", label:"آشپزی"}, {id:"movies", label:"فیلم و سریال"},
  {id:"gaming", label:"بازی‌های ویدیویی"}, {id:"art", label:"هنر و نقاشی"}, {id:"gardening", label:"باغبانی"},
  {id:"meditation", label:"مدیتیشن و یوگا"}, {id:"photography", label:"عکاسی"}, {id:"writing", label:"نویسندگی"},
];
function toggleWorkProfileChip(el){ el.classList.toggle("on"); }
function selectEmploymentChip(el, value){
  el.parentElement.querySelectorAll(".suggest-chip").forEach(c=>c.classList.remove("on"));
  el.classList.add("on");
  const hoursBlock = document.getElementById("wp_hours_block");
  if(hoursBlock) hoursBlock.style.display = (value === "unemployed") ? "none" : "block";
  document.getElementById("wp_employment").value = value;
}
function renderWorkProfileStep(){
  document.getElementById("tabbar").innerHTML = "";
  const app = document.getElementById("app");
  const wp = DATA.workProfile || {};
  const showHours = wp.employment && wp.employment !== "unemployed";
  app.innerHTML = `
    <div class="onboard-wrap">
      <div class="brand" style="justify-content:center; font-size:calc(24px * var(--font-scale)); margin-bottom:4px;"><span class="rungs"><i></i><i></i><i></i></span> پله</div>
      <div style="text-align:center; color:var(--muted); font-size:calc(12.5px * var(--font-scale)); margin-bottom:22px;">چندتا سوال کوچیک، تا پیشنهادها واقعاً مال خودت باشن</div>

      <div class="field">
        <label>وضعیت شغلی</label>
        <div style="display:flex; flex-wrap:wrap; gap:8px;">
          <button type="button" class="suggest-chip ${wp.employment==='employed'?'on':''}" onclick="selectEmploymentChip(this,'employed')">شاغل</button>
          <button type="button" class="suggest-chip ${wp.employment==='freelancer'?'on':''}" onclick="selectEmploymentChip(this,'freelancer')">فریلنسر</button>
          <button type="button" class="suggest-chip ${wp.employment==='unemployed'?'on':''}" onclick="selectEmploymentChip(this,'unemployed')">بیکار</button>
        </div>
        <input type="hidden" id="wp_employment" value="${wp.employment||''}">
      </div>

      <div class="field" id="wp_hours_block" style="display:${showHours?'block':'none'};">
        <label>ساعت کاری‌ت معمولاً چطوره؟</label>
        <div style="display:flex; gap:10px;">
          <input type="time" id="wp_work_start" class="goal-input" style="flex:1;" value="${wp.workStart||''}">
          <input type="time" id="wp_work_end" class="goal-input" style="flex:1;" value="${wp.workEnd||''}">
        </div>
        <div class="note" style="margin-top:6px;">این کمک می‌کنه پیشنهادهای روزانه رو دور برنامه‌ی واقعی‌ت بچینیم، نه یه زمان فرضی.</div>
      </div>

      <div class="field">
        <label>تفریحات و علاقه‌مندی‌هات (هرچقدر خواستی انتخاب کن)</label>
        <div style="display:flex; flex-wrap:wrap; gap:8px;">
          ${INTEREST_PRESETS.map(i => `<button type="button" class="suggest-chip interest-chip ${(wp.interests||[]).includes(i.id)?'on':''}" data-id="${i.id}" onclick="toggleWorkProfileChip(this)">${i.label}</button>`).join("")}
        </div>
      </div>
      <div class="field">
        <label>چیز دیگه‌ای هم هست که تو لیست نبود؟</label>
        <input type="text" id="wp_interests_custom" class="goal-input" placeholder="مثلاً: شطرنج، دوچرخه‌سواری..." value="${wp.interestsCustom||''}">
      </div>

      <button class="btn btn-primary" style="width:100%; padding:15px; margin-top:10px;" onclick="submitWorkProfile()">${wp.completed ? 'ذخیره' : 'ادامه'}</button>
      ${wp.completed ? `<button class="btn btn-ghost" style="width:100%; padding:10px; margin-top:8px;" onclick="switchTab('settings')">بی‌خیال</button>` : `<button class="btn btn-ghost" style="width:100%; padding:10px; margin-top:8px;" onclick="skipWorkProfile()">فعلاً رد کن — بعداً از تنظیمات پرش می‌کنم</button>`}
    </div>
  `;
}
function submitWorkProfile(){
  const employment = document.getElementById("wp_employment").value || null;
  const interests = Array.from(document.querySelectorAll(".interest-chip.on")).map(el => el.dataset.id);
  DATA.workProfile = {
    completed: true,
    employment,
    workStart: employment === "unemployed" ? "" : (document.getElementById("wp_work_start").value || ""),
    workEnd: employment === "unemployed" ? "" : (document.getElementById("wp_work_end").value || ""),
    interests,
    interestsCustom: document.getElementById("wp_interests_custom").value.trim(),
  };
  save();
  renderAll();
}
function skipWorkProfile(){
  DATA.workProfile.completed = true; // can still fill it in properly later from Settings
  save();
  renderAll();
}
let onboardingSubmitting = false;
async function submitOnboarding(){
  if(onboardingSubmitting) return;
  const name = document.getElementById("ob_name").value.trim();
  const meta0 = currentProfileMeta();
  const birthdate = meta0.birthdate || "";
  const phone = obPendingPhone || normalizeIranMobile((document.getElementById("ob_phone") || {}).value) || meta0.phone || "";
  const errEl = document.getElementById("ob_error");
  if(!name){ errEl.textContent = "یه اسم بنویس تا صدات کنیم 🙂"; return; }
  // sms-fix: کاربر خارج از ایران (فقط حساب گوگلی/ایمیلی) بدون شماره ادامه می‌ده؛ شماره‌ی پروفایل دست نمی‌خوره
  const skipPhone = obSkipPhone && isPhoneOptionalAccount() && !obPhoneVerified;
  if(!skipPhone){
    if(!/^09\d{9}$/.test(phone)){ errEl.textContent = PHONE_INVALID_MSG; return; }
    if(!obPhoneVerified){ errEl.textContent = "قبل از ادامه، شماره موبایلت رو تایید کن."; return; }
  }
  errEl.textContent = "";
  onboardingSubmitting = true;
  const btn = document.getElementById("btn_ob_submit");
  if(btn){ btn.disabled = true; btn.textContent = "در حال ذخیره..."; }
  // فاز A۲: پروفایل کاری دیگه اینجا پرسیده نمی‌شه. اطلاعات قبلی (اگه کاربر قدیمی بوده) دست نمی‌خوره.
  const prevWork = DATA.workProfile;
  DATA.workProfile = Object.assign({employment:null, workStart:"", workEnd:"", interests:[], interestsCustom:""}, prevWork || {}, {completed: true});
  const prevMeta = Object.assign({}, profileMeta);
  const prevSkip = DATA.phoneSkip;
  if(skipPhone) DATA.phoneSkip = { abroad: true, at: new Date().toISOString() };
  const ok = skipPhone
    ? await saveProfileInfo({name, birthdate})
    : await saveProfileInfo({name, birthdate, phone, phoneVerified: true});
  onboardingSubmitting = false;
  if(!ok){
    profileMeta = prevMeta;
    DATA.workProfile = prevWork;
    DATA.phoneSkip = prevSkip;
    if(btn){ btn.disabled = false; btn.textContent = "شروع کن 🚀"; }
    const e2 = document.getElementById("ob_error");
    if(e2) e2.textContent = "ذخیره نشد — اینترنتت رو چک کن و دوباره «شروع کن» رو بزن.";
    return;
  }
  trackFunnel("signup_completed");
  save();
  obPendingPhone = "";
  clearJustVerifiedPhone();
  renderAll(); // کاربر بدون عادت ← «شروع سریع» (A1)؛ تور ۴ مرحله‌ای دیگه خودکار شروع نمی‌شه (A8)
  const referralCode = takePendingReferral(); // از لینک دعوت ?ref= (A2)
  if(referralCode){
    // اگه کد اشتباه یا تکراری باشه، فقط یه پیام کوچیک نشون می‌دیم — نباید جلوی ورود به اپ رو بگیره
    invokeEdge('apply-referral', { body: { code: referralCode } }).then(async ({data, error})=>{
      if(!error && data?.success){
        await reloadProfileKeepingLocalEdits();
        renderAll();
        alert(`کد معرف با موفقیت اعمال شد — ${toFaDigits(data.bonusDays)} روز پرمیوم رایگان گرفتی 🎉`);
      }else if(data?.error){
        alert(data.error);
      }
    }).catch(()=>{});
  }
  grantWelcomePremiumAndShowBanner();
}

/* ---------- هدیه‌ی خوش‌آمدگویی: ۷ روز Premium رایگان. دیگه مودال تمام‌صفحه (یه مرحله‌ی اضافه قبل از
   دیدن اپ) نیست؛ یه بنر بالای صفحه‌ی «امروز» نشون داده می‌شه که با «ببین چی بازه» مستقیم می‌ره
   به صفحه‌ی Premium (همون‌جا هم می‌شه اشتراک خرید/تمدید کرد). ---------- */
let welcomeBannerDays = 0;
async function grantWelcomePremiumAndShowBanner(){
  try{
    const { data, error } = await invokeEdge('grant-welcome-premium', { body: {} });
    if(!error && data?.success){
      welcomeBannerDays = data.days || 7;
      await reloadProfileKeepingLocalEdits();
      renderAll();
    }
  }catch(e){ /* اگه fail بشه، فقط بنر رو نشون نمی‌دیم — تجربه‌ی اصلی اپ قطع نمی‌شه */ }
}
function renderWelcomeGiftBanner(){
  if(!welcomeBannerDays || (DATA.seenTips && DATA.seenTips.welcome_gift)) return ``;
  return `<div class="tip-banner" style="border-color:var(--gold-line);">
    <span class="pi-gold" style="margin-top:3px;">${pi("gift")}</span><div class="tip-banner-text">خوش اومدی! <b>${toFaDigits(welcomeBannerDays)} روز Premium رایگان</b> برات فعال شد.</div>
    <button class="btn btn-primary" style="flex:none; padding:6px 12px; font-size:calc(11px * var(--font-scale));" onclick="openWelcomeGiftPremium()">ببین چی بازه</button>
    <button class="tip-banner-close" onclick="dismissWelcomeGiftBanner()">×</button>
  </div>`;
}
function dismissWelcomeGiftBanner(skipRender){
  welcomeBannerDays = 0;
  DATA.seenTips = DATA.seenTips || {};
  DATA.seenTips.welcome_gift = true;
  save();
  if(skipRender !== true) renderAll();
}
function openWelcomeGiftPremium(){
  dismissWelcomeGiftBanner(true);
  switchTab("premium");
}

/* ===================== Coachmark tour system =====================
   Replaces the old single slideshow-style tutorial (which just described tabs in the
   abstract, without ever pointing at anything real) with short, per-tab sequences anchored
   to the REAL element being explained — a dim spotlight around it, a tooltip next to it.
   Each flow runs once, automatically, the first time the user actually lands on that tab
   (see the renderAll() hook), so the teaching happens in context. */
const COACH_FLOWS = {
  today: [
    {title:"به «پله» خوش اومدی 👋", body:"یه پلنر امتیازی کاملاً شخصی. فقط ۴ نکته‌ی سریع و تموم."},
    {sel:"#coach-task-tiers", title:"کارهای امروز", body:"کارهات بر اساس اهمیت به سه دسته تقسیم می‌شن: 🔴 امروز حتماً، 🟡 اگر وقت شد، ⚪ قابل انتقال."},
    {sel:"#coach-activities", title:"پایه‌های روزانه", body:"هرکدوم رو تیک بزنی، امتیازش مال توئه — و می‌تونی یه عکس یا یادداشت کوتاه هم کنارش نگه داری."},
    {sel:"#coach-ladder", title:"تا جایزه بعدی", body:"امتیازهات جمع می‌شن؛ به هر پله که برسی، جایزه‌ای که خودت تعریف کردی رو می‌گیری."},
  ],
  // بقیه‌ی توضیحات، نه روز اول — دفعه‌ی بعدی که اپ رو باز می‌کنه (روز بعد) یه‌بار نشون داده می‌شه
  today2: [
    {sel:"#coach-important-step", title:"⭐ مهم‌ترین قدم امروزت", body:"پله (نسخه‌ی Premium) از بین کارها و اهدافت، دقیقاً یکی رو به‌عنوان مهم‌ترین قدم امروز انتخاب می‌کنه."},
    {sel:"#coach-rotation-inline", title:"✏️ ویرایش عادت‌ها", body:"با «ویرایش» همه‌ی عادت‌ها و روزهای هفته‌شون رو تغییر بده یا حذف کن. عادت تازه هم از همون دکمه‌ی «عادت جدید» ساخته می‌شه."},
    {sel:"#coach-mood", title:"حال امروز", body:"هر روز حالتو ثبت کن — فقط برای خودته، هیچ‌جا قضاوت نمی‌شه."},
    {sel:"#coach-ai-suggestion", title:"🤖 پیشنهاد امروز پله", body:"اگه چند روزی غیبت کنی یا برنامه‌ت سنگین بشه، اینجا یه پیشنهاد سبک برات آماده می‌کنیم."},
  ],
  books: [
    {sel:"#coach-books-subtabs", title:"📚 تب «کتاب»", body:"یه بخش کامل و جداگانه برای عادت کتاب‌خوانی: کتابخونه، چالش‌ها، نشان‌ها و هدیه‌ها همه از همینجا در دسترسن."},
  ],
  rewards: [
    {sel:"#coach-reward-points", title:"🎁 پله‌های جایزه", body:"به هر پله‌ای که خودت تعریف کردی برسی، جایزه‌ش مال توئه."},
  ],
  calendar: [
    {sel:"#coach-cal-seg", title:"📅 هفته و ماه", body:"هفته‌ت رو مرور کن یا کل ماه رو ببین؛ رو هر روز ماه بزن تا جزئیاتش رو ببینی."},
  ],
  more: [
    {sel:"#coach-premium-card", title:"💎 Premium", body:"پیشنهاد هوشمند، Coach و تحلیل عمیق از اینجا فعال می‌شه. «جایزه‌ها» هم اولین گزینه‌ی همین صفحه‌ست."},
  ],
};
let coachActiveFlow = null, coachStepIdx = 0;
function hasSeenCoach(flowId){ return !!(DATA.seenCoach && DATA.seenCoach[flowId]); }
function markCoachSeen(flowId){
  DATA.seenCoach = DATA.seenCoach || {};
  DATA.seenCoach[flowId] = true;
  if(flowId === "today") DATA.seenCoach.todayDay = todayKey(); // «today2» از روز بعد
  save();
}
function maybeRunCoachDay2(){
  const sc = DATA.seenCoach || {};
  if(sc.today && sc.todayDay && sc.todayDay !== todayKey()) maybeRunCoach("today2");
}
function maybeRunCoach(flowId){
  if(coachActiveFlow) return; // a flow is already showing — don't stack another on top
  if(hasSeenCoach(flowId)) return;
  const steps = COACH_FLOWS[flowId];
  if(!steps || !steps.length) return;
  const overlay = document.getElementById("overlay");
  if(overlay && overlay.classList.contains("show")) return; // don't interrupt an open form/sheet
  coachActiveFlow = flowId;
  coachStepIdx = 0;
  showCoachStep();
}
function showCoachStep(){
  const steps = COACH_FLOWS[coachActiveFlow];
  const step = steps[coachStepIdx];
  if(!step){ finishCoach(); return; }
  const target = step.sel ? document.querySelector(step.sel) : null;
  renderCoachOverlay(step, target, coachStepIdx === steps.length - 1);
}
function renderCoachOverlay(step, target, isLast){
  removeCoachOverlay();
  const wrap = document.createElement("div");
  wrap.id = "coachOverlayWrap";
  wrap.style.cssText = "position:fixed; inset:0; z-index:900;";

  const spot = document.createElement("div");
  wrap.appendChild(spot);

  // Always-reachable escape hatch, pinned to a fixed corner — independent of the tooltip's
  // own (dynamic, target-dependent) position. Whatever else goes wrong, this stays put and
  // visible, so the tour can never actually trap someone on screen.
  const closeBtn = document.createElement("button");
  closeBtn.innerHTML = pi("x");
  closeBtn.setAttribute("aria-label", "بستن آموزش");
  closeBtn.className = "cm-close";
  closeBtn.onclick = skipCoach;
  wrap.appendChild(closeBtn);

  // Tapping the dimmed backdrop itself (not the tooltip) is a second, more discoverable way out.
  spot.addEventListener("click", (e) => { if(e.target === spot) skipCoach(); });

  const tip = document.createElement("div");
  tip.id = "coachTipCard";
  tip.className = "cm-tip";
  tip.innerHTML = `
    <div class="cm-title">${step.title}</div>
    <div class="cm-body">${step.body}</div>
    <div class="cm-actions">
      <button class="cm-skip" onclick="skipCoach()">رد کردن</button>
      <button class="cm-next" onclick="nextCoachStep()">${isLast ? "باشه" : "بعدی"}</button>
    </div>
  `;
  wrap.appendChild(tip);
  document.body.appendChild(wrap);

  function placeSpotAndTip(){
    const r = target.getBoundingClientRect();
    const pad = 8;
    // Clamp the spotlight itself to the viewport too — an element taller/wider than the
    // screen (the calendar grid, the heatmap) must not push the ring itself off-screen.
    const top = Math.max(r.top - pad, 4);
    const left = Math.max(r.left - pad, 4);
    const width = Math.min(r.width + pad*2, window.innerWidth - left - 4);
    const height = Math.min(r.height + pad*2, window.innerHeight - top - 4);
    spot.className = "cm-spot";
    spot.style.cssText = `top:${top}px; left:${left}px; width:${width}px; height:${height}px;`;
    // Tooltip goes below the target if there's room, otherwise above — then gets hard-clamped
    // into the viewport no matter what either branch computed, which is the actual fix for
    // "the tooltip goes off-screen": no positioning path can produce an off-screen result now.
    const spaceBelow = window.innerHeight - r.bottom;
    const tipH = tip.offsetHeight || 160, tipW = tip.offsetWidth || 280;
    let tipTop = spaceBelow > tipH + 20 ? r.bottom + pad + 10 : r.top - pad - 10 - tipH;
    let tipLeft = r.left + r.width/2 - tipW/2;
    tipTop = Math.min(Math.max(tipTop, 12), window.innerHeight - tipH - 12);
    tipLeft = Math.min(Math.max(tipLeft, 12), window.innerWidth - tipW - 12);
    tip.style.top = `${tipTop}px`;
    tip.style.left = `${tipLeft}px`;
    tip.style.transform = "none";
  }

  if(target){
    // Instant (not smooth) scroll, then measure on the next two frames — waiting for a fixed
    // delay to "guess" when a smooth scroll animation finishes was the root cause of the
    // spotlight/tooltip landing in the wrong place. Jumping instantly removes the race
    // entirely: by the second frame the layout is guaranteed settled.
    target.scrollIntoView({block: "center", behavior: "auto"});
    requestAnimationFrame(() => requestAnimationFrame(placeSpotAndTip));
  } else {
    spot.className = "cm-dim";
  }
}
function removeCoachOverlay(){
  const el = document.getElementById("coachOverlayWrap");
  if(el) el.remove();
}
function nextCoachStep(){ coachStepIdx++; showCoachStep(); }
function skipCoach(){ finishCoach(); }
function finishCoach(){
  if(coachActiveFlow) markCoachSeen(coachActiveFlow);
  coachActiveFlow = null;
  removeCoachOverlay();
}

function openGoalsSheet(){
  const dk = todayKey();
  const extra = dailyExtraFor(dk);
  const goals = DATA.goals;

  openOverlay(`
    <h3>🎯 اهداف</h3>
    <div class="field">
      <label>هدف اصلی امروز</label>
      <input type="text" class="goal-input" value="${(extra.goal||"").replace(/"/g,'&quot;')}" placeholder="مثلاً: تمرکز روی جلسه یادگیری" onchange="setTodayGoal(this.value); openGoalsSheet();">
    </div>

    <div class="field">
      <label>اهداف کوتاه‌مدت</label>
      ${renderListField(goals.short, "addGoalItem('short', v)", "deleteGoalItem('short', ", "مثلاً: طی یه ماه آینده...")}
    </div>
    <div class="field">
      <label>امروز چیکار کردم براش؟</label>
      ${renderListField(extra.goalActions.short, "addGoalAction('short', v)", "deleteGoalAction('short', ", "چه اقدامی کردی؟")}
    </div>

    <div class="field">
      <label>اهداف میان‌مدت</label>
      ${renderListField(goals.medium, "addGoalItem('medium', v)", "deleteGoalItem('medium', ", "مثلاً: طی ۶ ماه آینده...")}
    </div>
    <div class="field">
      <label>امروز چیکار کردم براش؟</label>
      ${renderListField(extra.goalActions.medium, "addGoalAction('medium', v)", "deleteGoalAction('medium', ", "چه اقدامی کردی؟")}
    </div>

    <div class="field">
      <label>اهداف بلندمدت</label>
      ${renderListField(goals.long, "addGoalItem('long', v)", "deleteGoalItem('long', ", "مثلاً: طی چند سال آینده...")}
    </div>
    <div class="field" style="margin-bottom:0;">
      <label>امروز چیکار کردم براش؟</label>
      ${renderListField(extra.goalActions.long, "addGoalAction('long', v)", "deleteGoalAction('long', ", "چه اقدامی کردی؟")}
    </div>

    <div class="sheet-actions">
      <button class="btn btn-primary" onclick="closeOverlay()">بستن</button>
    </div>
  `);
}

/* حلقه‌ی پیشرفت امروز: چند کار از چندتا (عادت‌ها با گروه انحصاری یک‌بار حساب می‌شن + کارهای امروز) */
function ring(done, total, size, unit){
  size = size || 124; unit = unit || "کار";
  const r = size * 0.42, c = 2 * Math.PI * r, sw = Math.round(size * 0.08);
  const pct = total > 0 ? Math.min(done / total, 1) : 0;
  return `
  <div class="ring-wrap" style="width:${size}px; height:${size}px;">
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" role="img" aria-label="پیشرفت امروز: ${toFaDigits(done)} از ${toFaDigits(total)}">
      <circle class="ring-track" cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke-width="${sw}"/>
      <circle class="ring-fill" cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke-width="${sw}"
        stroke-linecap="round" stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${(c * (1 - pct)).toFixed(1)}" transform="rotate(-90 ${size/2} ${size/2})"/>
    </svg>
    <div class="ring-label">
      <div class="ring-num">${toFaDigits(done)}</div>
      <div class="ring-sub">از ${toFaDigits(total)} ${unit}</div>
    </div>
  </div>`;
}
function todayProgressCounts(now = new Date()){
  const dk = dayKeyOf(now), tk = todayKey(now);
  const done = completedFor(tk);
  const seen = new Set();
  let total = 0, d = 0;
  activitiesForDay(dk).forEach(a => {
    if(a.group){
      if(seen.has(a.group)) return;
      seen.add(a.group); total++;
      if(DATA.activities.some(x => x.group === a.group && done.has(x.id))) d++;
    } else { total++; if(done.has(a.id)) d++; }
  });
  const tasks = dailyExtraFor(tk).tasks || [];
  total += tasks.length; d += tasks.filter(t => t.done).length;
  return { done: d, total };
}
/* «ادامه‌ی امروز»: برو سراغ اولین کاری که هنوز تیک نخورده */
function continueToday(){
  const el = document.querySelector(".act-row:not(.is-done)") || document.querySelector(".task-check:not(.done)");
  if(!el) return;
  el.scrollIntoView({ block: "center", behavior: "smooth" });
  const row = el.classList.contains("task-check") ? el : el;
  try{ row.focus({ preventScroll: true }); }catch(e){}
}
/* استریک هر عادت: چند روز برنامه‌ریزی‌شده‌ی پشت‌سرهم انجامش دادی (امروزِ هنوز تیک‌نخورده زنجیره رو نمی‌شکنه) */
function habitStreak(a){
  let n = 0;
  const cur = new Date();
  if(!(DATA.history[todayKey(cur)] || []).includes(a.id)) cur.setDate(cur.getDate() - 1);
  for(let i = 0; i < 400; i++){
    const scheduled = a.days.includes("daily") || a.days.includes(dayKeyOf(cur));
    if(scheduled){
      if((DATA.history[todayKey(cur)] || []).includes(a.id)) n++;
      else break;
    }
    cur.setDate(cur.getDate() - 1);
  }
  return n;
}

/* "Peleh Life" idea #10: book progress surfaced inside "امروز" instead of being an isolated
   island — deterministic, no AI involved, so it's free for everyone (same bucket as task
   tiers and the streak/recovery messaging below). */
/* "Peleh Life" #15: Progress Streak — counts consecutive days with at least one real
   completed step (not "opened the app"), computed fresh from history each time (no separate
   stored counter that could get out of sync with reality). If yesterday broke a real streak,
   show a forgiving "recovery" nudge instead of silently resetting to zero — loss aversion
   without punishing someone for one off day. Free for everyone, no AI involved. */
function computeProgressStreak(){
  const activeDays = new Set(Object.keys(DATA.history).filter(dk => (DATA.history[dk]||[]).length > 0));
  const today = todayKey();
  let count = 0;
  let cursor = new Date();
  if(!activeDays.has(today)) cursor.setDate(cursor.getDate()-1);
  while(activeDays.has(todayKey(cursor))){
    count++;
    cursor.setDate(cursor.getDate()-1);
  }
  let justBroke = false;
  if(!activeDays.has(today)){
    const yest = new Date(); yest.setDate(yest.getDate()-1);
    if(!activeDays.has(todayKey(yest))){
      let priorStreak = 0, c2 = new Date(yest); c2.setDate(c2.getDate()-1);
      while(activeDays.has(todayKey(c2))){ priorStreak++; c2.setDate(c2.getDate()-1); }
      justBroke = priorStreak >= 2;
    }
  }
  return {count, justBroke};
}
function renderProgressStreakWidget(){
  // استریک حالا داخل کارت کوچیک «روز پشت‌سرهم» نمایش داده می‌شه (renderToday)؛ این تابع برای سازگاری می‌مونه
  const s = computeProgressStreak();
  if(s.justBroke) return `<div class="card"><div style="font-weight:700;">${pi("lifebuoy")} دیروز جا موند</div><div class="note">امروز فقط یه قدم کوچیک بردار.</div></div>`;
  return ``;
}

function renderTodayBookWidget(){
  if(typeof ensureBooksData !== "function") return ``;
  const b = ensureBooksData();
  if(!b.onboarded) return ``;
  const loggedToday = b.streak.lastDate === todayKey();
  const book = (typeof currentReadingBook === "function") ? currentReadingBook() : null;
  let title, sub;
  if(loggedToday){ title = "مطالعه‌ی امروز ثبت شد"; sub = `${toFaDigits(b.streak.count)} روز پشت‌سرهم`; }
  else if(b.streak.count > 0){ title = book ? `«${escapeHtml(book.title)}»` : "کتاب امروز"; sub = `${toFaDigits(b.streak.count)} روز پشت‌سرهم — امروز هم بخون`; }
  else if(book){ title = `«${escapeHtml(book.title)}»`; sub = "امروز چند صفحه بخون"; }
  else { title = "کتاب امروز"; sub = "یه کتاب انتخاب کن و شروع کن"; }
  return `<div class="card list-card" style="margin-bottom:12px;">
    <div class="link-row" onclick="switchTab('books')">
      <div class="act-icon" style="color:${loggedToday ? "var(--gold)" : "var(--muted)"};">${pi("book")}</div>
      <div class="act-title">${title}<span class="alt-tag">${sub}</span></div>
      <span class="chev">${pi("chevL")}</span>
    </div>
  </div>`;
}

/* ۷ روز اخیر به شکل پله: هر روز یه پله، روزهای انجام‌شده پررنگ — هم نمودار هفته‌ست، هم نماد پله */
function renderWeekStairs(opts = {}){
  const end = opts.end ? new Date(opts.end) : new Date();
  end.setHours(0, 0, 0, 0);
  const start = opts.start ? new Date(opts.start) : (() => { const d = new Date(end); d.setDate(d.getDate() - 6); return d; })();
  const todayK = todayKey();
  let active = 0;
  const steps = [], labels = [], aria = [];
  for(let i = 0; i < 7; i++){
    const d = new Date(start); d.setDate(d.getDate() + i);
    const tk = todayKey(d), wk = dayKeyOf(d);
    const pts = todayPoints(d), mx = Math.max(maxPointsFor(wk), 1);
    const did = (DATA.history[tk] || []).length > 0;
    const future = d > new Date();
    if(did) active++;
    const ratio = Math.min(pts / mx, 1);
    const h = 34 + i * 11;
    const fill = did ? Math.max(ratio, 0.3) : 0;   // هر روز فعال حداقل ۳۰٪ پر — «انجام‌شده» پررنگ دیده بشه
    steps.push(`<div class="stair ${did ? "done" : ""} ${ratio >= 1 ? "full" : ""} ${tk === todayK ? "today" : ""}" style="height:${h}%;${future ? " opacity:.45;" : ""}">${fill ? `<i style="height:${Math.round(fill * 100)}%"></i>` : ``}</div>`);
    labels.push(`<span class="${tk === todayK ? "today" : ""}">${tk === todayK ? "امروز" : DAY_LABELS[wk].slice(0, 1)}</span>`);
    aria.push(`${DAY_LABELS[wk]}: ${did ? toFaDigits(pts) + " امتیاز" : "بدون فعالیت"}`);
  }
  const wow = opts.title === false || opts.start ? null : weekOverWeek(end);
  const wowTxt = wow === null ? `` : wow > 0 ? ` · ${toFaDigits(wow)}٪ بهتر از هفته‌ی قبل` : wow < 0 ? ` · ${toFaDigits(-wow)}٪ کمتر از هفته‌ی قبل` : ` · مثل هفته‌ی قبل`;
  const head = opts.title === false ? `` : `<div class="stairs-head"><b>${opts.title || "۷ روز اخیر"}</b><span class="${wow > 0 ? "up" : ""}">${toFaDigits(active)} از ۷ روز${wowTxt}</span></div>`;
  const body = `${head}<div class="stairs" role="img" aria-label="${aria.join("، ")}">${steps.join("")}</div><div class="stair-days">${labels.join("")}</div>`;
  return opts.onclick === false ? `<div class="stairs-card">${body}</div>` : `<button type="button" class="stairs-card" onclick="${opts.onclick || "calView='week'; switchTab('calendar')"}">${body}</button>`;
}

function renderTodayHero(now, simple){
  const dk = dayKeyOf(now);
  const pc = todayProgressCounts(now);
  const left = Math.max(pc.total - pc.done, 0);
  const sub = !pc.total ? "اولین عادتت رو بساز" : left ? `${toFaDigits(left)} کار دیگه تا کامل شدن امروز` : "امروز کامل شد";
  const lvl = currentLevel();
  const toNext = Math.max(0, Math.round(lvl.ceil - lvl.pts));
  return `
    <div class="today-head" style="display:flex; align-items:baseline; justify-content:space-between; gap:10px; margin:2px 2px 12px;">
      <div class="page-title" style="margin:0;">${DAY_LABELS[dk]}</div>
      <div class="note">${jalaliDateLabel(now)}</div>
    </div>
    <section class="hero-card" aria-label="پیشرفت امروز">
      <div class="hero-top">
        <div class="hero-text">
          <div class="hero-title">پیشرفت امروز</div>
          <div class="hero-sub">${sub}</div>
          ${left ? `<button type="button" class="hero-cta" onclick="continueToday()">ادامه‌ی امروز ${pi("chevL")}</button>` : ``}
        </div>
        ${ring(pc.done, pc.total)}
      </div>
      ${simple ? `` : `<button type="button" class="level-strip" onclick="openRewards()" aria-label="جایزه‌ها — سطح ${toFaDigits(lvl.level)}">
        <span class="ls-ic">${pi("steps")}</span>
        <span class="ls-body">
          <span class="ls-top"><b>سطح ${toFaDigits(lvl.level)}</b><span>${lvl.ratio >= 1 ? "بالاترین سطح" : `${toFaDigits(toNext)} امتیاز تا سطح ${toFaDigits(lvl.level + 1)}`}</span></span>
          <span class="pbar-track"><span class="pbar-fill" style="display:block; width:${Math.round(lvl.ratio * 100)}%"></span></span>
        </span>
        <span class="chev">${pi("chevL")}</span>
      </button>`}
    </section>`;
}

function renderTodayStats(now){
  const pts = todayPoints(now), mx = maxPointsFor(dayKeyOf(now));
  const s = computeProgressStreak();
  return `<div class="stat-pair">
    <button type="button" class="stat-tile" onclick="openRewards()" aria-label="امتیاز امروز ${toFaDigits(pts)} — جایزه‌ها">
      <span class="st-head">امتیاز امروز <span class="pi-gold">${pi("star", "pi-fill")}</span></span>
      <span class="st-num">${toFaDigits(pts)}</span>
      <span class="st-unit">از ${toFaDigits(mx)} · کل ${toFaDigits(cumulativePoints())}</span>
    </button>
    <button type="button" class="stat-tile" onclick="calView='week'; switchTab('calendar')" aria-label="روز پشت‌سرهم ${toFaDigits(s.count)}">
      <span class="st-head">روز پشت‌سرهم <span class="pi-flame">${pi("flame", "pi-fill")}</span></span>
      <span class="st-num">${toFaDigits(s.count)}</span>
      <span class="st-unit">${s.justBroke ? "دیروز جا موند — امروز یه قدم" : s.count ? "هر روز حداقل یه قدم" : "از امروز شروع کن"}</span>
    </button>
  </div>`;
}

function renderTodayWorkoutCard(){
  if(typeof CLIENT_FLAGS === "undefined" || !CLIENT_FLAGS.plus_enabled || typeof plusOpenTodayWorkout !== "function") return ``;
  const a = DATA.activities.find(x => x.id === "plus_workout");
  if(!a) return ``;
  const dk = dayKeyOf(new Date());
  if(!(a.days.includes("daily") || a.days.includes(dk))) return ``;
  if((DATA.history[todayKey()] || []).includes(a.id)) return ``;
  const inProgress = typeof PW !== "undefined" && PW && PW.status !== "finished";
  return `<button type="button" class="card mini-sum workout-card" aria-label="تمرین امروز سلامت پلاس" onclick="plusOpenTodayWorkout()">
    <span class="mini-top"><span class="meta" style="font-weight:700;">تمرین امروز</span><span class="chip-gold">مربی</span></span>
    <b>${inProgress && PW.day_label ? escapeHtml(PW.day_label) : "تمرین امروز"}</b>
    <span class="wc-go">${pi("dumbbell")} ${inProgress ? "ادامه‌ی تمرین" : "شروع تمرین"}</span>
  </button>`;
}

function renderQuoteCard(now){
  return `<section class="quote-card" aria-label="جمله‌ی امروز">
    <div class="q-text">${dailyQuoteFor(now)}<div class="quote-narrator">پله</div></div>
    <svg class="quote-art" viewBox="0 0 150 118" aria-hidden="true">
      <circle class="qa-sun" cx="104" cy="40" r="26"/>
      <path class="qa-hill" d="M0 118 L34 70 L56 88 L84 58 L122 100 L150 80 L150 118 Z"/>
      <rect class="qa-step dim" x="4" y="104" width="38" height="7" rx="3"/>
      <rect class="qa-step dim" x="24" y="92" width="38" height="7" rx="3"/>
      <rect class="qa-step" x="44" y="80" width="38" height="7" rx="3"/>
      <rect class="qa-step" x="64" y="68" width="38" height="7" rx="3"/>
    </svg>
  </section>`;
}

/* ---------- «عادت‌های زنده» (طراحی نهایی v2.4.0) ----------
   هر عادت یه کارت با روند ۷ روز اخیر (پر = انجام‌شده، حاشیه = امروز مونده، خط‌چین = برنامه نداشت)،
   زنجیره‌ی روزها و ابزار تمرکز/یادگاری. فقط از DATA.history ساخته می‌شه (بدون تغییر سرور). */
function habitWeekDots(a, now){
  const out = []; let doneN = 0, schedN = 0;
  for(let i = 6; i >= 0; i--){
    const d = new Date(now); d.setDate(d.getDate() - i);
    const tk = todayKey(d), wk = dayKeyOf(d);
    const sched = a.days.includes("daily") || a.days.includes(wk);
    const did = (DATA.history[tk] || []).includes(a.id);
    if(sched) schedN++;
    if(did) doneN++;
    out.push(`<span class="${did ? "d" : i === 0 && sched ? "t" : sched ? "" : "off"}"></span>`);
  }
  return { html: `<div class="hdots" role="img" aria-label="${toFaDigits(doneN)} از ${toFaDigits(schedN)} روز برنامه‌دار در ۷ روز اخیر">${out.join("")}</div>`, doneN, schedN };
}
function liveHabitCard(a, now, done){
  const isDone = done.has(a.id);
  const mediaKey = `${todayKey(now)}:${a.id}`;
  const hasMedia = DATA.checkinMedia && DATA.checkinMedia[mediaKey];
  const st = habitStreak(a);
  const w = habitWeekDots(a, now);
  const sid = escapeHtml(String(a.id));
  return `<div class="ht act-row ${isDone ? "is-done done" : ""}" onclick="toggleActivity('${sid}')" aria-pressed="${isDone}">
    <div class="ht-top"><span class="ic">${piEmoji(a.icon, "circle")}</span>
      <button type="button" class="chk act-check ${isDone ? "on done" : ""}" aria-pressed="${isDone}" aria-label="${isDone ? "انجام شد" : "علامت بزن"}: ${escapeHtml(a.title)}" onclick="event.stopPropagation(); toggleActivity('${sid}')">${ICONS.check}</button></div>
    <div><div class="ht-name act-title">${escapeHtml(a.title)}</div><div class="meta"><span class="act-pts ${isDone ? "done" : ""}">+${toFaDigits(a.points)}</span>${a.group ? ` · یکی از گزینه‌ها` : ``}</div></div>
    ${w.html}
    <div class="ht-foot">${st >= 2 ? `<span class="ht-streak"><span class="pi-flame">${pi("flame", "pi-fill")}</span>${toFaDigits(st)}</span>` : `<span class="meta">${toFaDigits(w.doneN)} از ${toFaDigits(w.schedN)} روز</span>`}
      ${isDone ? `<button type="button" class="ib" onclick="event.stopPropagation(); openCheckinMediaForm('${sid}');" aria-label="یادگاری این لحظه">${pi(hasMedia ? "image" : "camera")}</button>`
        : `<button type="button" class="ib" onclick="event.stopPropagation(); openFocusTimer('${sid}','activity');" aria-label="شروع تمرکز">${pi("timer")}</button>`}</div>
  </div>`;
}
function liveRotatingCard(a, now, done){
  const isDone = done.has(a.id);
  const w = habitWeekDots(a, now);
  const sid = escapeHtml(String(a.id));
  const daysTxt = a.days.filter(d => DAY_LABELS[d]).map(d => DAY_LABELS[d]).join("، ");
  return `<div class="ht ht-row act-row ${isDone ? "is-done done" : ""}" onclick="toggleActivity('${sid}')" aria-pressed="${isDone}">
    <span class="ic">${piEmoji(a.icon, "circle")}</span>
    <div class="ht-mid"><div class="ht-line"><span class="ht-name act-title">${escapeHtml(a.title)}</span><span class="meta act-pts ${isDone ? "done" : ""}">+${toFaDigits(a.points)}</span></div>
      ${w.html}${daysTxt ? `<span class="meta">${escapeHtml(daysTxt)}</span>` : ``}</div>
    <button type="button" class="chk act-check ${isDone ? "on done" : ""}" aria-pressed="${isDone}" aria-label="${isDone ? "انجام شد" : "علامت بزن"}: ${escapeHtml(a.title)}" onclick="event.stopPropagation(); toggleActivity('${sid}')">${ICONS.check}</button>
  </div>`;
}
// روند ۲: این هفته تا امروز در برابر همون روزهای هفته‌ی قبل (فقط تا امروز، تا وسط هفته «بدتر» دیده نشه)
function weekOverWeek(now){
  let cur = 0, prev = 0;
  for(let i = 0; i < 7; i++){
    const d = new Date(now); d.setDate(d.getDate() - i);
    const p = new Date(d); p.setDate(p.getDate() - 7);
    cur += todayPoints(d); prev += todayPoints(p);
  }
  if(prev <= 0) return null;
  return Math.round((cur - prev) / prev * 100);
}
// روند ۳: حال ۷ روز اخیر (روز بدون ثبت خالی می‌مونه)
function moodWeekDots(now){
  const score = {"😞":1,"😐":2,"🙂":3,"😄":4,"🤩":5};
  const out = []; let n = 0;
  for(let i = 6; i >= 0; i--){
    const d = new Date(now); d.setDate(d.getDate() - i);
    const m = moodFor(todayKey(d));
    const v = m && score[m.emoji];
    if(v) n++;
    out.push(`<i class="${v ? "on" : ""}" style="${v ? `height:${4 + v * 3}px` : ""}"></i>`);
  }
  return `<span class="mood-week" role="img" aria-label="حال ثبت‌شده در ${toFaDigits(n)} روز از ۷ روز اخیر">${out.join("")}</span>`;
}
function renderTodayBookMini(){
  if(typeof ensureBooksData !== "function") return ``;
  const b = ensureBooksData();
  if(!b.onboarded) return ``;
  const book = (typeof currentReadingBook === "function") ? currentReadingBook() : null;
  const loggedToday = b.streak.lastDate === todayKey();
  const bars = [];
  const now = new Date();
  let mx = 1; const vals = [];
  for(let i = 6; i >= 0; i--){
    const d = new Date(now); d.setDate(d.getDate() - i);
    const k = todayKey(d);
    const v = (b.log || []).filter(l => l.dateKey === k).reduce((s, l) => s + (Number(l.pages) || 0) + (Number(l.minutes) || 0) / 2, 0);
    vals.push(v); mx = Math.max(mx, v);
  }
  vals.forEach(v => bars.push(`<i style="height:${v ? Math.max(12, Math.round(v / mx * 100)) : 10}%;${v ? "" : " background:var(--track);"}"></i>`));
  return `<button type="button" class="card mini-sum" onclick="switchTab('books')">
    <span class="meta" style="font-weight:700;">کتاب امروز</span>
    <b>${book ? `«${escapeHtml(book.title)}»` : "کتاب امروز"}</b>
    <span class="mini-bars" role="img" aria-label="مطالعه‌ی ۷ روز اخیر">${bars.join("")}</span>
    <span class="meta">${loggedToday ? "امروز ثبت شد ✓" : b.streak.count ? `${toFaDigits(b.streak.count)} روز پشت‌سرهم · امروز هم بخون` : "امروز چند صفحه بخون"}</span>
  </button>`;
}

function renderToday(){
  const now = new Date();
  const dk = dayKeyOf(now);
  migrateTomorrowNotesToToday();
  const done = completedFor(todayKey(now));
  const acts = activitiesForDay(dk);
  const rotating = acts.filter(a => !a.days.includes("daily"));
  const core = acts.filter(a => a.days.includes("daily"));

  const rowHtml = (a) => {
    const isDone = done.has(a.id);
    const mediaKey = `${todayKey(now)}:${a.id}`;
    const hasMedia = DATA.checkinMedia && DATA.checkinMedia[mediaKey];
    const st = habitStreak(a);
    return `
    <div class="act-row ${isDone?'is-done':''}" onclick="toggleActivity('${a.id}')" aria-pressed="${isDone}">
      <div class="act-check ${isDone?'done':''}">${ICONS.check}</div>
      <div class="act-icon">${piEmoji(a.icon, "circle")}</div>
      <div class="act-title">${escapeHtml(a.title)}${a.group?`<span class="alt-tag">یکی از گزینه‌های این بخش</span>`:""}</div>
      <span class="act-meta"><span class="act-pts ${isDone?'done':''}">+${toFaDigits(a.points)}</span>${st >= 2 ? `<span class="sep"></span><span style="display:inline-flex; align-items:center; gap:3px;"><span class="pi-flame">${pi("flame","pi-fill")}</span>${toFaDigits(st)}</span>` : ``}</span>
      ${!isDone ? `<button class="icon-btn" onclick="event.stopPropagation(); openFocusTimer('${a.id}','activity');" aria-label="شروع تمرکز" title="شروع تمرکز">${pi("timer")}</button>` : ``}
      ${isDone ? `<button class="icon-btn" onclick="event.stopPropagation(); openCheckinMediaForm('${a.id}');" aria-label="یادگاری این لحظه" title="یادگاری این لحظه">${pi(hasMedia ? "image" : "camera")}</button>` : ``}
    </div>`;
  };

  const cum = cumulativePoints();
  const next = nextTier();
  const ladderTarget = next ? next.points : (sortedRewards().slice(-1)[0]?.points || 1);

  const mood = moodFor(todayKey(now));
  const MOOD_ICON = {"😞":"faceSad","😐":"faceNeutral","🙂":"faceSmile","😄":"faceHappy","🤩":"faceStar"};
  const MOOD_LABEL = {"😞":"بد","😐":"معمولی","🙂":"خوب","😄":"عالی","🤩":"فوق‌العاده"};
  const moodChips = MOOD_OPTIONS.map(e => `
    <button type="button" class="mood-emoji ${mood.emoji===e?'on':''}" aria-pressed="${mood.emoji===e}" aria-label="${MOOD_LABEL[e] || "حال"}" onclick="setMoodEmoji('${e}')">${MOOD_ICON[e] ? pi(MOOD_ICON[e]) : piEmoji(e)}</button>
  `).join("");

  const extra = dailyExtraFor(todayKey(now));

  /* سه دسته‌ی «پله لایف» (قاعده‌محور، بدون AI): ضروری / مهم / قابل‌تعویق */
  const TASK_TIERS = [
    {key:"urgent", label:"امروز حتماً"},
    {key:"important", label:"اگر وقت شد"},
    {key:"deferrable", label:"قابل انتقال"},
  ];
  function renderTaskRow(t){
    const mediaKey = `${todayKey()}:${t.id}`;
    const hasMedia = DATA.checkinMedia && DATA.checkinMedia[mediaKey];
    return `
    <div class="task-row">
      <div class="task-check ${t.done?'done':''}" onclick="toggleTask('${t.id}')" role="checkbox" aria-checked="${!!t.done}" aria-label="${escapeHtml(t.text)}">${ICONS.check}</div>
      <div class="task-text ${t.done?'done':''}" onclick="editTask('${t.id}')" style="cursor:pointer;">${escapeHtml(t.text)}</div>
      <div class="task-tools">
        ${!t.done ? `<button class="icon-btn" onclick="openFocusTimer('${t.id}','task');" aria-label="شروع تمرکز" title="شروع تمرکز">${pi("timer")}</button>` : `<button class="icon-btn" onclick="openCheckinMediaForm('${t.id}');" aria-label="یادگاری این لحظه" title="یادگاری این لحظه">${pi(hasMedia ? "image" : "camera")}</button>`}
        ${!t.done ? `<button class="icon-btn" onclick="deferTaskToTomorrow('${t.id}')" aria-label="انتقال به فردا" title="انتقال به فردا">${pi("arrowFwd")}</button>` : ``}
        <button class="star-btn ${t.starred?'on':''}" onclick="toggleStar('${t.id}')" aria-pressed="${!!t.starred}" aria-label="از ۳ کار مهم امروز">${pi("star")}</button>
        <button class="icon-btn" onclick="deleteTask('${t.id}')" aria-label="حذف" title="حذف">${ICONS.trash}</button>
      </div>
    </div>`;
  }
  const taskRows = extra.tasks.length ? TASK_TIERS.map(tier=>{
    const inTier = extra.tasks.filter(t=>t.priority===tier.key).sort((a,b) => (b.starred?1:0) - (a.starred?1:0));
    if(!inTier.length) return ``;
    return `<div class="task-tier"><span class="dot-${tier.key}">${pi("dot","pi-dot")}</span>${tier.label}</div>${inTier.map(renderTaskRow).join("")}`;
  }).join("") : `<div class="empty">کاری اضافه نکردی</div>`;

  const meta = currentProfileMeta();
  const sec = DATA.settings.sections;
  const simple = isNewUserMode();             // A۴: فقط حلقه + عادت‌ها + «+ عادت»
  const noHabits = DATA.activities.length === 0; // A۵
  const f = DATA.funnel || {};
  const tickHint = !noHabits && f.first_habit && !f.first_checkin && !done.size
    ? `<div class="tick-hint">${pi("pointer")} برای تیک زدن، روی مربع کنار هر عادت بزن</div>` : ``;
  const banners = `${renderUpdateBanner()}${renderWelcomeGiftBanner()}${renderPushPermissionBanner()}${renderReminderAskCard()}${typeof renderSmartNotifyBanner === "function" ? renderSmartNotifyBanner() : ""}`;

  const blocks = [];
  if(simple) blocks.push(`<div class="tile tile-hero" data-tile-id="hero">${banners}${renderTodayHero(now, true)}</div>`);
  else {
    blocks.push(`<div class="tile tile-hero" data-tile-id="hero">
      ${banners}
      ${renderTodayHero(now, false)}
      ${renderTodayStats(now)}
      ${renderWeekStairs()}
    </div>`);
    blocks.push(`<div class="tile tile-profile" data-tile-id="profile">
      <div class="profile-card" onclick="openGoalsSheet()" style="cursor:pointer;">
        <span class="act-icon" style="color:var(--muted);">${pi("target")}</span>
        <div style="flex:1; min-width:0;">
          <div style="font-weight:700; font-size:var(--fs-15);">اهداف</div>
          <div class="note" style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${extra.goal ? escapeHtml(extra.goal) : "هدف امروزت رو بنویس"}</div>
        </div>
        <span class="chev">${pi("chevL")}</span>
      </div>
    </div>`);
    blocks.push(`<div class="tile tile-tip" data-tile-id="tip">
      <div id="coach-important-step">${renderImportantStepCard()}</div>
      <div id="coach-ai-suggestion">${renderCoachCard("today")}</div>
    </div>`);
  }

  if(sec.tasks && !simple) blocks.push(`
    <div class="tile tile-tasks" data-tile-id="tasks" id="coach-task-tiers">
    <div class="section-row"><div class="section-title">کارهای امروز</div><button type="button" class="mini-btn" onclick="openTaskForm()">${pi("plus")} کار</button></div>
    <div class="card list-card">
      ${extra.tasks.length ? renderTipBanner('task_tiers', 'کارها بر اساس اهمیت سه دسته‌ان. کار «قابل انتقال» رو با یه لمس ببر فردا.') : ``}
      ${taskRows}
    </div>
    </div>`);

  const activityBlocks = [];
  if(noHabits) activityBlocks.push(renderEmptyHabitsCard());
  if(sec.mainActivity && !noHabits && (!simple || rotating.length)) activityBlocks.push(`
    <div class="section-title">فعالیت اصلی امروز</div>
    <div class="card list-card">
      ${rotating.length ? rotating.map(a => liveRotatingCard(a, now, done)).join("") : `<div class="empty">امروز فعالیت چرخشی نداری</div>`}
    </div>`);

  /* یه جا برای عادت‌ها: فهرست امروز + «ویرایش» در سربرگ (قبلاً یه کارت جدا «مدیریت فعالیت‌های تکرارشونده»
     با دکمه‌ی افزودن دوم داشت). در حالت ویرایش همه‌ی عادت‌ها و فعالیت‌های چرخشی با روزهاشون ویرایش یا حذف می‌شن. */
  const showCore = (sec.coreActivities || simple);
  if(!noHabits) activityBlocks.push(`
    <div id="coach-activities">
    <div class="section-row"><div class="section-title">${showCore ? "عادت‌های روزانه" : "عادت‌ها"}</div>
      <button type="button" class="mini-btn" id="coach-rotation-inline" aria-pressed="${rotationSectionOpen}" onclick="toggleRotationSection()">${pi(rotationSectionOpen ? "check" : "pencil")} ${rotationSectionOpen ? "تمام" : "ویرایش"}</button></div>
    ${(showCore || rotationSectionOpen) ? (rotationSectionOpen ? `<div class="card list-card">
      ${renderRotationBody()}
      <button class="fab" onclick="openActivityForm(null)">${pi("plus")} عادت جدید</button>
    </div>` : `
      ${tickHint}
      ${core.some(a=>done.has(a.id)) ? renderTipBanner('checkin_journal', 'کنار عادت انجام‌شده، با آیکون دوربین یه عکس یا یادداشت کوتاه نگه دار.') : ``}
      <div class="habit-grid">
        ${core.map(a => liveHabitCard(a, now, done)).join("")}
        ${!core.length ? `<div class="empty card" style="grid-column:1/-1;">امروز عادت روزانه‌ای نداری</div>` : ``}
        <button class="fab habit-add" onclick="openActivityForm(null)">${pi("plus")} عادت جدید</button>
      </div>`) : ``}
    </div>`);

  if(!simple && !noHabits){
    const wc = renderTodayWorkoutCard(), bk = renderTodayBookMini();
    if(wc || bk) activityBlocks.push(`<div class="sum-grid ${wc && bk ? "" : "one"}">${wc}${bk}</div>`);
  }

  if(simple) activityBlocks.push(`<div class="simple-mode-foot"><button type="button" class="link-btn" onclick="showAllTodaySections()">نمایش همه‌ی بخش‌ها ▾</button></div>`);
  if(activityBlocks.length) blocks.push(`<div class="tile tile-activities" data-tile-id="activities">${activityBlocks.join("")}</div>`);
  if(simple) return `<div class="today-grid today-simple">${blocks.join("")}</div>`;

  const sideBlocks = [];
  sideBlocks.push(renderTodayJournalStrip());

  if(sec.mood) sideBlocks.push(`
    <div id="coach-mood">
    <div class="section-row"><div class="section-title">حال امروز</div><span class="note">۷ روز: ${moodWeekDots(now)}</span></div>
    <div class="card">
      <div class="mood-row">${moodChips}</div>
      <textarea class="mood-text" aria-label="امروز چطور بود؟" placeholder="امروز چطور بود؟ (اختیاری)" onchange="setMoodText(this.value)">${escapeHtml(mood.text||"")}</textarea>
    </div>
    </div>`);

  if(sec.ladder) sideBlocks.push(`
    <div id="coach-ladder">
    <div class="section-title">تا جایزه بعدی</div>
    <div class="card" onclick="openRewards()" style="cursor:pointer;">
      <div class="row-between" style="margin-bottom:10px;">
        <div style="font-size:var(--fs-14); font-weight:600;">${next ? escapeHtml(next.title) : "همه‌ی جایزه‌ها گرفته شد"}</div>
        <div style="font-size:var(--fs-15); font-weight:900;">${toFaDigits(cum)}<span class="note" style="font-weight:600;"> / ${toFaDigits(ladderTarget)}</span></div>
      </div>
      <div class="pbar-track"><div class="pbar-fill" style="width:${Math.min(cum/ladderTarget*100,100)}%"></div></div>
    </div>
    </div>`);

  if(sec.notes) sideBlocks.push(`
    <div class="section-title">یادداشت‌های امروز</div>
    <div class="card">
      <div class="note-field"><label>ایده‌ها</label>${renderListField(extra.notes.ideas, "addNoteItem('ideas', v)", "deleteNoteItem('ideas', ", "هر ایده‌ای که به ذهنت رسید")}</div>
      <div class="note-field"><label>یادداشت سریع</label>${renderListField(extra.notes.quick, "addNoteItem('quick', v)", "deleteNoteItem('quick', ", "یه یادداشت کوتاه")}</div>
      <div class="note-field"><label>اتفاق مهم روز</label>${renderListField(extra.notes.important, "addNoteItem('important', v)", "deleteNoteItem('important', ", "مهم‌ترین اتفاق امروز")}</div>
      <div class="note-field" style="margin-bottom:0;"><label>فردا یادم باشه</label>${renderListField(extra.notes.tomorrow, "addNoteItem('tomorrow', v)", "deleteNoteItem('tomorrow', ", "چیزی که نباید فراموش کنی")}</div>
    </div>`);
  sideBlocks.push(renderQuoteCard(now));
  blocks.push(`<div class="tile tile-notes" data-tile-id="notes">${sideBlocks.join("")}</div>`);

  return `<div class="today-grid">${blocks.join("")}</div>`;
}

function renderRotationBody(){
  // حالت «ویرایش» عادت‌ها: همه‌ی فعالیت‌ها (روزانه و چرخشی) با روزهای هفته؛ افزودن فقط از همون یه دکمه‌ی «عادت جدید»
  const rows = DATA.activities.map(a => `
    <div class="manage-row">
      <div class="manage-body">
        <div class="manage-title" style="display:flex; align-items:center; gap:8px;"><span class="act-icon" style="width:22px; height:22px;">${piEmoji(a.icon, "circle")}</span>${escapeHtml(a.title)}</div>
        <div class="manage-days">${a.days.includes('daily') ? `<span class="day-chip">هرروز</span>` : a.days.map(d=>`<span class="day-chip">${DAY_LABELS[d]}</span>`).join("")}</div>
      </div>
      <div class="manage-pts">+${toFaDigits(a.points)}</div>
      <div class="manage-actions">
        <button class="icon-btn" aria-label="ویرایش ${escapeHtml(a.title)}" onclick="openActivityForm('${a.id}')">${ICONS.edit}</button>
        <button class="icon-btn" aria-label="حذف ${escapeHtml(a.title)}" onclick="deleteActivity('${a.id}')">${ICONS.trash}</button>
      </div>
    </div>`).join("");
  return `
    <div class="rotation-body">
      <div class="note" style="padding:12px 16px 4px;">همه‌ی عادت‌ها و فعالیت‌های چرخشی. فعالیت‌های یه «گروه انحصاری» خودکار جای هم رو می‌گیرن.</div>
      ${rows || `<div class="empty">هنوز فعالیتی نداری</div>`}
    </div>
  `;
}
let rotationSectionOpen = false;
function toggleRotationSection(){
  rotationSectionOpen = !rotationSectionOpen;
  renderAll();
}

function renderRewards(){
  const cum = cumulativePoints();
  const lvl = currentLevel();
  const rows = sortedRewards().map(r => {
    const reached = cum >= r.points;
    return `
    <div class="reward-row ${reached?'reached':''}">
      <span class="act-icon" style="color:${reached ? "var(--gold)" : "var(--muted)"};">${pi("gift")}</span>
      <div class="reward-body">
        <div class="reward-title">${escapeHtml(r.title)}</div>
        <div class="reward-sub">${toFaDigits(r.points)} امتیاز${reached ? "" : ` · ${toFaDigits(r.points - cum)} مونده`}</div>
      </div>
      ${reached ? `<button class="claim-btn" onclick="claimReward(${r.id})">گرفتمش</button>` : ``}
      <div class="manage-actions">
        <button class="icon-btn" onclick="openRewardForm(${r.id})" aria-label="ویرایش">${ICONS.edit}</button>
        <button class="icon-btn" onclick="deleteReward(${r.id})" aria-label="حذف">${ICONS.trash}</button>
      </div>
    </div>`;
  }).join("");
  const unlockedThemes = LEVEL_THEMES.filter(t=>lvl.level>=t.unlockLevel).length;
  return `
    ${subpageHeader("جایزه‌ها")}
    <div class="rewards-grid">
    <div class="tile tile-summary" data-tile-id="summary">
    <div id="coach-reward-points" class="reward-hero">
      <div class="rh-num">${toFaDigits(cum)}</div>
      <div class="rh-lbl">امتیاز جمع‌شده</div>
      <div style="margin-top:16px; padding-top:16px; border-top:1px solid var(--divider); text-align:start;">
        <div class="row-between" style="margin-bottom:8px;">
          <div style="font-size:var(--fs-15); font-weight:800;">سطح ${toFaDigits(lvl.level)}</div>
          <div class="note">${lvl.ratio>=1 ? "بالاترین سطح" : `تا سطح ${toFaDigits(lvl.level+1)}`}</div>
        </div>
        <div class="pbar-track"><div class="pbar-fill" style="width:${Math.round(lvl.ratio*100)}%"></div></div>
      </div>
    </div>
    ${LEVEL_THEMES.length ? `<button type="button" class="more-row card" style="margin:0 0 14px; border-radius:var(--r-lg);" onclick="switchTab('settings')">
      <span class="mr-ic">${pi("sparkle")}</span>
      <span class="mr-body"><span class="mr-title">تم‌های ویژه</span><span class="mr-sub" style="display:block;">${toFaDigits(unlockedThemes)} از ${toFaDigits(LEVEL_THEMES.length)} باز شده</span></span>
      <span class="chev">${pi("chevL")}</span>
    </button>` : ``}
    </div>

    <div class="tile tile-list" data-tile-id="list">
    <div class="section-title" style="margin-top:6px;">جایزه‌های من</div>
    <div class="card list-card">${rows || `<div class="empty">هنوز جایزه‌ای تعریف نکردی</div>`}</div>
    <button class="fab" onclick="openRewardForm(null)">${pi("plus")} جایزه‌ی جدید</button>
    </div>
    </div>
  `;
}

let calState = null; // {jy, jm} — lazily initialized to current Jalali month
let calView = "week"; // «تقویم»: پیش‌فرض نمای هفته؛ «ماه» همون تقویم ماهانه‌ی قبلی
function setCalView(v){ calView = v === "month" ? "month" : "week"; renderAll(); }
let weekState = null; // Date (a Saturday) — lazily initialized to this week's Saturday

function ensureCalState(){
  if(!calState){
    const [jy,jm] = jalaliOf(new Date());
    calState = {jy, jm};
  }
}
function shiftCalMonth(delta){
  ensureCalState();
  let {jy, jm} = calState;
  jm += delta;
  if(jm > 12){ jm = 1; jy++; }
  if(jm < 1){ jm = 12; jy--; }
  calState = {jy, jm};
  renderAll();
}

/* ===================== Activity heatmap (last ~20 weeks) =====================
   A compact GitHub-contributions-style grid: columns = weeks, rows = weekday (sat→fri,
   matching WEEK_ORDER/the rest of the calendar). Color intensity is relative to the user's
   OWN best day in this window, not some fixed global scale — so it stays meaningful whether
   someone's daily habit is worth 10 points or 200. */
function renderActivityHeatmapBlock(weeks = 20){
  // اسم کامل هر ۷ روز هفته داخل خود SVG کشیده می‌شه تا با هر عرض صفحه دقیقاً کنار ردیف خودش بمونه
  // (قبلاً ستون جدا بود و اسم‌ها به ۳ حرف بریده می‌شدن: «شنب»، «دوش»، …)
  return `
    <div>
      <div style="overflow-x:auto;">
        ${activityHeatmapSVG(weeks)}
        <div style="display:flex; justify-content:space-between; margin-top:6px; font-size:var(--fs-11); color:var(--muted);">
          <span>امروز</span>
          <span>قدیم‌تر</span>
        </div>
      </div>
    </div>
    <div style="display:flex; align-items:center; justify-content:center; gap:5px; margin-top:14px;">
      <span style="font-size:var(--fs-11); color:var(--muted);">کم</span>
      <svg width="76" height="12" aria-hidden="true">${[0,1,2,3,4].map(k=>`<rect class="hm-${k}" x="${(4-k)*16}" y="0" width="12" height="12" rx="3"/>`).join("")}</svg>
      <span style="font-size:var(--fs-11); color:var(--muted);">زیاد</span>
    </div>
  `;
}
function activityHeatmapSVG(weeks = 20){
  const cell = 13, gap = 4;
  const today = new Date();
  today.setHours(0,0,0,0);
  const todayRow = WEEK_ORDER.indexOf(dayKeyOf(today));
  const gridStart = new Date(today);
  gridStart.setDate(gridStart.getDate() - todayRow - (weeks-1)*7); // a real Saturday, `weeks` calendar-weeks back
  const days = [];
  for(let i = 0; i < weeks*7; i++){
    const d = new Date(gridStart);
    d.setDate(d.getDate() + i);
    if(d > today) break; // no cells for days that haven't happened yet
    const dk = todayKey(d);
    const pts = (DATA.history[dk] || []).reduce((s,id) => s + pointsOf(id), 0);
    days.push({dk, pts, col: Math.floor(i/7), row: i%7});
  }
  const maxPts = Math.max(...days.map(d => d.pts), 1);
  const w = weeks * (cell+gap) - gap, h = 7 * (cell+gap) - gap;
  const rects = days.map(d => {
    const ratio = d.pts / maxPts;
    const lv = d.pts === 0 ? 0 : ratio > 0.75 ? 4 : ratio > 0.5 ? 3 : ratio > 0.25 ? 2 : 1;
    return `<rect class="hm-${lv}" x="${d.col*(cell+gap)}" y="${d.row*(cell+gap)}" width="${cell}" height="${cell}" rx="3"><title>${d.dk}: ${toFaDigits(d.pts)} امتیاز</title></rect>`;
  }).join("");
  const labelW = 46;
  const labels = WEEK_ORDER.map((wd, i) => `<text x="${w + labelW}" y="${i*(cell+gap) + cell - 2.5}" font-size="9.5" text-anchor="end" class="hm-label">${DAY_LABELS[wd]}</text>`).join("");
  return `<svg viewBox="0 0 ${w + labelW} ${h}" width="100%" height="${Math.round(h*1.15)}" preserveAspectRatio="xMidYMid meet" style="direction:ltr;" role="img" aria-label="روند ۲۰ هفته‌ی اخیر">${rects}${labels}</svg>`;
}

/* ===================== Weekly/monthly recap card =====================
   "این هفته‌ت چطور بود؟" — a small summary of the last 7 days plus the current Jalali
   month's total, shareable through the SAME branded-template + Web Share pipeline already
   built for check-in photos (see renderMemoryTemplateBlob/shareMemory below), just with a
   mini heatmap drawn on the canvas instead of a photo. */
function recapStats(days){
  const today = new Date(); today.setHours(0,0,0,0);
  let total = 0, active = 0;
  const cells = [];
  for(let i = days-1; i >= 0; i--){
    const d = new Date(today); d.setDate(d.getDate()-i);
    const dk = todayKey(d);
    const pts = (DATA.history[dk]||[]).reduce((s,id)=>s+pointsOf(id),0);
    if(pts > 0) active++;
    total += pts;
    cells.push({dk, pts});
  }
  return {total, active, days, cells};
}
function currentJalaliMonthPoints(){
  const [jy, jm] = jalaliOf(new Date());
  let total = 0;
  Object.keys(DATA.history).forEach(dk=>{
    const [y,m,d] = dk.split("-").map(Number);
    const [ djy, djm ] = gregorianToJalali(y,m,d);
    if(djy===jy && djm===jm) total += (DATA.history[dk]||[]).reduce((s,id)=>s+pointsOf(id),0);
  });
  return total;
}
function renderRecapCard(){
  const week = recapStats(7);
  const monthPts = currentJalaliMonthPoints();
  return `
    <div class="section-title">این هفته‌ت چطور بود؟</div>
    <div class="card" onclick="openRecapOverlay()" style="cursor:pointer;">
      <div class="row-between">
        <div><div style="font-size:var(--fs-28); font-weight:900; line-height:1.2;">${toFaDigits(week.total)} <span class="note" style="font-weight:600;">امتیاز</span></div>
        <div class="note">${toFaDigits(week.active)} از ۷ روز فعال · این ماه ${toFaDigits(monthPts)}</div></div>
        <span class="icon-btn" aria-label="اشتراک‌گذاری">${pi("share")}</span>
      </div>
    </div>
  `;
}
function openRecapOverlay(){
  const week = recapStats(7);
  const monthPts = currentJalaliMonthPoints();
  const jm = jalaliOf(new Date())[1];
  const weekPhotos = weekCheckinPhotos();
  openOverlay(`
    <h3>این هفته‌ت چطور بود؟</h3>
    <div class="card" style="text-align:center; margin-bottom:12px;">
      <div style="font-size:calc(30px * var(--font-scale)); font-weight:900; color:var(--gold);">${toFaDigits(week.total)}</div>
      <div class="note">امتیاز ۷ روز اخیر · ${toFaDigits(week.active)} روز فعال</div>
    </div>
    <div class="card" style="text-align:center; margin-bottom:16px;">
      <div style="font-size:calc(22px * var(--font-scale)); font-weight:900; color:var(--gold);">${toFaDigits(monthPts)}</div>
      <div class="note">امتیاز ${JALALI_MONTHS[jm-1]}</div>
    </div>
    <button class="btn btn-primary" style="width:100%; margin-bottom:10px;" id="recapShareBtn" onclick="shareRecap(this)">📤 اشتراک‌گذاری کارت امتیاز</button>
    ${weekPhotos.length ? `
    <button class="btn btn-primary" style="width:100%; margin-bottom:10px;" id="recapCollageBtn" onclick="shareWeekCollage(this)">🖼️ اشتراک‌گذاری کولاژ عکس‌های هفته (${toFaDigits(weekPhotos.length)} عکس)</button>
    ` : `
    <div class="note" style="text-align:center; margin-bottom:10px;">هنوز این هفته عکسی برای فعالیت‌هات ثبت نکردی — وقتی حداقل یه عکس یادگاری بذاری، اینجا می‌تونی از عکس‌های هفته کولاژ بسازی و به اشتراک بذاری.</div>
    `}
    <button class="btn btn-ghost" style="width:100%;" onclick="closeOverlay()">بازگشت</button>
  `);
}
// آخرین ۷ روز، عکس‌هایی که کاربر برای «یادگاری این لحظه»‌ی فعالیت‌ها ثبت کرده — برای کولاژ.
function weekCheckinPhotos(){
  const out = [];
  const today = new Date();
  for(let i=0; i<7; i++){
    const d = new Date(today); d.setDate(d.getDate()-i);
    const dk = todayKey(d);
    Object.entries(DATA.checkinMedia||{}).forEach(([key, m])=>{
      if(key.startsWith(dk+":") && m.photo) out.push({dk, photo:m.photo});
    });
  }
  return out;
}
async function shareRecap(btn){
  const original = btn ? btn.textContent : null;
  if(btn){ btn.textContent = "…"; btn.disabled = true; }
  try{
    const week = recapStats(7);
    const monthPts = currentJalaliMonthPoints();
    const blob = await renderRecapTemplateBlob({week, monthPts});
    await shareOrSaveFile(blob, "peleh-week.png", { title: "پله", text: "این هفته‌م با پله 🙂" });
  }catch(e){
    if(e && e.name !== "AbortError") console.error("share recap failed:", e);
  }finally{
    if(btn){ btn.textContent = original; btn.disabled = false; }
  }
}
async function renderRecapTemplateBlob({week, monthPts}){
  const W = 1080, H = 1350; // square-ish, works as a feed post too, not just a story
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");
  const bg = ctx.createLinearGradient(0,0,0,H);
  bg.addColorStop(0, pelehTok("--bg")); bg.addColorStop(1, pelehTok("--surface-2"));
  ctx.fillStyle = bg; ctx.fillRect(0,0,W,H);
  if(document.fonts && document.fonts.ready) await document.fonts.ready;
  ctx.direction = "rtl"; ctx.textAlign = "center";

  ctx.fillStyle = pelehTok("--gold");
  ctx.font = "900 46px Vazirmatn, sans-serif";
  ctx.fillText("این هفته‌ام با پله", W/2, 130);

  // Big weekly number
  ctx.fillStyle = pelehTok("--text");
  ctx.font = "900 160px Vazirmatn, sans-serif";
  ctx.fillText(String(week.total), W/2, 340);
  ctx.fillStyle = pelehTok("--muted");
  ctx.font = "500 34px Vazirmatn, sans-serif";
  ctx.fillText(`امتیاز · ${week.active} از ${week.days} روز فعال`, W/2, 400);

  // Mini 7-day heatmap strip
  const cell = 90, gap = 16;
  const stripW = week.cells.length*(cell+gap)-gap;
  const startX = (W-stripW)/2;
  const maxPts = Math.max(...week.cells.map(c=>c.pts), 1);
  week.cells.forEach((c,i)=>{
    const ratio = c.pts/maxPts;
    ctx.fillStyle = c.pts===0 ? pelehTok("--track")
      : ratio>0.75 ? pelehTok("--gold") : ratio>0.5 ? pelehTokA("--gold", .75) : ratio>0.25 ? pelehTokA("--gold", .5) : pelehTokA("--gold", .28);
    roundRectPath(ctx, startX+i*(cell+gap), 470, cell, cell, 16);
    ctx.fill();
  });

  // Monthly total card
  const cardY = 660, cardH = 340, cardX = 90, cardW = W-cardX*2;
  roundRectPath(ctx, cardX, cardY, cardW, cardH, 26);
  ctx.fillStyle = pelehTok("--text"); ctx.fill();
  ctx.fillStyle = pelehTok("--bg");
  ctx.font = "900 90px Vazirmatn, sans-serif";
  ctx.fillText(String(monthPts), W/2, cardY+170);
  ctx.font = "600 32px Vazirmatn, sans-serif";
  ctx.fillText("امتیاز این ماه", W/2, cardY+230);

  ctx.fillStyle = pelehTok("--gold");
  ctx.font = "900 50px Vazirmatn, sans-serif";
  ctx.fillText("پله", W/2, cardY+cardH+90);
  ctx.fillStyle = pelehTok("--muted");
  ctx.font = "500 28px Vazirmatn, sans-serif";
  ctx.fillText("هر روز، یک پله بالاتر", W/2, cardY+cardH+134);

  return new Promise(resolve => canvas.toBlob(resolve, "image/png", 0.95));
}

async function shareWeekCollage(btn){
  const original = btn ? btn.textContent : null;
  if(btn){ btn.textContent = "…"; btn.disabled = true; }
  try{
    const week = recapStats(7);
    const photos = weekCheckinPhotos();
    const blob = await renderWeekCollageBlob({week, photos});
    await shareOrSaveFile(blob, "peleh-collage.png", { title: "پله", text: "این هفته‌م با پله 🙂" });
  }catch(e){
    if(e && e.name !== "AbortError") console.error("share collage failed:", e);
  }finally{
    if(btn){ btn.textContent = original; btn.disabled = false; }
  }
}
// عکس‌هایی که کاربر تو ۷ روز اخیر برای فعالیت‌هاش ثبت کرده رو تو یه گرید کنار امتیاز هفته
// می‌ذاره — همون اطلاعاتی که تو کارت امتیاز هست (امتیاز هفته، روز فعال)، بعلاوه‌ی عکس‌ها.
async function renderWeekCollageBlob({week, photos}){
  const W = 1080, H = 1350;
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");
  const bg = ctx.createLinearGradient(0,0,0,H);
  bg.addColorStop(0, pelehTok("--bg")); bg.addColorStop(1, pelehTok("--surface-2"));
  ctx.fillStyle = bg; ctx.fillRect(0,0,W,H);
  if(document.fonts && document.fonts.ready) await document.fonts.ready;
  ctx.direction = "rtl"; ctx.textAlign = "center";

  ctx.fillStyle = pelehTok("--gold");
  ctx.font = "900 42px Vazirmatn, sans-serif";
  ctx.fillText("این هفته‌ام با پله", W/2, 96);
  ctx.fillStyle = pelehTok("--muted");
  ctx.font = "600 30px Vazirmatn, sans-serif";
  ctx.fillText(`${week.total} امتیاز · ${week.active} از ${week.days} روز فعال`, W/2, 142);

  // Photo grid — up to 6 photos, newest first, 2 columns.
  const shown = photos.slice(0, 6);
  const gridTop = 180, gridBottom = 1220, gap = 14, cols = 2;
  const rows = Math.ceil(shown.length/cols) || 1;
  const cellW = (W - 60*2 - gap*(cols-1)) / cols;
  const cellH = Math.min(360, (gridBottom - gridTop - gap*(rows-1)) / rows);
  for(let i=0; i<shown.length; i++){
    const col = i % cols, row = Math.floor(i/cols);
    const x = 60 + col*(cellW+gap), y = gridTop + row*(cellH+gap);
    await new Promise(res=>{
      const img = new Image();
      img.onload = ()=>{
        ctx.save();
        roundRectPath(ctx, x, y, cellW, cellH, 20);
        ctx.clip();
        // cover-fit
        const scale = Math.max(cellW/img.width, cellH/img.height);
        const dw = img.width*scale, dh = img.height*scale;
        ctx.drawImage(img, x + (cellW-dw)/2, y + (cellH-dh)/2, dw, dh);
        ctx.restore();
        res();
      };
      img.onerror = res; // یه عکس خراب نباید کل کولاژ رو بترکونه — فقط همون خونه خالی می‌مونه
      img.src = shown[i].photo;
    });
  }

  ctx.fillStyle = pelehTok("--gold");
  ctx.font = "900 44px Vazirmatn, sans-serif";
  ctx.fillText("پله", W/2, H-70);
  ctx.fillStyle = pelehTok("--muted");
  ctx.font = "500 26px Vazirmatn, sans-serif";
  ctx.fillText("هر روز، یک پله بالاتر", W/2, H-32);

  return new Promise(resolve => canvas.toBlob(resolve, "image/png", 0.95));
}

/* «تقویم» = انتخاب‌گر «هفته | ماه» (پیش‌فرض هفته) — «هفته» قبلاً تب جدا بود */
function renderCalendar(){
  return `
    <div class="page-title">تقویم</div>
    <div class="seg" role="group" aria-label="نمای تقویم" id="coach-cal-seg" style="margin-top:10px;">
      <button type="button" aria-pressed="${calView === "week"}" onclick="setCalView('week')">هفته</button>
      <button type="button" aria-pressed="${calView === "month"}" onclick="setCalView('month')">ماه</button>
    </div>
    ${calView === "month" ? renderCalendarMonth() : renderWeekly()}`;
}
function renderCalendarMonth(){
  ensureCalState();
  const {jy, jm} = calState;
  const monthLen = jalaliMonthLength(jy, jm);
  const [firstGy, firstGm, firstGd] = jalaliToGregorian(jy, jm, 1);
  const firstDate = new Date(firstGy, firstGm-1, firstGd);
  const startOffset = WEEK_ORDER.indexOf(dayKeyOf(firstDate));
  const todayDk = todayKey(new Date());

  let monthTotal = 0, activeDays = 0, bestDay = {points:0, label:""};
  const cells = [];
  const dayPoints = []; // for the progress chart
  const monthEvents = []; // for the at-a-glance list (user events + holidays + occasions)
  for(let i=0;i<startOffset;i++) cells.push(`<div class="cal-cell empty"></div>`);
  for(let d=1; d<=monthLen; d++){
    const [gy,gm,gd] = jalaliToGregorian(jy, jm, d);
    const dObj = new Date(gy, gm-1, gd);
    const dk = todayKey(dObj);
    const ids = DATA.history[dk] || [];
    const pts = ids.reduce((s,id)=>s+pointsOf(id), 0);
    const isToday = dk === todayDk;
    const evs = eventsFor(dk);
    const isBirthday = evs.some(e => String(e.id).startsWith("birthday_"));
    const holiday = officialHolidayFor(jy, jm, d);
    const occasions = notableOccasionsFor(jy, jm, d);
    dayPoints.push(pts);
    if(pts > 0){
      monthTotal += pts; activeDays += 1;
      if(pts > bestDay.points) bestDay = {points:pts, label: `${toFaDigits(d)} ${JALALI_MONTHS[jm-1]}`};
    }
    evs.forEach(e => monthEvents.push({day:d, title:e.title, kind:"event"}));
    if(holiday) monthEvents.push({day:d, title:`تعطیل رسمی: ${holiday.label}`, kind:"holiday"});
    occasions.forEach(o => monthEvents.push({day:d, title:o.label, kind:"occasion"}));
    cells.push(`
      <div class="cal-cell ${pts>0?'has-points':''} ${isToday?'today':''} ${holiday?'holiday':''}" onclick="openDayDetail('${dk}')">
        ${isBirthday ? `<span class="bday">${pi("cake")}</span>` : ``}
        ${toFaDigits(d)}
        ${pts>0?`<span class="dot pts-dot"></span>`:""}
        ${evs.length?`<span class="dot event-dot"></span>`:""}
        ${(!holiday && occasions.length)?`<span class="dot occasion-dot"></span>`:""}
      </div>`);
  }
  const avg = activeDays ? Math.round(monthTotal/activeDays) : 0;
  const dowRow = WEEK_ORDER.map(k=>`<div class="cal-dow">${DAY_LABELS[k].slice(0,1)}</div>`).join("");

  const maxPts = Math.max(...dayPoints, 1);
  const chartW = 300, chartH = 70, barGap = 2;
  const barW = (chartW - (monthLen-1)*barGap) / monthLen;
  const bars = dayPoints.map((p,i)=>{
    const h = Math.max((p/maxPts)*chartH, p>0?3:1);
    const x = i*(barW+barGap);
    const y = chartH - h;
    const isToday = (i+1) === Number(todayKey(new Date()).split("-")[2]) && jy===jalaliOf(new Date())[0] && jm===jalaliOf(new Date())[1];
    return `<rect class="mbar ${p>0?(isToday?'today':'on'):''}" x="${x}" y="${y}" width="${barW}" height="${h}" rx="1.5"/>`;
  }).join("");

  monthEvents.sort((a,b)=>a.day-b.day);
  const eventsListHtml = monthEvents.length ? monthEvents.map(e=>`
    <div class="event-row ${e.kind}">
      <div class="event-day">${toFaDigits(e.day)}</div>
      <div class="event-title">${e.title}</div>
    </div>`).join("") : `<div class="empty">مناسبتی برای این ماه ثبت نشده</div>`;

  return `
    <div class="calendar-grid">
    <div class="tile tile-recap" data-tile-id="recap">
    ${renderRecapCard()}
    </div>

    <div class="tile tile-heatmap" data-tile-id="heatmap">
    <div class="section-title">روند ۲۰ هفته‌ی اخیر</div>
    <div class="card">
      ${renderActivityHeatmapBlock(20)}
    </div>
    </div>

    <div class="tile tile-cal" data-tile-id="cal">
        <div class="card">
      <div class="cal-nav">
        <button class="cal-nav-btn" onclick="shiftCalMonth(-1)" aria-label="ماه قبل">${ICONS.chevronRight}</button>
        <div class="cal-title">${JALALI_MONTHS[jm-1]} ${toFaDigits(jy)}</div>
        <button class="cal-nav-btn" onclick="shiftCalMonth(1)" aria-label="ماه بعد">${ICONS.chevronLeft}</button>
      </div>
      <div class="cal-grid" id="coach-calendar-grid">${dowRow}${cells.join("")}</div>
      <div class="cal-legend">
        <span><span class="legend-dot l-active"></span> روز فعال</span>
        <span><span class="legend-dot l-event"></span> مناسبت شخصی</span>
        <span><span class="legend-dot l-holiday"></span> تعطیل رسمی</span>
        <span><span class="legend-dot l-occasion"></span> مناسبت</span>
      </div>
    </div>
    </div>

    <div class="tile tile-chart" data-tile-id="chart">
    <div class="section-title">روزهای این ماه</div>
    <div class="card">
      <svg viewBox="0 0 ${chartW} ${chartH}" width="100%" height="70" preserveAspectRatio="none">${bars}</svg>
    </div>
    </div>

    <div class="tile tile-stats" data-tile-id="stats">
    <div class="section-title">آمار همین ماه</div>
    <div class="card">
      <div class="stat-grid">
        <div class="stat-box"><div class="stat-num">${toFaDigits(monthTotal)}</div><div class="stat-lbl">جمع امتیاز</div></div>
        <div class="stat-box"><div class="stat-num">${toFaDigits(activeDays)}</div><div class="stat-lbl">روز فعال</div></div>
        <div class="stat-box"><div class="stat-num">${toFaDigits(avg)}</div><div class="stat-lbl">میانگین روز</div></div>
      </div>
      ${bestDay.points>0 ? `<div class="note" style="margin-top:14px;">بهترین روز: <b style="color:var(--text);">${bestDay.label}</b> · ${toFaDigits(bestDay.points)} امتیاز</div>` : ``}
    </div>
    </div>

    <div class="tile tile-events" data-tile-id="events">
    <div class="section-title">مناسبت‌های این ماه</div>
    <div class="card">${eventsListHtml}</div>
    </div>
    </div>
  `;
}

function openDayDetail(dateKey){
  const [y,m,d] = dateKey.split("-").map(Number);
  const dObj = new Date(y, m-1, d);
  const ids = DATA.history[dateKey] || [];
  const pts = ids.reduce((s,id)=>s+pointsOf(id), 0);
  const doneActs = DATA.activities.filter(a=>ids.includes(a.id));
  const mood = moodFor(dateKey);
  const extra = dailyExtraFor(dateKey);
  const evs = eventsFor(dateKey);
  const [jyD, jmD, jdD] = jalaliOf(dObj);
  const dayHoliday = officialHolidayFor(jyD, jmD, jdD);
  const dayOccasions = notableOccasionsFor(jyD, jmD, jdD);
  const memories = Object.entries(DATA.checkinMedia || {}).filter(([k]) => k.startsWith(dateKey+":"));

  openOverlay(`
    <h3>${jalaliDateLabel(dObj)} — ${DAY_LABELS[dayKeyOf(dObj)]}</h3>
    ${dayHoliday ? `<div class="day-flag"><b style="color:var(--danger);">تعطیل رسمی:</b> ${dayHoliday.label}</div>` : ``}
    ${dayOccasions.length ? `<div class="day-flag occasion">${dayOccasions.map(o=>o.label).join("<br>")}</div>` : ``}

    <div class="field">
      <label>مناسبت‌های این روز</label>
      <div class="card" style="padding:10px 14px;">
        ${evs.length ? evs.map(e=>`
          <div class="event-row" style="border-bottom:1px solid var(--line); padding:8px 0;">
            ${String(e.id).startsWith("book_") ? `<span class="act-icon">${pi("book")}</span>` : `<button class="icon-btn" aria-label="حذف" onclick="deleteEvent('${dateKey}','${e.id}'); renderAll(); openDayDetail('${dateKey}');">${ICONS.trash}</button>`}
            <div class="event-title" style="flex:1;">${e.title}</div>
          </div>`).join("") : `<div class="empty" style="padding:10px 0;">مناسبتی ثبت نشده</div>`}
        <div style="display:flex; gap:8px; margin-top:10px;">
          <button class="btn btn-primary" style="flex:none; padding:9px 14px; font-size:calc(12px * var(--font-scale));" onclick="const v=document.getElementById('newEventInput').value; addEvent('${dateKey}', v); renderAll(); openDayDetail('${dateKey}');">افزودن</button>
          <input type="text" id="newEventInput" class="goal-input" placeholder="مثلاً: تولد رضا">
        </div>
      </div>
    </div>

    <div class="card" style="text-align:center; margin-bottom:14px;">
      <div style="font-size:var(--fs-36); font-weight:900;">${toFaDigits(pts)}</div>
      <div style="font-size:calc(11px * var(--font-scale)); color:var(--muted);">امتیاز این روز</div>
    </div>
    ${memories.length ? `
      <div class="field"><label>📸 یادگاری‌های این روز</label>
        ${memories.map(([k,mm])=>{
          const activityId = k.split(":")[1];
          const src = DATA.activities.find(a=>a.id===activityId) || dailyExtraFor(dateKey).tasks.find(t=>t.id===activityId);
          return `
          <div class="card" style="padding:14px; margin-bottom:10px;">
            ${mm.photo ? `<div class="memory-photo" style="margin-bottom:${mm.note?'10px':'0'};"><img src="${mm.photo}" alt="" style="width:100%; display:block; max-height:340px; object-fit:cover;"></div>` : ``}
            ${mm.note ? `<div style="font-size:calc(12.5px * var(--font-scale)); text-align:center; color:var(--muted);">${mm.note}</div>` : ``}
            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:10px;">
              <div style="font-size:calc(11px * var(--font-scale)); color:var(--muted);">${src ? (src.title || src.text) : ""}</div>
              ${mm.photo ? `<button class="btn btn-ghost" style="padding:6px 14px; font-size:calc(11.5px * var(--font-scale));" onclick="shareMemory('${dateKey}','${activityId}', this)">📤 اشتراک‌گذاری</button>` : ``}
            </div>
          </div>`;
        }).join("")}
      </div>` : ``}
    ${doneActs.length ? `
      <div class="field"><label>فعالیت‌های انجام‌شده</label>
        <div class="card" style="padding:10px 14px;">
          ${doneActs.map(a=>`<div style="font-size:calc(12.5px * var(--font-scale)); padding:4px 0; text-align:right;">• ${a.title} (+${a.points})</div>`).join("")}
        </div>
      </div>` : `<div class="empty">اون روز کاری ثبت نشده</div>`}
    ${mood.emoji || mood.text ? `
      <div class="field"><label>حال اون روز</label>
        <div class="card" style="padding:12px 14px; text-align:right;">
          ${mood.emoji ? `<div style="font-size:calc(22px * var(--font-scale)); margin-bottom:6px;">${mood.emoji}</div>` : ``}
          ${mood.text ? `<div style="font-size:calc(12.5px * var(--font-scale)); color:var(--muted);">${mood.text}</div>` : ``}
        </div>
      </div>` : ``}
    ${extra.goal ? `<div class="field"><label>هدف اون روز</label><div class="card" style="padding:10px 14px; font-size:calc(12.5px * var(--font-scale)); text-align:right;">${extra.goal}</div></div>` : ``}
    ${extra.tasks.length ? `
      <div class="field"><label>کارهای اون روز</label>
        <div class="card" style="padding:10px 14px;">
          ${extra.tasks.map(t=>`<div style="font-size:var(--fs-14); padding:5px 0; display:flex; align-items:center; gap:8px; ${t.done?'color:var(--muted);':''}">${pi(t.done ? "checkCircle" : "circle", t.done ? "pi-gold" : "pi-muted")}${t.starred ? pi("star","pi-fill pi-gold") : ""} ${t.text}</div>`).join("")}
        </div>
      </div>` : ``}
    ${(extra.notes.ideas.length||extra.notes.quick.length||extra.notes.important.length||extra.notes.tomorrow.length) ? `
      <div class="field"><label>یادداشت‌های اون روز</label>
        <div class="card" style="padding:10px 14px;">
          ${[...extra.notes.ideas, ...extra.notes.quick, ...extra.notes.important, ...extra.notes.tomorrow].map(n=>`<div style="font-size:calc(12.5px * var(--font-scale)); padding:4px 0; text-align:right;">• ${n}</div>`).join("")}
        </div>
      </div>` : ``}
    ${(extra.goalActions.short.length||extra.goalActions.medium.length||extra.goalActions.long.length) ? `
      <div class="field"><label>اقدام‌های اون روز برای اهداف</label>
        <div class="card" style="padding:10px 14px;">
          ${[...extra.goalActions.short, ...extra.goalActions.medium, ...extra.goalActions.long].map(n=>`<div style="font-size:calc(12.5px * var(--font-scale)); padding:4px 0; text-align:right;">• ${n}</div>`).join("")}
        </div>
      </div>` : ``}
    <div class="sheet-actions">
      <button class="btn btn-primary" onclick="closeOverlay()">بستن</button>
    </div>
  `);
}

/* ===================== Weekly tab ===================== */

function ensureWeekState(){
  if(!weekState) weekState = saturdayOf(new Date());
}
function shiftWeek(deltaDays){
  ensureWeekState();
  const d = new Date(weekState);
  d.setDate(d.getDate() + deltaDays);
  weekState = d;
  renderAll();
}

function renderWeekly(){
  ensureWeekState();
  const start = weekState;
  const wk = weekKeyOf(start);
  const w = weeklyFor(wk);
  const todayDk = todayKey(new Date());

  const days = [];
  for(let i=0;i<7;i++){
    const d = new Date(start);
    d.setDate(d.getDate()+i);
    days.push(d);
  }
  let weekTotal = 0;
  const dayRows = days.map(d=>{
    const dkey = todayKey(d);
    const wkkey = dayKeyOf(d);
    const pts = todayPoints(d);
    weekTotal += pts;
    const mx = Math.max(maxPointsFor(wkkey), 1);
    const pct = Math.min(pts/mx*100, 100);
    const isToday = dkey === todayDk;
    return `
    <div class="week-bar-row">
      <div class="week-bar-pts">${toFaDigits(pts)}</div>
      <div class="pbar-track" style="flex:1;"><div class="pbar-fill" style="width:${pct}%"></div></div>
      <div class="week-bar-day ${isToday?'today':''}">${DAY_LABELS[wkkey]}</div>
    </div>`;
  }).join("");

  const endLabel = jalaliDateLabel(days[6]);
  const startLabel = jalaliDateLabel(days[0]);

  return `
    <div class="weekly-grid">
    <div class="tile tile-overview" data-tile-id="overview">
    <div class="card hero-card" style="gap:12px;">
      <div class="cal-nav" style="margin-bottom:0;">
        <button class="cal-nav-btn" onclick="shiftWeek(-7)" aria-label="هفته‌ی قبل">${ICONS.chevronRight}</button>
        <div class="cal-title" style="font-size:var(--fs-14);">${startLabel} تا ${endLabel}</div>
        <button class="cal-nav-btn" onclick="shiftWeek(7)" aria-label="هفته‌ی بعد">${ICONS.chevronLeft}</button>
      </div>
      <div style="text-align:center;"><span class="xp-badge">${toFaDigits(weekTotal)} <small>امتیاز این هفته</small></span></div>
      ${renderWeekStairs({ start: days[0], title: false, onclick: false })}
      <div>${dayRows}</div>
    </div>
    </div>

    <div class="tile tile-goal" data-tile-id="goal">
    <div class="section-title">هدف این هفته</div>
    <div class="card">
      <input type="text" class="goal-input" value="${(w.goal||"").replace(/"/g,'&quot;')}" placeholder="هدف اصلی این هفته" onchange="saveWeekly('${wk}', {goal:this.value})">
    </div>
    </div>

    <div class="tile tile-review" data-tile-id="review">
    <div class="section-title">مرور آخر هفته</div>
    <div class="card">
      <div class="note-field"><label>این هفته چه کارهایی انجام دادم؟</label><textarea onchange="saveWeekly('${wk}', {review:Object.assign(weeklyFor('${wk}').review,{done:this.value})})">${w.review.done}</textarea></div>
      <div class="note-field"><label>چه چیزی عقب افتاد؟</label><textarea onchange="saveWeekly('${wk}', {review:Object.assign(weeklyFor('${wk}').review,{delayed:this.value})})">${w.review.delayed}</textarea></div>
      <div class="note-field"><label>بزرگ‌ترین دستاورد؟</label><textarea onchange="saveWeekly('${wk}', {review:Object.assign(weeklyFor('${wk}').review,{achievement:this.value})})">${w.review.achievement}</textarea></div>
      <div class="note-field"><label>چه چیزی وقتم رو گرفت؟</label><textarea onchange="saveWeekly('${wk}', {review:Object.assign(weeklyFor('${wk}').review,{timeSink:this.value})})">${w.review.timeSink}</textarea></div>
      <div class="note-field" style="margin-bottom:0;"><label>هفته بعد روی چی تمرکز کنم؟</label><textarea onchange="saveWeekly('${wk}', {review:Object.assign(weeklyFor('${wk}').review,{nextFocus:this.value})})">${w.review.nextFocus}</textarea></div>
    </div>
    </div>
    </div>
  `;
}

/* ---- Settings: name is behind a plain edit-gate (just to stop accidental edits); phone
   requires a full OTP re-verification before the new number is ever saved. ---- */
let editingName = false;
let editingPhone = false;
let settingsPhoneOtpSent = false;
let settingsPhoneDraft = ""; // what was typed, so an error message doesn't wipe the field
let settingsPhoneError = ""; // قبلاً پیام خطا مستقیم تو DOM نوشته می‌شد و renderAll() بلافاصله پاکش می‌کرد
let settingsPendingPhone = ""; // همون دلیل obPendingPhone: بعد از ارسال کد، renderAll() اینپوت
// رو دوباره از meta.phone (شماره‌ی قدیمیِ ذخیره‌شده) پر می‌کنه، نه شماره‌ی جدیدی که کد براش رفته

async function saveSettingsName(){
  const val = document.getElementById('settings_name_input').value.trim();
  if(!val){ alert("اسم نمی‌تونه خالی باشه."); return; }
  const prev = profileMeta.name;
  const ok = await saveProfileInfo({name: val});
  if(!ok){ profileMeta.name = prev; alert("ذخیره نشد — اینترنتت رو چک کن و دوباره امتحان کن."); return; }
  editingName = false;
  renderAll();
}

async function sendSettingsPhoneOtp(){
  if(otpCooldownRemaining('settings_phone') > 0) return;
  const rawPhone = document.getElementById('settings_phone_input').value;
  settingsPhoneDraft = rawPhone.trim();
  const phone = normalizeIranMobile(rawPhone);
  settingsPhoneError = "";
  if(!phone){ settingsPhoneError = looksInternationalPhone(rawPhone) ? "پیامک پله فعلاً فقط به شماره‌های ایران می‌رسه؛ شماره‌ی خارجی رو نمی‌شه تأیید کرد." : PHONE_INVALID_MSG; renderAll(); return; }
  if(phone === profileMeta.phone && profileMeta.phoneVerified){ settingsPhoneError = "این همون شماره‌ی فعلیته."; renderAll(); return; }
  lockButton('btn_settings_phone_verify', 'در حال ارسال...');
  try{
    const { data, error } = await invokeEdge('send-otp', { body: { mobile: phone } });
    if(error || !data?.success){
      settingsPhoneError = data?.error || "ارسال پیامک ناموفق بود.";
      if(data?.retryAfter) startResendCooldown('settings_phone', data.retryAfter);
      renderAll(); return;
    }
    settingsPendingPhone = phone;
    settingsPhoneOtpSent = true;
    startResendCooldown('settings_phone');
    renderAll();
  }catch(e){
    settingsPhoneError = NET_ERROR_MSG;
    renderAll();
  }
}
async function verifySettingsPhoneOtp(){
  const phone = settingsPendingPhone || normalizeIranMobile(document.getElementById('settings_phone_input').value);
  const code = onlyDigits(document.getElementById('settings_phone_otp').value);
  settingsPhoneError = "";
  if(code.length !== 4){ settingsPhoneError = "کد ۴ رقمی رو کامل وارد کن."; renderAll(); return; }
  lockButton('btn_settings_phone_otp', 'در حال بررسی...');
  try{
    const { data, error } = await invokeEdge('verify-otp', { body: { mobile: phone, code, purpose: 'verify_only' } });
    if(error || !data?.success){ settingsPhoneError = data?.error || "کد اشتباهه یا منقضی شده."; renderAll(); return; }
    const prevPhone = profileMeta.phone, prevVerified = profileMeta.phoneVerified;
    const ok = await saveProfileInfo({phone, phoneVerified: true});
    if(!ok){ profileMeta.phone = prevPhone; profileMeta.phoneVerified = prevVerified; settingsPhoneError = "شماره تأیید شد ولی ذخیره نشد — دوباره امتحان کن."; renderAll(); return; }
    editingPhone = false;
    settingsPhoneOtpSent = false;
    settingsPendingPhone = "";
    settingsPhoneDraft = "";
    renderAll();
  }catch(e){
    settingsPhoneError = NET_ERROR_MSG;
    renderAll();
  }
}

function renderSettings(){
  const s = DATA.settings;
  const meta = currentProfileMeta();
  const currentThemeId = getTheme();
  const lvl = currentLevel();
  const themeBtn = (t) => {
    const locked = t.unlockLevel && lvl.level < t.unlockLevel;
    return `
      <button class="theme-opt ${currentThemeId===t.id?'on':''}" style="${locked?'opacity:.55;':''}" aria-pressed="${currentThemeId===t.id}" onclick="${locked ? `openThemePreview('${t.id}')` : `setTheme('${t.id}')`}">
        ${locked ? `<span class="theme-lock">${pi("lock")}</span>` : ``}
        <span class="theme-swatch theme-scope theme-${t.id}"><span class="sw-bg"></span><span class="sw-gold"></span><span class="sw-text"></span></span>
        <span class="theme-name">${locked ? `سطح ${toFaDigits(t.unlockLevel)}` : t.label}</span>
      </button>
    `;
  };
  return `
    <div class="section-title" style="margin-top:6px;">تم رنگی (همیشه رایگان)</div>
    <div class="card">
      <div class="theme-grid">${THEMES.map(themeBtn).join("")}</div>
    </div>

    <div class="section-title">تم‌های ویژه — با سطح باز می‌شن</div>
    <div class="card">
      <div class="row-between" style="margin-bottom:12px;">
        <div style="font-size:var(--fs-13); color:var(--muted);">${toFaDigits(lvl.pts)} امتیاز</div>
        <div style="font-weight:800; font-size:var(--fs-15);">سطح ${toFaDigits(lvl.level)}</div>
      </div>
      <div class="pbar-track" style="margin-bottom:14px;"><div class="pbar-fill" style="width:${Math.round(lvl.ratio*100)}%"></div></div>
      <div class="theme-grid">${LEVEL_THEMES.map(themeBtn).join("")}</div>
      <div class="note" style="margin-top:12px;">برای پیش‌نمایش، روی تم قفل بزن.</div>
    </div>

    ${renderReminderSettingsCard()}
    ${typeof renderSmartNotifySettingsCard === "function" ? renderSmartNotifySettingsCard() : ""}

    <div class="section-title">اندازه‌ی فونت</div>
    <div class="card">
      <div class="theme-grid" style="grid-template-columns:repeat(4,1fr);">
        ${FONT_SCALES.map(f => `
          <button class="theme-opt ${getFontScale()===f.value?'on':''}" onclick="setFontScale(${f.value})" style="padding:12px 4px;">
            <span style="font-size:${16*f.value}px; font-weight:900;">آ</span>
            <span class="theme-name">${f.label}</span>
          </button>
        `).join("")}
      </div>
    </div>

    <div class="section-title">پروفایل</div>
    <div class="card" style="text-align:center;">
      <div class="avatar avatar-lg" style="margin:0 auto 12px;" onclick="triggerPhotoPicker()">${meta.photo ? `<img src="${meta.photo}">` : "🙂"}</div>
      <button class="btn btn-ghost" style="padding:8px 14px; font-size:calc(12px * var(--font-scale)); display:inline-flex; align-items:center; gap:6px; margin-bottom:16px;" onclick="triggerPhotoPicker()">${ICONS.camera} تغییر عکس</button>
      <div class="field">
        <label>نام و نام‌خانوادگی</label>
        ${editingName ? `
          <div style="display:flex; gap:8px;">
            <input type="text" id="settings_name_input" class="goal-input" value="${escapeHtml(meta.name)}" style="flex:1;">
            <button class="btn btn-primary" style="white-space:nowrap; padding:0 14px;" onclick="saveSettingsName()">ذخیره</button>
          </div>
        ` : `
          <div style="display:flex; gap:8px; align-items:center; justify-content:space-between;">
            <div style="font-size:calc(13.5px * var(--font-scale));">${escapeHtml(meta.name || '—')}</div>
            <button class="btn btn-ghost" style="padding:6px 12px; font-size:calc(11.5px * var(--font-scale)); white-space:nowrap;" onclick="editingName=true; renderAll();">✏️ ویرایش</button>
          </div>
        `}
      </div>
      <div class="field" style="margin-bottom:0;">
        <label>تاریخ تولد</label>
        ${dateField("set_birthdate", meta.birthdate||"", "saveProfileInfo({birthdate:this.value}); renderAll();")}
      </div>
      <div class="field" style="margin-bottom:0; margin-top:14px;">
        <label>شماره موبایل</label>
        ${editingPhone ? `
          <div style="display:flex; gap:8px;">
            <input type="tel" id="settings_phone_input" class="goal-input" placeholder="09xxxxxxxxx" style="direction:ltr; text-align:left; flex:1;" value="${escapeHtml((settingsPhoneOtpSent && settingsPendingPhone) ? settingsPendingPhone : (settingsPhoneDraft || meta.phone || ''))}" onkeydown="onAuthEnter(event,'sendSettingsPhoneOtp')">
            <button class="btn btn-ghost" id="btn_settings_phone_verify" data-otp-family="settings_phone" style="white-space:nowrap; padding:0 14px;" onclick="sendSettingsPhoneOtp()">تایید شماره جدید</button>
          </div>
          ${settingsPhoneOtpSent ? `
            <div style="margin-top:10px;">
              <label>کد ۴ رقمی</label>
              <div style="display:flex; gap:8px;">
                <input type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="4" id="settings_phone_otp" class="goal-input" placeholder="----" style="direction:ltr; text-align:center; letter-spacing:10px; flex:1;" onkeydown="onAuthEnter(event,'verifySettingsPhoneOtp')">
                <button id="btn_settings_phone_otp" class="btn btn-primary" style="white-space:nowrap; padding:0 14px;" onclick="verifySettingsPhoneOtp()">ثبت شماره</button>
              </div>
            </div>
          ` : ``}
          <div class="field-error" id="settings_phone_error">${escapeHtml(settingsPhoneError)}</div>
          <div style="text-align:left; margin-top:6px;"><button style="color:var(--muted); text-decoration:underline; font-size:calc(11px * var(--font-scale));" onclick="editingPhone=false; settingsPhoneOtpSent=false; settingsPendingPhone=''; settingsPhoneDraft=''; settingsPhoneError=''; renderAll();">انصراف</button></div>
        ` : `
          <div style="display:flex; gap:8px; align-items:center; justify-content:space-between;">
            <div dir="ltr" style="font-size:calc(13.5px * var(--font-scale));">${escapeHtml(meta.phone || '—')}</div>
            <button class="btn btn-ghost" style="padding:6px 12px; font-size:calc(11.5px * var(--font-scale)); white-space:nowrap;" onclick="editingPhone=true; renderAll();">تغییر شماره</button>
          </div>
        `}
      </div>
    </div>

    <div class="section-title">حساب</div>
    <div class="card">
      <div class="note" style="margin-bottom:12px;">وارد شدی با: <b style="color:var(--gold); direction:ltr; display:inline-block;">${escapeHtml(accountLoginLabel())}</b><br>دیتات خودکار با این حساب سینک می‌شه — رو هر دستگاهی وارد بشی، همینو می‌بینی.</div>
      <button class="btn btn-danger" style="width:100%; padding:11px;" onclick="signOutUser()">خروج از حساب</button>
    </div>

    <div class="section-title">بخش‌های صفحه امروز</div>
    <div class="note" style="padding:0 4px 8px;">اهداف کوتاه/میان/بلندمدت رو از رو کارت پروفایل بالای صفحه‌ی امروز باز می‌کنی.</div>
    <div class="card">
      ${sectionToggleRows()}
      <div class="note" style="margin-top:12px;">هر بخشی رو نخوای، خاموشش کن تا صفحه‌ی امروز کوتاه‌تر و مرتب‌تر بشه.</div>
    </div>

    ${isNativeApp() ? `` : `
    <div class="section-title">چیدمان کاشی‌های دسکتاپ</div>
    <div class="card">
      <div class="row-between">
        <div style="font-size:calc(12.5px * var(--font-scale)); color:var(--muted);">اگه با درگ‌کردن کاشی‌ها تو دسکتاپ چیدمانت به‌هم ریخت، از اینجا برش‌گردون به حالت پیش‌فرض.</div>
        <button class="btn btn-ghost" style="white-space:nowrap; padding:8px 14px;" onclick="if(confirm('چیدمان دسکتاپ همه‌ی تب‌ها به حالت پیش‌فرض برگرده؟')){ DATA.settings.puzzleLayout={}; save(); renderAll(); }">بازنشانی چیدمان</button>
      </div>
    </div>
    `}

    <div class="section-title">علاقه‌مندی‌ها و برنامه‌ی کاری</div>
    <div class="card" onclick="renderWorkProfileStep()" style="cursor:pointer;">
      <div class="row-between">
        <div style="font-size:calc(13px * var(--font-scale)); color:var(--muted);">وضعیت شغلی، ساعت کاری، تفریحات — برای پیشنهادهای دقیق‌تر</div>
        <div style="font-weight:700; font-size:calc(14px * var(--font-scale));">✏️ ویرایش</div>
      </div>
    </div>

    ${isNativeApp() ? `<div class="note" style="padding:0 4px; margin:-4px 0 12px;">منبع اجرای اپ: ${escapeHtml(nativeWebSourceLabel())}${nativeAppVersion ? ` · نسخه ${escapeHtml(nativeAppVersion)}` : ``}</div>` : ``}

    <div class="section-title">آموزش</div>
    <div class="card" onclick="DATA.seenCoach={}; save(); switchTab('today');" style="cursor:pointer;">
      <div class="row-between">
        <div style="font-size:calc(13px * var(--font-scale)); color:var(--muted);">دوباره راهنمای شروع رو ببین</div>
        <div style="font-weight:700; font-size:calc(14px * var(--font-scale));">آموزش قدم‌به‌قدم</div>
      </div>
    </div>
    <div class="card" style="margin-top:8px;" onclick="DATA.seenTips={}; save(); renderAll();">
      <div class="row-between">
        <div style="font-size:calc(13px * var(--font-scale)); color:var(--muted);">نکته‌های راهنمایی که قبلاً بسته کردی، دوباره نشون داده می‌شن</div>
        <div style="font-weight:700; font-size:calc(14px * var(--font-scale));">💡 نمایش دوباره‌ی نکته‌ها</div>
      </div>
    </div>

    ${isNativeApp() ? `` : `
    <div class="section-title">نصب رو صفحه اصلی</div>
    <div class="card">
      <div class="row-between" style="margin-bottom:14px;">
        <div style="display:flex; gap:6px;">
          <button class="day-toggle ${installTab!=='android'?'on':''}" onclick="installTab='ios'; renderAll();">آیفون</button>
          <button class="day-toggle ${installTab==='android'?'on':''}" onclick="installTab='android'; renderAll();">اندروید</button>
        </div>
        <div style="font-weight:700; font-size:calc(13px * var(--font-scale));">راهنمای نصب</div>
      </div>
      ${installTab==='android' ? `
      <div class="step">
        <div class="step-num">۱</div>
        <div class="step-body"><div class="step-title">این صفحه رو تو Chrome باز کن</div>
        <div class="step-desc">مرورگر کروم گوگل، نه مرورگرهای دیگه.</div></div>
      </div>
      <div class="step">
        <div class="step-num">۲</div>
        <div class="step-body"><div class="step-title">رو سه‌نقطه‌ی بالا سمت راست بزن</div>
        <div class="step-desc">منوی کروم باز می‌شه.</div></div>
      </div>
      <div class="step">
        <div class="step-num">۳</div>
        <div class="step-body"><div class="step-title">«Install app» یا «افزودن به صفحه اصلی» رو بزن</div>
        <div class="step-desc">کروم معمولاً خودش هم یه پیشنهاد نصب پایین صفحه نشون می‌ده — می‌تونی همونو هم بزنی.</div></div>
      </div>
      ` : `
      <div class="step">
        <div class="step-num">۱</div>
        <div class="step-body"><div class="step-title">این صفحه رو تو Safari باز کن</div>
        <div class="step-desc">حتماً Safari — مرورگرهای دیگه تو آیفون این قابلیت رو ندارن.</div></div>
      </div>
      <div class="step">
        <div class="step-num">۲</div>
        <div class="step-body"><div class="step-title">دکمه‌ی Share رو بزن</div>
        <div class="step-desc">همون آیکون مربع با فلش رو به بالا، پایین صفحه.</div></div>
      </div>
      <div class="step">
        <div class="step-num">۳</div>
        <div class="step-body"><div class="step-title">«Add to Home Screen» رو انتخاب کن</div>
        <div class="step-desc">از این به بعد «پله» یه آیکون مستقل رو صفحه اصلیته، بدون نوار آدرس، دقیقاً مثل یه اپ.</div></div>
      </div>
      `}
      <div class="note" style="margin-top:6px;">توجه: وب‌اپ‌ها نمی‌تونن ویجت روی صفحه اصلی داشته باشن — این قابلیت فقط مخصوص اپ‌های نصب‌شده از استورهای رسمیه.</div>
    </div>
    `}

    <div class="section-title">داده‌ها و هماهنگ‌سازی</div>
    <div class="card">
      <div class="note" style="margin-bottom:14px;">اطلاعاتت خودکار روی حسابت ذخیره می‌شه و رو هر دستگاهی که با همین حساب وارد بشی در دسترسه. فایل پشتیبان فقط یه نسخه‌ی اضافه‌ی احتیاطیه که می‌تونی تو گوشیت ذخیره کنی یا تو تلگرام برای خودت بفرستی.</div>
      <div class="row-between" style="margin-bottom:14px;">
        <div style="font-size:calc(13px * var(--font-scale));">پشتیبان‌گیری (ذخیره‌ی فایل)</div>
        <button class="btn btn-ghost" style="flex:none; padding:9px 16px; font-size:calc(12.5px * var(--font-scale));" onclick="exportData()">ذخیره</button>
      </div>
      <div class="row-between" style="margin-bottom:14px;">
        <div style="font-size:calc(13px * var(--font-scale));">بازیابی از فایل پشتیبان</div>
        <button class="btn btn-ghost" style="flex:none; padding:9px 16px; font-size:calc(12.5px * var(--font-scale));" onclick="triggerImportPicker()">بازیابی</button>
        <input type="file" id="importInput" accept="application/json,.json" style="display:none" onchange="onImportSelected(this)">
      </div>
      <div class="row-between">
        <div style="font-size:calc(13px * var(--font-scale));">شروع از اول (پاک کردن همه‌چیز)</div>
        <button class="btn btn-danger" style="flex:none; padding:9px 16px; font-size:calc(12.5px * var(--font-scale));" onclick="resetAll()">پاک‌سازی</button>
      </div>
      <div class="row-between">
        <div style="font-size:calc(13px * var(--font-scale));">حذف کامل حساب کاربری</div>
        <button class="btn btn-danger" style="flex:none; padding:9px 16px; font-size:calc(12.5px * var(--font-scale));" onclick="requestAccountDeletion()">حذف حساب</button>
      </div>
      <div class="row-between">
        <div style="font-size:calc(13px * var(--font-scale));">سیاست حریم خصوصی</div>
        <button class="btn btn-ghost" style="flex:none; padding:9px 16px; font-size:calc(12.5px * var(--font-scale));" onclick="openPrivacyPolicy()">مشاهده</button>
      </div>
    </div>

    <div class="section-title">پشتیبانی</div>
    <div class="card">
      <div class="note" style="margin-bottom:14px;">سؤال داری یا مشکلی پیش اومده؟ باهامون چت کن، در اسرع وقت جواب می‌دیم.</div>
      <button class="btn btn-primary" style="width:100%; padding:12px;" onclick="openSupportChat()">چت با پشتیبانی</button>
    </div>
  `;
}

/* ---------- Support chat (user side) ---------- */
async function openSupportChat(){
  openOverlay(`<h3>چت با پشتیبانی</h3><div class="note">در حال بارگذاری...</div>`);
  if(!currentUser || !sb){ alert("برای چت با پشتیبانی باید وارد حساب شده باشی."); return; }
  await renderSupportChat();
  // Mark admin replies as read once the user opens the thread.
  sb.from('support_messages').update({read_by_user:true}).eq('user_id', currentUser.id).eq('sender','admin').eq('read_by_user', false).then(()=>{});
}
async function renderSupportChat(){
  const { data, error } = await sb.from('support_messages').select('*').eq('user_id', currentUser.id).order('created_at', {ascending:true});
  if(error) console.error("renderSupportChat select failed:", error);
  const msgs = data || [];
  openOverlay(`
    <h3>چت با پشتیبانی</h3>
    <div id="chat_scroll" style="max-height:340px; overflow-y:auto; margin-bottom:14px; padding-inline-end:2px;">
      ${msgs.length===0 ? `<div class="note">هنوز پیامی رد و بدل نشده — همین پایین اولین پیامت رو بنویس.</div>` :
        msgs.map(m=>`
          <div style="display:flex; justify-content:${m.sender==='user'?'flex-start':'flex-end'}; margin-bottom:8px;">
            <div style="max-width:80%; background:${m.sender==='user'?'var(--surf-a)':'var(--gold-soft)'}; border-radius:12px; padding:10px 12px; font-size:calc(13px * var(--font-scale));">
              ${escapeHtml(m.body)}
            </div>
          </div>
        `).join("")}
    </div>
    <div class="field"><textarea id="chat_input" rows="2" placeholder="پیامت رو بنویس..."></textarea></div>
    <div class="sheet-actions">
      <button class="btn btn-ghost" onclick="closeOverlay()">بستن</button>
      <button class="btn btn-primary" onclick="sendSupportChatMessage()">ارسال</button>
    </div>
  `);
  const scroll = document.getElementById("chat_scroll");
  if(scroll) scroll.scrollTop = scroll.scrollHeight;
}
async function sendSupportChatMessage(){
  const el = document.getElementById("chat_input");
  const text = el.value.trim();
  if(!text) return;
  el.value = "";
  try{
    const { error } = await sb.from('support_messages').insert({user_id: currentUser.id, sender:'user', body: text});
    if(error) throw error;
    await renderSupportChat();
  }catch(e){
    console.error("sendSupportChatMessage failed:", e);
    alert("ارسال پیام موفق نبود: " + (e && (e.message || e.error_description || JSON.stringify(e))));
    el.value = text; // give the message back so it isn't lost
  }
}

/* ===================== Contextual "coachmark" tips =====================
   One-time, one-line explanations shown exactly where and when a feature first becomes
   relevant, instead of trying to cram everything into the upfront intro tour — nobody
   remembers slide 6 of an 8-slide tour by the time they actually need it three days later.
   `hasSeenTip`/`dismissTip` are the whole mechanism; each call site just picks its own id
   and text. Free, no AI, just a flag per tip stored in the profile. */
function hasSeenTip(id){ return !!(DATA.seenTips && DATA.seenTips[id]); }
function dismissTip(id){
  if(!DATA.seenTips) DATA.seenTips = {};
  DATA.seenTips[id] = true;
  save();
  renderAll();
}
function renderTipBanner(id, text){
  if(hasSeenTip(id)) return ``;
  return `<div class="tip-banner">
    <span class="pi-muted" style="margin-top:3px;">${pi("bulb")}</span><div class="tip-banner-text">${text}</div>
    <button class="tip-banner-close" aria-label="بستن" onclick="dismissTip('${id}')">${pi("x")}</button>
  </div>`;
}

/* ===================== Check-in photo/note ("mini daily journal") =====================
   Attaching a quick photo or one-line note to a specific day's check-in, TickTick-style.
   Kept as a SEPARATE map keyed by "dateKey:activityId" rather than changing the shape of
   DATA.history (which stays a plain array of completed ids everywhere else in the app) —
   this is purely additive, optional metadata on top of an existing check-in, not a new kind
   of check-in. Reuses the same HEIC-safe resize/compress pipeline already built for the
   profile photo (normalizeImageFile/blobToResizedDataUrl in the profile-photo section). */
let pendingCheckinPhoto = null;
/* ===================== Focus timer (Pomodoro) =====================
   Lives in the shared #overlay element (not #app), so it survives renderAll() calls to the
   rest of the page while it's running.

   Two things a plain setInterval can't do, that this handles:
   1. Staying ACCURATE across backgrounding. Instead of counting down a number, we store a
      fixed `endAt` timestamp and always compute remaining = endAt - Date.now(). Even if the
      tab is throttled/suspended for a while and the interval ticks are late or skipped,
      re-opening the tab immediately shows the correct remaining time — nothing to "catch up".
   2. Actually ringing when the SCREEN IS LOCKED. No JS timer survives that, on any platform —
      the only thing that can wake a locked device is a real push notification, so on start we
      ask the server (supabase/functions/send-scheduled-alarms, on a 1-minute cron) to push a
      notification at endAt. That only works if the person already enabled notifications; if
      they haven't, the countdown still runs correctly whenever the app is open, it just can't
      promise a ping while the screen is off — that's a platform limit, not a bug. */
let focusTimerState = null; // {endAt, kind:'activity'|'task', id, intervalId, alarmId}

function openFocusTimer(id, kind){
  if(focusTimerState){ alert("یه تایمر تمرکز از قبل روشنه — اول اون رو تموم یا لغو کن."); return; }
  renderFocusDurationPicker(id, kind);
}
function renderFocusDurationPicker(id, kind){
  const presets = [15, 25, 45, 60, 90];
  openOverlay(`
    <h3>چند دقیقه تمرکز کنی؟</h3>
    <div style="display:flex; flex-wrap:wrap; gap:8px; margin-bottom:14px;">
      ${presets.map(m => `<button type="button" class="suggest-chip" onclick="startFocusTimer('${id}','${kind}',${m})">${toFaDigits(m)} دقیقه</button>`).join("")}
    </div>
    <div class="field">
      <label>یا یه عدد دلخواه (دقیقه)</label>
      <input type="text" inputmode="numeric" pattern="[0-9]*" id="focusCustomMinutes" class="goal-input" placeholder="مثلاً ۱۲۰">
    </div>
    <div class="sheet-actions">
      <button class="btn btn-ghost" onclick="closeOverlay()">بی‌خیال</button>
      <button class="btn btn-primary" onclick="startFocusTimerFromCustomInput('${id}','${kind}')">شروع</button>
    </div>
  `);
}
function startFocusTimerFromCustomInput(id, kind){
  const v = parseInt(numInput("focusCustomMinutes"), 10);
  if(!v || v < 1 || v > 240){ alert("یه عدد معتبر بین ۱ تا ۲۴۰ دقیقه بنویس."); return; }
  startFocusTimer(id, kind, v);
}
async function startFocusTimer(id, kind, minutes){
  const endAt = Date.now() + minutes*60000;
  focusTimerState = {endAt, kind, id, intervalId: null, alarmId: null};
  renderFocusTimerOverlay();
  tickFocusTimer();
  focusTimerState.intervalId = setInterval(tickFocusTimer, 1000);
  window.addEventListener("visibilitychange", onFocusTimerVisibilityChange);
  // Best-effort: only works if notifications are already enabled — see comment above.
  try{
    if("serviceWorker" in navigator && currentUser && sb){
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if(sub){
        const label = focusTimerLabel();
        const { data } = await sb.from("scheduled_alarms").insert({
          user_id: currentUser.id,
          fire_at: new Date(endAt).toISOString(),
          title: "⏱️ پله",
          body: label ? `زمان تمرکز روی «${label}» تموم شد!` : "زمان تمرکزت تموم شد!",
        }).select("id").single();
        if(focusTimerState && data) focusTimerState.alarmId = data.id; // still the same session? (not cancelled meanwhile)
      }
    }
  }catch(e){ console.error("scheduling focus alarm failed (timer still works while the app is open):", e); }
}
function onFocusTimerVisibilityChange(){
  if(document.visibilityState === "visible") tickFocusTimer(); // resync immediately instead of waiting up to 1s
}
function focusTimerLabel(){
  const s = focusTimerState;
  if(!s) return "";
  if(s.kind === "activity"){ const a = DATA.activities.find(x=>x.id===s.id); return a ? a.title : ""; }
  const t = dailyExtraFor(todayKey()).tasks.find(x=>x.id===s.id);
  return t ? t.text : "";
}
function renderFocusTimerOverlay(){
  const s = focusTimerState;
  openOverlay(`
    <div style="text-align:center; padding:6px 6px 4px;">
      <div class="note" style="margin-bottom:8px;">${focusTimerLabel()}</div>
      <div id="focusTimerDisplay" style="font-size:52px; font-weight:900; color:var(--gold); margin:6px 0 8px; direction:ltr;">${focusTimerText(s.endAt - Date.now())}</div>
      <div class="note" style="margin-bottom:18px;">اگه یادآوری پله رو فعال کرده باشی، حتی با قفل صفحه هم خبردار می‌شی.</div>
      <div class="sheet-actions">
        <button class="btn" onclick="cancelFocusTimer()">لغو</button>
        <button class="btn btn-primary" id="focusPauseBtn" onclick="toggleFocusPause()">مکث</button>
      </div>
    </div>
  `);
}
function focusTimerText(ms){
  const s = Math.max(Math.round(ms/1000), 0);
  const mm = String(Math.floor(s/60)).padStart(2,"0");
  const ss = String(s%60).padStart(2,"0");
  return toFaDigits(mm) + ":" + toFaDigits(ss);
}
function tickFocusTimer(){
  const s = focusTimerState;
  if(!s) return;
  const remaining = s.endAt - Date.now();
  const el = document.getElementById("focusTimerDisplay");
  if(el) el.textContent = focusTimerText(remaining); // overlay may have closed some other way — el is null then, just stop updating
  if(remaining <= 0) finishFocusTimer();
}
function toggleFocusPause(){
  // "Pause" keeps the wall-clock endAt fixed while stopping the visible countdown from
  // ticking — resuming just shifts endAt forward by exactly how long it was paused, so total
  // focus time stays what was actually asked for. (No effect on the server-side alarm, which
  // is a deliberate tradeoff: rescheduling it would need another round trip. Cancel and
  // restart the timer instead if you need the alarm time to match a long pause.)
  const s = focusTimerState;
  if(!s) return;
  const btn = document.getElementById("focusPauseBtn");
  if(s.intervalId){
    clearInterval(s.intervalId);
    s.intervalId = null;
    s.pausedAt = Date.now();
    if(btn) btn.textContent = "ادامه";
  } else {
    if(s.pausedAt) s.endAt += (Date.now() - s.pausedAt);
    s.pausedAt = null;
    tickFocusTimer();
    s.intervalId = setInterval(tickFocusTimer, 1000);
    if(btn) btn.textContent = "مکث";
  }
}
function cancelScheduledFocusAlarm(){
  const s = focusTimerState;
  if(s && s.alarmId && sb) sb.from("scheduled_alarms").delete().eq("id", s.alarmId).then(()=>{}, ()=>{});
}
function cancelFocusTimer(){
  if(focusTimerState && focusTimerState.intervalId) clearInterval(focusTimerState.intervalId);
  cancelScheduledFocusAlarm();
  window.removeEventListener("visibilitychange", onFocusTimerVisibilityChange);
  focusTimerState = null;
  closeOverlay();
}
function finishFocusTimer(){
  const s = focusTimerState;
  if(!s) return;
  clearInterval(s.intervalId);
  cancelScheduledFocusAlarm(); // client got there first — no need for the server ping a minute later too
  window.removeEventListener("visibilitychange", onFocusTimerVisibilityChange);
  if("vibrate" in navigator) try{ navigator.vibrate([200,100,200,100,200]); }catch(e){}
  playTimerAlarm(); // همیشه، جدا از صدای ملایم تیک‌خوردن فعالیت — این لحظه باید محسوس باشه
  const {kind, id} = s;
  focusTimerState = null;
  closeOverlay();
  // Auto-complete the thing this session was for, through the real toggle functions — so
  // points/streak/heatmap all update exactly as if the person had ticked it themselves.
  // Those functions already play their own completion sound/animation; we only need our own
  // here for the (rare) case where it was already done, since then neither gets called.
  if(kind === "activity"){
    const dk = todayKey();
    if(!(DATA.history[dk]||[]).includes(id)) toggleActivity(id);
  } else {
    const t = dailyExtraFor(todayKey()).tasks.find(x=>x.id===id);
    if(t && !t.done) toggleTask(id);
  }
}

function openCheckinMediaForm(activityId){
  const dk = todayKey();
  const key = `${dk}:${activityId}`;
  const existing = (DATA.checkinMedia && DATA.checkinMedia[key]) || {photo:null, note:""};
  pendingCheckinPhoto = existing.photo || null;
  const activity = DATA.activities.find(a=>a.id===activityId);
  const task = !activity ? dailyExtraFor(dk).tasks.find(t=>t.id===activityId) : null;
  openOverlay(`
    <h3>📸 یادگاری این لحظه</h3>
    <div class="note" style="margin-bottom:12px;">${activity ? activity.title : (task ? task.text : "")}</div>
    <div class="field">
      <label>یادداشت کوتاه (اختیاری)</label>
      <textarea id="checkin_note" rows="3" class="goal-input" style="resize:vertical;">${existing.note||""}</textarea>
    </div>
    <div class="field">
      <label>عکس (اختیاری)</label>
      <input type="file" accept="image/*" id="checkin_photo_input" onchange="onCheckinPhotoSelected(this)">
      <div id="checkin_photo_preview" style="margin-top:8px;">${existing.photo ? `<img src="${existing.photo}" style="max-width:100%; border-radius:12px;">` : ``}</div>
    </div>
    <div class="sheet-actions">
      <button class="btn btn-ghost" onclick="closeOverlay()">بی‌خیال</button>
      <button class="btn btn-primary" onclick="saveCheckinMedia('${activityId}')">ذخیره</button>
    </div>
  `);
}
async function onCheckinPhotoSelected(input){
  const file = input.files && input.files[0];
  if(!file) return;
  try{
    const normalized = await normalizeImageFile(file);
    pendingCheckinPhoto = await blobToResizedDataUrl(normalized, 640, 0.75);
    const preview = document.getElementById("checkin_photo_preview");
    if(preview) preview.innerHTML = `<img src="${pendingCheckinPhoto}" style="max-width:100%; border-radius:12px;">`;
  }catch(e){
    console.error("checkin photo processing failed:", e);
    alert("این فرمت عکس پشتیبانی نمی‌شه. لطفاً یه عکس JPG یا PNG امتحان کن.");
  }
}
function saveCheckinMedia(activityId){
  const dk = todayKey();
  const key = `${dk}:${activityId}`;
  const noteEl = document.getElementById("checkin_note");
  const note = noteEl ? noteEl.value.trim() : "";
  if(!note && !pendingCheckinPhoto){
    if(DATA.checkinMedia) delete DATA.checkinMedia[key];
  } else {
    if(!DATA.checkinMedia) DATA.checkinMedia = {};
    DATA.checkinMedia[key] = {note, photo: pendingCheckinPhoto || null, ts: new Date().toISOString()};
  }
  pendingCheckinPhoto = null;
  save();
  closeOverlay();
  renderAll();
}
/* ===================== Shareable memory template =====================
   Turns one check-in photo/note into a fixed-template 1080×1920 (Story-shaped) branded
   image — this is also, quietly, the app's own advertising: every image someone posts to
   their Story carries the پله wordmark, so sharing a good moment doubles as word-of-mouth.
   Renders on an offscreen canvas, then hands the result to the OS via the Web Share API
   (so the user picks Instagram/WhatsApp/Telegram themselves) with a plain download as the
   fallback for browsers that don't support sharing files (mainly desktop). */
function loadImageEl(src){
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("عکس لود نشد"));
    img.src = src;
  });
}
function wrapCanvasLines(ctx, text, maxWidth, maxLines){
  const words = (text||"").split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";
  for(const w of words){
    const test = line ? line + " " + w : w;
    if(ctx.measureText(test).width > maxWidth && line){
      lines.push(line);
      line = w;
      if(lines.length === maxLines - 1){ line = line + "…"; break; }
    } else {
      line = test;
    }
  }
  if(line) lines.push(line);
  return lines.slice(0, maxLines);
}
function roundRectPath(ctx, x, y, w, h, r){
  ctx.beginPath();
  ctx.moveTo(x+r, y);
  ctx.arcTo(x+w, y, x+w, y+h, r);
  ctx.arcTo(x+w, y+h, x, y+h, r);
  ctx.arcTo(x, y+h, x, y, r);
  ctx.arcTo(x, y, x+w, y, r);
  ctx.closePath();
}
async function renderMemoryTemplateBlob({photo, note, dateLabel}){
  const W = 1080, H = 1920;
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");

  // Background — same navy the app itself uses, not a generic white/black export.
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, pelehTok("--bg"));
  bg.addColorStop(1, pelehTok("--surface-2"));
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  if(document.fonts && document.fonts.ready) await document.fonts.ready;
  ctx.direction = "rtl";
  ctx.textAlign = "center";

  // White "polaroid" card
  const cardX = 90, cardY = 260, cardW = W - cardX*2, cardH = 1360;
  const photoH = note ? cardH - 210 : cardH - 70;
  ctx.save();
  ctx.shadowColor = pelehTokA("--shadow-c", .45);
  ctx.shadowBlur = 40;
  ctx.shadowOffsetY = 18;
  roundRectPath(ctx, cardX, cardY, cardW, cardH, 22);
  ctx.fillStyle = pelehTok("--text");
  ctx.fill();
  ctx.restore();

  if(photo){
    try{
      const img = await loadImageEl(photo);
      const padding = 34;
      const pX = cardX + padding, pY = cardY + padding, pW = cardW - padding*2, pH = photoH - padding*2;
      // cover-fit crop, same idea as CSS object-fit:cover
      const srcRatio = img.width / img.height, dstRatio = pW / pH;
      let sx, sy, sw, sh;
      if(srcRatio > dstRatio){ sh = img.height; sw = sh * dstRatio; sy = 0; sx = (img.width - sw) / 2; }
      else { sw = img.width; sh = sw / dstRatio; sx = 0; sy = (img.height - sh) / 2; }
      ctx.save();
      roundRectPath(ctx, pX, pY, pW, pH, 12);
      ctx.clip();
      ctx.drawImage(img, sx, sy, sw, sh, pX, pY, pW, pH);
      ctx.restore();
    }catch(e){ console.error("template photo draw failed:", e); }
  }

  if(note){
    ctx.fillStyle = pelehTok("--bg");
    ctx.font = "500 34px Vazirmatn, sans-serif";
    const lines = wrapCanvasLines(ctx, note, cardW - 90, 3);
    const lineH = 46;
    const startY = cardY + photoH + 60;
    lines.forEach((l,i) => ctx.fillText(l, cardX + cardW/2, startY + i*lineH));
  }

  // Brand footer — the "advertising" half of this: shows on every image, everywhere it's shared.
  ctx.fillStyle = pelehTok("--gold");
  ctx.font = "900 56px Vazirmatn, sans-serif";
  ctx.fillText("پله", W/2, cardY + cardH + 100);
  ctx.fillStyle = pelehTok("--muted");
  ctx.font = "500 30px Vazirmatn, sans-serif";
  ctx.fillText("هر روز، یک پله بالاتر", W/2, cardY + cardH + 148);
  if(dateLabel){
    ctx.fillStyle = pelehTok("--muted");
    ctx.font = "400 26px Vazirmatn, sans-serif";
    ctx.fillText(dateLabel, W/2, cardY - 50);
  }

  return new Promise(resolve => canvas.toBlob(resolve, "image/png", 0.95));
}
async function shareMemory(dateKey, activityId, btn){
  const key = `${dateKey}:${activityId}`;
  const m = (DATA.checkinMedia || {})[key];
  if(!m) return;
  const original = btn ? btn.textContent : null;
  if(btn){ btn.textContent = "…"; btn.disabled = true; }
  try{
    const [y,mo,d] = dateKey.split("-").map(Number);
    const dateLabel = jalaliDateLabel(new Date(y, mo-1, d));
    const blob = await renderMemoryTemplateBlob({photo: m.photo, note: m.note, dateLabel});
    await shareOrSaveFile(blob, "peleh-memory.png", { title: "پله", text: "یه لحظه از پله 🙂" });
  }catch(e){
    if(e && e.name !== "AbortError") console.error("share memory failed:", e); // AbortError = user just closed the share sheet, not a real failure
  }finally{
    if(btn){ btn.textContent = original; btn.disabled = false; }
  }
}
/* Today's saved journal entries, shown as a small strip under the activity list so the
   payoff is immediate — the archive-over-time effect only matters if people can already
   see something is being kept. */
function renderTodayJournalStrip(){
  const dk = todayKey();
  const entries = Object.entries(DATA.checkinMedia || {}).filter(([k]) => k.startsWith(dk+":"));
  if(!entries.length) return ``;
  return `
    <div class="section-title">یادگاری‌های امروز</div>
    <div class="card" style="display:flex; flex-direction:column; gap:10px;">
      ${entries.map(([k, m])=>{
        const activityId = k.split(":")[1];
        const activity = DATA.activities.find(a=>a.id===activityId) || dailyExtraFor(dk).tasks.find(t=>t.id===activityId);
        return `
        <div style="display:flex; gap:10px; align-items:flex-start;">
          ${m.photo ? `<img src="${m.photo}" style="width:52px; height:52px; border-radius:10px; object-fit:cover; flex:none;">` : `<div style="width:52px; height:52px; border-radius:12px; background:var(--surface-2); color:var(--muted); flex:none; display:flex; align-items:center; justify-content:center; font-size:var(--fs-19);">${pi("note")}</div>`}
          <div style="flex:1; min-width:0;">
            <div style="font-weight:700; font-size:calc(12px * var(--font-scale));">${activity ? (activity.title || activity.text) : ""}</div>
            ${m.note ? `<div class="note" style="margin-top:2px;">${m.note}</div>` : ``}
          </div>
          ${m.photo ? `<button class="icon-btn" aria-label="اشتراک‌گذاری" title="اشتراک‌گذاری" onclick="shareMemory('${dk}','${activityId}', this)">${pi("share")}</button>` : ``}
        </div>`;
      }).join("")}
    </div>`;
}

/* ===================== Forms (add/edit) ===================== */

/* Android back-button fix: on Android, the hardware/gesture "back" action normally
   navigates actual browser history. Since this app never used history.pushState, opening
   an overlay (any form/sheet) or drilling into a sub-page (settings/rotation from "بیشتر")
   left nothing in history to go "back" to — so Android's back button exited the whole PWA
   instead of just closing what was open. Fix: push a history entry whenever something is
   opened, and let a single popstate handler close whatever's open instead of letting the
   browser navigate away. iOS has no hardware back button so this was never an issue there —
   that's why the app felt "built for iPhone" even though nothing was ever iOS-specific.
   `suppressHistoryPush` prevents us from pushing AGAIN while we're in the middle of
   reacting to a popstate event ourselves (which would desync the stack). */
let suppressHistoryPush = false;
/* closeOverlay با history.back() کار می‌کنه و بستن واقعی کمی بعد (در popstate) اتفاق می‌افته.
   اگه همون لحظه یه sheet دیگه باز می‌شد (مثلاً «بستن این، باز کردن فرم بعدی»)، اون popstateِ دیرتر
   sheet تازه رو هم می‌بست — فرم یه لحظه ظاهر و ناپدید می‌شد. حالا باز شدن تا رسیدن اون بستن صبر می‌کنه. */
let overlayClosePending = false, overlayQueuedHtml = null, overlayCloseFallback = null;
function finishPendingOverlayClose(){
  clearTimeout(overlayCloseFallback); overlayCloseFallback = null;
  overlayClosePending = false;
  if(overlayQueuedHtml !== null){ const html = overlayQueuedHtml; overlayQueuedHtml = null; openOverlay(html); }
}
function openOverlay(html){
  if(overlayClosePending){ overlayQueuedHtml = html; return; }
  document.getElementById("sheet").innerHTML = html;
  document.getElementById("overlay").classList.add("show");
  if(!suppressHistoryPush) history.pushState({pelehNav:"overlay"}, "", location.href);
}
function closeOverlay(){
  if(overlayClosePending){ overlayQueuedHtml = null; return; } // بستنِ در راه، sheet صف‌شده رو هم لغو می‌کنه
  if(!document.getElementById("overlay").classList.contains("show")) return;
  if(suppressHistoryPush){
    document.getElementById("overlay").classList.remove("show");
  } else {
    overlayClosePending = true;
    history.back(); // triggers the popstate handler below, which actually hides it
    // اگه به هر دلیلی popstate نیاد، اپ گیر نکنه
    overlayCloseFallback = setTimeout(() => {
      if(!overlayClosePending) return;
      document.getElementById("overlay").classList.remove("show");
      finishPendingOverlayClose();
    }, 500);
  }
}
window.addEventListener("popstate", () => {
  suppressHistoryPush = true;
  if(document.getElementById("overlay").classList.contains("show")){
    document.getElementById("overlay").classList.remove("show");
  } else if(currentTab === "plus"){
    if(!(typeof plusHandleBack === "function" && plusHandleBack())){ currentTab = "health"; renderAll(); }
  } else if(SUB_PAGES.includes(currentTab)){
    leaveSubpage();
  }
  suppressHistoryPush = false;
  if(overlayClosePending) finishPendingOverlayClose();
});

/* ---- Suggested activities: points weighted by how hard people generally find them to sustain
   (based on research into commonly-abandoned habits — exercise/screen-time top the list). ---- */
const SUGGESTED_ACTIVITIES = [
  {title:"ورزش / باشگاه", points:25, icon:"🏋️"},
  {title:"کاهش اسکرین‌تایم", points:22, icon:"📵"},
  {title:"نوشتن روزانه / ژورنال", points:18, icon:"✍️"},
  {title:"مدیتیشن / ذهن‌آگاهی", points:18, icon:"🧘"},
  {title:"پیاده‌روی روزانه", points:15, icon:"🚶"},
  {title:"کتاب‌خوانی", points:15, icon:"📖"},
  {title:"خواب به‌موقع", points:15, icon:"🌙"},
  {title:"بیداری زودهنگام", points:15, icon:"🌅"},
  {title:"یادگیری زبان یا مهارت جدید", points:15, icon:"🎓"},
  {title:"پرهیز از فست‌فود", points:14, icon:"🥗"},
  {title:"نوشیدن آب کافی", points:12, icon:"💧"},
  {title:"حرکات کششی / استرچینگ", points:10, icon:"🤸"},
  {title:"تماس با خانواده یا دوست", points:10, icon:"📞"},
  {title:"مرتب کردن اتاق یا میز کار", points:8, icon:"🧹"},
  {title:"یادداشت شکرگزاری", points:8, icon:"🙏"},
  {title:"نخ دندان / مسواک شبانه", points:8, icon:"🦷"},
  {title:"ثبت هزینه‌های روزانه", points:10, icon:"💰"},
  {title:"خالی کردن اینباکس ایمیل", points:8, icon:"📧"},
  {title:"مصرف ویتامین / دارو", points:8, icon:"💊"},
  {title:"مرور و برنامه‌ریزی هفته", points:12, icon:"🗓️"},
];
function openActivityForm(id){
  const a = id ? DATA.activities.find(x=>x.id===id) : null;
  const days = a ? a.days : ["daily"];               // A۶: پیش‌فرض «هرروز»
  const isDaily = days.includes("daily");
  document.body.dataset.editingActivity = id || "";
  document.body.dataset.tempDays = JSON.stringify(isDaily ? [] : days);
  document.body.dataset.tempDaily = isDaily ? "1" : "0";
  document.body.dataset.tempIcon = a ? (a.icon || "") : "";

  openOverlay(`
    <h3>${a ? "ویرایش عادت" : "عادت جدید"}</h3>
    ${!a ? `
    <div class="field">
      <label>یکی رو بزن تا پایین پر بشه، بعد روزها و امتیازش رو تنظیم کن</label>
      <div class="suggest-chips" id="af_chips">
        ${SUGGESTED_ACTIVITIES.map((s, i) => activityChipHtml(s, i)).join("")}
      </div>
      <div class="note" style="margin-top:6px;">بعد از انتخاب، «تنظیمات بیشتر» باز می‌شه؛ روزها و امتیاز رو عوض کن و «ذخیره» رو بزن. (پیش‌فرض: هرروز)</div>
    </div>
    <div class="section-title" style="margin-top:14px;">یا خودت بساز</div>` : ``}
    <div class="field">
      <label>اسم عادت</label>
      <input type="text" id="f_title" value="${a ? escapeHtml(a.title) : ''}" placeholder="مثلاً: یوگا" maxlength="60" onkeydown="if(event.key==='Enter'){event.preventDefault(); saveActivityForm();}">
    </div>
    <details class="af-more" ${a ? 'open' : ''}>
      <summary>تنظیمات بیشتر — امتیاز و روزها (پیش‌فرض: هرروز، ۱۰ امتیاز)</summary>
      <div class="field" style="margin-top:10px;">
        <label>امتیاز</label>
        <input type="text" inputmode="numeric" pattern="[0-9]*" id="f_points" value="${a ? a.points : 10}">
      </div>
      <div class="field">
        <label>چه روزهایی؟</label>
        <div class="days-grid" id="daysGrid"></div>
      </div>
    </details>
    <div class="field-error" id="af_error"></div>
    <div class="sheet-actions">
      ${a ? `<button class="btn btn-danger" onclick="deleteActivity('${id}'); closeOverlay();">حذف</button>` : `<button class="btn btn-ghost" onclick="closeOverlay()">بستن</button>`}
      <button class="btn btn-primary" onclick="saveActivityForm()">ذخیره</button>
    </div>
  `);
  renderDaysGrid();
}
// برای سازگاری با نسخه‌های قبلی باقی مونده: فقط فیلدها رو پر می‌کنه
function applySuggestion(title, points){
  document.getElementById('f_title').value = title;
  document.getElementById('f_points').value = points;
}

function renderDaysGrid(){
  const isDaily = document.body.dataset.tempDaily === "1";
  const sel = JSON.parse(document.body.dataset.tempDays || "[]");
  const chips = [`<button type="button" class="day-toggle ${isDaily?'on':''}" onclick="toggleDailyChip()">هرروز</button>`]
    .concat(DAY_KEYS.map(dk => `<button type="button" class="day-toggle ${(!isDaily && sel.includes(dk))?'on':''}" onclick="toggleDayChip('${dk}')" ${isDaily?'style="opacity:.35;pointer-events:none;"':''}>${DAY_LABELS[dk]}</button>`));
  document.getElementById("daysGrid").innerHTML = chips.join("");
}
function toggleDailyChip(){
  const isDaily = document.body.dataset.tempDaily === "1";
  document.body.dataset.tempDaily = isDaily ? "0" : "1";
  if(!isDaily) document.body.dataset.tempDays = "[]";
  renderDaysGrid();
}
function toggleDayChip(dk){
  if(document.body.dataset.tempDaily === "1") return;
  let sel = JSON.parse(document.body.dataset.tempDays || "[]");
  sel = sel.includes(dk) ? sel.filter(x=>x!==dk) : [...sel, dk];
  document.body.dataset.tempDays = JSON.stringify(sel);
  renderDaysGrid();
}
function saveActivityForm(){
  const title = normActTitle(document.getElementById("f_title").value).slice(0, 60);
  const points = parseInt(numInput("f_points")) || 0;
  const isDaily = document.body.dataset.tempDaily === "1";
  const sel = JSON.parse(document.body.dataset.tempDays || "[]");
  const errEl = document.getElementById("af_error");
  const fail = (msg, openMore) => {
    if(errEl) errEl.textContent = msg; else alert(msg);
    if(openMore){ const m = document.querySelector(".af-more"); if(m) m.open = true; }
  };
  if(!title) return fail("یه اسم برای عادتت بنویس.");
  if(points <= 0) return fail("امتیاز باید یه عدد بیشتر از صفر باشه.", true);
  if(!isDaily && sel.length === 0) return fail("حداقل یه روز رو انتخاب کن (یا «هرروز»).", true);
  const days = isDaily ? ["daily"] : sel;
  const editingId = document.body.dataset.editingActivity;
  const sug = SUGGESTED_ACTIVITIES.find(x => normActTitle(x.title) === title);

  let newId = null;
  if(editingId){
    const a = DATA.activities.find(x=>x.id===editingId);
    a.title = title; a.points = points; a.days = days;
    if(sug && (!a.icon || a.icon === "⭐")) a.icon = sug.icon;
  } else {
    if(hasActivityTitled(title)) return fail("این عادت رو از قبل داری.");
    newId = createActivity({ title, points, days, icon: document.body.dataset.tempIcon || (sug && sug.icon) || "⭐" }, "form");
  }
  save();
  closeOverlay();
  renderAll();
  if(newId) showToast(`«${title}» اضافه شد ✓`, { actionLabel: "واگرد", ms: 5000, onAction: () => undoAddActivity(newId) });
}
/* =====================================================================================
   فاز A — ساده‌سازی ساخت عادت (سند جامع، بخش A)
   هدف: کاربر جدید «کد پیامکی ← اسم ← انتخاب یه عادت ← اولین تیک» رو زیر ۶۰ ثانیه انجام بده.
   مدل داده‌ی فعالیت‌ها عوض نشده: DATA.activities[] = {id, title, points, days, icon, group}
   و id سفارشی‌ها همون "custom_" + nextActivitySeq.
   فیلدهای جدید (همه با پیش‌فرض در blankProfileData، پس کاربرهای قدیمی خراب نمی‌شن):
     DATA.funnel                    زمان‌های قیف برای داشبورد ادمین (quickstart_shown, first_habit, first_checkin, reminder_set, ...)
     DATA.settings.reminderSlot     morning | noon | evening | night | none
     DATA.settings.showAllSections  true = حالت «امروز» ساده برای کاربر تازه خاموش
     DATA.seenCoach.quickstart_v1   صفحه‌ی «شروع سریع» دیده/رد شد
   ===================================================================================== */

/* ---- فلگ‌های سمت سرور (migration 014/015). اگه RPC هنوز اجرا نشده یا اینترنت نیست، پیش‌فرض‌های امن می‌مونن:
   شروع سریع روشن، سلامت پلاس خاموش. ---- */
const CLIENT_FLAGS_DEFAULT = { plus_enabled:false, quickstart_v1:true, min_app_version:"0", is_coach:false, reading_integrity:false, loaded:false };
let CLIENT_FLAGS = Object.assign({}, CLIENT_FLAGS_DEFAULT);
async function loadClientFlags(){
  if(!sb || !currentUser) return;
  try{
    const { data, error } = await sb.rpc('peleh_client_flags');
    if(error || !data || typeof data !== "object") return;
    const before = JSON.stringify([CLIENT_FLAGS.plus_enabled, CLIENT_FLAGS.quickstart_v1, CLIENT_FLAGS.is_coach]);
    CLIENT_FLAGS = Object.assign({}, CLIENT_FLAGS_DEFAULT, data, { loaded:true });
    const after = JSON.stringify([CLIENT_FLAGS.plus_enabled, CLIENT_FLAGS.quickstart_v1, CLIENT_FLAGS.is_coach]);
    await checkMinAppVersion();
    if(before !== after || isAppOutdated()){
      const ov = document.getElementById("overlay"), ae = document.activeElement;
      if(!(ov && ov.classList.contains("show")) && !(ae && (ae.tagName === "INPUT" || ae.tagName === "TEXTAREA"))) renderAll();
    }
    if(CLIENT_FLAGS.plus_enabled && typeof plusStartLive === "function") plusStartLive();
    if(typeof plusMaybeHandlePendingInvite === "function") plusMaybeHandlePendingInvite();
    if(typeof plusNotifyNewItemsNative === "function") plusNotifyNewItemsNative();
  }catch(e){ /* فلگ‌ها اختیاری‌اند — اپ بدون اون‌ها هم کار می‌کنه */ }
}

/* ---- لینک دعوت: ?ref=کد_معرف و ?coach=کد_مربی ----
   همون لحظه‌ی باز شدن صفحه خونده و نگه داشته می‌شن (حتی اگه کاربر اول باید ثبت‌نام کنه)،
   بعد از آدرس پاک می‌شن تا با رفرش دوباره اعمال نشن. */
const PENDING_REF_KEY = "pelehPendingRef";
const PENDING_COACH_KEY = "pelehPendingCoach";
(function capturePendingInviteParams(){
  try{
    const p = new URLSearchParams(location.search);
    const clean = v => faToEnDigits(String(v || "")).toUpperCase().replace(/[^A-Z0-9]/g, "");
    const ref = clean(p.get("ref")), coach = clean(p.get("coach"));
    if(ref && ref.length <= 16) localStorage.setItem(PENDING_REF_KEY, ref);
    if(coach && coach.length <= 12) localStorage.setItem(PENDING_COACH_KEY, coach);
    if(p.has("ref") || p.has("coach")){
      p.delete("ref"); p.delete("coach");
      const qs = p.toString();
      history.replaceState(history.state, "", location.pathname + (qs ? "?" + qs : "") + location.hash);
    }
  }catch(e){}
})();
function peekPendingReferral(){ try{ return localStorage.getItem(PENDING_REF_KEY) || ""; }catch(e){ return ""; } }
function takePendingReferral(){
  const v = peekPendingReferral();
  try{ localStorage.removeItem(PENDING_REF_KEY); }catch(e){}
  return v;
}
// اگه کد اشتباه یا تکراری باشه، فقط یه پیام کوچیک — نباید جلوی ورود به اپ رو بگیره
function applyReferralCode(code){
  code = String(code || "").trim().toUpperCase();
  if(!code) return;
  invokeEdge('apply-referral', { body: { code } }).then(async ({data, error})=>{
    if(!error && data?.success){
      DATA.funnel = DATA.funnel || {};
      DATA.funnel.referral_applied = new Date().toISOString();
      await reloadProfileKeepingLocalEdits();
      renderAll();
      showToast(`کد معرف اعمال شد — ${toFaDigits(data.bonusDays)} روز پرمیوم رایگان گرفتی 🎉`, { ms: 5000 });
    }else if(data?.error){
      showToast(data.error, { ms: 5000 });
    }
  }).catch(()=>{});
}

/* ---- قیف (A10): فقط اولین بار هر رویداد ثبت می‌شه. داشبورد ادمین از profiles.data.funnel می‌خونه. ---- */
function trackFunnel(key, meta){
  DATA.funnel = DATA.funnel || {};
  if(DATA.funnel[key]) return false;
  DATA.funnel[key] = new Date().toISOString();
  if(meta) DATA.funnel[key + "_meta"] = meta;
  return true;
}

/* ---- Toast کوچیک با دکمه‌ی اختیاری (مثلاً «واگرد») ---- */
let _toastTimer = null;
function showToast(msg, opts){
  opts = opts || {};
  let el = document.getElementById("peleh_toast");
  if(!el){
    el = document.createElement("div");
    el.id = "peleh_toast";
    el.setAttribute("role", "status");
    el.setAttribute("aria-live", "polite");
    document.body.appendChild(el);
  }
  el.innerHTML = `<span class="peleh-toast-msg">${escapeHtml(msg)}</span>${opts.actionLabel ? `<button type="button" class="peleh-toast-btn">${escapeHtml(opts.actionLabel)}</button>` : ""}`;
  const b = el.querySelector("button");
  if(b) b.onclick = () => { hideToast(); try{ if(opts.onAction) opts.onAction(); }catch(e){ console.error(e); } };
  el.className = "peleh-toast show";
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(hideToast, opts.ms || 2600);
}
function hideToast(){
  clearTimeout(_toastTimer);
  const el = document.getElementById("peleh_toast");
  if(el) el.className = "peleh-toast";
}

/* ---- ساخت عادت (یک‌جا، برای همه‌ی مسیرها) ---- */
function normActTitle(s){ return String(s || "").replace(/[\s\u200c]+/g, " ").trim(); }
function hasActivityTitled(title){
  const t = normActTitle(title);
  return (DATA.activities || []).some(a => normActTitle(a.title) === t);
}
function createActivity(fields, source){
  const id = "custom_" + (DATA.nextActivitySeq++);
  DATA.activities.push({ id, title: fields.title, points: fields.points, days: fields.days || ["daily"], icon: fields.icon || "⭐", group: null });
  trackFunnel("first_habit", { source: source || "form" });
  return id;
}
function undoAddActivity(id){
  const a = (DATA.activities || []).find(x => x.id === id);
  if(!a) return;
  // فقط اگه هنوز تیک نخورده — نباید تاریخچه‌ی واقعی پاک بشه
  const ticked = Object.values(DATA.history || {}).some(ids => (ids || []).includes(id));
  if(ticked){ showToast("این عادت تیک خورده — از «مدیریت فعالیت‌ها» حذفش کن."); return; }
  DATA.activities = DATA.activities.filter(x => x.id !== id);
  save();
  renderAll();
  refreshActivityChipsInSheet();
}
// لمس چیپ = ساخت فوری (A6/A5). Toast با «واگرد» ۵ ثانیه‌ای.
function quickAddActivity(i, btn){
  const s = SUGGESTED_ACTIVITIES[i];
  if(!s) return;
  if(hasActivityTitled(s.title)){ showToast("این عادت رو از قبل داری 🙂"); return; }
  const id = createActivity({ title: s.title, points: s.points, days: ["daily"], icon: s.icon }, "chip");
  save();
  renderAll();
  refreshActivityChipsInSheet();
  showToast(`«${s.title}» اضافه شد ✓`, { actionLabel: "واگرد", ms: 5000, onAction: () => undoAddActivity(id) });
}
function activityChipHtml(s, i){
  const added = hasActivityTitled(s.title);
  return `<button type="button" class="suggest-chip ${added ? 'on' : ''}" ${added ? 'disabled' : ''}
    onclick="applySuggestionIdx(${i}, this)"
    title="انتخاب و تنظیم روز/امتیاز، بعد ذخیره">${s.icon} ${s.title}${added ? '' : ` <b>+${toFaDigits(s.points)}</b>`}</button>`;
}
function refreshActivityChipsInSheet(){
  const box = document.getElementById("af_chips");
  if(box) box.innerHTML = SUGGESTED_ACTIVITIES.map((s, i) => activityChipHtml(s, i)).join("");
}
/* لمس چیپ در شیت «عادت جدید»: فقط فرم رو پر می‌کنه (اسم، امتیاز، آیکون) و «تنظیمات بیشتر» رو باز می‌کنه
   تا کاربر روزها و امتیاز رو قبل از ذخیره عوض کنه. ساخت فوری فقط تو «شروع سریع» و حالت خالی صفحه‌ی امروز می‌مونه. */
function applySuggestionIdx(i, btn){
  const s = SUGGESTED_ACTIVITIES[i];
  if(!s) return;
  applySuggestion(s.title, s.points);
  document.body.dataset.tempIcon = s.icon;
  document.body.dataset.tempDaily = "1";          // پیش‌فرض هرروز؛ کاربر تو فرم عوضش می‌کنه
  document.body.dataset.tempDays = "[]";
  renderDaysGrid();
  const more = document.querySelector(".af-more");
  if(more) more.open = true;
  const err = document.getElementById("af_error"); if(err) err.textContent = "";
  document.querySelectorAll("#af_chips .suggest-chip.picked").forEach(el => el.classList.remove("picked"));
  if(btn && btn.classList) btn.classList.add("picked");
  const t = document.getElementById("f_title");
  if(t && t.scrollIntoView) t.scrollIntoView({ block: "center", behavior: "smooth" });   // بدون focus تا کیبورد باز نشه
}

/* ---- A1: صفحه‌ی «شروع سریع» ---- */
const QUICKSTART_TITLES = ["نوشیدن آب کافی", "پیاده‌روی روزانه", "کتاب‌خوانی", "ورزش / باشگاه",
  "مدیتیشن / ذهن‌آگاهی", "خواب به‌موقع", "نوشتن روزانه / ژورنال", "کاهش اسکرین‌تایم"];
const QUICKSTART_LABELS = {
  "نوشیدن آب کافی": "آب کافی", "پیاده‌روی روزانه": "پیاده‌روی", "ورزش / باشگاه": "ورزش / باشگاه",
  "مدیتیشن / ذهن‌آگاهی": "مدیتیشن", "نوشتن روزانه / ژورنال": "نوشتن روزانه", "کاهش اسکرین‌تایم": "اسکرین‌تایم کمتر",
};
// علایق از همین انتخاب‌ها استنتاج می‌شن (دیگه سؤال جدا لازم نیست — A3)
const QUICKSTART_INTERESTS = { "ورزش / باشگاه": "sport", "کتاب‌خوانی": "reading", "مدیتیشن / ذهن‌آگاهی": "meditation", "نوشتن روزانه / ژورنال": "writing" };
const QUICKSTART_MAX = 3;
let qsPicked = [];     // اندیس‌ها در SUGGESTED_ACTIVITIES
let qsStep = null;     // null | "reminder" — مرحله‌ی دوم، بعد از ساخت عادت‌ها
function quickStartPickIndexes(){
  return QUICKSTART_TITLES.map(t => SUGGESTED_ACTIVITIES.findIndex(s => s.title === t)).filter(i => i >= 0);
}
function needsQuickStart(){
  return !!currentUser && profileReady && !loadError && CLIENT_FLAGS.quickstart_v1 !== false
    && (DATA.activities || []).length === 0 && !(DATA.seenCoach && DATA.seenCoach.quickstart_v1);
}
// شماره‌ی تأییدشده‌ای که می‌شه بدون صفحه‌ی جدا، اسم رو هم تو «شروع سریع» گرفت
function qsNamePhone(){
  const meta = currentProfileMeta();
  if(meta.name) return "";
  const jv = typeof getJustVerifiedPhone === "function" ? getJustVerifiedPhone() : "";
  if(jv && /^09\d{9}$/.test(jv)) return jv;
  return (meta.phoneVerified && /^09\d{9}$/.test(meta.phone || "")) ? meta.phone : "";
}
function renderQuickStart(){
  document.getElementById("tabbar").innerHTML = "";
  const askName = needsOnboarding() && !!qsNamePhone();
  const prevName = document.getElementById("qs_name");
  if(trackFunnel("quickstart_shown")) save();
  const prevCustom = document.getElementById("qs_custom");
  const prevRef = document.getElementById("qs_ref");
  const customVal = prevCustom ? prevCustom.value : "";
  const refVal = prevRef ? prevRef.value : "";
  const first = (currentProfileMeta().name || "").trim().split(/\s+/)[0] || "";
  const hasPendingRef = !!peekPendingReferral();
  document.getElementById("app").innerHTML = `
    <div class="onboard-wrap qs-wrap">
      <div class="qs-head"><div class="brand"><span class="rungs"><i></i><i></i><i></i></span> پله</div>${askName ? `<span class="badge-soft">آخرین قدم</span>` : ``}</div>
      ${askName ? `<h1 class="qs-hello">خوش اومدی!</h1>
      <div class="field"><label for="qs_name">اسمت چیه؟</label>
        <input type="text" id="qs_name" class="goal-input" maxlength="60" autocomplete="given-name" placeholder="مثلاً: سارا" value="${escapeHtml(prevName ? prevName.value : "")}"></div>` : ``}
      <div class="qs-title">${!askName && first ? escapeHtml(first) + "، " : ""}امروز می‌خوای از کدوم شروع کنی؟</div>
      <div class="qs-sub">۱ تا ${toFaDigits(QUICKSTART_MAX)} تا انتخاب کن — کم ولی هرروز، بهتر از زیاد و یه‌روزه.</div>
      <div class="qs-grid" role="group" aria-label="عادت‌های پیشنهادی">
        ${quickStartPickIndexes().map(i => {
          const s = SUGGESTED_ACTIVITIES[i], on = qsPicked.includes(i);
          return `<button type="button" class="qs-chip ${on ? 'on' : ''}" data-i="${i}" aria-pressed="${on}" onclick="toggleQuickStartPick(${i})">
            <span class="qs-ic">${s.icon}</span><span class="qs-lb">${QUICKSTART_LABELS[s.title] || s.title}</span></button>`;
        }).join("")}
      </div>
      <div class="field" style="margin-top:14px;">
        <input type="text" id="qs_custom" class="goal-input" maxlength="60" placeholder="چیز دیگه‌ای؟ مثلاً: یوگا، تمرین گیتار" value="${escapeHtml(customVal)}" oninput="updateQuickStartButton()" onkeydown="if(event.key==='Enter'){event.preventDefault(); submitQuickStart();}">
      </div>
      <div class="field-error" id="qs_error"></div>
      <button id="qs_start" class="btn btn-primary" style="width:100%; padding:15px;" onclick="submitQuickStart()">شروع کن</button>
      <div class="note" style="text-align:center; margin-top:8px;">یادآوری و برنامه‌ی کاری رو بعداً از تنظیمات می‌ذاری.</div>
      <button class="btn btn-ghost" style="width:100%; padding:11px; margin-top:8px;" onclick="skipQuickStart()">فعلاً نه</button>
      ${hasPendingRef ? `` : `
      <details class="qs-ref" ${refVal ? 'open' : ''}>
        <summary>کد معرف داری؟</summary>
        <input type="text" id="qs_ref" class="goal-input" placeholder="مثلاً A1B2C3D4" style="direction:ltr; text-align:left; text-transform:uppercase; margin-top:8px;" value="${escapeHtml(refVal)}">
      </details>`}
    </div>
  `;
  updateQuickStartButton();
}
function toggleQuickStartPick(i){
  const err = document.getElementById("qs_error");
  if(qsPicked.includes(i)){
    qsPicked = qsPicked.filter(x => x !== i);
  } else {
    if(qsPicked.length >= QUICKSTART_MAX){
      if(err) err.textContent = `فعلاً حداکثر ${toFaDigits(QUICKSTART_MAX)} تا — بعداً هر چندتا خواستی اضافه کن 🙂`;
      return;
    }
    qsPicked.push(i);
  }
  if(err) err.textContent = "";
  document.querySelectorAll(".qs-chip[data-i]").forEach(b => {
    const on = qsPicked.includes(+b.dataset.i);
    b.classList.toggle("on", on);
    b.setAttribute("aria-pressed", on ? "true" : "false");
  });
  updateQuickStartButton();
}
function updateQuickStartButton(){
  const btn = document.getElementById("qs_start");
  if(!btn) return;
  const custom = ((document.getElementById("qs_custom") || {}).value || "").trim();
  const n = qsPicked.length + (custom ? 1 : 0);
  btn.classList.toggle("is-dim", n === 0);
  btn.textContent = n ? `شروع کن با ${toFaDigits(n)} عادت` : "شروع کن";
}
function markNewUserToursSeen(){
  // A8: تور ۴ مرحله‌ای «امروز» دیگه خودکار روی صفحه‌ای که تازه ساخته شده نمی‌آد؛
  // به‌جاش بعد از اولین تیک یه پیام کوتاه، و بقیه‌ی نکته‌ها زمینه‌ای (seenTips).
  DATA.seenCoach = DATA.seenCoach || {};
  if(!DATA.seenCoach.today){ DATA.seenCoach.today = true; DATA.seenCoach.todayDay = todayKey(); }
  DATA.seenCoach.today2 = true;
}
function finishQuickStartCommon(){
  DATA.seenCoach = DATA.seenCoach || {};
  DATA.seenCoach.quickstart_v1 = true;
  markNewUserToursSeen();
  const wp = Object.assign({completed:false, employment:null, workStart:"", workEnd:"", interests:[], interestsCustom:""}, DATA.workProfile || {});
  wp.completed = true;
  DATA.workProfile = wp;
  const refEl = document.getElementById("qs_ref");
  const ref = refEl ? refEl.value.trim() : "";
  if(ref) applyReferralCode(ref);
}
async function qsSaveName(){
  const el = document.getElementById("qs_name");
  if(!el) return true;
  const err = document.getElementById("qs_error");
  const name = el.value.trim();
  if(!name){ if(err) err.textContent = "یه اسم بنویس تا صدات کنیم 🙂"; el.focus(); return false; }
  const phone = qsNamePhone();
  const btn = document.getElementById("qs_start");
  if(btn){ btn.disabled = true; btn.textContent = "در حال ذخیره..."; }
  const prevWork = DATA.workProfile;
  DATA.workProfile = Object.assign({employment:null, workStart:"", workEnd:"", interests:[], interestsCustom:""}, prevWork || {}, {completed: true});
  const ok = await saveProfileInfo({ name, birthdate: currentProfileMeta().birthdate || "", phone, phoneVerified: true });
  if(btn){ btn.disabled = false; updateQuickStartButton(); }
  if(!ok){ DATA.workProfile = prevWork; if(err) err.textContent = "ذخیره نشد — اینترنتت رو چک کن و دوباره امتحان کن."; return false; }
  trackFunnel("signup_completed");
  if(typeof clearJustVerifiedPhone === "function") clearJustVerifiedPhone();
  const referralCode = typeof takePendingReferral === "function" ? takePendingReferral() : "";
  if(referralCode) applyReferralCode(referralCode);
  grantWelcomePremiumAndShowBanner();
  return true;
}
async function submitQuickStart(){
  const custom = normActTitle((document.getElementById("qs_custom") || {}).value || "");
  const err = document.getElementById("qs_error");
  if(!qsPicked.length && !custom){
    if(err) err.textContent = "یکی رو انتخاب کن یا اسم عادتت رو بنویس.";
    return;
  }
  if(!(await qsSaveName())) return;
  const ints = new Set((DATA.workProfile && DATA.workProfile.interests) || []);
  qsPicked.forEach(i => {
    const s = SUGGESTED_ACTIVITIES[i];
    if(!s || hasActivityTitled(s.title)) return;
    createActivity({ title: s.title, points: s.points, days: ["daily"], icon: s.icon }, "quickstart");
    if(QUICKSTART_INTERESTS[s.title]) ints.add(QUICKSTART_INTERESTS[s.title]);
  });
  if(custom && !hasActivityTitled(custom)) createActivity({ title: custom.slice(0, 60), points: 10, days: ["daily"], icon: "⭐" }, "quickstart");
  finishQuickStartCommon();
  DATA.workProfile.interests = Array.from(ints);
  qsPicked = [];
  qsStep = null;   // یادآوری دیگه مرحله‌ی جدا نیست (از تنظیمات، یا کارت کوچیک «امروز»)
  save();
  renderAll();
  if(typeof plusMaybeHandlePendingInvite === "function") setTimeout(plusMaybeHandlePendingInvite, 400);
}
async function skipQuickStart(){
  if(!(await qsSaveName())) return;
  qsPicked = [];
  finishQuickStartCommon();
  trackFunnel("quickstart_skipped");
  save();
  renderAll();
  if(typeof plusMaybeHandlePendingInvite === "function") setTimeout(plusMaybeHandlePendingInvite, 400);
}

/* ---- A7: یادآوری داخل جریان اول ---- */
const REMINDER_SLOTS = [
  { id:"morning", label:"صبح", time:"08:30", icon:"🌅" },
  { id:"noon",    label:"ظهر", time:"13:00", icon:"☀️" },
  { id:"evening", label:"عصر", time:"18:30", icon:"🌇" },
  { id:"night",   label:"شب",  time:"21:00", icon:"🌙" },
];
function reminderSlotTime(slot){ const s = REMINDER_SLOTS.find(x => x.id === slot); return s ? s.time : null; }
function renderReminderStep(){
  document.getElementById("tabbar").innerHTML = "";
  const n = (DATA.activities || []).length;
  document.getElementById("app").innerHTML = `
    <div class="onboard-wrap qs-wrap">
      <div style="text-align:center; font-size:calc(40px * var(--font-scale)); margin-bottom:6px;">🔔</div>
      <div class="qs-title">${n ? `${toFaDigits(n)} عادت آماده‌ست! ` : ""}چه موقع بهت یادآوری کنم؟</div>
      <div class="qs-sub">فقط وقتی عادت امروزت هنوز تیک نخورده، یه پیام کوتاه می‌فرستیم. بعداً از تنظیمات عوضش می‌کنی.</div>
      <div class="qs-grid">
        ${REMINDER_SLOTS.map(s => `<button type="button" class="qs-chip" onclick="chooseReminderSlot('${s.id}')">
          <span class="qs-ic">${s.icon}</span><span class="qs-lb">${s.label} <small>${toFaDigits(s.time)}</small></span></button>`).join("")}
      </div>
      <button class="btn btn-ghost" style="width:100%; padding:12px; margin-top:12px;" onclick="chooseReminderSlot('none')">نه ممنون</button>
    </div>
  `;
}
// باید مستقیم داخل همون لمس کاربر صدا زده بشه — مرورگر بدون «user gesture» اجازه نمی‌پرسه
function requestReminderPermission(){
  try{
    if(typeof nnAvailable === "function" && nnAvailable()){
      DATA.settings.smartNotify = { enabled: true };
      smartNotifyRequestPermission();
      return;
    }
    if(typeof Notification !== "undefined" && Notification.permission === "default" && !(isIOSDevice() && !isStandalonePWA())){
      requestNotificationPermission();
    }
  }catch(e){ console.error("reminder permission request failed:", e); }
}
function chooseReminderSlot(slot, fromSettings){
  if(!REMINDER_SLOTS.some(s => s.id === slot)) slot = "none";
  DATA.settings.reminderSlot = slot;
  if(slot !== "none"){
    trackFunnel("reminder_set", { slot });
    requestReminderPermission();
  }
  qsStep = null;
  save();
  if(typeof smartNotifyTouch === "function") smartNotifyTouch(true);
  renderAll();
  if(typeof plusMaybeHandlePendingInvite === "function") setTimeout(plusMaybeHandlePendingInvite, 400);
  if(fromSettings) showToast(slot === "none" ? "یادآوری خاموش شد" : `یادآوری: ${REMINDER_SLOTS.find(s => s.id === slot).label} ✓`);
}
// برای کسی که اولین عادتش رو از مسیری غیر از «شروع سریع» ساخت (فرم/حالت خالی): همون سؤال، به‌صورت کارت
function renderReminderAskCard(){
  const f = DATA.funnel || {};
  if(!f.first_habit || DATA.settings.reminderSlot || !(DATA.activities || []).length) return ``;
  return `<div class="card reminder-ask">
    <div style="font-weight:800; margin-bottom:8px;">🔔 چه موقع یادت بندازم؟</div>
    <div class="suggest-chips" style="justify-content:center;">
      ${REMINDER_SLOTS.map(s => `<button type="button" class="suggest-chip" onclick="chooseReminderSlot('${s.id}')">${s.icon} ${s.label} ${toFaDigits(s.time)}</button>`).join("")}
      <button type="button" class="suggest-chip" onclick="chooseReminderSlot('none')">نه ممنون</button>
    </div>
  </div>`;
}
function renderReminderSettingsCard(){
  const cur = DATA.settings.reminderSlot || "none";
  return `
    <div class="section-title">⏰ زمان یادآوری عادت‌ها</div>
    <div class="card">
      <div class="suggest-chips" style="justify-content:flex-start;">
        ${REMINDER_SLOTS.map(s => `<button type="button" class="suggest-chip ${cur === s.id ? 'on' : ''}" onclick="chooseReminderSlot('${s.id}', true)">${s.icon} ${s.label} ${toFaDigits(s.time)}</button>`).join("")}
        <button type="button" class="suggest-chip ${cur === 'none' ? 'on' : ''}" onclick="chooseReminderSlot('none', true)">خاموش</button>
      </div>
      <div class="note" style="margin-top:8px;">یادآوری فقط وقتی میاد که عادت امروزت هنوز تیک نخورده. ساعت سکوت ۲۲:۳۰ تا ۰۸:۰۰ رعایت می‌شه.</div>
    </div>`;
}

/* ---- A4: «امروز» ساده برای کاربر تازه (Progressive disclosure) ---- */
function totalCheckins(){
  return Object.values(DATA.history || {}).reduce((n, ids) => n + ((ids || []).length), 0);
}
function isNewUserMode(){
  if(DATA.settings && DATA.settings.showAllSections) return false;
  if(totalCheckins() >= 3) return false;
  const created = Date.parse(currentProfileMeta().createdAt || "");
  if(!isNaN(created)) return (Date.now() - created) / 86400000 < 3;
  // تاریخ ساخت حساب در دسترس نیست → فقط اگه همین تازگی «شروع سریع» رو دیده
  const qs = Date.parse((DATA.funnel && DATA.funnel.quickstart_shown) || "");
  return !isNaN(qs) && (Date.now() - qs) / 86400000 < 3;
}
function showAllTodaySections(){
  DATA.settings.showAllSections = true;
  save();
  renderAll();
}

/* ---- A5: حالت خالی «امروز» ---- */
function renderEmptyHabitsCard(){
  const picks = quickStartPickIndexes().slice(0, 6);
  return `<div class="card empty-habits" id="coach-activities">
    <div style="font-size:calc(34px * var(--font-scale)); color:var(--gold); margin-bottom:4px;">${pi("sprout")}</div>
    <div style="font-weight:800; font-size:var(--fs-17); margin-bottom:4px;">اولین عادتت رو اضافه کن</div>
    <div class="note" style="margin-bottom:12px; text-align:center;">یکی رو بزن تا همین الان اضافه بشه.</div>
    <div class="suggest-chips" style="justify-content:center;">
      ${picks.map(i => { const s = SUGGESTED_ACTIVITIES[i]; return `<button type="button" class="suggest-chip" onclick="quickAddActivity(${i})">${s.icon} ${QUICKSTART_LABELS[s.title] || s.title}</button>`; }).join("")}
    </div>
    <button class="btn btn-ghost" style="width:100%; padding:11px; margin-top:12px;" onclick="openActivityForm(null)">+ یه عادت دیگه</button>
  </div>`;
}

/* ---- A3: ساعت کاری فقط همون لحظه‌ای که لازمه (اولین باز شدن «مهم‌ترین قدم امروز») ---- */
function renderWorkHoursAskCard(){
  const wp = DATA.workProfile || {};
  if(wp.workStart || wp.employment || hasSeenTip("ask_work_hours")) return ``;
  return `<div class="card" style="margin-bottom:10px;">
    <div style="font-weight:800; margin-bottom:4px;">⏱️ معمولاً کی سر کاری؟</div>
    <div class="note" style="margin-bottom:10px;">تا «مهم‌ترین قدم» رو دور برنامه‌ی واقعی‌ت بچینیم. اختیاریه.</div>
    <div class="suggest-chips" style="justify-content:flex-start; margin-bottom:10px;">
      <button type="button" class="suggest-chip" onclick="selectEmploymentChip(this,'employed')">شاغل</button>
      <button type="button" class="suggest-chip" onclick="selectEmploymentChip(this,'freelancer')">فریلنسر</button>
      <button type="button" class="suggest-chip" onclick="selectEmploymentChip(this,'unemployed')">فعلاً کار ندارم</button>
    </div>
    <input type="hidden" id="wp_employment" value="">
    <div id="wp_hours_block"><div style="display:flex; gap:10px; margin-bottom:10px;">
      <input type="time" id="wp_work_start" class="goal-input" style="flex:1;" aria-label="شروع کار">
      <input type="time" id="wp_work_end" class="goal-input" style="flex:1;" aria-label="پایان کار">
    </div></div>
    <div style="display:flex; gap:8px;">
      <button class="btn btn-primary" style="padding:10px;" onclick="saveWorkHoursAsk()">ذخیره</button>
      <button class="btn btn-ghost" style="padding:10px;" onclick="dismissTip('ask_work_hours')">بعداً</button>
    </div>
  </div>`;
}
function saveWorkHoursAsk(){
  const employment = (document.getElementById("wp_employment") || {}).value || null;
  const ws = (document.getElementById("wp_work_start") || {}).value || "";
  const we = (document.getElementById("wp_work_end") || {}).value || "";
  const wp = Object.assign({completed:true, employment:null, workStart:"", workEnd:"", interests:[], interestsCustom:""}, DATA.workProfile || {});
  wp.employment = employment;
  wp.workStart = employment === "unemployed" ? "" : ws;
  wp.workEnd = employment === "unemployed" ? "" : we;
  DATA.workProfile = wp;
  DATA.importantStep = null; // با اطلاعات تازه دوباره انتخاب بشه
  DATA.seenTips = DATA.seenTips || {};
  DATA.seenTips.ask_work_hours = true;
  save();
  renderAll();
}

/* ---- حداقل نسخه‌ی مجاز اندروید (min_app_version) — پیام «آپدیت کن»، نه خرابی ---- */
let nativeAppVersion = null;
async function checkMinAppVersion(){
  if(!isNativeApp() || nativeAppVersion) return;
  try{
    const App = window.Capacitor && Capacitor.Plugins && Capacitor.Plugins.App;
    if(App && typeof App.getInfo === "function"){ const info = await App.getInfo(); nativeAppVersion = (info && info.version) || null; }
  }catch(e){}
}
function compareVersions(a, b){
  const pa = String(a || "0").split(".").map(x => parseInt(x, 10) || 0), pb = String(b || "0").split(".").map(x => parseInt(x, 10) || 0);
  for(let i = 0; i < Math.max(pa.length, pb.length); i++){ const d = (pa[i] || 0) - (pb[i] || 0); if(d) return d < 0 ? -1 : 1; }
  return 0;
}
function isAppOutdated(){
  const min = CLIENT_FLAGS.min_app_version;
  return !!(nativeAppVersion && min && min !== "0" && compareVersions(nativeAppVersion, min) < 0);
}
function renderUpdateBanner(){
  if(!isAppOutdated()) return ``;
  return `<div class="tip-banner" style="border-color:var(--gold-line);">
    <span class="pi-gold" style="margin-top:3px;">${pi("arrowUp")}</span><div class="tip-banner-text">نسخه‌ی جدید پله اومده. از بازار (یا همون جایی که نصبش کردی) آپدیتش کن.</div>
  </div>`;
}
// برای تصمیم «آپدیت بازار لازمه یا نه»: اپ اندروید وب رو از سرور می‌خونه یا از داخل خودش؟
function nativeWebSourceLabel(){
  if(!isNativeApp()) return "";
  const h = location.hostname || "";
  return /pelehapp\.ir$|vercel\.app$/.test(h) ? `سرور (${h}) — تغییرات وب بدون آپدیت بازار می‌رسه` : `داخل اپ (${location.origin}) — تغییرات وب با آپدیت بازار می‌رسه`;
}

function deleteActivity(id){
  if(!confirm("این فعالیت حذف بشه؟")) return;
  DATA.activities = DATA.activities.filter(a=>a.id!==id);
  save();
  closeOverlay();
  renderAll();
}

function openRewardForm(id){
  const r = id ? DATA.rewards.find(x=>x.id===id) : null;
  document.body.dataset.editingReward = id || "";
  openOverlay(`
    <h3>${r ? "ویرایش جایزه" : "جایزه جدید"}</h3>
    <div class="field">
      <label>عنوان جایزه</label>
      <input type="text" id="r_title" value="${r?r.title:''}" placeholder="مثلاً: یه بازی جدید">
    </div>
    <div class="field">
      <label>امتیاز لازم</label>
      <input type="text" inputmode="numeric" pattern="[0-9]*" id="r_points" value="${r?r.points:100}">
    </div>
    <div class="sheet-actions">
      ${r ? `<button class="btn btn-danger" onclick="deleteReward(${id}); closeOverlay();">حذف</button>` : `<button class="btn btn-ghost" onclick="closeOverlay()">انصراف</button>`}
      <button class="btn btn-primary" onclick="saveRewardForm()">ذخیره</button>
    </div>
  `);
}
function saveRewardForm(){
  const title = document.getElementById("r_title").value.trim();
  const points = parseInt(numInput("r_points")) || 0;
  if(!title || points<=0){ alert("عنوان و امتیاز رو درست وارد کن."); return; }
  const editingId = document.body.dataset.editingReward;
  if(editingId){
    const r = DATA.rewards.find(x=>x.id==editingId);
    r.title = title; r.points = points;
  } else {
    DATA.rewards.push({id: DATA.nextRewardId++, title, points});
  }
  save();
  closeOverlay();
  renderAll();
}
function deleteReward(id){
  if(!confirm("این جایزه حذف بشه؟")) return;
  DATA.rewards = DATA.rewards.filter(r=>r.id!=id);
  save();
  closeOverlay();
  renderAll();
}

function openTaskForm(){
  document.body.dataset.tempPriority = "important";
  openOverlay(`
    <h3>کار جدید</h3>
    <div class="field">
      <label>عنوان کار</label>
      <input type="text" id="t_text" placeholder="مثلاً: پاسخ به ایمیل مشتری">
    </div>
    <div class="field">
      <label>اولویت</label>
      <div class="priority-picker" id="priorityPicker"></div>
    </div>
    <div class="sheet-actions">
      <button class="btn btn-ghost" onclick="closeOverlay()">انصراف</button>
      <button class="btn btn-primary" onclick="saveTaskForm()">افزودن</button>
    </div>
  `);
  renderPriorityPicker();
}
function renderPriorityPicker(){
  const cur = document.body.dataset.tempPriority;
  const opts = [["urgent","ضروری"],["important","مهم"],["deferrable","قابل‌تعویق"]];
  document.getElementById("priorityPicker").innerHTML = opts.map(([k,l])=>`
    <button type="button" class="priority-opt ${k} ${cur===k?'on':''}" onclick="pickPriority('${k}')">${l}</button>
  `).join("");
}
function pickPriority(k){
  document.body.dataset.tempPriority = k;
  renderPriorityPicker();
}
function saveTaskForm(){
  const text = document.getElementById("t_text").value;
  const priority = document.body.dataset.tempPriority || "important";
  if(!text.trim()){ alert("عنوان کار رو بنویس."); return; }
  addTask(text, priority);
  closeOverlay();
  renderAll();
}

/* ===================== Settings actions ===================== */

const SECTION_LABELS = {
  tasks: "کارهای امروز (⭐ برای مهم‌ترین‌ها)",
  mainActivity: "فعالیت اصلی امروز (چرخشی)",
  coreActivities: "پایه‌های روزانه",
  notes: "یادداشت‌های امروز",
  mood: "حال امروز",
  ladder: "نوار تا جایزه بعدی"
};
function sectionToggleRows(){
  const sec = DATA.settings.sections;
  return Object.keys(SECTION_LABELS).map(key => `
    <div class="row-between" style="padding:9px 0; border-bottom:1px solid var(--line);">
      <div class="switch ${sec[key]?'on':''}" onclick="toggleSection('${key}')"></div>
      <div style="font-size:calc(13px * var(--font-scale));">${SECTION_LABELS[key]}</div>
    </div>`).join("");
}
function toggleSection(key){
  DATA.settings.sections[key] = !DATA.settings.sections[key];
  save();
  renderAll();
}

/* ---- سیاست حریم خصوصی (داخل اپ، بدون خروج از برنامه — دکمه‌ی Back اندروید هم می‌بندتش) ---- */
function openPrivacyPolicy(){
  openOverlay(`
    <h3 style="margin-bottom:8px;">سیاست حریم خصوصی</h3>
    <iframe src="privacy.html" title="سیاست حریم خصوصی" style="width:100%; height:65vh; border:1px solid var(--border); border-radius:12px; background:var(--surface);"></iframe>
    <div class="sheet-actions"><button class="btn btn-primary" onclick="closeOverlay()">بستن</button></div>
  `);
}
/* ---- درخواست حذف حساب ----
   از همون کانال پشتیبانی که پنل ادمین می‌بینه ثبت می‌شه؛ ادمین با تابع peleh_delete_user
   (migration 011) حساب رو کامل پاک می‌کنه. */
async function requestAccountDeletion(){
  if(!currentUser || !sb) return;
  const ok = confirm("درخواست حذف حساب ثبت بشه؟\n\nبعد از بررسی، حساب و همه‌ی اطلاعاتت (فعالیت‌ها، امتیازها، عکس‌ها، کتاب‌ها، اطلاعات سلامت و...) برای همیشه پاک می‌شه و قابل برگشت نیست. اشتراک Premium باقی‌مونده هم از بین می‌ره.");
  if(!ok) return;
  try{
    const body = `🗑️ درخواست حذف حساب\nشناسه: ${currentUser.id}\nحساب: ${accountLoginLabel()}\nلطفاً حساب و همه‌ی اطلاعات من رو حذف کنید.`;
    const { error } = await sb.from('support_messages').insert({ user_id: currentUser.id, sender: 'user', body });
    if(error) throw error;
    alert("درخواستت ثبت شد ✅\nحداکثر ظرف ۱۰ روز کاری حسابت حذف می‌شه و از طریق پشتیبانی بهت خبر می‌دیم. اگه منصرف شدی، تو بخش پشتیبانی بنویس.");
  }catch(e){
    alert("ثبت درخواست ناموفق بود — اینترنتت رو چک کن و دوباره امتحان کن.");
  }
}

/* ---- اشتراک‌گذاری / ذخیره‌ی فایل ----
   WebView اندروید نه Web Share API رو پشتیبانی می‌کنه نه لینک دانلود <a download>؛ برای همین
   تو اپ اندروید دکمه‌های «دانلود پشتیبان»، «اشتراک خلاصه‌ی هفته»، «کلاژ هفته»، «اشتراک خاطره» و
   «کد معرف» هیچ کاری نمی‌کردن. تو اپ: فایل تو حافظه‌ی موقت اپ نوشته می‌شه (@capacitor/filesystem)
   و منوی اشتراک اندروید باز می‌شه (@capacitor/share) — کاربر می‌تونه تو Files ذخیره کنه یا تو
   تلگرام بفرسته. هیچ‌کدوم از این دو پلاگین دسترسی (permission) جدیدی نمی‌خوان. تو وب مثل قبل. */
function _nativePlugins(){
  const P = window.Capacitor && Capacitor.Plugins;
  return (isNativeApp() && P) ? P : null;
}
function blobToBase64(blob){
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(',')[1] || '');
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}
function _isShareCancel(e){
  return !!e && (e.name === "AbortError" || /cancel/i.test(String(e.message || e)));
}
async function shareOrSaveFile(blob, filename, opts = {}){
  const P = _nativePlugins();
  if(P){
    if(!P.Filesystem || !P.Share){
      alert("این امکان تو این نسخه‌ی اپ فعال نیست — لطفاً اپ رو به‌روز کن.");
      return "unsupported";
    }
    try{
      const data = await blobToBase64(blob);
      const { uri } = await P.Filesystem.writeFile({ path: filename, data, directory: "CACHE" });
      await P.Share.share({ title: opts.title || "پله", text: opts.text || undefined, files: [uri], dialogTitle: opts.dialogTitle || "ذخیره یا ارسال" });
      return "shared";
    }catch(e){
      if(_isShareCancel(e)) return "cancelled";
      throw e;
    }
  }
  const file = new File([blob], filename, { type: blob.type || "application/octet-stream" });
  if(navigator.canShare && navigator.canShare({ files: [file] })){
    try{ await navigator.share({ files: [file], title: opts.title || "پله", text: opts.text || undefined }); return "shared"; }
    catch(e){ if(_isShareCancel(e)) return "cancelled"; /* بعضی مرورگرها canShare=true ولی share خطا — برو سراغ دانلود */ }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  return "downloaded";
}
async function shareText(text){
  const P = _nativePlugins();
  try{
    if(P && P.Share){ await P.Share.share({ text, dialogTitle: "ارسال" }); return; }
    if(navigator.share){ await navigator.share({ text }); return; }
  }catch(e){ if(_isShareCancel(e)) return; }
  try{
    if(navigator.clipboard && window.isSecureContext){ await navigator.clipboard.writeText(text); alert("کپی شد!"); return; }
  }catch(e){}
  window.prompt("این متن رو کپی کن:", text);
}
async function exportData(){
  const meta = currentProfileMeta();
  const payload = {name: meta.name, birthdate: meta.birthdate, photo: meta.photo, phone: meta.phone, data: DATA};
  const blob = new Blob([JSON.stringify(payload, null, 2)], {type:"application/json"});
  try{
    await shareOrSaveFile(blob, `peleh-backup-${todayKey()}.json`, { title: "پشتیبان پله", dialogTitle: "ذخیره‌ی فایل پشتیبان" });
  }catch(e){
    console.error("export failed:", e);
    alert("ساخت فایل پشتیبان ناموفق بود — دوباره امتحان کن.");
  }
}
function triggerImportPicker(){
  document.getElementById('importInput').click();
}
function onImportSelected(input){
  const file = input.files && input.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    let payload;
    try{
      payload = JSON.parse(e.target.result);
      if(!payload || !payload.data) throw new Error('invalid shape');
    }catch(err){
      alert('این فایل پشتیبان معتبر نیست.');
      return;
    }
    const meta = currentProfileMeta();
    if(!confirm(`این کار همه‌ی اطلاعات پروفایل «${meta.name}» رو با محتوای این فایل جایگزین می‌کنه (مثلاً برای هماهنگ کردن با گوشیت). مطمئنی؟`)) return;
    if(payload.name) meta.name = payload.name;
    if(payload.birthdate) meta.birthdate = payload.birthdate;
    if(payload.photo) meta.photo = payload.photo;
    if(payload.phone) meta.phone = payload.phone;
    DATA = normalizeProfileData(payload.data);
    save();
    input.value = "";
    alert('بازیابی شد ✅');
    renderAll();
  };
  reader.readAsText(file);
}
function resetAll(){
  if(!confirm("همه‌ی امتیازها، تاریخچه و تنظیمات حسابت پاک میشه. مطمئنی؟")) return;
  DATA = blankProfileData();
  save();
  renderAll();
}

/* ---- Zibal payment return handling.
   Web: Zibal redirects back to this same page with ?trackId=... in the URL.
   Android app (direct-APK install): Zibal returns to payment-return.html on the website, which
   opens the app through the pelehapp://payment-return?trackId=... deep link → handleAppDeepLink().
   Before this fix nothing in the app listened for that deep link, so on Android the payment went
   through but was never verified and Premium never switched on.
   We always verify server-side (success=1 in a URL proves nothing on its own), then reload the
   profile. Each trackId is only ever verified once per device. ---- */
function _processedTrackIds(){
  try{ return JSON.parse(localStorage.getItem('pelehProcessedTrackIds') || '[]'); }catch(e){ return []; }
}
function _markTrackIdProcessed(trackId){
  try{
    const list = _processedTrackIds().filter(t => t !== trackId);
    list.push(trackId);
    localStorage.setItem('pelehProcessedTrackIds', JSON.stringify(list.slice(-20)));
  }catch(e){}
}
async function handleZibalReturnIfAny(trackIdFromDeepLink){
  const fromUrl = !trackIdFromDeepLink;
  const trackId = trackIdFromDeepLink || new URLSearchParams(location.search).get('trackId');
  if(!trackId) return;
  if(!currentUser || !sb) return; // بعد از ورود دوباره امتحان می‌شه (completeSignIn صداش می‌زنه)
  if(fromUrl){ try{ history.replaceState(null, "", location.pathname); }catch(e){} }
  if(_processedTrackIds().includes(String(trackId))) return;
  _markTrackIdProcessed(String(trackId));
  try{
    const { data, error } = await invokeEdge('verify-payment', { body: { trackId } });
    if(!error && data?.success){
      await reloadProfileKeepingLocalEdits();
      renderAll();
      alert("پرداخت با موفقیت انجام شد و اشتراک پرمیوم فعال شد 🎉");
    }else{
      // اگه این تراکنش مال پرمیوم نبود، شاید مال اشتراک سلامت پلاس باشه
      if(data && /پیدا نشد/.test(String(data.error || "")) && typeof plusVerifyZibal === "function"){
        const handled = await plusVerifyZibal(trackId);
        if(handled) return;
      }
      alert(data?.error || "پرداخت تایید نشد. اگه مبلغ از حسابت کم شده، با پشتیبانی در میون بذار (کد پیگیری: " + trackId + ").");
    }
  }catch(e){
    alert("مشکلی در تایید پرداخت پیش اومد. اگه مبلغ از حسابت کم شده، با پشتیبانی در میون بذار (کد پیگیری: " + trackId + ").");
  }
}

/* ---- Deep links into the Android app (pelehapp://...) ----
   pelehapp://payment-return?trackId=...   → Zibal payment (direct-APK install)
   pelehapp://auth-callback#access_token=… → Google sign-in coming back from the browser */
let _bootDoneResolve;
const bootDone = new Promise(r => { _bootDoneResolve = r; });
const _handledDeepLinks = new Set();
function queueDeepLink(url){
  if(!url || _handledDeepLinks.has(url)) return;
  _handledDeepLinks.add(url);
  bootDone.then(() => handleAppDeepLink(url)).catch(e => console.error("deep link failed:", e));
}
async function handleAppDeepLink(url){
  let u;
  try{ u = new URL(url); }catch(e){ return; }
  if(u.protocol !== "pelehapp:") return;
  const target = (u.host + u.pathname).replace(/^\/+/, "").toLowerCase();

  if(target.startsWith("payment-return")){
    const trackId = u.searchParams.get("trackId");
    if(trackId) await handleZibalReturnIfAny(trackId);
    return;
  }

  if(target.startsWith("auth-callback")){
    const hp = new URLSearchParams((u.hash || "").replace(/^#/, ""));
    const qp = u.searchParams;
    // auth-return.html روی اندروید توکن‌ها رو به‌صورت query می‌فرسته (تو intent:// علامت # رزرو شده‌ست)
    const pick = (k) => hp.get(k) || qp.get(k);
    if(pick("error_description") || pick("error")){ authError = "ورود با گوگل انجام نشد — دوباره امتحان کن."; renderAll(); return; }
    let res = null;
    const access_token = pick("access_token"), refresh_token = pick("refresh_token");
    const code = pick("code");
    try{
      if(access_token && refresh_token) res = await sb.auth.setSession({ access_token, refresh_token });
      else if(code) res = await sb.auth.exchangeCodeForSession(code);
      else return;
    }catch(e){ res = { error: e }; }
    if(!res || res.error){ authError = "ورود با گوگل ناموفق بود — دوباره امتحان کن."; renderAll(); return; }
    const user = res.data?.user || res.data?.session?.user;
    if(user){
      authError = "";
      authMode = "signin";
      await completeSignIn(user);
      renderAll();
    }
  }
}
function setupNativeAppHooks(){
  if(!isNativeApp()) return;
  const App = window.Capacitor && Capacitor.Plugins && Capacitor.Plugins.App;
  if(!App) return;
  try{ App.addListener('appUrlOpen', (ev) => queueDeepLink(ev && ev.url)); }catch(e){ console.error(e); }
  // Cold start: if Android had killed the app while the person was in the browser, the deep link
  // arrives as the launch URL instead of an appUrlOpen event.
  try{ Promise.resolve(App.getLaunchUrl()).then(r => { if(r && r.url) queueDeepLink(r.url); }).catch(()=>{}); }catch(e){}
  // Android back button: close whatever is open / go one level up, instead of exiting the app
  // from any screen that wasn't opened through history (auth sub-screens, tabs, book sub-pages).
  try{ App.addListener('backButton', handleNativeBack); }catch(e){ console.error(e); }
  // Returning from background after midnight → refresh «امروز» (see refreshIfDayChanged)
  try{ App.addListener('resume', refreshIfDayChanged); }catch(e){}
}
function handleNativeBack(){
  const overlay = document.getElementById("overlay");
  if(overlay && overlay.classList.contains("show")){ closeOverlay(); return; }
  if(!cloudReady) return;
  if(!currentUser){
    const parent = {
      signup_email: 'signup_choice', signup_phone: 'signup_choice', signup_otp: 'signup_email',
      signup_phone_otp: 'signup_phone', signin_phone_otp: 'signin_phone', reset_otp: 'reset_email',
    }[authMode] || (authMode !== 'signin' ? 'signin' : null);
    if(parent){ switchAuthMode(parent); return; }
    minimizeNativeApp(); return;
  }
  if(loadError || needsPasswordSetup || needsOnboarding() || needsWorkProfile() || qsStep === "reminder" || needsQuickStart()){ minimizeNativeApp(); return; }
  if(currentTab === "plus"){
    if(typeof plusHandleBack === "function" && plusHandleBack(true)) return;
    suppressHistoryPush = true; currentTab = "health"; renderAll(); suppressHistoryPush = false; return;
  }
  if(currentTab === "books" && typeof booksSubTab !== "undefined" && booksSubTab !== "home"){ booksSubTab = "home"; renderAll(); return; }
  // پله سلامت: اول از فرم ویرایش/پرسش‌نامه، بعد از زیرتب‌ها به «امروز» سلامت
  if(currentTab === "health" && typeof healthSubTab !== "undefined"){
    const hd = DATA.health;
    if(healthSetup && hd && hd.profile && hd.profile.completed){ healthSetup === "discovery" ? (healthSetup = "sports") : hCancelSetup(); renderAll(); return; }
    if(healthSetup === "discovery" || healthSetup === "sports"){ healthSetup = healthSetup === "discovery" ? "sports" : "basics"; renderAll(); return; }
    if(typeof hFoodForm !== "undefined" && hFoodForm && hd && hd.food && hd.food.completed){ hFoodForm = null; renderAll(); return; }
    if(healthSubTab !== "summary"){ healthSubTab = "summary"; renderAll(); return; }
  }
  if(SUB_PAGES.includes(currentTab)){ suppressHistoryPush = true; leaveSubpage(); suppressHistoryPush = false; return; }
  if(currentTab === "calendar" && calView === "month"){ calView = "week"; renderAll(); return; }
  if(currentTab !== "today"){ suppressHistoryPush = true; currentTab = "today"; renderAll(); suppressHistoryPush = false; return; }
  minimizeNativeApp();
}
function minimizeNativeApp(){
  const App = window.Capacitor && Capacitor.Plugins && Capacitor.Plugins.App;
  if(!App) return;
  try{
    if(typeof App.minimizeApp === "function") App.minimizeApp();
    else App.exitApp();
  }catch(e){ try{ App.exitApp(); }catch(_e){} }
}
/* If the app stays open (or sits in the background) past midnight, «امروز» kept showing
   yesterday until something happened to re-render — and a tap then went to the new day while the
   screen still showed the old one. Re-render as soon as the date changes. */
let lastRenderedDayKey = null;
function refreshIfDayChanged(){
  if(!cloudReady || !currentUser || lastRenderedDayKey === null) return;
  if(todayKey() === lastRenderedDayKey) return;
  const overlay = document.getElementById("overlay");
  if(overlay && overlay.classList.contains("show")) return; // don't yank a form the person is filling in
  const ae = document.activeElement;
  if(ae && (ae.tagName === "INPUT" || ae.tagName === "TEXTAREA")) return;
  renderAll();
}
document.addEventListener("visibilitychange", () => { if(document.visibilityState === "visible") refreshIfDayChanged(); });
setInterval(refreshIfDayChanged, 60000);

/* ===================== Boot ===================== */
applyTheme();
applyFontScale();
renderAll(); // shows the loading screen immediately

// Absolute failsafe: if boot() hasn't finished within 12s (a hung request somewhere), break out of
// the loading screen no matter what's still hanging inside it.
let _bootSettled = false;
setTimeout(() => {
  if(!_bootSettled){
    console.error("boot() didn't settle within 12s — forcing out of the loading screen instead of hanging forever");
    cloudReady = true;
    if(currentUser) loadError = true; // a session was found but loading its data never finished — show retry, not stale/blank data
    renderAll();
  }
}, 12000);

/* Auth events. Registered FIRST (before anything that can hang), so a sign-out is never missed.
   Rule: never await a Supabase call directly inside this callback — supabase-js may be holding
   its auth lock while it runs it (token refresh, tab-visibility checks) and waiting on another
   Supabase request from here can deadlock. Real work is deferred with setTimeout(0) and goes
   through completeSignIn(), which is deduplicated. */
function registerAuthListener(){
  sb.auth.onAuthStateChange((event, session) => {
    if(event === "SIGNED_OUT"){
      if(currentUser) handleSignedOutState();
      return;
    }
    if(event === "PASSWORD_RECOVERY"){
      // Legacy link-based recovery email (the main flow uses an emailed code instead)
      setTimeout(async () => {
        needsPasswordSetup = true;
        authMode = 'newpassword';
        authError = "";
        if(session && session.user) await completeSignIn(session.user);
        cloudReady = true;
        renderAll();
      }, 0);
      return;
    }
    if(event === "SIGNED_IN" && session && session.user){
      // Supabase re-fires SIGNED_IN whenever the tab/app regains visibility — NOT only on a real
      // new login. For the same user: just keep the fresher user object, don't reload or reset.
      if(currentUser && currentUser.id === session.user.id){ currentUser = session.user; return; }
      // A genuine new sign-in (e.g. in another tab, or after Google redirect)
      setTimeout(async () => { await completeSignIn(session.user); renderAll(); }, 0);
      return;
    }
    if((event === "TOKEN_REFRESHED" || event === "USER_UPDATED") && session && session.user && currentUser && currentUser.id === session.user.id){
      currentUser = session.user;
    }
  });
}

async function boot(){
  try{
    if(!sb){
      cloudReady = true;
      authError = "کتابخانه‌ی اتصال بارگذاری نشد — اتصال اینترنتت رو چک کن و برنامه رو دوباره باز کن.";
      renderAll();
      return;
    }
    registerAuthListener();
    setupNativeAppHooks();
    const { data } = await sb.auth.getSession();
    const session = data && data.session;
    if(session && session.user){
      await completeSignIn(session.user);
    }
    cloudReady = true;
    renderAll();
  } catch(e){
    console.error("boot() threw:", e);
    cloudReady = true;
    loadError = !!currentUser;
    if(!currentUser) authError = NET_ERROR_MSG;
    renderAll();
  } finally {
    _bootSettled = true;
    _bootDoneResolve();
  }
}
// Lightweight "online now" signal for the admin dashboard — pings last_seen every
// couple minutes while the app is open and the tab is visible. Best-effort; failures are silent.
let presenceTimer = null;
function pingPresence(){
  if(!sb || !currentUser) return;
  if(document.visibilityState !== "visible") return;
  sb.from('profiles').update({last_seen: new Date().toISOString()}).eq('id', currentUser.id).then(()=>{});
}
/* ===================== Push Notifications =====================
   Public key only — safe to embed in client code by design (this is how VAPID works; the
   PRIVATE key never leaves the server/Edge Function). If you ever need to rotate these,
   regenerate a pair and update both this constant and the Edge Function's secret together —
   an old subscription signed with the old key pair stops working once the public key changes,
   so everyone would need to re-subscribe (harmless, just re-shows the permission banner). */
const VAPID_PUBLIC_KEY = "BJuSaDpTeqBuMYhydcSLh9QNeqrxDBz7zoNj4ye5Fyr9QB3JZjEMRUgH7JBJCtsq1QRWuu_j25K0q0XCtD1Douw";

function isIOSDevice(){
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) || (ua.includes("Macintosh") && navigator.maxTouchPoints > 1);
}
function isStandalonePWA(){
  return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
}
function detectPushPlatform(){
  if(isIOSDevice()) return "ios";
  if(/Android/i.test(navigator.userAgent)) return "android";
  return "desktop";
}
function urlBase64ToUint8Array(base64String){
  const padding = "=".repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for(let i=0;i<rawData.length;i++) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}
/* Only actually subscribes (and never needs a fresh user gesture to do so) once permission is
   already "granted" — the gesture requirement is specifically for Notification.requestPermission()
   itself, not for pushManager.subscribe() afterward. Safe to call on every app load: it's a
   no-op if a subscription already exists, and self-heals (re-upserts) if the row in Supabase
   ever got out of sync — same defensive pattern as resyncLeaderboardIfNeeded elsewhere. */
async function ensurePushSubscribed(){
  if(!("serviceWorker" in navigator) || !("PushManager" in window)) return false;
  if(typeof Notification === "undefined" || Notification.permission !== "granted") return false;
  if(!currentUser || !sb) return false;
  try{
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if(!sub){
      sub = await reg.pushManager.subscribe({ userVisibleOnly:true, applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) });
    }
    const json = sub.toJSON();
    const { error } = await sb.from("push_subscriptions").upsert({
      user_id: currentUser.id,
      endpoint: json.endpoint,
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
      platform: detectPushPlatform(),
      updated_at: new Date().toISOString(),
    }, {onConflict:"user_id,endpoint"});
    if(error){ console.error("push subscription save failed:", error); return false; }
    return true;
  }catch(e){
    console.error("ensurePushSubscribed failed:", e);
    return false;
  }
}
async function requestNotificationPermission(){
  if(typeof Notification === "undefined"){ alert("مرورگرت از نوتیفیکیشن پشتیبانی نمی‌کنه."); return; }
  try{
    const perm = await Notification.requestPermission();
    if(perm === "granted") await ensurePushSubscribed();
  }catch(e){ console.error("requestNotificationPermission failed:", e); }
  renderAll();
}
/* Shown once at the very top of "امروز", for every user (existing or brand new) who hasn't
   yet answered the permission prompt — until they grant or deny it, or dismiss it for this
   session. iOS gets a different message: asking for permission before the PWA is installed
   to the home screen is pointless (Safari silently ignores it), so iOS sees install
   instructions instead of a permission button until it detects standalone mode. */
let pushBannerDismissedThisSession = false;
function dismissPushBannerThisSession(){ pushBannerDismissedThisSession = true; renderAll(); }
function renderPushPermissionBanner(){
  if(pushBannerDismissedThisSession) return ``;
  if(typeof Notification === "undefined") return ``;
  if(Notification.permission === "granted" || Notification.permission === "denied") return ``;
  if(isIOSDevice() && !isStandalonePWA()){
    return `<div class="tip-banner">
      <div class="tip-banner-text">📲 برای گرفتن یادآوری، اول از دکمه‌ی Share پایین صفحه‌ی Safari، «Add to Home Screen» رو بزن، بعد از همون آیکون روی صفحه‌ی اصلی وارد پله شو.</div>
      <button class="tip-banner-close" onclick="dismissPushBannerThisSession()">×</button>
    </div>`;
  }
  return `<div class="tip-banner">
    <span class="pi-muted" style="margin-top:3px;">${pi("bell")}</span><div class="tip-banner-text">وقتی یادت رفت یا استریکت در خطره، یادآوری کنیم؟</div>
    <button class="btn btn-primary" style="flex:none; padding:6px 12px; font-size:calc(11px * var(--font-scale));" onclick="requestNotificationPermission()">فعال کن</button>
    <button class="tip-banner-close" onclick="dismissPushBannerThisSession()">×</button>
  </div>`;
}

/* گزارش منبع نصب برای پنل ادمین (بازار / APK مستقیم / وب) — یک‌بار در هر بار باز شدن اپ.
   فقط برای اطلاع‌رسانی به کاربرهاست؛ خطاها بی‌صدا نادیده گرفته می‌شن. */
let clientSourceReported = false;
async function reportClientSource(){
  if(clientSourceReported || !sb || !currentUser) return;
  clientSourceReported = true;
  try{
    let source = "web", version = null;
    const channel = (typeof getStoreChannel === "function") ? await getStoreChannel() : "web";
    if(channel === "bazaar" || channel === "direct"){
      source = channel;
      if(typeof checkMinAppVersion === "function") await checkMinAppVersion();
      version = nativeAppVersion || null;
    } else {
      source = (typeof isStandalonePWA === "function" && isStandalonePWA()) ? "pwa" : "web";
    }
    await sb.rpc("peleh_report_client", { p_source: source, p_version: version });
  }catch(e){ clientSourceReported = false; }
}
function startPresenceHeartbeat(){
  pingPresence();
  reportClientSource();
  if(presenceTimer) clearInterval(presenceTimer);
  presenceTimer = setInterval(pingPresence, 120000);
  document.addEventListener("visibilitychange", pingPresence);
}
function stopPresenceHeartbeat(){
  if(presenceTimer) clearInterval(presenceTimer);
  presenceTimer = null;
}
// صفحه‌کلید/موس دسکتاپ: فوکوس و مکان‌نما بعد از هر رسم سر جاش می‌مونه (peleh-keys.js)
if(typeof pelehWrapRender === "function") renderAll = pelehWrapRender(renderAll);
boot();

// Registers the offline service worker when hosted on a real https:// domain.
// Silently does nothing when opened as a local file (file://) — that's expected and harmless.
if("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")){
  navigator.serviceWorker.register("sw.js").catch(()=>{});
}
