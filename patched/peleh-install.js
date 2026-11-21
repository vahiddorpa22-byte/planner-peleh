/* ===================== پله — صفحه‌ی «اضافه کردن به صفحه‌ی اصلی» (batch 2026-11-08) =====================
   تصمیم وحید (۱۷ آبان ۱۴۰۵): مثل فوتبال ۳۶۰، هر کی وب‌اپ رو تو تب مرورگر باز کنه، یه صفحه‌ی راهنمای نصب می‌بینه.
   • آیفون/آیپد: Share ← Add to Home Screen ← Add  (نوتیف آیفون فقط بعد از نصب و باز کردن از آیکون کار می‌کنه)
   • اندروید کروم: دکمه‌ی «نصب» (beforeinstallprompt)؛ اگه مرورگر اجازه نداد، مراحل ⋮ ← Add to Home screen
   • بقیه: راهنمای کوتاه
   هیچ‌وقت: داخل PWA نصب‌شده (display-mode: standalone / navigator.standalone)، داخل اپ اندروید پله (Capacitor/بازار).
   دفعه‌ی اول، بعد حداکثر هر ۳ روز یه بار، تا وقتی نصب بشه. «متوجه شدم!» می‌بندتش.
   این فایل به هیچ فایل دیگه‌ای وابسته نیست و زود (داخل head) لود می‌شه تا beforeinstallprompt از دست نره. */
