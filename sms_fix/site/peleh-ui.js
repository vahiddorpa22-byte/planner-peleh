/* =====================================================================================
   peleh-ui.js — آیکون‌های خطی یکدست + توکن‌های تم (اپ، پنل مربی، پنل ادمین)
   • PI_PATHS: همه‌ی آیکون‌ها روی شبکه‌ی ۲۴×۲۴، خط ۱٫۸، سر و گوشه‌ی گرد — رنگ از currentColor.
   • pi(name, cls): رشته‌ی SVG برای استفاده‌ی مستقیم در قالب‌ها.
   • ایموجی‌ها «توکن معنایی»اند، نه گرافیک: داده‌ی کاربر (مثلاً آیکون عادت‌ها = "💧") دست نمی‌خوره،
     و لایه‌ی نمایش هر ایموجی شناخته‌شده رو با آیکون خطی معادلش رسم می‌کنه (piIconize).
     فقط گره‌های متنی عوض می‌شن — ویژگی‌ها (placeholder/aria-label/value) و متن textarea/input هرگز،
     تا منطق حفظ فوکوس peleh-keys.js و مقدار فیلدها سالم بمونه.
   • pelehTok('--gold') / pelehTokA('--gold', .5): خوندن توکن تم فعلی (برای canvas و تصاویر اشتراکی).
   ===================================================================================== */
