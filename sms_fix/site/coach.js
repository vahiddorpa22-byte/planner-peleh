/* =====================================================================================
   پله — پنل مربی (سلامت پلاس، فاز B + برنامه‌ساز نسخه‌ی ۰)
   همون حساب پله‌ی مربیه (نشست ورود با خود اپ مشترکه؛ اگه تو اپ وارد شده باشی، اینجا هم واردی).
   همه‌ی دسترسی‌ها سمت سرور (RLS / RPCهای migration 015) کنترل می‌شن؛ این فایل فقط UI است.
   برنامه‌ساز اینجا «نسخه‌ی ۰» است: روزها، افزودن چندتایی حرکت با جستجوی فارسی، استپر ست/تکرار/زمان،
   ذخیره‌ی خودکار پیش‌نویس، انتشار و نسخه‌ی جدید. قالب‌ها، drag-and-drop و ورود متنی در فاز C.
   ===================================================================================== */
const SUPABASE_URL = "https://gzcwtrqysjedwdfmhbzx.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_dRr5B_5OygCpBSVE3BZQSQ_MGFOybXL";
const sb = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false }
}) : null;
const root = document.getElementById("root");

const SPECIALTIES = { calisthenics: "کلستنیکس", bodybuilding: "بدنسازی", nutrition: "تغذیه", fitness: "آمادگی جسمانی", running: "دویدن", other: "سایر" };
const CRED_KINDS = { certification: "مدرک مربیگری", degree: "مدرک دانشگاهی", license: "مجوز", membership: "عضویت فدراسیون/انجمن", other: "سایر" };
const WEEKDAYS = ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه"];
const STATUS_LABEL = { draft: "پیش‌نویس", pending: "در حال بررسی", approved: "تأییدشده", rejected: "رد شده", suspended: "معلق" };
const DEFAULT_DOSE = {
  reps_weight: { sets: 3, reps_min: 10 }, reps: { sets: 3, reps_min: 8 },
  time: { sets: 3, duration_sec: 30 }, distance_or_time: { sets: 3, duration_sec: 30 },
  cardio: { sets: 1, duration_sec: 1200 },   // هوازی: یه نوبت ۲۰ دقیقه‌ای
};

let C = {
  user: null, status: null, profile: null, creds: [], athletes: [], programs: [],
  view: "home", athlete: null, advice: [], notes: [], err: "", busy: false, form: null,
};
let D = null; // برنامه‌ی در حال ویرایش

