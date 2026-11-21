/* =====================================================================================
   پنل مربی — فازهای C تا G (همه پشت plus_mode / بتا)
   C  شروع برنامه از قالب (آماده / قالب‌های من / کپی از برنامه‌ی دیگه) + «ورود سریع متنی» + ذخیره به‌عنوان قالب
   D  داشبورد «چه کسی نیاز به توجه داره»، پیشرفت هر حرکت با نمودار، خانواده‌های کلستنیکس، مسیرهای پیشرفت مهارتی
   E  درخواست‌های برنامه: قیمت یا رایگان (پرداخت مستقیم، بدون کارمزد)، تأیید دریافت، تحویل
   F  «تحلیل با AI» (Edge Function coach-ai): پیش‌نویس تغییرات، تأیید تک‌تک، اعمال در نسخه‌ی جدید
   ===================================================================================== */
let CX = { dash: null, requests: [], body: null, photos: null, photoUrls: {}, progress: null, family: null, skills: null, detail: null, ai: null, aiBusy: false };

const ATTENTION_FA = { no_program: ["بدون برنامه", "gray"], no_logs: ["تمرین ثبت‌نشده", "gray"], inactive: ["افت استمرار", "red"], decline: ["افت احتمالی", "red"] };
const REQ_FA = { requested: "درخواست جدید", quoted: "قیمت اعلام شد", accepted: "پذیرفته شد", delivered: "تحویل شد", declined: "رد شد", cancelled: "لغو شد" };

async function cxLoadHome(){
  const [d, r] = await Promise.all([
    sb.rpc("coach_dashboard"),
    sb.from("program_requests").select("id,athlete_id,message,status,is_free,price_toman,quote_note,payment_status,created_at,program_id")
      .eq("coach_id", C.user.id).order("created_at", { ascending: false }).limit(50),
  ]);
  CX.dash = d.data || [];
  CX.requests = r.data || [];
}
function cxAttention(athleteId){
  const d = (CX.dash || []).find(x => x.athlete_id === athleteId);
  if(!d) return ``;
  const a = ATTENTION_FA[d.attention];
  return a ? `<span class="c-badge ${a[1]}">${a[0]}</span>` : `<span class="c-badge green">فعال${d.improving ? ` · ${fa(d.improving)} بهبود` : ""}</span>`;
}
function cxNeedsAttentionBlock(){
  const list = (CX.dash || []).filter(d => d.attention);
  if(!list.length) return ``;
  return `<div class="c-h">⚠️ نیاز به توجه (${fa(list.length)})</div><div class="c-card">${list.map(d => `<div class="c-list-row click" onclick="openAthlete('${d.link_id}')">
    <div class="grow"><div class="c-name">${esc(d.athlete_name)}</div><div class="c-note">${d.last_session ? `آخرین تمرین: ${esc(faDate(d.last_session))}` : "هنوز تمرینی ثبت نکرده"}${d.declines ? ` · ${fa(d.declines)} حرکت با افت احتمالی` : ""}</div></div>
    ${cxAttention(d.athlete_id)}</div>`).join("")}</div>`;
}

/* ---------- E: درخواست‌های برنامه ---------- */
function cxRequestsBlock(){
  const open = (CX.requests || []).filter(r => ["requested", "quoted", "accepted"].includes(r.status));
  if(!open.length) return ``;
  const name = id => { const a = C.athletes.find(x => x.athlete_id === id); return a ? a.athlete_name : "شاگرد"; };
  return `<div class="c-h">📝 درخواست‌های برنامه (${fa(open.length)})</div><div class="c-card">${open.map(r => `<div class="c-cred">
    <div style="display:flex; justify-content:space-between; gap:8px;"><div class="c-name">${esc(name(r.athlete_id))}</div><span class="c-badge">${REQ_FA[r.status]}</span></div>
    ${r.message ? `<div class="c-note" style="white-space:pre-wrap;">«${esc(r.message)}»</div>` : ``}
    ${r.status !== "requested" ? `<div class="c-note">${r.is_free ? "رایگان" : `${fa(Number(r.price_toman || 0).toLocaleString("en"))} تومان · ${{ unpaid: "پرداخت نشده", paid_by_athlete: "شاگرد گفته پرداخت کرده", confirmed: "دریافت تأیید شد" }[r.payment_status] || ""}`}</div>` : ``}
    <div class="c-row-btns" style="margin-top:6px;">
      ${["requested", "quoted"].includes(r.status) ? `<button class="c-btn primary" onclick="cxQuote('${r.id}')">${r.status === "requested" ? "اعلام قیمت / رایگان" : "ویرایش قیمت"}</button>
        <button class="c-btn ghost" onclick="cxReqAction('${r.id}','decline')">رد</button>` : ``}
      ${r.status === "accepted" && !r.is_free && r.payment_status !== "confirmed" ? `<button class="c-btn primary" onclick="cxReqAction('${r.id}','confirm_payment')">پرداخت رو دریافت کردم</button>` : ``}
      ${r.status === "accepted" && (r.is_free || r.payment_status === "confirmed") ? `<button class="c-btn primary" onclick="cxDeliver('${r.id}','${r.athlete_id}')">تحویل برنامه</button>` : ``}
    </div></div>`).join("")}
    <div class="c-note" style="margin-top:6px;">پرداخت مستقیم بین تو و شاگرده (مثلاً کارت‌به‌کارت)؛ پله فقط وضعیت رو ثبت می‌کنه و کارمزدی برنمی‌داره.</div></div>`;
}
function cxQuote(id){
  openSheet(`<h3>پاسخ به درخواست برنامه</h3>
    <label class="c-check"><input type="checkbox" id="q_free" onchange="document.getElementById('q_price_wrap').style.display=this.checked?'none':'block'"> رایگان</label>
    <div id="q_price_wrap" class="c-field"><label>قیمت (تومان)</label><input id="q_price" class="c-input" inputmode="numeric" placeholder="مثلاً 300000"></div>
    <div class="c-field"><label>توضیح برای شاگرد (روش پرداخت، زمان تحویل، …)</label><textarea id="q_note" class="c-input" maxlength="600" placeholder="مثلاً: کارت‌به‌کارت به … — برنامه ۲ روز بعد از پرداخت آماده‌ست"></textarea></div>
    <div class="c-err" id="q_err"></div>
    <div class="c-row-btns"><button class="c-btn ghost" onclick="cCloseSheet()">انصراف</button><button class="c-btn primary" onclick="cxSendQuote('${id}')">فرستادن</button></div>`);
}
async function cxSendQuote(id){
  const free = document.getElementById("q_free").checked;
  const price = parseInt(en(document.getElementById("q_price").value).replace(/\D/g, ""), 10) || 0;
  const { error } = await sb.rpc("coach_quote_request", { p_id: id, p_is_free: free, p_price: price, p_note: document.getElementById("q_note").value });
  if(error){ document.getElementById("q_err").textContent = errText(error); return; }
  cCloseSheet(); toast("فرستاده شد ✓"); await loadAll();
}
async function cxReqAction(id, action){
  if(action === "decline" && !confirm("این درخواست رد بشه؟")) return;
  const { error } = await sb.rpc("coach_request_action", { p_id: id, p_action: action, p_program: null });
  toast(error ? errText(error) : "ثبت شد ✓"); await loadAll();
}
function cxDeliver(id, athleteId){
  const progs = C.programs.filter(p => p.athlete_id === athleteId && p.status === "published");
  if(!progs.length){ toast("اول برای این شاگرد یه برنامه بساز و منتشر کن."); return; }
  openSheet(`<h3>کدوم برنامه رو تحویل می‌دی؟</h3>${progs.map(p => `<button class="c-pick" onclick="cxDoDeliver('${id}','${p.id}')"><div class="grow"><div class="c-name">${esc(p.title)}</div><div class="c-note">نسخه‌ی ${fa(p.version)}</div></div></button>`).join("")}
    <div class="c-row-btns" style="margin-top:10px;"><button class="c-btn ghost" onclick="cCloseSheet()">انصراف</button></div>`);
}
async function cxDoDeliver(id, programId){
  const { error } = await sb.rpc("coach_request_action", { p_id: id, p_action: "deliver", p_program: programId });
  cCloseSheet(); toast(error ? errText(error) : "تحویل شد ✓"); await loadAll();
}

