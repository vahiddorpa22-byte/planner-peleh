/* =====================================================================================
   peleh-failover.js — سوییچ خودکار بین Supabase (خارج) و سرور ایران
   -------------------------------------------------------------------------------------
   • عادی: همه‌چیز مثل قبل روی Supabase.
   • v2.4.0 (ممیزی R2): یه درخواست کند یا یه خطا دیگه اپ رو جابه‌جا نمی‌کنه. فقط وقتی سرور ایران خودش
     اعلام کنه «اصلی منم» (mode.json → primary: iran) اپ به اون سوییچ می‌کنه. بعد از ۳ شکست خواندن در
     ۲ دقیقه، همون لحظه mode.json پرسیده می‌شه (نه هر بار).
   • هیچ درخواست نوشتنی (POST/PATCH/…) و هیچ تابع (/functions/v1/ — AI، پرداخت) به سرور دیگه
     تکرار نمی‌شه؛ توابع محدودیت زمانی هم ندارن (AI و پرداخت ممکنه طول بکشن).
   • استثنا: تأیید پرداخت (verify-payment) اگه روی یه سرور «پیدا نشد» بده، یک‌بار روی سرور دیگه امتحان می‌شه
     (تراکنش ممکنه قبل از سوییچ روی سرور دیگه ساخته شده باشه).
   • برگشت به Supabase فقط وقتی انجام می‌شه که ادمین روی سرور ایران «برگشت» رو اعلام کنه
     (بعد از ادغام اطلاعات) — تا اطلاعات ثبت‌شده در زمان قطعی گم نشه.
   • چطور کار می‌کنه: createClient رو دور می‌زنه و یه fetch سفارشی بهش می‌ده؛ پس هیچ کدی
     از app.js / coach.js / admin.js عوض نمی‌شه. باید بعد از supabase.js لود بشه.
   • اگه کلید سرور ایران (fallbackKey) تنظیم نشده باشه، این فایل هیچ کاری نمی‌کنه (بی‌خطر).
   ===================================================================================== */
