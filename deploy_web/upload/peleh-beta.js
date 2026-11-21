/* ===================== پله — نسخه‌ی بتا (batch 2026-11-03) =====================
   همه‌ی قابلیت‌های این دسته فقط وقتی isBeta() درسته (لیست peleh-beta-gate.js) روشن می‌شن.
   روش: توابع سراسری app.js / books.js / health.js / plus-workout.js «پیچیده» (wrap) می‌شن؛
   اول هر wrapper اگه کاربر بتا نیست، تابع اصلی دست‌نخورده صدا زده می‌شه و خروجیش بی‌تغییر برمی‌گرده.
   خود فایل‌های live هیچ تغییری نکردن؛ اگه این فایل لود نشه (404)، اپ دقیقاً همون live می‌مونه.

   داده‌ی بتا فقط برای کاربر بتا و فقط داخل DATA.beta (همون JSON پروفایل) ذخیره می‌شه؛ جدول/ستون تازه‌ای نیست.

   فهرست:
     F  وضعیت نوتیف این دستگاه + هشدار شکست اشتراک + ساعت ۲۱:۳۰
     E  متن بلند «کارهای امروز» (بعد از رندر، فقط DOM کاربر بتا)
     A2 اولین تیک داخل آنبوردینگ (+ پیش‌نمایش از تنظیمات)
     A3 یادآوری پیش‌فرض ۲۱:۳۰ برای کاربر تازه
     A4 کارت «امروز فقط یه پله»
     B  لَم: راهنمای آنبوردینگ، «کتاب لَم» (۴ سطح)، هویت ورزشی
     G  نمایش تصویری ۳۰ حرکت (free-exercise-db، Unlicense)
     C  BMI: تصویر خطی خنثی (اختیاری)
*/
function isBeta(){
  try{ return typeof pelehBetaUser === "function" && typeof currentUser !== "undefined" && !!currentUser && pelehBetaUser(currentUser.id); }
  catch(e){ return false; }
}
// batch 2026-11-08: لَم (B) برای همه‌ی کاربرهای واردشده روشنه وقتی PELEH_LAM_ALL = true؛ بقیه‌ی بخش‌ها هنوز isBeta()
function isLamOn(){
  try{ return isBeta() || (typeof PELEH_LAM_ALL !== "undefined" && PELEH_LAM_ALL === true && typeof currentUser !== "undefined" && !!currentUser); }
  catch(e){ return false; }
}
var PB = { ob: null, expanded: new Set(), pushLast: null, pushSyncAt: 0, lamCheckBusy: false };
function pbState(){ DATA.beta = DATA.beta || {}; return DATA.beta; }
function pbEsc(s){ return typeof escapeHtml === "function" ? escapeHtml(s) : String(s == null ? "" : s); }
function pbFa(n){ return typeof toFaDigits === "function" ? toFaDigits(n) : String(n); }

/* ===================================================================================
   B — لَم (لایه‌ها روی هم، بدون جابه‌جایی؛ ترتیب از lam/lam_app_anchors.json)
   فایل‌ها با اسم وصل شدن: با جایگزین کردن فایل همنام در lam/webp256 و lam/webp512 (مثلاً شال‌گردن،
   دمبل، توپ والیبال، زیرانداز یوگا که فردا دوباره رندر می‌شن) چیزی در کد عوض نمی‌شه؛ فقط LAM_ASSET_VER رو بالا ببر.
   =================================================================================== */
var LAM_ASSET_VER = "20261104";
var LAM_SPORTS = [
  { id: "football",   label: "فوتبال / فوتسال",       layer: "sport_football" },
  { id: "gym",        label: "باشگاه",                layer: "sport_gym" },
  { id: "running",    label: "پیاده‌روی / دویدن",      layer: "sport_running_shoes" },
  { id: "volleyball", label: "والیبال",               layer: "sport_volleyball" },
  { id: "yoga",       label: "یوگا / تمرین در خونه",   layer: "sport_yoga" },
  { id: "none",       label: "هیچ‌کدوم",              layer: null },
];
function lamSrc(name, size){ return `lam/webp${size === 512 ? 512 : 256}/${name}.webp?v=${LAM_ASSET_VER}`; }
function lamSport(){ const s = isLamOn() ? (pbState().sport || "none") : "none"; return LAM_SPORTS.some(x => x.id === s) ? s : "none"; }
/* figure: level 0..4، sport id، face: E01_smirk | E03_curious | E08_kind | E10_happy */
function lamFigure(opts){
  opts = opts || {};
  const level = Math.max(0, Math.min(4, opts.level || 0));
  const sport = LAM_SPORTS.find(s => s.id === (opts.sport || "none")) || LAM_SPORTS[5];
  const size = opts.size === 512 ? 512 : 256;
  const face = opts.face || "E01_smirk";
  const L = [];
  L.push("lam_shadow", "lam_body");
  if(level > 0) L.push("steps_lit_L" + level);
  if(sport.id === "running") L.push("sport_running_shoes");
  L.push("lam_face_" + face);
  if(level >= 2) L.push("acc_L2_scarf");
  if(level >= 3) L.push("acc_L3_badge");
  if(level >= 1) L.push("acc_L1_glasses");
  if(level >= 4) L.push("acc_L4_beret");
  if(sport.layer && sport.id !== "running") L.push(sport.layer);
  // پلک زدن: لایه‌ی چشم بسته روی صورت، فقط با CSS (prefers-reduced-motion خاموشش می‌کنه)
  const blink = opts.blink !== false && face === "E01_smirk";
  return `<div class="lam-fig ${opts.cls || ""}" style="${opts.px ? `width:${opts.px}px;height:${opts.px}px;` : ""}${opts.style || ""}" role="img" aria-label="${pbEsc(opts.alt || "لَم، شخصیت پله")}">
    ${L.map(n => `<img src="${lamSrc(n, size)}" alt="" draggable="false" decoding="async">`).join("")}
    ${blink ? `<img class="lam-blink" src="${lamSrc("lam_face_E01_blink", size)}" alt="" draggable="false">` : ""}
  </div>`;
}

/* صدای لَم: فقط جمله‌های از پیش نوشته‌شده. طعنه فقط به خودش، هیچ‌وقت به کاربر؛ بدون شوخی بدن/وزن/پول/جنسیت.
   پیشنهادهای هوش مصنوعی هیچ‌وقت با صدای لَم نیستن و مثل قبل زیر «پله می‌گه» نشون داده می‌شن. */
var LAM_LINES = [
  "من لَم‌ام. معمولاً از فردا شروع می‌کنم؛ امروز استثنائاً اومدم.",
  "یه پله کافیه. من خودم گاهی روی همون اولی می‌شینم.",
  "تو تیک زدی؛ من هنوز دارم برنامه می‌ریزم که برنامه بریزم.",
  "عینکم رو زدم که بهونه‌هام رو واضح‌تر ببینم.",
  "امروز کم هم حسابه. اینو یکی می‌گه که استاد کم انجام دادنه.",
  "یه بار تصمیم گرفتم ده تا عادت بسازم. هنوز دارم به اولیش فکر می‌کنم.",
  "لازم نیست مثل من «از شنبه» شروع کنی.",
  "پله‌هام روشن شدن. معلوم شد خودم هم می‌تونم.",
  "هر صفحه یه پله‌ست. من یه بار نصف یه صفحه رو هم جشن گرفتم.",
  "شال‌گردنم رو خودم نبافتم؛ ولی خودم به دستش آوردم.",
  "یه روز جا موند؟ اشکالی نداره. من کل هفته‌ها رو جا انداختم و هنوز اینجام.",
  "امروز فقط یه پله. بقیه‌ش با من، که معمولاً هیچ کاری نمی‌کنم.",
  "نشون روی سینه‌م یعنی یه چالش رو تا آخر رفتم. خودم هم باورم نمی‌شه.",
  "کلاهم رو گذاشتم؛ رسماً یه کم از همیشه کمتر لم می‌دم.",
  "من استاد بهونه‌ام. ولی بهونه‌هام هیچ‌وقت تیک نخوردن.",
  "آروم برو. منم آروم میام؛ خیلی آروم.",
  "اگه امروز سخت بود، کوچیک‌ترش کن. من همیشه همین کار رو می‌کنم، فقط زیادی کوچیک.",
  "من دیروز گفتم از امروز. امروز گفتم از فردا. تو یه پله جلوتری.",
  "یه لیوان آب هم یه پله‌ست. من حتی اونم گاهی یادم می‌ره.",
  "پله‌ها فرار نمی‌کنن. منم فرار نمی‌کنم؛ فقط لم می‌دم.",
];
var LAM_LEVEL_LINES = {
  1: "عینک گرفتم. هفت روز خوندن (یا پنجاه صفحه) برای من یعنی یه عمر.",
  2: "شال‌گردن! پونزده روز تو چالش موندی. من پونزده دقیقه هم سخت می‌مونم.",
  3: "نشون سینه. یه چالش رو کامل تموم کردی و من فقط تماشا کردم.",
  4: "کلاه هم رسید؛ دو تا چالش. همه‌ی پله‌هام روشنه و دیگه بهونه‌ای ندارم.",
};
function lamLineOfDay(seed){
  const d = new Date(); const k = d.getFullYear() * 400 + (d.getMonth() + 1) * 32 + d.getDate() + (seed || 0);
  return LAM_LINES[k % LAM_LINES.length];
}

