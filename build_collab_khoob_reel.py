"""Peleh × نشر خوب collab Reel (Sat 23 Aban 1405, Book Week day 1) — animates the 7 approved storyboard frames.

Same layout/CSS/texts as build_collab_khoob_board.py (frames in collab_khoob/frames/), split into layers so that:
  real-footage frames get push-ins, the three book cards slide/flip in with a page-turn each, the two logos pop in together.

  python build_collab_khoob_reel.py                        -> collab_khoob/reel/peleh_khoob_collab_visual_nomix.mp4
  python build_collab_khoob_reel.py --narration collab_khoob/reel/narration.mp3 --tempo 1.05
                                                           -> peleh_khoob_collab.mp4 + _upload.mp4
  Book covers: put cover_1.jpg / cover_2.jpg / cover_3.jpg (or .png) in collab_khoob/covers/ — or pass
  --cover1 PATH --cover2 PATH --cover3 PATH. Missing covers keep the approved placeholder card.
  Order: 1 «داستان کاهو», 2 «غریبه‌ها», 3 «آشپزخانه‌ی کرملین».
PRIZE RULE: 3 books in total; places 1, 2 and 3 get ONE book each (frame 6 text says so).
"""
import argparse
from pathlib import Path

import reel_engine as E
from build_collab_khoob_board import BOOKS, CSS as BOARD_CSS, ICON as ICON512

W = E.W
OUT = W / "collab_khoob"
STOCK = W / "stock"
CSS = BOARD_CSS + "html, body { background: transparent !important; } .cov { position:absolute; inset:0; border-radius:10px 26px 26px 10px; background-size:cover; background-position:center; }"
KL = (OUT / "khoob_logo_transparent.png").as_uri()
# v3 (2026-11-09): نشر خوب خواست ویدیو «به مناسبت روز کتاب و کتاب‌خوانی» (۲۴ آبان) باشه → انتشار یکشنبه ۲۴ آبان.
# نریشن دست نخورد؛ فقط برچسب روی فریم اول و کارت آخر.
BOOKDAY = ("<div style='position:absolute;top:170px;left:0;right:0;text-align:center'>"
           "<span style='display:inline-block;background:rgba(27,42,74,.82);border:3px solid #C99A3C;border-radius:999px;"
           "padding:14px 30px;font-size:40px;font-weight:800;color:#F2EAD3'>به مناسبت <span style=\"color:#E2B457\">هفته‌ی کتاب و کتاب‌خوانی</span> 📚</span></div>")
# v3b (2026-11-11): نشر خوب تصحیح کرد: «هفته‌ی کتاب و کتاب‌خوانی» (۲۴ تا ۳۰ آبان)، نه «روز کتاب».


def find_cover(i, cli):
    if cli:
        return Path(cli)
    for ext in ("jpg", "jpeg", "png", "webp"):
        p = OUT / "covers" / f"cover_{i}.{ext}"
        if p.exists():
            return p
    return None


def book_layers(i, cover, mode):
    t, a, tr, c, fg = BOOKS[i - 1]
    if cover:
        card = (f"<div class='book' style='background:{c};padding:0'>"
                f"<div class='cov' style=\"background-image:url('{cover.resolve().as_uri()}')\"></div></div>")
    else:
        card = (f"<div class='book' style='background:{c};color:{fg}'><div class='t'>{t}</div>"
                "<div class='ph'>جای عکس جلد اصلی</div></div>")
    # no `at`: both layers start with their shot, so there is never an empty shelf frame between books
    return [dict(html=f"<div class='num'>{'۱۲۳'[i - 1]} از ۳</div><div class='meta'>{a}<span>{tr}</span></div>"),
            dict(html=card)]


def shelf_bg(build: Path) -> Path:
    """The blurred shelf background of frames 3-5, rendered once as a still (same CSS as the board)."""
    jpg = build / "_shelf.jpg"
    E.run(["-ss", "2.0", "-i", str(STOCK / "c_shelf_books.mp4"), "-frames:v", "1", "-vf",
           "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920", "-q:v", "2", str(jpg)])
    png = build / "_shelf_bg.png"
    E.render(f"<div class='bg' style=\"background-image:url('{jpg.as_uri()}');filter:blur(14px) brightness(.55);"
             "transform:scale(1.1)\"></div>", png, BOARD_CSS, transparent=False)
    return png


def end_bg(build: Path) -> Path:
    png = build / "_end_bg.png"
    E.render("<div class='bg' style='background:#1B2A4A'></div>" + BOOKDAY.replace("top:170px", "top:110px") +
             f"<div style='position:absolute;top:250px;left:0;right:0;text-align:center'><img src='{ICON512}' style='width:150px;border-radius:32px;border:3px solid #C99A3C'></div>"
             "<div class='hook' style='top:450px;font-size:84px'>از <g>۱ آذر</g> شروع کن</div>"
             "<div class='steps'>پله ← کتاب ← چالش‌ها ← چالش ۳۰ روزه"
             "<br><span class='small'>نفر ۴ تا ۱۰: ۷ روز پریمیوم</span></div>"
             "<div class='tag'>@pelehapp × @khoobpub</div>", png, BOARD_CSS, transparent=False)
    return png


