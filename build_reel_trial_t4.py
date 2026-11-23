"""Trial Reel T4 · Tue 3 Azar 1405, 21:00 · «۲۰ تا ریلز کمتر = سالی ۸ کتاب» (~21 s). Fresh Magnific footage (m20, m24, m21, m28, m29).

  python build_reel_trial_t4.py --narration reel_trial_t4/narration.mp3
"""
import argparse
from pathlib import Path

import reel_engine as E
from build_reel_trial_t3 import CSS as T3CSS
from build_reel_r3_20aban import GOLD, CREAM, NAVY

W = E.W
M = W / "stock" / "magnific_2026-11"

CSS = T3CSS + f"""
.hk4 {{ position:absolute; top:250px; left:40px; right:40px; text-align:center; color:#FFF8EA; font-weight:900; line-height:1.25;
  text-shadow:0 4px 20px rgba(0,0,0,.9); padding:60px 0;
  background:linear-gradient(180deg,rgba(10,16,30,0) 0%,rgba(10,16,30,.62) 22%,rgba(10,16,30,.62) 78%,rgba(10,16,30,0) 100%); }}
.hk4 .a {{ font-size:70px; color:#E8DDC0; }} .hk4 .b {{ font-size:132px; }}
.eq {{ position:absolute; top:760px; left:0; right:0; text-align:center; }}
.eq span {{ display:inline-block; direction:rtl; background:rgba(15,24,44,.86); color:#FFF8EA; font-size:96px; font-weight:900;
  padding:22px 56px; border-radius:36px; border:4px solid {GOLD}; }} .eq span g {{ color:#F0B847; }}
.eq small {{ display:block; margin-top:30px; font-size:54px; font-weight:800; color:#E8DDC0; text-shadow:0 4px 18px rgba(0,0,0,.9); }}
.row8 {{ position:absolute; top:880px; left:110px; right:110px; display:flex; gap:16px; justify-content:center; align-items:flex-end; direction:rtl; }}
.row8 i {{ display:block; width:88px; border-radius:10px 10px 4px 4px; box-shadow:0 10px 28px rgba(0,0,0,.55); }}
.yr {{ position:absolute; top:1260px; left:0; right:0; text-align:center; }}
.yr span {{ display:inline-block; background:rgba(242,234,211,.97); color:{NAVY}; font-size:88px; font-weight:900; padding:18px 54px;
  border-radius:34px; border:5px solid {GOLD}; }}
"""

COL = ["#C99A3C", "#7FA0E0", "#E0584A", "#F2EAD3", "#5FA37A", "#B07CC6", "#E89B4C", "#4C7BD9"]
HGT = [300, 340, 280, 360, 310, 330, 290, 350]


def books(n):
    return "<div class='row8'>" + "".join(
        f"<i style='height:{HGT[k]}px;background:{COL[k] if k < n else 'rgba(242,234,211,.12)'};"
        f"{'' if k < n else 'border:2px dashed rgba(242,234,211,.35);'}'></i>" for k in range(8)) + "</div>"


L3 = [dict(html=books(0), at="P3", until="P3*0.35")]
for k in range(1, 9):
    a = f"P3*{0.35 + (k - 1) * 0.06:.2f}"
    b = f"P3*{0.35 + k * 0.06:.2f}" if k < 8 else None
    d = dict(html=books(k), at=a)
    if b:
        d["until"] = b
    L3.append(d)
L3.append(dict(html="<div class='yr'><span>سالی <g style='color:#B8862C'>۸ کتاب</g></span></div>", at="P3*0.83", anim="pop", dur=0.35))

