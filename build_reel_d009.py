"""Build the D009 Reel (نصفه‌کاره‌ها ۱) from free Magnific stock + brand text overlays.

Overlays are rendered as transparent PNGs by headless Edge (correct Persian shaping),
then composited onto the trimmed/cropped clips with ffmpeg.
"""
import subprocess
from pathlib import Path

import imageio_ffmpeg

W = Path(__file__).resolve().parent
STOCK = W / "stock"
OUT = W / "reel_d009"
OUT.mkdir(exist_ok=True)
FONT = (W / "app_ref" / "Vazirmatn-Variable.woff2").as_uri()
ICON = (W / "app_ref" / "icon-192.png").as_uri()
EDGE = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
FF = imageio_ffmpeg.get_ffmpeg_exe()

NAVY, GOLD, CREAM = "#1B2A4A", "#C9A227", "#F3F0E8"
SERIES = "نصفه‌کاره‌ها، قسمت ۱"

# (overlay text with <g> for the gold word, show logo?)
OVERLAYS = [
    ("نشانگرش از <g>کِی</g><br>وسط این کتابه؟", False),
    ("نصفه ول کردن<br><g>تنبلی</g> نیست.", False),
    ("معمولاً قدم اول<br><g>زیادی بزرگ</g> بوده.", False),
    ("امشب فقط <g>۲ صفحه</g>.<br>از همون‌جا که موند.", False),
    ("عددت <g>چنده</g>؟<br>کامنت کن.", True),
]

# (clip, source start s, duration s) — one segment per overlay, cut on the narration's sentence pauses
SEGMENTS = [
    ("c_shelf_books.mp4", 1.0, 3.80),
    ("d_book_macro.mp4", 2.5, 3.06),
    ("b_hands_flip_pages.mp4", 1.0, 2.99),
    ("b_hands_flip_pages.mp4", 12.0, 3.05),
    ("d_book_macro.mp4", 7.4, 2.70),
]

AUDIO = W / "audio"
NARRATION = AUDIO / "narration.mp3"  # ElevenLabs, Connery - Persian Narrator, eleven v4
MUSIC = AUDIO / "music.mp3"  # Pixabay: "Lofi Study Session" by Alex Morgan (Pixabay Content License)
PAGE_TURN = AUDIO / "page_turn.wav"  # ElevenLabs sound effect
PAGE_TURN_AT = (3.75, 9.80)  # seconds: the page-flip shots

BASE_CSS = f"""
@font-face {{ font-family: V; src: url('{FONT}') format('woff2'); font-weight: 100 900; }}
html, body {{ margin: 0; width: 1080px; height: 1920px; background: transparent; }}
body {{ font-family: V; direction: rtl; position: relative; overflow: hidden; }}
g {{ color: {GOLD}; }}
.series {{ position: absolute; top: 310px; right: 0; left: 0; text-align: center; }}
.series span {{ display: inline-block; background: rgba(27,42,74,.9); color: {CREAM};
  font-size: 40px; font-weight: 700; padding: 14px 34px; border-radius: 40px; }}
.series span:before {{ content: ''; display: inline-block; width: 14px; height: 14px; border-radius: 50%;
  background: {GOLD}; margin-left: 16px; vertical-align: middle; }}
.box {{ position: absolute; top: 760px; right: 90px; left: 90px; text-align: center;
  background: rgba(27,42,74,.88); color: {CREAM}; font-size: 82px; font-weight: 800;
  line-height: 1.45; padding: 46px 40px; border-radius: 32px; }}
.logo {{ position: absolute; top: 1290px; right: 0; left: 0; text-align: center; }}
.logo img {{ width: 120px; height: 120px; border-radius: 28px; }}
"""


def render(html: str, png: Path) -> None:
    src = png.with_suffix(".html")
    src.write_text(f"<!doctype html><meta charset='utf-8'><style>{BASE_CSS}</style>{html}", encoding="utf-8")
    subprocess.run([EDGE, "--headless=new", "--disable-gpu", "--hide-scrollbars",
                    "--default-background-color=00000000", "--window-size=1080,1920",
                    f"--screenshot={png}", src.as_uri()], check=True, capture_output=True)


