"""R13 · Sat 7 Azar 1405, 17:00 · «۷ شب = ۷۰ صفحه» — end of challenge week 1 (~24 s). Fresh Magnific footage (m25, m21, m29, m28).

  python build_reel_r13_7azar.py --narration reel_r13_7azar/narration.mp3
"""
import argparse
from pathlib import Path

import reel_engine as E
from build_reel_trial_t4 import CSS as T4CSS
from build_reel_r3_20aban import GOLD, CREAM, NAVY

W = E.W
M = W / "stock" / "magnific_2026-11"

CSS = T4CSS + f"""
.hk13 {{ position:absolute; top:300px; left:40px; right:40px; text-align:center; color:#FFF8EA; font-weight:900; line-height:1.2;
  text-shadow:0 4px 20px rgba(0,0,0,.9); }}
.hk13 .a {{ font-size:150px; }} .hk13 .b {{ font-size:150px; color:#F0B847; }}
.soft {{ position:absolute; top:760px; left:60px; right:60px; text-align:center; color:#FFF8EA; font-size:84px; font-weight:900; line-height:1.4;
  text-shadow:0 4px 18px rgba(0,0,0,.9); }} .soft g {{ color:#F0B847; }}
"""
FA = "۰۱۲۳۴۵۶۷۸۹"
fa = lambda n: "".join(FA[int(c)] for c in str(n))


def bar(a, b=0):
    cells = "".join(f"<i class='{'a' if k < a else 'b' if k < a + b else ''}'></i>" for k in range(30))
    return f"<div class='bar30'>{cells}</div>"


HOOK = "<div class='hk13'><div class='a'>۷ شب</div><div class='b'>۷۰ صفحه</div></div>"
L1 = []
for k in range(8):
    a = f"P1*{0.1 * k:.2f}" if k else "P1"
    d = dict(html=f"<div class='pg' style='top:1000px'><span>صفحه‌ی <g>{fa(10 * k)}</g></span></div>", at=a)
    if k < 7:
        d["until"] = f"P1*{0.1 * (k + 1):.2f}"
    L1.append(d)

CFG = dict(
    out=W / "reel_r13_7azar", name="peleh_R13_7_shab",
    music=W / "reel_d012" / "music_white_clouds_leberch.mp3", music_from=10.0,
    tail=1.4, loop=0.0, lead=0.12,
    phrases=[("هفت شب. | هفتاد صفحه.", 2.8),
             ("اگه از اول آذر، شبی ده صفحه خونده باشی، | الان هفتاد صفحه جلوتری.", 5.9),
             ("اگه جا موندی هم، هیچ اشکالی نداره.", 3.0),
             ("بیست و سه شب مونده. | یعنی دویست و سی صفحه. | یعنی هنوز یه کتاب کامل.", 6.2),
             ("امشب، فقط ده صفحه.", 2.1),
             ("الان صفحه‌ی چندی؟ | همین زیر بنویس.", 2.7)],
    segs=[
        dict(at=0, kind="video", src=M / "m25_bed_night_v_3703644.mp4",
             p=dict(ss=0.3, fx=0.5, fy=0.45, z0=1.0, z1=1.07, dark=0.85),
             layers=[dict(html=HOOK + bar(7).replace("class='bar30'", "class='bar30' style='top:1180px'"))]),
        dict(at="P1", kind="video", src=M / "m21_reading_bed_night_v_3703843.mp4",
             p=dict(ss=1.0, fx=0.5, fy=0.45, dark=0.6, blur=3, z0=1.0, z1=1.06),
             layers=[dict(html="<div class='top' style='top:560px'>از <g>۱ آذر</g><br>شبی ۱۰ صفحه</div>")] + L1
                    + [dict(html="<div class='yr' style='top:1240px'><span>۷۰ صفحه جلوتری ✅</span></div>", at="P1*0.72", anim="pop", dur=0.35)]),
        dict(at="P2", kind="video", src=M / "m29_sofa_lying_phone_3385312.mp4",
             p=dict(ss=7.0, fx=0.66, fy=0.5, dark=0.55, blur=5, z0=1.06, z1=1.0),
             layers=[dict(html="<div class='soft'>جا موندی؟<br><g>هیچ اشکالی نداره</g> 🤍</div>", anim="fadeup", dur=0.35, at="P2+0.1")]),
        dict(at="P3", kind="video", src=M / "m28_pages_wind_black_3042472.mp4",
             p=dict(ss=5.0, fx=0.5, fy=0.5, dark=0.5, blur=10, z0=1.0, z1=1.05),
             layers=[dict(html=bar(7, 23)),
                     dict(html="<div class='top' style='top:560px'><g>۲۳ شب</g> مونده</div>", until="P3*0.36"),
                     dict(html="<div class='top' style='top:560px'>= <g>۲۳۰ صفحه</g></div>", at="P3*0.36", until="P3*0.68", anim="pop", dur=0.3),
                     dict(html="<div class='top' style='top:560px'>= هنوز <g>یه کتاب کامل</g> 📖</div>", at="P3*0.68", anim="pop", dur=0.3)]),
        dict(at="P4", kind="video", src=M / "m21_reading_bed_night_v_3703843.mp4",
             p=dict(ss=9.0, fx=0.5, fy=0.4, z=1.15, dark=0.7, z0=1.0, z1=1.06),
             layers=[dict(html="<div class='eq'><span>امشب، فقط <g>۱۰ صفحه</g></span></div>", at="P4+0.05", anim="pop", dur=0.3)]),
        dict(at="P5", kind="video", src=M / "m25_bed_night_v_3703644.mp4",
             p=dict(ss=24.0, fx=0.5, fy=0.45, dark=0.5, blur=8, z0=1.0, z1=1.05),
             layers=[dict(html=f"<div class='end'><img src='{E.ICON}'><div class='l'>الان <g>صفحه‌ی چندی</g>؟</div></div>",
                          anim="fadeup", dur=0.35, at="P5"),
                     dict(html="<div class='end' style='top:1180px'><span class='c'>همین زیر بنویس 👇</span></div>", at="P5*0.5", anim="pop", dur=0.35)]),
    ],
    sfx=[("pop", 0.2, 0.3), ("whoosh", "P1", 0.25)] + [("tick", f"P1*{0.1 * k:.2f}", 0.2) for k in range(1, 8)]
        + [("pop", "P1*0.72", 0.4), ("soft", "P2+0.1", 0.3), ("page", "P3", 0.3), ("pop", "P3*0.36", 0.3), ("pop", "P3*0.68", 0.4),
           ("pop", "P4+0.05", 0.35), ("whoosh", "P5", 0.25), ("soft", "P5*0.5", 0.4)],
)

if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--narration"); ap.add_argument("--tempo", type=float, default=1.0); ap.add_argument("--bounds")
    a = ap.parse_args()
    if a.bounds:
        CFG["force_bounds"] = [int(x) for x in a.bounds.split(",")]
    E.build(CFG, Path(a.narration) if a.narration else None, a.tempo, CSS)
