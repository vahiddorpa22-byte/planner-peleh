"""R9 · Thu 28 Aban 1405 · «یه کتاب، یه قدم» #3 · «۴ کلمه» (The Happiness Trap, Russ Harris) — the book a follower
asked for under R3 (@amid0503). Hook: four words that shrink the voice in your head: «دارم فکر می‌کنم که…». ~36 s.

  python build_reel_r9_28aban.py                                  -> reel_r9_28aban/peleh_R9_4kalame_visual_nomix.mp4
  python build_reel_r9_28aban.py --narration reel_r9_28aban/narration.mp3   -> final + _upload
"""
import argparse
from pathlib import Path

import reel_engine as E
from build_reel_r3_20aban import CSS as R3CSS, GOLD, CREAM, NAVY

W = E.W
M = W / "stock" / "magnific_2026-11"
PH = W / "stories_v2" / "assets"

CSS = R3CSS + f"""
.ask {{ position:absolute; top:1640px; left:0; right:0; text-align:center; }}
.ask span {{ display:inline-block; background:rgba(242,234,211,.95); color:{NAVY}; font-size:40px; font-weight:800;
  padding:12px 30px; border-radius:30px; }}
.blob {{ position:absolute; left:50%; top:1080px; transform:translate(-50%,-50%); border-radius:50%;
  background:radial-gradient(circle at 40% 35%,#6B5A8E,#2C2346); box-shadow:0 0 60px rgba(120,90,170,.45);
  display:flex; align-items:center; justify-content:center; color:#F2EAD3; font-weight:900; }}
.vs {{ position:absolute; top:780px; left:90px; right:90px; }}
.vs .row {{ display:flex; justify-content:space-between; align-items:center; border-radius:32px; padding:30px 44px; margin-bottom:46px;
  font-size:64px; font-weight:900; }}
.vs .row.th {{ background:rgba(15,24,44,.85); color:#FFF8EA; border:3px solid rgba(242,234,211,.35); }}
.vs .row.tr {{ background:rgba(242,234,211,.96); color:{NAVY}; border:4px solid {GOLD}; }}
.vs .row small {{ font-size:44px; font-weight:800; }}
.vs .row.th small {{ color:#F0B847; }} .vs .row.tr small {{ color:#9A6E1B; }}
.four {{ position:absolute; top:1330px; left:0; right:0; text-align:center; }}
.four span {{ display:inline-block; margin:0 8px; background:{GOLD}; color:{NAVY}; font-size:58px; font-weight:900; padding:10px 26px;
  border-radius:22px; }}
"""

SERIES = "<div class='series'><span>یه کتاب، یه قدم</span></div>"
HOOK = ("<div class='hk'><div class='a'><g>۴ کلمه</g></div>"
        "<div class='b' style='font-size:88px'>که صدای توی سرت رو کوچیک می‌کنه</div></div>")
CREDIT = ("<div class='formula' style='top:1180px'><span style='direction:rtl;font-size:66px'>کتاب «تله شادمانی»</span>"
          "<small>راس هریس · پیشنهاد یکی از شما 💛</small></div>")
FOUR = "<div class='four'>" + "".join(f"<span>{w}</span>" for w in ("دارم", "فکر", "می‌کنم", "که")) + "</div>"


def blob(px, label):
    return f"<div class='blob' style='width:{px}px;height:{px}px;font-size:{max(44, px // 6)}px'>{label}</div>"