def build_overlays() -> list[Path]:
    pngs = []
    for i, (text, logo) in enumerate(OVERLAYS, 1):
        html = f"<div class='series'><span>{SERIES}</span></div><div class='box'>{text}</div>"
        if logo:
            html += f"<div class='logo'><img src='{ICON}'></div>"
        png = OUT / f"overlay_{i}.png"
        render(html, png)
        pngs.append(png)
    cover = f"""<style>body{{background:{NAVY};}}
      .c{{position:absolute;top:700px;right:80px;left:80px;text-align:center;color:{CREAM};
         font-size:104px;font-weight:900;line-height:1.4;}}</style>
      <div class='series' style='top:520px'><span>{SERIES}</span></div>
      <div class='c'>نشانگرش از <g>کِی</g><br>اونجاست؟</div>"""
    render(cover, OUT / "cover.png")
    return pngs


def build_video(pngs: list[Path]) -> Path:
    args = [FF, "-hide_banner", "-loglevel", "error", "-y"]
    for clip, start, dur in SEGMENTS:
        args += ["-ss", str(start), "-t", str(dur), "-i", str(STOCK / clip)]
    for png in pngs:
        args += ["-loop", "1", "-i", str(png)]
    args += ["-i", str(NARRATION), "-i", str(MUSIC), "-i", str(PAGE_TURN)]

    n = len(SEGMENTS)
    total = sum(s[2] for s in SEGMENTS)
    nar, mus, sfx = 2 * n, 2 * n + 1, 2 * n + 2
    turns = "".join(f"[t{k}]" for k in range(len(PAGE_TURN_AT)))
    audio = (
        f"[{nar}:a]aresample=44100,volume=1.0[na];"
        f"[{mus}:a]aresample=44100,atrim=start=6:duration={total},asetpts=PTS-STARTPTS,volume=0.16,"
        f"afade=t=in:d=0.8,afade=t=out:st={total - 1.2}:d=1.2[mu];"
        f"[{sfx}:a]aresample=44100,atrim=duration=1.6,asetpts=PTS-STARTPTS,volume=0.55,"
        f"asplit={len(PAGE_TURN_AT)}" + turns + ";"
        + "".join(f"[t{k}]adelay={int(at * 1000)}:all=1[d{k}];" for k, at in enumerate(PAGE_TURN_AT))
        + "[na][mu]" + "".join(f"[d{k}]" for k in range(len(PAGE_TURN_AT)))
        + f"amix=inputs={2 + len(PAGE_TURN_AT)}:normalize=0:duration=longest,"
        f"atrim=duration={total},alimiter=limit=0.9,aformat=channel_layouts=stereo[aout];"
    )
    parts = []
    for i in range(n):
        # cover-crop to 9:16, then a light grade so the text box reads on any frame
        parts.append(
            f"[{i}:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,"
            f"fps=30,setsar=1,eq=brightness=-0.04:saturation=0.85,trim=duration={SEGMENTS[i][2]},"
            f"setpts=PTS-STARTPTS[v{i}];"
            f"[{n + i}:v]format=rgba,trim=duration={SEGMENTS[i][2]},setpts=PTS-STARTPTS[o{i}];"
            f"[v{i}][o{i}]overlay=0:0:format=auto[s{i}];"
        )
    parts.append("".join(f"[s{i}]" for i in range(n)) + f"concat=n={n}:v=1:a=0,format=yuv420p[out]")
    out = OUT / "peleh_D009_nesfekareha_1.mp4"
    args += ["-filter_complex", audio + "".join(parts), "-map", "[out]", "-map", "[aout]",
             "-t", f"{total}", "-r", "30", "-c:v", "libx264", "-preset", "medium", "-crf", "18",
             "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", str(out)]
    subprocess.run(args, check=True)
    return out


if __name__ == "__main__":
    video = build_video(build_overlays())
    subprocess.run([FF, "-hide_banner", "-loglevel", "error", "-y", "-i", str(video),
                    "-vf", "fps=1/1.5,scale=216:-2,tile=7x1", "-frames:v", "1",
                    str(OUT / "check_sheet.jpg")], check=True)
    print(video)
