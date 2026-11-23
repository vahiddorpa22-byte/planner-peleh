"""R11 · Tue 3 Azar 1405 · «۴۰۰۰ هفته» — 4 books about time (Four Thousand Weeks, Eat That Frog, Deep Work, Essentialism).
Winning format (R3 / Trial T1): number from frame 0 → simple math → tonight's step → challenge.

  python build_reel_r11_3azar.py --narration reel_r11_3azar/narration.mp3
"""
import argparse
from pathlib import Path

import reel_engine as E
from build_reel_r3_20aban import CSS as R3CSS, GOLD, CREAM, NAVY

W = E.W
M = W / "stock" / "magnific_2026-11"
PH = W / "stories_v2" / "assets"

CSS = R3CSS + f"""
.hkn {{ position:absolute; top:520px; left:0; right:0; text-align:center; color:#FFF8EA; font-weight:900; padding:80px 20px;
  line-height:1.25; text-shadow:0 4px 18px rgba(0,0,0,.85);
  background:linear-gradient(180deg,rgba(10,16,30,0) 0%,rgba(10,16,30,.66) 22%,rgba(10,16,30,.66) 78%,rgba(10,16,30,0) 100%); }}
.hkn .a {{ font-size:86px; }} .hkn .b {{ font-size:170px; color:#F0B847; }}
.wk {{ position:absolute; top:640px; left:60px; width:960px; display:grid; grid-template-columns:repeat(80,1fr); gap:3px; direction:rtl; }}
.wk i {{ display:block; height:9px; border-radius:2px; background:#F0B847; }}
.wk i.g {{ background:rgba(242,234,211,.16); }}
.top {{ position:absolute; top:400px; left:60px; right:60px; text-align:center; color:#FFF8EA; font-size:70px; font-weight:900;
  line-height:1.35; text-shadow:0 4px 18px rgba(0,0,0,.9); }}
.cnt {{ position:absolute; top:1310px; left:0; right:0; text-align:center; }}
.cnt span {{ display:inline-block; direction:rtl; background:rgba(15,24,44,.88); color:#FFF8EA; font-size:76px; font-weight:900;
  padding:14px 48px; border-radius:34px; border:4px solid {GOLD}; }}
.cnt span g {{ color:#F0B847; }}
.bkc {{ position:absolute; top:640px; left:80px; right:80px; }}
.bkc .n {{ display:inline-block; background:{GOLD}; color:{NAVY}; font-size:44px; font-weight:900; padding:8px 30px; border-radius:30px; }}
.bkc .t {{ margin-top:26px; background:rgba(242,234,211,.97); color:{NAVY}; border:4px solid {GOLD}; border-radius:34px; padding:34px 40px;
  box-shadow:0 20px 60px rgba(0,0,0,.5); }}
.bkc .t b {{ display:block; font-size:74px; font-weight:900; line-height:1.3; }}
.bkc .t small {{ display:block; font-size:38px; font-weight:700; color:#6B5A33; margin-top:6px; }}
.bkc .q {{ margin-top:34px; background:rgba(15,24,44,.86); color:#FFF8EA; border-radius:30px; padding:30px 40px; font-size:62px;
  font-weight:800; line-height:1.45; border:3px solid rgba(201,154,60,.55); text-align:center; }}
"""

SERIES = "<div class='series'><span>یه کتاب، یه قدم</span></div>"
HOOK = "<div class='hkn'><div class='a'>کل عمرت:</div><div class='b'>۴٬۰۰۰</div><div class='a'>هفته</div></div>"


def weeks(gone):
    return "<div class='wk'>" + "".join("<i class='g'></i>" if k < gone else "<i></i>" for k in range(4000)) + "</div>"


def book(n, title, author, quote):
    return (f"<div class='bkc'><span class='n'>کتاب {n} از ۴</span><div class='t'><b>{title}</b><small>{author}</small></div>"
            f"<div class='q'>{quote}</div></div>")


BOOKS = [("۱", "چهار هزار هفته", "الیور برکمن", "وقتت کمه؛<br><g>پس انتخاب کن.</g>"),
         ("۲", "قورباغه‌ات را قورت بده", "برایان تریسی", "سخت‌ترین کار،<br><g>اول صبح.</g>"),
         ("۳", "کار عمیق", "کال نیوپورت", "یه ساعت <g>بی‌گوشی</g>،<br>از سه ساعت با گوشی بیشتره."),
         ("۴", "اصل‌گرایی", "گرگ مک‌کیون", "کمتر،<br><g>ولی بهتر.</g>")]
BG = [(M / "m12_hands_open_book_5973869.mp4", dict(ss=3.0, fx=0.57, fy=0.3)),
      (M / "m08_hand_writing_v_6129005.mp4", dict(ss=1.0, fx=0.5, fy=0.5)),
      (M / "m10_hand_notebook_pen_2785187.mp4", dict(ss=17.0, fx=0.6, fy=0.4)),
      (M / "m11_hands_turn_page_163532.mp4", dict(ss=7.0, fx=0.74, fy=0.8))]

