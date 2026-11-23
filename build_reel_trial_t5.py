"""Trial Reel T5 · Fri 6 Azar 1405, 17:00 · «۱۰ سال دیگه: ۱۲۰ کتاب، یا هیچی؟» (~23 s). Fresh Magnific footage (m28, m29, m21, m25).

  python build_reel_trial_t5.py --narration reel_trial_t5/narration.mp3
"""
import argparse
from pathlib import Path

import reel_engine as E
from build_reel_trial_t4 import CSS as T4CSS
from build_reel_r3_20aban import GOLD, CREAM, NAVY

W = E.W
M = W / "stock" / "magnific_2026-11"

CSS = T4CSS + f"""
.g120 {{ position:absolute; top:760px; left:120px; right:120px; display:grid; grid-template-columns:repeat(12,1fr); gap:10px 12px; direction:rtl; }}
.g120 i {{ display:block; height:44px; border-radius:6px; background:rgba(242,234,211,.13); border:2px solid rgba(242,234,211,.22); }}
.g120 i.a {{ background:#F0B847; border-color:#F0B847; }}
.yrl {{ position:absolute; top:610px; left:0; right:0; text-align:center; color:#FFF8EA; font-size:64px; font-weight:900; text-shadow:0 4px 18px rgba(0,0,0,.9); }}
.yrl g {{ color:#F0B847; }}
"""


def grid(n):
    return "<div class='g120'>" + "".join(f"<i class='{'a' if k < n else ''}'></i>" for k in range(120)) + "</div>"


FA = "۰۱۲۳۴۵۶۷۸۹"
fa = lambda n: "".join(FA[int(c)] for c in str(n))

L3 = []
for y in range(0, 11):
    a = f"P3*{0.08 * y:.2f}" if y else "P3"
    d = dict(html=grid(12 * y) + f"<div class='yrl'>سال <g>{fa(y)}</g></div>", at=a)
    if y < 10:
        d["until"] = f"P3*{0.08 * (y + 1):.2f}"
    L3.append(d)
L3.append(dict(html="<div class='yr' style='top:1380px'><span><g style='color:#B8862C'>۱۲۰</g> کتاب</span></div>", at="P3*0.8", anim="pop", dur=0.35))

CFG = dict(
    out=W / "reel_trial_t5", name="peleh_T5_10_sal",
    music=W / "reel_d010" / "music_leberch_reading.mp3", music_from=40.0,
    tail=1.3, loop=0.0, lead=0.1,
    phrases=[("ده سال دیگه، چند تا کتاب خوندی؟", 3.0),
             ("اگه منتظر وقت خالی بمونی: | تقریباً هیچی.", 3.8),
             ("ولی با شبی ده صفحه: | ماهی یه کتاب.", 3.0),
             ("ده سال دیگه: | صد و بیست تا کتاب.", 3.0),
             ("فرقش، فقط پونزده دقیقه قبل خوابه.", 3.0),
             ("ما هر شب با هم می‌خونیم. | فالو کن که از امشب شروع کنی.", 4.0)],
    segs=[
        dict(at=0, kind="video", src=M / "m28_pages_wind_black_3042472.mp4",
             p=dict(ss=1.5, fx=0.5, fy=0.5, z=1.0, z0=1.15, z1=1.05),
             layers=[dict(html="<div class='hkq' style='top:300px'><g>۱۰ سال</g> دیگه<br>چند تا کتاب خوندی؟</div>")]),
        dict(at="P1", kind="video", src=M / "m29_sofa_lying_phone_3385312.mp4",
             p=dict(ss=2.0, fx=0.66, fy=0.5, dark=0.6, blur=4, z0=1.0, z1=1.06),
             layers=[dict(html="<div class='never'><span class='o'>منتظر وقت خالی؟</span></div>", until="P1*0.55"),
                     dict(html="<div class='never'><span class='o x'>منتظر وقت خالی؟</span><span class='n'>تقریباً هیچی</span></div>",
                          at="P1*0.55", anim="pop", dur=0.3)]),
        dict(at="P2", kind="video", src=M / "m21_reading_bed_night_v_3703843.mp4",
             p=dict(ss=6.0, fx=0.5, fy=0.45, dark=0.7, z0=1.06, z1=1.0),
             layers=[dict(html="<div class='eq'><span>شبی <g>۱۰ صفحه</g></span></div>", until="P2*0.5"),
                     dict(html="<div class='eq'><span>شبی <g>۱۰ صفحه</g></span><small>= ماهی یه کتاب 📖</small></div>", at="P2*0.5", anim="fadeup", dur=0.3)]),
        dict(at="P3", kind="video", src=M / "m28_pages_wind_black_3042472.mp4",
             p=dict(ss=9.0, fx=0.5, fy=0.5, dark=0.45, blur=14, z0=1.0, z1=1.05), layers=L3),
        dict(at="P4", kind="video", src=M / "m25_bed_night_v_3703644.mp4",
             p=dict(ss=8.0, fx=0.5, fy=0.45, dark=0.6, blur=4, z0=1.0, z1=1.06),
             layers=[dict(html="<div class='timer'><span class='t'>۱۵:۰۰</span><span class='s'>فرقش فقط همینه · قبل خواب</span></div>",
                          at="P4+0.1", anim="pop", dur=0.35)]),
        dict(at="P5", kind="video", src=M / "m25_bed_night_v_3703644.mp4",
             p=dict(ss=26.0, fx=0.5, fy=0.45, dark=0.5, blur=8, z0=1.0, z1=1.05),
             layers=[dict(html=f"<div class='end'><img src='{E.ICON}'><div class='l'>هر شب <g>با هم</g> می‌خونیم<br>چالش ۳۰ شب کتاب</div></div>",
                          anim="fadeup", dur=0.35, at="P5"),
                     dict(html="<div class='end' style='top:1260px'><span class='c'>فالو کن · از امشب</span></div>", at="P5*0.45", anim="pop", dur=0.35)]),
    ],
    sfx=[("whoosh", "P1", 0.25), ("pop", "P1*0.55", 0.4), ("whoosh", "P2", 0.25), ("soft", "P2*0.5", 0.3), ("page", "P3", 0.3)]
        + [("tick", f"P3*{0.08 * y:.2f}", 0.2) for y in range(1, 11)]
        + [("pop", "P3*0.8", 0.45), ("pop", "P4+0.1", 0.35), ("whoosh", "P5", 0.25), ("soft", "P5*0.45", 0.4)],
)

if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--narration"); ap.add_argument("--tempo", type=float, default=1.0); ap.add_argument("--bounds")
    a = ap.parse_args()
    if a.bounds:
        CFG["force_bounds"] = [int(x) for x in a.bounds.split(",")]
    E.build(CFG, Path(a.narration) if a.narration else None, a.tempo, CSS)
