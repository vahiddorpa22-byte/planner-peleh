/* =====================================================================================
   💎 سلامت پلاس — سمت ورزشکار (فاز B سند جامع)
   فقط وقتی دیده می‌شه که سرور بگه فعاله (peleh_client_flags.plus_enabled ← plus_mode + allowlist بتا).
   همه‌ی دسترسی‌ها سمت سرور (RLS/RPC) چک می‌شن؛ این فایل فقط UI است.

   نمای‌ها (PLUS.view): home | connect | consent | search | coach | program | library | paths
   ورود: چیپ «💎 سلامت پلاس» در تب سلامت ← switchTab('plus')
   لینک دعوت مربی: ?coach=CODE (در app.js خونده و نگه داشته می‌شه) ← بعد از «شروع سریع» مستقیم صفحه‌ی رضایت.
   ===================================================================================== */

function plusBlankState(){
  return {
    status: null, loading: false, error: "",
    view: "home",
    coaches: [], programs: [], advice: [], notifs: [],
    code: "", codeBusy: false, codeError: "", codeResult: null,
    consent: null,            // {mode:"code", code, coach:{display_name,...}} | {mode:"link", link_id, coach:{...}}
    consentBusy: false,
    search: { q: "", spec: "", results: null, busy: false, error: "" },
    coachProfile: null, coachProfileBusy: false, requestMsg: "",
    program: null, programDays: null,
    lib: { q: "", scope: "core", disc: "", equip: "", limit: 40 },
  };
}
let PLUS = plusBlankState();
function plusResetState(){
  PLUS = plusBlankState();
  if(typeof PLUS_X !== "undefined"){ PLUS_X = { progress: null, progressDetail: null, requests: null, links: null, records: null }; PW = null; PW_TIMER = null; PW_REST = null; }
}

const PLUS_SPECIALTIES = { calisthenics: "کلستنیکس", bodybuilding: "بدنسازی", nutrition: "تغذیه", fitness: "آمادگی جسمانی", running: "دویدن", other: "سایر" };
const PLUS_EQUIPMENT = {
  bodyweight: "وزن بدن", floor: "زمین", pullup_bar: "میله بارفیکس", rings: "حلقه", parallel_bars: "پارالل", dumbbell: "دمبل",
  barbell: "هالتر", cable: "کابل", machine: "دستگاه", band: "کش", smith: "اسمیت", kettlebell: "کتل‌بل", medicine_ball: "توپ طبی",
  landmine: "لندماین", ez_bar: "میله EZ", suspension: "TRX", trap_bar: "هالتر شش‌ضلعی", bench: "نیمکت", wall: "دیوار", box: "باکس",
  rings_or_bar: "حلقه/میله", vertical_pole: "میله‌ی عمودی", low_bar: "میله‌ی کوتاه", wall_or_floor: "دیوار/زمین",
};
const PLUS_LOG_LABEL = { reps: "تکرار", reps_weight: "وزنه × تکرار", time: "زمان", distance_or_time: "مسافت/زمان" };
const PLUS_DIFFICULTY = { 1: "مبتدی", 2: "متوسط", 3: "پیشرفته", 4: "نخبه" };
const PLUS_WEEKDAYS = ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه"];

// وقتی بانک حرکات (exercise-search.js) بارگذاری شد، اگه صفحه‌ی پلاس بازه دوباره رسم کن
if(typeof EX_BANK_LISTENERS !== "undefined") EX_BANK_LISTENERS.push(() => { if(typeof currentTab !== "undefined" && currentTab === "plus") renderAll(); });

function plusEsc(s){ return escapeHtml(s == null ? "" : String(s)); }
function plusFa(n){ return toFaDigits(n == null ? "" : n); }
function plusRpcError(error, fallback){
  const m = (error && (error.message || error.details)) || "";
  if(/not allowed|42501|permission/i.test(m)) return "این بخش برای حسابت فعال نیست.";
  if(/fetch|network|Failed to/i.test(m)) return NET_ERROR_MSG;
  // پیام‌های فارسیِ خود سرور (raise exception '...') رو همون‌طور نشون بده
  return /[\u0600-\u06FF]/.test(m) ? m.replace(/^.*?:\s*/, "") : (fallback || "یه مشکلی پیش اومد؛ دوباره امتحان کن.");
}

/* ---------- ناوبری (Back اندروید و مرورگر) ---------- */
function plusGo(view){
  if(view !== "home" && PLUS.view === "home" && typeof suppressHistoryPush !== "undefined" && !suppressHistoryPush){
    history.pushState({ pelehNav: "plus", view }, "", location.href);
  }
  PLUS.view = view;
  renderAll();
  window.scrollTo(0, 0);
}
function plusBack(){
  // اگه با pushState اومدیم، Back مرورگر خودش plusHandleBack رو صدا می‌زنه
  if(history.state && history.state.pelehNav === "plus") history.back();
  else { PLUS.view = "home"; renderAll(); }
}
function plusHandleBack(){
  if(PLUS.ignorePop){ PLUS.ignorePop = false; return true; } // برگشتِ برنامه‌ریزی‌شده (بعد از اتصال موفق)
  if(PLUS.view === "home") return false;
  if(PLUS.view === "consent" && PLUS.consent && PLUS.consent.mode === "code"){ PLUS.view = "connect"; }
  else if(PLUS.view === "coach" && PLUS.search.results){ PLUS.view = "search"; }
  else PLUS.view = "home";
  renderAll();
  return true;
}

/* ---------- بارگذاری داده ---------- */
async function plusLoad(force){
  if(!sb || !currentUser || PLUS.loading) return;
  if(PLUS.status && !force) return;
  PLUS.loading = true;
  PLUS.error = "";
  try{
    const st = await sb.rpc("plus_status");
    if(st.error) throw st.error;
    PLUS.status = st.data || { enabled: false };
    if(PLUS.status.enabled){
      const [co, pr, adv, nt] = await Promise.all([
        sb.rpc("athlete_my_coaches"),
        sb.from("programs").select("id,title,version,status,published_at,coach_id,notes").eq("athlete_id", currentUser.id).order("published_at", { ascending: false }),
        sb.from("coach_advice").select("id,kind,body,created_at,coach_id,read_at").eq("athlete_id", currentUser.id).order("created_at", { ascending: false }).limit(30),
        sb.from("notifications").select("id,kind,payload,created_at,read_at").eq("user_id", currentUser.id).order("created_at", { ascending: false }).limit(20),
      ]);
      PLUS.coaches = co.data || [];
      // اجازه‌ی دیدن قد/وزن/BMI برای هر مربی (024)
      try{
        const sh = await sb.rpc("athlete_body_shares");
        if(!sh.error && Array.isArray(sh.data)){ const m = {}; sh.data.forEach(r => { m[r.link_id] = !!r.share_body; }); PLUS.coaches.forEach(c => { c.share_body = !!m[c.link_id]; }); }
      }catch(e){}
      if(PLUS.coaches.some(c => c.status === "active") && typeof hMaybeFullBodySync === "function") hMaybeFullBodySync();
      PLUS.programs = pr.data || [];
      PLUS.advice = adv.data || [];
      PLUS.notifs = nt.data || [];
      const cxr = await sb.from("exercises").select("*").not("owner_coach_id", "is", null).eq("status", "active").limit(500);
      if(cxr.data && cxr.data.length){ plusEnsureBank(); exAddCustomExercises(cxr.data); }
      if(typeof PLUS_X !== "undefined") PLUS_X.requests = null; // دوباره بارگذاری بشه
      // «روز تمرین = عادت امروز پله»: یه‌بار عادت «تمرین سلامت پلاس» با روزهای برنامه ساخته می‌شه
      const cur = PLUS.programs.find(p => p.status === "published");
      if(cur && typeof plusEnsureWorkoutHabit === "function"){
        const dd = await sb.from("program_days").select("weekday").eq("program_id", cur.id);
        plusEnsureWorkoutHabit(dd.data || []);
      }
    }
  }catch(e){
    console.error("plusLoad failed:", e);
    PLUS.error = plusRpcError(e, "اطلاعات سلامت پلاس بارگذاری نشد.");
  }
  PLUS.loading = false;
  if(currentTab === "plus") renderAll();
}
function plusRefresh(){ PLUS.status = null; plusLoad(true); }