/* ---------- «کتاب لَم»: سطح‌ها از داده‌ی کتاب موجود (DATA.books) ---------- */
var LAM_LEVELS = [
  { n: 1, acc: "عینک",       crit: "۷ روز ثبت مطالعه یا ۵۰ صفحه" },
  { n: 2, acc: "شال‌گردن",   crit: "۱۵ روز مطالعه داخل یه چالش یا ۱۵۰ صفحه" },
  { n: 3, acc: "نشان سینه",  crit: "یه چالش ۳۰ روزه (یا بلندتر) کامل" },
  { n: 4, acc: "کلاه برِه",   crit: "۲ چالش کامل" },
];
function lamProgress(){
  const b = (typeof ensureBooksData === "function") ? ensureBooksData() : { log: [], challenges: [] };
  const log = Array.isArray(b.log) ? b.log : [];
  const pages = log.reduce((n, l) => n + (Number(l.pages) || 0), 0);
  const days = new Set(log.map(l => l.dateKey).filter(Boolean)).size;
  let chDays = 0;
  (b.challenges || []).forEach(c => {
    if(!c || !c.joinedAt) return;
    const s = new Date(c.joinedAt); s.setHours(0, 0, 0, 0);
    const from = todayKey(s);
    const to = c.done && c.doneAt ? todayKey(new Date(c.doneAt)) : "9999-99-99";
    const n = new Set(log.filter(l => l.dateKey >= from && l.dateKey <= to).map(l => l.dateKey)).size;
    if(n > chDays) chDays = n;
  });
  const doneCh = (b.challenges || []).filter(c => c && c.done).length;
  const ok = [
    days >= 7 || pages >= 50,
    chDays >= 15 || pages >= 150,
    doneCh >= 1,
    doneCh >= 2,
  ];
  let level = 0;
  for(let i = 0; i < 4; i++){ if(ok[i]) level = i + 1; else break; }
  const bars = [
    Math.max(Math.min(1, days / 7), Math.min(1, pages / 50)),
    Math.max(Math.min(1, chDays / 15), Math.min(1, pages / 150)),
    Math.min(1, doneCh / 1),
    Math.min(1, doneCh / 2),
  ];
  const detail = [
    `${pbFa(Math.min(days, 7))} از ۷ روز · ${pbFa(Math.min(pages, 50))} از ۵۰ صفحه`,
    `${pbFa(Math.min(chDays, 15))} از ۱۵ روز چالش · ${pbFa(Math.min(pages, 150))} از ۱۵۰ صفحه`,
    `${pbFa(Math.min(doneCh, 1))} از ۱ چالش`,
    `${pbFa(Math.min(doneCh, 2))} از ۲ چالش`,
  ];
  return { level, pages, days, chDays, doneCh, bars, detail };
}
// پله‌ها روشن می‌مونن: سطح نمایش = بیشترین سطحی که تا حالا رسیده
function lamLevel(){
  const p = lamProgress().level;
  const max = isLamOn() ? (pbState().lamMax || 0) : 0;
  return Math.max(p, max);
}
function openLamBook(){
  if(!isLamOn()) return;
  const pr = lamProgress(), lvl = Math.max(pr.level, pbState().lamMax || 0);
  const sport = lamSport();
  openOverlay(`<div class="pb-sheet">
    <div class="row-between" style="margin-bottom:6px;"><h3 style="margin:0;">کتاب لَم</h3><button class="icon-btn" onclick="closeOverlay()" aria-label="بستن">✕</button></div>
    <div class="pb-lam-hero">${lamFigure({ level: lvl, sport, face: lvl >= 1 ? "E08_kind" : "E01_smirk", size: 512, px: 200 })}
      <div class="pb-lam-say"><span class="pb-lam-name">لَم:</span> ${pbEsc(lamLineOfDay(1))}</div></div>
    <div class="note" style="margin:8px 0 10px;">لَم با خوندن تو پله‌پله لباس می‌گیره. پله‌هایی که روشن می‌شن، روشن می‌مونن.</div>
    ${LAM_LEVELS.map((L, i) => {
      const got = lvl >= L.n;
      return `<div class="pb-level ${got ? "got" : ""}">
        <div class="pb-level-ic">${got ? "✓" : pbFa(L.n)}</div>
        <div style="flex:1; min-width:0;">
          <div class="pb-level-t">سطح ${pbFa(L.n)} · ${L.acc}</div>
          <div class="note" style="line-height:1.6;">${L.crit}</div>
          ${got ? `` : `<div class="pb-bar"><i style="width:${Math.round(pr.bars[i] * 100)}%"></i></div><div class="note" style="font-size:var(--fs-12);">${pr.detail[i]}</div>`}
        </div>
        ${pbAccThumb(i, got)}
      </div>`;
    }).join("")}
    <div class="section-title" style="margin-top:18px;">ورزش لَم</div>
    <div class="note" style="margin-bottom:8px;">هویت ورزشی‌ت؛ فقط کنار پا یا تو دستش دیده می‌شه.</div>
    ${pbSportPicker("pbSetSport")}
    <div class="note" style="margin-top:12px; opacity:.85;">پیشنهادهای هوش مصنوعی مثل قبل زیر «پله می‌گه» میان؛ لَم فقط جمله‌های از پیش نوشته‌شده‌ی خودش رو می‌گه.</div>
  </div>`);
}
// تصویر کوچیک هر جایزه، زوم‌شده روی نقطه‌ی لنگرش (lam_app_anchors.json)
var LAM_ACC_THUMB = [["acc_L1_glasses", 0.36, 0.30, 190], ["acc_L2_scarf", 0.49, 0.62, 95], ["acc_L3_badge", 0.348, 0.491, 300], ["acc_L4_beret", 0.38, 0.12, 150]];
function pbAccThumb(i, got){
  const t = LAM_ACC_THUMB[i], box = 52;
  return `<span class="pb-crop pb-acc ${got ? "" : "off"}" style="width:${box}px;height:${box}px;"><img src="${lamSrc(t[0], 512)}" alt="" style="position:absolute; width:${t[3]}px; height:${t[3]}px; max-width:none; left:${Math.round(box / 2 - t[1] * t[3])}px; top:${Math.round(box / 2 - t[2] * t[3])}px;"></span>`;
}
function pbSportPicker(fn, cur){
  cur = cur || lamSport();
  return `<div class="pb-sport-grid">${LAM_SPORTS.map(s => `<button type="button" class="pb-sport ${cur === s.id ? "on" : ""}" aria-pressed="${cur === s.id}" onclick="${fn}('${s.id}')">
    <span class="pb-crop">${lamFigure({ sport: s.id, size: 512, px: 170, blink: false, alt: "لَم با " + s.label, style: pbCropStyle(s.id, 170, 64) })}</span><span>${s.label}</span></button>`).join("")}</div>`;
}
// نقطه‌ی لنگر هر وسیله روی بوم (lam_app_anchors.json، نرمال‌شده)؛ کاشی انتخاب ورزش روی همون نقطه زوم می‌کنه
var LAM_SPORT_ANCHOR = { football: [0.795, 0.90], yoga: [0.795, 0.92], gym: [0.762, 0.776], volleyball: [0.231, 0.744], running: [0.5, 0.90], none: [0.36, 0.33] };
function pbCropStyle(id, px, box){
  const a = LAM_SPORT_ANCHOR[id] || LAM_SPORT_ANCHOR.none;
  return `position:absolute; left:${Math.round(box / 2 - a[0] * px)}px; top:${Math.round(box / 2 - a[1] * px)}px;`;
}
function pbSetSport(id){
  if(!isLamOn() || !LAM_SPORTS.some(s => s.id === id)) return;
  pbState().sport = id; save();
  openLamBook();
}
function pbCheckLamLevelUp(){
  if(!isLamOn() || PB.ob || PB.lamCheckBusy) return;
  const st = pbState();
  const lvl = lamProgress().level;
  if(lvl <= (st.lamMax || 0)) return;
  st.lamMax = lvl; save();
  const ov = document.getElementById("overlay");
  if(ov && ov.classList.contains("show")) return; // وسط کار دیگه‌ای نپره؛ دفعه‌ی بعد «کتاب لَم» نشونش می‌ده
  PB.lamCheckBusy = true;
  setTimeout(() => {
    PB.lamCheckBusy = false;
    openOverlay(`<div class="pb-sheet" style="text-align:center;">
      ${lamFigure({ level: lvl, sport: lamSport(), face: "E10_happy", size: 512, px: 200, blink: false, cls: "pb-pop" })}
      <div style="font-weight:800; font-size:var(--fs-17); margin-top:6px;">سطح ${pbFa(lvl)} کتاب لَم</div>
      <div class="pb-lam-say" style="margin:8px auto 14px;"><span class="pb-lam-name">لَم:</span> ${pbEsc(LAM_LEVEL_LINES[lvl])}</div>
      <button class="btn btn-primary" style="width:100%;" onclick="closeOverlay()">باشه</button>
    </div>`);
  }, 700);
}

/* ===================================================================================
   F — وضعیت نوتیف + ساعت ۲۱:۳۰ (A3)
   =================================================================================== */