CFG = dict(
    out=W / "reel_r9_28aban", name="peleh_R9_4kalame",
    music=W / "reel_d012" / "music_white_clouds_leberch.mp3", music_from=60.0,
    tail=1.4, loop=0.0, lead=0.12,
    phrases=[
        ("چهار کلمه.", 1.4),
        ("که صدای توی سرت رو | کوچیک می‌کنه.", 2.6),
        ("این ایده‌ی کتاب «تله شادمانی»ه؛ | پیشنهاد یکی از شما.", 3.6),
        ("اولین ایده: | هرچی بیشتر با یه حس بد بجنگی، | بزرگ‌تر می‌شه.", 4.4),
        ("دومی: | فکرت، فقط یه فکره. | نه یه حقیقت.", 3.6),
        ("پس به جای «من تنبلم»، | بگو: «دارم فکر می‌کنم که تنبلم». | همین چهار کلمه، فاصله می‌سازه.", 6.2),
        ("سومی: | کاری که برات مهمه رو انجام بده، | حتی وقتی حسش نیست.", 4.4),
        ("امشب اگه صدات گفت «حوصله نداری»، | بگو: دارم فکر می‌کنم که حوصله ندارم. | و یه صفحه بخون.", 6.0),
        ("کتاب بعدی رو هم | تو انتخاب کن.", 2.6),
    ],
    segs=[
        dict(at=0, kind="photo", src=PH / "darkread_404515042.jpg",
             p=dict(z0=1.0, z1=1.08, fx=0.5, fy=0.4, dark=0.85),
             layers=[dict(html=HOOK),
                     dict(html="<div class='dot' style='left:517px;top:1130px'></div>", at=0.25, anim="pop", dur=0.35)]),
        dict(at="P1", kind="photo", src=PH / "darkread_404515042.jpg",
             p=dict(z0=1.3, z1=1.4, fx=0.5, fy=0.35, dark=0.85),
             layers=[dict(html=HOOK)]),
        dict(at="P2", kind="video", src=M / "m12_hands_open_book_5973869.mp4",
             p=dict(ss=3.0, fx=0.57, fy=0.3, blur=16, dark=0.5, z0=1.0, z1=1.05),
             layers=[dict(html=SERIES, fade=0.2), dict(html=CREDIT, at="P2+0.2", anim="pop", dur=0.4)]),
        # idea 1: the more you fight it, the bigger it gets
        dict(at="P3", kind="photo", src=PH / "night_17805164.jpg",
             p=dict(z0=1.0, z1=1.08, fx=0.5, fy=0.5, dark=0.6, blur=8),
             layers=[dict(html="<div class='idea'><span>ایده‌ی ۱</span></div><div class='ttl2'>جنگیدن، <g>بزرگ‌ترش</g> می‌کنه</div>"),
                     dict(html=blob(220, "حس بد"), at="P3*0.25", until="P3*0.5", fade=0.1),
                     dict(html=blob(360, "حس بد"), at="P3*0.5", until="P3*0.72", fade=0.1),
                     dict(html=blob(520, "حس بد"), at="P3*0.72", anim="pop", dur=0.3)]),
        # idea 2: a thought is not a fact
        dict(at="P4", kind="video", src=M / "m10_hand_notebook_pen_2785187.mp4",
             p=dict(ss=17.0, fx=0.6, fy=0.4, z=1.1, blur=14, dark=0.55, z0=1.0, z1=1.06),
             layers=[dict(html="<div class='idea'><span>ایده‌ی ۲</span></div><div class='ttl2'>فکر ≠ حقیقت</div>"),
                     dict(html="<div class='vs'><div class='row th'><span>فکر</span><small>«من تنبلم»</small></div></div>",
                          at="P4*0.3", anim="slide", dur=0.4, dx=260),
                     dict(html="<div class='vs' style='top:1040px'><div class='row tr'><span>حقیقت</span><small>معلوم نیست!</small></div></div>",
                          at="P4*0.65", anim="slide", dur=0.4, dx=-260)]),
        # the four words
        dict(at="P5", kind="video", src=M / "m12_hands_open_book_5973869.mp4",
             p=dict(ss=4.8, fx=0.57, fy=0.25, z=1.15, dark=0.62, z0=1.0, z1=1.07, br=-0.02),
             layers=[dict(html="<div class='idea'><span>۴ کلمه</span></div>"),
                     dict(html="<div class='strike'><span class='old'>«من تنبلم»</span></div>", at="P5*0.05", until="P5*0.4", fade=0.15),
                     dict(html="<div class='strike'><span class='old x'>«من تنبلم»</span>"
                          "<span class='new'>«<g style='color:#9A6E1B'>دارم فکر می‌کنم که</g><br>تنبلم»</span></div>",
                          at="P5*0.4", anim="fadeup", dur=0.35),
                     dict(html=FOUR, at="P5*0.75", anim="pop", dur=0.35)]),
        # idea 3: act on values even without the feeling
        dict(at="P6", kind="video", src=M / "m08_hand_writing_v_6129005.mp4",
             p=dict(ss=1.0, fx=0.5, fy=0.5, z=1.1, blur=12, dark=0.6, z0=1.0, z1=1.05),
             layers=[dict(html="<div class='idea'><span>ایده‌ی ۳</span></div><div class='ttl2'>اول کار، <g>بعد حس</g></div>"),
                     dict(html="<div class='cards'><div class='cd goal'>صبر کنی تا حسش بیاد<small>شاید هیچ‌وقت نیاد</small></div></div>",
                          at="P6*0.25", anim="slide", dur=0.4, dx=260),
                     dict(html="<div class='cards' style='top:1150px'><div class='cd sys'>انجامش بدی <b>با همین حس</b>"
                          "<small>حس، بعدش میاد</small></div></div>", at="P6*0.6", anim="pop", dur=0.4)]),
        # tonight
        dict(at="P7", kind="video", src=M / "m11_hands_turn_page_163532.mp4",
             p=dict(ss=7.0, fx=0.74, fy=0.8, z=1.0, z0=1.0, z1=1.06, dark=0.7),
             layers=[dict(html="<div class='ttl2' style='top:420px'><g>امشب</g></div>"),
                     dict(html="<div class='strike'><span class='old'>«حوصله نداری»</span></div>", at="P7*0.08", until="P7*0.42", fade=0.15),
                     dict(html="<div class='strike'><span class='old x'>«حوصله نداری»</span>"
                          "<span class='new'>«<g style='color:#9A6E1B'>دارم فکر می‌کنم که</g><br>حوصله ندارم»</span></div>",
                          at="P7*0.42", anim="fadeup", dur=0.35),
                     dict(html="<div class='chip' style='top:1560px'><span>📖 و یه صفحه بخون</span></div>", at="P7*0.8", anim="pop", dur=0.35)]),
        dict(at="P8", kind="video", src=M / "m13_book_pages_macro_2802905.mp4",
             p=dict(ss=2.0, speed=0.75, fx=0.5, fy=0.5, z=1.0, dark=0.7, blur=6, z0=1.0, z1=1.05),
             layers=[dict(html=f"<div class='end'><img src='{E.ICON}'>"
                          "<div class='l'>هر هفته:<br>یه کتاب ← <g>یه قدم کوچیک</g></div></div>", anim="fadeup", dur=0.4, at="P8"),
                     dict(html="<div class='end' style='top:1260px'><span class='c'>کتاب بعدی رو تو بگو 👇</span></div>",
                          at="P8*0.45", anim="pop", dur=0.35)]),
    ],
    sfx=[("pop", 0.25, 0.35), ("tick", "P1", 0.25), ("whoosh", "P2", 0.3), ("pop", "P2+0.2", 0.4),
         ("whoosh", "P3", 0.25), ("soft", "P3*0.25", 0.3), ("soft", "P3*0.5", 0.35), ("pop", "P3*0.72", 0.4),
         ("whoosh", "P4", 0.25), ("tick", "P4*0.3", 0.3), ("pop", "P4*0.65", 0.35),
         ("page", "P5", 0.3), ("soft", "P5*0.4", 0.45), ("pop", "P5*0.75", 0.4),
         ("whoosh", "P6", 0.25), ("tick", "P6*0.25", 0.3), ("pop", "P6*0.6", 0.4),
         ("page", "P7", 0.3), ("soft", "P7*0.42", 0.45), ("pop", "P7*0.8", 0.35),
         ("whoosh", "P8", 0.25), ("soft", "P8*0.45", 0.45)],
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
