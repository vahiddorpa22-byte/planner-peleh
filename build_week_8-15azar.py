"""Week 8–15 Azar 1405 — T6, T7, R15, T9, R16 (scripts approved 24 Aban by growth, Instagram and scriptwriter leads).
Footage: Magnific batch m30–m39 (downloaded 2026-11-15). Narrations: Sara, Eleven v4 (Claude-generated).

  python build_week_8-15azar.py t6 t7 r15 t9 r16
"""
import sys
from pathlib import Path

import reel_engine as E
from build_reel_trial_speedtest import CSS as BASE
from build_reel_r3_20aban import GOLD, CREAM, NAVY

W = E.W
M = W / "stock" / "magnific_2026-11"
V = lambda n: M / n
FA = "۰۱۲۳۴۵۶۷۸۹"
fa = lambda n: "".join(FA[int(c)] for c in str(n))

CSS = BASE + f"""
.dict {{ position:absolute; top:640px; left:80px; right:80px; text-align:center; }}
.dict .ex {{ display:inline-block; background:rgba(248,244,232,.96); color:{NAVY}; font-size:76px; font-weight:900; padding:26px 52px; border-radius:30px;
  box-shadow:0 18px 50px rgba(0,0,0,.55); }}
.dict .lab {{ display:block; margin:44px 0 16px; color:#E8DDC0; font-size:46px; font-weight:800; text-shadow:0 3px 14px rgba(0,0,0,.9); }}
.dict .tr {{ display:inline-block; background:{GOLD}; color:{NAVY}; font-size:72px; font-weight:900; padding:22px 48px; border-radius:30px; line-height:1.35;
  box-shadow:0 18px 50px rgba(0,0,0,.55); }}
.days {{ position:absolute; top:1000px; left:150px; right:150px; display:flex; gap:26px; justify-content:center; direction:rtl; }}
.days i {{ display:flex; align-items:center; justify-content:center; width:160px; height:160px; border-radius:28px; font-style:normal; font-size:44px; font-weight:900;
  background:rgba(242,234,211,.12); border:3px solid rgba(242,234,211,.35); color:#E8DDC0; }}
.days i.a {{ background:#F0B847; border-color:#F0B847; color:{NAVY}; }}
.half {{ position:absolute; top:1000px; left:110px; right:110px; height:90px; border-radius:45px; background:rgba(242,234,211,.15); border:3px solid rgba(242,234,211,.4);
  overflow:hidden; direction:rtl; }}
.half b {{ display:block; height:100%; background:#F0B847; }}
.g12 {{ position:absolute; top:980px; left:150px; right:150px; display:grid; grid-template-columns:repeat(6,1fr); gap:18px; direction:rtl; }}
.g12 i {{ display:block; height:150px; border-radius:10px 10px 4px 4px; background:rgba(242,234,211,.12); border:2px dashed rgba(242,234,211,.35); }}
.g12 i.a {{ border:none; }}
"""
COL = ["#C99A3C", "#7FA0E0", "#E0584A", "#F2EAD3", "#5FA37A", "#B07CC6", "#E89B4C", "#4C7BD9", "#C99A3C", "#7FA0E0", "#E0584A", "#5FA37A"]


def end(line, cta, at, cta_at):
    return [dict(html=f"<div class='end'><img src='{E.ICON}'><div class='l'>{line}</div></div>", anim="fadeup", dur=0.35, at=at),
            dict(html=f"<div class='end' style='top:1260px'><span class='c'>{cta}</span></div>", at=cta_at, anim="pop", dur=0.35)]


def bar(a, b=0, gaps=()):
    cells = "".join(f"<i class='{'' if k in gaps else ('a' if k < a else 'b' if k < a + b else '')}'></i>" for k in range(30))
    return f"<div class='bar30'>{cells}</div>"


def days(n):
    return "<div class='days'>" + "".join(f"<i class='{'a' if k < n else ''}'>روز {fa(k + 1)}</i>" for k in range(4)) + "</div>"


def g12(n):
    return "<div class='g12'>" + "".join(f"<i class='{'a' if k < n else ''}' style='{'background:' + COL[k] if k < n else ''}'></i>" for k in range(12)) + "</div>"