var PB_SLOTS = (typeof REMINDER_SLOTS !== "undefined" ? REMINDER_SLOTS : []).concat([{ id: "late", label: "آخر شب", time: "21:30", icon: "🌌" }]);
function pbPushFailHint(){
  if(PB.pushLast && PB.pushLast.stage === "save") return "اجازه داده شد ولی ذخیره‌ی اشتراک نوتیف نشد؛ اینترنت رو چک کن و از تنظیمات دوباره «فعال کن» رو بزن.";
  return "این گوشی/مرورگر نوتیف وب نمی‌گیره (معمولاً گوشی بدون سرویس‌های گوگل یا مرورگر داخل اپ). با Chrome باز کن یا نسخه‌ی اندروید پله رو نصب کن.";
}
function pbWebPushState(){
  if(typeof nnAvailable === "function" && nnAvailable()) return "native";
  if(isIOSDevice() && !isStandalonePWA()) return "ios-install";
  if(typeof Notification === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) return "unsupported";
  if(Notification.permission === "denied") return "denied";
  if(Notification.permission !== "granted") return "default";
  if(PB.pushLast && !PB.pushLast.ok) return "failed";
  return PB.pushLast && PB.pushLast.ok ? "ok" : "checking";
}
async function pbTestLocalNotification(){
  try{
    const reg = await Promise.race([navigator.serviceWorker.ready, new Promise((_, rej) => setTimeout(() => rej(new Error("sw")), 5000))]);
    await reg.showNotification("پله", { body: "نوتیف آزمایشی: اگه اینو می‌بینی، نمایش نوتیف روی این گوشی درسته.", icon: "/icon-180.png", badge: "/icon-180.png", tag: "peleh-test", data: { url: "/" } });
    showToast("نوتیف آزمایشی فرستاده شد", { ms: 2500 });
  }catch(e){ showToast("نوتیف آزمایشی نشون داده نشد: " + ((e && e.message) || e), { ms: 5000 }); }
}
async function pbRetryPush(){
  const ok = await ensurePushSubscribed();
  showToast(ok ? "نوتیف فعاله ✓" : pbPushFailHint(), { ms: ok ? 2500 : 6000 });
  renderAll();
}
function pbPushStatusCard(){
  const st = pbWebPushState();
  if(st === "native") return ``;
  const line = (icon, text, extra) => `<div class="card"><div style="display:flex; gap:8px; align-items:flex-start;"><span style="flex:none;">${icon}</span><div style="flex:1; min-width:0;">${text}</div></div>${extra || ""}</div>`;
  const btn = (label, fn) => `<button type="button" class="btn btn-ghost" style="width:100%; padding:10px; margin-top:10px;" onclick="${fn}">${label}</button>`;
  let body;
  if(st === "ok") body = line("✅", "نوتیف روی این دستگاه فعاله.", btn("ارسال نوتیف آزمایشی", "pbTestLocalNotification()"));
  else if(st === "checking") body = line("⏳", "در حال بررسی اشتراک نوتیف…", btn("دوباره امتحان کن", "pbRetryPush()"));
  else if(st === "default") body = line("🔕", "نوتیف هنوز فعال نشده؛ بدون اجازه، یادآوری‌ها نمی‌رسن.", btn("فعال کردن نوتیف", "requestNotificationPermission()"));
  else if(st === "denied") body = line("🚫", "اجازه‌ی نوتیف برای پله بسته‌ست. از تنظیمات مرورگر/گوشی ← اعلان‌ها ← پله، اجازه رو روشن کن و صفحه رو دوباره باز کن.");
  else if(st === "ios-install") body = line("📲", "روی آیفون، نوتیف فقط وقتی میاد که پله رو با Share ← «Add to Home Screen» نصب کنی و از همون آیکون بازش کنی (iOS ۱۶.۴ به بالا).");
  else if(st === "failed") body = line("⚠️", pbEsc(pbPushFailHint()), btn("دوباره امتحان کن", "pbRetryPush()"));
  else body = line("⚠️", "این مرورگر نوتیف وب نداره (مثلاً مرورگر داخل تلگرام/اینستاگرام). پله رو با Chrome باز کن یا نسخه‌ی اندروید رو نصب کن.");
  return `<div class="section-title">🔔 وضعیت نوتیف این دستگاه</div>${body}`;
}

/* batch 2026-11-08 — نوتیف آیفون: وب‌پوش آیفون فقط داخل PWA نصب‌شده (iOS 16.4+) و فقط با لمس کاربر اجازه می‌گیره.
   • PWA نصب‌شده و اجازه هنوز پرسیده نشده ← کارت «فعال‌سازی یادآور» بالای «امروز» (دکمه = لمس کاربر ← اجازه ← اشتراک ← ذخیره)
   • اجازه داده شده ولی اشتراک/ذخیره شکست خورده ← همون‌جا خطا با «دوباره امتحان کن» (دیگه بی‌صدا نیست)
   • هر بار باز شدن اپ (completeSignIn) و هر ۶ ساعت با برگشتن به اپ، اشتراک گرفته/تازه و upsert می‌شه. */
var PB_PUSH_ASK_KEY = "pelehPushAskSkip";
function pbPushFixBanner(){
  try{
    if(typeof nnAvailable === "function" && nnAvailable()) return ``;          // اپ اندروید: نوتیف محلی خودش
    if(typeof Notification === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) return ``;
    if(!isStandalonePWA()) return ``;                                          // تب مرورگر: صفحه‌ی نصب (peleh-install.js) راهنمایی می‌کنه
    if(Notification.permission === "default"){
      let skip = 0; try{ skip = parseInt(sessionStorage.getItem(PB_PUSH_ASK_KEY) || "0", 10) || 0; }catch(e){}
      if(skip) return ``;
      return `<div class="card pb-push-ask" role="region" aria-label="فعال‌سازی یادآور">
        <div style="font-weight:800; margin-bottom:4px;">🔔 فعال‌سازی یادآور</div>
        <div class="note">برای اینکه یادآورهای روزانه بیاد، دکمه رو بزن و تو پنجره‌ی بعدی «Allow» رو انتخاب کن.</div>
        <button type="button" class="btn btn-primary" style="width:100%; padding:12px; margin-top:10px;" onclick="requestNotificationPermission()">فعال‌سازی یادآور</button>
        <button type="button" class="pb-link" onclick="pbPushAskLater()">بعداً</button></div>`;
    }
    if(Notification.permission === "granted" && PB.pushLast && !PB.pushLast.ok){
      return `<div class="card pb-push-ask" role="alert">
        <div style="font-weight:800; margin-bottom:4px;">⚠️ یادآورها فعال نشد</div>
        <div class="note">${pbEsc(pbPushFailHint())}${PB.pushLast.msg ? `<br><span dir="ltr" style="font-size:11px; opacity:.75;">${pbEsc(String(PB.pushLast.msg).slice(0, 120))}</span>` : ``}</div>
        <button type="button" class="btn btn-ghost" style="width:100%; padding:10px; margin-top:10px;" onclick="pbRetryPush()">دوباره امتحان کن</button></div>`;
    }
  }catch(e){}
  return ``;
}
function pbPushAskLater(){ try{ sessionStorage.setItem(PB_PUSH_ASK_KEY, "1"); }catch(e){} renderAll(); }