/* ---------- به‌روز شدن لحظه‌ای (v2.4.0، peleh-live.js) ----------
   وقتی مربی درخواست رو قبول می‌کنه، برنامه منتشر می‌کنه یا پیام می‌فرسته، صفحه بدون خروج و ورود به‌روز می‌شه. */
let PLUS_LIVE_BUSY = false;
function plusStartLive(){
  if(typeof pelehLive === "undefined" || !sb || !currentUser || !CLIENT_FLAGS.plus_enabled) return;
  pelehLive.start(sb, currentUser.id, plusOnLive);
}
async function plusOnLive(n){
  if(PLUS_LIVE_BUSY) return;
  PLUS_LIVE_BUSY = true;
  try{
    if(n && n.kind && typeof plusNotifText === "function"){
      try{ showToast("🔔 " + plusNotifText(n), { ms: 4500 }); }catch(e){}
    }
    const wasLoaded = !!PLUS.status;
    if(wasLoaded || n){ await plusLoad(true); }
    if(typeof PLUS_X !== "undefined") PLUS_X.requests = null;
    if(n && n.kind === "plus_activated" && typeof loadClientFlags === "function") loadClientFlags();
    // صفحه رو فقط وقتی دوباره بکش که کاربر وسط تایپ یا یه فرم باز نیست
    const ov = document.getElementById("overlay"), ae = document.activeElement;
    const typing = ae && (ae.tagName === "INPUT" || ae.tagName === "TEXTAREA" || ae.isContentEditable);
    if(!typing && !(ov && ov.classList.contains("show"))) renderAll();
  }catch(e){ /* دفعه‌ی بعد */ }
  PLUS_LIVE_BUSY = false;
}