def steps(builder, seg, n, lo=0.15, hi=0.85, last_extra=None):
    out = []
    for k in range(n + 1):
        a = f"{seg}*{lo + (hi - lo) * k / n:.2f}" if k else seg
        d = dict(html=builder(k), at=a)
        if k < n:
            d["until"] = f"{seg}*{lo + (hi - lo) * (k + 1) / n:.2f}"
        out.append(d)
    return out


def dict_card(ex, tr=None):
    h = f"<div class='dict'><span class='ex'>«{ex}»</span>"
    if tr:
        h += f"<span class='lab'>ترجمه:</span><span class='tr'>{tr}</span>"
    return h + "</div>"


CFGS = {}

# ---------------------------------------------------------------- T6 · Sun 8 Azar 13:00
CFGS["t6"] = dict(
    out=W / "reel_trial_t6", name="peleh_T6_shorooesh",
    music=W / "reel_d012" / "music_white_clouds_leberch.mp3", music_from=70.0, tail=1.3, loop=0.0, lead=0.1,
    phrases=[("کتاب‌خوندن سخت نیست.", 2.0), ("شروعش سخته.", 1.6),
             ("برای همین، امشب فقط یه قانون داریم: | کتاب رو باز کن، و دو دقیقه بخون.", 5.6),
             ("اگه خواستی بس کنی، بس کن.", 2.4), ("ولی معمولاً نمی‌خوای.", 1.8),
             ("شب هشتمِ چالش سی شب کتابه. | فالو کن و از امشب بیا.", 4.4)],
    segs=[
        dict(at=0, kind="video", src=V("m31_man_sofa_reading_177804.mp4"), p=dict(ss=0.2, fx=0.42, fy=0.5, z=1.15, z0=1.0, z1=1.06),
             layers=[dict(html="<div class='hks'><div class='b' style='white-space:nowrap;font-size:80px'>سخت‌ترین بخش کتاب:<br><g style='font-size:104px'>۲ دقیقه‌ی اول</g></div></div>")]),
        dict(at="P2", kind="video", src=V("m36_hands_touch_book_2492925.mp4"), p=dict(ss=0.0, fx=0.5, fy=0.5, dark=0.6, blur=3, z0=1.0, z1=1.06),
             layers=[dict(html="<div class='top' style='top:560px'>قانون امشب:<br><g>کتاب رو باز کن</g></div>"),
                     dict(html="<div class='timer'><span class='t'>۲:۰۰</span><span class='s'>فقط دو دقیقه</span></div>", at="P2*0.5", anim="pop", dur=0.3)]),
        dict(at="P3", kind="video", src=V("m39_coffee_window_3709113.mp4"), p=dict(ss=2.0, fx=0.5, fy=0.5, dark=0.6, blur=4, z0=1.0, z1=1.05),
             layers=[dict(html="<div class='soft'>خواستی بس کنی؟<br><g>بس کن.</g></div>", anim="fadeup", dur=0.3, at="P3+0.05")]),
        dict(at="P4", kind="video", src=V("m31_man_sofa_reading_177804.mp4"), p=dict(ss=10.0, fx=0.6, fy=0.5, dark=0.6, blur=2, z0=1.05, z1=1.0),
             layers=[dict(html="<div class='soft'>ولی معمولاً<br><g>نمی‌خوای</g> 😉</div>", anim="pop", dur=0.3, at="P4+0.05")]),
        dict(at="P5", kind="video", src=V("m32_rain_night_window_3543939.mp4"), p=dict(ss=0.5, speed=0.4, fx=0.5, fy=0.5, dark=0.6, blur=6, z0=1.0, z1=1.06),
             layers=end("شب <g>۸</g> از ۳۰ · هنوز دیر نیست", "فالو کن · از امشب بیا", "P5", "P5*0.55")),
    ],
    sfx=[("pop", "P1", 0.35), ("whoosh", "P2", 0.25), ("pop", "P2*0.5", 0.35), ("soft", "P3+0.05", 0.3), ("pop", "P4+0.05", 0.35),
         ("whoosh", "P5", 0.25), ("soft", "P5*0.55", 0.4)],
)