/* ---------- D: پیشرفت شاگرد ---------- */
async function cxLoadAthlete(athleteId){
  CX.progress = null; CX.family = null; CX.skills = null; CX.detail = null; CX.ai = null;
  const [p, f, s] = await Promise.all([
    sb.rpc("athlete_progress_summary", { p_athlete: athleteId }),
    sb.rpc("family_progress", { p_athlete: athleteId }),
    sb.rpc("skill_progress_status", { p_athlete: athleteId }),
  ]);
  CX.progress = p.data || []; CX.family = f.data || []; CX.skills = (s.data || []).filter(x => x.coach_id === C.user.id);
  plusEnsureBank();
  cxLoadBody(athleteId);
}

/* ---------- قد، وزن، BMI و عکس‌های پیشرفت شاگرد (v2.4.0) ----------
   فقط وقتی شاگرد خودش اجازه داده (share_body) و هنوز وصلید. عکس‌ها فقط با لینک موقت ۱۰ دقیقه‌ای باز می‌شن. */
async function cxLoadBody(athleteId){
  CX.body = null; CX.photos = null; CX.photoUrls = {};
  const [b, ph] = await Promise.all([
    sb.rpc("coach_athlete_body", { p_athlete: athleteId }),
    sb.from("body_photos").select("id,period_label,pose,taken_on,path,note,program_id").eq("athlete_id", athleteId).order("taken_on", { ascending: false }).limit(60),
  ]);
  CX.body = b.error ? { shared: false, error: true } : (b.data || { shared: false });
  CX.photos = ph.error ? [] : (ph.data || []);
  if(CX.photos.length){
    const paths = CX.photos.map(x => x.path);
    const { data } = await sb.storage.from("body-photos").createSignedUrls(paths, 600);
    (data || []).forEach(r => { if(r && r.signedUrl) CX.photoUrls[r.path] = r.signedUrl; });
  }
  if(C.view === "athlete") render();
}
function cxBodyBlock(a){
  if(CX.body === null || CX.body === undefined) return `<div class="c-h">📐 قد، وزن و BMI</div><div class="c-card"><div class="c-note">در حال بارگذاری...</div></div>`;
  const rows = (CX.body.rows || []);
  const bmiRows = rows.filter(r => r.bmi != null).map(r => ({ d: r.d, bmi: +r.bmi }));
  const sum = typeof pelehBmiSummary === "function" ? pelehBmiSummary(bmiRows) : null;
  const lastW = rows.length ? rows[rows.length - 1] : null, firstW = rows.length ? rows[0] : null;
  const head = `<div class="c-h">📐 قد، وزن و BMI</div>`;
  if(!CX.body.shared) return `${head}<div class="c-card"><div class="c-note">${esc(a.athlete_name)} هنوز اجازه‌ی دیدن قد و وزنش رو نداده. از خودش بخواه تو «سلامت پلاس» گزینه‌ی «مربی قد، وزن و BMI من رو ببینه» رو روشن کنه.</div></div>`;
  if(!rows.length) return `${head}<div class="c-card"><div class="c-note">هنوز وزنی ثبت نکرده.</div></div>`;
  const f1 = n => fa(String(n).replace(".", "٫"));
  return `${head}<div class="c-card">
    <div class="c-stats" style="margin-bottom:8px;">
      <div class="c-stat"><b>${lastW ? f1(lastW.kg) : "—"}</b><span>وزن فعلی (کیلو)</span></div>
      <div class="c-stat ${sum && sum.band.label !== "نرمال" ? "warn" : ""}"><b>${sum ? f1(sum.bmi) : "—"}</b><span>${sum ? esc(sum.band.label) : "BMI (قد ثبت نشده)"}</span></div>
      <div class="c-stat"><b dir="ltr">${firstW && lastW && rows.length > 1 ? (lastW.kg - firstW.kg > 0 ? "+" : lastW.kg - firstW.kg < 0 ? "−" : "") + f1(Math.abs(Math.round((lastW.kg - firstW.kg) * 10) / 10)) : "—"}</b><span>تغییر وزن از ${firstW ? esc(faDate(firstW.d)) : "—"}</span></div>
    </div>
    ${bmiRows.length ? pelehBmiChartSvg(bmiRows, { w: 340 }) : `<div class="c-note">برای BMI، قد شاگرد ثبت نشده.</div>`}
    ${rows.length > 1 && typeof exLineChartSvg === "function" ? `<details><summary class="c-note" style="cursor:pointer;">نمودار وزن (${fa(rows.length)} ثبت)</summary>${exLineChartSvg(rows.map(r => ({ x: faDate(r.d), y: +r.kg })), { w: 340 })}</details>` : ``}
    <div class="c-note" style="margin-top:6px;">BMI شاخص کلیه؛ برای ورزشکار خیلی عضلانی، زیر ۱۸ سال یا باردار معیار دقیقی نیست.</div>
  </div>`;
}
function cxPhotosBlock(a){
  const list = CX.photos;
  const head = `<div class="c-h">📸 عکس‌های پیشرفت <span class="c-note">(فقط تو و خود شاگرد)</span></div>`;
  if(list === null || list === undefined) return `${head}<div class="c-card"><div class="c-note">در حال بارگذاری...</div></div>`;
  if(!list.length) return `${head}<div class="c-card"><div class="c-note">${esc(a.athlete_name)} هنوز عکسی برات نفرستاده. آخر هر دوره‌ی تمرین از اپ پیشنهاد می‌شه که عکس پیشرفتش رو بفرسته.</div></div>`;
  const groups = {};
  list.forEach(p => { const k = p.period_label || faDate(p.taken_on); (groups[k] = groups[k] || []).push(p); });
  const poseFa = { front: "جلو", side: "بغل", back: "پشت", other: "سایر" };
  const keys = Object.keys(groups);
  const first = list[list.length - 1], last = list[0];
  const cmp = keys.length > 1 && CX.photoUrls[first.path] && CX.photoUrls[last.path] ? `<div class="c-card gold"><div class="c-name" style="margin-bottom:6px;">مقایسه‌ی اولین و آخرین</div>
    <div style="display:grid; grid-template-columns:repeat(2, minmax(0, 1fr)); gap:8px;">
      ${[first, last].map(p => `<figure style="margin:0;"><img src="${esc(CX.photoUrls[p.path])}" alt="عکس ${esc(poseFa[p.pose] || "")} — ${esc(faDate(p.taken_on))}" style="width:100%; aspect-ratio:3/4; object-fit:cover; border-radius:12px;" loading="lazy" referrerpolicy="no-referrer"><figcaption class="c-note">${esc(faDate(p.taken_on))}</figcaption></figure>`).join("")}
    </div></div>` : ``;
  return `${head}${cmp}${keys.map(k => `<div class="c-card"><div class="c-name" style="margin-bottom:6px;">${esc(k)}</div>
    <div style="display:grid; grid-template-columns:repeat(3, minmax(0, 1fr)); gap:6px;">${groups[k].map(p => CX.photoUrls[p.path]
      ? `<a href="${esc(CX.photoUrls[p.path])}" target="_blank" rel="noopener noreferrer"><img src="${esc(CX.photoUrls[p.path])}" alt="عکس ${esc(poseFa[p.pose] || "")}" style="width:100%; aspect-ratio:3/4; object-fit:cover; border-radius:10px;" loading="lazy" referrerpolicy="no-referrer"></a>`
      : `<div class="c-note">باز نشد</div>`).join("")}</div>
    ${groups[k].some(p => p.note) ? `<div class="c-note" style="margin-top:6px;">${groups[k].filter(p => p.note).map(p => esc(p.note)).join(" · ")}</div>` : ``}</div>`).join("")}
    <div class="c-note" style="margin:-4px 4px 10px;">لینک عکس‌ها ۱۰ دقیقه اعتبار داره؛ با قطع اتصال، دسترسی‌ت فوراً برداشته می‌شه.</div>`;
}
function cxBest(r){
  if(r.log_type === "time" || r.log_type === "distance_or_time") return `${fa(r.best_duration || 0)} ث`;
  return r.best_weight ? `${exFaNum(r.best_weight)} کیلو` : `${fa(r.best_reps || 0)} تکرار`;
}
function cxProgressBlock(a){
  if(CX.progress === null) return `<div class="c-h">📈 پیشرفت</div><div class="c-card"><div class="c-note">در حال بارگذاری...</div></div>`;
  const det = CX.detail;
  const fams = {};
  (CX.family || []).forEach(r => { if(!fams[r.family] || r.week > fams[r.family].week) fams[r.family] = r; });
  // batch 2026-11-08: جزئیات دقیقاً زیر همون حرکتی که لمس شده باز می‌شه (قبلاً بالای بخش باز می‌شد و مربی باید اسکرول می‌کرد بالا)
  return `<div class="c-h">📈 پیشرفت <span class="c-note">(فقط ثبت‌های برنامه‌های خودت)</span></div>
    <div class="c-card">${CX.progress.length ? CX.progress.map(r => { const st = EX_STATUS_FA[r.status] || ["", "gray"]; const open = det && det.exercise_id === r.exercise_id; return `<div class="c-list-row click ${open ? "ex-row-open" : ""}" role="button" tabindex="0" aria-expanded="${open ? "true" : "false"}" onclick="cxOpenDetail('${a.athlete_id}','${r.exercise_id}','${r.log_type}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault(); this.click();}">
        <div class="grow"><div class="c-name">${esc(exName(r.exercise_id))}</div><div class="c-note">بهترین ${cxBest(r)} · ${fa(r.sessions)} جلسه · آخرین ${esc(faDate(r.last_date))}</div></div>
        <span class="c-badge ${st[1]}">${st[0]}</span><span class="chev" aria-hidden="true">${open ? "▲" : "▼"}</span></div>${open ? cxDetailPanel(det) : ``}`; }).join("") : `<div class="c-note">هنوز تمرینی از برنامه‌هات ثبت نشده.</div>`}
      <div class="c-note" style="margin-top:6px;">مقایسه‌ی ۲۸ روز اخیر با ۲۸ روز قبلش، حداقل ۳ جلسه در هر بازه. «افت احتمالی» یعنی ارزش بررسی داره، نه حکم.</div></div>
    ${Object.keys(fams).length ? `<div class="c-card"><div class="c-name" style="margin-bottom:6px;">🧗 خانواده‌های کلستنیکس — بالاترین مرحله‌ی اجراشده</div>
      ${Object.values(fams).map(f => `<div class="c-list-row"><div class="grow">${esc(f.family)}</div><div class="c-note">${esc(exName(f.exercise_id))} · هفته‌ی ${esc(exFaDate(f.week))}</div></div>`).join("")}</div>` : ``}`;
}
function cxDetailPanel(det){
  const sess = det.sessions || (det.series ? exSessionsFromSeries(det.series) : null);
  return `<div class="ex-det" id="cx-det">
    ${det.series ? exLineChartSvg(det.series.map(p => ({ x: exFaDate(p.date), y: p.value })), { w: 340, label: exMetricLabel(det.log_type) }) : `<div class="c-note">در حال بارگذاری...</div>`}
    ${det.series ? `<div class="c-note">${exMetricLabelHtml(det.log_type)}</div>` : ``}
    ${sess ? `<div class="c-name" style="margin-top:8px;">جلسه‌ها (${fa(sess.length)})</div>${sess.length ? sess.map(s => exSessionHtml(s, det.log_type)).join("") : `<div class="c-note">ستی ثبت نشده.</div>`}
      ${sess.length && sess[0].ordered === false ? `<div class="c-note">ترتیب ست‌ها در دسترس نبود؛ ست‌ها از بهترین به پایین مرتب شدن.</div>` : ``}` : ``}
    <button class="c-link" onclick="event.stopPropagation(); CX.detail=null; render();">بستن</button></div>`;
}
async function cxOpenDetail(athleteId, exId, logType){
  if(CX.detail && CX.detail.exercise_id === exId){ CX.detail = null; render(); return; }   // لمس دوباره = بستن
  CX.detail = { exercise_id: exId, log_type: logType, series: null, sessions: null }; render(); exRevealEl("cx-det");
  const [prog, sessions] = await Promise.all([
    sb.rpc("exercise_progress", { p_athlete: athleteId, p_exercise: exId }),
    exLoadSessions(athleteId, exId),
  ]);
  if(!CX.detail || CX.detail.exercise_id !== exId) return;   // در این فاصله یه حرکت دیگه باز شده
  CX.detail = { exercise_id: exId, log_type: logType, series: prog.data || [], sessions };
  render(); exRevealEl("cx-det");
}

