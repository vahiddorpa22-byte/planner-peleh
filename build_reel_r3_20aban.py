"""R3 · Wed 20 Aban 1405 · «روزی ۱٪ بهتر» (Atomic Habits → number → 2-minute step tonight), ~37-40 s.

  python build_reel_r3_20aban.py                         -> reel_r3_20aban/peleh_R3_roozi_1darsad_visual_nomix.mp4
  python build_reel_r3_20aban.py --narration reel_r3_20aban/narration.mp3
                                                         -> peleh_R3_roozi_1darsad.mp4 + _upload.mp4 (beats re-timed to the speech)
  options: --tempo 1.04 (speed the voice a little)  --bounds 0,2,3,6,8,11,16 (force phrase cuts after these speech chunks)
"""
import argparse
from pathlib import Path

import reel_engine as E
from build_reels_7_8aban import BASE_CSS

W = E.W
M = W / "stock" / "magnific_2026-11"
PH = W / "stories_v2" / "assets"
GOLD, CREAM, NAVY = "#C99A3C", "#F2EAD3", "#1B2A4A"

CSS = BASE_CSS + f"""
.hk {{ position:absolute; top:560px; left:0; right:0; text-align:center; color:#FFF8EA; font-weight:900;
  padding:90px 20px; line-height:1.3; text-shadow:0 4px 18px rgba(0,0,0,.85),0 0 3px rgba(0,0,0,.9);
  background:linear-gradient(180deg,rgba(10,16,30,0) 0%,rgba(10,16,30,.62) 22%,rgba(10,16,30,.62) 78%,rgba(10,16,30,0) 100%); }}
.hk .a {{ font-size:118px; }} .hk .b {{ font-size:104px; }}
.dot {{ position:absolute; width:46px; height:46px; border-radius:50%; background:#F0B847;
  box-shadow:0 0 0 10px rgba(240,184,71,.28),0 0 40px rgba(240,184,71,.8); }}
.panel {{ position:absolute; top:520px; left:70px; right:70px; height:900px; border-radius:40px;
  background:rgba(20,32,58,.94); border:3px solid rgba(201,154,60,.6); box-shadow:0 30px 80px rgba(0,0,0,.55); }}
.panel .ttl {{ position:absolute; top:46px; right:56px; left:56px; color:{CREAM}; font-size:50px; font-weight:800; }}
.panel .ttl small {{ display:block; font-size:34px; font-weight:600; color:#BFB394; margin-top:6px; }}
.axis {{ position:absolute; left:110px; right:70px; top:250px; bottom:150px; border-left:4px solid rgba(242,234,211,.45);
  border-bottom:4px solid rgba(242,234,211,.45); }}
.xl {{ position:absolute; bottom:80px; font-size:36px; font-weight:700; color:#BFB394; }}
.formula {{ position:absolute; top:1460px; left:0; right:0; text-align:center; }}
.formula span {{ display:inline-block; direction:ltr; background:rgba(27,42,74,.92); color:{CREAM}; font-size:76px;
  font-weight:800; padding:22px 46px; border-radius:28px; border:3px solid {GOLD}; }}
.formula sup {{ font-size:44px; }}
.formula small {{ display:block; margin-top:14px; font-size:36px; color:#E8DDC0; font-weight:600; direction:rtl;
  text-shadow:0 2px 10px rgba(0,0,0,.9); }}
.big37 {{ position:absolute; top:800px; left:210px; color:#F0B847; font-size:150px; font-weight:900;
  text-shadow:0 6px 24px rgba(0,0,0,.6); direction:ltr; }}
.chip {{ position:absolute; top:1640px; left:0; right:0; text-align:center; }}
.chip span {{ display:inline-block; background:rgba(242,234,211,.95); color:{NAVY}; font-size:40px; font-weight:800;
  padding:14px 34px; border-radius:40px; }}
.idea {{ position:absolute; top:330px; left:0; right:0; text-align:center; }}
.idea span {{ display:inline-block; background:{GOLD}; color:{NAVY}; font-size:46px; font-weight:900; padding:12px 36px;
  border-radius:36px; }}
.ttl2 {{ position:absolute; top:440px; left:60px; right:60px; text-align:center; color:#FFF8EA; font-size:92px;
  font-weight:900; line-height:1.3; text-shadow:0 4px 20px rgba(0,0,0,.9); }}
.cards {{ position:absolute; top:760px; left:90px; right:90px; }}
.cd {{ border-radius:32px; padding:34px 44px; margin-bottom:40px; font-size:60px; font-weight:800; line-height:1.4; }}
.cd small {{ display:block; font-size:38px; font-weight:600; margin-top:8px; }}
.cd.goal {{ background:rgba(20,28,46,.82); color:#B9B2A0; border:3px dashed rgba(242,234,211,.35); }}
.cd.sys {{ background:rgba(242,234,211,.96); color:{NAVY}; border:4px solid {GOLD}; box-shadow:0 20px 60px rgba(0,0,0,.5); }}
.cd.sys b {{ color:#9A6E1B; }}
.timer {{ position:absolute; top:760px; left:0; right:0; text-align:center; }}
.timer .t {{ display:inline-block; direction:ltr; font-size:210px; font-weight:900; color:#FFF8EA; background:rgba(15,24,44,.78);
  padding:10px 70px; border-radius:50px; border:5px solid {GOLD}; text-shadow:0 6px 24px rgba(0,0,0,.6); }}
.timer .s {{ display:block; margin-top:34px; font-size:64px; font-weight:800; color:#FFF8EA; text-shadow:0 4px 18px rgba(0,0,0,.9); }}
.strike {{ position:absolute; top:760px; left:90px; right:90px; text-align:center; }}
.strike .old {{ display:inline-block; font-size:66px; font-weight:800; color:#D8D0BC; background:rgba(15,24,44,.78);
  padding:22px 40px; border-radius:26px; position:relative; }}
.strike .old.x:after {{ content:''; position:absolute; left:24px; right:24px; top:50%; height:7px; background:#E0584A;
  border-radius:4px; transform:rotate(-4deg); }}
.strike .new {{ display:block; margin:44px auto 0; font-size:78px; font-weight:900; color:{NAVY}; background:rgba(242,234,211,.97);
  padding:30px 40px; border-radius:30px; border:4px solid {GOLD}; line-height:1.4; box-shadow:0 20px 60px rgba(0,0,0,.5); }}
.end {{ position:absolute; top:600px; left:80px; right:80px; text-align:center; }}
.end img {{ width:132px; height:132px; border-radius:30px; border:3px solid {GOLD}; }}
.end .l {{ margin-top:40px; background:rgba(27,42,74,.92); color:{CREAM}; font-size:70px; font-weight:900; line-height:1.5;
  padding:36px 30px; border-radius:32px; }}
.end .c {{ margin-top:40px; display:inline-block; background:{GOLD}; color:{NAVY}; font-size:54px; font-weight:900;
  padding:20px 44px; border-radius:30px; }}
"""