# ---------------------------------------------------------------- T7 · Tue 10 Azar 21:00
CFGS["t7"] = dict(
    out=W / "reel_trial_t7", name="peleh_T7_tarjome",
    music=W / "reel_d010" / "music_leberch_reading.mp3", music_from=60.0, tail=1.3, loop=0.0, lead=0.1,
    phrases=[("از فردا می‌خونم.", 1.6), ("ترجمه: هیچ‌وقت.", 1.6), ("وقت ندارم.", 1.4),
             ("ترجمه: | الان ده دقیقه‌ست دارم اسکرول می‌کنم.", 3.4), ("حوصله‌ش رو ندارم.", 1.6),
             ("ترجمه: هنوز کتاب درستش رو پیدا نکردم.", 3.0), ("ترجمه‌ی امشب: | ده صفحه، قبل خواب.", 3.4),
             ("فالو کن، با هم می‌خونیم.", 1.8)],
    segs=[
        dict(at=0, kind="video", src=V("m34_sleepy_alarm_2852455.mp4"), p=dict(ss=2.0, fx=0.55, fy=0.45, dark=0.75, z0=1.0, z1=1.06),
             layers=[dict(html="<div class='top' style='top:330px'>فرهنگ لغت <g>بهونه‌ها</g> 📕</div>"),
                     dict(html=dict_card("از فردا می‌خونم"), until="P1"),
                     dict(html=dict_card("از فردا می‌خونم", "هیچ‌وقت"), at="P1", anim="pop", dur=0.3)]),
        dict(at="P2", kind="video", src=V("m30_couple_book_phone_2368240.mp4"), p=dict(ss=3.0, fx=0.36, fy=0.42, z=1.2, dark=0.7, z0=1.0, z1=1.05),
             layers=[dict(html=dict_card("وقت ندارم"), until="P3"),
                     dict(html=dict_card("وقت ندارم", "الان ۱۰ دقیقه‌ست<br>دارم اسکرول می‌کنم"), at="P3", anim="pop", dur=0.3)]),
        dict(at="P4", kind="video", src=V("m31_man_sofa_reading_177804.mp4"), p=dict(ss=0.0, fx=0.42, fy=0.5, z=1.1, dark=0.7, z0=1.06, z1=1.0),
             layers=[dict(html=dict_card("حوصله‌ش رو ندارم"), until="P5"),
                     dict(html=dict_card("حوصله‌ش رو ندارم", "هنوز کتاب درستش رو<br>پیدا نکردم"), at="P5", anim="pop", dur=0.3)]),
        dict(at="P6", kind="video", src=V("m35_girl_couch_reading_473257.mp4"), p=dict(ss=3.0, fx=0.62, fy=0.5, dark=0.6, blur=2, z0=1.0, z1=1.06),
             layers=[dict(html="<div class='dict'><span class='lab'>ترجمه‌ی امشب:</span><span class='tr'>۱۰ صفحه، قبل خواب 📖</span></div>",
                          at="P6+0.1", anim="pop", dur=0.3)]),
        dict(at="P7", kind="video", src=V("m32_rain_night_window_3543939.mp4"), p=dict(ss=2.0, speed=0.4, fx=0.5, fy=0.5, dark=0.6, blur=6, z0=1.0, z1=1.05),
             layers=end("چالش ۳۰ شب کتاب<br><g>با هم می‌خونیم</g>", "فالو کن 👇", "P7", "P7*0.4")),
    ],
    sfx=[("pop", "P1", 0.4), ("whoosh", "P2", 0.25), ("pop", "P3", 0.4), ("whoosh", "P4", 0.25), ("pop", "P5", 0.4),
         ("page", "P6", 0.3), ("pop", "P6+0.1", 0.35), ("soft", "P7*0.4", 0.4)],
)

