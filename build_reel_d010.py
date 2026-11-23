"""Build the D010 Reel (کتاب درست ۱ — «۹۱ ساعت کتاب در سال») from free Magnific stock + brand overlays.

Adapted from build_reel_d009.py: overlays are transparent PNGs rendered by headless Edge (correct Persian
shaping), composited on the cropped clips with ffmpeg; narration + Pixabay music (ducked under the voice)
+ page-turn SFX are mixed and baked into the file.
"""
import subprocess
from pathlib import Path

import imageio_ffmpeg

W = Path(__file__).resolve().parent
STOCK = W / "stock"
OUT = W / "reel_d010"
OUT.mkdir(exist_ok=True)
FONT = (W / "app_ref" / "Vazirmatn-Variable.woff2").as_uri()
ICON = (W / "app_ref" / "icon-192.png").as_uri()
EDGE = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
FF = imageio_ffmpeg.get_ffmpeg_exe()

NAVY, GOLD, CREAM = "#1B2A4A", "#C99A3C", "#F2EAD3"
SERIES = "کتاب درست، قسمت ۱"  # «· ۱» read as «۱۰» on screen (the Persian zero is a dot)

# 2026-10-26 hook rewrite (approved audit): no box, big, centred, readable at 0 s; at most 7 words per line.
HOOK = ("<div class='l1'>۱۵ دقیقه از اسکرولت</div>"
        "<div class='l2'>= سالی <g>۹۱ ساعت</g> کتاب.</div>")
# (overlay html, style, show logo)
OVERLAYS = [
    (HOOK, "hook", False),
    ("بدون هدف صفحه‌ای.<br>فقط روزی ۱۵ <g>دقیقه</g>.", "box", False),
    ("<span class='n'>۱۵ دقیقه</span><br>× <span class='n'>۳۶۵ روز</span>", "box", False),
    ("یعنی ۵٬۴۷۵ دقیقه<br>≈ <g>۹۱ ساعت</g>", "box", False),
    ("۹۱ ساعت برای تو<br>چند تا <g>کتاب</g> می‌شه؟", "box", False),
    ("عددت رو <g>کامنت</g> کن.", "box", True),
    (HOOK, "hook", False),  # loop back to the opening frame
]

# (clip, source start s, duration s, crop x or None for centre) — cut on the narration's pauses (after atempo)
SEGMENTS = [
    ("e_night_reading_bed.mp4", 1.0, 1.96, None),
    ("h_desk_reading.mp4", 7.6, 2.03, None),
    ("g_hands_reading_book.mp4", 2.0, 3.49, None),
    ("f_hourglass_fog.mp4", 7.4, 1.84, 380),
    ("h_desk_reading.mp4", 1.4, 1.73, None),
    ("g_hands_reading_book.mp4", 7.0, 1.25, None),
    ("e_night_reading_bed.mp4", 1.0, 0.60, None),
]

NARRATION = OUT / "narration_take6.mp3"  # v2 ending (2026-10-25); ElevenLabs web app, Connery - Persian Narrator, Eleven v4
TEMPO = 1.17  # tighten the read to fit ~12 s
MUSIC = OUT / "music_leberch_reading.mp3"  # Pixabay Music: "Reading" by leberch (Pixabay Content License)
MUSIC_FROM = 13.0
PAGE_TURN = W / "audio" / "page_turn.wav"  # ElevenLabs sound effect (from D009)
PAGE_TURN_AT = (1.96, 9.32)  # the page-flip shots

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
.box .n {{ color: {GOLD}; }}
.hook {{ position: absolute; top: 640px; right: 0; left: 0; text-align: center; color: #FFF8EA;
  padding: 120px 20px; font-weight: 900; line-height: 1.32;
  background: linear-gradient(180deg, rgba(10,16,30,0) 0%, rgba(10,16,30,.62) 22%, rgba(10,16,30,.62) 78%, rgba(10,16,30,0) 100%);
  text-shadow: 0 4px 18px rgba(0,0,0,.85), 0 0 3px rgba(0,0,0,.9); }}
