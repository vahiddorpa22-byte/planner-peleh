/* ================= پله سلامت (health.js) — نسخه‌ی ۲ =================
   فاز ۰ (قبلی): پروفایل کوچیک + Coach سلامت.
   این نسخه فازهای ۱ تا ۶ سند «پله ورزش و سلامت» رو پیاده می‌کنه:
     ۱) پایه‌ی رایگان: پروفایل کامل، ورزش مورد علاقه/ناخوشایند، کشف ورزش، ثبت وزن و فعالیت،
        گزارش روزانه، ساخت عادت ورزشی روی همون سیستم فعالیت‌های اپ
     ۲) Personal Workout (Premium): برنامه‌ی هفتگی/ترکیبی با AI، جایگزین هوشمند، بازگشت بدون سرزنش
     ۳) تغذیه: سلیقه‌ی غذایی، انتخاب هوشمند (رایگان)، برنامه‌ی غذایی و Smart Cheat (Premium)
     ۴) ترک عادت‌های ناسالم با فهرست تحقیق‌شده (health-catalog.js)، حالت خصوصی، لحظه‌ی هوس،
        مسیر ۱/۳/۷/۱۴/۳۰ روزه، برنامه‌ی شخصی AI (Premium)
     ۵) چالش‌ها، گزارش هفتگی، Health Intelligence، Personal Health Journey
     ۶) Reward Store (جدول‌های Supabase + تابع‌های migration 012)
   قدم‌شمار واقعی عمداً حذف شده — نه پلاگین، نه مجوز، نه ثبت قدم.
   امتیاز سلامت به همون کیف امتیاز اصلی اپ (DATA.bonusPoints) اضافه می‌شه، با یه دفتر ثبت
   (xpLedger) که جلوی امتیاز تکراری رو می‌گیره و با حذف یه فعالیت، امتیازش هم برمی‌گرده.
   قاعده‌ی پایه عوض نشده: رایگان = ثبت و ردیابی، Premium = هوشمندی، شخصی‌سازی، Coach.
===================================================================== */

/* ===================== داده ===================== */
function blankHealthData(){
  return {
    profile: {
      completed: false, age: null, height: null, currentWeight: null, targetWeight: null,
      mainGoal: "", mainGoals: [], activityLevel: "",
      daysPerWeek: null, minutesPerSession: null, level: "", equipment: [],
    },
    sports: { likes: [], dislikes: [], customLike: "", discovery: null },
    weightLog: [],        // [{d: dateKey, kg}] — مرتب بر اساس تاریخ، روزی یکی
    activityLog: {},      // dateKey -> [{id, sport, minutes, intensity, km, note, ts, planned, sub}]
    workoutPlan: null,    // {createdAt, title, days:[{day, rest, focus, items:[{sport,title,minutes,intensity,detail}], easy:{title,minutes}}], tips:[]}
    planDone: {},         // dateKey -> "done" | "sub"
    food: { completed: false, likes: [], dislikes: [], restrictions: [], restrictionNote: "", mealsPerDay: 3, eatingPlace: "home", cookTime: "short" },
    mealPlan: null,       // {createdAt, meals:[{slot,title,items,why,alternatives:[{title,items}]}], tips:[]}
    mealSwaps: {},        // slot -> ایندکس جایگزینِ فعلی (0 = اصلی)
    smartCheatLast: null, // {craving, intro, options:[{title,how,portion,tip}], drink, ts}
    foodChoices: {},      // dateKey -> [label]
    foodChoiceTs: {},     // dateKey -> [ts] — زمان هر انتخاب (برای چالش‌ها: فقط بعد از شروع چالش حساب می‌شه)
    badHabits: [],        // نگاه کن به hNewHabit
    challenges: [],       // [{id, tpl, start, habitId, status:"active"|"done"|"expired", doneAt}]
    xpLedger: {},         // key -> {a: مقدار, d: dateKey, r: دلیل}
    xpEarned: 0,          // کل امتیاز سلامتِ به‌دست‌اومده (خرج در فروشگاه جوایز؛ خرج‌شده‌ها سمت سرور حساب می‌شن)
    chatHistory: [],      // [{role, text, ts}] — ۲۰ پیام آخر
    aiInsight: null,      // {weekKey, insights:[], nextAction}
    nextSeq: 1,
  };
}
function ensureHealthData(){
  const blank = blankHealthData();
  if(!DATA.health || typeof DATA.health !== "object") DATA.health = blank;
  const h = DATA.health;
  // داده‌ای که قبل از شمارنده‌ی xpEarned ساخته شده: از دفتر امتیاز بازسازی می‌شه
  if(typeof h.xpEarned !== "number" && h.xpLedger && typeof h.xpLedger === "object"){
    h.xpEarned = Object.values(h.xpLedger).reduce((s, e) => s + (Number(e && e.a) || 0), 0);
  }
  Object.keys(blank).forEach(k => { if(h[k] === undefined || h[k] === null && blank[k] !== null) h[k] = blank[k]; });
  ["profile", "sports", "food"].forEach(k => {
    Object.keys(blank[k]).forEach(f => { if(h[k][f] === undefined) h[k][f] = blank[k][f]; });
  });
  ["equipment"].forEach(f => { if(!Array.isArray(h.profile[f])) h.profile[f] = []; });
  ["likes", "dislikes"].forEach(f => { if(!Array.isArray(h.sports[f])) h.sports[f] = []; });
  ["likes", "dislikes", "restrictions"].forEach(f => { if(!Array.isArray(h.food[f])) h.food[f] = []; });
  if(!Array.isArray(h.weightLog)) h.weightLog = [];
  if(!Array.isArray(h.badHabits)) h.badHabits = [];
  if(!Array.isArray(h.challenges)) h.challenges = [];
  // کاربرهای فاز ۰: وزن پروفایل، اولین نقطه‌ی نمودار
  if(h.profile.completed && !h.weightLog.length && h.profile.currentWeight){
    h.weightLog.push({ d: todayKey(), kg: Number(h.profile.currentWeight) });
  }
  return h;
}
function hSeq(prefix){ const h = ensureHealthData(); return (prefix || "x") + (h.nextSeq++); }
function hIsPremium(){ return (typeof isPremiumActive === "function") && isPremiumActive(); }

/* ===================== تاریخ ===================== */
function hDate(dk){ const [y, m, d] = String(dk).split("-").map(Number); return new Date(y, m - 1, d); }
function hAddDays(dk, n){ const d = hDate(dk); d.setDate(d.getDate() + n); return todayKey(d); }
function hDaysBetween(a, b){ return Math.round((hDate(b) - hDate(a)) / 86400000); }
function hWeekStart(dk){ return todayKey(saturdayOf(hDate(dk || todayKey()))); }
function hDayKeyOfDk(dk){ return JS_DAY_TO_KEY[hDate(dk).getDay()]; }
function hFaDate(dk){ try{ return jalaliDateLabel(hDate(dk)); }catch(e){ return dk; } }
function hPct(a, b){ return b > 0 ? Math.round((a / b) * 100) : 0; }

/* ===================== امتیاز سلامت (به کیف امتیاز اصلی) ===================== */
const H_XP = { activityMax: 25, activityDayCap: 60, planDay: 20, planSub: 15, planWeek: 50, weekGoal: 40,
  weight: 3, choice: 5, choiceDayCap: 15, craving: 5, cravingDayCap: 25, cleanDay: 10, cleanDayCap: 30, setup: 20,
  maxHabits: 5, maxMinutes: 300 };