/* ---------- D: مسیرهای پیشرفت مهارتی ---------- */
function cxSkillsBlock(a){
  const paths = (typeof PLUS_BANK !== "undefined" && PLUS_BANK) ? PLUS_BANK.paths : [];
  return `<div class="c-h">🧗 مسیر پیشرفت مهارتی <button class="c-btn ghost" style="min-height:38px; padding:6px 12px;" onclick="cxAddPath('${a.athlete_id}')">+ مسیر</button></div>
    <div class="c-card">${(CX.skills || []).length ? CX.skills.map(s => `<div class="c-cred">
      <div style="display:flex; justify-content:space-between; gap:8px;"><div class="c-name">${esc(s.path_name)}</div><span class="c-badge">مرحله‌ی ${fa(s.current_step)} از ${fa(s.steps)}</span></div>
      <div class="c-note">${esc(s.step_label || exName(s.exercise_id))}${s.target_value ? ` · هدف: ${fa(s.target_value)}` : ""}${(s.last3 || []).length ? ` · ۳ جلسه‌ی اخیر: ${s.last3.map(fa).join("، ")}` : ""}</div>
      ${s.ready_next && s.next_label ? `<div class="c-note" style="color:var(--emerald);">✓ به هدف رسیده — پیشنهاد مرحله‌ی بعد: ${esc(s.next_label)}</div>` : ``}
      <div class="c-row-btns" style="margin-top:6px;">
        ${s.current_step < s.steps ? `<button class="c-btn ${s.ready_next ? "primary" : "ghost"}" onclick="cxSetStep('${a.athlete_id}','${s.path_id}', ${s.current_step + 1})">مرحله‌ی بعد</button>` : ``}
        ${s.current_step > 1 ? `<button class="c-btn ghost" onclick="cxSetStep('${a.athlete_id}','${s.path_id}', ${s.current_step - 1})">مرحله‌ی قبل</button>` : ``}
        <button class="c-btn ghost" onclick="cxSetTarget('${a.athlete_id}','${s.path_id}')">هدف</button></div></div>`).join("")
      : `<div class="c-note">مثلاً «فرانت لور — ادونس تاک، هدف ۱۵ ثانیه». وقتی ۳ جلسه پشت‌سرهم به هدف برسه، مرحله‌ی بعد پیشنهاد می‌شه.</div>`}
      <div class="c-note" style="margin-top:6px;">مسیرها پیشنهادی‌اند، نه ترتیب اجباری — هر مرحله رو می‌تونی رد کنی یا برگردی.</div></div>`;
}
function cxAddPath(athleteId){
  const paths = (PLUS_BANK && PLUS_BANK.paths) || [];
  openSheet(`<h3>فعال کردن مسیر پیشرفت</h3>
    <div class="c-field"><label>مسیر</label><select id="sp_path" class="c-input" onchange="cxPathSteps()">${paths.map(p => `<option value="${p.i}">${esc(p.n)}</option>`).join("")}</select></div>
    <div class="c-field"><label>مرحله‌ی فعلی</label><select id="sp_step" class="c-input"></select></div>
    <div class="c-field"><label>هدف برای رفتن به مرحله‌ی بعد (ثانیه یا تکرار)</label><input id="sp_target" class="c-input" inputmode="numeric" placeholder="مثلاً 15"></div>
    <div class="c-err" id="sp_err"></div>
    <div class="c-row-btns"><button class="c-btn ghost" onclick="cCloseSheet()">انصراف</button><button class="c-btn primary" onclick="cxSavePath('${athleteId}')">ذخیره</button></div>`);
  cxPathSteps();
}
function cxPathSteps(){
  const p = (PLUS_BANK.paths || []).find(x => x.i === document.getElementById("sp_path").value);
  document.getElementById("sp_step").innerHTML = (p ? p.s : []).map((s, k) => `<option value="${k + 1}">${fa(k + 1)}. ${esc(s.t || exName(s.x))}</option>`).join("");
}
async function cxSavePath(athleteId){
  const target = parseFloat(en(document.getElementById("sp_target").value)) || null;
  const { error } = await sb.from("athlete_skill_progress").upsert({ athlete_id: athleteId, coach_id: C.user.id, path_id: document.getElementById("sp_path").value,
    current_step: parseInt(document.getElementById("sp_step").value, 10) || 1, target_value: target, updated_at: new Date().toISOString() }, { onConflict: "athlete_id,coach_id,path_id" });
  if(error){ document.getElementById("sp_err").textContent = errText(error); return; }
  cCloseSheet(); await cxLoadAthlete(athleteId); render();
}
async function cxSetStep(athleteId, pathId, step){
  const { error } = await sb.from("athlete_skill_progress").update({ current_step: step, updated_at: new Date().toISOString() })
    .eq("athlete_id", athleteId).eq("coach_id", C.user.id).eq("path_id", pathId);
  toast(error ? errText(error) : "مرحله به‌روز شد ✓"); await cxLoadAthlete(athleteId); render();
}
async function cxSetTarget(athleteId, pathId){
  const v = prompt("هدف جدید (ثانیه یا تکرار):"); if(v === null) return;
  const { error } = await sb.from("athlete_skill_progress").update({ target_value: parseFloat(en(v)) || null }).eq("athlete_id", athleteId).eq("coach_id", C.user.id).eq("path_id", pathId);
  toast(error ? errText(error) : "ذخیره شد ✓"); await cxLoadAthlete(athleteId); render();
}