.hook .l1 {{ font-size: 94px; white-space: nowrap; }}
.hook .l2 {{ font-size: 100px; white-space: nowrap; }}
.hook g {{ color: #F0B847; }}
.big {{ font-size: 330px; font-weight: 900; line-height: 1.05; }}
.bigsub {{ font-size: 86px; font-weight: 800; line-height: 1.3; }}
.logo {{ position: absolute; top: 1290px; right: 0; left: 0; text-align: center; }}
.logo img {{ width: 120px; height: 120px; border-radius: 28px; }}
"""


def render(html: str, png: Path) -> None:
    src = png.with_suffix(".html")
    src.write_text(f"<!doctype html><meta charset='utf-8'><style>{BASE_CSS}</style>{html}", encoding="utf-8")
    subprocess.run([EDGE, "--headless=new", "--disable-gpu", "--hide-scrollbars",
                    "--default-background-color=00000000", "--window-size=1080,1920",
                    f"--screenshot={png}", src.as_uri()], check=True, capture_output=True)
    src.unlink()


def build_overlays() -> list[Path]:
    pngs = []
    for i, (text, style, logo) in enumerate(OVERLAYS, 1):
        html = f"<div class='series'><span>{SERIES}</span></div><div class='{style}'>{text}</div>"
        if logo:
            html += f"<div class='logo'><img src='{ICON}'></div>"
        png = OUT / f"overlay_{i}.png"
        render(html, png)
        pngs.append(png)
    return pngs


def build_video(pngs: list[Path]) -> Path:
    args = [FF, "-hide_banner", "-loglevel", "error", "-y"]
    for clip, start, dur, _ in SEGMENTS:
        args += ["-ss", str(start), "-t", str(dur + 0.2), "-i", str(STOCK / clip)]
    for png in pngs:
        args += ["-loop", "1", "-i", str(png)]
    args += ["-i", str(NARRATION), "-ss", str(MUSIC_FROM), "-i", str(MUSIC), "-i", str(PAGE_TURN)]

    n = len(SEGMENTS)
    total = round(sum(s[2] for s in SEGMENTS), 2)
    nar, mus, sfx = 2 * n, 2 * n + 1, 2 * n + 2
    k = len(PAGE_TURN_AT)
    audio = (
        f"[{nar}:a]aresample=44100,atempo={TEMPO},volume=1.0,asplit=2[na][key];"
        f"[{mus}:a]aresample=44100,atrim=duration={total},asetpts=PTS-STARTPTS,volume=0.55,"
        f"afade=t=in:d=0.4,afade=t=out:st={total - 1.0}:d=1.0[mraw];"
        # duck the music under the voice
        "[mraw][key]sidechaincompress=threshold=0.03:ratio=8:attack=20:release=350[mu];"
        f"[{sfx}:a]aresample=44100,atrim=duration=1.6,asetpts=PTS-STARTPTS,volume=0.4,"
        f"asplit={k}" + "".join(f"[t{j}]" for j in range(k)) + ";"
        + "".join(f"[t{j}]adelay={int(at * 1000)}:all=1[d{j}];" for j, at in enumerate(PAGE_TURN_AT))
        + "[na][mu]" + "".join(f"[d{j}]" for j in range(k))
        + f"amix=inputs={2 + k}:normalize=0:duration=longest,"
        f"atrim=duration={total},alimiter=limit=0.9,aformat=channel_layouts=stereo[aout];"
    )
    parts = []
    for i, (_, _, dur, cx) in enumerate(SEGMENTS):
        crop = "crop=1080:1920" if cx is None else f"crop=1080:1920:{cx}:0"
        fade = ""  # hard cuts: a fade made the series pill blink at every cut
        parts.append(
            f"[{i}:v]scale=1080:1920:force_original_aspect_ratio=increase,{crop},"
            f"fps=30,setsar=1,eq=brightness=-0.04:saturation=0.85,trim=duration={dur},"
            f"setpts=PTS-STARTPTS[v{i}];"
            f"[{n + i}:v]format=rgba,trim=duration={dur},setpts=PTS-STARTPTS{fade}[o{i}];"
            f"[v{i}][o{i}]overlay=0:0:format=auto[s{i}];"
        )
    parts.append("".join(f"[s{i}]" for i in range(n)) + f"concat=n={n}:v=1:a=0,format=yuv420p[out]")
    out = OUT / "peleh_D010_ketab_dorost_1.mp4"
    args += ["-filter_complex", audio + "".join(parts), "-map", "[out]", "-map", "[aout]",
             "-t", f"{total}", "-r", "30", "-c:v", "libx264", "-preset", "medium", "-crf", "18",
             "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart", str(out)]
    subprocess.run(args, check=True)
    return out


if __name__ == "__main__":
    video = build_video(build_overlays())
    subprocess.run([FF, "-hide_banner", "-loglevel", "error", "-y", "-i", str(video),
                    "-vf", "fps=1/1.0,scale=216:-2,tile=7x2", "-frames:v", "1",
                    str(OUT / "check_sheet.jpg")], check=True)
    print(video)