(function(){
  const P = {
    today:'<rect x="4" y="5" width="16" height="15" rx="1.8"/><path d="M4 9.5h16M8 3.5v3M16 3.5v3M9 14.5l2 2 4-4"/>',
    calendar:'<rect x="4" y="5" width="16" height="15" rx="1.8"/><path d="M4 9.5h16M8 3.5v3M16 3.5v3"/>',
    book:'<path d="M3 6.5C5.5 5 8.5 5 12 7c3.5-2 6.5-2 9-.5V19c-2.5-1.5-5.5-1.5-9 .5-3.5-2-6.5-2-9-.5z"/><path d="M12 7v12.5"/>',
    books:'<rect x="4.5" y="4.5" width="4" height="15" rx="1"/><rect x="10" y="7" width="4" height="12.5" rx="1"/><path d="M15.6 8.4l3.4-.9 2.6 11.1-3.4.9z"/>',
    health:'<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/><path d="M7.5 12h2l1.5-2.5 2 4.5 1.5-2h2"/>',
    heart:'<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
    more:'<circle cx="5.5" cy="12" r="1.7" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.7" fill="currentColor" stroke="none"/><circle cx="18.5" cy="12" r="1.7" fill="currentColor" stroke="none"/>',
    bell:'<path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
    bellOff:'<path d="M6 16V11a6 6 0 0 1 9.5-4.9M18 11v5l1.5 2H8M10 20.5a2 2 0 0 0 4 0M4 4l16 16"/>',
    check:'<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    checkCircle:'<circle cx="12" cy="12" r="8.5"/><path d="M8 12.3l2.8 2.8L16.2 9.6"/>',
    x:'<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',
    plus:'<path d="M12 5v14M5 12h14"/>',
    minus:'<path d="M5 12h14"/>',
    chevL:'<path d="M14.5 6l-6 6 6 6"/>',
    chevR:'<path d="M9.5 6l6 6-6 6"/>',
    chevD:'<path d="M6 9.5l6 6 6-6"/>',
    chevU:'<path d="M6 14.5l6-6 6 6"/>',
    caretD:'<path d="M7 10l5 5 5-5z" fill="currentColor"/>',
    caretU:'<path d="M7 14l5-5 5 5z" fill="currentColor"/>',
    arrowFwd:'<path d="M19.5 12h-15M10 6.5L4.5 12l5.5 5.5"/>',
    arrowUp:'<path d="M12 19.5v-15M6.5 10L12 4.5 17.5 10"/>',
    arrowDown:'<path d="M12 4.5v15M6.5 14L12 19.5 17.5 14"/>',
    arrowUpRight:'<path d="M7 17L17 7M9 7h8v8"/>',
    arrowsH:'<path d="M4 12h16M8 8l-4 4 4 4M16 8l4 4-4 4"/>',
    play:'<path d="M8 5.5v13l10.5-6.5z"/>',
    star:'<path d="M12 3.5l2.6 5.3 5.8.8-4.2 4.1 1 5.8L12 16.8l-5.2 2.7 1-5.8L3.6 9.6l5.8-.8z"/>',
    flame:'<path d="M12 21c-3.5 0-6-2.4-6-5.6 0-3.4 2.6-5.2 3.6-8.4 1.6 1.4 2.2 3 2.2 4.4 1-.8 1.6-2 1.8-3.4 1.8 1.6 4.4 4 4.4 7.4 0 3.2-2.5 5.6-6 5.6z"/>',
    steps:'<path d="M4 20h4v-5h4v-5h4V5h4"/>',
    gift:'<rect x="4" y="9" width="16" height="11" rx="1.5"/><path d="M3 9h18M12 9v11M12 9C9.5 9 7.5 8 7.5 6.3 7.5 5 8.5 4.3 9.6 4.5 11 4.8 12 6.8 12 9zM12 9c2.5 0 4.5-1 4.5-2.7 0-1.3-1-2-2.1-1.8C13 4.8 12 6.8 12 9z"/>',
    gear:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    user:'<circle cx="12" cy="8.5" r="3.5"/><path d="M5 20c.7-3.6 3.5-5.5 7-5.5s6.3 1.9 7 5.5"/>',
    users:'<circle cx="9" cy="8.5" r="3.5"/><path d="M3 19.5c.6-3.3 3-5 6-5s5.4 1.7 6 5M16 5.5a3 3 0 0 1 0 6M18.5 14.8c1.4.7 2.3 2.1 2.5 4.7"/>',
    coach:'<circle cx="9" cy="8" r="3.2"/><path d="M3.5 19.5c.6-3.2 2.8-5 5.5-5 1.6 0 3 .6 4 1.7M15 12.5l2 2 4-4.5"/>',
    trophy:'<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H5v1.5A3 3 0 0 0 8 10.5M16 6h3v1.5a3 3 0 0 1-3 3M12 13v3.5M8.5 20h7M9.5 20l.5-3.5h4l.5 3.5"/>',
    medal:'<circle cx="12" cy="15" r="5"/><path d="M8.5 11.3L6 4h4l2 5 2-5h4l-2.5 7.3M11 13.8l1-.8v4"/>',
    crown:'<path d="M4 18h16M5 18L4 8l4.5 3.5L12 5.5l3.5 6L20 8l-1 10"/>',
    lock:'<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>',
    unlock:'<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V8a4 4 0 0 1 7.7-1.5"/>',
    alert:'<path d="M12 4l9 15.5H3z"/><path d="M12 10v4.5M12 17.2v.1"/>',
    bulb:'<path d="M9 17.5h6M10 20.5h4M12 3.5a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2V17h5v-.6c0-.8.4-1.5 1-2A6 6 0 0 0 12 3.5z"/>',
    sparkle:'<path d="M12 3.5l1.8 5.2 5.2 1.8-5.2 1.8L12 17.5l-1.8-5.2L5 10.5l5.2-1.8z"/><path d="M18.5 15.5l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z"/>',
    rocket:'<path d="M14.5 4.5c3-1 5-1 5-1s0 2-1 5l-6 6-4-4z"/><path d="M8.5 10.5l-3 .5-2 2.5 4 1M13.5 15.5l-.5 3-2.5 2-1-4"/><circle cx="15" cy="9" r="1.2"/>',
    target:'<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.8"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/>',
    pencil:'<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
    note:'<path d="M6 3.5h9l4 4v13H6z"/><path d="M15 3.5v4h4M9 12h7M9 15.5h7M9 9h3"/>',
    trash:'<path d="M4.5 6.5h15M9.5 6.5V4.5h5v2M6.5 6.5l.9 13a1.5 1.5 0 0 0 1.5 1.5h6.2a1.5 1.5 0 0 0 1.5-1.5l.9-13M10 10.5v6M14 10.5v6"/>',
    camera:'<path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2.5l1.5-2.5h5L16 7h2.5A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5z"/><circle cx="12" cy="12.8" r="3.3"/>',
    image:'<rect x="4" y="4.5" width="16" height="15" rx="2"/><circle cx="9" cy="9.5" r="1.6"/><path d="M4.5 17l5-5 4 4 2-2 4.5 4"/>',
    share:'<path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M12 3v12M7.5 7.5L12 3l4.5 4.5"/>',
    download:'<path d="M4 15v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4M12 3.5v12M7.5 11L12 15.5 16.5 11"/>',
    refresh:'<path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3"/><path d="M19.5 4v4.5H15"/>',
    repeat:'<path d="M17 3.5l3 3-3 3M4 11.5V10a3.5 3.5 0 0 1 3.5-3.5H20M7 20.5l-3-3 3-3M20 12.5V14a3.5 3.5 0 0 1-3.5 3.5H4"/>',
    timer:'<circle cx="12" cy="13.5" r="7"/><path d="M12 13.5V10M10 3.5h4M18.5 6.5l1.2-1.2"/>',
    hourglass:'<path d="M7 3.5h10M7 20.5h10M8 3.5c0 4 4 5.5 4 8.5s-4 4.5-4 8.5M16 3.5c0 4-4 5.5-4 8.5s4 4.5 4 8.5"/>',
    alarm:'<circle cx="12" cy="13" r="7"/><path d="M12 9.5V13l2.5 1.5M4.5 5.5l2.5-2M19.5 5.5l-2.5-2"/>',
    moon:'<path d="M19.5 14.5A8 8 0 0 1 9.5 4.5a8 8 0 1 0 10 10z"/>',
    sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6L6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4L6 18M18 6l1.4-1.4"/>',
    sunrise:'<path d="M7 17.5a5 5 0 0 1 10 0M3 17.5h18M5 21h14M12 3.5v5.5M9 6L12 3.5 15 6M4.2 12.2l1.4 1M19.8 12.2l-1.4 1"/>',
    sunset:'<path d="M7 17.5a5 5 0 0 1 10 0M3 17.5h18M5 21h14M12 3.5v5.5M9 6.5L12 9l3-2.5M4.2 12.2l1.4 1M19.8 12.2l-1.4 1"/>',
    chartUp:'<path d="M4 4.5v15.5h16M7.5 15l4-4.5 3 3L20 7.5M16 7.5h4v4"/>',
    chartDown:'<path d="M4 4.5v15.5h16M7.5 8.5l4 4.5 3-3L20 15.5M16 15.5h4v-4"/>',
    bars:'<path d="M4 20h16M7 20v-6M11 20V9M15 20v-8M19 20V5"/>',
    chat:'<path d="M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v9a1.5 1.5 0 0 1-1.5 1.5H10l-4.5 4V16A1.5 1.5 0 0 1 4 14.5z"/>',
    mail:'<rect x="3.5" y="5.5" width="17" height="13" rx="1.8"/><path d="M4 7l8 6 8-6"/>',
    inbox:'<path d="M3.5 13l2.5-7.5h12l2.5 7.5v5.5a1 1 0 0 1-1 1H4.5a1 1 0 0 1-1-1z"/><path d="M3.5 13h5l1.5 2.5h4l1.5-2.5h5"/>',
    gem:'<path d="M7 4h10l4 5.5L12 20.5 3 9.5z"/><path d="M3 9.5h18M9.5 4L8 9.5l4 11 4-11L14.5 4"/>',
    robot:'<rect x="5" y="8" width="14" height="11" rx="3"/><path d="M12 5v3M9.5 13v1M14.5 13v1M2.5 12.5v3M21.5 12.5v3"/><circle cx="12" cy="4" r="1"/>',
    salad:'<path d="M3.5 11.5h17a8.5 8.5 0 0 1-17 0z"/><path d="M12 11.5c0-4 2.5-6.5 6.5-7-.2 4-2.7 6.5-6.5 7zM12 11.5C11.5 8.5 9.5 7 6.5 7c.3 2.8 2.3 4.4 5.5 4.5z"/>',
    sprout:'<path d="M12 20.5V11M12 13c0-4 2.6-6.5 7-6.5 0 4.2-2.8 6.5-7 6.5zM12 11C12 7.5 9.8 5.5 5.5 5.5c0 3.7 2.4 5.5 6.5 5.5z"/>',
    zap:'<path d="M13 3L5 13.5h6L10 21l8-10.5h-6z"/>',
    dumbbell:'<path d="M6.5 8v8M17.5 8v8M4 10v4M20 10v4M6.5 12h11"/>',
    run:'<circle cx="14.5" cy="4.8" r="1.6"/><path d="M8.5 20.5l2.5-5 3 2.5v3M6 11.5l3-3.5h4l2.5 3.5h3M11 8l-1.5 7"/>',
    walk:'<circle cx="13" cy="4.5" r="1.6"/><path d="M10 21l2-6 3 3v3M8.5 12l2.5-4 3 2 2.5 1M11 8l-1 7"/>',
    bike:'<circle cx="6" cy="16" r="3.5"/><circle cx="18" cy="16" r="3.5"/><path d="M6 16l4-7.5h5L18 16M10 8.5L12 16M14 6.5h2.5"/>',
    swim:'<path d="M3 17.5c1.5 1 3 1 4.5 0s3-1 4.5 0 3 1 4.5 0 3-1 4.5 0M6 13.5l4-4.5 3 2.5 2.5-2"/><circle cx="17.5" cy="8.5" r="1.6"/>',
    lotus:'<path d="M12 20c-4 0-7-3-7-7 3 0 5 1.5 7 4 2-2.5 4-4 7-4 0 4-3 7-7 7zM12 17c-1.5-2-1.5-6 0-10 1.5 4 1.5 8 0 10z"/>',
    mountain:'<path d="M3 19.5l6.5-11 4 6.5 2.5-3.5 5 8z"/><path d="M7.6 11.7l1.9 1.1 1.7-1"/>',
    ball:'<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5l3.8 2.8-1.5 4.4h-4.6l-1.5-4.4zM12 3.5v4M15.8 10.3l4.4-1.4M14.3 14.7l2.6 3.7M9.7 14.7l-2.6 3.7M8.2 10.3L3.8 8.9"/>',
    music:'<path d="M9 18V5.5l10-2V16"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="16" r="2.5"/>',
    stretch:'<circle cx="12" cy="5" r="1.6"/><path d="M4 9.5l8 1.5 8-1.5M12 11v4.5L8.5 21M12 15.5l3.5 5.5"/>',
    belt:'<path d="M4 10h16v4H4zM10.5 10h3v4h-3zM10.5 14l-2 6.5M13.5 14l2 6.5"/>',
    medical:'<path d="M12 3.5l7 3v5.5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6.5z"/><path d="M12 9v6M9 12h6"/>',
    shieldCheck:'<path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z"/><path d="M9 12l2 2 4-4"/>',
    party:'<path d="M4 20.5l4.5-12 7 7z"/><path d="M14 4.5c.5 1.5.2 3-1 4M17.5 9.5c1.5-.6 3-.4 4 .5M15.5 3.5v.1M20.5 6.5v.1M19 13.5v.1M10 6.5l.5-.5"/>',
    dot:'<circle cx="12" cy="12" r="5" fill="currentColor" stroke="none"/>',
    circle:'<circle cx="12" cy="12" r="7.5"/>',
    square:'<rect x="5" y="5" width="14" height="14" rx="2.5"/>',
    wallet:'<path d="M4 7.5A2.5 2.5 0 0 1 6.5 5h11v3.5"/><rect x="4" y="8.5" width="16.5" height="11" rx="2"/><path d="M16 14h.1"/>',
    receipt:'<path d="M6 3.5h12v17l-2.5-1.5L13 20.5l-2.5-1.5L8 20.5 6 19z"/><path d="M9 8h6M9 11.5h6M9 15h3.5"/>',
    box:'<path d="M4 7.5l8-4 8 4v9l-8 4-8-4z"/><path d="M4 7.5l8 4 8-4M12 11.5v9"/>',
    key:'<circle cx="8" cy="15" r="4"/><path d="M11 12l8.5-8.5M16.5 6.5l2.5 2.5M14.5 8.5l2 2"/>',
    search:'<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>',
    folder:'<path d="M3.5 7A1.5 1.5 0 0 1 5 5.5h4.5l2 2.5H19a1.5 1.5 0 0 1 1.5 1.5v8.5A1.5 1.5 0 0 1 19 19.5H5A1.5 1.5 0 0 1 3.5 18z"/>',
    clipboard:'<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4.5V3h6v1.5M8.5 10h7M8.5 13.5h7M8.5 17h4"/>',
    file:'<path d="M6.5 3.5h7.5l4 4v13h-11.5z"/><path d="M14 3.5v4h4"/>',
    clip:'<path d="M8.5 12.5l6-6a3 3 0 0 1 4.2 4.2l-7.4 7.4a4.5 4.5 0 0 1-6.4-6.4l7.1-7.1"/>',
    tag:'<path d="M3.5 12.5V4.5h8l9 9-8 8z"/><circle cx="8" cy="9" r="1.4"/>',
    flag:'<path d="M5.5 21V4M5.5 4.5h11l-2 4 2 4h-11"/>',
    compass:'<circle cx="12" cy="12" r="8.5"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>',
    flask:'<path d="M9.5 3.5h5M10.5 3.5v6L5 19a1.2 1.2 0 0 0 1 1.5h12a1.2 1.2 0 0 0 1-1.5l-5.5-9.5v-6M7.5 15h9"/>',
    traffic:'<rect x="8" y="3" width="8" height="18" rx="3"/><circle cx="12" cy="7.5" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="12" cy="16.5" r="1.3"/>',
    film:'<rect x="3.5" y="5" width="17" height="14" rx="2"/><path d="M7.5 5v14M16.5 5v14M3.5 9.5h4M3.5 14.5h4M16.5 9.5h4M16.5 14.5h4"/>',
    save:'<path d="M5 4h11.5L20 7.5V19a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z"/><path d="M8 4v5h7V4M7.5 20v-6h9v6"/>',
    home:'<path d="M4 11l8-6.5 8 6.5V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1z"/>',
    hand:'<path d="M8 13V6.5a1.5 1.5 0 0 1 3 0V11M11 11V5a1.5 1.5 0 0 1 3 0v6M14 11V6.5a1.5 1.5 0 0 1 3 0V14a6.5 6.5 0 0 1-6.5 6.5c-2.4 0-3.8-1-5.2-2.8L3.6 15a1.4 1.4 0 0 1 2.2-1.8L8 15.5"/>',
    pointer:'<path d="M10 11V4.5a1.5 1.5 0 0 1 3 0V11l4.2.8a2 2 0 0 1 1.6 2.2l-.7 4.6a2.5 2.5 0 0 1-2.5 2.1H11a3 3 0 0 1-2.4-1.2L5.2 15a1.4 1.4 0 0 1 2.2-1.8L10 15.5"/>',
    thumb:'<path d="M7.5 10.5v9.5h-3v-9.5zM7.5 10.5l3.5-6.5a2 2 0 0 1 2.5 2.4L12.8 10h5.2a2 2 0 0 1 2 2.4l-1.4 6A2 2 0 0 1 16.6 20H7.5"/>',
    faceSmile:'<circle cx="12" cy="12" r="8.5"/><path d="M9 10v.5M15 10v.5M8.8 14.2c1.8 1.7 4.6 1.7 6.4 0"/>',
    faceSad:'<circle cx="12" cy="12" r="8.5"/><path d="M9 10v.5M15 10v.5M8.8 16.2c1.8-1.6 4.6-1.6 6.4 0"/>',
    faceNeutral:'<circle cx="12" cy="12" r="8.5"/><path d="M9 10v.5M15 10v.5M9 15.5h6"/>',
    faceHappy:'<circle cx="12" cy="12" r="8.5"/><path d="M9 9.8v.5M15 9.8v.5M8 13.5h8a4 4 0 0 1-8 0z"/>',
    faceStar:'<circle cx="12" cy="12" r="8.5"/><path d="M9 8.6l.6 1.1 1.2.2-.9.8.2 1.2L9 11.3l-1.1.6.2-1.2-.9-.8 1.2-.2zM15 8.6l.6 1.1 1.2.2-.9.8.2 1.2-1.1-.6-1.1.6.2-1.2-.9-.8 1.2-.2zM8 14h8a4 4 0 0 1-8 0z"/>',
    faceCalm:'<circle cx="12" cy="12" r="8.5"/><path d="M8 10.5c.6-.6 1.4-.6 2 0M14 10.5c.6-.6 1.4-.6 2 0M8.8 14.2c1.8 1.7 4.6 1.7 6.4 0"/>',
    faceTired:'<circle cx="12" cy="12" r="8.5"/><path d="M8 9.6l2 .9M16 9.6l-2 .9M8.8 16.2c1.8-1.6 4.6-1.6 6.4 0"/>',
    faceThink:'<circle cx="12" cy="12" r="8.5"/><path d="M9 10v.5M15 10v.5M9.5 15.6l5-1.2"/>',
    faceZip:'<circle cx="12" cy="12" r="8.5"/><path d="M9 10v.5M15 10v.5M8.5 15h7M10 14v2M12 14v2M14 14v2"/>',
    wind:'<path d="M3.5 9h11a2.5 2.5 0 1 0-2.5-2.5M3.5 13h15a2.5 2.5 0 1 1-2.5 2.5M3.5 17h7"/>',
    cup:'<path d="M5 8.5h11v6a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5z"/><path d="M16 10h1.5a2.5 2.5 0 0 1 0 5H16M8.5 3.5v2.5M12 3.5v2.5"/>',
    drink:'<path d="M7 7.5h10l-1.2 13H8.2zM6 7.5h12M12 7.5l2-4.5h3"/>',
    utensils:'<path d="M7 3.5v17M4.5 3.5v5a2.5 2.5 0 0 0 5 0v-5M17 20.5v-17c-2 1-3.5 3.5-3.5 7v3h3.5"/>',
    pizza:'<path d="M4 6.5c5-3 11-3 16 0L12 21z"/><path d="M5.5 9.5c4-2 9-2 13 0"/><circle cx="10" cy="12" r=".9" fill="currentColor"/><circle cx="14" cy="14.5" r=".9" fill="currentColor"/>',
    burger:'<path d="M4.5 11a7.5 6 0 0 1 15 0z"/><path d="M4 14h16M5 17h14a1.5 1.5 0 0 1-1.5 2h-11A1.5 1.5 0 0 1 5 17z"/>',
    bowl:'<path d="M3.5 11.5h17a8.5 8.5 0 0 1-17 0z"/><path d="M8.5 8c0-1 1-1.5 1-2.5M12 8c0-1 1-1.5 1-2.5M15.5 8c0-1 1-1.5 1-2.5"/>',
    drumstick:'<path d="M14.5 14.5c-3 1-6.5-1-7-4.5s2.5-6.5 6-6 5 4 4.5 6.5z"/><path d="M14.5 14.5l-2 2 .8 2.3a1.5 1.5 0 1 1-2 1.7l-.6-.3-.3-.6a1.5 1.5 0 1 1 1.7-2l2.3.8"/>',
    fish:'<path d="M3 12c3-4 8-5.5 12-3l5-3v12l-5-3c-4 2.5-9 1-12-3z"/><circle cx="7.5" cy="11.5" r=".8" fill="currentColor"/>',
    egg:'<path d="M12 3.5c3.5 0 6.5 6 6.5 10a6.5 6.5 0 0 1-13 0c0-4 3-10 6.5-10z"/>',
    sandwich:'<path d="M3.5 13.5L12 5l8.5 8.5z"/><path d="M3.5 13.5v3h17v-3M6 16.5v2h12v-2"/>',
    cake:'<path d="M4 20.5h16M5 20.5v-7a1.5 1.5 0 0 1 1.5-1.5h11a1.5 1.5 0 0 1 1.5 1.5v7M5 15.5c1.2 1 2.3 1 3.5 0s2.3-1 3.5 0 2.3 1 3.5 0 2.3-1 3.5 0M12 12V8.5"/><path d="M12 6.3c-.8 0-1.3-.6-1.1-1.4.2-.7.9-1.1 1.1-1.9.6.5 1.3 1.2 1.1 2.1-.1.7-.6 1.2-1.1 1.2z"/>',
    candy:'<rect x="7" y="7" width="10" height="10" rx="5"/><path d="M7.5 9.5L4 7l.5 4M16.5 14.5L20 17l-.5-4"/>',
    apple:'<path d="M12 7.5c-1.5-1-5-1.5-6.5 1.5-1.5 3 0 8 2.5 10.5 1.5 1.5 2.7 1 4 .5 1.3.5 2.5 1 4-.5 2.5-2.5 4-7.5 2.5-10.5-1.5-3-5-2.5-6.5-1.5zM12 7.5c0-2 1-3.5 2.5-4"/>',
    salt:'<path d="M8 9.5h8l-1 11h-6zM9 9.5L10 4h4l1 5.5M11 6.5h.1M13 6.5h.1"/>',
    smoke:'<rect x="3" y="14" width="18" height="3.5" rx=".8"/><path d="M16 14v3.5M17.5 11c0-1.5 1.5-1.5 1.5-3s-1.5-1.5-1.5-3M20.5 11c0-1.5 1.5-1.5 1.5-3"/>',
    phone:'<path d="M8 3h8a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM11 18h2"/>',
    phoneOff:'<path d="M8 3h8a1 1 0 0 1 1 1v12M17 20a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V7M11 18h2M4 4l16 16"/>',
    call:'<path d="M5 4.5h3.5l1.5 4-2 1.5a10 10 0 0 0 6 6l1.5-2 4 1.5V19a1.5 1.5 0 0 1-1.5 1.5A15.5 15.5 0 0 1 3.5 6 1.5 1.5 0 0 1 5 4.5z"/>',
    gamepad:'<path d="M7 7.5h10a4.5 4.5 0 0 1 4.3 5.8l-1.1 3.8a2.2 2.2 0 0 1-3.8.8L14.5 15.5h-5l-1.9 2.4a2.2 2.2 0 0 1-3.8-.8l-1.1-3.8A4.5 4.5 0 0 1 7 7.5z"/><path d="M8 10.5v3M6.5 12h3M15.5 11h.1M17 13h.1"/>',
    chair:'<path d="M7 3.5h10v9H7zM5.5 12.5h13v3h-13zM7 15.5V21M17 15.5V21"/>',
    bag:'<path d="M5 7.5h14l-1 13H6z"/><path d="M9 10V6.5a3 3 0 0 1 6 0V10"/>',
    scale:'<path d="M12 4v16.5M7 20.5h10M5 7.5h14M5 7.5l-2.5 6h5zM19 7.5l-2.5 6h5z"/>',
    ruler:'<path d="M3.5 16.5L16.5 3.5l4 4-13 13z"/><path d="M7 13l2 2M10 10l2 2M13 7l2 2"/>',
    graduation:'<path d="M2.5 9.5L12 5l9.5 4.5L12 14z"/><path d="M6.5 11.5v4.5c3 2.5 8 2.5 11 0v-4.5M21.5 9.5v5"/>',
    pill:'<path d="M10.5 20.5a5 5 0 0 1-7-7l6-6a5 5 0 0 1 7 7z"/><path d="M7.5 10.5l6 6"/>',
    broom:'<path d="M19.5 3.5l-7 7"/><path d="M12.5 10.5l1 1c.8.8.8 2 0 2.8L9 18.5c-1.5 1.5-4 2-5.5 2 0-1.5.5-4 2-5.5l4.2-4.5c.8-.8 2-.8 2.8 0zM6 17l2-2"/>',
    tooth:'<path d="M7.5 4c-2 0-3.5 1.5-3.5 4 0 2.5 1.5 4 2 6.5.5 3 1 6 2.5 6s1.5-4 3.5-4 2 4 3.5 4 2-3 2.5-6c.5-2.5 2-4 2-6.5 0-2.5-1.5-4-3.5-4-1.8 0-2.7 1-4.5 1S9.3 4 7.5 4z"/>',
    lifebuoy:'<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="3.5"/><path d="M6 6l3.5 3.5M14.5 14.5L18 18M18 6l-3.5 3.5M9.5 14.5L6 18"/>',
    link:'<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
    copy:'<rect x="8" y="8" width="12" height="12" rx="2.5"/><path d="M16 8V5.5A1.5 1.5 0 0 0 14.5 4h-9A1.5 1.5 0 0 0 4 5.5v9A1.5 1.5 0 0 0 5.5 16H8"/>',
    drop:'<path d="M12 3.5c3 4 6 7 6 10.5a6 6 0 0 1-12 0c0-3.5 3-6.5 6-10.5z"/>',
    rotation:'<path d="M20 5v5h-5M4 19v-5h5"/><path d="M5.5 9a7 7 0 0 1 12-2.5L20 10M4 14l2.5 3.5a7 7 0 0 0 12-2.5"/>',
    logout:'<path d="M14 4.5h4a1.5 1.5 0 0 1 1.5 1.5v12a1.5 1.5 0 0 1-1.5 1.5h-4M9.5 8L5.5 12l4 4M5.5 12H15"/>',
    eye:'<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
    info:'<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5M12 7.8v.1"/>',
    menu:'<path d="M4 7h16M4 12h16M4 17h16"/>',
  };
  window.PI_PATHS = P;
  window.pi = function(name, cls){
    const body = P[name] || P.circle;
    return `<svg class="pi pi-${name}${cls ? " " + cls : ""}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${body}</svg>`;
  };

  /* ایموجی ← [آیکون، کلاس رنگ اختیاری]. کلیدها بدون U+FE0F. */
  const E = {
    "📅":"calendar","🗓":"calendar","📆":"calendar","📖":"book","📔":"book","📘":"book","📕":"book","📗":"book","📚":"books",
    "❤":"heart:pi-danger","🤍":"heart","💛":"heart:pi-gold","💙":"heart","🔔":"bell","🔕":"bellOff","✓":"check","✔":"check","✅":"checkCircle:pi-ok",
    "✕":"x","✗":"x","❌":"x","✖":"x","➕":"plus","➖":"minus","▶":"play","▾":"chevD","▴":"chevU","▲":"caretU","▼":"caretD","➡":"arrowFwd","⬆":"arrowUp","⬇":"arrowDown","↗":"arrowUpRight","↔":"arrowsH",
    "⭐":"star:pi-gold","🌟":"star:pi-gold","🔥":"flame:pi-flame","🎁":"gift","⚙":"gear","👤":"user","👥":"users","🤝":"users","🧑‍🏫":"coach","👨‍🏫":"coach","👩‍🏫":"coach",
    "🏆":"trophy","🏅":"medal","🎖":"medal","🥇":"medal:pi-m1","🥈":"medal:pi-m2","🥉":"medal:pi-m3","👑":"crown","🔒":"lock","🔐":"lock","🔓":"unlock",
    "⚠":"alert:pi-warn","💡":"bulb","✨":"sparkle","✳":"sparkle","💅":"sparkle","🚀":"rocket","🎯":"target","✏":"pencil","✍":"pencil","📝":"note","🗑":"trash",
    "📷":"camera","📸":"camera","🖼":"image","📤":"share","📲":"phone","📱":"phone","📵":"phoneOff","📞":"call","↻":"refresh","🔄":"refresh","🔁":"repeat",
    "⏱":"timer","⏳":"hourglass","⌛":"hourglass","⏰":"alarm","🌙":"moon","🦉":"moon","☀":"sun","🌅":"sunrise","🌇":"sunset","📈":"chartUp","📉":"chartDown","📊":"bars",
    "💬":"chat","📧":"mail","📨":"inbox","✉":"mail","💎":"gem","🤖":"robot","🥗":"salad","🌱":"sprout","💪":"zap","⚡":"zap","🏋":"dumbbell","🏃":"run","🚶":"walk",
    "🚴":"bike","🏊":"swim","🧘":"lotus","⛰":"mountain","🧗":"mountain","🏔":"mountain","⚽":"ball","🏀":"ball","🏐":"ball","🎾":"ball","🥅":"ball","💃":"music",
    "🤸":"stretch","🥋":"belt","⚕":"medical","🎉":"party","🎊":"party","🔴":"dot:pi-danger","🟡":"dot:pi-warn","⚪":"dot:pi-muted","🟢":"dot:pi-ok","⬜":"square",
    "💰":"wallet","💸":"wallet","🧾":"receipt","📦":"box","🔑":"key","🔎":"search","🔍":"search","🗂":"folder","📁":"folder","📋":"clipboard","📄":"file","📎":"clip",
    "🏷":"tag","🚩":"flag","🧭":"compass","🧪":"flask","🚦":"traffic","🎬":"film","💾":"save","🏠":"home","👋":"hand","👆":"pointer","👉":"pointer","👌":"thumb","👏":"thumb","👍":"thumb","🙏":"heart",
    "🙂":"faceSmile","😊":"faceSmile","😞":"faceSad","😐":"faceNeutral","😄":"faceHappy","😀":"faceHappy","🤩":"faceStar","😌":"faceCalm","😣":"faceTired","🤔":"faceThink","🤐":"faceZip",
    "😮‍💨":"wind","💨":"wind","🌫":"wind","🌀":"wind","☕":"cup","🥛":"cup","🥤":"drink","🍽":"utensils","🍕":"pizza","🍔":"burger","🍟":"burger","🍝":"bowl","🍚":"bowl","🍲":"bowl","🥣":"bowl",
    "🍢":"drumstick","🍗":"drumstick","🐟":"fish","🥚":"egg","🥔":"egg","🥪":"sandwich","🎂":"cake","🧁":"cake","🍫":"candy","🍬":"candy","🍨":"candy","🍿":"candy","🥨":"candy","🍎":"apple",
    "🧂":"salt","🚬":"smoke","🎮":"gamepad","🪑":"chair","🛍":"bag","⚖":"scale","📏":"ruler","🎓":"graduation","💊":"pill","🧹":"broom","🦷":"tooth","🛟":"lifebuoy","🆘":"lifebuoy",
    "🌋":"flame","🔗":"link","💧":"drop","⚪️":"dot:pi-muted"
  };
  const MAP = {};
  Object.keys(E).forEach(k => { MAP[k.replace(/\uFE0F/g, "")] = E[k]; });
  window.PI_EMOJI = MAP;
  const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const keys = Object.keys(MAP).sort((a, b) => b.length - a.length);
  const RE_SRC = "(?:" + keys.map(k => Array.from(k).map(ch => esc(ch) + "\\uFE0F?").join("")).join("|") + ")(?:[\\u{1F3FB}-\\u{1F3FF}])?";
  const RE = new RegExp(RE_SRC, "gu");
  const RE_TEST = new RegExp(RE_SRC, "u");
  const norm = m => m.replace(/[\uFE0F\u{1F3FB}-\u{1F3FF}]/gu, "");
  function iconFor(m){
    const v = MAP[norm(m)]; if(!v) return null;
    const [name, cls] = v.split(":");
    return pi(name, cls);
  }
  /* آیکون یه عادت/فعالیت: ایموجی ذخیره‌شده ← آیکون خطی؛ ناشناخته ← دایره‌ی خنثی (نه ایموجی رنگی) */
  window.piEmoji = function(e, fallback){
    if(!e) return pi(fallback || "circle");
    const h = iconFor(String(e).trim());
    return h || pi(fallback || "circle");
  };
  window.pelehStripEmoji = function(s){
    return String(s == null ? "" : s).replace(RE, "").replace(/[ \u00A0]{2,}/g, " ").trim();
  };

  /* ---- لایه‌ی نمایش: ایموجی‌های متن صفحه ← آیکون خطی ---- */
  const SKIP = { SCRIPT:1, STYLE:1, TEXTAREA:1, NOSCRIPT:1, svg:1, SVG:1 };
  const STRIP = { OPTION:1, TITLE:1, OPTGROUP:1 };
  const tpl = document.createElement("template");
  const cache = {};
  function svgNode(m){
    const key = norm(m);
    if(!cache[key]){ tpl.innerHTML = iconFor(m) || ""; cache[key] = tpl.content.firstChild; }
    return cache[key] ? cache[key].cloneNode(true) : null;
  }
  function processText(node){
    const t = node.nodeValue;
    if(!t || !RE_TEST.test(t)) return;
    const p = node.parentNode;
    if(!p || p.nodeType !== 1) return;
    if(SKIP[p.nodeName] || p.closest("[data-raw],[contenteditable='true']")) return;
    if(STRIP[p.nodeName]){ node.nodeValue = pelehStripEmoji(t); return; }
    const frag = document.createDocumentFragment();
    let last = 0;
    t.replace(RE, (m, off) => {
      if(off > last) frag.appendChild(document.createTextNode(t.slice(last, off)));
      const s = svgNode(m); if(s) frag.appendChild(s);
      last = off + m.length;
      return m;
    });
    if(last < t.length) frag.appendChild(document.createTextNode(t.slice(last)));
    p.replaceChild(frag, node);
  }
  function walk(root){
    if(!root) return;
    if(root.nodeType === 3){ processText(root); return; }
    if(root.nodeType !== 1 && root.nodeType !== 11) return;
    if(root.nodeType === 1 && SKIP[root.nodeName]) return;
    if(!RE_TEST.test(root.textContent || "")) return;
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const list = []; let n;
    while((n = w.nextNode())) if(RE_TEST.test(n.nodeValue)) list.push(n);
    list.forEach(processText);
  }
  window.piIconize = walk;
  function start(){
    walk(document.body);
    if(document.title) document.title = pelehStripEmoji(document.title);
    new MutationObserver(recs => {
      for(const r of recs){
        if(r.type === "characterData") processText(r.target);
        else r.addedNodes.forEach(walk);
      }
    }).observe(document.body, { childList: true, subtree: true, characterData: true });
  }
  if(document.body) start(); else document.addEventListener("DOMContentLoaded", start);
  // پنجره‌های سیستمی (confirm/alert/prompt) SVG نمی‌گیرن ← ایموجی حذف می‌شه
  ["alert", "confirm", "prompt"].forEach(fn => {
    const orig = window[fn];
    if(typeof orig !== "function") return;
    window[fn] = function(msg, ...rest){ return orig.call(window, typeof msg === "string" ? pelehStripEmoji(msg) : msg, ...rest); };
  });

  /* ---- توکن‌های تم ---- */
  window.pelehTok = function(name, el){
    try{ return getComputedStyle(el || document.body || document.documentElement).getPropertyValue(name).trim(); }catch(e){ return ""; }
  };
  window.pelehTokA = function(name, a, el){
    const v = pelehTok(name, el);
    const m = /^#?([0-9a-f]{6})$/i.exec(v);
    if(!m) return v;
    const n = parseInt(m[1], 16);
    return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`;
  };
  window.pelehSyncThemeColor = function(){
    const c = pelehTok("--nav-bg") || pelehTok("--bg");
    const m = document.querySelector('meta[name="theme-color"]');
    if(m && c) m.setAttribute("content", c);
  };
  /* پنل مربی/ادمین: همون تمی که کاربر تو اپ انتخاب کرده (اپ فقط تم باز‌شده رو ذخیره می‌کنه) */
  window.pelehApplyStoredTheme = function(){
    let id = "goldnavy";
    try{ id = localStorage.getItem("pelehTheme") || "goldnavy"; }catch(e){}
    if(!/^[a-z]+$/.test(id)) id = "goldnavy";
    const apply = () => {
      document.body.className = document.body.className.replace(/\btheme-[a-z]+\b/g, "").trim();
      if(id !== "goldnavy") document.body.classList.add("theme-" + id);
      pelehSyncThemeColor();
    };
    if(document.body) apply(); else document.addEventListener("DOMContentLoaded", apply);
  };
})();
