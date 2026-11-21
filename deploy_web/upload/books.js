/* ===================== پله کتاب — Reading module ===================== */
/* This file is additive: it reads/writes DATA.books (a new key inside the same
   Supabase `data` JSON blob the rest of the app already saves), and reuses the
   host app's globals (DATA, save, saveImmediate, openOverlay, closeOverlay,
   todayKey, ring, ICONS, sb, switchTab, currentTab, celebration sounds). It must
   be loaded AFTER app.js. */

/* ---------- Static definitions ---------- */
const BOOK_GENRES = ["روان‌شناسی","توسعه فردی","کسب‌وکار","رمان","تاریخ","فلسفه","علمی","زندگی‌نامه","شعر و ادبیات","مذهبی","خودشناسی","سلامت","کودک و نوجوان"];
const BOOK_FORMATS = ["کاغذی","PDF / الکترونیکی","صوتی"];

const BOOK_LEVELS = [
  {level:1, title:"شروع‌کننده", min:0},
  {level:2, title:"خواننده", min:100},
  {level:3, title:"کتاب‌خوان", min:300},
  {level:4, title:"کتاب‌خوان حرفه‌ای", min:600},
  {level:5, title:"مطالعه‌گر", min:1000},
  {level:6, title:"مطالعه‌گر پیشرفته", min:1500},
  {level:7, title:"کتاب‌باز", min:2200},
  {level:8, title:"کتاب‌باز حرفه‌ای", min:3000},
  {level:9, title:"استاد در راه", min:4000},
  {level:10, title:"استاد مطالعه", min:5000},
];

const BOOK_BADGES = [
  {id:"first_book", title:"اولین کتاب", icon:"📘", test: b => b.finishedCount >= 1},
  {id:"first_week", title:"اولین هفته مطالعه", icon:"🗓️", test: b => b.distinctDays >= 7},
  {id:"streak_7", title:"۷ روز متوالی", icon:"🔥", test: b => b.streak.best >= 7},
  {id:"streak_30", title:"۳۰ روز متوالی", icon:"🔥", test: b => b.streak.best >= 30},
  {id:"books_5", title:"۵ کتاب", icon:"📚", test: b => b.finishedCount >= 5},
  {id:"books_10", title:"۱۰ کتاب", icon:"📚", test: b => b.finishedCount >= 10},
  {id:"hours_100", title:"۱۰۰ ساعت مطالعه", icon:"⏱️", test: b => b.totalMinutes >= 6000},
  {id:"first_summary", title:"اولین خلاصه", icon:"📝", test: b => b.verifications.length >= 1},
  {id:"first_challenge", title:"اولین چالش کامل‌شده", icon:"🏆", test: b => b.challenges.some(c=>c.done)},
  {id:"comeback", title:"بازگشت بعد از وقفه", icon:"🌱", test: b => b.hadComeback},
  // این دو تا هیچ‌وقت خودکار گرفته نمی‌شن (test همیشه false)؛ فقط از پنل ادمین، وقتی رتبه‌ی
  // واقعی ماه/سال یه نفر رو توی رتبه‌بندی چالش‌ها تأیید می‌کنی، دستی اعطا می‌شن.
  {id:"monthly_top3", title:"نفر سوم ماه", icon:"🥉", test: () => false},
  {id:"top10", title:"۱۰ نفر برتر ماه", icon:"🏅", test: () => false},
  {id:"yearly_top3", title:"نفر سوم سال", icon:"🥉", test: () => false},
  {id:"yearly_top10", title:"۱۰ نفر برتر سال", icon:"🏅", test: () => false},
];

/* `reward` is a one-time bonus paid on completion, on top of whatever points the person
   already earned along the way from ordinary reading/logging — scaled so a harder challenge
   pays out more than an easier one, and enough that finishing genuinely beats the risk of the
   daily-miss penalty (CHALLENGE_MISS_PENALTY below) and the leave penalty (CHALLENGE_LEAVE_PENALTY
   in books.js). Ranked hardest → easiest: c10books > c30day > cgenre > c3books. */
const CHALLENGE_TEMPLATES = [
  {id:"c3books", title:"چالش ۳ کتاب", desc:"در یک ماه ۳ کتاب تمام کن.", type:"books_in_days", targetBooks:3, days:30, reward:200},
  {id:"cgenre", title:"چالش ژانر", desc:"در این ماه یک کتاب روان‌شناسی، یک رمان و یک کتاب کسب‌وکار بخوان.", type:"genre_mix", genres:["روان‌شناسی","رمان","کسب‌وکار"], days:30, reward:250},
  {id:"c30day", title:"چالش ۳۰ روزه", desc:"۳۰ روز، روزی حداقل ۱۵ دقیقه مطالعه کن.", type:"daily_minutes", targetDays:30, dailyMinutes:15, reward:350},
  {id:"c10books", title:"چالش ۱۰ کتاب", desc:"در ۹۰ روز ۱۰ کتاب بخوان.", type:"books_in_days", targetBooks:10, days:90, reward:900},
];

const GIFT_RULES = [
  {id:"gift_10in90", title:"۱۰ کتاب در ۹۰ روز", reward:"یک کتاب صوتی هدیه از پله", test: b => b.finishedIn90 >= 10},
  {id:"gift_streak30", title:"۳۰ روز استریک", reward:"یک کتاب الکترونیکی رایگان", test: b => b.streak.best >= 30},
  {id:"gift_5000pts", title:"۵۰۰۰ امتیاز", reward:"یک ماه Premium", test: b => b.points >= 5000},
];

const FALLBACK_QUESTIONS = [
  "بزرگ‌ترین درسی که از این کتاب گرفتی چه بود؟ چرا همین برات مهم‌تر از بقیه بود؟",
  "اگه بخوای یکی از ایده‌های کتاب رو برای یه دوست توضیح بدی، چی می‌گی؟",
  "کدوم بخش کتاب با چیزی که قبلاً فکر می‌کردی فرق داشت؟",
];

const FALLBACK_RECOMMENDATIONS = {
  "روان‌شناسی": [{title:"اثر مرکب", authors:"دارن هاردی", reason:"شروع ساده و عملی برای ساختن عادت"}],
  "توسعه فردی": [{title:"عادت‌های اتمی", authors:"جیمز کلیر", reason:"مرجع اصلی ساخت عادت‌های پایدار"}],
  "کسب‌وکار": [{title:"شروع کوچک", authors:"اریک ریس", reason:"نگاه عملی به ساختن ایده‌ها"}],
  "کودک و نوجوان": [
    {title:"شازده کوچولو", authors:"آنتوان دو سنت‌اگزوپری", reason:"داستانی ساده و پرمعنا، مناسب همه‌ی سنین کودک و نوجوان"},
    {title:"قصه‌های خوب برای بچه‌های خوب", authors:"مهدی آذریزدی", reason:"بازنویسی روان و اخلاقی داستان‌های کهن فارسی"},
    {title:"ماتیلدا", authors:"رولد دال", reason:"داستانی سرگرم‌کننده و پرانرژی برای کودکان"},
  ],
};

/* ---------- Data model ---------- */
function blankBooksData(){
  return {
    onboarded: false,
    interests: [],
    dailyMinutes: 20,
    format: "کاغذی",
    monthlyGoal: 2,
    library: [],        // {id,title,authors,thumbnail,genre,status,pages,currentPage,addedAt,startedAt,finishedAt,engagementScore}
    log: [],             // {id,bookId,dateKey,minutes,pages,note,points,ts}
    points: 0,
    streak: {count:0, lastDate:null, best:0},
    level: 1,
    badges: [],
    awardsSeen: [],     // idهای جایزه‌ی لیدربورد که تبریکش به کاربر نشون داده شده
    challenges: [],       // {id,joinedAt,done,doneAt}
    gifts: [],             // {id,claimedAt}
    premium: false,
    premiumUntil: null,
    verifications: [],      // {bookId,title,summary,answers,mostImpactfulIdea,applyIdea,score,date}
    nextLibId: 1,
    nextLogId: 1,
    hadComeback: false,
    periodPoints: {monthKey:"", monthPoints:0, yearKey:"", yearPoints:0},
    lastPenaltyCheck: null,   // dateKey — guards the once-a-day missed-challenge-day penalty sweep
  };
}
/* Returns the SAME object reference every time (as long as DATA.books itself isn't replaced,
   e.g. by a full profile reload) — it only ever fills in missing fields in place, never
   replaces DATA.books/.streak/.periodPoints with a new object if they already exist.
   This matters a lot: point-awarding functions call this once, mutate the result, and along
   the way often call OTHER helpers (like level calculation) that also call this function.
   The previous version rebuilt fresh objects on every single call, which silently orphaned
   the first caller's reference the moment any nested call happened in between — so a
   mutation like `periodPoints.monthPoints += n` was writing to an object nothing would ever
   read again. That's the real reason month/year points were never actually persisting,
   even though total_points (a plain top-level number, unaffected by this) always worked. */
function ensureBooksData(){
  if(!DATA.books) DATA.books = blankBooksData();
  else{
    const blank = blankBooksData();
    Object.keys(blank).forEach(k=>{ if(DATA.books[k] === undefined) DATA.books[k] = blank[k]; });
  }
  if(!DATA.books.streak) DATA.books.streak = {count:0,lastDate:null,best:0};
  else{
    const d = {count:0,lastDate:null,best:0};
    Object.keys(d).forEach(k=>{ if(DATA.books.streak[k] === undefined) DATA.books.streak[k] = d[k]; });
  }
  if(!DATA.books.periodPoints) DATA.books.periodPoints = {monthKey:"", monthPoints:0, yearKey:"", yearPoints:0};
  else{
    const d = {monthKey:"", monthPoints:0, yearKey:"", yearPoints:0};
    Object.keys(d).forEach(k=>{ if(DATA.books.periodPoints[k] === undefined) DATA.books.periodPoints[k] = d[k]; });
  }
  return DATA.books;
}

/* ---------- Jalali month/year period keys (for monthly/yearly leaderboard resets) ---------- */
function jalaliMonthKey(dateObj = new Date()){
  const [jy, jm] = jalaliOf(dateObj);
  return `${jy}-${String(jm).padStart(2,"0")}`;
}
function jalaliYearKey(dateObj = new Date()){
  const [jy] = jalaliOf(dateObj);
  return String(jy);
}

/* ---------- Derived stats ---------- */
function booksStats(){
  const b = ensureBooksData();
  const finished = b.library.filter(x=>x.status==="finished");
  const days = new Set(b.log.map(l=>l.dateKey));
  const now = Date.now();
  const finishedIn90 = finished.filter(x => x.finishedAt && (now - new Date(x.finishedAt).getTime()) <= 90*86400000).length;
  const totalMinutes = b.log.reduce((s,l)=>s + (l.minutes||0), 0);
  return {
    finishedCount: finished.length,
    distinctDays: days.size,
    totalMinutes,
    finishedIn90,
    streak: b.streak,
    points: b.points,
    verifications: b.verifications,
    challenges: b.challenges,
    hadComeback: !!b.hadComeback,
  };
}
function currentBookLevel(){
  const pts = ensureBooksData().points;
  let lvl = BOOK_LEVELS[0];
  BOOK_LEVELS.forEach(l => { if(pts >= l.min) lvl = l; });
  return lvl;
}
function nextBookLevel(){
  const cur = currentBookLevel();
  return BOOK_LEVELS.find(l => l.level === cur.level+1) || null;
}
function currentReadingBook(){
  const b = ensureBooksData();
  return b.library.find(x=>x.status==="reading") || null;
}

/* Book-only engagement signal, used by the "📚 پیشنهاد امروز پله برای کتاب" coach card
   (renderCoachCard("books") in app.js). Deliberately separate from engagementSnapshot()
   in app.js — a user can be fully consistent with their daily routine while not reading
   at all, or the opposite, and each card should reflect only its own domain. */
function bookEngagementSnapshot(){
  const b = ensureBooksData();
  let bookDaysSinceActive = 0;
  if(b.onboarded && b.streak.lastDate){
    bookDaysSinceActive = Math.max(0, Math.round((new Date(todayKey()) - new Date(b.streak.lastDate)) / 86400000));
  } else if(b.onboarded){
    bookDaysSinceActive = 99; // onboarded but never logged anything
  }
  const now = new Date();
  const finishedThisMonth = b.library.filter(x=>{
    if(x.status!=="finished" || !x.finishedAt) return false;
    const d = new Date(x.finishedAt);
    return d.getMonth()===now.getMonth() && d.getFullYear()===now.getFullYear();
  }).length;
  return {
    bookDaysSinceActive,
    bookStreak: b.streak.count,
    bookBestStreak: b.streak.best,
    monthlyGoal: b.monthlyGoal,
    finishedThisMonth,
    hasCurrentBook: !!currentReadingBook(),
    onboarded: !!b.onboarded,
  };
}

/* ---------- Calendar integration ---------- */
// Feeds "started reading" / "finished reading" markers into the app's shared calendar
// (see eventsFor() in app.js), so book activity shows up alongside other events.
function bookEventsFor(dateKey){
  const b = ensureBooksData();
  const out = [];
  b.library.forEach(x=>{
    if(x.startedAt && todayKey(new Date(x.startedAt))===dateKey){
      out.push({id:"book_start_"+x.id, title:`شروع کتاب «${x.title}»`});
    }
    if(x.finishedAt && todayKey(new Date(x.finishedAt))===dateKey){
      out.push({id:"book_finish_"+x.id, title:`پایان کتاب «${x.title}» 🎉`});
    }
  });
  return out;
}

/* ---------- Streak / points / badges / challenges / gifts ---------- */
/* Rolls month_key/year_key forward to the current jalali period if they've gone stale,
   resetting that period's point counter to 0. Pulled out of addBookPoints so it can also
   run on its own — e.g. the moment someone starts a book with 0 points, they should still
   get a real, current-period row in the public leaderboard, not just people who already
   have points. Returns true if anything changed (caller decides whether to save/sync). */
function ensurePeriodKeysCurrent(){
  const b = ensureBooksData();
  const mk = jalaliMonthKey(), yk = jalaliYearKey();
  let changed = false;
  if(b.periodPoints.monthKey !== mk){ Object.assign(b.periodPoints, {monthKey: mk, monthPoints: 0}); changed = true; }
  if(b.periodPoints.yearKey !== yk){ Object.assign(b.periodPoints, {yearKey: yk, yearPoints: 0}); changed = true; }
  return changed;
}
function addBookPoints(n){
  const b = ensureBooksData();
  b.points = Math.max(0, b.points + n);
  b.level = currentBookLevel().level;
  ensurePeriodKeysCurrent();
  b.periodPoints.monthPoints = Math.max(0, b.periodPoints.monthPoints + n);
  b.periodPoints.yearPoints = Math.max(0, b.periodPoints.yearPoints + n);
  syncLeaderboard();   // جدول فقط از سرور؛ این فقط صف رویدادها رو می‌فرسته
}

/* ---------- Public leaderboard sync (Supabase table `leaderboard`) ----------
   Fire-and-forget upsert of {name, total/month/year points} — no personal data beyond
   the display name the user already chose during onboarding. Debounced like the main
   profile save so a burst of point changes doesn't spam the network.
   IMPORTANT: this only fires from addBookPoints — i.e. only on the *next* point change.
   If a sync attempt ever failed silently (RLS not set up yet, table didn't exist yet,
   network blip) before this feature was live, someone who then stopped earning new
   points would NEVER get a row in this table, ever again — exactly what caused the
   leaderboard to be completely empty even for active users. resyncLeaderboardIfNeeded()
   below is the fix: it re-attempts the sync once per app load if there's real local point
   data that should be there but might not be, the same self-healing pattern already used
   for challenge participants. */
let leaderboardSyncTimer = null;
function syncLeaderboard(){
  clearTimeout(leaderboardSyncTimer);
  leaderboardSyncTimer = setTimeout(performLeaderboardSync, 800);
}
/* ---------- امتیاز جدول نفرات برتر: فقط سمت سرور (migration 019 — ضدتقلب) ----------
   قبلاً اپ امتیاز ماه/سال رو مستقیم توی جدول leaderboard می‌نوشت. حالا اپ فقط «رویداد مطالعه» (دقیقه/صفحه/یادداشت/
   فصل/جریمه‌ی روز چالش) رو تو صف می‌ذاره و به RPC reading_log می‌فرسته؛ سرور با سقف‌ها (۶ ساعت در روز، ۳ دقیقه به
   ازای هر صفحه‌ی کتاب، …) امتیاز قابل‌شمارش رو حساب و جدول رو خودش به‌روز می‌کنه.
   • امتیاز شخصی (سطح، تم‌ها، استریک) مثل قبل روی خود اپ حساب می‌شه و هیچ‌وقت جریمه نمی‌شه.
   • صف آفلاین‌اوله: تا وقتی سرور تأیید نکرده نگه داشته می‌شه؛ client_id تکراری دوبار حساب نمی‌شه. */