/* ---------- صفحه‌ی اصلی ---------- */
function renderPlus(){
  if(!CLIENT_FLAGS.plus_enabled){
    return `${plusHeader("💎 سلامت پلاس", true)}<div class="card"><div class="note">سلامت پلاس هنوز برای حسابت فعال نشده.</div></div>`;
  }
  if(!PLUS.status){
    plusLoad();
    return `${plusHeader("💎 سلامت پلاس", true)}<div class="card"><div class="note">${PLUS.error ? plusEsc(PLUS.error) : "در حال بارگذاری..."}</div>
      ${PLUS.error ? `<button class="btn btn-ghost" style="width:100%; margin-top:10px;" onclick="plusRefresh()">دوباره</button>` : ``}</div>`;
  }
  if(!PLUS.status.enabled){
    return `${plusHeader("💎 سلامت پلاس", true)}<div class="card"><div class="note">سلامت پلاس هنوز برای حسابت فعال نشده.</div></div>`;
  }
  switch(PLUS.view){
    case "connect": return renderPlusConnect();
    case "consent": return renderPlusConsent();
    case "search": return renderPlusSearch();
    case "coach": return renderPlusCoachProfile();
    case "program": return renderPlusProgram();
    case "library": return renderPlusLibrary();
    case "paths": return renderPlusPaths();
    case "workout": return renderPlusWorkout();
    case "progress": return renderPlusProgress();
    case "photos": return typeof renderPlusPhotos === "function" ? renderPlusPhotos() : renderPlusHome();
    default: return renderPlusHome();
  }
}
function plusHeader(title, toHealth){
  // عنوان بدون ایموجی تزئینی — سلسله‌مراتب با اندازه و وزن، نه با نماد
  const t = typeof pelehStripEmoji === "function" ? pelehStripEmoji(title) : title;
  return `<div class="plus-head">
    <button class="plus-back" aria-label="بازگشت" onclick="${toHealth ? "switchTab('health')" : "plusBack()"}">${pi("chevR")}</button>
    <h2 class="plus-title">${t}</h2>
  </div>`;
}
function renderPlusHome(){
  const st = PLUS.status;
  const active = PLUS.coaches.filter(c => c.status === "active");
  const pending = PLUS.coaches.filter(c => c.status === "requested" || c.status === "accepted");
  const ended = PLUS.coaches.filter(c => c.status === "ended");
  const current = PLUS.programs.filter(p => p.status === "published");
  const unread = PLUS.notifs.filter(n => !n.read_at);
  if(unread.length) setTimeout(plusMarkNotificationsRead, 1500);
  const blocks = [];
  // طراحی نهایی: سلامت پلاس همون تب «مربی» داخل سلامته (با همون شبکه‌ی تب‌ها)
  if(typeof renderHealthTabGrid === "function") blocks.push(`<div class="page-title">سلامت</div><div style="height:10px;"></div>${renderHealthTabGrid("plus")}`);
  else blocks.push(plusHeader("💎 سلامت پلاس", true));

  const pwActive = typeof pwLoad === "function" ? pwLoad() : null;
  if(pwActive && pwActive.status !== "finished"){
    blocks.push(`<div class="card plus-program-card" onclick="plusOpenTodayWorkout()"><div style="font-weight:900;">▶ ادامه‌ی تمرین ${plusEsc(pwActive.day_label || "")}</div>
      <div class="note">جلسه‌ی نیمه‌کاره ذخیره شده — هر جا موندی ادامه بده.</div></div>`);
  }
  if(unread.length){
    blocks.push(`<div class="card plus-notifs">${unread.slice(0, 5).map(n => `<div class="plus-notif">🔔 ${plusEsc(plusNotifText(n))}</div>`).join("")}</div>`);
  }

  // تمرین امروز / برنامه‌ی فعلی (بزرگ‌ترین عنصر)
  if(current.length){
    blocks.push(`<div class="section-title">🏋️ برنامه‌ی فعلی</div>` + current.map(p => {
      const coach = PLUS.coaches.find(c => c.coach_id === p.coach_id);
      return `<div class="card plus-program-card" onclick="plusOpenProgram('${p.id}')">
        <div style="font-weight:900; font-size:calc(15px * var(--font-scale));">${plusEsc(p.title)}</div>
        <div class="note">${coach ? `از ${plusEsc(coach.display_name)} · ` : ``}نسخه‌ی ${plusFa(p.version)}${p.published_at ? ` · ${plusFa(jalaliDateLabel(new Date(p.published_at)))}` : ``}</div>
        <div class="plus-cta">دیدن برنامه ←</div>
        <button class="btn btn-primary" style="width:100%; padding:13px; margin-top:10px;" onclick="event.stopPropagation(); plusOpenTodayWorkout()">🏋️ شروع تمرین امروز</button>
      </div>`;
    }).join(""));
  } else if(active.length){
    blocks.push(`<div class="card"><div class="note">به مربی‌ت وصلی؛ به‌محض اینکه برنامه بفرسته، همین‌جا می‌بینیش و خبرت می‌کنیم.</div></div>`);
  }

  if(typeof renderPlusSubscriptionCard === "function") blocks.push(renderPlusSubscriptionCard());
  else if(st.plus_until){
    blocks.push(`<div class="note" style="padding:0 4px 8px;">اشتراک سلامت پلاس تا ${plusFa(jalaliDateLabel(new Date(st.plus_until)))}</div>`);
  }
  if(st.has_plus && st.plus_until) blocks.push(`<div class="note" style="padding:0 4px 8px;">اشتراک سلامت پلاس تا ${plusFa(jalaliDateLabel(new Date(st.plus_until)))}</div>`);

  // مربی‌های من
  blocks.push(`<div class="section-title">👥 مربی‌های من</div><div class="card">
    ${active.length ? active.map(c => plusCoachRow(c)).join("") : `<div class="note">هنوز به مربی‌ای وصل نیستی.</div>`}
    ${pending.map(c => plusCoachRow(c)).join("")}
    <div class="plus-actions">
      <button class="btn btn-primary" onclick="plusGo('connect')">🔑 وارد کردن کد مربی</button>
      <button class="btn btn-ghost" onclick="plusGo('search')">🔎 جستجوی مربی</button>
    </div>
  </div>`);

  if(typeof renderPlusRequestsBlock === "function") blocks.push(renderPlusRequestsBlock());
  if(typeof plusPhotosCard === "function" && active.length) blocks.push(plusPhotosCard());

  if(PLUS.advice.length){
    blocks.push(`<div class="section-title">💬 پیام‌ها و رژیم</div><div class="card">${PLUS.advice.slice(0, 10).map(a => {
      const coach = PLUS.coaches.find(c => c.coach_id === a.coach_id);
      return `<div class="plus-advice"><div class="note">${a.kind === "diet" ? "🥗 رژیم" : a.kind === "tip" ? "💡 توصیه" : "💬 پیام"}${coach ? ` · ${plusEsc(coach.display_name)}` : ``} · ${plusFa(jalaliDateLabel(new Date(a.created_at)))}</div>
        <div class="plus-advice-body">${plusEsc(a.body)}</div></div>`;
    }).join("")}</div>`);
  }

  const old = PLUS.programs.filter(p => p.status === "archived");
  if(old.length){
    blocks.push(`<details class="card"><summary style="cursor:pointer; font-weight:800;">🗂️ برنامه‌های قبلی (${plusFa(old.length)})</summary>
      ${old.map(p => `<div class="plus-row" onclick="plusOpenProgram('${p.id}')"><span>${plusEsc(p.title)}</span><span class="note">نسخه‌ی ${plusFa(p.version)}</span></div>`).join("")}
    </details>`);
  }
  if(ended.length){
    blocks.push(`<details class="card"><summary style="cursor:pointer; color:var(--muted);">ارتباط‌های قبلی (${plusFa(ended.length)})</summary>
      ${ended.map(c => `<div class="plus-row"><span>${plusEsc(c.display_name)}</span><span class="note">قطع‌شده</span></div>`).join("")}
    </details>`);
  }

  blocks.push(`<div class="section-title">📚 ابزارها</div><div class="card">
    <div class="plus-row" onclick="plusOpenProgress()"><span>📈 پیشرفت من</span><span class="note">رکوردها و نمودار هر حرکت ←</span></div>
    <div class="plus-row" onclick="plusGo('library')"><span>🏋️ بانک حرکات</span><span class="note">جستجوی فارسی/انگلیسی ←</span></div>
    <div class="plus-row" onclick="plusGo('paths')"><span>🧗 مسیرهای پیشرفت مهارتی</span><span class="note">کلستنیکس ←</span></div>
  </div>`);

  blocks.push(`<div class="card plus-coach-entry">
    ${st.is_coach
      ? `<button class="btn btn-ghost" style="width:100%;" onclick="location.href='coach.html'">🧑‍🏫 ورود به حالت مربی (کد: <b style="direction:ltr; display:inline-block;">${plusEsc(st.coach_code)}</b>)</button>`
      : st.coach_status
        ? `<button class="btn btn-ghost" style="width:100%;" onclick="location.href='coach.html'">🧑‍🏫 درخواست مربی‌گری: ${plusEsc(plusCoachStatusLabel(st.coach_status))}</button>`
        : `<button class="link-btn" style="width:100%;" onclick="location.href='coach.html'">مربی هستی؟ درخواست حساب مربی بده</button>`}
  </div>`);

  return `<div class="plus-wrap">${blocks.join("")}</div>`;
}
function plusCoachStatusLabel(s){
  return { draft: "پیش‌نویس", pending: "در حال بررسی", approved: "تأییدشده", rejected: "رد شده", suspended: "معلق" }[s] || s;
}
function plusCoachRow(c){
  const specs = (c.specialties || []).map(x => PLUS_SPECIALTIES[x] || x).join("، ");
  let right = "";
  if(c.status === "active") right = `<div style="display:flex; flex-direction:column; gap:4px;"><button class="row-mini primary" onclick="event.stopPropagation(); plusRequestProgram('${c.coach_id}')">درخواست برنامه</button><button class="row-mini" onclick="event.stopPropagation(); plusDisconnect('${c.link_id}')">قطع اتصال</button></div>`;
  else if(c.status === "requested") right = `<span class="badge-soft">منتظر پاسخ مربی</span>`;
  else if(c.status === "accepted") right = `<button class="row-mini primary" onclick="event.stopPropagation(); plusStartConsentForLink('${c.link_id}')">تأیید و اتصال</button>`;
  return `<div class="plus-coach-row" onclick="plusOpenCoach('${c.coach_id}')">
    <div class="plus-avatar">${c.photo_path ? `<img src="${plusEsc(plusAvatarUrl(c.photo_path))}" alt="">` : "🧑‍🏫"}</div>
    <div style="flex:1; min-width:0;"><div style="font-weight:800;">${plusEsc(c.display_name)}</div>${specs ? `<div class="note">${plusEsc(specs)}</div>` : ``}</div>
    ${right}
  </div>${c.status === "active" ? plusShareBodyRow(c) : ""}${typeof plusAiConsentRow === "function" ? plusAiConsentRow(c) : ""}`;
}
function plusShareBodyRow(c){
  return `<label class="pw-pref" onclick="event.stopPropagation()"><input type="checkbox" ${c.share_body ? "checked" : ""} onchange="plusSetShareBody('${plusEsc(c.link_id)}', this.checked)">
    ${plusEsc(c.display_name)} قد، وزن و روند BMI من رو ببینه</label>`;
}
async function plusSetShareBody(linkId, on){
  const { error } = await sb.rpc("athlete_set_share_body", { p_link: linkId, p_on: !!on });
  if(error){ showToast(plusRpcError(error)); return; }
  const c = (PLUS.coaches || []).find(x => x.link_id === linkId); if(c) c.share_body = !!on;
  if(on && typeof hQueueBodySync === "function") hQueueBodySync(true);
  showToast(on ? "مربی‌ت از این به بعد روند وزن و BMI رو می‌بینه" : "دیدن وزن و BMI برای مربی خاموش شد");
  renderAll();
}
function plusAvatarUrl(path){
  try{ return sb.storage.from("coach-avatars").getPublicUrl(path).data.publicUrl; }catch(e){ return ""; }
}
function plusNotifText(n){
  const p = n.payload || {};
  switch(n.kind){
    case "program_published": return `برنامه‌ی جدید رسید: «${p.title || ""}»`;
    case "program_quoted": return "مربی به درخواست برنامه‌ت جواب داد.";
    case "request_payment_confirmed": return "مربی دریافت پرداختت رو تأیید کرد.";
    case "request_delivered": return "برنامه‌ای که درخواست داده بودی تحویل شد 🎉";
    case "request_declined": return "مربی فعلاً نمی‌تونه برنامه‌ی درخواستی رو بسازه.";
    case "plus_activated": return "اشتراک سلامت پلاس فعال شد 💎";
    case "plus_payment_rejected": return "رسید پرداخت تأیید نشد — با پشتیبانی در تماس باش.";
    case "link_response": return p.accepted ? "مربی درخواستت رو پذیرفت — برای اتصال تأیید کن." : "مربی درخواست اتصالت رو رد کرد.";
    case "link_ended": return "یه ارتباط مربی‌گری قطع شد.";
    default: return "یه خبر تازه داری.";
  }
}
async function plusMarkNotificationsRead(){
  const ids = PLUS.notifs.filter(n => !n.read_at).map(n => n.id);
  if(!ids.length) return;
  PLUS.notifs.forEach(n => { if(!n.read_at) n.read_at = new Date().toISOString(); });
  try{ await sb.rpc("mark_notifications_read", { p_ids: ids }); }catch(e){}
  CLIENT_FLAGS.plus_unread = 0;
}