(function(){
  var KEY_SEEN = "pelehInstallSeenAt", KEY_DONE = "pelehInstallDone";
  var EVERY_MS = 3 * 24 * 3600 * 1000;
  var deferred = null;

  function lsGet(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } }
  function lsSet(k, v){ try{ localStorage.setItem(k, v); }catch(e){} }
  function isStandalone(){
    try{ return window.matchMedia("(display-mode: standalone)").matches || window.matchMedia("(display-mode: fullscreen)").matches || window.navigator.standalone === true; }
    catch(e){ return window.navigator.standalone === true; }
  }
  function isNative(){
    try{ return !!(window.Capacitor && (typeof window.Capacitor.isNativePlatform === "function" ? window.Capacitor.isNativePlatform() : window.Capacitor.getPlatform && window.Capacitor.getPlatform() !== "web")); }
    catch(e){ return false; }
  }
  var ua = navigator.userAgent || "";
  function isIOS(){ return /iPad|iPhone|iPod/.test(ua) || (ua.indexOf("Macintosh") >= 0 && navigator.maxTouchPoints > 1); }
  function isAndroid(){ return /Android/i.test(ua); }
  function isInApp(){ return /Instagram|FBAN|FBAV|Telegram|; wv\)|Line\//i.test(ua); }

  // اندروید/کروم: رویداد نصب رو نگه دار تا دکمه‌ی «نصب» خودمون نشونش بده
  window.addEventListener("beforeinstallprompt", function(e){
    e.preventDefault();
    deferred = e;
    var b = document.getElementById("pi-install-btn");
    if(b) b.style.display = "";
  });
  window.addEventListener("appinstalled", function(){ lsSet(KEY_DONE, "1"); close(); });

  var ICON_SHARE = '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12"/><path d="M8 7l4-4 4 4"/><path d="M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1"/></svg>';
  var ICON_ADDHOME = '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="4"/><path d="M12 8.5v7M8.5 12h7"/></svg>';
  var ICON_ADD = '<span style="font:800 15px/1 system-ui,-apple-system,sans-serif;letter-spacing:.2px;direction:ltr;">Add</span>';
  var ICON_DOTS = '<svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor" aria-hidden="true"><circle cx="12" cy="5" r="1.9"/><circle cx="12" cy="12" r="1.9"/><circle cx="12" cy="19" r="1.9"/></svg>';
  var ICON_PHONE = '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M11 18.5h2"/></svg>';
  var ICON_CHECK = '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';

  function step(n, icon, en, fa){
    return '<li class="pi-step"><span class="pi-num">' + n + '</span><span class="pi-ic">' + icon + '</span>' +
      '<span class="pi-tx">' + (en ? '<b dir="ltr">' + en + '</b>' : '') + '<span>' + fa + '</span></span></li>';
  }
  function body(){
    if(isIOS()){
      var head = isInApp()
        ? '<p class="pi-note">الان پله داخل مرورگر یه برنامه‌ی دیگه (مثل اینستاگرام یا تلگرام) باز شده. اول از منوی همون برنامه «Open in Safari» رو بزن، بعد این سه مرحله:</p>' : '';
      return head + '<ol class="pi-steps">' +
        step("۱", ICON_SHARE, "Share", "انتخاب این گزینه از نوار پایین (در Safari)") +
        step("۲", ICON_ADDHOME, "Add to Home Screen", "انتخاب این گزینه از منوی ظاهر شده") +
        step("۳", ICON_ADD, "Add", "زدن روی این گزینه، بالای صفحه") + '</ol>' +
        '<p class="pi-note">بعد از نصب، پله رو فقط از آیکونش روی صفحه‌ی اصلی باز کن؛ یادآورها فقط اون‌جا کار می‌کنن.</p>';
    }
    if(isAndroid()){
      return '<button type="button" id="pi-install-btn" class="pi-install" ' + (deferred ? '' : 'style="display:none"') + '>نصب پله</button>' +
        '<ol class="pi-steps">' +
        step("۱", ICON_DOTS, "⋮", "منوی سه‌نقطه‌ی بالای مرورگر رو بزن") +
        step("۲", ICON_ADDHOME, "Add to Home screen / Install app", "این گزینه رو انتخاب کن") +
        step("۳", ICON_CHECK, "Install / Add", "تأیید کن؛ آیکون پله رو صفحه‌ی اصلی میاد") + '</ol>' +
        '<p class="pi-note">نسخه‌ی اندروید پله تو کافه‌بازار هم هست.</p>';
    }
    return '<ol class="pi-steps">' +
      step("۱", ICON_PHONE, "", "پله رو با گوشی باز کن (آیفون: Safari، اندروید: Chrome)") +
      step("۲", ICON_ADDHOME, "Add to Home Screen / Install", "از منوی مرورگر این گزینه رو بزن") +
      step("۳", ICON_CHECK, "", "از این به بعد پله رو از آیکونش باز کن") + '</ol>';
  }
  var CSS = '' +
    '#pi-wrap{position:fixed;inset:0;z-index:10050;background:#1B2A4A;color:#F2EAD3;font-family:Vazirmatn,Tahoma,sans-serif;direction:rtl;overflow-y:auto;-webkit-overflow-scrolling:touch;}' +
    '#pi-wrap *{box-sizing:border-box;}' +
    '.pi-in{max-width:440px;margin:0 auto;min-height:100%;padding:calc(28px + env(safe-area-inset-top)) 22px calc(24px + env(safe-area-inset-bottom));display:flex;flex-direction:column;align-items:center;text-align:center;}' +
    '.pi-logo{width:76px;height:76px;border-radius:20px;box-shadow:0 8px 24px rgba(0,0,0,.35);}' +
    '.pi-brand{font-weight:900;font-size:22px;margin:10px 0 2px;color:#C99A3C;}' +
    '.pi-title{font-weight:800;font-size:19px;line-height:1.8;margin:10px 0 4px;}' +
    '.pi-why{font-size:14px;line-height:1.9;color:rgba(242,234,211,.82);margin:0 0 18px;}' +
    '.pi-steps{list-style:none;margin:0 0 6px;padding:0;width:100%;display:flex;flex-direction:column;gap:10px;}' +
    '.pi-step{display:flex;align-items:center;gap:12px;background:rgba(242,234,211,.06);border:1px solid rgba(201,154,60,.35);border-radius:16px;padding:12px 14px;text-align:start;}' +
    '.pi-num{flex:none;width:28px;height:28px;border-radius:50%;background:#C99A3C;color:#1B2A4A;font-weight:900;display:grid;place-items:center;font-size:15px;}' +
    '.pi-ic{flex:none;width:44px;height:44px;border-radius:12px;background:rgba(242,234,211,.1);color:#F2EAD3;display:grid;place-items:center;}' +
    '.pi-tx{display:flex;flex-direction:column;gap:2px;min-width:0;font-size:14px;line-height:1.7;}' +
    '.pi-tx b{font-weight:800;color:#F2EAD3;text-align:right;unicode-bidi:isolate;}' +
    '.pi-tx span{color:rgba(242,234,211,.8);}' +
    '.pi-note{font-size:13px;line-height:1.9;color:rgba(242,234,211,.72);margin:10px 0 0;}' +
    '.pi-install{width:100%;min-height:52px;border:0;border-radius:16px;background:#F2EAD3;color:#1B2A4A;font:inherit;font-weight:900;font-size:17px;margin:0 0 14px;cursor:pointer;}' +
    '.pi-lam{position:relative;width:96px;height:96px;margin:16px auto 6px;}' +
    '.pi-lam img{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;}' +
    '.pi-ok{width:100%;min-height:54px;border:0;border-radius:16px;background:#C99A3C;color:#1B2A4A;font:inherit;font-weight:900;font-size:17px;margin-top:auto;cursor:pointer;}' +
    '.pi-ok:focus-visible,.pi-install:focus-visible{outline:3px solid #F2EAD3;outline-offset:3px;}';

  function lamImgs(){
    var v = "20261104", L = ["lam_shadow", "lam_body", "lam_face_E10_happy"];
    return '<div class="pi-lam" aria-hidden="true">' + L.map(function(n){ return '<img src="lam/webp256/' + n + '.webp?v=' + v + '" alt="" onerror="this.remove()">'; }).join("") + '</div>';
  }
  function close(){
    var w = document.getElementById("pi-wrap");
    if(w) w.remove();
    document.documentElement.style.overflow = "";
  }
  function open(force){
    if(document.getElementById("pi-wrap")) return;
    if(!force && !shouldShow()) return;
    lsSet(KEY_SEEN, String(Date.now()));
    if(!document.getElementById("pi-css")){ var st = document.createElement("style"); st.id = "pi-css"; st.textContent = CSS; document.head.appendChild(st); }
    var w = document.createElement("div");
    w.id = "pi-wrap";
    w.setAttribute("role", "dialog"); w.setAttribute("aria-modal", "true"); w.setAttribute("aria-labelledby", "pi-title");
    w.innerHTML = '<div class="pi-in">' +
      '<img class="pi-logo" src="icon-192.png" alt="پله">' +
      '<div class="pi-brand">پله</div>' +
      '<div class="pi-title" id="pi-title">وب اپلیکیشن پله را به صفحه اصلی موبایل خود اضافه کنید</div>' +
      '<p class="pi-why">برای اینکه یادآورهای روزانه برات بیاد و پله مثل یه اپ واقعی، بدون نوار آدرس، باز بشه.</p>' +
      body() + lamImgs() +
      '<button type="button" class="pi-ok" id="pi-ok">متوجه شدم!</button></div>';
    document.body.appendChild(w);
    document.documentElement.style.overflow = "hidden";
    document.getElementById("pi-ok").onclick = close;
    var ib = document.getElementById("pi-install-btn");
    if(ib) ib.onclick = function(){
      if(!deferred) return;
      var d = deferred; deferred = null;
      d.prompt();
      (d.userChoice || Promise.resolve({})).then(function(c){ if(c && c.outcome === "accepted"){ lsSet(KEY_DONE, "1"); close(); } else { ib.style.display = "none"; } }).catch(function(){});
    };
    setTimeout(function(){ var b = document.getElementById("pi-ok"); if(b) try{ b.focus({ preventScroll: true }); }catch(e){} }, 50);
    document.addEventListener("keydown", function esc(e){ if(e.key === "Escape"){ close(); document.removeEventListener("keydown", esc); } });
  }
  function shouldShow(){
    if(isStandalone() || isNative()) return false;
    if(lsGet(KEY_DONE) === "1" && !isIOS()) return false;   // آیفون رویداد نصب نداره؛ فقط با standalone می‌فهمیم
    var t = parseInt(lsGet(KEY_SEEN) || "0", 10) || 0;
    return !t || (Date.now() - t) >= EVERY_MS;
  }
  // برای دکمه‌ی «چطور نصبش کنم؟» یا تست: pelehShowInstallGuide(true)
  window.pelehShowInstallGuide = function(force){ open(!!force); };
  window.pelehIsInstalledPWA = isStandalone;
  function start(){ setTimeout(function(){ try{ open(false); }catch(e){} }, 1200); }
  if(document.readyState === "complete") start(); else window.addEventListener("load", start);
})();