// سقف مسافت یه جلسه (کیلومتر) — جلوی ثبت عددهای غیرواقعی که یه چالش کیلومتری رو فوراً تموم کنه
const H_KM_MAX = { running: 50, walking: 40, hiking: 40, cycling: 150, swimming: 10 };
const H_MILESTONES = [
  {d:1, xp:10,  msg:"روز اول رو ساختی. همین شروع، مهم‌ترین قدمه."},
  {d:3, xp:15,  msg:"۳ روز! حالا وقتشه محرک‌هات رو بشناسی — ببین معمولاً کی هوس می‌کنی."},
  {d:7, xp:70,  msg:"اولین نقطه‌ی عطف: ۷ روز موفق 🎉"},
  {d:14, xp:150, msg:"۱۴ روز! یه چالش ۳۰ روزه برات آماده‌ست — بزن بریم؟"},
  {d:30, xp:300, msg:"۳۰ روزه داری ادامه می‌دی. این یکی رو واقعاً به خودت بدهکار بودی. 🎁"},
  {d:60, xp:400, msg:"۶۰ روز — این دیگه یه سبک زندگی جدیده."},
  {d:90, xp:600, msg:"۹۰ روز. به خودت افتخار کن."},
];
function hAward(key, amt, reason){
  const h = ensureHealthData();
  amt = Math.round(Number(amt) || 0);
  if(amt <= 0 || h.xpLedger[key]) return 0;
  h.xpLedger[key] = { a: amt, d: todayKey(), r: reason || "" };
  h.xpEarned = (Number(h.xpEarned) || 0) + amt;
  DATA.bonusPoints = (DATA.bonusPoints || 0) + amt;
  return amt;
}
function hRevoke(key){
  const h = ensureHealthData();
  const e = h.xpLedger[key];
  if(!e) return 0;
  DATA.bonusPoints = Math.max(0, (DATA.bonusPoints || 0) - e.a);
  h.xpEarned = Math.max(0, (Number(h.xpEarned) || 0) - e.a);
  delete h.xpLedger[key];
  return e.a;
}
function hXpOn(dk, reason){
  const h = ensureHealthData();
  let s = 0;
  Object.values(h.xpLedger).forEach(e => { if(e.d === dk && (!reason || e.r === reason)) s += e.a; });
  return s;
}
function hXpBetween(startDk, endDk){
  const h = ensureHealthData();
  let s = 0;
  Object.values(h.xpLedger).forEach(e => { if(e.d >= startDk && e.d <= endDk) s += e.a; });
  return s;
}
// ردیف‌های روزمره‌ی قدیمی از دفتر پاک می‌شن تا حجم داده بی‌دلیل بزرگ نشه (امتیازشون سر جاشه)
function hPruneLedger(){
  const h = ensureHealthData();
  const cutoff = hAddDays(todayKey(), -120);
  const routine = { activity: 1, choice: 1, craving: 1, weight: 1, clean: 1, plan: 1 };
  Object.keys(h.xpLedger).forEach(k => { const e = h.xpLedger[k]; if(routine[e.r] && e.d < cutoff) delete h.xpLedger[k]; });
}
function hToast(msg){
  try{
    let el = document.getElementById("h_toast");
    if(!el){
      el = document.createElement("div");
      el.id = "h_toast";
      el.className = "bottom-toast";
      el.style.transition = "opacity .3s";
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.style.opacity = "1";
    clearTimeout(el._t);
    el._t = setTimeout(() => { el.style.opacity = "0"; }, 2600);
  }catch(e){}
}

/* ===================== وضعیت رابط ===================== */
let healthSubTab = "summary";
let healthSetup = null;   // null | "basics" | "sports" | "discovery"
let hForm = null;         // مقادیر موقت فرم‌ها (تا با هر رندر پاک نشن)
let hDiscovery = {};      // جواب‌های پرسش‌نامه‌ی کشف ورزش
let hAi = { busy: {}, error: {} };
let healthChatBusy = false;
let healthChatInput = "";
let healthChatError = "";
let selectedHealthGoal = null;      // سازگاری با نسخه‌ی قبل (app.js موقع خروج ریستش می‌کنه)
let selectedHealthActivity = null;
let hRewardItems = null, hRewardLoading = false, hRewardError = "", hMyRedemptions = null;
let hHealthPoints = null; // {balance, earned, spent, cap, capped} — موجودی تأییدشده‌ی سرور برای فروشگاه
let hLog = null;          // فرم ثبت فعالیت
let hCravingTimer = null;

const HEALTH_GOALS = [
  {id:"lose", label:"کاهش وزن"}, {id:"gain", label:"افزایش وزن"}, {id:"muscle", label:"عضله‌سازی"},
  {id:"fitness", label:"تناسب اندام"}, {id:"energy", label:"انرژی بیشتر"}, {id:"endurance", label:"استقامت"},
  {id:"activity", label:"فعال‌تر بودن روزانه"}, {id:"habit", label:"ساختن عادت ورزشی"},
];
const HEALTH_ACTIVITY_LEVELS = [
  {id:"sedentary", label:"کم‌تحرک (بیشتر نشسته)"}, {id:"light", label:"کم — هفته‌ای ۱-۲ بار"},
  {id:"moderate", label:"متوسط — هفته‌ای ۳-۴ بار"}, {id:"active", label:"فعال — هفته‌ای ۵+ بار"},
  {id:"very_active", label:"خیلی فعال / ورزشکار"},
];
// طراحی نهایی v2.4.0: شش بخش در یه شبکه‌ی ۳ستونه (بدون اسکرول افقی). «امروز» = خلاصه + چالش‌ها + پیشرفت + جوایز،
// «مربی» = سلامت پلاس (فقط وقتی برای حساب فعاله)، «دستیار» = Coach هوشمند.
const HEALTH_TABS = [
  {id:"summary", label:"امروز", icon:"today"}, {id:"sport", label:"ورزش", icon:"run"}, {id:"plus", label:"مربی", icon:"users", plus:true},
  {id:"food", label:"تغذیه", icon:"salad"}, {id:"habits", label:"ترک عادت", icon:"sprout"}, {id:"coach", label:"دستیار", icon:"sparkle"},
];
// تب‌های قدیمی که حالا داخل «امروز»ن (لینک‌ها و یادآوری‌های قدیمی همون‌جا می‌رن و تا بخش مربوط اسکرول می‌شن)
const HEALTH_TAB_ALIAS = { challenges: "h_sec_challenges", progress: "h_sec_progress", rewards: "h_sec_rewards" };
function hOpenTab(id){
  if(typeof currentTab !== "undefined" && currentTab !== "health"){ healthSubTab = id; switchTab("health"); return; }
  setHealthSubTab(id);
}
function renderHealthTabGrid(active){
  const plusOn = typeof CLIENT_FLAGS !== "undefined" && CLIENT_FLAGS.plus_enabled;
  const tabs = HEALTH_TABS.filter(t => !t.plus || plusOn);
  return `<nav class="htabs ${tabs.length === 5 ? "five" : ""}" aria-label="بخش‌های سلامت">${tabs.map(t => {
    const on = active === t.id;
    const click = t.plus ? "switchTab('plus')" : `hOpenTab('${t.id}')`;
    const dot = t.plus && CLIENT_FLAGS.plus_unread > 0 ? ` <i class="badge-dot" aria-label="پیام تازه"></i>` : "";
    return `<button type="button" class="hchip ${on ? "on" : ""}" ${on ? `aria-current="page"` : ""} onclick="${click}" ${t.plus ? "data-plus-entry" : ""}>${pi(t.icon)}<span>${t.label}</span>${dot}</button>`;
  }).join("")}</nav>`;
}

function renderHealthDisclaimer(){
  return `<div class="note" style="font-size:calc(11px * var(--font-scale)); opacity:.75; margin-bottom:12px; padding:8px 10px; border:1px solid var(--line); border-radius:10px;">⚕️ پیشنهادهای پله سلامت جایگزین توصیه یا تشخیص پزشکی نیست — فقط یه راهنمای مشاوره‌ای برای کمک به پیشرفت بهتره. برای تصمیم‌های مهم سلامتی حتماً با پزشک یا متخصص واقعی مشورت کن.</div>`;
}
function hChip(label, on, onclick, extraStyle, attrs){
  return `<button type="button" class="suggest-chip ${on ? "on" : ""}" style="${extraStyle || ""}" onclick="${onclick}" aria-pressed="${!!on}"${attrs ? " " + attrs : ""}>${label}</button>`;
}
function hLocked(title, desc){
  return `<div class="card" style="border:1px dashed var(--gold); cursor:pointer;" onclick="switchTab('premium')">
    <div style="font-weight:800; margin-bottom:4px;">🔒 ${title}</div>
    <div class="note">${desc} این قابلیت Premiumه — بزن ببین.</div>
  </div>`;
}
function hSheet(html){
  const ov = document.getElementById("overlay");
  const closing = typeof overlayClosePending !== "undefined" && overlayClosePending;
  if(ov && ov.classList.contains("show") && !closing){ document.getElementById("sheet").innerHTML = html; }
  else openOverlay(html);
}
// بعد از هر رندر، تب فعال رو (اگه بیرون از دید بود) داخل نوار تب‌ها بیار؛ فقط خود نوار اسکرول می‌شه نه صفحه.
function hRevealActiveTab(){
  try{
    const bar = document.getElementById("h_tabbar"); if(!bar) return;
    const chip = bar.querySelector(".suggest-chip.on"); if(!chip) return;
    const b = bar.getBoundingClientRect(), c = chip.getBoundingClientRect();
    if(c.left < b.left) bar.scrollLeft -= (b.left - c.left) + 12;
    else if(c.right > b.right) bar.scrollLeft += (c.right - b.right) + 12;
  }catch(e){}
}
function setHealthSubTab(t){
  const anchor = HEALTH_TAB_ALIAS[t];
  if(anchor) t = "summary";
  healthSubTab = t;
  // موجودی فروشگاه هر بار که «امروز» باز می‌شه از سرور تازه می‌شه (امتیازهای جدید همین جلسه هم حساب بشن)
  if(t === "summary"){ if(hRewardItems === null) hLoadRewards(); else hRefreshHealthPoints(); }
  renderAll();
  if(anchor) setTimeout(() => { const el = document.getElementById(anchor); if(el && el.scrollIntoView) el.scrollIntoView({ block: "start", behavior: "smooth" }); }, 60);
}

/* ===================== ورودی ===================== */
function renderHealth(){
  const h = ensureHealthData();
  hPruneLedger();
  hCheckChallenges(true);
  if(!h.profile.completed || healthSetup){
    if(!healthSetup) hStartSetup("basics");
    // ورزشکاری که مربی دعوتش کرده نباید مجبور باشه اول پرسش‌نامه‌ی سلامت رو پر کنه تا به سلامت پلاس برسه
    const plusEntry = (!h.profile.completed && typeof CLIENT_FLAGS !== "undefined" && CLIENT_FLAGS.plus_enabled)
      ? `<div class="card accent" data-plus-entry style="cursor:pointer; margin-bottom:12px;" onclick="switchTab('plus')">
          <div class="row-between"><div class="note">کد مربی داری یا برنامه‌ی مربی‌ت رو می‌خوای ببینی؟</div>
          <div class="plus-entry-chip" style="font-weight:800; white-space:nowrap;">${pi("gem")} سلامت پلاس${CLIENT_FLAGS.plus_unread > 0 ? ` <i class="badge-dot" aria-label="پیام تازه"></i>` : ""} <span class="chev">${pi("chevL")}</span></div></div></div>`
      : "";
    return plusEntry + renderHealthSetup();
  }
  // justify-content:flex-start (نه flex-end): توی RTL، flex-end آیتم‌ها رو به چپ می‌چسبونه و سرریز به سمت
  // راست می‌ره که مرورگرهای اندروید/دسکتاپ اجازه‌ی اسکرولش رو نمی‌دن → تب «امروز» بریده می‌شد و تب‌ها اسکرول نمی‌شدن.
  const tabBar = renderHealthTabGrid(healthSubTab);
  let body = "";
  switch(healthSubTab){
    case "sport": body = renderHealthSport(); break;
    case "food": body = renderHealthFood(); break;
    case "habits": body = renderHealthHabits(); break;
    case "coach": body = renderHealthCoach(); break;
    default:
      if(hRewardItems === null && typeof hLoadRewards === "function") setTimeout(hLoadRewards, 0);
      body = `${renderHealthSummary()}
        <div id="h_sec_challenges" class="h-sec"><div class="section-title">${pi("trophy")} چالش‌ها</div>${renderHealthChallenges()}</div>
        <div id="h_sec_progress" class="h-sec"><div class="section-title">${pi("chartUp")} پیشرفت</div>${renderHealthProgress()}</div>
        <div id="h_sec_rewards" class="h-sec"><div class="section-title">${pi("gift")} جوایز</div>${renderHealthRewards()}</div>`;
  }
  return `<div class="page-title">سلامت</div><div style="height:10px;"></div>${tabBar}${body}`;
}

/* ===================== راه‌اندازی / ویرایش پروفایل (بخش‌های ۳ تا ۵) ===================== */
function hStartSetup(step){
  const h = ensureHealthData();
  const p = h.profile;
  hForm = {
    age: p.age || "", height: p.height || "", currentWeight: p.currentWeight || "", targetWeight: p.targetWeight || "",
    mainGoal: p.mainGoal || "", mainGoals: Array.isArray(p.mainGoals) && p.mainGoals.length ? p.mainGoals.slice() : (p.mainGoal ? [p.mainGoal] : []), activityLevel: p.activityLevel || "", daysPerWeek: p.daysPerWeek || null,
    minutesPerSession: p.minutesPerSession || null, level: p.level || "", equipment: [...(p.equipment || [])],
    likes: [...h.sports.likes], dislikes: [...h.sports.dislikes], customLike: h.sports.customLike || "",
  };
  healthSetup = step;
}
function editHealthProfile(){ hStartSetup("basics"); renderAll(); }
function editHealthSports(){ hStartSetup("sports"); renderAll(); }
function hCancelSetup(){ healthSetup = null; hForm = null; renderAll(); }
function hSet(field, value){ if(hForm) hForm[field] = value; renderAll(); }
// هدف اصلی چندانتخابی: «کاهش وزن» و «افزایش وزن» با هم جمع نمی‌شن؛ حداکثر ۳ هدف؛ اولی = اولویت اول
const HEALTH_GOAL_CONFLICTS = { lose: "gain", gain: "lose" };
function hToggleGoal(id){
  if(!hForm) return;
  const list = Array.isArray(hForm.mainGoals) ? hForm.mainGoals.slice() : (hForm.mainGoal ? [hForm.mainGoal] : []);
  const i = list.indexOf(id);
  if(i >= 0) list.splice(i, 1);
  else {
    const c = HEALTH_GOAL_CONFLICTS[id];
    if(c && list.includes(c)){ list.splice(list.indexOf(c), 1); if(typeof showToast === "function") showToast("«کاهش وزن» و «افزایش وزن» با هم نمی‌شن — جایگزین شد."); }
    if(list.length >= 3){ if(typeof showToast === "function") showToast("حداکثر ۳ هدف — یکی رو بردار."); return; }
    list.push(id);
  }
  hForm.mainGoals = list;
  hForm.mainGoal = list[0] || "";
  renderAll();
}
function hToggle(field, value){
  if(!hForm) return;
  const arr = hForm[field] || (hForm[field] = []);
  const i = arr.indexOf(value);
  if(i >= 0) arr.splice(i, 1); else arr.push(value);
  // یه ورزش نمی‌تونه هم «دوست دارم» باشه هم «دوست ندارم»
  if(field === "likes" && i < 0) hForm.dislikes = hForm.dislikes.filter(x => x !== value);
  if(field === "dislikes" && i < 0) hForm.likes = hForm.likes.filter(x => x !== value);
  renderAll();
}
function hInput(field, el){ if(hForm) hForm[field] = el.value; }

function renderHealthSetup(){
  const h = ensureHealthData();
  const f = hForm || {};
  const editing = h.profile.completed;
  const cancelBtn = editing ? `<button class="btn btn-ghost" style="width:100%; padding:12px; margin-top:8px;" onclick="hCancelSetup()">انصراف</button>` : ``;
  if(healthSetup === "discovery") return renderHealthDiscovery();
  if(healthSetup === "sports"){
    return `
      <div class="section-title">${ICONS.health} پله سلامت — ورزش‌هات</div>
      <div class="card">
        <div class="note" style="margin-bottom:12px;">پله نمی‌گه «باید ورزش کنی». می‌پرسه چه ورزشی رو دوست داری، تا همون رو عادتت کنیم.</div>
        <div class="field"><label>چه ورزش‌هایی رو دوست داری؟ (چندتا)</label>
          <div class="suggest-chips">${HEALTH_SPORTS.map(s => hChip(`${s.icon} ${s.label}`, f.likes.includes(s.id), `hToggle('likes','${s.id}')`)).join("")}</div>
        </div>
        ${f.likes.includes("other") ? `<div class="field"><label>کدوم ورزش؟</label><input type="text" class="goal-input" maxlength="40" value="${escapeHtml(f.customLike || "")}" oninput="hInput('customLike', this)" placeholder="مثلاً اسکیت، اسب‌سواری…"></div>` : ``}
        <div class="field"><label>چه ورزش‌هایی رو دوست نداری؟ (اختیاری)</label>
          <div class="suggest-chips">${HEALTH_SPORTS.filter(s => s.id !== "other").map(s => hChip(`${s.icon} ${s.label}`, f.dislikes.includes(s.id), `hToggle('dislikes','${s.id}')`, "opacity:.9;")).join("")}</div>
          <div class="note" style="margin-top:6px;">پله هیچ‌وقت ورزشی رو که ازش بدت میاد تو برنامه‌ت نمی‌ذاره.</div>
        </div>
        <button class="btn btn-ghost" style="width:100%; padding:12px; margin-bottom:10px;" onclick="hStartDiscovery()">🤔 نمی‌دونم چه ورزشی بهم می‌چسبه</button>
        <div class="field-error" id="h_setup_error"></div>
        <button class="btn btn-primary" style="width:100%; padding:14px;" onclick="hSaveSports()">${editing ? "ذخیره" : "شروع کن 🚀"}</button>
        ${editing ? cancelBtn : `<button class="btn btn-ghost" style="width:100%; padding:12px; margin-top:8px;" onclick="healthSetup='basics'; renderAll();">برگشت</button>`}
      </div>`;
  }
  // basics
  return `
    <div class="section-title">${ICONS.health} پله سلامت</div>
    <div class="card">
      ${renderHealthDisclaimer()}
      <div class="note" style="margin-bottom:12px;">چندتا سوال کوتاه، تا همه‌چیز دقیقاً متناسب خودت باشه.</div>
      <div class="field"><label>سن</label><input type="text" inputmode="numeric" class="goal-input" placeholder="مثلاً ۲۸" value="${escapeHtml(String(f.age || ""))}" oninput="hInput('age', this)"></div>
      <div class="field"><label>قد (سانتی‌متر)</label><input type="text" inputmode="numeric" class="goal-input" placeholder="مثلاً ۱۷۵" value="${escapeHtml(String(f.height || ""))}" oninput="hInput('height', this)"></div>
      <div class="field"><label>وزن فعلی (کیلوگرم)</label><input type="text" inputmode="decimal" class="goal-input" placeholder="مثلاً ۷۸" value="${escapeHtml(String(f.currentWeight || ""))}" oninput="hInput('currentWeight', this)"></div>
      <div class="field"><label>وزن هدف (کیلوگرم — اختیاری)</label><input type="text" inputmode="decimal" class="goal-input" placeholder="مثلاً ۷۲" value="${escapeHtml(String(f.targetWeight || ""))}" oninput="hInput('targetWeight', this)"></div>
      <div class="field"><label>هدف اصلی <span class="note" style="display:inline;">(یک یا چندتا — حداکثر ۳)</span></label><div class="suggest-chips" role="group" aria-label="هدف اصلی">${HEALTH_GOALS.map(g => hChip(g.label, (f.mainGoals || []).includes(g.id), `hToggleGoal('${g.id}')`)).join("")}</div>
        ${(f.mainGoals || []).length > 1 ? `<div class="note" style="margin-top:6px;">اولویت اول: «${(HEALTH_GOALS.find(g => g.id === f.mainGoals[0]) || {}).label}» — برای عوض کردن، اول همون رو بردار.</div>` : ``}</div>
      <div class="field"><label>میزان فعالیت فعلی</label><div class="suggest-chips">${HEALTH_ACTIVITY_LEVELS.map(a => hChip(a.label, f.activityLevel === a.id, `hSet('activityLevel','${a.id}')`)).join("")}</div></div>
      <div class="field"><label>هفته‌ای چند روز می‌تونی ورزش کنی؟</label><div class="suggest-chips">${[1,2,3,4,5,6,7].map(n => hChip(toFaDigits(n), f.daysPerWeek === n, `hSet('daysPerWeek',${n})`)).join("")}</div></div>
      <div class="field"><label>هر بار چقدر وقت داری؟</label><div class="suggest-chips">${[10,20,30,45,60,90].map(n => hChip(`${toFaDigits(n)} دقیقه`, f.minutesPerSession === n, `hSet('minutesPerSession',${n})`)).join("")}</div></div>
      <div class="field"><label>سطح ورزشی</label><div class="suggest-chips">${HEALTH_LEVELS.map(l => hChip(l.label, f.level === l.id, `hSet('level','${l.id}')`)).join("")}</div></div>
      <div class="field"><label>امکاناتی که داری (چندتا)</label><div class="suggest-chips">${HEALTH_EQUIPMENT.map(e => hChip(e.label, f.equipment.includes(e.id), `hToggle('equipment','${e.id}')`)).join("")}</div></div>
      <div class="field-error" id="h_setup_error"></div>
      <button class="btn btn-primary" style="width:100%; padding:14px;" onclick="hSaveBasics()">${editing ? "ذخیره" : "ادامه"}</button>
      ${cancelBtn}
    </div>`;
}
function hSetupError(msg){ const el = document.getElementById("h_setup_error"); if(el) el.textContent = msg; }
function hNum(v){ return parseFloat(faToEnDigits(String(v || "")).replace(/[^\d.]/g, "")); }
function hSaveBasics(){
  const f = hForm;
  const age = Math.round(hNum(f.age)), height = Math.round(hNum(f.height)), cw = hNum(f.currentWeight);
  const tw = String(f.targetWeight || "").trim() ? hNum(f.targetWeight) : null;
  if(!age || age < 10 || age > 100) return hSetupError("سن رو درست وارد کن.");
  if(!height || height < 100 || height > 250) return hSetupError("قد رو درست وارد کن (سانتی‌متر).");
  if(!cw || cw < 25 || cw > 300) return hSetupError("وزن فعلی رو درست وارد کن.");
  if(tw !== null && (!tw || tw < 25 || tw > 300)) return hSetupError("وزن هدف رو درست وارد کن (یا خالی بذار).");
  if(!(f.mainGoals || []).length) return hSetupError("حداقل یه هدف انتخاب کن.");
  if(!f.activityLevel) return hSetupError("میزان فعالیت فعلیت رو انتخاب کن.");
  if(!f.daysPerWeek) return hSetupError("بگو هفته‌ای چند روز می‌تونی ورزش کنی.");
  if(!f.minutesPerSession) return hSetupError("بگو هر بار چقدر وقت داری.");
  if(!f.level) return hSetupError("سطح ورزشیت رو انتخاب کن.");
  const h = ensureHealthData();
  Object.assign(h.profile, { age, height, currentWeight: Math.round(cw * 10) / 10, targetWeight: tw ? Math.round(tw * 10) / 10 : null,
    mainGoal: f.mainGoals[0], mainGoals: f.mainGoals.slice(0, 3), activityLevel: f.activityLevel, daysPerWeek: f.daysPerWeek, minutesPerSession: f.minutesPerSession,
    level: f.level, equipment: [...f.equipment] });
  hQueueBodySync(true);
  hUpsertWeight(todayKey(), h.profile.currentWeight, true);
  if(h.profile.completed){ healthSetup = null; hForm = null; save(); hToast("ذخیره شد ✅"); renderAll(); return; }
  healthSetup = "sports";
  save();
  renderAll();
}
function hSaveSports(){
  const f = hForm;
  if(!f.likes.length) return hSetupError("حداقل یه ورزش که دوست داری انتخاب کن (یا «نمی‌دونم» رو بزن).");
  const h = ensureHealthData();
  h.sports.likes = [...f.likes];
  h.sports.dislikes = [...f.dislikes];
  h.sports.customLike = String(f.customLike || "").trim().slice(0, 40);
  const first = !h.profile.completed;
  h.profile.completed = true;
  healthSetup = null; hForm = null;
  if(first){ const x = hAward("setup", H_XP.setup, "setup"); healthSubTab = "summary"; if(x) hToast(`پروفایل سلامتت آماده‌ست — +${toFaDigits(x)} امتیاز`); }
  save();
  renderAll();
}

/* کشف ورزش مناسب (بخش ۵) — امتیازدهی ساده و شفاف، بدون AI */
function hStartDiscovery(){ hDiscovery = {}; healthSetup = "discovery"; renderAll(); }
function hAnswer(q, v){ hDiscovery[q] = v; renderAll(); }
function hDiscoveryResults(){
  const a = hDiscovery, dislikes = (hForm && hForm.dislikes) || [];
  const scored = HEALTH_SPORTS.filter(s => s.id !== "other" && !dislikes.includes(s.id)).map(s => {
    let score = 0; const why = [];
    const match = (cond, text) => { if(cond){ score += 2; why.push(text); } };
    const miss = (cond) => { if(cond) score -= 1; };
    if(a.group === "team"){ match(s.group !== "solo", "گروهیه"); miss(s.group === "solo"); }
    if(a.group === "solo"){ match(s.group !== "team", "می‌شه تنها انجامش داد"); miss(s.group === "team"); }
    if(a.place === "out"){ match(s.place !== "in", "تو فضای بازه"); miss(s.place === "in"); }
    if(a.place === "in"){ match(s.place !== "out", "داخل انجام می‌شه"); miss(s.place === "out"); }
    if(a.pace){ match(s.pace === a.pace, a.pace === "calm" ? "آرومه" : a.pace === "active" ? "پرتحرکه" : "شدتش متوسطه"); miss(s.pace !== a.pace && (a.pace === "calm" ? s.pace === "active" : a.pace === "active" ? s.pace === "calm" : false)); }
    if(a.comp === "yes"){ match(s.comp, "هیجان رقابت داره"); }
    if(a.comp === "no"){ match(!s.comp, "بدون رقابته"); miss(s.comp); }
    if(a.dur === "short"){ match(s.dur !== "long", "کوتاه هم می‌شه"); miss(s.dur === "long"); }
    if(a.dur === "long"){ match(s.dur !== "short", "می‌شه طولانی‌ش کرد"); }
    if(a.music === "yes"){ match(s.music, "با موسیقی عالیه"); }
    if(a.friend === "yes"){ match(s.friend, "با دوستت کیف می‌ده"); }
    if(a.friend === "no"){ match(!s.friend || s.group !== "team", "تنهایی هم خوبه"); miss(s.group === "team"); }
    return { s, score, why };
  }).sort((x, y) => y.score - x.score);
  return scored.slice(0, 3);
}
function renderHealthDiscovery(){
  const answered = HEALTH_DISCOVERY_QUESTIONS.every(q => hDiscovery[q.id]);
  return `
    <div class="section-title">${ICONS.health} کشف ورزش مناسب</div>
    <div class="card">
      ${HEALTH_DISCOVERY_QUESTIONS.map(q => `
        <div class="field"><label>${q.q}</label><div class="suggest-chips">${q.opts.map(o => hChip(o.t, hDiscovery[q.id] === o.v, `hAnswer('${q.id}','${o.v}')`)).join("")}</div></div>
      `).join("")}
      ${answered ? `
        <div class="note" style="margin:10px 0; font-weight:800;">بر اساس جواب‌هات، این ۳ ورزش احتمالاً بیشتر بهت می‌چسبه:</div>
        ${hDiscoveryResults().map(r => `
          <div class="row-between" style="padding:10px 0; border-top:1px solid var(--line);">
            <div><div style="font-weight:800;">${r.s.icon} ${r.s.label}</div><div class="note">${r.why.slice(0, 3).join("، ") || "با سلیقه‌ت جوره"}</div></div>
            <button class="btn ${hForm.likes.includes(r.s.id) ? "btn-ghost" : "btn-primary"}" style="flex:none; padding:8px 12px;" onclick="hAddDiscovered('${r.s.id}')">${hForm.likes.includes(r.s.id) ? "✅ اضافه شد" : "اضافه کن"}</button>
          </div>`).join("")}
      ` : `<div class="note">به همه‌ی سوال‌ها جواب بده تا پیشنهادها بیاد.</div>`}
      <button class="btn btn-primary" style="width:100%; padding:13px; margin-top:12px;" onclick="healthSetup='sports'; renderAll();">برگشت به انتخاب ورزش‌ها</button>
    </div>`;
}
function hAddDiscovered(id){
  if(!hForm.likes.includes(id)) hForm.likes.push(id);
  hForm.dislikes = hForm.dislikes.filter(x => x !== id);
  ensureHealthData().sports.discovery = { answers: { ...hDiscovery }, ts: Date.now() };
  renderAll();
}

/* ===================== ثبت فعالیت (بخش ۱۴) ===================== */
function hEntries(dk){ const h = ensureHealthData(); return h.activityLog[dk] || []; }
function hMinutesOn(dk){ return hEntries(dk).reduce((s, e) => s + (Number(e.minutes) || 0), 0); }
function hEntriesBetween(startDk, endDk){
  const h = ensureHealthData(), out = [];
  Object.keys(h.activityLog).forEach(dk => { if(dk >= startDk && dk <= endDk) h.activityLog[dk].forEach(e => out.push({ ...e, dk })); });
  return out;
}
function hLastActiveDk(){
  const h = ensureHealthData();
  const keys = Object.keys(h.activityLog).filter(dk => (h.activityLog[dk] || []).length).sort();
  return keys.length ? keys[keys.length - 1] : null;
}
function hAddActivity(dk, entry){
  const h = ensureHealthData();
  const kmMax = H_KM_MAX[entry.sport] || 0;
  const e = { id: hSeq("a"), sport: entry.sport, minutes: Math.max(1, Math.min(H_XP.maxMinutes, Math.round(entry.minutes || 0))),
    intensity: entry.intensity || "moderate", km: entry.km && kmMax ? Math.min(kmMax, Math.round(entry.km * 10) / 10) : null,
    note: (entry.note || "").slice(0, 80), ts: Date.now(), planned: !!entry.planned, sub: !!entry.sub };
  (h.activityLog[dk] = h.activityLog[dk] || []).push(e);
  // امتیاز: ۵ + ۲ به ازای هر ۱۰ دقیقه، حداکثر ۲۵ برای هر فعالیت و ۶۰ در روز
  let xp = Math.min(H_XP.activityMax, 5 + Math.floor(e.minutes / 10) * 2);
  const room = H_XP.activityDayCap - hXpOn(dk === todayKey() ? dk : todayKey(), "activity");
  xp = Math.max(0, Math.min(xp, room));
  const got = xp ? hAward("act_" + e.id, xp, "activity") : 0;
  hCheckWeeklyGoal(dk);
  hCheckChallenges();
  return { entry: e, xp: got };
}
function hDeleteActivity(dk, id){
  const h = ensureHealthData();
  if(!confirm("این فعالیت حذف بشه؟ امتیازش هم برمی‌گرده.")) return;
  h.activityLog[dk] = (h.activityLog[dk] || []).filter(e => e.id !== id);
  if(!h.activityLog[dk].length) delete h.activityLog[dk];
  hRevoke("act_" + id);
  save(); renderAll();
}
function openHealthLogForm(prefill){
  const h = ensureHealthData();
  const likes = h.sports.likes;
  hLog = Object.assign({ sport: likes[0] || "walking", minutes: h.profile.minutesPerSession || 30, intensity: "moderate", km: "", note: "", day: "today", planned: false, sub: false }, prefill || {});
  hRenderLogSheet();
}
function hRenderLogSheet(){
  const h = ensureHealthData();
  const likes = h.sports.likes;
  const ordered = [...HEALTH_SPORTS.filter(s => likes.includes(s.id)), ...HEALTH_SPORTS.filter(s => !likes.includes(s.id) && !h.sports.dislikes.includes(s.id))];
  const sp = healthSport(hLog.sport);
  hSheet(`
    <h3>ثبت فعالیت</h3>
    <div class="field"><label>چه ورزشی؟</label><div class="suggest-chips">${ordered.map(s => hChip(`${s.icon} ${s.label}`, hLog.sport === s.id, `hLogSet('sport','${s.id}')`)).join("")}</div></div>
    <div class="field"><label>چند دقیقه؟</label>
      <div class="suggest-chips" style="margin-bottom:6px;">${[10,20,30,45,60,90].map(n => hChip(toFaDigits(n), Number(hLog.minutes) === n, `hLogSet('minutes',${n})`)).join("")}</div>
      <input type="text" inputmode="numeric" class="goal-input" id="hl_minutes" value="${escapeHtml(String(hLog.minutes))}" oninput="hLog.minutes=hNum(this.value)||''">
    </div>
    <div class="field"><label>شدت</label><div class="suggest-chips">${HEALTH_INTENSITY.map(i => hChip(i.label, hLog.intensity === i.id, `hLogSet('intensity','${i.id}')`)).join("")}</div></div>
    ${sp.km ? `<div class="field"><label>مسافت (کیلومتر — اختیاری)</label><input type="text" inputmode="decimal" class="goal-input" value="${escapeHtml(String(hLog.km || ""))}" oninput="hLog.km=this.value" placeholder="مثلاً ۳.۵"></div>` : ``}
    <div class="field"><label>کِی؟</label><div class="suggest-chips">${hChip("امروز", hLog.day === "today", "hLogSet('day','today')")}${hChip("دیروز", hLog.day === "yesterday", "hLogSet('day','yesterday')")}</div></div>
    <div class="field"><label>یادداشت (اختیاری)</label><input type="text" class="goal-input" maxlength="80" value="${escapeHtml(hLog.note || "")}" oninput="hLog.note=this.value"></div>
    <div class="field-error" id="hl_error"></div>
    <div class="sheet-actions">
      <button class="btn btn-ghost" onclick="closeOverlay()">انصراف</button>
      <button class="btn btn-primary" onclick="hSubmitLog()">ثبت</button>
    </div>`);
}
function hLogSet(k, v){ hLog[k] = v; hRenderLogSheet(); }
function hSubmitLog(){
  const minutes = hNum(hLog.minutes);
  const logErr = (m) => { const el = document.getElementById("hl_error"); if(el) el.textContent = m; };
  if(!minutes || minutes < 1) return logErr("مدت رو درست وارد کن (دقیقه).");
  if(minutes > H_XP.maxMinutes) return logErr(`برای هر جلسه حداکثر ${toFaDigits(H_XP.maxMinutes)} دقیقه — اگه بیشتر بوده، دو بار ثبت کن.`);
  const km = hLog.km ? hNum(hLog.km) : null;
  const kmMax = H_KM_MAX[hLog.sport] || 0;
  if(km && kmMax && km > kmMax) return logErr(`مسافت برای یه جلسه‌ی ${healthSport(hLog.sport).label} حداکثر ${toFaDigits(kmMax)} کیلومتره.`);
  const dk = hLog.day === "yesterday" ? hAddDays(todayKey(), -1) : todayKey();
  const res = hAddActivity(dk, { sport: hLog.sport, minutes, intensity: hLog.intensity, km: km && km > 0 ? km : null, note: hLog.note, planned: hLog.planned, sub: hLog.sub });
  let planXp = 0;
  if(hLog.planned){ planXp = hMarkPlanDone(dk, hLog.sub ? "sub" : "done"); }
  save();
  closeOverlay();
  renderAll();
  const total = res.xp + planXp;
  hToast(total ? `ثبت شد ✅ +${toFaDigits(total)} امتیاز` : "ثبت شد ✅");
}

/* ===================== تب «امروز» ===================== */
function renderHealthSummary(){
  const h = ensureHealthData();
  const today = todayKey();
  const entries = hEntries(today);
  const mins = hMinutesOn(today);
  const weekStart = hWeekStart(today);
  const weekSessions = hEntriesBetween(weekStart, today).length;
  const goal = h.profile.daysPerWeek || 3;
  const xpToday = hXpOn(today);
  const missingProfile = !h.profile.daysPerWeek || !h.profile.level || !h.profile.minutesPerSession;
  return `
    ${missingProfile ? `<div class="card" style="border:1px dashed var(--gold); cursor:pointer; margin-bottom:12px;" onclick="editHealthProfile()"><div style="font-weight:800;">✨ پروفایلت رو کامل کن</div><div class="note">چندتا سوال جدید (روزهای ورزش، زمان، سطح، امکانات) تا برنامه‌ها دقیق‌تر بشن.</div></div>` : ``}
    ${renderHealthComeback()}
    ${renderHealthTodayPlan()}
    <div class="card" style="margin-bottom:12px;">
      <div class="row-between" style="margin-bottom:8px;">
        <div style="font-weight:800;">فعالیت امروز</div>
        <button class="btn btn-primary" style="flex:none; padding:8px 14px;" onclick="openHealthLogForm()">➕ ثبت فعالیت</button>
      </div>
      ${entries.length ? entries.map(e => { const s = healthSport(e.sport); return `
        <div class="row-between" style="padding:7px 0; border-top:1px solid var(--line);">
          <div>${s.icon} ${escapeHtml(s.id === "other" && h.sports.customLike ? h.sports.customLike : s.label)} — ${toFaDigits(e.minutes)} دقیقه${e.km ? ` · ${toFaDigits(e.km)} کیلومتر` : ""}${e.sub ? ` <span class="alt-tag">جایگزین</span>` : ""}</div>
          <button class="btn btn-ghost" style="flex:none; padding:4px 10px;" onclick="hDeleteActivity('${today}','${e.id}')" aria-label="حذف">✕</button>
        </div>`; }).join("") : `<div class="note">هنوز چیزی ثبت نکردی. حتی ۱۰ دقیقه پیاده‌روی هم حسابه.</div>`}
      <div class="suggest-chips" style="margin-top:10px;">
        <div class="suggest-chip" style="pointer-events:none;">⏱️ ${toFaDigits(mins)} دقیقه</div>
        <div class="suggest-chip" style="pointer-events:none;">⭐ ${toFaDigits(xpToday)} امتیاز سلامت امروز</div>
      </div>
    </div>
    <div class="card" style="margin-bottom:12px;">
      <div style="font-weight:800; margin-bottom:6px;">هدف این هفته: ${toFaDigits(goal)} جلسه</div>
      <div style="height:10px; background:var(--line); border-radius:6px; overflow:hidden;"><div style="height:100%; width:${Math.min(100, hPct(weekSessions, goal))}%; background:var(--gold);"></div></div>
      <div class="note" style="margin-top:6px;">${toFaDigits(weekSessions)} از ${toFaDigits(goal)} جلسه${weekSessions >= goal ? " — عالی بود! 🎉" : ""}</div>
    </div>
    ${renderHealthActivityFoodLink()}
    ${renderHealthHabitsToday()}
    ${renderHealthSmartChoiceCard()}
  `;
}

/* سیستم بازگشت (بخش ۱۹) — بدون سرزنش */
function renderHealthComeback(){
  const last = hLastActiveDk();
  if(!last) return "";
  const gap = hDaysBetween(last, todayKey());
  if(gap < 3) return "";
  const h = ensureHealthData();
  const easy = hEasyAlternatives(null, 20).slice(0, 2);
  return `<div class="card" style="margin-bottom:12px; background:var(--gold-soft);">
    <div style="font-weight:800; margin-bottom:4px;">👋 چند روز از برنامه فاصله گرفتی. از امروز دوباره شروع کنیم.</div>
    <div class="note" style="margin-bottom:8px;">امروز فقط ${easy.map(x => `${toFaDigits(x.minutes)} دقیقه ${x.label}`).join(" یا ")} کافیه.</div>
    <div class="suggest-chips">${easy.map(x => hChip(`${x.icon} ${x.label}`, false, `openHealthLogForm({sport:'${x.sport}', minutes:${x.minutes}})`)).join("")}</div>
  </div>`;
}
/* گزینه‌های سبک بر اساس ورزش‌های مورد علاقه (برای جایگزین هوشمند و بازگشت) */
function hEasyAlternatives(excludeSport, minutes){
  const h = ensureHealthData();
  const lowBarrier = ["walking", "home", "yoga", "pilates", "running", "cycling", "dance"];
  const likes = h.sports.likes.filter(id => lowBarrier.includes(id) && id !== excludeSport && !h.sports.dislikes.includes(id));
  const fallback = ["walking", "home"].filter(id => id !== excludeSport && !h.sports.dislikes.includes(id));
  const ids = [...new Set([...likes, ...fallback])];
  // یه ورزش گروهی مورد علاقه (مثل فوتبال) رو هم به شکل «تمرین کوتاه» پیشنهاد می‌ده
  const team = h.sports.likes.find(id => ["football", "futsal", "basketball", "volleyball", "tennis"].includes(id) && id !== excludeSport);
  const out = ids.map(id => { const s = healthSport(id); return { sport: id, label: s.label, icon: s.icon, minutes: Math.min(minutes || 20, 30) }; });
  if(team){ const s = healthSport(team); out.splice(1, 0, { sport: team, label: `تمرین کوتاه ${s.label}`, icon: s.icon, minutes: 15 }); }
  return out;
}

/* برنامه‌ی امروز + «امروز حوصله ندارم» (بخش‌های ۶ تا ۸) */
function hTodayPlanDay(){
  const h = ensureHealthData();
  if(!h.workoutPlan || !Array.isArray(h.workoutPlan.days)) return null;
  const key = dayKeyOf(new Date());
  return h.workoutPlan.days.find(d => d.day === key) || null;
}
function renderHealthTodayPlan(){
  const h = ensureHealthData();
  const day = hTodayPlanDay();
  if(!day) return "";
  const done = h.planDone[todayKey()];
  if(day.rest || !day.items || !day.items.length){
    return `<div class="card" style="margin-bottom:12px;"><div style="font-weight:800;">😌 امروز طبق برنامه روز استراحته</div><div class="note">اگه دلت خواست، یه پیاده‌روی سبک هم عالیه.</div></div>`;
  }
  return `<div class="card" style="margin-bottom:12px; ${done ? "" : "border:1px solid var(--gold);"}">
    <div style="font-weight:800; margin-bottom:6px;">📅 برنامه‌ی امروز${day.focus ? ` — ${escapeHtml(day.focus)}` : ""}</div>
    ${day.items.map(it => `<div class="note" style="margin-bottom:4px;">${healthSport(it.sport).icon} ${escapeHtml(it.title)} — ${toFaDigits(it.minutes)} دقیقه${it.detail ? `<br><span style="opacity:.8;">${escapeHtml(it.detail)}</span>` : ""}</div>`).join("")}
    ${done ? `<div style="margin-top:8px; font-weight:800;">✅ ${done === "sub" ? "با نسخه‌ی جایگزین انجام شد — زنجیره حفظ شد!" : "انجام شد!"}</div>` : `
      <div class="sheet-actions" style="margin-top:10px;">
        <button class="btn btn-ghost" onclick="openHealthSubstitute()">امروز حوصله ندارم</button>
        <button class="btn btn-primary" onclick="hDoPlanToday()">انجام دادم ✅</button>
      </div>`}
  </div>`;
}
function hDoPlanToday(){
  const day = hTodayPlanDay();
  if(!day || !day.items || !day.items.length) return;
  const it = day.items[0];
  openHealthLogForm({ sport: it.sport, minutes: day.items.reduce((s, x) => s + (x.minutes || 0), 0) || it.minutes, intensity: it.intensity || "moderate", planned: true });
}
function hMarkPlanDone(dk, how){
  const h = ensureHealthData();
  if(h.planDone[dk]) return 0;
  h.planDone[dk] = how;
  let xp = hAward("plan_" + dk, how === "sub" ? H_XP.planSub : H_XP.planDay, "plan");
  // تکمیل کل برنامه‌ی هفته
  const ws = hWeekStart(dk);
  if(h.workoutPlan && Array.isArray(h.workoutPlan.days)){
    const activeDays = h.workoutPlan.days.filter(d => !d.rest && d.items && d.items.length).map(d => d.day);
    const doneKeys = [0,1,2,3,4,5,6].map(i => hAddDays(ws, i)).filter(k => h.planDone[k]).map(k => hDayKeyOfDk(k));
    if(activeDays.length && activeDays.every(d => doneKeys.includes(d))) xp += hAward("planweek_" + ws, H_XP.planWeek, "planweek");
  }
  return xp;
}
function openHealthSubstitute(){
  const day = hTodayPlanDay();
  if(!day) return;
  const planned = day.items.reduce((s, x) => s + (x.minutes || 0), 0) || 30;
  const mainSport = day.items[0] && day.items[0].sport;
  const alts = hEasyAlternatives(mainSport, planned).slice(0, 2);
  const easy = day.easy && day.easy.title ? day.easy : null;
  const first = alts[0];
  hSheet(`
    <h3>اشکالی نداره 🙂</h3>
    <div class="note" style="margin-bottom:12px;">مهم اینه که کل عادت از بین نره. یه نسخه‌ی سبک‌تر انتخاب کن:</div>
    ${first ? `<div class="note" style="margin-bottom:10px; font-weight:800;">چون ${escapeHtml(first.label)} رو هم دوست داری، می‌خوای امروز ${toFaDigits(first.minutes)} دقیقه ${escapeHtml(first.label)} کنیم؟</div>` : ``}
    <div style="display:flex; flex-direction:column; gap:8px;">
      ${easy ? `<button class="btn btn-ghost" style="text-align:right;" onclick="openHealthLogForm({sport:'${escapeHtml(mainSport || "home")}', minutes:${Math.max(5, Math.min(60, easy.minutes || 15))}, intensity:'light', planned:true, sub:true})">⬇️ نسخه‌ی ساده‌تر: ${escapeHtml(easy.title)}</button>` : ``}
      ${alts.map(a => `<button class="btn btn-ghost" style="text-align:right;" onclick="openHealthLogForm({sport:'${a.sport}', minutes:${a.minutes}, intensity:'light', planned:true, sub:true})">${a.icon} ${toFaDigits(a.minutes)} دقیقه ${escapeHtml(a.label)}</button>`).join("")}
      <button class="btn btn-ghost" style="text-align:right;" onclick="openHealthHomeRoutine()">🏠 یه تمرین ۱۰ دقیقه‌ای تو خونه</button>
    </div>
    <div class="sheet-actions" style="margin-top:12px;"><button class="btn btn-ghost" onclick="closeOverlay()">بستن</button></div>`);
}
const HEALTH_HOME_ROUTINE = ["۱ دقیقه راه رفتن درجا یا جامپینگ جک آروم", "۱ دقیقه اسکات (نشست و برخاست)", "۱ دقیقه شنای دیواری یا روی زانو", "۳۰ ثانیه پلانک + ۳۰ ثانیه استراحت", "۱ دقیقه لانج (هر پا یکی‌درمیون)", "همین ۴ حرکت رو یه دور دیگه", "۲ دقیقه کشش آروم"];
function openHealthHomeRoutine(){
  hSheet(`
    <h3>🏠 تمرین ۱۰ دقیقه‌ای در خانه</h3>
    <div class="note" style="margin-bottom:8px;">بدون وسیله. هر جا درد داشتی، نکن یا آروم‌ترش کن.</div>
    <ol style="padding-inline-start:20px; line-height:2; margin:0 0 10px;">${HEALTH_HOME_ROUTINE.map(x => `<li>${x}</li>`).join("")}</ol>
    <div class="sheet-actions">
      <button class="btn btn-ghost" onclick="closeOverlay()">بعداً</button>
      <button class="btn btn-primary" onclick="openHealthLogForm({sport:'home', minutes:10, intensity:'light', planned:!!hTodayPlanDay(), sub:true})">انجامش دادم ✅</button>
    </div>`);
}

/* هدف هفتگی (بخش ۲۲ «رسیدن به هدف هفتگی») */
function hCheckWeeklyGoal(dk){
  const h = ensureHealthData();
  const ws = hWeekStart(dk);
  const sessions = hEntriesBetween(ws, hAddDays(ws, 6)).length;
  const goal = h.profile.daysPerWeek || 3;
  if(sessions >= goal){ const x = hAward("weekgoal_" + ws, H_XP.weekGoal, "weekgoal"); if(x) setTimeout(() => hToast(`هدف هفتگی‌ت رو زدی! +${toFaDigits(x)} امتیاز 🎉`), 900); }
}

/* ارتباط ورزش و تغذیه (بخش ۲۱) */
function renderHealthActivityFoodLink(){
  const today = todayKey();
  const mins = hMinutesOn(today);
  if(!mins) return "";
  let sum = 0;
  for(let i = 1; i <= 14; i++) sum += hMinutesOn(hAddDays(today, -i));
  const avg = sum / 14;
  const hard = hEntries(today).some(e => e.intensity === "hard");
  if(!(hard || (mins >= 30 && mins >= avg * 1.5))) return "";
  const h = ensureHealthData();
  const next = hIsPremium() && h.mealPlan ? hNextMealFromPlan() : null;
  return `<div class="card" style="margin-bottom:12px;">
    <div style="font-weight:800; margin-bottom:4px;">🍽️ ${hard ? "امروز تمرین سنگین داشتی" : "امروز فعالیتت بیشتر از معمول بود"}</div>
    <div class="note">${next ? `برای وعده‌ی بعدی از برنامه‌ت: <b>${escapeHtml(next.title)}</b> — ${escapeHtml((next.items || []).join("، "))}` : "برای وعده‌ی بعدی یه منبع پروتئین (مرغ، تخم‌مرغ، عدس، ماست) + سبزیجات + آب کافی گزینه‌ی خوبیه."}</div>
  </div>`;
}

/* ===================== فراخوانی AI (Edge Function health-ai) ===================== */
async function callHealthAI(action, payload){
  if(!sb) return { error: "اتصال برقرار نیست." };
  try{
    const { data, error } = await invokeEdge("health-ai", { body: { action, payload } });
    if(data && data.error) return { error: data.error };
    if(error) return { error: "الان جواب نگرفتیم — یه لحظه دیگه دوباره امتحان کن." };
    return data || {};
  }catch(e){ return { error: "مشکل در اتصال — اینترنتت رو چک کن." }; }
}
function hAiStart(k){ hAi.busy[k] = true; hAi.error[k] = ""; renderAll(); }
function hAiEnd(k, err){ hAi.busy[k] = false; hAi.error[k] = err || ""; }
function hProfileForAI(){
  const h = ensureHealthData(), p = h.profile;
  return { age: p.age, height: p.height, currentWeight: p.currentWeight, targetWeight: p.targetWeight, mainGoal: p.mainGoal, mainGoals: Array.isArray(p.mainGoals) && p.mainGoals.length ? p.mainGoals : (p.mainGoal ? [p.mainGoal] : []),
    activityLevel: p.activityLevel, daysPerWeek: p.daysPerWeek, minutesPerSession: p.minutesPerSession, level: p.level,
    equipment: (p.equipment || []).map(id => (HEALTH_EQUIPMENT.find(e => e.id === id) || {}).label || id) };
}
function hSportsForAI(){
  const h = ensureHealthData();
  const lbl = id => id === "other" && h.sports.customLike ? h.sports.customLike : healthSport(id).label;
  return { likes: h.sports.likes.map(lbl), dislikes: h.sports.dislikes.map(lbl), likeIds: h.sports.likes, dislikeIds: h.sports.dislikes };
}
function hRecentSummary(days){
  const today = todayKey(), from = hAddDays(today, -(days - 1));
  const list = hEntriesBetween(from, today);
  const bySport = {};
  list.forEach(e => { bySport[e.sport] = (bySport[e.sport] || 0) + e.minutes; });
  const parts = Object.keys(bySport).map(id => `${healthSport(id).label} ${bySport[id]} دقیقه`);
  return `${days} روز اخیر: ${list.length} جلسه${parts.length ? ` (${parts.join("، ")})` : ""}`;
}

/* ===================== ورزش (طراحی نهایی v2.4.0: سه حالت) =====================
   ۱) برنامه‌ی مربی (سلامت پلاس، برنامه‌ی منتشرشده)  ۲) برنامه‌ی پله (برنامه‌ی هفتگی هوشمند)  ۳) هنوز برنامه‌ای نداره
   زیرش: این هفته، ورزش‌ها و روندشون (۶ هفته)، دقیقه‌ی ورزش ۴ هفته، ورزش‌های مورد علاقه، و ورود به مربی. */
function hGoPlus(view){
  switchTab('plus');
  setTimeout(() => { if(view === "progress" && typeof plusOpenProgress === "function") plusOpenProgress(); else if(view && typeof plusGo === "function") plusGo(view); }, 0);
}
function hSportState(){
  const plusOn = typeof CLIENT_FLAGS !== "undefined" && CLIENT_FLAGS.plus_enabled && typeof PLUS !== "undefined";
  if(plusOn && !PLUS.status && typeof plusLoad === "function") setTimeout(() => plusLoad(), 0);
  const prog = plusOn && PLUS.programs ? PLUS.programs.find(p => p.status === "published") : null;
  if(prog) return { kind: "coach", prog, coach: (PLUS.coaches || []).find(c => c.coach_id === prog.coach_id) || null };
  const h = ensureHealthData();
  if(h.workoutPlan && Array.isArray(h.workoutPlan.days)) return { kind: "peleh" };
  return { kind: "none", plusOn };
}
function hWeekRow(kind){
  const h = ensureHealthData();
  const ws = hWeekStart(todayKey()), tk = todayKey();
  const plusDays = kind === "coach" ? (DATA.activities.find(a => a.id === "plus_workout") || {}).days || [] : [];
  let doneN = 0, planN = 0, mins = 0;
  const cells = [0,1,2,3,4,5,6].map(i => {
    const dk = hAddDays(ws, i), wd = hDayKeyOfDk(dk);
    let planned = false, did = false;
    if(kind === "coach"){ planned = plusDays.includes(wd) || plusDays.includes("daily"); did = (DATA.history[dk] || []).includes("plus_workout"); }
    else { const d = h.workoutPlan && h.workoutPlan.days.find(x => x.day === wd); planned = !!(d && !d.rest); did = !!h.planDone[dk] || (!planned && hEntries(dk).length > 0); }
    if(planned) planN++;
    if(did) doneN++;
    mins += hMinutesOn(dk);
    const cls = did ? "d" : planned ? "p" : "r";
    return `<div><i class="${cls}">${did ? pi("check") : ""}</i>${dk === tk ? `<b>امروز</b>` : DAY_LABELS[wd].slice(0, 1)}</div>`;
  });
  return `<div class="card hs-week">
    <div class="row-between"><b>این هفته</b><span class="note">${toFaDigits(doneN)} از ${toFaDigits(planN || doneN)} جلسه · ${toFaDigits(mins)} دقیقه</span></div>
    <div class="wk" role="img" aria-label="${toFaDigits(doneN)} جلسه‌ی انجام‌شده این هفته">${cells.join("")}</div>
    <div class="note">پر: انجام شده · خط‌چین طلایی: برنامه داری · خط‌چین خاکستری: استراحت</div>
  </div>`;
}
function hSparkSvg(vals, label){
  const mx = Math.max(1, ...vals), mn = Math.min(...vals);
  const n = vals.length, W = 140, H = 36;
  const pts = vals.map((v, k) => `${(W - 6 - k * (W - 12) / Math.max(1, n - 1)).toFixed(1)},${(H - 5 - (v - mn) / Math.max(1, mx - mn) * (H - 12)).toFixed(1)}`);
  const flat = mx === mn;
  const last = pts[pts.length - 1].split(",");
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}" role="img" aria-label="${escapeHtml(label)}"><polyline points="${pts.join(" ")}" fill="none" stroke="var(${flat ? "--muted" : "--gold"})" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="${last[0]}" cy="${last[1]}" r="4" fill="var(${flat ? "--muted" : "--gold"})"/></svg>`;
}
// روند هر ورزش: دقیقه‌ی هر هفته در ۶ هفته‌ی اخیر + ۷ روز اخیر
function hSportTrends(){
  const h = ensureHealthData();
  const tk = todayKey(), ws = hWeekStart(tk);
  const weeks = [5,4,3,2,1,0].map(k => hAddDays(ws, -7 * k));
  const per = {};
  Object.keys(h.activityLog).forEach(dk => (h.activityLog[dk] || []).forEach(e => {
    const w = weeks.findIndex((st, idx) => dk >= st && dk < (weeks[idx + 1] || hAddDays(ws, 7)));
    if(w < 0) return;
    const r = (per[e.sport] = per[e.sport] || { w: [0,0,0,0,0,0], days: new Set(), l7: 0, p7: 0 });
    r.w[w] += Number(e.minutes) || 0;
    if(dk > hAddDays(tk, -7)){ r.days.add(dk); r.l7 += Number(e.minutes) || 0; }
    else if(dk > hAddDays(tk, -14)) r.p7 += Number(e.minutes) || 0;
  }));
  const ids = Object.keys(per).sort((a, b) => per[b].w[5] + per[b].w[4] - per[a].w[5] - per[a].w[4]).slice(0, 4);
  if(!ids.length) return `<div class="card"><div class="note">با ثبت هر ورزش، روند ۶ هفته‌ایش اینجا میاد. از «ثبت فعالیت» در بخش امروز شروع کن.</div></div>`;
  return `<div class="et-grid">${ids.map(id => {
    const r = per[id], cur = r.l7, prev = r.p7;   // ۷ روز اخیر در برابر ۷ روز قبلش (نه هفته‌ی نیمه‌کاره)
    const pct = prev > 0 ? Math.round((cur - prev) / prev * 100) : null;
    const dots = [6,5,4,3,2,1,0].map(k => { const dk = hAddDays(tk, -k); return `<span class="${r.days.has(dk) ? "d" : k === 0 ? "t" : ""}"></span>`; }).join("");
    return `<div class="et">
      ${pct !== null && pct !== 0 ? `<span class="badge-soft ${pct > 0 ? "ok" : ""}"><bdi dir="ltr">${pct > 0 ? "+" : "−"}${toFaDigits(Math.abs(pct))}٪</bdi></span>` : ``}
      <div class="et-name">${healthSport(id).icon} ${escapeHtml(id === "other" && h.sports.customLike ? h.sports.customLike : healthSport(id).label)}</div>
      <div class="note">${toFaDigits(cur)} دقیقه در ۷ روز اخیر</div>
      ${hSparkSvg(r.w, `دقیقه‌ی هفتگی در ۶ هفته‌ی اخیر`)}
      <div class="hdots" aria-hidden="true">${dots}</div>
    </div>`;
  }).join("")}</div>`;
}
function hMinutesStairs(){
  const tk = todayKey(), ws = hWeekStart(tk);
  const vals = [3,2,1,0].map(k => { let m = 0; for(let i = 0; i < 7; i++){ const dk = hAddDays(ws, -7 * k + i); if(dk <= tk) m += hMinutesOn(dk); } return m; });
  const mx = Math.max(1, ...vals);
  const prevMonth = vals.slice(0, 3).reduce((a, b) => a + b, 0) / 3;
  const lbl = ["۳ هفته پیش", "۲ هفته پیش", "هفته‌ی قبل", "این هفته"];
  return `<div class="card hs-stairs">
    <div class="row-between"><b>دقیقه‌ی ورزش · ۴ هفته</b>${prevMonth > 0 && vals[3] > prevMonth ? `<span class="up">بیشتر از میانگین ۳ هفته‌ی قبل</span>` : ``}</div>
    <div class="stairs4" role="img" aria-label="${vals.map((v, k) => `${lbl[k]}: ${v} دقیقه`).join("، ")}">${vals.map((v, k) => `<div class="stair ${k === 3 ? "today" : ""}" style="height:${Math.max(18, Math.round(v / mx * 100))}%"><i style="height:${v ? 100 : 0}%"></i></div>`).join("")}</div>
    <div class="stairs4-l">${vals.map((v, k) => `<span class="${k === 3 ? "cur" : ""}">${lbl[k]}<br>${toFaDigits(v)}</span>`).join("")}</div>
  </div>`;
}
function renderHealthSport(){
  const h = ensureHealthData();
  const st = hSportState();
  const lbl = id => id === "other" && h.sports.customLike ? h.sports.customLike : healthSport(id).label;
  let hero = "";
  if(st.kind === "coach"){
    const c = st.coach, p = st.prog;
    const adv = (PLUS.advice || [])[0];
    const pw = typeof pwLoad === "function" ? pwLoad() : null;
    const going = pw && pw.status !== "finished";
    hero = `<section class="hero-card hs-hero" aria-label="تمرین امروز از مربی">
      <div class="hs-coach"><span class="hs-av" aria-hidden="true">${escapeHtml(((c && c.display_name) || "م").trim().slice(0, 1))}</span>
        <div><div class="hs-cname">${escapeHtml((c && c.display_name) || "مربی")} <span class="badge-soft">تأییدشده‌ی پله</span></div>
        <div class="note">${escapeHtml(p.title)} · نسخه‌ی ${toFaDigits(p.version || 1)}</div></div></div>
      <div class="hs-title">${going && pw.day_label ? `ادامه‌ی ${escapeHtml(pw.day_label)}` : "تمرین امروز"}</div>
      <div class="hs-btns"><button class="btn btn-primary" onclick="plusOpenTodayWorkout()">${going ? "ادامه‌ی تمرین" : "شروع تمرین امروز"}</button>
        <button class="btn btn-ghost" onclick="switchTab('plus'); setTimeout(() => plusOpenProgram('${escapeHtml(p.id)}'), 0)">دیدن برنامه</button></div>
    </section>
    ${adv ? `<div class="card hs-note"><b>مربی:</b> ${escapeHtml(String(adv.body || "").slice(0, 220))}<div class="note">${escapeHtml(jalaliDateLabel(new Date(adv.created_at)))}</div></div>` : ``}`;
  } else if(st.kind === "peleh"){
    const day = hTodayPlanDay();
    const done = h.planDone[todayKey()];
    const items = day && !day.rest ? (day.items || []) : [];
    hero = `<section class="hero-card hs-hero" aria-label="تمرین امروز">
      <div class="row-between"><span class="badge-soft">${pi("steps")} برنامه‌ی پله</span><span class="note">${escapeHtml(h.workoutPlan.title || "برنامه‌ی هفتگی")}</span></div>
      <div class="hs-title">${DAY_LABELS[dayKeyOf(new Date())]}${day && day.focus ? ` · ${escapeHtml(day.focus)}` : ""}</div>
      ${items.length ? items.map(it => `<div class="hs-it"><span class="ic">${healthSport(it.sport).icon}</span><div class="grow"><b>${escapeHtml(it.title)}</b><div class="note">${toFaDigits(it.minutes)} دقیقه</div></div>
          <span class="chk ${done ? "on" : ""}" aria-hidden="true">${pi("check")}</span></div>`).join("")
        : `<div class="note">امروز طبق برنامه روز استراحته؛ اگه دلت خواست یه پیاده‌روی سبک هم عالیه.</div>`}
      ${items.length && !done && day.easy && day.easy.title ? `<div class="note">${pi("refresh")} حوصله نداری؟ جایگزین سبک: ${escapeHtml(day.easy.title)} ${toFaDigits(day.easy.minutes)} دقیقه</div>` : ``}
      ${items.length ? (done ? `<div class="hs-done">${pi("checkCircle")} ${done === "sub" ? "با نسخه‌ی جایگزین انجام شد — زنجیره حفظ شد" : "امروز انجام شد"}</div>`
        : `<div class="hs-btns"><button class="btn btn-primary" onclick="hDoPlanToday()">انجام دادم</button><button class="btn btn-ghost" onclick="openHealthSubstitute()">امروز حوصله ندارم</button></div>`) : ``}
    </section>`;
  } else {
    hero = `<section class="hero-card hs-hero" aria-label="هنوز برنامه‌ای نداری">
      <div class="hs-title">هنوز برنامه‌ی ورزشی نداری</div>
      <div class="note">یکی رو انتخاب کن؛ هر وقت خواستی عوضش می‌کنی.</div>
      <button class="hs-opt" onclick="${hIsPremium() ? "hGenerateWorkoutPlan()" : "switchTab('premium')"}">${pi("steps")}<span class="grow"><b>برنامه‌ی هوشمند پله</b><span class="note">از ورزش‌هایی که دوست داری، هدف و زمانت ساخته می‌شه${hIsPremium() ? "" : " · Premium"}</span></span>${pi("chevL")}</button>
      ${st.plusOn ? `<button class="hs-opt" onclick="switchTab('plus')">${pi("users")}<span class="grow"><b>کار با مربی شخصی</b><span class="note">کد مربی‌ت رو وارد کن یا مربی پیدا کن</span></span>${pi("chevL")}</button>` : ``}
      <button class="hs-opt" onclick="openHealthLogForm && openHealthLogForm({})">${pi("plus")}<span class="grow"><b>فقط ثبت می‌کنم</b><span class="note">هر ورزشی کردی ثبت کن تا روندش رو ببینی</span></span>${pi("chevL")}</button>
    </section>`;
  }
  return `
    ${hero}
    ${st.kind !== "none" ? hWeekRow(st.kind) : ``}
    <div class="section-row"><div class="section-title">ورزش‌ها و روندشون</div><span class="note">۶ هفته‌ی اخیر</span></div>
    ${hSportTrends()}
    ${hMinutesStairs()}
    ${st.kind === "coach" ? `<div class="section-title">ابزارها</div><div class="card list-card">
      <div class="link-row" onclick="hGoPlus('progress')"><div class="act-title">پیشرفت من<span class="alt-tag">رکوردها و نمودار هر حرکت</span></div><span class="chev">${pi("chevL")}</span></div>
      <div class="link-row" onclick="hGoPlus('library')"><div class="act-title">بانک حرکات<span class="alt-tag">جستجوی فارسی و انگلیسی</span></div><span class="chev">${pi("chevL")}</span></div>
      <div class="link-row" onclick="hGoPlus('photos')"><div class="act-title">عکس‌های پیشرفت<span class="alt-tag">فقط تو و مربی‌ت</span></div><span class="chev">${pi("chevL")}</span></div>
    </div>` : ``}
    <div class="card" style="margin-top:14px;">
      <div class="row-between" style="margin-bottom:8px;"><b>ورزش‌هایی که دوست داری</b>
        <button class="mini-btn" onclick="editHealthSports()">${pi("pencil")} ویرایش</button></div>
      <div class="suggest-chips">${h.sports.likes.map(id => `<div class="suggest-chip on" style="pointer-events:none;">${healthSport(id).icon} ${escapeHtml(lbl(id))}</div>`).join("") || `<div class="note">هنوز انتخاب نکردی.</div>`}</div>
      <div class="note" style="margin-top:8px;">سطح: ${escapeHtml((HEALTH_LEVELS.find(l => l.id === h.profile.level) || {}).label || "—")} · ${toFaDigits(h.profile.daysPerWeek || 0)} روز در هفته · ${toFaDigits(h.profile.minutesPerSession || 0)} دقیقه${h.sports.dislikes.length ? ` · تو برنامه‌ت نمیاد: ${h.sports.dislikes.map(id => escapeHtml(lbl(id))).join("، ")}` : ``}</div>
      <button class="link-btn" style="padding:0; min-height:36px;" onclick="editHealthProfile()">ویرایش پروفایل سلامت</button>
    </div>
    ${st.kind === "peleh" ? `<div class="section-title" style="margin-top:14px;">برنامه‌ی هفته</div>${renderHealthWorkoutPlan()}` : ``}
    <div class="section-title" style="margin-top:14px;">ورزش رو عادت کن</div>
    ${renderHealthSportHabitForm()}
    ${st.kind !== "coach" && typeof CLIENT_FLAGS !== "undefined" && CLIENT_FLAGS.plus_enabled ? `<button type="button" class="card hs-coachlink" onclick="switchTab('plus')">
      <span class="ic">${pi("coach")}</span><span class="grow"><b>می‌خوای با مربی شخصی کار کنی؟</b><span class="note">${st.kind === "peleh" ? "برنامه‌ی پله سر جاش می‌مونه؛ هر وقت خواستی برگرد" : "کد مربی یا جستجوی مربی"}</span></span>${pi("chevL")}</button>` : ``}
  `;
}
function renderHealthWorkoutPlan(){
  const h = ensureHealthData();
  const plan = h.workoutPlan;
  const busy = hAi.busy.plan, err = hAi.error.plan;
  const todayK = dayKeyOf(new Date());
  if(!plan){
    return `<div class="card">
      <div class="note" style="margin-bottom:10px;">یه برنامه‌ی هفتگی می‌سازیم که از ورزش‌های مورد علاقه‌ت ترکیب شده و یکنواخت نمی‌شه.</div>
      ${err ? `<div class="field-error">${escapeHtml(err)}</div>` : ``}
      <button class="btn btn-primary" style="width:100%; padding:13px;" ${busy ? "disabled" : ""} onclick="hGenerateWorkoutPlan()">${busy ? "در حال ساختن برنامه..." : "✨ برنامه‌م رو بساز"}</button>
    </div>`;
  }
  return `<div class="card">
    ${plan.title ? `<div style="font-weight:800; margin-bottom:8px;">${escapeHtml(plan.title)}</div>` : ``}
    ${DAY_KEYS.map(dk => {
      const d = plan.days.find(x => x.day === dk);
      const isToday = dk === todayK;
      const inner = !d || d.rest || !d.items || !d.items.length ? `<span class="note">استراحت 😌</span>` :
        d.items.map(it => `${healthSport(it.sport).icon} ${escapeHtml(it.title)} <span class="note">(${toFaDigits(it.minutes)} دقیقه)</span>`).join("<br>");
      return `<div style="padding:8px 10px; border-radius:10px; margin-bottom:6px; ${isToday ? "background:var(--gold-soft);" : "border-top:1px solid var(--line);"}">
        <div style="font-weight:800; font-size:calc(12.5px * var(--font-scale));">${DAY_LABELS[dk]}${isToday ? " (امروز)" : ""}${d && d.focus ? ` — ${escapeHtml(d.focus)}` : ""}</div>
        <div style="font-size:calc(12.5px * var(--font-scale)); line-height:1.9;">${inner}</div></div>`;
    }).join("")}
    ${(plan.tips || []).length ? `<div class="note" style="margin-top:8px;">💡 ${plan.tips.map(escapeHtml).join("<br>💡 ")}</div>` : ``}
    ${err ? `<div class="field-error">${escapeHtml(err)}</div>` : ``}
    <button class="btn btn-ghost" style="width:100%; padding:11px; margin-top:10px;" ${busy ? "disabled" : ""} onclick="hGenerateWorkoutPlan(true)">${busy ? "در حال ساختن..." : "🔄 یه برنامه‌ی جدید بساز"}</button>
  </div>`;
}
async function hGenerateWorkoutPlan(regen){
  if(hAi.busy.plan) return;
  if(regen && !confirm("برنامه‌ی فعلی با یه برنامه‌ی جدید جایگزین بشه؟")) return;
  hAiStart("plan");
  const res = await callHealthAI("workout_plan", { profile: hProfileForAI(), sports: hSportsForAI(), recent: hRecentSummary(14) });
  const plan = hValidatePlan(res && res.plan);
  if(!plan){ hAiEnd("plan", (res && res.error) || "برنامه ساخته نشد — دوباره امتحان کن."); renderAll(); return; }
  const h = ensureHealthData();
  h.workoutPlan = plan;
  hAiEnd("plan");
  save(); renderAll();
  hToast("برنامه‌ی هفتگی‌ت آماده‌ست 💪");
}
function hValidatePlan(p){
  if(!p || !Array.isArray(p.days)) return null;
  const h = ensureHealthData();
  const valid = new Set(HEALTH_SPORTS.map(s => s.id));
  const disliked = new Set(h.sports.dislikes);
  const days = DAY_KEYS.map(dk => {
    const d = p.days.find(x => x && x.day === dk) || { day: dk, rest: true, items: [] };
    const items = (Array.isArray(d.items) ? d.items : []).slice(0, 3).map(it => ({
      sport: valid.has(it && it.sport) && !disliked.has(it.sport) ? it.sport : "other",
      title: String((it && it.title) || "").slice(0, 60) || "تمرین",
      minutes: Math.max(5, Math.min(180, Math.round(Number(it && it.minutes) || 20))),
      intensity: ["light", "moderate", "hard"].includes(it && it.intensity) ? it.intensity : "moderate",
      detail: String((it && it.detail) || "").slice(0, 160),
    })).filter(it => it.sport !== "other" || it.title);
    const easy = d.easy && typeof d.easy === "object" ? { title: String(d.easy.title || "").slice(0, 60), minutes: Math.max(5, Math.min(30, Math.round(Number(d.easy.minutes) || 10))) } : null;
    return { day: dk, rest: !!d.rest || !items.length, focus: String(d.focus || "").slice(0, 40), items, easy };
  });
  if(!days.some(d => !d.rest)) return null;
  return { createdAt: Date.now(), title: String(p.title || "").slice(0, 60), days, tips: (Array.isArray(p.tips) ? p.tips : []).slice(0, 3).map(t => String(t).slice(0, 140)) };
}