/* ---------- اتصال با کد ---------- */
function renderPlusConnect(){
  const r = PLUS.codeResult;
  return `<div class="plus-wrap">${plusHeader("🔑 اتصال با کد مربی")}
    <div class="card">
      <div class="note" style="margin-bottom:10px;">کد ۶ حرفی رو از مربی‌ت بگیر (معمولاً تو تلگرام/واتساپ برات می‌فرسته).</div>
      <input type="text" id="plus_code" class="goal-input plus-code-input" maxlength="12" autocomplete="off" autocapitalize="characters"
        placeholder="مثلاً K7MP3Q" value="${plusEsc(PLUS.code)}" oninput="PLUS.code=this.value" onkeydown="if(event.key==='Enter'){event.preventDefault(); plusLookupCode();}">
      <div class="field-error" style="margin-top:8px;">${plusEsc(PLUS.codeError)}</div>
      <button class="btn btn-primary" style="width:100%;" ${PLUS.codeBusy ? "disabled" : ""} onclick="plusLookupCode()">${PLUS.codeBusy ? "در حال بررسی..." : "پیدا کن"}</button>
    </div>
    ${r && r.found ? `<div class="card">
      <div class="plus-coach-row">
        <div class="plus-avatar">${r.photo_path ? `<img src="${plusEsc(plusAvatarUrl(r.photo_path))}" alt="">` : "🧑‍🏫"}</div>
        <div style="flex:1;"><div style="font-weight:900;">${plusEsc(r.display_name)} <span class="badge-soft">✓ تأییدشده توسط پله</span></div>
          <div class="note">${plusEsc((r.specialties || []).map(x => PLUS_SPECIALTIES[x] || x).join("، "))}${r.verified_credentials ? ` · ${plusFa(r.verified_credentials)} مدرک بررسی‌شده` : ``}</div></div>
      </div>
      <button class="btn btn-primary" style="width:100%; margin-top:12px;" onclick="plusStartConsentForCode()">ادامه</button>
    </div>` : ``}
  </div>`;
}
async function plusLookupCode(){
  const el = document.getElementById("plus_code");
  const code = faToEnDigits(String((el ? el.value : PLUS.code) || "")).toUpperCase().replace(/[^A-Z0-9]/g, "");
  PLUS.code = code;
  PLUS.codeResult = null;
  if(code.length < 6){ PLUS.codeError = "کد مربی ۶ حرفیه."; renderAll(); return; }
  PLUS.codeBusy = true; PLUS.codeError = ""; renderAll();
  const { data, error } = await sb.rpc("coach_by_code", { p_code: code });
  PLUS.codeBusy = false;
  if(error) PLUS.codeError = plusRpcError(error);
  else if(data && data.rate_limited) PLUS.codeError = "تعداد تلاش زیاد بود؛ یه ساعت دیگه دوباره امتحان کن.";
  else if(!data || !data.found) PLUS.codeError = "مربی‌ای با این کد پیدا نشد. کد رو دوباره چک کن.";
  else PLUS.codeResult = data;
  renderAll();
}
function plusStartConsentForCode(){
  const r = PLUS.codeResult;
  if(!r) return;
  PLUS.consent = { mode: "code", code: PLUS.code, coach: r };
  plusGo("consent");
}
function plusStartConsentForLink(linkId){
  const c = PLUS.coaches.find(x => x.link_id === linkId);
  if(!c) return;
  PLUS.consent = { mode: "link", link_id: linkId, coach: c };
  plusGo("consent");
}