(function wrapPush(){
  if(typeof ensurePushSubscribed !== "function") return;
  const origEnsure = ensurePushSubscribed;
  ensurePushSubscribed = async function(){
    if(!isBeta()) return origEnsure.apply(this, arguments);
    if(!("serviceWorker" in navigator) || !("PushManager" in window)) return false;
    if(typeof Notification === "undefined" || Notification.permission !== "granted") return false;
    if(!currentUser || !sb) return false;
    let stage = "subscribe";
    try{
      // serviceWorker.ready اگه SW ثبت نشده باشه هیچ‌وقت resolve نمی‌شه — با سقف زمانی
      const reg = await Promise.race([navigator.serviceWorker.ready, new Promise((_, rej) => setTimeout(() => rej(new Error("service worker not ready")), 10000))]);
      let sub = await reg.pushManager.getSubscription();
      if(!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) });
      stage = "save";
      const json = sub.toJSON();
      const { error } = await sb.from("push_subscriptions").upsert({
        user_id: currentUser.id, endpoint: json.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth,
        platform: typeof detectPushPlatform === "function" ? detectPushPlatform() : null,   // batch 2026-11-08: آیفون = 'ios'
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id,endpoint" });
      if(error){ PB.pushLast = { ok: false, stage, msg: error.message || String(error) }; return false; }
      PB.pushLast = { ok: true }; PB.pushSyncAt = Date.now();
      return true;
    }catch(e){
      console.error("ensurePushSubscribed (beta) failed:", e);
      PB.pushLast = { ok: false, stage, msg: (e && (e.message || e.name)) || String(e) };
      return false;
    }
  };
  if(typeof requestNotificationPermission === "function"){
    const origReq = requestNotificationPermission;
    requestNotificationPermission = async function(){
      if(!isBeta()) return origReq.apply(this, arguments);
      if(typeof Notification === "undefined") return;
      try{
        const perm = await Notification.requestPermission();
        if(perm === "granted"){ const ok = await ensurePushSubscribed(); showToast(ok ? "یادآور روی این دستگاه فعال شد ✓" : pbPushFailHint(), { ms: ok ? 3000 : 6000 }); }
        else if(perm === "denied") showToast("اجازه‌ی نوتیف رد شد؛ از تنظیمات سایت/اپ می‌تونی دوباره روشنش کنی.", { ms: 5000 });
      }catch(e){ console.error("requestNotificationPermission (beta) failed:", e); }
      renderAll();
    };
  }
  if(typeof requestReminderPermission === "function"){
    const origRR = requestReminderPermission;
    requestReminderPermission = function(){
      if(!isBeta()) return origRR.apply(this, arguments);
      try{
        if(typeof nnAvailable === "function" && nnAvailable()){ DATA.settings.smartNotify = { enabled: true }; smartNotifyRequestPermission(); return false; }
        if(typeof Notification !== "undefined" && Notification.permission === "default" && !(isIOSDevice() && !isStandalonePWA())){ requestNotificationPermission(); return false; }
        const st = pbWebPushState();
        if(st === "ios-install"){ showToast("روی آیفون یادآوری فقط بعد از «Add to Home Screen» و باز کردن از همون آیکون میاد.", { ms: 6000 }); return true; }
        if(st === "denied"){ showToast("اجازه‌ی نوتیف بسته‌ست؛ تا از تنظیمات گوشی بازش نکنی یادآوری نمی‌رسه.", { ms: 6000 }); return true; }
        if(st === "unsupported"){ showToast("این مرورگر نوتیف نداره؛ پله رو با Chrome باز کن تا یادآوری برسه.", { ms: 6000 }); return true; }
        if(st === "failed"){ showToast(pbPushFailHint(), { ms: 6000 }); return true; }
      }catch(e){ console.error("reminder permission (beta) failed:", e); }
      return false;
    };
  }
  if(typeof chooseReminderSlot === "function"){
    const origChoose = chooseReminderSlot;
    chooseReminderSlot = function(slot, fromSettings){
      if(!isBeta()) return origChoose.apply(this, arguments);
      if(!PB_SLOTS.some(s => s.id === slot)) slot = "none";
      DATA.settings.reminderSlot = slot;
      let warned = false;
      if(slot !== "none"){ trackFunnel("reminder_set", { slot }); warned = !!requestReminderPermission(); }
      qsStep = null;
      save();
      if(typeof smartNotifyTouch === "function") smartNotifyTouch(true);
      renderAll();
      if(typeof plusMaybeHandlePendingInvite === "function") setTimeout(plusMaybeHandlePendingInvite, 400);
      if(fromSettings && !warned){ const s = PB_SLOTS.find(x => x.id === slot); showToast(slot === "none" ? "یادآوری خاموش شد" : `یادآوری: ${s.label} ${pbFa(s.time)} ✓`); }
    };
  }
  if(typeof renderReminderSettingsCard === "function"){
    const origCard = renderReminderSettingsCard;
    renderReminderSettingsCard = function(){
      if(!isBeta()) return origCard.apply(this, arguments);
      const cur = DATA.settings.reminderSlot || "";   // batch 2026-11-08: انتخاب‌نشده ≠ خاموش (سرور برای این‌ها یادآوری عمومی ۱۷:۰۰ و ۲۱:۰۰ می‌فرسته)
      return `
        <div class="section-title">⏰ زمان یادآوری عادت‌ها</div>
        <div class="card">
          <div class="suggest-chips" style="justify-content:flex-start;">
            ${PB_SLOTS.map(s => `<button type="button" class="suggest-chip ${cur === s.id ? "on" : ""}" onclick="chooseReminderSlot('${s.id}', true)">${s.icon} ${s.label} ${pbFa(s.time)}</button>`).join("")}
            <button type="button" class="suggest-chip ${cur === "none" ? "on" : ""}" onclick="chooseReminderSlot('none', true)">خاموش</button>
          </div>
          ${cur ? `` : `<div class="note" style="margin-top:8px;">هنوز ساعتی انتخاب نکردی؛ فعلاً یادآوری عمومی ساعت ۱۷ و ۲۱ میاد. یکی از ساعت‌ها رو بزن تا فقط همون موقع، و فقط اگه هنوز تیک نزدی، یادآوری بیاد.</div>`}
          <div class="note" style="margin-top:8px;">با انتخاب ساعت، یادآوری فقط وقتی میاد که عادت امروزت هنوز تیک نخورده. ساعت سکوت ۲۲:۳۰ تا ۰۸:۰۰ رعایت می‌شه.</div>
        </div>
        ${pbPushStatusCard()}`;
    };
  }
  document.addEventListener("visibilitychange", () => {
    if(!isBeta() || document.visibilityState !== "visible") return;
    if(Date.now() - PB.pushSyncAt < 6 * 3600 * 1000) return;
    PB.pushSyncAt = Date.now();
    ensurePushSubscribed();
  });
})();

/* ===================================================================================
   A2 + B + A3 — آنبوردینگ بتا: لَم ← اولین پله (تیک همون‌جا) ← ورزش لَم ← یادآوری ۲۱:۳۰
   «پیش‌نمایش» از تنظیمات: همون صفحه‌ها، بدون هیچ ذخیره‌ای.
   =================================================================================== */
