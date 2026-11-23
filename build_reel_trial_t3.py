"""Trial Reel T3 · Tue 26 Aban 1405, 21:00 · «یه کتاب ۳۰۰ صفحه‌ای چند شب طول می‌کشه؟» (~20 s, same number format as T1: 42 follows / 1,906 views).

  python build_reel_trial_t3.py                                   -> silent preview
  python build_reel_trial_t3.py --narration reel_trial_t3/narration.mp3
"""
import argparse
from pathlib import Path

import reel_engine as E
from build_reel_r10_1azar import CSS as R10CSS
from build_reel_r3_20aban import GOLD, CREAM, NAVY

W = E.W
M = W / "stock" / "magnific_2026-11"
PH = W / "stories_v2" / "assets"

CSS = R10CSS + f"""
.hkq {{ position:absolute; top:520px; left:40px; right:40px; text-align:center; color:#FFF8EA; font-weight:900; font-size:104px;
  line-height:1.3; padding:70px 10px; text-shadow:0 4px 18px rgba(0,0,0,.85);
  background:linear-gradient(180deg,rgba(10,16,30,0) 0%,rgba(10,16,30,.66) 22%,rgba(10,16,30,.66) 78%,rgba(10,16,30,0) 100%); }}
.never {{ position:absolute; top:820px; left:0; right:0; text-align:center; }}
.never .o {{ display:inline-block; position:relative; background:rgba(15,24,44,.85); color:#D8D0BC; font-size:80px; font-weight:900; padding:24px 50px; border-radius:30px; }}
.never .o.x:after {{ content:''; position:absolute; left:24px; right:24px; top:50%; height:8px; background:#E0584A; border-radius:4px; transform:rotate(-4deg); }}
.never .n {{ display:block; width:fit-content; margin:44px auto 0; background:rgba(224,88,74,.92); color:#FFF8EA; font-size:92px; font-weight:900; padding:18px 56px; border-radius:34px; }}
.pg {{ position:absolute; top:1160px; left:0; right:0; text-align:center; }}
.pg span {{ display:inline-block; direction:rtl; background:rgba(15,24,44,.88); color:#FFF8EA; font-size:84px; font-weight:900; padding:14px 50px;
  border-radius:34px; border:4px solid {GOLD}; }} .pg span g {{ color:#F0B847; }}
"""


def grid(n):
    return "<div class='bar30'>" + "".join(f"<i class='{'a' if k < n else ''}'></i>" for k in range(30)) + "</div>"


def step(seg, n, pages):
    a, b = seg
    return [dict(html=grid(n), at=a, until=b), dict(html=f"<div class='pg'><span>صفحه‌ی <g>{pages}</g></span></div>", at=a, until=b)]


L3 = []
for (a, b), n, pg in ((("P2", "P2*0.3"), 0, "۰"), (("P2*0.3", "P2*0.5"), 10, "۱۰۰"), (("P2*0.5", "P2*0.7"), 20, "۲۰۰")):
    L3 += step((a, b), n, pg)
L3 += [dict(html=grid(30), at="P2*0.7"), dict(html="<div class='pg'><span><g>۳۰ شب</g> = ۳۰۰ صفحه ✅</span></div>", at="P2*0.7", anim="pop", dur=0.35)]

CFG = dict(
    out=W / "reel_trial_t3", name="peleh_T3_300_safhe",
    music=W / "reel_d010" / "music_leberch_reading.mp3", music_from=120.0,
    tail=1.4, loop=0.0, lead=0.1,
    phrases=[("یه کتاب سیصد صفحه‌ای، | چند شب طول می‌کشه؟", 3.0),
             ("اگه بخوای یه‌شبه تمومش کنی: | هیچ‌وقت.", 3.2),
             ("ولی شبی ده صفحه: | سی شب.", 3.0),
             ("یعنی فقط پونزده دقیقه، قبل خواب.", 2.8),
             ("سی شب دیگه، | یه کتاب کامل خوندی.", 2.8),
             ("از یک آذر، با هم شروع می‌کنیم. | فالو کن که جا نمونی.", 3.6)],
    segs=[
        dict(at=0, kind="video", src=M / "m12_hands_open_book_5973869.mp4",
             p=dict(ss=0.6, fx=0.55, fy=0.3, z=1.2, z0=1.0, z1=1.07, br=-0.02, sat=0.95),
             layers=[dict(html="<div class='hkq'>یه کتاب <g>۳۰۰ صفحه‌ای</g><br>چند شب طول می‌کشه؟</div>")]),
        dict(at="P1", kind="photo", src=PH / "phone_nightstand_hand_l28.jpg", p=dict(z0=1.0, z1=1.07, fx=0.55, fy=0.55, dark=0.5, blur=8),
             layers=[dict(html="<div class='never'><span class='o'>یه‌شبه؟</span></div>", until="P1*0.6"),
                     dict(html="<div class='never'><span class='o x'>یه‌شبه؟</span><span class='n'>هیچ‌وقت</span></div>", at="P1*0.6", anim="pop", dur=0.3)]),
        dict(at="P2", kind="video", src=M / "m11_hands_turn_page_163532.mp4", p=dict(ss=7.0, fx=0.74, fy=0.8, blur=12, dark=0.5, z0=1.0, z1=1.05),
             layers=[dict(html="<div class='top'>شبی <g>۱۰ صفحه</g></div>")] + L3),
        dict(at="P3", kind="photo", src=PH / "hourglass_8943578.jpg", p=dict(z0=1.12, z1=1.0, fx=0.5, fy=0.5, dark=0.8),
             layers=[dict(html="<div class='timer' style='top:760px'><span class='t'>۱۵:۰۰</span><span class='s'>قبل خواب</span></div>", at="P3+0.1", anim="pop", dur=0.35)]),
        dict(at="P4", kind="photo", src=PH / "darkread_404515042.jpg", p=dict(z0=1.0, z1=1.06, fx=0.5, fy=0.45, dark=0.6, blur=3),
             layers=[dict(html="<div class='top' style='top:700px'>۳۰ شب دیگه:<br><g>یه کتاب کامل</g> 📖</div>", anim="fadeup", dur=0.3, at="P4")]),
        dict(at="P5", kind="video", src=M / "m13_book_pages_macro_2802905.mp4", p=dict(ss=2.0, speed=0.75, fx=0.5, fy=0.5, dark=0.7, blur=6, z0=1.0, z1=1.05),
             layers=[dict(html=f"<div class='end'><img src='{E.ICON}'><div class='l'>چالش ۳۰ شب کتاب<br><g>از ۱ آذر</g> · روزی ۱۵ دقیقه</div></div>", anim="fadeup", dur=0.35, at="P5"),
                     dict(html="<div class='end' style='top:1260px'><span class='c'>فالو کن که جا نمونی</span></div>", at="P5*0.5", anim="pop", dur=0.35)]),
    ],
    sfx=[("whoosh", "P1", 0.25), ("pop", "P1*0.6", 0.4), ("whoosh", "P2", 0.25), ("tick", "P2*0.3", 0.3), ("tick", "P2*0.5", 0.3), ("pop", "P2*0.7", 0.45),
         ("pop", "P3+0.1", 0.35), ("page", "P4", 0.3), ("whoosh", "P5", 0.25), ("soft", "P5*0.5", 0.4)],
)

if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--narration"); ap.add_argument("--tempo", type=float, default=1.0); ap.add_argument("--bounds")
    a = ap.parse_args()
    if a.bounds:
        CFG["force_bounds"] = [int(x) for x in a.bounds.split(",")]
    E.build(CFG, Path(a.narration) if a.narration else None, a.tempo, CSS)