# ---------------------------------------------------------------- R15 · Fri 13 Azar 17:00
CFGS["r15"] = dict(
    out=W / "reel_r15_13azar", name="peleh_R15_91_saat",
    music=W / "audio" / "music.mp3", music_from=60.0, tail=1.4, loop=0.0, lead=0.12,
    phrases=[("روزی پونزده دقیقه.", 2.0), ("یعنی سالی نود و یک ساعت.", 2.6),
             ("نود و یک ساعت، یعنی نزدیک چهار روز کامل، | فقط کتاب.", 4.8),
             ("این وقت رو نمی‌خواد از جایی بدزدی؛ | همون پونزده دقیقه‌ی قبل خوابه.", 4.6),
             ("امشب، پونزده دقیقه. | ساعتت رو تنظیم کن و فالو کن.", 4.4)],
    segs=[
        dict(at=0, kind="video", src=V("m33_tea_fireplace_58545.mp4"), p=dict(ss=4.0, fx=0.45, fy=0.5, z0=1.0, z1=1.07, dark=0.9),
             layers=[dict(html="<div class='hk13'><div class='a'>روزی</div><div class='b'>۱۵ دقیقه</div></div>")]),
        dict(at="P1", kind="video", src=V("m32_rain_night_window_3543939.mp4"), p=dict(ss=0.0, speed=0.4, fx=0.5, fy=0.5, dark=0.6, blur=5, z0=1.0, z1=1.08),
             layers=[dict(html="<div class='eq'><span>۱۵ دقیقه × ۳۶۵</span></div>", until="P1*0.45"),
                     dict(html="<div class='hk13' style='top:640px'><div class='a' style='font-size:90px'>سالی</div><div class='b'>۹۱ ساعت</div></div>",
                          at="P1*0.45", anim="pop", dur=0.3)]),
        dict(at="P2", kind="video", src=V("m31_man_sofa_reading_177804.mp4"), p=dict(ss=13.0, fx=0.6, fy=0.5, dark=0.55, blur=4, z0=1.0, z1=1.05),
             layers=[dict(html="<div class='top' style='top:620px'>۹۱ ساعت ≈ <g>۴ روز کامل</g></div>")]
                    + steps(days, "P2", 4, 0.1, 0.7)
                    + [dict(html="<div class='yr' style='top:1300px'><span>فقط کتاب 📖</span></div>", at="P2*0.75", anim="pop", dur=0.3)]),
        dict(at="P3", kind="video", src=V("m35_girl_couch_reading_473257.mp4"), p=dict(ss=5.0, fx=0.62, fy=0.5, dark=0.6, blur=2, z0=1.06, z1=1.0),
             layers=[dict(html="<div class='soft'>نمی‌خواد از جایی بدزدی</div>", until="P3*0.5"),
                     dict(html="<div class='soft'>همون <g>۱۵ دقیقه‌ی</g><br>قبل خواب</div>", at="P3*0.5", anim="fadeup", dur=0.3)]),
        dict(at="P4", kind="video", src=V("m34_sleepy_alarm_2852455.mp4"), p=dict(ss=12.0, fx=0.55, fy=0.45, dark=0.55, blur=5, z0=1.0, z1=1.05),
             layers=[dict(html="<div class='timer' style='top:560px'><span class='t'>۱۵:۰۰</span><span class='s'>امشب ⏰</span></div>", at="P4+0.05", anim="pop", dur=0.3),
                     dict(html="<div class='end' style='top:1260px'><span class='c'>ساعتت رو تنظیم کن و فالو کن</span></div>", at="P4*0.5", anim="pop", dur=0.35)]),
    ],
    sfx=[("whoosh", "P1", 0.25), ("pop", "P1*0.45", 0.45), ("page", "P2", 0.3)] + [("tick", f"P2*{0.1 + 0.15 * k:.2f}", 0.25) for k in range(1, 5)]
        + [("pop", "P2*0.75", 0.35), ("soft", "P3*0.5", 0.3), ("pop", "P4+0.05", 0.35), ("soft", "P4*0.5", 0.4)],
)