var PB_FIRST_STEPS = [
  { title: "۱ صفحه کتاب",       icon: "📖", points: 10 },
  { title: "۵ دقیقه پیاده‌روی", icon: "🚶", points: 10 },
  { title: "۱ لیوان آب",        icon: "💧", points: 5 },
];
function pbStartPreview(){
  if(!isBeta()) return;
  PB.ob = { preview: true, step: 0, sport: lamSport(), t0: 0, picked: null };
  closeOverlay();
  renderAll();
}
function pbStartReal(lamOnly){
  PB.ob = { preview: false, step: 0, sport: "none", t0: 0, picked: null, lamOnly: !!lamOnly };
  if(!lamOnly && trackFunnel("quickstart_shown")) save();
}
// batch 2026-11-08 — آنبوردینگ لَم برای همه (غیربتا): فقط معرفی لَم ← ورزش لَم، بعد همون صفحه‌ی «اولین عادت‌ها»ی live.
// اولین تیک داخل آنبوردینگ (A2) و یادآوری ۲۱:۳۰ (A3) هنوز فقط بتاست.
function pbObGo(step){
  if(!PB.ob) return;
  if(PB.ob.lamOnly && step === 1) step = 2;
  if(PB.ob.lamOnly && step === 3){ pbObLamDone(); return; }
  PB.ob.step = step; pbRenderOnboarding();
}
function pbObLamDone(){
  const st = pbState();
  st.lamIntroSeen = true;
  if(PB.ob && PB.ob.sport) st.sport = PB.ob.sport;
  try{ trackFunnel("lam_intro_done", { sport: st.sport || "none" }); }catch(e){}
  save();
  PB.ob = null;
  renderAll();   // needsQuickStart() هنوز درسته ← صفحه‌ی live «اولین عادت‌ها»
}
function pbObExit(){
  const wasPreview = PB.ob && PB.ob.preview;
  PB.ob = null;
  if(wasPreview){ currentTab = "settings"; }
  else {
    finishQuickStartCommon();
    save();
  }
  renderAll();
}
function pbObPick(i){
  const ob = PB.ob; if(!ob) return;
  const s = PB_FIRST_STEPS[i]; if(!s) return;
  const ms = ob.t0 ? Date.now() - ob.t0 : null;
  ob.picked = i;
  if(!ob.preview){
    let id = (DATA.activities || []).find(a => typeof normActTitle === "function" && normActTitle(a.title) === normActTitle(s.title));
    id = id ? id.id : createActivity({ title: s.title, points: s.points, days: ["daily"], icon: s.icon }, "onboarding_tick");
    const dk = todayKey();
    const list = new Set(DATA.history[dk] || []); list.add(id); DATA.history[dk] = Array.from(list);
    trackFunnel("first_checkin");
    trackFunnel("onboarding_first_tick", { ms, step: s.title });
    save();
  }
  try{ playCompleteChime(); }catch(e){}
  ob.step = 1.5;
  pbRenderOnboarding();
}
function pbObSport(id){ if(!PB.ob) return; PB.ob.sport = id; if(!PB.ob.preview){ pbState().sport = id; save(); } pbRenderOnboarding(); }
function pbObReminder(on){
  const ob = PB.ob; if(!ob) return;
  ob.step = 4;
  if(ob.preview){ pbRenderOnboarding(); return; }
  // همین لمس کاربر برای درخواست اجازه‌ی نوتیف لازمه (user gesture)
  chooseReminderSlot(on ? "late" : "none");
}
function pbRenderOnboarding(){
  const ob = PB.ob;
  document.getElementById("tabbar").innerHTML = "";
  const banner = ob.preview ? `<div class="pb-preview-banner">پیش‌نمایش آنبوردینگ (بتا) — هیچ چیزی ذخیره نمی‌شه <button type="button" onclick="pbObExit()">بستن</button></div>` : ``;
  const dots = ob.lamOnly ? `<div class="pb-dots" aria-hidden="true">${[0, 2].map(i => `<i class="${ob.step >= i ? "on" : ""}"></i>`).join("")}</div>`
    : `<div class="pb-dots" aria-hidden="true">${[0, 1, 2, 3].map(i => `<i class="${Math.floor(ob.step) >= i ? "on" : ""}"></i>`).join("")}</div>`;
  let body = "";
  if(ob.step === 0){
    body = `${lamFigure({ face: "E01_smirk", size: 512, px: 190, cls: "pb-ob-lam" })}
      <div class="pb-lam-say"><span class="pb-lam-name">لَم:</span> من لَم‌ام، از «لم دادن». معمولاً از فردا شروع می‌کنم. تو لازم نیست مثل من باشی؛ پله یعنی هر روز فقط یه قدم کوچیک.</div>
      <button class="btn btn-primary pb-ob-btn" onclick="pbObGo(1)">${ob.lamOnly ? "ادامه" : "بریم، یه پله"}</button>`;
  } else if(ob.step === 1){
    if(!ob.t0) ob.t0 = Date.now();
    body = `<div class="qs-title">اولین پله‌ت رو همین الان برو</div>
      <div class="qs-sub">یکی رو بزن؛ همین الان اضافه می‌شه و تیکش هم می‌خوره.</div>
      <div class="pb-first-grid">${PB_FIRST_STEPS.map((s, i) => `<button type="button" class="pb-first" onclick="pbObPick(${i})"><span class="pb-first-ic">${s.icon}</span><span>${s.title}</span></button>`).join("")}</div>
      <button type="button" class="pb-first pb-later" onclick="pbObGo(2)">بعداً</button>`;
  } else if(ob.step === 1.5){
    const s = PB_FIRST_STEPS[ob.picked] || PB_FIRST_STEPS[0];
    // انیمیشن آماده‌ی «پله روشن شد» (animated WebP؛ نه GIF، نه Lottie)
    body = `<img class="pb-ob-anim" src="lam/anim/lam_anim_levelup_step.webp?v=${LAM_ASSET_VER}" alt="لَم، یه پله‌ش روشن شد" width="190" height="190">
      <div class="pb-done-tick">✓ «${pbEsc(s.title)}» — اولین پله‌ت رو رفتی</div>
      <div class="pb-lam-say"><span class="pb-lam-name">لَم:</span> ${pbEsc(LAM_LINES[2])}</div>
      <button class="btn btn-primary pb-ob-btn" onclick="pbObGo(2)">ادامه</button>`;
  } else if(ob.step === 2){
    body = `<div class="qs-title">لَم با چی تمرین کنه؟</div>
      <div class="qs-sub">هویت ورزشی‌ت رو انتخاب کن؛ بعداً از «کتاب لَم» عوضش می‌کنی.</div>
      ${lamFigure({ sport: ob.sport, face: "E03_curious", size: 512, px: 150, blink: false })}
      ${pbSportPicker("pbObSport", ob.sport)}
      <button class="btn btn-primary pb-ob-btn" onclick="pbObGo(3)">ادامه</button>`;
  } else if(ob.step === 3){
    body = `<div style="text-align:center; font-size:calc(38px * var(--font-scale));">🔔</div>
      <div class="qs-title">یادآوری ساعت ۲۱:۳۰ روشنه</div>
      <div class="qs-sub">فقط وقتی اون روز هنوز تیکی نزدی، یه پیام کوتاه میاد. هر وقت خواستی از تنظیمات ساعتش رو عوض کن یا خاموشش کن.</div>
      ${pbPushStatusCard().replace('<div class="section-title">', '<div class="section-title" style="margin-top:6px;">')}
      <button class="btn btn-primary pb-ob-btn" onclick="pbObReminder(true)">همین خوبه</button>
      <button class="btn btn-ghost pb-ob-btn" onclick="pbObReminder(false)">بدون یادآوری</button>`;
  } else {
    body = `${lamFigure({ sport: ob.sport, face: "E08_kind", size: 512, px: 170 })}
      <div class="qs-title">آماده‌ای</div>
      <div class="pb-lam-say"><span class="pb-lam-name">لَم:</span> ${pbEsc(LAM_LINES[6])}</div>
      <button class="btn btn-primary pb-ob-btn" onclick="pbObExit()">${ob.preview ? "پایان پیش‌نمایش" : "برو به امروز"}</button>`;
  }
  document.getElementById("app").innerHTML = `${banner}<div class="onboard-wrap qs-wrap pb-ob">${dots}${body}</div>`;
}

/* ===================================================================================
   A4 — «امروز فقط یه پله» وقتی امروز هنوز تیکی نخورده
   =================================================================================== */
function pbReturnCard(){
  const now = new Date();
  const dk = todayKey(now);
  if((DATA.history[dk] || []).length) return ``;
  if(pbState().returnSkip === dk) return ``;
  const acts = activitiesForDay(dayKeyOf(now)) || [];
  if(!acts.length) return ``;
  const pick = acts.find(a => /کتاب|صفحه|مطالعه/.test(a.title || "")) || acts.find(a => (a.days || []).includes("daily")) || acts[0];
  return `<div class="card pb-return">
    ${lamFigure({ level: lamLevel(), sport: lamSport(), face: "E08_kind", size: 256, px: 64 })}
    <div style="flex:1; min-width:0;">
      <div class="pb-return-t">امروز فقط یه پله:</div>
      <button type="button" class="btn btn-primary pb-return-btn" onclick="pbReturnTick('${pick.id}')">${pbEsc(pick.title)}</button>
      <button type="button" class="pb-link" onclick="pbReturnSkip()">امروز نه</button>
    </div>
  </div>`;
}
function pbReturnTick(id){ if(!isBeta()) return; trackFunnel("return_card_tick"); toggleActivity(id); }
function pbReturnSkip(){ if(!isBeta()) return; pbState().returnSkip = todayKey(); save(); renderAll(); }

/* ===================================================================================
   E — متن بلند «کارهای امروز» (بعد از رندر، فقط برای کاربر بتا)
   =================================================================================== */
var PB_TASK_LONG = 28, PB_TASK_CLAMP = 110;
function pbFixTaskRows(){
  document.querySelectorAll("#app .task-row").forEach(row => {
    if(row.dataset.pb) return;
    row.dataset.pb = "1";
    const tx = row.querySelector(":scope > .task-text");
    if(!tx) return;
    const txt = tx.textContent || "";
    if(txt.length <= PB_TASK_LONG) return;
    row.classList.add("long");
    const main = document.createElement("div");
    main.className = "task-main";
    tx.replaceWith(main); main.appendChild(tx);
    if(txt.length > PB_TASK_CLAMP){
      const m = /editTask\('([^']+)'\)/.exec(tx.getAttribute("onclick") || "");
      const id = m ? m[1] : txt.slice(0, 20);
      const open = PB.expanded.has(id);
      if(!open) tx.classList.add("clamp");
      const b = document.createElement("button");
      b.type = "button"; b.className = "task-more"; b.textContent = open ? "کمتر" : "بیشتر";
      b.setAttribute("aria-expanded", String(open));
      b.onclick = () => { if(PB.expanded.has(id)) PB.expanded.delete(id); else PB.expanded.add(id); renderAll(); };
      main.appendChild(b);
    }
  });
}

/* ===================================================================================
   G — نمایش تصویری حرکت‌ها (free-exercise-db، The Unlicense؛ exercise-demos/LICENSE-free-exercise-db.md)
   هر حرکت ۲ فریم، حلقه‌ی CSS. m = اسم‌های انگلیسی بانک حرکت پله برای وصل شدن به برنامه‌ی تمرین.
   =================================================================================== */