/* ---------- F: تحلیل با AI (همیشه پیش‌نویس؛ مربی تک‌تک تأیید می‌کنه) ---------- */
function cxAiBlock(a){
  if(!C.status || !C.status.ai_enabled) return ``;
  const d = (CX.dash || []).find(x => x.athlete_id === a.athlete_id);
  const consent = d && d.ai_consent;
  const ai = CX.ai;
  return `<div class="c-h">🤖 تحلیل با AI</div><div class="c-card">
    ${!consent ? `<div class="c-note">${esc(a.athlete_name)} هنوز اجازه‌ی تحلیل AI رو نداده (از صفحه‌ی سلامت پلاس خودش، کنار اسم تو).</div>`
      : !ai ? `<div class="c-note">فقط آمار تجمیعی تمرین‌ها فرستاده می‌شه (بدون اسم و اطلاعات شخصی). نتیجه فقط پیش‌نویسه.</div>
        <button class="c-btn primary block" ${CX.aiBusy ? "disabled" : ""} onclick="cxRunAi('${a.athlete_id}')">${CX.aiBusy ? "در حال تحلیل..." : "تحلیل روند و پیشنهاد تغییر"}</button>`
      : ai.error ? `<div class="c-err">${esc(ai.error)}</div><button class="c-link" onclick="CX.ai=null; render();">دوباره</button>`
      : `<div style="white-space:pre-wrap; line-height:1.9;">${esc(ai.summary)}</div>
        ${(ai.flags || []).length ? `<div class="c-note" style="margin-top:6px;">${ai.flags.map(f => "• " + esc(f)).join("<br>")}</div>` : ``}
        ${(ai.proposed_changes || []).length ? `<div class="c-name" style="margin-top:10px;">پیشنهاد تغییرها (هر کدوم رو خواستی تیک بزن):</div>
          ${ai.proposed_changes.map((c, i) => `<label class="c-check" style="align-items:flex-start;"><input type="checkbox" data-ai-change="${i}" checked>
            <span><b>${esc(cxChangeLabel(c))}</b><br><span class="c-note">${esc(c.rationale || "")}</span></span></label>`).join("")}
          <button class="c-btn primary block" onclick="cxApplyAi('${a.athlete_id}')">اعمال انتخاب‌شده‌ها در نسخه‌ی جدید برنامه</button>` : `<div class="c-note">تغییری پیشنهاد نشد.</div>`}
        <div class="c-note" style="margin-top:6px;">${esc(ai.disclaimer || "")}</div>
        <button class="c-link" onclick="CX.ai=null; render();">بستن</button>`}
  </div>`;
}
function cxChangeLabel(c){
  const n = exName(c.exercise_id);
  if(c.type === "remove") return `حذف «${n}» از روز ${fa((c.day_index || 0) + 1)}`;
  if(c.type === "replace") return `جایگزینی «${n}» با «${exName(c.new_exercise_id)}»`;
  const parts = [];
  if(c.sets) parts.push(`${fa(c.sets)} ست`); if(c.reps) parts.push(`${fa(c.reps)} تکرار`); if(c.seconds) parts.push(`${fa(c.seconds)} ثانیه`); if(c.weight_kg != null) parts.push(`${fa(c.weight_kg)} کیلو`);
  return `${c.type === "add" ? "افزودن" : "تغییر"} «${n}»${parts.length ? ": " + parts.join("، ") : ""}`;
}
async function cxRunAi(athleteId){
  CX.aiBusy = true; render();
  try{
    const { data, error } = await sb.functions.invoke("coach-ai", { body: { action: "analyze", athlete_id: athleteId } });
    let out = data;
    if(error && error.context && typeof error.context.json === "function"){ try{ out = await error.context.json(); }catch(e){} }
    CX.ai = out && !out.error ? out : { error: (out && out.error) || "تحلیل انجام نشد." };
  }catch(e){ CX.ai = { error: errText(e) }; }
  CX.aiBusy = false; render();
}
async function cxApplyAi(athleteId){
  const chosen = Array.from(document.querySelectorAll("[data-ai-change]")).filter(x => x.checked).map(x => CX.ai.proposed_changes[+x.dataset.aiChange]);
  if(!chosen.length){ toast("هیچ تغییری انتخاب نشده."); return; }
  const cur = C.programs.find(p => p.athlete_id === athleteId && p.status === "published");
  if(!cur){ toast("برنامه‌ی منتشرشده‌ای برای این شاگرد نیست."); return; }
  await loadProgramInto(cur.id, true);
  if(!D) return;
  chosen.forEach(c => {
    const day = D.days[Math.min(D.days.length - 1, c.day_index || 0)]; if(!day) return;
    const idx = day.items.findIndex(i => i.exercise_id === c.exercise_id);
    if(c.type === "remove"){ if(idx >= 0) day.items.splice(idx, 1); return; }
    if(c.type === "replace" && idx >= 0 && c.new_exercise_id){ day.items[idx].exercise_id = c.new_exercise_id; return; }
    const target = idx >= 0 ? day.items[idx] : (c.type === "add" ? (day.items.push({ exercise_id: c.exercise_id, scheme: "straight" }), day.items[day.items.length - 1]) : null);
    if(!target) return;
    if(c.sets) target.sets = c.sets; if(c.reps) target.reps_min = c.reps; if(c.seconds) target.duration_sec = c.seconds; if(c.weight_kg != null) target.weight_kg = c.weight_kg;
  });
  if(CX.ai.id) sb.from("ai_suggestions").update({ applied: true }).eq("id", CX.ai.id).then(() => {});
  D.dirty = true; scheduleSave(); render();
  toast("تغییرها تو یه نسخه‌ی جدید اعمال شد — بررسی کن و «انتشار» رو بزن.", 4500);
}