function readingBookMeta(book){
  return book ? { id: String(book.id), title: book.title || "", pages: book.pages || null, genre: book.genre || "", status: book.status || "reading" } : null;
}
function readingClientId(){ return "e" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
function queueReadingEvent(kind, amount, book){
  const b = ensureBooksData();
  if(!Array.isArray(b.pendingEvents)) b.pendingEvents = [];
  b.pendingEvents.push({ client_id: readingClientId(), kind, amount, requested: amount, book: readingBookMeta(book), ts: new Date().toISOString() });
  if(b.pendingEvents.length > 500) b.pendingEvents = b.pendingEvents.slice(-500);
}
let readingFlushBusy = false;
async function flushReadingEvents(){
  if(!sb || !currentUser || readingFlushBusy) return false;
  const b = ensureBooksData();
  readingFlushBusy = true;
  try{
    // ۱) عضویت چالش‌ها (زمان عضویت رو سرور ثبت می‌کنه)
    for(const id of (b.pendingJoins || []).slice()){
      const r = await sb.rpc("reading_join_challenge", { p_id: id });
      if(r.error) return false;
      b.pendingJoins = b.pendingJoins.filter(x => x !== id);
    }
    // ۲) رویدادهای مطالعه، ۵۰تا ۵۰تا
    let res = null;
    while((b.pendingEvents || []).length){
      const batch = b.pendingEvents.slice(0, 50);
      res = await sb.rpc("reading_log", { p_events: batch });
      if(res.error) return false;
      const sent = new Set(batch.map(e => e.client_id));
      b.pendingEvents = b.pendingEvents.filter(e => !sent.has(e.client_id));
    }
    if(!res){ res = await sb.rpc("reading_status"); if(res.error) return false; }
    // ۳) جایزه‌ی چالش‌ها: سرور شرط رو با داده‌ی خودش چک می‌کنه
    for(const id of (b.pendingClaims || []).slice()){
      const r = await sb.rpc("reading_claim_challenge", { p_id: id });
      if(r.error) break;
      const d = r.data || {};
      if(d.claimed || d.already || ((b.claimAttempts = b.claimAttempts || {})[id] = (b.claimAttempts[id] || 0) + 1) >= 10){
        b.pendingClaims = b.pendingClaims.filter(x => x !== id);
      }
    }
    const st = Object.assign({}, res.data || {}); delete st.accepted;
    b.serverStatus = Object.assign(st, { at: Date.now() });
    save();
    noticeReadingPenalties();
    return true;
  }catch(e){ return false; }
  finally{ readingFlushBusy = false; }
}
/* کلید ضدتقلب (از پنل ادمین): سرور تو فلگ reading_integrity می‌گه روشنه یا نه.
   • روشن ← مسیر امن بالا (رویداد مطالعه + داوری سرور).
   • خاموش ← مثل نسخه‌های قبلی (و بازارِ قدیمی): اپ امتیاز ماه/سال خودش رو مستقیم تو جدول می‌نویسه.
   تا وضعیت سرور معلوم نشده چیزی فرستاده نمی‌شه (false برمی‌گرده و بعداً دوباره تلاش می‌شه). */
async function performLeaderboardSync(){
  if(!sb || !currentUser) return false;
  if(!CLIENT_FLAGS.loaded){ try{ await loadClientFlags(); }catch(e){} }
  if(!CLIENT_FLAGS.loaded) return false;
  if(CLIENT_FLAGS.reading_integrity === true) return flushReadingEvents();
  return legacyLeaderboardSync();
}
let legacyLbBusy = false;
async function legacyLeaderboardSync(){
  if(legacyLbBusy) return false;
  const b = ensureBooksData();
  legacyLbBusy = true;
  try{
    // عضویت چالش‌ها همچنان به سرور می‌ره (زمان عضویت سرور ثبت می‌کنه؛ بعد از روشن شدن ضدتقلب به کار می‌آد)
    if(!Array.isArray(b.pendingJoins)) b.pendingJoins = [];
    for(const id of b.pendingJoins.slice()){
      const r = await sb.rpc("reading_join_challenge", { p_id: id });
      if(r.error) break;
      b.pendingJoins = b.pendingJoins.filter(x => x !== id);
    }
    // رویداد و ادعای جایزه در حالت خاموش بی‌معنیه (امتیاز همون لحظه به‌صورت محلی اعمال شده)
    b.pendingEvents = []; b.pendingClaims = [];
    ensurePeriodKeysCurrent();
    const meta = (typeof currentProfileMeta === "function") ? currentProfileMeta() : { name: "" };
    const { error } = await sb.from("leaderboard").upsert({
      user_id: currentUser.id, display_name: String(meta.name || "کاربر پله").slice(0, 60),
      total_points: b.points, month_key: b.periodPoints.monthKey, month_points: b.periodPoints.monthPoints,
      year_key: b.periodPoints.yearKey, year_points: b.periodPoints.yearPoints, updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });
    if(error){ console.error("legacyLeaderboardSync failed:", error); return false; }
    save();
    return true;
  }catch(e){ return false; }
  finally{ legacyLbBusy = false; }
}
/* جریمه‌ی جدید (از سرور) ← یک‌بار با دلیل و راه اعتراض نشون داده می‌شه */
function noticeReadingPenalties(){
  const b = ensureBooksData();
  const list = ((b.serverStatus && b.serverStatus.penalties) || []).filter(p => p.status === "active");
  const seen = b.penaltiesSeen || (b.penaltiesSeen = []);
  const fresh = list.find(p => !seen.includes(p.id));
  if(!fresh) return;
  const ov = document.getElementById("overlay");
  if(ov && ov.classList.contains("show")) return;   // وسط کار دیگه‌ای نمی‌پره؛ دفعه‌ی بعد
  seen.push(fresh.id); save();
  showReadingPenaltySheet({ level: fresh.level, clawback: -fresh.clawback, penalty: -fresh.penalty, reason: fresh.reason }, fresh.book_title);
}
function readingPenaltyHtml(o, title){
  const lv = o.level === 1 ? "بار اول این ماه" : o.level === 2 ? "بار دوم این ماه" : `بار ${toFaDigits(o.level)} این ماه`;
  return `<div class="card" style="border-color:var(--danger);">
      <div style="font-weight:800; margin-bottom:6px; color:var(--danger);">${title ? `«${escapeHtml(title)}» — ` : ""}${lv}</div>
      <div class="note" style="margin-bottom:8px;">${escapeHtml(o.reason || "")}</div>
      ${o.clawback ? `<div class="row-between note"><span>امتیاز پس‌گرفته‌ی این کتاب</span><b>${toFaDigits(o.clawback)}−</b></div>` : ``}
      ${o.penalty ? `<div class="row-between note"><span>جریمه‌ی اضافه</span><b>${toFaDigits(o.penalty)}−</b></div>` : ``}
    </div>
    <div class="note" style="margin-bottom:12px;">این فقط امتیاز جدول نفرات برتره؛ سطح، تم‌ها و استریکت دست نخورده. شمارش تخلف‌ها اول هر ماه صفر می‌شه.</div>`;
}
function showReadingPenaltySheet(o, title){
  openOverlay(`<h3>امتیاز جدول کم شد</h3>${readingPenaltyHtml(o, title)}
    <div class="sheet-actions">
      <button class="btn btn-ghost" onclick="closeOverlay(); if(typeof openSupportChat==='function') openSupportChat();">اعتراض از طریق پشتیبانی</button>
      <button class="btn btn-primary" onclick="closeOverlay()">متوجه شدم</button>
    </div>`);
}
/* پایان کتاب: داوری فقط سمت سرور (Edge Function «book-verify»). اگه داور در دسترس نبود ← «در انتظار» و بعداً دوباره. */
async function verifyBookFinish(payload){
  if(!sb) return { status: "pending" };
  try{
    const { data, error } = await invokeEdge("book-verify", { body: payload });
    if(error || !data || !data.status) return { status: "pending" };
    return data;
  }catch(e){ return { status: "pending" }; }
}
let retryVerifyBusy = false;
async function retryPendingVerifications(){
  const b = ensureBooksData();
  if(retryVerifyBusy || !sb || !currentUser || !(b.pendingVerifications || []).length) return;
  retryVerifyBusy = true;
  try{
    await flushReadingEvents();
    for(const pv of b.pendingVerifications.slice()){
      const res = await verifyBookFinish(pv.payload);
      if(res.status !== "ok") break;
      b.pendingVerifications = b.pendingVerifications.filter(x => x !== pv);
      const book = b.library.find(x => String(x.id) === String(pv.bookId));
      if(book) book.engagementScore = res.score;
      const v = b.verifications.find(x => String(x.bookId) === String(pv.bookId) && x.score == null);
      if(v){ v.score = res.score; v.status = "ok"; }
      if(res.points) addBookPoints(res.points);
      save();
      if(res.offense) showReadingPenaltySheet(res.offense, pv.payload.book.title);
      else showToast(`داوری «${pv.payload.book.title}» انجام شد: ${toFaDigits(res.points)} امتیاز`);
    }
    flushReadingEvents();
  } finally { retryVerifyBusy = false; }
}

/* ---------- جایزه‌های خودکار لیدربورد (جدول leaderboard_awards) ----------
   سرور (pg_cron + migration 013) آخر هر ماه/سال شمسی برنده‌ها رو حساب می‌کنه و جایزه رو هم
   روی پروفایل می‌نویسه، هم تو leaderboard_awards ثبت می‌کنه. این‌جا دو کار می‌کنیم:
   ۱) «خودترمیمی»: اگه ذخیره‌ی همزمان این دستگاه، نشان یا Premiumِ تازه رو بازنویسی کرده باشه،
      از روی همین جدول دوباره اعمالش می‌کنیم (idempotent: Premium هیچ‌وقت کم نمی‌شه، نشان تکراری نمی‌شه).
   ۲) یه‌بار تبریک نشون می‌دیم. */
/* روند ۱ (طراحی نهایی): پیش‌بینی تاریخ تمام شدن کتاب از سرعت ۱۴ روز اخیر.
   فقط وقتی تعداد صفحه‌ی کتاب ثبت شده و حداقل ۳ روز ثبت صفحه در ۱۴ روز اخیر هست (با دقیقه تنها پیش‌بینی نمی‌کنیم). */
function bookFinishForecast(book){
  if(!book || !book.pages) return null;
  const b = ensureBooksData();
  const since = new Date(); since.setDate(since.getDate() - 13);
  const sinceK = todayKey(since);
  const days = new Set(); let pages = 0;
  (b.log || []).forEach(l => { if(l.bookId === book.id && (Number(l.pages) || 0) > 0 && (l.dateKey || "") >= sinceK){ pages += Number(l.pages); days.add(l.dateKey); } });
  if(days.size < 3 || pages <= 0) return null;
  const left = Math.max(0, book.pages - (book.currentPage || 0));
  if(!left) return null;
  const perDay = pages / 14;
  const d = Math.ceil(left / perDay);
  const at = new Date(); at.setDate(at.getDate() + d);
  return { days: d, at, perDay };
}
function bookFinishForecastHtml(book){
  const f = bookFinishForecast(book);
  if(!f) return ``;
  return `<div class="note book-forecast">${pi("target")} با این سرعت (روزی ${toFaDigits(Math.max(1, Math.round(f.perDay)))} صفحه) حدود ${escapeHtml(jalaliDateLabel(f.at))} تمومش می‌کنی</div>`;
}
// تصویر جلد از Google Books/AI: فقط https (نه javascript:/data:)
function safeImgUrl(u){ u = String(u || "").trim().replace(/^http:\/\//i, "https://"); return /^https:\/\/[^\s"'<>]+$/i.test(u) ? u : ""; }
let lastAwardsCheck = 0;
function awardPeriodLabel(a){
  try{
    if(a.scope === "year") return `سال ${toFaDigits(a.period_key)}`;
    const [jy, jm] = String(a.period_key).split("-").map(Number);
    return `${JALALI_MONTHS[jm - 1]} ${toFaDigits(jy)}`;
  }catch(e){ return a.period_key; }
}
function awardMessage(a){
  const when = awardPeriodLabel(a);
  const rankFa = toFaDigits(a.rank);
  if(a.prize === "book") return `${["🥇","🥈","🥉"][(a.rank||1)-1] || "🏆"} ${a.rank > 1 ? `نفر ${["","دوم","سوم"][a.rank-1] || rankFa}` : "نفر اول"} ${when} شدی! یه کتاب جایزه‌ت هست — از بخش «پشتیبانی» به ما پیام بده تا آدرست رو بگیریم و بفرستیمش.`;
  if(a.prize === "premium_days") return `${a.rank === 1 ? "🥇" : "🥈"} رتبه‌ی ${rankFa} ${when}! ${toFaDigits(a.days)} روز اشتراک Premium هدیه برات فعال شد.`;
  const def = BOOK_BADGES.find(x => x.id === a.badge_id);
  return `${def ? def.icon : "🏅"} رتبه‌ی ${rankFa} ${when}! نشان «${def ? def.title : "برتر"}» به نشان‌هات اضافه شد.`;
}
async function syncMyAwards(){
  if(!currentUser || !sb || !profileReady) return;
  if(Date.now() - lastAwardsCheck < 30 * 60000) return;
  lastAwardsCheck = Date.now();
  try{
    const { data, error } = await sb.from("leaderboard_awards")
      .select("id,scope,period_key,rank,prize,days,badge_id,premium_until")
      .eq("user_id", currentUser.id).order("id", {ascending:true});
    if(error || !Array.isArray(data)){ lastAwardsCheck = 0; return; }
    const b = ensureBooksData();
    if(!Array.isArray(b.awardsSeen)) b.awardsSeen = [];
    let changed = false;
    const fresh = [];
    data.forEach(a => {
      if(a.badge_id && !b.badges.includes(a.badge_id)){ b.badges.push(a.badge_id); changed = true; }
      if(a.premium_until){
        const until = new Date(a.premium_until);
        if(until.getTime() > Date.now() && (!b.premiumUntil || new Date(b.premiumUntil) < until)){
          b.premium = true; b.premiumUntil = until.toISOString(); changed = true;
        }
      }
      if(!b.awardsSeen.includes(a.id)) fresh.push(a);
    });
    if(fresh.length){
      const ov = document.getElementById("overlay");
      if(ov && ov.classList.contains("show")){ lastAwardsCheck = 0; if(changed) save(); return; } // فرم بازه — دفعه‌ی بعد
      fresh.forEach(a => b.awardsSeen.push(a.id));
      changed = true;
      openOverlay(`
        <h3>🎉 تبریک!</h3>
        ${fresh.map(a => `<div class="card" style="margin-bottom:10px;"><div class="note" style="font-size:calc(13.5px * var(--font-scale)); line-height:2;">${awardMessage(a)}</div></div>`).join("")}
        <div class="sheet-actions"><button class="btn btn-primary" onclick="closeOverlay()">ممنون 💛</button></div>
      `);
    }
    if(changed){ save(); renderAll(); }
  }catch(e){ lastAwardsCheck = 0; /* آفلاین یا جدول هنوز ساخته نشده — دفعه‌ی بعد */ }
}

let leaderboardResyncedThisSession = false;
/* Runs once per app session (not on every render — the upsert is harmless to repeat, but
   there's no reason to hit the network every time). Call this from anywhere in the books
   section that renders — it makes sure the public leaderboard eventually reflects reality
   even if the very first sync attempt ever made silently failed.
   Deliberately fires for ANY onboarded book user, not just ones who already have points —
   the goal is that everyone who's using the book section shows up in the ranking table
   right away, at 0 if that's genuinely where they are, not only once they've earned something. */
function resyncLeaderboardIfNeeded(){
  if(leaderboardResyncedThisSession) return;
  const b = ensureBooksData();
  if(!b.onboarded) return; // hasn't started using the book section at all yet — nothing to show
  leaderboardResyncedThisSession = true;
  if(ensurePeriodKeysCurrent()) save();
  performLeaderboardSync().then(ok=>{ if(!ok) leaderboardResyncedThisSession = false; else retryPendingVerifications(); });
}
function bumpStreak(dateObj){
  const b = ensureBooksData();
  const dk = todayKey(dateObj);
  if(b.streak.lastDate === dk) return; // already counted today
  const y = new Date(dateObj); y.setDate(y.getDate()-1);
  const yk = todayKey(y);
  const hadGap = b.streak.count === 0 && b.streak.best > 0;
  if(b.streak.lastDate === yk){
    b.streak.count += 1;
  } else {
    b.streak.count = 1;
  }
  if(hadGap) b.hadComeback = true;
  b.streak.lastDate = dk;
  b.streak.best = Math.max(b.streak.best, b.streak.count);
}
function checkBadgesAndGifts(){
  const b = ensureBooksData();
  const stats = booksStats();
  let newBadges = [], newGifts = [];
  BOOK_BADGES.forEach(def=>{
    if(!b.badges.includes(def.id) && def.test(stats)){
      b.badges.push(def.id);
      newBadges.push(def);
    }
  });
  GIFT_RULES.forEach(def=>{
    if(!b.gifts.find(g=>g.id===def.id) && def.test(stats)){
      b.gifts.push({id:def.id, claimedAt:null});
      newGifts.push(def);
    }
  });
  return {newBadges, newGifts};
}
function updateChallengeProgress(){
  const b = ensureBooksData();
  const now = Date.now();
  b.challenges.forEach(c=>{
    if(c.done) return;
    const tpl = CHALLENGE_TEMPLATES.find(t=>t.id===c.id);
    if(!tpl) return;
    const since = new Date(c.joinedAt).getTime();
    let justCompleted = false;
    if(tpl.type === "daily_minutes"){
      // مجموع دقیقه‌های هر روز (دو جلسه‌ی ۱۰ دقیقه‌ای = یه روز ۲۰ دقیقه‌ای) — قبلاً فقط یه جلسه‌ی تکی ≥ هدف حساب می‌شد
      if(challengeQualifyingDays(b, c, tpl).length >= tpl.targetDays){ c.done = true; c.doneAt = new Date().toISOString(); justCompleted = true; }
    } else if(tpl.type === "books_in_days"){
      const deadline = since + tpl.days*86400000;
      const count = b.library.filter(x=>x.status==="finished" && x.finishedAt && new Date(x.finishedAt).getTime()>=since && new Date(x.finishedAt).getTime()<=deadline).length;
      if(count >= tpl.targetBooks){ c.done = true; c.doneAt = new Date().toISOString(); justCompleted = true; }
    } else if(tpl.type === "genre_mix"){
      const deadline = since + tpl.days*86400000;
      const finishedGenres = new Set(b.library.filter(x=>x.status==="finished" && x.finishedAt && new Date(x.finishedAt).getTime()>=since && new Date(x.finishedAt).getTime()<=deadline).map(x=>x.genre));
      if(tpl.genres.every(g=>finishedGenres.has(g))){ c.done = true; c.doneAt = new Date().toISOString(); justCompleted = true; }
    }
    if(justCompleted && tpl.reward){
      addBookPoints(tpl.reward);   // پیشرفت شخصی
      // جدول: سرور شرط چالش رو با داده‌ی خودش دوباره چک می‌کنه
      b.pendingClaims = Array.from(new Set([...(b.pendingClaims || []), c.id]));
    }
    if(c.done && !c._syncedDone){
      syncChallengeParticipant(c.id, true).then(ok=>{ if(ok){ c._syncedDone = true; save(); } });
    }
  });
}
/* ---------- Missed-day penalty for "daily_minutes" challenges (e.g. c30day) ----------
   Runs at most once per calendar day. For every joined, not-yet-finished daily_minutes
   challenge, if *yesterday* had no qualifying log entry, we dock a small number of points
   and record the miss — this is what makes the challenge feel like a real streak commitment
   instead of a checkbox with no consequence. */
const CHALLENGE_MISS_PENALTY = 10;
function checkChallengePenalties(){
  const b = ensureBooksData();
  const todayDk = todayKey();
  if(b.lastPenaltyCheck === todayDk) return; // already swept today
  b.lastPenaltyCheck = todayDk;

  const y = new Date(); y.setDate(y.getDate()-1);
  const yesterdayDk = todayKey(y);
  let penalized = false;

  b.challenges.forEach(c=>{
    if(c.done) return;
    const tpl = CHALLENGE_TEMPLATES.find(t=>t.id===c.id);
    if(!tpl || tpl.type !== "daily_minutes") return;
    if(new Date(c.joinedAt).getTime() > y.getTime()) return; // wasn't joined yet on that day
    const metYesterday = challengeDayMinutes(b, yesterdayDk) >= tpl.dailyMinutes;
    if(!metYesterday){
      c.missedDays = (c.missedDays||0) + 1;
      addBookPoints(-CHALLENGE_MISS_PENALTY);
      queueReadingEvent("challenge_miss", -CHALLENGE_MISS_PENALTY, null);
      penalized = true;
    }
  });
  if(penalized) save();
}

/* ---------- Challenge participants (public, name-only list of who's in a challenge) ---------- */
async function syncChallengeParticipant(challengeId, done){
  if(!sb || !currentUser) return false;
  const meta = (typeof currentProfileMeta === "function") ? currentProfileMeta() : {name:""};
  try{
    const { error } = await sb.from('challenge_participants').upsert({
      challenge_id: challengeId, user_id: currentUser.id,
      display_name: meta.name || "کاربر پله", done: !!done,
    }, {onConflict:'challenge_id,user_id'});
    if(error){ console.error("syncChallengeParticipant failed:", error); return false; }
    return true;
  }catch(e){ console.error("syncChallengeParticipant failed:", e); return false; /* offline/transient — resyncAllJoinedChallenges retries next render */ }
}
/* Catches cases the join/finish hooks alone miss: (1) challenges the user joined *before*
   this feature existed, which were never pushed to the public table at all, (2) a challenge
   still in progress — join/finish only sync at the two endpoints, not the "currently doing
   it" state in between, and (3) any sync attempt that failed transiently (bad connection,
   table not created yet, etc.) — `_synced`/`_syncedDone` are only set to true AFTER a
   confirmed successful write, so a failed attempt keeps retrying on every future render
   instead of silently giving up forever. */
function resyncAllJoinedChallenges(){
  const b = ensureBooksData();
  b.challenges.forEach(c=>{
    if(!c._synced){
      syncChallengeParticipant(c.id, !!c.done).then(ok=>{ if(ok){ c._synced = true; save(); } });
    }
  });
}
let challengeParticipantsCache = {}; // challengeId -> [{display_name, done}]
async function loadChallengeParticipants(challengeId){
  if(!sb) return [];
  try{
    const { data, error } = await sb.from('challenge_participants').select('display_name,done').eq('challenge_id', challengeId).order('joined_at', {ascending:true}).limit(200);
    if(error){ console.error("loadChallengeParticipants failed:", error); return []; }
    challengeParticipantsCache[challengeId] = data || [];
    return data || [];
  }catch(e){ console.error("loadChallengeParticipants failed:", e); return []; }
}
function openChallengeParticipants(challengeId){
  openOverlay(`<h3>شرکت‌کننده‌ها</h3><div class="note" style="margin-bottom:10px;">در حال بارگذاری...</div>`);
  loadChallengeParticipants(challengeId).then(list=>{
    openOverlay(`
      <h3>شرکت‌کننده‌های این چالش</h3>
      ${list.length ? `<div class="card">${list.map(p=>`<div class="row-between" style="padding:7px 0; border-bottom:1px solid var(--surf-c);"><div>${escapeHtml(p.display_name)}</div><div class="note">${p.done?'✅ کامل شد':'در حال انجام'}</div></div>`).join("")}</div>` : `<div class="note">هنوز کسی جز خودت شرکت نکرده.</div>`}
      <div class="sheet-actions"><button class="btn btn-primary" style="width:100%;" onclick="closeOverlay()">باشه</button></div>
    `);
  });
}

function afterBookActivity(){
  updateChallengeProgress();
  const {newBadges, newGifts} = checkBadgesAndGifts();
  save();
  if(newBadges.length || newGifts.length){
    const msg = [
      ...newBadges.map(x=>`نشان جدید: ${x.icon} ${x.title}`),
      ...newGifts.map(x=>`هدیه جدید باز شد: ${x.title}`),
    ].join("\n");
    setTimeout(()=>alert(msg), 200);
  }
  if(typeof playCompleteChime === "function") playCompleteChime();
}

/* ---------- Reading log ---------- */
function logReading(minutes, pages, note){
  const b = ensureBooksData();
  const book = currentReadingBook();
  const now = new Date();
  let pts = 0;
  if(minutes) pts += minutes;      // 10 دقیقه = ۱۰ امتیاز
  if(pages) pts += pages;           // ۱۰ صفحه = ۱۰ امتیاز
  if(note) pts += 5;
  b.log.push({id:"log_"+(b.nextLogId++), bookId: book?book.id:null, dateKey: todayKey(now), minutes: minutes||0, pages: pages||0, note: note||"", points: pts, ts: now.toISOString()});
  if(book && pages){ book.currentPage = Math.min((book.pages||9999), (book.currentPage||0) + pages); }
  // جدول نفرات برتر: سرور با سقف‌هاش حساب می‌کنه (ثبت یکجا مثل «۳ تا +۲۰» بعد از یه ساعت مطالعه کامل حساب می‌شه)
  if(minutes) queueReadingEvent("minutes", minutes, book);
  if(pages) queueReadingEvent("pages", pages, book);
  if(note) queueReadingEvent("note", 5, book);
  addBookPoints(pts);
  bumpStreak(now);
  afterBookActivity();
  renderAll();
}
function logChapterDone(){
  const b = ensureBooksData();
  queueReadingEvent("chapter", 30, currentReadingBook());
  addBookPoints(30);
  bumpStreak(new Date());
  afterBookActivity();
  renderAll();
}

/* ---------- Library management ---------- */
function addBookToLibrary(book, status){
  const b = ensureBooksData();
  const id = "book_"+(b.nextLibId++);
  b.library.push({
    id, title: book.title, authors: book.authors||"", thumbnail: book.thumbnail||"",
    genre: book.genre || "", pages: book.pages||0, currentPage:0,
    status: status||"wishlist", addedAt: new Date().toISOString(),
    startedAt: status==="reading" ? new Date().toISOString() : null,
    finishedAt: null, engagementScore: null,
  });
  if(status==="reading"){
    ensurePeriodKeysCurrent();
    performLeaderboardSync(); // show up in the ranking table immediately, even at 0 points
  }
  save();
  renderAll();
  return id;
}
function startBook(id){
  const b = ensureBooksData();
  b.library.forEach(x=>{ if(x.status==="reading") x.status="wishlist"; }); // one active book at a time
  const book = b.library.find(x=>x.id===id);
  if(book){ book.status="reading"; book.startedAt = book.startedAt || new Date().toISOString(); }
  ensurePeriodKeysCurrent();
  save();
  // Not debounced on purpose: the person should show up in the ranking table immediately
  // when they start a book — even at 0 points — not just once they later earn some.
  performLeaderboardSync();
  renderAll();
}
function removeBook(id){
  if(!confirm("این کتاب از کتابخانه حذف بشه؟")) return;
  const b = ensureBooksData();
  b.library = b.library.filter(x=>x.id!==id);
  save();
  closeOverlay();
  renderAll();
}

/* ---------- Google Books search (public API, no key needed) ---------- */
async function searchGoogleBooks(query){
  // مهلت ۸ ثانیه: سرویس گوگل از ایران گاهی کند/مسدوده و قبلاً دکمه برای همیشه روی «در حال جست‌وجو» می‌موند
  const ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timer = ctrl ? setTimeout(() => ctrl.abort(), 8000) : null;
  try{
    const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=8`, ctrl ? { signal: ctrl.signal } : undefined);
    const json = await res.json();
    return (json.items||[]).map(it=>({
      title: it.volumeInfo.title||"",
      authors: (it.volumeInfo.authors||[]).join("، "),
      // گوگل آدرس جلد رو با http می‌ده؛ صفحه‌ی امن (https) و WebView اندروید تصویر http رو بلاک می‌کنن
      thumbnail: it.volumeInfo.imageLinks && it.volumeInfo.imageLinks.thumbnail ? String(it.volumeInfo.imageLinks.thumbnail).replace(/^http:\/\//i, "https://") : "",
      pages: it.volumeInfo.pageCount||0,
    }));
  }catch(e){ return []; }
  finally{ if(timer) clearTimeout(timer); }
}

/* ---------- AI backend (Supabase Edge Function `book-ai`) ---------- */
async function callBookAI(action, payload){
  if(!sb) return {error:"no-backend"};
  try{
    const { data, error } = await invokeEdge('book-ai', { body: { action, payload } });
    if(error) return {error: (data && data.error) || error.message || String(error)};
    return data;
  }catch(e){ return {error: e.message || String(e)}; }
}

let bookRecs = null, bookRecsLoading = false, bookRecsError = null;
async function loadBookRecommendations(){
  const b = ensureBooksData();
  bookRecsLoading = true; bookRecsError = null; renderAll();
  const finishedTitles = b.library.filter(x=>x.status==="finished").map(x=>x.title);
  const age = (typeof ageFromBirthdate === "function") ? ageFromBirthdate(profileMeta.birthdate) : null;
  const res = await callBookAI("recommend", {interests: b.interests, format: b.format, monthlyGoal: b.monthlyGoal, finishedTitles, age});
  bookRecsLoading = false;
  if(res && res.error){
    bookRecsError = res.error;
    // Same age-safety rule applies here as on the server: a detected minor never falls back
    // to whatever adult genre happens to be on file, even when we're offline/erroring.
    const isMinor = typeof age === "number" && age > 0 && age < 18;
    bookRecs = isMinor
      ? (FALLBACK_RECOMMENDATIONS["کودک و نوجوان"] || []).slice(0,5)
      : (b.interests.flatMap(g => FALLBACK_RECOMMENDATIONS[g] || [])).slice(0,5);
  } else {
    bookRecs = (res && res.books) || [];
  }
  renderAll();
}

/* ---------- Finish-book verification wizard ---------- */
let FW = null; // {bookId, step, summary, questions, answers, mostImpactfulIdea, applyIdea, pastedAny}
function loggedMinutesForBook(bookId){
  const b = ensureBooksData();
  return b.log.filter(l=>l.bookId===bookId).reduce((s,l)=> s + (l.minutes||0) + (l.pages||0), 0); // ~1 min/page heuristic
}
function openFinishWizard(bookId){
  const b = ensureBooksData();
  const book = b.library.find(x=>x.id===bookId);
  if(!book) return;
  const logged = loggedMinutesForBook(bookId);
  const threshold = book.pages ? Math.round(book.pages * 0.5) : 30; // soft minimum, allows fast/skim reading
  if(logged < threshold){
    const proceed = confirm(`تا الان فقط ${logged} دقیقه مطالعه برای این کتاب ثبت کردی؛ برای کتابی با این حجم، این رقم کمتر از حد معمول به نظر می‌رسه. مطمئنی می‌خوای الان تمومش کنی؟`);
    if(!proceed) return;
  }
  FW = {bookId, step:1, summary:"", questions:null, answers:["","",""], mostImpactfulIdea:"", applyIdea:"", pastedAny:false, typing:{typedChars:0, activeMs:0, last:0}};
  renderFinishWizard();
}
function fwOnPaste(){ if(FW) FW.pastedAny = true; }
/* سرعت تایپ واقعی: فقط درج‌های تک‌حرفی (کلید) شمرده می‌شن — تایپ صوتی و پیشنهاد کیبورد جزو «تایپ سریع» حساب نمی‌شن */
function fwOnInput(ev){
  if(!FW) return;
  const t = FW.typing || (FW.typing = { typedChars: 0, activeMs: 0, last: 0 });
  const now = Date.now();
  if(ev && ev.inputType && /^insert(Text|CompositionText)$/.test(ev.inputType) && ev.data && ev.data.length <= 2) t.typedChars += ev.data.length;
  if(t.last && now - t.last < 5000) t.activeMs += now - t.last;
  t.last = now;
}
function renderFinishWizard(){
  if(!FW) return;
  const book = ensureBooksData().library.find(x=>x.id===FW.bookId);
  if(FW.step===1){
    openOverlay(`
      <h3>راستی‌آزمایی پایان کتاب</h3>
      <div class="note" style="margin-bottom:12px;">در چند جمله بگو مهم‌ترین چیزی که از «${escapeHtml(book.title)}» یاد گرفتی چیست؟</div>
      <div class="field"><textarea id="fw_summary" rows="4" placeholder="خلاصه‌ی تو..." onpaste="fwOnPaste()" oninput="fwOnInput(event)">${FW.summary}</textarea></div>
      <div class="sheet-actions">
        <button class="btn btn-ghost" onclick="closeOverlay()">انصراف</button>
        <button class="btn btn-primary" onclick="fwNextFromSummary()">بعدی</button>
      </div>
    `);
  } else if(FW.step===2){
    if(!FW.questions){
      openOverlay(`<h3>راستی‌آزمایی</h3><div class="note">در حال آماده‌سازی سؤال‌ها...</div>`);
      callBookAI("questions", {title: book.title, authors: book.authors}).then(res=>{
        FW.questions = (res && res.questions && res.questions.length) ? res.questions.slice(0,3) : FALLBACK_QUESTIONS;
        renderFinishWizard();
      });
      return;
    }
    openOverlay(`
      <h3>چند سؤال مفهومی</h3>
      ${FW.questions.map((q,i)=>`
        <div class="field">
          <label>${escapeHtml(q)}</label>
          <textarea id="fw_q${i}" rows="2" onpaste="fwOnPaste()" oninput="fwOnInput(event)">${escapeHtml(FW.answers[i]||"")}</textarea>
        </div>
      `).join("")}
      <div class="sheet-actions">
        <button class="btn btn-ghost" onclick="FW.step=1; renderFinishWizard();">قبلی</button>
        <button class="btn btn-primary" onclick="fwNextFromQuestions()">بعدی</button>
      </div>
    `);
  } else if(FW.step===3){
    openOverlay(`
      <h3>برداشت شخصی</h3>
      <div class="field">
        <label>کدام ایده کتاب بیشتر روی تو تأثیر گذاشت؟</label>
        <textarea id="fw_idea" rows="3" onpaste="fwOnPaste()" oninput="fwOnInput(event)">${FW.mostImpactfulIdea}</textarea>
      </div>
      <div class="sheet-actions">
        <button class="btn btn-ghost" onclick="FW.step=2; renderFinishWizard();">قبلی</button>
        <button class="btn btn-primary" onclick="fwNextFromIdea()">بعدی</button>
      </div>
    `);
  } else if(FW.step===4){
    openOverlay(`
      <h3>کاربرد در زندگی</h3>
      <div class="field">
        <label>آیا می‌خوای یکی از ایده‌های این کتاب رو در زندگی‌ات اجرا کنی؟ اگه بله، کدام؟</label>
        <textarea id="fw_apply" rows="3" placeholder="مثلاً: هر روز صبح ۱۰ دقیقه مطالعه می‌کنم" onpaste="fwOnPaste()" oninput="fwOnInput(event)">${FW.applyIdea}</textarea>
      </div>
      <div class="sheet-actions">
        <button class="btn btn-ghost" onclick="FW.step=3; renderFinishWizard();">قبلی</button>
        <button class="btn btn-primary" onclick="fwSubmit()">ثبت و پایان کتاب</button>
      </div>
    `);
  } else if(FW.step===5){
    openOverlay(`<h3>در حال بررسی...</h3><div class="note">داریم پاسخ‌هات رو با محتوای کتاب مقایسه می‌کنیم.</div>`);
  } else if(FW.step===6){
    const scoreTxt = FW.pending
      ? `<div class="card" style="text-align:center; margin-bottom:14px;"><div class="note">داوری هوش مصنوعی الان در دسترس نیست. جواب‌هات ذخیره شد و به‌محض برقراری، داوری انجام و امتیازش اضافه می‌شه.</div></div>`
      : FW.offense ? readingPenaltyHtml(FW.offense, book && book.title)
      : `<div class="card" style="text-align:center; margin-bottom:14px;"><div class="note">امتیاز درگیری با کتاب</div><div style="font-size:var(--fs-36); font-weight:900;">${toFaDigits(FW.score)}٪</div><div class="note">+${toFaDigits(FW.earnedPoints || 0)} امتیاز</div>${FW.feedback ? `<div class="note" style="margin-top:8px;">${escapeHtml(FW.feedback)}</div>` : ``}</div>`;
    openOverlay(`
      <h3>${FW.offense ? "پایان کتاب ثبت شد" : "تبریک!"}</h3>
      ${scoreTxt}
      ${FW.applyIdea && !FW.offense ? `<div class="note" style="margin-bottom:14px;">می‌خوای «${escapeHtml(FW.applyIdea)}» رو به یه عادت روزانه‌ی قابل پیگیری تبدیل کنیم؟</div>` : ``}
      <div class="sheet-actions">
        ${FW.offense ? `<button class="btn btn-ghost" onclick="closeOverlay(); FW=null; if(typeof openSupportChat==='function') openSupportChat();">اعتراض از طریق پشتیبانی</button>
        <button class="btn btn-primary" onclick="closeOverlay(); FW=null; renderAll();">متوجه شدم</button>` :
        FW.applyIdea ? `<button class="btn btn-ghost" onclick="closeOverlay(); FW=null; renderAll();">فعلاً نه</button>
        <button class="btn btn-primary" onclick="fwConvertToHabit()">تبدیل به عادت</button>` :
        `<button class="btn btn-primary" onclick="closeOverlay(); FW=null; renderAll();">باشه</button>`}
      </div>
    `);
  }
}
function fwNextFromSummary(){
  FW.summary = document.getElementById("fw_summary").value.trim();
  FW.step = 2; renderFinishWizard();
}
function fwNextFromQuestions(){
  FW.answers = FW.questions.map((q,i)=> (document.getElementById("fw_q"+i)||{}).value || "");
  FW.step = 3; renderFinishWizard();
}
function fwNextFromIdea(){
  FW.mostImpactfulIdea = document.getElementById("fw_idea").value.trim();
  FW.step = 4; renderFinishWizard();
}
async function fwSubmit(){
  FW.applyIdea = document.getElementById("fw_apply").value.trim();
  FW.step = 5; renderFinishWizard();
  const b = ensureBooksData();
  const book = b.library.find(x=>x.id===FW.bookId);
  // داوری فقط سمت سرور: اپ نمره و امتیاز رو تعیین نمی‌کنه (قبلاً اگه داور جواب نمی‌داد ۱۰۰ کامل داده می‌شد)
  const payload = {
    book: { id: String(book.id), title: book.title || "", authors: book.authors || "", pages: book.pages || null, genre: book.genre || "" },
    summary: FW.summary, questions: FW.questions || [], answers: FW.answers,
    mostImpactfulIdea: FW.mostImpactfulIdea, applyIdea: FW.applyIdea, pastedAny: FW.pastedAny,
    typing: { typedChars: (FW.typing || {}).typedChars || 0, activeMs: (FW.typing || {}).activeMs || 0 },
  };
  await flushReadingEvents();   // دقیقه‌های همین کتاب قبل از داوری به سرور برسن
  const res = await verifyBookFinish(payload);
  const ok = res.status === "ok";
  FW.score = ok ? res.score : null;
  FW.pending = !ok;
  FW.offense = ok ? res.offense || null : null;
  FW.feedback = ok ? res.feedback || "" : "";

  book.status = "finished";
  book.finishedAt = new Date().toISOString();
  book.engagementScore = FW.score;
  b.verifications.push({bookId: book.id, title: book.title, summary: FW.summary, answers: FW.answers, mostImpactfulIdea: FW.mostImpactfulIdea, applyIdea: FW.applyIdea, score: FW.score, status: ok ? "ok" : "pending", date: new Date().toISOString()});
  if(!ok) b.pendingVerifications = [...(b.pendingVerifications || []), { bookId: book.id, payload, at: Date.now() }];
  const earnedPoints = ok ? Math.round(Math.max(0, Math.min(100, res.points || 0))) : 0;
  FW.earnedPoints = earnedPoints;
  if(earnedPoints) addBookPoints(earnedPoints);
  bumpStreak(new Date());
  save();
  afterBookActivity();
  FW.step = 6; renderFinishWizard();
}
function fwConvertToHabit(){
  const text = FW.applyIdea;
  if(text){
    const id = "custom_" + (DATA.nextActivitySeq++);
    DATA.activities.push({id, title: text, points: 15, days: ["daily"], icon:"📖", group:null});
    save();
  }
  closeOverlay();
  FW = null;
  alert("این هدف به فعالیت‌های روزانه‌ات (تب «امروز») اضافه شد.");
  renderAll();
}

/* ---------- Onboarding ---------- */
let obBooksTemp = null;
function renderBookOnboarding(){
  const b = ensureBooksData();
  if(!obBooksTemp){
    obBooksTemp = {interests: b.interests.slice(), dailyMinutes: b.dailyMinutes, format: b.format, monthlyGoal: b.monthlyGoal};
    const age = (typeof ageFromBirthdate === "function") ? ageFromBirthdate(profileMeta.birthdate) : null;
    if(typeof age === "number" && age > 0 && age < 18 && !obBooksTemp.interests.includes("کودک و نوجوان")){
      obBooksTemp.interests.push("کودک و نوجوان");
    }
  }
  document.getElementById("tabbar").innerHTML = "";
  document.getElementById("app").innerHTML = `
    <div class="onboard-wrap" style="padding:24px 18px;">
      <div class="row-between" style="margin-bottom:10px;">
        <button type="button" class="btn btn-ghost" style="flex:none; padding:8px 14px;" onclick="skipBookOnboarding()">‹ برگشت</button>
        <div></div>
      </div>
      <div class="brand" style="justify-content:center; margin-bottom:18px;"><span class="rungs"><i></i><i></i><i></i></span> پله کتاب</div>
      <div class="section-title">چه سبک کتاب‌هایی دوست داری؟</div>
      <div class="suggest-chips" style="margin-bottom:18px;">
        ${BOOK_GENRES.map(g=>`<button type="button" class="suggest-chip ${obBooksTemp.interests.includes(g)?'on':''}" onclick="obToggleGenre('${g}')">${g}</button>`).join("")}
      </div>
      <div class="field">
        <label>روزانه چقدر زمان برای مطالعه داری؟ (دقیقه)</label>
        <input type="text" inputmode="numeric" pattern="[0-9]*" id="ob_minutes" value="${obBooksTemp.dailyMinutes}">
      </div>
      <div class="field">
        <label>کتاب چاپی، PDF یا صوتی؟</label>
        <div class="suggest-chips">
          ${BOOK_FORMATS.map(f=>`<button type="button" class="suggest-chip ${obBooksTemp.format===f?'on':''}" onclick="obSetFormat('${f}')">${f}</button>`).join("")}
        </div>
      </div>
      <div class="field">
        <label>در ماه چند کتاب می‌خوای تمام کنی؟</label>
        <input type="text" inputmode="numeric" pattern="[0-9]*" id="ob_goal" value="${obBooksTemp.monthlyGoal}">
      </div>
      <button class="btn btn-primary" style="width:100%; padding:14px; margin-top:10px;" onclick="submitBookOnboarding()">شروع کن</button>
    </div>
  `;
}
function skipBookOnboarding(){
  obBooksTemp = null;
  currentTab = "today";
  renderAll();
}
function obToggleGenre(g){
  const i = obBooksTemp.interests.indexOf(g);
  if(i>=0) obBooksTemp.interests.splice(i,1); else obBooksTemp.interests.push(g);
  renderBookOnboarding();
}
function obSetFormat(f){ obBooksTemp.format = f; renderBookOnboarding(); }
function submitBookOnboarding(){
  const b = ensureBooksData();
  b.interests = obBooksTemp.interests;
  b.dailyMinutes = parseInt(numInput("ob_minutes")) || 20;
  b.format = obBooksTemp.format;
  b.monthlyGoal = parseInt(numInput("ob_goal")) || 2;
  b.onboarded = true;
  obBooksTemp = null;
  saveImmediate();
  renderAll();
}

/* ---------- Main render ---------- */
let booksSubTab = "home";
function renderBooks(){
  const b = ensureBooksData();
  checkChallengePenalties();
  resyncLeaderboardIfNeeded();
  const tabs = [
    {id:"home", label:"امروز"},
    {id:"library", label:"کتابخانه"},
    {id:"challenges", label:"چالش‌ها"},
    {id:"badges", label:"نشان‌ها"},
    {id:"gifts", label:"هدیه‌ها"},
  ];
  return `
    <div class="row-between" style="margin-top:2px; margin-bottom:2px;">
      <div class="section-title" style="margin:0;">پله کتاب</div>
      <button type="button" class="btn btn-ghost" style="flex:none; padding:8px 14px; font-size:calc(12px * var(--font-scale));" onclick="openBookPreferencesForm()">ویرایش سبک و ترجیحات</button>
    </div>
    <div class="suggest-chips" id="coach-books-subtabs" style="margin-bottom:14px;">
      ${tabs.map(t=>`<button type="button" class="suggest-chip ${booksSubTab===t.id?'on':''}" onclick="booksSubTab='${t.id}'; renderAll();">${t.label}</button>`).join("")}
    </div>
    ${
      booksSubTab==="home" ? renderBooksHome() :
      booksSubTab==="library" ? renderBooksLibrary() :
      booksSubTab==="challenges" ? renderBooksChallenges() :
      booksSubTab==="badges" ? renderBooksBadges() :
      renderBooksGifts()
    }
  `;
}

let bpTemp = null;
function openBookPreferencesForm(){
  const b = ensureBooksData();
  bpTemp = {interests: b.interests.slice(), dailyMinutes: b.dailyMinutes, format: b.format, monthlyGoal: b.monthlyGoal};
  renderBookPreferencesForm();
}
function renderBookPreferencesForm(){
  openOverlay(`
    <h3>سبک و ترجیحات مطالعه</h3>
    <div class="field">
      <label>چه سبک کتاب‌هایی دوست داری؟</label>
      <div class="suggest-chips">
        ${BOOK_GENRES.map(g=>`<button type="button" class="suggest-chip ${bpTemp.interests.includes(g)?'on':''}" onclick="bpToggleGenre('${g}')">${g}</button>`).join("")}
      </div>
    </div>
    <div class="field">
      <label>روزانه چقدر زمان برای مطالعه داری؟ (دقیقه)</label>
      <input type="text" inputmode="numeric" pattern="[0-9]*" id="bp_minutes" value="${bpTemp.dailyMinutes}">
    </div>
    <div class="field">
      <label>کتاب چاپی، PDF یا صوتی؟</label>
      <div class="suggest-chips">
        ${BOOK_FORMATS.map(f=>`<button type="button" class="suggest-chip ${bpTemp.format===f?'on':''}" onclick="bpSetFormat('${f}')">${f}</button>`).join("")}
      </div>
    </div>
    <div class="field">
      <label>در ماه چند کتاب می‌خوای تمام کنی؟</label>
      <input type="text" inputmode="numeric" pattern="[0-9]*" id="bp_goal" value="${bpTemp.monthlyGoal}">
    </div>
    <div class="sheet-actions">
      <button class="btn btn-ghost" onclick="closeOverlay(); bpTemp=null;">انصراف</button>
      <button class="btn btn-primary" onclick="saveBookPreferences()">ذخیره</button>
    </div>
  `);
}
function bpToggleGenre(g){
  const i = bpTemp.interests.indexOf(g);
  if(i>=0) bpTemp.interests.splice(i,1); else bpTemp.interests.push(g);
  renderBookPreferencesForm();
}
function bpSetFormat(f){ bpTemp.format = f; renderBookPreferencesForm(); }
function saveBookPreferences(){
  const b = ensureBooksData();
  b.interests = bpTemp.interests;
  b.dailyMinutes = parseInt(numInput("bp_minutes")) || b.dailyMinutes;
  b.format = bpTemp.format;
  b.monthlyGoal = parseInt(numInput("bp_goal")) || b.monthlyGoal;
  bpTemp = null;
  bookRecs = null; // preferences changed — let recommendations refresh
  save();
  closeOverlay();
  renderAll();
}


function renderBooksHome(){
  const b = ensureBooksData();
  const book = currentReadingBook();
  const lvl = currentBookLevel();
  const nlvl = nextBookLevel();
  const finishedThisMonth = b.library.filter(x=>{
    if(x.status!=="finished" || !x.finishedAt) return false;
    const d = new Date(x.finishedAt), now = new Date();
    return d.getMonth()===now.getMonth() && d.getFullYear()===now.getFullYear();
  }).length;

  return `
    <div class="books-grid">
    <div class="tile tile-coach" data-tile-id="coach">
    ${typeof renderCoachCard === "function" ? renderCoachCard("books") : ``}
    </div>

    <div class="tile tile-level" data-tile-id="level">
    <div class="card" style="text-align:center;">
      ${ring(b.points, nlvl ? nlvl.min : b.points, 140, "امتیاز")}
      <div style="font-weight:800; margin-top:6px;">سطح ${lvl.level} — ${lvl.title}</div>
      ${nlvl ? `<div class="note" style="margin-top:4px;">${nlvl.min - b.points} امتیاز تا سطح بعد</div>` : ``}
    </div>
    <div class="card">
      <div class="row-between">
        <div style="font-size:calc(13px*var(--font-scale)); color:var(--muted);">استریک مطالعه</div>
        <div style="font-weight:800;">🔥 ${b.streak.count} روز</div>
      </div>
      <div class="row-between" style="margin-top:6px;">
        <div style="font-size:calc(11.5px*var(--font-scale)); color:var(--muted);">رکورد قبلی: ${b.streak.best} روز</div>
        <div style="font-size:calc(11.5px*var(--font-scale)); color:var(--muted);">هدف ماهانه: ${finishedThisMonth} از ${b.monthlyGoal} کتاب</div>
      </div>
    </div>
    </div>

    <div class="tile tile-current" data-tile-id="current">
    ${book ? `
    <div class="card">
      <div class="row-between">
        <div>
          <div style="font-weight:800;">${escapeHtml(book.title)}</div>
          <div class="note">${escapeHtml(book.authors||"")}</div>
          ${book.pages ? `<div class="note">صفحه ${toFaDigits(book.currentPage||0)} از ${toFaDigits(book.pages)}</div>` : ``}
          ${bookFinishForecastHtml(book)}
        </div>
        ${safeImgUrl(book.thumbnail) ? `<img src="${escapeHtml(safeImgUrl(book.thumbnail))}" alt="" style="width:52px; border-radius:8px;">` : ``}
      </div>
      <div class="suggest-chips" style="margin-top:12px;">
        <button type="button" class="suggest-chip" onclick="logReading(10,0,null)">+۱۰ دقیقه</button>
        <button type="button" class="suggest-chip" onclick="logReading(20,0,null)">+۲۰ دقیقه</button>
        <button type="button" class="suggest-chip" onclick="openLogPagesForm()">ثبت صفحه</button>
        <button type="button" class="suggest-chip" onclick="openNoteForm()">یادداشت +۵</button>
        <button type="button" class="suggest-chip" onclick="logChapterDone()">پایان فصل +۳۰</button>
        <button type="button" class="suggest-chip" onclick="openBookDetail('${escapeHtml(String(book.id).replace(/[^A-Za-z0-9_-]/g, ""))}')">یادداشت‌ها${b.log.some(l=>l.bookId===book.id && l.note) ? ` (${b.log.filter(l=>l.bookId===book.id && l.note).length})` : ``}</button>
      </div>
      <button class="btn btn-primary" style="width:100%; margin-top:12px; padding:12px;" onclick="openFinishWizard('${book.id}')">کتاب را تمام کردم</button>
    </div>
    ` : `
    <div class="card" style="text-align:center;">
      <div class="note" style="margin-bottom:10px;">الان کتابی در حال خواندن نداری.</div>
      <button class="btn btn-primary" onclick="booksSubTab='library'; renderAll();">انتخاب کتاب از کتابخانه</button>
    </div>
    `}
    </div>

    <div class="tile tile-recs" data-tile-id="recs">
    <div class="section-title">پیشنهاد کتاب برای تو</div>
    <div class="card">
      ${bookRecsLoading ? `<div class="note">در حال آماده‌سازی پیشنهادها...</div>` :
        (!bookRecs) ? `<button class="btn btn-primary" style="width:100%;" onclick="loadBookRecommendations()">دریافت پیشنهاد هوشمند</button>` :
        (bookRecs.length===0 ? `<div class="note">فعلاً پیشنهادی نداریم — چند کتاب اول رو خودت اضافه کن.</div>` :
        bookRecs.map(r=>`
          <div class="row-between" style="padding:8px 0; border-bottom:1px solid var(--surf-c);">
            <div>
              <div style="font-weight:700;">${escapeHtml(r.title)}</div>
              <div class="note">${escapeHtml(r.authors||"")}</div>
              ${r.reason ? `<div class="note">${escapeHtml(r.reason)}</div>` : ``}
            </div>
            <button class="btn btn-ghost" style="flex:none; padding:8px 12px;" onclick="addBookToLibrary(${JSON.stringify(r).replace(/"/g,'&quot;')}, 'wishlist')">افزودن</button>
          </div>
        `).join(""))
      }
      ${bookRecsError ? `<div class="note" style="margin-top:8px;">(پیشنهاد هوشمند فعلاً در دسترس نیست — این‌ها پیشنهادهای پایه‌ان.)</div>` : ``}
    </div>
    </div>
    </div>
  `;
}

function renderBooksLibrary(){
  const b = ensureBooksData();
  const groups = [
    {key:"reading", label:"در حال خواندن"},
    {key:"wishlist", label:"لیست خواندن"},
    {key:"finished", label:"تمام‌شده"},
  ];
  return `
    <button class="btn btn-primary" style="width:100%; padding:12px; margin-bottom:14px;" onclick="openAddBookForm()">+ افزودن کتاب</button>
    ${groups.map(g=>{
      const items = b.library.filter(x=>x.status===g.key);
      if(!items.length) return "";
      return `
        <div class="section-title">${g.label}</div>
        <div class="card" style="margin-bottom:14px;">
          ${items.map(x=>`
            <div class="row-between" style="padding:8px 0; border-bottom:1px solid var(--surf-c); cursor:pointer;" onclick="openBookDetail('${x.id}')">
              <div>
                <div style="font-weight:700;">${escapeHtml(x.title)}</div>
                <div class="note">${escapeHtml(x.authors||"")}${x.genre?" · "+escapeHtml(x.genre):""}</div>
                ${x.status==="finished" && x.engagementScore!=null ? `<div class="note">امتیاز درگیری: ٪${x.engagementScore}</div>` : ``}
              </div>
              ${safeImgUrl(x.thumbnail) ? `<img src="${escapeHtml(safeImgUrl(x.thumbnail))}" alt="" style="width:40px; border-radius:6px;">` : ``}
            </div>
          `).join("")}
        </div>
      `;
    }).join("") || `<div class="note">هنوز کتابی اضافه نکردی.</div>`}
  `;
}
function openBookDetail(id){
  const b = ensureBooksData();
  const x = b.library.find(i=>i.id===id);
  if(!x) return;
  // یادداشت‌هایی که هنگام مطالعه‌ی این کتاب (دکمه‌ی «یادداشت +۵») ثبت شدن، قبلاً هیچ‌جا
  // نشون داده نمی‌شدن — فقط تو b.log ذخیره می‌شدن و گم می‌شدن. الان همینجا لیست می‌شن.
  const notes = b.log.filter(l=>l.bookId===id && l.note && l.note.trim()).sort((a,c)=>new Date(c.ts)-new Date(a.ts));
  openOverlay(`
    <h3>${escapeHtml(x.title)}</h3>
    <div class="note" style="margin-bottom:14px;">${escapeHtml(x.authors||"")}${x.genre?" · "+escapeHtml(x.genre):""}</div>
    ${bookFinishForecastHtml(x)}
    ${notes.length ? `
    <div class="field">
      <label>یادداشت‌های این کتاب</label>
      <div class="card" style="padding:10px 14px; max-height:220px; overflow-y:auto;">
        ${notes.map(n=>`
          <div style="padding:8px 0; border-bottom:1px solid var(--surf-c);">
            <div style="font-size:calc(12.5px * var(--font-scale));">${escapeHtml(n.note)}</div>
            <div class="note" style="margin-top:2px;">${jalaliDateLabel(new Date(n.ts))}</div>
          </div>
        `).join("")}
      </div>
    </div>
    ` : ``}
    <div class="sheet-actions">
      ${x.status!=="reading" && x.status!=="finished" ? `<button class="btn btn-primary" onclick="startBook('${id}'); closeOverlay();">شروع خواندن</button>` : ``}
      ${x.status==="reading" ? `<button class="btn btn-primary" onclick="closeOverlay(); openFinishWizard('${id}');">تمام کردم</button>` : ``}
      <button class="btn btn-danger" onclick="removeBook('${id}')">حذف</button>
      <button class="btn btn-ghost" onclick="closeOverlay()">بازگشت</button>
    </div>
  `);
}
function openAddBookForm(){
  openOverlay(`
    <h3>افزودن کتاب</h3>
    <div class="note" style="margin-bottom:14px;">کتاب رو از هر جا که می‌خوای تهیه کنی (فیدیبو، طاقچه، چاپی...)، اینجا فقط برای پیگیری عادت مطالعه ثبتش می‌کنیم.</div>
    <div class="field"><label>عنوان کتاب</label><input type="text" id="ab_title" placeholder="مثلاً: عادت‌های اتمی"></div>
    <div class="field"><label>نویسنده (اختیاری)</label><input type="text" id="ab_author" placeholder="نویسنده"></div>
    <div class="field"><label>تعداد صفحه تقریبی (اختیاری)</label><input type="text" inputmode="numeric" pattern="[0-9]*" id="ab_pages" placeholder="مثلاً ۲۵۰"></div>
    <button class="btn btn-ghost" style="width:100%; margin-bottom:10px;" id="ab_cover_btn" onclick="tryFindCover()">تلاش برای پیدا کردن جلد (اختیاری)</button>
    <div id="ab_cover_preview"></div>
    <div class="sheet-actions">
      <button class="btn btn-ghost" onclick="closeOverlay()">انصراف</button>
      <button class="btn btn-primary" onclick="addManualBook()">افزودن به کتابخانه</button>
    </div>
  `);
}
let ab_cover = null;
async function tryFindCover(){
  const title = document.getElementById("ab_title").value.trim();
  if(!title) return;
  document.getElementById("ab_cover_btn").textContent = "در حال جست‌وجو...";
  const results = await searchGoogleBooks(title);
  document.getElementById("ab_cover_btn").textContent = "تلاش برای پیدا کردن جلد (اختیاری)";
  const withCover = results.find(r=>r.thumbnail);
  if(withCover){
    ab_cover = withCover.thumbnail;
    document.getElementById("ab_cover_preview").innerHTML = `<img src="${escapeHtml(withCover.thumbnail)}" style="width:56px; border-radius:8px; margin-bottom:10px;">`;
  } else {
    document.getElementById("ab_cover_preview").innerHTML = `<div class="note" style="margin-bottom:10px;">جلدی پیدا نشد — مشکلی نیست، بدون جلد هم اضافه میشه.</div>`;
  }
}
function addManualBook(){
  const title = document.getElementById("ab_title").value.trim();
  const authors = document.getElementById("ab_author").value.trim();
  const pages = parseInt(numInput("ab_pages")) || 0;
  if(!title){ alert("عنوان رو وارد کن."); return; }
  addBookToLibrary({title, authors, pages, thumbnail: ab_cover||""}, "wishlist");
  ab_cover = null;
  closeOverlay();
}
function openLogPagesForm(){
  openOverlay(`
    <h3>ثبت صفحه</h3>
    <div class="field"><label>چند صفحه خوندی؟</label><input type="text" inputmode="numeric" pattern="[0-9]*" id="lp_pages" value="10"></div>
    <div class="sheet-actions">
      <button class="btn btn-ghost" onclick="closeOverlay()">انصراف</button>
      <button class="btn btn-primary" onclick="submitLogPages()">ثبت</button>
    </div>
  `);
}
function submitLogPages(){
  const pages = parseInt(numInput("lp_pages"))||0;
  closeOverlay();
  if(pages>0) logReading(0, pages, null);
}
function openNoteForm(){
  openOverlay(`
    <h3>یادداشت مطالعه</h3>
    <div class="field"><textarea id="nt_text" rows="4" placeholder="چی نوشتی یا برداشت کردی؟"></textarea></div>
    <div class="sheet-actions">
      <button class="btn btn-ghost" onclick="closeOverlay()">انصراف</button>
      <button class="btn btn-primary" onclick="submitNote()">ثبت</button>
    </div>
  `);
}
function submitNote(){
  const text = document.getElementById("nt_text").value.trim();
  closeOverlay();
  if(text) logReading(0,0,text);
}

function renderBooksChallenges(){
  const b = ensureBooksData();
  resyncAllJoinedChallenges();
  syncLeaderboard(); // cheap, debounced — makes sure this device's current totals are reflected even if nothing changed this session
  return `
    <button type="button" class="btn btn-primary" style="width:100%; margin-bottom:14px; display:flex; align-items:center; justify-content:center; gap:6px;" onclick="openLeaderboard()">🏆 نفرات برتر</button>
    ${renderSponsorCard(true)}
    ${(typeof renderTipBanner === "function") ? renderTipBanner('challenge_rewards', 'هر چالش یه پاداش امتیاز داره که هرچی چالش سخت‌تره، بیشتره — و اگه یه روز رو از دست بدی یا از چالش خارج بشی، امتیاز کم می‌شه.') : ``}
    ${CHALLENGE_TEMPLATES.map(tpl=>{
      const joined = b.challenges.find(c=>c.id===tpl.id);
      const missedNote = (joined && !joined.done && joined.missedDays) ? `<div class="note" style="color:var(--danger); margin-bottom:8px;">⚠️ ${toFaDigits(joined.missedDays)} روز رو از دست دادی؛ به‌ازای هر روز غیبت ${toFaDigits(CHALLENGE_MISS_PENALTY)} امتیاز کم شده.</div>` : ``;
      return `
        <div class="card" style="margin-bottom:12px;">
          <div class="row-between">
            <div style="font-weight:800;">${tpl.title}</div>
            <button type="button" class="btn btn-ghost" style="flex:none; padding:5px 10px; font-size:calc(11px * var(--font-scale));" onclick="openChallengeParticipants('${tpl.id}')">شرکت‌کننده‌ها</button>
          </div>
          <div class="note" style="margin:4px 0 10px;">${tpl.desc}</div>
          <div style="display:inline-block; background:var(--gold-soft); color:var(--gold); font-weight:800; font-size:calc(11.5px * var(--font-scale)); padding:5px 10px; border-radius:10px; margin-bottom:10px;">🎁 پاداش تکمیل: +${toFaDigits(tpl.reward)} امتیاز</div>
          ${missedNote}
          ${joined
            ? (joined.done ? `<div class="note">✅ کامل شد (+${toFaDigits(tpl.reward)} امتیاز پاداش گرفتی)</div>` : `
                ${renderChallengeProgress(tpl, joined)}
                <button class="btn btn-ghost" style="width:100%; color:var(--danger);" onclick="leaveChallenge('${tpl.id}')">خروج از چالش (−${toFaDigits(CHALLENGE_LEAVE_PENALTY)} امتیاز)</button>
              `)
            : `<button class="btn btn-primary" style="width:100%;" onclick="joinChallenge('${tpl.id}')">شروع چالش</button>`}
        </div>
      `;
    }).join("")}
  `;
}
/* ---------- پیشرفت هر چالش: روز چندم، چند روز/کتاب انجام شده، امروز چی لازمه ---------- */
function challengeDayMinutes(b, dk){ return b.log.filter(l => l.dateKey === dk).reduce((n, l) => n + (Number(l.minutes) || 0), 0); }
function challengeQualifyingDays(b, c, tpl){
  const since = new Date(c.joinedAt); since.setHours(0,0,0,0);
  const sinceDk = todayKey(since);
  const days = Array.from(new Set(b.log.filter(l => l.dateKey >= sinceDk).map(l => l.dateKey)));
  return days.filter(dk => challengeDayMinutes(b, dk) >= tpl.dailyMinutes).sort();
}
function challengeDaysElapsed(c){
  const a = new Date(c.joinedAt); a.setHours(0,0,0,0);
  const t = new Date(); t.setHours(0,0,0,0);
  return Math.max(1, Math.round((t - a) / 86400000) + 1); // روز اول = ۱
}
function renderChallengeProgress(tpl, c){
  const b = ensureBooksData();
  const day = challengeDaysElapsed(c);
  const bar = (n, total) => `<div style="height:8px; border-radius:6px; background:var(--surf-a); overflow:hidden; margin:6px 0 8px;"><div style="height:100%; width:${Math.min(100, Math.round(n / Math.max(1, total) * 100))}%; background:var(--gold); border-radius:6px;"></div></div>`;
  const line = (label, value) => `<div class="row-between" style="font-size:calc(12.5px * var(--font-scale)); padding:3px 0;"><span style="color:var(--muted);">${label}</span><b>${value}</b></div>`;
  if(tpl.type === "daily_minutes"){
    const okDays = challengeQualifyingDays(b, c, tpl);
    const todayMin = challengeDayMinutes(b, todayKey());
    const left = Math.max(0, tpl.targetDays - okDays.length);
    // نوار روزها از روز شروع تا امروز: ✓ روز موفق، · روز ازدست‌رفته، امروز با حاشیه
    const okSet = new Set(okDays);
    const start = new Date(c.joinedAt); start.setHours(0,0,0,0);
    const cells = [];
    for(let i = 0; i < Math.min(day, 60); i++){
      const d = new Date(start); d.setDate(d.getDate() + i);
      const dk = todayKey(d), isToday = i === day - 1;
      cells.push(`<span title="${toFaDigits(i + 1)}" style="width:14px; height:14px; border-radius:4px; display:inline-block; background:${okSet.has(dk) ? "var(--gold)" : isToday ? "transparent" : "var(--surf-c)"}; ${isToday ? "border:1.5px solid var(--gold);" : ""}"></span>`);
    }
    return `${bar(okDays.length, tpl.targetDays)}
      ${line("روزهای موفق", `${toFaDigits(okDays.length)} از ${toFaDigits(tpl.targetDays)}`)}
      ${line("روز چالش", `روز ${toFaDigits(day)}`)}
      ${line("امروز", todayMin >= tpl.dailyMinutes ? `✅ ${toFaDigits(todayMin)} دقیقه` : `${toFaDigits(todayMin)} از ${toFaDigits(tpl.dailyMinutes)} دقیقه — ${toFaDigits(tpl.dailyMinutes - todayMin)} دقیقه‌ی دیگه بخون`)}
      ${line("مونده", `${toFaDigits(left)} روز موفق دیگه`)}
      <div style="display:flex; flex-wrap:wrap; gap:3px; margin:8px 0 10px; direction:rtl;">${cells.join("")}</div>`;
  }
  const deadline = new Date(c.joinedAt).getTime() + tpl.days * 86400000;
  const daysLeft = Math.max(0, Math.ceil((deadline - Date.now()) / 86400000));
  const inWindow = x => x.status === "finished" && x.finishedAt && new Date(x.finishedAt).getTime() >= new Date(c.joinedAt).getTime() && new Date(x.finishedAt).getTime() <= deadline;
  if(tpl.type === "books_in_days"){
    const fin = b.library.filter(inWindow);
    return `${bar(fin.length, tpl.targetBooks)}
      ${line("کتاب‌های تموم‌شده", `${toFaDigits(fin.length)} از ${toFaDigits(tpl.targetBooks)}`)}
      ${line("روز چالش", `${toFaDigits(Math.min(day, tpl.days))} از ${toFaDigits(tpl.days)}`)}
      ${line("مهلت باقی‌مونده", daysLeft ? `${toFaDigits(daysLeft)} روز` : "تموم شده")}
      ${fin.length ? `<div class="note" style="margin-bottom:8px;">✓ ${fin.map(x => escapeHtml(x.title || "")).join("، ")}</div>` : `<div class="note" style="margin-bottom:8px;">کتابی که از امروز تموم کنی (وضعیت «تمام‌شده») حساب می‌شه.</div>`}`;
  }
  if(tpl.type === "genre_mix"){
    const got = new Set(b.library.filter(inWindow).map(x => x.genre));
    return `${bar(tpl.genres.filter(g => got.has(g)).length, tpl.genres.length)}
      <div style="display:flex; flex-wrap:wrap; gap:6px; margin-bottom:6px;">${tpl.genres.map(g => `<span class="suggest-chip ${got.has(g) ? "on" : ""}" style="cursor:default;">${escapeHtml(g)}</span>`).join("")}</div>
      ${line("روز چالش", `${toFaDigits(Math.min(day, tpl.days))} از ${toFaDigits(tpl.days)}`)}
      ${line("مهلت باقی‌مونده", daysLeft ? `${toFaDigits(daysLeft)} روز` : "تموم شده")}
      <div class="note" style="margin-bottom:8px;">ژانر کتاب رو تو کتابخونه درست انتخاب کن تا حساب بشه.</div>`;
  }
  return ``;
}
function joinChallenge(id){
  const b = ensureBooksData();
  if(b.challenges.find(c=>c.id===id)) return;
  b.challenges.push({id, joinedAt: new Date().toISOString(), done:false, doneAt:null, missedDays:0, _synced:false});
  b.pendingJoins = Array.from(new Set([...(b.pendingJoins || []), id]));   // زمان عضویتِ معتبر رو سرور ثبت می‌کنه
  save();
  syncLeaderboard();
  syncChallengeParticipant(id, false).then(ok=>{
    if(ok){ const c = b.challenges.find(x=>x.id===id); if(c){ c._synced = true; save(); } }
  });
  renderAll();
}
const CHALLENGE_LEAVE_PENALTY = 30;
function leaveChallenge(id){
  const b = ensureBooksData();
  const idx = b.challenges.findIndex(c=>c.id===id && !c.done);
  if(idx===-1) return;
  if(!confirm(`با خروج از این چالش ${CHALLENGE_LEAVE_PENALTY} امتیاز از امتیازت کم می‌شه. مطمئنی می‌خوای خارج بشی؟`)) return;
  b.challenges.splice(idx,1);
  addBookPoints(-CHALLENGE_LEAVE_PENALTY);
  save();
  if(sb && currentUser){
    sb.from('challenge_participants').delete().eq('challenge_id', id).eq('user_id', currentUser.id)
      .then(({error})=>{ if(error) console.error("leaveChallenge cleanup failed:", error); });
  }
  renderAll();
}

/* ---------- Leaderboard overlay: monthly / yearly ranking across everyone in the book section ---------- */
/* Deterministic, colorful "initial avatar" per user — we deliberately do NOT expose anyone's
   real profile photo on the public leaderboard (privacy: that table only ever holds name +
   points, by design — see migration 004's comments), so this gives every row a distinct,
   consistent look without needing real images. */
// رنگ آواتارها از توکن‌های تم (کلاس‌های lbc-1..6 در peleh-app.css)
const LB_AVATAR_COLORS = ["var(--gold)","var(--info)","var(--ok)","var(--warn)","var(--danger)","var(--muted)"];
function lbColorFor(name){
  let h = 0;
  for(let i=0;i<(name||"").length;i++) h = (h*31 + name.charCodeAt(i)) >>> 0;
  return LB_AVATAR_COLORS[h % LB_AVATAR_COLORS.length];
}
function lbInitial(name){
  return escapeHtml(((name||"کاربر پله").trim()[0]) || "پ");
}
function lbBadgeColor(i){
  if(i===0) return "var(--medal-1)";
  if(i===1) return "var(--medal-2)";
  if(i===2) return "var(--medal-3)";
  return "var(--faint)";
}
/* Builds the podium (top 3, if any) + the full ranked list below it. `col` is the points
   column name for the active scope ("month_points"|"year_points"), `myId` highlights the
   current user's own row if they're in the visible top 20. */
function renderLeaderboardBody(rows, col, myId){
  if(!rows.length) return `<div class="note">هنوز کسی توی این بازه امتیازی نگرفته.</div>`;
  const top3 = rows.slice(0,3);
  const podiumHtml = top3.length ? `
    <div class="lb-podium">
      ${[1,0,2].map(idx=>{
        const r = top3[idx];
        if(!r) return `<div class="lb-podium-col p${idx+1}"></div>`;
        return `
        <div class="lb-podium-col p${idx+1}">
          <div class="lb-podium-crown">${idx===0?'👑':'&nbsp;'}</div>
          <div class="lb-podium-avatar-wrap">
            <div class="lb-podium-avatar" style="background:${lbColorFor(r.display_name)};">${lbInitial(r.display_name)}</div>
            <div class="lb-podium-badge" style="background:${lbBadgeColor(idx)};">${toFaDigits(idx+1)}</div>
          </div>
          <div class="lb-podium-name">${escapeHtml(r.display_name)}</div>
          <div class="lb-podium-pts">${toFaDigits(r[col]||0)} امتیاز</div>
        </div>`;
      }).join("")}
    </div>` : ``;
  const listHtml = `
    <div class="lb-list">
      ${rows.map((r,i)=>{
        const isMe = r.user_id===myId;
        return `
        <div class="lb-row ${isMe?'me':''}">
          <div class="lb-badge" style="background:${lbBadgeColor(i)};">${toFaDigits(i+1)}</div>
          <div class="lb-avatar" style="background:${lbColorFor(r.display_name)};">${lbInitial(r.display_name)}</div>
          <div class="lb-name">${escapeHtml(r.display_name)}${isMe?' (خودت)':''}</div>
          <div class="lb-pts">${toFaDigits(r[col]||0)}</div>
        </div>`;
      }).join("")}
    </div>`;
  return podiumHtml + listHtml;
}
/* ---------- اسپانسر ماهانه‌ی چالش (از آذر ۱۴۰۵) ----------
   کلید = ماه شمسی (همون jalaliMonthKey). هر ماه که اسپانسر داره، این‌جا یه ردیف اضافه کن.
   ماهی که ردیف نداره همون جایزه‌های قبلی رو نشون می‌ده. جایزه‌ی واقعی رو سرور می‌ده
   (peleh_settings.book_prize_months — باید با همین فهرست یکی باشه). */
const CHALLENGE_SPONSORS = {
  "1405-09": {
    name: "نشر خوب", handle: "khoobpub", logo: "sponsors/khoob-logo.png",
    books: [
      { title: "داستان کاهو", cover: "sponsors/khoob-book-1.jpg" },
      { title: "غریبه‌ها", cover: "sponsors/khoob-book-2.jpg" },
      { title: "آشپزخانه‌ی کرملین", cover: "sponsors/khoob-book-3.jpg" }
    ]
  }
};
function currentChallengeSponsor(){
  try{ return CHALLENGE_SPONSORS[jalaliMonthKey()] || null; }catch(e){ return null; }
}
function sponsorMonthName(){
  try{ const [, jm] = jalaliOf(new Date()); return JALALI_MONTHS[jm - 1]; }catch(e){ return "این ماه"; }
}
function renderSponsorCard(compact){
  const s = currentChallengeSponsor();
  if(!s) return ``;
  const month = sponsorMonthName();
  const logo = `<img src="${s.logo}" alt="" width="44" height="44" style="width:44px;height:44px;object-fit:contain;border-radius:12px;background:#fff;flex:0 0 auto;" onerror="this.style.display='none'">`;
  const head = `<div style="display:flex;align-items:center;gap:10px;">${logo}
      <div style="min-width:0;"><div style="font-size:var(--fs-12,12px);opacity:.75;">اسپانسر چالش ${month}</div>
      <div style="font-weight:800;font-size:var(--fs-16,16px);">${escapeHtml(s.name)} <span dir="ltr" style="font-weight:500;opacity:.7;font-size:var(--fs-12,12px);">@${escapeHtml(s.handle)}</span></div></div></div>`;
  const prize = `<div style="margin-top:8px;font-weight:700;">🎁 نفر اول تا سوم ${month}، هر نفر یک کتاب از ${escapeHtml(s.name)}</div>`;
  if(compact) return `<div class="card" role="button" tabindex="0" onclick="openLeaderboard()" style="margin-bottom:14px;cursor:pointer;">${head}${prize}</div>`;
  const covers = (s.books || []).map(b => `<figure style="margin:0;flex:1;min-width:0;text-align:center;">
      <img src="${b.cover}" alt="${escapeHtml(b.title)}" style="width:100%;max-width:88px;aspect-ratio:2/3;object-fit:cover;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,.18);" onerror="this.style.visibility='hidden'">
      <figcaption style="font-size:var(--fs-12,12px);margin-top:4px;line-height:1.5;">${escapeHtml(b.title)}</figcaption></figure>`).join("");
  return `<div class="card raised" style="margin-bottom:12px;">${head}${prize}
    ${covers ? `<div style="display:flex;gap:10px;margin-top:10px;justify-content:center;">${covers}</div>` : ``}
    <div class="note" style="margin-top:8px;">کتاب‌ها بعد از تأیید رتبه، آخر ${month} برای برنده‌ها پست می‌شه.</div></div>`;
}
let leaderboardScope = "month"; // "month" | "year"
function openLeaderboard(){
  openOverlay(`<h3>🏆 نفرات برتر</h3><div class="note">در حال بارگذاری...</div>`);
  loadAndRenderLeaderboard();
}
function setLeaderboardScope(s){ leaderboardScope = s; loadAndRenderLeaderboard(); }
async function loadAndRenderLeaderboard(){
  if(!sb || !currentUser){
    openOverlay(`<h3>🏆 نفرات برتر</h3><div class="note">برای دیدن رتبه‌بندی باید وارد حساب باشی.</div><div class="sheet-actions"><button class="btn btn-primary" style="width:100%;" onclick="closeOverlay()">باشه</button></div>`);
    return;
  }
  const col = leaderboardScope==="month" ? "month_points" : "year_points";
  const keyCol = leaderboardScope==="month" ? "month_key" : "year_key";
  const periodKey = leaderboardScope==="month" ? jalaliMonthKey() : jalaliYearKey();
  let rows = [];
  try{
    const { data } = await sb.from('leaderboard').select(`user_id,display_name,${col}`).eq(keyCol, periodKey).order(col, {ascending:false}).limit(20);
    rows = data || [];
  }catch(e){ /* keep rows empty — UI shows the empty state below */ }

  const myRank = rows.findIndex(r=>r.user_id===currentUser.id);
  const meta = (typeof currentProfileMeta === "function") ? currentProfileMeta() : {name:""};
  const b = ensureBooksData();
  await flushReadingEvents();   // امتیاز جدول از سرور (نه عدد محلی اپ)
  const ss = b.serverStatus || {};
  const myPoints = leaderboardScope==="month" ? (ss.month_points || 0) : (ss.year_points || 0);
  const offenses = (ss.penalties || []).filter(p => p.status === "active");
  const statusHtml = `<div class="card raised" style="padding:12px 14px; margin-bottom:12px;">
      <div class="row-between note"><span>امروز برای جدول حساب شد</span><b style="color:var(--text);">${toFaDigits(ss.today_minutes || 0)} از ${toFaDigits(ss.daily_cap || 360)} دقیقه</b></div>
      ${!currentReadingBook() ? `<div class="note" style="margin-top:4px;">برای اینکه دقیقه‌ها تو جدول حساب بشن، کتاب در حال خوندنت رو انتخاب کن.</div>` : ``}
      ${offenses.length ? `<div class="note" style="margin-top:4px; color:var(--danger);">${toFaDigits(offenses.length)} تخلف در این ماه — <button class="link-btn" style="padding:0; min-height:0;" onclick="showReadingPenaltySheet({level:${offenses[0].level}, clawback:${-offenses[0].clawback}, penalty:${-offenses[0].penalty}, reason:${JSON.stringify(offenses[0].reason).replace(/"/g, "&quot;")}}, ${JSON.stringify(offenses[0].book_title || "").replace(/"/g, "&quot;")})">جزئیات</button></div>` : ``}
    </div>`;
  let myRankHtml = "";
  if(myRank === -1){
    // Not in the visible top 20 — pin your own row at the bottom, like the reference design.
    // Points are always visible for free; the exact numeric rank is the Premium-gated part.
    if(isPremiumActive()){
      try{
        const { count } = await sb.from('leaderboard').select('user_id', {count:'exact', head:true}).eq(keyCol, periodKey).gt(col, myPoints);
        myRankHtml = `
          <div class="lb-row me lb-row-pinned">
            <div class="lb-badge" style="background:${lbBadgeColor(99)};">${toFaDigits((count||0)+1)}</div>
            <div class="lb-avatar" style="background:${lbColorFor(meta.name||'من')};">${lbInitial(meta.name||'من')}</div>
            <div class="lb-name">تو (خودت)</div>
            <div class="lb-pts">${toFaDigits(myPoints)}</div>
          </div>`;
      }catch(e){
        myRankHtml = `
          <div class="lb-row me lb-row-pinned">
            <div class="lb-badge" style="background:${lbBadgeColor(99)};">؟</div>
            <div class="lb-avatar" style="background:${lbColorFor(meta.name||'من')};">${lbInitial(meta.name||'من')}</div>
            <div class="lb-name">تو (خودت) — توی ۲۰ نفر برتر نیستی</div>
            <div class="lb-pts">${toFaDigits(myPoints)}</div>
          </div>`;
      }
    } else {
      myRankHtml = `
        <div class="lb-row me lb-row-pinned">
          <div class="lb-badge" style="background:var(--faint);">🔒</div>
          <div class="lb-avatar" style="background:${lbColorFor(meta.name||'من')};">${lbInitial(meta.name||'من')}</div>
          <div class="lb-name">تو — برای دیدن جایگاه دقیق، Premium بگیر</div>
          <div class="lb-pts">${toFaDigits(myPoints)}</div>
        </div>`;
    }
  }

  // روند ۴ (طراحی نهایی): رتبه‌ی هفتگی خودم کنار داده‌های خودم نگه داشته می‌شه (حداکثر ۱۲ هفته، فقط ماهانه)
  let rankTrendHtml = "";
  if(leaderboardScope === "month"){
    const rankNow = myRank >= 0 ? myRank + 1 : null;
    const wk = todayKey(typeof saturdayOf === "function" ? saturdayOf(new Date()) : new Date());
    b.rankHistory = Array.isArray(b.rankHistory) ? b.rankHistory.filter(r => r && r.w) : [];
    if(rankNow){
      const ex = b.rankHistory.find(r => r.w === wk);
      if(ex){ if(ex.r !== rankNow){ ex.r = rankNow; ex.p = myPoints; save(); } }
      else { b.rankHistory.push({ w: wk, r: rankNow, p: myPoints }); b.rankHistory = b.rankHistory.slice(-12); save(); }
    }
    const hist = b.rankHistory.slice(-8);
    const tenth = rows[9] ? (rows[9][col] || 0) : null;
    if(hist.length >= 2){
      const mx = Math.max(...hist.map(h => h.r), 10);
      const first = hist[0].r, last = hist[hist.length - 1].r;
      rankTrendHtml = `<div class="card raised lb-trend"><div class="row-between"><b>رتبه‌ی تو · ${toFaDigits(hist.length)} هفته</b>
        <span class="${last < first ? "up" : ""}">${last < first ? `${toFaDigits(first - last)} پله بالاتر` : last > first ? `${toFaDigits(last - first)} پله پایین‌تر` : "ثابت"}</span></div>
        <div class="lb-trend-bars" role="img" aria-label="رتبه از ${first} به ${last}">${hist.map((h, k) => `<i class="${k === hist.length - 1 ? "now" : ""}" style="height:${Math.round((mx - h.r + 1) / mx * 100)}%"></i>`).join("")}</div></div>`;
    } else if(myRank === -1 && tenth !== null && myPoints < tenth){
      rankTrendHtml = `<div class="note" style="margin-bottom:10px;">${toFaDigits(tenth - myPoints)} امتیاز تا ۱۰ نفر برتر</div>`;
    }
  }

  openOverlay(`
    <h3>🏆 نفرات برتر — ${leaderboardScope==="month" ? "این ماه" : "امسال"}</h3>
    <div class="suggest-chips" style="margin-bottom:12px;">
      <button type="button" class="suggest-chip ${leaderboardScope==='month'?'on':''}" onclick="setLeaderboardScope('month')">این ماه</button>
      <button type="button" class="suggest-chip ${leaderboardScope==='year'?'on':''}" onclick="setLeaderboardScope('year')">امسال</button>
    </div>
    ${(typeof renderTipBanner === "function") ? renderTipBanner('leaderboard_structure', '۳ نفر اول بالا با مدال نشون داده می‌شن، بقیه‌ی رتبه‌ها زیرش لیست کامله. اگه توی ۲۰ نفر برتر نباشی، جایگاه خودت جدا و پایین لیست پین می‌شه.') : ``}
    ${leaderboardScope==="month" ? renderSponsorCard(false) : ``}
    ${statusHtml}
    ${rankTrendHtml}
    ${renderLeaderboardBody(rows, col, currentUser.id)}
    ${myRankHtml}
    <div class="note" style="margin-top:10px; line-height:2;">
      ${leaderboardScope==="month" && currentChallengeSponsor() ? `
      🥇🥈🥉 نفر اول تا سوم ماه: هر نفر یک کتاب از ${escapeHtml(currentChallengeSponsor().name)}<br>
      🏅 نفرات ۴ تا ۱۰: نشان «۱۰ نفر برتر»<br>
      نفر اول سال: یک سال Premium — نفر دوم سال: ۳ ماه Premium` : `
      🥇 نفر اول ماه: یک کتاب هدیه — نفر اول سال: یک سال Premium<br>
      🥈 نفر دوم: یک ماه Premium (سالانه: ۳ ماه)<br>
      🥉 نفر سوم: نشان دیجیتال ویژه<br>
      🏅 نفرات ۴ تا ۱۰: نشان «۱۰ نفر برتر»`}
    </div>
    <div class="sheet-actions"><button class="btn btn-primary" style="width:100%;" onclick="closeOverlay()">باشه</button></div>
  `);
}

function renderBooksBadges(){
  const b = ensureBooksData();
  return `
    <div class="card">
      ${BOOK_BADGES.map(def=>{
        const earned = b.badges.includes(def.id);
        return `
          <div class="row-between" style="padding:8px 0; border-bottom:1px solid var(--surf-c); opacity:${earned?1:0.4};">
            <div style="font-weight:700;">${def.icon} ${def.title}</div>
            <div class="note">${earned?"گرفته شد":"هنوز نه"}</div>
          </div>
        `;
      }).join("")}
    </div>
  `;
}

function renderBooksGifts(){
  const b = ensureBooksData();
  return `
    <div class="note" style="margin-bottom:12px;">با رسیدن به این اهداف، هدیه‌ات باز می‌شه. تحویل هدیه‌های فیزیکی/کدهای تخفیف به‌صورت دستی از سمت تیم پله انجام می‌شه.</div>
    ${GIFT_RULES.map(def=>{
      const g = b.gifts.find(x=>x.id===def.id);
      return `
        <div class="card" style="margin-bottom:12px;">
          <div style="font-weight:800;">${def.title}</div>
          <div class="note" style="margin:4px 0 10px;">جایزه: ${def.reward}</div>
          ${!g ? `<div class="note">هنوز باز نشده</div>` :
            g.claimedAt ? `<div class="note">✅ دریافت شد</div>` :
            `<button class="btn btn-primary" style="width:100%;" onclick="claimBookGift('${def.id}')">دریافت هدیه</button>`}
        </div>
      `;
    }).join("")}
  `;
}
function claimBookGift(id){
  const b = ensureBooksData();
  const g = b.gifts.find(x=>x.id===id);
  if(!g) return;
  g.claimedAt = new Date().toISOString();
  save();
  renderAll();
  alert("هدیه‌ات ثبت شد؛ تیم پله به‌زودی باهات هماهنگ می‌کنه.");
}

/* ---------- Premium: automated payment via Zibal ---------- */
const PREMIUM_PLANS = {
  monthly:   {label:"ماهانه",  price:149000,  note:""},
  quarterly: {label:"۳ ماهه",  price:402000,  note:"٪۱۰ تخفیف"},
  semiannual:{label:"۶ ماهه",  price:714000,  note:"٪۲۰ تخفیف"},
  yearly:    {label:"سالانه",  price:1490000, note:"۲ ماه رایگان"},
};
let selectedPremiumPlan = "monthly";

/* ---------- Premium: مسیر پرداخت بر اساس منبع نصب ----------
   • نصب از کافه‌بازار  → فقط پرداخت درون‌برنامه‌ای بازار (Poolakey) — طبق قوانین بازار هیچ درگاه دیگه‌ای نباید دیده بشه
   • APK مستقیم از سایت / نسخه‌ی وب → زیبال
   تشخیص «نصب از بازار» با installer package name انجام می‌شه. برای خیال راحت موقع داوری بازار
   (که ممکنه APK رو مستقیم نصب کنن)، فایل store-config.js یه تنظیم دستی داره:
     window.PELEH_STORE = "auto"   → تشخیص خودکار (پیش‌فرض)
     window.PELEH_STORE = "bazaar" → همیشه بازار (برای بیلدی که به بازار می‌دی، امن‌ترین حالت)
     window.PELEH_STORE = "direct" → همیشه زیبال (برای APK سایت) */
// همون کلید عمومی RSA که از پنل بازار (بخش «پرداخت درون‌برنامه‌ای») گرفتیم.
const BAZAAR_RSA_PUBLIC_KEY = "MIHNMA0GCSqGSIb3DQEBAQUAA4G7ADCBtwKBrwCoW7DEnUIdeHo6G0Mup83PKMRoxQEDgz6PrPr+1I4zOz4Liet5JRdUXtXff9zguo3l/DqIIEIapYZlv77VmdwpN+6Y2lJzfTNDIaDqZWycYd2hujXqCw8xaYN3jqGwJjIdjXi4UveNEc4urV0IavR8b4WpKf+Rt30iS3h0i6FBujkgMK6yoQXSm4Nu70v2erlmYkp3fJHeNhl2G8iBEBpfuLIn9wC2piHWKcfV5P0CAwEAAQ==";

const PLAN_TO_BAZAAR_PRODUCT = {
  monthly:    "peleh_premium_monthly",
  quarterly:  "peleh_premium_quarterly",
  semiannual: "peleh_premium_semiannual",
  yearly:     "peleh_premium_yearly",
};
// اشتراک سلامت پلاس در کافه‌بازار (v2.4.0) — قیمتش فقط از پنل توسعه‌دهنده‌ی بازار، مدتش از پنل ادمین پله
const PLUS_BAZAAR_PRODUCT = "peleh_plus_monthly";
const BAZAAR_PRODUCT_IDS = Object.values(PLAN_TO_BAZAAR_PRODUCT).concat([PLUS_BAZAAR_PRODUCT]);

let _storeChannelPromise = null;
// 'bazaar' | 'direct' | 'web' — یک‌بار محاسبه و کش می‌شه
function getStoreChannel(){
  if(_storeChannelPromise) return _storeChannelPromise;
  _storeChannelPromise = (async () => {
    if(typeof Capacitor === "undefined" || typeof Capacitor.getPlatform !== "function" || Capacitor.getPlatform() !== "android") return "web";
    const forced = String(window.PELEH_STORE || "auto").toLowerCase();
    if(forced === "bazaar") return "bazaar";
    if(forced === "direct") return "direct";
    try{
      const installSource = Capacitor.Plugins && Capacitor.Plugins.InstallSource;
      if(!installSource) return "direct";
      const res = await Promise.race([
        installSource.getInstallerPackageName(),
        new Promise(r => setTimeout(() => r(null), 3000)),
      ]);
      const installer = (res && res.installer) || "";
      return installer.startsWith("com.farsitel.bazaar") ? "bazaar" : "direct";
    }catch(e){
      return "direct";
    }
  })();
  return _storeChannelPromise;
}
async function isInstalledFromBazaar(){
  return (await getStoreChannel()) === "bazaar";
}

/* ---- Bazaar purchase bookkeeping ----
   Premium in Bazaar is sold as in-app products. Two things were missing before:
   1) The purchase was never "consumed" — so after the first purchase, the same product (e.g. the
      next month) could never be bought again ("already owned").
   2) If the app was closed / the internet dropped between paying and our server verifying the
      purchase, the person was charged but got nothing, with no way to retry.
   Now: every purchase is kept locally until the server has verified it, then consumed. Anything
   left over is retried the next time the Premium page opens. */
const BAZAAR_PENDING_KEY = "pelehBazaarPendingPurchases";
const BAZAAR_VERIFIED_KEY = "pelehBazaarVerifiedTokens";
function _readJsonLS(key, fallback){ try{ return JSON.parse(localStorage.getItem(key) || "null") || fallback; }catch(e){ return fallback; } }
function _writeJsonLS(key, val){ try{ localStorage.setItem(key, JSON.stringify(val)); }catch(e){} }
function _rememberPendingPurchase(p){
  const list = _readJsonLS(BAZAAR_PENDING_KEY, []).filter(x => x.purchaseToken !== p.purchaseToken);
  list.push({ productId: p.productId, purchaseToken: p.purchaseToken, originalJson: p.originalJson || null, dataSignature: p.dataSignature || null, ts: Date.now() });
  _writeJsonLS(BAZAAR_PENDING_KEY, list.slice(-10));
}
function _forgetPendingPurchase(token){
  _writeJsonLS(BAZAAR_PENDING_KEY, _readJsonLS(BAZAAR_PENDING_KEY, []).filter(x => x.purchaseToken !== token));
}
function _markTokenVerified(token){
  const list = _readJsonLS(BAZAAR_VERIFIED_KEY, []).filter(t => t !== token);
  list.push(token);
  _writeJsonLS(BAZAAR_VERIFIED_KEY, list.slice(-30));
}
function _isTokenVerified(token){ return _readJsonLS(BAZAAR_VERIFIED_KEY, []).includes(token); }

// Sends one purchase to our server. Returns {ok, message}. A token the server says it already
// applied counts as ok (so it can be consumed instead of being stuck forever).
async function _verifyBazaarPurchaseOnServer(p){
  try{
    const { data, error } = await invokeEdge('verify-bazaar-purchase', {
      body: {
        productId: p.productId,
        purchaseToken: p.purchaseToken,
        originalJson: p.originalJson,
        dataSignature: p.dataSignature,
      },
    });
    if(!error && !data?.error) return { ok: true, already: !!data?.alreadyApplied };
    const msg = (data && (data.error || data.message)) || "";
    if(data?.alreadyApplied || /already|قبلا|قبلاً|تکراری|duplicate/i.test(msg)) return { ok: true, already: true };
    return { ok: false, message: msg || "تایید خرید ناموفق بود." };
  }catch(e){
    return { ok: false, message: "مشکل در اتصال — اینترنتت رو چک کن." };
  }
}
async function _consumeBazaarPurchase(poolakey, token){
  try{ await poolakey.consumeProduct({ purchaseToken: token }); return true; }
  catch(e){ console.error("Bazaar consume failed:", e); return false; }
}
function _getPoolakey(){
  return (typeof Capacitor !== "undefined" && Capacitor.Plugins && Capacitor.Plugins.CapacitorPoolakey) || null;
}
function _parsePurchaseListItem(item){
  if(typeof item === "string"){ try{ item = JSON.parse(item); }catch(e){ return null; } }
  if(!item || !item.purchaseToken) return null;
  return { productId: item.productId, purchaseToken: item.purchaseToken, originalJson: JSON.stringify(item), dataSignature: null };
}

/* Retries purchases that were paid for but never verified/consumed. Safe to call repeatedly.
   Returns true if any purchase got applied (so the caller can refresh the profile). */
let _bazaarRecoveryRunning = false;
async function recoverBazaarPurchases(){
  if(_bazaarRecoveryRunning || !currentUser) return false;
  if(!(await isInstalledFromBazaar())) return false;
  const poolakey = _getPoolakey();
  if(!poolakey) return false;
  _bazaarRecoveryRunning = true;
  let applied = false;
  try{
    await poolakey.connectPayment({ rsaPublicKey: BAZAAR_RSA_PUBLIC_KEY });
    // 1) purchases this device already has full data for (including the signature)
    for(const p of _readJsonLS(BAZAAR_PENDING_KEY, [])){
      if(!_isTokenVerified(p.purchaseToken)){
        const r = await _verifyBazaarPurchaseOnServer(p);
        if(!r.ok) continue;
        _markTokenVerified(p.purchaseToken);
        if(!r.already) applied = true;
      }
      if(await _consumeBazaarPurchase(poolakey, p.purchaseToken)) _forgetPendingPurchase(p.purchaseToken);
    }
    // 2) anything Bazaar still reports as owned (e.g. the app was reinstalled after paying)
    let owned = [];
    try{
      const res = await poolakey.getPurchasedProducts();
      owned = ((res && res.list) || []).map(_parsePurchaseListItem).filter(Boolean).filter(p => BAZAAR_PRODUCT_IDS.includes(p.productId));
    }catch(e){ owned = []; }
    for(const p of owned){
      if(!_isTokenVerified(p.purchaseToken)){
        const r = await _verifyBazaarPurchaseOnServer(p);
        if(!r.ok) continue;
        _markTokenVerified(p.purchaseToken);
        if(!r.already) applied = true;
      }
      if(await _consumeBazaarPurchase(poolakey, p.purchaseToken)) _forgetPendingPurchase(p.purchaseToken);
    }
  }catch(e){
    console.error("Bazaar recovery failed:", e);
  }finally{
    try{ await poolakey.disconnectPayment(); }catch(_e){}
    _bazaarRecoveryRunning = false;
  }
  return applied;
}

async function startBazaarPayment(){
  const btn = document.getElementById("premium_pay_btn");
  const errEl = document.getElementById("premium_pay_error");
  const resetBtn = () => { if(btn){ btn.disabled = false; btn.textContent = "پرداخت و فعال‌سازی"; } };
  if(errEl) errEl.textContent = "";
  if(btn){ btn.disabled = true; btn.textContent = "در حال اتصال به بازار..."; }

  const poolakey = _getPoolakey();
  const productId = PLAN_TO_BAZAAR_PRODUCT[selectedPremiumPlan];
  if(!poolakey || !productId){
    if(errEl) errEl.textContent = "پرداخت بازار در این نسخه در دسترس نیست — برنامه رو از کافه‌بازار به‌روز کن.";
    resetBtn(); return;
  }

  let purchase = null;
  try{
    await poolakey.connectPayment({ rsaPublicKey: BAZAAR_RSA_PUBLIC_KEY });
    try{
      purchase = await poolakey.purchaseProduct({ productId });
    }finally{
      try{ await poolakey.disconnectPayment(); }catch(_e){}
    }
  }catch(e){
    const msg = String((e && e.message) || "").toLowerCase();
    if(msg.includes("cancel")){
      if(errEl) errEl.textContent = "";
      resetBtn(); return;
    }
    if(msg.includes("connection") || msg.includes("not connected") || msg.includes("bazaar")){
      if(errEl) errEl.textContent = "اتصال به کافه‌بازار برقرار نشد — مطمئن شو اپ بازار نصب و به‌روزه و دوباره امتحان کن.";
      resetBtn(); return;
    }
    // شاید قبلاً پرداخت شده ولی تایید/مصرف نشده (مثلاً اینترنت وسط کار قطع شده) — اول همونو درست کن
    if(btn) btn.textContent = "در حال بررسی خریدهای قبلی...";
    const recovered = await recoverBazaarPurchases();
    if(recovered){
      await reloadProfileKeepingLocalEdits();
      renderAll();
      alert("خرید قبلی‌ت پیدا شد و اشتراک Premium فعال شد 🎉");
      return;
    }
    if(errEl) errEl.textContent = "پرداخت ناموفق بود — دوباره امتحان کن. اگه مبلغ کم شده، چند دقیقه بعد همین صفحه رو دوباره باز کن تا خودکار بررسی بشه.";
    resetBtn(); return;
  }

  if(!purchase || !purchase.purchaseToken){
    if(errEl) errEl.textContent = "پاسخی از بازار دریافت نشد — دوباره امتحان کن.";
    resetBtn(); return;
  }

  // قبل از هر کاری خرید رو ذخیره کن تا اگه الان اینترنت قطع شد یا اپ بسته شد، از دست نره
  _rememberPendingPurchase(purchase);
  if(btn) btn.textContent = "در حال فعال‌سازی...";
  const r = await _verifyBazaarPurchaseOnServer(purchase);
  if(!r.ok){
    if(errEl) errEl.textContent = (r.message || "تایید خرید ناموفق بود.") + " خریدت ذخیره شده و دفعه‌ی بعد که این صفحه رو باز کنی دوباره بررسی می‌شه.";
    resetBtn(); return;
  }
  _markTokenVerified(purchase.purchaseToken);
  try{
    await poolakey.connectPayment({ rsaPublicKey: BAZAAR_RSA_PUBLIC_KEY });
    if(await _consumeBazaarPurchase(poolakey, purchase.purchaseToken)) _forgetPendingPurchase(purchase.purchaseToken);
  }catch(e){ /* بعداً تو recoverBazaarPurchases مصرف می‌شه */ }
  finally{ try{ await poolakey.disconnectPayment(); }catch(_e){} }

  await reloadProfileKeepingLocalEdits();
  renderAll();
  alert("اشتراک Premium فعال شد 🎉");
}

// نقطه‌ی ورودی واحد دکمه‌ی «پرداخت و فعال‌سازی»: بر اساس پلتفرم/منبع نصب،
// مسیر درست (زیبال یا بازار) رو انتخاب می‌کنه.
async function startPremiumPurchase(){
  if(await isInstalledFromBazaar()){
    return startBazaarPayment();
  }
  return startZibalPayment(); // وب یا APK دانلود مستقیم از سایت خودمون
}

function isPremiumActive(){
  const b = ensureBooksData();
  return !!(b.premium && b.premiumUntil && new Date(b.premiumUntil) > new Date());
}
/* Full page version, reached from "بیشتر" (was previously buried inside کتاب → هدیه‌ها,
   which made no sense once Premium started unlocking non-book features too — "مهم‌ترین قدم
   امروز" for one). Same async-fill pattern as before (renderPremiumPanel targets a div by
   id and fills it after the outer HTML is attached), just given a proper page shell now. */
function renderPremiumTab(){
  setTimeout(renderPremiumPanel, 0);
  return `
    <div class="topbar"><div><div class="page-title">💎 Premium</div><div class="page-sub">پیشنهاد هوشمند کتاب، مهم‌ترین قدم امروز، Coach هوشمند و تحلیل عمیق پیشرفت</div></div></div>
    ${(typeof renderTipBanner === "function") ? renderTipBanner('premium_unified', 'همه‌ی قابلیت‌های Premium پله (کتاب، «مهم‌ترین قدم امروز»، Coach هوشمند) الان زیر یه اشتراک واحدن — دیگه نیازی نیست جدا جدا بخری.') : ``}
    <div id="premium-panel"><div class="card"><div class="note">در حال بارگذاری...</div></div></div>
  `;
}
async function renderPremiumPanel(){
  const el = document.getElementById("premium-panel");
  if(!el) return; // user navigated away before this finished
  const b = ensureBooksData();
  // قوانین کافه‌بازار: فعال‌سازی امکانات فقط از کانال پرداخت بازار — هیچ کانال جایگزین یا موازی
  // (کد هدیه/تخفیفِ خود ما هم فعال‌سازی خارج از بازار حساب می‌شه). تخفیف در بازار با «تخفیف پویا»ی خود بازاره.
  const onBazaar = await isInstalledFromBazaar();
  if(!document.getElementById("premium-panel")) return;

  // دکمه‌ی خرید/تمدید همیشه در دسترسه — حتی وقتی کاربر Premium فعال داره (مثلاً هدیه‌ی ۷ روزه‌ی خوش‌آمد).
  // دلیل: داوری بازار با حساب تازه وارد می‌شه و باید بتونه پنجره‌ی پرداخت درون‌برنامه‌ای رو ببینه و تست کنه.
  // خرید روی اشتراک فعال، از تاریخ پایان فعلی تمدید می‌شه (نه از امروز)، پس چیزی از کاربر نمی‌سوزه.
  const premiumActive = isPremiumActive();

  if(!premiumActive && (!currentUser || !sb)){
    el.innerHTML = `<div class="card"><div class="note">پیشنهاد هوشمند کتاب، Coach هوشمند، تحلیل عمیق پیشرفت، برنامه‌ریزی چندماهه و همه‌ی قابلیت‌های هوشمند پله سلامت با Premium باز می‌شه.</div></div>`;
    return;
  }

  if(onBazaar && !_bazaarRecoveryRunning){
    recoverBazaarPurchases().then(async (applied) => {
      if(!applied) return;
      await reloadProfileKeepingLocalEdits();
      renderAll();
      alert("خرید قبلی‌ت تایید شد و اشتراک Premium فعال شد 🎉");
    }).catch(()=>{});
  }

  const activeNote = premiumActive
    ? `<div class="card"><div class="note">✅ اشتراک Premium فعاله تا ${new Date(b.premiumUntil).toLocaleDateString("fa-IR")}.</div></div>`
    : ``;
  const introNote = premiumActive
    ? `<div class="note" style="margin-bottom:14px;"><b>🔁 تمدید / خرید اشتراک</b> — هر موقع خواستی از همین‌جا اشتراکت رو تمدید کن؛ مدت جدید به انتهای اشتراک فعلی‌ت اضافه می‌شه.</div>`
    : `<div class="note" style="margin-bottom:14px;">پیشنهاد هوشمند کتاب، Coach هوشمند، تحلیل عمیق پیشرفت، برنامه‌ریزی چندماهه و همه‌ی قابلیت‌های هوشمند پله سلامت با Premium باز می‌شه.</div>`;

  el.innerHTML = `
    ${activeNote}
    <div class="card">
      ${introNote}
      <div style="display:flex; flex-direction:column; gap:8px; margin-bottom:14px;">
        <div class="note" style="padding:8px 10px; border-radius:10px; background:var(--gold-soft);"><b>🍕 Smart Cheat</b> — غذاهایی که دوست داری رو حذف نکن؛ هوشمندانه‌تر انتخابشون کن.</div>
        <div class="note" style="padding:8px 10px; border-radius:10px; background:var(--gold-soft);"><b>🤖 AI Health Coach</b> — یه مربی شخصی که تو و عادت‌هات رو می‌شناسه.</div>
        <div class="note" style="padding:8px 10px; border-radius:10px; background:var(--gold-soft);"><b>🎯 Personal Health Journey</b> — یه مسیر شخصی از وضعیت امروزت تا هدفی که می‌خوای بهش برسی.</div>
      </div>
      <div class="suggest-chips" style="margin-bottom:14px;">
        ${Object.entries(PREMIUM_PLANS).map(([key, p])=>`
          <button type="button" class="suggest-chip ${selectedPremiumPlan===key?'on':''}" onclick="setPremiumPlan('${key}')">${p.label} — ${p.price.toLocaleString('fa-IR')} تومان${p.note?` (${p.note})`:''}</button>
        `).join("")}
      </div>
      ${!onBazaar ? `
        <div class="field" style="margin-bottom:10px;">
          <label>کد تخفیف داری؟ (اختیاری)</label>
          <input type="text" id="checkout_promo_input" class="goal-input" placeholder="مثلاً READINGDAY10" dir="ltr" style="text-align:left;" value="${escapeHtml(checkoutPromoInput)}" oninput="checkoutPromoInput=this.value">
        </div>
      ` : ``}
      ${onBazaar ? `<div class="note" style="margin-bottom:10px;">پرداخت از طریق صفحه‌ی امن کافه‌بازار انجام می‌شه و قیمت نهایی همون‌جا نمایش داده می‌شه.</div>` : ``}
      <div class="field-error" id="premium_pay_error"></div>
      <button class="btn btn-primary" id="premium_pay_btn" style="width:100%; padding:12px; margin-top:6px;" onclick="startPremiumPurchase()">پرداخت و فعال‌سازی</button>
    </div>
    ${onBazaar ? `` : renderPromoCodeBox()}
  `;
}
let checkoutPromoInput = "";
function setPremiumPlan(plan){ selectedPremiumPlan = plan; renderPremiumPanel(); }

/* ---------- Premium: کد تخفیف/هدیه (از پنل ادمین ساخته می‌شه) ---------- */
let promoCodeInput = "";
let promoCodeBusy = false;
let promoCodeMsg = ""; // {text, ok} shape kept as two vars below
let promoCodeMsgOk = false;
function renderPromoCodeBox(){
  return `
    <div class="card">
      <div class="note" style="margin-bottom:12px;">🎁 کد تخفیف یا هدیه داری؟ اینجا واردش کن.</div>
      <div class="field" style="margin-bottom:10px;">
        <input type="text" id="promo_code_input" placeholder="مثلاً READINGDAY" value="${escapeHtml(promoCodeInput)}" dir="ltr" style="text-align:left;" oninput="promoCodeInput=this.value" ${promoCodeBusy?"disabled":""}>
      </div>
      <button class="btn btn-primary" style="width:100%; padding:12px;" ${promoCodeBusy?"disabled":""} onclick="redeemPromoCode()">${promoCodeBusy?"در حال بررسی...":"اعمال کد"}</button>
      ${promoCodeMsg ? `<div class="${promoCodeMsgOk?'note':'field-error'}" style="margin-top:8px;">${escapeHtml(promoCodeMsg)}</div>` : ``}
    </div>
  `;
}
async function redeemPromoCode(){
  if(await isInstalledFromBazaar()) return; // نسخه‌ی بازار: فعال‌سازی فقط از پرداخت بازار
  const codeVal = (document.getElementById("promo_code_input")?.value || promoCodeInput || "").trim();
  if(!codeVal || !sb || !currentUser){ return; }
  promoCodeBusy = true; promoCodeMsg = ""; renderPremiumPanel();
  try{
    const { data, error } = await invokeEdge('redeem-promo-code', { body: { code: codeVal } });
    if(error || data?.error){
      promoCodeMsgOk = false;
      promoCodeMsg = data?.error || "این کد قابل استفاده نیست.";
    }else{
      promoCodeMsgOk = true;
      promoCodeMsg = `✅ ${data.days} روز اشتراک Premium برات فعال شد.`;
      promoCodeInput = "";
      await reloadProfileKeepingLocalEdits();
    }
  }catch(e){
    promoCodeMsgOk = false;
    promoCodeMsg = "مشکل در اتصال — دوباره امتحان کن.";
  }
  promoCodeBusy = false;
  renderPremiumPanel();
  renderAll();
}
async function startZibalPayment(){
  const btn = document.getElementById("premium_pay_btn");
  const errEl = document.getElementById("premium_pay_error");
  if(errEl) errEl.textContent = "";
  // طبق قوانین کافه‌بازار، نسخه‌ای که از بازار نصب شده هیچ‌وقت نباید به درگاه بیرونی وصل بشه
  if(await isInstalledFromBazaar()){ return startBazaarPayment(); }
  if(btn){ btn.disabled = true; btn.textContent = "در حال اتصال به درگاه..."; }
  try{
    const isNative = (typeof Capacitor !== "undefined" && Capacitor.getPlatform() !== "web");
    const promoCodeVal = (document.getElementById("checkout_promo_input")?.value || checkoutPromoInput || "").trim();
    const { data, error } = await invokeEdge('request-payment', { body: { plan: selectedPremiumPlan, platform: isNative ? "native" : "web", promoCode: promoCodeVal || undefined } });
    if(error || !data?.paymentUrl){
      if(errEl) errEl.textContent = data?.error || "اتصال به درگاه ناموفق بود — دوباره امتحان کن.";
      if(btn){ btn.disabled = false; btn.textContent = "پرداخت و فعال‌سازی"; }
      return;
    }
    if (typeof Capacitor !== "undefined" && Capacitor.getPlatform() !== "web") {
      // تو اپ نصب‌شده: اول از دامنه‌ی واقعی رد می‌شیم تا زیبال Referrer معتبر ببینه
      location.href = "https://app.pelehapp.ir/pay-redirect.html?url=" + encodeURIComponent(data.paymentUrl);
    } else {
      // تو مرورگر وب: مسیر فعلی بدون تغییر
      location.href = data.paymentUrl; // کاربر به صفحه‌ی پرداخت زیبال می‌ره و بعد از پرداخت به همین اپ برمی‌گرده
    }
  }catch(e){
    if(errEl) errEl.textContent = "مشکل در اتصال — اینترنتت رو چک کن.";
    if(btn){ btn.disabled = false; btn.textContent = "پرداخت و فعال‌سازی"; }
  }
}