var PB_DEMO_SAFETY = "در صورت درد یا بیماری، قبل از تمرین با پزشک یا مربی مشورت کنید.";
var PB_DEMOS = [
  { id: "Pushups", fa: "شنا سوئدی", m: ["push-up", "push-ups", "pushups", "push up"], c: ["دست‌ها کمی بازتر از شانه، کف دست زیر شانه.", "بدن از سر تا پاشنه یه خط صاف؛ باسن نه بالا نه پایین.", "آروم پایین برو تا سینه نزدیک زمین، بعد با فشار دست‌ها بالا بیا."] },
  { id: "Bodyweight_Squat", fa: "اسکوات با وزن بدن", m: ["bodyweight squat", "air squat"], c: ["پاها به عرض شانه، پنجه‌ها کمی رو به بیرون.", "باسن رو عقب بده انگار می‌خوای روی صندلی بشینی.", "زانوها هم‌جهت پنجه‌ها؛ پاشنه‌ها روی زمین بمونن."] },
  { id: "Plank", fa: "پلانک", m: ["plank", "front plank", "forearm plank"], c: ["آرنج زیر شانه، ساعدها روی زمین.", "شکم رو سفت کن و باسن رو هم‌سطح شانه نگه دار.", "نفس رو حبس نکن؛ آروم و منظم نفس بکش."] },
  { id: "Bodyweight_Walking_Lunge", fa: "لانج راه‌رفتنی", m: ["walking lunge", "bodyweight walking lunge"], c: ["یه قدم بلند جلو بردار و هر دو زانو رو خم کن.", "زانوی جلو بالای مچ پا بمونه و از پنجه جلوتر نره.", "تنه صاف؛ با فشار پاشنه‌ی جلو بلند شو و قدم بعدی رو بردار."] },
  { id: "Butt_Lift_Bridge", fa: "پل باسن (گلوت بریج)", m: ["glute bridge", "bridge", "butt lift"], c: ["به پشت بخواب، زانوها خم و کف پاها روی زمین.", "با فشار پاشنه‌ها باسن رو بالا بیار تا بدن از شانه تا زانو صاف بشه.", "بالا یه لحظه مکث کن و کنترل‌شده پایین بیا."] },
  { id: "Mountain_Climbers", fa: "کوهنوردی", m: ["mountain climbers", "mountain climber"], c: ["از حالت شنا شروع کن، دست‌ها زیر شانه.", "زانوها رو یکی‌یکی به سمت سینه بیار.", "باسن پایین و شکم سفت بمونه؛ سرعت رو کم شروع کن."] },
  { id: "Crunches", fa: "کرانچ شکم", m: ["crunch", "crunches"], c: ["به پشت بخواب، زانوها خم، دست‌ها کنار سر بدون کشیدن گردن.", "فقط شانه‌ها رو با انقباض شکم کمی از زمین جدا کن.", "آروم پایین بیا؛ پایین کمر روی زمین بمونه."] },
  { id: "Superman", fa: "سوپرمن (اکستنشن کمر روی زمین)", m: ["superman"], c: ["روی شکم بخواب، دست‌ها جلو کشیده.", "دست‌ها و پاها رو هم‌زمان کمی از زمین بلند کن.", "نگاهت رو به زمین نگه دار تا گردن صاف بمونه؛ آروم برگرد."] },
  { id: "Dead_Bug", fa: "ددباگ", m: ["dead bug"], c: ["به پشت بخواب، دست‌ها رو به سقف و زانوها ۹۰ درجه بالا.", "دست راست و پای چپ رو هم‌زمان آروم پایین ببر.", "کمر به زمین چسبیده بمونه؛ برگرد و طرف دیگه."] },
  { id: "Side_Bridge", fa: "پلانک پهلو", m: ["side plank", "side bridge"], c: ["به پهلو بخواب، آرنج زیر شانه.", "باسن رو بالا بیار تا بدن از سر تا پا یه خط بشه.", "باسن پایین نیفته؛ بعد طرف دیگه."] },
  { id: "Russian_Twist", fa: "چرخش روسی", m: ["russian twist"], c: ["بشین، زانوها خم، تنه کمی عقب با کمر صاف.", "تنه رو آروم به چپ و راست بچرخون.", "پاها می‌تونن روی زمین بمونن تا راحت‌تر باشه."] },
  { id: "Flutter_Kicks", fa: "قیچی پا (فلاتر کیک)", m: ["flutter kicks", "flutter kick"], c: ["به پشت بخواب، دست‌ها زیر باسن یا کنار بدن.", "پاها رو صاف کمی بالا بیار و یکی‌یکی کوتاه بالا و پایین کن.", "پایین کمر به زمین فشار داده بشه؛ اگه بلند شد پاها رو بالاتر ببر."] },
  { id: "Air_Bike", fa: "کرانچ دوچرخه‌ای", m: ["bicycle crunch", "air bike"], c: ["به پشت، دست‌ها کنار سر، شانه‌ها کمی بالا.", "آرنج رو به سمت زانوی مخالف ببر و پای دیگه رو صاف کن.", "آروم و کنترل‌شده؛ گردن رو با دست نکش."] },
  { id: "Inchworm", fa: "اینچ‌ورم", m: ["inchworm"], c: ["صاف بایست و از لگن خم شو تا دست‌ها به زمین برسن.", "دست‌ها رو قدم‌به‌قدم جلو ببر تا حالت شنا.", "همون‌طور با دست‌ها برگرد و بایست."] },
  { id: "Cat_Stretch", fa: "کشش گربه‌ـ‌گاو", m: ["cat-cow", "cat cow", "cat stretch"], c: ["چهاردست‌وپا، دست‌ها زیر شانه و زانوها زیر لگن.", "با بازدم پشت رو گرد کن و چونه رو به سینه نزدیک کن.", "با دم آروم برگرد؛ حرکت آهسته و بدون درد."] },
  { id: "Childs_Pose", fa: "حالت کودک", m: ["child's pose", "childs pose"], c: ["روی زانو بشین و باسن رو روی پاشنه‌ها بذار.", "تنه رو جلو بده و دست‌ها رو روی زمین دراز کن.", "چند نفس عمیق بکش و شانه‌ها رو شل کن."] },
  { id: "Goblet_Squat", fa: "اسکوات جام (گابلت)", m: ["goblet squat"], c: ["یه دمبل یا کتل‌بل رو جلوی سینه نگه دار.", "مثل اسکوات معمولی باسن رو عقب و پایین ببر.", "آرنج‌ها بین زانوها، سینه بالا؛ با فشار پاشنه‌ها بلند شو."] },
  { id: "Dumbbell_Lunges", fa: "لانج دمبل", m: ["dumbbell lunge", "dumbbell lunges"], c: ["در هر دست یه دمبل، بازوها کنار بدن.", "یه قدم جلو بردار و هر دو زانو رو خم کن.", "زانوی جلو هم‌جهت پنجه؛ با فشار پاشنه برگرد."] },
  { id: "Dumbbell_Bicep_Curl", fa: "جلو بازو دمبل", m: ["dumbbell bicep curl", "dumbbell biceps curl", "dumbbell curl"], c: ["بایست، دمبل‌ها کنار بدن، کف دست رو به جلو.", "آرنج‌ها کنار بدن ثابت؛ دمبل رو تا نزدیک شانه بالا بیار.", "آروم پایین بیا؛ بدن رو تاب نده."] },
  { id: "Dumbbell_Shoulder_Press", fa: "پرس سرشانه دمبل", m: ["dumbbell shoulder press", "seated dumbbell shoulder press"], c: ["دمبل‌ها هم‌سطح شانه، کف دست رو به جلو.", "دمبل‌ها رو بالای سر ببر بدون قفل کامل آرنج.", "شکم سفت و کمر قوس زیاد نگیره؛ آروم برگرد."] },
  { id: "Side_Lateral_Raise", fa: "نشر از جانب دمبل", m: ["dumbbell lateral raise", "lateral raise", "side lateral raise"], c: ["بایست، دمبل‌های سبک کنار بدن.", "با آرنج کمی خم، دست‌ها رو تا هم‌سطح شانه بالا بیار.", "شانه‌ها رو بالا نده؛ کنترل‌شده پایین بیا."] },
  { id: "One-Arm_Dumbbell_Row", fa: "زیربغل تک‌خم دمبل", m: ["one-arm dumbbell row", "one arm dumbbell row", "dumbbell row"], c: ["یه دست و زانو روی نیمکت، کمر صاف.", "دمبل رو به سمت لگن بکش و آرنج نزدیک بدن بمونه.", "بالا یه لحظه کتف رو جمع کن و آروم پایین بیار."] },
  { id: "Dumbbell_Bench_Press", fa: "پرس سینه دمبل", m: ["dumbbell bench press"], c: ["روی نیمکت بخواب، کف پاها روی زمین.", "دمبل‌ها رو از کنار سینه بالا ببر تا بالای سینه.", "کتف‌ها جمع و آرنج‌ها حدود ۴۵ درجه از بدن."] },
  { id: "Barbell_Bench_Press_-_Medium_Grip", fa: "پرس سینه هالتر", m: ["barbell bench press"], c: ["روی نیمکت، چشم‌ها زیر میله، دست‌ها کمی بازتر از شانه.", "میله رو کنترل‌شده تا وسط سینه پایین بیار.", "با فشار پاها و سینه بالا ببر؛ وزنه‌ی سنگین فقط با کمک‌یار."] },
  { id: "Barbell_Squat", fa: "اسکوات هالتر", m: ["back squat", "barbell squat", "barbell back squat"], c: ["میله روی عضلات بالای پشت، نه روی گردن.", "باسن عقب و پایین، سینه بالا، کمر صاف.", "زانوها هم‌جهت پنجه؛ وزنه رو سبک شروع کن."] },
  { id: "Romanian_Deadlift", fa: "ددلیفت رومانیایی", m: ["romanian deadlift"], c: ["بایست، میله یا دمبل جلوی ران‌ها، زانوها کمی خم.", "از لگن خم شو و وزنه رو نزدیک پاها پایین ببر.", "کمر صاف بمونه؛ با فشار باسن به جلو بایست."] },
  { id: "Wide-Grip_Lat_Pulldown", fa: "لت سیم‌کش از جلو", m: ["wide-grip lat pulldown", "lat pulldown"], c: ["بشین، ران‌ها زیر پد، دست‌ها بازتر از شانه.", "میله رو تا بالای سینه بکش و آرنج‌ها رو پایین ببر.", "پشت گردن نکش؛ آروم برگردون."] },
  { id: "Seated_Cable_Rows", fa: "قایقی سیم‌کش نشسته", m: ["seated cable row", "seated cable rows"], c: ["بشین، زانوها کمی خم، کمر صاف.", "دسته رو به سمت شکم بکش و کتف‌ها رو جمع کن.", "تنه رو عقب‌جلو تاب نده؛ آروم برگردون."] },
  { id: "Leg_Press", fa: "پرس پا", m: ["leg press"], c: ["کمر و باسن کامل به پشتی دستگاه بچسبه.", "پاها به عرض شانه روی صفحه؛ آروم پایین بیار.", "زانوها رو قفل نکن و هم‌جهت پنجه نگه دار."] },
  { id: "Bench_Dips", fa: "دیپ روی نیمکت", m: ["bench dips", "bench dip"], c: ["لبه‌ی نیمکت رو پشت سرت بگیر، پاها جلو.", "آرنج‌ها رو تا حدود ۹۰ درجه خم کن، رو به عقب.", "شانه‌ها رو بالا نده؛ اگه شانه درد گرفت قطع کن."] },
];
function pbDemoSrc(id, k){ return `exercise-demos/${encodeURIComponent(id)}/${k}.jpg`; }
function pbDemoFrames(d, cls){
  return `<div class="pb-demo ${cls || ""}" role="img" aria-label="نمایش حرکت ${pbEsc(d.fa)}">
    <img src="${pbDemoSrc(d.id, 0)}" alt="" loading="lazy" decoding="async"><img class="f2" src="${pbDemoSrc(d.id, 1)}" alt="" loading="lazy" decoding="async"></div>`;
}
function pbOpenDemo(id){
  const d = PB_DEMOS.find(x => x.id === id);
  if(!d || !isBeta()) return;
  openOverlay(`<div class="pb-sheet">
    <div class="row-between" style="margin-bottom:8px;"><h3 style="margin:0;">${pbEsc(d.fa)}</h3><button class="icon-btn" onclick="closeOverlay()" aria-label="بستن">✕</button></div>
    ${pbDemoFrames(d, "lg")}
    <ol class="pb-cues">${d.c.map(x => `<li>${pbEsc(x)}</li>`).join("")}</ol>
    <div class="pb-safety">${PB_DEMO_SAFETY}</div>
    <div class="note" style="font-size:var(--fs-11); opacity:.7; margin-top:8px;">تصویرها: free-exercise-db (مالکیت عمومی، The Unlicense)</div>
  </div>`);
}
function pbOpenDemoList(){
  if(!isBeta()) return;
  openOverlay(`<div class="pb-sheet">
    <div class="row-between" style="margin-bottom:8px;"><h3 style="margin:0;">راهنمای تصویری حرکت‌ها</h3><button class="icon-btn" onclick="closeOverlay()" aria-label="بستن">✕</button></div>
    <div class="note" style="margin-bottom:10px;">${PB_DEMO_SAFETY}</div>
    <div class="pb-demo-grid">${PB_DEMOS.map(d => `<button type="button" class="pb-demo-item" onclick="pbOpenDemo('${d.id}')">${pbDemoFrames(d, "sm still")}<span>${pbEsc(d.fa)}</span></button>`).join("")}</div>
  </div>`);
}
function pbDemoForBank(exId){
  try{
    const ex = (typeof plusBankMap === "function" ? plusBankMap() : {})[exId];
    const en = String((ex && ex.e) || "").trim().toLowerCase();
    if(!en) return null;
    return PB_DEMOS.find(d => d.m.includes(en)) || null;
  }catch(e){ return null; }
}
function pbDemoCard(){
  return `<div class="card pb-demo-card" onclick="pbOpenDemoList()" role="button" tabindex="0">
    ${pbDemoFrames(PB_DEMOS[1], "sm")}
    <div style="flex:1; min-width:0;"><div style="font-weight:800;">راهنمای تصویری ${pbFa(PB_DEMOS.length)} حرکت</div>
    <div class="note">شکل درست هر حرکت + ۳ نکته‌ی کوتاه</div></div><span class="chev">‹</span></div>`;
}

