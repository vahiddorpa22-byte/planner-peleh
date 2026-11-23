"""Trial Reel T2 (Instagram «Trial», non-followers) · Fri 29 Aban 1405 · «روزی ۲ ساعت گوشی = سالی ۹۷ کتاب» ~24 s.
Stand-alone for strangers. Math (shown on screen): 2 h/day × 365 = 730 h · ~40 pages/h (10 pages per 15 min) = 29,200
pages ≈ 97 books of 300 pages · only 15 of the 120 minutes → ≈ 12 books/yr.

  python build_reel_trial_t2.py                                    -> reel_trial_t2/peleh_T2_goshi_ketab_visual_nomix.mp4
  python build_reel_trial_t2.py --narration reel_trial_t2/narration.mp3   -> final + _upload
"""
import argparse
from pathlib import Path

import reel_engine as E
from build_reel_r3_20aban import CSS as R3CSS, GOLD, CREAM, NAVY

W = E.W
M = W / "stock" / "magnific_2026-11"
PH = W / "stories_v2" / "assets"

CSS = R3CSS + f"""
.hkq {{ position:absolute; top:540px; left:40px; right:40px; text-align:center; color:#FFF8EA; font-weight:900; font-size:112px;
  line-height:1.3; padding:70px 10px; text-shadow:0 4px 18px rgba(0,0,0,.85);
  background:linear-gradient(180deg,rgba(10,16,30,0) 0%,rgba(10,16,30,.66) 22%,rgba(10,16,30,.66) 78%,rgba(10,16,30,0) 100%); }}
.top {{ position:absolute; top:400px; left:60px; right:60px; text-align:center; color:#FFF8EA; font-size:72px; font-weight:900;
  line-height:1.35; text-shadow:0 4px 18px rgba(0,0,0,.9); }}
.mega {{ position:absolute; top:760px; left:0; right:0; text-align:center; }}
.mega .n {{ display:inline-block; direction:rtl; font-size:230px; font-weight:900; color:#F0B847; line-height:1;
  text-shadow:0 10px 40px rgba(0,0,0,.6); }}
.mega .u {{ display:block; margin-top:20px; font-size:80px; font-weight:900; color:#FFF8EA; text-shadow:0 4px 18px rgba(0,0,0,.9); }}
.eqs {{ position:absolute; top:1200px; left:0; right:0; text-align:center; }}
.eqs span {{ display:inline-block; direction:rtl; background:rgba(15,24,44,.86); color:{CREAM}; font-size:56px; font-weight:800;
  padding:16px 40px; border-radius:26px; border:3px solid rgba(201,154,60,.6); }}
.shelf {{ position:absolute; top:560px; left:110px; right:110px; display:grid; grid-template-columns:repeat(10,1fr); gap:10px 12px; direction:rtl; }}
.shelf i {{ display:block; height:80px; border-radius:8px 12px 12px 8px; background:rgba(242,234,211,.12); }}
.shelf i.on {{ background:linear-gradient(160deg,#E2B655,#B8862E); box-shadow:0 4px 14px rgba(0,0,0,.35); }}
.shelf i.dim {{ background:rgba(226,182,85,.18); }}
.cnt {{ position:absolute; top:1500px; left:0; right:0; text-align:center; }}
.cnt .n {{ display:inline-block; direction:rtl; background:rgba(15,24,44,.88); color:#FFF8EA; font-size:92px; font-weight:900;
  padding:14px 54px; border-radius:36px; border:4px solid {GOLD}; }}
.cnt .n g {{ color:#F0B847; }}
.cnt small {{ display:block; margin-top:16px; font-size:38px; font-weight:700; color:#E8DDC0; text-shadow:0 2px 10px rgba(0,0,0,.9); }}
.bar {{ position:absolute; top:880px; left:90px; right:90px; height:150px; border-radius:30px; background:rgba(242,234,211,.16);
  border:3px solid rgba(242,234,211,.35); overflow:hidden; }}
.bar b {{ position:absolute; right:0; top:0; bottom:0; width:12.5%; background:linear-gradient(160deg,#F0B847,#C99A3C); }}
.barl {{ position:absolute; top:1060px; left:90px; right:90px; display:flex; justify-content:space-between; font-size:48px;
  font-weight:800; color:#FFF8EA; text-shadow:0 2px 10px rgba(0,0,0,.9); }}
.barl g {{ color:#F0B847; }}
"""

HOOK = "<div class='hkq'>روزی <g>۲ ساعت</g><br>با گوشی؟</div>"


def shelf(n_on, mode="on"):
    cells = []
    for k in range(100):
        if k >= 97:
            cells.append("<i style='visibility:hidden'></i>")
        elif mode == "twelve":
            cells.append("<i class='on'></i>" if k < 12 else "<i class='dim'></i>")
        else:
            cells.append("<i class='on'></i>" if k < n_on else "<i></i>")
    return "<div class='shelf'>" + "".join(cells) + "</div>"


