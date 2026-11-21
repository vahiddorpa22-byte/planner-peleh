/* ===================== یادآورهای هوشمند اندروید (Local Notifications) =====================
   فقط داخل اپ نصب‌شده‌ی اندروید کار می‌کنه (نسخه‌ی وب/PWA بی‌اثره و هیچ خطایی نمی‌ده).

   فلسفه: به‌جای «روزی دو نوتیف ثابت ساعت ۱۷ و ۲۱»، هر نوتیف درباره‌ی یه کار مشخصِ انجام‌نشده‌ست:
     • برنامه‌ی ورزش امروز (مثلاً «دویدن ۳۰ دقیقه») انجام نشده  → درباره‌ی همون ورزش
     • کتابِ در حال خوندن امروز ثبت نشده                          → درباره‌ی همون کتاب (و استریکِ در خطر)
     • فعالیت روزانه‌ی امروز تیک نخورده                            → درباره‌ی همون فعالیت و امتیازش
     • کارهای مهم امروز                                             → درباره‌ی همون کار
   همه‌ی نوتیف‌ها روی خود گوشی زمان‌بندی می‌شن (بدون سرور، بدون اینترنت). هر بار که چیزی تو اپ
   عوض می‌شه (تیک زدن، ثبت مطالعه، ...) کل برنامه از نو ساخته می‌شه؛ پس کاری که انجام شد، نوتیفش
   همون لحظه لغو می‌شه. فقط امروز و فردا زمان‌بندی می‌شن، به‌علاوه‌ی دو یادآور «برگرد» اگه چند
   روز اپ باز نشه.

   زمان‌بندی هم هوشمنده: ساعت معمولِ مطالعه‌ی خود کاربر (از ts لاگ‌ها)، بعد از ساعت کاری‌ش، ساعت
   سکوت ۲۲:۳۰ تا ۰۸:۰۰، حداقل ۷۵ دقیقه فاصله بین نوتیف‌ها و حداکثر ۴ تا در روز. */
// اعلان‌های سیستم هم یکدست با طراحی جدید: بدون ایموجی (SVG تو اعلان سیستمی ممکن نیست)
function nnClean(t){ return typeof pelehStripEmoji === "function" ? pelehStripEmoji(t) : t; }

let nnPerm = "unknown";          // "granted" | "denied" | "prompt" | "unknown"
let nnTimer = null;
let nnBusy = false;
let nnAgain = false;
let nnListenerAdded = false;
let nnChannelReady = false;

const NN_CHANNEL = "peleh_smart";
const NN_QUIET_START = 22 * 60 + 30;   // ۲۲:۳۰
const NN_QUIET_END = 8 * 60;           // ۰۸:۰۰
const NN_LAST_SLOT = 21 * 60 + 45;     // آخرین ساعت مجاز برای نوتیف
const NN_MIN_GAP = 75;                 // دقیقه
const NN_MAX_PER_DAY = 4;

function nnPlugin(){
  try{ return (window.Capacitor && Capacitor.Plugins && Capacitor.Plugins.LocalNotifications) || null; }catch(e){ return null; }
}
function nnAvailable(){
  return typeof isNativeApp === "function" && isNativeApp() && !!nnPlugin();
}
function smartNotifyEnabled(){
  const s = DATA && DATA.settings && DATA.settings.smartNotify;
  return !s || s.enabled !== false;
}
function smartNotifyPermission(){ return nnPerm; }

