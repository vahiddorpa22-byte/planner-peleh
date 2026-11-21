/* =====================================================================================
   💎 سلامت پلاس — سمت ورزشکار، فازهای C تا G (همه پشت plus_mode / بتا)
   C  «تمرین امروز»: ثبت بر اساس استثنا (یه لمس برای هر ست طبق برنامه)، «قبلاً: ۶۰ × ۸»، تایمر حرکت‌های زمانی،
      تایمر استراحت، رد/جایگزین/ست اضافه، آفلاین‌اول (localStorage + همگام‌سازی idempotent با log_sets_batch)،
      پایان جلسه با خلاصه و رکوردها، و «روز تمرین = عادت امروز پله» (تیک خودکار).
   D  «پیشرفت من»: شاخص هر حرکت، وضعیت، نمودار.
   E  درخواست برنامه از مربی، قیمت/رایگان، «پرداخت کردم».
   F  رضایت جدا و قابل‌لغو برای تحلیل AI مربی.
   G  خرید/تمدید اشتراک: کارت‌به‌کارت + رسید (تأیید ادمین). فقط وقتی plus_payments_enabled روشنه.
   ===================================================================================== */

const PW_KEY = () => "pelehPlusWorkout_" + (currentUser ? currentUser.id : "x");
const PW_PREF_KEY = "pelehPlusRestTimer";
let PW = null;                 // جلسه‌ی در حال اجرا (همیشه با localStorage هم‌گام)
let PW_SYNC = { busy: false, error: false };
let PW_TIMER = null;           // {itemIdx, setIdx, start} برای حرکت زمانی
let PW_REST = null;            // {until, total}
let PW_TICK = null;
let PLUS_X = { progress: null, progressDetail: null, requests: null, links: null, records: null };

