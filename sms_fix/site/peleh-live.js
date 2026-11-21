/* =====================================================================================
   peleh-live.js — به‌روز شدن لحظه‌ای بین مربی و ورزشکار (v2.4.0)
   مشکل: بعد از اینکه مربی درخواست شاگرد رو قبول می‌کرد (یا برنامه منتشر می‌کرد)، ورزشکار باید از اپ خارج
   و دوباره وارد می‌شد تا ببینه. حالا سه لایه:
     ۱) Supabase Realtime روی جدول notifications (فقط ردیف‌های خود کاربر — RLS سرور همینو تضمین می‌کنه)
     ۲) برگشتن به اپ (visibilitychange / focus / resume اندروید / online) → یه بار تازه‌سازی
     ۳) اگه Realtime وصل نشد (مثلاً شبکه یا سرور پشتیبان)، هر ۴۵ ثانیه یه بار تا وقتی صفحه بازه
   استفاده: pelehLive.start(sb, userId, (notification|null) => {...})
   ===================================================================================== */
(function () {
  "use strict";
  var MIN_GAP_MS = 4000, POLL_MS = 45000;
  var state = { sb: null, uid: null, cb: null, ch: null, live: false, last: 0, timer: null, started: false, pending: null };

  function fire(n) {
    var now = Date.now();
    if (!n && now - state.last < MIN_GAP_MS) {               // تازه‌سازی‌های پشت‌سرهم یکی می‌شن
      if (!state.pending) state.pending = setTimeout(function () { state.pending = null; fire(null); }, MIN_GAP_MS);
      return;
    }
    state.last = now;
    try { state.cb && state.cb(n || null); } catch (e) { if (window.console) console.error("[peleh-live]", e); }
  }
  function visible() { return typeof document === "undefined" || document.visibilityState !== "hidden"; }

  function subscribe() {
    if (!state.sb || typeof state.sb.channel !== "function") return;
    try {
      if (state.ch) { try { state.sb.removeChannel(state.ch); } catch (e) {} }
      state.ch = state.sb.channel("peleh-live-" + state.uid)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: "user_id=eq." + state.uid },
          function (payload) { fire((payload && payload.new) || { kind: "unknown" }); })
        .subscribe(function (status) {
          state.live = status === "SUBSCRIBED";
          if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") state.live = false;
        });
    } catch (e) { state.live = false; }
  }

  function poll() {
    clearTimeout(state.timer);
    state.timer = setTimeout(function () {
      if (!state.live && visible() && (typeof navigator === "undefined" || navigator.onLine !== false)) fire(null);
      poll();
    }, POLL_MS);
  }

  function onBack() { if (visible()) { fire(null); if (!state.live) subscribe(); } }

  window.pelehLive = {
    start: function (sb, uid, cb) {
      if (!sb || !uid) return;
      state.cb = cb;
      if (state.started && state.uid === uid) return;
      state.sb = sb; state.uid = uid; state.started = true;
      subscribe();
      poll();
      if (!window.__pelehLiveListeners) {
        window.__pelehLiveListeners = true;
        document.addEventListener("visibilitychange", onBack);
        window.addEventListener("focus", onBack);
        window.addEventListener("online", onBack);
        document.addEventListener("resume", onBack);   // Capacitor/Cordova
        try {
          var App = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App;
          if (App && App.addListener) App.addListener("appStateChange", function (s) { if (s && s.isActive) onBack(); });
        } catch (e) {}
      }
    },
    stop: function () {
      clearTimeout(state.timer);
      if (state.ch && state.sb) { try { state.sb.removeChannel(state.ch); } catch (e) {} }
      state.ch = null; state.started = false; state.live = false;
    },
    isLive: function () { return state.live; }
  };
})();
