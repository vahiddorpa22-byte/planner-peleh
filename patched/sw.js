const CACHE_NAME = "peleh-v27"; // v27 (batch 2026-11-08): جزئیات پیشرفت حرکت زیر همون ردیف باز می‌شه + ست‌ها با واحد صریح (ست ۱: ۱۰ تکرار × ۷٫۵ کیلو) + نشان پیام تازه‌ی پشتیبانی — v25b (batch 2026-11-03، نسخه‌ی بتا؛ جدا از v25ِ اصلاح SMS — دومی که منتشر بشه peleh-v26): فایل‌های بتا (peleh-beta-gate.js، peleh-beta.js، peleh-beta.css) به shell اضافه شدن؛ نصب کش فایل‌به‌فایل (یه 404 دیگه کل کش آفلاین رو خالی نمی‌کنه). رفتار push و کلیک نوتیف بی‌تغییر — v24: پیام همگانی ادمین (بنر داخل اپ) — v23: رفع خطای داشبورد ادمین (تابع fa سراسری شد) — v22: فعال شدن سوییچ خودکار به سرور ایران (کلید anon سرور ایران در peleh-failover-config.js) — v21: رفع فاصله‌ی چپ و راست عکس پروفایل در نوار بالا (padding پیش‌فرض دکمه) — v20 (2.4.0): رفع حفره‌های امنیتی، به‌روز شدن لحظه‌ای مربی↔ورزشکار (peleh-live.js)، BMI، عکس پیشرفت، قالب مربی — v19: سوییچ خودکار به سرور ایران (peleh-failover.js) — // v18: انتخاب چیپ عادت = پر کردن فرم (روز/امتیاز قبل از ذخیره) — v17: گزارش منبع نصب (reportClientSource) — v15: ادغام مدیریت عادت‌ها + حرکت اختصاصی فوری مربی
// health.js قبلاً تو این لیست نبود، پس تو حالت آفلاین تب «سلامت» خراب می‌شد
// v10: plus.js اضافه شد. exercise-bank.json عمداً تو shell نیست (فقط کاربرهای سلامت پلاس لازمش دارن)؛
// اولین بار که گرفته بشه، همین Service Worker کشش می‌کنه و بعد آفلاین هم در دسترسه.
// v13: طراحی جدید — توکن‌های تم، استایل اپ و آیکون‌های خطی هم برای حالت آفلاین
const SHELL_FILES = ["/", "/index.html", "/peleh-theme.css", "/peleh-app.css", "/peleh-beta.css", "/peleh-ui.js", "/peleh-beta-gate.js", "/peleh-keys.js", "/app.js", "/books.js", "/health-catalog.js", "/health.js", "/native-notify.js", "/exercise-search.js", "/plus.js", "/plus-workout.js", "/peleh-beta.js", "/supabase.js", "/peleh-failover-config.js", "/peleh-failover.js", "/peleh-live.js", "/store-config.js", "/peleh-install.js", "/fonts/Vazirmatn-Variable.woff2", "/privacy.html", "/manifest.json", "/icon-180.png", "/icon-192.png", "/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    // قبلاً cache.addAll بود: اگه حتی یه فایل 404 می‌داد (مثلاً peleh-keys.js که روی سرور نیست) کل addAll
    // رد می‌شد و هیچ فایلی برای حالت آفلاین کش نمی‌شد. حالا هر فایل جدا (رفتار آنلاین هیچ فرقی نمی‌کنه).
    caches.open(CACHE_NAME).then((cache) =>
      Promise.allSettled(SHELL_FILES.map((f) => cache.add(new Request(f, { cache: "no-store" }))))
    ).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Network-first for navigation & our own files so updates show up quickly;
// falls back to cache when offline. Third-party requests (Supabase, fonts) pass through untouched.
// {cache:"no-store"} forces a real trip to the server, bypassing the browser's own HTTP cache —
// otherwise a deploy can still look stale even though this Service Worker tries the network first.
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return; // cache.put روی درخواست غیر GET خطا می‌ده
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  // صفحه‌های واسطه‌ی پرداخت/ورود همیشه مستقیم از شبکه
  if (/\/(pay-redirect|payment-return|auth-return)\.html$/.test(url.pathname)) return;

  event.respondWith(
    fetch(event.request, { cache: "no-store" })
      .then((res) => {
        // فقط پاسخ‌های سالم کش بشن — قبلاً یه 404/500 گذرا هم جای نسخه‌ی آفلاین سالم می‌نشست
        if (res && res.ok && res.type === "basic") {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() => caches.match(event.request, { ignoreSearch: event.request.mode === "navigate" }))
  );
});

/* ===================== Push Notifications ===================== */
// The push payload is plain JSON: {title, body, url, tag}. `url` is where notificationclick
// should take the person (defaults to the app root); `tag` collapses duplicate notifications
// of the same kind (e.g. only ever one "streak at risk" notification showing at a time).
self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch(e) { data = {title: "پله", body: event.data ? event.data.text() : ""}; }
  const title = data.title || "پله";
  const isTimerTag = (data.tag || "").startsWith("focus-timer");
  const options = {
    body: data.body || "",
    icon: "/icon-180.png",
    badge: "/icon-180.png",
    tag: data.tag || "peleh-general",
    renotify: true, // بدون این، دومین نوتیف با همون tag ممکنه بی‌صدا/بی‌ویبره جایگزین بشه
    data: { url: data.url || "/" },
    // پایان تایمر فوکوس باید محسوس‌تر از یه یادآوری معمولی باشه — صدای خودِ نوتیف رو
    // مرورگر/سیستم‌عامل کنترل می‌کنه (نمی‌شه بلندترش کرد)، ولی ویبره‌ی مشخص و باقی‌موندن
    // رو صفحه تا کاربر واقعاً ببینتش، از دستمون درمیاد.
    ...(isTimerTag ? { vibrate: [300, 100, 300, 100, 300], requireInteraction: true } : {}),
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
    })
  );
});
