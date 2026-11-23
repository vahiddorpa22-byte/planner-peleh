"""Telegram post images in the page's cover style: daily challenge cards (1080x1080) + Friday review sheet."""
import subprocess
from pathlib import Path

W = Path(__file__).resolve().parent
OUT = W / "telegram"
OUT.mkdir(exist_ok=True)
FONT = (W / "app_ref" / "Vazirmatn-Variable.woff2").as_uri()
ICON = (W / "app_ref" / "icon-512.png").as_uri()
EDGE = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
FA = str.maketrans("0123456789", "۰۱۲۳۴۵۶۷۸۹")

CSS = f"""
@font-face {{ font-family: V; src: url('{FONT}') format('woff2'); font-weight: 100 900; }}
html, body {{ margin: 0; background: #1B2A4A; }}
body {{ font-family: V; direction: rtl; text-align: center; color: #F2EAD3; position: relative; overflow: hidden; }}
.g {{ color: #C99A3C; }}
"""

# day -> (line under the number). Lines are true to the F01 rules (minutes add up; a missed day doesn't void the challenge).
DAYS = {
    2: "دو تا ۸ دقیقه هم یه روز کامله.",
    3: "از همون صفحه‌ای که موند.",
    4: "روزی ۱۵ دقیقه، سالی ۹۱ ساعت.",
    5: "امروز فقط نسخه‌ی کوچیکش.",
    6: "هنوز دیر نیست؛ روز اولت امروزه.",
    7: "هفته‌ی اول تموم شد.",
    8: "جمعه‌ست. ۱۵ دقیقه، بدون عجله.",
}


def shot(html: str, png: Path, w: int, h: int) -> None:
    src = png.with_suffix(".html")
    src.write_text(f"<!doctype html><meta charset='utf-8'><style>{CSS} html,body{{width:{w}px;height:{h}px}}</style>{html}",
                   encoding="utf-8")
    subprocess.run([EDGE, "--headless=new", "--disable-gpu", "--hide-scrollbars", f"--window-size={w},{h}",
                    f"--screenshot={png}", src.as_uri()], check=True, capture_output=True)
    src.unlink()


def day_card(n: int, line: str) -> None:
    html = f"""
    <div style="position:absolute;top:110px;left:0;right:0;font-size:40px;font-weight:600;color:#C2A066">چالش ۳۰ روزه‌ی کتاب</div>
    <div style="position:absolute;top:210px;left:0;right:0;font-size:300px;font-weight:800;line-height:1">
      <span style="font-size:150px">روز </span><span class="g">{str(n).translate(FA)}</span></div>
    <div style="position:absolute;top:560px;left:0;right:0;font-size:56px;font-weight:600;color:#C2A066">از ۳۰</div>
    <div style="position:absolute;left:470px;width:140px;top:660px;height:5px;border-radius:3px;background:#C99A3C"></div>
    <div style="position:absolute;top:705px;left:60px;right:60px;font-size:60px;font-weight:700">{line}</div>
    <div style="position:absolute;top:860px;left:0;right:0"><img src="{ICON}" style="width:110px;height:110px;border-radius:24px;border:2px solid rgba(201,154,60,.28)"></div>
    """
    shot(html, OUT / f"day_{n:02d}.png", 1080, 1080)


def review_sheet() -> None:
    """Printable A4-ratio sheet for «مرور جمعه» (1240x1754)."""
    q = ["این هفته کدوم عادتم سر پا موند؟", "کجا جا موند و چرا؟ (داده، نه حکم)", "نسخه‌ی کوچیکِ هفته‌ی بعد چیه؟"]
    rows = "".join(
        f"""<div style="margin:0 110px 60px;text-align:right">
          <div style="font-size:46px;font-weight:700;color:#1B2A4A"><span class="g">{str(i + 1).translate(FA)}. </span>{t}</div>
          <div style="height:250px;border-bottom:3px dashed #d9cfb5;border-radius:0"></div></div>""" for i, t in enumerate(q))
    html = f"""<div style="position:absolute;inset:0;background:#F3F0E8"></div>
    <div style="position:relative;padding-top:110px">
      <div style="font-size:40px;font-weight:600;color:#C99A3C">پله · مرور جمعه</div>
      <div style="font-size:92px;font-weight:800;color:#1B2A4A;margin:10px 0 20px">سه سؤال، دو دقیقه</div>
      <div style="font-size:38px;color:#5a6680;margin-bottom:90px">هر جمعه پرش کن؛ جا موندن داده است، نه حکم.</div>
      {rows}
      <div style="font-size:34px;color:#8a6a22;margin-top:10px">t.me/pelehapp_official</div>
    </div>"""
    shot(html, OUT / "friday_review_sheet.png", 1240, 1754)


if __name__ == "__main__":
    for n, line in DAYS.items():
        day_card(n, line)
    review_sheet()
    print(sorted(p.name for p in OUT.glob("*.png")))
