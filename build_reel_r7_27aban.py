"""R7 · Wed 27 Aban 1405 · «یه کتاب، یه قدم» #2 · «روزی ۱۵ دقیقه ← ۱۲ کتاب» (The Compound Effect, Darren Hardy), ~36 s.
Same format as R3 «روزی ۱٪ بهتر» (29 follows from 1,476 views): number hook from frame 0 → chart beat → 3 ideas →
tonight's step → Azar challenge CTA.

  python build_reel_r7_27aban.py                                  -> reel_r7_27aban/peleh_R7_15daghighe_visual_nomix.mp4
  python build_reel_r7_27aban.py --narration reel_r7_27aban/narration.mp3   -> final + _upload
Math (said on screen): 15 min ≈ 10 pages · ×365 = 3,650 pages ≈ 12 books of 300 pages · Azar: 30 nights ≈ 300 pages = 1 book.
"""
import argparse
from pathlib import Path

import reel_engine as E
from build_reel_r3_20aban import CSS as R3CSS, GOLD, CREAM, NAVY

W = E.W
M = W / "stock" / "magnific_2026-11"
PH = W / "stories_v2" / "assets"
FA = str.maketrans("0123456789", "۰۱۲۳۴۵۶۷۸۹")

CSS = R3CSS + f"""
.bk {{ position:absolute; width:150px; height:196px; border-radius:16px 22px 22px 16px; box-shadow:0 12px 30px rgba(0,0,0,.45);
  display:flex; align-items:flex-end; justify-content:center; padding-bottom:18px; box-sizing:border-box;
  font-size:40px; font-weight:900; }}
.bk:before {{ content:''; position:absolute; left:14px; top:0; bottom:0; width:8px; background:rgba(0,0,0,.18); }}
.bk.g {{ background:linear-gradient(160deg,#E2B655,#B8862E); color:{NAVY}; }}
.bk.c {{ background:linear-gradient(160deg,#F6EFDC,#D9CDAE); color:{NAVY}; }}
.bk.n {{ background:linear-gradient(160deg,#3B5389,#25385F); color:{CREAM}; border:3px solid rgba(201,154,60,.55); }}
.big12 {{ position:absolute; top:1180px; left:0; right:0; text-align:center; }}
.big12 span {{ display:inline-block; background:{GOLD}; color:{NAVY}; font-size:96px; font-weight:900; padding:10px 54px;
  border-radius:40px; box-shadow:0 14px 40px rgba(0,0,0,.5); }}
.flat {{ position:absolute; top:1090px; left:150px; width:470px; text-align:center; }}
.flat span {{ display:inline-block; background:rgba(242,234,211,.96); color:{NAVY}; font-size:44px; font-weight:800;
  padding:14px 28px; border-radius:24px; border:3px dashed #9A6E1B; }}
.grid30 {{ position:absolute; top:760px; left:150px; right:150px; display:grid; grid-template-columns:repeat(6,1fr); gap:22px; direction:rtl; }}
.grid30 i {{ display:block; height:104px; border-radius:20px; background:rgba(242,234,211,.14); border:3px solid rgba(242,234,211,.35);
  font-style:normal; font-size:62px; font-weight:900; line-height:100px; text-align:center; color:{NAVY}; }}
.grid30 i.on {{ background:{GOLD}; border-color:{GOLD}; }}
.eq {{ position:absolute; top:760px; left:70px; right:70px; text-align:center; }}
.eq .r {{ display:block; margin:0 auto 34px; width:fit-content; background:rgba(15,24,44,.82); color:#FFF8EA; font-size:74px;
  font-weight:900; padding:22px 48px; border-radius:30px; border:3px solid rgba(201,154,60,.6); }}
.eq .r.res {{ background:rgba(242,234,211,.97); color:{NAVY}; border:5px solid {GOLD}; font-size:92px; }}
"""

SERIES = "<div class='series'><span>یه کتاب، یه قدم</span></div>"
HOOK = ("<div class='hk'><div class='a'>روزی <g>۱۵ دقیقه</g></div>"
        "<div class='b'>← <g>۱۲ کتاب</g> در سال</div></div>")

# 12 books, one per month, 4 x 3 grid inside the panel
COLS = (790, 574, 358, 142)          # rtl: first book top-right
ROWS = (720, 950, 1180)
BOOKS = []
for i in range(12):
    r, c = divmod(i, 4)
    cls = "gcn"[i % 3]
    BOOKS.append(f"<div class='bk {cls}' style='left:{COLS[c]}px;top:{ROWS[r]}px'>{str(i + 1).translate(FA)}</div>")
PANEL = ("<div class='panel'><div class='ttl'>روزی ۱۵ دقیقه، یک سال<small>هر کتاب = یه ماه</small></div></div>")
FORMULA = ("<div class='formula'><span style='direction:rtl'>۱۵ دقیقه × ۳۶۵ ≈ ۱۲ کتاب</span>"
           "<small>۱۵ دقیقه ≈ ۱۰ صفحه · کتاب ۳۰۰ صفحه‌ای · ایده‌ی کتاب «اثر مرکب» · دارن هاردی</small></div>")