function pwUuid(){ return (crypto && crypto.randomUUID) ? crypto.randomUUID() : "xxxxxxxx-xxxx-4xxx-8xxx-xxxxxxxxxxxx".replace(/x/g, () => (Math.random() * 16 | 0).toString(16)); }
function pwSave(){ try{ if(PW) localStorage.setItem(PW_KEY(), JSON.stringify(PW)); else localStorage.removeItem(PW_KEY()); }catch(e){} }
function pwLoad(){ try{ const s = localStorage.getItem(PW_KEY()); PW = s ? JSON.parse(s) : null; }catch(e){ PW = null; } return PW; }
function pwRestOn(){ try{ return localStorage.getItem(PW_PREF_KEY) !== "off"; }catch(e){ return true; } }
function pwTehranDate(){ return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tehran" }).format(new Date()); }

/* ---------- انتخاب روز و شروع جلسه ---------- */
async function plusOpenTodayWorkout(){
  currentTab = "plus";
  if(pwLoad() && PW.status !== "finished"){ plusGo("workout"); pwFlush(); return; }
  const prog = (PLUS.programs || []).find(p => p.status === "published");
  if(!prog){
    if(!PLUS.status) await plusLoad();
    const p2 = (PLUS.programs || []).find(p => p.status === "published");
    if(!p2){ showToast("هنوز برنامه‌ای از مربی‌ت نرسیده."); plusGo("home"); return; }
  }
  PLUS.workoutPick = null;
  plusGo("workout");
  pwLoadProgramDays();
}
async function pwLoadProgramDays(){
  const prog = (PLUS.programs || []).find(p => p.status === "published");
  if(!prog) return;
  plusEnsureBank();
  const { data, error } = await sb.from("program_days")
    .select("id,weekday,title,sort,program_items(id,exercise_id,sort,sets,reps_min,reps_max,weight_kg,duration_sec,rest_sec,note,scheme,superset_group,set_details,distance_m)")
    .eq("program_id", prog.id).order("sort", { ascending: true });
  if(error){ PLUS.workoutPick = { error: plusRpcError(error) }; renderAll(); return; }
  const days = (data || []).filter(d => (d.program_items || []).length);
  const todayW = DAY_KEYS.indexOf(dayKeyOf(new Date()));
  let lastIdx = -1;
  try{ lastIdx = parseInt(localStorage.getItem("pelehPlusLastDay_" + prog.id) || "-1", 10); }catch(e){}
  const suggested = days.find(d => d.weekday === todayW) || days[(lastIdx + 1) % Math.max(1, days.length)] || days[0];
  PLUS.workoutPick = { program: prog, days, suggested: suggested ? suggested.id : null };
  renderAll();
}
async function pwStart(dayId){
  const pick = PLUS.workoutPick;
  const day = pick && pick.days.find(d => d.id === dayId);
  if(!day) return;
  const items = (day.program_items || []).slice().sort((a, b) => (a.sort || 0) - (b.sort || 0));
  let last = {};
  try{ const r = await sb.rpc("last_sets_for", { p_exercises: items.map(i => i.exercise_id) }); last = r.data || {}; }catch(e){}
  const bank = plusBankMap();
  PW = {
    id: pwUuid(), program_id: pick.program.id, day_id: day.id, day_index: pick.days.indexOf(day),
    day_label: day.weekday != null ? PLUS_WEEKDAYS[day.weekday] : `روز ${toFaDigits(pick.days.indexOf(day) + 1)}`,
    day_title: day.title || "", performed_on: pwTehranDate(), started_at: new Date().toISOString(), status: "in_progress", note: "",
    items: items.map(it => {
      const ex = bank[it.exercise_id] || {};
      const prev = last[it.exercise_id] || [];
      const timeBased = ex.l === "time" || ex.l === "distance_or_time" || (!ex.l && it.duration_sec);
      const cardio = exIsCardio(ex);
      const det = Array.isArray(it.set_details) ? it.set_details : [];
      return { item_id: it.id, exercise_id: it.exercise_id, log_type: ex.l || (timeBased ? "time" : "reps_weight"), note: it.note || "",
        cardio, scheme: it.scheme || "straight", superset_group: it.superset_group || null, target_distance: it.distance_m || null,
        rest_sec: it.rest_sec || (cardio ? 0 : ex.l === "reps_weight" ? 90 : 60), prev,
        sets: Array.from({ length: Math.max(1, it.sets || 1) }, (_, k) => ({
          id: pwUuid(), set_no: k + 1,
          // هرمی: وزنه‌ی هر ست از برنامه؛ دراپ‌ست: تکرار هر ست از برنامه
          reps: timeBased ? null : ((det[k] && det[k].reps != null) ? det[k].reps : (it.reps_min || (prev[k] && prev[k].reps) || 8)),
          weight_kg: timeBased ? null : ((det[k] && det[k].weight_kg != null) ? det[k].weight_kg : (it.weight_kg != null ? it.weight_kg : (prev[k] && prev[k].weight != null ? prev[k].weight : null))),
          duration_sec: timeBased ? (it.duration_sec || (prev[k] && prev[k].sec) || 30) : null,
          distance_m: cardio ? (it.distance_m || null) : null,
          done: false, skipped: false, synced: false })) };
    }),
  };
  try{ PLUS_X.records = (await sb.rpc("athlete_progress_summary", { p_athlete: currentUser.id })).data || []; }catch(e){ PLUS_X.records = []; }
  PW_FOCUS = {};
  pwSave();
  pwFlush(); // جلسه همون لحظه ساخته بشه (برای مربی و ادامه روی دستگاه دیگه)
  renderAll();
}

/* ---------- ثبت ست ---------- */
function pwSet(i, k){ return PW && PW.items[i] && PW.items[i].sets[k]; }
function pwBump(i, k, field, delta){
  const s = pwSet(i, k); if(!s) return;
  if(field === "duration_min"){ s.duration_sec = Math.max(60, Math.min(36000, (s.duration_sec || 0) + delta * 60)); if(s.done) s.synced = false; pwSave(); renderAll(); if(s.done) pwQueueFlush(); return; }
  const step = { reps: 1, weight_kg: 2.5, duration_sec: 5 }[field] || 1;
  let v = (s[field] == null ? 0 : +s[field]) + delta * step;
  const cap = field === "weight_kg" ? PELEH_LIMITS.liftKg : field === "duration_sec" ? 3600 : PELEH_LIMITS.reps;
  if(v > cap){ showToast(field === "weight_kg" ? `حداکثر ${toFaDigits(cap)} کیلو` : `حداکثر ${toFaDigits(cap)}`); }
  v = Math.max(0, Math.min(cap, Math.round(v * 10) / 10));
  s[field] = field === "weight_kg" && v === 0 ? null : v;
  if(s.done) s.synced = false;
  pwSave(); renderAll(); if(s.done) pwQueueFlush();
}
function pwSetDistance(i, k, raw){
  const s = pwSet(i, k); if(!s) return;
  const v = parseFloat(faToEnDigits(String(raw || "")).replace(/[^\d.]/g, ""));
  s.distance_m = isNaN(v) || v <= 0 ? null : Math.round(Math.min(1000, v) * 1000);
  if(s.done) s.synced = false;
  pwSave(); if(s.done) pwQueueFlush();
}
function pwToggleDone(i, k){
  const s = pwSet(i, k); if(!s) return;
  s.done = !s.done; s.skipped = false; s.synced = false;
  if(s.done && typeof PW_FOCUS !== "undefined") delete PW_FOCUS[i];
  pwSave();
  if(s.done){
    if(typeof playCompleteChime === "function") try{ playCompleteChime(); }catch(e){}
    const it = PW.items[i];
    const more = it.sets.some(x => !x.done && !x.skipped) || PW.items.slice(i + 1).some(x => x.sets.some(y => !y.done && !y.skipped));
    const partner = it.superset_group && PW.items[i + 1] && PW.items[i + 1].superset_group === it.superset_group ? PW.items[i + 1] : null;
    if(partner && partner.sets[k] && !partner.sets[k].done){
      showToast(`🔗 بلافاصله: ${plusExName(partner.exercise_id)}`, { ms: 2500 });   // سوپرست: بدون استراحت
    } else if(pwRestOn() && more && (it.rest_sec || 0) > 0) pwStartRest(it.rest_sec || 60);
  }
  renderAll(); pwQueueFlush();
}
function pwAddSet(i){
  const it = PW.items[i]; const lastS = it.sets[it.sets.length - 1] || {};
  it.sets.push({ id: pwUuid(), set_no: it.sets.length + 1, reps: lastS.reps, weight_kg: lastS.weight_kg, duration_sec: lastS.duration_sec, done: false, skipped: false, synced: false, extra: true });
  pwSave(); renderAll();
}
function pwSkipItem(i){
  openOverlay(`<h3>رد کردن حرکت</h3><div class="note" style="margin-bottom:10px;">دلیلش برای مربی‌ت ثبت می‌شه (اختیاری):</div>
    <div class="suggest-chips" style="justify-content:flex-start;">
      ${["درد یا ناراحتی", "دستگاه/وسیله نبود", "خستگی", "وقت نشد", "دلیل دیگه"].map(r => `<button class="suggest-chip" onclick="pwDoSkip(${i}, '${r}')">${r}</button>`).join("")}
    </div><div class="sheet-actions"><button class="btn btn-ghost" onclick="closeOverlay()">انصراف</button></div>`);
}
function pwDoSkip(i, reason){
  PW.items[i].sets.forEach(s => { if(!s.done){ s.skipped = true; s.synced = false; s.skip_reason = reason; } });
  PW.items[i].skipped = true;
  pwSave(); closeOverlay(); renderAll(); pwQueueFlush();
}
function pwSubstitute(i){
  plusEnsureBank();
  PLUS.subFor = i; PLUS.subQ = "";
  pwRenderSubSheet();
}
function pwRenderSubSheet(){
  // حرکت‌های اختصاصی مربی (اگه داره) اول
  const res = plusSearchExercises(PLUS.subQ || "", { core: !PLUS.subQ }).map((e, i) => [e, i]).sort((a, b) => ((b[0].ow ? 1 : 0) - (a[0].ow ? 1 : 0)) || a[1] - b[1]).map(x => x[0]).slice(0, 25);
  const html = `<h3>جایگزین برای «${plusEsc(plusExName(PW.items[PLUS.subFor].exercise_id))}»</h3>
    <input id="pw_sub_q" class="goal-input" placeholder="جستجوی حرکت جایگزین" value="${plusEsc(PLUS.subQ || "")}" oninput="PLUS.subQ=this.value; clearTimeout(window._pwSubT); window._pwSubT=setTimeout(pwRenderSubSheet,160)">
    <div style="max-height:52vh; overflow:auto; margin-top:8px;">${res.map(e => `<div class="plus-row" onclick="pwDoSub('${e.i}')"><span>${plusEsc(e.n)}</span><span class="note">${e.rk ? "⚠️" : ""}</span></div>`).join("")}</div>
    <div class="sheet-actions"><button class="btn btn-ghost" onclick="closeOverlay()">انصراف</button></div>`;
  if(typeof hSheet === "function") hSheet(html); else openOverlay(html);
  const el = document.getElementById("pw_sub_q"); if(el && PLUS.subQ){ el.focus(); el.setSelectionRange(el.value.length, el.value.length); }
}
function pwDoSub(exId){
  const it = PW.items[PLUS.subFor];
  const ex = plusBankMap()[exId] || {};
  it.original_exercise_id = it.original_exercise_id || it.exercise_id;
  it.exercise_id = exId;
  const timeBased = ex.l === "time" || ex.l === "distance_or_time";
  it.log_type = ex.l || it.log_type;
  it.sets.forEach(s => { if(!s.done){ s.synced = false; if(timeBased){ s.duration_sec = s.duration_sec || 30; s.reps = null; s.weight_kg = null; } else { s.reps = s.reps || 8; s.duration_sec = null; } } });
  pwSave(); closeOverlay(); renderAll();
  showToast("حرکت جایگزین شد — برای مربی هم ثبت می‌شه.");
}

/* ---------- تایمرها ---------- */
function pwStartTimer(i, k){ PW_TIMER = { i, k, start: Date.now() }; pwEnsureTick(); renderAll(); }
function pwStopTimer(){
  if(!PW_TIMER) return;
  const s = pwSet(PW_TIMER.i, PW_TIMER.k);
  if(s){ s.duration_sec = Math.max(1, Math.round((Date.now() - PW_TIMER.start) / 1000)); }
  const i = PW_TIMER.i, k = PW_TIMER.k;
  PW_TIMER = null; pwSave();
  pwToggleDone(i, k);
}
function pwStartRest(sec){ PW_REST = { until: Date.now() + sec * 1000, total: sec }; pwEnsureTick(); pwRestNotify(PW_REST.until); }
function pwSkipRest(){ PW_REST = null; pwRestNotify(null); renderAll(); }
// اندروید: اگه صفحه خاموش بشه، تایمر جاوااسکریپت می‌خوابه — پس پایان استراحت با Local Notification هم خبر داده می‌شه
const PW_REST_NOTIF_ID = 3900;
function pwRestNotify(at){
  try{
    if(!(typeof nnAvailable === "function" && nnAvailable())) return;
    const LN = Capacitor.Plugins.LocalNotifications;
    LN.cancel({ notifications: [{ id: PW_REST_NOTIF_ID }] }).catch(() => {});
    if(!at) return;
    LN.schedule({ notifications: [{ id: PW_REST_NOTIF_ID, title: "استراحت تموم شد", body: "ست بعدی — بزن بریم!",
      schedule: { at: new Date(at), allowWhileIdle: true }, channelId: typeof NN_CHANNEL !== "undefined" ? NN_CHANNEL : undefined, extra: { tab: "plus" } }] }).catch(() => {});
  }catch(e){}
}
function pwEnsureTick(){
  if(PW_TICK) return;
  PW_TICK = setInterval(() => {
    if(!PW_TIMER && !PW_REST){ clearInterval(PW_TICK); PW_TICK = null; return; }
    if(PW_REST && Date.now() >= PW_REST.until){
      PW_REST = null;
      try{ if(navigator.vibrate) navigator.vibrate([200, 80, 200]); }catch(e){}
      showToast("استراحت تموم شد — ست بعدی");
    }
    const el = document.getElementById("pw_live");
    if(el){ el.innerHTML = pwLiveHtml(); } else if(currentTab === "plus" && PLUS.view === "workout"){ /* صفحه هنوز رسم نشده */ }
  }, 500);
}
function pwNextUp(){
  if(!PW) return null;
  for(let i = 0; i < PW.items.length; i++){
    const it = PW.items[i];
    const k = it.sets.findIndex(s => !s.done && !s.skipped);
    if(k >= 0) return `${plusExName(it.exercise_id)} — ست ${toFaDigits(k + 1)}`;
  }
  return null;
}
function pwMiniRing(frac, label){
  const r = 23, c = 2 * Math.PI * r;
  return `<div class="pl-ring"><svg width="56" height="56" viewBox="0 0 56 56" aria-hidden="true">
    <circle class="ring-track" cx="28" cy="28" r="${r}" fill="none" stroke-width="5"/>
    <circle class="ring-fill" cx="28" cy="28" r="${r}" fill="none" stroke-width="5" stroke-linecap="round" stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${(c * (1 - Math.max(0, Math.min(1, frac)))).toFixed(1)}" transform="rotate(-90 28 28)" style="transition:none;"/>
  </svg><b>${label}</b></div>`;
}
function pwClock(sec){ sec = Math.max(0, Math.round(sec)); return `${toFaDigits(Math.floor(sec / 60))}:${toFaDigits(String(sec % 60).padStart(2, "0"))}`; }
function pwLiveHtml(){
  if(PW_TIMER){
    const sec = Math.floor((Date.now() - PW_TIMER.start) / 1000);
    return `<div class="pw-live timer" role="timer">${pwMiniRing((sec % 60) / 60, pwClock(sec))}
      <div class="pl-body"><div class="pl-title">در حال اجرا</div><div class="pl-sub">${plusEsc(plusExName(PW.items[PW_TIMER.i].exercise_id))}</div></div>
      <button class="btn btn-primary" onclick="pwStopTimer()">توقف و ثبت</button></div>`;
  }
  if(PW_REST){
    const left = Math.max(0, Math.ceil((PW_REST.until - Date.now()) / 1000));
    const nx = pwNextUp();
    return `<div class="pw-live rest" role="timer" aria-label="استراحت ${toFaDigits(left)} ثانیه">${pwMiniRing(left / PW_REST.total, pwClock(left))}
      <div class="pl-body"><div class="pl-title">استراحت</div>${nx ? `<div class="pl-sub">بعدی: ${plusEsc(nx)}</div>` : ``}</div>
      <button class="btn btn-ghost" onclick="pwSkipRest()">رد کردن</button></div>`;
  }
  return ``;
}

/* ---------- همگام‌سازی آفلاین‌اول ---------- */
let _pwFlushT = null;
function pwQueueFlush(){ clearTimeout(_pwFlushT); _pwFlushT = setTimeout(pwFlush, 700); }
async function pwFlush(){
  if(!PW || PW_SYNC.busy || !sb || !currentUser) return;
  const pending = [];
  PW.items.forEach(it => it.sets.forEach(s => { if((s.done || s.skipped) && !s.synced) pending.push({ it, s }); }));
  if(!pending.length && PW.sessionSynced && PW.status === PW.syncedStatus) return;
  PW_SYNC.busy = true;
  const session = { id: PW.id, program_id: PW.program_id, program_day_id: PW.day_id, performed_on: PW.performed_on, started_at: PW.started_at,
    finished_at: PW.finished_at || null, status: PW.status, note: PW.note || null };
  const sets = pending.map(({ it, s }) => ({ id: s.id, exercise_id: it.exercise_id, program_item_id: it.item_id, set_no: s.set_no,
    reps: s.reps, weight_kg: s.weight_kg, duration_sec: s.duration_sec, distance_m: s.distance_m || null, is_extra: !!s.extra, skipped: !!s.skipped, skip_reason: s.skip_reason || null }));
  try{
    const { error } = await sb.rpc("log_sets_batch", { p_session: session, p_sets: sets });
    if(error) throw error;
    pending.forEach(({ s }) => { s.synced = true; });
    PW.sessionSynced = true; PW.syncedStatus = PW.status;
    PW_SYNC.error = false;
  }catch(e){
    PW_SYNC.error = /اشتراک/.test((e && e.message) || "") ? "plus" : true;
  }
  PW_SYNC.busy = false;
  pwSave();
  const badge = document.getElementById("pw_sync"); if(badge) badge.outerHTML = pwSyncBadge();
  if(PW.status === "finished" && pwAllSynced()) pwAfterFinishSynced();
}
function pwAllSynced(){ return PW && PW.sessionSynced && PW.syncedStatus === PW.status && PW.items.every(it => it.sets.every(s => !(s.done || s.skipped) || s.synced)); }
function pwSyncBadge(){
  if(!PW) return ``;
  const n = PW.items.reduce((a, it) => a + it.sets.filter(s => (s.done || s.skipped) && !s.synced).length, 0);
  if(PW_SYNC.error === "plus") return `<span id="pw_sync" class="badge-warn">اشتراک فعال نیست — ثبت روی سرور انجام نشد</span>`;
  return n || !PW.sessionSynced ? `<span id="pw_sync" class="badge-warn">در انتظار اینترنت${n ? ` (${toFaDigits(n)} ست)` : ""}</span>` : `<span id="pw_sync" class="badge-ok">${pi("check")} ذخیره شد</span>`;
}
window.addEventListener("online", () => { if(pwLoad()) pwFlush(); });

/* ---------- پایان جلسه ---------- */
function pwFinish(){
  const done = PW.items.reduce((a, it) => a + it.sets.filter(s => s.done).length, 0);
  if(!done && !confirm("هنوز هیچ ستی ثبت نکردی. جلسه تموم بشه؟")) return;
  PW.note = ((document.getElementById("pw_note") || {}).value || "").trim().slice(0, 1000);
  PW.status = "finished"; PW.finished_at = new Date().toISOString();
  // رکوردها نسبت به قبل از همین جلسه
  const rec = {}; (PLUS_X.records || []).forEach(r => { rec[r.exercise_id] = r; });
  PW.prs = [];
  let volume = 0;
  PW.items.forEach(it => {
    const sets = it.sets.filter(s => s.done);
    sets.forEach(s => { if(s.weight_kg && s.reps) volume += s.weight_kg * s.reps; });
    if(it.cardio) PW.cardio = (PW.cardio || 0) + sets.reduce((n, s) => n + (s.distance_m || 0), 0);
    const r = rec[it.exercise_id];
    const maxW = Math.max(0, ...sets.map(s => s.weight_kg || 0)), maxR = Math.max(0, ...sets.map(s => s.reps || 0)), maxS = Math.max(0, ...sets.map(s => s.duration_sec || 0));
    if(r){
      if(maxW && maxW > (r.best_weight || 0)) PW.prs.push(`${plusExName(it.exercise_id)}: ${toFaDigits(maxW)} کیلو`);
      else if(!maxW && maxR && maxR > (r.best_reps || 0)) PW.prs.push(`${plusExName(it.exercise_id)}: ${toFaDigits(maxR)} تکرار`);
      else if(maxS && maxS > (r.best_duration || 0)) PW.prs.push(`${plusExName(it.exercise_id)}: ${toFaDigits(maxS)} ثانیه`);
    }
  });
  PW.summary = { sets: done, volume: Math.round(volume), minutes: Math.max(1, Math.round((Date.now() - Date.parse(PW.started_at)) / 60000)) };
  try{ localStorage.setItem("pelehPlusLastDay_" + PW.program_id, String(PW.day_index)); }catch(e){}
  PW_REST = null; PW_TIMER = null; pwRestNotify(null);
  pwTickHabit();
  pwSave(); renderAll(); pwFlush();
  if(PW.prs.length && typeof playBigCelebration === "function") try{ playBigCelebration(); }catch(e){}
}
function pwAfterFinishSynced(){ /* داده‌ی جلسه روی سرور نشست؛ صفحه‌ی خلاصه هنوز از PW خونده می‌شه */ }
function pwCloseSummary(){ PW = null; PW_FOCUS = {}; pwSave(); PLUS.view = "home"; plusRefresh(); }
function pwDiscard(){
  if(!confirm("این جلسه پاک بشه؟ ست‌هایی که قبلاً همگام شدن روی سرور می‌مونن.")) return;
  PW = null; PW_FOCUS = {}; pwSave(); PLUS.view = "home"; renderAll();
}

/* ---------- «روز تمرین = عادت امروز پله» (پیشنهاد شماره‌ی ۱ سند) ---------- */
const PW_HABIT_ID = "plus_workout";
function plusEnsureWorkoutHabit(days){
  if(!DATA || !Array.isArray(DATA.activities)) return;
  DATA.seenTips = DATA.seenTips || {};
  if(DATA.activities.some(a => a.id === PW_HABIT_ID) || DATA.seenTips.plus_workout_habit) return; // اگه خودش پاکش کرده، دوباره نساز
  const wd = Array.from(new Set((days || []).map(d => d.weekday).filter(w => w != null)));
  DATA.activities.push({ id: PW_HABIT_ID, title: "تمرین سلامت پلاس", points: 25, days: wd.length ? wd.map(w => DAY_KEYS[w]) : ["daily"], icon: "🏋️", group: null });
  DATA.seenTips.plus_workout_habit = true;
  save();
}
function pwTickHabit(){
  if(!DATA.activities.some(a => a.id === PW_HABIT_ID)) return;
  const dk = todayKey();
  const list = new Set(DATA.history[dk] || []);
  if(!list.has(PW_HABIT_ID)){ list.add(PW_HABIT_ID); DATA.history[dk] = Array.from(list); trackFunnel("first_checkin"); save(); }
}

/* ---------- رسم «تمرین امروز» ---------- */
function plusExName(id){ const e = plusBankMap()[id]; return e ? e.n : id; }
let PW_FOCUS = {};   // ست انتخاب‌شده برای ویرایش در هر حرکت (پیش‌فرض: اولین ست انجام‌نشده)
function pwFocus(i, k){ PW_FOCUS[i] = k; renderAll(); }
function pwActiveIdx(it, i){
  const f = PW_FOCUS[i];
  if(f != null && it.sets[f] && !it.sets[f].skipped) return f;
  return it.sets.findIndex(s => !s.done && !s.skipped);
}
function renderPlusWorkout(){
  if(!PW || PW.status === "finished" && !PW.summary) pwLoad();
  if(PW && PW.status === "finished") return renderPwSummary();
  if(!PW){
    const pick = PLUS.workoutPick;
    if(!pick) { pwLoadProgramDays(); return `<div class="plus-wrap">${plusHeader("تمرین امروز")}<div class="card"><div class="note">در حال بارگذاری...</div></div></div>`; }
    if(pick.error) return `<div class="plus-wrap">${plusHeader("تمرین امروز")}<div class="card"><div class="note">${plusEsc(pick.error)}</div></div></div>`;
    return `<div class="plus-wrap">${plusHeader("تمرین امروز")}
      <div class="note" style="padding:0 2px 12px;">کدوم روز برنامه رو امروز انجام می‌دی؟</div>
      ${pick.days.map((d, i) => `<div class="card pw-day ${d.id === pick.suggested ? "suggested" : ""}" onclick="pwStart('${d.id}')">
        <div class="row-between"><div style="font-weight:800; font-size:var(--fs-16);">${d.weekday != null ? PLUS_WEEKDAYS[d.weekday] : `روز ${toFaDigits(i + 1)}`}${d.title ? ` · ${plusEsc(d.title)}` : ``}</div>
          ${d.id === pick.suggested ? `<span class="badge-gold">پیشنهاد امروز</span>` : `<span class="chev">${pi("chevL")}</span>`}</div>
        <div class="note" style="margin-top:4px;">${(d.program_items || []).slice(0, 4).map(it => plusEsc(plusExName(it.exercise_id))).join("، ")}${(d.program_items || []).length > 4 ? "، …" : ""}</div>
      </div>`).join("")}
    </div>`;
  }
  pwEnsureTick();
  const doneSets = PW.items.reduce((a, it) => a + it.sets.filter(s => s.done).length, 0), total = PW.items.reduce((a, it) => a + it.sets.length, 0);
  const pct = total ? Math.round(doneSets / total * 100) : 0;
  return `<div class="plus-wrap">
    <div class="pw-head">
      <button class="plus-back" aria-label="بازگشت" onclick="plusBack()">${pi("chevR")}</button>
      <div class="pw-titles"><h2>${plusEsc(PW.day_title || PW.day_label)}</h2><div class="pw-meta">${plusEsc(PW.day_title ? PW.day_label : "تمرین امروز")} · ${toFaDigits(PW.items.length)} حرکت</div></div>
      ${pwSyncBadge()}
    </div>
    <div class="pw-progress">
      <div class="pp-top"><span>پیشرفت جلسه</span><b>${toFaDigits(doneSets)} از ${toFaDigits(total)} ست</b></div>
      <div class="pbar-track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}"><div class="pbar-fill" style="width:${pct}%"></div></div>
    </div>
    <div id="pw_live">${pwLiveHtml()}</div>
    ${PW.items.map((it, i) => renderPwItem(it, i)).join("")}
    <section class="card pw-finish" aria-label="پایان تمرین">
      <label for="pw_note">یادداشت برای مربی (اختیاری)</label>
      <textarea id="pw_note" class="mood-text" maxlength="1000" placeholder="مثلاً: ست آخر سنگین بود">${plusEsc(PW.note || "")}</textarea>
      <label class="pw-pref"><input type="checkbox" ${pwRestOn() ? "checked" : ""} onchange="try{localStorage.setItem('${PW_PREF_KEY}', this.checked?'on':'off')}catch(e){}"> تایمر استراحت خودکار بعد از هر ست</label>
      <button class="btn btn-primary" onclick="pwFinish()">پایان تمرین</button>
      <button class="link-btn" style="width:100%;" onclick="pwDiscard()">لغو این جلسه</button>
    </section>
  </div>`;
}
function pwStepper(i, k, field, label, unit, aria){
  return `<div class="pw-step"><button type="button" aria-label="کم کردن ${aria}" onclick="pwBump(${i},${k},'${field}',-1)">${pi("minus")}</button>
    <span><b style="display:block; line-height:1.2;">${label}</b><small style="display:block; font-size:var(--fs-11); color:var(--muted); font-weight:600; line-height:1.2;">${unit}</small></span>
    <button type="button" aria-label="زیاد کردن ${aria}" onclick="pwBump(${i},${k},'${field}',1)">${pi("plus")}</button></div>`;
}
function renderPwItem(it, i){
  const timeBased = it.log_type === "time" || it.log_type === "distance_or_time";
  const ssNext = it.superset_group && PW.items[i + 1] && PW.items[i + 1].superset_group === it.superset_group;
  const ssPrev = it.superset_group && PW.items[i - 1] && PW.items[i - 1].superset_group === it.superset_group;
  const ex = plusBankMap()[it.exercise_id] || {};
  // batch 2026-11-08: واحد صریح به‌جای «۶۰ × ۸» (نامشخص بود کدوم وزنه‌ست کدوم تکرار)
  const prev = (it.prev || []).map((p, k) => `ست ${toFaDigits(k + 1)}: ${exSetText(p, it.log_type)}`).join(" · ");
  const tag = it.cardio ? "هوازی" : it.scheme === "pyramid" ? "هرمی" : it.scheme === "drop" ? "دراپ‌ست" : "";
  const reps0 = it.sets[0] && it.sets[0].reps;
  const meta = it.cardio ? `هوازی · ${toFaDigits(it.sets.length)} نوبت${it.target_distance ? ` · هدف ${exFmtKm(it.target_distance)}` : ``}`
    : `${toFaDigits(it.sets.length)} ست${!timeBased && reps0 && it.scheme !== "drop" ? ` × ${toFaDigits(reps0)} تکرار` : ``}${(it.rest_sec || 0) > 0 && !ssNext ? ` · استراحت ${toFaDigits(it.rest_sec)} ثانیه` : ``}`;
  const act = it.skipped ? -1 : pwActiveIdx(it, i);
  const setRow = (s, k) => {
    const isAct = k === act;
    const valText = s.skipped ? `<span class="muted">رد شد${s.skip_reason ? ` (${plusEsc(s.skip_reason)})` : ""}</span>`
      : it.cardio ? `<span>${toFaDigits(Math.round((s.duration_sec || 0) / 60))} دقیقه</span>${s.distance_m ? `<span class="muted">${exFmtKm(s.distance_m)}</span>` : ``}`
      : timeBased ? `<span>${toFaDigits(s.duration_sec || 0)} ثانیه</span>`
      : `<span>${toFaDigits(s.reps || 0)} تکرار</span><span class="muted">${s.weight_kg != null ? `${toFaDigits(s.weight_kg)} کیلو` : "بدون وزنه"}</span>`;
    let ctrls = ``;
    if(isAct && !s.skipped){
      ctrls = it.cardio ? `${pwStepper(i, k, "duration_min", toFaDigits(Math.round((s.duration_sec || 0) / 60)), "دقیقه", "دقیقه")}
          <input class="pw-km" inputmode="decimal" placeholder="کیلومتر" value="${s.distance_m ? toFaDigits(Math.round(s.distance_m / 100) / 10) : ""}" onchange="pwSetDistance(${i},${k},this.value)" aria-label="مسافت (کیلومتر)">
          ${!s.done ? `<button class="row-mini" onclick="pwStartTimer(${i},${k})">${pi("play")} تایمر</button>` : ``}`
        : timeBased ? `${pwStepper(i, k, "duration_sec", toFaDigits(s.duration_sec || 0), "ثانیه", "زمان")}
          ${!s.done ? `<button class="row-mini" onclick="pwStartTimer(${i},${k})">${pi("play")} تایمر</button>` : ``}`
        : `${pwStepper(i, k, "reps", toFaDigits(s.reps || 0), "تکرار", "تکرار")}
          ${it.log_type === "reps_weight" || s.weight_kg ? pwStepper(i, k, "weight_kg", s.weight_kg != null ? toFaDigits(s.weight_kg) : "—", "کیلو", "وزنه")
            : `<button class="row-mini" onclick="pwBump(${i},${k},'weight_kg',1)">${pi("plus")} وزنه</button>`}`;
    }
    // روند ۵ (طراحی نهایی): مقدار همین ست در جلسه‌ی قبل، کنار خود ست، با فرق
    const pv = (it.prev || [])[k];
    let pvTxt = ``;
    if(pv && !s.skipped && !it.cardio){
      if(timeBased && pv.sec){ const d = (s.duration_sec || 0) - pv.sec; pvTxt = `قبلاً ${exFaDuration(pv.sec)}${d ? ` · <b class="${d > 0 ? "up" : ""}"><bdi dir="ltr">${d > 0 ? "+" : "−"}${toFaDigits(Math.abs(d))}</bdi> ثانیه</b>` : ``}`; }
      else if(!timeBased){
        const dw = (s.weight_kg || 0) - (pv.weight || 0), dr = (s.reps || 0) - (pv.reps || 0);
        const parts = [];
        if(dw) parts.push(`<b class="${dw > 0 ? "up" : ""}"><bdi dir="ltr">${dw > 0 ? "+" : "−"}${toFaDigits(Math.abs(Math.round(dw * 10) / 10))}</bdi> کیلو</b>`);
        if(dr) parts.push(`<b class="${dr > 0 ? "up" : ""}"><bdi dir="ltr">${dr > 0 ? "+" : "−"}${toFaDigits(Math.abs(dr))}</bdi> تکرار</b>`);
        pvTxt = `قبلاً ${exSetText(pv, it.log_type)}${parts.length ? " · " + parts.join(" ") : ""}`;
      }
    }
    return `<div class="pw-set ${s.done ? "done" : ""} ${s.skipped ? "skipped" : ""} ${isAct ? "active" : ""}">
      <button class="pw-check" aria-pressed="${!!s.done}" aria-label="ست ${toFaDigits(k + 1)} انجام شد" onclick="pwToggleDone(${i},${k})">${s.done ? pi("check") : toFaDigits(k + 1)}</button>
      ${isAct && !s.skipped ? `<div class="pw-ctrls">${ctrls}</div>`
        : `<div class="pw-vals" ${s.skipped ? `` : `onclick="pwFocus(${i},${k})" title="ویرایش این ست"`}>${valText}</div>`}
      ${pvTxt ? `<div class="pw-setprev">${pvTxt}</div>` : ``}
    </div>`;
  };
  return `<section class="card pw-item ${it.skipped ? "skipped" : ""} ${it.superset_group ? "pw-ss" : ""} ${ssNext ? "ss-first" : ssPrev ? "ss-second" : ""}" aria-label="${plusEsc(plusExName(it.exercise_id))}">
    ${ssNext ? `<div class="pw-ss-label">${pi("link")} سوپرست با «${plusEsc(plusExName(PW.items[i + 1].exercise_id))}» — بدون استراحت</div>` : ``}
    <div class="pw-item-head">
      <div style="min-width:0;">
        <h3>${plusEsc(plusExName(it.exercise_id))}${ex.rk ? ` <span class="badge-warn">${pi("alert")} ارزیابی سطح</span>` : ``}</h3>
        <div class="pw-sub">${meta}</div>
        ${it.note ? `<div class="pw-sub" style="color:var(--text);">${pi("note")} ${plusEsc(it.note)}</div>` : ``}
        ${it.original_exercise_id ? `<div class="pw-sub">جایگزینِ ${plusEsc(plusExName(it.original_exercise_id))}</div>` : ``}
      </div>
      ${tag ? `<span class="pw-tag">${tag}</span>` : ``}
    </div>
    <div class="pw-sets">${it.sets.map(setRow).join("")}</div>
    ${!it.skipped ? `<div class="pw-item-actions">
      <span class="pw-prev">${prev ? `جلسه‌ی قبل: ${prev}` : ``}</span>
      <button class="link-btn" onclick="pwAddSet(${i})">${pi("plus")} ست</button>
      <button class="link-btn" onclick="pwSubstitute(${i})">جایگزین</button>
      <button class="link-btn" onclick="pwSkipItem(${i})">رد کردن</button></div>` : ``}
  </section>`;
}
function renderPwSummary(){
  const s = PW.summary || {};
  return `<div class="plus-wrap">${plusHeader("تمرین تموم شد")}
    <div class="card hero-card" style="text-align:center; align-items:stretch;">
      <div style="color:var(--gold); font-size:calc(44px * var(--font-scale)); line-height:1;">${pi("trophy")}</div>
      <div class="plus-stats"><div><b>${toFaDigits(s.sets || 0)}</b><span>ست</span></div>
        <div><b>${toFaDigits((s.volume || 0).toLocaleString("en"))}</b><span>حجم (کیلو)</span></div>
        <div><b>${toFaDigits(s.minutes || 0)}</b><span>دقیقه</span></div></div>
      ${PW.cardio ? `<div class="note">${pi("run")} هوازی: ${exFmtKm(PW.cardio)}</div>` : ``}
      ${(PW.prs || []).length ? `<div class="pw-prs">${pi("medal")} رکورد جدید: ${PW.prs.map(plusEsc).join(" · ")}</div>` : ``}
      <div>${pwSyncBadge()}</div>
      ${DATA.activities.some(a => a.id === PW_HABIT_ID) ? `<div class="note">«تمرین سلامت پلاس» تو صفحه‌ی امروز هم تیک خورد.</div>` : ``}
      <button class="btn btn-primary" style="width:100%;" onclick="pwCloseSummary()">باشه</button>
    </div></div>`;
}

/* ---------- D: پیشرفت من ---------- */
async function plusOpenProgress(){
  PLUS_X.progress = null; PLUS_X.progressDetail = null;
  plusGo("progress"); plusEnsureBank();
  const { data, error } = await sb.rpc("athlete_progress_summary", { p_athlete: currentUser.id });
  PLUS_X.progress = error ? { error: plusRpcError(error) } : (data || []);
  renderAll();
}
async function plusOpenExerciseProgress(exId){
  // batch 2026-11-08: باز/بسته شدن زیر همون ردیف (قبلاً بالای صفحه باز می‌شد) + جلسه‌ها با ست‌های خوانا
  if(PLUS_X.progressDetail && PLUS_X.progressDetail.exercise_id === exId){ PLUS_X.progressDetail = null; renderAll(); return; }
  PLUS_X.progressDetail = { exercise_id: exId, series: null, sessions: null };
  renderAll(); exRevealEl("pp-det");
  const [prog, sessions] = await Promise.all([
    sb.rpc("exercise_progress", { p_athlete: currentUser.id, p_exercise: exId }),
    exLoadSessions(currentUser.id, exId),
  ]);
  if(!PLUS_X.progressDetail || PLUS_X.progressDetail.exercise_id !== exId) return;
  PLUS_X.progressDetail = { exercise_id: exId, series: prog.data || [], sessions };
  renderAll(); exRevealEl("pp-det");
}
function plusProgressDetailPanel(det, logType){
  const sess = det.sessions || (det.series ? exSessionsFromSeries(det.series) : null);
  return `<div class="ex-det" id="pp-det">
    ${det.series ? exLineChartSvg(det.series.map(p => ({ x: exFaDate(p.date), y: p.value })), { label: exMetricLabel(logType) }) : `<div class="note">در حال بارگذاری...</div>`}
    ${det.series ? `<div class="note">${exMetricLabelHtml(logType)}</div>` : ``}
    ${sess ? `<div style="font-weight:800; margin-top:8px;">جلسه‌ها (${toFaDigits(sess.length)})</div>${sess.map(s => exSessionHtml(s, logType)).join("")}
      ${sess.length && sess[0].ordered === false ? `<div class="note">ترتیب ست‌ها در دسترس نبود؛ ست‌ها از بهترین به پایین مرتب شدن.</div>` : ``}` : ``}
    <button class="link-btn" onclick="event.stopPropagation(); PLUS_X.progressDetail=null; renderAll();">بستن</button></div>`;
}
function plusBestLabel(r){
  if(r.log_type === "time" || r.log_type === "distance_or_time") return `${toFaDigits(r.best_duration || 0)} ثانیه`;
  if(r.best_weight) return `${exFaNum(r.best_weight)} کیلو`;
  return `${toFaDigits(r.best_reps || 0)} تکرار`;
}
function renderPlusProgress(){
  const P = PLUS_X.progress;
  if(!P) return `<div class="plus-wrap">${plusHeader("📈 پیشرفت من")}<div class="card"><div class="note">در حال بارگذاری...</div></div></div>`;
  if(P.error) return `<div class="plus-wrap">${plusHeader("📈 پیشرفت من")}<div class="card"><div class="note">${plusEsc(P.error)}</div></div></div>`;
  const det = PLUS_X.progressDetail;
  return `<div class="plus-wrap">${plusHeader("📈 پیشرفت من")}
    <div class="card">${P.length ? P.map(r => { const st = EX_STATUS_FA[r.status] || ["", "gray"]; const open = det && det.exercise_id === r.exercise_id; return `<div class="plus-row ${open ? "ex-row-open" : ""}" role="button" tabindex="0" aria-expanded="${open ? "true" : "false"}" onclick="plusOpenExerciseProgress('${r.exercise_id}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault(); this.click();}">
        <span style="min-width:0;"><b>${plusEsc(plusExName(r.exercise_id))}</b><br><span class="note">بهترین: ${plusBestLabel(r)} · ${toFaDigits(r.sessions)} جلسه</span></span>
        <span class="${st[1] === "green" ? "badge-soft" : st[1] === "red" ? "badge-warn" : "badge-soft"}">${st[0]}</span></div>${open ? plusProgressDetailPanel(det, r.log_type) : ``}`; }).join("")
      : `<div class="note">هنوز تمرینی ثبت نکردی. بعد از چند جلسه، روند هر حرکت اینجا دیده می‌شه.</div>`}</div>
    <div class="note" style="padding:0 4px;">«افت احتمالی» یعنی ارزش بررسی داره، نه حکم — با مربی‌ت هماهنگ کن.</div>
  </div>`;
}

/* ---------- E: درخواست برنامه ---------- */
async function plusLoadRequests(){
  const { data } = await sb.from("program_requests").select("id,coach_id,message,status,is_free,price_toman,quote_note,payment_status,created_at,program_id")
    .eq("athlete_id", currentUser.id).order("created_at", { ascending: false }).limit(20);
  PLUS_X.requests = data || [];
  const links = await sb.from("coach_athlete_links").select("id,ai_consent_at,coach_id,status").eq("athlete_id", currentUser.id);
  PLUS_X.links = links.data || [];
  if(currentTab === "plus") renderAll();
}
async function plusRequestProgram(coachId){
  const msg = prompt("هدفت و شرایطت رو کوتاه بنویس (مثلاً: افزایش حجم، هفته‌ای ۳ روز، باشگاه دارم):");
  if(msg === null) return;
  const { error } = await sb.rpc("request_program", { p_coach: coachId, p_message: msg || "" });
  showToast(error ? plusRpcError(error) : "درخواست فرستاده شد ✓ — مربی قیمت یا «رایگان» رو اعلام می‌کنه.", { ms: 4000 });
  plusLoadRequests();
}
async function plusRequestAction(id, action){
  if(action === "accept"){ const r = (PLUS_X.requests || []).find(x => x.id === id); if(r && !r.is_free && !confirm(`قیمت ${toFaDigits(Number(r.price_toman || 0).toLocaleString("en"))} تومان رو قبول می‌کنی؟ پرداخت مستقیم به مربیه.`)) return; }
  if(action === "cancel" && !confirm("درخواست لغو بشه؟")) return;
  const { error } = await sb.rpc("athlete_request_action", { p_id: id, p_action: action });
  showToast(error ? plusRpcError(error) : "ثبت شد ✓");
  plusLoadRequests();
}
function renderPlusRequestsBlock(){
  if(PLUS_X.requests === null){ plusLoadRequests(); return ``; }
  const open = PLUS_X.requests.filter(r => !["delivered", "declined", "cancelled"].includes(r.status));
  if(!open.length) return ``;
  const label = { requested: "منتظر پاسخ مربی", quoted: "مربی پاسخ داده", accepted: "پذیرفته شده" };
  return `<div class="section-title">📝 درخواست‌های برنامه</div><div class="card">${open.map(r => {
    const coach = PLUS.coaches.find(c => c.coach_id === r.coach_id);
    return `<div class="plus-advice"><div style="font-weight:800;">${plusEsc(coach ? coach.display_name : "مربی")} <span class="badge-soft">${label[r.status] || r.status}</span></div>
      ${r.status === "quoted" ? `<div class="note">${r.is_free ? "رایگان 🎁" : `قیمت: ${toFaDigits(Number(r.price_toman || 0).toLocaleString("en"))} تومان (پرداخت مستقیم به مربی)`}</div>
        ${r.quote_note ? `<div class="plus-advice-body">${plusEsc(r.quote_note)}</div>` : ``}
        <div class="plus-actions"><button class="btn btn-primary" onclick="plusRequestAction('${r.id}','accept')">قبول</button><button class="btn btn-ghost" onclick="plusRequestAction('${r.id}','decline')">نه ممنون</button></div>` : ``}
      ${r.status === "accepted" && !r.is_free && r.payment_status === "unpaid" ? `<button class="btn btn-primary" style="width:100%; margin-top:6px;" onclick="plusRequestAction('${r.id}','mark_paid')">پرداخت کردم</button>` : ``}
      ${r.status === "accepted" && r.payment_status === "paid_by_athlete" ? `<div class="note">منتظر تأیید دریافت توسط مربی</div>` : ``}
      ${r.status === "accepted" && (r.is_free || r.payment_status === "confirmed") ? `<div class="note">مربی در حال آماده‌کردن برنامه‌ته ✓</div>` : ``}
      ${["requested", "quoted"].includes(r.status) ? `<button class="link-btn" onclick="plusRequestAction('${r.id}','cancel')">لغو درخواست</button>` : ``}
    </div>`; }).join("")}</div>`;
}

/* ---------- F: رضایت AI ---------- */
function plusAiConsentRow(c){
  if(!PLUS.status || !PLUS.status.ai_enabled || c.status !== "active") return ``;
  const link = (PLUS_X.links || []).find(l => l.id === c.link_id);
  const on = !!(link && link.ai_consent_at);
  return `<label class="pw-pref" onclick="event.stopPropagation()"><input type="checkbox" ${on ? "checked" : ""} onchange="plusSetAiConsent('${c.link_id}', this.checked)">
    اجازه بده ${plusEsc(c.display_name)} روند تمرین‌هام رو با AI تحلیل کنه <span class="note">(فقط آمار تمرین، بدون اسم و اطلاعات شخصی؛ هر وقت خواستی خاموشش کن)</span></label>`;
}
async function plusSetAiConsent(linkId, on){
  const { error } = await sb.rpc("athlete_set_ai_consent", { p_link: linkId, p_on: !!on });
  showToast(error ? plusRpcError(error) : on ? "اجازه‌ی تحلیل AI داده شد" : "اجازه‌ی تحلیل AI برداشته شد");
  plusLoadRequests();
}

/* ---------- G: اشتراک ----------
   batch 2026-11-08 (تصمیم وحید): سلامت پلاس از ۱ آذر ۱۴۰۵ پولیه.
   • نسخه‌ی کافه‌بازار: کارت خرید همیشه دیده می‌شه (حتی وقتی plus_require_entitlement خاموشه) تا داور بازار و کاربرها
     بتونن بخرن؛ دکمه فقط به plus_bazaar_enabled بستگی داره. فقط پرداخت درون‌برنامه‌ای بازار — هیچ لینک وبی.
   • وب و اندروید مستقیم: زیبال پشت plus_payments_enabled، با همون متن. هیچ UI بازار روی وب نیست.
   • وقتی plus_require_entitlement روشن بشه (۱ آذر)، بدون اشتراک ← همین کارت به‌عنوان پیام اشتراک (paywall).
   PLUS_COUNT_FROM_LAUNCH: فقط وقتی true بمونه که migration «2026-11-08_plus_grant_from_1azar.sql» اجرا شده باشه
   (خرید قبل از ۱ آذر = ۳۰ روز از ۱ آذر). اگه اجرا نشد، false کن تا متن «از همین امروز» نشون داده بشه. */
var PLUS_PAID_FROM = Date.parse("2026-11-22T00:00:00+03:30");   // ۱ آذر ۱۴۰۵، تهران
var PLUS_COUNT_FROM_LAUNCH = true;
function plusPreLaunch(){ return Date.now() < PLUS_PAID_FROM; }
function plusFreeNote(){
  return plusPreLaunch() ? `<div class="note" style="color:var(--gold); margin-bottom:6px;">سلامت پلاس تا ۱ آذر رایگانه؛ از ۱ آذر با اشتراک ماهانه ادامه پیدا می‌کنه.</div>` : ``;
}
function plusDaysNote(days){
  const d = toFaDigits(days || 30);
  return plusPreLaunch() && PLUS_COUNT_FROM_LAUNCH ? `${d} روز دسترسی کامل؛ اگه قبل از ۱ آذر بخری، ${d} روزت از ۱ آذر حساب می‌شه.` : `${d} روز دسترسی کامل، از همین امروز.`;
}
function renderPlusSubscriptionCard(opts){
  opts = opts || {};
  if(typeof PLUS_X !== "undefined" && PLUS_X.showSub) opts.always = true;
  const st = PLUS.status || {};
  const until = st.plus_until ? Date.parse(st.plus_until) : 0;
  const daysLeft = until ? Math.ceil((until - Date.now()) / 86400000) : 0;
  const paidActive = until && until > Date.now();
  const needs = !st.has_plus && st.require_entitlement;
  const soon = st.has_plus && until && daysLeft <= 3;
  const bazaar = plusIsBazaarBuild();
  // کی کارت دیده بشه: بازار همیشه؛ وب وقتی لازمه، رو به اتمامه، از تنظیمات باز شده، یا زیبال روشنه
  if(!bazaar && !needs && !soon && !opts.always && !st.payments_enabled) return ``;
  const status = paidActive ? `<div class="note" style="margin-bottom:6px;">✓ اشتراکت تا ${plusEsc(typeof jalaliDateLabel === "function" ? toFaDigits(jalaliDateLabel(new Date(until))) : new Date(until).toLocaleDateString("fa-IR"))} فعاله${soon ? ` — ${toFaDigits(Math.max(0, daysLeft))} روز مونده` : ``}.</div>` : ``;
  const head = `<div style="font-weight:900; margin-bottom:6px;">${needs ? "💎 برای ادامه‌ی سلامت پلاس، اشتراک لازمه" : "💎 اشتراک سلامت پلاس"}</div>`;
  const wrap = inner => `<div class="card plus-value" id="plus-sub-card">${head}${status}${plusFreeNote()}${inner}</div>`;
  // نسخه‌ی کافه‌بازار: طبق قوانین بازار فقط پرداخت درون‌برنامه‌ای بازار. قیمت رو پنل توسعه‌دهنده‌ی بازار تعیین می‌کنه
  // و صفحه‌ی امن بازار نشونش می‌ده. مدت از پنل ادمین (plus_bazaar_days).
  if(bazaar){
    if(!st.bazaar_enabled) return wrap(`<div class="note">خرید اشتراک سلامت پلاس از کافه‌بازار به‌زودی فعال می‌شه.</div>`);
    return wrap(`<div class="note">${plusDaysNote(st.bazaar_days || 30)} پرداخت از طریق صفحه‌ی امن کافه‌بازار انجام می‌شه و قیمت نهایی همون‌جا نمایش داده می‌شه.</div>
      <button id="plus_bz_btn" class="btn btn-primary" style="display:block; width:100%; margin-top:10px;" onclick="plusPayBazaar()">${paidActive ? "تمدید اشتراک از کافه‌بازار" : "خرید اشتراک ماهانه از کافه‌بازار"}</button>
      <div class="note" id="plus_bz_err" style="margin-top:6px; color:var(--bad, #e5484d);"></div>`);
  }
  if(!st.payments_enabled){
    if(needs) return wrap(`<div class="note">✓ برنامه‌ی شخصی از مربی واقعی<br>✓ ثبت تمرین با کمترین لمس، حتی آفلاین<br>✓ مربی روند هر حرکتت رو جدا می‌بینه</div>
      <div class="note" style="margin-top:8px; color:var(--gold);">پرداخت آنلاین به‌زودی فعال می‌شه؛ تا اون موقع اشتراک رو پشتیبانی فعال می‌کنه.</div>`);
    return opts.always ? wrap(`<div class="note">خرید آنلاین اشتراک به‌زودی همین‌جا فعال می‌شه.</div>`) : ``;
  }
  if(st.pending_payment) return wrap(`<div class="note">⏳ رسید پرداختت در حال بررسیه؛ بعد از تأیید، اشتراک خودکار فعال می‌شه.</div>`);
  // وب و اندروید مستقیم: درگاه اختصاصی زیبال سلامت پلاس؛ قیمت و مدت از پنل ادمین پله
  return wrap(`<div class="note">${plusDaysNote(st.plan_days || 30)} قیمت: ${toFaDigits(Number(st.price_toman || 0).toLocaleString("en"))} تومان. با تمدید، همه‌چیز از همون نقطه ادامه پیدا می‌کنه.</div>
    <button id="plus_pay_btn" class="btn btn-primary" style="display:block; width:100%; margin-top:10px;" onclick="plusPayOnline()">پرداخت آنلاین و فعال‌سازی</button>
    <div class="note" id="plus_pay_err" style="margin-top:6px; color:var(--bad, #e5484d);"></div>
    ${st.payment_note ? `<details style="margin-top:8px;"><summary class="note" style="cursor:pointer;">پرداخت کارت‌به‌کارت</summary>
      <div class="plus-advice-body" style="margin-top:8px;">${plusEsc(st.payment_note)}</div>
      <label class="btn btn-ghost" style="display:block; text-align:center; margin-top:8px; cursor:pointer;">📎 آپلود رسید پرداخت
        <input type="file" accept="image/*" style="display:none" onchange="plusUploadReceipt(this)"></label></details>` : ``}`);
}
// «تنظیمات ← اشتراک ← اشتراک سلامت پلاس»: صفحه‌ی سلامت پلاس رو باز می‌کنه و کارت اشتراک رو میاره تو دید
function plusOpenSubscription(){
  if(typeof CLIENT_FLAGS !== "undefined" && !CLIENT_FLAGS.plus_enabled){ showToast("سلامت پلاس هنوز برای حسابت فعال نشده."); return; }
  PLUS.view = "home";
  PLUS_X.showSub = true;
  switchTab("plus");
  let n = 0;
  const go = () => {
    const el = document.getElementById("plus-sub-card");
    if(el){ try{ el.scrollIntoView({ behavior: "smooth", block: "center" }); }catch(e){ el.scrollIntoView(); } return; }
    if(++n < 40) setTimeout(go, 150);
  };
  setTimeout(go, 150);
}
/* ---------- پرداخت آنلاین سلامت پلاس (زیبال) — فقط نسخه‌ی اندروید مستقیم ---------- */
let PLUS_CHANNEL = "";
// نسخه‌ی بازار حتی قبل از اینکه کانال نصب تشخیص داده بشه، هیچ‌وقت درگاه زیبال نشون نده
function plusIsBazaarBuild(){ return PLUS_CHANNEL === "bazaar" || String(window.PELEH_STORE || "").toLowerCase() === "bazaar"; }
(function(){
  try{
    if(typeof getStoreChannel !== "function") return;
    getStoreChannel().then(c => {
      PLUS_CHANNEL = c || "";
      try{ if(PLUS_CHANNEL && typeof cloudReady !== "undefined" && cloudReady && typeof renderAll === "function" && currentTab === "plus") renderAll(); }catch(e){}
    }).catch(() => {});
  }catch(e){}
})();
async function plusPayOnline(){
  const btn = document.getElementById("plus_pay_btn");
  const err = document.getElementById("plus_pay_err");
  if(err) err.textContent = "";
  if(btn){ btn.disabled = true; btn.textContent = "در حال اتصال به درگاه..."; }
  try{
    const { data, error } = await invokeEdge("plus-request-payment", { body: { platform: (typeof isNativeApp === "function" && isNativeApp()) ? "native" : "web" } });
    if(error || !data || !data.paymentUrl){
      if(err) err.textContent = (data && data.error) || "اتصال به درگاه ناموفق بود — دوباره امتحان کن.";
      if(btn){ btn.disabled = false; btn.textContent = "پرداخت آنلاین و فعال‌سازی"; }
      return;
    }
    // مثل پرداخت Premium: اول از دامنه‌ی واقعی رد می‌شیم تا زیبال Referrer معتبر ببینه
    location.href = "https://app.pelehapp.ir/pay-redirect.html?url=" + encodeURIComponent(data.paymentUrl);
  }catch(e){
    if(err) err.textContent = "مشکل در اتصال — دوباره امتحان کن.";
    if(btn){ btn.disabled = false; btn.textContent = "پرداخت آنلاین و فعال‌سازی"; }
  }
}
/* ---------- خرید سلامت پلاس از کافه‌بازار (Poolakey) ---------- */
async function plusPayBazaar(){
  const btn = document.getElementById("plus_bz_btn"), err = document.getElementById("plus_bz_err");
  const reset = () => { if(btn){ btn.disabled = false; btn.textContent = "خرید از کافه‌بازار"; } };
  if(err) err.textContent = "";
  const poolakey = typeof _getPoolakey === "function" ? _getPoolakey() : null;
  if(!poolakey){ if(err) err.textContent = "پرداخت بازار در این نسخه در دسترس نیست — برنامه رو از کافه‌بازار به‌روز کن."; return; }
  if(btn){ btn.disabled = true; btn.textContent = "در حال اتصال به بازار..."; }
  let purchase = null;
  try{
    await poolakey.connectPayment({ rsaPublicKey: BAZAAR_RSA_PUBLIC_KEY });
    try{ purchase = await poolakey.purchaseProduct({ productId: PLUS_BAZAAR_PRODUCT }); }
    finally{ try{ await poolakey.disconnectPayment(); }catch(_e){} }
  }catch(e){
    const msg = String((e && e.message) || "").toLowerCase();
    if(msg.includes("cancel")){ reset(); return; }
    if(btn) btn.textContent = "در حال بررسی خریدهای قبلی...";
    const recovered = typeof recoverBazaarPurchases === "function" ? await recoverBazaarPurchases() : false;
    if(recovered){ await plusRefresh(); showToast("خرید قبلی‌ت پیدا شد و اشتراک فعال شد ✓", { ms: 4000 }); return; }
    if(err) err.textContent = msg.includes("connection") || msg.includes("bazaar") ? "اتصال به کافه‌بازار برقرار نشد — مطمئن شو بازار نصب و به‌روزه." : "پرداخت ناموفق بود — دوباره امتحان کن.";
    reset(); return;
  }
  if(!purchase || !purchase.purchaseToken){ if(err) err.textContent = "پاسخی از بازار دریافت نشد — دوباره امتحان کن."; reset(); return; }
  _rememberPendingPurchase(purchase);
  if(btn) btn.textContent = "در حال فعال‌سازی...";
  const r = await _verifyBazaarPurchaseOnServer(purchase);
  if(!r.ok){ if(err) err.textContent = (r.message || "تایید خرید ناموفق بود.") + " خریدت ذخیره شده و دوباره بررسی می‌شه."; reset(); return; }
  _markTokenVerified(purchase.purchaseToken);
  try{
    await poolakey.connectPayment({ rsaPublicKey: BAZAAR_RSA_PUBLIC_KEY });
    if(await _consumeBazaarPurchase(poolakey, purchase.purchaseToken)) _forgetPendingPurchase(purchase.purchaseToken);
  }catch(e){} finally{ try{ await poolakey.disconnectPayment(); }catch(_e){} }
  await plusRefresh();
  showToast("اشتراک سلامت پلاس فعال شد 🎉", { ms: 4000 });
}
// بعد از برگشت از درگاه صدا زده می‌شه (از handleZibalReturnIfAny). true = این تراکنش مال سلامت پلاس بود و رسیدگی شد.
async function plusVerifyZibal(trackId){
  try{
    const { data, error } = await invokeEdge("plus-verify-payment", { body: { trackId } });
    if(!error && data && data.success){
      try{ if(typeof plusRefresh === "function") await plusRefresh(); }catch(e){}
      alert("پرداخت انجام شد و اشتراک سلامت پلاس فعال شد.");
      return true;
    }
    if(data && data.notFound) return false;
    alert((data && data.error) || ("پرداخت تایید نشد. اگه مبلغ از حسابت کم شده، با پشتیبانی در میون بذار (کد پیگیری: " + trackId + ")."));
    return true;
  }catch(e){
    alert("مشکلی در تایید پرداخت پیش اومد. اگه مبلغ از حسابت کم شده، با پشتیبانی در میون بذار (کد پیگیری: " + trackId + ").");
    return true;
  }
}
async function plusUploadReceipt(input){
  const file = input.files && input.files[0];
  if(!file) return;
  try{
    showToast("در حال آپلود رسید...", { ms: 8000 });
    let blob = file;
    if(typeof normalizeImageFile === "function"){ try{ blob = await normalizeImageFile(file); }catch(e){} }
    const path = `${currentUser.id}/plus-${Date.now()}.jpg`;
    const up = await sb.storage.from("receipts").upload(path, blob, { contentType: blob.type || "image/jpeg", upsert: false });
    if(up.error) throw up.error;
    const { error } = await sb.rpc("plus_request_payment", { p_receipt_path: path });
    if(error) throw error;
    showToast("رسید ثبت شد ✓ — بعد از بررسی، اشتراک فعال می‌شه.", { ms: 4500 });
    plusRefresh();
  }catch(e){ showToast(plusRpcError(e, "آپلود رسید انجام نشد."), { ms: 4500 }); }
}

/* ---------- عکس‌های پیشرفت بدن (v2.4.0) ----------
   ورزشکار آخر هر دوره‌ی تمرین (یا هر وقت خواست) عکس می‌ذاره و مربی‌ای که خودش انتخاب می‌کنه می‌بینه.
   • فقط خود ورزشکار و همون مربی (تا وقتی وصلن) — RLS + باکت خصوصی body-photos (024)؛ مربی با لینک موقت می‌بینه
   • عکس قبل از آپلود کوچیک و دوباره ذخیره می‌شه، پس اطلاعات اضافه‌ی فایل (مثل مکان GPS) پاک می‌شه
   • ورزشکار هر وقت بخواد حذف می‌کنه؛ با قطع اتصال، مربی فوراً دسترسی نداره */
const PPH = { list: null, urls: {}, busy: false, pose: "front", label: "", coach: "", note: "" };
const PPH_POSE_FA = { front: "از جلو", side: "از بغل", back: "از پشت", other: "سایر" };
function pphCurrentProgram(){ return (PLUS.programs || []).find(p => p.status === "published") || null; }
function pphDefaultLabel(){
  const p = pphCurrentProgram();
  return p ? `پایان «${p.title}» — نسخه‌ی ${toFaDigits(p.version)}` : `عکس ${jalaliDateLabel(new Date())}`;
}
// «دوره تموم شد؟»: برنامه‌ی فعلی ۲۸ روز یا بیشتر منتشر شده و از اون موقع عکسی نذاشتی
function pphPeriodDue(){
  const p = pphCurrentProgram();
  if(!p || !p.published_at || !PPH.list) return false;
  const since = Date.parse(p.published_at);
  if(Date.now() - since < 28 * 86400000) return false;
  return !PPH.list.some(x => Date.parse(x.created_at) >= since + 21 * 86400000);
}
async function pphLoad(force){
  if(!sb || !currentUser || (PPH.list && !force) || PPH.loading) return;
  PPH.loading = true;
  try{
    const { data, error } = await sb.from("body_photos").select("id,coach_id,program_id,period_label,pose,taken_on,path,note,created_at")
      .eq("athlete_id", currentUser.id).order("taken_on", { ascending: false }).limit(120);
    PPH.list = error ? [] : (data || []);
    const need = PPH.list.map(x => x.path).filter(pth => !PPH.urls[pth]);
    if(need.length){
      const r = await sb.storage.from("body-photos").createSignedUrls(need, 1800);
      ((r && r.data) || []).forEach(x => { if(x && x.signedUrl) PPH.urls[x.path] = x.signedUrl; });
    }
  }catch(e){ PPH.list = PPH.list || []; }
  PPH.loading = false;
  if(currentTab === "plus") renderAll();
}
function plusPhotosCard(){
  if(PPH.list === null) setTimeout(() => pphLoad(), 0);
  const n = (PPH.list || []).length, due = pphPeriodDue();
  return `<div class="section-title">📸 عکس‌های پیشرفت</div>
    <div class="card ${due ? "plus-program-card" : ""}" onclick="plusGo('photos')" style="cursor:pointer;">
      ${due ? `<div style="font-weight:900; margin-bottom:4px;">دوره‌ی تمرینت تموم شد؟ 🎯</div><div class="note">یه عکس پیشرفت بفرست تا مربی‌ت تغییرت رو با شروع دوره مقایسه کنه.</div>`
        : `<div class="note">${n ? `${toFaDigits(n)} عکس — آخرین: ${plusEsc(jalaliDateLabel(new Date(PPH.list[0].taken_on + "T12:00:00")))}` : "آخر هر دوره‌ی تمرین یه عکس بذار تا تغییرت دیده بشه."}</div>`}
      <div class="note" style="margin-top:4px;">🔒 فقط خودت و مربی‌ای که انتخاب می‌کنی می‌بینید.</div>
    </div>`;
}
function renderPlusPhotos(){
  if(PPH.list === null) setTimeout(() => pphLoad(), 0);
  const active = (PLUS.coaches || []).filter(c => c.status === "active");
  const cur = pphCurrentProgram();
  if(!PPH.coach || !active.some(c => c.coach_id === PPH.coach)) PPH.coach = (cur && active.some(c => c.coach_id === cur.coach_id)) ? cur.coach_id : (active[0] ? active[0].coach_id : "");
  if(!PPH.label) PPH.label = pphDefaultLabel();
  const groups = {};
  (PPH.list || []).forEach(x => { const k = x.period_label || x.taken_on; (groups[k] = groups[k] || []).push(x); });
  const coachName = id => { const c = active.find(x => x.coach_id === id) || (PLUS.coaches || []).find(x => x.coach_id === id); return c ? c.display_name : ""; };
  return `<div class="plus-wrap">${plusHeader("📸 عکس‌های پیشرفت")}
    <div class="card">
      <div style="font-weight:800; margin-bottom:6px;">عکس جدید</div>
      <div class="note" style="margin-bottom:8px;">🔒 فقط خودت و مربی‌ای که پایین انتخاب می‌کنی می‌بینید (مربی فقط تا وقتی بهش وصلی). هر وقت خواستی حذفش کن.</div>
      ${active.length > 1 ? `<div class="field"><label>کدوم مربی ببینه؟</label><div class="suggest-chips">${active.map(c => `<button type="button" class="suggest-chip ${PPH.coach === c.coach_id ? "on" : ""}" onclick="PPH.coach='${plusEsc(c.coach_id)}'; renderAll();">${plusEsc(c.display_name)}</button>`).join("")}</div></div>`
        : active.length ? `<div class="note" style="margin-bottom:8px;">${plusEsc(active[0].display_name)} می‌بینه.</div>` : `<div class="note" style="margin-bottom:8px;">الان به مربی‌ای وصل نیستی؛ عکس فقط برای خودت ذخیره می‌شه.</div>`}
      <div class="field"><label for="pph_label">برای کدوم دوره؟</label><input id="pph_label" class="goal-input" maxlength="80" value="${plusEsc(PPH.label)}" oninput="PPH.label=this.value"></div>
      <div class="field"><label>زاویه</label><div class="suggest-chips">${Object.keys(PPH_POSE_FA).map(k => `<button type="button" class="suggest-chip ${PPH.pose === k ? "on" : ""}" aria-pressed="${PPH.pose === k}" onclick="PPH.pose='${k}'; renderAll();">${PPH_POSE_FA[k]}</button>`).join("")}</div></div>
      <div class="field"><label for="pph_note">یادداشت (اختیاری)</label><input id="pph_note" class="goal-input" maxlength="300" value="${plusEsc(PPH.note)}" oninput="PPH.note=this.value" placeholder="مثلاً: صبح، ناشتا"></div>
      <label class="btn btn-primary" style="display:block; text-align:center; cursor:pointer; ${PPH.busy ? "opacity:.6; pointer-events:none;" : ""}">${PPH.busy ? "در حال آپلود..." : "📷 انتخاب یا گرفتن عکس"}
        <input type="file" accept="image/*" style="display:none" onchange="pphUpload(this)"></label>
    </div>
    ${PPH.list === null ? `<div class="card"><div class="note">در حال بارگذاری...</div></div>` : !PPH.list.length ? `<div class="card"><div class="note">هنوز عکسی نذاشتی.</div></div>`
      : Object.keys(groups).map(k => `<div class="section-title">${plusEsc(k)}</div><div class="card">
        <div style="display:grid; grid-template-columns:repeat(3, minmax(0, 1fr)); gap:8px;">${groups[k].map(x => `<div>
          ${PPH.urls[x.path] ? `<img src="${plusEsc(PPH.urls[x.path])}" alt="عکس ${plusEsc(PPH_POSE_FA[x.pose] || "")}" style="width:100%; aspect-ratio:3/4; object-fit:cover; border-radius:12px;" loading="lazy" referrerpolicy="no-referrer">` : `<div class="note">…</div>`}
          <div class="note" style="font-size:var(--fs-11, 11px);">${plusEsc(PPH_POSE_FA[x.pose] || "")}${x.coach_id ? ` · ${plusEsc(coachName(x.coach_id))}` : " · فقط من"}</div>
          <button class="link-btn" style="padding:0; min-height:0; color:var(--danger);" onclick="pphDelete('${plusEsc(x.id)}')">حذف</button></div>`).join("")}</div>
        ${groups[k].some(x => x.note) ? `<div class="note" style="margin-top:6px;">${groups[k].filter(x => x.note).map(x => plusEsc(x.note)).join(" · ")}</div>` : ``}</div>`).join("")}
  </div>`;
}
function pphDataUrlToBlob(dataUrl){
  const [head, b64] = String(dataUrl).split(",");
  const bin = atob(b64), arr = new Uint8Array(bin.length);
  for(let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: (head.match(/data:([^;]+)/) || [])[1] || "image/jpeg" });
}
async function pphUpload(input){
  const file = input.files && input.files[0];
  input.value = "";
  if(!file || PPH.busy) return;
  if(file.size > 25 * 1024 * 1024){ showToast("این عکس خیلی بزرگه."); return; }
  PPH.busy = true; renderAll();
  try{
    let blob = file;
    if(typeof normalizeImageFile === "function") blob = await normalizeImageFile(file);
    // کوچیک کردن + بازنویسی (اطلاعات مکان و EXIF پاک می‌شه)
    blob = pphDataUrlToBlob(await blobToResizedDataUrl(blob, 1280, 0.82));
    const id = (crypto.randomUUID ? crypto.randomUUID() : (Date.now() + "-" + Math.random().toString(16).slice(2)));
    const path = `${currentUser.id}/${id}.jpg`;
    const up = await sb.storage.from("body-photos").upload(path, blob, { contentType: "image/jpeg", upsert: false });
    if(up.error) throw up.error;
    const cur = pphCurrentProgram();
    const row = { athlete_id: currentUser.id, coach_id: PPH.coach || null, program_id: cur && cur.coach_id === PPH.coach ? cur.id : null,
      period_label: (PPH.label || "").trim().slice(0, 80), pose: PPH.pose, path, note: (PPH.note || "").trim().slice(0, 300) || null };
    const ins = await sb.from("body_photos").insert(row);
    if(ins.error){ await sb.storage.from("body-photos").remove([path]); throw ins.error; }
    PPH.note = "";
    showToast(PPH.coach ? "عکس ذخیره شد ✓ — مربی‌ت هم می‌بینه." : "عکس ذخیره شد ✓", { ms: 3500 });
    await pphLoad(true);
  }catch(e){
    showToast(plusRpcError(e, "آپلود عکس انجام نشد — دوباره امتحان کن."), { ms: 4500 });
  }
  PPH.busy = false; renderAll();
}
async function pphDelete(id){
  const x = (PPH.list || []).find(r => r.id === id);
  if(!x || !confirm("این عکس برای همیشه حذف بشه؟ (برای مربی هم دیگه نمایش داده نمی‌شه)")) return;
  const del = await sb.from("body_photos").delete().eq("id", id).eq("athlete_id", currentUser.id);
  if(del.error){ showToast(plusRpcError(del.error)); return; }
  await sb.storage.from("body-photos").remove([x.path]);
  PPH.list = PPH.list.filter(r => r.id !== id);
  delete PPH.urls[x.path];
  renderAll();
}
