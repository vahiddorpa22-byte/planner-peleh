"""R8 · Sat 30 Aban 1405 (eve of the Azar challenge) · «یه کتاب، یه قدم» #3 · «قانون ۲۰ ثانیه»
(The Happiness Advantage, Shawn Achor: guitar in the closet → quit; guitar on a stand in the living room → 21 days straight), ~36 s.

  python build_reel_r8_30aban.py                                  -> reel_r8_30aban/peleh_R8_20saniye_visual_nomix.mp4
  python build_reel_r8_30aban.py --narration reel_r8_30aban/narration.mp3   -> final + _upload
"""
import argparse
from pathlib import Path

import reel_engine as E
from build_reel_r3_20aban import CSS as R3CSS, GOLD, CREAM, NAVY

W = E.W
M = W / "stock" / "magnific_2026-11"
PH = W / "stories_v2" / "assets"

CSS = R3CSS + f"""
.story {{ position:absolute; top:720px; left:90px; right:90px; text-align:center; }}
.story .em {{ font-size:190px; line-height:1; filter:drop-shadow(0 12px 30px rgba(0,0,0,.6)); }}
.story .where {{ display:inline-block; margin-top:30px; font-size:70px; font-weight:900; color:#FFF8EA; background:rgba(15,24,44,.82);
  padding:18px 46px; border-radius:30px; border:3px solid rgba(242,234,211,.35); }}
.story .res {{ display:block; width:fit-content; margin:40px auto 0; font-size:84px; font-weight:900; padding:20px 50px; border-radius:32px; }}
.story .res.bad {{ background:rgba(224,88,74,.92); color:#FFF8EA; }}
.story .res.good {{ background:{GOLD}; color:{NAVY}; box-shadow:0 16px 44px rgba(0,0,0,.5); }}
.d21 {{ position:absolute; top:1500px; left:120px; right:120px; display:grid; grid-template-columns:repeat(11,1fr); gap:10px; direction:rtl; }}
.d21 i {{ display:block; height:52px; border-radius:10px; background:{GOLD}; }}
.rule {{ position:absolute; top:760px; left:80px; right:80px; }}
.rule .row {{ display:flex; align-items:center; gap:26px; margin-bottom:50px; background:rgba(242,234,211,.96); border-radius:34px;
  padding:30px 40px; border:4px solid {GOLD}; box-shadow:0 20px 60px rgba(0,0,0,.45); }}
.rule .row.bad {{ background:rgba(15,24,44,.86); border-color:rgba(242,234,211,.35); }}
.rule .k {{ font-size:66px; font-weight:900; color:{NAVY}; }}
.rule .row.bad .k {{ color:#FFF8EA; }}
.rule .v {{ margin-right:auto; font-size:54px; font-weight:800; color:#9A6E1B; }}
.rule .row.bad .v {{ color:#F0B847; }}
.night {{ position:absolute; top:820px; left:90px; right:90px; }}
.night .row {{ display:flex; align-items:center; gap:28px; margin-bottom:44px; background:rgba(15,24,44,.84); border-radius:34px;
  padding:26px 40px; border:3px solid rgba(201,154,60,.6); }}
.night .em {{ font-size:96px; }}
.night .t {{ font-size:62px; font-weight:900; color:#FFF8EA; line-height:1.35; }}
.night .t small {{ display:block; font-size:44px; color:#F0B847; font-weight:800; }}
"""

SERIES = "<div class='series'><span>یه کتاب، یه قدم</span></div>"
HOOK = ("<div class='hk'><div class='a'><g>۲۰ ثانیه</g></div>"
        "<div class='b'>یه عادت رو می‌کُشه</div></div>")
TIMER_PANEL = ("<div class='timer' style='top:820px'><span class='t'>۰:۲۰</span>"
               "<span class='s'>قانون ۲۰ ثانیه</span></div>"
               "<div class='formula' style='top:1400px'><span style='direction:rtl;font-size:58px'>کتاب «مزیت شادمانی»</span>"
               "<small>شاون اکور</small></div>")


