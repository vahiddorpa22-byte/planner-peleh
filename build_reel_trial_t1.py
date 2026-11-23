"""Trial Reel T1 (Instagram «Trial» — shown to non-followers first) · «تا آخر عمرت چند کتاب دیگه می‌خونی؟» ~24 s.
Stand-alone for strangers (no series context): frame-0 question → 80 lit dots (2 books/yr × 40 yrs) → 480 lit dots
(15 min/day ≈ 12 books/yr × 40) → the difference is 15 minutes → Azar challenge + follow.

  python build_reel_trial_t1.py                                    -> reel_trial_t1/peleh_T1_omr_ketab_visual_nomix.mp4
  python build_reel_trial_t1.py --narration reel_trial_t1/narration.mp3   -> final + _upload
"""
import argparse
from pathlib import Path

import reel_engine as E
from build_reel_r3_20aban import CSS as R3CSS, GOLD, CREAM, NAVY

W = E.W
M = W / "stock" / "magnific_2026-11"
PH = W / "stories_v2" / "assets"

CSS = R3CSS + f"""
.hkq {{ position:absolute; top:520px; left:40px; right:40px; text-align:center; color:#FFF8EA; font-weight:900; font-size:104px;
  line-height:1.3; padding:70px 10px; text-shadow:0 4px 18px rgba(0,0,0,.85);
  background:linear-gradient(180deg,rgba(10,16,30,0) 0%,rgba(10,16,30,.66) 22%,rgba(10,16,30,.66) 78%,rgba(10,16,30,0) 100%); }}
.dots {{ position:absolute; top:640px; left:84px; right:84px; display:grid; grid-template-columns:repeat(24,1fr); gap:8px; direction:rtl; }}
.dots i {{ display:block; height:30px; border-radius:7px; background:rgba(242,234,211,.13); }}
.dots i.on {{ background:#F0B847; box-shadow:0 0 10px rgba(240,184,71,.45); }}
.cnt {{ position:absolute; top:1440px; left:0; right:0; text-align:center; }}
.cnt .n {{ display:inline-block; direction:rtl; background:rgba(15,24,44,.88); color:#FFF8EA; font-size:96px; font-weight:900;
  padding:14px 54px; border-radius:36px; border:4px solid {GOLD}; }}
.cnt .n g {{ color:#F0B847; }}
.cnt small {{ display:block; margin-top:20px; font-size:44px; font-weight:800; color:#E8DDC0; text-shadow:0 2px 10px rgba(0,0,0,.9); }}
.top {{ position:absolute; top:400px; left:60px; right:60px; text-align:center; color:#FFF8EA; font-size:70px; font-weight:900;
  line-height:1.35; text-shadow:0 4px 18px rgba(0,0,0,.9); }}
"""

HOOK = "<div class='hkq'>تا آخر عمرت<br><g>چند کتاب دیگه</g> می‌خونی؟</div>"


def dots(n_on):
    return "<div class='dots'>" + "".join("<i class='on'></i>" if k < n_on else "<i></i>" for k in range(480)) + "</div>"