/* سیستم عادت (بخش ۲۰): ورزش مورد علاقه → یه فعالیت روزهای مشخص در سیستم اصلی اپ (با امتیاز خودش) */
let hHabitForm = null;
function renderHealthSportHabitForm(){
  const h = ensureHealthData();
  if(!hHabitForm) hHabitForm = { sport: h.sports.likes[0] || "walking", days: [], points: 15 };
  const f = hHabitForm;
  const mine = (DATA.activities || []).filter(a => String(a.id).startsWith("hsport_"));
  return `<div class="card">
    <div class="note" style="margin-bottom:10px;">مثلاً «هر دوشنبه و چهارشنبه فوتبال». به فعالیت‌های روزانه‌ی اپ اضافه می‌شه و هر روز تیکش رو می‌زنی.</div>
    <div class="field"><label>ورزش</label><div class="suggest-chips">${[...new Set([...h.sports.likes, "walking", "home"])].map(id => hChip(`${healthSport(id).icon} ${escapeHtml(healthSport(id).label)}`, f.sport === id, `hHabitForm.sport='${id}'; renderAll();`)).join("")}</div></div>
    <div class="field"><label>روزها</label><div class="suggest-chips">
      ${hChip("هر روز", f.days.includes("daily"), "hToggleHabitDay('daily')")}
      ${DAY_KEYS.map(dk => hChip(DAY_LABELS[dk], f.days.includes(dk), `hToggleHabitDay('${dk}')`)).join("")}
    </div></div>
    <div class="field"><label>امتیاز هر بار</label><div class="suggest-chips">${[10, 15, 20, 30].map(n => hChip(toFaDigits(n), f.points === n, `hHabitForm.points=${n}; renderAll();`)).join("")}</div></div>
    <button class="btn btn-primary" style="width:100%; padding:12px;" onclick="hCreateSportHabit()">➕ ساختن عادت</button>
    ${mine.length ? `<div class="note" style="margin-top:12px;">عادت‌های ورزشی فعلی: ${mine.map(a => `${escapeHtml(a.title)} (${a.days.includes("daily") ? "هر روز" : a.days.map(d => DAY_LABELS[d]).join("، ")})`).join(" · ")}</div>` : ``}
  </div>`;
}
function hToggleHabitDay(dk){
  const f = hHabitForm;
  if(dk === "daily"){ f.days = f.days.includes("daily") ? [] : ["daily"]; }
  else{ f.days = f.days.filter(x => x !== "daily"); f.days = f.days.includes(dk) ? f.days.filter(x => x !== dk) : [...f.days, dk]; }
  renderAll();
}
function hCreateSportHabit(){
  const f = hHabitForm;
  if(!f.days.length){ alert("حداقل یه روز انتخاب کن."); return; }
  const s = healthSport(f.sport);
  const h = ensureHealthData();
  const title = `${s.icon} ${s.id === "other" && h.sports.customLike ? h.sports.customLike : s.label}`;
  const id = "hsport_" + (DATA.nextActivitySeq++);
  DATA.activities.push({ id, title, points: f.points, days: [...f.days], icon: s.icon, group: null });
  hHabitForm = null;
  save(); renderAll();
  hToast("عادت ساخته شد — تو فعالیت‌های روزانه‌ی اپ می‌بینیش ✅");
}