/* ---------- صفحه‌ی رضایت (نسخه‌دار) — بخش ۱۶ سند ---------- */
function renderPlusConsent(){
  const c = PLUS.consent;
  if(!c){ PLUS.view = "home"; return renderPlusHome(); }
  const name = plusEsc(c.coach.display_name);
  return `<div class="plus-wrap">${plusHeader("🤝 اتصال به " + name)}
    <div class="card plus-consent">
      <div style="font-weight:900; margin-bottom:10px;">${name} چه چیزهایی رو می‌بینه؟</div>
      <div class="plus-consent-grid">
        <div class="plus-consent-col yes">
          <div class="plus-consent-h">✓ می‌بینه</div>
          <div>برنامه‌هایی که خودش برات می‌سازه</div>
          <div>تمرین‌هایی که از همون برنامه‌ها ثبت می‌کنی (وزنه، تکرار، زمان)</div>
          <div>پیام‌ها و رژیم‌هایی که تو همین ارتباط رد و بدل می‌شه</div>
          <div>اسمت (تا تو فهرست شاگردهاش بشناستت)</div>
          <div>عکس‌های پیشرفتی که خودت برای همین مربی می‌فرستی</div>
          ${PLUS.consentShareBody !== false ? `<div>قد، وزن و روند شاخص توده‌ی بدنی (BMI) — پایین می‌تونی خاموشش کنی</div>` : ``}
        </div>
        <div class="plus-consent-col no">
          <div class="plus-consent-h">✗ نمی‌بینه</div>
          <div>عادت‌ها، فعالیت‌های روزانه و امتیازهات</div>
          <div>یادداشت‌ها، ژورنال، حال روزانه و کتاب‌ها</div>
          <div>گفت‌وگوهات با Coach پله و شماره موبایلت</div>
          <div>برنامه‌ی مربی‌های دیگه و تمرین‌هایی که بیرون از برنامه‌ی اون ثبت می‌کنی</div>
        </div>
      </div>
      <div class="note" style="margin-top:12px; line-height:2;">هر لحظه می‌تونی اتصال رو قطع کنی؛ از همون لحظه مربی دیگه هیچ داده‌ای از تو نمی‌بینه و سابقه‌ی تمرین‌هات برای خودت می‌مونه.
        پیشنهادهای مربی جایگزین توصیه‌ی پزشکی نیست.</div>
      <label class="pw-pref" style="margin-top:10px;"><input type="checkbox" ${PLUS.consentShareBody !== false ? "checked" : ""} onchange="PLUS.consentShareBody = this.checked; renderAll();">
        ${name} قد، وزن و روند BMI من رو ببینه تا بهتر برنامه بده <span class="note">(هر وقت خواستی از صفحه‌ی سلامت پلاس خاموشش کن)</span></label>
      <div class="note" style="opacity:.7;">نسخه‌ی متن رضایت: ${plusFa(PLUS.status.consent_version || 1)}</div>
      <div class="field-error" style="margin-top:8px;">${plusEsc(PLUS.codeError)}</div>
      <button class="btn btn-primary" style="width:100%; padding:14px;" ${PLUS.consentBusy ? "disabled" : ""} onclick="plusConfirmConsent()">${PLUS.consentBusy ? "در حال اتصال..." : "موافقم، وصلم کن"}</button>
      <button class="btn btn-ghost" style="width:100%; margin-top:8px;" onclick="plusBack()">انصراف</button>
    </div>
  </div>`;
}
async function plusConfirmConsent(){
  const c = PLUS.consent;
  if(!c || PLUS.consentBusy) return;
  PLUS.consentBusy = true; PLUS.codeError = ""; renderAll();
  const v = PLUS.status.consent_version || 1;
  const res = c.mode === "code"
    ? await sb.rpc("athlete_connect_by_code", { p_code: c.code, p_consent_version: v })
    : await sb.rpc("athlete_confirm_link", { p_link: c.link_id, p_consent_version: v });
  PLUS.consentBusy = false;
  if(res.error){ PLUS.codeError = plusRpcError(res.error); renderAll(); return; }
  const linkId = c.mode === "code" ? (res.data && res.data.link_id) : c.link_id;
  if(linkId && PLUS.consentShareBody !== false){
    try{ await sb.rpc("athlete_set_share_body", { p_link: linkId, p_on: true }); if(typeof hQueueBodySync === "function") hQueueBodySync(true); }catch(e){}
  }
  PLUS.consentShareBody = true;
  const name = c.coach.display_name;
  PLUS.consent = null; PLUS.code = ""; PLUS.codeResult = null;
  if(history.state && history.state.pelehNav === "plus"){ PLUS.ignorePop = true; history.back(); }
  PLUS.view = "home";
  plusRefresh();
  showToast(`به ${name} وصل شدی ✓`, { ms: 3500 });
}
async function plusDisconnect(linkId){
  const name = ((PLUS.coaches.find(c => c.link_id === linkId) || {}).display_name) || "مربی";
  if(!confirm(`اتصال با ${name} قطع بشه؟\n\nاز همین لحظه مربی هیچ داده‌ای از تو نمی‌بینه. سابقه‌ی تمرین‌هات برای خودت می‌مونه.`)) return;
  const { error } = await sb.rpc("end_link", { p_link: linkId });
  if(error){ showToast(plusRpcError(error)); return; }
  showToast("اتصال قطع شد.");
  plusRefresh();
}

/* ---------- جستجوی مربی ---------- */
function renderPlusSearch(){
  const s = PLUS.search;
  return `<div class="plus-wrap">${plusHeader("🔎 جستجوی مربی")}
    <div class="card">
      <input type="search" id="plus_search_q" class="goal-input" placeholder="اسم مربی یا شهر" value="${plusEsc(s.q)}"
        oninput="PLUS.search.q=this.value" onkeydown="if(event.key==='Enter'){event.preventDefault(); plusDoSearch();}">
      <div class="suggest-chips" style="justify-content:flex-start; margin-top:10px;">
        ${[["", "همه"], ["calisthenics", "کلستنیکس"], ["bodybuilding", "بدنسازی"], ["nutrition", "تغذیه"]].map(([k, l]) =>
          `<button type="button" class="suggest-chip ${s.spec === k ? 'on' : ''}" onclick="PLUS.search.spec='${k}'; plusDoSearch();">${l}</button>`).join("")}
      </div>
      <button class="btn btn-primary" style="width:100%; margin-top:10px;" onclick="plusDoSearch()">جستجو</button>
    </div>
    ${s.busy ? `<div class="note" style="padding:8px;">در حال جستجو...</div>` : ``}
    ${s.error ? `<div class="field-error">${plusEsc(s.error)}</div>` : ``}
    ${s.results ? (s.results.length ? `<div class="card">${s.results.map(r => `<div class="plus-coach-row" onclick="plusOpenCoach('${r.coach_id}')">
        <div class="plus-avatar">${r.photo_path ? `<img src="${plusEsc(plusAvatarUrl(r.photo_path))}" alt="">` : "🧑‍🏫"}</div>
        <div style="flex:1; min-width:0;"><div style="font-weight:800;">${plusEsc(r.display_name)} <span class="badge-soft">✓</span></div>
          <div class="note">${plusEsc((r.specialties || []).map(x => PLUS_SPECIALTIES[x] || x).join("، "))}${r.city ? ` · ${plusEsc(r.city)}` : ``}${r.active_athletes ? ` · ${plusFa(r.active_athletes)} شاگرد فعال` : ``}</div></div>
        <span class="note">←</span></div>`).join("")}</div>`
      : `<div class="card"><div class="note">مربی‌ای پیدا نشد. اگه کد مربی‌ت رو داری، از «وارد کردن کد» وصل شو — فقط مربی‌های تأییدشده‌ای که خودشون خواستن، تو جستجو هستن.</div></div>`) : ``}
  </div>`;
}
async function plusDoSearch(){
  PLUS.search.busy = true; PLUS.search.error = ""; renderAll();
  const { data, error } = await sb.rpc("search_coaches", { p_q: PLUS.search.q || "", p_specialty: PLUS.search.spec || null, p_limit: 30, p_offset: 0 });
  PLUS.search.busy = false;
  if(error) PLUS.search.error = plusRpcError(error);
  else PLUS.search.results = data || [];
  renderAll();
}

