/* ===================== پله — Admin dashboard ===================== */

/* ---- XSS safety: any text a USER typed (name, message, activity/task text, etc.) must go
   through this before landing in innerHTML here — this is the admin's own browser session,
   so an unescaped payload in someone's name/message would run WITH the admin's permissions,
   not just annoy the person who typed it. ---- */
function escapeHtml(str){
  if(str == null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const SUPABASE_URL = "https://gzcwtrqysjedwdfmhbzx.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_dRr5B_5OygCpBSVE3BZQSQ_MGFOybXL";
// storageKey جدا: پنل ادمین و خود اپ روی یه دامنه‌ان و قبلاً یه نشست ورود مشترک داشتن — یعنی اگه یه کاربر
// عادی تو admin.html لاگین می‌کرد (و چون ادمین نبود signOut می‌شد) یا ادمین از پنل خارج می‌شد، از خود
// اپ هم بیرون انداخته می‌شد. حالا این دو کاملاً مستقلن (فقط یه بار باید دوباره تو پنل لاگین کنی).
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { storageKey: "peleh-admin-auth", persistSession: true, autoRefreshToken: true, detectSessionInUrl: false }
});

const root = document.getElementById("root");

let session = null;
let isAdmin = false;
let authChecked = false;
let loginError = "";
let loginBusy = false;

let view = "dashboard"; // dashboard | users | behavior | support | premium | articles | promo | social
let users = [];
let pushOptInUserIds = new Set();
/* منبع نصب هر کاربر (جدول client_sources، migration 022) */
let clientSrcByUser = {};
let clientRolloutMs = null;      // اولین گزارش ثبت‌شده = شروع پخش نسخه‌ی جدید
let userSourceFilter = "all";
let supportMsgs = [];
let premiumReqs = [];
let dataLoading = false;
let promoCodes = [];
let promoCodesLoading = false;
let promoCodesLoadedOnce = false;
let promoFormOpen = false;
let promoFormError = "";
let promoFormSaving = false;
let promoFormKind = "gift_days"; // 'gift_days' | 'discount_percent'
let userSearch = "";
let revealedEmails = new Set();
let openDrawerUserId = null;
let openDrawerMsgId = null;
let openDrawerReqId = null;
let receiptUrlCache = {}; // path -> signed url

/* ---- Articles (public site's /articles.html + /articles/:slug.html read from this same
   `articles` table via the anon key — see assets/articles.js on the website repo. This admin
   view is the only place rows get written. ---- */
let articles = [];
let articlesLoading = false;
let articlesLoadedFor = false; // true once loaded at least once this session
let articleEditor = null; // null = list view; object = creating/editing a row
let articleEditorPreview = false;
let articleSaving = false;
let articleSaveError = "";
let articleCoverUploading = false;
let articleCoverError = "";

let challengeLBScope = "month"; // "month" | "year" — real per-period ranking, for picking real challenge winners
let challengeLBRows = [];
let challengeLBLoading = false;
let challengeLBLoadedFor = ""; // scope key already loaded, to avoid refetching on every render
let awardsRows = [];       // آخرین جایزه‌های خودکار لیدربورد (جدول leaderboard_awards)
let awardsLoaded = false;
let awardsLoading = false;

const PLAN_LABELS = {monthly:"ماهانه", quarterly:"۳ ماهه", semiannual:"۶ ماهه", yearly:"سالانه"};
const PLAN_DAYS = {monthly:30, quarterly:90, semiannual:180, yearly:365};