/* ===================== تب «تغذیه» (بخش‌های ۹ تا ۱۲) ===================== */
let hFoodForm = null;
function renderHealthFood(){
  const h = ensureHealthData();
  if(!h.food.completed || hFoodForm) return renderHealthFoodForm();
  const cheatLikes = h.food.likes.filter(id => HEALTH_SMART_TIPS[id]);
  const medical = h.food.restrictions.some(r => r === "diabetes" || r === "lowsalt");
  return `
    <div class="card" style="margin-bottom:12px;">
      <div class="row-between" style="margin-bottom:6px;"><div style="font-weight:800;">سلیقه‌ی غذاییت</div>
        <button class="btn btn-ghost" style="flex:none; padding:6px 12px;" onclick="hEditFood()">✏️ ویرایش</button></div>
      <div class="suggest-chips">${h.food.likes.map(id => `<div class="suggest-chip on" style="pointer-events:none;">${healthFood(id).icon} ${healthFood(id).label}</div>`).join("")}</div>
      ${medical ? `<div class="note" style="margin-top:8px;">⚕️ چون ${h.food.restrictions.includes("diabetes") ? "قند خون" : "فشار خون"} رو علامت زدی، برنامه‌ی دقیق غذایی‌ت رو با پزشک یا متخصص تغذیه هماهنگ کن.</div>` : ``}
    </div>
    <div class="card" style="margin-bottom:12px;">
      <div style="font-weight:800; margin-bottom:4px;">«قرار نیست غذاهای مورد علاقه‌ت رو حذف کنی.»</div>
      <div class="note" style="margin-bottom:8px;">فقط هوشمندانه‌تر انتخابشون کن:</div>
      ${cheatLikes.length ? cheatLikes.slice(0, 4).map(id => `<div style="margin-bottom:8px;"><b>${healthFood(id).icon} ${healthFood(id).label}:</b> <span class="note">${HEALTH_SMART_TIPS[id].slice(0, 3).join(" · ")}</span></div>`).join("") : `<div class="note">غذاهای محبوبت رو انتخاب کن تا نکته‌ی مخصوص هرکدوم بیاد.</div>`}
    </div>
    ${renderHealthSmartChoiceCard()}
    <div class="section-title">🍕 Smart Cheat</div>
    ${hIsPremium() ? renderHealthSmartCheat() : hLocked("Smart Cheat", "«امشب هوس پیتزا کردی؟» — بر اساس هدفت، فعالیت امروزت و سلیقه‌ت، ۳ نسخه‌ی هوشمندتر از همون چیزی که دوست داری پیشنهاد می‌ده.")}
    <div class="section-title" style="margin-top:14px;">🥗 برنامه‌ی غذایی شخصی</div>
    ${hIsPremium() ? renderHealthMealPlan() : hLocked("برنامه‌ی غذایی شخصی", "وعده‌های روزانه بر اساس غذاهایی که دوست داری، محدودیت‌ها، هدف و وقتی که برای آشپزی داری — با امکان جایگزین کردن هر وعده.")}
  `;
}
function hEditFood(){ const f = ensureHealthData().food; hFoodForm = JSON.parse(JSON.stringify(f)); renderAll(); }
function hFoodToggle(field, v){
  const f = hFoodForm, arr = f[field];
  const i = arr.indexOf(v);
  if(i >= 0) arr.splice(i, 1); else arr.push(v);
  if(field === "likes" && i < 0) f.dislikes = f.dislikes.filter(x => x !== v);
  if(field === "dislikes" && i < 0) f.likes = f.likes.filter(x => x !== v);
  renderAll();
}
function renderHealthFoodForm(){
  const h = ensureHealthData();
  if(!hFoodForm) hFoodForm = JSON.parse(JSON.stringify(h.food));
  const f = hFoodForm;
  return `<div class="card">
    <div class="note" style="margin-bottom:12px;">چندتا سوال درباره‌ی غذا، تا پیشنهادها واقعاً مال خودت باشن.</div>
    <div class="field"><label>چه غذاهایی رو دوست داری؟</label><div class="suggest-chips">${HEALTH_FOODS.map(x => hChip(`${x.icon} ${x.label}`, f.likes.includes(x.id), `hFoodToggle('likes','${x.id}')`)).join("")}</div></div>
    <div class="field"><label>چه غذاهایی رو دوست نداری؟ (اختیاری)</label><div class="suggest-chips">${HEALTH_FOODS.map(x => hChip(`${x.icon} ${x.label}`, f.dislikes.includes(x.id), `hFoodToggle('dislikes','${x.id}')`)).join("")}</div></div>
    <div class="field"><label>حساسیت یا محدودیت غذایی داری؟</label><div class="suggest-chips">${HEALTH_RESTRICTIONS.map(x => hChip(x.label, f.restrictions.includes(x.id), `hFoodToggle('restrictions','${x.id}')`)).join("")}</div>
      <input type="text" class="goal-input" style="margin-top:6px;" maxlength="80" placeholder="چیز دیگه‌ای؟ (اختیاری)" value="${escapeHtml(f.restrictionNote || "")}" oninput="hFoodForm.restrictionNote=this.value"></div>
    <div class="field"><label>معمولاً چند وعده می‌خوری؟</label><div class="suggest-chips">${HEALTH_MEAL_COUNTS.map(x => hChip(x.t, f.mealsPerDay === x.v, `hFoodForm.mealsPerDay=${x.v}; renderAll();`)).join("")}</div></div>
    <div class="field"><label>بیشتر غذای خونگی می‌خوری یا بیرون؟</label><div class="suggest-chips">${HEALTH_EATING_PLACES.map(x => hChip(x.t, f.eatingPlace === x.v, `hFoodForm.eatingPlace='${x.v}'; renderAll();`)).join("")}</div></div>
    <div class="field"><label>چقدر وقت برای آشپزی داری؟</label><div class="suggest-chips">${HEALTH_COOK_TIMES.map(x => hChip(x.t, f.cookTime === x.v, `hFoodForm.cookTime='${x.v}'; renderAll();`)).join("")}</div></div>
    <div class="field-error" id="h_food_error"></div>
    <button class="btn btn-primary" style="width:100%; padding:13px;" onclick="hSaveFood()">ذخیره</button>
    ${h.food.completed ? `<button class="btn btn-ghost" style="width:100%; padding:11px; margin-top:8px;" onclick="hFoodForm=null; renderAll();">انصراف</button>` : ``}
  </div>`;
}
function hSaveFood(){
  const f = hFoodForm;
  if(!f.likes.length){ const el = document.getElementById("h_food_error"); if(el) el.textContent = "حداقل یه غذا که دوست داری انتخاب کن."; return; }
  const h = ensureHealthData();
  h.food = { ...f, restrictionNote: String(f.restrictionNote || "").slice(0, 80), completed: true };
  hFoodForm = null;
  save(); renderAll();
  hToast("سلیقه‌ی غذاییت ذخیره شد ✅");
}

/* انتخاب هوشمند روزانه (رایگان — بخش ۲۲) */
function renderHealthSmartChoiceCard(){
  const h = ensureHealthData();
  const today = h.foodChoices[todayKey()] || [];
  return `<div class="card" style="margin-bottom:12px;">
    <div style="font-weight:800; margin-bottom:6px;">🥗 امروز یه انتخاب هوشمندتر داشتی؟</div>
    <div class="suggest-chips">${HEALTH_SMART_CHOICES.map((c, i) => hChip(c, today.includes(c), `hLogSmartChoice(${i})`)).join("")}</div>
    ${today.length ? `<div class="note" style="margin-top:6px;">امروز ${toFaDigits(today.length)} انتخاب هوشمند 👏</div>` : ``}
  </div>`;
}
function hLogSmartChoice(i, customLabel){
  const h = ensureHealthData();
  const label = customLabel || HEALTH_SMART_CHOICES[i];
  if(!label) return;
  const dk = todayKey();
  const arr = h.foodChoices[dk] = h.foodChoices[dk] || [];
  if(arr.includes(label)) return;
  arr.push(label);
  (h.foodChoiceTs[dk] = h.foodChoiceTs[dk] || []).push(Date.now());
  const room = H_XP.choiceDayCap - hXpOn(dk, "choice");
  const x = room > 0 ? hAward(`choice_${dk}_${arr.length}`, Math.min(H_XP.choice, room), "choice") : 0;
  hCheckChallenges();
  save(); renderAll();
  hToast(x ? `آفرین! +${toFaDigits(x)} امتیاز` : "ثبت شد ✅");
}

