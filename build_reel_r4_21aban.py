"""R4 · Thu 21 Aban 1405 · «سومین بار، از صفحه‌ی یک» (format «این منم»), ~11-12 s.

  python build_reel_r4_21aban.py                          -> reel_r4_21aban/peleh_R4_sevomin_bar_visual_nomix.mp4
  python build_reel_r4_21aban.py --narration reel_r4_21aban/narration.mp3
                                                          -> peleh_R4_sevomin_bar.mp4 + _upload.mp4 (beats re-timed to the speech)
  options: --tempo 1.05   --bounds 1,2,4 (force phrase cuts after these speech chunks)
"""
import argparse
from pathlib import Path

import reel_engine as E
from build_reels_7_8aban import BASE_CSS

W = E.W
M = W / "stock" / "magnific_2026-11"
GOLD, CREAM, NAVY = "#C99A3C", "#F2EAD3", "#1B2A4A"

CSS = BASE_CSS + f"""
.hk {{ position:absolute; top:520px; left:0; right:0; text-align:center; color:#FFF8EA; font-weight:900;
  padding:90px 20px; line-height:1.3; text-shadow:0 4px 18px rgba(0,0,0,.85),0 0 3px rgba(0,0,0,.9);
  background:linear-gradient(180deg,rgba(10,16,30,0) 0%,rgba(10,16,30,.62) 22%,rgba(10,16,30,.62) 78%,rgba(10,16,30,0) 100%); }}
.hk .a {{ font-size:112px; }} .hk .b {{ font-size:112px; }}
.pg {{ position:absolute; top:1010px; left:0; right:0; text-align:center; }}
.pg span {{ display:inline-block; background:rgba(242,234,211,.95); color:{NAVY}; font-size:58px; font-weight:900;
  padding:16px 42px; border-radius:40px; border:4px solid {GOLD}; box-shadow:0 14px 40px rgba(0,0,0,.45); }}
.pg span.red {{ background:#F6E1D8; border-color:#E0584A; color:#8E2B2B; }}
.qt {{ position:absolute; top:700px; left:80px; right:80px; text-align:center; color:#FFF8EA; font-size:96px; font-weight:900;
  line-height:1.35; text-shadow:0 6px 24px rgba(0,0,0,.9); }}
.rule {{ position:absolute; top:640px; left:80px; right:80px; text-align:center; }}
.rule .k {{ display:inline-block; background:{GOLD}; color:{NAVY}; font-size:48px; font-weight:900; padding:12px 36px; border-radius:34px; }}
.rule .m {{ margin-top:30px; background:rgba(242,234,211,.97); color:{NAVY}; font-size:84px; font-weight:900; line-height:1.4;
  padding:36px 30px; border-radius:34px; border:4px solid {GOLD}; box-shadow:0 24px 70px rgba(0,0,0,.55); }}
.rule .m b {{ color:#9A6E1B; }}
.rule .m small {{ display:block; font-size:54px; font-weight:700; color:#5D5240; margin-top:6px; }}
.end {{ position:absolute; top:720px; left:80px; right:80px; text-align:center; }}
.end .q {{ background:rgba(27,42,74,.92); color:{CREAM}; font-size:74px; font-weight:900; line-height:1.45;
  padding:36px 30px; border-radius:32px; }}
.end img {{ margin-top:46px; width:120px; height:120px; border-radius:28px; border:3px solid {GOLD}; }}
"""

HOOK = "<div class='hk'><div class='a'><g>سومین</g> بار،</div><div class='b'>از صفحه‌ی یک.</div></div>"


def page(n, red=False):
    return f"<div class='pg'><span class='{'red' if red else ''}'>صفحه‌ی {n}</span></div>"


CFG = dict(
    out=W / "reel_r4_21aban", name="peleh_R4_sevomin_bar",
    music=W / "audio" / "music.mp3", music_from=30.0,
    tail=0.8, loop=0.4, lead=0.1,
    phrases=[
        ("سومین بار. | از صفحه‌ی یک.", 2.6),
        ("چون یادت رفته چی شد.", 1.8),
        ("این بار از اول نه؛ | دو صفحه عقب‌تر از جایی که موندی.", 3.9),
        ("بقیه‌ش خودش یادت می‌آد.", 2.0),
    ],
    segs=[
        # 0: real action — a hand on a book mid-way, pages flip back; the page counter rewinds to 1
        dict(at=0, kind="video", src=M / "m11_hands_turn_page_163532.mp4",
             p=dict(ss=7.0, fx=0.86, fy=0.5, z=1.0, z0=1.0, z1=1.07, sat=0.95),
             layers=[dict(html=HOOK),
                     dict(html=page("۱۴۲"), until="P0+0.75"),
                     dict(html=page("۹۶"), at="P0+0.75", until="P0+1.15"),
                     dict(html=page("۴۱"), at="P0+1.15", until="P0+1.5"),
                     dict(html=page("۱", red=True), at="P0+1.5", anim="pop", dur=0.3)]),
        # 1: fast flip backwards (macro pages, reversed)
        dict(at="P1", kind="video", src=M / "m13_book_pages_macro_2802905.mp4",
             p=dict(ss=1.8, reverse=True, speed=1.6, fx=0.5, fy=0.5, z=1.0, z0=1.05, z1=1.0, dark=0.85),
             layers=[dict(html="<div class='qt'>«یادم رفته<br>چی شد…»</div>", anim="fadeup", dur=0.3, at="P1")]),
        # 2: the payoff rule
        dict(at="P2", kind="video", src=M / "m11_hands_turn_page_163532.mp4",
             p=dict(ss=12.5, fx=0.88, fy=0.5, z=1.1, z0=1.0, z1=1.06, sat=0.95, br=-0.04),
             layers=[dict(html="<div class='rule'><span class='k'>قانون پله</span>"
                          "<div class='m'><b>۲ صفحه</b> عقب‌تر،<small>نه از اول</small></div></div>",
                          at="P2", anim="pop", dur=0.4),
                     dict(html="<div class='pg' style='top:1260px'><span>صفحه‌ی ۱۴۰</span></div>", at="P2*0.6", anim="fadeup", dur=0.3)]),
        # 3: warm open book + question
        dict(at="P3", kind="video", src=M / "m12_hands_open_book_5973869.mp4",
             p=dict(ss=6.0, fx=0.57, fy=0.25, z=1.1, z0=1.0, z1=1.06, dark=0.7, sat=0.95),
             layers=[dict(html=f"<div class='end'><div class='q'>تو چند بار<br>از اول شروع کردی؟</div><img src='{E.ICON}'></div>",
                          anim="fadeup", dur=0.35, at="P3")]),
    ],
    sfx=[("page", 0.75, 0.4), ("tick", "P0+0.75", 0.25), ("tick", "P0+1.15", 0.25), ("pop", "P0+1.5", 0.4),
         ("whoosh", "P1", 0.3), ("page", "P1+0.2", 0.3), ("pop", "P2", 0.45), ("tick", "P2*0.6", 0.3),
         ("soft", "P3", 0.4)],
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