(function () {
  "use strict";
  if (typeof window === "undefined" || !window.supabase || typeof window.supabase.createClient !== "function") return;
  if (window.supabase.__pelehFailover) return;

  var CFG = window.PELEH_FAILOVER || {};
  var PRIMARY_URL = (CFG.primaryUrl || "https://gzcwtrqysjedwdfmhbzx.supabase.co").replace(/\/+$/, "");
  var FALLBACK_URL = (CFG.fallbackUrl || "https://api.pelehapp.ir").replace(/\/+$/, "");
  var FALLBACK_KEY = CFG.fallbackKey || "PASTE_SELF_HOSTED_ANON_KEY_HERE";
  var CLOUD_TIMEOUT_MS = CFG.cloudTimeoutMs || 10000;     // فقط برای خواندن‌ها؛ نوشتن و توابع محدودیت ندارن
  var FAIL_THRESHOLD = CFG.failThreshold || 3;            // چند شکست خواندن…
  var FAIL_WINDOW_MS = CFG.failWindowMs || 120000;        // …در این بازه، تا mode.json پرسیده بشه
  var FUNCTIONS_RE = /\/functions\/v1\//;
  var PAYMENT_VERIFY_RE = /\/functions\/v1\/(verify-payment|plus-verify-payment)(\?|$)/;
  var MODE_POLL_MS = CFG.modePollMs || 120000;            // هر چند وقت یه بار از سرور ایران «حالت» رو می‌پرسیم
  var STORE_KEY = "peleh_backend_v1";
  var BAD_STATUS = { 502: 1, 503: 1, 504: 1, 520: 1, 521: 1, 522: 1, 523: 1, 524: 1, 525: 1, 526: 1, 527: 1, 530: 1 };

  // بدون کلید معتبر سرور ایران، کاری نمی‌کنیم
  if (!FALLBACK_KEY || /PASTE_|^$/.test(FALLBACK_KEY)) return;

  var primaryKey = null;
  var clientRef = null, refreshing = null;
  var mode = "cloud";                                     // "cloud" | "iran"
  try { var saved = JSON.parse(window.localStorage.getItem(STORE_KEY) || "null"); if (saved && saved.mode === "iran") mode = "iran"; } catch (e) {}
  var lastModePoll = 0, modePollInflight = null, failures = [];
  function isIdempotent(input, init) { var m = toMethod(input, init); return m === "GET" || m === "HEAD"; }
  function noteFailure() {
    var now = Date.now();
    failures = failures.filter(function (t) { return now - t < FAIL_WINDOW_MS; });
    failures.push(now);
    return failures.length >= FAIL_THRESHOLD;
  }

  function setMode(m, why) {
    if (m === mode) return;
    mode = m;
    try { window.localStorage.setItem(STORE_KEY, JSON.stringify({ mode: m, at: Date.now(), why: why || "" })); } catch (e) {}
    try { window.dispatchEvent(new CustomEvent("peleh-backend-change", { detail: { mode: m, why: why || "" } })); } catch (e) {}
    if (window.console && console.info) console.info("[peleh-failover] backend →", m, why || "");
    if (m === "iran") setTimeout(refreshOnIran, 0);
  }

  function toUrl(input) { return typeof input === "string" ? input : (input && input.url) ? input.url : String(input); }
  function toMethod(input, init) { return ((init && init.method) || (input && input.method) || "GET").toUpperCase(); }

  // درخواست رو به سرور ایران برمی‌گردونه: آدرس + کلید anon عوض می‌شه، توکن کاربر دست‌نخورده می‌مونه
  function rewriteForIran(input, init) {
    var url = toUrl(input);
    if (url.indexOf(PRIMARY_URL) === 0) url = FALLBACK_URL + url.slice(PRIMARY_URL.length);
    var headers = new Headers((init && init.headers) || (input && input.headers) || undefined);
    if (primaryKey) {
      if (headers.get("apikey") === primaryKey) headers.set("apikey", FALLBACK_KEY);
      var auth = headers.get("Authorization");
      if (auth && auth === "Bearer " + primaryKey) headers.set("Authorization", "Bearer " + FALLBACK_KEY);
    }
    var next = {};
    if (init) for (var k in init) next[k] = init[k];
    next.headers = headers;
    if (!init && input && typeof input === "object" && input.method) { next.method = input.method; next.body = input.body; }
    return [url, next];
  }

  function withTimeout(url, init, ms) {
    var ctl = new AbortController(), timer = setTimeout(function () { ctl.abort(); }, ms);
    var outer = init && init.signal;
    if (outer) { if (outer.aborted) ctl.abort(); else outer.addEventListener("abort", function () { ctl.abort(); }); }
    var next = {}; for (var k in (init || {})) next[k] = init[k];
    next.signal = ctl.signal;
    return fetch(url, next).then(function (r) { clearTimeout(timer); return r; }, function (e) { clearTimeout(timer); throw e; });
  }

  // سرور ایران چی می‌گه؟ {"primary":"cloud"} یا {"primary":"iran"} — فقط ادمین عوضش می‌کنه
  function pollMode(force) {
    var now = Date.now();
    if (modePollInflight) return modePollInflight;
    if (!force && now - lastModePoll < MODE_POLL_MS) return Promise.resolve(null);
    lastModePoll = now;
    modePollInflight = withTimeout(FALLBACK_URL + "/_peleh/mode.json?t=" + now, { cache: "no-store" }, 3500)
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) {
        if (j && j.primary === "iran") setMode("iran", "declared-by-server");
        else if (j && j.primary === "cloud" && mode === "iran") setMode("cloud", "declared-by-server");
        return j;
      })
      .catch(function () { return null; })
      .then(function (j) { modePollInflight = null; return j; });
    return modePollInflight;
  }

  function hasUserJwt(init) {
    var a = new Headers((init && init.headers) || undefined).get("Authorization") || "";
    return a.indexOf("Bearer ") === 0 && a !== "Bearer " + primaryKey && a !== "Bearer " + FALLBACK_KEY;
  }
  function refreshOnIran() {
    if (!clientRef || !clientRef.auth || typeof clientRef.auth.refreshSession !== "function") return Promise.resolve();
    if (!refreshing) refreshing = Promise.resolve(clientRef.auth.refreshSession()).catch(function () {}).then(function () { refreshing = null; });
    return refreshing;
  }
  function withFreshToken(init) {
    // توکن تازه رو (اگه گرفته شد) جای توکن قدیمی بذار؛ نشست از localStorage خونده می‌شه
    var next = {}; for (var k in (init || {})) next[k] = init[k];
    var hs = new Headers((init && init.headers) || undefined);
    try {
      var raw = window.localStorage.getItem(clientRef && clientRef.auth && clientRef.auth.storageKey);
      var tok = raw && JSON.parse(raw).access_token;
      if (tok) hs.set("Authorization", "Bearer " + tok);
    } catch (e) {}
    next.headers = hs;
    return next;
  }

  function sendToIran(input, init) { var a = rewriteForIran(input, init); return fetch(a[0], a[1]); }

  function failoverFetch(input, init) {
    if (typeof input !== "string" && !(typeof URL !== "undefined" && input instanceof URL)) return fetch(input, init);
    var url = toUrl(input);
    if (url.indexOf(PRIMARY_URL) !== 0) return fetch(input, init);       // آدرس دیگه (مثلاً فایل عمومی)، دست نمی‌زنیم

    pollMode(false);                                                     // غیرمسدودکننده: حالت اعلام‌شده‌ی سرور
    var isFn = FUNCTIONS_RE.test(url), canReplay = !isFn && isIdempotent(input, init);

    if (mode === "iran") {
      return sendToIran(input, init).then(function (res) {
        if (BAD_STATUS[res.status] && canReplay) return tryCloud(input, init, res);
        if (res.status === 404 && PAYMENT_VERIFY_RE.test(url)) return fetch(url, init).catch(function () { return res; });
        // توکن کاربر با کلید سرور ایران نمی‌خونه → یک بار نشست رو از خود سرور ایران تازه کن
        if (res.status === 401 && url.indexOf("/auth/v1/") < 0 && hasUserJwt(init)) {
          return refreshOnIran().then(function () { return sendToIran(input, withFreshToken(init)); });
        }
        return res;
      }, function (err) { if (canReplay) return tryCloud(input, init, null, err); throw err; });
    }

    // حالت عادی: Supabase. فقط خواندن‌ها محدودیت زمانی دارن.
    var p = canReplay ? withTimeout(url, init, CLOUD_TIMEOUT_MS) : fetch(url, init);
    return p.then(function (res) {
      if (res.status === 404 && PAYMENT_VERIFY_RE.test(url)) {
        return sendToIran(input, init).then(function (r2) { return r2.ok ? r2 : res; }, function () { return res; });
      }
      if (BAD_STATUS[res.status] && canReplay) return afterCloudFailure(input, init, res);
      return res;
    }, function (err) {
      if (init && init.signal && init.signal.aborted) throw err;            // خود برنامه لغو کرده
      if (!canReplay) throw err;
      return afterCloudFailure(input, init, null, err);
    });
  }

  // فقط اگه شکست‌ها تکرار شده باشه و سرور ایران خودش اعلام کرده باشه «اصلی منم»، سوییچ و یک‌بار تکرار
  function afterCloudFailure(input, init, badRes, err) {
    if (!noteFailure()) { if (badRes) return badRes; return Promise.reject(err); }
    return pollMode(true).then(function () {
      if (mode === "iran") return sendToIran(input, init);
      if (badRes) return badRes;
      throw err;
    });
  }

  function tryCloud(input, init, badRes, err) {
    // حالت ایران، ولی سرور ایران جواب نداد → فقط همین خواندن از Supabase (حالت عوض نمی‌شه؛ فقط سرور اعلام می‌کنه)
    var url = toUrl(input);
    return withTimeout(url, init, CLOUD_TIMEOUT_MS).then(function (res) {
      if (BAD_STATUS[res.status]) { if (badRes) return badRes; throw err; }
      return res;
    }, function () { if (badRes) return badRes; throw err; });
  }

  // createClient رو دور بزن تا همه‌ی کلاینت‌های Supabase (اپ، مربی، ادمین) از این fetch استفاده کنن
  var orig = window.supabase.createClient;
  window.supabase.createClient = function (url, key, opts) {
    if (String(url || "").replace(/\/+$/, "") !== PRIMARY_URL) return orig.apply(this, arguments);
    primaryKey = key;
    var o = Object.assign({}, opts || {});
    o.global = Object.assign({}, o.global || {});
    o.global.fetch = failoverFetch;
    var client = orig.call(this, url, key, o);
    if (!clientRef) clientRef = client;
    return client;
  };
  window.supabase.__pelehFailover = true;
  window.pelehBackend = {
    mode: function () { return mode; },
    force: function (m) { setMode(m === "iran" ? "iran" : "cloud", "manual"); },
    refresh: function () { return pollMode(true); }
  };
  // یه بار موقع شروع صفحه، اگه سرور ایران اعلام «اصلی هستم» کرده باشه همون‌جا بفهمیم
  pollMode(true);
})();