/* ---------- C: شروع از قالب ---------- */
const PROGRAM_TEMPLATES = [
  { id: "cal_beginner_3", title: "کلستنیکس مبتدی ۳ روزه", days: [
    { title: "تمام‌بدن A", items: [["cal_008", 3, 8], ["bb_0044", 3, 8], ["cal_007", 3, 15], ["bb_0700", 3, 0, 30]] },
    { title: "تمام‌بدن B", items: [["bb_0060", 3, 5], ["bb_0338", 3, 10], ["bb_0430", 3, 10], ["bb_0659", 3, 0, 20]] },
    { title: "تمام‌بدن C", items: [["cal_008", 3, 10], ["bb_0056", 3, 6], ["bb_0502", 3, 15], ["bb_1009", 3, 0, 25]] } ] },
  { id: "ppl", title: "Push / Pull / Legs", days: [
    { title: "Push — سینه، سرشانه، پشت‌بازو", items: [["bb_0001", 4, 8], ["bb_0015", 3, 10], ["bb_0194", 3, 10], ["bb_0214", 3, 12], ["bb_0317", 3, 12]] },
    { title: "Pull — پشت و جلوبازو", items: [["bb_0060", 4, 6], ["bb_0090", 4, 8], ["bb_0114", 3, 10], ["bb_0963", 3, 15], ["bb_0273", 3, 10]] },
    { title: "Legs — پا", items: [["bb_0387", 4, 6], ["bb_0465", 3, 8], ["bb_0414", 3, 12], ["bb_0451", 3, 12], ["bb_0585", 3, 15]] } ] },
  { id: "full_3", title: "فول‌بادی ۳ روزه", days: [
    { title: "روز ۱", items: [["bb_0387", 3, 8], ["bb_0001", 3, 8], ["bb_0090", 3, 10], ["bb_0700", 3, 0, 40]] },
    { title: "روز ۲", items: [["bb_0465", 3, 8], ["bb_0191", 3, 8], ["bb_0060", 3, 6], ["bb_0625", 3, 15]] },
    { title: "روز ۳", items: [["bb_0389", 3, 12], ["bb_0015", 3, 10], ["bb_0074", 3, 10], ["bb_1009", 3, 0, 30]] } ] },
  { id: "ul_4", title: "بالاتنه / پایین‌تنه ۴ روزه", days: [
    { title: "بالاتنه A", items: [["bb_0001", 4, 6], ["bb_0090", 4, 8], ["bb_0191", 3, 8], ["bb_0074", 3, 10], ["bb_0268", 3, 10]] },
    { title: "پایین‌تنه A", items: [["bb_0387", 4, 6], ["bb_0465", 3, 8], ["bb_0432", 3, 10], ["bb_0585", 4, 12]] },
    { title: "بالاتنه B", items: [["bb_0015", 4, 8], ["bb_0060", 4, 6], ["bb_0194", 3, 10], ["bb_0114", 3, 10], ["bb_0317", 3, 12]] },
    { title: "پایین‌تنه B", items: [["bb_0472", 3, 5], ["bb_0414", 3, 12], ["bb_0496", 3, 10], ["bb_0422", 3, 12]] } ] },
  { id: "cardio_3", title: "هوازی ۳ روزه (چربی‌سوزی)", days: [
    { title: "تداومی", items: [["cardio_001", 1, 0, 1500], ["cardio_008", 1, 0, 900]] },
    { title: "اینتروال", items: [["cardio_015", 1, 0, 1200], ["cardio_010", 3, 0, 120]] },
    { title: "طولانی آرام", items: [["cardio_003", 1, 0, 2700]] } ] },
  { id: "bb_beginner", title: "بدنسازی مبتدی", days: [
    { title: "روز ۱", items: [["bb_0414", 3, 12], ["bb_0001", 3, 10], ["bb_0074", 3, 12], ["bb_0214", 3, 12], ["bb_0645", 3, 12]] },
    { title: "روز ۲", items: [["bb_0389", 3, 12], ["bb_0015", 3, 12], ["bb_0114", 3, 12], ["bb_0273", 3, 12], ["bb_0317", 3, 12]] } ] },
];
function cxStartNewProgram(athleteId){
  const mine = C.programs.filter(p => !p.athlete_id);
  const others = C.programs.filter(p => p.athlete_id && p.status !== "draft");
  openSheet(`<h3>برنامه‌ی جدید — از کجا شروع کنیم؟</h3>
    <button class="c-pick" onclick="cCloseSheet(); newProgram('${athleteId}')"><div class="grow"><div class="c-name">📄 برنامه‌ی خالی</div></div></button>
    <button class="c-pick" onclick="cCloseSheet(); cxQuickText('${athleteId}')"><div class="grow"><div class="c-name">✍️ ورود سریع متنی</div><div class="c-note">مثل پیام تلگرام بنویس: «پول‌آپ ۴ در ۸، دیپ ۳ در ۱۲، پلانک ۳ در ۴۵ ثانیه»</div></div></button>
    <div class="c-note" style="margin:10px 0 4px;">قالب‌های آماده</div>
    ${PROGRAM_TEMPLATES.map(t => `<button class="c-pick" onclick="cxFromTemplate('${athleteId}','${t.id}')"><div class="grow"><div class="c-name">${esc(t.title)}</div><div class="c-note">${fa(t.days.length)} روز</div></div></button>`).join("")}
    ${mine.length ? `<div class="c-note" style="margin:10px 0 4px;">قالب‌های من</div>${mine.map(p => `<button class="c-pick" onclick="cxCopyProgram('${athleteId}','${p.id}')"><div class="grow"><div class="c-name">${esc(p.title)}</div></div></button>`).join("")}` : ``}
    ${others.length ? `<div class="c-note" style="margin:10px 0 4px;">کپی از برنامه‌ی شاگرد دیگه</div>${others.slice(0, 15).map(p => `<button class="c-pick" onclick="cxCopyProgram('${athleteId}','${p.id}')"><div class="grow"><div class="c-name">${esc(p.title)}</div><div class="c-note">${esc((C.athletes.find(a => a.athlete_id === p.athlete_id) || {}).athlete_name || "")} · نسخه‌ی ${fa(p.version)}</div></div></button>`).join("")}` : ``}
    <div class="c-row-btns" style="margin-top:10px;"><button class="c-btn ghost" onclick="cCloseSheet()">انصراف</button></div>`);
}
function cxFromTemplate(athleteId, tplId){
  const t = PROGRAM_TEMPLATES.find(x => x.id === tplId); if(!t) return;
  const bank = (typeof PLUS_BANK_MAP !== "undefined" && PLUS_BANK_MAP) || {};
  cCloseSheet(); newProgram(athleteId);
  D.title = t.title;
  D.days = t.days.map(d => ({ weekday: null, title: d.title, items: d.items.filter(([id]) => !Object.keys(bank).length || bank[id]).map(([id, sets, reps, sec]) =>
    ({ exercise_id: id, sets, reps_min: sec ? null : reps, duration_sec: sec || null, scheme: "straight" })) }));
  D.dirty = true; scheduleSave(); render();
  toast("قالب بارگذاری شد — برای این شاگرد شخصی‌سازیش کن.");
}
async function cxCopyProgram(athleteId, programId){
  cCloseSheet();
  await loadProgramInto(programId, false);
  if(!D) return;
  const a = C.athletes.find(x => x.athlete_id === athleteId);
  Object.assign(D, { id: null, parent_id: null, athlete_id: athleteId, athlete_name: a ? a.athlete_name : "", dirty: true, saveState: "" });
  scheduleSave(); render();
  toast("کپی شد — یه پیش‌نویس جدید برای این شاگرده.");
}
/* ---------- قالب‌های شخصی مربی با اسم دلخواه (v2.4.0) ----------
   مربی برنامه‌ی خودش رو با اسم ذخیره می‌کنه («حجم ۴ روزه»، «مبتدی خانم‌ها»، …) و با یه دکمه روی یک یا چند
   شاگرد خودش اعمال می‌کنه. سرور (024) فقط شاگردهایی که الان به همین مربی وصلن رو قبول می‌کنه. */