/* ===================================================================================
   C — BMI: متن و رنگ خنثی، تصویر خطی اختیاری («نمایش تصویر»)، بدون لَم، بدون کلمه‌ی «چاق»،
   بدون قرمز؛ همیشه یه قدم کوچیک بعدی. زیر ۱۸ سال (اگه سن ثبت شده) تصویر نشون داده نمی‌شه.
   =================================================================================== */
var PB_BMI_BANDS = [
  { max: 18.5, label: "پایین‌تر از محدوده‌ی رایج", w: 0.82, step: "یه میان‌وعده‌ی مقوی به روزت اضافه کن؛ اگه این عدد ادامه داشت، با پزشک صحبت کن." },
  { max: 25,   label: "در محدوده‌ی رایج",          w: 1.0,  step: "همین روال رو نگه دار؛ این هفته یه پیاده‌روی ۲۰ دقیقه‌ای اضافه کن." },
  { max: 30,   label: "کمی بالاتر از محدوده‌ی رایج", w: 1.18, step: "۱۰ دقیقه پیاده‌روی امروز، یا یه لیوان آب قبل از هر وعده." },
  { max: 99,   label: "بالاتر از محدوده‌ی رایج",     w: 1.36, step: "۱۰ دقیقه حرکت سبک امروز. برای برنامه‌ی دقیق با پزشک یا متخصص تغذیه مشورت کن." },
];
function pbBmiBand(v){ return PB_BMI_BANDS.find(b => v < b.max) || PB_BMI_BANDS[3]; }
function pbBmiSilhouette(w){
  // تصویر خطی ساده‌ی بالینی (بدون صورت/جنسیت)، فقط پهنای تنه با محدوده عوض می‌شه
  const cx = 60, tw = 22 * w, hw = 17 * w, lw = 9 * w;
  return `<svg class="pb-bmi-fig" viewBox="0 0 120 220" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="${cx}" cy="26" r="15"/>
    <path d="M${cx - 8} 42 L${cx - 8} 48 Q${cx - tw - 6} 52 ${cx - tw - 4} 66 L${cx - tw - 12} 118 M${cx + 8} 42 L${cx + 8} 48 Q${cx + tw + 6} 52 ${cx + tw + 4} 66 L${cx + tw + 12} 118"/>
    <path d="M${cx - tw} 62 Q${cx - tw - 2} 98 ${cx - hw} 122 L${cx - hw + 2} 128 M${cx + tw} 62 Q${cx + tw + 2} 98 ${cx + hw} 122 L${cx + hw - 2} 128"/>
    <path d="M${cx - hw + 2} 128 Q${cx} 134 ${cx + hw - 2} 128"/>
    <path d="M${cx - hw + 3} 128 L${cx - lw - 4} 204 M${cx - 3} 134 L${cx - 5} 204 M${cx + 3} 134 L${cx + 5} 204 M${cx + hw - 3} 128 L${cx + lw + 4} 204"/>
  </svg>`;
}
function pbUserAge(){
  try{
    const h = ensureHealthData();
    const a = Number(h.profile && h.profile.age);
    if(a > 0 && a < 120) return a;
  }catch(e){}
  return null;
}
function pbToggleBmiFigure(){ if(!isBeta()) return; const s = pbState(); s.bmiFigure = !s.bmiFigure; save(); renderAll(); }
function pbBmiCard(){
  if(typeof pelehBmiChartSvg !== "function") return "";
  const h = ensureHealthData();
  if(!h.profile.height) return `<div class="card" style="margin-bottom:12px;"><div style="font-weight:800; margin-bottom:6px;">📐 شاخص توده‌ی بدنی (BMI)</div>
    <div class="note">برای دیدن BMI، قدت رو تو پروفایل سلامت وارد کن.</div>
    <button class="btn btn-ghost" style="width:100%; padding:9px; margin-top:8px;" onclick="editHealthProfile()">ثبت قد</button></div>`;
  const rows = hBmiRows(), sum = pelehBmiSummary(rows);
  // نمودار با رنگ‌ها و برچسب‌های خنثی (بدون قرمز و بدون «چاقی»)، بعد آرایه‌ی اصلی برمی‌گرده
  const saved = PELEH_BMI_BANDS.map(b => ({ color: b.color, label: b.label }));
  let chart = "";
  try{
    PELEH_BMI_BANDS.forEach((b, i) => { b.color = ["var(--info, #86B8FF)", "var(--gold, #E0B04A)", "var(--muted, #B4BED1)", "var(--faint, #7D89A3)"][i] || b.color; b.label = PB_BMI_BANDS[i] ? PB_BMI_BANDS[i].label : b.label; });
    chart = pelehBmiChartSvg(rows, { empty: "با ثبت وزن، نمودار BMI اینجا میاد." });
  } finally {
    PELEH_BMI_BANDS.forEach((b, i) => { b.color = saved[i].color; b.label = saved[i].label; });
  }
  const band = sum ? pbBmiBand(sum.bmi) : null;
  const age = pbUserAge(), minor = age !== null && age < 18;
  const showFig = !!pbState().bmiFigure && !minor;
  const coaches = (typeof PLUS !== "undefined" && PLUS.coaches) ? PLUS.coaches.filter(c => c.status === "active") : [];
  return `<div class="card" style="margin-bottom:12px;">
    <div class="row-between" style="margin-bottom:6px;"><div style="font-weight:800;">📐 شاخص توده‌ی بدنی (BMI)</div>
      ${sum ? `<b style="color:var(--text);">${pbFa(String(sum.bmi).replace(".", "٫"))} · ${band.label}</b>` : ``}</div>
    ${chart}
    ${sum && sum.n > 1 && sum.delta ? `<div class="note">تغییر از ${pbEsc(jalaliDateLabel(new Date(sum.since + "T12:00:00")))}: <bdi dir="ltr">${sum.delta > 0 ? "+" : "−"}${pbFa(String(Math.abs(sum.delta)).replace(".", "٫"))}</bdi> واحد</div>` : ``}
    ${sum ? `<div class="pb-bmi-step">قدم بعدی: ${band.step}</div>` : ``}
    ${sum && !minor ? `<button type="button" class="pb-link" style="margin-top:6px;" onclick="pbToggleBmiFigure()" aria-pressed="${showFig}">${showFig ? "پنهان کردن تصویر" : "نمایش تصویر"}</button>` : ``}
    ${showFig && sum ? `<div class="pb-bmi-figs">${PB_BMI_BANDS.map(b => `<div class="${b === band ? "on" : ""}">${pbBmiSilhouette(b.w)}</div>`).join("")}</div>
      <div class="note" style="text-align:center;">تصویر فقط محدوده‌ی عدد رو نشون می‌ده، نه بدن تو رو.</div>` : ``}
    ${minor ? `<div class="note" style="margin-top:4px;">برای زیر ۱۸ سال BMI با جدول‌های رشد سنی سنجیده می‌شه؛ برای همین تصویر نشون داده نمی‌شه.</div>` : ``}
    <div class="note" style="margin-top:4px; opacity:.85;">BMI فقط قد و وزن رو می‌بینه و عضله رو از چربی جدا نمی‌کنه؛ برای ورزشکارهای عضلانی، زیر ۱۸ سال و دوران بارداری دقیق نیست.</div>
    ${coaches.length ? `<div class="note" style="margin-top:6px;">${coaches.some(c => c.share_body) ? "✓ مربی‌ت روند وزن و BMI رو می‌بینه." : "مربی‌ت هنوز روند BMI رو نمی‌بینه — از «سلامت پلاس» اجازه بده."}</div>` : ``}
  </div>`;
}

