"""Stories for the «چالش آذر» highlight + Friday 22 Aban teaser (20 Aban 1405).
Outputs (1080x1920 PNG) -> peleh_work/stories_azar_highlight/
  01_chalesh.png   — what the challenge is
  02_jayeze.png    — prizes (Khoob books, ranks 4–10 = 7 days Premium)
  03_sherkat.png   — how to join
  cover_highlight.png — highlight cover (centered icon)
  teaser_jome_22aban.png — Friday teaser for Saturday's Khoob reel
Story safe zone: keep text between y=260 and y=1580.
"""
from pathlib import Path

import reel_engine as E
from build_collab_khoob_board import CSS

W = E.W
OUT = W / "stories_azar_highlight"
OUT.mkdir(exist_ok=True)
ICON = (W / "app_ref" / "icon-512.png").as_uri()
KL = (W / "collab_khoob" / "khoob_logo_transparent.png").as_uri()
LAM = (W / "mascot" / "ep1" / "lam_ep1_flow_start.png").as_uri()   # clean render, no baked text
COVERS = [(W / "collab_khoob" / "covers" / f"cover_{i}.jpg").as_uri() for i in (1, 2, 3)]
KHOOB_FRAME = (W / "collab_khoob" / "reel" / "frame0.jpg").as_uri()

EXTRA = """
.kick { position:absolute; top:280px; left:0; right:0; text-align:center; }
.kick span { display:inline-block; background:rgba(27,42,74,.85); border:3px solid #C99A3C; border-radius:999px; padding:14px 34px; font-size:42px; font-weight:800; }
.big { position:absolute; left:60px; right:60px; text-align:center; font-weight:900; line-height:1.25; text-shadow:0 6px 28px rgba(0,0,0,.55); }
.line { font-size:54px; font-weight:700; line-height:1.7; }
.covers { position:absolute; top:810px; left:0; right:0; display:flex; justify-content:center; gap:34px; }
.covers img { width:270px; height:405px; object-fit:cover; border-radius:8px 20px 20px 8px; box-shadow:0 24px 60px rgba(0,0,0,.6); }
.covers div { text-align:center; font-size:34px; font-weight:700; }
.logo { position:absolute; left:0; right:0; text-align:center; }
.logo img { width:170px; height:170px; object-fit:contain; background:#F7F3EA; border-radius:40px; padding:14px; box-sizing:border-box; }
.step { display:flex; align-items:center; gap:26px; margin:0 0 34px 0; font-size:50px; font-weight:700; line-height:1.4; }
.step b { flex:0 0 96px; height:96px; border-radius:48px; background:#C99A3C; color:#1B2A4A; font-size:56px; font-weight:900; display:flex; align-items:center; justify-content:center; }
.foot { position:absolute; bottom:360px; left:0; right:0; text-align:center; font-size:40px; font-weight:600; opacity:.85; }
"""
STYLE = CSS + EXTRA


def bg(url, dark=0.55, blur=0):
    return (f"<div class='bg' style=\"background-image:url('{url}');filter:blur({blur}px) brightness({1 - dark});"
            f"transform:scale({1.08 if blur else 1})\"></div>")


def page(name, html):
    p = OUT / name
    E.render(html, p, STYLE, transparent=False)
    print("ok", p.name)


page("01_chalesh.png",
     bg(LAM, 0.45) + "<div class='shade'></div>"
     "<div class='kick'><span>چالش آذر · پله</span></div>"
     "<div class='big' style='top:440px;font-size:120px'><g>۳۰ شب</g><br>کتاب‌خونی<br>با هم</div>"
     "<div class='box' style='top:1060px;font-size:58px'>از <g>۱ آذر</g><br><span class='small'>روزی فقط ۱۵ دقیقه · هر شب تیک بزن</span></div>"
     "<div class='foot'>کتابش با خودت؛ هر کتابی که دوست داری 📚</div>")

page("02_jayeze.png",
     "<div class='bg' style='background:#1B2A4A'></div>"
     "<div class='kick'><span>جایزه‌ها 🎁</span></div>"
     f"<div class='logo' style='top:400px'><img src='{KL}'></div>"
     "<div class='big' style='top:600px;font-size:60px'>نفر اول تا سوم<br>هر نفر <g>یک کتاب</g> از نشر خوب</div>"
     "<div class='covers'>" + "".join(
         f"<div><img src='{u}'><br>{t}</div>" for u, t in zip(COVERS, ["داستان کاهو", "غریبه‌ها", "آشپزخانه‌ی کرملین"])) +
     "</div>"
     "<div class='box' style='top:1380px;font-size:50px;padding:26px'>نفر ۴ تا ۱۰: <g>۷ روز پریمیوم</g> پله</div>")

page("03_sherkat.png",
     "<div class='bg' style='background:#1B2A4A'></div>"
     "<div class='kick'><span>چطور شرکت کنم؟</span></div>"
     "<div style='position:absolute;top:470px;left:90px;right:90px'>"
     "<div class='step'><b>۱</b><span>اپ پله رو باز کن<br><span class='small'>app.pelehapp.ir یا کافه‌بازار</span></span></div>"
     "<div class='step'><b>۲</b><span>کتاب ← چالش‌ها ← <g>چالش ۳۰ روزه</g></span></div>"
     "<div class='step'><b>۳</b><span>هر شب ۱۵ دقیقه بخون و تیک بزن</span></div>"
     "<div class='step'><b>۴</b><span>جدول نفرات برتر آذر رو تو اپ ببین</span></div>"
     "</div>"
     "<div class='box' style='top:1250px;font-size:44px;padding:24px'>هر شب ۲۱:۳۰ تو گروه تلگرام پله<br><span class='small'>صفحه‌هامون رو با هم می‌گیم · لینک تو بیو</span></div>")

page("cover_highlight.png",
     "<div class='bg' style='background:#1B2A4A'></div>"
     "<div style='position:absolute;top:660px;left:0;right:0;text-align:center'>"
     "<div style='display:inline-flex;width:600px;height:600px;border-radius:300px;border:10px solid #C99A3C;align-items:center;justify-content:center;flex-direction:column'>"
     "<div style='font-size:150px;font-weight:900;color:#E2B457;line-height:1'>۳۰</div>"
     "<div style='font-size:76px;font-weight:800;margin-top:10px'>شب کتاب</div></div></div>")

page("teaser_jome_22aban.png",
     bg(KHOOB_FRAME, 0.55, 18) +
     "<div class='kick'><span>فردا ساعت ۱۷ 📚</span></div>"
     f"<div class='logos' style='top:520px'><div class='lb peleh'><img src='{ICON}'></div><div class='x'>×</div><div class='lb'><img src='{KL}'></div></div>"
     "<div class='big' style='top:920px;font-size:84px'>یه خبر خوب<br>برای <g>کتاب‌خون‌ها</g></div>"
     "<div class='foot'>درست قبل از شروع هفته‌ی کتاب و کتاب‌خوانی</div>")