async function nnRefreshPermission(){
  const LN = nnPlugin();
  if(!LN) return nnPerm;
  try{
    const r = await LN.checkPermissions();
    const d = r && r.display;
    nnPerm = d === "granted" ? "granted" : d === "denied" ? "denied" : "prompt";
  }catch(e){ /* پلاگین جواب نداد — وضعیت قبلی می‌مونه */ }
  return nnPerm;
}
async function smartNotifyRequestPermission(){
  const LN = nnPlugin();
  if(!LN) return;
  try{
    const r = await LN.requestPermissions();
    const d = r && r.display;
    nnPerm = d === "granted" ? "granted" : d === "denied" ? "denied" : "prompt";
  }catch(e){ console.error("notification permission request failed:", e); }
  if(nnPerm === "granted"){
    DATA.settings.smartNotify = { enabled: true };
    save();
    smartNotifyTouch(true);
  }
  renderAll();
}
function setSmartNotify(on){
  DATA.settings.smartNotify = { enabled: !!on };
  save();
  if(on && nnPerm !== "granted"){ smartNotifyRequestPermission(); return; }
  smartNotifyTouch(true);
  renderAll();
}
async function smartNotifyTest(){
  const LN = nnPlugin();
  if(!LN){ alert("این قابلیت فقط تو اپ اندروید کار می‌کنه."); return; }
  await nnRefreshPermission();
  if(nnPerm !== "granted"){ await smartNotifyRequestPermission(); if(nnPerm !== "granted") return; }
  try{
    await nnEnsureChannel();
    await LN.schedule({ notifications: [{
      id: 999001, title: "یادآوری‌های پله فعاله",
      body: "از این به بعد فقط درباره‌ی کاری که انجام نشده بهت خبر می‌دم.",
      schedule: { at: new Date(Date.now() + 5000), allowWhileIdle: true },
      channelId: NN_CHANNEL, smallIcon: "ic_stat_peleh", extra: { tab: "today" },
    }] });
    alert("تا ۵ ثانیه‌ی دیگه یه نوتیف آزمایشی می‌رسه.");
  }catch(e){ alert("ارسال نوتیف آزمایشی ناموفق بود."); console.error(e); }
}

async function nnEnsureChannel(){
  if(nnChannelReady) return;
  const LN = nnPlugin();
  try{
    await LN.createChannel({ id: NN_CHANNEL, name: "یادآوری‌های هوشمند پله", description: "یادآوری کارهایی که امروز انجام ندادی", importance: 3, visibility: 1 });
  }catch(e){ /* کانال از قبل هست یا نسخه‌ی اندروید قدیمیه — مشکلی نیست */ }
  nnChannelReady = true;
}
function nnAddTapListener(){
  if(nnListenerAdded) return;
  const LN = nnPlugin();
  if(!LN) return;
  nnListenerAdded = true;
  try{
    LN.addListener("localNotificationActionPerformed", (ev) => {
      const tab = ev && ev.notification && ev.notification.extra && ev.notification.extra.tab;
      if(tab && typeof switchTab === "function" && currentUser && profileReady){ try{ switchTab(tab); }catch(e){} }
    });
  }catch(e){}
}

/* ---------- ابزارهای زمان ---------- */
function nnHM(str){
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(str || ""));
  return m ? (parseInt(m[1], 10) * 60 + parseInt(m[2], 10)) : null;
}
function nnClamp(v, lo, hi){ return Math.min(Math.max(v, lo), hi); }
function nnAt(dayStart, minutes){ return new Date(dayStart.getTime() + minutes * 60000); }
function nnHash(s){ let h = 0; for(let i = 0; i < s.length; i++){ h = (h * 31 + s.charCodeAt(i)) | 0; } return Math.abs(h); }
function nnPick(arr, seed){ return arr[nnHash(String(seed)) % arr.length]; }
function nnFa(n){ return (typeof toFaDigits === "function") ? toFaDigits(n) : String(n); }

// ساعتی که کاربر معمولاً کتاب می‌خونه (میانه‌ی ساعتِ ثبت‌های ۱۴ روز اخیر)؛ اگه داده کم بود، ۲۱:۰۰
function nnHabitualReadingMinute(b){
  try{
    const since = Date.now() - 14 * 86400000;
    const hours = (b.log || []).filter(l => l && l.ts && l.ts >= since).map(l => new Date(l.ts).getHours()).sort((x, y) => x - y);
    if(hours.length >= 3) return nnClamp(hours[Math.floor(hours.length / 2)] * 60, 9 * 60, 22 * 60);
  }catch(e){}
  return 21 * 60;
}

// ساعتی که کاربر خودش برای یادآوری انتخاب کرده (DATA.settings.reminderSlot)؛ null = ترجیحی نداره
const NN_SLOT_MINUTES = { morning: 8 * 60 + 30, noon: 13 * 60, evening: 18 * 60 + 30, night: 21 * 60 };
function nnReminderSlotMinute(){
  const slot = DATA && DATA.settings && DATA.settings.reminderSlot;
  return Object.prototype.hasOwnProperty.call(NN_SLOT_MINUTES, slot) ? NN_SLOT_MINUTES[slot] : null;
}