CFG = dict(
    out=W / "reel_trial_t2", name="peleh_T2_goshi_ketab",
    music=W / "reel_d012" / "music_white_clouds_leberch.mp3", music_from=80.0,
    tail=1.4, loop=0.0, lead=0.1,
    phrases=[
        ("روزی دو ساعت با گوشی؟", 2.0),
        ("یعنی سالی | هفتصد و سی ساعت.", 2.8),
        ("با همین وقت | می‌شد نود و هفت تا کتاب خوند.", 3.6),
        ("نمی‌گیم گوشی رو بذار کنار. | فقط پونزده دقیقه‌ش رو بده به کتاب.", 4.6),
        ("می‌شه سالی دوازده تا کتاب.", 2.6),
        ("از یک آذر، سی شب با هم می‌خونیم. | فالو کن که جا نمونی.", 3.8),
    ],
    segs=[
        dict(at=0, kind="photo", src=PH / "phone_nightstand_hand_l28.jpg",
             p=dict(z0=1.0, z1=1.08, fx=0.55, fy=0.55, br=0.04),
             layers=[dict(html=HOOK)]),
        dict(at="P1", kind="photo", src=PH / "phone_nightstand_hand_l28.jpg",
             p=dict(z0=1.3, z1=1.4, fx=0.55, fy=0.55, dark=0.6, blur=6),
             layers=[dict(html="<div class='mega'><span class='n'>۷۳۰</span><span class='u'>ساعت در سال</span></div>",
                          at="P1*0.3", anim="pop", dur=0.4),
                     dict(html="<div class='eqs'><span>۲ ساعت × ۳۶۵ روز</span></div>", at="P1+0.1", anim="fadeup", dur=0.3)]),
        dict(at="P2", kind="video", src=M / "m13_book_pages_macro_2802905.mp4",
             p=dict(ss=1.0, fx=0.5, fy=0.5, blur=16, dark=0.45, z0=1.0, z1=1.05),
             layers=[dict(html=shelf(0), at="P2", until="P2+0.3"),
                     dict(html=shelf(25), at="P2+0.3", until="P2+0.6"),
                     dict(html=shelf(50), at="P2+0.6", until="P2+0.9"),
                     dict(html=shelf(75), at="P2+0.9", until="P2+1.2"),
                     dict(html=shelf(97), at="P2+1.2"),
                     dict(html="<div class='cnt'><span class='n'><g>۹۷</g> کتاب</span>"
                          "<small>۱۰ صفحه در هر ۱۵ دقیقه · کتاب ۳۰۰ صفحه‌ای</small></div>", at="P2+1.2", anim="pop", dur=0.35)]),
        dict(at="P3", kind="photo", src=PH / "darkread_404515042.jpg",
             p=dict(z0=1.0, z1=1.06, fx=0.5, fy=0.45, dark=0.55, blur=6),
             layers=[dict(html="<div class='top'>گوشی رو <g>کنار نذار</g></div>"),
                     dict(html="<div class='bar'></div><div class='barl'><span></span><span>۱۲۰ دقیقه</span></div>",
                          at="P3+0.1", until="P3*0.5"),
                     dict(html="<div class='bar'><b></b></div><div class='barl'><span><g>۱۵ دقیقه</g> برای کتاب</span><span>۱۲۰ دقیقه</span></div>",
                          at="P3*0.5", anim="fadeup", dur=0.35)]),
        dict(at="P4", kind="video", src=M / "m13_book_pages_macro_2802905.mp4",
             p=dict(ss=4.0, fx=0.5, fy=0.5, blur=16, dark=0.45, z0=1.04, z1=1.08),
             layers=[dict(html=shelf(97), at="P4", until="P4+0.3"),
                     dict(html=shelf(0, "twelve"), at="P4+0.3"),
                     dict(html="<div class='cnt'><span class='n'>سالی <g>۱۲</g> کتاب</span><small>فقط با ۱۵ دقیقه در روز</small></div>",
                          at="P4+0.3", anim="pop", dur=0.35)]),
        dict(at="P5", kind="video", src=M / "m11_hands_turn_page_163532.mp4",
             p=dict(ss=7.0, fx=0.74, fy=0.8, z=1.0, dark=0.6, blur=6, z0=1.0, z1=1.05),
             layers=[dict(html=f"<div class='end'><img src='{E.ICON}'>"
                          "<div class='l'>چالش ۳۰ شب کتاب<br><g>از ۱ آذر</g> · روزی ۱۵ دقیقه</div></div>", anim="fadeup", dur=0.4, at="P5"),
                     dict(html="<div class='end' style='top:1260px'><span class='c'>فالو کن که جا نمونی</span></div>",
                          at="P5*0.5", anim="pop", dur=0.35)]),
    ],
    sfx=[("whoosh", "P1", 0.25), ("pop", "P1*0.3", 0.45), ("tick", "P2+0.3", 0.25), ("tick", "P2+0.6", 0.25),
         ("tick", "P2+0.9", 0.25), ("pop", "P2+1.2", 0.45), ("page", "P3", 0.3), ("soft", "P3*0.5", 0.45),
         ("whoosh", "P4", 0.25), ("pop", "P4+0.3", 0.45), ("whoosh", "P5", 0.25), ("soft", "P5*0.5", 0.45)],
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