segs = [
    dict(at=0, kind="photo", src=PH / "hourglass_8943578.jpg", p=dict(z0=1.0, z1=1.08, fx=0.5, fy=0.5, dark=0.85),
         layers=[dict(html=HOOK)]),
    dict(at="P1", kind="photo", src=PH / "hourglass_8943578.jpg", p=dict(z0=1.1, z1=1.16, fx=0.5, fy=0.5, dark=0.45, blur=10),
         layers=[dict(html="<div class='top'><g>۸۰ سال</g> × ۵۲ هفته</div>" + weeks(0)),
                 dict(html="<div class='cnt'><span><g>۴٬۰۰۰</g> هفته</span></div>", at="P1+0.3", anim="pop", dur=0.35)]),
    dict(at="P2", kind="photo", src=PH / "hourglass_8943578.jpg", p=dict(z0=1.16, z1=1.22, fx=0.5, fy=0.5, dark=0.45, blur=10),
         layers=[dict(html="<div class='top'>اگه <g>۳۰ سالته</g>…</div>"),
                 dict(html=weeks(0), at="P2", until="P2*0.3"),
                 dict(html=weeks(520), at="P2*0.3", until="P2*0.5"),
                 dict(html=weeks(1040), at="P2*0.5", until="P2*0.7"),
                 dict(html=weeks(1560), at="P2*0.7"),
                 dict(html="<div class='cnt'><span><g>۱٬۵۰۰</g> تاش رفته</span></div>", at="P2*0.7", anim="pop", dur=0.35)]),
    dict(at="P3", kind="video", src=M / "m13_book_pages_macro_2802905.mp4",
         p=dict(ss=1.0, fx=0.5, fy=0.5, blur=14, dark=0.5, z0=1.0, z1=1.05),
         layers=[dict(html=SERIES + "<div class='ttl2' style='top:700px'><g>۴ کتاب</g><br>برای بقیه‌ی هفته‌هات</div>", fade=0.2)]),
]
for k, (b, (src, pp)) in enumerate(zip(BOOKS, BG)):
    segs.append(dict(at=f"P{4 + k}", kind="video", src=src, p=dict(pp, z=1.1, blur=14, dark=0.5, z0=1.0, z1=1.05),
                     layers=[dict(html=SERIES), dict(html=book(*b), at=f"P{4 + k}+0.05", anim="fadeup", dur=0.3)]))
segs.append(dict(at="P8", kind="photo", src=PH / "darkread_404515042.jpg", p=dict(z0=1.0, z1=1.07, fx=0.5, fy=0.45, dark=0.6, blur=3),
                 layers=[dict(html="<div class='ttl2' style='top:420px'><g>امشب</g></div>"
                              "<div class='timer'><span class='t'>۱۵:۰۰</span><span class='s'>بی‌گوشی</span></div>", until="P8*0.55"),
                         dict(html=f"<div class='end'><img src='{E.ICON}'><div class='l'>کدومش رو<br><g>تو چالش</g> می‌خونی؟ 👇</div></div>",
                              at="P8*0.55", anim="fadeup", dur=0.35),
                         dict(html="<div class='end' style='top:1260px'><span class='c'>فالو کن · هر هفته یه کتاب</span></div>",
                              at="P8*0.8", anim="pop", dur=0.35)]))

CFG = dict(
    out=W / "reel_r11_3azar", name="peleh_R11_4000_hafte",
    music=W / "reel_d012" / "music_white_clouds_leberch.mp3", music_from=30.0,
    tail=1.4, loop=0.0, lead=0.12,
    phrases=[("چهار هزار هفته.", 1.6),
             ("کل عمر یه آدم هشتاد ساله، همینه.", 2.8),
             ("اگه سی سالته، | هزار و پونصدتاش رفته.", 3.2),
             ("چهار تا کتاب، | که کمک می‌کنن بقیه‌ش رو بهتر خرج کنی:", 3.6),
             ("چهار هزار هفته: | وقتت کمه؛ پس انتخاب کن.", 3.6),
             ("قورباغه‌ات را قورت بده: | سخت‌ترین کار، اول صبح.", 3.6),
             ("کار عمیق: | یه ساعت بی‌گوشی، از سه ساعت با گوشی بیشتره.", 4.4),
             ("اصل‌گرایی: | کمتر، ولی بهتر.", 2.8),
             ("امشب، پونزده دقیقه، بی‌گوشی. | کدومش رو می‌خونی؟", 4.0)],
    segs=segs,
    sfx=[("pop", 0.2, 0.3), ("whoosh", "P1", 0.25), ("pop", "P1+0.3", 0.4), ("tick", "P2*0.3", 0.25), ("tick", "P2*0.5", 0.25),
         ("pop", "P2*0.7", 0.4), ("whoosh", "P3", 0.25), ("page", "P4", 0.3), ("page", "P5", 0.3), ("page", "P6", 0.3), ("page", "P7", 0.3),
         ("whoosh", "P8", 0.25), ("soft", "P8*0.55", 0.4), ("pop", "P8*0.8", 0.35)],
)

if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--narration"); ap.add_argument("--tempo", type=float, default=1.0); ap.add_argument("--bounds")
    a = ap.parse_args()
    if a.bounds:
        CFG["force_bounds"] = [int(x) for x in a.bounds.split(",")]
    E.build(CFG, Path(a.narration) if a.narration else None, a.tempo, CSS)