/* ---------- ساخت برنامه ---------- */
function nnBuildCandidates(dateObj, isToday, nowMin){
  const out = [];
  const dk = todayKey(dateObj);
  const dayKey = dayKeyOf(dateObj);
  const wp = DATA.workProfile || {};
  const ws = wp.employment && wp.employment !== "unemployed" ? nnHM(wp.workStart) : null;
  const we = wp.employment && wp.employment !== "unemployed" ? nnHM(wp.workEnd) : null;
  const afterWork = we !== null ? nnClamp(we + 45, 16 * 60 + 30, 19 * 60 + 30) : 18 * 60;
  const done = (DATA.history && DATA.history[dk]) || [];

  // ۱) برنامه‌ی ورزش
  try{
    const h = DATA.health;
    const day = h && h.workoutPlan && Array.isArray(h.workoutPlan.days) ? h.workoutPlan.days.find(x => x.day === dayKey) : null;
    if(day && !day.rest && Array.isArray(day.items) && day.items.length){
      const already = isToday && h.planDone && h.planDone[dk];
      if(!already){
        const it = day.items[0];
        const extra = day.items.length > 1 ? ` (+${nnFa(day.items.length - 1)} مورد دیگه)` : "";
        const mins = it.minutes ? ` ${nnFa(it.minutes)} دقیقه` : "";
        out.push({ key: "workout", prio: 1, min: afterWork, tab: "health",
          title: "🏃 برنامه‌ی ورزش امروز",
          body: nnPick([
            `«${it.title}»${mins} هنوز مونده${extra} — یه شروع کوچیک کافیه.`,
            `امروز نوبت «${it.title}»ـه${extra}. حتی نصفش هم حساب می‌شه.`,
            `«${it.title}»${mins} تو برنامه‌ی امروزته${extra}؛ الان وقتش خوبه.`,
          ], dk + "w") });
        // اگه تا دو ساعت بعد هم انجام نشد، یه یادآور دوم
        out.push({ key: "workout2", prio: 4, min: afterWork + 120, tab: "health",
          title: "🏃 هنوز وقت داری",
          body: `«${it.title}» امروز انجام نشده — ${day.easy ? "نسخه‌ی سبکش هم قبوله" : "حتی ۱۰ دقیقه‌ش هم می‌ارزه"}.` });
      }
    }
  }catch(e){}

  // ۲) کتاب
  try{
    const b = ensureBooksData();
    const cur = b.onboarded && Array.isArray(b.library) ? b.library.find(x => x.status === "reading") : null;
    if(cur){
      const read = isToday && (b.log || []).some(l => l && l.dateKey === dk);
      if(!read){
        const mins = b.dailyMinutes || 20;
        const streak = (b.streak && b.streak.count) || 0;
        const habit = nnHabitualReadingMinute(b);
        if(streak >= 3){
          // استریک در خطره: به‌جای دو نوتیف، یه نوتیف قوی‌تر سر ساعت همیشگی مطالعه‌ی خودش
          out.push({ key: "book", prio: 1, min: habit, tab: "books",
            title: `🔥 استریک ${nnFa(streak)} روزه‌ات در خطره`,
            body: `امروز هنوز «${cur.title}» رو ثبت نکردی — ${nnFa(mins)} دقیقه بخون تا استریک نپره.` });
        }else{
          out.push({ key: "book", prio: 2, min: habit, tab: "books",
            title: "📖 " + cur.title,
            body: nnPick([
              `امروز هنوز سراغ «${cur.title}» نرفتی — ${nnFa(mins)} دقیقه کافیه.`,
              `«${cur.title}» منتظرته. چند صفحه بخون و امروزت رو ثبت کن.`,
            ], dk + "b") });
        }
      }
    }
  }catch(e){}

  // ۳) فعالیت‌های روزانه (حداکثر ۲ تا، پرامتیازترین‌ها)
  //    فاز A۷: اگه کاربر خودش ساعت یادآوری رو انتخاب کرده (صبح/ظهر/عصر/شب)، همون ساعت «اولویت اول» است
  //    — نه حدس از روی ساعت کاری/لاگ‌ها. «none» یعنی ترجیحی نداره (رفتار قبلی).
  try{
    const slotMin = nnReminderSlotMinute();
    const acts = (DATA.activities || []).filter(a => a.days && (a.days.includes("daily") || a.days.includes(dayKey)));
    const pending = acts.filter(a => !(isToday && done.includes(a.id))).sort((x, y) => (y.points || 0) - (x.points || 0)).slice(0, 2);
    pending.forEach((a, i) => {
      out.push({ key: "act_" + a.id, prio: slotMin !== null ? (i === 0 ? 1 : 3) : 3,
        min: slotMin !== null ? slotMin + i * 90 : Math.max(afterWork, 17 * 60) + i * 90, tab: "today",
        title: `${a.icon || "⭐"} ${a.title}`,
        body: nnPick([
          `«${a.title}» امروز هنوز تیک نخورده${a.points ? ` (+${nnFa(a.points)} امتیاز)` : ""}.`,
          `یه تیک تا «${a.title}»${a.points ? ` و ${nnFa(a.points)} امتیاز` : ""} مونده.`,
        ], dk + a.id) });
    });
  }catch(e){}

  // ۴) کارهای مهم امروز (فقط برای خود امروز)
  try{
    if(isToday){
      const tasks = ((DATA.dailyExtra && DATA.dailyExtra[dk] && DATA.dailyExtra[dk].tasks) || []).filter(t => !t.done && (t.priority === "urgent" || t.priority === "important"));
      if(tasks.length){
        const first = tasks.find(t => t.priority === "urgent") || tasks[0];
        out.push({ key: "tasks", prio: 3, min: ws !== null ? Math.max(ws + 4 * 60, 14 * 60) : 15 * 60, tab: "today",
          title: tasks.length > 1 ? `✅ ${nnFa(tasks.length)} کار مهم امروز مونده` : "✅ یه کار مهم امروز مونده",
          body: `«${String(first.text).slice(0, 60)}»${tasks.length > 1 ? " و بقیه" : ""} هنوز انجام نشده.` });
      }
    }
  }catch(e){}

  // برای امروز، فقط ساعت‌هایی که هنوز نرسیدن
  return out.filter(c => !isToday || c.min > nowMin + 3);
}
// حداکثر ۴ تا در روز؛ ساعت‌ها رو بین NN_QUIET_END و NN_LAST_SLOT نگه دار و حداقل فاصله رو رعایت کن
function nnArrange(cands){
  const top = cands.slice().sort((a, b) => a.prio - b.prio || a.min - b.min).slice(0, NN_MAX_PER_DAY);
  top.sort((a, b) => a.min - b.min);
  const placed = [];
  let last = -1e9;
  for(const c of top){
    let t = nnClamp(c.min, NN_QUIET_END + 30, NN_LAST_SLOT);
    if(t - last < NN_MIN_GAP) t = last + NN_MIN_GAP;
    if(t > NN_LAST_SLOT) continue;
    placed.push(Object.assign({}, c, { min: t }));
    last = t;
  }
  return placed;
}
function nnBuildPlan(now){
  const items = [];
  const day0 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const nowMin = now.getHours() * 60 + now.getMinutes();
  for(let d = 0; d <= 1; d++){
    const dayStart = new Date(day0.getTime() + d * 86400000);
    nnArrange(nnBuildCandidates(dayStart, d === 0, nowMin)).forEach(c => items.push({ at: nnAt(dayStart, c.min), title: c.title, body: c.body, tab: c.tab, type: c.key }));
  }
  // اگه چند روز اپ باز نشه: دو یادآور ملایم «برگرد». هر بار اپ باز بشه این‌ها دوباره از امروز ساخته می‌شن.
  const lastDay = new Date(day0.getTime() + 3 * 86400000);
  items.push({ at: nnAt(lastDay, 19 * 60 + 30), title: "پله منتظرته 🌱", body: "چند روزه ندیدمت. فقط یه قدم کوچیک بردار — اتفاقی نیفتاده.", tab: "today", type: "comeback3" });
  const weekDay = new Date(day0.getTime() + 7 * 86400000);
  items.push({ at: nnAt(weekDay, 19 * 60 + 30), title: "یه هفته شد 💛", body: "هر وقت آماده بودی برگرد؛ پله‌ها سر جاشونن.", tab: "today", type: "comeback7" });
  return items.filter(i => i.at.getTime() > now.getTime() + 60000);
}

