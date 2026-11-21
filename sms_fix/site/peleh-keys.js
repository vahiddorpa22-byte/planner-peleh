/* =====================================================================================
   peleh-keys.js — رفتار صفحه‌کلید و موس برای ویندوز/دسکتاپ (اپ، پنل مربی، پنل ادمین)
   • Enter داخل یه فیلد متنی ← دکمه‌ی اصلی همون فرم/کارت/برگه زده می‌شه (اگه خود فیلد Enter رو هندل نکرده باشه)
   • Esc ← برگه/پنجره‌ی باز بسته می‌شه
   • ردیف‌ها و کارت‌های کلیک‌خور (div با onclick) با Tab قابل رسیدن و با Enter/Space قابل زدن‌اند
   • بعد از هر بار رسم دوباره‌ی صفحه، فوکوس و جای مکان‌نما (و انتخاب متن) سر جاش برمی‌گرده
     ← دیگه موقع تایپ یا کلیک، مکان‌نما از روی تکست‌باکس «نمی‌پره».
   استفاده: pelehWrapRender(fn) دور تابع رسم اصلی هر صفحه.
   ===================================================================================== */
(function(){
  const TEXTY = /^(text|search|email|tel|url|password|number|time|date)$/i;

  function focusKey(el){
    if(!el || el === document.body) return null;
    const tag = el.tagName;
    if(!/^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(tag)) return null;
    if(el.id) return { id: el.id };
    // بدون id: با ویژگی‌های پایدار + ترتیب پیداش می‌کنیم
    const sig = [tag, el.getAttribute("placeholder") || "", el.getAttribute("aria-label") || "", el.getAttribute("name") || "", el.getAttribute("onchange") || el.getAttribute("oninput") || el.getAttribute("onclick") || ""].join("|");
    const same = Array.from(document.querySelectorAll(tag)).filter(x => focusSig(x) === sig);
    return { sig, idx: same.indexOf(el), tag };
  }
  function focusSig(x){ return [x.tagName, x.getAttribute("placeholder") || "", x.getAttribute("aria-label") || "", x.getAttribute("name") || "", x.getAttribute("onchange") || x.getAttribute("oninput") || x.getAttribute("onclick") || ""].join("|"); }

  window.pelehCaptureFocus = function(){
    const el = document.activeElement;
    const key = focusKey(el);
    if(!key) return null;
    let selStart = null, selEnd = null;
    try{ if(el.tagName === "TEXTAREA" || (el.tagName === "INPUT" && TEXTY.test(el.type || "text"))){ selStart = el.selectionStart; selEnd = el.selectionEnd; } }catch(e){}
    return { key, selStart, selEnd, scrollTop: el.scrollTop, value: "value" in el ? el.value : null };
  };
  window.pelehRestoreFocus = function(state){
    if(!state) return;
    const k = state.key;
    let el = null;
    if(k.id) el = document.getElementById(k.id);
    else { const same = Array.from(document.querySelectorAll(k.tag)).filter(x => focusSig(x) === k.sig); el = same[k.idx] || null; }
    if(!el || el === document.activeElement || el.disabled || el.offsetParent === null) return;
    try{
      el.focus({ preventScroll: true });
      if(state.selStart != null && typeof el.setSelectionRange === "function" && el.value === state.value) el.setSelectionRange(state.selStart, state.selEnd);
      else if(state.selStart != null && typeof el.setSelectionRange === "function"){ const n = (el.value || "").length; el.setSelectionRange(n, n); }
      if(state.scrollTop) el.scrollTop = state.scrollTop;
    }catch(e){}
  };
  // ردیف‌های کلیک‌خور غیر-دکمه ← قابل فوکوس با Tab
  window.pelehMakeClickablesFocusable = function(root){
    try{
      (root || document).querySelectorAll("[onclick]:not(button):not(a):not(input):not(select):not(textarea):not(label):not([tabindex])").forEach(el => {
        if(el.closest("svg")) return;
        el.setAttribute("tabindex", "0");
        if(!el.getAttribute("role")) el.setAttribute("role", "button");
      });
    }catch(e){}
  };
  window.pelehWrapRender = function(fn){
    return function(){
      const st = window.pelehCaptureFocus();
      const r = fn.apply(this, arguments);
      window.pelehRestoreFocus(st);
      window.pelehMakeClickablesFocusable();
      return r;
    };
  };

  const PRIMARY = ".btn-primary:not([disabled]), .c-btn.primary:not([disabled]), .primary-btn:not([disabled]), .login-btn:not([disabled])";
  const SCOPES = ".sheet, .c-sheet, .drawer, .login-card, .onboard-wrap, .card, .c-card, .panel, .field-group, form";
  function closeTopLayer(){
    const ov = document.getElementById("overlay");
    if(ov && ov.classList.contains("show") && typeof window.closeOverlay === "function"){ window.closeOverlay(); return true; }
    const cs = document.getElementById("c_sheet_wrap");
    if(cs && cs.classList.contains("show") && typeof window.cCloseSheet === "function"){ window.cCloseSheet(); return true; }
    const dr = document.querySelector(".drawer-overlay.open .drawer-close");
    if(dr){ dr.click(); return true; }
    const coach = document.getElementById("coachOverlayWrap");
    if(coach && typeof window.endCoach === "function"){ window.endCoach(); return true; }
    return false;
  }
  document.addEventListener("keydown", function(e){
    if(e.defaultPrevented || e.isComposing || e.keyCode === 229) return;
    const t = e.target;
    if(e.key === "Escape"){
      if(closeTopLayer()) e.preventDefault();
      return;
    }
    if(e.key !== "Enter" && e.key !== " ") return;
    // کارت/ردیف کلیک‌خور با Enter یا Space
    if(t && t.getAttribute && t.getAttribute("role") === "button" && t.hasAttribute("onclick") && t.tagName !== "BUTTON"){
      e.preventDefault(); t.click(); return;
    }
    if(e.key !== "Enter" || !t || e.shiftKey || e.ctrlKey || e.altKey) return;
    if(t.tagName !== "INPUT" || !TEXTY.test(t.type || "text") || t.hasAttribute("data-no-enter")) return;
    const scope = t.closest(SCOPES) || document.body;
    let btn = scope.querySelector(PRIMARY);
    if(!btn && scope !== document.body){ const outer = scope.parentElement && scope.parentElement.closest(SCOPES); if(outer) btn = outer.querySelector(PRIMARY); }
    if(btn){ e.preventDefault(); btn.click(); }
  }, false);
})();