/* Smart Cheat (Premium — بخش ۱۲) */
let hCheatInput = "";
function renderHealthSmartCheat(){
  const h = ensureHealthData();
  const busy = hAi.busy.cheat, err = hAi.error.cheat, last = h.smartCheatLast;
  const cravables = h.food.likes.filter(id => healthFood(id).cheat);
  return `<div class="card">
    <div style="font-weight:800; margin-bottom:6px;">امشب هوس چی کردی؟</div>
    <div class="suggest-chips" style="margin-bottom:8px;">${cravables.map(id => hChip(`${healthFood(id).icon} ${healthFood(id).label}`, false, `hCheatInput='${healthFood(id).label}'; hRunSmartCheat();`)).join("")}</div>
    <div style="display:flex; gap:8px;">
      <input type="text" class="goal-input" style="flex:1;" maxlength="60" placeholder="مثلاً برگر، شیرینی، سوسیس بندری…" value="${escapeHtml(hCheatInput)}" oninput="hCheatInput=this.value" onkeydown="if(event.key==='Enter')hRunSmartCheat()">
      <button class="btn btn-primary" style="flex:none; padding:0 16px;" ${busy ? "disabled" : ""} onclick="hRunSmartCheat()">${busy ? "…" : "بگو"}</button>
    </div>
    ${err ? `<div class="field-error">${escapeHtml(err)}</div>` : ``}
    ${last ? `
      <div style="margin-top:12px; border-top:1px solid var(--line); padding-top:10px;">
        <div class="note" style="margin-bottom:8px;">${escapeHtml(last.intro || `برای «${last.craving}»:`)}</div>
        ${(last.options || []).map((o, i) => `<div style="padding:8px 10px; border-radius:10px; background:var(--surf-a); margin-bottom:8px;">
          <div style="font-weight:800;">گزینه‌ی ${toFaDigits(i + 1)}: ${escapeHtml(o.title)}</div>
          ${o.how ? `<div class="note">${escapeHtml(o.how)}</div>` : ``}
          ${o.portion ? `<div class="note">📏 ${escapeHtml(o.portion)}</div>` : ``}
          ${o.tip ? `<div class="note">💡 ${escapeHtml(o.tip)}</div>` : ``}
          <button class="btn btn-ghost" style="margin-top:6px; padding:6px 12px;" onclick="hChooseCheat(${i})">این رو انتخاب می‌کنم ✅</button>
        </div>`).join("")}
        ${last.drink ? `<div class="note">🥤 ${escapeHtml(last.drink)}</div>` : ``}
      </div>` : ``}
  </div>`;
}
async function hRunSmartCheat(){
  const craving = String(hCheatInput || "").trim().slice(0, 60);
  if(!craving || hAi.busy.cheat) return;
  hAiStart("cheat");
  const h = ensureHealthData();
  const res = await callHealthAI("smart_cheat", { craving, profile: hProfileForAI(), food: hFoodForAI(), today: hRecentSummary(1) });
  const r = res && res.result;
  if(!r || !Array.isArray(r.options) || !r.options.length){ hAiEnd("cheat", (res && res.error) || "جواب نیومد — دوباره امتحان کن."); renderAll(); return; }
  h.smartCheatLast = { craving, intro: String(r.intro || "").slice(0, 200), drink: String(r.drink || "").slice(0, 120), ts: Date.now(),
    options: r.options.slice(0, 3).map(o => ({ title: String(o.title || "").slice(0, 80), how: String(o.how || "").slice(0, 180), portion: String(o.portion || "").slice(0, 100), tip: String(o.tip || "").slice(0, 140) })) };
  hAiEnd("cheat");
  save(); renderAll();
}
function hChooseCheat(i){
  const h = ensureHealthData();
  const o = h.smartCheatLast && h.smartCheatLast.options[i];
  if(!o) return;
  hLogSmartChoice(null, `Smart Cheat: ${o.title}`.slice(0, 60));
}
function hFoodForAI(){
  const f = ensureHealthData().food;
  return { likes: f.likes.map(id => healthFood(id).label), dislikes: f.dislikes.map(id => healthFood(id).label),
    restrictions: f.restrictions.map(id => (HEALTH_RESTRICTIONS.find(r => r.id === id) || {}).label || id).concat(f.restrictionNote ? [f.restrictionNote] : []),
    mealsPerDay: f.mealsPerDay, eatingPlace: (HEALTH_EATING_PLACES.find(x => x.v === f.eatingPlace) || {}).t || "",
    cookTime: (HEALTH_COOK_TIMES.find(x => x.v === f.cookTime) || {}).t || "" };
}

/* برنامه‌ی غذایی (Premium — بخش ۱۰) — جایگزین هر وعده بدون فراخوانی دوباره‌ی AI */
const H_MEAL_SLOTS = { breakfast: "صبحانه", lunch: "ناهار", snack: "میان‌وعده", dinner: "شام", snack2: "میان‌وعده‌ی عصر" };
function hMealView(m, idx){
  const alts = m.alternatives || [];
  if(!idx) return m;
  const a = alts[idx - 1];
  return a ? { ...m, title: a.title, items: a.items, why: a.why || m.why } : m;
}
function renderHealthMealPlan(){
  const h = ensureHealthData();
  const plan = h.mealPlan, busy = hAi.busy.meal, err = hAi.error.meal;
  if(!plan){
    return `<div class="card">
      <div class="note" style="margin-bottom:10px;">یه برنامه‌ی ساده‌ی روزانه با غذاهایی که دوست داری — هر وعده رو هم می‌تونی عوض کنی.</div>
      ${err ? `<div class="field-error">${escapeHtml(err)}</div>` : ``}
      <button class="btn btn-primary" style="width:100%; padding:13px;" ${busy ? "disabled" : ""} onclick="hGenerateMealPlan()">${busy ? "در حال آماده‌سازی..." : "✨ برنامه‌ی غذایی‌م رو بساز"}</button>
    </div>`;
  }
  return `<div class="card">
    ${plan.meals.map(m => { const idx = h.mealSwaps[m.slot] || 0; const v = hMealView(m, idx); const n = (m.alternatives || []).length; return `
      <div style="padding:8px 0; border-top:1px solid var(--line);">
        <div class="row-between"><div style="font-weight:800;">${H_MEAL_SLOTS[m.slot] || escapeHtml(m.slot)}: ${escapeHtml(v.title)}</div>
          ${n ? `<button class="btn btn-ghost" style="flex:none; padding:4px 10px;" onclick="hSwapMeal('${m.slot}')">🔄 جایگزین</button>` : ``}</div>
        <div class="note">${escapeHtml((v.items || []).join(" + "))}</div>
        ${v.why ? `<div class="note" style="opacity:.8;">${escapeHtml(v.why)}</div>` : ``}
      </div>`; }).join("")}
    ${(plan.tips || []).length ? `<div class="note" style="margin-top:8px;">💡 ${plan.tips.map(escapeHtml).join("<br>💡 ")}</div>` : ``}
    ${err ? `<div class="field-error">${escapeHtml(err)}</div>` : ``}
    <button class="btn btn-ghost" style="width:100%; padding:11px; margin-top:10px;" ${busy ? "disabled" : ""} onclick="hGenerateMealPlan(true)">${busy ? "در حال آماده‌سازی..." : "🔄 برنامه‌ی جدید"}</button>
  </div>`;
}
function hSwapMeal(slot){
  const h = ensureHealthData();
  const m = h.mealPlan && h.mealPlan.meals.find(x => x.slot === slot);
  if(!m) return;
  const n = (m.alternatives || []).length;
  h.mealSwaps[slot] = ((h.mealSwaps[slot] || 0) + 1) % (n + 1);
  save(); renderAll();
}
function hNextMealFromPlan(){
  const h = ensureHealthData();
  if(!h.mealPlan) return null;
  const hr = new Date().getHours();
  const order = hr < 11 ? ["breakfast", "snack", "lunch"] : hr < 16 ? ["lunch", "snack2", "dinner"] : ["dinner", "snack2"];
  for(const slot of order){ const m = h.mealPlan.meals.find(x => x.slot === slot); if(m) return hMealView(m, h.mealSwaps[slot] || 0); }
  return null;
}
async function hGenerateMealPlan(regen){
  if(hAi.busy.meal) return;
  if(regen && !confirm("برنامه‌ی غذایی فعلی با یه برنامه‌ی جدید جایگزین بشه؟")) return;
  hAiStart("meal");
  const res = await callHealthAI("meal_plan", { profile: hProfileForAI(), food: hFoodForAI(), today: hRecentSummary(1) });
  const p = res && res.plan;
  const slots = Object.keys(H_MEAL_SLOTS);
  const meals = p && Array.isArray(p.meals) ? p.meals.filter(m => m && slots.includes(m.slot)).slice(0, 5).map(m => ({
    slot: m.slot, title: String(m.title || "").slice(0, 60), why: String(m.why || "").slice(0, 140),
    items: (Array.isArray(m.items) ? m.items : []).slice(0, 6).map(x => String(x).slice(0, 50)),
    alternatives: (Array.isArray(m.alternatives) ? m.alternatives : []).slice(0, 3).map(a => ({ title: String((a && a.title) || "").slice(0, 60), why: String((a && a.why) || "").slice(0, 140), items: (Array.isArray(a && a.items) ? a.items : []).slice(0, 6).map(x => String(x).slice(0, 50)) })).filter(a => a.title),
  })).filter(m => m.title) : [];
  if(!meals.length){ hAiEnd("meal", (res && res.error) || "برنامه آماده نشد — دوباره امتحان کن."); renderAll(); return; }
  const h = ensureHealthData();
  h.mealPlan = { createdAt: Date.now(), meals, tips: (Array.isArray(p.tips) ? p.tips : []).slice(0, 3).map(t => String(t).slice(0, 140)) };
  h.mealSwaps = {};
  hAiEnd("meal");
  save(); renderAll();
  hToast("برنامه‌ی غذایی‌ت آماده‌ست 🥗");
}

/* ===================== ترک عادت‌های ناسالم (بخش‌های ۱۶ تا ۱۹ و ۲۸) =====================
   اصل مهم: لغزش، «صفر شدن» نیست. پیشرفت با «روزهای موفق» شمرده می‌شه (نه فقط زنجیره‌ی پشت‌سرهم)،
   و نقاط عطف ۱/۳/۷/۱۴/۳۰/۶۰/۹۰ روی همین مجموع حساب می‌شن. */
function hActiveHabits(){ return ensureHealthData().badHabits.filter(x => !x.archived); }
function hHabitDef(hb){ return healthBadHabit(hb.type) || { id: "custom", label: hb.customLabel || "عادت من", icon: "🌱", unit: hb.unit || "بار در روز", triggers: [], replacements: [], ifThen: [], friction: [], medical: null, help: false }; }
function hHabitName(hb, forPublic){
  if(hb.private){
    if(hb.nickname) return `🔒 ${hb.nickname}`;
    return "🔒 عادت خصوصی";
  }
  const d = hHabitDef(hb);
  return `${d.icon} ${hb.type === "custom" ? (hb.customLabel || "عادت من") : d.label}`;
}
// برای Coach: عادت خصوصی با اسم واقعی فرستاده نمی‌شه
function hHabitAiLabel(hb){
  const d = hHabitDef(hb);
  if(hb.private) return d.aiLabel || "یک عادت شخصی که کاربر ترجیح داده اسمش رو نگه";
  return hb.type === "custom" ? (hb.customLabel || "یک عادت شخصی") : d.label;
}
function hHabitUnit(hb){ return hb.private ? "بار" : (hb.unit || hHabitDef(hb).unit); }
function hHabitTarget(hb, dk){
  if(hb.mode !== "reduce") return 0;
  const base = Math.max(1, Number(hb.baseline) || 1);
  if(hb.schedule && hIsPremium()){
    const week = Math.max(0, Math.floor(hDaysBetween(hb.startDate, dk) / 7));
    return Math.max(0, Math.round(base * (1 - 0.2 * (week + 1))));
  }
  return base - 1;
}
function hDaySuccess(hb, dk){
  const e = hb.log[dk];
  if(!e) return false;
  if(hb.mode === "quit") return e.s === "clean";
  return typeof e.n === "number" && e.n <= hHabitTarget(hb, dk);
}
function hHabitStats(hb){
  const keys = Object.keys(hb.log || {}).sort();
  const success = keys.filter(dk => hDaySuccess(hb, dk));
  let run = 0, best = 0, cur = 0, prev = null;
  keys.forEach(dk => {
    if(hDaySuccess(hb, dk)){ cur = prev && hDaysBetween(prev, dk) === 1 ? cur + 1 : 1; best = Math.max(best, cur); prev = dk; }
    else { cur = 0; prev = null; }
  });
  // زنجیره‌ی فعلی: تا امروز یا دیروز
  const today = todayKey();
  let d = hb.log[today] ? today : hAddDays(today, -1);
  while(hDaySuccess(hb, d)){ run++; d = hAddDays(d, -1); }
  return { total: success.length, run, best };
}
function hNextMilestone(total){ return H_MILESTONES.find(m => m.d > total) || null; }

function renderHealthHabits(){
  const list = hActiveHabits();
  return `
    <div class="card" style="margin-bottom:12px;">
      <div style="font-weight:800; margin-bottom:4px;">«قرار نیست یک‌شبه تغییر کنی؛ بیا هر روز یه قدم بهتر شیم.»</div>
      <div class="note">پله قضاوتت نمی‌کنه. عادت‌های خصوصی با قفل نشون داده می‌شن و اسم واقعی‌شون هیچ‌جا نمیاد — حتی برای Coach.</div>
    </div>
    ${list.map(renderHealthHabitCard).join("")}
    <button class="btn btn-primary" style="width:100%; padding:13px; margin-bottom:12px;" onclick="openHealthHabitPicker()">➕ یه عادت برای ترک یا کم کردن انتخاب کن</button>
    ${hActiveHabits().some(hb => hHabitDef(hb).help) ? renderHealthHelpLines() : ``}
  `;
}
function renderHealthHelpLines(){
  return `<div class="card" style="margin-bottom:12px;">
    <div style="font-weight:800; margin-bottom:6px;">📞 اگه به کمک بیشتری نیاز داشتی</div>
    ${HEALTH_HELP_LINES.map(l => `<div style="margin-bottom:6px;"><a href="tel:${l.tel}" style="font-weight:800; color:var(--gold);">${l.num}</a> — ${l.title}<div class="note">${l.desc}</div></div>`).join("")}
  </div>`;
}
function renderHealthHabitCard(hb){
  const d = hHabitDef(hb);
  const st = hHabitStats(hb);
  const next = hNextMilestone(st.total);
  const today = todayKey();
  const e = hb.log[today];
  const target = hHabitTarget(hb, today);
  const prevMs = [...H_MILESTONES].reverse().find(m => m.d <= st.total);
  const base = prevMs ? prevMs.d : 0;
  const pct = next ? hPct(st.total - base, next.d - base) : 100;
  const claim30 = st.total >= 30 && !hb.claimed30;
  return `<div class="card" style="margin-bottom:12px;">
    <div class="row-between" style="margin-bottom:6px;">
      <div style="font-weight:800;">${escapeHtml(hHabitName(hb))}</div>
      <button class="btn btn-ghost" style="flex:none; padding:4px 10px;" onclick="openHealthHabitMenu('${hb.id}')">⋯</button>
    </div>
    <div class="note" style="margin-bottom:8px;">${hb.mode === "quit" ? "هدف: ترک کامل" : `هدف: کاهش — از ${toFaDigits(hb.baseline)} ${escapeHtml(hHabitUnit(hb))}${hb.schedule && hIsPremium() ? ` · هدف این هفته: حداکثر ${toFaDigits(target)}` : ` · کمتر از ${toFaDigits(hb.baseline)}`}`}</div>
    <div class="suggest-chips" style="margin-bottom:8px;">
      <div class="suggest-chip" style="pointer-events:none;">🌱 ${toFaDigits(st.total)} روز موفق</div>
      <div class="suggest-chip" style="pointer-events:none;">🔥 ${toFaDigits(st.run)} روز پشت‌سرهم</div>
      ${st.best > st.run ? `<div class="suggest-chip" style="pointer-events:none;">🏅 بهترین: ${toFaDigits(st.best)}</div>` : ``}
    </div>
    ${next ? `<div style="height:8px; background:var(--line); border-radius:6px; overflow:hidden; margin-bottom:4px;"><div style="height:100%; width:${pct}%; background:var(--gold);"></div></div>
      <div class="note" style="margin-bottom:10px;">تا نقطه‌ی عطف بعدی (${toFaDigits(next.d)} روز): ${toFaDigits(next.d - st.total)} روز دیگه</div>` : `<div class="note" style="margin-bottom:10px;">همه‌ی نقاط عطف رو رد کردی 🏆</div>`}
    ${claim30 ? `<button class="btn btn-primary" style="width:100%; padding:11px; margin-bottom:10px;" onclick="hClaimHabit30('${hb.id}')">🎁 هدیه‌ی ۳۰ روزه‌ت رو بگیر</button>` : ``}
    ${e ? `<div class="note" style="margin-bottom:8px; font-weight:800;">${hDaySuccess(hb, today) ? "✅ امروز ثبت شد — عالی!" : "امروز سخت بود. ولی هنوز نسبت به قبل پیشرفت کردی؛ فردا دوباره ادامه می‌دیم. 🤍"}</div>` : ``}
    ${hb.mode === "quit" ? `
      <div class="sheet-actions">
        <button class="btn ${e && e.s === "slip" ? "btn-primary" : "btn-ghost"}" onclick="hLogHabitDay('${hb.id}','slip')">لغزش داشتم</button>
        <button class="btn ${e && e.s === "clean" ? "btn-primary" : "btn-ghost"}" onclick="hLogHabitDay('${hb.id}','clean')">امروز موفق بودم ✅</button>
      </div>` : `
      <div class="row-between">
        <div class="note">امروز چند ${escapeHtml(String(hHabitUnit(hb)).split(" ")[0])}؟</div>
        <div style="display:flex; gap:6px; align-items:center;">
          <button class="btn btn-ghost" style="padding:4px 12px;" onclick="hStepHabitCount('${hb.id}',-1)">−</button>
          <b style="min-width:28px; text-align:center;">${toFaDigits(hCountShown(hb))}</b>
          <button class="btn btn-ghost" style="padding:4px 12px;" onclick="hStepHabitCount('${hb.id}',1)">+</button>
        </div>
      </div>
      <button class="btn btn-ghost" style="width:100%; padding:9px; margin-top:8px;" onclick="hLogHabitCount('${hb.id}')">${e ? "به‌روزرسانی عدد امروز" : "ثبت عدد امروز"}</button>`}
    <div class="sheet-actions" style="margin-top:8px;">
      <button class="btn btn-ghost" onclick="openHealthHabitTips('${hb.id}')">💡 پیشنهادها</button>
      <button class="btn btn-primary" onclick="openHealthCraving('${hb.id}')">🆘 الان هوس کردم</button>
    </div>
    ${d.medical ? `<div class="note" style="margin-top:8px; font-size:calc(11px * var(--font-scale));">⚕️ ${hb.private ? "یه نکته‌ی مهم پزشکی تو «پیشنهادها» هست." : escapeHtml(d.medical)}</div>` : ``}
  </div>`;
}
function renderHealthHabitsToday(){
  const list = hActiveHabits();
  if(!list.length) return "";
  const today = todayKey();
  return `<div class="card" style="margin-bottom:12px;">
    <div style="font-weight:800; margin-bottom:6px;">🌱 ترک عادت — امروز</div>
    ${list.map(hb => { const e = hb.log[today]; return `<div class="row-between" style="padding:6px 0; border-top:1px solid var(--line);">
      <div>${escapeHtml(hHabitName(hb))}</div>
      ${e ? `<div class="note">${hDaySuccess(hb, today) ? "✅ موفق" : "🤍 ثبت شد"}</div>` : `<button class="btn btn-ghost" style="flex:none; padding:4px 10px;" onclick="setHealthSubTab('habits')">ثبت امروز</button>`}
    </div>`; }).join("")}
  </div>`;
}

