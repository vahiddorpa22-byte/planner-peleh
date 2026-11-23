"""Today's Stories (D008, روز ۲ از ۳۰): three 1080x1920 frames rendered with headless Edge."""
import subprocess
from pathlib import Path

import imageio_ffmpeg

from build_reel_d009 import BASE_CSS, CREAM, EDGE, GOLD, NAVY, STOCK, W

OUT = W / "stories_d008"
OUT.mkdir(exist_ok=True)
FF = imageio_ffmpeg.get_ffmpeg_exe()

# warm still for the night frame, taken from the free book-stack clip
bg = OUT / "bg_books.jpg"
subprocess.run([FF, "-hide_banner", "-loglevel", "error", "-y", "-ss", "3", "-i", str(STOCK / "c_shelf_books.mp4"),
                "-frames:v", "1", "-vf", "eq=brightness=-0.08:saturation=0.8", str(bg)], check=True)

FRAMES = {
    "story_1_0900.png": f"""<style>body{{background:{NAVY};}}
      .k{{position:absolute;top:470px;left:0;right:0;text-align:center;color:{CREAM};}}
      .k .s{{font-size:64px;font-weight:600;}} .k .n{{font-size:420px;font-weight:900;color:{GOLD};line-height:1.05;}}</style>
      <div class='k'><div class='s'>روز</div><div class='n'>۲</div><div class='s'>از ۳۰</div></div>""",
    "story_2_0900.png": f"""<style>body{{background:#F3F0E8;}}
      .t{{position:absolute;top:640px;left:80px;right:80px;text-align:center;color:{NAVY};font-size:70px;
        font-weight:800;line-height:1.6;}}</style>
      <div class='t'>یادت باشه:<br>دقیقه‌های امروز<br><g>جمع</g> می‌شن.<br><br>دو تا ۸ دقیقه هم<br>یه روز <g>کامله</g>.</div>""",
    "story_3_2130.png": f"""<style>body{{background:url('{bg.as_uri()}') center/cover;}}
      .t{{position:absolute;top:820px;left:0;right:0;text-align:center;}}
      .t span{{display:inline-block;background:rgba(27,42,74,.88);color:{CREAM};font-size:88px;font-weight:800;
        padding:36px 60px;border-radius:32px;}}</style>
      <div class='t'><span>۱۵ دقیقه‌ی <g>امشب</g>.</span></div>""",
}

for name, html in FRAMES.items():
    png = OUT / name
    src = png.with_suffix(".html")
    src.write_text(f"<!doctype html><meta charset='utf-8'><style>{BASE_CSS}</style>{html}", encoding="utf-8")
    subprocess.run([EDGE, "--headless=new", "--disable-gpu", "--hide-scrollbars", "--window-size=1080,1920",
                    f"--screenshot={png}", src.as_uri()], check=True, capture_output=True)
    print(png.name)
