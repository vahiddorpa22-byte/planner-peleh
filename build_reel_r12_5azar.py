"""R12 · Thu 5 Azar 1405 · «۵ چیز درباره‌ی کتاب‌خوندن که کسی بهم نگفته بود» (tip 2 carries the number: 10 pages/night = 12 books/yr).

  python build_reel_r12_5azar.py --narration reel_r12_5azar/narration.mp3
"""
import argparse
from pathlib import Path

import reel_engine as E
from build_reel_r3_20aban import CSS as R3CSS, GOLD, CREAM, NAVY

W = E.W
M = W / "stock" / "magnific_2026-11"
PH = W / "stories_v2" / "assets"

CSS = R3CSS + f"""
.hkq {{ position:absolute; top:500px; left:40px; right:40px; text-align:center; color:#FFF8EA; font-weight:900; font-size:92px;
  line-height:1.35; padding:70px 10px; text-shadow:0 4px 18px rgba(0,0,0,.85);
  background:linear-gradient(180deg,rgba(10,16,30,0) 0%,rgba(10,16,30,.66) 22%,rgba(10,16,30,.66) 78%,rgba(10,16,30,0) 100%); }}
.tip {{ position:absolute; top:620px; left:80px; right:80px; text-align:center; }}
.tip .n {{ display:inline-flex; width:150px; height:150px; border-radius:50%; background:{GOLD}; color:{NAVY}; font-size:100px; font-weight:900;
  align-items:center; justify-content:center; box-shadow:0 14px 40px rgba(0,0,0,.5); }}
.tip .t {{ margin-top:44px; background:rgba(15,24,44,.86); border:3px solid rgba(201,154,60,.6); border-radius:36px; padding:44px 40px;
  color:#FFF8EA; font-size:80px; font-weight:900; line-height:1.4; }}
.tip .t small {{ display:block; font-size:44px; font-weight:700; color:#E8DDC0; margin-top:14px; }}
.tip .big {{ display:block; font-size:120px; color:#F0B847; direction:rtl; }}
.prog {{ position:absolute; top:330px; left:0; right:0; text-align:center; }}
.prog i {{ display:inline-block; width:70px; height:12px; border-radius:6px; margin:0 6px; background:rgba(242,234,211,.25); }}
.prog i.on {{ background:#F0B847; }}
"""


def tip(n, body, k):
    bar = "<div class='prog'>" + "".join(f"<i class='{'on' if j <= k else ''}'></i>" for j in range(4, -1, -1)) + "</div>"
    return bar + f"<div class='tip'><span class='n'>{n}</span><div class='t'>{body}</div></div>"


TIPS = [("۱", "لازم نیست هر کتابی رو<br><g>تموم کنی.</g>"),
        ("۲", "شبی ۱۰ صفحه<br><g style='font-size:112px'>= سالی ۱۲ کتاب</g>"),
        ("۳", "کتاب رو بذار همون‌جا<br>که <g>گوشیت</g> هست."),
        ("۴", "کتاب کوتاه هم<br><g>کتابه.</g>"),
        ("۵", "دوباره‌خوندن،<br><g>عقب‌موندن نیست.</g>")]
BG = [("video", M / "m11_hands_turn_page_163532.mp4", dict(ss=7.0, fx=0.74, fy=0.8)),
      ("video", M / "m13_book_pages_macro_2802905.mp4", dict(ss=1.0, fx=0.5, fy=0.5)),
      ("photo", PH / "phone_nightstand_hand_l28.jpg", dict(fx=0.55, fy=0.55)),
      ("video", M / "m08_hand_writing_v_6129005.mp4", dict(ss=1.0, fx=0.5, fy=0.5)),
      ("video", M / "m12_hands_open_book_5973869.mp4", dict(ss=4.8, fx=0.57, fy=0.25))]

segs = [dict(at=0, kind="video", src=M / "m12_hands_open_book_5973869.mp4",
             p=dict(ss=0.6, fx=0.55, fy=0.3, z=1.2, z0=1.0, z1=1.07, br=-0.02, sat=0.95),
             layers=[dict(html="<div class='hkq'><g>۵ چیز</g> درباره‌ی کتاب‌خوندن<br>که کسی بهم نگفته بود</div>")])]
for k, ((n, body), (kind, src, pp)) in enumerate(zip(TIPS, BG)):
    p = dict(pp, blur=12, dark=0.5, z0=1.0, z1=1.06)
    if kind == "video":
        p["z"] = 1.1
    segs.append(dict(at=f"P{k + 1}", kind=kind, src=src, p=p,
                     layers=[dict(html=tip(n, body, k), at=f"P{k + 1}+0.05", anim="fadeup", dur=0.3)]))
segs.append(dict(at="P6", kind="photo", src=PH / "darkread_404515042.jpg", p=dict(z0=1.0, z1=1.07, fx=0.5, fy=0.45, dark=0.6, blur=3),
                 layers=[dict(html=f"<div class='end'><img src='{E.ICON}'><div class='l'>کدومش برات<br><g>تازه بود؟</g> 👇</div></div>", anim="fadeup", dur=0.35, at="P6"),
                         dict(html="<div class='end' style='top:1260px'><span class='c'>شب ۵ از ۳۰ · هنوز دیر نیست</span></div>",
                              at="P6+0.9", anim="pop", dur=0.35)]))

CFG = dict(
    out=W / "reel_r12_5azar", name="peleh_R12_kasi_nagofte",
    music=W / "reel_d010" / "music_leberch_reading.mp3", music_from=100.0,
    tail=1.6, loop=0.0, lead=0.12,
    phrases=[("پنج تا چیز درباره‌ی کتاب خوندن، | که کاش زودتر کسی بهم گفته بود.", 4.2),
             ("یک: | لازم نیست هر کتابی رو تموم کنی.", 3.2),
             ("دو: | شبی ده صفحه، می‌شه سالی دوازده تا کتاب.", 3.8),
             ("سه: | کتاب رو بذار همون‌جا که گوشیت هست.", 3.4),
             ("چهار: | کتاب کوتاه هم کتابه.", 2.6),
             ("پنج: | دوباره خوندن، عقب موندن نیست.", 3.2),
             ("کدومش برات تازه بود؟", 2.0)],
    segs=segs,
    sfx=[("pop", 0.2, 0.3)] + [("page", f"P{k}", 0.3) for k in range(1, 6)] + [("pop", "P2+0.8", 0.35), ("whoosh", "P6", 0.25), ("soft", "P6+0.9", 0.4)],
)

if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--narration"); ap.add_argument("--tempo", type=float, default=1.0); ap.add_argument("--bounds")
    a = ap.parse_args()
    if a.bounds:
        CFG["force_bounds"] = [int(x) for x in a.bounds.split(",")]
    E.build(CFG, Path(a.narration) if a.narration else None, a.tempo, CSS)