/* ---------- پروفایل عمومی مربی ---------- */
async function plusOpenCoach(coachId){
  PLUS.coachProfile = null; PLUS.coachProfileBusy = true; PLUS.requestMsg = "";
  plusGo("coach");
  const { data, error } = await sb.rpc("coach_public_profile", { p_coach: coachId });
  PLUS.coachProfileBusy = false;
  PLUS.coachProfile = error ? { error: plusRpcError(error) } : (data || { error: "این پروفایل در دسترس نیست." });
  renderAll();
}
function renderPlusCoachProfile(){
  const p = PLUS.coachProfile;
  if(PLUS.coachProfileBusy || !p) return `<div class="plus-wrap">${plusHeader("پروفایل مربی")}<div class="card"><div class="note">در حال بارگذاری...</div></div></div>`;
  if(p.error) return `<div class="plus-wrap">${plusHeader("پروفایل مربی")}<div class="card"><div class="note">${plusEsc(p.error)}</div></div></div>`;
  const link = PLUS.coaches.find(c => c.coach_id === p.coach_id);
  const scopeLabel = { iran: "ایرانی", international: "بین‌المللی" };
  const kindLabel = { certification: "مدرک مربیگری", degree: "مدرک دانشگاهی", license: "مجوز", membership: "عضویت", other: "سایر" };
  return `<div class="plus-wrap">${plusHeader("پروفایل مربی")}
    <div class="card" style="text-align:center;">
      <div class="plus-avatar lg">${p.photo_path ? `<img src="${plusEsc(plusAvatarUrl(p.photo_path))}" alt="">` : "🧑‍🏫"}</div>
      <div style="font-weight:900; font-size:calc(17px * var(--font-scale)); margin-top:8px;">${plusEsc(p.display_name)}</div>
      <div class="note">${plusEsc((p.specialties || []).map(x => PLUS_SPECIALTIES[x] || x).join("، "))}${p.city ? ` · ${plusEsc(p.city)}` : ``}</div>
      <div class="plus-stats">
        <div><b>${plusFa(p.active_athletes || 0)}</b><span>شاگرد فعال</span></div>
        <div><b>${plusFa(p.programs_delivered || 0)}</b><span>برنامه‌ی تحویل‌شده</span></div>
        <div><b>${p.years_experience != null ? plusFa(p.years_experience) : "—"}</b><span>سال سابقه</span></div>
      </div>
      <div class="note">این عددها از داده‌ی واقعی پله حساب می‌شن، نه ادعای مربی.</div>
    </div>
    ${p.bio ? `<div class="card"><div style="white-space:pre-wrap; line-height:1.9;">${plusEsc(p.bio)}</div></div>` : ``}
    <div class="section-title">🎓 مدارک بررسی‌شده</div>
    <div class="card">
      ${(p.credentials || []).length ? p.credentials.map(c => `<div class="plus-cred">
        <div style="font-weight:800;">${plusEsc(c.title)} <span class="badge-soft">${scopeLabel[c.scope] || ""}</span></div>
        <div class="note">${plusEsc(kindLabel[c.kind] || "")}${c.issuer ? ` · ${plusEsc(c.issuer)}` : ``}${c.issued_year ? ` · ${plusFa(c.issued_year)}` : ``}</div>
        <div class="note" style="color:var(--gold);">✓ مدرک ارائه‌شده توسط پله بررسی شد</div>
        ${c.public_path ? `<button class="row-mini" onclick="plusViewCredential('${String(c.public_path).replace(/[^A-Za-z0-9/_.-]/g, "")}')">دیدن تصویر مدرک</button>` : ``}
      </div>`).join("") : `<div class="note">مدرکی برای نمایش عمومی ثبت نشده.</div>`}
    </div>
    <div class="card">
      ${link && (link.status === "active" || link.status === "requested" || link.status === "accepted")
        ? `<div class="note" style="text-align:center;">${link.status === "active" ? "به این مربی وصلی ✓" : link.status === "accepted" ? "مربی پذیرفته — از صفحه‌ی اصلی تأیید کن." : "درخواستت فرستاده شده؛ منتظر پاسخ مربی."}</div>`
        : `<textarea id="plus_req_msg" class="mood-text" maxlength="300" placeholder="یه پیام کوتاه برای مربی (اختیاری) — مثلاً هدفت" oninput="PLUS.requestMsg=this.value">${plusEsc(PLUS.requestMsg)}</textarea>
           <button class="btn btn-primary" style="width:100%; margin-top:8px;" onclick="plusRequestLink('${p.coach_id}')">درخواست اتصال</button>`}
      <button class="link-btn" style="width:100%;" onclick="plusReportCoach('${p.coach_id}')">گزارش این مربی</button>
    </div>
  </div>`;
}
async function plusViewCredential(path){
  const { data, error } = await sb.storage.from("coach-credentials-public").createSignedUrl(path, 120);
  if(error || !data){ showToast("تصویر مدرک باز نشد."); return; }
  openOverlay(`<h3>تصویر مدرک</h3><img src="${plusEsc(data.signedUrl)}" alt="مدرک" style="width:100%; border-radius:12px;">
    <div class="note" style="margin-top:8px;">نسخه‌ی پوشانده‌شده — فقط برای نمایش در پله.</div>
    <div class="sheet-actions"><button class="btn btn-ghost" onclick="closeOverlay()">بستن</button></div>`);
}
async function plusRequestLink(coachId){
  const { data, error } = await sb.rpc("athlete_request_link", { p_coach: coachId, p_message: PLUS.requestMsg || "" });
  if(error){ showToast(plusRpcError(error), { ms: 4000 }); return; }
  showToast(data && data.status === "active" ? "به این مربی وصلی." : "درخواست فرستاده شد ✓ — وقتی مربی بپذیره خبرت می‌کنیم.", { ms: 4000 });
  PLUS.requestMsg = "";
  await plusLoad(true);
}
async function plusReportCoach(coachId){
  const reason = prompt("چه مشکلی بود؟ (پشتیبانی پله بررسی می‌کنه)");
  if(!reason || reason.trim().length < 3) return;
  const { error } = await sb.rpc("report_coach", { p_coach: coachId, p_reason: reason.trim() });
  showToast(error ? plusRpcError(error) : "گزارشت ثبت شد. ممنون 🙏", { ms: 3500 });
}