def make_cfg(covers, build):
    shelf = shelf_bg(build)
    endp = end_bg(build)
    # art-director fix 2026-11-07: cards must be on screen from the first frame of their beat (no blank shelf)
    modes = {1: "pop", 2: "pop", 3: "pop"}
    return dict(
        out=OUT / "reel", name="peleh_khoob_collab",
        music=W / "reel_d010" / "music_leberch_reading.mp3", music_from=70.0,
        tail=0.7, loop=0.0, lead=0.1, gap_phrase=0.5, gap_inner=0.24,
        # v2 (2026-11-08, Vahid: old CTA «کدومش رو اول می‌خونی؟» was weak — each winner gets ONE book).
        # Hook says the rule itself (3 winners, 3 books); CTA = tag a reading partner (reach + group).
        phrases=[
            ("سی شب کتاب. | سه برنده. | سه کتابِ تازه.", 3.2),
            ("داستانِ کاهو، از موراکامی.", 2.0),
            ("غریبه‌ها.", 1.4),
            ("و آشپزخونه‌ی کرملین.", 1.8),
            # v3b: «به مناسبتِ هفته‌ی کتاب و کتاب‌خوانی» (narration_v3_bookweek.mp3)
            ("به مناسبتِ هفته‌ی کتاب و کتاب‌خوانی، | هدیه‌ی نشرِ خوب: | نفرِ اول، دوم و سوم، هر کدوم یکی.", 7.2),
            ("شرطش؟ | فقط روزی پونزده دقیقه؛ از اولِ آذر.", 3.2),
            ("یه نفر رو تگ کن که باید باهات بخونه.", 2.6),
        ],
        segs=[
            # frame 1: night reading, push-in, hook from 0 s (the rule is in the hook: 3 winners, 3 books)
            dict(at=0, kind="video", src=STOCK / "e_night_reading_bed.mp4",
                 p=dict(ss=4.0, z0=1.0, z1=1.08, zx=0.5, zy=0.4, br=0.0, sat=1.0),
                 layers=[dict(html="<div class='shade'></div>" + BOOKDAY + "<div class='hook'>۳۰ شب کتاب.<br>۳ برنده. <g>۳ کتاب.</g></div>")]),
            # frames 2-4: the three books
            *[dict(at=f"P{i}", kind="photo", src=shelf, p=dict(z0=1.0, z1=1.05, br=0.0, sat=1.0),
                   layers=book_layers(i, covers[i - 1], modes[i])) for i in (1, 2, 3)],
            # frame 5: co-brand — both logos, then the prize line (1 book per place)
            dict(at="P4", kind="photo", src=W / "stories_v2" / "assets" / "stack_13130636_w.jpg",
                 p=dict(z0=1.0, z1=1.08, fx=0.5, fy=0.5, dark=0.45, br=0.0, sat=1.0),
                 layers=[dict(html=f"<div class='logos'><div class='lb peleh'><img src='{ICON512}'></div><div class='x'>×</div>"
                              f"<div class='lb'><img src='{KL}'></div></div>"),
                         dict(html="<div class='box' style='top:1000px;font-size:64px'>هدیه‌ی <g>نشر خوب</g><br>"
                              "<span class='small'>نفر اول تا سوم جدول آذر<br>هر نفر <b style=\"color:#E2B457\">یک کتاب</b></span></div>",
                              at="P4+0.3", anim="fadeup", dur=0.3)]),
            # frame 6: the condition — macro pages
            dict(at="P5", kind="video", src=STOCK / "d_book_macro.mp4",
                 p=dict(ss=3.0, z0=1.0, z1=1.1, br=0.0, sat=1.0),
                 layers=[dict(html="<div class='shade'></div>"),
                         dict(html="<div class='box' style='top:720px'>شرطش؟<br><g>روزی ۱۵ دقیقه</g><br>"
                              "<span class='small'>از ۱ آذر · ۳۰ شب</span></div>")]),
            # frame 7: navy end card + tag CTA
            dict(at="P6", kind="photo", src=endp, p=dict(z0=1.0, z1=1.02, br=0.0, sat=1.0),
                 layers=[dict(html="<div class='box' style='top:1160px;font-size:60px;padding:28px'>یه نفر رو <g>تگ کن</g><br>"
                              "که باید باهات بخونه 👇</div>")]),
        ],
        sfx=[("page", "P1", 0.45), ("page", "P2", 0.45), ("page", "P3", 0.45), ("pop", "P4", 0.45),
             ("soft", "P4+0.3", 0.4), ("whoosh", "P5", 0.25), ("tick", "P5", 0.3), ("pop", "P6", 0.4)],
    )


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--narration")
    ap.add_argument("--tempo", type=float, default=1.0)
    ap.add_argument("--bounds")
    for i in (1, 2, 3):
        ap.add_argument(f"--cover{i}")
    a = ap.parse_args()
    b = OUT / "reel" / "_build"
    b.mkdir(parents=True, exist_ok=True)
    covers = [find_cover(i, getattr(a, f"cover{i}")) for i in (1, 2, 3)]
    print("covers:", [str(c) if c else "placeholder" for c in covers])
    cfg = make_cfg(covers, b)
    if a.bounds:
        cfg["force_bounds"] = [int(x) for x in a.bounds.split(",")]
    E.build(cfg, Path(a.narration) if a.narration else None, a.tempo, CSS)