/* انتخاب عادت از فهرست */
let hPick = null;
function openHealthHabitPicker(){
  if(hActiveHabits().length >= H_XP.maxHabits){ alert(`هم‌زمان حداکثر ${toFaDigits(H_XP.maxHabits)} عادت رو می‌تونی دنبال کنی — تمرکز روی چندتا، نتیجه‌ی بهتری داره. یکی رو بایگانی کن تا جا باز بشه.`); return; }
  hPick = { step: "list", cat: "tobacco" }; hRenderPicker();
}
function hRenderPicker(){
  if(hPick.step === "setup") return hRenderHabitSetup();
  const cat = hPick.cat;
  const items = HEALTH_BAD_HABITS.filter(x => x.cat === cat);
  hSheet(`
    <h3>کدوم عادت؟</h3>
    <div class="suggest-chips" style="margin-bottom:10px;">${HEALTH_HABIT_CATEGORIES.map(c => hChip(c.label, cat === c.id, `hPick.cat='${c.id}'; hRenderPicker();`)).join("")}</div>
    ${cat === "private" ? `<div class="note" style="margin-bottom:8px;">این‌ها به‌صورت پیش‌فرض خصوصی ذخیره می‌شن: هر جای اپ فقط «🔒 عادت خصوصی» (یا اسم مستعاری که خودت می‌ذاری) دیده می‌شه.</div>` : ``}
    <div style="display:flex; flex-direction:column; gap:6px; max-height:46vh; overflow-y:auto;">
      ${items.map(x => `<button class="btn btn-ghost" style="text-align:right; justify-content:flex-start;" onclick="hPickHabit('${x.id}')">${x.icon} ${x.label}</button>`).join("")}
      ${cat === "behavior" || cat === "private" ? `<button class="btn btn-ghost" style="text-align:right;" onclick="hPickHabit('custom')">✍️ یه عادت دیگه (خودم می‌نویسم)</button>` : ``}
    </div>
    <div class="sheet-actions" style="margin-top:10px;"><button class="btn btn-ghost" onclick="closeOverlay()">انصراف</button></div>`);
}
function hPickHabit(id){
  const d = healthBadHabit(id);
  hPick = { step: "setup", type: id, cat: hPick.cat, mode: d ? d.defaultMode : "quit", baseline: "", triggers: [], customTrigger: "",
    private: d ? !!d.private : hPick.cat === "private", nickname: "", customLabel: "", unit: d ? d.unit : "بار در روز" };
  hRenderPicker();
}
function hPickToggleTrigger(i){
  const d = healthBadHabit(hPick.type);
  const t = d.triggers[i];
  hPick.triggers = hPick.triggers.includes(t) ? hPick.triggers.filter(x => x !== t) : [...hPick.triggers, t];
  hRenderPicker();
}
function hRenderHabitSetup(){
  const d = healthBadHabit(hPick.type);
  const p = hPick;
  hSheet(`
    <h3>${d ? `${d.icon} ${p.private ? "عادت خصوصی" : d.label}` : "عادت من"}</h3>
    ${!d ? `<div class="field"><label>اسم عادت</label><input type="text" class="goal-input" maxlength="40" value="${escapeHtml(p.customLabel)}" oninput="hPick.customLabel=this.value" placeholder="مثلاً قهوه‌ی شب"></div>` : ``}
    <div class="field"><label>می‌خوای چیکار کنی؟</label><div class="suggest-chips">
      ${hChip("ترک کامل", p.mode === "quit", "hPick.mode='quit'; hRenderPicker();")}
      ${hChip("کم کردن تدریجی", p.mode === "reduce", "hPick.mode='reduce'; hRenderPicker();")}
    </div></div>
    <div class="field"><label>${p.mode === "reduce" ? "الان معمولاً چقدر؟" : "تقریباً چقدر؟ (اختیاری)"} (${escapeHtml(p.unit)})</label>
      <input type="text" inputmode="numeric" class="goal-input" value="${escapeHtml(String(p.baseline))}" oninput="hPick.baseline=this.value" placeholder="مثلاً ۱۰"></div>
    ${d && d.triggers.length ? `<div class="field"><label>معمولاً کِی بیشتر هوس می‌کنی؟ (محرک‌ها)</label>
      <div class="suggest-chips">${d.triggers.map((t, i) => hChip(t, p.triggers.includes(t), `hPickToggleTrigger(${i})`)).join("")}</div></div>` : ``}
    <div class="field"><label>محرک دیگه؟ (اختیاری)</label><input type="text" class="goal-input" maxlength="40" value="${escapeHtml(p.customTrigger)}" oninput="hPick.customTrigger=this.value"></div>
    <div class="field"><label>🔒 حریم خصوصی</label><div class="suggest-chips">
      ${hChip("خصوصی باشه", p.private, "hPick.private=true; hRenderPicker();")}
      ${hChip("لازم نیست", !p.private, "hPick.private=false; hRenderPicker();")}
    </div>
    ${p.private ? `<input type="text" class="goal-input" style="margin-top:6px;" maxlength="24" value="${escapeHtml(p.nickname)}" oninput="hPick.nickname=this.value" placeholder="اسم مستعار (اختیاری) — مثلاً «پروژه‌ی آزادی»">
      <div class="note" style="margin-top:4px;">اسم واقعی فقط تو همین صفحه‌ی تنظیم دیده می‌شه؛ برای Coach هم فقط یه توصیف کلی فرستاده می‌شه.</div>` : ``}
    </div>
    ${d && d.medical ? `<div class="note" style="margin-bottom:8px;">⚕️ ${escapeHtml(d.medical)}</div>` : ``}
    <div class="field-error" id="hp_error"></div>
    <div class="sheet-actions">
      <button class="btn btn-ghost" onclick="hPick.step='list'; hRenderPicker();">برگشت</button>
      <button class="btn btn-primary" onclick="hSaveHabit()">شروع کن</button>
    </div>`);
}
function hSaveHabit(){
  const p = hPick, d = healthBadHabit(p.type);
  const baseline = Math.round(hNum(p.baseline));
  const err = (m) => { const el = document.getElementById("hp_error"); if(el) el.textContent = m; };
  if(!d && !String(p.customLabel).trim()) return err("اسم عادت رو بنویس.");
  if(p.mode === "reduce" && (!baseline || baseline < 1 || baseline > 1000)) return err("برای کم کردن، بگو الان معمولاً چقدره.");
  const h = ensureHealthData();
  if(hActiveHabits().length >= H_XP.maxHabits) return err(`هم‌زمان حداکثر ${toFaDigits(H_XP.maxHabits)} عادت.`);
  const triggers = [...p.triggers, ...(String(p.customTrigger).trim() ? [String(p.customTrigger).trim().slice(0, 40)] : [])];
  h.badHabits.push({ id: hSeq("h"), type: d ? d.id : "custom", customLabel: d ? "" : String(p.customLabel).trim().slice(0, 40),
    private: !!p.private, nickname: p.private ? String(p.nickname || "").trim().slice(0, 24) : "", mode: p.mode,
    baseline: baseline || null, unit: p.unit, triggers, startDate: todayKey(), log: {}, cravings: [], milestones: {}, schedule: false,
    aiPlan: null, claimed30: false, archived: false });
  hPick = null;
  save(); closeOverlay(); healthSubTab = "habits"; renderAll();
  hToast("شروع کردی 🌱 امروز روز اوله.");
}
function hFindHabit(id){ return ensureHealthData().badHabits.find(x => x.id === id); }
function hLogHabitDay(id, s){
  const hb = hFindHabit(id); if(!hb) return;
  const dk = todayKey();
  hb.log[dk] = { s, ts: Date.now() };
  hAfterHabitLog(hb, dk);
}
// عدد پیش‌نمایشِ +/− فقط تو حافظه‌ست و تا «ثبت» زده نشه، تو سابقه نمیاد
let hDrafts = {};
function hCountShown(hb){
  if(typeof hDrafts[hb.id] === "number") return hDrafts[hb.id];
  const e = hb.log[todayKey()];
  return e && typeof e.n === "number" ? e.n : 0;
}
function hStepHabitCount(id, delta){
  const hb = hFindHabit(id); if(!hb) return;
  hDrafts[id] = Math.max(0, Math.min(1000, hCountShown(hb) + delta));
  renderAll();
}
function hLogHabitCount(id){
  const hb = hFindHabit(id); if(!hb) return;
  const dk = todayKey();
  hb.log[dk] = { n: hCountShown(hb), ts: Date.now() };
  delete hDrafts[id];
  hAfterHabitLog(hb, dk);
}
function hAfterHabitLog(hb, dk){
  const ok = hDaySuccess(hb, dk);
  const cleanKey = `clean_${hb.id}_${dk}`;
  if(ok){ const room = H_XP.cleanDayCap - hXpOn(dk, "clean") + (ensureHealthData().xpLedger[cleanKey] ? ensureHealthData().xpLedger[cleanKey].a : 0);
    if(room > 0) hAward(cleanKey, Math.min(H_XP.cleanDay, room), "clean"); }
  else hRevoke(cleanKey);
  const st = hHabitStats(hb);
  let msg = ok ? `یه روز موفق دیگه 🌱` : "امروز سخت بود. ولی هنوز نسبت به قبل پیشرفت کردی؛ فردا دوباره ادامه می‌دیم. 🤍";
  H_MILESTONES.forEach(m => {
    if(st.total >= m.d && !hb.milestones[m.d]){
      hb.milestones[m.d] = todayKey();
      // امتیاز نقطه‌ی عطف برای هر «نوع» عادت یک‌بار: حذف و ساختن دوباره‌ی همون عادت امتیاز تکراری نمی‌ده
      const x = hAward(`ms_${hb.type === "custom" ? "custom" : hb.type}_${m.d}`, m.xp, "milestone");
      msg = `${m.msg}${x ? ` +${toFaDigits(x)} امتیاز` : ""}`;
    }
  });
  hCheckChallenges();
  save(); renderAll();
  hToast(msg);
}
function openHealthHabitTips(id){
  const hb = hFindHabit(id); if(!hb) return;
  const d = hHabitDef(hb);
  const busy = hAi.busy["habit_" + id], err = hAi.error["habit_" + id];
  const plan = hb.aiPlan;
  hSheet(`
    <h3>💡 ${escapeHtml(hHabitName(hb))}</h3>
    ${hb.triggers.length ? `<div class="note" style="margin-bottom:8px;">محرک‌هات: ${hb.triggers.map(escapeHtml).join("، ")}</div>` : ``}
    ${d.replacements.length ? `<div style="font-weight:800; margin:6px 0;">به‌جاش چیکار کنم؟</div><ul style="padding-inline-start:20px; line-height:1.9; margin:0 0 8px;">${d.replacements.map(x => `<li>${escapeHtml(x)}</li>`).join("")}</ul>` : ``}
    ${d.ifThen.length ? `<div style="font-weight:800; margin:6px 0;">برنامه‌ی «اگه… بعد…»</div><ul style="padding-inline-start:20px; line-height:1.9; margin:0 0 8px;">${d.ifThen.map(x => `<li>${escapeHtml(x)}</li>`).join("")}</ul>` : ``}
    ${d.friction.length ? `<div style="font-weight:800; margin:6px 0;">سخت‌ترش کن</div><ul style="padding-inline-start:20px; line-height:1.9; margin:0 0 8px;">${d.friction.map(x => `<li>${escapeHtml(x)}</li>`).join("")}</ul>` : ``}
    <div style="font-weight:800; margin:10px 0 6px;">🤖 برنامه‌ی شخصی ترک</div>
    ${hIsPremium() ? `
      ${plan ? `<div class="note" style="margin-bottom:6px;">${escapeHtml(plan.summary || "")}</div>
        ${(plan.ifThen || []).length ? `<ul style="padding-inline-start:20px; line-height:1.9; margin:0 0 6px;">${plan.ifThen.map(x => `<li>${escapeHtml(x)}</li>`).join("")}</ul>` : ``}
        ${(plan.week || []).length ? `<div class="note">${plan.week.map(w => `<b>${escapeHtml(w.day)}:</b> ${escapeHtml(w.action)}`).join("<br>")}</div>` : ``}` : `<div class="note" style="margin-bottom:6px;">بر اساس محرک‌ها و ورزش‌هایی که دوست داری، یه برنامه‌ی مخصوص خودت می‌سازه.</div>`}
      ${err ? `<div class="field-error">${escapeHtml(err)}</div>` : ``}
      <button class="btn btn-ghost" style="width:100%; padding:10px; margin-top:6px;" ${busy ? "disabled" : ""} onclick="hGenerateHabitPlan('${hb.id}')">${busy ? "در حال ساختن..." : plan ? "🔄 برنامه‌ی جدید" : "✨ برنامه‌م رو بساز"}</button>
      ${hb.mode === "reduce" ? `<button class="btn btn-ghost" style="width:100%; padding:10px; margin-top:6px;" onclick="hToggleSchedule('${hb.id}')">${hb.schedule ? "✅ کاهش پله‌ای فعاله (هر هفته ۲۰٪ کمتر)" : "📉 فعال کردن کاهش پله‌ای (هر هفته ۲۰٪ کمتر)"}</button>` : ``}
    ` : `<div class="note" style="margin-bottom:6px;">برنامه‌ی شخصی، تحلیل محرک‌ها و کاهش پله‌ای، Premiumه.</div>
      <button class="btn btn-ghost" style="width:100%; padding:10px;" onclick="closeOverlay(); switchTab('premium');">دیدن Premium</button>`}
    ${hb.cravings.length ? `<div class="note" style="margin-top:10px;">${hTriggerInsight(hb)}</div>` : ``}
    ${d.medical ? `<div class="note" style="margin-top:10px;">⚕️ ${escapeHtml(d.medical)}</div>` : ``}
    ${d.help ? `<div class="note" style="margin-top:8px;">📞 ${HEALTH_HELP_LINES.map(l => `<a href="tel:${l.tel}" style="color:var(--gold); font-weight:800;">${l.num}</a> ${l.title}`).join(" · ")}</div>` : ``}
    <div class="sheet-actions" style="margin-top:12px;"><button class="btn btn-primary" onclick="closeOverlay()">بستن</button></div>`);
}
// تحلیل ساده‌ی محرک‌ها از روی لحظه‌های هوس ثبت‌شده (Premium: همراه با ساعت اوج)
function hTriggerInsight(hb){
  const c = hb.cravings || [];
  const resisted = c.filter(x => x.outcome === "resisted").length;
  let text = `از ${toFaDigits(c.length)} بار هوس، ${toFaDigits(resisted)} بار ردش کردی.`;
  if(hIsPremium() && c.length >= 3){
    const hours = {}; c.forEach(x => { const hr = new Date(x.ts).getHours(); const b = hr < 12 ? "صبح" : hr < 17 ? "بعدازظهر" : hr < 21 ? "عصر" : "شب"; hours[b] = (hours[b] || 0) + 1; });
    const top = Object.keys(hours).sort((a, b) => hours[b] - hours[a])[0];
    const trig = {}; c.forEach(x => { if(x.trigger) trig[x.trigger] = (trig[x.trigger] || 0) + 1; });
    const topT = Object.keys(trig).sort((a, b) => trig[b] - trig[a])[0];
    text += ` بیشتر ${top} هوس می‌کنی${topT ? `، معمولاً «${escapeHtml(topT)}»` : ""} — برای همون موقع یه جایگزین از قبل آماده کن.`;
  }
  return text;
}
function hToggleSchedule(id){
  const hb = hFindHabit(id); if(!hb) return;
  hb.schedule = !hb.schedule;
  if(hb.schedule) hb.startDate = todayKey();
  save(); openHealthHabitTips(id); renderAll();
}
async function hGenerateHabitPlan(id){
  const hb = hFindHabit(id); if(!hb || hAi.busy["habit_" + id]) return;
  hAi.busy["habit_" + id] = true; hAi.error["habit_" + id] = ""; openHealthHabitTips(id);
  const res = await callHealthAI("habit_plan", { habit: { label: hHabitAiLabel(hb), private: !!hb.private, mode: hb.mode, baseline: hb.baseline, unit: hb.unit, triggers: hb.triggers }, sports: hSportsForAI().likes, profile: { age: hProfileForAI().age } });
  hAi.busy["habit_" + id] = false;
  const r = res && res.plan;
  if(!r || (!r.summary && !(r.ifThen || []).length)){ hAi.error["habit_" + id] = (res && res.error) || "برنامه ساخته نشد — دوباره امتحان کن."; }
  else{
    hb.aiPlan = { summary: String(r.summary || "").slice(0, 300), ifThen: (Array.isArray(r.ifThen) ? r.ifThen : []).slice(0, 5).map(x => String(x).slice(0, 160)),
      week: (Array.isArray(r.week) ? r.week : []).slice(0, 7).map(w => ({ day: String((w && w.day) || "").slice(0, 20), action: String((w && w.action) || "").slice(0, 160) })), ts: Date.now() };
    save();
  }
  const ov = document.getElementById("overlay");
  if(ov && ov.classList.contains("show")) openHealthHabitTips(id);
}
function openHealthHabitMenu(id){
  const hb = hFindHabit(id); if(!hb) return;
  hSheet(`
    <h3>${escapeHtml(hHabitName(hb))}</h3>
    <div style="display:flex; flex-direction:column; gap:8px;">
      <button class="btn btn-ghost" onclick="hTogglePrivate('${id}')">${hb.private ? "🔓 از حالت خصوصی دربیار" : "🔒 خصوصی کن"}</button>
      <button class="btn btn-ghost" onclick="hArchiveHabit('${id}')">📦 بایگانی (بعداً)</button>
      <button class="btn btn-danger" onclick="hDeleteHabit('${id}')">🗑️ حذف کامل</button>
    </div>
    <div class="sheet-actions" style="margin-top:12px;"><button class="btn btn-primary" onclick="closeOverlay()">بستن</button></div>`);
}
function hTogglePrivate(id){ const hb = hFindHabit(id); if(!hb) return; hb.private = !hb.private; save(); closeOverlay(); renderAll(); }
function hArchiveHabit(id){ const hb = hFindHabit(id); if(!hb) return; hb.archived = true; save(); closeOverlay(); renderAll(); hToast("بایگانی شد. هر وقت خواستی دوباره شروع کن."); }
function hDeleteHabit(id){
  if(!confirm("این عادت و همه‌ی سابقه‌ش پاک بشه؟")) return;
  const h = ensureHealthData();
  h.badHabits = h.badHabits.filter(x => x.id !== id);
  save(); closeOverlay(); renderAll();
}

/* لحظه‌ی هوس (بخش ۱۸): «۵ دقیقه صبر کن» + جایگزین متناسب با زمان و ورزش مورد علاقه */
let hCraving = null;
function openHealthCraving(id){
  const hb = hFindHabit(id); if(!hb) return;
  const d = hHabitDef(hb);
  const hr = new Date().getHours();
  const h = ensureHealthData();
  const liked = h.sports.likes.map(healthSport).find(s => s.id !== "other");
  const moveTip = liked ? (["football", "futsal"].includes(liked.id) ? `چون ${liked.label} دوست داری، ۵ دقیقه روپایی یا کار با توپ` : `چون ${liked.label} دوست داری، ۵ دقیقه یه نسخه‌ی کوتاهش`) : "یه دور کوتاه راه برو";
  const afterMeal = hr >= 13 && hr <= 15 || hr >= 20 && hr <= 22;
  const tips = [
    afterMeal ? "بعد از غذاست؟ الان ۱۰ دقیقه پیاده‌روی کن" : null,
    moveTip,
    ...d.replacements.slice(0, 3),
  ].filter(Boolean).slice(0, 4);
  hCraving = { id, end: Date.now() + 5 * 60 * 1000, trigger: "", tips, aiReply: "", busy: false };
  hRenderCraving();
  clearInterval(hCravingTimer);
  hCravingTimer = setInterval(() => {
    const el = document.getElementById("h_craving_timer");
    if(!el || !hCraving){ clearInterval(hCravingTimer); return; }
    const left = Math.max(0, Math.round((hCraving.end - Date.now()) / 1000));
    el.textContent = `${toFaDigits(Math.floor(left / 60))}:${toFaDigits(String(left % 60).padStart(2, "0"))}`;
    if(!left){ clearInterval(hCravingTimer); el.textContent = "تموم شد 💪"; }
  }, 1000);
}
function hRenderCraving(){
  const hb = hFindHabit(hCraving.id); if(!hb) return;
  hSheet(`
    <h3>🆘 فقط ۵ دقیقه صبر کن</h3>
    <div class="note" style="margin-bottom:8px;">موج هوس معمولاً چند دقیقه بیشتر طول نمی‌کشه. تا تایمر تموم بشه، یکی از این‌ها رو انجام بده:</div>
    <div id="h_craving_timer" style="font-size:34px; font-weight:900; text-align:center; margin:6px 0 10px; color:var(--gold);">۵:۰۰</div>
    <ul style="padding-inline-start:20px; line-height:2; margin:0 0 10px;">${hCraving.tips.map(t => `<li>${escapeHtml(t)}</li>`).join("")}</ul>
    ${hb.triggers.length ? `<div class="field"><label>الان محرکش چیه؟</label><div class="suggest-chips">${hb.triggers.map((t, i) => hChip(escapeHtml(t), hCraving.trigger === t, `hCravingTrig(${i})`)).join("")}</div></div>` : ``}
    ${hIsPremium() ? `<button class="btn btn-ghost" style="width:100%; padding:10px; margin-bottom:8px;" ${hCraving.busy ? "disabled" : ""} onclick="hCravingAI()">${hCraving.busy ? "…" : "🤖 یه جمله‌ی کمک از Coach"}</button>
      ${hCraving.aiReply ? `<div class="note" style="margin-bottom:8px; background:var(--gold-soft); padding:8px 10px; border-radius:10px;">${escapeHtml(hCraving.aiReply)}</div>` : ``}` : ``}
    <div class="sheet-actions">
      <button class="btn btn-ghost" onclick="hCravingOutcome('slipped')">لغزیدم</button>
      <button class="btn btn-primary" onclick="hCravingOutcome('resisted')">رد شد 💪</button>
    </div>`);
}
function hCravingTrig(i){
  const hb = hCraving && hFindHabit(hCraving.id); if(!hb) return;
  const t = hb.triggers[i];
  hCraving.trigger = hCraving.trigger === t ? "" : (t || "");
  hRenderCraving();
}
async function hCravingAI(){
  const hb = hFindHabit(hCraving.id); if(!hb || hCraving.busy) return;
  hCraving.busy = true; hRenderCraving();
  const res = await callHealthAI("craving_help", { habit: hHabitAiLabel(hb), trigger: hCraving.trigger || "", sports: hSportsForAI().likes });
  if(!hCraving) return;
  hCraving.busy = false;
  hCraving.aiReply = (res && res.reply) || (res && res.error) || "";
  hRenderCraving();
}
function hCravingOutcome(outcome){
  const hb = hFindHabit(hCraving.id); if(!hb) return;
  clearInterval(hCravingTimer);
  hb.cravings.push({ ts: Date.now(), outcome, trigger: hCraving.trigger || "" });
  if(hb.cravings.length > 60) hb.cravings = hb.cravings.slice(-60);
  let msg = "ثبت شد.";
  if(outcome === "resisted"){
    const dk = todayKey();
    const room = H_XP.cravingDayCap - hXpOn(dk, "craving");
    const x = room > 0 ? hAward(`crv_${hb.id}_${Date.now()}`, Math.min(H_XP.craving, room), "craving") : 0;
    msg = `ردش کردی 💪${x ? ` +${toFaDigits(x)} امتیاز` : ""}`;
  } else {
    if(hb.mode === "quit" && !hb.log[todayKey()]) hb.log[todayKey()] = { s: "slip", ts: Date.now() };
    msg = "اشکالی نداره. این فقط یه لحظه بود، نه کل مسیرت. 🤍";
  }
  hCraving = null;
  save(); closeOverlay(); renderAll();
  hToast(msg);
}
/* هدیه‌ی ۳۰ روزه (بخش ۲۸) — سمت سرور، هر حساب فقط یک‌بار (migration 012) */
async function hClaimHabit30(id){
  const hb = hFindHabit(id); if(!hb || hHabitStats(hb).total < 30) return;
  try{
    await flushPendingSave();
    const { data, error } = await sb.rpc("peleh_claim_habit_reward", { p_days: 30 });
    if(error) throw error;
    hb.claimed30 = true;
    save();
    if(data && data.ok){
      await reloadProfileKeepingLocalEdits();
      renderAll();
      alert(`🎁 ۳۰ روزه داری ادامه می‌دی. این یکی رو واقعاً به خودت بدهکار بودی!\n\nاشتراک Premium هدیه برات فعال شد.`);
    } else {
      renderAll();
      alert((data && data.message) || "۳۰ روز موفق! 🎉 امتیازش به کیف امتیازت اضافه شد.");
    }
  }catch(e){
    alert("الان نشد هدیه رو فعال کنیم — اینترنتت رو چک کن و دوباره امتحان کن.");
  }
}