/* ---------- نمایش برنامه (فقط‌خواندنی؛ ثبت تمرین در فاز C) ---------- */
async function plusOpenProgram(id){
  PLUS.program = PLUS.programs.find(p => p.id === id) || { id };
  PLUS.programDays = null;
  plusGo("program");
  plusEnsureBank();
  const { data, error } = await sb.from("program_days")
    .select("id,weekday,day_index,title,sort,program_items(id,exercise_id,sort,sets,reps_min,reps_max,weight_kg,duration_sec,rest_sec,rpe,tempo,note,scheme,superset_group,set_details,distance_m)")
    .eq("program_id", id).order("sort", { ascending: true });
  PLUS.programDays = error ? { error: plusRpcError(error) } : (data || []);
  renderAll();
}
function plusItemDose(it, ex){
  const parts = [];
  const det = Array.isArray(it.set_details) ? it.set_details : [];
  if(exIsCardio(ex)){
    if(it.duration_sec) parts.push(`${plusFa(Math.round(it.duration_sec / 60))} دقیقه`);
    if(it.distance_m) parts.push(exFmtKm(it.distance_m));
    if((it.sets || 1) > 1) parts.push(`${plusFa(it.sets)} نوبت`);
    if(it.rpe) parts.push(`شدت ${plusFa(it.rpe)} از ۱۰`);
    return parts.join(" · ");
  }
  if(it.scheme === "pyramid" && det.length) return `${plusFa(it.sets)} ست هرمی × ${plusFa(it.reps_min || "")} تکرار — وزنه‌ها: ${det.map(d => d.weight_kg != null ? plusFa(d.weight_kg) : "؟").join(" / ")} کیلو${it.rest_sec ? ` · استراحت ${plusFa(it.rest_sec)}ث` : ""}`;
  if(it.scheme === "drop" && det.length) return `دراپ‌ست — تکرارها: ${det.map(d => d.reps != null ? plusFa(d.reps) : "؟").join(" / ")}${it.weight_kg ? ` · شروع با ${plusFa(it.weight_kg)} کیلو` : ""}`;
  const sets = it.sets ? plusFa(it.sets) : "";
  if(it.duration_sec) parts.push(`${sets ? sets + " × " : ""}${plusFa(it.duration_sec)} ثانیه`);
  else if(it.reps_min || it.reps_max){
    const reps = it.reps_max && it.reps_max !== it.reps_min ? `${plusFa(it.reps_min || 0)}–${plusFa(it.reps_max)}` : plusFa(it.reps_min || it.reps_max);
    parts.push(`${sets ? sets + " × " : ""}${reps}`);
  } else if(sets) parts.push(`${sets} ست`);
  if(it.weight_kg) parts.push(`${plusFa(it.weight_kg)} کیلو`);
  if(it.rest_sec) parts.push(`استراحت ${plusFa(it.rest_sec)}ث`);
  if(it.rpe) parts.push(`RPE ${plusFa(it.rpe)}`);
  if(it.scheme && it.scheme !== "straight") parts.push({ pyramid: "هرمی", drop: "دراپ‌ست", superset: "سوپرست" }[it.scheme] || "");
  return parts.filter(Boolean).join(" · ");
}
function renderPlusProgram(){
  const p = PLUS.program || {};
  const days = PLUS.programDays;
  const bank = plusBankMap();
  let body;
  if(!days) body = `<div class="card"><div class="note">در حال بارگذاری...</div></div>`;
  else if(days.error) body = `<div class="card"><div class="note">${plusEsc(days.error)}</div></div>`;
  else body = days.map((d, i) => {
    const items = (d.program_items || []).slice().sort((a, b) => (a.sort || 0) - (b.sort || 0));
    return `<div class="section-title">${d.weekday != null ? PLUS_WEEKDAYS[d.weekday] : `روز ${plusFa(i + 1)}`}${d.title ? ` — ${plusEsc(d.title)}` : ``}</div>
      <div class="card">${items.map((it, k) => {
        const ex = bank[it.exercise_id];
        const ssNext = it.superset_group && items[k + 1] && items[k + 1].superset_group === it.superset_group;
        return `${ssNext ? `<div class="note" style="color:var(--gold); font-weight:800;">🔗 سوپرست — این دو حرکت پشت‌سرهم، بدون استراحت</div>` : ``}<div class="plus-item ${it.superset_group ? "pw-ss" : ""}">
          <div style="font-weight:800;">${ex ? plusEsc(ex.n) : plusEsc(it.exercise_id)}${ex && ex.rk ? ` <span class="badge-warn">⚠️ نیازمند ارزیابی سطح</span>` : ``}</div>
          <div class="note">${plusItemDose(it, ex)}</div>
          ${it.note ? `<div class="note" style="color:var(--gold);">📝 ${plusEsc(it.note)}</div>` : ``}
        </div>`;
      }).join("") || `<div class="note">روز استراحت</div>`}</div>`;
  }).join("");
  return `<div class="plus-wrap">${plusHeader("📋 " + plusEsc(p.title || "برنامه"))}
    ${p.notes ? `<div class="card"><div style="white-space:pre-wrap;">${plusEsc(p.notes)}</div></div>` : ``}
    ${body}
    <div class="note" style="padding:4px;">ثبت تمرین با یه لمس برای هر ست (حتی آفلاین) در به‌روزرسانی بعدی اضافه می‌شه.</div>
  </div>`;
}