CFG = dict(
    out=W / "reel_trial_t4", name="peleh_T4_20_reels",
    music=W / "reel_d012" / "music_white_clouds_leberch.mp3", music_from=110.0,
    tail=1.3, loop=0.0, lead=0.1,
    phrases=[("امشب، بیست تا ریلز کمتر ببین.", 2.8),
             ("بیست تا ریلز، یعنی ده دقیقه.", 2.8),
             ("ده دقیقه، یعنی هفت صفحه کتاب.", 3.0),
             ("هفت صفحه در شب، می‌شه سالی هشت تا کتاب.", 3.6),
             ("فقط با بیست تا ریلز کمتر.", 2.2),
             ("چالش سی شب کتاب شروع شده، و هنوز دیر نیست. | فالو کن.", 4.8)],
    segs=[
        dict(at=0, kind="video", src=M / "m20_phone_scroll_sofa_3442611.mp4",
             p=dict(ss=1.0, fx=0.52, fy=0.2, z=1.12, z0=1.0, z1=1.06, br=-0.04),
             layers=[dict(html="<div class='hk4'><div class='a'>امشب</div><div class='b'><g>۲۰ تا ریلز</g><br>کمتر</div></div>")]),
        dict(at="P1", kind="video", src=M / "m24_phone_scroll_sofa_b_3442606.mp4",
             p=dict(ss=3.0, fx=0.66, fy=0.5, dark=0.55, blur=6, z0=1.05, z1=1.1),
             layers=[dict(html="<div class='eq'><span>۲۰ ریلز</span></div>", until="P1*0.45"),
                     dict(html="<div class='timer'><span class='t'>۱۰:۰۰</span><span class='s'>۲۰ تا ریلز = ۱۰ دقیقه</span></div>",
                          at="P1*0.45", anim="pop", dur=0.3)]),
        dict(at="P2", kind="video", src=M / "m21_reading_bed_night_v_3703843.mp4",
             p=dict(ss=2.0, fx=0.5, fy=0.45, dark=0.7, z0=1.0, z1=1.06),
             layers=[dict(html="<div class='eq'><span>۱۰ دقیقه = <g>۷ صفحه</g></span><small>کتاب، قبل خواب</small></div>",
                          at="P2*0.35", anim="pop", dur=0.3)]),
        dict(at="P3", kind="video", src=M / "m28_pages_wind_black_3042472.mp4",
             p=dict(ss=3.0, fx=0.5, fy=0.5, dark=0.55, blur=4, z0=1.0, z1=1.05),
             layers=[dict(html="<div class='top' style='top:560px'>شبی <g>۷ صفحه</g></div>")] + L3),
        dict(at="P4", kind="video", src=M / "m29_sofa_lying_phone_3385312.mp4",
             p=dict(ss=4.0, fx=0.66, fy=0.5, dark=0.6, blur=3, z0=1.08, z1=1.0),
             layers=[dict(html="<div class='top' style='top:720px'>فقط با<br><g>۲۰ تا ریلز کمتر</g></div>", anim="fadeup", dur=0.3, at="P4")]),
        dict(at="P5", kind="video", src=M / "m25_bed_night_v_3703644.mp4",
             p=dict(ss=20.0, fx=0.5, fy=0.45, dark=0.55, blur=6, z0=1.0, z1=1.05),
             layers=[dict(html=f"<div class='end'><img src='{E.ICON}'><div class='l'>چالش ۳۰ شب کتاب<br><g>شروع شده</g> · هنوز دیر نیست</div></div>",
                          anim="fadeup", dur=0.35, at="P5"),
                     dict(html="<div class='end' style='top:1260px'><span class='c'>فالو کن 👇</span></div>", at="P5*0.72", anim="pop", dur=0.35)]),
    ],
    sfx=[("whoosh", "P1", 0.25), ("pop", "P1*0.45", 0.4), ("whoosh", "P2", 0.25), ("pop", "P2*0.35", 0.35), ("page", "P3", 0.3)]
        + [("tick", f"P3*{0.35 + k * 0.06:.2f}", 0.22) for k in range(8)]
        + [("pop", "P3*0.83", 0.45), ("whoosh", "P4", 0.25), ("whoosh", "P5", 0.25), ("soft", "P5*0.72", 0.4)],
)

if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--narration"); ap.add_argument("--tempo", type=float, default=1.0); ap.add_argument("--bounds")
    a = ap.parse_args()
    if a.bounds:
        CFG["force_bounds"] = [int(x) for x in a.bounds.split(",")]
    E.build(CFG, Path(a.narration) if a.narration else None, a.tempo, CSS)