/* ===================== چالش‌ها (بخش ۲۳) ===================== */
function hTpl(id){ return HEALTH_CHALLENGES.find(t => t.id === id) || null; }
function hChallengeEnd(c){ const t = hTpl(c.tpl); return hAddDays(c.start, (t ? t.days : 30) - 1); }
function hChallengeProgress(c){
  const t = hTpl(c.tpl); if(!t) return 0;
  const h = ensureHealthData();
  const end = hChallengeEnd(c), today = todayKey();
  const last = end < today ? end : today;
  const joined = Number(c.joinedAt) || 0;
  const list = hEntriesBetween(c.start, last).filter(e => (Number(e.ts) || 0) >= joined);
  const inSports = e => (t.sports || []).includes(e.sport);
  const minsOn = dk => list.filter(e => e.dk === dk).reduce((s, e) => s + e.minutes, 0);
  switch(t.metric){
    case "sessions": return list.length;
    case "minutes": return list.reduce((s, e) => s + e.minutes, 0);
    case "sport_sessions": return list.filter(inSports).length;
    case "sport_minutes": return list.filter(inSports).reduce((s, e) => s + e.minutes, 0);
    case "sport_km": return Math.round(list.filter(inSports).reduce((s, e) => s + (Number(e.km) || 0), 0) * 10) / 10;
    case "consecutive_min": {
      let best = 0, cur = 0;
      for(let dk = c.start; dk <= last; dk = hAddDays(dk, 1)){ if(minsOn(dk) >= (t.minMinutes || 20)){ cur++; best = Math.max(best, cur); } else cur = 0; }
      return best;
    }
    case "weekly_weighins": {
      let n = 0;
      for(let w = 0; w * 7 < t.days; w++){
        const ws = hAddDays(c.start, w * 7), we = hAddDays(ws, 6);
        if(h.weightLog.some(x => x.d >= ws && x.d <= we && x.d <= last && (x.t ? x.t >= joined : x.d > c.start))) n++;
      }
      return n;
    }
    case "habit_clean": {
      const hb = hFindHabit(c.habitId); if(!hb) return 0;
      return Object.keys(hb.log).filter(dk => dk >= c.start && dk <= last && hDaySuccess(hb, dk) && (dk > c.start || (Number(hb.log[dk].ts) || 0) >= joined)).length;
    }
    case "smart_choices": return Object.keys(h.foodChoices).filter(dk => dk >= c.start && dk <= last).reduce((s, dk) => {
      const ts = h.foodChoiceTs[dk];
      return s + (Array.isArray(ts) ? ts.filter(x => x >= joined).length : (dk > c.start ? h.foodChoices[dk].length : 0));
    }, 0);
  }
  return 0;
}
function hCheckChallenges(silent){
  const h = ensureHealthData();
  let changed = false;
  h.challenges.forEach(c => {
    if(c.status !== "active") return;
    const t = hTpl(c.tpl); if(!t){ c.status = "expired"; changed = true; return; }
    if(hChallengeProgress(c) >= t.target){
      c.status = "done"; c.doneAt = todayKey(); changed = true;
      const x = hAward("ch_" + c.id, t.xp, "challenge");
      if(!silent) setTimeout(() => { hToast(`🏆 چالش «${t.title}» تموم شد! +${toFaDigits(x)} امتیاز`); const pr = hPersonalRewardText(t); if(pr) setTimeout(() => hToast(pr), 2800); }, 400);
    } else if(hChallengeEnd(c) < todayKey()){ c.status = "expired"; changed = true; }
  });
  if(changed && !silent) save();
  return changed;
}
// یه چالش تموم‌شده تا پایان بازه‌ی خودش دوباره قابل شروع نیست (جلوی تکرار پشت‌سرهم برای امتیاز)
function hTplLockedUntil(tplId){
  const h = ensureHealthData();
  const today = todayKey();
  const locks = h.challenges.filter(c => c.tpl === tplId && c.status === "done" && hChallengeEnd(c) >= today).map(c => hAddDays(hChallengeEnd(c), 1));
  return locks.length ? locks.sort().pop() : null;
}
function hChallengeAvailable(){
  const h = ensureHealthData();
  const activeTpls = h.challenges.filter(c => c.status === "active").map(c => c.tpl).concat(HEALTH_CHALLENGES.filter(t => hTplLockedUntil(t.id)).map(t => t.id));
  const likes = h.sports.likes;
  const free = HEALTH_CHALLENGES.filter(t => t.tier === "free");
  const personal = HEALTH_CHALLENGES.filter(t => t.tier === "premium" && (
    (t.sports && t.sports.some(s => likes.includes(s))) || (t.needsHabit && hActiveHabits().length) || (t.metric === "smart_choices" && h.food.completed)));
  return { free: free.filter(t => !activeTpls.includes(t.id)), personal: personal.filter(t => !activeTpls.includes(t.id)) };
}
function renderHealthChallenges(){
  const h = ensureHealthData();
  const active = h.challenges.filter(c => c.status === "active");
  const done = h.challenges.filter(c => c.status === "done").slice(-5).reverse();
  const av = hChallengeAvailable();
  const prem = hIsPremium();
  const card = (t, btn) => `<div class="row-between" style="padding:9px 0; border-top:1px solid var(--line);">
    <div style="flex:1;"><div style="font-weight:800;">${t.icon} ${t.title}</div><div class="note">${t.desc} · 🎁 ${toFaDigits(t.xp)} امتیاز</div></div>${btn}</div>`;
  return `
    ${active.length ? `<div class="section-title">در حال انجام</div><div class="card" style="margin-bottom:12px;">${active.map(c => {
      const t = hTpl(c.tpl), pr = hChallengeProgress(c), left = hDaysBetween(todayKey(), hChallengeEnd(c)) + 1;
      const hb = c.habitId ? hFindHabit(c.habitId) : null;
      return `<div style="padding:9px 0; border-top:1px solid var(--line);">
        <div class="row-between"><div style="font-weight:800;">${t.icon} ${t.title}</div><div class="note">${toFaDigits(left)} روز مونده</div></div>
        ${hb ? `<div class="note">برای: ${escapeHtml(hHabitName(hb))}</div>` : ``}
        <div style="height:8px; background:var(--line); border-radius:6px; overflow:hidden; margin:6px 0 3px;"><div style="height:100%; width:${Math.min(100, hPct(pr, t.target))}%; background:var(--gold);"></div></div>
        <div class="note">${toFaDigits(pr)} از ${toFaDigits(t.target)}</div>
        <button class="btn btn-ghost" style="padding:4px 10px; margin-top:4px;" onclick="hLeaveChallenge('${c.id}')">انصراف</button>
      </div>`; }).join("")}</div>` : ``}
    <div class="section-title">چالش‌های عمومی</div>
    <div class="card" style="margin-bottom:12px;">${av.free.map(t => card(t, `<button class="btn btn-primary" style="flex:none; padding:7px 12px;" onclick="hJoinChallenge('${t.id}')">شروع</button>`)).join("") || `<div class="note">همه‌ی چالش‌های عمومی رو شروع کردی.</div>`}</div>
    <div class="section-title">چالش‌های شخصی تو</div>
    ${prem ? `<div class="card" style="margin-bottom:12px;">${av.personal.map(t => card(t, `<button class="btn btn-primary" style="flex:none; padding:7px 12px;" onclick="hJoinChallenge('${t.id}')">شروع</button>`)).join("") || `<div class="note">ورزش‌های مورد علاقه، سلیقه‌ی غذایی یا یه عادت برای ترک اضافه کن تا چالش‌های مخصوص خودت بیاد.</div>`}</div>`
      : hLocked("چالش‌های شخصی‌سازی‌شده", "بر اساس ورزش مورد علاقه‌ت (مثلاً «۳۰ کیلومتر دویدن» یا «۳۰ روز فوتبال»)، تغذیه و عادتی که داری ترک می‌کنی.")}
    ${done.length ? `<div class="section-title" style="margin-top:14px;">تموم‌شده‌ها 🏆</div><div class="card">${done.map(c => { const t = hTpl(c.tpl); const lock = hTplLockedUntil(c.tpl); return t ? `<div class="note" style="padding:4px 0;">✅ ${t.icon} ${t.title} — ${hFaDate(c.doneAt)}${lock ? ` · دوباره از ${hFaDate(lock)}` : ""}</div>` : ""; }).join("")}</div>` : ``}
  `;
}
function hJoinChallenge(tplId){
  const h = ensureHealthData();
  const t = hTpl(tplId); if(!t) return;
  if(t.tier === "premium" && !hIsPremium()){ switchTab("premium"); return; }
  const lock = hTplLockedUntil(tplId);
  if(lock){ alert(`این چالش رو تازه تموم کردی 🏆 از ${hFaDate(lock)} دوباره می‌تونی شروعش کنی.`); return; }
  if(h.challenges.filter(c => c.status === "active").length >= 3){ alert("هم‌زمان حداکثر ۳ چالش می‌تونی داشته باشی."); return; }
  let habitId = null;
  if(t.needsHabit){
    const list = hActiveHabits();
    if(!list.length){ alert("اول یه عادت برای ترک اضافه کن."); return; }
    if(list.length === 1) habitId = list[0].id;
    else { hSheet(`<h3>برای کدوم عادت؟</h3><div style="display:flex; flex-direction:column; gap:8px;">${list.map(hb => `<button class="btn btn-ghost" onclick="closeOverlay(); hJoinHabitChallenge('${tplId}','${hb.id}')">${escapeHtml(hHabitName(hb))}</button>`).join("")}</div><div class="sheet-actions" style="margin-top:10px;"><button class="btn btn-ghost" onclick="closeOverlay()">انصراف</button></div>`); return; }
  }
  hJoinHabitChallenge(tplId, habitId);
}
function hJoinHabitChallenge(tplId, habitId){
  const h = ensureHealthData();
  h.challenges.push({ id: hSeq("c"), tpl: tplId, start: todayKey(), joinedAt: Date.now(), habitId: habitId || null, status: "active", doneAt: null });
  if(h.challenges.length > 40) h.challenges = h.challenges.slice(-40);
  save(); renderAll();
  hToast("چالش شروع شد 🚀");
}
function hLeaveChallenge(id){
  if(!confirm("از این چالش انصراف می‌دی؟ (هیچ امتیازی کم نمی‌شه)")) return;
  const h = ensureHealthData();
  h.challenges = h.challenges.filter(c => c.id !== id);
  save(); renderAll();
}
/* جایزه‌ی شخصی (بخش ۲۶) — متن متناسب با علاقه‌ی کاربر */
function hPersonalRewardText(t){
  const h = ensureHealthData();
  const fav = h.sports.likes[0] ? healthSport(h.sports.likes[0]) : null;
  const item = (hRewardItems || []).find(it => (it.tags || []).some(tag => (t.tags || []).includes(tag) || h.sports.likes.includes(tag)));
  if(item) return `🎁 تو ${fav ? fav.label : "ورزش"} دوست داری؛ «${item.title}» تو فروشگاه جوایز برات مناسبه.`;
  return fav ? `🎁 تو بیشتر از همه ${fav.label} دوست داری — امتیازهات تو «جوایز» منتظرتن.` : "";
}

/* ===================== تب «پیشرفت» ===================== */
function hUpsertWeight(dk, kg, silent){
  const h = ensureHealthData();
  kg = Math.round(Number(kg) * 10) / 10;
  if(!kg || kg < 25 || kg > 300) return false;
  const i = h.weightLog.findIndex(x => x.d === dk);
  if(i >= 0){ h.weightLog[i].kg = kg; h.weightLog[i].t = Date.now(); } else h.weightLog.push({ d: dk, kg, t: Date.now() });
  h.weightLog.sort((a, b) => a.d < b.d ? -1 : 1);
  if(h.weightLog.length > 400) h.weightLog = h.weightLog.slice(-400);
  const latest = h.weightLog[h.weightLog.length - 1];
  if(latest) h.profile.currentWeight = latest.kg;
  if(!silent){ hAward("weight_" + dk, H_XP.weight, "weight"); hCheckChallenges(); }
  hQueueBodySync(false);
  return true;
}
let hWeightInput = "";
function hSubmitWeight(){
  const kg = hNum(hWeightInput);
  if(!hUpsertWeight(todayKey(), kg)){ alert("وزن رو درست وارد کن (کیلوگرم)."); return; }
  hWeightInput = "";
  save(); renderAll();
  hToast("وزن امروز ثبت شد ✅");
}
/* ---------- BMI (v2.4.0): روند شاخص توده‌ی بدنی از قد و وزن‌های ثبت‌شده ---------- */
function hBmiRows(){
  const h = ensureHealthData(), cm = h.profile.height;
  return h.weightLog.slice(-90).map(x => ({ d: x.d, bmi: typeof pelehBmi === "function" ? pelehBmi(x.kg, cm) : null })).filter(x => x.bmi != null);
}
function hBmiCard(){
  if(typeof pelehBmiChartSvg !== "function") return "";
  const h = ensureHealthData();
  if(!h.profile.height) return `<div class="card" style="margin-bottom:12px;"><div style="font-weight:800; margin-bottom:6px;">📐 شاخص توده‌ی بدنی (BMI)</div>
    <div class="note">برای دیدن BMI، قدت رو تو پروفایل سلامت وارد کن.</div>
    <button class="btn btn-ghost" style="width:100%; padding:9px; margin-top:8px;" onclick="editHealthProfile()">ثبت قد</button></div>`;
  const rows = hBmiRows(), sum = pelehBmiSummary(rows);
  const coaches = (typeof PLUS !== "undefined" && PLUS.coaches) ? PLUS.coaches.filter(c => c.status === "active") : [];
  return `<div class="card" style="margin-bottom:12px;">
    <div class="row-between" style="margin-bottom:6px;"><div style="font-weight:800;">📐 شاخص توده‌ی بدنی (BMI)</div>
      ${sum ? `<b style="color:${sum.band.color};">${toFaDigits(String(sum.bmi).replace(".", "٫"))} · ${sum.band.label}</b>` : ``}</div>
    ${pelehBmiChartSvg(rows, { empty: "با ثبت وزن، نمودار BMI اینجا میاد." })}
    ${sum && sum.n > 1 && sum.delta ? `<div class="note">تغییر از ${escapeHtml(jalaliDateLabel(new Date(sum.since + "T12:00:00")))}: <bdi dir="ltr">${sum.delta > 0 ? "+" : "−"}${toFaDigits(String(Math.abs(sum.delta)).replace(".", "٫"))}</bdi> واحد</div>` : ``}
    <div class="note" style="margin-top:4px; opacity:.8;">BMI فقط یه شاخص کلیه؛ برای زیر ۱۸ سال، ورزشکارهای خیلی عضلانی و دوران بارداری دقیق نیست.</div>
    ${coaches.length ? `<div class="note" style="margin-top:6px;">${coaches.some(c => c.share_body) ? "✓ مربی‌ت روند وزن و BMI رو می‌بینه." : "مربی‌ت هنوز روند BMI رو نمی‌بینه — از «سلامت پلاس» اجازه بده."}</div>` : ``}
  </div>`;
}
// وزن‌ها برای BMI مربی سمت سرور هم ثبت می‌شن (فقط وزن/قد/تاریخ؛ مربی فقط با اجازه‌ی خودت می‌بینه)
let _hBodySyncT = null, _hBodyAll = false;
function hQueueBodySync(all){
  if(typeof sb === "undefined" || !sb || typeof currentUser === "undefined" || !currentUser) return;
  clearTimeout(_hBodySyncT);
  _hBodyAll = _hBodyAll || !!all;
  _hBodySyncT = setTimeout(async () => {
    const all = _hBodyAll; _hBodyAll = false;
    try{
      const h = ensureHealthData();
      const list = (all ? h.weightLog.slice(-120) : h.weightLog.slice(-3)).map(x => ({ d: x.d, kg: x.kg, h: h.profile.height || null }));
      if(!list.length) return;
      const { error } = await sb.rpc("athlete_sync_body_metrics", { p_rows: list });
      if(!error) try{ localStorage.setItem("pelehBodySync_" + currentUser.id, todayKey()); }catch(e){}
    }catch(e){ /* بعداً دوباره */ }
  }, _hBodyAll ? 4000 : 1500);
}
function hMaybeFullBodySync(){
  try{ if(currentUser && localStorage.getItem("pelehBodySync_" + currentUser.id) === todayKey()) return; }catch(e){}
  hQueueBodySync(true);
}
function hWeightChart(){
  const h = ensureHealthData();
  const pts = h.weightLog.slice(-60);
  if(pts.length < 2) return `<div class="note">از فردا که دوباره وزنت رو ثبت کنی، نمودار روندت اینجا میاد.</div>`;
  const W = 320, H = 130, pad = 18;
  const vals = pts.map(p => p.kg).concat(h.profile.targetWeight ? [h.profile.targetWeight] : []);
  const min = Math.min(...vals) - 1, max = Math.max(...vals) + 1;
  const t0 = hDate(pts[0].d).getTime(), t1 = hDate(pts[pts.length - 1].d).getTime() || t0 + 1;
  const x = d => pad + ((hDate(d).getTime() - t0) / Math.max(1, t1 - t0)) * (W - 2 * pad);
  const y = kg => H - pad - ((kg - min) / Math.max(0.1, max - min)) * (H - 2 * pad);
  const line = pts.map(p => `${x(p.d).toFixed(1)},${y(p.kg).toFixed(1)}`).join(" ");
  const tgt = h.profile.targetWeight ? `<line x1="${pad}" x2="${W - pad}" y1="${y(h.profile.targetWeight).toFixed(1)}" y2="${y(h.profile.targetWeight).toFixed(1)}" stroke="currentColor" stroke-dasharray="4 4" opacity=".45"/><text x="${W - pad}" y="${(y(h.profile.targetWeight) - 4).toFixed(1)}" font-size="10" text-anchor="end" fill="currentColor" opacity=".7">هدف</text>` : "";
  return `<svg viewBox="0 0 ${W} ${H}" style="width:100%; height:auto; color:var(--muted);" role="img" aria-label="نمودار وزن">
    ${tgt}<polyline points="${line}" fill="none" stroke="var(--gold)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
    ${pts.map(p => `<circle cx="${x(p.d).toFixed(1)}" cy="${y(p.kg).toFixed(1)}" r="2.5" fill="var(--gold)"/>`).join("")}
  </svg>`;
}
function hWeightTrendPerWeek(days){
  const h = ensureHealthData();
  const from = hAddDays(todayKey(), -(days || 28));
  const pts = h.weightLog.filter(p => p.d >= from);
  if(pts.length < 3) return null;
  const xs = pts.map(p => hDaysBetween(pts[0].d, p.d)), ys = pts.map(p => p.kg);
  const n = xs.length, mx = xs.reduce((a, b) => a + b, 0) / n, my = ys.reduce((a, b) => a + b, 0) / n;
  const num = xs.reduce((s, xv, i) => s + (xv - mx) * (ys[i] - my), 0), den = xs.reduce((s, xv) => s + (xv - mx) ** 2, 0);
  if(!den) return null;
  return Math.round((num / den) * 7 * 100) / 100; // کیلوگرم در هفته
}
function renderHealthProgress(){
  const h = ensureHealthData();
  const p = h.profile;
  const first = h.weightLog[0], cur = p.currentWeight;
  const change = first ? Math.round((cur - first.kg) * 10) / 10 : 0;
  return `
    <div class="card" style="margin-bottom:12px;">
      <div style="font-weight:800; margin-bottom:6px;">⚖️ وزن</div>
      <div class="suggest-chips" style="margin-bottom:8px;">
        <div class="suggest-chip" style="pointer-events:none;">الان: ${toFaDigits(cur)} کیلو</div>
        ${p.targetWeight ? `<div class="suggest-chip" style="pointer-events:none;">هدف: ${toFaDigits(p.targetWeight)} کیلو</div>` : ``}
        ${first && change ? `<div class="suggest-chip" style="pointer-events:none;">تغییر از شروع: ${change > 0 ? "+" : ""}${toFaDigits(change)}</div>` : ``}
      </div>
      ${hWeightChart()}
      <div style="display:flex; gap:8px; margin-top:10px;">
        <input type="text" inputmode="decimal" class="goal-input" style="flex:1;" placeholder="وزن امروز (کیلوگرم)" value="${escapeHtml(hWeightInput)}" oninput="hWeightInput=this.value" onkeydown="if(event.key==='Enter')hSubmitWeight()">
        <button class="btn btn-primary" style="flex:none; padding:0 16px;" onclick="hSubmitWeight()">ثبت</button>
      </div>
      ${!p.targetWeight ? `<button class="btn btn-ghost" style="width:100%; padding:9px; margin-top:8px;" onclick="editHealthProfile()">🎯 تعیین وزن هدف</button>` : ``}
    </div>
    ${hBmiCard()}
    <div class="section-title">🎯 مسیر شخصی تا هدف</div>
    ${hIsPremium() ? renderHealthJourney() : hLocked("Personal Health Journey", "یه مسیر شخصی از وضعیت امروزت تا وزن هدف: سرعت سالم، زمان تقریبی رسیدن، نقاط عطف، مقایسه‌ی روند واقعی با مسیر، و پیشنهاد تنظیم هدف.")}
    <div class="section-title" style="margin-top:14px;">📊 هفته‌ی تو در پله</div>
    ${renderHealthWeekly()}
  `;
}
/* Personal Health Journey (Premium — بخش ۳۴) — محاسبه‌ی قطعی، بدون AI */
function renderHealthJourney(){
  const h = ensureHealthData();
  const p = h.profile;
  if(!p.targetWeight) return `<div class="card"><div class="note">اول وزن هدفت رو مشخص کن.</div><button class="btn btn-primary" style="width:100%; padding:11px; margin-top:8px;" onclick="editHealthProfile()">تعیین وزن هدف</button></div>`;
  const start = h.weightLog[0] ? h.weightLog[0].kg : p.currentWeight;
  const cur = p.currentWeight, target = p.targetWeight;
  const diffTotal = target - start, diffLeft = target - cur;
  const dir = Math.abs(diffLeft) < 0.3 ? "done" : diffLeft < 0 ? "lose" : "gain";
  const bmiTarget = target / Math.pow(p.height / 100, 2);
  if(dir === "done") return `<div class="card"><div style="font-weight:800;">🎉 به وزن هدفت رسیدی!</div><div class="note">حالا هدف، حفظ این وزن و ادامه‌ی عادت‌هاست. می‌خوای یه هدف تازه (مثل استقامت یا عضله‌سازی) بذاری؟</div></div>`;
  // سرعت سالم و محافظه‌کارانه: کاهش حدود ۰.۵٪ وزن در هفته (حداکثر ۰.۷۵ کیلو)، افزایش ۰.۲۵ کیلو
  const rate = dir === "lose" ? Math.min(0.75, Math.max(0.25, cur * 0.005)) : 0.25;
  const weeks = Math.ceil(Math.abs(diffLeft) / rate);
  const eta = hAddDays(todayKey(), weeks * 7);
  const progress = Math.abs(diffTotal) > 0.1 ? Math.max(0, Math.min(100, Math.round(((cur - start) / diffTotal) * 100))) : 0;
  const trend = hWeightTrendPerWeek(28);
  const step = Math.abs(diffLeft) > 8 ? 2 : 1;
  const milestones = [];
  for(let i = 1; i * step < Math.abs(diffLeft) && milestones.length < 4; i++) milestones.push(Math.round((cur + (dir === "lose" ? -1 : 1) * i * step) * 10) / 10);
  let status = "", adjust = "";
  if(trend === null) status = "برای مقایسه‌ی روند واقعی، هفته‌ای ۲-۳ بار وزنت رو ثبت کن.";
  else{
    const goodDir = dir === "lose" ? trend < 0 : trend > 0;
    const speed = Math.abs(trend);
    if(!goodDir || speed < 0.1){ status = `روند ۴ هفته‌ی اخیر: ${trend > 0 ? "+" : ""}${toFaDigits(trend)} کیلو در هفته — فعلاً تقریباً ثابت.`;
      adjust = "پیشنهاد: یه روز ورزش به هفته اضافه کن، یا برنامه‌ی غذایی‌ت رو یه بار مرور کن. ثابت موندن چند هفته‌ای کاملاً طبیعیه؛ بدنت داره عادت می‌کنه."; }
    else if(dir === "lose" && speed > cur * 0.01){ status = `روند: ${toFaDigits(trend)} کیلو در هفته — سریع‌تر از حد سالم.`;
      adjust = "کاهش خیلی سریع پایدار نیست و می‌تونه به سلامتت آسیب بزنه. کمی آروم‌تر برو و مطمئن شو به اندازه‌ی کافی می‌خوری؛ اگه ناخواسته‌ست، با پزشک مشورت کن."; }
    else { status = `روند: ${trend > 0 ? "+" : ""}${toFaDigits(trend)} کیلو در هفته — روی مسیری 👌`; adjust = "همین‌طور ادامه بده."; }
  }
  const lowTarget = bmiTarget < 18.5;
  return `<div class="card">
    <div class="row-between" style="margin-bottom:6px;"><div style="font-weight:800;">${toFaDigits(start)} ← ${toFaDigits(cur)} ← 🎯 ${toFaDigits(target)} کیلو</div><div class="note">${toFaDigits(progress)}٪</div></div>
    <div style="height:10px; background:var(--line); border-radius:6px; overflow:hidden; margin-bottom:8px;"><div style="height:100%; width:${progress}%; background:var(--gold);"></div></div>
    ${lowTarget ? `<div class="note" style="margin-bottom:8px;">⚕️ وزن هدفی که گذاشتی برای قدت پایین‌تر از محدوده‌ی سالمه. پیشنهاد می‌کنیم هدفت رو با پزشک یا متخصص تغذیه مرور کنی.</div>` : `
      <div class="note">با سرعت سالم (${dir === "lose" ? "کاهش" : "افزایش"} حدود ${toFaDigits(rate)} کیلو در هفته): حدوداً ${toFaDigits(weeks)} هفته — نزدیک ${hFaDate(eta)}</div>
      ${milestones.length ? `<div class="note" style="margin-top:6px;">نقاط عطف بعدی: ${milestones.map(m => toFaDigits(m)).join(" ← ")} کیلو</div>` : ``}`}
    <div class="note" style="margin-top:8px;">${escapeHtml(status)}</div>
    ${adjust ? `<div class="note" style="margin-top:4px; font-weight:800;">${escapeHtml(adjust)}</div>` : ``}
  </div>`;
}
/* گزارش هفتگی (بخش ۳۰) + Health Intelligence (بخش ۳۱) */
function hWeekStats(ws){
  const h = ensureHealthData();
  const we = hAddDays(ws, 6);
  const list = hEntriesBetween(ws, we);
  const minutes = list.reduce((s, e) => s + e.minutes, 0);
  const days = new Set(list.map(e => e.dk)).size;
  const bySport = {}; list.forEach(e => { bySport[e.sport] = (bySport[e.sport] || 0) + e.minutes; });
  const fav = Object.keys(bySport).sort((a, b) => bySport[b] - bySport[a])[0] || null;
  let planned = 0, done = 0;
  if(h.workoutPlan){ for(let i = 0; i < 7; i++){ const dk = hAddDays(ws, i); if(dk > todayKey()) break; const d = h.workoutPlan.days.find(x => x.day === hDayKeyOfDk(dk)); if(d && !d.rest){ planned++; if(h.planDone[dk]) done++; } } }
  let clean = 0; hActiveHabits().forEach(hb => { for(let i = 0; i < 7; i++){ if(hDaySuccess(hb, hAddDays(ws, i))) clean++; } });
  let choices = 0; for(let i = 0; i < 7; i++){ choices += (h.foodChoices[hAddDays(ws, i)] || []).length; }
  return { sessions: list.length, minutes, days, fav, bySport, planned, done, adherence: planned ? hPct(done, planned) : null, clean, choices, xp: hXpBetween(ws, we) };
}
function renderHealthWeekly(){
  const ws = hWeekStart(todayKey());
  const s = hWeekStats(ws), prev = hWeekStats(hAddDays(ws, -7));
  const prem = hIsPremium();
  const change = prev.minutes ? Math.round(((s.minutes - prev.minutes) / prev.minutes) * 100) : null;
  return `<div class="card" style="margin-bottom:12px;">
    <div class="suggest-chips">
      <div class="suggest-chip" style="pointer-events:none;">🏃 ${toFaDigits(s.sessions)} جلسه ورزش</div>
      <div class="suggest-chip" style="pointer-events:none;">⏱️ ${toFaDigits(s.minutes)} دقیقه فعالیت</div>
      <div class="suggest-chip" style="pointer-events:none;">📅 ${toFaDigits(s.days)} روز فعال</div>
      ${s.adherence !== null ? `<div class="suggest-chip" style="pointer-events:none;">✅ ${toFaDigits(s.adherence)}٪ پایبندی به برنامه</div>` : ``}
      ${s.fav ? `<div class="suggest-chip" style="pointer-events:none;">❤️ ورزش محبوب: ${healthSport(s.fav).label}</div>` : ``}
      ${s.clean ? `<div class="suggest-chip" style="pointer-events:none;">🌱 ${toFaDigits(s.clean)} روز موفق ترک عادت</div>` : ``}
      ${s.choices ? `<div class="suggest-chip" style="pointer-events:none;">🥗 ${toFaDigits(s.choices)} انتخاب هوشمند</div>` : ``}
      <div class="suggest-chip" style="pointer-events:none;">⭐ ${toFaDigits(s.xp)} امتیاز</div>
    </div>
    ${prem ? `
      ${change !== null ? `<div style="font-weight:800; margin-top:10px;">${change >= 0 ? `این هفته نسبت به هفته‌ی قبل ${toFaDigits(change)}٪ فعال‌تر بودی 📈` : `این هفته ${toFaDigits(Math.abs(change))}٪ کمتر از هفته‌ی قبل فعال بودی — هنوز چند روز فرصت داری.`}</div>` : ``}
      <div style="margin-top:10px;">${hInsights(s, prev).map(t => `<div class="note" style="margin-bottom:6px;">💡 ${escapeHtml(t)}</div>`).join("")}</div>
      ${renderHealthAiInsight(s, prev)}
    ` : `<div style="margin-top:10px;">${hLocked("Health Intelligence", "مقایسه با هفته‌های قبل، تشخیص الگوها و پیشنهاد قدم بعدی — مثلاً «روزهایی که فوتبال بازی می‌کنی، کل فعالیتت بیشتره».")}</div>`}
  </div>`;
}
function hInsights(s, prev){
  const h = ensureHealthData();
  const out = [];
  // روزهایی که ورزش محبوب انجام شده، در مقایسه با بقیه‌ی روزهای فعال ۲۸ روز اخیر
  const from = hAddDays(todayKey(), -27);
  const list = hEntriesBetween(from, todayKey());
  const byDay = {}; list.forEach(e => { (byDay[e.dk] = byDay[e.dk] || { mins: 0, sports: new Set() }); byDay[e.dk].mins += e.minutes; byDay[e.dk].sports.add(e.sport); });
  const fav = h.sports.likes.find(id => list.some(e => e.sport === id));
  if(fav){
    const withF = Object.values(byDay).filter(d => d.sports.has(fav)), without = Object.values(byDay).filter(d => !d.sports.has(fav));
    if(withF.length >= 2 && without.length >= 2){
      const a = withF.reduce((x, d) => x + d.mins, 0) / withF.length, b = without.reduce((x, d) => x + d.mins, 0) / without.length;
      if(a > b * 1.2) out.push(`به نظر می‌رسه روزهایی که ${healthSport(fav).label} داری، فعالیت کلی‌ت بیشتر می‌شه.`);
    }
  }
  const walkDays = [0,1,2,3,4,5,6].filter(i => hEntries(hAddDays(todayKey(), -i)).some(e => e.sport === "walking")).length;
  if(walkDays >= 4) out.push("پیاده‌روی داره برات یه عادت خوب می‌شه؛ می‌خوای هدفش رو کمی بیشتر کنی؟");
  if(prev.sessions && s.sessions > prev.sessions) out.push(`این هفته ${toFaDigits(s.sessions)} جلسه ورزش داشتی — بیشتر از هفته‌ی قبل.`);
  const trend = hWeightTrendPerWeek(28);
  if(trend !== null && h.profile.targetWeight){
    const goodDir = h.profile.targetWeight < h.profile.currentWeight ? trend < -0.05 : trend > 0.05;
    if(goodDir) out.push("روند وزنت تو ۴ هفته‌ی اخیر به سمت هدفته 👌");
  }
  if(s.adherence !== null && s.adherence < 50 && s.planned >= 2) out.push("این هفته پایبندی به برنامه کمتر بود — روزهای سخت رو با «امروز حوصله ندارم» و یه نسخه‌ی کوتاه نگه دار.");
  if(!out.length) out.push("هر چی بیشتر ثبت کنی، الگوهای دقیق‌تری برات پیدا می‌کنم.");
  return out.slice(0, 4);
}
function renderHealthAiInsight(s, prev){
  const h = ensureHealthData();
  const ws = hWeekStart(todayKey());
  const ai = h.aiInsight && h.aiInsight.weekKey === ws ? h.aiInsight : null;
  const busy = hAi.busy.insight, err = hAi.error.insight;
  return `<div style="margin-top:8px;">
    ${ai ? `${ai.insights.map(t => `<div class="note" style="margin-bottom:6px;">🤖 ${escapeHtml(t)}</div>`).join("")}${ai.nextAction ? `<div class="note" style="font-weight:800;">👉 قدم بعدی: ${escapeHtml(ai.nextAction)}</div>` : ``}` : ``}
    ${err ? `<div class="field-error">${escapeHtml(err)}</div>` : ``}
    <button class="btn btn-ghost" style="width:100%; padding:10px; margin-top:6px;" ${busy ? "disabled" : ""} onclick="hRunAiInsight()">${busy ? "در حال تحلیل..." : ai ? "🔄 تحلیل دوباره" : "🤖 تحلیل هوشمند این هفته"}</button>
  </div>`;
}
async function hRunAiInsight(){
  if(hAi.busy.insight) return;
  hAiStart("insight");
  const ws = hWeekStart(todayKey());
  const s = hWeekStats(ws), prev = hWeekStats(hAddDays(ws, -7));
  const lbl = st => ({ sessions: st.sessions, minutes: st.minutes, activeDays: st.days, favSport: st.fav ? healthSport(st.fav).label : "", adherence: st.adherence, cleanHabitDays: st.clean, smartChoices: st.choices });
  const res = await callHealthAI("weekly_insight", { thisWeek: lbl(s), lastWeek: lbl(prev), goal: hProfileForAI().mainGoal, goals: hProfileForAI().mainGoals, weightTrendPerWeek: hWeightTrendPerWeek(28), sports: hSportsForAI().likes });
  const r = res && res.result;
  if(!r || !Array.isArray(r.insights) || !r.insights.length){ hAiEnd("insight", (res && res.error) || "تحلیل آماده نشد — دوباره امتحان کن."); renderAll(); return; }
  ensureHealthData().aiInsight = { weekKey: ws, insights: r.insights.slice(0, 3).map(x => String(x).slice(0, 200)), nextAction: String(r.nextAction || "").slice(0, 160) };
  hAiEnd("insight");
  save(); renderAll();
}

