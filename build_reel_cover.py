"""Reel cover in the page's standard cover template (matched to the published covers from 20 Mehr on).

Default style from 2026-10-26 (approved by Vahid): the same navy template PLUS a small real scene photo
from the Reel, placed between the subline and the logo. Without a photo the old text-only layout is
rendered exactly as before (backward compatible).

Usage:
  python build_reel_cover.py OUT.png "خط اول (کرم)" "خط دوم (طلایی)" "زیرنویس طلایی"
         [--photo IMG | --video MP4 --at SECONDS] [--focus "50% 50%"] [--size 128]

  --photo   a still from the Reel (jpg/png)
  --video/--at  grab the still straight from a clip/Reel at that second (raw clip = no overlay text)
  --focus   CSS object-position for the crop inside the photo box
  --size    font size of the two main lines (128 = template; go lower only for long hooks)
"""
import argparse
import subprocess
import tempfile
from pathlib import Path

W = Path(__file__).resolve().parent
FONT = (W / "app_ref" / "Vazirmatn-Variable.woff2").as_uri()
ICON = (W / "app_ref" / "icon-512.png").as_uri()
EDGE = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"

# measured from the published covers: navy bg, cream line 1, gold line 2, muted-gold subline,
# gold rule at y≈1200, logo box (≈177px) centred at y≈1379, «پله» at y≈1531
CSS = """
@font-face {{ font-family: V; src: url('{font}') format('woff2'); font-weight: 100 900; }}
html, body {{ margin: 0; width: 1080px; height: 1920px; background: #1B2A4A; }}
body {{ font-family: V; direction: rtl; position: relative; overflow: hidden; text-align: center; }}
.t {{ position: absolute; left: 60px; right: 60px; top: {t_top}px; font-size: {size}px; font-weight: 700;
  line-height: 1.38; color: #F2EAD3; }}
.t .g {{ color: #C99A3C; }}
.sub {{ position: absolute; left: 0; right: 0; top: {sub_top}px; font-size: 58px; font-weight: 600; color: #C2A066; }}
.rule {{ position: absolute; left: 466px; width: 148px; top: {rule_top}px; height: 5px; border-radius: 3px; background: #C99A3C; }}
.box {{ position: absolute; left: 451px; top: {box_top}px; width: 177px; height: 177px; border-radius: 34px;
  border: 2px solid rgba(201,154,60,.28); overflow: hidden; box-sizing: border-box; }}
.box img {{ width: 100%; height: 100%; display: block; }}
.name {{ position: absolute; left: 0; right: 0; top: {name_top}px; font-size: 42px; font-weight: 700; color: #C2A066; }}
.ph {{ position: absolute; left: 230px; width: 620px; top: {ph_top}px; height: 372px; border-radius: 30px;
  overflow: hidden; border: 3px solid #C99A3C; box-sizing: border-box; box-shadow: 0 18px 50px rgba(0,0,0,.45); }}
.ph img {{ width: 100%; height: 100%; object-fit: cover; object-position: {focus}; display: block; }}
"""

# text-only = the original template; photo = everything moved up so the photo sits inside the 3:4 grid crop
TEXT_ONLY = dict(t_top=636, sub_top=1040, rule_top=1198, box_top=1291, name_top=1500, ph_top=0)
WITH_PHOTO = dict(t_top=318, sub_top=716, ph_top=838, rule_top=1252, box_top=1300, name_top=1500)


def grab_frame(video: Path, at: float, out: Path) -> Path:
    import imageio_ffmpeg
    subprocess.run([imageio_ffmpeg.get_ffmpeg_exe(), "-hide_banner", "-loglevel", "error", "-y",
                    "-ss", str(at), "-i", str(video), "-frames:v", "1", "-q:v", "2", str(out)], check=True)
    return out


def build(out: Path, line1: str, line2: str, sub: str, photo: Path | None = None,
          focus: str = "50% 50%", size: int = 128) -> None:
    lay = WITH_PHOTO if photo else TEXT_ONLY
    if photo and size < 128:  # smaller lines take less height: keep the block centred over the sub
        lay = dict(lay, t_top=lay["t_top"] + int((128 - size) * 1.38))
    css = CSS.format(font=FONT, size=size, focus=focus, **lay)
    html = (f"<!doctype html><meta charset='utf-8'><style>{css}</style>"
            f"<div class='t'>{line1}<br><span class='g'>{line2}</span></div>"
            f"<div class='sub'>{sub}</div>")
    if photo:
        html += f"<div class='ph'><img src='{Path(photo).resolve().as_uri()}'></div>"
    html += (f"<div class='rule'></div>"
             f"<div class='box'><img src='{ICON}'></div><div class='name'>پله</div>")
    src = out.with_suffix(".html")
    src.write_text(html, encoding="utf-8")
    subprocess.run([EDGE, "--headless=new", "--disable-gpu", "--hide-scrollbars", "--window-size=1080,1920",
                    "--virtual-time-budget=3000", f"--screenshot={out}", src.as_uri()],
                   check=True, capture_output=True)
    src.unlink()


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("out")
    ap.add_argument("line1")
    ap.add_argument("line2")
    ap.add_argument("sub")
    ap.add_argument("--photo")
    ap.add_argument("--video")
    ap.add_argument("--at", type=float, default=1.0)
    ap.add_argument("--focus", default="50% 50%")
    ap.add_argument("--size", type=int, default=128)
    a = ap.parse_args()
    out = Path(a.out).resolve()
    photo = Path(a.photo) if a.photo else None
    if a.video:
        photo = grab_frame(Path(a.video), a.at, Path(tempfile.gettempdir()) / f"{out.stem}_scene.jpg")
    build(out, a.line1, a.line2, a.sub, photo, a.focus, a.size)
    print(out)