function renderPlusLibrary(){
  plusEnsureBank();
  const L = PLUS.lib;
  if(!PLUS_BANK) return `<div class="plus-wrap">${plusHeader("🏋️ بانک حرکات")}<div class="card"><div class="note">در حال بارگذاری بانک حرکات...</div></div></div>`;
  const res = plusSearchExercises(L.q, { core: L.scope === "core" && !L.q, disc: L.disc, equip: L.equip });
  const shown = res.slice(0, L.limit);
  const cats = {};
  (PLUS_BANK.cats || []).forEach(c => { cats[c.id] = c.name; });
  return `<div class="plus-wrap">${plusHeader("🏋️ بانک حرکات")}
    <div class="card plus-lib-filters">
      <input type="search" id="plus_lib_q" class="goal-input" placeholder="مثلاً: بنچ، پرس تخت، bench press، پلانک" value="${plusEsc(L.q)}" oninput="plusLibSearch(this.value)" autocomplete="off">
      <div class="suggest-chips" style="justify-content:flex-start; margin-top:10px;">
        <button type="button" class="suggest-chip ${L.scope === 'core' ? 'on' : ''}" onclick="PLUS.lib.scope='core'; PLUS.lib.limit=40; renderAll();">پرکاربرد</button>
        <button type="button" class="suggest-chip ${L.scope === 'all' ? 'on' : ''}" onclick="PLUS.lib.scope='all'; PLUS.lib.limit=40; renderAll();">همه‌ی حرکات</button>
        <button type="button" class="suggest-chip ${L.disc === 'b' ? 'on' : ''}" onclick="PLUS.lib.disc = PLUS.lib.disc==='b' ? '' : 'b'; renderAll();">بدنسازی</button>
        <button type="button" class="suggest-chip ${L.disc === 'c' ? 'on' : ''}" onclick="PLUS.lib.disc = PLUS.lib.disc==='c' ? '' : 'c'; renderAll();">کلستنیکس</button>
        <button type="button" class="suggest-chip ${L.disc === 'a' ? 'on' : ''}" onclick="PLUS.lib.disc = PLUS.lib.disc==='a' ? '' : 'a'; renderAll();">هوازی</button>
      </div>
      <select class="goal-input" style="margin-top:10px;" onchange="PLUS.lib.equip=this.value; PLUS.lib.limit=40; renderAll();" aria-label="تجهیزات">
        <option value="">همه‌ی تجهیزات</option>
        ${Object.entries(PLUS_EQUIPMENT).map(([k, v]) => `<option value="${k}" ${L.equip === k ? "selected" : ""}>${v}</option>`).join("")}
      </select>
    </div>
    <div class="note" style="padding:0 4px 8px;">${plusFa(res.length)} حرکت${L.scope === "core" && !L.q ? " (پرکاربرد)" : ""}</div>
    <div class="card">
      ${shown.map(e => `<div class="plus-ex">
        <div class="plus-ex-main"><div style="font-weight:800;">${plusEsc(e.n)}</div>
          <div class="note">${e.e ? `<span dir="ltr">${plusEsc(e.e)}</span> · ` : ``}${plusEsc(cats[e.c] || "")}</div></div>
        <div class="plus-ex-tags">
          <span class="badge-soft">${PLUS_LOG_LABEL[e.l] || ""}</span>
          ${e.q ? `<span class="badge-soft">${plusEsc(PLUS_EQUIPMENT[e.q] || e.q)}</span>` : ``}
          ${e.df ? `<span class="badge-soft">${PLUS_DIFFICULTY[e.df]}</span>` : ``}
          ${e.rk ? `<span class="badge-warn">⚠️ نیازمند ارزیابی سطح</span>` : ``}
        </div>
      </div>`).join("") || `<div class="note">چیزی پیدا نشد.</div>`}
      ${res.length > shown.length ? `<button class="btn btn-ghost" style="width:100%; margin-top:8px;" onclick="PLUS.lib.limit += 60; renderAll();">بیشتر (${plusFa(res.length - shown.length)})</button>` : ``}
    </div>
    ${L.q ? `<div class="card" style="text-align:center;"><button class="link-btn" onclick="plusRequestMissing()">حرکتم رو پیدا نکردم — «${plusEsc(L.q)}» رو اضافه کنید</button></div>` : ``}
  </div>`;
}
let _plusLibTimer = null;
function plusLibSearch(v){
  PLUS.lib.q = v;
  PLUS.lib.limit = 40;
  clearTimeout(_plusLibTimer);
  _plusLibTimer = setTimeout(() => {
    renderAll();
    const el = document.getElementById("plus_lib_q");
    if(el){ el.focus(); el.setSelectionRange(el.value.length, el.value.length); }
  }, 160);
}
async function plusRequestMissing(){
  const { data, error } = await sb.rpc("request_missing_exercise", { p_query: PLUS.lib.q });
  showToast(error ? plusRpcError(error) : data ? "ثبت شد — به بانک حرکات اضافه‌ش می‌کنیم 🙏" : "امروز درخواست زیادی ثبت کردی.", { ms: 3500 });
}

function renderPlusPaths(){
  plusEnsureBank();
  if(!PLUS_BANK) return `<div class="plus-wrap">${plusHeader("🧗 مسیرهای پیشرفت")}<div class="card"><div class="note">در حال بارگذاری...</div></div></div>`;
  return `<div class="plus-wrap">${plusHeader("🧗 مسیرهای پیشرفت مهارتی")}
    <div class="note" style="padding:0 4px 10px; line-height:1.9;">این‌ها مسیرهای پیشنهادی‌اند، نه ترتیب اجباری برای همه — قدرت، تحرک مفاصل و کنترل بدن روی ترتیب مناسب اثر می‌ذاره. مربی‌ت می‌تونه مرحله‌ای رو رد کنه یا ترتیب رو عوض کنه.</div>
    ${PLUS_BANK.paths.map(p => `<details class="card plus-path">
      <summary><b>${plusEsc(p.n)}</b> <span class="note" dir="ltr">${plusEsc(p.e || "")}</span></summary>
      <ol>${p.s.map(s => { const ex = PLUS_BANK_MAP[s.x]; return `<li>${plusEsc(s.t || (ex && ex.n) || s.x)}${ex && ex.rk ? ` <span class="badge-warn">⚠️</span>` : ``}</li>`; }).join("")}</ol>
    </details>`).join("")}
  </div>`;
}

/* ---------- لینک دعوت مربی (?coach=CODE) ---------- */
function plusMaybeHandlePendingInvite(){
  let code = "";
  try{ code = localStorage.getItem(PENDING_COACH_KEY) || ""; }catch(e){}
  if(!code || !CLIENT_FLAGS.plus_enabled || !currentUser || !profileReady) return;
  if(needsOnboarding() || needsQuickStart() || qsStep) return; // اول ثبت‌نام و شروع سریع
  try{ localStorage.removeItem(PENDING_COACH_KEY); }catch(e){}
  PLUS.code = code;
  currentTab = "plus";
  PLUS.view = "connect";
  renderAll();
  plusLoad().then(() => plusLookupCode());
}

/* ---------- اعلان «برنامه‌ی جدید» در اندروید (D12 گزینه‌ی الف: sync هنگام باز شدن + Local Notification) ---------- */
async function plusNotifyNewItemsNative(){
  if(!(typeof nnAvailable === "function" && nnAvailable()) || !CLIENT_FLAGS.plus_enabled || !(CLIENT_FLAGS.plus_unread > 0)) return;
  try{
    const { data } = await sb.from("notifications").select("id,kind,payload,created_at").eq("user_id", currentUser.id).is("read_at", null).order("created_at", { ascending: false }).limit(5);
    const seenKey = "pelehPlusNotified_" + currentUser.id;
    const seen = new Set(JSON.parse(localStorage.getItem(seenKey) || "[]"));
    const fresh = (data || []).filter(n => !seen.has(n.id) && (n.kind === "program_published" || n.kind === "link_response"));
    if(!fresh.length) return;
    await Capacitor.Plugins.LocalNotifications.schedule({ notifications: fresh.map((n, i) => ({
      id: 3000 + i, title: "💎 سلامت پلاس", body: plusNotifText(n),
      schedule: { at: new Date(Date.now() + 1500 + i * 1000), allowWhileIdle: true },
      channelId: typeof NN_CHANNEL !== "undefined" ? NN_CHANNEL : undefined, extra: { tab: "plus" },
    })) });
    fresh.forEach(n => seen.add(n.id));
    localStorage.setItem(seenKey, JSON.stringify(Array.from(seen).slice(-50)));
  }catch(e){ /* اختیاری */ }
}
