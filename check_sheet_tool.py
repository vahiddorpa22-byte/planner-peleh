"""Check sheet: every STEP seconds of a Reel, labelled with the timestamp. Usage: python check_sheet_tool.py REEL.mp4 OUT.jpg [step] [cols]"""
import subprocess
import sys
import tempfile
from pathlib import Path

import imageio_ffmpeg
from PIL import Image, ImageDraw

FF = imageio_ffmpeg.get_ffmpeg_exe()
src, out = Path(sys.argv[1]), Path(sys.argv[2])
step = float(sys.argv[3]) if len(sys.argv) > 3 else 0.5
cols = int(sys.argv[4]) if len(sys.argv) > 4 else 8
tmp = Path(tempfile.mkdtemp())
subprocess.run([FF, "-hide_banner", "-loglevel", "error", "-i", str(src), "-vf", f"fps=1/{step},scale=200:-2",
                str(tmp / "f_%03d.png")], check=True)
frames = sorted(tmp.glob("f_*.png"))
w, h = Image.open(frames[0]).size
rows = (len(frames) + cols - 1) // cols
sheet = Image.new("RGB", (cols * (w + 4), rows * (h + 24)), "black")
d = ImageDraw.Draw(sheet)
for i, f in enumerate(frames):
    x, y = (i % cols) * (w + 4), (i // cols) * (h + 24)
    sheet.paste(Image.open(f), (x, y + 20))
    d.text((x + 4, y + 4), f"{i * step:.1f}s", fill="yellow")
sheet.save(out, quality=88)
print(out, len(frames))