/* ===================================================================================
   تنظیمات: بخش بتا
   =================================================================================== */
function pbSettingsSection(){
  const sp = LAM_SPORTS.find(s => s.id === lamSport());
  // batch 2026-11-08: این بخش حالا برای همه‌ست؛ «پیش‌نمایش آنبوردینگ» فقط برای حساب تستر (وحید)
  const tester = typeof pelehBetaTester === "function" && currentUser && pelehBetaTester(currentUser.id);
  const canInstall = typeof pelehIsInstalledPWA === "function" && !pelehIsInstalledPWA() && !(typeof isNativeApp === "function" && isNativeApp());
  return `<div class="section-title" style="margin-top:6px;">لَم و راهنماها</div>
    <div class="card pb-beta-card">
      <div style="display:flex; gap:12px; align-items:center;">
        ${lamFigure({ level: lamLevel(), sport: lamSport(), size: 256, px: 72 })}
        <div style="flex:1; min-width:0;"><div style="font-weight:800;">لَم · سطح ${pbFa(lamLevel())} از ۴</div><div class="note">ورزش: ${sp ? sp.label : "—"}</div></div>
      </div>
      <button type="button" class="btn btn-ghost pb-wide" onclick="openLamBook()">کتاب لَم و ورزش لَم</button>
      <button type="button" class="btn btn-ghost pb-wide" onclick="pbOpenDemoList()">راهنمای تصویری حرکت‌ها</button>
      ${canInstall ? `<button type="button" class="btn btn-ghost pb-wide" onclick="pelehShowInstallGuide(true)">اضافه کردن پله به صفحه‌ی اصلی</button>` : ``}
      ${tester ? `<button type="button" class="btn btn-ghost pb-wide" onclick="pbStartPreview()">پیش‌نمایش آنبوردینگ (فقط حساب تستر)</button>` : ``}
    </div>`;
}

// batch 2026-11-08: کارت لَم در تنظیمات برای کاربرهای غیربتا (بدون دکمه‌های آزمایشی)
function pbLamSettingsSection(){
  const sp = LAM_SPORTS.find(s => s.id === lamSport());
  return `<div class="section-title" style="margin-top:6px;">لَم</div>
    <div class="card pb-beta-card">
      <div style="display:flex; gap:12px; align-items:center;">
        ${lamFigure({ level: lamLevel(), sport: lamSport(), size: 256, px: 72 })}
        <div style="flex:1; min-width:0;"><div style="font-weight:800;">لَم · سطح ${pbFa(lamLevel())} از ۴</div><div class="note">ورزش: ${sp ? sp.label : "—"}</div></div>
      </div>
      <button type="button" class="btn btn-ghost pb-wide" onclick="openLamBook()">کتاب لَم و ورزش لَم</button>
    </div>`;
}

/* ===================================================================================
   سیم‌کشی (wrapperها). wrap = فقط بتا؛ wrapLam = لَم (همه، وقتی PELEH_LAM_ALL روشنه).
   برای کاربری که هیچ‌کدوم نیست، فقط تابع اصلی برمی‌گرده.
   =================================================================================== */
(function wireBeta(){
  function wrap(name, fn){
    const orig = window[name];
    if(typeof orig !== "function") return;
    window[name] = function(){ return isBeta() ? fn.call(this, orig, arguments) : orig.apply(this, arguments); };
  }
  function wrapLam(name, fn){
    const orig = window[name];
    if(typeof orig !== "function") return;
    window[name] = function(){ return isLamOn() ? fn.call(this, orig, arguments) : orig.apply(this, arguments); };
  }
  (function(){
    const orig = window.renderAll;
    if(typeof orig !== "function") return;
    window.renderAll = function(){
      const beta = isBeta(), lam = isLamOn();
      // CSS بتا فقط زیر html.peleh-beta؛ CSS لَم زیر html.peleh-lam
      document.documentElement.classList.toggle("peleh-beta", beta);
      document.documentElement.classList.toggle("peleh-lam", lam);
      if(!lam){ PB.ob = null; return orig.apply(this, arguments); }
      if(!beta && PB.ob && !PB.ob.lamOnly) PB.ob = null;
      if(PB.ob && currentUser && typeof cloudReady !== "undefined" && cloudReady && !loadError){ pbRenderOnboarding(); return; }
      const r = orig.apply(this, arguments);
      if(beta){ try{ if(currentTab === "today") pbFixTaskRows(); }catch(e){ console.error(e); } }
      setTimeout(pbCheckLamLevelUp, 0);
      return r;
    };
  })();
  wrapLam("renderQuickStart", function(orig, args){
    // اسم هنوز گرفته نشده (بیشتر ثبت‌نام‌های پیامکی)؟ یه بار معرفی لَم + ورزش لَم، بعد صفحه‌ی live «شروع سریع»
    // (اسم + اولین عادت‌ها). batch 2026-11-08: قبلاً این کاربرها اصلاً لَم رو نمی‌دیدن.
    if((needsOnboarding() && qsNamePhone()) || !isBeta()){
      if(pbState().lamIntroSeen) return orig.apply(this, args);
      pbStartReal(true); pbRenderOnboarding(); return;
    }
    // اسم داره: آنبوردینگ کامل (لَم ← اولین پله با تیک ← ورزش لَم ← یادآوری ۲۱:۳۰)
    pbStartReal(); pbRenderOnboarding();
  });
  wrap("renderToday", function(orig, args){ return pbPushFixBanner() + pbReturnCard() + orig.apply(this, args); });
  wrapLam("renderSettings", function(orig, args){ return (isBeta() ? pbSettingsSection() : pbLamSettingsSection()) + orig.apply(this, args); });
  wrapLam("renderBooks", function(orig, args){
    const html = orig.apply(this, args);
    if(typeof booksSubTab !== "undefined" && booksSubTab !== "home") return html;
    const lvl = lamLevel();
    return `<div class="card pb-lam-strip" onclick="openLamBook()" role="button" tabindex="0">
      ${lamFigure({ level: lvl, sport: lamSport(), size: 256, px: 64 })}
      <div style="flex:1; min-width:0;"><div style="font-weight:800;">کتاب لَم · سطح ${pbFa(lvl)} از ۴</div>
      <div class="note">${lvl < 4 ? `بعدی: ${LAM_LEVELS[lvl].acc} — ${LAM_LEVELS[lvl].crit}` : "همه‌ی پله‌ها روشنه."}</div></div><span class="chev">‹</span></div>` + html;
  });
  wrap("hBmiCard", function(){ return pbBmiCard(); });
  wrap("renderHealthSport", function(orig, args){ return pbDemoCard() + orig.apply(this, args); });
  wrap("renderPwItem", function(orig, args){
    const html = orig.apply(this, args);
    const it = args[0];
    const d = it && pbDemoForBank(it.exercise_id);
    return d ? `<button type="button" class="pb-demo-inline" onclick="pbOpenDemo('${d.id}')">▶ نمایش حرکت: ${pbEsc(d.fa)}</button>` + html : html;
  });
  // اگه ورود و اولین رندر قبل از لود این فایل تموم شده باشه (مثلاً نشست ذخیره‌شده + شبکه‌ی سریع)،
  // یه‌بار دوباره رندر کن تا قابلیت‌های بتا دیده بشن. برای کاربر غیربتا هیچ کاری نمی‌کنه.
  try{ if(isLamOn() && typeof cloudReady !== "undefined" && cloudReady) renderAll(); }catch(e){ console.error(e); }
})();
