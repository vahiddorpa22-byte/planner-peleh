"""Storyboard frames for the Peleh × نشر خوب collab Reel (Book Week, 23 Aban 1405).

Renders 7 key frames (1080x1920) with headless Edge, a storyboard sheet for the DM to Khoob, and the grid cover.
Usage: python build_collab_khoob_board.py KHOOB_LOGO.png
Outputs go to peleh_work/collab_khoob/.
"""
import subprocess
import sys
import tempfile
from pathlib import Path

import imageio_ffmpeg
from PIL import Image, ImageDraw, ImageFont

W = Path(__file__).resolve().parent
OUT = W / "collab_khoob"
FR = OUT / "frames"
STOCK = W / "stock"
FONT_URI = (W / "app_ref" / "Vazirmatn-Variable.woff2").as_uri()
ICON = (W / "app_ref" / "icon-512.png").as_uri()
EDGE = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"

CSS = """
@font-face { font-family: V; src: url('%s') format('woff2'); font-weight: 100 900; }
html, body { margin: 0; width: 1080px; height: 1920px; overflow: hidden; }
body { font-family: V; direction: rtl; position: relative; background: #1B2A4A; color: #F2EAD3; }
.bg { position: absolute; inset: 0; background-size: cover; background-position: center; }
.shade { position: absolute; inset: 0; background: linear-gradient(180deg, rgba(10,18,36,.55) 0%%, rgba(10,18,36,.15) 38%%, rgba(10,18,36,.25) 60%%, rgba(10,18,36,.80) 100%%); }
g { color: #E2B457; }
.hook { position: absolute; top: 300px; left: 70px; right: 70px; text-align: center; font-weight: 800; font-size: 108px; line-height: 1.3; text-shadow: 0 6px 28px rgba(0,0,0,.55); }
.box { position: absolute; left: 90px; right: 90px; text-align: center; background: rgba(27,42,74,.88); border: 3px solid #C99A3C; border-radius: 34px; padding: 34px 30px; font-size: 76px; font-weight: 800; line-height: 1.4; }
.small { font-size: 50px; font-weight: 600; color: #F2EAD3; }
.book { position: absolute; left: 290px; top: 470px; width: 500px; height: 720px; border-radius: 10px 26px 26px 10px; box-shadow: 0 30px 80px rgba(0,0,0,.6), inset 14px 0 0 rgba(0,0,0,.18); display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; padding: 40px; box-sizing: border-box; }
.book .t { font-size: 70px; font-weight: 900; line-height: 1.3; }
.book .ph { margin-top: 36px; font-size: 30px; font-weight: 500; opacity: .75; border: 2px dashed currentColor; border-radius: 14px; padding: 10px 16px; }
.num { position: absolute; top: 300px; left: 0; right: 0; text-align: center; font-size: 64px; font-weight: 800; color: #E2B457; }
.meta { position: absolute; top: 1250px; left: 80px; right: 80px; text-align: center; font-size: 56px; font-weight: 700; line-height: 1.5; text-shadow: 0 4px 18px rgba(0,0,0,.7); }
.meta span { display: block; font-size: 46px; font-weight: 500; color: #F2EAD3; opacity: .9; }
.logos { position: absolute; top: 560px; left: 0; right: 0; display: flex; justify-content: center; align-items: center; gap: 70px; }
.logos .lb { width: 300px; height: 300px; border-radius: 60px; background: #F7F3EA; display: flex; align-items: center; justify-content: center; box-shadow: 0 20px 60px rgba(0,0,0,.45); }
.logos .lb img { width: 84%%; height: 84%%; object-fit: contain; }
.logos .lb.peleh { background: #1B2A4A; border: 3px solid #C99A3C; }
.logos .x { font-size: 90px; font-weight: 300; color: #C99A3C; }
.steps { position: absolute; top: 780px; left: 60px; right: 60px; font-size: 48px; font-weight: 700; line-height: 1.9; text-align: center; }
.chips { position: absolute; top: 1420px; left: 0; right: 0; display: flex; justify-content: center; gap: 36px; }
.chips span { width: 150px; height: 150px; border-radius: 75px; background: #C99A3C; color: #1B2A4A; font-size: 90px; font-weight: 900; display: flex; align-items: center; justify-content: center; }
.tag { position: absolute; bottom: 70px; left: 70px; font-size: 30px; color: rgba(242,234,211,.6); direction: ltr; }
""" % FONT_URI

