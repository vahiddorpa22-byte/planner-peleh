"""Trial T8 · Thu 12 Azar 1405, 13:00 · «۳ کتاب زیر ۱۵۰ صفحه» — real covers from Taaghche (reel_trial_t8/covers/).
Pages (Taaghche listing): شطرنج ۱۱۲ (ترجمه‌ی علی منصوری)، نامه به کودکی که هرگز زاده نشد ۱۲۲ (ترجمه‌ی محمدصادق سبط‌الشیخ)،
مرگ ایوان ایلیچ ۱۰۳ (ترجمه‌ی سروش حبیبی). Nights = pages / 10, rounded up.
"""
import importlib
import shutil
from pathlib import Path

import reel_engine as E
from build_reel_r10_1azar import CSS as R10CSS
from build_reel_r13_7azar import CSS as R13CSS

WK = importlib.import_module("build_week_8-15azar")
W = E.W
M = W / "stock" / "magnific_2026-11"
CV = W / "reel_trial_t8" / "covers"
U = lambda n: (CV / n).as_uri()
BOOKS = [("c13291.jpg", "شطرنج", "اشتفان تسوایگ · ۱۱۲ صفحه", "۱۲"),
         ("c10209.jpg", "نامه به کودکی که هرگز زاده نشد", "اوریانا فالاچی · ۱۲۲ صفحه", "۱۳"),
         ("c139526.jpg", "مرگ ایوان ایلیچ", "لئو تولستوی · ۱۰۳ صفحه", "۱۱")]
CSS = R13CSS + WCSS if False else None
CSS = R13CSS + WK.CSS + R10CSS + """
.row3 { position:absolute; top:820px; left:60px; right:60px; display:flex; gap:26px; justify-content:center; direction:rtl; }
.row3 img { width:270px; height:400px; object-fit:cover; border-radius:12px; box-shadow:0 18px 44px rgba(0,0,0,.6); }
.row3 img:nth-child(2) { transform:translateY(-30px); }
.one .t { font-size:60px; }
"""
ROW = "<div class='row3'>" + "".join(f"<img src='{U(b[0])}'>" for b in BOOKS) + "</div>"
HOOK = "<div class='hk5'><div class='a'><g>۳ کتاب</g></div><div class='b'>زیر ۱۵۰ صفحه</div></div>"


def one(k, b):
    return (f"<div class='one'><span class='k'>{'۱۲۳'[k]} از ۳</span><img src='{U(b[0])}'>"
            f"<div class='t'>{b[1]}<small>{b[2]}</small></div></div>")


segs = [dict(at=0, kind="video", src=M / "m35_girl_couch_reading_473257.mp4", p=dict(ss=2.0, fx=0.62, fy=0.5, dark=0.55, blur=2, z0=1.0, z1=1.06),
             layers=[dict(html=HOOK + ROW)])]
clips = [("m38_man_reading_1711287.mp4", 1.0), ("m36_hands_touch_book_2492925.mp4", 3.0), ("m39_coffee_window_3709113.mp4", 1.0)]
for k, b in enumerate(BOOKS):
    segs.append(dict(at=f"P{k + 1}", kind="video", src=M / clips[k][0], p=dict(ss=clips[k][1], fx=0.5, fy=0.5, blur=16, dark=0.45, z0=1.0, z1=1.05),
                     layers=[dict(html=one(k, b), at=f"P{k + 1}", anim="fadeup", dur=0.25),
                             dict(html=f"<div class='night'><span>≈ {b[3]} شب</span></div>", at=f"P{k + 1}*0.5", anim="pop", dur=0.3)]))
segs.append(dict(at="P4", kind="video", src=M / "m31_man_sofa_reading_177804.mp4", p=dict(ss=9.0, fx=0.6, fy=0.5, dark=0.55, blur=5, z0=1.0, z1=1.05),
                 layers=[dict(html="<div class='top' style='top:560px'>شبی <g>۱۰ صفحه</g></div>" + ROW),
                         dict(html="<div class='res' style='top:1320px'><span>هر کدوم کمتر از ۲ هفته ✅</span></div>", at="P4*0.5", anim="pop", dur=0.35)]))
segs.append(dict(at="P5", kind="video", src=M / "m32_rain_night_window_3543939.mp4", p=dict(ss=4.0, speed=0.4, fx=0.5, fy=0.5, dark=0.6, blur=6, z0=1.0, z1=1.05),
                 layers=WK.end("چالش ۳۰ شب کتاب<br><g>هر هفته یه لیست</g>", "فالو کن 👇", "P5", "P5*0.35")))

CFG = dict(
    out=W / "reel_trial_t8", name="peleh_T8_3ketab",
    music=W / "reel_d012" / "music_white_clouds_leberch.mp3", music_from=95.0, tail=1.3, loop=0.0, lead=0.1,
    phrases=[("سه تا کتاب، | هر کدوم زیر صد و پنجاه صفحه.", 3.6), ("شطرنج، | از اشتفان تسوایگ.", 2.6),
             ("نامه به کودکی که هرگز زاده نشد، | از اوریانا فالاچی.", 4.4), ("مرگ ایوان ایلیچ، | از تولستوی.", 2.6),
             ("با شبی ده صفحه، | هر کدوم کمتر از دو هفته.", 3.4), ("فالو کن که لیست بعدی رو از دست ندی.", 2.6)],
    segs=segs,
    sfx=[("pop", 0.2, 0.3)] + [("page", f"P{k}", 0.3) for k in range(1, 4)] + [("pop", f"P{k}*0.5", 0.3) for k in range(1, 4)]
        + [("whoosh", "P4", 0.25), ("pop", "P4*0.5", 0.4), ("whoosh", "P5", 0.25), ("soft", "P5*0.35", 0.4)],
)

if __name__ == "__main__":
    shutil.rmtree(CFG["out"] / "_build", ignore_errors=True)
    E.build(CFG, W / "reel_trial_t8" / "narration.mp3", 1.0, CSS)
