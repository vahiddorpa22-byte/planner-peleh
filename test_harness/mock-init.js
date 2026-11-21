/* LOCAL TEST ONLY (batch 2026-11-08) — never upload. Demo data only; no real user data.
   ?scn= coach (coach.html, athlete progress) | athlete (index.html, پیشرفت من) | support (index.html, unread admin message) | admin (admin.html)
   ?act= action run ~1.8 s after load (see bottom). */
(function(){
  var qs = new URLSearchParams(location.search);
  var scn = qs.get("scn") || "coach";
  // صفحه‌ی نصب فقط وقتی ?install=1 (وگرنه روی بقیه‌ی اسکرین‌شات‌ها می‌افته)
  try{ if(qs.get("install") === "1") localStorage.removeItem("pelehInstallSeenAt"); else localStorage.setItem("pelehInstallSeenAt", String(Date.now())); }catch(e){}
  var UID = "22222222-2222-4222-8222-222222222222";       // demo coach / demo user
  var ATH = "33333333-3333-4333-8333-333333333333";       // demo athlete
  function tk(d){ d = d || new Date(); return d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0") + "-" + String(d.getDate()).padStart(2,"0"); }
  function ago(n){ var d = new Date(); d.setDate(d.getDate() - n); return d; }
  var me = (scn === "athlete") ? ATH : UID;

  // --- demo workout data (same shape as workout_sessions / workout_sets) ---
  var S1 = "aaaaaaaa-0000-4000-8000-000000000001", S2 = "aaaaaaaa-0000-4000-8000-000000000002", S3 = "aaaaaaaa-0000-4000-8000-000000000003";
  var d1 = "2026-11-04", d2 = "2026-10-30", d3 = "2026-10-26";   // 13 Aban (Tue), 8 Aban, 4 Aban
  var sess = { }; sess[S1] = { performed_on: d1, started_at: d1 + "T15:00:00Z", athlete_id: ATH }; sess[S2] = { performed_on: d2, started_at: d2 + "T15:00:00Z", athlete_id: ATH }; sess[S3] = { performed_on: d3, started_at: d3 + "T15:00:00Z", athlete_id: ATH };
  function ws(sid, ex, no, reps, w, sec){ return { session_id: sid, exercise_id: ex, set_no: no, reps: reps, weight_kg: w, duration_sec: sec, distance_m: null, skipped: false, created_at: sess[sid].performed_on + "T15:0" + no + ":00Z", workout_sessions: sess[sid] }; }
  var CURL = "bb_0274", PUSH = "bb_0044", PLANK = "bb_0700", SQUAT = "bb_0387";
  var sets = [
    ws(S1, CURL, 1, 10, 7.5), ws(S1, CURL, 2, 11, 5), ws(S1, CURL, 3, 11, 5), ws(S1, CURL, 4, 11, 5),
    ws(S2, CURL, 1, 10, 5), ws(S2, CURL, 2, 10, 5), ws(S2, CURL, 3, 9, 5),
    ws(S1, PUSH, 1, 12, null), ws(S1, PUSH, 2, 10, null), ws(S1, PUSH, 3, 8, null),
    ws(S1, PLANK, 1, null, null, 45), ws(S1, PLANK, 2, null, null, 40), ws(S2, PLANK, 1, null, null, 35),
    ws(S1, SQUAT, 1, 8, 40), ws(S1, SQUAT, 2, 8, 45), ws(S3, SQUAT, 1, 8, 40),
  ];
  function e1rm(w, r){ return w ? Math.round(w * (1 + r / 30) * 10) / 10 : r; }
  function exProgress(args){   // mimics RPC exercise_progress: sets ordered by metric desc (the live behaviour)
    var ex = args.p_exercise, by = {};
    sets.filter(function(s){ return s.exercise_id === ex; }).forEach(function(s){
      var g = by[s.session_id] || (by[s.session_id] = { date: s.workout_sessions.performed_on, sets: [], value: 0 });
      var m = s.duration_sec ? s.duration_sec : e1rm(s.weight_kg, s.reps);
      g.sets.push({ reps: s.reps, weight: s.weight_kg, sec: s.duration_sec, _m: m }); if(m > g.value) g.value = m;
    });
    return Object.keys(by).map(function(k){ var g = by[k]; g.sets.sort(function(a, b){ return b._m - a._m; }); g.sets.forEach(function(s){ delete s._m; }); return g; })
      .sort(function(a, b){ return a.date < b.date ? -1 : 1; });
  }
  var summary = [
    { exercise_id: CURL, log_type: "reps_weight", sessions: 2, last_date: d1, best_weight: 7.5, best_reps: 11, best_duration: null, status: "insufficient" },
    { exercise_id: SQUAT, log_type: "reps_weight", sessions: 2, last_date: d1, best_weight: 45, best_reps: 8, best_duration: null, status: "improving" },
    { exercise_id: PUSH, log_type: "reps", sessions: 1, last_date: d1, best_weight: null, best_reps: 12, best_duration: null, status: "insufficient" },
    { exercise_id: PLANK, log_type: "time", sessions: 2, last_date: d1, best_weight: null, best_reps: null, best_duration: 45, status: "stable" },
  ];

  var data = {
    settings: { showAllSections: true, reminderSlot: "evening" },
    activities: [ { id: "act_1", title: "کتاب خوندن", points: 10, days: ["daily"], icon: "📖" } ],
    history: {}, seenCoach: { quickstart_v1: true, today: true, today2: true }, seenTips: { task_tiers: true },
    funnel: { first_habit: "2026-10-01T00:00:00Z" }, dailyExtra: {}, nextTaskSeq: 10, nextActivitySeq: 5,
    workProfile: { completed: true, employment: null, workStart: "", workEnd: "", interests: [], interestsCustom: "" },
    books: { onboarded: true, interests: [], library: [], log: [], points: 0, challenges: [], nextLibId: 2, nextLogId: 20, lastPenaltyCheck: tk() },
    health: { profile: { completed: true, age: 30, height: 170, currentWeight: 70, targetWeight: 68, mainGoal: "fit", mainGoals: ["fit"], activityLevel: "light",
      daysPerWeek: 3, minutesPerSession: 45, level: "beginner", equipment: [] }, sports: { likes: [], dislikes: [], customLike: "", discovery: null }, weightLog: [] }
  };
  var profile = { id: me, name: scn === "athlete" ? "سارا" : "مربی نمونه", phone: "09120000000", phone_verified: true, verified_phone: "09120000000",
    birthdate: null, photo: null, referral_code: "DEMO", email: "09120000000@phone.pelehapp.ir", created_at: "2026-09-01T00:00:00Z", data: data };
  var user = { id: me, email: "09120000000@phone.pelehapp.ir", app_metadata: { provider: "email" } };
  var tables = { workout_sets: sets, exercises: [] };
  if(scn === "coach"){
    tables.coach_profiles = [{ user_id: UID, status: "approved", display_name: "مربی نمونه" }];
    tables.coach_credentials = []; tables.coach_advice = []; tables.coach_notes = []; tables.body_photos = [];
    tables.programs = [{ id: "p1", title: "برنامه‌ی آبان", status: "published", version: 1, athlete_id: ATH, parent_id: null, published_at: "2026-10-20T10:00:00Z", updated_at: "2026-10-20T10:00:00Z" }];
  }
  if(scn === "support"){
    tables.support_messages = [
      { id: 1, user_id: me, sender: "admin", body: "سلام سارا! از پشتیبانی پله پیام می‌دم: برنامه‌ی تمرینت آماده‌ست؟ اگه سؤالی داری همین‌جا بپرس.", created_at: new Date().toISOString(), read_by_admin: true, read_by_user: false }
    ];
  }
  if(scn === "lamnew"){   // کاربر تازه‌ی غیربتا، شماره تأییدشده، هنوز بدون اسم و عادت
    data.activities = []; data.seenCoach = {}; data.funnel = {}; profile.name = null;
  }
  if(scn === "lambooks"){ // کاربر قدیمی غیربتا با ۸ روز مطالعه (سطح ۱ کتاب لَم)
    for(var i = 1; i <= 8; i++) data.books.log.push({ id: "l" + i, bookId: 1, dateKey: tk(ago(i)), minutes: 20, pages: 8, note: "", points: 5, ts: ago(i).getTime() });
    data.books.library = [{ id: 1, title: "کتاب نمونه", authors: "", status: "reading", pages: 300, currentPage: 64 }];
    data.beta = { lamMax: 1, sport: "volleyball", lamIntroSeen: true };
  }
  var mockProfile = profile;
  if(scn === "admin"){
    mockProfile = null;
    tables.admins = [{ user_id: UID }];
    tables.profiles = [
      { id: ATH, name: "سارا نمونه", email: null, phone: "09121112233", created_at: "2026-10-01T08:00:00Z", data: { books: { points: 40, log: [], library: [] } } },
      { id: "44444444-4444-4444-8444-444444444444", name: "علی نمونه", email: "ali@example.com", phone: null, created_at: "2026-09-12T08:00:00Z", data: {} }
    ];
    tables.support_messages = []; tables.premium_requests = []; tables.push_subscriptions = []; tables.client_sources = [];
  }
  window.__SCN = scn;
  window.__MOCK_INIT = { user: user, profile: mockProfile, tables: tables,
    rpc: {
      peleh_client_flags: { plus_enabled: true, quickstart_v1: true, min_app_version: "0" },
      plus_status: { enabled: true, role: scn === "coach" ? "coach" : "athlete", has_plus: qs.get("req") !== "1", require_entitlement: qs.get("req") === "1", payments_enabled: qs.get("pay") === "1", bazaar_enabled: qs.get("bz") === "1", bazaar_days: 30, plan_days: 30, price_toman: 500000, payment_note: "", pending_payment: false, plus_until: null },
      coach_list_athletes: [{ link_id: "L1", athlete_id: ATH, athlete_name: "سارا", status: "active", last_session: d1, sessions_28d: 3 }],
      coach_dashboard: [{ athlete_id: ATH, link_id: "L1", athlete_name: "سارا", attention: null, last_session: d1, improving: 1 }],
      athlete_progress_summary: summary, family_progress: [], skill_progress_status: [],
      coach_athlete_body: { shared: false },
      exercise_progress: exProgress,
      athlete_my_coaches: [], athlete_body_shares: [], last_sets_for: {},
      peleh_report_client: null, peleh_my_health_points: { points: 0 }
    },
    invoke: {} };
})();

/* LOCAL TEST ONLY: screenshot runner */
(function(){
  var qs = new URLSearchParams(location.search);
  var act = qs.get("act");
  if(!act) return;
  function byText(sel, txt){ return Array.prototype.find.call(document.querySelectorAll(sel), function(x){ return x.textContent.indexOf(txt) >= 0; }); }
  function scrollToText(sel, txt, off){ var el = byText(sel, txt); if(el){ el.scrollIntoView({ block: "start" }); window.scrollBy(0, off || -70); } }
  var A = {
    // پنل مربی: باز کردن شاگرد، رفتن به «پیشرفت»، لمس «جلو بازو دمبل تناوبی» در حالی که ردیف پایین صفحه‌ست
    coach_list: function(){ openAthlete("L1"); setTimeout(function(){ var r = byText(".c-list-row", "جلو بازو"); if(r){ r.scrollIntoView({ block: "end" }); window.scrollBy(0, 120); } }, 900); },
    coach_tap: function(){ openAthlete("L1"); setTimeout(function(){ var r = byText(".c-list-row", "جلو بازو"); if(r){ r.scrollIntoView({ block: "end" }); window.scrollBy(0, 120); r.click(); } }, 900); },
    coach_tap_open: function(){ openAthlete("L1"); setTimeout(function(){ var r = byText(".c-list-row", "جلو بازو"); if(r){ r.scrollIntoView({ block: "end" }); window.scrollBy(0, 120); r.click();
      setTimeout(function(){ var d = document.querySelector("details summary"); if(d){ d.parentNode.open = true; } }, 500); } }, 900); },
    coach_detail_full: function(){ openAthlete("L1"); setTimeout(function(){ var r = byText(".c-list-row", "جلو بازو"); if(r){ r.click(); setTimeout(function(){ var d = document.querySelector("details"); if(d) d.open = true;
      var el = document.getElementById("cx-det") || byText(".c-card.gold", "e1RM") ; if(el){ el.scrollIntoView({ block: "start" }); window.scrollBy(0, -80); } }, 600); } }, 900); },
    coach_plank: function(){ openAthlete("L1"); setTimeout(function(){ var r = byText(".c-list-row", "پلانک"); if(r){ r.click(); setTimeout(function(){ var d = document.querySelector("details"); if(d) d.open = true;
      var el = document.getElementById("cx-det") || byText(".c-card.gold", "زمان"); if(el){ el.scrollIntoView({ block: "start" }); window.scrollBy(0, -80); } }, 600); } }, 900); },
    // اپ ورزشکار: پیشرفت من
    athlete_prog: function(){ switchTab("plus"); setTimeout(function(){ plusOpenProgress(); setTimeout(function(){ var r = byText(".plus-row", "شنا"); if(r) r.click();
      setTimeout(function(){ var el = document.getElementById("pp-det"); if(el){ el.scrollIntoView({ block: "start" }); window.scrollBy(0, -120); } }, 600); }, 600); }, 300); },
    support_today: function(){},
    lam_ob0: function(){},
    plus_home: function(){ if(qs.get("store") === "bazaar") window.PELEH_STORE = "bazaar"; PLUS.status = null; switchTab("plus"); setTimeout(function(){ var el = document.getElementById("plus-sub-card"); if(el){ el.scrollIntoView({ block: "start" }); window.scrollBy(0, -90); } }, 1500); },
    settings_sub: function(){ if(qs.get("store") === "bazaar") window.PELEH_STORE = "bazaar"; switchTab("settings"); setTimeout(function(){ scrollToText(".section-title", "اشتراک", -10); }, 400); },
    push_card: function(){ window.isStandalonePWA = function(){ return true; }; renderAll(); },
    reminders: function(){ switchTab("settings"); setTimeout(function(){ scrollToText(".section-title", "زمان یادآوری"); }, 300); },
    lam_ob2: function(){ if(typeof pbObGo === "function") pbObGo(1); },
    lam_after: function(){ if(typeof pbObGo === "function"){ pbObGo(1); setTimeout(function(){ pbObSport("gym"); pbObGo(3); }, 200); } },
    lam_books: function(){ booksSubTab = "home"; switchTab("books"); },
    lam_book: function(){ openLamBook(); },
    lam_settings: function(){ switchTab("settings"); },
    support_more: function(){ switchTab("more"); },
    support_chat: function(){ openSupportChat(); },
    admin_drawer: function(){ currentView = typeof currentView !== "undefined" ? currentView : null; openUserDrawer("33333333-3333-4333-8333-333333333333"); },
    admin_thread: function(){ if(typeof messageUser === "function") messageUser("33333333-3333-4333-8333-333333333333"); }
  };
  var st = document.createElement("style");
  st.textContent = ".screen{animation:none!important;opacity:1!important;transform:none!important} .overlay,.sheet,.c-sheet-wrap,.c-sheet,.drawer,.drawer-overlay{transition:none!important;animation:none!important} html{scroll-behavior:auto!important}";
  document.addEventListener("DOMContentLoaded", function(){ document.head.appendChild(st); });
  window.addEventListener("load", function(){ setTimeout(function(){ try{ (A[act] || function(){})(); }catch(e){ console.error("act failed", e); } }, 1800); });
  window.addEventListener("error", function(e){ var d = document.createElement("div"); d.style.cssText = "position:fixed;bottom:0;left:0;right:0;background:#c00;color:#fff;font:12px monospace;z-index:99999;padding:4px;direction:ltr"; d.textContent = "JS ERROR: " + e.message + " @" + (e.filename || "").split("/").pop() + ":" + e.lineno; (document.body || document.documentElement).appendChild(d); });
})();
