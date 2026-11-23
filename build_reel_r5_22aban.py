"""R5 · Fri 22 Aban 1405 · «وقتی شرایطش بهتر شد، شروع می‌کنم.» (Friday series, an excuse + a 2-minute step), ~13-15 s.

  python build_reel_r5_22aban.py                          -> reel_r5_22aban/peleh_R5_sharayet_visual_nomix.mp4
  python build_reel_r5_22aban.py --narration reel_r5_22aban/narration.mp3
                                                          -> peleh_R5_sharayet.mp4 + _upload.mp4
  options: --tempo 1.05   --bounds 1,2,4
Tone rule: «شرایط» is sensitive (economy, war worries). Never mock it; the message is «کوچیکش کن، تعطیلش نکن».
"""
import argparse
from pathlib import Path

import reel_engine as E
from build_reel_r4_21aban import CSS as R4_CSS

W = E.W
M = W / "stock" / "magnific_2026-11"
GOLD, CREAM, NAVY = "#C99A3C", "#F2EAD3", "#1B2A4A"

CSS = R4_CSS + f"""
.hk .a, .hk .b {{ font-size:96px; }}
.wait {{ position:absolute; top:640px; left:0; right:0; text-align:center; color:#FFF8EA; font-size:92px; font-weight:900;
  line-height:1.4; padding:90px 40px; text-shadow:0 6px 24px rgba(0,0,0,.9);
  background:linear-gradient(180deg,rgba(10,16,30,0) 0%,rgba(10,16,30,.72) 22%,rgba(10,16,30,.72) 78%,rgba(10,16,30,0) 100%); }}
.cal {{ position:absolute; top:1120px; left:0; right:0; text-align:center; }}
.cal span {{ display:inline-block; margin:0 10px; background:rgba(242,234,211,.95); color:{NAVY}; font-size:46px; font-weight:900;
  padding:14px 28px; border-radius:22px; border:3px solid {GOLD}; }}
.cal span.x {{ opacity:.45; text-decoration:line-through; }}
.timer {{ position:absolute; top:1180px; left:0; right:0; text-align:center; }}
.timer span {{ display:inline-block; background:rgba(27,42,74,.92); color:{CREAM}; font-size:120px; font-weight:900;
  padding:20px 54px; border-radius:36px; border:4px solid {GOLD}; direction:ltr; }}
"""

HOOK = "<div class='hk'><div class='a'>«وقتی <g>شرایطش</g> بهتر شد،</div><div class='b'>شروع می‌کنم.»</div></div>"


def timer(t):
    return f"<div class='timer'><span>{t}</span></div>"


CFG = dict(
    out=W / "reel_r5_22aban", name="peleh_R5_sharayet",
    music=W / "audio" / "music.mp3", music_from=48.0,
    tail=0.8, loop=0.4, lead=0.1,
    phrases=[
        ("«وقتی شرایطش بهتر شد، شروع می‌کنم.»", 2.8),
        ("ولی شرایطِ بهتر... معمولاً خبر نمی‌ده.", 2.6),
        ("اگه شرایطت سخته، کوچیکش کن؛ تعطیلش نکن. | دو دقیقه. همین امروز.", 4.6),
        ("بهانه‌ی خودت چیه؟ | جمعه‌ی بعد یکی رو جواب می‌دم.", 3.2),
    ],
    segs=[
        # 0: real action — a closed notebook being pushed aside / hand resting on it
        dict(at=0, kind="video", src=M / "m10_hand_notebook_pen_2785187.mp4",
             p=dict(ss=2.0, fx=0.55, fy=0.5, z=1.0, z0=1.0, z1=1.07, sat=0.9, br=-0.03),
             layers=[dict(html=HOOK)]),
        # 1: waiting — tea in hands, the "better day" keeps moving on the calendar
        dict(at="P1", kind="video", src=M / "m07b_tea_hands_720_5583255.mp4",
             p=dict(ss=0.5, fx=0.5, fy=0.5, z=1.05, z0=1.05, z1=1.0, dark=0.8, sat=0.9),
             layers=[dict(html="<div class='wait'>شرایطِ بهتر<br><g>معمولاً خبر نمی‌ده.</g></div>", at="P1", anim="fadeup", dur=0.3)]),
        # 2: the step — hands open a book, 2-minute timer starts
        dict(at="P2", kind="video", src=M / "m12_hands_open_book_5973869.mp4",
             p=dict(ss=2.0, fx=0.57, fy=0.3, z=1.1, z0=1.0, z1=1.06, sat=0.95),
             layers=[dict(html="<div class='rule'><span class='k'>قدم ۲ دقیقه‌ای</span>"
                          "<div class='m'><b>کوچیکش</b> کن،<small>تعطیلش نکن</small></div></div>",
                          at="P2", anim="pop", dur=0.4),
                     dict(html=timer("۲:۰۰"), at="P2*0.55", until="P2*0.75", anim="pop", dur=0.25),
                     dict(html=timer("۱:۵۹"), at="P2*0.75", until="P2*0.9"),
                     dict(html=timer("۱:۵۸"), at="P2*0.9")]),
        # 3: question + series promise
        dict(at="P3", kind="video", src=M / "m11_hands_turn_page_163532.mp4",
             p=dict(ss=3.0, fx=0.86, fy=0.5, z=1.05, z0=1.0, z1=1.05, dark=0.7, sat=0.95),
             layers=[dict(html=f"<div class='end'><div class='q'>بهانه‌ی خودت چیه؟<br>"
                          f"<span style='font-size:52px;color:{GOLD}'>جمعه‌ی بعد یکی رو جواب می‌دم</span></div><img src='{E.ICON}'></div>",
                          anim="fadeup", dur=0.35, at="P3")]),
    ],
    sfx=[("page", 0.2, 0.3), ("whoosh", "P1", 0.3), ("pop", "P2", 0.45),
         ("tick", "P2*0.55", 0.3), ("tick", "P2*0.75", 0.2), ("tick", "P2*0.9", 0.2), ("soft", "P3", 0.4)],
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