SERIES = "<div class='series'><span>یه کتاب، یه قدم</span></div>"
HOOK = ("<div class='hk'><div class='a'>روزی <g>۱٪</g> بهتر</div>"
        "<div class='b'>← <g>۳۷ برابر</g></div></div>")

# growth curve: y = 1.01^x for x in 0..365, drawn as SVG inside the panel's axis box (box 800x500 px)
pts = []
for i in range(0, 366, 5):
    v = 1.01 ** i
    pts.append(f"{i / 365 * 790 + 4:.1f},{496 - (v - 1) / 36.8 * 470:.1f}")
CURVE = ("<div class='panel' style='background:transparent;border-color:transparent;box-shadow:none'>"
         "<svg style='position:absolute;left:114px;top:254px' width='800' height='500' viewBox='0 0 800 500'>"
         f"<polyline points='{' '.join(pts)}' fill='none' stroke='#F0B847' stroke-width='12' stroke-linecap='round' stroke-linejoin='round'/>"
         "</svg></div>")
PANEL = ("<div class='panel'><div class='ttl'>اگه هر روز فقط ۱٪ بهتر بشی<small>یک سال = ۳۶۵ روز</small></div>"
         "<div class='axis'></div><div class='xl' style='right:56px'>روز ۳۶۵</div><div class='xl' style='left:100px'>روز ۱</div></div>")
FORMULA = ("<div class='formula'><span>۱٫۰۱<sup>۳۶۵</sup> ≈ ۳۷</span>"
           "<small>حساب ساده‌ی کتاب «عادت‌های اتمی» · جیمز کلیر</small></div>")