# ---------------------------------------------------------------- T9 · Sat 14 Azar 21:00
CFGS["t9"] = dict(
    out=W / "reel_trial_t9", name="peleh_T9_15daghighe",
    music=W / "reel_d012" / "music_white_clouds_leberch.mp3", music_from=20.0, tail=1.3, loop=0.0, lead=0.1,
    phrases=[("پونزده دقیقه‌ی قبل خوابت کجا می‌ره؟", 3.0), ("حساب کن: | سالی نود و یک ساعت.", 3.4),
             ("نود و یک ساعت، | یعنی نزدیک چهار روز کامل.", 4.4), ("اگه همون پونزده دقیقه کتاب باشه، | تقریباً ماهی یه کتاب.", 5.0),
             ("امشب امتحانش کن، | و فالو کن.", 2.4)],
    segs=[
        dict(at=0, kind="video", src=V("m30_couple_book_phone_2368240.mp4"), p=dict(ss=1.0, fx=0.36, fy=0.42, z=1.2, z0=1.0, z1=1.06),
             layers=[dict(html="<div class='hks'><div class='b'><g>۱۵ دقیقه‌ی</g> قبل خوابت<br>کجا می‌ره؟</div></div>")]),
        dict(at="P1", kind="video", src=V("m32_rain_night_window_3543939.mp4"), p=dict(ss=3.0, speed=0.4, fx=0.5, fy=0.5, dark=0.6, blur=5, z0=1.08, z1=1.0),
             layers=[dict(html="<div class='hk13' style='top:640px'><div class='a' style='font-size:90px'>سالی</div><div class='b'>۹۱ ساعت</div></div>",
                          at="P1*0.35", anim="pop", dur=0.3)]),
        dict(at="P2", kind="video", src=V("m38_man_reading_1711287.mp4"), p=dict(ss=2.0, fx=0.5, fy=0.45, z=1.3, dark=0.55, blur=3, z0=1.0, z1=1.05),
             layers=[dict(html="<div class='top' style='top:620px'>≈ <g>۴ روز کامل</g></div>")] + steps(days, "P2", 4, 0.1, 0.7)),
        dict(at="P3", kind="video", src=V("m36_hands_touch_book_2492925.mp4"), p=dict(ss=5.0, fx=0.5, fy=0.5, dark=0.5, blur=4, z0=1.0, z1=1.05),
             layers=[dict(html="<div class='top' style='top:620px'>اگه کتاب باشه:<br><g>ماهی یه کتاب</g></div>", at="P3*0.45", anim="fadeup", dur=0.3)]
                    + steps(g12, "P3", 12, 0.45, 0.95)),
        dict(at="P4", kind="video", src=V("m33_tea_fireplace_58545.mp4"), p=dict(ss=12.0, fx=0.45, fy=0.5, dark=0.55, blur=5, z0=1.0, z1=1.05),
             layers=end("امشب <g>امتحانش کن</g><br>چالش ۳۰ شب کتاب", "فالو کن 👇", "P4", "P4*0.45")),
    ],
    sfx=[("whoosh", "P1", 0.25), ("pop", "P1*0.35", 0.45), ("page", "P2", 0.3)] + [("tick", f"P2*{0.1 + 0.15 * k:.2f}", 0.25) for k in range(1, 5)]
        + [("soft", "P3*0.45", 0.3), ("whoosh", "P4", 0.25), ("soft", "P4*0.45", 0.4)],
)