function cxTemplates(){ return (C.programs || []).filter(p => !p.athlete_id); }
function cxTemplatesBlock(){
  const list = cxTemplates();
  return `<div class="c-h">قالب‌های من (${fa(list.length)})</div>
    <div class="c-card list">
      ${list.length ? list.map(t => `<div class="c-list-row">
        <div class="grow"><div class="c-name">${esc(t.title)}</div><div class="c-note">${t.updated_at ? `آخرین تغییر ${esc(faDate(t.updated_at))}` : `قالب شخصی`}</div></div>
        <button class="c-btn primary sm" onclick="cxApplyTemplate('${esc(t.id)}')">اعمال روی شاگردها</button>
        <button class="c-btn ghost sm" onclick="cxEditTemplate('${esc(t.id)}')">ویرایش</button>
        <button class="c-iconbtn sm" aria-label="حذف قالب ${esc(t.title)}" onclick="cxDeleteTemplate('${esc(t.id)}')">${pi("trash")}</button>
      </div>`).join("") : `<div class="c-note" style="padding:12px 0;">هنوز قالبی نداری. یه برنامه با اسم دلخواه بساز و بعد با یه دکمه روی شاگردهات اعمالش کن.</div>`}
      <button class="c-btn dashed block" onclick="cxNewTemplate()">${pi("plus")} قالب جدید</button>
    </div>`;
}
function cxNewTemplate(){
  const name = prompt("اسم قالب (مثلاً: حجم ۴ روزه):", "");
  if(!name || !name.trim()) return;
  newProgram(null);
  D.title = name.trim().slice(0, 120); D.athlete_name = ""; D.isTemplate = true;
  render();
}
async function cxEditTemplate(id){
  await loadProgramInto(id, false);
  if(D){ D.isTemplate = true; D.athlete_id = null; render(); }
}
async function cxDeleteTemplate(id){
  const t = cxTemplates().find(x => x.id === id); if(!t) return;
  if(!confirm(`قالب «${t.title}» حذف بشه؟ (برنامه‌هایی که قبلاً از روش ساختی دست نمی‌خورن)`)) return;
  const { error } = await sb.from("programs").delete().eq("id", id).eq("coach_id", C.user.id).is("athlete_id", null);
  if(error){ toast(errText(error)); return; }
  C.programs = C.programs.filter(p => p.id !== id);
  toast("قالب حذف شد"); render();
}
// از داخل برنامه‌ساز قالب: اول ذخیره، بعد انتخاب شاگردها
async function cxApplyTemplateFromBuilder(){
  if(!D) return;
  if(!D.days.some(d => d.items.length)){ toast("قالب هنوز حرکتی نداره."); return; }
  const ok = await saveDraft(true);
  if(ok === false || !D.id) return;
  const id = D.id;
  if(!C.programs.some(p => p.id === id)) C.programs.unshift({ id, title: D.title, status: "draft", version: 1, athlete_id: null });
  cxApplyTemplate(id);
}
let CX_APPLY = { id: null, sel: {}, publish: false, title: "", busy: false };
function cxApplyTemplate(id){
  const t = cxTemplates().find(x => x.id === id);
  const active = (C.athletes || []).filter(a => a.status === "active");
  if(!active.length){ toast("اول یه شاگرد وصل کن — قالب فقط روی شاگردهای خودت اعمال می‌شه."); return; }
  if(CX_APPLY.id !== id) CX_APPLY = { id, sel: {}, publish: false, title: t ? t.title : "", busy: false };
  const allOn = active.every(a => CX_APPLY.sel[a.athlete_id]);
  const n = active.filter(a => CX_APPLY.sel[a.athlete_id]).length;
  openSheet(`<h3>اعمال «${esc(t ? t.title : "قالب")}»</h3>
    <div class="c-note" style="margin-bottom:10px;">برای هر شاگرد یه نسخه‌ی جدا ساخته می‌شه؛ بعدش می‌تونی برای هر کدوم جدا شخصی‌سازیش کنی.</div>
    <div class="c-field"><label for="cxa_title">اسم برنامه برای شاگردها</label>
      <input id="cxa_title" class="c-input" maxlength="120" value="${esc(CX_APPLY.title)}" oninput="CX_APPLY.title=this.value"></div>
    <div class="c-card list" style="margin:0 0 8px;">${active.map(a => `<label class="c-list-row click" style="cursor:pointer;">
      <input type="checkbox" ${CX_APPLY.sel[a.athlete_id] ? "checked" : ""} onchange="CX_APPLY.sel['${esc(a.athlete_id)}']=this.checked; cxApplyTemplate('${esc(id)}')">
      <span class="c-avatar sm" aria-hidden="true">${initialOf(a.athlete_name)}</span><div class="grow"><div class="c-name">${esc(a.athlete_name)}</div></div></label>`).join("")}</div>
    <button class="c-link" onclick="${active.map(a => `CX_APPLY.sel['${esc(a.athlete_id)}']=${allOn ? "false" : "true"};`).join("")} cxApplyTemplate('${esc(id)}')">${allOn ? "برداشتن همه" : "انتخاب همه"}</button>
    <fieldset class="c-field" style="border:0; padding:0; margin:10px 0;">
      <label class="c-radio"><input type="radio" name="cxa_pub" ${!CX_APPLY.publish ? "checked" : ""} onchange="CX_APPLY.publish=false"> فقط پیش‌نویس بساز (اول نگاهش می‌کنم، بعد منتشر می‌کنم)</label>
      <label class="c-radio"><input type="radio" name="cxa_pub" ${CX_APPLY.publish ? "checked" : ""} onchange="CX_APPLY.publish=true"> همین الان منتشر کن (برنامه‌ی فعلی شاگرد بایگانی می‌شه)</label>
    </fieldset>
    <div class="c-row-btns"><button class="c-btn ghost" onclick="cCloseSheet()">انصراف</button>
      <button class="c-btn primary" ${n && !CX_APPLY.busy ? "" : "disabled"} onclick="cxDoApplyTemplate()">${CX_APPLY.busy ? "در حال اعمال..." : `اعمال روی ${fa(n)} شاگرد`}</button></div>`);
}
async function cxDoApplyTemplate(){
  const ids = Object.keys(CX_APPLY.sel).filter(k => CX_APPLY.sel[k]);
  if(!ids.length || CX_APPLY.busy) return;
  CX_APPLY.busy = true; cxApplyTemplate(CX_APPLY.id);
  const { data, error } = await sb.rpc("coach_apply_template", { p_template: CX_APPLY.id, p_athletes: ids, p_publish: !!CX_APPLY.publish, p_title: (CX_APPLY.title || "").trim() || null });
  CX_APPLY.busy = false;
  if(error){ cxApplyTemplate(CX_APPLY.id); toast(errText(error), 4500); return; }
  const rows = Array.isArray(data) ? data : [];
  const ok = rows.filter(r => r.ok), bad = rows.filter(r => !r.ok);
  cCloseSheet();
  const nameOf = id => ((C.athletes || []).find(a => a.athlete_id === id) || {}).athlete_name || "شاگرد";
  if(bad.length) alert(`برای ${fa(ok.length)} شاگرد ${CX_APPLY.publish ? "منتشر شد" : "پیش‌نویس ساخته شد"}.\n\nانجام نشد:\n` + bad.map(r => `• ${nameOf(r.athlete_id)}: ${r.error}`).join("\n"));
  else toast(CX_APPLY.publish ? `برای ${fa(ok.length)} شاگرد منتشر شد ✓ — همین الان خبردار می‌شن.` : `برای ${fa(ok.length)} شاگرد پیش‌نویس ساخته شد ✓`, 4000);
  CX_APPLY = { id: null, sel: {}, publish: false, title: "", busy: false };
  if(D && D.isTemplate){ D = null; C.view = "home"; C.tab = "programs"; }
  loadAll();
}
// برنامه‌ی یه شاگرد → قالب (همه‌ی جزئیات: هرمی، دراپ، سوپرست، هوازی) — کپی سمت سرور
async function cxSaveAsTemplate(){
  if(!D) return;
  const name = prompt("اسم قالب:", D.title); if(!name || !name.trim()) return;
  const ok = await saveDraft(false);
  if(ok === false || !D.id){ toast("اول ذخیره انجام نشد — دوباره امتحان کن."); return; }
  const { data, error } = await sb.rpc("coach_program_to_template", { p_program: D.id, p_title: name.trim().slice(0, 120) });
  if(error){ toast(errText(error)); return; }
  C.programs.unshift({ id: data, title: name.trim(), status: "draft", version: 1, athlete_id: null, updated_at: new Date().toISOString() });
  toast("در «قالب‌های من» ذخیره شد ✓ — از تب برنامه‌ها روی هر شاگردی اعمالش کن.", 4000);
}

