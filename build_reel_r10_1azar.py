"""R10 · Sun 1 Azar 1405 · «۵ کتاب که تو همین ۳۰ شب تموم می‌شن» — with the REAL book covers Vahid sent (reel_r10_1azar/covers/).
Nights = pages / 10 per night, rounded as spoken in the narration.

  python build_reel_r10_1azar.py --narration reel_r10_1azar/narration.mp3
"""
import argparse
from pathlib import Path

import reel_engine as E
from build_reel_r3_20aban import CSS as R3CSS, GOLD, CREAM, NAVY

W = E.W
M = W / "stock" / "magnific_2026-11"
PH = W / "stories_v2" / "assets"
CV = W / "reel_r10_1azar" / "covers"
U = lambda n: (CV / n).as_uri()

CSS = R3CSS + f"""
.hk5 {{ position:absolute; top:330px; left:40px; right:40px; text-align:center; color:#FFF8EA; font-weight:900; line-height:1.3;
  text-shadow:0 4px 18px rgba(0,0,0,.9); }}
.hk5 .a {{ font-size:120px; }} .hk5 .b {{ font-size:74px; }}
.row5 {{ position:absolute; top:800px; left:30px; right:30px; display:flex; gap:14px; justify-content:center; direction:rtl; }}
.row5 img {{ width:190px; height:285px; object-fit:cover; border-radius:10px; box-shadow:0 16px 40px rgba(0,0,0,.6); }}
.row5 img:nth-child(odd) {{ transform:translateY(-26px) rotate(-2deg); }} .row5 img:nth-child(even) {{ transform:translateY(22px) rotate(2deg); }}
.one {{ position:absolute; top:330px; left:0; right:0; text-align:center; }}
.one .k {{ display:inline-block; background:rgba(15,24,44,.8); color:{CREAM}; font-size:40px; font-weight:800; padding:8px 28px; border-radius:26px;
  border:2px solid rgba(201,154,60,.6); }}
.one img {{ display:block; margin:34px auto 0; width:520px; height:780px; object-fit:cover; border-radius:16px;
  box-shadow:0 30px 80px rgba(0,0,0,.65), 0 0 0 4px rgba(242,234,211,.9); }}
.one .t {{ margin-top:34px; color:#FFF8EA; font-size:68px; font-weight:900; text-shadow:0 4px 18px rgba(0,0,0,.9); }}
.one .t small {{ display:block; font-size:38px; font-weight:700; color:#E8DDC0; margin-top:4px; }}
.night {{ position:absolute; top:1010px; left:90px; }}
.night span {{ display:inline-block; background:{GOLD}; color:{NAVY}; font-size:76px; font-weight:900; padding:12px 34px; border-radius:30px;
  box-shadow:0 14px 40px rgba(0,0,0,.55); transform:rotate(-6deg); }}
.bar30 {{ position:absolute; top:820px; left:90px; right:90px; display:grid; grid-template-columns:repeat(10,1fr); gap:14px; direction:rtl; }}
.bar30 i {{ display:block; height:78px; border-radius:14px; background:rgba(242,234,211,.14); border:2px solid rgba(242,234,211,.3); }}
.bar30 i.a {{ background:#F0B847; border-color:#F0B847; }} .bar30 i.b {{ background:{CREAM}; border-color:{CREAM}; }} .bar30 i.c {{ background:#7FA0E0; border-color:#7FA0E0; }}
.res {{ position:absolute; top:1180px; left:0; right:0; text-align:center; }}
.res span {{ display:inline-block; background:rgba(242,234,211,.97); color:{NAVY}; font-size:80px; font-weight:900; padding:20px 50px; border-radius:34px;
  border:5px solid {GOLD}; }}
.top {{ position:absolute; top:480px; left:60px; right:60px; text-align:center; color:#FFF8EA; font-size:76px; font-weight:900;
  line-height:1.35; text-shadow:0 4px 18px rgba(0,0,0,.9); }}
"""

BOOKS = [("shazdeh.jpg", "شازده کوچولو", "آنتوان دو سنت‌اگزوپری", "۱۱"),
         ("mazraeh.jpg", "مزرعه‌ی حیوانات", "جورج اورول", "۱۲"),
         ("maskh.jpg", "مسخ", "فرانتس کافکا", "۸"),
         ("pirmard.jpg", "پیرمرد و دریا", "ارنست همینگوی", "۱۱"),
         ("biganeh.jpg", "بیگانه", "آلبر کامو", "۱۲")]
ROW = "<div class='row5'>" + "".join(f"<img src='{U(b[0])}'>" for b in BOOKS) + "</div>"
HOOK = "<div class='hk5'><div class='a'><g>۵ کتاب</g></div><div class='b'>هر کدوم کمتر از <g>۱۳ شب</g></div></div>"
BGV = dict(kind="video", src=M / "m13_book_pages_macro_2802905.mp4")