# ---------------------------------------------------------------- R16 · Sun 15 Azar 17:00
L1 = steps(lambda k: f"<div class='pg' style='top:1000px'><span>صفحه‌ی <g>{fa(10 * k)}</g></span></div>", "P1", 15, 0.05, 0.9)
CFGS["r16"] = dict(
    out=W / "reel_r16_15azar", name="peleh_R16_nesfe_rah",
    music=W / "reel_d010" / "music_leberch_reading.mp3", music_from=150.0, tail=1.4, loop=0.0, lead=0.12,
    force_bounds=[1, 2, 3, 5, 7],
    phrases=[("شب پونزدهم. | نصف راه.", 3.4), ("اگه شبی ده صفحه خونده باشی، | با امشب می‌شه صد و پنجاه صفحه؛", 5.0),
             ("یعنی نصف یه کتاب سیصد صفحه‌ای.", 3.0), ("اگه وسطش چند شب جا موند، | زنجیره رو امشب دوباره وصل کن.", 5.2),
             ("پونزده شب دیگه، | یه کتاب کامل.", 3.2), ("اگه تازه رسیدی، از امشب شروع کن؛ | لینک تو بیو.", 3.8)],
    segs=[
        dict(at=0, kind="video", src=V("m35_girl_couch_reading_473257.mp4"), p=dict(ss=0.3, fx=0.62, fy=0.5, z0=1.0, z1=1.07, dark=0.8),
             layers=[dict(html="<div class='hk13'><div class='a'>شب ۱۵</div><div class='b'>نصف راه</div></div>"
                               + bar(15).replace("class='bar30'", "class='bar30' style='top:1180px'"))]),
        dict(at="P1", kind="video", src=V("m38_man_reading_1711287.mp4"), p=dict(ss=1.0, fx=0.5, fy=0.45, z=1.3, dark=0.6, blur=3, z0=1.0, z1=1.06),
             layers=[dict(html="<div class='top' style='top:560px'>شبی <g>۱۰ صفحه</g></div>")] + L1),
        dict(at="P2", kind="video", src=V("m36_hands_touch_book_2492925.mp4"), p=dict(ss=8.0, fx=0.5, fy=0.5, dark=0.55, blur=3, z0=1.0, z1=1.05),
             layers=[dict(html="<div class='top' style='top:640px'>نصف یه کتاب <g>۳۰۰ صفحه‌ای</g></div>"),
                     dict(html="<div class='half'><b style='width:50%'></b></div>", at="P2+0.2", anim="wipe", dur=0.6)]),
        dict(at="P3", kind="video", src=V("m39_coffee_window_3709113.mp4"), p=dict(ss=6.0, fx=0.5, fy=0.5, dark=0.55, blur=4, z0=1.05, z1=1.0),
             layers=[dict(html="<div class='top' style='top:560px'>جا موندی؟</div>" + bar(15, 0, gaps=(5, 6, 11)), until="P3*0.5"),
                     dict(html="<div class='top' style='top:560px'>امشب <g>دوباره وصلش کن</g> 🔗</div>" + bar(16), at="P3*0.5", anim="pop", dur=0.3)]),
        dict(at="P4", kind="video", src=V("m32_rain_night_window_3543939.mp4"), p=dict(ss=1.0, speed=0.4, fx=0.5, fy=0.5, dark=0.6, blur=6, z0=1.0, z1=1.06),
             layers=[dict(html="<div class='top' style='top:560px'>۱۵ شب دیگه</div>" + bar(15, 15)),
                     dict(html="<div class='yr' style='top:1200px'><span>یه کتاب کامل 📖</span></div>", at="P4*0.5", anim="pop", dur=0.3)]),
        dict(at="P5", kind="video", src=V("m33_tea_fireplace_58545.mp4"), p=dict(ss=6.0, fx=0.45, fy=0.5, dark=0.55, blur=5, z0=1.0, z1=1.05),
             layers=end("تازه رسیدی؟<br><g>از امشب</g> شروع کن", "لینک چالش تو بیو 👆", "P5", "P5*0.5")),
    ],
    sfx=[("pop", 0.2, 0.3), ("whoosh", "P1", 0.25)] + [("tick", f"P1*{0.05 + 0.85 * k / 15:.2f}", 0.15) for k in range(1, 16, 2)]
        + [("page", "P2", 0.3), ("whoosh", "P3", 0.25), ("pop", "P3*0.5", 0.4), ("whoosh", "P4", 0.25), ("pop", "P4*0.5", 0.4),
           ("whoosh", "P5", 0.25), ("soft", "P5*0.5", 0.4)],
)

NARR = {"t6": "reel_trial_t6", "t7": "reel_trial_t7", "r15": "reel_r15_13azar", "t9": "reel_trial_t9", "r16": "reel_r16_15azar"}

if __name__ == "__main__":
    import shutil
    from build_reel_r13_7azar import CSS as R13CSS  # .hk13 / .soft
    for key in sys.argv[1:] or list(CFGS):
        cfg = CFGS[key]
        shutil.rmtree(cfg["out"] / "_build", ignore_errors=True)
        E.build(cfg, W / NARR[key] / "narration.mp3", 1.0, R13CSS + CSS)
        print("BUILT", key)