/* ---------- C/F: ورود سریع متنی (قاعده‌مند + کمک AI برای خط‌هایی که شناخته نشدن) ---------- */
function cxParseText(text){
  const norm = s => en(String(s || "")).replace(/[×xX*]/g, " در ").replace(/\s+/g, " ").trim();
  const out = [];
  let day = 0;
  String(text || "").split(/\n|[،,؛;]| - | — /).forEach(raw => {
    let line = norm(raw);
    if(!line) return;
    const dm = /^(?:روز|day)\s*(\d+)\s*[:：-]?\s*/i.exec(line);
    if(dm){ day = Math.max(0, parseInt(dm[1], 10) - 1); line = line.slice(dm[0].length).trim(); if(!line) return; }
    const m = /(\d+)\s*(?:ست\s*)?در\s*(\d+)(?:\s*(?:-|تا)\s*(\d+))?\s*(ثانیه|ثا|ث|sec|s|دقیقه|min)?/i.exec(line);
    const w = /(\d+(?:\.\d+)?)\s*(?:کیلو(?:گرم)?|kg)/i.exec(line) || /با\s*(\d+(?:\.\d+)?)/.exec(line);
    const name = line.replace(m ? m[0] : "", " ").replace(w ? w[0] : "", " ").replace(/\b(ست|تکرار|تا|با)\b/g, " ").replace(/\s+/g, " ").trim();
    let sets = m ? +m[1] : null, reps = m ? +m[2] : null, sec = null;
    if(m && m[4]){ sec = /دقیقه|min/i.test(m[4]) ? reps * 60 : reps; reps = null; }
    const hit = name ? (plusSearchExercises(name)[0] || null) : null;
    out.push({ line: raw.trim(), day, name, exercise_id: hit ? hit.i : null, sets, reps, reps_max: m && m[3] ? +m[3] : null, sec, weight: w ? +w[1] : null });
  });
  return out;
}
let CX_QT = { athleteId: null, rows: [] };
function cxQuickText(athleteId){
  plusEnsureBank();
  CX_QT = { athleteId, rows: [] };
  openSheet(`<h3>✍️ ورود سریع متنی</h3>
    <div class="c-note">هر حرکت یه خط یا با «،» جدا. «روز ۲:» روز رو عوض می‌کنه. مثال: پول‌آپ ۴ در ۸، دیپ ۳ در ۱۲، پلانک ۳ در ۴۵ ثانیه، اسکوات ۵×۵ با ۸۰ کیلو</div>
    <textarea id="qt_text" class="c-input" style="min-height:140px; margin-top:8px;" placeholder="روز ۱: ..."></textarea>
    <div class="c-row-btns" style="margin-top:8px;"><button class="c-btn primary" onclick="cxQtPreview()">پیش‌نمایش</button></div>
    <div id="qt_preview"></div>`);
}
function cxQtPreview(){
  CX_QT.rows = cxParseText(document.getElementById("qt_text").value);
  cxQtRender();
}
function cxQtRender(){
  const rows = CX_QT.rows, bad = rows.filter(r => !r.exercise_id).length;
  document.getElementById("qt_preview").innerHTML = rows.length ? `<div style="margin-top:10px;">${rows.map((r, i) => `<div class="c-list-row">
      <div class="grow"><div class="c-name">${r.exercise_id ? esc(exName(r.exercise_id)) : `<span style="color:var(--rose);">شناخته نشد</span>`} <span class="c-note">روز ${fa(r.day + 1)}</span></div>
      <div class="c-note">«${esc(r.line)}» → ${r.sets ? fa(r.sets) + " ست" : "ست؟"}${r.reps ? " × " + fa(r.reps) : ""}${r.sec ? " × " + fa(r.sec) + "ث" : ""}${r.weight ? " · " + fa(r.weight) + " کیلو" : ""}</div></div>
      <button class="c-icon-btn" onclick="CX_QT.rows.splice(${i},1); cxQtRender();">✕</button></div>`).join("")}</div>
    ${bad && C.status && C.status.ai_enabled ? `<button class="c-btn ghost block" onclick="cxQtAi()">🤖 کمک AI برای ${fa(bad)} مورد شناخته‌نشده</button>` : bad ? `<div class="c-note">${fa(bad)} مورد شناخته نشد و اضافه نمی‌شه — اسمش رو دقیق‌تر بنویس.</div>` : ``}
    <button class="c-btn primary block" style="margin-top:8px;" onclick="cxQtApply()">ساخت برنامه از ${fa(rows.filter(r => r.exercise_id).length)} حرکت</button>` : `<div class="c-note">چیزی پیدا نشد.</div>`;
}
async function cxQtAi(){
  const text = CX_QT.rows.filter(r => !r.exercise_id).map(r => `روز ${r.day + 1}: ${r.line}`).join("\n");
  const { data, error } = await sb.functions.invoke("coach-ai", { body: { action: "parse_text", text } });
  if(error || !data || data.error){ toast((data && data.error) || "کمک AI انجام نشد."); return; }
  (data.items || []).forEach(it => {
    const hit = plusSearchExercises(it.name_fa || "")[0] || plusSearchExercises(it.name_en || "")[0];
    const row = CX_QT.rows.find(r => !r.exercise_id && (it.line ? r.line.includes(it.line.slice(0, 6)) : true));
    if(row && hit){ Object.assign(row, { exercise_id: hit.i, sets: row.sets || it.sets || null, reps: row.reps || it.reps || null, sec: row.sec || it.seconds || null, weight: row.weight || it.weight_kg || null }); }
  });
  cxQtRender();
}
function cxQtApply(){
  const rows = CX_QT.rows.filter(r => r.exercise_id);
  if(!rows.length) return;
  cCloseSheet(); newProgram(CX_QT.athleteId);
  const nDays = Math.max(1, ...rows.map(r => r.day + 1));
  D.days = Array.from({ length: nDays }, () => ({ weekday: null, title: "", items: [] }));
  rows.forEach(r => {
    const ex = exOf(r.exercise_id) || {}; const timeBased = ex.l === "time" || ex.l === "distance_or_time";
    D.days[r.day].items.push({ exercise_id: r.exercise_id, sets: r.sets || 3, reps_min: timeBased ? null : (r.reps || 10), reps_max: timeBased ? null : r.reps_max,
      duration_sec: timeBased ? (r.sec || r.reps || 30) : null, weight_kg: r.weight, scheme: "straight" });
  });
  D.dirty = true; scheduleSave(); render();
  toast("پیش‌نویس ساخته شد — بررسی کن و منتشر کن.");
}