/* ---------- زمان‌بندی روی گوشی ---------- */
async function nnCancelAll(){
  const LN = nnPlugin();
  if(!LN) return;
  try{
    const p = await LN.getPending();
    const list = (p && p.notifications) || [];
    if(list.length) await LN.cancel({ notifications: list.map(n => ({ id: n.id })) });
  }catch(e){}
}
async function nnReschedule(){
  if(nnBusy){ nnAgain = true; return; }
  nnBusy = true;
  try{
    const LN = nnPlugin();
    if(!LN || !currentUser || !profileReady || loadError) return;
    await nnRefreshPermission();
    await nnCancelAll();
    if(nnPerm !== "granted" || !smartNotifyEnabled()) return;
    await nnEnsureChannel();
    nnAddTapListener();
    const plan = nnBuildPlan(new Date());
    if(!plan.length) return;
    await LN.schedule({ notifications: plan.map((p, i) => ({
      id: 1000 + i, title: nnClean(p.title), body: nnClean(p.body),
      schedule: { at: p.at, allowWhileIdle: true },
      channelId: NN_CHANNEL, smallIcon: "ic_stat_peleh", extra: { tab: p.tab, type: p.type },
    })) });
  }catch(e){
    console.error("smart notifications scheduling failed:", e);
  }finally{
    nnBusy = false;
    if(nnAgain){ nnAgain = false; smartNotifyTouch(); }
  }
}
// هر تغییری تو داده‌ها (save) این رو صدا می‌زنه؛ چند تغییر پشت‌سرهم یه بار حساب می‌شن.
function smartNotifyTouch(immediate){
  if(!nnAvailable()) return;
  clearTimeout(nnTimer);
  nnTimer = setTimeout(() => { nnTimer = null; nnReschedule(); }, immediate ? 200 : 2500);
}
// موقع خروج از حساب، همه‌ی نوتیف‌های زمان‌بندی‌شده‌ی این حساب پاک بشن
function smartNotifyCancelAll(){
  clearTimeout(nnTimer);
  nnCancelAll();
}