CFG = dict(
    out=W / "reel_trial_t1", name="peleh_T1_omr_ketab",
    music=W / "reel_d010" / "music_leberch_reading.mp3", music_from=90.0,
    tail=1.4, loop=0.0, lead=0.1,
    phrases=[
        ("تا آخر عمرت، | چند تا کتاب دیگه می‌خونی؟", 2.8),
        ("اگه سالی دو تا کتاب بخونی، | و چهل سال دیگه وقت داشته باشی:", 3.6),
        ("هشتاد تا. | کل عمرت، هشتاد تا کتاب.", 3.2),
        ("ولی با روزی پونزده دقیقه: | سالی دوازده تا.", 3.2),
        ("چهارصد و هشتاد تا کتاب.", 2.4),
        ("فرقش، | فقط پونزده دقیقه در روزه.", 2.8),
        ("از یک آذر، سی شب با هم می‌خونیم. | فالو کن که جا نمونی.", 3.6),
    ],
    segs=[
        dict(at=0, kind="video", src=M / "m12_hands_open_book_5973869.mp4",
             p=dict(ss=0.6, fx=0.55, fy=0.3, z=1.2, z0=1.0, z1=1.07, br=-0.02, sat=0.95),
             layers=[dict(html=HOOK)]),
        dict(at="P1", kind="video", src=M / "m13_book_pages_macro_2802905.mp4",
             p=dict(ss=1.0, fx=0.5, fy=0.5, blur=16, dark=0.5, z0=1.0, z1=1.04),
             layers=[dict(html="<div class='top'>سالی <g>۲ کتاب</g> × <g>۴۰ سال</g></div>"),
                     dict(html=dots(0), at="P1+0.2")]),
        dict(at="P2", kind="video", src=M / "m13_book_pages_macro_2802905.mp4",
             p=dict(ss=4.6, fx=0.5, fy=0.5, blur=16, dark=0.45, z0=1.04, z1=1.07),
             layers=[dict(html="<div class='top'>سالی <g>۲ کتاب</g> × <g>۴۰ سال</g></div>"),
                     dict(html=dots(30), at="P2", until="P2+0.25"),
                     dict(html=dots(60), at="P2+0.25", until="P2+0.5"),
                     dict(html=dots(80), at="P2+0.5"),
                     dict(html="<div class='cnt'><span class='n'><g>۸۰</g> کتاب</span><small>کل عمرت</small></div>",
                          at="P2+0.5", anim="pop", dur=0.35)]),
        dict(at="P3", kind="video", src=M / "m11_hands_turn_page_163532.mp4",
             p=dict(ss=7.0, fx=0.74, fy=0.8, blur=12, dark=0.5, z0=1.0, z1=1.05),
             layers=[dict(html="<div class='top'>روزی <g>۱۵ دقیقه</g> ≈ سالی <g>۱۲ کتاب</g></div>"),
                     dict(html=dots(80), at="P3"),
                     dict(html="<div class='cnt'><span class='n'><g>۸۰</g> کتاب</span></div>", at="P3", until="P3*0.6", fade=0.15)]),
        dict(at="P4", kind="video", src=M / "m11_hands_turn_page_163532.mp4",
             p=dict(ss=10.5, fx=0.74, fy=0.8, blur=12, dark=0.5, z0=1.05, z1=1.09),
             layers=[dict(html="<div class='top'>روزی <g>۱۵ دقیقه</g> ≈ سالی <g>۱۲ کتاب</g></div>"),
                     dict(html=dots(160), at="P4", until="P4+0.25"),
                     dict(html=dots(280), at="P4+0.25", until="P4+0.5"),
                     dict(html=dots(400), at="P4+0.5", until="P4+0.75"),
                     dict(html=dots(480), at="P4+0.75"),
                     dict(html="<div class='cnt'><span class='n'><g>۴۸۰</g> کتاب</span><small>همون عمر</small></div>",
                          at="P4+0.75", anim="pop", dur=0.35)]),
        dict(at="P5", kind="photo", src=PH / "hourglass_8943578.jpg",
             p=dict(z0=1.12, z1=1.0, fx=0.5, fy=0.5, dark=0.8),
             layers=[dict(html="<div class='top' style='top:420px'>فرقش؟</div>"),
                     dict(html="<div class='timer' style='top:760px'><span class='t'>۱۵:۰۰</span><span class='s'>در روز</span></div>",
                          at="P5*0.3", anim="pop", dur=0.4)]),
        dict(at="P6", kind="video", src=M / "m13_book_pages_macro_2802905.mp4",
             p=dict(ss=2.0, speed=0.75, fx=0.5, fy=0.5, z=1.0, dark=0.7, blur=6, z0=1.0, z1=1.05),
             layers=[dict(html=f"<div class='end'><img src='{E.ICON}'>"
                          "<div class='l'>چالش ۳۰ شب کتاب<br><g>از ۱ آذر</g> · روزی ۱۵ دقیقه</div></div>", anim="fadeup", dur=0.4, at="P6"),
                     dict(html="<div class='end' style='top:1260px'><span class='c'>فالو کن که جا نمونی</span></div>",
                          at="P6*0.5", anim="pop", dur=0.35)]),
    ],
    sfx=[("tick", "P1", 0.25), ("rise", "P1+0.2", 0.25), ("tick", "P2", 0.3), ("tick", "P2+0.25", 0.3), ("pop", "P2+0.5", 0.45),
         ("whoosh", "P3", 0.25), ("rise", "P4", 0.35), ("tick", "P4+0.25", 0.25), ("tick", "P4+0.5", 0.25), ("pop", "P4+0.75", 0.5),
         ("whoosh", "P5", 0.25), ("pop", "P5*0.3", 0.4), ("whoosh", "P6", 0.25), ("soft", "P6*0.5", 0.45)],
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