BOOKS = [
    ("داستان کاهو", "هاروکی موراکامی", "ترجمه‌ی مبینا شهریاری", "#6E8B4E", "#F4F0E2"),
    ("غریبه‌ها", "بل بردن", "ترجمه‌ی یلدا علایی", "#2E3A59", "#F2EAD3"),
    ("آشپزخانه‌ی کرملین", "ویتولد شابوفسکی", "ترجمه‌ی زینب کاظم‌خواه", "#8E2B2B", "#F6E7C8"),
]


def grab(video, at, out):
    subprocess.run([imageio_ffmpeg.get_ffmpeg_exe(), "-hide_banner", "-loglevel", "error", "-y", "-ss", str(at),
                    "-i", str(video), "-frames:v", "1", "-vf", "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920",
                    "-q:v", "2", str(out)], check=True)
    return out.as_uri()


def render(html_body, out):
    with tempfile.TemporaryDirectory() as td:
        h = Path(td) / "f.html"
        h.write_text(f"<!doctype html><html><head><meta charset='utf-8'><style>{CSS}</style></head><body>{html_body}</body></html>",
                     encoding="utf-8")
        subprocess.run([EDGE, "--headless=new", "--disable-gpu", "--hide-scrollbars", f"--user-data-dir={td}\\u",
                        "--window-size=1080,1920", "--virtual-time-budget=3000", f"--screenshot={out}", h.as_uri()],
                       check=True, capture_output=True)


def khoob_logo(src, out):
    im = Image.open(src).convert("RGBA")
    px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            if r > 235 and g > 235 and b > 235:
                px[x, y] = (255, 255, 255, 0)
    im.crop(im.getbbox()).save(out)
    return out.as_uri()