/* ===================== فروشگاه جوایز (بخش‌های ۲۴ تا ۲۹) =====================
   آیتم‌ها از جدول reward_items (مدیریت با ادمین). خرید با تابع peleh_redeem_reward سمت سرور:
   موجودی امتیاز همون‌جا حساب و کم می‌شه، سقف هر کاربر و موجودی انبار همون‌جا چک می‌شه. */
async function hLoadRewards(){
  if(!sb || !currentUser || hRewardLoading) return;
  hRewardLoading = true; hRewardError = "";
  try{
    const { data, error } = await sb.from("reward_items").select("id,title,description,category,kind,cost_points,tags,partner,premium_only,stock,per_user_limit,sort").eq("active", true).order("sort", { ascending: true }).limit(60);
    if(error) throw error;
    hRewardItems = data || [];
    const r2 = await sb.from("reward_redemptions").select("id,item_title,kind,code,link_url,status,cost_points,created_at").order("created_at", { ascending: false }).limit(20);
    hMyRedemptions = r2.error ? [] : (r2.data || []);
    await hRefreshHealthPoints(true);
  }catch(e){
    hRewardItems = [];
    hRewardError = "فروشگاه جوایز هنوز راه‌اندازی نشده یا الان در دسترس نیست.";
  }
  hRewardLoading = false;
  if(currentTab === "health" && healthSubTab === "summary") renderAll();
}
// موجودی تأییدشده‌ی سرور. اول تغییرات محلی ذخیره می‌شن تا امتیازهای تازه هم حساب بشن.
let hPointsRefreshing = false;
async function hRefreshHealthPoints(silent){
  if(!sb || !currentUser || hPointsRefreshing) return;
  hPointsRefreshing = true;
  try{
    try{ await flushPendingSave(); }catch(e){}
    const r = await sb.rpc("peleh_my_health_points");
    if(!r.error && r.data && r.data.ok) hHealthPoints = r.data;
  }catch(e){}
  hPointsRefreshing = false;
  if(!silent && currentTab === "health" && healthSubTab === "summary") renderAll();
}
function hRewardTagsForUser(){
  const h = ensureHealthData();
  const tags = new Set(h.sports.likes);
  if(DATA.books && (DATA.books.library || []).length) tags.add("books");
  if(h.food.completed) tags.add("nutrition");
  if(hActiveHabits().length) tags.add("habit");
  return tags;
}
function renderHealthRewards(){
  const hp = hHealthPoints;
  const balance = hp ? hp.balance : 0;
  const ws = hWeekStart(todayKey());
  const prem = hIsPremium();
  let items = (hRewardItems || []).filter(it => prem || !it.premium_only);
  const tags = hRewardTagsForUser();
  items = items.map(it => ({ ...it, _match: (it.tags || []).filter(t => tags.has(t)).length })).sort((a, b) => b._match - a._match || (a.sort || 0) - (b.sort || 0));
  const catLabel = { digital: "دیجیتال", service: "خدمات", physical: "فیزیکی" };
  return `
    <div class="card" style="margin-bottom:12px;">
      <div class="row-between"><div><div style="font-weight:800;">💰 امتیاز سلامت قابل خرج</div><div class="note">از ورزش، تغذیه، ترک عادت و چالش‌ها</div></div>
        <div style="font-size:22px; font-weight:900; color:var(--gold);">${hp ? toFaDigits(balance) : "…"}</div></div>
      <div class="note" style="margin-top:6px;">این هفته: ${toFaDigits(hXpBetween(ws, hAddDays(ws, 6)))} امتیاز سلامت${hp && hp.spent ? ` · تا حالا ${toFaDigits(hp.spent)} امتیاز خرج کردی` : ""}</div>
      ${hp && hp.capped ? `<div class="note" style="margin-top:4px;">بخشی از امتیازهات به‌مرور آزاد می‌شه — امتیاز قابل خرج هر حساب روزانه سقف داره.</div>` : ``}
      <div class="note" style="margin-top:4px; opacity:.75;">امتیازهای فعالیت‌هایی که خودت تو بخش اصلی اپ تعریف می‌کنی، مثل قبل برای جایزه‌های شخصی خودتن و اینجا خرج نمی‌شن.</div>
    </div>
    ${hRewardLoading || hRewardItems === null ? `<div class="card"><div class="note">در حال بارگذاری جوایز...</div></div>` :
      hRewardError ? `<div class="card"><div class="note">${escapeHtml(hRewardError)}</div></div>` :
      items.length ? `<div class="card" style="margin-bottom:12px;">${items.map(it => `
        <div style="padding:10px 0; border-top:1px solid var(--line);">
          <div class="row-between"><div style="font-weight:800;">${it._match ? "⭐ " : ""}${escapeHtml(it.title)}</div><div style="font-weight:800; color:var(--gold); white-space:nowrap;">${toFaDigits(it.cost_points)} امتیاز</div></div>
          ${it.description ? `<div class="note">${escapeHtml(it.description)}</div>` : ``}
          <div class="note" style="opacity:.8;">${catLabel[it.category] || ""}${it.partner ? ` · ${escapeHtml(it.partner)}` : ""}${it.premium_only ? " · ویژه‌ی Premium" : ""}${typeof it.stock === "number" ? ` · ${toFaDigits(it.stock)} عدد باقی‌مونده` : ""}</div>
          <button class="btn ${hp && balance >= it.cost_points ? "btn-primary" : "btn-ghost"}" style="margin-top:6px; padding:7px 14px;" ${hp && balance >= it.cost_points ? "" : "disabled"} onclick="hRedeem('${it.id}')">${!hp ? "…" : balance >= it.cost_points ? "دریافت" : `${toFaDigits(it.cost_points - balance)} امتیاز سلامت دیگه لازمه`}</button>
        </div>`).join("")}</div>` :
      `<div class="card" style="margin-bottom:12px;"><div class="note">به‌زودی جوایز از برندها و کسب‌وکارهای ورزشی اینجا اضافه می‌شن. تا اون موقع، جایزه‌هایی که خودت برای خودت تعریف کردی تو بخش اصلی اپ منتظرتن. 🎁</div></div>`}
    ${(hMyRedemptions || []).length ? `<div class="section-title">جوایز من</div><div class="card">${hMyRedemptions.map(r => `
      <div style="padding:8px 0; border-top:1px solid var(--line);">
        <div style="font-weight:800;">${escapeHtml(r.item_title || "جایزه")}</div>
        ${r.code ? `<div class="note">کد: <b style="direction:ltr; display:inline-block; user-select:all;">${escapeHtml(r.code)}</b></div>` : ``}
        ${r.link_url ? `<div class="note"><a href="${escapeHtml(r.link_url)}" target="_blank" rel="noopener" style="color:var(--gold);">باز کردن</a></div>` : ``}
        <div class="note">${r.status === "pending" ? "⏳ در حال هماهنگی ارسال — پشتیبانی باهات در تماس می‌شه" : "✅ تحویل شد"}</div>
      </div>`).join("")}</div>` : ``}
  `;
}
async function hRedeem(itemId){
  const it = (hRewardItems || []).find(x => x.id === itemId); if(!it) return;
  if(!confirm(`«${it.title}» با ${toFaDigits(it.cost_points)} امتیاز سلامت دریافت بشه؟`)) return;
  try{
    await flushPendingSave();
    const { data, error } = await sb.rpc("peleh_redeem_reward", { p_item_id: itemId });
    if(error) throw error;
    if(!data || !data.ok){ alert((data && data.error) || "دریافت جایزه انجام نشد."); return; }
    await reloadProfileKeepingLocalEdits();
    hRewardItems = null; hLoadRewards();
    renderAll();
    alert(data.message || "🎁 جایزه‌ت ثبت شد!");
  }catch(e){
    alert("الان نشد — اینترنتت رو چک کن و دوباره امتحان کن.");
  }
}

/* ===================== Coach سلامت (Premium — بخش ۱۵) ===================== */
const HEALTH_QUICK_QUESTIONS = ["امروز چی بخورم؟", "امروز چه ورزشی انجام بدم؟", "امروز وقت باشگاه ندارم", "هوس پیتزا کردم", "امروز خیلی کم‌تحرک بودم", "وزنم این هفته تغییر نکرده"];
const HEALTH_CHAT_MAX_CHARS = 150;
function renderHealthCoach(){
  return hIsPremium() ? renderHealthChatBody() : hLocked("یه مربی شخصی سلامت", "پروفایل، هدف، ورزش‌ها و غذاهای مورد علاقه، فعالیت واقعی و عادت‌هات رو می‌شناسه — هر سوالی درباره‌ی ورزش، تغذیه یا عادت‌هات ازش بپرس.");
}
function renderHealthChatBody(){
  const h = ensureHealthData();
  const msgs = h.chatHistory || [];
  const remaining = HEALTH_CHAT_MAX_CHARS - (healthChatInput || "").length;
  return `
    <div class="card" style="display:flex; flex-direction:column; gap:10px; max-height:48vh; overflow-y:auto; margin-bottom:10px;">
      ${msgs.length ? msgs.map(m => `<div style="${m.role === "user" ? "margin-inline-start:auto; background:var(--surf-a);" : "margin-inline-end:auto; background:var(--gold-soft);"} max-width:85%; border-radius:14px; padding:10px 13px; font-size:calc(13px * var(--font-scale)); line-height:1.8; white-space:pre-wrap;">${escapeHtml(m.text)}</div>`).join("") : `<div class="note" style="text-align:center;">یه سوال آماده بزن یا خودت تایپ کن:</div>`}
      ${healthChatBusy ? `<div class="note" style="margin-inline-end:auto;">در حال فکر کردن...</div>` : ``}
    </div>
    ${!msgs.length ? `<div class="suggest-chips" style="margin-bottom:10px;">${HEALTH_QUICK_QUESTIONS.map((q, i) => hChip(q, false, `pickHealthQuickQuestion(${i})`)).join("")}</div>` : ``}
    ${healthChatError ? `<div class="field-error">${escapeHtml(healthChatError)}</div>` : ``}
    <div style="display:flex; gap:8px;">
      <input type="text" id="health_chat_input" class="goal-input" maxlength="${HEALTH_CHAT_MAX_CHARS}" placeholder="سوالت رو کوتاه بنویس..." style="flex:1;" value="${escapeHtml(healthChatInput)}" oninput="healthChatInput=this.value; updateHealthCharCounter();" ${healthChatBusy ? "disabled" : ""} onkeydown="if(event.key==='Enter'){sendHealthChatMessage();}">
      <button class="btn btn-primary" style="flex:none; padding:0 18px;" ${healthChatBusy ? "disabled" : ""} onclick="sendHealthChatMessage()">ارسال</button>
    </div>
    <div id="health_char_counter" class="note" style="text-align:left; margin-top:4px; font-size:calc(10.5px * var(--font-scale));">${toFaDigits(remaining)} کاراکتر باقی‌مونده</div>
  `;
}
function updateHealthCharCounter(){
  const el = document.getElementById("health_char_counter");
  if(el) el.textContent = `${toFaDigits(HEALTH_CHAT_MAX_CHARS - (healthChatInput || "").length)} کاراکتر باقی‌مونده`;
}
function pickHealthQuickQuestion(i){ healthChatInput = HEALTH_QUICK_QUESTIONS[i] || ""; sendHealthChatMessage(); }
/* خلاصه‌ی فشرده‌ی وضعیت کاربر برای Coach (بخش ۱۵: «اطلاعات کاربر + اهداف + علایق + فعالیت واقعی + سابقه») */
function buildHealthCoachContext(){
  const h = ensureHealthData();
  const s = hSportsForAI(), f = h.food.completed ? hFoodForAI() : null;
  const p = h.profile;
  const parts = [];
  parts.push(`سطح: ${(HEALTH_LEVELS.find(l => l.id === p.level) || {}).label || "نامشخص"}، ${p.daysPerWeek || "?"} روز در هفته، هر بار ${p.minutesPerSession || "?"} دقیقه، امکانات: ${hProfileForAI().equipment.join("، ") || "نامشخص"}`);
  if(s.likes.length) parts.push(`ورزش‌های مورد علاقه: ${s.likes.join("، ")}`);
  if(s.dislikes.length) parts.push(`ورزش‌هایی که دوست نداره: ${s.dislikes.join("، ")}`);
  if(f){ parts.push(`غذاهای مورد علاقه: ${f.likes.join("، ")}`); if(f.restrictions.length) parts.push(`محدودیت غذایی: ${f.restrictions.join("، ")}`); }
  parts.push(hRecentSummary(7));
  const plan = hTodayPlanDay();
  if(plan && !plan.rest) parts.push(`برنامه‌ی امروز: ${plan.items.map(i => `${i.title} ${i.minutes} دقیقه`).join("، ")}${h.planDone[todayKey()] ? " (انجام شده)" : ""}`);
  const habits = hActiveHabits();
  if(habits.length) parts.push(`در حال ترک/کاهش: ${habits.map(hb => `${hHabitAiLabel(hb)} (${hHabitStats(hb).total} روز موفق)`).join("؛ ")}`);
  const trend = hWeightTrendPerWeek(28);
  if(trend !== null) parts.push(`روند وزن ۴ هفته‌ی اخیر: ${trend} کیلو در هفته`);
  return parts.join("\n").slice(0, 1500);
}
async function sendHealthChatMessage(){
  const text = (document.getElementById("health_chat_input")?.value || healthChatInput || "").trim().slice(0, HEALTH_CHAT_MAX_CHARS);
  if(!text || healthChatBusy) return;
  const h = ensureHealthData();
  h.chatHistory = h.chatHistory || [];
  h.chatHistory.push({ role: "user", text, ts: Date.now() });
  if(h.chatHistory.length > 20) h.chatHistory = h.chatHistory.slice(-20);
  healthChatInput = "";
  healthChatBusy = true; healthChatError = "";
  save(); renderAll();
  const res = await callHealthAI("coach", {
    message: text, profile: h.profile, context: buildHealthCoachContext(),
    history: h.chatHistory.slice(-8).map(m => ({ role: m.role, text: m.text })),
  });
  healthChatBusy = false;
  if(res && res.error) healthChatError = res.error;
  else if(res && res.reply){
    h.chatHistory.push({ role: "coach", text: res.reply, ts: Date.now() });
    if(h.chatHistory.length > 20) h.chatHistory = h.chatHistory.slice(-20);
    save();
  }
  renderAll();
}