def days(n):
    return "<div class='d21'>" + "<i></i>" * n + "</div>"


CFG = dict(
    out=W / "reel_r8_30aban", name="peleh_R8_20saniye",
    music=W / "reel_d010" / "music_leberch_reading.mp3", music_from=40.0,
    tail=1.4, loop=0.0, lead=0.12,
    phrases=[
        ("بیست ثانیه.", 1.5),
        ("همین‌قدر فاصله | یه عادت رو می‌کُشه.", 2.6),
        ("این ایده‌ی کتاب «مزیت شادمانی»ه.", 2.8),
        ("نویسنده‌ش می‌خواست گیتار تمرین کنه. | ولی گیتار تو کمد بود. | بیست ثانیه دورتر. | تمرین نکرد.", 6.0),
        ("گیتار رو گذاشت وسط اتاق. | بیست و یک روز، | پشت هم تمرین کرد.", 4.6),
        ("قانونش ساده‌ست: | کار خوب رو بیست ثانیه نزدیک‌تر کن. | کار بد رو، | بیست ثانیه دورتر.", 5.6),
        ("امشب | کتابت رو بذار روی بالشت. | گوشی رو، | اون سر اتاق.", 4.6),
        ("فردا شب | چالش سی شب کتاب شروع می‌شه. | اسم کتابت رو بنویس.", 4.4),
    ],
    segs=[
        # 0: real action from frame 0 — hand reaching for the phone on the nightstand
        dict(at=0, kind="photo", src=PH / "phone_nightstand_hand_l28.jpg",
             p=dict(z0=1.0, z1=1.08, fx=0.55, fy=0.55, br=0.04),
             layers=[dict(html=HOOK),
                     dict(html="<div class='dot' style='left:517px;top:1110px'></div>", at=0.25, anim="pop", dur=0.35)]),
        dict(at="P1", kind="photo", src=PH / "phone_nightstand_hand_l28.jpg",
             p=dict(z0=1.35, z1=1.45, fx=0.55, fy=0.55, br=0.04),
             layers=[dict(html=HOOK)]),
        # 2: book credit + 20-second timer
        dict(at="P2", kind="photo", src=PH / "hourglass_8943578.jpg",
             p=dict(z0=1.12, z1=1.0, fx=0.5, fy=0.5, dark=0.8),
             layers=[dict(html=SERIES, fade=0.2),
                     dict(html=TIMER_PANEL, at="P2+0.15", anim="pop", dur=0.4)]),
        # 3: guitar in the closet → 0 days
        dict(at="P3", kind="photo", src=PH / "night_17805164.jpg",
             p=dict(z0=1.0, z1=1.08, fx=0.5, fy=0.5, dark=0.75, blur=8),
             layers=[dict(html="<div class='idea'><span>آزمایش نویسنده</span></div>"),
                     dict(html="<div class='story'><div class='em'>🎸</div><span class='where'>تو کمد · ۲۰ ثانیه دورتر</span></div>",
                          at="P3*0.25", anim="pop", dur=0.4),
                     dict(html="<div class='story' style='top:1340px'><span class='res bad'>تمرین نکرد</span></div>",
                          at="P3*0.8", anim="pop", dur=0.35)]),
        # 4: guitar in the middle of the room → 21 days straight
        dict(at="P4", kind="photo", src=PH / "candletea_134921905.jpg",
             p=dict(z0=1.08, z1=1.0, fx=0.5, fy=0.5, dark=0.7, blur=8),
             layers=[dict(html="<div class='idea'><span>آزمایش نویسنده</span></div>"
                          "<div class='story'><div class='em'>🎸</div><span class='where'>وسط اتاق</span></div>"),
                     dict(html="<div class='story' style='top:1170px'><span class='res good'>۲۱ روز پشت هم</span></div>",
                          at="P4*0.4", anim="pop", dur=0.4),
                     dict(html=days(7), at="P4*0.45", until="P4*0.6"),
                     dict(html=days(14), at="P4*0.6", until="P4*0.75"),
                     dict(html=days(21), at="P4*0.75")]),
        # 5: the rule
        dict(at="P5", kind="video", src=M / "m12_hands_open_book_5973869.mp4",
             p=dict(ss=4.8, fx=0.57, fy=0.25, z=1.15, dark=0.65, blur=10, z0=1.0, z1=1.06),
             layers=[dict(html="<div class='idea'><span>قانون</span></div><div class='ttl2'>۲۰ ثانیه</div>"),
                     dict(html="<div class='rule'><div class='row'><span class='k'>کار خوب</span><span class='v'>۲۰ ثانیه نزدیک‌تر</span></div></div>",
                          at="P5*0.2", anim="slide", dur=0.4, dx=260),
                     dict(html="<div class='rule' style='top:1040px'><div class='row bad'><span class='k'>کار بد</span><span class='v'>۲۰ ثانیه دورتر</span></div></div>",
                          at="P5*0.65", anim="slide", dur=0.4, dx=-260)]),
        # 6: tonight — book on the pillow, phone across the room
        dict(at="P6", kind="photo", src=PH / "darkread_404515042.jpg",
             p=dict(z0=1.0, z1=1.07, fx=0.5, fy=0.5, dark=0.7, blur=3),
             layers=[dict(html="<div class='ttl2' style='top:440px'><g>امشب</g></div>"),
                     dict(html="<div class='night'><div class='row'><span class='em'>📖</span><span class='t'>کتاب<small>روی بالشت</small></span></div></div>",
                          at="P6*0.15", anim="pop", dur=0.4),
                     dict(html="<div class='night' style='top:1130px'><div class='row'><span class='em'>📱</span><span class='t'>گوشی<small>اون سر اتاق</small></span></div></div>",
                          at="P6*0.6", anim="pop", dur=0.4)]),
        # 7: CTA — the challenge starts tomorrow night
        dict(at="P7", kind="video", src=M / "m13_book_pages_macro_2802905.mp4",
             p=dict(ss=2.0, speed=0.75, fx=0.5, fy=0.5, z=1.0, dark=0.7, blur=6, z0=1.0, z1=1.05),
             layers=[dict(html=f"<div class='end'><img src='{E.ICON}'>"
                          "<div class='l'><g>فردا شب</g><br>شروع چالش ۳۰ شب کتاب</div></div>", anim="fadeup", dur=0.4, at="P7"),
                     dict(html="<div class='end' style='top:1260px'><span class='c'>اسم کتابت رو بنویس 👇</span></div>",
                          at="P7*0.55", anim="pop", dur=0.35)]),
    ],
    sfx=[("pop", 0.25, 0.35), ("tick", "P1", 0.25), ("whoosh", "P2", 0.3), ("pop", "P2+0.15", 0.4),
         ("whoosh", "P3", 0.25), ("pop", "P3*0.25", 0.35), ("soft", "P3*0.8", 0.35),
         ("whoosh", "P4", 0.25), ("pop", "P4*0.4", 0.4), ("tick", "P4*0.6", 0.25), ("tick", "P4*0.75", 0.25),
         ("whoosh", "P5", 0.25), ("tick", "P5*0.2", 0.3), ("tick", "P5*0.65", 0.3),
         ("page", "P6", 0.3), ("pop", "P6*0.15", 0.35), ("pop", "P6*0.6", 0.35),
         ("whoosh", "P7", 0.25), ("soft", "P7*0.55", 0.45)],
)


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--narration")
    ap.add_argument("--tempo", type=float, default=1.0)
    ap.add_argument("--bounds")
    a = ap.parse_args()
    if a.bounds:
        CFG["force_bounds"] = [int(x) for x in a.bounds.split(",")]
    E.build(CFG, Path(a.narration) if a.narration else None, a.tempo, CSS)