/* ---------- حرکت اختصاصی مربی (حرکتی که تو بانک نیست) ---------- */
function cxOpenCustomExercise(prefill){
  const cats = ((typeof PLUS_BANK !== "undefined" && PLUS_BANK && PLUS_BANK.cats) || []);
  const opt = (obj, sel) => Object.entries(obj).map(([k, v]) => `<option value="${k}" ${k === sel ? "selected" : ""}>${esc(v)}</option>`).join("");
  openSheet(`<h3>➕ حرکت اختصاصی</h3>
    <div class="c-note" style="margin-bottom:8px;">همین الان ساخته و قابل استفاده می‌شه؛ نیازی به تأیید تیم پله نیست. فقط تو و شاگردهای متصلت می‌بینینش.</div>
    <div class="c-field"><label>اسم فارسی *</label><input id="ce_fa" class="c-input" maxlength="80" value="${esc(prefill || "")}" placeholder="مثلاً: پرس سینه دستگاه همر"></div>
    <div class="c-field"><label>اسم انگلیسی (اختیاری)</label><input id="ce_en" class="c-input" maxlength="80" dir="ltr" placeholder="Hammer Strength Chest Press"></div>
    <div class="c-field"><label>اسم‌های دیگه برای جستجو (با «،» جدا)</label><input id="ce_al" class="c-input" maxlength="200" placeholder="همر، پرس همر"></div>
    <div class="c-field" style="display:flex; gap:8px; flex-wrap:wrap;">
      <div style="flex:1 1 140px;"><label>نوع ثبت *</label><select id="ce_lt" class="c-input">${opt(EX_LOG_TYPES_FA, "reps_weight")}</select></div>
      <div style="flex:1 1 140px;"><label>رشته</label><select id="ce_dc" class="c-input">${opt(EX_DISCIPLINES_FA, "bodybuilding")}</select></div>
    </div>
    <div class="c-field" style="display:flex; gap:8px; flex-wrap:wrap;">
      <div style="flex:1 1 160px;"><label>گروه عضلانی / دسته</label><select id="ce_cat" class="c-input"><option value="">—</option>${cats.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join("")}</select></div>
      <div style="flex:1 1 140px;"><label>تجهیزات</label><select id="ce_eq" class="c-input"><option value="">—</option>${opt(EX_EQUIPMENT_FA, "")}</select></div>
    </div>
    <div class="c-field" style="display:flex; gap:8px; flex-wrap:wrap; align-items:flex-end;">
      <div style="flex:1 1 120px;"><label>سطح</label><select id="ce_df" class="c-input"><option value="">—</option><option value="1">مبتدی</option><option value="2">متوسط</option><option value="3">پیشرفته</option><option value="4">نخبه</option></select></div>
      <label class="c-check" style="flex:1 1 120px;"><input id="ce_uni" type="checkbox"> یک‌طرفه (تک‌دست/تک‌پا)</label>
      <label class="c-check" style="flex:1 1 160px;"><input id="ce_risk" type="checkbox"> نیازمند ارزیابی سطح ⚠️</label>
    </div>
    <div class="c-field"><label>نکته‌ی اجرا (اختیاری)</label><textarea id="ce_note" class="c-input" maxlength="500" placeholder="تنظیم دستگاه، دامنه‌ی حرکت، …"></textarea></div>
    <div class="c-err" id="ce_err"></div>
    <div class="c-row-btns"><button class="c-btn ghost" onclick="cCloseSheet()">انصراف</button><button class="c-btn primary" id="ce_save" onclick="cxSaveCustomExercise()">ساختن حرکت</button></div>`);
  setTimeout(() => { const el = document.getElementById("ce_fa"); if(el) el.focus(); }, 30);
}
async function cxSaveCustomExercise(){
  const g = id => document.getElementById(id);
  const btn = g("ce_save"); btn.disabled = true;
  const { data, error } = await sb.rpc("coach_create_exercise", {
    p_name_fa: g("ce_fa").value, p_name_en: g("ce_en").value, p_aliases: g("ce_al").value.split(/[،,]/).map(x => x.trim()).filter(Boolean),
    p_discipline: g("ce_dc").value, p_category_id: g("ce_cat").value ? +g("ce_cat").value : (g("ce_dc").value === "cardio" ? 26 : null),
    p_equipment: g("ce_eq").value || null, p_log_type: g("ce_lt").value, p_unilateral: g("ce_uni").checked,
    p_difficulty: g("ce_df").value ? +g("ce_df").value : null, p_needs_assessment: g("ce_risk").checked, p_note: g("ce_note").value });
  if(error){ g("ce_err").textContent = errText(error); btn.disabled = false; return; }
  const row = (await sb.from("exercises").select("*").eq("id", data).maybeSingle()).data;
  if(row){ C.customExercises = (C.customExercises || []).concat([row]); exAddCustomExercises([row]); }
  cCloseSheet();
  if(D && C.view === "builder" && row){
    // همون لحظه به روز فعلی برنامه (یا جفت سوپرست) اضافه می‌شه؛ لازم نیست دوباره پیداش کنه
    P.q = row.name_fa;
    pickExercise(row.id);
    toast(`«${row.name_fa}» ساخته شد و به برنامه اضافه شد`);
  } else {
    toast("حرکت ساخته شد؛ همین الان تو برنامه‌ساز قابل استفاده‌ست");
    render();
  }
}
async function cxArchiveCustomExercise(id){
  if(!confirm("این حرکت بایگانی بشه؟ (برنامه‌هایی که ازش استفاده کردن سالم می‌مونن)")) return;
  const { error } = await sb.from("exercises").update({ status: "archived" }).eq("id", id).eq("owner_coach_id", C.user.id);
  if(error){ toast(errText(error)); return; }
  C.customExercises = (C.customExercises || []).filter(x => x.id !== id);
  render();
}
function cxCustomExercisesBlock(){
  const list = C.customExercises || [];
  return `<div class="c-h">🏷️ حرکت‌های اختصاصی من <button class="c-btn ghost" style="min-height:38px; padding:6px 12px;" onclick="cxOpenCustomExercise('')">+ حرکت</button></div>
    <div class="c-card">${list.length ? list.map(x => `<div class="c-list-row"><div class="grow"><div class="c-name">${esc(x.name_fa)}</div>
      <div class="c-note">${esc(EX_LOG_TYPES_FA[x.log_type] || "")}${x.equipment ? " · " + esc(EX_EQUIPMENT_FA[x.equipment] || x.equipment) : ""}${(x.disciplines || []).length ? " · " + esc(EX_DISCIPLINES_FA[x.disciplines[0]] || "") : ""}</div></div>
      <button class="c-link" onclick="cxArchiveCustomExercise('${x.id}')">بایگانی</button></div>`).join("")
      : `<div class="c-note">حرکتی که تو بانک پله نیست رو اینجا بساز؛ بدون نیاز به تأیید، همون لحظه تو برنامه‌ساز با برچسب «اختصاصی» میاد.</div>`}</div>`;
}