def one(k, b):
    return (f"<div class='one'><span class='k'>{'۱۲۳۴۵'[k]} از ۵</span><img src='{U(b[0])}'>"
            f"<div class='t'>{b[1]}<small>{b[2]}</small></div></div>")


def bar(a, b_, c):
    cells = "".join(f"<i class='{'a' if k < a else 'b' if k < a + b_ else 'c' if k < a + b_ + c else ''}'></i>" for k in range(30))
    return f"<div class='bar30'>{cells}</div>"


segs = [
    dict(at=0, p=dict(ss=1.0, fx=0.5, fy=0.5, blur=10, dark=0.45, z0=1.0, z1=1.05), layers=[dict(html=HOOK + ROW)], **BGV),
    dict(at="P1", p=dict(ss=3.0, fx=0.5, fy=0.5, blur=10, dark=0.45, z0=1.05, z1=1.09),
         layers=[dict(html=HOOK + ROW),
                 dict(html="<div class='res' style='top:1250px'><span>شبی فقط ۱۰ صفحه</span></div>", at="P1+0.05", anim="pop", dur=0.35)], **BGV),
]
for k, b in enumerate(BOOKS):
    segs.append(dict(at=f"P{k + 2}", p=dict(ss=1.0 + k * 1.5, fx=0.5, fy=0.5, blur=18, dark=0.4, z0=1.0, z1=1.05),
                     layers=[dict(html=one(k, b), at=f"P{k + 2}", anim="fadeup", dur=0.25),
                             dict(html=f"<div class='night'><span>≈ {b[3]} شب</span></div>", at=f"P{k + 2}*0.45", anim="pop", dur=0.3)], **BGV))
segs.append(dict(at="P7", kind="video", src=M / "m11_hands_turn_page_163532.mp4",
                 p=dict(ss=7.0, fx=0.74, fy=0.8, blur=12, dark=0.5, z0=1.0, z1=1.05),
                 layers=[dict(html="<div class='top'>تو همین <g>۳۰ شب</g></div>"),
                         dict(html=bar(0, 0, 0), at="P7", until="P7*0.25"),
                         dict(html=bar(11, 0, 0), at="P7*0.25", until="P7*0.5"),
                         dict(html=bar(11, 8, 0), at="P7*0.5", until="P7*0.75"),
                         dict(html=bar(11, 8, 11), at="P7*0.75"),
                         dict(html="<div class='res'><span>۲ تا ۳ کتاب ✅</span></div>", at="P7*0.75", anim="pop", dur=0.35)]))
segs.append(dict(at="P8", kind="photo", src=PH / "darkread_404515042.jpg", p=dict(z0=1.0, z1=1.07, fx=0.5, fy=0.45, dark=0.6, blur=3),
                 layers=[dict(html=f"<div class='end'><img src='{E.ICON}'><div class='l'>چالش ۳۰ شب کتاب<br><g>از امشب</g></div></div>", anim="fadeup", dur=0.35, at="P8"),
                         dict(html="<div class='end' style='top:1260px'><span class='c'>کدومش؟ شماره‌ش رو بنویس 👇</span></div>",
                              at="P8*0.5", anim="pop", dur=0.35)]))

CFG = dict(
    out=W / "reel_r10_1azar", name="peleh_R10_5_ketab",
    music=W / "reel_d012" / "music_white_clouds_leberch.mp3", music_from=50.0,
    tail=1.4, loop=0.0, lead=0.12,
    phrases=[("پنج تا کتاب، | که هر کدوم تو کمتر از سیزده شب تموم می‌شه.", 4.0),
             ("شبی فقط ده صفحه.", 1.8),
             ("شازده کوچولو: | یازده شب.", 2.4),
             ("مزرعه‌ی حیوانات: | دوازده شب.", 2.6),
             ("مسخ: | هشت شب.", 2.0),
             ("پیرمرد و دریا: | یازده شب.", 2.4),
             ("بیگانه: | دوازده شب.", 2.2),
             ("یعنی تو همین سی شب، | دو سه تا کتاب تموم کردی.", 3.6),
             ("چالش از امشب شروع می‌شه. | کدومش رو برمی‌داری؟", 3.6)],
    segs=segs,
    sfx=[("pop", 0.2, 0.3), ("pop", "P1+0.05", 0.35)] + [("page", f"P{k}", 0.3) for k in range(2, 7)] + [("pop", f"P{k}*0.45", 0.3) for k in range(2, 7)]
        + [("whoosh", "P7", 0.25), ("tick", "P7*0.25", 0.3), ("tick", "P7*0.5", 0.3), ("pop", "P7*0.75", 0.4), ("whoosh", "P8", 0.25), ("soft", "P8*0.5", 0.4)],
)

if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--narration"); ap.add_argument("--tempo", type=float, default=1.0); ap.add_argument("--bounds")
    a = ap.parse_args()
    if a.bounds:
        CFG["force_bounds"] = [int(x) for x in a.bounds.split(",")]
    E.build(CFG, Path(a.narration) if a.narration else None, a.tempo, CSS)