# idea 2: same compound curve language as R3, with the invisible first days marked
pts = []
for i in range(0, 366, 5):
    v = 1.01 ** i
    pts.append(f"{i / 365 * 790 + 4:.1f},{496 - (v - 1) / 36.8 * 470:.1f}")
CURVE_PANEL = ("<div class='panel'><div class='ttl'>نتیجه‌ی کارهای کوچیک<small>روز ۱ تا روز ۳۶۵</small></div>"
               "<div class='axis'></div><div class='xl' style='right:56px'>روز ۳۶۵</div><div class='xl' style='left:100px'>روز ۱</div></div>")
CURVE = ("<div class='panel' style='background:transparent;border-color:transparent;box-shadow:none'>"
         "<svg style='position:absolute;left:114px;top:254px' width='800' height='500' viewBox='0 0 800 500'>"
         f"<polyline points='{' '.join(pts)}' fill='none' stroke='#F0B847' stroke-width='12' stroke-linecap='round' stroke-linejoin='round'/>"
         "</svg></div>")


def grid(n_on):
    cells = "".join(f"<i class='on'>✓</i>" if k < n_on else "<i></i>" for k in range(30))
    return f"<div class='grid30'>{cells}</div>"


CFG = dict(
    out=W / "reel_r7_27aban", name="peleh_R7_15daghighe",
    music=W / "reel_d012" / "music_white_clouds_leberch.mp3", music_from=30.0,
    tail=1.4, loop=0.0, lead=0.12,
    phrases=[
        ("روزی پونزده دقیقه.", 1.9),
        ("یه سال بعد؟ | دوازده تا کتاب.", 2.8),
        ("این حساب ساده‌ی ایده‌ی کتاب «اثر مرکب»ه.", 3.4),
        ("اولین ایده: | پونزده دقیقه‌ی امروز | هیچ فرقی نمی‌کنه. | پونزده دقیقه‌ی هر روز، | همه‌چی رو عوض می‌کنه.", 6.4),
        ("دومی: | روزهای اول | هیچ نتیجه‌ای نمی‌بینی. | بیشتر آدم‌ها | همین‌جا ول می‌کنن.", 5.6),
        ("سومی: | ثبتش کن. | چیزی که هر شب تیک می‌خوره، | ادامه پیدا می‌کنه.", 5.0),
        ("از یک آذر: | سی شب، | هر شب پونزده دقیقه. | یعنی یه کتاب کامل.", 5.0),
        ("اسم کتاب آذرت رو | همین زیر بنویس.", 3.2),
    ],
    segs=[
        # 0: real action from frame 0 — hands open a book; gold dot lands with the hook
        dict(at=0, kind="video", src=M / "m12_hands_open_book_5973869.mp4",
             p=dict(ss=0.6, fx=0.55, fy=0.3, z=1.2, z0=1.0, z1=1.06, br=-0.02, sat=0.95),
             layers=[dict(html=HOOK),
                     dict(html="<div class='dot' style='left:520px;top:1120px'></div>", at=0.25, anim="pop", dur=0.35)]),
        # 1: page turn, tighter, for «یه سال بعد؟ دوازده تا کتاب»
        dict(at="P1", kind="video", src=M / "m11_hands_turn_page_163532.mp4",
             p=dict(ss=7.0, fx=0.74, fy=0.8, z=1.0, z0=1.0, z1=1.08, br=-0.02, sat=0.95),
             layers=[dict(html=HOOK)]),
        # 2: 12 books fill the shelf, one per month
        dict(at="P2", kind="video", src=M / "m13_book_pages_macro_2802905.mp4",
             p=dict(ss=1.0, fx=0.5, fy=0.5, blur=18, dark=0.5, z0=1.0, z1=1.05),
             layers=[dict(html=SERIES + PANEL, fade=0.2)]
                    + [dict(html=b, at=f"P2+{0.15 + k * 0.17:.2f}", anim="pop", dur=0.25) for k, b in enumerate(BOOKS)]
                    + [dict(html=FORMULA, at="P2+0.4", anim="fadeup", dur=0.35)]),
        # 3: idea 1 — one day vs every day
        dict(at="P3", kind="video", src=M / "m07_tea_hands_v_5583255.mp4",
             p=dict(ss=2.0, fx=0.5, fy=0.45, z=1.1, blur=14, dark=0.55, z0=1.0, z1=1.06),
             layers=[dict(html="<div class='idea'><span>ایده‌ی ۱</span></div>"
                          "<div class='ttl2'>کوچیک، ولی <g>هر روز</g></div>"),
                     dict(html="<div class='cards'><div class='cd goal'>۱۵ دقیقه، یه بار<small>هیچ فرقی حس نمی‌کنی</small></div></div>",
                          at="P3*0.2", anim="slide", dur=0.4, dx=260),
                     dict(html="<div class='cards' style='top:1150px'><div class='cd sys'>۱۵ دقیقه × <b>هر روز</b>"
                          "<small>همه‌چی رو عوض می‌کنه</small></div></div>", at="P3*0.62", anim="pop", dur=0.4)]),
        # 4: idea 2 — the invisible first days (compound curve)
        dict(at="P4", kind="video", src=M / "m10_hand_notebook_pen_2785187.mp4",
             p=dict(ss=17.0, fx=0.6, fy=0.4, z=1.1, blur=16, dark=0.55, z0=1.0, z1=1.05),
             layers=[dict(html="<div class='idea' style='top:300px'><span>ایده‌ی ۲</span></div>" + CURVE_PANEL, fade=0.2),
                     dict(html=CURVE, at="P4+0.2", anim="wipe", dur=2.4),
                     dict(html="<div class='flat'><span>اینجا هیچی دیده نمی‌شه</span></div>", at="P4*0.45", anim="pop", dur=0.35),
                     dict(html="<div class='formula'><span style='direction:rtl;font-size:62px'>بیشتر آدم‌ها همین‌جا ول می‌کنن</span></div>",
                          at="P4*0.72", anim="fadeup", dur=0.35)]),
        # 5: idea 3 — track it: 30 squares get ticked
        dict(at="P5", kind="video", src=M / "m08_hand_writing_v_6129005.mp4",
             p=dict(ss=1.0, fx=0.5, fy=0.5, z=1.1, blur=14, dark=0.6, z0=1.0, z1=1.05),
             layers=[dict(html="<div class='idea'><span>ایده‌ی ۳</span></div><div class='ttl2'>ثبتش کن</div>"),
                     dict(html=grid(0), at="P5+0.1", until="P5*0.35"),
                     dict(html=grid(9), at="P5*0.35", until="P5*0.6"),
                     dict(html=grid(18), at="P5*0.6", until="P5*0.82"),
                     dict(html=grid(27), at="P5*0.82")]),
        # 6: Azar — 30 nights x 15 min = 1 book
        dict(at="P6", kind="video", src=M / "m11_hands_turn_page_163532.mp4",
             p=dict(ss=12.5, fx=0.88, fy=0.75, z=1.0, z0=1.0, z1=1.06, br=-0.01, sat=0.92, dark=0.75),
             layers=[dict(html="<div class='ttl2' style='top:440px'>از <g>۱ آذر</g></div>"),
                     dict(html="<div class='eq'><span class='r'>۳۰ شب</span></div>", at="P6*0.2", anim="pop", dur=0.35),
                     dict(html="<div class='eq' style='top:960px'><span class='r'>× ۱۵ دقیقه</span></div>", at="P6*0.45", anim="pop", dur=0.35),
                     dict(html="<div class='eq' style='top:1180px'><span class='r res'>= ۱ کتاب کامل</span></div>",
                          at="P6*0.75", anim="pop", dur=0.4)]),
        # 7: CTA
        dict(at="P7", kind="video", src=M / "m13_book_pages_macro_2802905.mp4",
             p=dict(ss=2.0, speed=0.75, fx=0.5, fy=0.5, z=1.0, dark=0.7, blur=6, z0=1.0, z1=1.05),
             layers=[dict(html=f"<div class='end'><img src='{E.ICON}'>"
                          "<div class='l'>چالش ۳۰ شب کتاب<br><g>از ۱ آذر</g> · روزی ۱۵ دقیقه</div></div>", anim="fadeup", dur=0.4, at="P7"),
                     dict(html="<div class='end' style='top:1260px'><span class='c'>اسم کتاب آذرت رو بنویس 👇</span></div>",
                          at="P7*0.5", anim="pop", dur=0.35)]),
    ],
    sfx=[("pop", 0.25, 0.35), ("page", "P1", 0.3), ("whoosh", "P2", 0.3)]
        + [("tick", f"P2+{0.15 + k * 0.17:.2f}", 0.18) for k in range(0, 12, 2)]
        + [("whoosh", "P3", 0.25), ("tick", "P3*0.2", 0.3), ("pop", "P3*0.62", 0.4),
           ("whoosh", "P4", 0.25), ("rise", "P4+0.2", 0.3), ("pop", "P4*0.45", 0.35), ("soft", "P4*0.72", 0.35),
           ("whoosh", "P5", 0.25), ("tick", "P5*0.35", 0.3), ("tick", "P5*0.6", 0.3), ("tick", "P5*0.82", 0.3),
           ("page", "P6", 0.3), ("pop", "P6*0.2", 0.35), ("pop", "P6*0.45", 0.35), ("soft", "P6*0.75", 0.45),
           ("whoosh", "P7", 0.25), ("soft", "P7*0.5", 0.45)],
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