/* ---------------- ابزارها ---------------- */
function esc(s){ return String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
const FA = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
function fa(n){ return String(n == null ? "" : n).replace(/[0-9]/g, d => FA[+d]); }
function en(s){ return String(s || "").replace(/[۰-۹]/g, d => String(d.charCodeAt(0) - 0x06F0)).replace(/[٠-٩]/g, d => String(d.charCodeAt(0) - 0x0660)); }
function faDate(iso){
  if(!iso) return "";
  try{ return new Intl.DateTimeFormat("fa-IR-u-ca-persian", { day: "numeric", month: "long" }).format(new Date(iso)); }catch(e){ return iso.slice(0, 10); }
}
function errText(error, fallback){
  const m = (error && (error.message || error.details)) || String(error || "");
  if(/not allowed|42501|permission|row-level/i.test(m)) return "اجازه‌ی این کار رو نداری.";
  if(/fetch|network|Failed to/i.test(m)) return "مشکل در اتصال — اینترنتت رو چک کن.";
  return /[\u0600-\u06FF]/.test(m) ? m.replace(/^.*?:\s*/, "") : (fallback || "یه مشکلی پیش اومد؛ دوباره امتحان کن.");
}
let _toastT = null;
function toast(msg, ms){
  const el = document.getElementById("c_toast");
  el.textContent = msg; el.className = "c-toast show";
  clearTimeout(_toastT); _toastT = setTimeout(() => { el.className = "c-toast"; }, ms || 2600);
}
function openSheet(html){ document.getElementById("c_sheet").innerHTML = html; document.getElementById("c_sheet_wrap").classList.add("show"); }
function cCloseSheet(){ document.getElementById("c_sheet_wrap").classList.remove("show"); }
function uuid(){ return (crypto.randomUUID ? crypto.randomUUID() : "xxxxxxxx-xxxx-4xxx-8xxx-xxxxxxxxxxxx".replace(/x/g, () => (Math.random() * 16 | 0).toString(16))); }
function exName(id){ const e = (typeof PLUS_BANK_MAP !== "undefined" && PLUS_BANK_MAP) ? PLUS_BANK_MAP[id] : null; return e ? e.n : id; }
function exOf(id){ return (typeof PLUS_BANK_MAP !== "undefined" && PLUS_BANK_MAP) ? PLUS_BANK_MAP[id] : null; }
if(typeof EX_BANK_LISTENERS !== "undefined") EX_BANK_LISTENERS.push(() => render());

/* ---------------- راه‌اندازی ---------------- */
async function boot(){
  if(!sb){ root.innerHTML = `<div class="c-card">کتابخانه‌ی اتصال بارگذاری نشد — اینترنتت رو چک کن.</div>`; return; }
  try{
    const { data } = await sb.auth.getSession();
    C.user = data && data.session && data.session.user;
    if(!C.user){ renderNoSession(); return; }
    await loadAll();
  }catch(e){
    console.error(e);
    root.innerHTML = `<div class="c-card"><div class="c-note">${esc(errText(e))}</div><button class="c-btn ghost block" onclick="boot()">دوباره</button></div>`;
  }
}
async function loadAll(){
  const st = await sb.rpc("plus_status");
  if(st.error) throw st.error;
  C.status = st.data || { enabled: false };
  if(!C.status.enabled){ render(); return; }
  const [pr, cr] = await Promise.all([
    sb.from("coach_profiles").select("*").eq("user_id", C.user.id).maybeSingle(),
    sb.from("coach_credentials").select("*").eq("coach_id", C.user.id).order("created_at", { ascending: true }),
  ]);
  C.profile = pr.data || null;
  C.creds = cr.data || [];
  if(C.profile && C.profile.status === "approved"){
    const [ath, progs] = await Promise.all([
      sb.rpc("coach_list_athletes"),
      sb.from("programs").select("id,title,status,version,athlete_id,parent_id,published_at,updated_at").eq("coach_id", C.user.id).order("updated_at", { ascending: false }),
    ]);
    C.athletes = ath.data || [];
    C.programs = progs.data || [];
    plusEnsureBank();
    const cx = await sb.from("exercises").select("*").eq("owner_coach_id", C.user.id).eq("status", "active");
    C.customExercises = cx.data || [];
    exAddCustomExercises(C.customExercises);
    if(typeof cxLoadHome === "function") await cxLoadHome();
  }
  render();
  if(typeof pelehLive !== "undefined") pelehLive.start(sb, C.user.id, coachOnLive);
}

/* ---------- به‌روز شدن لحظه‌ای (v2.4.0) ----------
   درخواست تازه‌ی شاگرد، اتصال، درخواست برنامه و … بدون رفرش صفحه میاد. وسط ساخت برنامه، صفحه‌ی شاگرد
   یا وقتی یه فرم بازه، صفحه دوباره کشیده نمی‌شه (فقط اعلان نشون داده می‌شه و داده‌ها تازه می‌شن). */
const COACH_LIVE_TEXT = {
  link_requested: "یه درخواست شاگردی تازه داری",
  athlete_connected: "یه شاگرد تازه بهت وصل شد",
  link_ended: "یکی از شاگردها اتصال رو قطع کرد",
  program_requested: "یه درخواست برنامه‌ی تازه داری",
  coach_review: "وضعیت حساب مربی‌گری‌ات عوض شد",
  credential_review: "مدرکت بررسی شد",
};
let COACH_LIVE_BUSY = false;
async function coachOnLive(n){
  if(COACH_LIVE_BUSY || !C.user) return;
  COACH_LIVE_BUSY = true;
  try{
    if(n && COACH_LIVE_TEXT[n.kind]) toast("🔔 " + COACH_LIVE_TEXT[n.kind]);
    if(n && (n.kind === "coach_review" || n.kind === "credential_review")){
      const pr = await sb.from("coach_profiles").select("*").eq("user_id", C.user.id).maybeSingle();
      if(pr.data) C.profile = pr.data;
    }
    if(C.profile && C.profile.status === "approved"){
      const ath = await sb.rpc("coach_list_athletes");
      if(!ath.error) C.athletes = ath.data || [];
      if(typeof cxLoadHome === "function") await cxLoadHome();
    }
    const sw = document.getElementById("c_sheet_wrap"), sheetOpen = !!(sw && sw.classList.contains("show"));
    const ae = document.activeElement, typing = ae && (ae.tagName === "INPUT" || ae.tagName === "TEXTAREA" || ae.isContentEditable);
    if(!typing && !sheetOpen && C.view !== "builder" && C.view !== "athlete") render();
  }catch(e){ /* دفعه‌ی بعد */ }
  COACH_LIVE_BUSY = false;
}
function renderNoSession(){
  root.innerHTML = `${topBar()}<div class="c-card gold" style="text-align:center;">
    <div style="font-size:36px;">🔐</div>
    <div class="c-name" style="margin:6px 0;">اول تو اپ پله وارد شو</div>
    <div class="c-note">پنل مربی با همون حساب پله کار می‌کنه. تو همین مرورگر وارد اپ شو و از «سلامت ← 💎 سلامت پلاس» برگرد اینجا.</div>
    <a class="c-btn primary block" style="margin-top:12px; text-decoration:none;" href="./">رفتن به اپ پله</a>
  </div>`;
}
const BRAND_MARK = `<svg class="brand-mark" viewBox="0 0 30 22" aria-hidden="true"><rect x="12" y="0" width="18" height="5" rx="2.5" fill="currentColor"/><rect x="6" y="8.5" width="24" height="5" rx="2.5" fill="currentColor"/><rect x="0" y="17" width="30" height="5" rx="2.5" fill="currentColor"/></svg>`;
function topBar(){
  return `<div class="c-top">
    <div class="c-brand">${BRAND_MARK} پله <small>پنل مربی</small></div>
    <a class="c-link" href="./">${pi("chevR")} بازگشت به اپ</a>
  </div>`;
}
function initialOf(name){ return esc(((name || "").trim()[0]) || "پ"); }

/* ---------------- رسم ---------------- */
function render(){
  if(!C.status){ return; }
  if(!C.status.enabled){
    root.innerHTML = `${topBar()}<div class="c-card"><div class="c-note">سلامت پلاس هنوز برای حسابت فعال نشده.</div></div>`;
    return;
  }
  if(C.view === "builder" && D) { root.innerHTML = renderBuilder(); return; }
  if(C.view === "athlete" && C.athlete){ root.innerHTML = renderAthlete(); return; }
  if(C.view === "profile" || !C.profile || ["draft", "rejected"].includes(C.profile.status)){ root.innerHTML = renderProfileForm(); return; }
  if(C.profile.status === "suspended"){
    root.innerHTML = `${topBar()}<div class="c-card"><div class="c-name">حساب مربی‌گری‌ات معلق شده</div>
      <div class="c-note">${esc(C.profile.rejection_reason || "")}</div><div class="c-note">برای پیگیری با پشتیبانی پله در تماس باش.</div></div>`;
    return;
  }
  if(C.profile.status === "pending"){ root.innerHTML = renderPending(); return; }
  root.innerHTML = renderHome() + coachNav();
}
/* منوی پایین مربی: خانه، شاگردها، برنامه‌ها، حرکت‌ها */
function coachNav(){
  const reqs = C.athletes.filter(a => a.status === "requested").length + ((typeof CX !== "undefined" && CX.requests) ? CX.requests.filter(r => r.status === "requested").length : 0);
  const tabs = [["home", "خانه", "home"], ["athletes", "شاگردها", "users"], ["programs", "برنامه‌ها", "clipboard"], ["exercises", "حرکت‌ها", "dumbbell"]];
  return `<nav class="c-nav" aria-label="منوی مربی">${tabs.map(([id, label, ic]) => `<button type="button" class="${(C.tab || "home") === id ? "on" : ""}" ${(C.tab || "home") === id ? 'aria-current="page"' : ""} onclick="C.tab='${id}'; render(); window.scrollTo(0,0);">${pi(ic)}${label}${id === "home" && reqs ? `<i class="badge-dot" aria-label="درخواست جدید"></i>` : ``}</button>`).join("")}</nav>`;
}
const _cRender = render;
render = function(){
  _cRender();
  root.classList.toggle("has-bar", C.view === "builder" && !!D);
  root.classList.toggle("no-nav", !root.querySelector(".c-nav") && !(C.view === "builder" && D));
};

/* ---------------- درخواست مربی‌گری / پروفایل ---------------- */
function renderProfileForm(){
  const p = C.profile || {};
  const f = C.form || (C.form = { display_name: p.display_name || "", bio: p.bio || "", specialties: (p.specialties || []).slice(),
    years: p.years_experience != null ? String(p.years_experience) : "", city: p.city || "", visibility: p.visibility || "code_only", photo_path: p.photo_path || null });
  const isEdit = p.status === "approved" || p.status === "pending";
  return `${topBar()}
    ${p.status === "rejected" ? `<div class="c-card" style="border-color:var(--rose);"><div class="c-name">درخواستت رد شد</div><div class="c-note">${esc(p.rejection_reason || "")}</div><div class="c-note">می‌تونی اصلاح کنی و دوباره بفرستی.</div></div>` : ``}
    ${!p.status ? `<div class="c-card gold"><div class="c-name">به پنل مربی‌های پله خوش اومدی 👋</div>
      <div class="c-note">برنامه بساز، با یه لمس برای شاگردت بفرست و روند هر حرکتش رو ببین. اول پروفایلت رو کامل کن؛ بعد از بررسی پشتیبانی، کد مربی‌ات فعال می‌شه.</div></div>` : ``}
    <div class="c-h">👤 پروفایل مربی ${p.status ? `<span class="c-badge ${p.status === "approved" ? "green" : p.status === "rejected" ? "red" : ""}">${STATUS_LABEL[p.status]}</span>` : ``}</div>
    <div class="c-card">
      <div class="c-field" style="display:flex; align-items:center; gap:12px;">
        <div class="c-avatar" style="width:64px; height:64px; border-radius:20px;">
          ${f.photo_path ? `<img src="${esc(avatarUrl(f.photo_path))}" alt="">` : pi("coach")}</div>
        <label class="c-btn ghost" style="flex:1;">📷 عکس پروفایل<input type="file" accept="image/*" style="display:none" onchange="uploadAvatar(this)"></label>
      </div>
      <div class="c-field"><label>اسم نمایشی (همونی که شاگردها می‌بینن)</label>
        <input class="c-input" maxlength="60" value="${esc(f.display_name)}" oninput="C.form.display_name=this.value" placeholder="مثلاً: وحید درپا"></div>
      <div class="c-field"><label>تخصص‌ها</label><div class="c-chips">
        ${Object.entries(SPECIALTIES).map(([k, v]) => `<button type="button" class="c-chip ${f.specialties.includes(k) ? "on" : ""}" onclick="toggleSpec('${k}')">${v}</button>`).join("")}
      </div></div>
      <div class="c-field" style="display:flex; gap:10px;">
        <div style="flex:1;"><label>سابقه (سال)</label><input class="c-input" inputmode="numeric" maxlength="2" value="${esc(fa(f.years))}" oninput="C.form.years=en(this.value).replace(/\\D/g,'')"></div>
        <div style="flex:2;"><label>شهر (اختیاری)</label><input class="c-input" maxlength="40" value="${esc(f.city)}" oninput="C.form.city=this.value"></div>
      </div>
      <div class="c-field"><label>درباره‌ی من (کوتاه)</label>
        <textarea class="c-input" maxlength="600" oninput="C.form.bio=this.value" placeholder="سبک کارت، سابقه، برای چه کسایی مناسبی...">${esc(f.bio)}</textarea></div>
      <div class="c-field"><label>دیده شدن</label><div class="c-chips">
        <button type="button" class="c-chip ${f.visibility === "code_only" ? "on" : ""}" onclick="C.form.visibility='code_only'; render();">فقط با کد</button>
        <button type="button" class="c-chip ${f.visibility === "public" ? "on" : ""}" onclick="C.form.visibility='public'; render();">در جستجوی پله هم دیده بشم</button>
      </div><div class="c-note" style="margin-top:6px;">شماره‌ی تماس هیچ‌جا نمایش داده نمی‌شه؛ ارتباط از داخل اپه.</div></div>
      <div class="c-err">${esc(C.err)}</div>
      <div class="c-row-btns">
        ${isEdit ? `<button class="c-btn primary" ${C.busy ? "disabled" : ""} onclick="saveProfile(false)">ذخیره</button>
                    <button class="c-btn ghost" onclick="C.form=null; C.err=''; C.view='home'; render();">بازگشت</button>`
                 : `<button class="c-btn ghost" ${C.busy ? "disabled" : ""} onclick="saveProfile(false)">ذخیره‌ی پیش‌نویس</button>
                    <button class="c-btn primary" ${C.busy ? "disabled" : ""} onclick="saveProfile(true)">ارسال برای بررسی</button>`}
      </div>
    </div>
    ${p.status ? renderCredentials() : `<div class="c-note" style="padding:0 6px;">بعد از ذخیره، می‌تونی مدارکت رو هم اضافه کنی.</div>`}`;
}
function toggleSpec(k){
  const a = C.form.specialties;
  const i = a.indexOf(k);
  if(i >= 0) a.splice(i, 1); else a.push(k);
  render();
}
function avatarUrl(path){ try{ return sb.storage.from("coach-avatars").getPublicUrl(path).data.publicUrl; }catch(e){ return ""; } }
async function saveProfile(submit){
  const f = C.form;
  C.err = "";
  if((f.display_name || "").trim().length < 2){ C.err = "اسم نمایشی رو کامل بنویس."; render(); return; }
  if(!f.specialties.length){ C.err = "حداقل یه تخصص انتخاب کن."; render(); return; }
  if(submit && !C.creds.length && !confirm("هنوز مدرکی اضافه نکردی. بدون مدرک هم بفرستم؟ (نشان «مدرک بررسی‌شده» فقط با مدرک تأییدشده می‌آد)")) return;
  C.busy = true; render();
  const years = f.years === "" ? null : Math.min(70, parseInt(f.years, 10) || 0);
  const { data, error } = await sb.rpc("coach_upsert_profile", { p_display_name: f.display_name.trim(), p_bio: f.bio, p_specialties: f.specialties,
    p_years: years, p_city: f.city, p_visibility: f.visibility, p_photo_path: f.photo_path, p_submit: !!submit });
  C.busy = false;
  if(error){ C.err = errText(error); render(); return; }
  toast(submit ? "درخواستت فرستاده شد ✓ — بعد از بررسی خبرت می‌کنیم." : "ذخیره شد ✓");
  C.form = null;
  if(C.view === "profile" && C.profile && C.profile.status === "approved") C.view = "home";
  await loadAll();
}
function renderPending(){
  return `${topBar()}<div class="c-card gold" style="text-align:center;">
      <div style="font-size:34px;">⏳</div><div class="c-name">درخواستت در حال بررسیه</div>
      <div class="c-note">پشتیبانی پله پروفایل و مدارکت رو بررسی می‌کنه. بعد از تأیید، کد مربی‌ات همین‌جا نشون داده می‌شه.</div>
      <button class="c-btn ghost block" style="margin-top:10px;" onclick="C.view='profile'; render();">ویرایش پروفایل</button>
    </div>${renderCredentials()}`;
}

/* ---------------- مدارک ---------------- */
function renderCredentials(){
  const badge = s => s === "verified" ? `<span class="c-badge green">✓ بررسی‌شده</span>` : s === "rejected" ? `<span class="c-badge red">رد شده</span>` : `<span class="c-badge">در انتظار بررسی</span>`;
  return `<div class="c-h">🎓 مدارک <button class="c-btn ghost" style="min-height:38px; padding:6px 12px;" onclick="openCredForm()">+ مدرک</button></div>
    <div class="c-card">
      ${C.creds.length ? C.creds.map(c => `<div class="c-cred">
        <div style="display:flex; justify-content:space-between; gap:8px;"><div class="c-name">${esc(c.title)}</div>${badge(c.status)}</div>
        <div class="c-note">${esc(CRED_KINDS[c.kind] || "")}${c.issuer ? " · " + esc(c.issuer) : ""}${c.issued_year ? " · " + fa(c.issued_year) : ""} · ${c.scope === "international" ? "بین‌المللی" : "ایرانی"}</div>
        ${c.reject_reason ? `<div class="c-note" style="color:var(--rose);">${esc(c.reject_reason)}</div>` : ``}
        <label class="c-check"><input type="checkbox" ${c.show_publicly ? "checked" : ""} onchange="toggleCredPublic('${c.id}', this.checked)"> اجازه‌ی نمایش نسخه‌ی پوشانده‌شده به شاگردها</label>
        <button class="c-link" onclick="deleteCred('${c.id}')">حذف</button>
      </div>`).join("") : `<div class="c-note">هنوز مدرکی اضافه نکردی. مدرک بررسی‌شده اعتماد شاگردها رو خیلی بیشتر می‌کنه.</div>`}
      <div class="c-note" style="margin-top:8px;">🔒 اصل مدرک فقط برای تو و پشتیبانی پله قابل دیدنه. اگه اجازه بدی، فقط یه نسخه‌ی پوشانده (بدون کد ملی، تاریخ تولد و آدرس) با واترمارک «فقط برای پله» به شاگردها نشون داده می‌شه.</div>
    </div>`;
}
function openCredForm(){
  openSheet(`<h3>افزودن مدرک</h3>
    <div class="c-field"><label>نوع</label><select id="cr_kind" class="c-input">${Object.entries(CRED_KINDS).map(([k, v]) => `<option value="${k}">${v}</option>`).join("")}</select></div>
    <div class="c-field"><label>عنوان مدرک</label><input id="cr_title" class="c-input" maxlength="120" placeholder="مثلاً: مربیگری درجه ۲ بدنسازی"></div>
    <div class="c-field" style="display:flex; gap:10px;">
      <div style="flex:2;"><label>صادرکننده</label><input id="cr_issuer" class="c-input" maxlength="120" placeholder="مثلاً: فدراسیون بدنسازی"></div>
      <div style="flex:1;"><label>سال</label><input id="cr_year" class="c-input" inputmode="numeric" maxlength="4" placeholder="1400 یا 2021"></div>
    </div>
    <div class="c-field"><label>دامنه</label><div class="c-chips">
      <label class="c-chip"><input type="radio" name="cr_scope" value="iran" checked> ایرانی</label>
      <label class="c-chip"><input type="radio" name="cr_scope" value="international"> بین‌المللی</label></div></div>
    <div class="c-field"><label>تصویر یا PDF مدرک</label><input id="cr_file" type="file" accept="image/*,application/pdf,.heic,.heif" class="c-input"></div>
    <label class="c-check"><input id="cr_public" type="checkbox"> بعد از تأیید، نسخه‌ی پوشانده‌شده به شاگردها نشون داده بشه</label>
    <div id="cr_err" class="c-err"></div>
    <div class="c-row-btns"><button class="c-btn ghost" onclick="cCloseSheet()">انصراف</button><button id="cr_save" class="c-btn primary" onclick="saveCred()">ذخیره</button></div>`);
}
function shamsiToGregorianYear(y){ return y >= 1300 && y <= 1500 ? y + 621 : y; }
async function saveCred(){
  const g = id => document.getElementById(id);
  const title = g("cr_title").value.trim();
  const errEl = g("cr_err");
  if(title.length < 2){ errEl.textContent = "عنوان مدرک رو بنویس."; return; }
  const yearRaw = parseInt(en(g("cr_year").value), 10);
  const year = isNaN(yearRaw) ? null : shamsiToGregorianYear(yearRaw);
  const file = g("cr_file").files[0];
  g("cr_save").disabled = true; errEl.textContent = "";
  let original_path = null;
  try{
    if(file){
      const prepared = await prepareUpload(file, 2200);
      original_path = `${C.user.id}/${uuid()}.${prepared.ext}`;
      const up = await sb.storage.from("coach-credentials-private").upload(original_path, prepared.blob, { contentType: prepared.type, upsert: false });
      if(up.error) throw up.error;
    }
    const { error } = await sb.from("coach_credentials").insert({
      coach_id: C.user.id, kind: g("cr_kind").value, title, issuer: g("cr_issuer").value.trim() || null, issued_year: year,
      scope: (document.querySelector("input[name=cr_scope]:checked") || {}).value || "iran", original_path, show_publicly: g("cr_public").checked,
    });
    if(error) throw error;
    cCloseSheet(); toast("مدرک اضافه شد ✓ — بعد از بررسی نشانش فعال می‌شه.");
    await loadAll();
  }catch(e){
    errEl.textContent = errText(e, "آپلود انجام نشد.");
    g("cr_save").disabled = false;
  }
}
async function toggleCredPublic(id, on){
  const { error } = await sb.from("coach_credentials").update({ show_publicly: !!on }).eq("id", id);
  if(error) toast(errText(error)); else toast(on ? "نمایش عمومی فعال شد" : "نمایش عمومی خاموش شد");
  await loadAll();
}
async function deleteCred(id){
  if(!confirm("این مدرک حذف بشه؟")) return;
  const c = C.creds.find(x => x.id === id);
  const { error } = await sb.from("coach_credentials").delete().eq("id", id);
  if(error){ toast(errText(error)); return; }
  if(c && c.original_path) sb.storage.from("coach-credentials-private").remove([c.original_path]).catch(() => {});
  await loadAll();
}
// HEIC آیفون ← JPEG (کتابخانه‌ی موجود اپ، فقط وقتی لازم شد بارگذاری می‌شه) + کوچک‌کردن عکس‌های بزرگ
async function prepareUpload(file, maxDim){
  const name = (file.name || "").toLowerCase();
  if(file.type === "application/pdf" || name.endsWith(".pdf")){
    if(file.size > 10 * 1024 * 1024) throw new Error("حجم PDF حداکثر ۱۰ مگابایت.");
    return { blob: file, type: "application/pdf", ext: "pdf" };
  }
  let blob = file;
  if(/heic|heif/.test(file.type) || /\.(heic|heif)$/.test(name)){
    if(typeof heic2any !== "function") await new Promise((res, rej) => { const s = document.createElement("script"); s.src = "vendor/heic2any.min.js"; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
    blob = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.88 });
    if(Array.isArray(blob)) blob = blob[0];
  }
  const img = await new Promise((res, rej) => { const u = URL.createObjectURL(blob); const im = new Image(); im.onload = () => { URL.revokeObjectURL(u); res(im); }; im.onerror = rej; im.src = u; });
  const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
  const cv = document.createElement("canvas");
  cv.width = Math.round(img.naturalWidth * scale); cv.height = Math.round(img.naturalHeight * scale);
  cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
  const out = await new Promise(res => cv.toBlob(res, "image/jpeg", 0.86));
  return { blob: out, type: "image/jpeg", ext: "jpg" };
}
async function uploadAvatar(input){
  const file = input.files && input.files[0];
  if(!file) return;
  try{
    const prepared = await prepareUpload(file, 512);
    const path = `${C.user.id}/avatar-${Date.now()}.jpg`;
    const up = await sb.storage.from("coach-avatars").upload(path, prepared.blob, { contentType: "image/jpeg", upsert: true });
    if(up.error) throw up.error;
    C.form.photo_path = path;
    toast("عکس آماده‌ست — «ذخیره» رو بزن.");
    render();
  }catch(e){ toast(errText(e, "آپلود عکس انجام نشد.")); }
}

/* ---------------- خانه‌ی مربی تأییدشده ---------------- */
function inviteLink(){ return `${location.origin}/?coach=${encodeURIComponent(C.status.coach_code || C.profile.coach_code)}`; }
async function shareInvite(){
  const code = C.status.coach_code || C.profile.coach_code;
  const text = `برای دریافت برنامه‌ی تمرینی از من، پله رو باز کن و با این لینک وصل شو:\n${inviteLink()}\n(یا تو «سلامت ← 💎 سلامت پلاس» کد ${code} رو وارد کن)`;
  try{
    if(navigator.share){ await navigator.share({ text }); return; }
  }catch(e){ if(e && e.name === "AbortError") return; }
  try{ await navigator.clipboard.writeText(text); toast("لینک دعوت کپی شد ✓"); }
  catch(e){ prompt("این متن رو کپی کن:", text); }
}
function athleteState(a){
  if(a.status !== "active") return "";
  if(!a.last_session) return `<span class="c-badge gray">تمرین ثبت‌نشده</span>`;
  const days = Math.floor((Date.now() - new Date(a.last_session).getTime()) / 86400000);
  if(days <= 7) return `<span class="c-badge green">فعال</span>`;
  return `<span class="c-badge red">افت استمرار (${fa(days)} روز)</span>`;
}
function athleteRow(a){
  const prog = currentProgramFor(a.athlete_id);
  const sub = a.last_session ? `آخرین تمرین ${esc(faDate(a.last_session))} · ${fa(a.sessions_28d || 0)} جلسه در ۲۸ روز` : "هنوز تمرینی ثبت نکرده";
  return `<div class="c-list-row click" onclick="openAthlete('${a.link_id}')">
    <span class="c-avatar sm" aria-hidden="true">${initialOf(a.athlete_name)}</span>
    <div class="grow"><div class="c-name">${esc(a.athlete_name)}</div><div class="c-note">${prog ? `${esc(prog.title)} · ` : ``}${sub}</div></div>
    ${typeof cxAttention === "function" && CX.dash ? cxAttention(a.athlete_id) : athleteState(a)}<span class="chev">${pi("chevL")}</span></div>`;
}
function renderHome(){
  const reqs = C.athletes.filter(a => a.status === "requested");
  const accepted = C.athletes.filter(a => a.status === "accepted");
  const active = C.athletes.filter(a => a.status === "active");
  const code = C.status.coach_code || C.profile.coach_code;
  const tab = C.tab || "home";
  const p = C.profile || {};
  const spec = (p.specialties || []).map(k => SPECIALTIES[k]).filter(Boolean).join(" و ");
  const attention = (typeof CX !== "undefined" && CX.dash) ? CX.dash.filter(d => d.attention).length : 0;
  const progReqs = (typeof CX !== "undefined" && CX.requests) ? CX.requests.filter(r => r.status === "requested").length : 0;
  const head = `<div class="c-head">
      <span class="c-avatar" aria-hidden="true">${p.photo_path ? `<img src="${esc(avatarUrl(p.photo_path))}" alt="">` : initialOf(p.display_name)}</span>
      <div class="grow"><div class="c-hello">سلام ${esc((p.display_name || "").split(" ")[0] || "مربی")}</div>
        <div class="c-verified">${pi("shieldCheck")} مربی تأییدشده${spec ? ` · ${esc(spec)}` : ``}</div></div>
      <a class="c-iconbtn" href="./" aria-label="بازگشت به اپ">${pi("home")}</a>
    </div>`;
  const athletesList = `<div class="c-card list">${active.length ? active.map(athleteRow).join("")
      : `<div class="c-note" style="padding:16px 0;">هنوز شاگردی نداری. لینک دعوت رو برای شاگردت بفرست.</div>`}</div>
    ${accepted.length ? `<div class="c-card raised"><div class="c-note">منتظر تأیید شاگرد: ${accepted.map(a => esc(a.athlete_name)).join("، ")}</div></div>` : ``}`;
  if(tab === "athletes") return `${head}<div class="c-h">شاگردها (${fa(active.length)})</div>${athletesList}
    <button class="c-btn dashed block" onclick="shareInvite()">${pi("share")} فرستادن لینک دعوت</button>`;
  if(tab === "programs"){
    const byAthlete = active.map(a => ({ a, list: C.programs.filter(pr => pr.athlete_id === a.athlete_id) }));
    return `${head}${typeof cxTemplatesBlock === "function" ? cxTemplatesBlock() : ""}<div class="c-h">برنامه‌ی شاگردها (${fa(C.programs.filter(pr => pr.athlete_id).length)})</div>
      ${byAthlete.map(({ a, list }) => `<div class="c-card list">
        <div class="c-list-row click" onclick="openAthlete('${a.link_id}')"><span class="c-avatar sm" aria-hidden="true">${initialOf(a.athlete_name)}</span>
          <div class="grow"><div class="c-name">${esc(a.athlete_name)}</div><div class="c-note">${list.length ? `${fa(list.length)} برنامه` : "هنوز برنامه نداره"}</div></div>
          <button class="c-btn primary sm" onclick="event.stopPropagation(); ${typeof cxStartNewProgram === "function" ? "cxStartNewProgram" : "newProgram"}('${a.athlete_id}')">${pi("plus")} برنامه</button></div>
        ${list.map(pr => `<div class="c-list-row"><div class="grow"><div class="c-name" style="font-weight:600;">${esc(pr.title)}</div><div class="c-note">نسخه‌ی ${fa(pr.version)}${pr.published_at ? ` · ${esc(faDate(pr.published_at))}` : ``}</div></div>
          <span class="c-badge ${pr.status === "published" ? "green" : pr.status === "draft" ? "" : "gray"}">${{ draft: "پیش‌نویس", published: "فعلی", archived: "بایگانی" }[pr.status]}</span>
          ${pr.status === "draft" ? `<button class="c-btn ghost sm" onclick="editProgram('${pr.id}')">ویرایش</button>` : pr.status === "published" ? `<button class="c-btn ghost sm" onclick="newVersion('${pr.id}')">نسخه‌ی جدید</button>` : ``}</div>`).join("")}
      </div>`).join("") || `<div class="c-card"><div class="c-note">اول یه شاگرد وصل کن.</div></div>`}`;
  }
  if(tab === "exercises") return `${head}${typeof cxCustomExercisesBlock === "function" ? cxCustomExercisesBlock() : ""}
    <button class="c-btn ghost block" style="margin-top:6px;" onclick="C.form=null; C.view='profile'; render();">${pi("pencil")} پروفایل و مدارک</button>`;
  return `${head}
    <div class="c-stats">
      <button type="button" class="c-stat" onclick="C.tab='athletes'; render();"><b>${fa(active.length)}</b><span>شاگرد فعال</span></button>
      <div class="c-stat ${attention ? "warn" : ""}"><b>${fa(attention)}</b><span>نیاز به توجه</span></div>
      <div class="c-stat hl"><b>${fa(reqs.length + progReqs)}</b><span>درخواست جدید</span></div>
    </div>
    <div class="c-card c-codecard hero">
      <div class="row"><div><div class="c-note">کد مربی تو</div><div class="c-code">${esc(code)}</div></div>
        <button class="c-iconbtn" aria-label="کپی کد" onclick="navigator.clipboard && navigator.clipboard.writeText('${esc(code)}').then(() => toast('کد کپی شد'))">${pi("copy")}</button></div>
      <button class="c-btn primary block" onclick="shareInvite()">${pi("share")} فرستادن لینک دعوت برای شاگرد</button>
    </div>
    ${reqs.length ? `<div class="c-h">درخواست‌های اتصال (${fa(reqs.length)})</div><div class="c-card list">${reqs.map(a => `<div class="c-list-row">
        <span class="c-avatar sm" aria-hidden="true">${initialOf(a.athlete_name)}</span>
        <div class="grow"><div class="c-name">${esc(a.athlete_name)}</div>${a.request_message ? `<div class="c-note">«${esc(a.request_message)}»</div>` : ``}</div>
        <button class="c-btn primary sm" onclick="respondLink('${a.link_id}', true)">پذیرش</button>
        <button class="c-btn ghost sm" onclick="respondLink('${a.link_id}', false)">رد</button>
      </div>`).join("")}</div>` : ``}
    ${typeof cxNeedsAttentionBlock === "function" ? cxNeedsAttentionBlock() + cxRequestsBlock() : ""}
    <div class="c-h">شاگردها (${fa(active.length)})</div>
    ${athletesList}`;
}
function currentProgramFor(athleteId){ return C.programs.find(p => p.athlete_id === athleteId && p.status === "published"); }
async function respondLink(id, accept){
  const { error } = await sb.rpc("coach_respond_link", { p_link: id, p_accept: accept });
  if(error){ toast(errText(error)); return; }
  toast(accept ? "پذیرفتی ✓ — بعد از تأیید شاگرد، وصل می‌شید." : "درخواست رد شد.");
  await loadAll();
}

/* ---------------- صفحه‌ی یک شاگرد ---------------- */
async function openAthlete(linkId){
  C.athlete = C.athletes.find(a => a.link_id === linkId) || null;
  if(!C.athlete) return;
  C.view = "athlete"; C.advice = []; C.notes = [];
  render();
  window.scrollTo(0, 0);
  const [adv, notes] = await Promise.all([
    sb.from("coach_advice").select("id,kind,body,created_at,read_at").eq("coach_id", C.user.id).eq("athlete_id", C.athlete.athlete_id).order("created_at", { ascending: false }).limit(30),
    sb.from("coach_notes").select("id,body,created_at").eq("coach_id", C.user.id).eq("athlete_id", C.athlete.athlete_id).order("created_at", { ascending: false }).limit(30),
  ]);
  C.advice = adv.data || []; C.notes = notes.data || [];
  render();
  if(typeof cxLoadAthlete === "function"){ await cxLoadAthlete(C.athlete.athlete_id); render(); }
}
function renderAthlete(){
  const a = C.athlete;
  const progs = C.programs.filter(p => p.athlete_id === a.athlete_id);
  const kindLabel = { diet: "🥗 رژیم", tip: "💡 توصیه", message: "💬 پیام" };
  return `<div class="c-head">
      <button class="c-back" aria-label="همه‌ی شاگردها" onclick="C.view='home'; C.athlete=null; render();">${pi("chevR")}</button>
      <span class="c-avatar" aria-hidden="true">${initialOf(a.athlete_name)}</span>
      <div class="grow"><div class="c-hello">${esc(a.athlete_name)}</div>
        <div class="c-note">${a.last_session ? `آخرین تمرین ${esc(faDate(a.last_session))} · ${fa(a.sessions_28d || 0)} جلسه در ۲۸ روز` : "هنوز تمرینی ثبت نکرده"}</div></div>
      ${athleteState(a)}
    </div>
    <div class="c-h">📋 برنامه‌ها <button class="c-btn primary" style="min-height:38px; padding:6px 12px;" onclick="${typeof cxStartNewProgram === "function" ? "cxStartNewProgram" : "newProgram"}('${a.athlete_id}')">+ برنامه‌ی جدید</button></div>
    <div class="c-card">${progs.length ? progs.map(p => `<div class="c-list-row">
        <div class="grow"><div class="c-name">${esc(p.title)}</div><div class="c-note">نسخه‌ی ${fa(p.version)}${p.published_at ? ` · منتشرشده ${esc(faDate(p.published_at))}` : ``}</div></div>
        <span class="c-badge ${p.status === "published" ? "green" : p.status === "draft" ? "" : "gray"}">${{ draft: "پیش‌نویس", published: "فعلی", archived: "بایگانی" }[p.status]}</span>
        ${p.status === "draft" ? `<button class="c-btn ghost" style="min-height:38px; padding:6px 10px;" onclick="editProgram('${p.id}')">ویرایش</button>`
          : p.status === "published" ? `<button class="c-btn ghost" style="min-height:38px; padding:6px 10px;" onclick="newVersion('${p.id}')">نسخه‌ی جدید</button>` : ``}
      </div>`).join("") : `<div class="c-note">هنوز برنامه‌ای برای ${esc(a.athlete_name)} نساختی.</div>`}</div>
    ${typeof cxBodyBlock === "function" ? cxBodyBlock(a) : ""}
    ${typeof cxProgressBlock === "function" ? cxProgressBlock(a) + cxSkillsBlock(a) + cxAiBlock(a) : ""}
    ${typeof cxPhotosBlock === "function" ? cxPhotosBlock(a) : ""}
    <div class="c-h">💬 پیام، رژیم و توصیه</div>
    <div class="c-card">
      <div class="c-chips" style="margin-bottom:8px;">
        ${["message", "diet", "tip"].map(k => `<button type="button" class="c-chip ${(C.adviceKind || "message") === k ? "on" : ""}" onclick="C.adviceKind='${k}'; render();">${kindLabel[k]}</button>`).join("")}
      </div>
      <textarea id="adv_body" class="c-input" maxlength="8000" placeholder="${(C.adviceKind || "message") === "diet" ? "برنامه‌ی غذایی رو بنویس..." : "پیامت به شاگرد..."}"></textarea>
      <button class="c-btn primary block" style="margin-top:8px;" onclick="sendAdvice()">فرستادن</button>
      ${C.advice.map(x => `<div class="c-cred"><div class="c-note">${kindLabel[x.kind]} · ${esc(faDate(x.created_at))}${x.read_at ? " · ✓ دیده شد" : ""}</div><div style="white-space:pre-wrap; line-height:1.8;">${esc(x.body)}</div></div>`).join("")}
    </div>
    <div class="c-h">🔒 یادداشت خصوصی (شاگرد نمی‌بینه)</div>
    <div class="c-card">
      <textarea id="note_body" class="c-input" maxlength="4000" placeholder="مثلاً: زانوی چپ حساسه، اسکوات عمیق نده"></textarea>
      <button class="c-btn ghost block" style="margin-top:8px;" onclick="addNote()">ذخیره‌ی یادداشت</button>
      ${C.notes.map(n => `<div class="c-cred"><div class="c-note">${esc(faDate(n.created_at))}</div><div style="white-space:pre-wrap;">${esc(n.body)}</div></div>`).join("")}
    </div>
    <button class="c-btn danger block" style="margin-top:6px;" onclick="endLink()">پایان همکاری با ${esc(a.athlete_name)}</button>`;
}
async function sendAdvice(){
  const body = (document.getElementById("adv_body").value || "").trim();
  if(!body){ toast("متن پیام خالیه."); return; }
  const { error } = await sb.from("coach_advice").insert({ coach_id: C.user.id, athlete_id: C.athlete.athlete_id, kind: C.adviceKind || "message", body });
  if(error){ toast(errText(error)); return; }
  toast("فرستاده شد ✓");
  openAthlete(C.athlete.link_id);
}
async function addNote(){
  const body = (document.getElementById("note_body").value || "").trim();
  if(!body) return;
  const { error } = await sb.from("coach_notes").insert({ coach_id: C.user.id, athlete_id: C.athlete.athlete_id, body });
  if(error){ toast(errText(error)); return; }
  openAthlete(C.athlete.link_id);
}
async function endLink(){
  if(!confirm(`همکاری با ${C.athlete.athlete_name} تموم بشه؟ از همین لحظه دیگه به تمرین‌هاش دسترسی نداری.`)) return;
  const { error } = await sb.rpc("end_link", { p_link: C.athlete.link_id });
  if(error){ toast(errText(error)); return; }
  C.view = "home"; C.athlete = null;
  toast("همکاری تموم شد.");
  await loadAll();
}

/* =====================================================================================
   برنامه‌ساز (نسخه‌ی ۰)
   ===================================================================================== */
function blankDay(i){ return { weekday: null, title: "", items: [] }; }
function newProgram(athleteId){
  const a = C.athletes.find(x => x.athlete_id === athleteId);
  D = { id: null, athlete_id: athleteId, athlete_name: a ? a.athlete_name : "", title: "برنامه‌ی تمرینی", notes: "", parent_id: null,
        days: [blankDay(0), blankDay(1), blankDay(2)], dayIdx: 0, saveState: "", dirty: false };
  C.view = "builder"; plusEnsureBank(); render(); window.scrollTo(0, 0);
}
async function loadProgramInto(id, asNewVersion){
  const p = C.programs.find(x => x.id === id);
  const { data, error } = await sb.from("program_days")
    .select("id,weekday,day_index,title,sort,program_items(exercise_id,sort,sets,reps_min,reps_max,weight_kg,duration_sec,rest_sec,rpe,tempo,note,superset_group,scheme,set_details,distance_m)")
    .eq("program_id", id).order("sort", { ascending: true });
  if(error){ toast(errText(error)); return; }
  const full = await sb.from("programs").select("notes").eq("id", id).maybeSingle();
  const a = C.athletes.find(x => x.athlete_id === p.athlete_id);
  D = { id: asNewVersion ? null : id, athlete_id: p.athlete_id, athlete_name: a ? a.athlete_name : "", title: p.title,
        notes: (full.data && full.data.notes) || "", parent_id: asNewVersion ? id : p.parent_id, dayIdx: 0, saveState: "", dirty: !!asNewVersion,
        days: (data || []).map(d => ({ weekday: d.weekday, title: d.title || "",
          items: (d.program_items || []).sort((x, y) => (x.sort || 0) - (y.sort || 0)).map(it => {
            const o = Object.assign({}, it); delete o.sort; return o; }) })) };
  if(!D.days.length) D.days = [blankDay(0)];
  C.view = "builder"; plusEnsureBank(); render(); window.scrollTo(0, 0);
  if(asNewVersion) scheduleSave();
}
function editProgram(id){ loadProgramInto(id, false); }
function newVersion(id){ loadProgramInto(id, true); }

function dayLabel(d, i){ return d.weekday != null ? WEEKDAYS[d.weekday] : `روز ${fa(i + 1)}`; }
function renderBuilder(){
  const day = D.days[D.dayIdx] || D.days[0];
  const st = { saving: "در حال ذخیره...", saved: "پیش‌نویس ذخیره شد ✓", error: "ذخیره نشد — دوباره تلاش می‌کنم", "": D.id ? "" : "هنوز ذخیره نشده" }[D.saveState] || "";
  return `<div class="c-head">
      <button class="c-back" aria-label="${D.isTemplate ? "بازگشت به برنامه‌ها" : `بازگشت به ${esc(D.athlete_name || "شاگرد")}`}" onclick="leaveBuilder()">${pi("chevR")}</button>
      <div class="grow"><label for="b_title" class="c-kicker">${D.isTemplate ? "قالب شخصی من (برای اعمال روی شاگردها)" : `برنامه برای ${esc(D.athlete_name || "شاگرد")}${D.parent_id ? " · نسخه‌ی جدید" : ""}`}</label>
        <input id="b_title" class="c-title-input" maxlength="120" value="${esc(D.title)}" oninput="D.title=this.value; markDirty(false)" aria-label="عنوان برنامه"></div>
      <span class="c-save-state ${D.saveState === "saved" ? "ok" : D.saveState === "error" ? "err" : ""}">${D.saveState === "saved" ? pi("check") + " ذخیره شد" : esc(st)}</span>
    </div>
    ${D.parent_id ? `<div class="c-note" style="margin:-8px 2px 12px;">بعد از انتشار، نسخه‌ی قبلی بایگانی می‌شه.</div>` : ``}
    <div class="c-tabs" role="tablist" aria-label="روزهای برنامه">${D.days.map((d, i) => `<button class="c-tab ${i === D.dayIdx ? "on" : ""}" aria-pressed="${i === D.dayIdx}" onclick="D.dayIdx=${i}; render();">${esc(dayLabel(d, i))}${d.items.length ? ` (${fa(d.items.length)})` : ""}</button>`).join("")}
      <button class="c-tab add" aria-label="افزودن روز" onclick="addDay()">${pi("plus")}</button></div>
    <div class="c-card">
      <div class="c-field" style="display:flex; gap:8px;">
        <input class="c-input" style="flex:2;" maxlength="60" placeholder="عنوان روز (اختیاری) — مثلاً: سینه و پشت‌بازو" value="${esc(day.title)}" oninput="D.days[D.dayIdx].title=this.value; markDirty(false)">
        <select class="c-input" style="flex:1;" onchange="D.days[D.dayIdx].weekday = this.value === '' ? null : +this.value; markDirty(true)" aria-label="روز هفته">
          <option value="">روز هفته؟</option>${WEEKDAYS.map((w, i) => `<option value="${i}" ${day.weekday === i ? "selected" : ""}>${w}</option>`).join("")}
        </select>
      </div>
      ${day.items.map((it, i) => renderItem(it, i, day.items.length)).join("") || `<div class="c-note" style="text-align:center; padding:14px;">هنوز حرکتی نداره — «+ افزودن حرکت» رو بزن.</div>`}
      <button class="c-btn dashed block" onclick="openPicker()">+ افزودن حرکت</button>
      ${D.days.length > 1 ? `<button class="c-link" style="width:100%;" onclick="removeDay()">حذف این روز</button>` : ``}
    </div>
    <div class="c-card"><div class="c-field"><label>توضیح کلی برای شاگرد (اختیاری)</label>
      <textarea class="c-input" maxlength="2000" oninput="D.notes=this.value; markDirty(false)" placeholder="مثلاً: قبل از هر جلسه ۱۰ دقیقه گرم کن">${esc(D.notes)}</textarea></div>
      ${!D.isTemplate && typeof cxSaveAsTemplate === "function" ? `<button class="c-link" onclick="cxSaveAsTemplate()">💾 ذخیره به‌عنوان «قالب من»</button>` : ``}</div>
    ${D.isTemplate ? `<div class="c-bar">
      <button class="c-btn ghost" onclick="saveDraft(true)">ذخیره‌ی قالب</button>
      <button class="c-btn primary" onclick="cxApplyTemplateFromBuilder()">اعمال روی شاگردها</button>
    </div>` : `<div class="c-bar">
      <button class="c-btn ghost" onclick="saveDraft(true)">ذخیره</button>
      <button class="c-btn primary" onclick="publishProgram()">انتشار برای ${esc(D.athlete_name || "شاگرد")}</button>
    </div>`}`;
}
function renderItem(it, i, n){
  const items = D.days[D.dayIdx].items;
  const ex = exOf(it.exercise_id);
  const lt = ex ? ex.l : (it.duration_sec ? "time" : "reps_weight");
  const cardio = exIsCardio(ex);
  const timeBased = lt === "time" || lt === "distance_or_time";
  const odd = (it.sets || 0) > 10 || (it.reps_min || 0) > 50 || (!cardio && (it.duration_sec || 0) > 600);
  const sg = it.superset_group;
  const partnerAbove = sg && i > 0 && items[i - 1].superset_group === sg;
  const partnerBelow = sg && i < n - 1 && items[i + 1].superset_group === sg;
  const scheme = it.scheme || "straight";
  const det = Array.isArray(it.set_details) ? it.set_details : [];
  return `<div class="c-item ${sg ? "superset" : ""} ${partnerAbove ? "ss-second" : ""} ${partnerBelow ? "ss-first" : ""}">
    ${sg && partnerBelow ? `<div class="c-ss-label">${pi("link")} سوپرست — حرکت پایین بلافاصله و بدون استراحت</div>` : ``}
    <div class="c-item-head">
      <div class="grow">${esc(exName(it.exercise_id))}${ex && ex.cx ? ` <span class="c-badge">اختصاصی</span>` : ``}${ex && ex.rk ? ` <span class="c-badge red">⚠️ نیازمند ارزیابی سطح</span>` : ``}${odd ? ` <span class="c-badge">عدد غیرعادی؟</span>` : ``}</div>
      <button class="c-icon-btn" aria-label="بالا" ${i === 0 ? "disabled" : ""} onclick="moveItem(${i},-1)">${pi("chevU")}</button>
      <button class="c-icon-btn" aria-label="پایین" ${i === n - 1 ? "disabled" : ""} onclick="moveItem(${i},1)">${pi("chevD")}</button>
      <button class="c-icon-btn" aria-label="حذف" onclick="removeItem(${i})">${pi("x")}</button>
    </div>
    <div class="c-steppers">
      ${cardio ? `
        ${stepper(i, "duration_min", Math.round((it.duration_sec || 0) / 60), "دقیقه", 5, 0, 600)}
        <input class="c-input c-weight" inputmode="decimal" placeholder="کیلومتر" value="${it.distance_m ? esc(fa(Math.round(it.distance_m / 100) / 10)) : ""}" onchange="setDistance(${i}, this.value)" aria-label="مسافت هدف (کیلومتر)">
        ${stepper(i, "sets", it.sets || 1, "نوبت", 1, 1, 20)}`
      : `
        ${stepper(i, "sets", it.sets || 0, "ست", 1, 1, 20)}
        ${timeBased ? stepper(i, "duration_sec", it.duration_sec || 0, "ثانیه", 5, 5, 3600)
          : scheme === "drop" ? `` : stepper(i, "reps_min", it.reps_min || 0, "تکرار", 1, 1, 200)}
        ${!timeBased && scheme !== "pyramid" ? `<input class="c-input c-weight" inputmode="decimal" placeholder="${lt === "reps" ? "+وزنه" : "کیلو"}" value="${it.weight_kg != null ? esc(fa(it.weight_kg)) : ""}" onchange="setWeight(${i}, this.value)" aria-label="وزنه">` : ``}
        <select class="c-input" style="width:auto; min-height:40px;" onchange="setScheme(${i}, this.value)" aria-label="نوع ست">
          ${Object.entries(EX_SCHEME_FA).map(([k, v]) => `<option value="${k}" ${scheme === k ? "selected" : ""}>${v}</option>`).join("")}
        </select>`}
    </div>
    ${!cardio && !timeBased && scheme === "pyramid" ? `<div class="c-sets-grid"><div class="c-note">وزنه‌ی هر ست (هرمی)</div>
      ${Array.from({ length: it.sets || 1 }, (_, k) => `<label class="c-set-cell">ست ${fa(k + 1)}<input class="c-input" inputmode="decimal" placeholder="کیلو" value="${det[k] && det[k].weight_kg != null ? esc(fa(det[k].weight_kg)) : ""}" onchange="setDetail(${i}, ${k}, 'weight_kg', this.value)"></label>`).join("")}</div>` : ``}
    ${!cardio && !timeBased && scheme === "drop" ? `<div class="c-sets-grid"><div class="c-note">تکرار هر ست (دراپ‌ست)</div>
      ${Array.from({ length: it.sets || 1 }, (_, k) => `<label class="c-set-cell">ست ${fa(k + 1)}<input class="c-input" inputmode="numeric" placeholder="تکرار" value="${det[k] && det[k].reps != null ? esc(fa(det[k].reps)) : ""}" onchange="setDetail(${i}, ${k}, 'reps', this.value)"></label>`).join("")}</div>` : ``}
    ${scheme === "superset" && !partnerAbove && !partnerBelow ? `<button class="c-btn ghost block" style="margin-top:8px;" onclick="openPicker(${i})">+ حرکت دوم سوپرست (زیر همین)</button>` : ``}
    <details style="margin-top:6px;"><summary class="c-note" style="cursor:pointer;">پیشرفته (استراحت، ${cardio ? "شدت" : "RPE"}، یادداشت)</summary>
      <div class="c-steppers">${stepper(i, "rest_sec", it.rest_sec || 0, "ث استراحت", 15, 0, 600)}${stepper(i, "rpe", it.rpe || 0, cardio ? "شدت (۱-۱۰)" : "RPE", 1, 0, 10)}</div>
      <input class="c-input" style="margin-top:6px;" maxlength="200" placeholder="${cardio ? "مثلاً: ضربان ۱۳۰ تا ۱۴۵، شیب ۲٪" : "یادداشت این حرکت"}" value="${esc(it.note || "")}" onchange="D.days[D.dayIdx].items[${i}].note=this.value.trim()||null; markDirty(false)">
    </details>
  </div>`;
}
function syncSetDetails(it){
  // تعداد فیلدهای هر ست = تعداد ست‌ها (هرمی: وزنه، دراپ: تکرار)
  if(it.scheme !== "pyramid" && it.scheme !== "drop"){ it.set_details = null; return; }
  const n = Math.max(1, it.sets || 1);
  const det = Array.isArray(it.set_details) ? it.set_details.slice(0, n) : [];
  for(let k = det.length; k < n; k++){
    const prev = det[k - 1] || {};
    det.push(it.scheme === "pyramid"
      ? { weight_kg: prev.weight_kg != null ? prev.weight_kg + 2.5 : (it.weight_kg != null ? it.weight_kg : null) }
      : { reps: prev.reps != null ? Math.max(1, prev.reps - 2) : (it.reps_min || 12) });
  }
  it.set_details = det;
}
function setDetail(i, k, field, raw){
  const it = D.days[D.dayIdx].items[i];
  syncSetDetails(it);
  const v = parseFloat(en(raw).replace(/[^\d.]/g, ""));
  const lim = isNaN(v) ? null : (field === "reps" ? Math.min(PELEH_LIMITS.reps, Math.round(v)) : Math.min(PELEH_LIMITS.liftKg, v));
  if(!isNaN(v) && lim !== (field === "reps" ? Math.round(v) : v)) toast(field === "reps" ? `حداکثر ${fa(PELEH_LIMITS.reps)} تکرار` : `حداکثر ${fa(PELEH_LIMITS.liftKg)} کیلو — عدد اصلاح شد`);
  it.set_details[k][field] = lim;
  markDirty(false);
}
function setDistance(i, raw){
  const v = parseFloat(en(raw).replace(/[^\d.]/g, ""));
  D.days[D.dayIdx].items[i].distance_m = isNaN(v) || v <= 0 ? null : Math.round(Math.min(1000, v) * 1000);
  markDirty(false);
}
function stepper(i, field, val, unit, step, min, max){
  return `<div class="c-stepper"><button aria-label="کم" onclick="bump(${i},'${field}',${-step},${min},${max})">−</button>
    <span>${fa(val)} ${unit}</span><button aria-label="زیاد" onclick="bump(${i},'${field}',${step},${min},${max})">+</button></div>`;
}
function bump(i, field, delta, min, max){
  const it = D.days[D.dayIdx].items[i];
  if(field === "duration_min"){
    it.duration_sec = Math.max(0, Math.min(36000, (it.duration_sec || 0) + delta * 60)) || null;
    markDirty(true); return;
  }
  let v = (it[field] || 0) + delta;
  if(field === "rpe" && v > 0 && v < 1) v = 1;
  v = Math.max(min, Math.min(max, v));
  it[field] = v === 0 && (field === "rest_sec" || field === "rpe") ? null : v;
  if(field === "sets") syncSetDetails(it);
  markDirty(true);
}
function setWeight(i, raw){
  const v = parseFloat(en(raw).replace(/[^\d.]/g, ""));
  if(!isNaN(v) && v > PELEH_LIMITS.liftKg) toast(`حداکثر ${fa(PELEH_LIMITS.liftKg)} کیلو — عدد اصلاح شد`);
  D.days[D.dayIdx].items[i].weight_kg = isNaN(v) ? null : Math.min(PELEH_LIMITS.liftKg, v);
  markDirty(true);
}
function setScheme(i, v){
  const items = D.days[D.dayIdx].items, it = items[i];
  const prev = it.scheme || "straight";
  if(prev === "superset" && v !== "superset") unpairSuperset(items, i);
  it.scheme = v;
  syncSetDetails(it);
  if(v === "superset" && !it.superset_group){
    it.superset_group = nextSupersetGroup();
    markDirty(true);
    openPicker(i);          // حرکت دوم همون لحظه، زیر همین حرکت
    return;
  }
  markDirty(true);
}
function nextSupersetGroup(){ return 1 + Math.max(0, ...D.days.flatMap(d => d.items.map(x => x.superset_group || 0))); }
function unpairSuperset(items, i){
  const g = items[i].superset_group;
  if(!g) return;
  items.forEach(x => { if(x.superset_group === g){ x.superset_group = null; if(x.scheme === "superset") x.scheme = "straight"; } });
}
// بعد از جابه‌جایی/حذف: سوپرستی که اعضاش دیگه کنار هم نیستن، باز می‌شه
function normalizeSupersets(items){
  const groups = {};
  items.forEach((x, k) => { if(x.superset_group) (groups[x.superset_group] = groups[x.superset_group] || []).push(k); });
  Object.values(groups).forEach(ks => {
    const adjacent = ks.every((k, j) => j === 0 || k === ks[j - 1] + 1);
    if(ks.length < 2 && items[ks[0]].scheme === "superset") return; // منتظر حرکت دوم
    if(!adjacent) ks.forEach(k => { items[k].superset_group = null; if(items[k].scheme === "superset") items[k].scheme = "straight"; });
  });
}
function moveItem(i, dir){
  const items = D.days[D.dayIdx].items, j = i + dir;
  if(j < 0 || j >= items.length) return;
  [items[i], items[j]] = [items[j], items[i]];
  normalizeSupersets(items);
  markDirty(true);
}
function removeItem(i){
  const items = D.days[D.dayIdx].items;
  if(items[i].superset_group) unpairSuperset(items, i);
  items.splice(i, 1); normalizeSupersets(items); markDirty(true);
}
function addDay(){ D.days.push(blankDay(D.days.length)); D.dayIdx = D.days.length - 1; markDirty(true); }
function removeDay(){
  if(D.days[D.dayIdx].items.length && !confirm("این روز و حرکت‌هاش حذف بشه؟")) return;
  D.days.splice(D.dayIdx, 1); D.dayIdx = Math.max(0, D.dayIdx - 1); markDirty(true);
}
function markDirty(rerender){ D.dirty = true; if(rerender) render(); scheduleSave(); }
let _saveTimer = null, _saveChain = Promise.resolve();
function scheduleSave(){
  clearTimeout(_saveTimer);
  _saveTimer = setTimeout(() => { if(D && D.dirty && D.days.some(d => d.items.length)) saveDraft(false); }, 3000);
}
function leaveBuilder(){
  if(D && D.dirty && D.days.some(d => d.items.length)) saveDraft(false);
  if(D && D.isTemplate){ D = null; C.view = "home"; C.tab = "programs"; render(); loadAll(); return; }
  const link = C.athletes.find(a => a.athlete_id === D.athlete_id);
  D = null;
  if(link) openAthlete(link.link_id); else { C.view = "home"; render(); }
  loadAll();
}
// ذخیره‌ی پیش‌نویس: روزها پاک و از نو نوشته می‌شن (فقط پیش‌نویس قابل ویرایشه؛ سرور برنامه‌ی منتشرشده رو قفل می‌کنه)
function saveDraft(manual){
  clearTimeout(_saveTimer);
  _saveChain = _saveChain.then(() => doSave(manual)).catch(() => {});
  return _saveChain;
}
async function doSave(manual){
  if(!D) return false;
  const snap = JSON.parse(JSON.stringify(D));
  D.saveState = "saving"; D.dirty = false; refreshSaveState();
  try{
    if(!snap.title.trim()) snap.title = "برنامه‌ی تمرینی";
    if(!D.id){
      const { data, error } = await sb.from("programs").insert({ coach_id: C.user.id, athlete_id: snap.athlete_id, title: snap.title.trim(),
        notes: snap.notes || null, parent_id: snap.parent_id }).select("id").single();
      if(error) throw error;
      D.id = data.id;
    } else {
      const { error } = await sb.from("programs").update({ title: snap.title.trim(), notes: snap.notes || null }).eq("id", D.id);
      if(error) throw error;
    }
    const del = await sb.from("program_days").delete().eq("program_id", D.id);
    if(del.error) throw del.error;
    if(snap.days.length){
      const { data: days, error: e2 } = await sb.from("program_days").insert(snap.days.map((d, i) => ({
        program_id: D.id, weekday: d.weekday, day_index: i, title: d.title.trim() || null, sort: i }))).select("id,sort");
      if(e2) throw e2;
      const idBySort = {}; (days || []).forEach(d => { idBySort[d.sort] = d.id; });
      const items = [];
      snap.days.forEach((d, i) => d.items.forEach((it, k) => items.push({
        day_id: idBySort[i], exercise_id: it.exercise_id, sort: k, sets: it.sets || null, reps_min: it.reps_min || null, reps_max: it.reps_max || null,
        weight_kg: it.weight_kg == null ? null : it.weight_kg, duration_sec: it.duration_sec || null, rest_sec: it.rest_sec || null,
        rpe: it.rpe || null, tempo: it.tempo || null, note: it.note || null, superset_group: it.superset_group || null, scheme: it.scheme || "straight",
        set_details: Array.isArray(it.set_details) && it.set_details.length ? it.set_details : null, distance_m: it.distance_m || null })));
      if(items.length){ const { error: e3 } = await sb.from("program_items").insert(items); if(e3) throw e3; }
    }
    D.saveState = "saved";
    if(manual) toast("پیش‌نویس ذخیره شد ✓");
    refreshSaveState();
    return true;
  }catch(e){
    console.error("program save failed:", e);
    if(D){ D.saveState = "error"; D.dirty = true; refreshSaveState(); }
    if(manual) toast(errText(e, "ذخیره نشد."));
    setTimeout(() => { if(D && D.dirty) scheduleSave(); }, 5000);
    return false;
  }
}
function refreshSaveState(){
  // فقط وضعیت رو عوض کن؛ رسم کامل وسط تایپ کردن فوکوس رو می‌پرونه
  const ae = document.activeElement;
  if(ae && (ae.tagName === "INPUT" || ae.tagName === "TEXTAREA")) return;
  render();
}
async function publishProgram(){
  const total = D.days.reduce((n, d) => n + d.items.length, 0);
  if(!total){ toast("برنامه هنوز حرکتی نداره."); return; }
  const risky = D.days.flatMap(d => d.items).filter(it => { const e = exOf(it.exercise_id); return e && e.rk; });
  const msg = `برنامه‌ی «${D.title}» برای ${D.athlete_name} منتشر بشه؟` + (risky.length ? `\n\n⚠️ ${fa(risky.length)} حرکت «نیازمند ارزیابی سطح» داره — مطمئن شو شاگرد آماده‌ست.` : "")
    + (D.parent_id ? "\n\nنسخه‌ی قبلی بایگانی می‌شه." : "");
  if(!confirm(msg)) return;
  const ok = await saveDraft(false);
  if(ok === false || !D.id){ toast("قبل از انتشار، ذخیره انجام نشد."); return; }
  const { error } = await sb.rpc("publish_program", { p_program: D.id });
  if(error){ toast(errText(error), 4500); return; }
  toast(`منتشر شد ✓ — ${D.athlete_name} همین الان خبردار می‌شه.`, 3500);
  D.dirty = false;
  leaveBuilder();
}

/* ---------- انتخاب حرکت (چندتایی، با جستجوی فارسی/انگلیسی) ---------- */
let P = { q: "", scope: "core", disc: "", added: 0, ssFor: null };
function openPicker(ssFor){
  P.added = 0;
  P.ssFor = (typeof ssFor === "number") ? ssFor : null;   // حالت سوپرست: حرکت انتخابی زیر همین آیتم می‌ره
  plusEnsureBank();
  // انتخاب هوشمند: اگه عنوان روز «سینه»/«پا»/... داره، از همون شروع کن
  const t = (D.days[D.dayIdx].title || "").trim();
  P.q = ""; P.hint = t;
  renderPicker();
}
function renderPicker(){
  if(typeof PLUS_BANK === "undefined" || !PLUS_BANK){
    openSheet(`<h3>افزودن حرکت</h3><div class="c-note">در حال بارگذاری بانک حرکات...</div>`);
    plusEnsureBank() && plusEnsureBank().then(renderPicker);
    return;
  }
  const q = P.q || "";
  let res = plusSearchExercises(q, { core: P.scope === "core" && !q, disc: P.disc });
  if(!q && P.hint){
    const hintRes = plusSearchExercises(P.hint, { disc: P.disc }).slice(0, 20);
    if(hintRes.length) res = hintRes.concat(res.filter(e => !hintRes.includes(e)));
  }
  // v2.4.0: حرکت‌های اختصاصی خود مربی اول، بعد حرکت‌هایی که اخیراً استفاده کرده، بعد بقیه (ترتیب جستجو حفظ می‌شه)
  const recent = typeof exRecentList === "function" ? exRecentList() : [];
  if(!q){
    const mine = Object.values(plusBankMap()).filter(e => e.cx && (!e.ow || e.ow === C.user.id) && (!P.disc || (e.d || "").includes(P.disc)));
    const rec = recent.map(id => exOf(id)).filter(e => e && (!P.disc || (e.d || "").includes(P.disc)));
    res = mine.concat(rec, res.filter(e => !mine.includes(e) && !rec.includes(e)));
  } else if(typeof exRankForCoach === "function"){
    res = res.map((e, i) => [e, i]).sort((a, b) => (exRankForCoach(a[0], C.user.id, recent) - exRankForCoach(b[0], C.user.id, recent)) || a[1] - b[1]).map(x => x[0]);
  }
  const inDay = new Set(D.days[D.dayIdx].items.map(i => i.exercise_id));
  openSheet(`<h3>افزودن حرکت — ${esc(dayLabel(D.days[D.dayIdx], D.dayIdx))}</h3>
    <input id="pk_q" class="c-input" placeholder="جستجو: بنچ، بارفیکس، plank، تردمیل..." value="${esc(q)}" oninput="pickerSearch(this.value)" onkeydown="if(event.key==='Enter'){event.preventDefault(); const f=document.querySelector('#pk_list .c-pick'); if(f) f.click();}" autocomplete="off">
    <div class="c-chips" style="margin:8px 0;">
      <button class="c-chip ${P.scope === "core" ? "on" : ""}" onclick="P.scope='core'; renderPicker();">پرکاربرد</button>
      <button class="c-chip ${P.scope === "all" ? "on" : ""}" onclick="P.scope='all'; renderPicker();">همه</button>
      <button class="c-chip ${P.disc === "b" ? "on" : ""}" onclick="P.disc = P.disc==='b' ? '' : 'b'; renderPicker();">بدنسازی</button>
      <button class="c-chip ${P.disc === "c" ? "on" : ""}" onclick="P.disc = P.disc==='c' ? '' : 'c'; renderPicker();">کلستنیکس</button>
      <button class="c-chip ${P.disc === "a" ? "on" : ""}" onclick="P.disc = P.disc==='a' ? '' : 'a'; renderPicker();">هوازی</button>
    </div>
    ${P.ssFor !== null ? `<div class="c-note" style="color:var(--gold);">🔗 حرکت دوم سوپرست با «${esc(exName(D.days[D.dayIdx].items[P.ssFor].exercise_id))}» رو انتخاب کن</div>` : ``}
    ${!q && P.hint && res.length ? `<div class="c-note">پیشنهاد بر اساس عنوان روز: «${esc(P.hint)}»</div>` : ``}
    <div id="pk_list">${res.slice(0, 40).map(e => `<button class="c-pick ${inDay.has(e.i) ? "added" : ""}" onclick="pickExercise('${e.i}')">
      <div class="grow"><div class="c-name">${esc(e.n)}</div><div class="c-note">${e.e ? `<span dir="ltr">${esc(e.e)}</span>` : ""}</div></div>
      ${e.cx && (!e.ow || e.ow === C.user.id) ? `<span class="c-badge gold">اختصاصی من</span>` : recent.includes(e.i) ? `<span class="c-badge">اخیر</span>` : ``}
      ${e.rk ? `<span class="c-badge red">⚠️</span>` : ``}<span class="c-badge">${inDay.has(e.i) ? "✓" : "+"}</span></button>`).join("")
      || `<div class="c-note" style="padding:10px;">«${esc(q)}» تو بانک نیست. همین الان به‌عنوان حرکت اختصاصی بسازش؛ بدون نیاز به تأیید تیم پله، فوراً به برنامه اضافه می‌شه.</div>`}</div>
    <div class="c-row-btns" style="margin-top:8px;">
      ${typeof cxOpenCustomExercise === "function" ? `<button class="c-btn ${q && !res.length ? "primary" : "ghost"}" onclick="cxOpenCustomExercise(${JSON.stringify(q).replace(/"/g, "&quot;")})">${pi("plus")} حرکت اختصاصی من${q ? ` «${esc(q)}»` : ""}</button>` : ``}
    </div>
    ${q ? `<button class="c-link" style="width:100%;" onclick="requestMissing()">پیشنهاد به بانک عمومی پله (اختیاری؛ برای استفاده لازم نیست)</button>` : ``}
    <div class="c-bar" style="position:sticky; bottom:-20px; margin:10px -16px -20px;">
      <button class="c-btn primary" onclick="cCloseSheet(); render();">${P.added ? `تمام — ${fa(P.added)} حرکت اضافه شد` : "بستن"}</button></div>`);
  const el = document.getElementById("pk_q");
  if(el && q){ el.focus(); el.setSelectionRange(el.value.length, el.value.length); }
}
let _pkT = null;
function pickerSearch(v){ P.q = v; clearTimeout(_pkT); _pkT = setTimeout(renderPicker, 150); }
function pickExercise(id){
  const e = exOf(id);
  const items = D.days[D.dayIdx].items;
  if(P.ssFor === null && items.some(i => i.exercise_id === id)){ toast("این حرکت تو همین روز هست."); return; }
  const dose = exIsCardio(e) ? DEFAULT_DOSE.cardio : (DEFAULT_DOSE[(e && e.l) || "reps_weight"] || DEFAULT_DOSE.reps_weight);
  if(P.ssFor !== null){
    const base = items[P.ssFor];
    items.splice(P.ssFor + 1, 0, Object.assign({ exercise_id: id }, dose, { sets: base.sets || dose.sets, scheme: "superset", superset_group: base.superset_group || nextSupersetGroup() }));
    base.superset_group = items[P.ssFor + 1].superset_group; base.scheme = "superset";
    P.ssFor = null; P.added++;
    D.dirty = true; scheduleSave(); cCloseSheet(); render();
    toast("سوپرست ساخته شد 🔗");
    return;
  }
  items.push(Object.assign({ exercise_id: id, scheme: "straight" }, dose));
  if(typeof exNoteUsed === "function") exNoteUsed(id);
  if(e && e.rk) toast("⚠️ این حرکت «نیازمند ارزیابی سطح» است — اضافه شد.");
  P.added++;
  D.dirty = true; scheduleSave();
  renderPicker();
}
async function requestMissing(){
  const { data, error } = await sb.rpc("request_missing_exercise", { p_query: P.q });
  toast(error ? errText(error) : data ? "پیشنهادت ثبت شد. تا اون موقع می‌تونی همین الان به‌عنوان حرکت اختصاصی بسازیش." : "امروز درخواست زیادی ثبت کردی.", 4500);
}

window.addEventListener("beforeunload", e => { if(D && D.dirty && D.days.some(d => d.items.length)){ saveDraft(false); e.preventDefault(); e.returnValue = ""; } });
if(typeof pelehWrapRender === "function") render = pelehWrapRender(render);
// اندروید: دکمه‌ی Back ← بستن برگه ← یه مرحله عقب ← برگشت به اپ پله
(function(){
  try{
    const App = window.Capacitor && Capacitor.Plugins && Capacitor.Plugins.App;
    if(!App || typeof App.addListener !== "function") return;
    App.addListener("backButton", () => {
      const sheet = document.getElementById("c_sheet_wrap");
      if(sheet && sheet.classList.contains("show")){ cCloseSheet(); return; }
      if(C.view === "builder" && D){ leaveBuilder(); return; }
      if(C.view === "athlete" || C.view === "profile"){ C.view = "home"; C.athlete = null; C.form = null; render(); return; }
      location.href = "./";
    });
  }catch(e){}
})();
// بعد از بارگذاری همه‌ی اسکریپت‌ها (coach-plus.js هم)
if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else setTimeout(boot, 0);