def main(logo_src):
    FR.mkdir(parents=True, exist_ok=True)
    kl = khoob_logo(Path(logo_src), OUT / "khoob_logo_transparent.png")
    bg1 = grab(STOCK / "e_night_reading_bed.mp4", 4.0, FR / "_bg1.jpg")
    bg2 = grab(STOCK / "d_book_macro.mp4", 3.0, FR / "_bg2.jpg")
    bg3 = grab(STOCK / "c_shelf_books.mp4", 2.0, FR / "_bg3.jpg")
    bg4 = (W / "stories_v2" / "assets" / "stack_13130636_w.jpg").as_uri()

    frames = []
    frames.append(f"<div class='bg' style=\"background-image:url('{bg1}')\"></div><div class='shade'></div>"
                  "<div class='hook'>روزی ۱۵ دقیقه.<br><g>۳۰ روز.</g></div>")
    frames.append(f"<div class='bg' style=\"background-image:url('{bg2}')\"></div><div class='shade'></div>"
                  "<div class='box' style='top:760px'>جایزه؟<br><g>۳ کتاب تازه.</g></div>")
    for i, (t, a, tr, c, fg) in enumerate(BOOKS, 1):
        frames.append(f"<div class='bg' style=\"background-image:url('{bg3}');filter:blur(14px) brightness(.55);transform:scale(1.1)\"></div>"
                      f"<div class='num'>{'۱۲۳'[i-1]} از ۳</div>"
                      f"<div class='book' style='background:{c};color:{fg}'><div class='t'>{t}</div>"
                      "<div class='ph'>جای عکس جلد اصلی</div></div>"
                      f"<div class='meta'>{a}<span>{tr}</span></div>")
    frames.append(f"<div class='bg' style=\"background-image:url('{bg4}');filter:brightness(.45)\"></div>"
                  f"<div class='logos'><div class='lb peleh'><img src='{ICON}'></div><div class='x'>×</div>"
                  f"<div class='lb'><img src='{kl}'></div></div>"
                  "<div class='box' style='top:1000px;font-size:64px'>هدیه‌ی <g>نشر خوب</g><br>"
                  "<span class='small'>نفر اول تا سوم جدول آذر<br>هر نفر <b style=\"color:#E2B457\">یک کتاب</b></span></div>")
    frames.append("<div class='bg' style='background:#1B2A4A'></div>"
                  f"<div style='position:absolute;top:250px;left:0;right:0;text-align:center'><img src='{ICON}' style='width:150px;border-radius:32px;border:3px solid #C99A3C'></div>"
                  "<div class='hook' style='top:450px;font-size:84px'>از <g>۱ آذر</g> شروع کن</div>"
                  "<div class='steps'>پله ← کتاب ← چالش‌ها ← چالش ۳۰ روزه"
                  "<br><span class='small'>نفر ۴ تا ۱۰: ۷ روز پریمیوم</span></div>"
                  "<div class='box' style='top:1180px;font-size:62px;padding:26px'>کدومش رو اول می‌خونی؟</div>"
                  "<div class='chips'><span>۱</span><span>۲</span><span>۳</span></div>"
                  "<div class='tag'>@pelehapp × @khoobpub</div>")

    paths = []
    for i, body in enumerate(frames, 1):
        p = FR / f"frame_{i}.png"
        render(body, p)
        paths.append(p)
    for f in FR.glob("_bg*.jpg"):
        f.unlink()

    # storyboard sheet (for the DM to Khoob): HTML grid, 4 + 3 frames, right-to-left, with beat labels
    labels = ["۰ تا ۲٫۵ ثانیه · هوک روی صحنه‌ی واقعی", "۲٫۵ تا ۴٫۵ · جایزه", "۴٫۵ تا ۶٫۵ · کتاب اول",
              "۶٫۵ تا ۸٫۵ · کتاب دوم", "۸٫۵ تا ۱۰٫۵ · کتاب سوم", "۱۰٫۵ تا ۱۳ · هدیه‌ی نشر خوب",
              "۱۳ تا ۱۶ · شروع از ۱ آذر و کامنت"]
    cells = "".join(f"<div class='c'><img src='{p.as_uri()}'><div class='l'>{l}</div></div>" for p, l in zip(paths, labels))
    sheet_css = CSS.replace("width: 1080px; height: 1920px;", "width: 1700px; height: 1880px;")
    body = ("<div style='position:absolute;inset:0;background:#F3F0E8;color:#1B2A4A;padding:50px 40px;box-sizing:border-box'>"
            "<div style='font-size:44px;font-weight:800;text-align:center'>استوری‌بورد ریلز مشترک <span style='color:#AA1D40'>نشر خوب</span> × <span style='color:#B0832E'>پله</span></div>"
            "<div style='font-size:26px;text-align:center;margin:6px 0 30px;opacity:.75'>پیش‌نویس برای تأیید · جای جلدها با عکس اصلی کتاب‌ها پر می‌شود · حدود ۱۶ ثانیه، با صدای راوی و موسیقی</div>"
            "<div style='display:grid;grid-template-columns:repeat(4,380px);gap:26px 30px;justify-content:center'>" + cells + "</div></div>"
            "<style>.c img{width:380px;height:676px;border-radius:18px;display:block;box-shadow:0 8px 24px rgba(0,0,0,.18)}"
            ".c .l{font-size:24px;font-weight:700;text-align:center;margin-top:10px}</style>")
    with tempfile.TemporaryDirectory() as td:
        h = Path(td) / "s.html"
        h.write_text(f"<!doctype html><html><head><meta charset='utf-8'><style>{sheet_css}</style></head><body>{body}</body></html>", encoding="utf-8")
        subprocess.run([EDGE, "--headless=new", "--disable-gpu", "--hide-scrollbars", f"--user-data-dir={td}\\u",
                        "--window-size=1700,1880", "--virtual-time-budget=4000", f"--screenshot={OUT / 'storyboard_khoob.png'}", h.as_uri()],
                       check=True, capture_output=True)
    return paths, labels


if __name__ == "__main__":
    main(sys.argv[1])
    print("ok")