/* ---------- UI: بنر امروز + کارت تنظیمات ---------- */
let nnBannerDismissed = false;
function dismissSmartNotifyBanner(){ nnBannerDismissed = true; renderAll(); }
function renderSmartNotifyBanner(){
  if(!nnAvailable() || nnBannerDismissed) return ``;
  if(nnPerm === "granted" || nnPerm === "denied" || nnPerm === "unknown") return ``;
  return `<div class="tip-banner">
    <div class="tip-banner-text">🔔 یادآوری هوشمند: فقط وقتی کاری که تو برنامه‌ت بود انجام نشده بهت خبر می‌دم — نه یه پیام ثابت هر روز.</div>
    <button class="btn btn-primary" style="flex:none; padding:6px 12px; font-size:calc(11px * var(--font-scale));" onclick="smartNotifyRequestPermission()">فعال کن</button>
    <button class="tip-banner-close" onclick="dismissSmartNotifyBanner()">×</button>
  </div>`;
}
function renderSmartNotifySettingsCard(){
  if(!nnAvailable()) return ``;
  const on = smartNotifyEnabled() && nnPerm === "granted";
  const denied = nnPerm === "denied";
  return `
    <div class="section-title">یادآوری‌های هوشمند</div>
    <div class="card">
      <div class="note" style="margin-bottom:12px; line-height:2;">به‌جای یه پیام ثابت هر روز، فقط درباره‌ی کاری که امروز تو برنامه‌ت بود و انجام نشده بهت یادآوری می‌کنم؛ مثلاً «دویدن ۳۰ دقیقه» یا کتابی که داری می‌خونی. ساعت‌ها هم با روتین خودت (ساعت مطالعه و ساعت کاری) تنظیم می‌شن و بین ۲۲:۳۰ تا ۰۸:۰۰ هیچی نمی‌فرستم.</div>
      ${denied
        ? `<div class="note" style="color:var(--gold);">اجازه‌ی نوتیفیکیشن تو گوشی بسته‌ست — از «تنظیمات گوشی ← برنامه‌ها ← پله ← اعلان‌ها» فعالش کن.</div>`
        : `<button class="btn ${on ? 'btn-ghost' : 'btn-primary'}" style="width:100%; padding:12px;" onclick="setSmartNotify(${on ? 'false' : 'true'})">${on ? '🔕 خاموش کردن یادآوری‌ها' : '🔔 فعال کردن یادآوری‌ها'}</button>`}
      ${on ? `<button class="btn btn-ghost" style="width:100%; padding:10px; margin-top:8px;" onclick="smartNotifyTest()">ارسال یه نوتیف آزمایشی</button>` : ``}
    </div>
  `;
}

// بعد از بالا اومدن اپ: وضعیت اجازه رو بخون و برنامه رو بساز
if(typeof window !== "undefined"){
  window.addEventListener("load", () => {
    setTimeout(async () => {
      if(!nnAvailable()) return;
      const before = nnPerm;
      await nnRefreshPermission();
      nnAddTapListener();
      smartNotifyTouch(true);
      if(before !== nnPerm && currentUser && profileReady){ try{ renderAll(); }catch(e){} }
    }, 2500);
  });
  document.addEventListener("visibilitychange", () => {
    if(document.visibilityState === "hidden") smartNotifyTouch(true);
  });
}