CFG = dict(
    out=W / "reel_r3_20aban", name="peleh_R3_roozi_1darsad",
    music=W / "reel_d012" / "music_white_clouds_leberch.mp3", music_from=6.0,
    tail=1.4, loop=0.0, lead=0.12,
    phrases=[
        ("روزی یه درصد بهتر.", 1.9),
        ("یه سال بعد؟ | سی و هفت برابر.", 2.9),
        ("این حساب ساده‌ی کتاب «عادت‌های اتمی»ه.", 3.4),
        ("اولین ایده: | هدف‌ها مسیر رو نشون می‌دن، | ولی سیستم‌ها تو رو می‌برن.", 6.0),
        ("دومی: | هر عادتی رو اون‌قدر کوچیک کن | که دو دقیقه‌ای شروع بشه.", 5.6),
        ("سومی: | به جای «می‌خوام کتاب بخونم»، | بگو «من کسی‌ام که هر شب می‌خونه».", 6.6),
        ("امشب فقط دو دقیقه. | یه صفحه. | همین.", 4.2),
        ("هر هفته یه کتاب، | یه قدم دو دقیقه‌ای. | اسم کتاب بعدی رو تو بگو.", 5.6),
    ],
    segs=[
        # 0: real action from frame 0 — hand with a pen over a notebook; a gold dot lands as the hook appears
        dict(at=0, kind="video", src=M / "m10_hand_notebook_pen_2785187.mp4",
             p=dict(ss=1.6, fx=0.40, fy=0.05, z=1.25, z0=1.0, z1=1.06, zx=0.5, zy=0.4, br=-0.02, sat=0.95),
             layers=[dict(html=HOOK),
                     dict(html="<div class='dot' style='left:770px;top:1110px'></div>", at=0.25, anim="pop", dur=0.35)]),
        # 1: tighter on the same action for «یه سال بعد؟ سی و هفت برابر»
        dict(at="P1", kind="video", src=M / "m10_hand_notebook_pen_2785187.mp4",
             p=dict(ss=9.0, fx=0.42, fy=0.0, z=1.6, z0=1.0, z1=1.08, br=-0.02, sat=0.95),
             layers=[dict(html=HOOK)]),
        # 2: growth-curve motion beat (number between 3 and 5 s)
        dict(at="P2", kind="video", src=M / "m12_hands_open_book_5973869.mp4",
             p=dict(ss=3.0, fx=0.57, fy=0.3, blur=18, dark=0.5, z0=1.0, z1=1.05),
             layers=[dict(html=SERIES + PANEL, fade=0.2),
                     dict(html=CURVE, at="P2+0.2", anim="wipe", dur=2.2),
                     dict(html="<div class='big37'>×۳۷</div>", at="P2+2.2", anim="pop", dur=0.35),
                     dict(html=FORMULA, at="P2+0.5", anim="fadeup", dur=0.35)]),
        # 3: idea 1 — system, not goal
        dict(at="P3", kind="video", src=M / "m10_hand_notebook_pen_2785187.mp4",
             p=dict(ss=17.0, fx=0.6, fy=0.4, z=1.1, blur=14, dark=0.55, z0=1.0, z1=1.06),
             layers=[dict(html="<div class='idea'><span>ایده‌ی ۱</span></div>"
                          "<div class='ttl2'>سیستم، نه هدف</div>"),
                     dict(html="<div class='cards'><div class='cd goal'>هدف: ۳۰ کتاب تا آخر سال<small>مسیر رو نشون می‌ده</small></div></div>",
                          at="P3*0.25", anim="slide", dur=0.4, dx=260),
                     dict(html="<div class='cards' style='top:1150px'><div class='cd sys'>سیستم: <b>هر شب ۲ صفحه</b>"
                          "<small>تو رو می‌بره</small></div></div>", at="P3*0.62", anim="pop", dur=0.4)]),
        # 4: idea 2 — the 2-minute rule, hourglass
        dict(at="P4", kind="photo", src=PH / "hourglass_8943578.jpg",
             p=dict(z0=1.12, z1=1.0, fx=0.5, fy=0.5, dark=0.8),
             layers=[dict(html="<div class='idea'><span>ایده‌ی ۲</span></div>"
                          "<div class='ttl2'>قانون <g>۲ دقیقه</g></div>"),
                     dict(html="<div class='timer' style='top:820px'><span class='t'>۲:۰۰</span></div>",
                          at="P4*0.3", anim="pop", dur=0.4),
                     dict(html="<div class='box' style='top:1300px;font-size:58px;padding:30px'>"
                          "۱ صفحه، نه ۱ فصل<br>۱ حرکت، نه ۱ ساعت باشگاه</div>", at="P4*0.7", anim="fadeup", dur=0.35)]),
        # 5: idea 3 — identity
        dict(at="P5", kind="video", src=M / "m12_hands_open_book_5973869.mp4",
             p=dict(ss=4.8, fx=0.57, fy=0.25, z=1.15, dark=0.62, z0=1.0, z1=1.07, br=-0.02),
             layers=[dict(html="<div class='idea'><span>ایده‌ی ۳</span></div>"
                          "<div class='ttl2' style='font-size:84px'>هویت، نه هدف</div>"),
                     dict(html="<div class='strike'><span class='old'>«می‌خوام کتاب بخونم»</span></div>",
                          at="P5*0.2", until="P5*0.55", fade=0.15),
                     dict(html="<div class='strike'><span class='old x'>«می‌خوام کتاب بخونم»</span>"
                          "<span class='new'>«من کسی‌ام که<br><g style='color:#9A6E1B'>هر شب</g> می‌خونه»</span></div>",
                          at="P5*0.55", anim="fadeup", dur=0.35)]),
        # 6: tonight — 2 minutes, a timer that really ticks
        dict(at="P6", kind="video", src=M / "m11_hands_turn_page_163532.mp4",
             p=dict(ss=6.6, fx=0.85, fy=0.5, z=1.0, z0=1.0, z1=1.06, br=-0.01, sat=0.92),
             layers=[dict(html="<div class='ttl2' style='top:420px'>امشب: فقط <g>۲ دقیقه</g></div>"
                          "<div class='timer'><span class='t'>۲:۰۰</span></div>", until="P6*0.3"),
                     dict(html="<div class='ttl2' style='top:420px'>امشب: فقط <g>۲ دقیقه</g></div>"
                          "<div class='timer'><span class='t'>۱:۵۹</span></div>",
                          at="P6*0.3", until="P6*0.55"),
                     dict(html="<div class='ttl2' style='top:420px'>امشب: فقط <g>۲ دقیقه</g></div>"
                          "<div class='timer'><span class='t'>۱:۵۸</span><span class='s'>یه صفحه.</span></div>",
                          at="P6*0.55", until="P6*0.85"),
                     dict(html="<div class='ttl2' style='top:420px'>امشب: فقط <g>۲ دقیقه</g></div>"
                          "<div class='timer'><span class='t'>۱:۵۷</span><span class='s'>یه صفحه. <g>همین.</g></span></div>",
                          at="P6*0.85")]),
        # 7: series promise + small Peleh icon
        dict(at="P7", kind="video", src=M / "m13_book_pages_macro_2802905.mp4",
             p=dict(ss=2.0, speed=0.75, fx=0.5, fy=0.5, z=1.0, dark=0.7, blur=6, z0=1.0, z1=1.05),
             layers=[dict(html=f"<div class='end'><img src='{E.ICON}'>"
                          "<div class='l'>هر هفته:<br>یه کتاب ← <g>یه قدم ۲ دقیقه‌ای</g></div></div>", anim="fadeup", dur=0.4, at="P7"),
                     dict(html="<div class='end' style='top:1260px'><span class='c'>کتاب بعدی رو تو بگو</span></div>",
                          at="P7*0.62", anim="pop", dur=0.35)]),
    ],
    sfx=[("pop", 0.25, 0.35), ("tick", "P1", 0.25), ("whoosh", "P2", 0.3), ("rise", "P2+0.2", 0.35),
         ("pop", "P2+2.2", 0.45), ("whoosh", "P3", 0.25), ("tick", "P3*0.25", 0.3), ("pop", "P3*0.62", 0.4),
         ("whoosh", "P4", 0.25), ("pop", "P4*0.3", 0.4), ("tick", "P4*0.7", 0.3), ("page", "P5", 0.3),
         ("soft", "P5*0.55", 0.45), ("tick", "P6*0.3", 0.35), ("tick", "P6*0.55", 0.35), ("tick", "P6*0.85", 0.35),
         ("page", "P6+1.3", 0.3), ("whoosh", "P7", 0.25), ("soft", "P7*0.62", 0.45)],
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