const ICONS = {
  dashboard: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>`,
  users: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 2.9-6.5 6.5-6.5s6.5 2.9 6.5 6.5"/><circle cx="17.5" cy="9" r="2.7"/><path d="M15.5 13.2c2.9.3 5 2.7 5 5.8"/></svg>`,
  support: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.5 8.5 0 0 1-11.8 7.8L3 21l1.7-6.2A8.5 8.5 0 1 1 21 11.5z"/></svg>`,
  premium: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 8l4 3 5-7 5 7 4-3-2 11H5L3 8z"/></svg>`,
  search: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>`,
  articles: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 3h8l5 5v12a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M14 3v5h5"/><path d="M8 12.5h8M8 16h8M8 9h3"/></svg>`,
  promo: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.6 12.9L12.9 20.6a2 2 0 0 1-2.8 0l-7.7-7.7a2 2 0 0 1 0-2.8L10.1 2.4H20.6z"/><circle cx="16" cy="8" r="1.5" fill="currentColor" stroke="none"/></svg>`,
  behavior: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 20h18"/><path d="M5 20v-5h3v5M10.5 20v-9h3v9M16 20V6h3v14"/></svg>`,
  social: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><path d="M17.5 14v3.2M17.5 17.2h-3.2M17.5 17.2h3.2M17.5 17.2v3.3"/></svg>`,
};

/* ---------- Jalali date helpers (copied from app.js so this stand-alone admin page
   can compute the same month/year period keys clients use when syncing `leaderboard`) ---------- */
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
function jalaliOf(dateObj){ return gregorianToJalali(dateObj.getFullYear(), dateObj.getMonth()+1, dateObj.getDate()); }
function jalaliMonthKey(dateObj = new Date()){ const [jy, jm] = jalaliOf(dateObj); return `${jy}-${String(jm).padStart(2,"0")}`; }
function jalaliYearKey(dateObj = new Date()){ const [jy] = jalaliOf(dateObj); return String(jy); }

function todayKeyLocal(d){
  d = d || new Date();
  return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
}
// خروجی همه‌ی ماسک‌ها escape‌شده‌ست (S1: دامنه‌ی ایمیل رو کاربر می‌نویسه)
function maskEmail(email){
  if(!email) return "—";
  email = String(email);
  const at = email.indexOf("@");
  if(at < 0) return escapeHtml(email);
  const local = email.slice(0, at), domain = email.slice(at);
  const shown = local.slice(0, Math.min(2, local.length));
  return escapeHtml(shown + "***" + domain);
}
// شناسه‌ها داخل onclick: فقط uuid یا عدد قبول می‌شه؛ هر چیز دیگه‌ای خالی می‌شه
function safeId(v){
  const t = String(v == null ? "" : v);
  return /^[0-9a-fA-F-]{1,64}$/.test(t) ? t : "";
}
function fmtDate(iso){
  if(!iso) return "—";
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("fa-IR");
}
function fmtToman(n){
  return (n||0).toLocaleString("fa-IR") + " تومان";
}
function booksOf(row){
  const d = (row && row.data) || {};
  const b = d.books || {};
  return {
    // همه‌ی مقادیر از data خود کاربره → عدد/تاریخ اجباری (S1: رشته‌ی HTML در امتیاز = XSS)
    points: Number(b.points) || 0,
    streak: Number(b.streak && b.streak.count) || 0,
    premium: b.premium === true,
    premiumUntil: (typeof b.premiumUntil === "string" && !isNaN(Date.parse(b.premiumUntil))) ? b.premiumUntil : null,
    finished: (Array.isArray(b.library) ? b.library : []).filter(x=>x && x.status==="finished").length,
    lastActive: (b.streak && typeof b.streak.lastDate === "string") ? b.streak.lastDate : null,
  };
}
// باید دقیقاً با LEVEL_THRESHOLDS و pointsOf/cumulativePoints تو app.js هماهنگ بمونه — این
// همون امتیازیه که سطح و باز شدن تم رو تو خودِ اپ تعیین می‌کنه، نه یه معیار جدا برای ادمین.
const LEVEL_THRESHOLDS = [0, 80, 200, 400, 700, 1100, 1600, 2200, 3000, 4000, 5200];
function levelOf(row){
  const d = (row && row.data) || {};
  const activities = d.activities || [];
  const ptsOf = {};
  activities.forEach(a => { ptsOf[a.id] = a.points || 0; });
  let earned = 0;
  Object.values(d.history || {}).forEach(ids => { (ids||[]).forEach(id => earned += (ptsOf[id]||0)); });
  const cum = Math.max(0, earned - (d.spent || 0));
  let level = 1;
  for(let i=1;i<LEVEL_THRESHOLDS.length;i++){ if(cum >= LEVEL_THRESHOLDS[i]) level = i+1; else break; }
  return {level, cum};
}

/* ---------- Auth ---------- */
async function boot(){
  sb.auth.onAuthStateChange((event, s)=>{
    session = s;
    if(event === "SIGNED_OUT"){ isAdmin = false; render(); }
  });
  try{
    const { data } = await sb.auth.getSession();
    session = data.session;
    if(session){ await checkAdmin(); }
  }catch(e){
    console.error("admin boot failed:", e);
    loginError = "اتصال برقرار نشد — اینترنت رو چک کن و صفحه رو رفرش کن.";
  }
  authChecked = true;
  render();
}
async function checkAdmin(){
  if(!session){ isAdmin = false; return; }
  try{
    const { data, error } = await sb.from("admins").select("user_id").eq("user_id", session.user.id).maybeSingle();
    isAdmin = !!data && !error;
  }catch(e){ isAdmin = false; }
}
async function doLogin(email, password){
  loginBusy = true; loginError = ""; render();
  let data, error;
  try{
    ({ data, error } = await sb.auth.signInWithPassword({ email: String(email||"").trim().toLowerCase(), password }));
  }catch(e){
    error = e;
  }
  if(error){
    // قبلاً خطای شبکه باعث می‌شد دکمه برای همیشه روی «در حال ورود» قفل بمونه
    loginError = /fetch|network/i.test(String(error.message||"")) ? "اتصال برقرار نشد — اینترنت رو چک کن." : "ایمیل یا رمز عبور اشتباهه.";
    loginBusy = false; render(); return;
  }
  session = data.session;
  await checkAdmin();
  loginBusy = false;
  if(!isAdmin){
    loginError = "این حساب دسترسی پنل مدیریت رو نداره.";
    try{ await sb.auth.signOut({ scope: "local" }); }catch(e){}
    session = null;
  } else {
    await loadAllData();
  }
  render();
}
async function doLogout(){
  try{ await sb.auth.signOut({ scope: "local" }); }catch(e){}
  session = null; isAdmin = false;
  render();
}

/* ---------- Data ---------- */
async function loadAllData(){
  dataLoading = true; render();
  const [{ data: u }, { data: s }, { data: p }, { data: pushSubs }, { data: srcRows }] = await Promise.all([
    sb.from("profiles").select("*").order("created_at", { ascending:false }),
    sb.from("support_messages").select("*").order("created_at", { ascending:false }),
    sb.from("premium_requests").select("*").order("created_at", { ascending:false }),
    sb.from("push_subscriptions").select("user_id"),
    sb.from("client_sources").select("user_id,source,app_version,first_seen,last_seen"),
  ]);
  users = u || [];
  supportMsgs = s || [];
  premiumReqs = p || [];
  pushOptInUserIds = new Set((pushSubs || []).map(r => r.user_id));
  clientSrcByUser = {};
  (srcRows || []).forEach(r => { clientSrcByUser[r.user_id] = r; });
  clientRolloutMs = (srcRows || []).length ? Math.min(...srcRows.map(r => new Date(r.first_seen).getTime())) : null;
  dataLoading = false;
  render();
}
/* ---------- Real challenge leaderboard (public.leaderboard table) ----------
   This is the actual, period-based ranking — not the client's own-account view and not
   the all-time "پرامتیازترین کاربران" table above. Use this one to pick real monthly/
   yearly challenge winners, since all-time points don't tell you who led THIS month/year. */
function setChallengeLBScope(s){
  challengeLBScope = s;
  loadChallengeLeaderboard();
}
async function loadChallengeLeaderboard(force){
  const col = challengeLBScope==="month" ? "month_points" : "year_points";
  const keyCol = challengeLBScope==="month" ? "month_key" : "year_key";
  const periodKey = challengeLBScope==="month" ? jalaliMonthKey() : jalaliYearKey();
  const loadKey = challengeLBScope+"|"+periodKey;
  if(!force && challengeLBLoadedFor===loadKey) return;
  challengeLBLoading = true; render();
  try{
    const { data } = await sb.from('leaderboard').select(`user_id,display_name,total_points,${col}`).eq(keyCol, periodKey).order(col, {ascending:false}).limit(50);
    challengeLBRows = data || [];
  }catch(e){ challengeLBRows = []; }
  challengeLBLoadedFor = loadKey;
  challengeLBLoading = false;
  render();
}
/* ---------- جایزه‌های خودکار (migration 013) ----------
   هر ماه/سال شمسی که تموم می‌شه، سرور خودش برنده‌ها رو حساب و جایزه رو اعمال می‌کنه. تنها کاری که
   دستی می‌مونه ارسال فیزیکی «کتاب» به نفر اول ماهه — اینجا لیستش هست و بعد از ارسال، تیکش رو بزن. */
async function loadAwards(force){
  if(awardsLoading || (awardsLoaded && !force)) return;
  awardsLoading = true;
  try{
    const { data, error } = await sb.from('leaderboard_awards')
      .select('id,scope,period_key,user_id,display_name,rank,points,prize,days,badge_id,fulfilled,review_status,reviewed_at,created_at')
      .order('id', {ascending:false}).limit(80);
    awardsRows = error ? [] : (data || []);
  }catch(e){ awardsRows = []; }
  awardsLoaded = true;
  awardsLoading = false;
  render();
}
async function markBookSent(id, sent){
  if(!(await adminRpc("admin_mark_award_sent", { p_id: id, p_sent: !!sent }))) return;
  const row = awardsRows.find(r => r.id === id);
  if(row) row.fulfilled = !!sent;
  render();
}
/* یک دکمه برای هر برنده: تأیید یا رد. تأیید → Premium خودکار شارژ می‌شه، نشان اضافه می‌شه، و برای نفر اول
   (کتاب) یه پیام پشتیبانی می‌ره که برای هماهنگی دریافت جایزه به ادمین پیام بده. */
async function reviewAward(id, approve){
  const a = awardsRows.find(r => r.id === id);
  if(!a) return;
  const who = a.display_name || "کاربر پله";
  const q = approve
    ? (a.prize === "book" ? `جایزه‌ی کتاب «${who}» تأیید بشه؟\nیه پیام براش می‌ره که برای هماهنگی ارسال به پشتیبانی پیام بده.`
       : a.prize === "premium_days" ? `${a.days} روز Premium برای «${who}» تأیید و همین الان شارژ بشه؟` : `نشان «${who}» تأیید بشه؟`)
    : `جایزه‌ی «${who}» رد بشه؟ (چیزی اعمال نمی‌شه)`;
  if(!confirm(q)) return;
  const r = await adminRpc("admin_review_award", { p_id: id, p_approve: !!approve });
  if(!r) return;
  a.review_status = approve ? "approved" : "rejected";
  render();
}
function awardPrizeLabel(a){
  if(a.prize === 'book') return '🎁 یک کتاب';
  if(a.prize === 'premium_days') return `💎 Premium ${faNum(a.days)} روزه`;
  return a.badge_id === 'monthly_top3' || a.badge_id === 'yearly_top3' ? '🥉 نشان نفر سوم' : '🏅 نشان Top 10';
}
function awardActionCell(a){
  const st = a.review_status || 'approved';
  if(st === 'pending') return `<div class="btn-row">
      <button class="row-btn on" onclick="reviewAward(${safeId(a.id)}, true)">✓ تأیید</button>
      <button class="row-btn danger" onclick="reviewAward(${safeId(a.id)}, false)">رد</button></div>`;
  if(st === 'rejected') return `<span class="badge rejected">رد شد</span>`;
  if(a.prize === 'book') return a.fulfilled
    ? `<button class="row-btn" onclick="markBookSent(${safeId(a.id)}, false)">✓ ارسال شد (برگردان)</button>`
    : `<span class="badge pending">منتظر پیام برنده</span> <button class="row-btn" onclick="markBookSent(${safeId(a.id)}, true)">📦 ارسال شد</button>`;
  return `<span class="badge approved">${a.prize === 'premium_days' ? 'شارژ شد' : 'اعمال شد'}</span>`;
}
function expectedPrizeLabel(i, scope){
  if(i > 9) return ``;
  const t = scope === 'year'
    ? (i === 0 ? '💎 Premium ۳۶۵ روزه' : i === 1 ? '💎 Premium ۹۰ روزه' : i === 2 ? '🥉 نشان نفر سوم' : '🏅 نشان Top 10')
    : (i === 0 ? '🎁 یک کتاب' : i === 1 ? '💎 Premium ۳۰ روزه' : i === 2 ? '🥉 نشان نفر سوم' : '🏅 نشان Top 10');
  return `<span class="badge">${t}</span>`;
}
function renderAwardsPanel(){
  const pending = awardsRows.filter(r => r.review_status === 'pending');
  const pendingBooks = awardsRows.filter(r => r.prize === 'book' && r.review_status === 'approved' && !r.fulfilled);
  const periods = [];
  awardsRows.forEach(a => { const k = a.scope + '|' + a.period_key; if(!periods.includes(k)) periods.push(k); });
  return `
    <div class="panel" style="margin-bottom:22px;" id="awards-panel">
      <div class="panel-head">
        <h3>🏆 نفرات برتر و جایزه‌ها</h3>
        <div class="btn-row"><button class="row-btn" onclick="loadAwards(true)">بازخوانی</button></div>
      </div>
      <div class="page-sub" style="padding:0 20px 10px;">آخر هر ماه/سال شمسی برنده‌ها خودکار حساب می‌شن، ولی تا تو تأیید نکنی هیچ جایزه‌ای اعمال نمی‌شه.
        با «تأیید»: Premium خودکار شارژ می‌شه، نشان اضافه می‌شه و برای نفر اول (کتاب) پیامی می‌ره که برای هماهنگی دریافت جایزه به پشتیبانی پیام بده.</div>
      ${pending.length ? `<div class="page-sub" style="padding:0 20px 10px; color:var(--amber);">⏳ ${faNum(pending.length)} جایزه منتظر تأیید توئه.</div>` : ``}
      ${pendingBooks.length ? `<div class="page-sub" style="padding:0 20px 10px; color:var(--gold);">📦 ${faNum(pendingBooks.length)} کتاب برای ارسال مونده: ${pendingBooks.map(r => escapeHtml(r.display_name)).join('، ')}</div>` : ``}
      ${awardsLoading && !awardsLoaded ? `<div class="empty-state">در حال بارگذاری...</div>` :
        awardsRows.length ? periods.map(k => {
          const [scope, key] = k.split('|');
          const rows = awardsRows.filter(a => a.scope === scope && a.period_key === key).sort((x, y) => x.rank - y.rank);
          return `<div class="award-period"><div class="award-period-h">${scope === 'year' ? 'سال ' : 'ماه '}${escapeHtml(key)}</div>
          <table>
            <thead><tr><th>رتبه</th><th>نام</th><th>امتیاز</th><th>جایزه</th><th></th></tr></thead>
            <tbody>${rows.map(a => `
              <tr>
                <td data-label="رتبه" class="mono">${a.rank === 1 ? '🥇' : a.rank === 2 ? '🥈' : a.rank === 3 ? '🥉' : fa(a.rank)}</td>
                <td data-label="نام">${escapeHtml(a.display_name || 'کاربر پله')}</td>
                <td data-label="امتیاز" class="mono">${faNum(a.points)}</td>
                <td data-label="جایزه">${awardPrizeLabel(a)}</td>
                <td>${awardActionCell(a)}</td>
              </tr>`).join('')}</tbody>
          </table></div>`; }).join('')
        : `<div class="empty-state">هنوز دوره‌ای پردازش نشده. برنده‌های ماه جاری آخر ماه همین‌جا برای تأیید میان.</div>`}
    </div>
  `;
}
async function adminRpc(fn, args){
  const { data, error } = await sb.rpc(fn, args);
  if(error){ alert("انجام نشد: " + (error.message || "خطای ناشناخته")); return null; }
  return data === null ? true : data;
}
async function refreshUserRow(userId){
  const { data } = await sb.from("profiles").select("*").eq("id", userId).maybeSingle();
  const row = users.find(u => u.id === userId);
  if(data && row) Object.assign(row, data);
  render();
}
async function activatePremiumFor(userRow, months, label){
  if(!userRow){ alert("این کاربر توی لیست کاربران پیدا نشد (شاید نیاز به بازخوانی داری)."); return; }
  if(!confirm(`اشتراک Premium ${label} برای «${userRow.name || userRow.email || "این کاربر"}» فعال بشه؟`)) return;
  if(await adminRpc("admin_grant_premium", { p_user: userRow.id, p_days: 0, p_months: months, p_label: label })) await refreshUserRow(userRow.id);
}
async function deactivatePremium(userRow){
  if(!userRow){ alert("این کاربر توی لیست کاربران پیدا نشد (شاید نیاز به بازخوانی داری)."); return; }
  if(!confirm(`اشتراک Premium «${userRow.name || userRow.email || "این کاربر"}» غیرفعال بشه؟`)) return;
  if(await adminRpc("admin_revoke_premium", { p_user: userRow.id })) await refreshUserRow(userRow.id);
}
async function markMessage(msg, patch){
  await sb.from("support_messages").update(patch).eq("id", msg.id);
  Object.assign(msg, patch);
  render();
}
async function sendAdminChatMessage(userId, text){
  if(!text.trim()) return;
  const { error } = await sb.from("support_messages").insert({user_id: userId, sender:"admin", body: text.trim()});
  if(error){ console.error("sendAdminChatMessage failed:", error); alert("ارسال پاسخ موفق نبود: " + error.message); return; }
  await loadThreadFor(userId);
}
async function getReceiptUrl(path){
  if(receiptUrlCache[path]) return receiptUrlCache[path];
  const { data, error } = await sb.storage.from("receipts").createSignedUrl(path, 3600);
  if(error || !data) return null;
  receiptUrlCache[path] = data.signedUrl;
  return data.signedUrl;
}
async function approvePremiumRequest(reqRow){
  if(!reqRow) return;
  const r = await adminRpc("admin_review_premium_request", { p_id: reqRow.id, p_approve: true });
  if(!r) return;
  reqRow.status = "approved"; reqRow.reviewed_at = new Date().toISOString();
  await refreshUserRow(reqRow.user_id);
}
async function rejectPremiumRequest(reqRow){
  if(!reqRow) return;
  const r = await adminRpc("admin_review_premium_request", { p_id: reqRow.id, p_approve: false });
  if(!r) return;
  reqRow.status = "rejected"; reqRow.reviewed_at = new Date().toISOString();
  render();
}

/* ---------- Render root ---------- */
function render(){
  if(!authChecked){ root.innerHTML = `<div class="loading-state" style="padding-top:120px;">در حال بارگذاری...</div>`; return; }
  if(!session || !isAdmin){ renderLogin(); return; }
  renderShell();
}
function renderLogin(){
  root.innerHTML = `
    <div class="login-wrap">
      <div class="login-card">
        <div class="login-brand"><span class="stair"><i></i><i></i><i></i></span> پله</div>
        <div class="login-sub">ورود به پنل مدیریت</div>
        <div class="login-field"><label>ایمیل</label><input type="email" id="li_email" autocomplete="username"></div>
        <div class="login-field"><label>رمز عبور</label><input type="password" id="li_pass" autocomplete="current-password"></div>
        <button class="login-btn" ${loginBusy?"disabled":""} onclick="onLoginClick()">${loginBusy?"در حال ورود...":"ورود"}</button>
        <div class="login-error">${loginError}</div>
      </div>
    </div>
  `;
  const passEl = document.getElementById("li_pass");
  if(passEl) passEl.addEventListener("keydown", e=>{ if(e.key==="Enter") onLoginClick(); });
}
function onLoginClick(){
  const email = document.getElementById("li_email").value.trim();
  const pass = document.getElementById("li_pass").value;
  if(!email || !pass) return;
  doLogin(email, pass);
}

function renderShell(){
  if(users.length===0 && supportMsgs.length===0 && premiumReqs.length===0 && !dataLoading){ loadAllData(); }
  const unreadCount = supportMsgs.filter(m=>m.sender==="user" && !m.read_by_admin).length;
  const pendingPremium = premiumReqs.filter(r=>r.status==="pending").length;
  root.innerHTML = `
    ${renderMobileAdminTop()}
    <div class="shell">
      <div class="sidebar">
        <div class="sidebar-brand"><span class="stair"><i></i><i></i><i></i></span> پله ادمین</div>
        <div class="nav-item ${view==='dashboard'?'active':''}" onclick="setView('dashboard')">${ICONS.dashboard}<span>داشبورد</span></div>
        <div class="nav-item ${view==='users'?'active':''}" onclick="setView('users')">${ICONS.users}<span>کاربران</span></div>
        <div class="nav-item ${view==='behavior'?'active':''}" onclick="setView('behavior')">${ICONS.behavior}<span>رفتار کاربران</span></div>
        <div class="nav-item ${view==='premium'?'active':''}" onclick="setView('premium')">${ICONS.premium}<span>درخواست‌های Premium</span>${pendingPremium?`<span class="nav-badge amber">${pendingPremium}</span>`:``}</div>
        <div class="nav-item ${view==='support'?'active':''}" onclick="setView('support')">${ICONS.support}<span>پشتیبانی</span>${unreadCount?`<span class="nav-badge">${unreadCount}</span>`:``}</div>
        <div class="nav-item ${view==='articles'?'active':''}" onclick="setView('articles')">${ICONS.articles}<span>مقالات</span></div>
        <div class="nav-item ${view==='promo'?'active':''}" onclick="setView('promo')">${ICONS.promo}<span>کدهای تخفیف</span></div>
        <div class="nav-item ${view==='social'?'active':''}" onclick="setView('social')">${ICONS.social}<span>شبکه‌های اجتماعی</span></div>
        <div class="nav-item ${view==='reading'?'active':''}" onclick="setView('reading')">${pi("books")}<span>امتیاز کتاب (ضدتقلب)</span>${readingAdmin.flagged?`<span class="nav-badge amber">${readingAdmin.flagged}</span>`:""}</div>
      <div class="nav-item ${view==='plus'?'active':''}" onclick="setView('plus')"><span style="width:18px; text-align:center;">💎</span><span>سلامت پلاس (بتا)</span></div>
        <div class="nav-item ${view==='announce'?'active':''}" onclick="setView('announce')"><span style="width:18px; text-align:center;">📣</span><span>پیام همگانی</span></div>
        <div class="sidebar-foot">
          <div class="sidebar-email">${escapeHtml(session.user.email)}</div>
          <button class="signout-btn" onclick="doLogout()">خروج از حساب</button>
        </div>
      </div>
      <div class="main">
        ${view==="dashboard" ? renderDashboard() : view==="users" ? renderUsersView() : view==="behavior" ? renderBehaviorView() : view==="premium" ? renderPremiumView() : view==="articles" ? renderArticlesView() : view==="promo" ? renderPromoView() : view==="social" ? renderSocialView() : view==="plus" ? renderPlusAdminView() : view==="reading" ? renderReadingAdminView() : view==="announce" ? renderAnnounceView() : renderSupportView()}
      </div>
    </div>
    ${renderMobileAdminNav(unreadCount, pendingPremium)}
    ${renderUserDrawer()}
    ${renderMsgDrawer()}
    ${renderReqDrawer()}
    ${renderBehaviorDrawer()}
  `;
}
function setView(v){ view = v; adminMenuOpen = false; if(v === "plus") loadPlusAdmin(true); if(v === "reading") loadReadingAdmin(); if(v === "announce") loadAnnouncements(); loadAllData(); try{ window.scrollTo(0, 0); }catch(e){} }

/* ---------- پنل ادمین روی موبایل (طراحی نهایی v2.4.0) ----------
   نوار بالا (برند + منو) و نوار پایین ۵تایی: داشبورد، کاربران، پشتیبانی، ضدتقلب، همه. «همه» یه برگه با همه‌ی بخش‌ها
   و شمارنده‌ها باز می‌کنه. روی دسکتاپ (بیشتر از ۸۶۰ پیکسل) همون نوار کناری قبلی می‌مونه. */
let adminMenuOpen = false;
const ADMIN_SECTIONS = [
  ["dashboard", "داشبورد", "dashboard"], ["users", "کاربران", "users"], ["behavior", "رفتار کاربران", "behavior"],
  ["premium", "درخواست‌های Premium", "premium"], ["support", "پشتیبانی", "support"], ["articles", "مقالات", "articles"],
  ["promo", "کدهای تخفیف", "promo"], ["social", "شبکه‌های اجتماعی", "social"], ["reading", "امتیاز کتاب (ضدتقلب)", "books"],
  ["plus", "سلامت پلاس", "gem"],
  ["announce", "پیام همگانی", "bell"],
];
function adminSectionIcon(k){ return ICONS[k] || pi(k); }
function toggleAdminMenu(open){ adminMenuOpen = open === undefined ? !adminMenuOpen : !!open; render(); }
function renderMobileAdminTop(){
  return `<div class="m-top"><div class="m-brand"><span class="stair"><i></i><i></i><i></i></span> پله <span class="m-badge">ادمین</span></div>
      <button class="m-ib" aria-label="منوی همه‌ی بخش‌ها" onclick="toggleAdminMenu(true)">${pi("menu")}</button></div>`;
}
function renderMobileAdminNav(unread, pendingPremium){
  const pendingAwards = (awardsRows || []).filter(r => r.review_status === "pending").length;
  const badge = { premium: pendingPremium, support: unread, reading: readingAdmin.flagged || 0, dashboard: pendingAwards };
  const tabs = [["dashboard", "داشبورد"], ["users", "کاربران"], ["support", "پشتیبانی"], ["reading", "ضدتقلب"]];
  const inTabs = tabs.some(t => t[0] === view);
  const b = n => n ? `<span class="m-nb" aria-label="${faNum(n)} مورد">${faNum(n)}</span>` : ``;
  return `<nav class="m-nav" aria-label="منوی ادمین">${tabs.map(([k, l]) => `<button class="m-tab ${view === k ? "on" : ""}" ${view === k ? `aria-current="page"` : ""} onclick="setView('${k}')">${adminSectionIcon(k === "reading" ? "books" : k)}<span>${l}</span>${b(badge[k])}</button>`).join("")}
      <button class="m-tab ${!inTabs ? "on" : ""}" onclick="toggleAdminMenu(true)">${pi("more")}<span>همه</span>${b((badge.premium || 0) + (pendingAwards && view !== "dashboard" ? 0 : 0))}</button></nav>
    ${adminMenuOpen ? `<div class="m-scrim" onclick="toggleAdminMenu(false)"></div>
    <div class="m-sheet" role="dialog" aria-label="همه‌ی بخش‌های ادمین"><div class="m-grab"></div>
      <div class="m-sheet-h"><b>همه‌ی بخش‌ها</b><button class="m-ib" aria-label="بستن" onclick="toggleAdminMenu(false)">${pi("x")}</button></div>
      <nav class="m-grid">${ADMIN_SECTIONS.map(([k, l, ic]) => `<button class="m-item ${view === k ? "on" : ""}" onclick="setView('${k}')">${badge[k] ? `<span class="m-nbd ${k === "support" ? "red" : ""}">${faNum(badge[k])}</span>` : ``}<span class="m-ic">${adminSectionIcon(ic)}</span>${l}</button>`).join("")}</nav>
      <div class="m-foot"><span>${escapeHtml(session.user.email)}</span><button class="row-btn danger" onclick="doLogout()">خروج</button></div>
    </div>` : ``}`;
}

/* ===================== پیام همگانی (migration 025) =====================
   یه پیام برای همه‌ی کاربرها: بنر بالای صفحه‌ی اصلی اپ (وب، وب‌اپ نصب‌شده، اندروید). همیشه حداکثر یک پیام فعاله. */
var announce = { loaded: false, loading: false, busy: false, error: "", rows: [], draft: { body: "", label: "", url: "" } };
async function loadAnnouncements(){
  announce.loading = true; announce.error = ""; render();
  try{
    const { data, error } = await sb.from("app_announcements").select("id,body,link_label,link_url,active,created_at").order("id", { ascending:false }).limit(15);
    if(error) throw error;
    announce.rows = data || [];
    announce.loaded = true;
  }catch(e){ announce.error = "بارگذاری پیام‌ها ناموفق بود: " + (e.message || e) + " (مایگریشن ۰۲۵ روی Supabase اجرا شده؟)"; }
  announce.loading = false; render();
}
function onAnnounceInput(field, value){ announce.draft[field] = value; if(field === "body"){ const c = document.getElementById("ann_count"); if(c) c.textContent = faNum(value.length) + " / ۶۰۰"; } }
async function publishAnnouncement(){
  const d = announce.draft;
  const body = d.body.trim(), url = d.url.trim(), label = d.label.trim();
  if(!body){ alert("متن پیام رو بنویس."); return; }
  if(body.length > 600){ alert("متن پیام حداکثر ۶۰۰ حرف می‌تونه باشه."); return; }
  if(url && !/^https:\/\/\S+$/.test(url)){ alert("لینک باید با https:// شروع بشه و فاصله نداشته باشه."); return; }
  if(!confirm("این پیام برای همه‌ی کاربرها نمایش داده بشه؟\n(اگه پیام فعال قبلی هست، جاش رو می‌گیره)")) return;
  announce.busy = true; render();
  const r = await adminRpc("admin_publish_announcement", { p_body: body, p_link_label: label || null, p_link_url: url || null });
  announce.busy = false;
  if(r){ announce.draft = { body: "", label: "", url: "" }; await loadAnnouncements(); } else render();
}
async function stopAnnouncement(){
  if(!confirm("پیام فعال از همه‌ی اپ‌ها برداشته بشه؟")) return;
  announce.busy = true; render();
  const r = await adminRpc("admin_stop_announcement", {});
  announce.busy = false;
  if(r) await loadAnnouncements(); else render();
}
function reuseAnnouncement(id){
  const a = announce.rows.find(r => r.id === id); if(!a) return;
  announce.draft = { body: a.body || "", label: a.link_label || "", url: a.link_url || "" };
  render(); try{ window.scrollTo(0, 0); }catch(e){}
}
function renderAnnounceView(){
  const d = announce.draft;
  const active = announce.rows.find(r => r.active);
  const history = announce.rows.filter(r => !r.active);
  const preview = d.body.trim() ? `
    <div class="drawer-label" style="margin:14px 0 6px;">پیش‌نمایش بنر</div>
    <div class="tip-banner" style="border-color:var(--gold-line); max-width:420px;">
      <span class="pi-gold" style="margin-top:3px;">${pi("bell")}</span>
      <div class="tip-banner-text">${escapeHtml(d.body.trim())}${d.url.trim() ? `<div style="margin-top:6px;"><span class="row-btn on" style="display:inline-block;">${escapeHtml(d.label.trim() || "مشاهده")}</span></div>` : ``}</div>
      <span class="tip-banner-close">${pi("x")}</span>
    </div>` : ``;
  return `
    <div class="topbar"><div><div class="page-title">پیام همگانی</div><div class="page-sub">بنری که همه‌ی کاربرها بالای صفحه‌ی اصلی اپ می‌بینن</div></div>
      <div class="btn-row"><button class="row-btn" onclick="loadAnnouncements()">بازخوانی</button></div></div>
    ${announce.error ? `<div class="panel" style="padding:14px 18px; margin-bottom:16px; color:var(--rose);">${escapeHtml(announce.error)}</div>` : ``}
    <div class="panel" style="margin-bottom:18px; padding:16px 20px;">
      <div class="drawer-label" style="margin-bottom:8px;">پیام فعال الان</div>
      ${announce.loading && !announce.loaded ? `<div class="empty-state">در حال بارگذاری...</div>` :
        active ? `
        <div class="tip-banner" style="border-color:var(--gold-line); margin-bottom:10px;">
          <span class="pi-gold" style="margin-top:3px;">${pi("bell")}</span>
          <div class="tip-banner-text">${escapeHtml(active.body)}${active.link_url ? `<div class="page-sub" style="margin-top:6px; direction:ltr; text-align:left;">${escapeHtml(active.link_label || "")} → ${escapeHtml(active.link_url)}</div>` : ``}</div>
        </div>
        <div class="page-sub" style="margin-bottom:10px;">از ${fmtDate(active.created_at)} فعاله. هر کاربر بعد از بستنش دیگه نمی‌بینه.</div>
        <button class="row-btn danger" ${announce.busy ? "disabled" : ""} onclick="stopAnnouncement()">برداشتن پیام از همه‌ی اپ‌ها</button>` :
        `<div class="empty-state">الان هیچ پیامی فعال نیست.</div>`}
    </div>
    <div class="panel" style="margin-bottom:18px; padding:16px 20px;">
      <div class="drawer-label" style="margin-bottom:8px;">پیام جدید</div>
      <div class="field"><label>متن پیام <span id="ann_count" style="color:var(--muted);">${faNum(d.body.length)} / ۶۰۰</span></label>
        <textarea class="textbox" rows="5" maxlength="600" placeholder="مثلاً: چالش ۳۰ روزه‌ی پله شروع شد! هر روز عادت‌هات رو تیک بزن و تو جدول برترها بالا بیا." oninput="onAnnounceInput('body', this.value)">${escapeHtml(d.body)}</textarea></div>
      <div class="field"><label>دکمه‌ی لینک (اختیاری)</label>
        <input class="textbox" type="text" maxlength="40" placeholder="متن دکمه، مثلاً: جزئیات چالش" value="${escapeHtml(d.label)}" oninput="onAnnounceInput('label', this.value)">
        <input class="textbox" type="text" dir="ltr" maxlength="500" style="margin-top:8px; text-align:left;" placeholder="https://..." value="${escapeHtml(d.url)}" oninput="onAnnounceInput('url', this.value)"></div>
      ${preview}
      <div class="page-sub" style="margin:12px 0;">پیام برای اپ‌های وب و وب‌اپ نصب‌شده بلافاصله می‌رسه. اپ‌های اندروید فقط از نسخه‌ای که این قابلیت رو داخلش داره (۲.۴.۲ به بعد) پیام رو می‌گیرن.</div>
      <button class="row-btn on" ${announce.busy ? "disabled" : ""} onclick="publishAnnouncement()">${announce.busy ? "در حال ارسال..." : "ارسال برای همه"}</button>
    </div>
    ${history.length ? `<div class="panel" style="padding:16px 20px;">
      <div class="drawer-label" style="margin-bottom:8px;">پیام‌های قبلی</div>
      ${history.map(a => `<div style="padding:10px 0; border-top:1px solid var(--border);">
        <div style="font-size:13px; line-height:1.9;">${escapeHtml(a.body)}</div>
        <div class="page-sub" style="margin:4px 0 6px;">${fmtDate(a.created_at)}</div>
        <button class="row-btn" onclick="reuseAnnouncement(${safeId(a.id)})">استفاده‌ی دوباره</button></div>`).join("")}
    </div>` : ``}
  `;
}

/* ===================== امتیاز کتاب (ضدتقلب، migration 019) =====================
   نفرات برتر این ماه با نشانه‌های مشکوک (قبل از جایزه‌ی خودکار بررسی کن) + جریمه‌ها و برگردوندنشون (اعتراض). */
var readingAdmin = { loading: false, data: null, error: "", flagged: 0 };
async function loadReadingAdmin(){
  readingAdmin.loading = true; readingAdmin.error = ""; render();
  try{
    const { data, error } = await sb.rpc("reading_admin_overview");
    if(error) throw error;
    readingAdmin.data = data;
    readingAdmin.flagged = (data.top || []).filter(t => (t.flags || []).length).length;
  }catch(e){ readingAdmin.error = (e && e.message) || "بارگذاری نشد"; }
  readingAdmin.loading = false; render();
}
async function toggleReadingIntegrity(turnOn){
  const msg = turnOn
    ? "ضدتقلب فعال بشه؟\n\n• از این لحظه امتیاز جدول فقط سمت سرور حساب می‌شه.\n• نسخه‌های قدیمی بازار (بدون ضدتقلب) دیگه روی جدول اثر ندارن.\n• امتیاز فعلی همه با سقف ۶ ساعت در روز به‌عنوان «پایه» ثبت می‌شه.\n• جریمه‌ها و داوری پایان کتاب فعال می‌شن.\n\nقبلش مطمئن شو نسخه‌ی جدید بازار منتشر شده و چالش تموم شده."
    : "ضدتقلب خاموش بشه؟\n\nنسخه‌ها دوباره مثل قبل امتیاز جدول رو مستقیم می‌نویسن (قابل تقلب). امتیازهایی که در دوره‌ی فعال بودن سرور حساب کرده با نوشتن دوباره‌ی اپ‌ها بازنویسی می‌شن. فقط برای شرایط اضطراری.";
  if(!confirm(msg)) return;
  const { data, error } = await sb.rpc("admin_set_reading_integrity", { p_on: !!turnOn });
  if(error){ alert(error.message || "انجام نشد"); return; }
  alert(turnOn ? `ضدتقلب فعال شد. پایه‌ی امتیاز برای ${(data && data.baseline_users) || 0} نفر ثبت شد.` : "ضدتقلب خاموش شد.");
  loadReadingAdmin();
}
async function reverseReadingPenalty(id){
  if(!confirm("این جریمه برگردونده بشه و امتیاز کاربر برگرده؟ (برای اعتراض پذیرفته‌شده)")) return;
  const { error } = await sb.rpc("reading_admin_reverse_penalty", { p_id: id });
  if(error){ alert(error.message || "انجام نشد"); return; }
  loadReadingAdmin();
}
function renderReadingAdminView(){
  const d = readingAdmin.data || { top: [], penalties: [] };
  const fa = n => String(n == null ? 0 : n).replace(/[0-9]/g, x => "۰۱۲۳۴۵۶۷۸۹"[x]);
  return `<div class="topbar"><div><div class="page-title">امتیاز کتاب (ضدتقلب)</div>
      <div class="page-sub">ماه ${escapeHtml(fa(d.month_key || ""))} · سقف ۶ ساعت در روز، ۳ دقیقه به ازای هر صفحه · جریمه فقط روی امتیاز جدول</div></div>
      <button class="row-btn" onclick="loadReadingAdmin()">بازخوانی</button></div>
    ${readingAdmin.error ? `<div class="panel" style="padding:14px 18px; margin-bottom:16px; color:var(--rose);">${escapeHtml(readingAdmin.error)}</div>` : ``}
    ${readingAdmin.loading && !readingAdmin.data ? `<div class="panel" style="padding:18px;">در حال بارگذاری...</div>` : ``}
    ${readingAdmin.data ? `<div class="panel" style="padding:16px 18px; margin-bottom:18px; border:1px solid ${d.enforced ? "var(--emerald)" : "var(--amber)"};">
      <div style="display:flex; justify-content:space-between; align-items:center; gap:14px; flex-wrap:wrap;">
        <div>
          <div style="font-weight:800; font-size:15px;">وضعیت ضدتقلب: ${d.enforced ? "✅ فعال" : "⏸ خاموش"}</div>
          <div class="page-sub" style="margin-top:6px; line-height:1.9;">${d.enforced
            ? `امتیاز جدول فقط سمت سرور حساب می‌شه، نسخه‌های قدیمی اثری ندارن و جریمه‌ها فعالن.${d.enforced_at ? ` (از ${escapeHtml(fmtDate(d.enforced_at))})` : ``}`
            : `همه‌ی نسخه‌ها (بازار قدیمی هم) مثل قبل امتیاز جدول رو مستقیم می‌نویسن؛ قابل تقلبه و جریمه‌ای اعمال نمی‌شه. بعد از چالش و انتشار نسخه‌ی جدید بازار روشنش کن.`}</div>
        </div>
        <button class="row-btn ${d.enforced ? "" : "on"}" onclick="toggleReadingIntegrity(${!d.enforced})">${d.enforced ? "خاموش کردن (اضطراری)" : "فعال‌سازی ضدتقلب"}</button>
      </div>
    </div>` : ``}
    <div class="panel" style="margin-bottom:18px;">
      <table><thead><tr><th>نام</th><th>امتیاز ماه</th><th>دقیقه</th><th>روز فعال</th><th>کتاب تأییدشده</th><th>تخلف</th><th>نشانه‌ها</th></tr></thead>
      <tbody>${(d.top || []).map(t => `<tr>
        <td>${escapeHtml(t.display_name || "")}</td><td class="mono">${fa(t.month_points)}</td><td class="mono">${fa(t.minutes)}</td>
        <td class="mono">${fa(t.active_days)}</td><td class="mono">${fa(t.verified_books)}</td><td class="mono">${fa(t.offenses)}</td>
        <td>${(t.flags || []).map(f => `<span class="badge pending">${escapeHtml(f)}</span>`).join(" ") || `<span class="badge read">—</span>`}</td></tr>`).join("")
        || `<tr><td colspan="7" style="color:var(--muted);">هنوز کسی امتیاز این ماه نداره.</td></tr>`}</tbody></table>
    </div>
    <div class="page-title" style="font-size:17px; margin-bottom:10px;">جریمه‌ها</div>
    <div class="panel">
      <table><thead><tr><th>کاربر</th><th>کتاب</th><th>بار</th><th>پس‌گرفته</th><th>جریمه</th><th>دلیل و نشانه‌ها</th><th>وضعیت</th><th></th></tr></thead>
      <tbody>${(d.penalties || []).map(p => `<tr>
        <td>${escapeHtml(p.name || "")}</td><td>${escapeHtml(p.book_title || "")}</td><td class="mono">${fa(p.level)}</td>
        <td class="mono">${fa(-p.clawback)}</td><td class="mono">${fa(-p.penalty)}</td>
        <td style="max-width:320px;">${escapeHtml(p.reason || "")}<div class="page-sub">${[
          p.signals && p.signals.pasted ? "چسباندن" : "", p.signals && p.signals.too_fast ? "تایپ غیرعادی سریع" : "",
          p.signals && p.signals.duplicate ? "جواب تکراری با کاربر دیگه" : "", p.signals && p.signals.ai_suspect ? "متن آماده" : "",
          p.signals && p.signals.score != null ? "نمره " + fa(p.signals.score) : ""].filter(Boolean).join(" · ")}</div></td>
        <td><span class="badge ${p.status === "active" ? "rejected" : "approved"}">${p.status === "active" ? "فعال" : "برگشت‌خورده"}</span></td>
        <td>${p.status === "active" ? `<button class="row-btn" onclick="reverseReadingPenalty(${safeId(p.id)})">برگردوندن (اعتراض)</button>` : ``}</td></tr>`).join("")
        || `<tr><td colspan="8" style="color:var(--muted);">جریمه‌ای ثبت نشده.</td></tr>`}</tbody></table>
    </div>`;
}

/* ---------- Dashboard ---------- */
function renderDashboard(){
  const users = realUsers(); // حساب‌های تست به‌صورت پیش‌فرض از همه‌ی آمارها حذف‌ان
  const total = users.length;
  const premiumCount = users.filter(u=>booksOf(u).premium).length;
  const today = todayKeyLocal();
  const activeToday = users.filter(u=>booksOf(u).lastActive===today).length;
  const onlineNow = users.filter(u=> u.last_seen && (Date.now() - new Date(u.last_seen).getTime()) < 5*60*1000).length;
  const unread = supportMsgs.filter(m=>m.sender==="user" && !m.read_by_admin).length;
  const pendingPremium = premiumReqs.filter(r=>r.status==="pending").length;
  const pushOptInCount = users.filter(u => pushOptInUserIds.has(u.id)).length;

  const levels = users.map(u => levelOf(u).level);
  const levelCounts = LEVEL_THRESHOLDS.map((_,i) => levels.filter(l=>l===i+1).length);
  const levelMax = Math.max(1, ...levelCounts);

  const days = [];
  for(let i=13;i>=0;i--){ const d = new Date(); d.setDate(d.getDate()-i); days.push(todayKeyLocal(d)); }
  const signupCounts = days.map(dk => users.filter(u=> u.created_at && todayKeyLocal(new Date(u.created_at))===dk).length);
  const signupMax = Math.max(1, ...signupCounts);
  const msgCounts = days.map(dk => supportMsgs.filter(m=> m.created_at && todayKeyLocal(new Date(m.created_at))===dk).length);
  const msgMax = Math.max(1, ...msgCounts);

  const leaderboard = users.slice().sort((a,b)=> booksOf(b).points - booksOf(a).points).slice(0,5);

  if(!challengeLBLoading && challengeLBLoadedFor !== (challengeLBScope+"|"+(challengeLBScope==="month"?jalaliMonthKey():jalaliYearKey()))) loadChallengeLeaderboard();
  if(!awardsLoaded && !awardsLoading) loadAwards();
  const periodLabel = challengeLBScope==="month" ? "این ماه" : "امسال";
  const lbCol = challengeLBScope==="month" ? "month_points" : "year_points";

  return `
    <div class="topbar"><div><div class="page-title">داشبورد</div><div class="page-sub">نمای کلی از فعالیت پله${includeTestUsers ? "" : " — بدون حساب‌های تست"}</div></div>
      ${testToggleBtn()}</div>
    <div class="kpi-row">
      <div class="kpi-card"><div class="kpi-label">کل کاربران</div><div class="kpi-value">${total}</div></div>
      <div class="kpi-card"><div class="kpi-label">آنلاین الان (۵ دقیقه اخیر)</div><div class="kpi-value emerald">${onlineNow}</div></div>
      <div class="kpi-card"><div class="kpi-label">مطالعه‌ی امروز</div><div class="kpi-value">${activeToday}</div></div>
      <div class="kpi-card"><div class="kpi-label">کاربران Premium</div><div class="kpi-value gold">${premiumCount}</div></div>
      <div class="kpi-card" style="cursor:pointer;" onclick="const el=document.getElementById('awards-panel'); if(el) el.scrollIntoView({behavior:'smooth'});"><div class="kpi-label">در انتظار بررسی</div><div class="kpi-value amber">${faNum(pendingPremium + unread + (awardsRows || []).filter(r => r.review_status === "pending").length)}</div><div class="page-sub">رسید، پیام و جایزه‌ی برترها</div></div>
      <div class="kpi-card"><div class="kpi-label">یادآوری فعال</div><div class="kpi-value emerald">${pushOptInCount} <span style="font-size:12px; color:var(--muted);">از ${total}</span></div></div>
    </div>
    <div class="pulse-card">
      <div class="pulse-head"><div class="pulse-title">پخش سطح کاربران <span>بر اساس همون امتیازی که تو اپ سطح/تم رو تعیین می‌کنه</span></div></div>
      <div class="stair-chart">
        ${levelCounts.map((c,i)=>`<div class="stair-bar" style="height:${Math.max(6, c/levelMax*100)}%;"><span class="tip">سطح ${i+1} · ${c} نفر</span></div>`).join("")}
      </div>
    </div>
    <div class="pulse-card">
      <div class="pulse-head"><div class="pulse-title">نبض پله <span>عضویت‌های ۱۴ روز اخیر</span></div></div>
      <div class="stair-chart">
        ${signupCounts.map((c,i)=>`<div class="stair-bar" style="height:${Math.max(6, c/signupMax*100)}%;"><span class="tip">${days[i].slice(5)} · ${c} نفر</span></div>`).join("")}
      </div>
    </div>
    <div class="pulse-card">
      <div class="pulse-head"><div class="pulse-title">حجم پیام‌های پشتیبانی <span>۱۴ روز اخیر</span></div></div>
      <div class="stair-chart">
        ${msgCounts.map((c,i)=>`<div class="stair-bar" style="height:${Math.max(6, c/msgMax*100)}%; background:linear-gradient(180deg, var(--emerald) 0%, var(--ok-soft) 100%);"><span class="tip">${days[i].slice(5)} · ${c} پیام</span></div>`).join("")}
      </div>
    </div>
    <div class="panel" style="margin-bottom:22px;">
      <div class="panel-head"><h3>پرامتیازترین کاربران</h3></div>
      ${leaderboard.length ? `
      <table>
        <thead><tr><th>نام</th><th>امتیاز کتاب</th><th>استریک</th></tr></thead>
        <tbody>
          ${leaderboard.map(u=>{ const b = booksOf(u); return `
            <tr><td data-label="نام">${escapeHtml(u.name)||"—"}</td><td data-label="امتیاز" class="mono">${b.points}</td><td data-label="استریک" class="mono">${b.streak}</td></tr>
          `; }).join("")}
        </tbody>
      </table>` : `<div class="empty-state">هنوز داده‌ای نیست.</div>`}
    </div>
    <div class="panel" style="margin-bottom:22px;">
      <div class="panel-head">
        <h3>🏆 رتبه‌بندی واقعی چالش‌ها — ${periodLabel}</h3>
        <div class="btn-row">
          <button class="row-btn ${challengeLBScope==='month'?'on':''}" onclick="setChallengeLBScope('month')">ماهانه</button>
          <button class="row-btn ${challengeLBScope==='year'?'on':''}" onclick="setChallengeLBScope('year')">سالانه</button>
        </div>
      </div>
      <div class="page-sub" style="padding:0 20px 10px;">این جدول همون رتبه‌بندی واقعیه که کاربرها توی اپ می‌بینن (بر اساس امتیاز ${challengeLBScope==='month'?'همین ماه':'همین سال'})؛ نفر اولش برنده‌ی واقعی چالشه. آخر دوره، ۱۰ نفر اول در بخش «نفرات برتر و جایزه‌ها» برای تأیید تو میان.</div>
      ${challengeLBLoading ? `<div class="empty-state">در حال بارگذاری رتبه‌بندی...</div>` :
        challengeLBRows.length ? `
      <table>
        <thead><tr><th>رتبه</th><th>نام</th><th>امتیاز ${periodLabel}</th><th></th></tr></thead>
        <tbody>
          ${challengeLBRows.map((r,i)=>`
            <tr ${i===0?'style="background:var(--gold-soft);"':''}>
              <td data-label="رتبه" class="mono">${i+1}${i===0?' 🥇':i===1?' 🥈':i===2?' 🥉':''}</td>
              <td data-label="نام">${escapeHtml(r.display_name||"کاربر پله")}</td>
              <td data-label="امتیاز" class="mono">${faNum(r[lbCol]||0)}</td>
              <td data-label="جایزه‌ی آخر دوره">${expectedPrizeLabel(i, challengeLBScope)}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>` : `<div class="empty-state">هنوز کسی توی این بازه امتیازی نگرفته.</div>`}
    </div>
    ${renderAwardsPanel()}
    <div class="panel"><div class="panel-head"><h3>آخرین کاربران</h3></div>${renderUsersTable(users.slice(0,6))}</div>
  `;
}

/* ---------- Users view ---------- */
/* منبع نصب: bazaar | direct | pwa | web از گزارش خود اپ؛ بقیه حدسی:
   old_app = بعد از شروع پخش نسخه‌ی جدید فعال بوده ولی هیچ گزارشی نفرستاده ← اپ قدیمی (بازار یا مستقیم، قابل تفکیک نیست)
   unknown = از شروع پخش تا حالا وارد نشده */
const SOURCE_LABELS = { bazaar:"بازار", direct:"APK مستقیم", pwa:"وب (نصب‌شده)", web:"وب (مرورگر)", old_app:"اپ قدیمی", unknown:"نامشخص" };
const SOURCE_BADGE = { bazaar:"approved", direct:"premium", pwa:"free", web:"free", old_app:"pending", unknown:"free" };
const SOURCE_FILTERS = [
  ["all","همه"], ["need_notice","نیاز به اطلاع‌رسانی (بازار + اپ قدیمی)"], ["bazaar","بازار"], ["direct","APK مستقیم"],
  ["web","وب (PWA و مرورگر)"], ["old_app","اپ قدیمی"], ["unknown","نامشخص"],
];
function userSource(u){
  const r = clientSrcByUser[u.id];
  if(r) return r.source;
  if(clientRolloutMs && u.last_seen && new Date(u.last_seen).getTime() >= clientRolloutMs) return "old_app";
  return "unknown";
}
function sourceMatches(u, f){
  if(f === "all") return true;
  const k = userSource(u);
  if(f === "need_notice") return k === "bazaar" || k === "old_app";
  if(f === "web") return k === "web" || k === "pwa";
  return k === f;
}
function setSourceFilter(f){ userSourceFilter = f; render(); }
function filteredUsersList(){
  const q = userSearch.toLowerCase();
  return users.filter(u=>{
    if(!sourceMatches(u, userSourceFilter)) return false;
    if(!q) return true;
    return (u.name||"").toLowerCase().includes(q) || (u.email||"").toLowerCase().includes(q) || (u.phone||"").includes(q);
  });
}
function renderSourceSummary(){
  const base = realUsers();
  const cnt = k => base.filter(u => userSource(u) === k).length;
  const cards = ["bazaar","direct","pwa","web","old_app","unknown"].map(k =>
    `<div class="stat-box"><div class="n">${cnt(k)}</div><div class="l">${SOURCE_LABELS[k]}</div></div>`).join("");
  return `
    <div class="panel" style="margin-bottom:14px;">
      <div class="drawer-label" style="margin-bottom:8px;">منبع نصب کاربرها (حساب‌های تست حساب نمی‌شن)</div>
      <div class="stat-grid" style="grid-template-columns:repeat(auto-fit,minmax(110px,1fr));">${cards}</div>
      <div class="note" style="color:var(--muted); font-size:12px; margin-top:10px; line-height:1.8;">
        ${clientRolloutMs ? `پخش نسخه‌ی جدید از ${fmtDate(new Date(clientRolloutMs).toISOString())} شروع شده.` : `هنوز هیچ نسخه‌ی جدیدی گزارش نداده (مایگریشن ۰۲۲ و دیپلوی وب لازمه).`}
        «اپ قدیمی» یعنی بعد از شروع پخش وارد شده ولی منبعش رو گزارش نکرده؛ یعنی با نسخه‌ی قدیمی اپ (بازار یا مستقیم) کار می‌کنه و این دو از هم قابل تفکیک نیستن.
        کاربر وب که نسخه‌ی قدیمی رو توی کش داره هم چند روز اول ممکنه اینجا بیفته؛ بعد از اولین باز شدن دوباره درست می‌شه.
      </div>
    </div>`;
}
function renderUsersView(){
  const filtered = filteredUsersList();
  const narrowed = userSearch || userSourceFilter !== "all";
  return `
    <div class="topbar">
      <div><div class="page-title">کاربران</div><div class="page-sub">${users.length} کاربر ثبت‌شده</div></div>
      <div class="btn-row">
        <div class="search-box">${ICONS.search}<input type="text" placeholder="جست‌وجوی نام، ایمیل یا موبایل..." value="${escapeHtml(userSearch)}" oninput="onUserSearch(this.value)"></div>
        <button class="row-btn" onclick="exportUsersCSV(false)">⬇ خروجی همه (${users.length})</button>
        ${narrowed ? `<button class="row-btn" onclick="exportUsersCSV(true)">⬇ خروجی نتایج فیلتر (${filtered.length})</button>` : ``}
      </div>
    </div>
    ${renderSourceSummary()}
    <div class="btn-row" style="margin-bottom:12px; flex-wrap:wrap;">
      ${SOURCE_FILTERS.map(([k,l]) => `<button class="row-btn ${userSourceFilter===k?'on':''}" onclick="setSourceFilter('${k}')">${l}</button>`).join("")}
    </div>
    <div class="panel">${dataLoading ? `<div class="loading-state">در حال بارگذاری...</div>` : renderUsersTable(filtered)}</div>
  `;
}
/* Exports name/email/phone/points/status/join-date as a CSV that opens correctly in Excel
   (including the Persian text) — no server round-trip, no new dependency, just a client-side
   Blob download. Pass onlyFiltered=true to export just what's currently on screen (the
   search results) instead of every user, for a more targeted marketing list. */
function exportUsersCSV(onlyFiltered){
  const list = onlyFiltered ? filteredUsersList() : users;
  const header = ["نام","ایمیل","موبایل","امتیاز کتاب","وضعیت","تاریخ عضویت","منبع نصب","نسخه‌ی اپ"];
  const csvEscape = v => `"${String(v==null?"":v).replace(/"/g,'""')}"`;
  const rows = list.map(u=>{
    const b = booksOf(u);
    return [u.name||"", u.email||"", u.phone||"", b.points, b.premium?"Premium":"رایگان", fmtDate(u.created_at), SOURCE_LABELS[userSource(u)], (clientSrcByUser[u.id]||{}).app_version||""].map(csvEscape).join(",");
  });
  const csv = "\uFEFF" + [header.map(csvEscape).join(","), ...rows].join("\r\n"); // BOM so Excel shows Persian correctly
  const blob = new Blob([csv], {type:"text/csv;charset=utf-8;"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `peleh-users-${new Date().toISOString().slice(0,10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
function onUserSearch(v){ userSearch = v; render(); const input = document.querySelector(".search-box input"); if(input){ input.focus(); input.setSelectionRange(input.value.length, input.value.length); } }
function renderUsersTable(list){
  if(!list.length) return `<div class="empty-state">کاربری پیدا نشد.</div>`;
  return `
    <table>
      <thead><tr><th>نام</th><th>ایمیل</th><th>موبایل</th><th>تاریخ عضویت</th><th>منبع</th><th>امتیاز کتاب</th><th>استریک</th><th>وضعیت</th><th></th></tr></thead>
      <tbody>
        ${list.map(u=>{
          const b = booksOf(u);
          const revealed = revealedEmails.has(u.id);
          return `
            <tr>
              <td data-label="نام">${escapeHtml(u.name) || "—"}${isTestUser(u) ? ` <span class="badge">تست</span>` : ``}</td>
              <td data-label="ایمیل"><span class="masked-email" onclick="toggleReveal('${safeId(u.id)}')">${revealed ? escapeHtml(u.email||"—") : maskEmail(u.email)}</span></td>
              <td data-label="موبایل" class="mono">${revealed ? escapeHtml(u.phone||"—") : maskPhone(u.phone)}</td>
              <td data-label="عضویت" class="mono">${fmtDate(u.created_at)}</td>
              <td data-label="منبع"><span class="badge ${SOURCE_BADGE[userSource(u)]}">${SOURCE_LABELS[userSource(u)]}</span>${(clientSrcByUser[u.id]||{}).app_version ? ` <span class="mono" style="color:var(--faint); font-size:11px;">${escapeHtml(clientSrcByUser[u.id].app_version)}</span>` : ``}</td>
              <td data-label="امتیاز" class="mono">${b.points}</td>
              <td data-label="استریک" class="mono">${b.streak}</td>
              <td data-label="وضعیت"><span class="badge ${b.premium?'premium':'free'}">${b.premium?'Premium':'رایگان'}</span></td>
              <td><button class="row-btn" onclick="openUserDrawer('${safeId(u.id)}')">جزئیات</button></td>
            </tr>
          `;
        }).join("")}
      </tbody>
    </table>
  `;
}
function maskPhone(phone){
  if(!phone) return "—";
  phone = String(phone);
  return escapeHtml(phone.slice(0,4) + "***" + phone.slice(-2));
}
function toggleReveal(id){ if(revealedEmails.has(id)) revealedEmails.delete(id); else revealedEmails.add(id); render(); }
function openUserDrawer(id){ openDrawerUserId = id; render(); }
function closeUserDrawer(){ openDrawerUserId = null; render(); }
function renderUserDrawer(){
  const u = users.find(x=>x.id===openDrawerUserId);
  if(!u) return `<div class="drawer-overlay"><div class="drawer"></div></div>`;
  const b = booksOf(u);
  const revealed = revealedEmails.has(u.id);
  return `
    <div class="drawer-overlay open" onclick="if(event.target===this) closeUserDrawer()">
      <div class="drawer">
        <div class="drawer-head"><div class="drawer-title">${escapeHtml(u.name) || "بدون نام"}</div><button class="drawer-close" onclick="closeUserDrawer()">×</button></div>
        <div class="drawer-section">
          <button class="row-btn" style="width:100%; padding:11px;" onclick="messageUser('${safeId(u.id)}')">💬 پیام</button>
          <div class="note" style="color:var(--muted); font-size:12px; margin-top:6px;">پیام تو بخش «پشتیبانی» اپِ کاربر با نشان خوانده‌نشده نشون داده می‌شه — حتی اگه تا حالا پیامی نداده باشه.</div>
        </div>
        <div class="drawer-section">
          <div class="drawer-label">ایمیل</div>
          <div class="masked-email" onclick="toggleReveal('${safeId(u.id)}')">${revealed ? escapeHtml(u.email||"—") : maskEmail(u.email)}</div>
        </div>
        <div class="drawer-section">
          <div class="drawer-label">موبایل</div>
          <div class="masked-email" onclick="toggleReveal('${safeId(u.id)}')">${revealed ? escapeHtml(u.phone||"—") : maskPhone(u.phone)}</div>
        </div>
        <div class="drawer-section">
          <div class="drawer-label">منبع نصب</div>
          <div><span class="badge ${SOURCE_BADGE[userSource(u)]}">${SOURCE_LABELS[userSource(u)]}</span>
          ${(clientSrcByUser[u.id]||{}).app_version ? ` <span class="mono" style="color:var(--faint);">نسخه ${escapeHtml(clientSrcByUser[u.id].app_version)}</span>` : ``}</div>
          ${clientSrcByUser[u.id] ? `<div class="note" style="color:var(--muted); font-size:12px; margin-top:6px;">آخرین گزارش: ${fmtDate(clientSrcByUser[u.id].last_seen)}</div>` : ``}
        </div>
        <div class="drawer-section">
          <div class="drawer-label">آمار کتاب‌خوانی</div>
          <div class="stat-grid">
            <div class="stat-box"><div class="n">${b.points}</div><div class="l">امتیاز</div></div>
            <div class="stat-box"><div class="n">${b.streak}</div><div class="l">استریک فعلی</div></div>
            <div class="stat-box"><div class="n">${b.finished}</div><div class="l">کتاب تمام‌شده</div></div>
            <div class="stat-box"><div class="n">${fmtDate(u.created_at)}</div><div class="l">تاریخ عضویت</div></div>
          </div>
        </div>
        <div class="drawer-section">
          <div class="drawer-label">اشتراک Premium</div>
          ${b.premium && b.premiumUntil && new Date(b.premiumUntil) > new Date() ? `
            <div class="note" style="color:var(--muted); font-size:12.5px; margin-bottom:8px;">تا ${fmtDate(b.premiumUntil)} فعاله</div>
            <button class="row-btn on" style="width:100%; padding:11px;" onclick="deactivatePremium(users.find(x=>x.id==='${safeId(u.id)}'))">✓ فعاله — برای غیرفعال‌سازی بزن</button>
          ` : `
            <div class="note" style="color:var(--muted); font-size:12.5px; margin-bottom:8px;">غیرفعاله — یه مدت انتخاب کن و فعالش کن</div>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:8px;">
              <button class="row-btn" onclick="activatePremiumFor(users.find(x=>x.id==='${safeId(u.id)}'), 1, 'یک ماهه')">۱ ماهه</button>
              <button class="row-btn" onclick="activatePremiumFor(users.find(x=>x.id==='${safeId(u.id)}'), 3, 'سه ماهه')">۳ ماهه</button>
              <button class="row-btn" onclick="activatePremiumFor(users.find(x=>x.id==='${safeId(u.id)}'), 6, 'شش ماهه')">۶ ماهه</button>
              <button class="row-btn" onclick="activatePremiumFor(users.find(x=>x.id==='${safeId(u.id)}'), 12, 'یک ساله')">۱۲ ماهه</button>
            </div>
          `}
        </div>
        <div class="drawer-section">
          <div class="drawer-label">حساب تست</div>
          <div class="note" style="color:var(--muted); font-size:12.5px; margin-bottom:8px;">حساب‌های تست از همه‌ی آمارها، قیف، جستجوی مربی‌ها و شمارنده‌ها حذف می‌شن.</div>
          <button class="row-btn ${isTestUser(u) ? 'on' : ''}" style="width:100%; padding:11px;" onclick="setUserTest('${safeId(u.id)}', ${isTestUser(u) ? 'false' : 'true'})">${isTestUser(u) ? '✓ حساب تست — برای برداشتن بزن' : 'علامت‌گذاری به‌عنوان حساب تست'}</button>
        </div>
        <div class="drawer-section">
          <div class="drawer-label">💎 سلامت پلاس (بتا)</div>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
            <button class="row-btn" onclick="addBetaUser('${safeId(u.id)}','coach')">+ بتا (مربی)</button>
            <button class="row-btn" onclick="addBetaUser('${safeId(u.id)}','athlete')">+ بتا (ورزشکار)</button>
            <button class="row-btn" onclick="grantPlus('${safeId(u.id)}', 30)">+۳۰ روز اشتراک پلاس</button>
            <button class="row-btn" onclick="closeUserDrawer(); setView('plus')">مدیریت سلامت پلاس ←</button>
          </div>
        </div>
        <div style="color:var(--faint); font-size:11.5px;">محتوای شخصی (خلاصه‌ها، یادداشت‌ها، برداشت‌ها) به‌عمد در این پنل نمایش داده نمی‌شه.</div>
      </div>
    </div>
  `;
}

/* ---------- Premium requests view ---------- */
function renderPremiumView(){
  return `
    <div class="topbar"><div><div class="page-title">درخواست‌های Premium</div><div class="page-sub">${premiumReqs.length} درخواست</div></div><button class="row-btn" onclick="loadAllData()">↻ بازخوانی</button></div>
    <div class="panel">${dataLoading ? `<div class="loading-state">در حال بارگذاری...</div>` : renderPremiumTable(premiumReqs)}</div>
  `;
}
function renderPremiumTable(list){
  if(!list.length) return `<div class="empty-state">درخواستی وجود نداره.</div>`;
  return `
    <table>
      <thead><tr><th>کاربر</th><th>پلن</th><th>مبلغ</th><th>تاریخ</th><th>وضعیت</th><th></th></tr></thead>
      <tbody>
        ${list.map(r=>{
          const u = users.find(x=>x.id===r.user_id);
          const revealed = revealedEmails.has(r.user_id);
          return `
            <tr>
              <td data-label="کاربر"><span class="masked-email" onclick="toggleReveal('${safeId(r.user_id)}')">${revealed ? escapeHtml(u?u.email:r.user_id) : maskEmail(u?u.email:null)}</span></td>
              <td data-label="پلن">${PLAN_LABELS[r.plan]||r.plan}</td>
              <td data-label="مبلغ" class="mono">${fmtToman(r.amount)}</td>
              <td data-label="تاریخ" class="mono">${fmtDate(r.created_at)}</td>
              <td data-label="وضعیت"><span class="badge ${r.status}">${r.status==='pending'?'در انتظار':r.status==='approved'?'تأیید شد':'رد شد'}</span></td>
              <td><button class="row-btn" onclick="openReqDrawer(${safeId(r.id)})">مشاهده رسید</button></td>
            </tr>
          `;
        }).join("")}
      </tbody>
    </table>
  `;
}
/* ---------- کدهای تخفیف/هدیه (promo_codes) ---------- */
async function loadPromoCodes(force){
  if(!force && (promoCodesLoadedOnce || promoCodesLoading)) return;
  promoCodesLoading = true; render();
  const { data } = await sb.from("promo_codes").select("*").order("created_at", { ascending:false });
  promoCodes = data || [];
  promoCodesLoading = false;
  promoCodesLoadedOnce = true;
  render();
}
function renderPromoView(){
  if(!promoCodesLoadedOnce && !promoCodesLoading) loadPromoCodes();
  return `
    <div class="topbar">
      <div><div class="page-title">کدهای تخفیف / هدیه</div><div class="page-sub">${promoCodes.length} کد</div></div>
      <div class="btn-row">
        <button class="row-btn" onclick="loadPromoCodes(true)">↻ بازخوانی</button>
        <button class="row-btn on" onclick="togglePromoForm()">${promoFormOpen ? "بستن فرم" : "+ کد جدید"}</button>
      </div>
    </div>
    ${promoFormOpen ? renderPromoForm() : ``}
    <div class="panel">${promoCodesLoading ? `<div class="loading-state">در حال بارگذاری...</div>` : renderPromoTable(promoCodes)}</div>
  `;
}
function togglePromoForm(){ promoFormOpen = !promoFormOpen; promoFormError = ""; promoFormKind = "gift_days"; render(); }
function setPromoFormKind(kind){ promoFormKind = kind; render(); }
function renderPromoForm(){
  return `
    <div class="panel" style="padding:20px; margin-bottom:16px;">
      <div class="field">
        <label>نوع کد</label>
        <div class="btn-row">
          <button type="button" class="row-btn ${promoFormKind==='gift_days'?'on':''}" style="flex:1;" onclick="setPromoFormKind('gift_days')">🎁 روز اشتراک رایگان</button>
          <button type="button" class="row-btn ${promoFormKind==='discount_percent'?'on':''}" style="flex:1;" onclick="setPromoFormKind('discount_percent')">💸 درصد تخفیف روی خرید</button>
        </div>
      </div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px;">
        <div class="field"><label>کد (لاتین، بدون فاصله)</label><input type="text" id="pf_code" placeholder="READINGDAY" dir="ltr" style="text-align:left;"></div>
        ${promoFormKind === "gift_days"
          ? `<div class="field"><label>تعداد روز اشتراک هدیه</label><input type="number" id="pf_days" value="7" min="1" dir="ltr" style="text-align:left;"></div>`
          : `<div class="field"><label>درصد تخفیف (فقط پرداخت زیبال — وب/APK مستقیم)</label><input type="number" id="pf_percent" value="10" min="1" max="100" dir="ltr" style="text-align:left;"></div>`
        }
      </div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px;">
        <div class="field"><label>سقف تعداد استفاده (اختیاری — خالی = نامحدود)</label><input type="number" id="pf_max" min="1" dir="ltr" style="text-align:left;"></div>
        <div class="field"><label>تاریخ انقضا (اختیاری)</label><input type="date" id="pf_expires" dir="ltr" style="text-align:left;"></div>
      </div>
      <div class="field"><label>توضیح داخلی (اختیاری — فقط برای خودت، کاربر نمی‌بینه)</label><input type="text" id="pf_label" placeholder="مثلاً: کد روز کتابخوانی ۱۴۰۶"></div>
      ${promoFormKind === "discount_percent" ? `<div class="note" style="margin-bottom:12px;">توجه: این نوع کد فقط رو پرداخت زیبال (وب یا APK مستقیم) اثر داره — رو خرید از کافه‌بازار (Poolakey) قابل‌اعمال نیست، چون قیمت اونجا تو پنل بازار ثابته.</div>` : ``}
      ${promoFormError ? `<div class="login-error" style="margin-bottom:10px;">${escapeHtml(promoFormError)}</div>` : ``}
      <button class="primary-btn" ${promoFormSaving?"disabled":""} onclick="createPromoCode()">${promoFormSaving?"در حال ساخت...":"ساخت کد"}</button>
    </div>
  `;
}
async function createPromoCode(){
  const code = (document.getElementById("pf_code").value || "").trim().toUpperCase();
  const maxRaw = document.getElementById("pf_max").value;
  const max = maxRaw ? parseInt(maxRaw, 10) : null;
  const expiresRaw = document.getElementById("pf_expires").value;
  const expires = expiresRaw ? new Date(expiresRaw + "T23:59:59").toISOString() : null;
  const label = (document.getElementById("pf_label").value || "").trim() || null;

  if(!code){ promoFormError = "کد رو وارد کن."; render(); return; }

  const row = { code, kind: promoFormKind, max_redemptions: max, expires_at: expires, label, created_by: session.user.id };
  if(promoFormKind === "gift_days"){
    const days = parseInt(document.getElementById("pf_days").value, 10);
    if(!days || days < 1){ promoFormError = "تعداد روز باید حداقل ۱ باشه."; render(); return; }
    row.reward_days = days;
  }else{
    const percent = parseInt(document.getElementById("pf_percent").value, 10);
    if(!percent || percent < 1 || percent > 100){ promoFormError = "درصد تخفیف باید بین ۱ تا ۱۰۰ باشه."; render(); return; }
    row.discount_percent = percent;
  }

  promoFormSaving = true; promoFormError = ""; render();
  const { error } = await sb.from("promo_codes").insert(row);
  promoFormSaving = false;
  if(error){
    promoFormError = error.code === "23505" ? "این کد قبلاً ساخته شده." : "خطا در ساخت کد.";
    render();
    return;
  }
  promoFormOpen = false;
  await loadPromoCodes(true);
}
async function togglePromoActive(id, current){
  await sb.from("promo_codes").update({ active: !current }).eq("id", id);
  loadPromoCodes(true);
}
async function deletePromoCode(id){
  if(!confirm("این کد برای همیشه حذف بشه؟")) return;
  await sb.from("promo_codes").delete().eq("id", id);
  loadPromoCodes(true);
}
function renderPromoTable(list){
  if(!list.length) return `<div class="empty-state">هنوز کدی نساختی.</div>`;
  return `
    <table>
      <thead><tr><th>کد</th><th>نوع</th><th>مقدار</th><th>استفاده</th><th>انقضا</th><th>توضیح</th><th>وضعیت</th><th></th></tr></thead>
      <tbody>
        ${list.map(p=>`
          <tr>
            <td data-label="کد" class="mono" dir="ltr">${escapeHtml(p.code)}</td>
            <td data-label="نوع">${p.kind === "discount_percent" ? "💸 تخفیف" : "🎁 روز رایگان"}</td>
            <td data-label="مقدار">${p.kind === "discount_percent" ? `٪${p.discount_percent}` : `${p.reward_days} روز`}</td>
            <td data-label="استفاده">${p.redemption_count}${p.max_redemptions!=null ? ` / ${p.max_redemptions}` : ``}</td>
            <td data-label="انقضا" class="mono">${p.expires_at ? fmtDate(p.expires_at) : "—"}</td>
            <td data-label="توضیح">${escapeHtml(p.label || "—")}</td>
            <td data-label="وضعیت"><span class="badge ${p.active?'approved':'rejected'}">${p.active?'فعال':'غیرفعال'}</span></td>
            <td>
              <button class="row-btn" onclick="togglePromoActive(${safeId(p.id)}, ${p.active})">${p.active?'غیرفعال کن':'فعال کن'}</button>
              <button class="row-btn danger" onclick="deletePromoCode(${safeId(p.id)})">حذف</button>
            </td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

function openReqDrawer(id){ openDrawerReqId = id; render(); loadReceiptForDrawer(id); }
function closeReqDrawer(){ openDrawerReqId = null; render(); }
async function loadReceiptForDrawer(id){
  const r = premiumReqs.find(x=>x.id===id);
  if(!r) return;
  const url = await getReceiptUrl(r.receipt_path);
  if(openDrawerReqId===id) render(); // triggers re-render now that URL is cached
}
function renderReqDrawer(){
  const r = premiumReqs.find(x=>x.id===openDrawerReqId);
  if(!r) return `<div class="drawer-overlay"><div class="drawer"></div></div>`;
  const u = users.find(x=>x.id===r.user_id);
  const revealed = revealedEmails.has(r.user_id);
  const url = receiptUrlCache[r.receipt_path];
  return `
    <div class="drawer-overlay open" onclick="if(event.target===this) closeReqDrawer()">
      <div class="drawer">
        <div class="drawer-head"><div class="drawer-title">درخواست Premium</div><button class="drawer-close" onclick="closeReqDrawer()">×</button></div>
        <div class="drawer-section">
          <div class="drawer-label">کاربر</div>
          <div class="masked-email" onclick="toggleReveal('${safeId(r.user_id)}')">${revealed ? escapeHtml(u?u.email:r.user_id) : maskEmail(u?u.email:null)}</div>
        </div>
        <div class="drawer-section">
          <div class="stat-grid">
            <div class="stat-box"><div class="n">${PLAN_LABELS[r.plan]||r.plan}</div><div class="l">پلن</div></div>
            <div class="stat-box"><div class="n">${fmtToman(r.amount)}</div><div class="l">مبلغ</div></div>
          </div>
        </div>
        <div class="drawer-section">
          <div class="drawer-label">عکس رسید</div>
          ${url ? `<img class="receipt-img" src="${url}" alt="رسید">` : `<div class="note" style="color:var(--faint); font-size:12.5px;">در حال بارگذاری تصویر...</div>`}
        </div>
        ${r.status==="pending" ? `
        <div class="btn-row">
          <button class="primary-btn" onclick="approvePremiumRequest(premiumReqs.find(x=>x.id===${Number(r.id)||0})); closeReqDrawer();">تأیید و فعال‌سازی</button>
          <button class="danger-btn" onclick="rejectPremiumRequest(premiumReqs.find(x=>x.id===${Number(r.id)||0})); closeReqDrawer();">رد کردن</button>
        </div>
        ` : `<div class="badge ${r.status}" style="display:inline-block;">${r.status==='approved'?'✓ قبلاً تأیید شده':'رد شده'}</div>`}
      </div>
    </div>
  `;
}

/* ---------- Support view (real chat threads) ---------- */
let openThreadUserId = null;
function conversationsFromMsgs(){
  const map = {};
  supportMsgs.forEach(m=>{
    if(!map[m.user_id]) map[m.user_id] = [];
    map[m.user_id].push(m);
  });
  return Object.entries(map).map(([userId, msgs])=>{
    msgs.sort((a,b)=> new Date(a.created_at) - new Date(b.created_at));
    const last = msgs[msgs.length-1];
    const unread = msgs.filter(m=>m.sender==="user" && !m.read_by_admin).length;
    return {userId, msgs, last, unread};
  }).sort((a,b)=> new Date(b.last.created_at) - new Date(a.last.created_at));
}
function renderSupportView(){
  const convos = conversationsFromMsgs();
  return `
    <div class="topbar"><div><div class="page-title">پشتیبانی</div><div class="page-sub">${convos.length} مکالمه</div></div><button class="row-btn" onclick="loadAllData()">↻ بازخوانی</button></div>
    <div class="panel">${dataLoading ? `<div class="loading-state">در حال بارگذاری...</div>` : renderConvoTable(convos)}</div>
  `;
}
function renderConvoTable(convos){
  if(!convos.length) return `<div class="empty-state">هنوز پیامی از کاربری نیومده.</div>`;
  return `
    <table>
      <thead><tr><th>کاربر</th><th>آخرین پیام</th><th>تاریخ</th><th>وضعیت</th><th></th></tr></thead>
      <tbody>
        ${convos.map(c=>{
          const u = users.find(x=>x.id===c.userId);
          const revealed = revealedEmails.has(c.userId);
          const preview = c.last.body.length > 50 ? c.last.body.slice(0,50)+"…" : c.last.body;
          return `
            <tr>
              <td data-label="کاربر"><span class="masked-email" onclick="toggleReveal('${safeId(c.userId)}')">${revealed ? escapeHtml(u?u.email:c.userId) : maskEmail(u?u.email:null)}</span></td>
              <td data-label="آخرین پیام">${c.last.sender==='admin'?'شما: ':''}${escapeHtml(preview)}</td>
              <td data-label="تاریخ" class="mono">${fmtDate(c.last.created_at)}</td>
              <td data-label="وضعیت">${c.unread ? `<span class="badge unread">${c.unread} خوانده‌نشده</span>` : `<span class="badge read">خوانده‌شده</span>`}</td>
              <td><button class="row-btn" onclick="openThread('${safeId(c.userId)}')">مشاهده چت</button></td>
            </tr>
          `;
        }).join("")}
      </tbody>
    </table>
  `;
}
async function openThread(userId){
  openThreadUserId = userId;
  render();
  await sb.from('support_messages').update({read_by_admin:true}).eq('user_id', userId).eq('sender','user').eq('read_by_admin', false);
  const c = conversationsFromMsgs().find(x=>x.userId===userId);
  if(c) c.msgs.forEach(m=>{ if(m.sender==='user') m.read_by_admin = true; });
  render();
}
async function loadThreadFor(userId){
  const { data, error } = await sb.from('support_messages').select('*').order('created_at', {ascending:true});
  if(error) console.error("loadThreadFor failed:", error);
  supportMsgs = data || [];
  render();
}
function closeThread(){ openThreadUserId = null; render(); }
// batch 2026-11-08: پیام دادن به هر کاربری از کشوی جزئیات کاربر — حتی اگه تا حالا مکالمه‌ای نداشته
// (همون جدول support_messages با sender='admin'؛ RLS «admins can insert admin messages» اجازه می‌ده)
async function messageUser(userId){
  openDrawerUserId = null;
  await openThread(userId);
  setTimeout(() => { const t = document.getElementById("admin_reply_text"); if(t) t.focus(); }, 60);
}
function renderMsgDrawer(){
  if(!openThreadUserId) return `<div class="drawer-overlay"><div class="drawer"></div></div>`;
  const u = users.find(x=>x.id===openThreadUserId);
  const revealed = revealedEmails.has(openThreadUserId);
  const msgs = (conversationsFromMsgs().find(c=>c.userId===openThreadUserId) || {msgs:[]}).msgs;
  return `
    <div class="drawer-overlay open" onclick="if(event.target===this) closeThread()">
      <div class="drawer" style="display:flex; flex-direction:column;">
        <div class="drawer-head"><div class="drawer-title">چت پشتیبانی</div><button class="drawer-close" onclick="closeThread()">×</button></div>
        <div class="drawer-section">
          <div class="drawer-label">کاربر${u && u.name ? `: ${escapeHtml(u.name)}` : ``}</div>
          <div class="masked-email" onclick="toggleReveal('${safeId(openThreadUserId)}')">${revealed ? escapeHtml(u ? (u.email || u.phone || openThreadUserId) : openThreadUserId) : (u && !u.email && u.phone ? maskPhone(u.phone) : maskEmail(u?u.email:null))}</div>
        </div>
        <div id="admin_chat_scroll" style="flex:1; overflow-y:auto; margin-bottom:14px; max-height:360px;">
          ${msgs.length===0 ? `<div class="note" style="color:var(--faint); font-size:12.5px;">هنوز پیامی نیست — اولین پیام رو تو بفرست؛ کاربر تو «پشتیبانی» اپ با نشان پیام تازه می‌بینه.</div>` :
            msgs.map(m=>`
              <div style="display:flex; justify-content:${m.sender==='admin'?'flex-end':'flex-start'}; margin-bottom:8px;">
                <div style="max-width:78%; background:${m.sender==='admin'?'var(--gold-soft)':'var(--card)'}; border:1px solid var(--line); border-radius:10px; padding:9px 11px; font-size:13px; line-height:1.8;">
                  ${escapeHtml(m.body)}
                </div>
              </div>
            `).join("")}
        </div>
        <textarea class="textbox" id="admin_reply_text" rows="3" placeholder="پاسخت رو بنویس..."></textarea>
        <button class="primary-btn" style="margin-top:10px;" onclick="onSendAdminReply()">ارسال</button>
      </div>
    </div>
  `;
}
function onSendAdminReply(){
  const text = document.getElementById("admin_reply_text").value;
  if(!text.trim()) return;
  document.getElementById("admin_reply_text").value = "";
  sendAdminChatMessage(openThreadUserId, text);
}

/* ---------- Articles view ----------
   Writes to the same `articles` table the public site reads from (see assets/articles.js
   on the website repo: fetchPublishedArticles / fetchArticleBySlug). Body format is the
   same "markdown-lite" the public site renders: blank-line-separated paragraphs, "## " for
   headings, **bold** — nothing else, so admin-authored content can never inject raw HTML
   into the public site. */
async function loadArticles(force){
  if(!force && articlesLoadedFor) return;
  articlesLoading = true; render();
  const { data, error } = await sb.from("articles").select("*").order("created_at", { ascending:false });
  if(error) console.error("loadArticles failed:", error);
  articles = data || [];
  articlesLoadedFor = true;
  articlesLoading = false;
  render();
}
function openArticleEditor(id){
  if(id){
    const found = articles.find(x => String(x.id) === String(id));
    if(!found) return;
    articleEditor = Object.assign({}, found);
  } else {
    articleEditor = { id:null, slug:"", title:"", seo_title:"", tag:"", meta_description:"", body_md:"", cta:"", published:false, cover_image_url:null };
  }
  articleEditorPreview = false;
  articleSaveError = "";
  render();
}
function closeArticleEditor(){
  articleEditor = null;
  render();
}
/* Reads the live DOM values back into articleEditor before any re-render (preview toggle,
   publish toggle, save) so nothing the admin already typed gets wiped by that re-render —
   text inputs here are otherwise uncontrolled between renders, same approach as the login form. */
function syncArticleEditorFromDom(){
  if(!articleEditor) return;
  const val = id => { const el = document.getElementById(id); return el ? el.value : undefined; };
  const t = val("ae_title"); if(t !== undefined) articleEditor.title = t;
  const s = val("ae_slug"); if(s !== undefined) articleEditor.slug = s;
  const tag = val("ae_tag"); if(tag !== undefined) articleEditor.tag = tag;
  const seo = val("ae_seo_title"); if(seo !== undefined) articleEditor.seo_title = seo;
  const meta = val("ae_meta"); if(meta !== undefined) articleEditor.meta_description = meta;
  const body = val("ae_body"); if(body !== undefined) articleEditor.body_md = body;
  const cta = val("ae_cta"); if(cta !== undefined) articleEditor.cta = cta;
}
function toggleArticlePreview(){
  syncArticleEditorFromDom();
  articleEditorPreview = !articleEditorPreview;
  render();
}
function toggleEditorPublished(){
  syncArticleEditorFromDom();
  articleEditor.published = !articleEditor.published;
  render();
}
async function uploadArticleCover(input){
  const file = input.files && input.files[0];
  if(!file || !articleEditor) return;
  syncArticleEditorFromDom();
  articleCoverError = "";
  if(!file.type.startsWith("image/")){ articleCoverError = "فقط فایل تصویر قابل قبوله."; render(); return; }
  if(file.size > 5 * 1024 * 1024){ articleCoverError = "حجم تصویر نباید بیشتر از ۵ مگابایت باشه."; render(); return; }
  articleCoverUploading = true; render();
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `${(articleEditor.slug || "article").trim() || "article"}-${Date.now()}.${ext}`;
  const { error: upErr } = await sb.storage.from("article-images").upload(path, file, { upsert: true, cacheControl: "3600" });
  articleCoverUploading = false;
  if(upErr){ articleCoverError = "آپلود تصویر انجام نشد: " + upErr.message; render(); return; }
  const { data } = sb.storage.from("article-images").getPublicUrl(path);
  articleEditor.cover_image_url = data.publicUrl;
  render();
}
function removeArticleCover(){
  if(!articleEditor) return;
  syncArticleEditorFromDom();
  articleEditor.cover_image_url = null;
  articleCoverError = "";
  render();
}
async function saveArticle(){
  syncArticleEditorFromDom();
  const a = articleEditor;
  const slug = (a.slug||"").trim();
  if(!(a.title||"").trim()){ articleSaveError = "عنوان رو وارد کن."; render(); return; }
  if(!slug){ articleSaveError = "اسلاگ (بخش انگلیسی لینک) رو وارد کن."; render(); return; }
  if(!/^[a-z0-9-]+$/.test(slug)){ articleSaveError = "اسلاگ فقط می‌تونه حروف کوچک انگلیسی، عدد و خط تیره داشته باشه — مثلاً: adat-sazi-dar-30-rooz"; render(); return; }
  if(!(a.body_md||"").trim()){ articleSaveError = "متن مقاله نمی‌تونه خالی باشه."; render(); return; }
  articleSaving = true; articleSaveError = ""; render();
  const payload = {
    slug,
    title: a.title.trim(),
    seo_title: (a.seo_title||"").trim() || null,
    tag: (a.tag||"").trim() || null,
    meta_description: (a.meta_description||"").trim() || null,
    body_md: a.body_md,
    cta: (a.cta||"").trim() || null,
    cover_image_url: a.cover_image_url || null,
    published: !!a.published,
    updated_at: new Date().toISOString(),
  };
  const { error } = a.id
    ? await sb.from("articles").update(payload).eq("id", a.id)
    : await sb.from("articles").insert(payload);
  articleSaving = false;
  if(error){
    articleSaveError = (error.code === "23505")
      ? "این اسلاگ قبلاً برای یه مقاله‌ی دیگه استفاده شده — یه اسلاگ دیگه انتخاب کن."
      : ("ذخیره نشد: " + error.message);
    render();
    return;
  }
  articleEditor = null;
  await loadArticles(true);
}
async function toggleListPublish(id){
  const row = articles.find(x => String(x.id) === String(id));
  if(!row) return;
  const next = !row.published;
  const { error } = await sb.from("articles").update({ published: next, updated_at: new Date().toISOString() }).eq("id", row.id);
  if(error){ alert("تغییر وضعیت انتشار انجام نشد: " + error.message); return; }
  row.published = next;
  render();
}
async function deleteArticleRow(id){
  const row = articles.find(x => String(x.id) === String(id));
  if(!row) return;
  if(!confirm(`مقاله‌ی «${row.title}» برای همیشه حذف بشه؟ این کار برگشت‌پذیر نیست.`)) return;
  const { error } = await sb.from("articles").delete().eq("id", row.id);
  if(error){ alert("حذف نشد: " + error.message); return; }
  articles = articles.filter(x => String(x.id) !== String(id));
  render();
}
/* Same markdown-lite renderer as assets/articles.js on the website — kept as its own copy
   here (not shared via import) since this is a stand-alone admin page; used only for the
   optional in-editor preview, never sent anywhere. */
function renderBodyMdPreview(md){
  const lines = String(md || "").split("\n");
  const out = [];
  for(const raw of lines){
    const line = raw.trim();
    if(!line) continue;
    if(line.startsWith("## ")){
      out.push(`<h2 style="font-size:16px; margin:0 0 10px;">${escapeHtml(line.slice(3).trim())}</h2>`);
      continue;
    }
    let text = escapeHtml(line);
    text = text.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    out.push(`<p style="font-size:13.5px; line-height:1.9; margin:0 0 12px; color:var(--muted);">${text}</p>`);
  }
  return out.join("\n");
}
function renderArticlesView(){
  if(!articlesLoadedFor && !articlesLoading) loadArticles();
  if(articleEditor) return renderArticleEditor();
  return `
    <div class="topbar">
      <div><div class="page-title">مقالات</div><div class="page-sub">${articles.length} مقاله</div></div>
      <div class="btn-row">
        <button class="row-btn" onclick="loadArticles(true)">↻ بازخوانی</button>
        <button class="row-btn on" onclick="openArticleEditor(null)">+ مقاله‌ی جدید</button>
      </div>
    </div>
    <div class="panel">${articlesLoading ? `<div class="loading-state">در حال بارگذاری...</div>` : renderArticlesTable(articles)}</div>
  `;
}
function renderArticlesTable(list){
  if(!list.length) return `<div class="empty-state">هنوز مقاله‌ای نساختی. با دکمه‌ی «مقاله‌ی جدید» شروع کن.</div>`;
  return `
    <table>
      <thead><tr><th></th><th>عنوان</th><th>تگ</th><th>اسلاگ</th><th>تاریخ</th><th>وضعیت</th><th></th></tr></thead>
      <tbody>
        ${list.map(a=>`
          <tr>
            <td>${a.cover_image_url ? `<img src="${escapeHtml(a.cover_image_url)}" alt="" style="width:44px; height:44px; object-fit:cover; border-radius:6px;">` : ``}</td>
            <td data-label="عنوان">${escapeHtml(a.title)}</td>
            <td data-label="تگ">${escapeHtml(a.tag)||"—"}</td>
            <td data-label="اسلاگ" class="mono">${escapeHtml(a.slug)}</td>
            <td data-label="تاریخ" class="mono">${fmtDate(a.created_at)}</td>
            <td data-label="وضعیت"><span class="badge ${a.published?'premium':'free'}">${a.published?'منتشر شده':'پیش‌نویس'}</span></td>
            <td>
              <div class="btn-row">
                <button class="row-btn" onclick="openArticleEditor('${safeId(a.id)}')">ویرایش</button>
                <button class="row-btn ${a.published?'':'on'}" onclick="toggleListPublish('${safeId(a.id)}')">${a.published?'پیش‌نویس کن':'منتشر کن'}</button>
                <button class="row-btn danger" onclick="deleteArticleRow('${safeId(a.id)}')">حذف</button>
              </div>
            </td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}
function renderArticleEditor(){
  const a = articleEditor;
  const isNew = !a.id;
  return `
    <div class="topbar">
      <div><div class="page-title">${isNew?'مقاله‌ی جدید':'ویرایش مقاله'}</div><div class="page-sub">${isNew?'یه مقاله‌ی تازه بنویس':'در حال ویرایش «'+escapeHtml(a.title||"")+'»'}</div></div>
      <div class="btn-row"><button class="row-btn" onclick="closeArticleEditor()">← بازگشت به لیست</button></div>
    </div>
    <div class="panel" style="padding:24px;">
      <div class="field">
        <label>تصویر شاخص مقاله (اختیاری)</label>
        ${a.cover_image_url ? `
          <div style="margin-bottom:10px;">
            <img src="${escapeHtml(a.cover_image_url)}" alt="" style="max-width:280px; width:100%; border-radius:10px; display:block;">
            <button class="row-btn danger" style="margin-top:8px;" onclick="removeArticleCover()">حذف تصویر</button>
          </div>
        ` : ``}
        <input type="file" id="ae_cover_file" accept="image/*" ${articleCoverUploading?"disabled":""} onchange="uploadArticleCover(this)">
        ${articleCoverUploading ? `<div style="color:var(--faint); font-size:12px; margin-top:6px;">در حال آپلود...</div>` : ``}
        ${articleCoverError ? `<div class="login-error" style="margin-top:6px;">${escapeHtml(articleCoverError)}</div>` : ``}
      </div>
      <div class="field"><label>عنوان مقاله</label><input type="text" id="ae_title" value="${escapeHtml(a.title)}" placeholder="مثلاً: ۷ تکنیک برای ساختن یک عادت جدید"></div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px;">
        <div class="field"><label>اسلاگ (بخش انگلیسی لینک)</label><input type="text" id="ae_slug" value="${escapeHtml(a.slug)}" placeholder="adat-sazi-dar-30-rooz" dir="ltr" style="text-align:left;"></div>
        <div class="field"><label>تگ / دسته</label><input type="text" id="ae_tag" value="${escapeHtml(a.tag)}" placeholder="مثلاً: عادت‌سازی"></div>
      </div>
      <div style="color:var(--faint); font-size:11px; margin:-10px 0 18px;" dir="ltr">pelehapp.ir/articles/${escapeHtml(a.slug || "...")}.html</div>
      <div class="field"><label>توضیح متا (زیر عنوان، توی لیست مقالات و گوگل نشون داده می‌شه)</label><input type="text" id="ae_meta" value="${escapeHtml(a.meta_description)}" placeholder="یک یا دو جمله‌ی کوتاه درباره‌ی مقاله"></div>
      <div class="field"><label>عنوان سئو (اختیاری — خالی بمونه از همون عنوان اصلی استفاده می‌شه)</label><input type="text" id="ae_seo_title" value="${escapeHtml(a.seo_title)}"></div>
      <div class="field">
        <label>متن مقاله</label>
        <textarea class="textbox" id="ae_body" rows="16" placeholder="یه خط خالی بین پاراگراف‌ها بذار...">${escapeHtml(a.body_md)}</textarea>
        <div style="color:var(--faint); font-size:11px; margin-top:6px;">فرمت: یک خط خالی بین پاراگراف‌ها · تیتر با <span class="mono">## </span> شروع کن · بولد با <span class="mono">**اینجوری**</span></div>
      </div>
      <div class="field"><label>متن دعوت‌به‌عمل زیر مقاله (اختیاری)</label><input type="text" id="ae_cta" value="${escapeHtml(a.cta)}" placeholder="مثلاً: همین امروز با پله شروع کن"></div>
      <div class="btn-row" style="margin-bottom:16px;">
        <button class="row-btn" onclick="toggleArticlePreview()">${articleEditorPreview?'بستن پیش‌نمایش':'پیش‌نمایش متن'}</button>
        <button class="row-btn ${a.published?'on':''}" onclick="toggleEditorPublished()">${a.published?'✓ منتشر شده — برای پیش‌نویس کردن بزن':'پیش‌نویسه — برای انتشار بزن'}</button>
      </div>
      ${articleEditorPreview ? `<div class="panel" style="padding:18px 20px; margin-bottom:18px; background:var(--surface-2);">${renderBodyMdPreview(a.body_md)}</div>` : ``}
      ${articleSaveError ? `<div class="login-error" style="margin-bottom:12px;">${escapeHtml(articleSaveError)}</div>` : ``}
      <button class="primary-btn" ${articleSaving?"disabled":""} onclick="saveArticle()">${articleSaving?"در حال ذخیره...":(a.published?"ذخیره و انتشار":"ذخیره‌ی پیش‌نویس")}</button>
    </div>
  `;
}

/* ===================== شبکه‌های اجتماعی (صف محتوا، اساسنامه‌ها، تعامل، تحقیق) =====================
   نکته‌ی مهم: بخش «انتشار خودکار»، «آنالیز خودکار» و «خوندن خودکار کامنت/دایرکت مستقیم از
   اینستاگرام» به یه اپ متا (Graph API) نیاز داره که هنوز وصل نشده — تا اون موقع محتوا رو اینجا
   آپلود/تایید می‌کنی و خودت دستی منتشر می‌کنی، و کامنت/دایرکت رو دستی پیست می‌کنی تا هوش
   مصنوعی پیش‌نویس جواب بسازه. بقیه (بررسی محتوا با هوش مصنوعی، پیش‌نویس جواب، تحقیق ترند) از
   همین الان کاملاً زنده‌ست. */

let socialTab = "queue"; // queue | charters | engagement | research
let socialContent = [];
let socialContentLoading = false;
let socialContentLoadedOnce = false;
let socialMediaUrlCache = {}; // path -> signed url

let socialUpForm = { platform: "instagram", kind: "post", caption: "", videoNote: "" };
let socialUpBusy = false;
let socialUpError = "";
let socialReviewingId = null;

let socialCharters = { comment: "", dm: "", content_review: "" };
let socialChartersLoading = false;
let socialChartersLoadedOnce = false;
let socialCharterSaving = {}; // kind -> bool
let socialCharterDirty = {}; // kind -> bool (local edit not yet saved)

let socialEngagement = [];
let socialEngagementLoading = false;
let socialEngagementLoadedOnce = false;
let socialEngForm = { kind: "comment", author: "", body: "" };
let socialEngBusy = false;
let socialDraftingId = null;

let socialResearch = [];
let socialResearchLoading = false;
let socialResearchLoadedOnce = false;
let socialResearchShowUsed = false;
let socialResearchRunning = null; // "instagram_research" | "tweet_suggestion" | null

function setSocialTab(t){ socialTab = t; render();
  if(t==="queue" && !socialContentLoadedOnce) loadSocialContent();
  if(t==="charters" && !socialChartersLoadedOnce) loadSocialCharters();
  if(t==="engagement" && !socialEngagementLoadedOnce) loadSocialEngagement();
  if(t==="research" && !socialResearchLoadedOnce) loadSocialResearch();
}

/* ---------- Data loaders ---------- */
async function loadSocialContent(force){
  if(!force && socialContentLoadedOnce) return;
  socialContentLoading = true; render();
  const { data } = await sb.from("social_content").select("*").order("created_at", { ascending:false });
  socialContent = data || [];
  socialContentLoading = false; socialContentLoadedOnce = true; render();
}
async function loadSocialCharters(force){
  if(!force && socialChartersLoadedOnce) return;
  socialChartersLoading = true; render();
  const { data } = await sb.from("social_charters").select("*");
  (data || []).forEach(r => { socialCharters[r.kind] = r.content || ""; });
  socialChartersLoading = false; socialChartersLoadedOnce = true; render();
}
async function loadSocialEngagement(force){
  if(!force && socialEngagementLoadedOnce) return;
  socialEngagementLoading = true; render();
  const { data } = await sb.from("social_engagement").select("*").order("created_at", { ascending:false });
  socialEngagement = data || [];
  socialEngagementLoading = false; socialEngagementLoadedOnce = true; render();
}
async function loadSocialResearch(force){
  if(!force && socialResearchLoadedOnce) return;
  socialResearchLoading = true; render();
  const { data } = await sb.from("social_research").select("*").order("created_at", { ascending:false }).limit(200);
  socialResearch = data || [];
  socialResearchLoading = false; socialResearchLoadedOnce = true; render();
}
async function getSocialMediaUrl(path){
  if(!path) return null;
  if(socialMediaUrlCache[path]) return socialMediaUrlCache[path];
  const { data, error } = await sb.storage.from("social-media").createSignedUrl(path, 3600);
  if(error || !data) return null;
  socialMediaUrlCache[path] = data.signedUrl;
  return data.signedUrl;
}

/* ---------- Shell ---------- */
function renderSocialView(){
  if(!socialContentLoadedOnce && !socialContentLoading) loadSocialContent();
  const needsReview = socialEngagement.filter(e=>e.status==="needs_review").length;
  const pendingContent = socialContent.filter(c=>c.status==="pending_review").length;
  return `
    <div class="topbar">
      <div><div class="page-title">شبکه‌های اجتماعی</div><div class="page-sub">محتوا، اساسنامه‌ها، تعامل و تحقیق</div></div>
    </div>
    <div class="btn-row" style="margin-bottom:16px;">
      <button class="row-btn ${socialTab==='queue'?'on':''}" onclick="setSocialTab('queue')">صف محتوا${pendingContent?` <span class="nav-badge amber" style="position:static;">${pendingContent}</span>`:``}</button>
      <button class="row-btn ${socialTab==='charters'?'on':''}" onclick="setSocialTab('charters')">اساسنامه‌ها</button>
      <button class="row-btn ${socialTab==='engagement'?'on':''}" onclick="setSocialTab('engagement')">کامنت / دایرکت${needsReview?` <span class="nav-badge" style="position:static;">${needsReview}</span>`:``}</button>
      <button class="row-btn ${socialTab==='research'?'on':''}" onclick="setSocialTab('research')">تحقیق</button>
    </div>
    ${socialTab==="queue" ? renderSocialQueueTab()
      : socialTab==="charters" ? renderSocialChartersTab()
      : socialTab==="engagement" ? renderSocialEngagementTab()
      : renderSocialResearchTab()}
  `;
}

/* ---------- Tab 1: content queue ---------- */
const SOCIAL_STATUS_LABEL = {
  pending_review:"در انتظار بررسی", rejected:"رد شده", approved:"تاییدشده",
  scheduled:"زمان‌بندی‌شده", published:"منتشرشده", failed:"ناموفق",
};
const SOCIAL_STATUS_BADGE = {
  pending_review:"pending", rejected:"rejected", approved:"approved",
  scheduled:"approved", published:"approved", failed:"rejected",
};
function updateSocialUpForm(field, val){ socialUpForm[field] = val; }
function renderSocialQueueTab(){
  return `
    <div class="panel" style="padding:20px; margin-bottom:16px;">
      <div style="font-weight:800; margin-bottom:14px;">آپلود محتوای جدید برای بررسی</div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px;">
        <div class="field"><label>پلتفرم</label>
          <select id="su_platform" onchange="updateSocialUpForm('platform', this.value)">
            <option value="instagram" ${socialUpForm.platform==="instagram"?"selected":""}>اینستاگرام</option>
            <option value="threads" ${socialUpForm.platform==="threads"?"selected":""}>تردز</option>
          </select>
        </div>
        <div class="field"><label>نوع</label>
          <select id="su_kind" onchange="updateSocialUpForm('kind', this.value)">
            <option value="post" ${socialUpForm.kind==="post"?"selected":""}>پست</option>
            <option value="reel" ${socialUpForm.kind==="reel"?"selected":""}>ریلز</option>
            <option value="story" ${socialUpForm.kind==="story"?"selected":""}>استوری</option>
          </select>
        </div>
      </div>
      <div class="field"><label>فایل (عکس یا ویدیو)</label><input type="file" id="su_file" accept="image/*,video/*"></div>
      <div class="field"><label>کپشن</label><textarea class="textbox" id="su_caption" rows="4" placeholder="متن کپشن...">${escapeHtml(socialUpForm.caption)}</textarea></div>
      ${socialUpForm.kind!=="post" ? `<div class="field"><label>توضیح کوتاه ویدیو (چون هوش مصنوعی فعلاً ویدیو رو نمی‌بینه، اینجا خلاصه‌ش کن)</label><textarea class="textbox" id="su_videonote" rows="2" placeholder="مثلاً: اسکرین‌رکورد از صفحه‌ی امروز، تیک زدن ۲ فعالیت، زوم رو حلقه‌ی پیشرفت">${escapeHtml(socialUpForm.videoNote)}</textarea></div>` : ``}
      ${socialUpError ? `<div class="login-error" style="margin-bottom:10px;">${escapeHtml(socialUpError)}</div>` : ``}
      <button class="primary-btn" ${socialUpBusy?"disabled":""} onclick="uploadSocialContent()">${socialUpBusy?"در حال آپلود...":"افزودن به صف"}</button>
    </div>
    <div class="panel">${socialContentLoading ? `<div class="loading-state">در حال بارگذاری...</div>` : renderSocialContentList(socialContent)}</div>
  `;
}
async function uploadSocialContent(){
  const captionEl = document.getElementById("su_caption");
  const videoNoteEl = document.getElementById("su_videonote");
  const fileEl = document.getElementById("su_file");
  const caption = (captionEl?.value || "").trim();
  const videoNote = (videoNoteEl?.value || "").trim();
  const file = fileEl?.files?.[0];

  socialUpError = "";
  if(!file){ socialUpError = "یه فایل انتخاب کن."; render(); return; }

  socialUpBusy = true; render();
  const path = `${socialUpForm.platform}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g,"_")}`;
  const { error: upErr } = await sb.storage.from("social-media").upload(path, file);
  if(upErr){
    socialUpBusy = false; socialUpError = "آپلود فایل ناموفق بود."; render(); return;
  }
  const { error: insErr } = await sb.from("social_content").insert({
    platform: socialUpForm.platform, kind: socialUpForm.kind,
    caption, media_path: path, video_note: videoNote || null,
  });
  socialUpBusy = false;
  if(insErr){ socialUpError = "ثبت تو صف ناموفق بود."; render(); return; }
  socialUpForm = { platform: socialUpForm.platform, kind: socialUpForm.kind, caption:"", videoNote:"" };
  await loadSocialContent(true);
}
async function requestAiReview(id){
  socialReviewingId = id; render();
  const { data, error } = await sb.functions.invoke("social-review-content", { body: { content_id: id } });
  socialReviewingId = null;
  if(error){ alert("بررسی هوش مصنوعی ناموفق بود."); render(); return; }
  await loadSocialContent(true);
}
async function approveSocialContent(id){
  await sb.from("social_content").update({ status:"approved" }).eq("id", id);
  await loadSocialContent(true);
}
async function rejectSocialContent(id){
  const reason = prompt("دلیل رد کردن (اختیاری):") || null;
  await sb.from("social_content").update({ status:"rejected", reject_reason: reason }).eq("id", id);
  await loadSocialContent(true);
}
async function setSocialSchedule(id, inputId){
  const val = document.getElementById(inputId)?.value;
  if(!val) return;
  await sb.from("social_content").update({
    scheduled_at: new Date(val).toISOString(), status: "scheduled",
  }).eq("id", id);
  await loadSocialContent(true);
}
async function deleteSocialContent(id, mediaPath){
  if(!confirm("این آیتم برای همیشه حذف بشه؟")) return;
  await sb.from("social_content").delete().eq("id", id);
  if(mediaPath) await sb.storage.from("social-media").remove([mediaPath]);
  await loadSocialContent(true);
}
function renderSocialContentList(list){
  if(!list.length) return `<div class="empty-state">هنوز چیزی تو صف نیست.</div>`;
  return list.map(c => `
    <div class="panel" style="padding:16px 18px; margin-bottom:12px;">
      <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:10px; flex-wrap:wrap;">
        <div>
          <span class="badge ${SOCIAL_STATUS_BADGE[c.status]}">${SOCIAL_STATUS_LABEL[c.status]}</span>
          <span class="mono" style="color:var(--faint); font-size:12px; margin-inline-start:8px;">${escapeHtml(c.platform)} · ${c.kind==="post"?"پست":c.kind==="reel"?"ریلز":"استوری"}</span>
        </div>
        <div class="mono" style="color:var(--faint); font-size:11.5px;">${fmtDate(c.created_at)}</div>
      </div>
      ${c.caption ? `<div style="margin-top:10px; white-space:pre-wrap; font-size:13.5px;">${escapeHtml(c.caption)}</div>` : ``}
      ${c.video_note ? `<div style="margin-top:6px; color:var(--muted); font-size:12.5px;">🎬 ${escapeHtml(c.video_note)}</div>` : ``}
      ${c.ai_feedback ? `<div style="margin-top:10px; padding:10px 12px; border-radius:10px; background:${c.ai_verdict==='looks_good'?'var(--emerald-soft)':'var(--amber-soft)'};">
          <div style="font-size:11px; font-weight:700; margin-bottom:4px; color:${c.ai_verdict==='looks_good'?'var(--emerald)':'var(--amber)'};">${c.ai_verdict==='looks_good'?'✓ نظر هوش مصنوعی: خوبه':'⚠ نظر هوش مصنوعی: نیاز به بازبینی'}</div>
          <div style="font-size:13px;">${escapeHtml(c.ai_feedback)}</div>
        </div>` : ``}
      ${c.reject_reason ? `<div style="margin-top:8px; color:var(--rose); font-size:12.5px;">دلیل رد: ${escapeHtml(c.reject_reason)}</div>` : ``}
      ${c.scheduled_at ? `<div style="margin-top:8px; font-size:12.5px; color:var(--muted);">زمان‌بندی برای: <span class="mono">${fmtDate(c.scheduled_at)}</span></div>` : ``}
      <div class="btn-row" style="margin-top:12px;">
        ${c.status==="pending_review" ? `
          <button class="row-btn" ${socialReviewingId===c.id?"disabled":""} onclick="requestAiReview(${safeId(c.id)})">${socialReviewingId===c.id?"در حال بررسی...":"بررسی با هوش مصنوعی"}</button>
          <button class="row-btn on" onclick="approveSocialContent(${safeId(c.id)})">تایید</button>
          <button class="row-btn danger" onclick="rejectSocialContent(${safeId(c.id)})">رد</button>
        ` : ``}
        ${c.status==="approved" ? `
          <input type="datetime-local" id="sc_time_${c.id}" class="mono" style="padding:8px; border-radius:8px; border:1px solid var(--line); background:var(--surface-2); color:var(--text);">
          <button class="row-btn on" onclick="setSocialSchedule(${safeId(c.id)}, 'sc_time_${c.id}')">زمان‌بندی کن</button>
          <div style="color:var(--faint); font-size:11.5px; width:100%; margin-top:4px;">بعد از وصل‌شدن به اینستاگرام/تردز، انتشار سر همین ساعت خودکار می‌شه — فعلاً یادآوری دستیه.</div>
        ` : ``}
        <button class="row-btn danger" data-path="${escapeHtml(c.media_path || "")}" onclick="deleteSocialContent(${safeId(c.id)}, this.dataset.path || null)">حذف</button>
      </div>
    </div>
  `).join("");
}

/* ---------- Tab 2: charters ---------- */
const CHARTER_LABELS = { comment:"اساسنامه‌ی کامنت", dm:"اساسنامه‌ی دایرکت", content_review:"اساسنامه‌ی بررسی محتوا" };
function onCharterInput(kind, val){ socialCharters[kind] = val; socialCharterDirty[kind] = true; }
async function saveCharter(kind){
  socialCharterSaving[kind] = true; render();
  await sb.from("social_charters").upsert({ kind, content: socialCharters[kind], updated_at: new Date().toISOString() });
  socialCharterSaving[kind] = false; socialCharterDirty[kind] = false; render();
}
function renderSocialChartersTab(){
  if(socialChartersLoading) return `<div class="panel"><div class="loading-state">در حال بارگذاری...</div></div>`;
  return Object.keys(CHARTER_LABELS).map(kind => `
    <div class="panel" style="padding:18px 20px; margin-bottom:16px;">
      <div style="font-weight:800; margin-bottom:10px;">${CHARTER_LABELS[kind]}</div>
      <textarea class="textbox" rows="10" oninput="onCharterInput('${kind}', this.value)">${escapeHtml(socialCharters[kind] || "")}</textarea>
      <button class="primary-btn" style="margin-top:10px;" ${socialCharterSaving[kind]?"disabled":""} onclick="saveCharter('${kind}')">${socialCharterSaving[kind]?"در حال ذخیره...":socialCharterDirty[kind]?"ذخیره‌ی تغییرات":"ذخیره"}</button>
    </div>
  `).join("");
}

/* ---------- Tab 3: engagement (comment/DM) ---------- */
const ENG_STATUS_LABEL = { needs_review:"نیاز به بررسی", drafted:"پیش‌نویس آماده", replied:"جواب داده شد", ignored:"نادیده گرفته شد" };
const ENG_STATUS_BADGE = { needs_review:"pending", drafted:"approved", replied:"approved", ignored:"rejected" };
function updateSocialEngForm(field, val){ socialEngForm[field] = val; }
function renderSocialEngagementTab(){
  return `
    <div class="panel" style="padding:20px; margin-bottom:16px;">
      <div style="font-weight:800; margin-bottom:14px;">کامنت یا دایرکت جدید (پیست کن، هوش مصنوعی پیش‌نویس جواب می‌سازه)</div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px;">
        <div class="field"><label>نوع</label>
          <select id="se_kind" onchange="updateSocialEngForm('kind', this.value)">
            <option value="comment" ${socialEngForm.kind==="comment"?"selected":""}>کامنت</option>
            <option value="dm" ${socialEngForm.kind==="dm"?"selected":""}>دایرکت</option>
          </select>
        </div>
        <div class="field"><label>آیدی/اسم فرستنده (اختیاری)</label><input type="text" id="se_author" value="${escapeHtml(socialEngForm.author)}" placeholder="@username"></div>
      </div>
      <div class="field"><label>متن پیام</label><textarea class="textbox" id="se_body" rows="3" placeholder="متن کامنت یا دایرکت رو اینجا پیست کن...">${escapeHtml(socialEngForm.body)}</textarea></div>
      <button class="primary-btn" ${socialEngBusy?"disabled":""} onclick="addEngagementAndDraft()">${socialEngBusy?"در حال ساخت پیش‌نویس...":"ثبت و پیش‌نویس بگیر"}</button>
    </div>
    <div class="panel">${socialEngagementLoading ? `<div class="loading-state">در حال بارگذاری...</div>` : renderSocialEngagementList(socialEngagement)}</div>
  `;
}
async function addEngagementAndDraft(){
  const authorEl = document.getElementById("se_author");
  const bodyEl = document.getElementById("se_body");
  const author = (authorEl?.value || "").trim();
  const body = (bodyEl?.value || "").trim();
  if(!body){ alert("متن پیام رو وارد کن."); return; }
  socialEngBusy = true; render();
  const { data, error } = await sb.from("social_engagement").insert({
    kind: socialEngForm.kind, author_handle: author || null, body,
  }).select().single();
  if(error || !data){ socialEngBusy = false; alert("ثبت ناموفق بود."); render(); return; }
  await sb.functions.invoke("social-draft-reply", { body: { engagement_id: data.id } });
  socialEngBusy = false;
  socialEngForm = { kind: socialEngForm.kind, author:"", body:"" };
  await loadSocialEngagement(true);
}
async function redraftReply(id){
  socialDraftingId = id; render();
  await sb.functions.invoke("social-draft-reply", { body: { engagement_id: id } });
  socialDraftingId = null;
  await loadSocialEngagement(true);
}
async function markEngagementReplied(id, text){
  await sb.from("social_engagement").update({
    status:"replied", final_reply: text, replied_at: new Date().toISOString(),
  }).eq("id", id);
  await loadSocialEngagement(true);
}
async function ignoreEngagement(id){
  await sb.from("social_engagement").update({ status:"ignored" }).eq("id", id);
  await loadSocialEngagement(true);
}
function copySocialText(text){
  if(navigator.clipboard) navigator.clipboard.writeText(text).catch(()=>{});
}
function renderSocialEngagementList(list){
  if(!list.length) return `<div class="empty-state">هنوز کامنت/دایرکتی ثبت نکردی.</div>`;
  return list.map(e => `
    <div class="panel" style="padding:16px 18px; margin-bottom:12px;">
      <div style="display:flex; justify-content:space-between; gap:10px; flex-wrap:wrap;">
        <div>
          <span class="badge ${ENG_STATUS_BADGE[e.status]}">${ENG_STATUS_LABEL[e.status]}</span>
          <span class="mono" style="color:var(--faint); font-size:12px; margin-inline-start:8px;">${e.kind==="dm"?"دایرکت":"کامنت"}${e.author_handle?` · ${escapeHtml(e.author_handle)}`:``}</span>
        </div>
        <div class="mono" style="color:var(--faint); font-size:11.5px;">${fmtDate(e.created_at)}</div>
      </div>
      <div style="margin-top:8px; font-size:13.5px; color:var(--muted);">«${escapeHtml(e.body)}»</div>
      ${e.suggested_reply ? `<div style="margin-top:10px; padding:10px 12px; border-radius:10px; background:var(--card);">
          <div style="font-size:11px; font-weight:700; margin-bottom:4px; color:var(--gold);">پیش‌نویس جواب</div>
          <div style="font-size:13.5px; white-space:pre-wrap;">${escapeHtml(e.suggested_reply)}</div>
        </div>` : ``}
      <div class="btn-row" style="margin-top:12px;">
        ${e.status==="needs_review" || e.status==="drafted" ? `
          <button class="row-btn" ${socialDraftingId===e.id?"disabled":""} onclick="redraftReply(${safeId(e.id)})">${socialDraftingId===e.id?"در حال ساخت...":"پیش‌نویس دوباره"}</button>
        ` : ``}
        ${e.suggested_reply && e.status!=="replied" ? `
          <button class="row-btn" data-text="${escapeHtml(e.suggested_reply)}" onclick="copySocialText(this.dataset.text)">کپی متن</button>
          <button class="row-btn on" data-text="${escapeHtml(e.suggested_reply)}" onclick="markEngagementReplied(${safeId(e.id)}, this.dataset.text)">جواب دادم</button>
        ` : ``}
        ${e.status!=="replied" && e.status!=="ignored" ? `<button class="row-btn danger" onclick="ignoreEngagement(${safeId(e.id)})">نادیده بگیر</button>` : ``}
      </div>
    </div>
  `).join("");
}

/* ---------- Tab 4: research ---------- */
const RESEARCH_KIND_LABEL = { trend:"ترند", hook:"هوک برتر", competitor:"رقیب", tweet_suggestion:"پیشنهاد توییت" };
function toggleSocialResearchUsed(){ socialResearchShowUsed = !socialResearchShowUsed; render(); }
async function markResearchUsed(id, current){
  await sb.from("social_research").update({ used: !current }).eq("id", id);
  await loadSocialResearch(true);
}
async function runSocialResearchNow(mode){
  socialResearchRunning = mode; render();
  const { error } = await sb.functions.invoke("social-research", { body: { mode } });
  socialResearchRunning = null;
  if(error){ alert("اجرای تحقیق ناموفق بود."); render(); return; }
  await loadSocialResearch(true);
}
function renderSocialResearchTab(){
  const list = socialResearch.filter(r => socialResearchShowUsed || !r.used);
  return `
    <div class="topbar" style="margin-bottom:14px;">
      <div class="btn-row">
        <button class="row-btn" ${socialResearchRunning==='instagram_research'?"disabled":""} onclick="runSocialResearchNow('instagram_research')">${socialResearchRunning==='instagram_research'?"در حال اجرا...":"↻ تحقیق اینستاگرام الان"}</button>
        <button class="row-btn" ${socialResearchRunning==='tweet_suggestion'?"disabled":""} onclick="runSocialResearchNow('tweet_suggestion')">${socialResearchRunning==='tweet_suggestion'?"در حال اجرا...":"↻ پیشنهاد توییت الان"}</button>
      </div>
      <label style="display:flex; align-items:center; gap:6px; font-size:12.5px; color:var(--muted); cursor:pointer;">
        <input type="checkbox" ${socialResearchShowUsed?"checked":""} onchange="toggleSocialResearchUsed()"> نمایش استفاده‌شده‌ها
      </label>
    </div>
    <div style="color:var(--faint); font-size:12px; margin-bottom:14px;">این تب با pg_cron خودش هر چند ساعت/روز پر می‌شه (توضیح تو SOCIAL_README.md) — دکمه‌های بالا فقط برای اجرای فوری/دستی‌ان.</div>
    <div class="panel">${socialResearchLoading ? `<div class="loading-state">در حال بارگذاری...</div>` : (list.length ? list.map(r => `
      <div style="padding:14px 18px; border-bottom:1px solid var(--line); ${r.used?'opacity:.5;':''}">
        <div style="display:flex; justify-content:space-between; gap:10px; flex-wrap:wrap;">
          <div><span class="badge approved">${RESEARCH_KIND_LABEL[r.kind]||r.kind}</span> <span class="mono" style="color:var(--faint); font-size:12px;">${escapeHtml(r.platform||"")}</span></div>
          <div class="mono" style="color:var(--faint); font-size:11.5px;">${fmtDate(r.created_at)}</div>
        </div>
        <div style="margin-top:8px; font-weight:700; font-size:13.5px;">${escapeHtml(r.title||"")}</div>
        <div style="margin-top:4px; font-size:13px; color:var(--muted); white-space:pre-wrap;">${escapeHtml(r.body||"")}</div>
        ${/^https?:\/\//i.test(r.source_url || "") ? `<a href="${escapeHtml(r.source_url)}" target="_blank" rel="noopener" style="font-size:11.5px; color:var(--gold);">منبع ↗</a>` : ``}
        <div class="btn-row" style="margin-top:8px;">
          ${r.body ? `<button class="row-btn" data-text="${escapeHtml(r.body)}" onclick="copySocialText(this.dataset.text)">کپی</button>` : ``}
          <button class="row-btn ${r.used?'on':''}" onclick="markResearchUsed(${safeId(r.id)}, ${r.used})">${r.used?"علامت به‌عنوان استفاده‌نشده":"علامت به‌عنوان استفاده‌شده"}</button>
        </div>
      </div>
    `).join("") : `<div class="empty-state">هنوز چیزی پیدا نشده. دکمه‌ی «تحقیق الان» رو بزن یا صبر کن pg_cron اجراش کنه.</div>`)}</div>
  `;
}

/* ---------- Behavior view (رفتار کاربران) ----------
   همه‌چیز از همون profiles.data که ادمین از قبل می‌خونه حساب می‌شه — هیچ query یا تابع سمت سرور اضافه‌ای لازم نیست.
   ساختار داده: data.activities = [{id,title,icon,points,days:["daily"] | ["sat","mon",...]}]،
   data.history = { "YYYY-MM-DD": [activityId,...] } (هر id یعنی اون روز تیک خورده).
   عمداً فقط عنوان/برنامه/تعداد انجام نشون داده می‌شه؛ حس روز، یادداشت‌ها و متن کتاب‌ها اینجا نمایش داده نمی‌شن. */
let behaviorRange = 14;            // 7 | 14 | 30 | 0 (0 = از روز عضویت)
let behaviorSort = "completions";  // completions | users | rate
let behaviorUserSort = "recent";   // recent | completions | habits | joined
let behaviorDrawerUserId = null;

const SUGGESTED_HABIT_TITLES = [
  "کاهش اسکرین‌تایم","ورزش / باشگاه","مدیتیشن / ذهن‌آگاهی","نوشتن روزانه / ژورنال","کتاب‌خوانی","پیاده‌روی روزانه",
  "بیداری زودهنگام","خواب به‌موقع","پرهیز از فست‌فود","یادگیری زبان یا مهارت جدید","حرکات کششی / استرچینگ",
  "نوشیدن آب کافی","مرتب کردن اتاق یا میز کار","تماس با خانواده یا دوست","نخ دندان / مسواک شبانه","یادداشت شکرگزاری",
  "خالی کردن اینباکس ایمیل","ثبت هزینه‌های روزانه","مرور و برنامه‌ریزی هفته","مصرف ویتامین / دارو"
];
const WEEKDAY_KEYS = ["sun","mon","tue","wed","thu","fri","sat"]; // مطابق Date.getDay()
const WEEKDAY_FA = {sat:"شنبه", sun:"یکشنبه", mon:"دوشنبه", tue:"سه‌شنبه", wed:"چهارشنبه", thu:"پنجشنبه", fri:"جمعه"};

function habitKey(title){
  return String(title||"").replace(/[\u200c\u200f\u200e\s]+/g,"").replace(/ي/g,"ی").replace(/ك/g,"ک").toLowerCase();
}
const SUGGESTED_KEYS = new Set(SUGGESTED_HABIT_TITLES.map(habitKey));
function isSuggestedHabit(title){ return SUGGESTED_KEYS.has(habitKey(title)); }
function scheduleLabel(days){
  if(!Array.isArray(days) || days.length===0 || days.includes("daily")) return "هر روز";
  return days.length===7 ? "هر روز" : ["sat","sun","mon","tue","wed","thu","fri"].filter(k=>days.includes(k)).map(k=>WEEKDAY_FA[k]).join("، ");
}
function isScheduledOn(act, dateObj){
  const days = act && act.days;
  if(!Array.isArray(days) || days.length===0 || days.includes("daily")) return true;
  return days.includes(WEEKDAY_KEYS[dateObj.getDay()]);
}
function clampStr(s, n){ s = String(s||""); return s.length>n ? s.slice(0,n)+"…" : s; }

/* آمار رفتاری یه کاربر در بازه‌ی انتخاب‌شده. چون تاریخ ساخته‌شدن هر عادت تو دیتا ذخیره نمی‌شه،
   «فرصت‌ها» از روز عضویت (یا ابتدای بازه، هرکدوم دیرتر) حساب می‌شه؛ پس نرخ برای عادت‌هایی که دیرتر ساخته شدن
   کمی کمتر از واقعیته. */
function behaviorOf(row, range){
  const d = (row && row.data) || {};
  const acts = Array.isArray(d.activities) ? d.activities : [];
  const hist = (d.history && typeof d.history==="object") ? d.history : {};
  const today = new Date(); today.setHours(0,0,0,0);
  const created = row.created_at ? new Date(row.created_at) : today; created.setHours(0,0,0,0);
  let start = new Date(today);
  if(range>0){ start.setDate(start.getDate()-(range-1)); if(created>start) start = new Date(created); }
  else start = new Date(created);
  const startKey = todayKeyLocal(start), todayKey = todayKeyLocal(today);
  const sevenAgo = new Date(today); sevenAgo.setDate(sevenAgo.getDate()-6); const sevenKey = todayKeyLocal(sevenAgo);

  const histKeys = Object.keys(hist).filter(k=>Array.isArray(hist[k]) && hist[k].length>0).sort();
  const lastActive = histKeys.length ? histKeys[histKeys.length-1] : null;
  let totalDone = 0, doneInRange = 0, doneLast7 = 0, activeDaysInRange = 0;
  histKeys.forEach(k=>{
    const n = hist[k].length; totalDone += n;
    if(k>=startKey && k<=todayKey){ doneInRange += n; activeDaysInRange++; }
    if(k>=sevenKey && k<=todayKey) doneLast7 += n;
  });

  const perHabit = acts.map(a=>{
    let done = 0, doneRange = 0, opp = 0;
    histKeys.forEach(k=>{
      if(hist[k].includes(a.id)){ done++; if(k>=startKey && k<=todayKey) doneRange++; }
    });
    for(let dt = new Date(start); dt<=today; dt.setDate(dt.getDate()+1)){
      if(isScheduledOn(a, dt)) opp++;
    }
    return { id:a.id, title:a.title||"", icon:a.icon||"", points:a.points||0, days:a.days, done, doneRange, opp,
             rate: opp>0 ? Math.min(1, doneRange/opp) : null };
  });
  return { habits: perHabit, habitCount: acts.length, totalDone, doneInRange, doneLast7, activeDaysInRange, lastActive,
           hasDone: totalDone>0, active7: doneLast7>0 };
}
/* ---------- Books + Health behavior (per user / overview) ----------
   کتاب: data.books = {library:[{title,authors,status,currentPage,pages,genre,...}], log:[{dateKey,pages,minutes,note,...}], points, streak, monthlyGoal}
   سلامت: data.health = {profile, food, sports, workoutPlan, mealPlan, weightLog, activityLog, planDone, chatHistory, challenges, xpEarned}
   عمداً نشون داده نمی‌شه: note جلسه‌های مطالعه، عکس جلد، وزن/قد/سن/وزن هدف، مقدارهای ثبت وزن، محدودیت‌ها و حساسیت‌های غذایی،
   متن چت با مربی سلامت و جزئیات تمرین‌ها/وعده‌ها. فقط «چه چیزی استفاده شده و چقدر» نمایش داده می‌شه. */
const BOOK_STATUS_FA = { reading:"در حال خواندن", finished:"تمام‌شده", wishlist:"لیست آرزو" };
const HEALTH_GOAL_FA = { lose:"کاهش وزن", activity:"فعال‌تر شدن", habit:"عادت‌سازی", energy:"انرژی بیشتر" };
const HEALTH_LEVEL_FA = { beginner:"مبتدی", intermediate:"متوسط", advanced:"پیشرفته" };

function rangeStartKey(row, range){
  const today = new Date(); today.setHours(0,0,0,0);
  const created = row && row.created_at ? new Date(row.created_at) : new Date(today); created.setHours(0,0,0,0);
  if(range>0){ const s = new Date(today); s.setDate(s.getDate()-(range-1)); return todayKeyLocal(created>s ? created : s); }
  return todayKeyLocal(created);
}
function booksBehaviorOf(row, range){
  const bk = row && row.data && row.data.books;
  const empty = { used:false, libCount:0, reading:0, finished:0, wishlist:0, sessions:0, sessionsRange:0, pagesRange:0, minutesRange:0, activeDaysRange:0, lastRead:null, points:0, streak:0, monthlyGoal:0, library:[] };
  if(!bk || typeof bk!=="object") return empty;
  const startKey = rangeStartKey(row, range), todayKey = todayKeyLocal();
  const lib = Array.isArray(bk.library) ? bk.library : [];
  const log = Array.isArray(bk.log) ? bk.log : [];
  const days = new Set(); let sessionsRange = 0, pagesRange = 0, minutesRange = 0, lastRead = null;
  log.forEach(l=>{
    const k = (l && l.dateKey) || "";
    if(k && (!lastRead || k>lastRead)) lastRead = k;
    if(k && k>=startKey && k<=todayKey){ sessionsRange++; pagesRange += Number(l.pages)||0; minutesRange += Number(l.minutes)||0; days.add(k); }
  });
  const cnt = s => lib.filter(x=>x && x.status===s).length;
  return { used: lib.length>0 || log.length>0, libCount:lib.length, reading:cnt("reading"), finished:cnt("finished"), wishlist:cnt("wishlist"),
           sessions:log.length, sessionsRange, pagesRange, minutesRange, activeDaysRange:days.size, lastRead,
           points:bk.points||0, streak:(bk.streak && bk.streak.count)||0, monthlyGoal:bk.monthlyGoal||0, library:lib };
}
function healthBehaviorOf(row, range){
  const h = row && row.data && row.data.health;
  const empty = { used:false, profileDone:false, foodDone:false, goal:"", level:"", activityLevel:"", daysPerWeek:null, minutes:null, sportLikes:[],
                  workoutTitle:null, workoutDays:0, workoutCreated:null, mealPlan:false, mealCount:0, mealPlanCreated:null, weightEntries:0,
                  activityDaysAll:0, activityDaysRange:0, planDoneDaysRange:0, chatMessages:0, challenges:0, xp:0 };
  if(!h || typeof h!=="object") return empty;
  const startKey = rangeStartKey(row, range), todayKey = todayKeyLocal();
  const dateKeys = obj => (obj && typeof obj==="object") ? Object.keys(obj).filter(k=>/^\d{4}-\d{2}-\d{2}$/.test(k) && (!Array.isArray(obj[k]) || obj[k].length>0)) : [];
  const inRange = ks => ks.filter(k=>k>=startKey && k<=todayKey).length;
  const p = h.profile || {}, f = h.food || {}, s = h.sports || {};
  const wp = (h.workoutPlan && typeof h.workoutPlan==="object") ? h.workoutPlan : null;
  const mp = (h.mealPlan && typeof h.mealPlan==="object") ? h.mealPlan : null;
  const actKeys = dateKeys(h.activityLog);
  const out = {
    used:false, profileDone:!!p.completed, foodDone:!!f.completed,
    goal:p.mainGoal||"", goals:Array.isArray(p.mainGoals)?p.mainGoals:[], level:p.level||"", activityLevel:p.activityLevel||"", daysPerWeek:p.daysPerWeek||null, minutes:p.minutesPerSession||null,
    sportLikes:Array.isArray(s.likes)?s.likes:[],
    workoutTitle: wp ? (wp.title||"برنامه‌ی تمرین") : null,
    workoutDays: wp && Array.isArray(wp.days) ? wp.days.filter(d=>d && !d.rest).length : 0,
    workoutCreated: wp ? (wp.createdAt||null) : null,
    mealPlan: !!mp, mealCount: mp && Array.isArray(mp.meals) ? mp.meals.length : 0, mealPlanCreated: mp ? (mp.createdAt||null) : null,
    weightEntries: Array.isArray(h.weightLog) ? h.weightLog.length : 0,
    activityDaysAll: actKeys.length, activityDaysRange: inRange(actKeys), planDoneDaysRange: inRange(dateKeys(h.planDone)),
    chatMessages: Array.isArray(h.chatHistory) ? h.chatHistory.length : 0,
    challenges: Array.isArray(h.challenges) ? h.challenges.length : 0, xp: h.xpEarned||0,
  };
  out.used = out.profileDone || out.foodDone || !!wp || !!mp || out.weightEntries>0 || out.activityDaysAll>0 || out.chatMessages>0;
  return out;
}
function fmtTs(ms){ return ms ? new Date(Number(ms)).toLocaleDateString("fa-IR") : "—"; }

function renderModulesOverview(){
  const users = realUsers();
  const total = users.length;
  const bs = users.map(u=>booksBehaviorOf(u, behaviorRange));
  const hs = users.map(u=>healthBehaviorOf(u, behaviorRange));
  const sum = (arr, f) => arr.reduce((n,x)=>n+(f(x)||0), 0);
  const cntIf = (arr, f) => arr.filter(f).length;
  const row = (l, v) => `<div class="mod-row"><span>${l}</span><span class="mono">${v}</span></div>`;
  return `
    <div class="module-grid">
      <div class="pulse-card" style="margin-bottom:0;">
        <div class="pulse-head"><div class="pulse-title">📖 کتاب <span>${rangeLabel()}</span></div></div>
        ${row("کاربر با حداقل یک کتاب/ثبت مطالعه", `${faNum(cntIf(bs,x=>x.used))} از ${faNum(total)}`)}
        ${row("کاربر با ثبت مطالعه در بازه", faNum(cntIf(bs,x=>x.sessionsRange>0)))}
        ${row("جلسه‌ی مطالعه در بازه", faNum(sum(bs,x=>x.sessionsRange)))}
        ${row("صفحه / دقیقه در بازه", `${faNum(sum(bs,x=>x.pagesRange))} / ${faNum(sum(bs,x=>x.minutesRange))}`)}
        ${row("کتاب‌ها: در حال خواندن / تمام‌شده / آرزو", `${faNum(sum(bs,x=>x.reading))} / ${faNum(sum(bs,x=>x.finished))} / ${faNum(sum(bs,x=>x.wishlist))}`)}
      </div>
      <div class="pulse-card" style="margin-bottom:0;">
        <div class="pulse-head"><div class="pulse-title">💪 سلامت <span>${rangeLabel()}</span></div></div>
        ${row("کاربر با استفاده از تب سلامت", `${faNum(cntIf(hs,x=>x.used))} از ${faNum(total)}`)}
        ${row("پروفایل کامل / ترجیحات غذایی کامل", `${faNum(cntIf(hs,x=>x.profileDone))} / ${faNum(cntIf(hs,x=>x.foodDone))}`)}
        ${row("برنامه‌ی تمرین / برنامه‌ی غذایی ساخته‌شده", `${faNum(cntIf(hs,x=>!!x.workoutTitle))} / ${faNum(cntIf(hs,x=>x.mealPlan))}`)}
        ${row("کاربر با فعالیت ثبت‌شده در بازه", faNum(cntIf(hs,x=>x.activityDaysRange>0)))}
        ${row("کاربر با چت مربی / ثبت وزن", `${faNum(cntIf(hs,x=>x.chatMessages>0))} / ${faNum(cntIf(hs,x=>x.weightEntries>0))}`)}
      </div>
    </div>
  `;
}
function renderDrawerBooks(u){
  const b = booksBehaviorOf(u, behaviorRange);
  if(!b.used) return `<div class="drawer-section"><div class="drawer-label">📖 کتاب</div><div class="empty-state" style="padding:18px 0;">هنوز کتابی اضافه نکرده و مطالعه‌ای ثبت نکرده.</div></div>`;
  const lib = b.library.slice().sort((x,y)=>{
    const order = {reading:0, finished:1, wishlist:2};
    return (order[x.status]??3)-(order[y.status]??3);
  });
  return `
    <div class="drawer-section">
      <div class="drawer-label">📖 کتاب</div>
      <div class="stat-grid">
        <div class="stat-box"><div class="n">${faNum(b.libCount)}</div><div class="l">کتاب در کتابخانه</div></div>
        <div class="stat-box"><div class="n">${faNum(b.reading)} / ${faNum(b.finished)} / ${faNum(b.wishlist)}</div><div class="l">خواندن / تمام / آرزو</div></div>
        <div class="stat-box"><div class="n">${faNum(b.sessionsRange)}</div><div class="l">جلسه‌ی مطالعه (${rangeLabel()})</div></div>
        <div class="stat-box"><div class="n">${faNum(b.pagesRange)} / ${faNum(b.minutesRange)}</div><div class="l">صفحه / دقیقه (بازه)</div></div>
        <div class="stat-box"><div class="n">${faNum(b.points)}</div><div class="l">امتیاز کتاب</div></div>
        <div class="stat-box"><div class="n">${faNum(b.streak)}</div><div class="l">استریک فعلی</div></div>
        <div class="stat-box"><div class="n">${b.monthlyGoal ? faNum(b.monthlyGoal) : "—"}</div><div class="l">هدف ماهانه</div></div>
        <div class="stat-box"><div class="n">${b.lastRead ? fmtDate(b.lastRead) : "—"}</div><div class="l">آخرین مطالعه</div></div>
      </div>
      ${lib.length ? `<div class="drawer-label" style="margin-top:14px;">کتاب‌ها</div>` + lib.map(x=>{
        const pg = Number(x.pages)||0, cur = Number(x.currentPage)||0;
        const pct = pg>0 ? Math.min(100, Math.round(cur/pg*100)) : 0;
        return `<div class="habit-row">
          <div class="habit-row-top"><span>${escapeHtml(clampStr(x.title, 70))}</span><span class="badge ${x.status==='finished'?'premium':'free'}">${BOOK_STATUS_FA[x.status]||escapeHtml(x.status||"—")}</span></div>
          <div class="habit-row-meta">${escapeHtml(clampStr(x.authors||"", 50))}${x.genre ? " · "+escapeHtml(x.genre) : ""}${pg ? ` · ${faNum(cur)} از ${faNum(pg)} صفحه (${faNum(pct)}٪)` : ""}</div>
          ${pg && x.status!=="wishlist" ? `<div class="rate-bar wide"><i style="width:${pct}%"></i></div>` : ""}
        </div>`;
      }).join("") : ""}
    </div>
  `;
}
function renderDrawerHealth(u){
  const h = healthBehaviorOf(u, behaviorRange);
  if(!h.used) return `<div class="drawer-section"><div class="drawer-label">💪 سلامت</div><div class="empty-state" style="padding:18px 0;">هنوز از تب سلامت استفاده‌ای نکرده.</div></div>`;
  const flag = (ok, label) => `<span class="badge ${ok?'premium':'free'}">${ok?'✓':'—'} ${label}</span>`;
  return `
    <div class="drawer-section">
      <div class="drawer-label">💪 سلامت</div>
      <div style="display:flex; flex-wrap:wrap; gap:6px; margin-bottom:12px;">
        ${flag(h.profileDone,"پروفایل")}${flag(h.foodDone,"ترجیحات غذایی")}${flag(!!h.workoutTitle,"برنامه‌ی تمرین")}${flag(h.mealPlan,"برنامه‌ی غذایی")}
      </div>
      <div class="stat-grid">
        <div class="stat-box"><div class="n" style="font-size:14px;">${(h.goals && h.goals.length ? h.goals : (h.goal ? [h.goal] : [])).map(g=>escapeHtml(HEALTH_GOAL_FA[g]||g)).join("، ") || "—"}</div><div class="l">هدف اصلی</div></div>
        <div class="stat-box"><div class="n" style="font-size:14px;">${h.level ? escapeHtml(HEALTH_LEVEL_FA[h.level]||h.level) : "—"}</div><div class="l">سطح ورزشی</div></div>
        <div class="stat-box"><div class="n">${h.daysPerWeek ? faNum(h.daysPerWeek) : "—"} / ${h.minutes ? faNum(h.minutes) : "—"}</div><div class="l">روز در هفته / دقیقه در جلسه</div></div>
        <div class="stat-box"><div class="n">${faNum(h.xp)}</div><div class="l">امتیاز سلامت</div></div>
        <div class="stat-box"><div class="n">${faNum(h.activityDaysRange)}</div><div class="l">روز دارای فعالیت (${rangeLabel()})</div></div>
        <div class="stat-box"><div class="n">${faNum(h.planDoneDaysRange)}</div><div class="l">روز انجام برنامه (بازه)</div></div>
        <div class="stat-box"><div class="n">${faNum(h.weightEntries)}</div><div class="l">دفعات ثبت وزن</div></div>
        <div class="stat-box"><div class="n">${faNum(h.chatMessages)}</div><div class="l">پیام چت با مربی</div></div>
      </div>
      ${h.workoutTitle ? `<div class="habit-row" style="margin-top:12px;"><div class="habit-row-top"><span>🏋️ ${escapeHtml(clampStr(h.workoutTitle, 70))}</span></div><div class="habit-row-meta">${faNum(h.workoutDays)} روز تمرین در هفته · ساخته‌شده ${fmtTs(h.workoutCreated)}</div></div>` : ""}
      ${h.mealPlan ? `<div class="habit-row"><div class="habit-row-top"><span>🥗 برنامه‌ی غذایی</span></div><div class="habit-row-meta">${faNum(h.mealCount)} وعده · ساخته‌شده ${fmtTs(h.mealPlanCreated)}</div></div>` : ""}
      ${h.sportLikes.length ? `<div class="drawer-label" style="margin-top:12px;">ورزش‌های موردعلاقه</div><div style="display:flex; flex-wrap:wrap; gap:6px;">${h.sportLikes.slice(0,20).map(x=>`<span class="badge free">${escapeHtml(clampStr(x, 24))}</span>`).join("")}</div>` : ""}
    </div>
  `;
}

function fmtPct(r){ return r==null ? "—" : Math.round(r*100).toLocaleString("fa-IR")+"٪"; }
function faNum(n){ return (Number(n)||0).toLocaleString("fa-IR"); }
// تعریف سراسری: پنل جایزه‌ها (renderAwardsPanel) بیرون از renderReadingAdminView هم ازش استفاده می‌کنه
function fa(n){ return String(n == null ? 0 : n).replace(/[0-9]/g, x => "۰۱۲۳۴۵۶۷۸۹"[x]); }

function aggregateHabits(stats){
  const map = new Map();
  stats.forEach(({user, b})=>{
    const seenForUser = new Set();
    b.habits.forEach(h=>{
      const key = habitKey(h.title); if(!key) return;
      let g = map.get(key);
      if(!g){ g = { key, titles:{}, users:0, activeUsers:0, doneAll:0, doneRange:0, opp:0, suggested:isSuggestedHabit(h.title), days:{} }; map.set(key, g); }
      g.titles[h.title.trim()] = (g.titles[h.title.trim()]||0)+1;
      if(!seenForUser.has(key)){ g.users++; seenForUser.add(key); if(h.doneRange>0) g.activeUsers++; }
      g.doneAll += h.done; g.doneRange += h.doneRange; g.opp += h.opp;
      const ds = (!Array.isArray(h.days) || !h.days.length || h.days.includes("daily")) ? ["sat","sun","mon","tue","wed","thu","fri"] : h.days;
      ds.forEach(k=>{ g.days[k] = (g.days[k]||0)+1; });
    });
  });
  const list = [...map.values()].map(g=>{
    const title = Object.entries(g.titles).sort((a,b)=>b[1]-a[1])[0][0];
    return Object.assign(g, { title, rate: g.opp>0 ? Math.min(1, g.doneRange/g.opp) : null });
  });
  const sorters = {
    completions: (a,b)=> b.doneRange-a.doneRange || b.users-a.users,
    users: (a,b)=> b.users-a.users || b.doneRange-a.doneRange,
    rate: (a,b)=> (b.rate==null?-1:b.rate)-(a.rate==null?-1:a.rate) || b.users-a.users,
  };
  return list.sort(sorters[behaviorSort] || sorters.completions);
}

function setBehaviorRange(r){ behaviorRange = r; render(); }
function setBehaviorSort(s){ behaviorSort = s; render(); }
function setBehaviorUserSort(s){ behaviorUserSort = s; render(); }
function openBehaviorDrawer(id){ behaviorDrawerUserId = id; render(); }
function closeBehaviorDrawer(){ behaviorDrawerUserId = null; render(); }
function rangeLabel(){ return behaviorRange===0 ? "از روز عضویت" : `${faNum(behaviorRange)} روز اخیر`; }

function renderBehaviorView(){
  const users = realUsers();
  const stats = users.map(u=>({ user:u, b:behaviorOf(u, behaviorRange) }));
  const total = users.length;
  const withHabit = stats.filter(s=>s.b.habitCount>0).length;
  const withDone = stats.filter(s=>s.b.hasDone).length;
  const active7 = stats.filter(s=>s.b.active7).length;
  const fx = users.map(funnelOf);
  const withPush = fx.filter(x=>x.reminder).length; // Web Push + ساعت یادآوری انتخاب‌شده + یادآوری هوشمند اندروید
  const totalDoneRange = stats.reduce((n,s)=>n+s.b.doneInRange,0);
  const habitsTotal = stats.reduce((n,s)=>n+s.b.habitCount,0);
  const pct = n => total ? Math.round(n/total*100) : 0;

  const funnel = [
    {label:"ثبت‌نام", n:total},
    {label:"آخرین قدم (اسم + موبایل)", n:fx.filter(x=>x.onboarded).length},
    {label:"«شروع سریع» دیده", n:fx.filter(x=>x.quickstart).length},
    {label:"حداقل یک عادت ساخته", n:withHabit},
    {label:"حداقل یک بار تیک زده", n:withDone},
    {label:"برگشته (روزهای بعد از ثبت‌نام)", n:fx.filter(x=>x.returned).length},
    {label:"فعال در ۷ روز اخیر", n:active7},
    {label:"یادآوری فعال", n:withPush},
  ];
  const ttf = fx.map(x=>x.minutesToFirstTick).filter(x=>x!==null).sort((a,b)=>a-b);
  const ttfMedian = ttf.length ? ttf[Math.floor(ttf.length/2)] : null;
  const src = {quickstart:0, chip:0, form:0}; fx.forEach(x=>{ if(x.habitSource && src[x.habitSource]!==undefined) src[x.habitSource]++; });
  const slots = {morning:0, noon:0, evening:0, night:0, none:0}; users.forEach(u=>{ const r=((u.data||{}).settings||{}).reminderSlot; if(r && slots[r]!==undefined) slots[r]++; });
  const habitsAgg = aggregateHabits(stats);
  const suggestedUsers = habitsAgg.filter(h=>h.suggested).reduce((n,h)=>n+h.users,0);
  const customUsers = habitsAgg.filter(h=>!h.suggested).reduce((n,h)=>n+h.users,0);

  // پراکندگی عادت‌ها در روزهای هفته (برنامه‌ریزی‌شده) و تیک‌های واقعی هر روز
  const dayTotals = {sat:0,sun:0,mon:0,tue:0,wed:0,thu:0,fri:0};
  habitsAgg.forEach(h=>{ Object.keys(dayTotals).forEach(k=>{ dayTotals[k]+=h.days[k]||0; }); });
  const dayMax = Math.max(1, ...Object.values(dayTotals));

  const userRows = stats.slice().sort((a,b)=>{
    if(behaviorUserSort==="completions") return b.b.doneInRange-a.b.doneInRange;
    if(behaviorUserSort==="habits") return b.b.habitCount-a.b.habitCount;
    if(behaviorUserSort==="joined") return new Date(b.user.created_at||0)-new Date(a.user.created_at||0);
    return String(b.b.lastActive||"").localeCompare(String(a.b.lastActive||""));
  });
  const rangeBtn = (r,l)=>`<button class="row-btn ${behaviorRange===r?'on':''}" onclick="setBehaviorRange(${r})">${l}</button>`;

  return `
    <div class="topbar">
      <div><div class="page-title">رفتار کاربران</div><div class="page-sub">عادت‌ها، کتاب و سلامت — بازه: ${rangeLabel()}</div></div>
      <div class="btn-row">
        ${rangeBtn(7,"۷ روز")}${rangeBtn(14,"۱۴ روز")}${rangeBtn(30,"۳۰ روز")}${rangeBtn(0,"از عضویت")}
        <button class="row-btn" onclick="loadAllData()">↻</button>
        ${testToggleBtn()}
      </div>
    </div>
    <div class="kpi-row">
      <div class="kpi-card"><div class="kpi-label">کاربرانی که عادت ساختن</div><div class="kpi-value gold">${faNum(withHabit)} <span style="font-size:12px; color:var(--muted);">از ${faNum(total)} · ${faNum(pct(withHabit))}٪</span></div></div>
      <div class="kpi-card"><div class="kpi-label">کل عادت‌های تعریف‌شده</div><div class="kpi-value">${faNum(habitsTotal)}</div></div>
      <div class="kpi-card"><div class="kpi-label">تیک‌های انجام‌شده (${rangeLabel()})</div><div class="kpi-value emerald">${faNum(totalDoneRange)}</div></div>
      <div class="kpi-card"><div class="kpi-label">عادت پیشنهادی / سفارشی</div><div class="kpi-value amber">${faNum(suggestedUsers)} <span style="font-size:12px; color:var(--muted);">/ ${faNum(customUsers)}</span></div></div>
    </div>

    <div class="pulse-card">
      <div class="pulse-head"><div class="pulse-title">قیف فعال‌سازی <span>هر مرحله چند نفر از کل ثبت‌نامی‌ها رسیدن</span></div></div>
      ${funnel.map(f=>`
        <div class="funnel-row">
          <div class="funnel-label">${f.label}</div>
          <div class="funnel-track"><div class="funnel-fill" style="width:${total? Math.max(2, f.n/total*100):0}%;"></div></div>
          <div class="funnel-num mono">${faNum(f.n)} <span class="muted-s">${faNum(pct(f.n))}٪</span></div>
        </div>`).join("")}
      <div class="page-sub" style="margin-top:12px; line-height:2;">
        منبع اولین عادت: شروع سریع ${faNum(src.quickstart)} · چیپ ${faNum(src.chip)} · فرم ${faNum(src.form)}
        ${ttfMedian!==null ? ` · میانه‌ی زمان ثبت‌نام تا اولین تیک: <b>${ttfMedian<1 ? "کمتر از ۱ دقیقه" : ttfMedian<120 ? faNum(Math.round(ttfMedian))+" دقیقه" : faNum(Math.round(ttfMedian/60))+" ساعت"}</b> (هدف: زیر ۱ دقیقه)` : ``}
        <br>ساعت یادآوری انتخاب‌شده: صبح ${faNum(slots.morning)} · ظهر ${faNum(slots.noon)} · عصر ${faNum(slots.evening)} · شب ${faNum(slots.night)} · «نه ممنون» ${faNum(slots.none)}
        <br><span style="color:var(--faint);">«شروع سریع»، منبع اولین عادت، زمان تا اولین تیک و ساعت یادآوری فقط برای کاربرهای بعد از نسخه‌ی ۱.۹ ثبت می‌شن.</span>
      </div>
    </div>

    ${renderModulesOverview()}
    ${renderPlusUsageCard(true)}

    <div style="height:22px;"></div>

    <div class="pulse-card">
      <div class="pulse-head"><div class="pulse-title">عادت‌ها در روزهای هفته <span>تعداد عادت‌هایی که برای هر روز برنامه‌ریزی شدن</span></div></div>
      <div class="stair-chart">
        ${["sat","sun","mon","tue","wed","thu","fri"].map(k=>`<div class="stair-bar" style="height:${Math.max(6, dayTotals[k]/dayMax*100)}%;"><span class="tip">${WEEKDAY_FA[k]} · ${faNum(dayTotals[k])} عادت</span></div>`).join("")}
      </div>
      <div class="day-labels">${["sat","sun","mon","tue","wed","thu","fri"].map(k=>`<span>${WEEKDAY_FA[k]}</span>`).join("")}</div>
    </div>

    <div class="panel" style="margin-bottom:22px;">
      <div class="panel-head">
        <h3>آمار هر عادت <span class="muted-s">(${faNum(habitsAgg.length)} عادت متفاوت)</span></h3>
        <div class="btn-row">
          <button class="row-btn ${behaviorSort==='completions'?'on':''}" onclick="setBehaviorSort('completions')">بیشترین انجام</button>
          <button class="row-btn ${behaviorSort==='users'?'on':''}" onclick="setBehaviorSort('users')">بیشترین کاربر</button>
          <button class="row-btn ${behaviorSort==='rate'?'on':''}" onclick="setBehaviorSort('rate')">بیشترین نرخ</button>
          <button class="row-btn" onclick="exportHabitsCSV()">⬇ CSV</button>
        </div>
      </div>
      <div class="page-sub" style="padding:0 20px 10px;">نرخ انجام تقریبیه: تاریخ ساخت هر عادت ذخیره نمی‌شه، پس فرصت‌ها از روز عضویت (یا ابتدای بازه) حساب می‌شن و برای عادت‌های دیرساخته کمی کمتر از واقعیته.</div>
      ${dataLoading ? `<div class="loading-state">در حال بارگذاری...</div>` : habitsAgg.length ? `
      <table>
        <thead><tr><th>عادت</th><th>نوع</th><th>کاربر</th><th>کاربر فعال در بازه</th><th>انجام در بازه</th><th>کل انجام</th><th>نرخ انجام</th></tr></thead>
        <tbody>
          ${habitsAgg.map(h=>`
            <tr>
              <td data-label="عادت">${escapeHtml(clampStr(h.title, 60))}</td>
              <td data-label="نوع"><span class="badge ${h.suggested?'premium':'free'}">${h.suggested?'پیشنهادی':'سفارشی'}</span></td>
              <td data-label="کاربر" class="mono">${faNum(h.users)}</td>
              <td data-label="فعال" class="mono">${faNum(h.activeUsers)}</td>
              <td data-label="انجام بازه" class="mono">${faNum(h.doneRange)}</td>
              <td data-label="کل انجام" class="mono">${faNum(h.doneAll)}</td>
              <td data-label="نرخ" class="mono"><span class="rate-cell"><span class="rate-bar"><i style="width:${h.rate==null?0:Math.round(h.rate*100)}%"></i></span>${fmtPct(h.rate)}</span></td>
            </tr>`).join("")}
        </tbody>
      </table>` : `<div class="empty-state">هنوز عادتی ساخته نشده.</div>`}
    </div>

    <div class="panel scroll-x">
      <div class="panel-head">
        <h3>به تفکیک کاربر</h3>
        <div class="btn-row">
          <button class="row-btn ${behaviorUserSort==='recent'?'on':''}" onclick="setBehaviorUserSort('recent')">آخرین فعالیت</button>
          <button class="row-btn ${behaviorUserSort==='completions'?'on':''}" onclick="setBehaviorUserSort('completions')">بیشترین انجام</button>
          <button class="row-btn ${behaviorUserSort==='habits'?'on':''}" onclick="setBehaviorUserSort('habits')">تعداد عادت</button>
          <button class="row-btn ${behaviorUserSort==='joined'?'on':''}" onclick="setBehaviorUserSort('joined')">جدیدترین</button>
          <button class="row-btn" onclick="exportBehaviorUsersCSV()">⬇ CSV</button>
        </div>
      </div>
      ${dataLoading ? `<div class="loading-state">در حال بارگذاری...</div>` : userRows.length ? `
      <table>
        <thead><tr><th>نام</th><th>عضویت</th><th>عادت‌ها</th><th>انجام (بازه)</th><th>انجام (۷ روز)</th><th>روز فعال (بازه)</th><th>آخرین فعالیت</th><th>کتاب (بازه)</th><th>سلامت</th><th>یادآوری</th><th></th></tr></thead>
        <tbody>
          ${userRows.map(({user:u,b})=>`
            <tr>
              <td data-label="نام">${escapeHtml(u.name)||"—"}</td>
              <td data-label="عضویت" class="mono">${fmtDate(u.created_at)}</td>
              <td data-label="عادت‌ها" class="mono">${b.habitCount ? faNum(b.habitCount) : '<span style="color:var(--rose);">۰</span>'}</td>
              <td data-label="انجام بازه" class="mono">${faNum(b.doneInRange)}</td>
              <td data-label="انجام ۷ روز" class="mono">${faNum(b.doneLast7)}</td>
              <td data-label="روز فعال" class="mono">${faNum(b.activeDaysInRange)}</td>
              <td data-label="آخرین فعالیت" class="mono">${b.lastActive ? fmtDate(b.lastActive) : "—"}</td>
              ${(()=>{ const bk=booksBehaviorOf(u,behaviorRange), hl=healthBehaviorOf(u,behaviorRange);
                return `<td data-label="کتاب" class="mono">${bk.used ? `${faNum(bk.libCount)} کتاب · ${faNum(bk.sessionsRange)} جلسه` : "—"}</td>
              <td data-label="سلامت">${hl.used ? `<span class="badge ${hl.profileDone?'premium':'free'}">${hl.profileDone?'پروفایل کامل':'ناقص'}</span>${hl.workoutTitle||hl.mealPlan ? ' <span class="muted-s">'+(hl.workoutTitle?'تمرین ':'')+(hl.mealPlan?'غذا':'')+'</span>' : ''}` : "—"}</td>`; })()}
              <td data-label="یادآوری">${pushOptInUserIds.has(u.id) ? '<span class="badge premium">فعال</span>' : '<span class="badge free">خاموش</span>'}</td>
              <td><button class="row-btn" onclick="openBehaviorDrawer('${safeId(u.id)}')">جزئیات</button></td>
            </tr>`).join("")}
        </tbody>
      </table>` : `<div class="empty-state">کاربری نیست.</div>`}
    </div>
  `;
}

function renderBehaviorDrawer(){
  const u = users.find(x=>x.id===behaviorDrawerUserId);
  if(!u) return `<div class="drawer-overlay"><div class="drawer"></div></div>`;
  const b = behaviorOf(u, behaviorRange);
  const habits = b.habits.slice().sort((x,y)=> y.doneRange-x.doneRange || y.done-x.done);
  return `
    <div class="drawer-overlay open" onclick="if(event.target===this) closeBehaviorDrawer()">
      <div class="drawer">
        <div class="drawer-head"><div class="drawer-title">${escapeHtml(u.name) || "بدون نام"}</div><button class="drawer-close" onclick="closeBehaviorDrawer()">×</button></div>
        <div class="drawer-section">
          <div class="stat-grid">
            <div class="stat-box"><div class="n">${faNum(b.habitCount)}</div><div class="l">عادت تعریف‌شده</div></div>
            <div class="stat-box"><div class="n">${faNum(b.totalDone)}</div><div class="l">کل تیک‌ها</div></div>
            <div class="stat-box"><div class="n">${faNum(b.doneInRange)}</div><div class="l">تیک (${rangeLabel()})</div></div>
            <div class="stat-box"><div class="n">${b.lastActive ? fmtDate(b.lastActive) : "—"}</div><div class="l">آخرین فعالیت</div></div>
          </div>
        </div>
        ${renderJourneySection(u)}
        <div class="drawer-section">
          <div class="drawer-label">✅ عادت‌های روزانه</div>
          ${habits.length ? habits.map(h=>`
            <div class="habit-row">
              <div class="habit-row-top"><span>${escapeHtml(h.icon)} ${escapeHtml(clampStr(h.title, 80))}</span><span class="badge ${isSuggestedHabit(h.title)?'premium':'free'}">${isSuggestedHabit(h.title)?'پیشنهادی':'سفارشی'}</span></div>
              <div class="habit-row-meta">${scheduleLabel(h.days)} · ${faNum(h.points)} امتیاز · انجام در بازه: ${faNum(h.doneRange)} · کل: ${faNum(h.done)} · نرخ: ${fmtPct(h.rate)}</div>
              <div class="rate-bar wide"><i style="width:${h.rate==null?0:Math.round(h.rate*100)}%"></i></div>
            </div>`).join("") : `<div class="empty-state" style="padding:24px 0;">این کاربر هنوز عادتی نساخته.</div>`}
        </div>
        ${renderDrawerBooks(u)}
        ${renderDrawerHealth(u)}
        <div style="color:var(--faint); font-size:11.5px; line-height:1.9;">عنوان عادت‌ها و کتاب‌ها متن آزاده که خود کاربر نوشته. حس روز، یادداشت‌ها، وزن/قد/سن، محدودیت‌های غذایی و متن چت سلامت به‌عمد اینجا نمایش داده نمی‌شن.</div>
      </div>
    </div>
  `;
}

function downloadCSV(filename, header, rows){
  const csvEscape = v => `"${String(v==null?"":v).replace(/"/g,'""')}"`;
  const csv = "\uFEFF" + [header.map(csvEscape).join(","), ...rows.map(r=>r.map(csvEscape).join(","))].join("\r\n");
  const blob = new Blob([csv], {type:"text/csv;charset=utf-8;"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
function exportHabitsCSV(){
  const users = realUsers();
  const stats = users.map(u=>({ user:u, b:behaviorOf(u, behaviorRange) }));
  const agg = aggregateHabits(stats);
  downloadCSV(`peleh-habits-${new Date().toISOString().slice(0,10)}.csv`,
    ["عادت","نوع","تعداد کاربر","کاربر فعال در بازه",`انجام در بازه (${rangeLabel()})`,"کل انجام","نرخ انجام (٪)"],
    agg.map(h=>[h.title, h.suggested?"پیشنهادی":"سفارشی", h.users, h.activeUsers, h.doneRange, h.doneAll, h.rate==null?"":Math.round(h.rate*100)]));
}
function exportBehaviorUsersCSV(){
  const users = realUsers();
  const rows = users.map(u=>{
    const b = behaviorOf(u, behaviorRange);
    return [u.name||"", fmtDate(u.created_at), b.habitCount, b.totalDone, b.doneInRange, b.doneLast7, b.activeDaysInRange, b.lastActive||"",
            pushOptInUserIds.has(u.id)?"فعال":"خاموش", b.habits.map(h=>h.title.trim()).join(" | ")];
  });
  downloadCSV(`peleh-user-behavior-${new Date().toISOString().slice(0,10)}.csv`,
    ["نام","تاریخ عضویت","تعداد عادت","کل تیک",`تیک در بازه (${rangeLabel()})`,"تیک ۷ روز اخیر","روز فعال در بازه","آخرین فعالیت","یادآوری","عادت‌ها"],
    rows);
}

boot();

/* =====================================================================================
   فاز ۰ / A۱۰: حساب‌های تست + قیف «رفتار کاربران»
   هر عدد داشبورد بدون فیلتر حساب‌های تست گمراه‌کننده‌ست (حدود ۲۰ تا از ۶۲ حساب، حساب تست بودن).
   پیش‌فرض: حساب‌های تست از همه‌ی آمارها حذف‌ان. علامت‌گذاری از «جزئیات کاربر».
   ===================================================================================== */
let includeTestUsers = false;
let funnelRange = "all"; // all | 30 | 7
function isTestUser(u){ return !!(u && u.is_test); }
function realUsers(){ return includeTestUsers ? users : users.filter(u => !isTestUser(u)); }
function toggleIncludeTest(){ includeTestUsers = !includeTestUsers; render(); }
function setFunnelRange(r){ funnelRange = r; render(); }
function dayKeyLocalOf(d){ return todayKeyLocal(d); }
function funnelOf(u){
  const d = (u && u.data) || {};
  const f = d.funnel || {};
  const hist = d.history || {};
  const tickDays = Object.keys(hist).filter(k => (hist[k] || []).length).sort();
  const created = u.created_at ? new Date(u.created_at) : null;
  const createdKey = created ? dayKeyLocalOf(created) : null;
  const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
  const weekAgoKey = dayKeyLocalOf(weekAgo);
  const lastSeenKey = u.last_seen ? dayKeyLocalOf(new Date(u.last_seen)) : null;
  const s = d.settings || {};
  const firstTickAt = f.first_checkin ? Date.parse(f.first_checkin) : null;
  return {
    onboarded: !!(u.name && /^09\d{9}$/.test(u.phone || "")),
    quickstart: !!f.quickstart_shown,
    habit: (d.activities || []).length > 0 || !!f.first_habit,
    habitSource: (f.first_habit_meta && f.first_habit_meta.source) || null,
    tick: tickDays.length > 0,
    returned: !!createdKey && (tickDays.some(k => k > createdKey) || (lastSeenKey && lastSeenKey > createdKey)),
    active7: tickDays.some(k => k >= weekAgoKey),
    reminder: pushOptInUserIds.has(u.id) || (s.reminderSlot && s.reminderSlot !== "none") || !!(s.smartNotify && s.smartNotify.enabled === true),
    minutesToFirstTick: created && firstTickAt ? Math.max(0, (firstTickAt - created.getTime()) / 60000) : null,
  };
}
async function setUserTest(id, on){
  const { error } = await sb.rpc("admin_set_test_user", { p_user: id, p_is_test: !!on });
  if(error){ alert("انجام نشد (migration 014 اجرا شده؟): " + error.message); return; }
  const u = users.find(x => x.id === id);
  if(u) u.is_test = !!on;
  render();
}

/* =====================================================================================
   💎 سلامت پلاس — مدیریت (بخش ۱۵ و ۱۷ب سند)
   ===================================================================================== */
let plusAdmin = { loaded: false, loading: false, error: "", settings: {}, beta: [], coaches: [], coachTab: "pending", ents: [], payments: [], overview: null,
  reports: [], exReqs: [], audit: [], admins: new Set(), findQ: "", findRes: null, busy: false };
async function loadPlusAdmin(force){
  if(plusAdmin.loading || (plusAdmin.loaded && !force)) return;
  plusAdmin.loading = true; plusAdmin.error = ""; render();
  try{
    const [pay, ov] = await Promise.all([
      sb.from("plus_payment_requests").select("*").order("created_at", { ascending: false }).limit(60),
      sb.rpc("admin_plus_overview"),
    ]);
    plusAdmin.payments = pay.data || [];
    plusAdmin.overview = ov.data || null;
    const [st, beta, coaches, ents, reps, exr, audit, admins] = await Promise.all([
      sb.rpc("admin_get_settings"),
      sb.from("plus_beta_users").select("*").order("created_at", { ascending: true }),
      sb.rpc("admin_list_coaches", { p_status: null }),
      sb.from("plus_entitlements").select("*").order("active_until", { ascending: false }),
      sb.from("coach_reports").select("*").order("created_at", { ascending: false }).limit(50),
      sb.from("exercise_requests").select("*").order("created_at", { ascending: false }).limit(100),
      sb.from("admin_audit_log").select("*").order("created_at", { ascending: false }).limit(30),
      sb.from("admins").select("user_id"),
    ]);
    if(st.error) throw st.error;
    plusAdmin.settings = {};
    (st.data || []).forEach(r => { plusAdmin.settings[r.key] = r.value; });
    plusAdmin.beta = beta.data || [];
    plusAdmin.coaches = coaches.data || [];
    plusAdmin.ents = ents.data || [];
    plusAdmin.reports = reps.data || [];
    plusAdmin.exReqs = exr.data || [];
    plusAdmin.audit = audit.data || [];
    plusAdmin.admins = new Set((admins.data || []).map(r => r.user_id));
    plusAdmin.loaded = true;
  }catch(e){
    console.error(e);
    plusAdmin.error = "بارگذاری نشد — migration های 014 و 015 اجرا شدن؟ (" + (e.message || e) + ")";
  }
  plusAdmin.loading = false;
  render();
}
function userLabel(id){
  const u = users.find(x => x.id === id);
  return u ? `${escapeHtml(u.name) || "بدون نام"} <span class="mono" style="color:var(--faint);">${maskPhone(u.phone)}</span>${isTestUser(u) ? ` <span class="badge">تست</span>` : ``}` : `<span class="mono">${id.slice(0, 8)}…</span>`;
}
async function setPlusSetting(key, value){
  if(key === "plus_mode" && value === "public" && !confirm("سلامت پلاس برای «همه‌ی کاربرها» عمومی بشه؟\n\nفقط بعد از سبز شدن همه‌ی موارد دروازه‌ی Go/No-Go (بخش ۱۷ب.۵) و تأیید صاحب محصول.")) { render(); return; }
  if(key === "plus_payments_enabled" && value === "true" && !confirm("پرداخت سلامت پلاس فعال بشه؟ (قبلش یه خرید آزمایشی واقعی انجام شده؟)")) { render(); return; }
  const { error } = await sb.rpc("admin_set_setting", { p_key: key, p_value: String(value) });
  if(error){ alert(error.message); }
  await loadPlusAdmin(true);
}
async function plusFindUsers(){
  const q = (document.getElementById("plus_find_q") || {}).value || "";
  plusAdmin.findQ = q;
  if(q.trim().length < 3){ plusAdmin.findRes = []; render(); return; }
  const { data, error } = await sb.rpc("admin_find_user", { p_q: q.trim() });
  plusAdmin.findRes = error ? [] : (data || []);
  if(error) alert(error.message);
  render();
}
async function addBetaUser(id, role){
  if(plusAdmin.beta.length >= 2 && !confirm("طبق سند، بتای خصوصی «دقیقاً دو حساب» (مربی + ورزشکار) داره. باز هم اضافه بشه؟")) return;
  if(role === "coach" && plusAdmin.admins.has(id) && !confirm("⚠️ این حساب ادمینه. حساب مربی نباید ادمین باشه، چون ادمین از RLS عبور می‌کنه و باگ‌های دسترسی پنهان می‌مونن. ادامه؟")) return;
  const { error } = await sb.from("plus_beta_users").insert({ user_id: id, role_hint: role });
  if(error) alert(error.message);
  plusAdmin.findRes = null;
  await loadPlusAdmin(true);
}
async function removeBetaUser(id){
  if(!confirm("از allowlist بتا حذف بشه؟")) return;
  const { error } = await sb.from("plus_beta_users").delete().eq("user_id", id);
  if(error) alert(error.message);
  await loadPlusAdmin(true);
}
async function grantPlus(id, days){
  const { data, error } = await sb.rpc("admin_grant_plus", { p_user: id, p_days: days, p_source: "admin" });
  if(error){ alert(error.message); return; }
  await loadPlusAdmin(true);
}
async function reviewCoach(id, action){
  let reason = null;
  if(action === "reject" || action === "suspend"){
    reason = prompt(action === "reject" ? "دلیل رد (به مربی نشون داده می‌شه):" : "دلیل تعلیق:");
    if(!reason || !reason.trim()) return;
  } else if(action === "approve"){
    const c = plusAdmin.coaches.find(x => x.user_id === id);
    if(c && plusAdmin.admins.has(id) && !confirm("⚠️ این حساب ادمینه؛ حساب مربی نباید ادمین باشه. باز هم تأیید بشه؟")) return;
    if(!confirm("مربی تأیید بشه؟ (کد مربی فعال می‌شه)")) return;
  }
  const { error } = await sb.rpc("admin_review_coach", { p_coach: id, p_action: action, p_reason: reason });
  if(error) alert(error.message);
  await loadPlusAdmin(true);
}
async function reviewCredential(id, action){
  let reason = null;
  if(action === "reject"){ reason = prompt("دلیل رد مدرک:"); if(!reason || !reason.trim()) return; }
  const { error } = await sb.rpc("admin_review_credential", { p_id: id, p_action: action, p_reason: reason, p_public_path: null });
  if(error) alert(error.message);
  await loadPlusAdmin(true);
}
async function viewCredentialOriginal(path){
  // لینک موقت ۲ دقیقه‌ای؛ اصل مدرک هیچ‌وقت لینک دائمی نمی‌گیره
  const { data, error } = await sb.storage.from("coach-credentials-private").createSignedUrl(path, 120);
  if(error || !data){ alert("لینک ساخته نشد: " + (error && error.message)); return; }
  window.open(data.signedUrl, "_blank", "noopener");
}
// نسخه‌ی عمومی: ادمین فایل «پوشانده‌شده» (کد ملی/تاریخ تولد/آدرس سیاه‌شده) رو انتخاب می‌کنه؛
// این تابع خودکار واترمارک «فقط برای پله» می‌زنه و تو باکت عمومی‌شده (با RLS) آپلود می‌کنه.
async function uploadPublicCredential(credId, coachId, input){
  const file = input.files && input.files[0];
  if(!file) return;
  if(!confirm("این فایل نسخه‌ی پوشانده‌شده‌ست؟ (کد ملی، تاریخ تولد، آدرس و شماره‌ها رو قبلاً پوشوندی؟)\nاین ابزار فقط واترمارک اضافه می‌کنه، اطلاعات رو نمی‌پوشونه.")){ input.value = ""; return; }
  try{
    const img = await new Promise((res, rej) => { const u = URL.createObjectURL(file); const im = new Image(); im.onload = () => { URL.revokeObjectURL(u); res(im); }; im.onerror = () => rej(new Error("فقط تصویر (JPG/PNG)")); im.src = u; });
    const scale = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight));
    const cv = document.createElement("canvas");
    cv.width = Math.round(img.naturalWidth * scale); cv.height = Math.round(img.naturalHeight * scale);
    const ctx = cv.getContext("2d");
    ctx.drawImage(img, 0, 0, cv.width, cv.height);
    ctx.save();
    ctx.translate(cv.width / 2, cv.height / 2);
    ctx.rotate(-Math.PI / 7);
    ctx.font = `bold ${Math.round(cv.width / 16)}px Vazirmatn, sans-serif`;
    ctx.fillStyle = pelehTokA("--gold", .30);
    ctx.textAlign = "center";
    for(let y = -cv.height; y <= cv.height; y += Math.round(cv.width / 5)) ctx.fillText("فقط برای نمایش در پله", 0, y);
    ctx.restore();
    const blob = await new Promise(res => cv.toBlob(res, "image/jpeg", 0.85));
    const path = `${coachId}/${credId}-public-${Date.now()}.jpg`;
    const up = await sb.storage.from("coach-credentials-public").upload(path, blob, { contentType: "image/jpeg", upsert: false });
    if(up.error) throw up.error;
    const { error } = await sb.rpc("admin_review_credential", { p_id: credId, p_action: "set_public_path", p_reason: null, p_public_path: path });
    if(error) throw error;
    alert("نسخه‌ی عمومی با واترمارک ذخیره شد. (فقط اگه مدرک «تأیید» بشه و مربی اجازه داده باشه نمایش داده می‌شه)");
  }catch(e){ alert("انجام نشد: " + (e.message || e)); }
  await loadPlusAdmin(true);
}
function renderPlusAdminView(){
  if(!plusAdmin.loaded && !plusAdmin.loading && !plusAdmin.error) loadPlusAdmin();
  const S = plusAdmin.settings;
  const sel = (key, opts) => `<select class="row-btn" onchange="setPlusSetting('${key}', this.value)">${opts.map(([v, l]) => `<option value="${v}" ${S[key] === v ? "selected" : ""}>${l}</option>`).join("")}</select>`;
  const coachesTab = plusAdmin.coaches.filter(c => c.status === plusAdmin.coachTab);
  const counts = {}; plusAdmin.coaches.forEach(c => { counts[c.status] = (counts[c.status] || 0) + 1; });
  const scopeL = { iran: "ایرانی", international: "بین‌المللی" };
  return `
    <div class="topbar"><div><div class="page-title">💎 سلامت پلاس</div><div class="page-sub">فیچرفلگ، بتای دوحسابی، تأیید مربی‌ها و مدارک</div></div>
      <button class="row-btn" onclick="loadPlusAdmin(true)">↻ بازخوانی</button></div>
    ${plusAdmin.error ? `<div class="panel" style="padding:16px; color:var(--rose);">${escapeHtml(plusAdmin.error)}</div>` : ``}
    ${plusAdmin.loading && !plusAdmin.loaded ? `<div class="panel"><div class="loading-state">در حال بارگذاری...</div></div>` : ``}
    ${plusAdmin.loaded ? `
    <div class="panel" style="margin-bottom:22px;">
      <div class="panel-head"><h3>🚦 فیچرفلگ‌ها</h3></div>
      <table><tbody>
        <tr><td>حالت سلامت پلاس <div class="page-sub">off: هیچ‌کس · beta: فقط allowlist · public: همه. برگشت = فقط off کن (داده‌ها می‌مونن).</div></td>
            <td>${sel("plus_mode", [["off", "off — خاموش"], ["beta", "beta — فقط allowlist"], ["public", "public — عمومی"]])}</td></tr>
        <tr><td>صفحه‌ی «شروع سریع» (فاز A)</td><td>${sel("quickstart_v1", [["on", "روشن"], ["off", "خاموش"]])}</td></tr>
        <tr><td>نیاز به اشتراک برای ثبت تمرین/برنامه‌ی جدید <div class="page-sub">تصمیم D3 — در بتا با «اشتراک دستی» تست کن.</div></td>
            <td>${sel("plus_require_entitlement", [["true", "بله"], ["false", "نه (رایگان)"]])}</td></tr>
        <tr><td>پرداخت سلامت پلاس — درگاه زیبال (وب و اندروید مستقیم) <div class="page-sub">قیمت و مدت از همین پنل (پایین). جدا از Premium.</div></td><td>${sel("plus_payments_enabled", [["false", "خاموش"], ["true", "روشن"]])}</td></tr>
        <tr><td>خرید سلامت پلاس از کافه‌بازار <div class="page-sub">محصول درون‌برنامه‌ای <span class="mono">peleh_plus_monthly</span> (مصرفی). قیمتش رو فقط تو پنل توسعه‌دهنده‌ی بازار تعیین کن.</div></td><td>${sel("plus_bazaar_enabled", [["false", "خاموش"], ["true", "روشن"]])}</td></tr>
        <tr><td>مدت هر خرید از بازار (روز)</td><td><input class="row-btn mono" style="width:90px;" value="${escapeHtml(S.plus_bazaar_days || "30")}" onchange="setPlusSetting('plus_bazaar_days', this.value)"></td></tr>
        <tr><td>تحلیل AI برای مربی‌ها (فاز F) <div class="page-sub">Edge Function «coach-ai» باید deploy شده باشه. فقط با رضایت جدای هر شاگرد.</div></td>
            <td>${sel("plus_ai_enabled", [["false", "خاموش"], ["true", "روشن"]])}</td></tr>
        <tr><td>سقف روزانه‌ی تحلیل AI هر مربی</td><td><input class="row-btn mono" style="width:90px;" value="${escapeHtml(S.plus_ai_daily_limit || "10")}" onchange="setPlusSetting('plus_ai_daily_limit', this.value)"></td></tr>
        <tr><td>قیمت اشتراک (تومان) <div class="page-sub">تصمیم D2 — پروپوزال: ۵۰۰٬۰۰۰</div></td><td><input class="row-btn mono" style="width:130px;" value="${escapeHtml(S.plus_price_toman || "")}" onchange="setPlusSetting('plus_price_toman', this.value)"></td></tr>
        <tr><td>مدت هر دوره (روز)</td><td><input class="row-btn mono" style="width:90px;" value="${escapeHtml(S.plus_plan_days || "30")}" onchange="setPlusSetting('plus_plan_days', this.value)"></td></tr>
        <tr><td>راهنمای پرداخت کارت‌به‌کارت <div class="page-sub">به ورزشکار نشون داده می‌شه (شماره‌کارت فقط اینجا، نه تو کد)</div></td>
            <td><textarea class="row-btn" style="width:260px; min-height:60px;" onchange="setPlusSetting('plus_payment_note', this.value)">${escapeHtml(S.plus_payment_note || "")}</textarea></td></tr>
        <tr><td>پنجره‌ی مقایسه‌ی پیشرفت (روز) / حداقل جلسه <div class="page-sub">تصمیم D6 — پیش‌فرض ۲۸ روز و ۳ جلسه</div></td>
            <td><input class="row-btn mono" style="width:70px;" value="${escapeHtml(S.plus_progress_window_days || "28")}" onchange="setPlusSetting('plus_progress_window_days', this.value)">
                <input class="row-btn mono" style="width:60px;" value="${escapeHtml(S.plus_progress_min_sessions || "3")}" onchange="setPlusSetting('plus_progress_min_sessions', this.value)"></td></tr>
        <tr><td>حداقل نسخه‌ی اندروید <div class="page-sub">نسخه‌ی قدیمی‌تر پیام «لطفاً آپدیت کن» می‌بینه (۰ = خاموش)</div></td>
            <td><input class="row-btn mono" style="width:110px;" value="${escapeHtml(S.min_app_version || "0")}" onchange="setPlusSetting('min_app_version', this.value)"></td></tr>
      </tbody></table>
    </div>
    <div class="panel" style="margin-bottom:22px;">
      <div class="panel-head"><h3>🔐 امنیت و اقتصاد امتیاز</h3></div>
      <table><tbody>
        <tr><td>سقف امتیاز سلامت قابل‌خرج در روز <div class="page-sub">فقط امتیاز امروز/دیروز به حساب میاد؛ پیش‌فرض ۳۰۰</div></td>
            <td><input class="row-btn mono" style="width:90px;" value="${escapeHtml(S.health_xp_daily_cap || "300")}" onchange="setPlusSetting('health_xp_daily_cap', this.value)"></td></tr>
        <tr><td>جایزه‌ی Premium نمره‌ی کتاب: فاصله (روز) / سقف کل <div class="page-sub">۰ در سقف = بی‌سقف</div></td>
            <td><input class="row-btn mono" style="width:70px;" value="${escapeHtml(S.book_premium_cooldown_days || "30")}" onchange="setPlusSetting('book_premium_cooldown_days', this.value)">
                <input class="row-btn mono" style="width:60px;" value="${escapeHtml(S.book_premium_max_claims || "6")}" onchange="setPlusSetting('book_premium_max_claims', this.value)"></td></tr>
        <tr><td>کد پیامکی: تلاش اشتباه مجاز برای هر شماره در ۲۴ ساعت</td>
            <td><input class="row-btn mono" style="width:70px;" value="${escapeHtml(S.otp_fail_per_mobile_day || "10")}" onchange="setPlusSetting('otp_fail_per_mobile_day', this.value)"></td></tr>
        <tr><td>کد پیامکی: ارسال از یک IP در ساعت / روز</td>
            <td><input class="row-btn mono" style="width:60px;" value="${escapeHtml(S.otp_send_per_ip_hour || "10")}" onchange="setPlusSetting('otp_send_per_ip_hour', this.value)">
                <input class="row-btn mono" style="width:60px;" value="${escapeHtml(S.otp_send_per_ip_day || "40")}" onchange="setPlusSetting('otp_send_per_ip_day', this.value)"></td></tr>
        <tr><td>بودجه‌ی کل پیامک در ساعت (همه‌ی کاربرها)</td>
            <td><input class="row-btn mono" style="width:80px;" value="${escapeHtml(S.otp_send_global_hour || "400")}" onchange="setPlusSetting('otp_send_global_hour', this.value)"></td></tr>
      </tbody></table>
    </div>

    ${renderPlusUsageCard()}
    ${renderPlusPaymentsPanel()}
    <div class="panel" style="margin-bottom:22px;">
      <div class="panel-head"><h3>🧪 بتای خصوصی (allowlist) — ${plusAdmin.beta.length} حساب</h3></div>
      <div class="page-sub" style="padding:0 20px 10px;">طبق سند: دقیقاً دو حساب (یک مربی + یک ورزشکار)، هر دو «تست»، و حساب مربی «نباید» ادمین باشه.</div>
      <table><tbody>${plusAdmin.beta.map(b => {
        const ent = plusAdmin.ents.find(e => e.user_id === b.user_id);
        const u = users.find(x => x.id === b.user_id);
        return `<tr><td>${userLabel(b.user_id)} ${b.role_hint ? `<span class="badge">${b.role_hint === "coach" ? "مربی" : b.role_hint === "athlete" ? "ورزشکار" : "سایر"}</span>` : ``}
            ${plusAdmin.admins.has(b.user_id) && b.role_hint === "coach" ? `<span class="badge" style="background:var(--rose-soft); color:var(--rose);">⚠️ ادمینه</span>` : ``}
            ${u && !isTestUser(u) ? `<button class="row-btn" onclick="setUserTest('${safeId(b.user_id)}', true)">علامت «تست»</button>` : ``}</td>
          <td class="mono">${ent && ent.active_until && new Date(ent.active_until) > new Date() ? `اشتراک تا ${fmtDate(ent.active_until)}` : "بدون اشتراک"}</td>
          <td><button class="row-btn" onclick="grantPlus('${safeId(b.user_id)}', 30)">+۳۰ روز اشتراک</button>
              <button class="row-btn" onclick="grantPlus('${safeId(b.user_id)}', -1)">قطع اشتراک</button>
              <button class="row-btn" onclick="removeBetaUser('${safeId(b.user_id)}')">حذف از بتا</button></td></tr>`;
      }).join("") || `<tr><td class="page-sub">هنوز کسی اضافه نشده.</td></tr>`}</tbody></table>
      <div style="padding:12px 20px; display:flex; gap:8px; flex-wrap:wrap;">
        <input id="plus_find_q" class="row-btn" style="flex:1; min-width:200px;" placeholder="شماره، ایمیل یا اسم (حداقل ۳ حرف)" value="${escapeHtml(plusAdmin.findQ)}" onkeydown="if(event.key==='Enter') plusFindUsers()">
        <button class="row-btn on" onclick="plusFindUsers()">جستجو</button>
      </div>
      ${plusAdmin.findRes ? `<table><tbody>${plusAdmin.findRes.map(r => `<tr><td>${escapeHtml(r.name) || "—"} <span class="mono">${maskPhone(r.phone)}</span>${r.is_test ? ` <span class="badge">تست</span>` : ``}</td>
        <td>${r.in_beta ? `<span class="badge">در بتا</span>` : `<button class="row-btn" onclick="addBetaUser('${safeId(r.id)}','coach')">+ به‌عنوان مربی</button> <button class="row-btn" onclick="addBetaUser('${safeId(r.id)}','athlete')">+ به‌عنوان ورزشکار</button>`}</td></tr>`).join("") || `<tr><td class="page-sub">پیدا نشد.</td></tr>`}</tbody></table>` : ``}
    </div>

    <div class="panel" style="margin-bottom:22px;">
      <div class="panel-head"><h3>🧑‍🏫 مربی‌ها</h3>
        <div class="btn-row">${[["pending", "در انتظار"], ["approved", "تأییدشده"], ["rejected", "رد شده"], ["suspended", "معلق"], ["draft", "پیش‌نویس"]].map(([k, l]) =>
          `<button class="row-btn ${plusAdmin.coachTab === k ? "on" : ""}" onclick="plusAdmin.coachTab='${k}'; render();">${l}${counts[k] ? ` (${counts[k]})` : ""}</button>`).join("")}</div></div>
      ${coachesTab.length ? coachesTab.map(c => `<div class="coach-review">
        <div style="display:flex; justify-content:space-between; gap:10px; flex-wrap:wrap;">
          <div><b>${escapeHtml(c.display_name)}</b> <span class="page-sub">(${escapeHtml(c.profile_name || "—")} · <span class="mono">${maskPhone(c.phone)}</span>)</span>
            ${c.is_test ? `<span class="badge">تست</span>` : ``} ${plusAdmin.admins.has(c.user_id) ? `<span class="badge" style="background:var(--rose-soft); color:var(--rose);">⚠️ حساب ادمین</span>` : ``}
            <div class="page-sub">${(c.specialties || []).join("، ")} · ${c.years_experience != null ? c.years_experience + " سال سابقه" : "سابقه نامشخص"}${c.city ? " · " + escapeHtml(c.city) : ""} · ${c.visibility === "public" ? "در جستجو" : "فقط با کد"} · کد: <span class="mono">${escapeHtml(c.coach_code)}</span></div>
            ${c.bio ? `<div style="white-space:pre-wrap; margin-top:6px; font-size:13px;">${escapeHtml(c.bio)}</div>` : ``}
            ${c.rejection_reason ? `<div class="page-sub" style="color:var(--rose);">دلیل: ${escapeHtml(c.rejection_reason)}</div>` : ``}
          </div>
          <div class="btn-row">
            ${c.status === "pending" || c.status === "rejected" || c.status === "draft" ? `<button class="row-btn on" onclick="reviewCoach('${safeId(c.user_id)}','approve')">✓ تأیید</button>` : ``}
            ${c.status === "pending" ? `<button class="row-btn" onclick="reviewCoach('${safeId(c.user_id)}','reject')">رد</button>` : ``}
            ${c.status === "approved" ? `<button class="row-btn" onclick="reviewCoach('${safeId(c.user_id)}','suspend')">تعلیق</button>` : ``}
            ${c.status === "suspended" ? `<button class="row-btn on" onclick="reviewCoach('${safeId(c.user_id)}','unsuspend')">رفع تعلیق</button>` : ``}
          </div>
        </div>
        ${(c.credentials || []).map(cr => `<div class="cred-row">
          <div><b>${escapeHtml(cr.title)}</b> · ${escapeHtml(cr.issuer || "—")} · ${cr.issued_year || "—"} · ${scopeL[cr.scope] || ""}
            <span class="badge">${cr.status === "verified" ? "✓ تأییدشده" : cr.status === "rejected" ? "رد شده" : "در انتظار"}</span>
            ${cr.show_publicly ? `<span class="badge">مربی اجازه‌ی نمایش داده</span>` : `<span class="page-sub">بدون اجازه‌ی نمایش عمومی</span>`}
            ${cr.public_path ? `<span class="badge">نسخه‌ی عمومی دارد</span>` : ``}</div>
          <div class="btn-row">
            ${cr.original_path ? `<button class="row-btn" onclick="viewCredentialOriginal('${escapeHtml(cr.original_path)}')">دیدن اصل (لینک موقت)</button>` : `<span class="page-sub">فایل نداره</span>`}
            ${cr.status !== "verified" ? `<button class="row-btn on" onclick="reviewCredential('${safeId(cr.id)}','verify')">تأیید مدرک</button>` : ``}
            ${cr.status !== "rejected" ? `<button class="row-btn" onclick="reviewCredential('${safeId(cr.id)}','reject')">رد</button>` : ``}
            <label class="row-btn" style="cursor:pointer;">آپلود نسخه‌ی پوشانده<input type="file" accept="image/*" style="display:none" onchange="uploadPublicCredential('${safeId(cr.id)}','${safeId(c.user_id)}', this)"></label>
          </div>
        </div>`).join("")}
      </div>`).join("") : `<div class="empty-state">موردی نیست.</div>`}
      <div class="page-sub" style="padding:10px 20px;">نشان «تأییدشده» یعنی «مدرک ارائه‌شده بررسی شد» — ادعای بزرگ‌تر (مثل استعلام از فدراسیون) فقط اگه واقعاً انجام شده باشه.</div>
    </div>

    <div class="panel" style="margin-bottom:22px;">
      <div class="panel-head"><h3>🚩 گزارش‌ها علیه مربی‌ها (${plusAdmin.reports.length})</h3></div>
      ${plusAdmin.reports.length ? `<table><tbody>${plusAdmin.reports.map(r => `<tr><td>${fmtDate(r.created_at)}</td>
        <td>${escapeHtml((plusAdmin.coaches.find(c => c.user_id === r.coach_id) || {}).display_name || r.coach_id.slice(0, 8))}</td>
        <td style="white-space:pre-wrap;">${escapeHtml(r.reason)}</td><td>${userLabel(r.user_id)}</td></tr>`).join("")}</tbody></table>` : `<div class="empty-state">گزارشی نیست.</div>`}
    </div>

    <div class="panel" style="margin-bottom:22px;">
      <div class="panel-head"><h3>🔎 «حرکتم رو پیدا نکردم» (${plusAdmin.exReqs.filter(r => r.status === "open").length} باز)</h3></div>
      <div class="page-sub" style="padding:0 20px 10px;">این‌ها رو به‌صورت alias یا حرکت جدید به peleh_exercise_bank.json اضافه کن، بعد tools/exercise_bank.py build.</div>
      ${plusAdmin.exReqs.length ? `<table><tbody>${(() => {
        const agg = {};
        plusAdmin.exReqs.filter(r => r.status === "open").forEach(r => { const k = r.query.trim(); agg[k] = (agg[k] || 0) + 1; });
        return Object.entries(agg).sort((a, b) => b[1] - a[1]).map(([q, n]) => `<tr><td>${escapeHtml(q)}</td><td class="mono">${n}×</td></tr>`).join("");
      })()}</tbody></table>` : `<div class="empty-state">درخواستی نیست.</div>`}
    </div>

    <div class="panel">
      <div class="panel-head"><h3>🧾 لاگ حسابرسی (۳۰ مورد آخر)</h3></div>
      ${plusAdmin.audit.length ? `<table><tbody>${plusAdmin.audit.map(a => `<tr><td class="mono">${fmtDate(a.created_at)}</td><td>${escapeHtml(a.action)}</td>
        <td class="mono">${escapeHtml(a.target || "")}</td><td class="mono" style="font-size:11px;">${escapeHtml(JSON.stringify(a.detail || {}))}</td></tr>`).join("")}</tbody></table>` : `<div class="empty-state">خالی.</div>`}
    </div>` : ``}
  `;
}

function testToggleBtn(){
  const n = users.filter(isTestUser).length;
  return `<button class="row-btn ${includeTestUsers ? "on" : ""}" onclick="toggleIncludeTest()" title="حساب‌های تست صاحب محصول">${includeTestUsers ? `✓ حساب‌های تست هم شمرده می‌شن (${faNum(n)})` : `حساب‌های تست: پنهان (${faNum(n)})`}</button>`;
}
// مسیر اولین‌بارهای همین کاربر (فاز A) — از profiles.data.funnel؛ برای کاربرهای قبل از ۱.۹ خالیه
function renderJourneySection(u){
  const f = ((u.data || {}).funnel) || {};
  const s = ((u.data || {}).settings) || {};
  const at = k => f[k] ? new Date(f[k]).toLocaleString("fa-IR", {dateStyle:"short", timeStyle:"short"}) : "—";
  const src = {quickstart:"شروع سریع", chip:"چیپ یک‌لمسی", form:"فرم"}[(f.first_habit_meta||{}).source] || "—";
  const slot = {morning:"صبح", noon:"ظهر", evening:"عصر", night:"شب", none:"نه ممنون"}[s.reminderSlot] || "—";
  const fx = funnelOf(u);
  if(!Object.keys(f).length) return ``;
  return `<div class="drawer-section">
    <div class="drawer-label">🧭 مسیر شروع</div>
    <div class="mod-row"><span>ثبت‌نام کامل</span><span class="mono">${at("signup_completed")}</span></div>
    <div class="mod-row"><span>«شروع سریع» دیده ${f.quickstart_skipped ? "(رد کرده)" : ""}</span><span class="mono">${at("quickstart_shown")}</span></div>
    <div class="mod-row"><span>اولین عادت (${src})</span><span class="mono">${at("first_habit")}</span></div>
    <div class="mod-row"><span>اولین تیک ${fx.minutesToFirstTick!==null ? `(${faNum(Math.round(fx.minutesToFirstTick))} دقیقه بعد از ثبت‌نام)` : ""}</span><span class="mono">${at("first_checkin")}</span></div>
    <div class="mod-row"><span>ساعت یادآوری</span><span class="mono">${slot}</span></div>
    ${s.showAllSections ? `<div class="mod-row"><span>حالت ساده‌ی «امروز» رو خاموش کرده</span><span class="mono">✓</span></div>` : ``}
  </div>`;
}

/* ---------- سلامت پلاس: آمار استفاده (بدون محتوای شخصی) + صف رسیدهای اشتراک ---------- */
function renderPlusUsageCard(fromBehavior){
  if(fromBehavior && !plusAdmin.loaded && !plusAdmin.loading && !plusAdmin.error){ loadPlusAdmin(); return ``; }
  const o = plusAdmin.overview;
  if(!o) return ``;
  const c = o.coaches || {}, rq = o.requests || {};
  const row = (l, v) => `<div class="mod-row"><span>${l}</span><span class="mono">${v}</span></div>`;
  return `<div class="pulse-card"><div class="pulse-head"><div class="pulse-title">💎 سلامت پلاس <span>بتا — شامل حساب‌های تست</span></div></div>
    <div class="module-grid" style="margin-bottom:0;"><div>
      ${row("مربی‌ها (تأییدشده / در انتظار)", `${faNum(c.approved || 0)} / ${faNum(c.pending || 0)}`)}
      ${row("اتصال فعال مربی ↔ ورزشکار", faNum(o.links_active || 0))}
      ${row("برنامه‌ی تحویل‌شده", faNum(o.programs_published || 0))}
      ${row("اشتراک فعال", faNum(o.entitlements_active || 0))}
    </div><div>
      ${row("جلسه‌ی تمرین (۷ / ۲۸ روز)", `${faNum(o.sessions_7d || 0)} / ${faNum(o.sessions_28d || 0)}`)}
      ${row("ست ثبت‌شده (۲۸ روز)", faNum(o.sets_28d || 0))}
      ${row("برنامه‌ی منتشرشده ← جلسه در ۷ روز", o.published_to_logged_7d == null ? "—" : faNum(Math.round(o.published_to_logged_7d * 100)) + "٪")}
      ${row("درخواست برنامه (باز / تحویل‌شده)", `${faNum((rq.requested || 0) + (rq.quoted || 0) + (rq.accepted || 0))} / ${faNum(rq.delivered || 0)}`)}
      ${row("تحلیل AI (۲۸ روز)", faNum(o.ai_suggestions_28d || 0))}
    </div></div></div>`;
}
let plusReceiptUrls = {};
async function loadPlusReceipt(id, path){
  const { data } = await sb.storage.from("receipts").createSignedUrl(path, 300);
  plusReceiptUrls[id] = data && data.signedUrl; render();
}
async function reviewPlusPayment(id, approve){
  let note = null;
  if(!approve){ note = prompt("دلیل رد (به کاربر اعلان می‌شه):"); if(note === null) return; }
  else if(!confirm("رسید تأیید و اشتراک فعال بشه؟")) return;
  const { error } = await sb.rpc("admin_review_plus_payment", { p_id: id, p_approve: !!approve, p_note: note });
  if(error) alert(error.message);
  await loadPlusAdmin(true);
}
function renderPlusPaymentsPanel(){
  const list = plusAdmin.payments || [];
  const pending = list.filter(p => p.status === "pending");
  return `<div class="panel" style="margin-bottom:22px;">
    <div class="panel-head"><h3>🧾 رسیدهای اشتراک سلامت پلاس (${pending.length} در انتظار)</h3></div>
    ${list.length ? `<table><tbody>${list.slice(0, 30).map(p => `<tr>
      <td>${userLabel(p.user_id)}</td><td class="mono">${fmtDate(p.created_at)}</td>
      <td class="mono">${fmtToman ? fmtToman(p.amount_toman) : p.amount_toman} · ${p.plan_days} روز</td>
      <td><span class="badge ${p.status}">${p.status === "pending" ? "در انتظار" : p.status === "approved" ? "تأیید شد" : "رد شد"}</span></td>
      <td>${p.receipt_path ? (plusReceiptUrls[p.id] ? `<a href="${escapeHtml(plusReceiptUrls[p.id])}" target="_blank" rel="noopener"><img src="${escapeHtml(plusReceiptUrls[p.id])}" style="max-width:90px; border-radius:8px;" alt="رسید"></a>`
          : `<button class="row-btn" onclick="loadPlusReceipt('${p.id}','${escapeHtml(p.receipt_path)}')">دیدن رسید</button>`) : "—"}</td>
      <td>${p.status === "pending" ? `<button class="row-btn on" onclick="reviewPlusPayment('${p.id}', true)">تأیید</button> <button class="row-btn danger" onclick="reviewPlusPayment('${p.id}', false)">رد</button>` : escapeHtml(p.admin_note || "")}</td>
    </tr>`).join("")}</tbody></table>` : `<div class="empty-state">رسیدی ثبت نشده (پرداخت فقط وقتی «پرداخت سلامت پلاس» روشنه فعاله).</div>`}
  </div>`;
}
if(typeof pelehWrapRender === "function") render = pelehWrapRender(render);
