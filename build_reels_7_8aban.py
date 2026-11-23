"""Build the Thu 7 Aban Reel (D013, «چی دست خودته؟» carousel -> Reel) and the Fri 8 Aban Reel (D014r).

Same pipeline as build_reel_d010.py, plus:
  * the narration is re-timed from ElevenLabs chunks (pauses tightened), so every overlay is cut on a word;
  * photo segments get a slow Ken Burns move (zoompan on a 2x upscale, so it doesn't jitter);
  * a segment can hold several overlay states (kinetic text) switched at given seconds;
  * music is ducked under the voice (sidechain), SFX are synthesised or reused, and loudness is normalised.

Usage: python build_reels_7_8aban.py d013|d014r
"""
import json
import subprocess
import sys
from pathlib import Path

import imageio_ffmpeg

W = Path(__file__).resolve().parent
STOCK = W / "stock"
PH = W / "stories_v2" / "assets"
FONT = (W / "app_ref" / "Vazirmatn-Variable.woff2").as_uri()
ICON = (W / "app_ref" / "icon-192.png").as_uri()
EDGE = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
FF = imageio_ffmpeg.get_ffmpeg_exe()
NAVY, GOLD, CREAM = "#1B2A4A", "#C99A3C", "#F2EAD3"

BASE_CSS = f"""
@font-face {{ font-family: V; src: url('{FONT}') format('woff2'); font-weight: 100 900; }}
html, body {{ margin: 0; width: 1080px; height: 1920px; background: transparent; }}
body {{ font-family: V; direction: rtl; position: relative; overflow: hidden; }}
g {{ color: #F0B847; }}
.series {{ position: absolute; top: 300px; right: 0; left: 0; text-align: center; }}
.series span {{ display: inline-block; background: rgba(27,42,74,.9); color: {CREAM};
  font-size: 40px; font-weight: 700; padding: 14px 34px; border-radius: 40px; }}
.series span:before {{ content: ''; display: inline-block; width: 14px; height: 14px; border-radius: 50%;
  background: {GOLD}; margin-left: 16px; vertical-align: middle; }}
.hook {{ position: absolute; top: 660px; right: 0; left: 0; text-align: center; color: #FFF8EA;
  padding: 110px 20px; font-weight: 900; line-height: 1.34;
  background: linear-gradient(180deg, rgba(10,16,30,0) 0%, rgba(10,16,30,.6) 22%, rgba(10,16,30,.6) 78%, rgba(10,16,30,0) 100%);
  text-shadow: 0 4px 18px rgba(0,0,0,.85), 0 0 3px rgba(0,0,0,.9); }}
.hook .l1 {{ font-size: 100px; white-space: nowrap; }}
.hook .l2 {{ font-size: 100px; white-space: nowrap; }}
.box {{ position: absolute; top: 760px; right: 90px; left: 90px; text-align: center;
  background: rgba(27,42,74,.88); color: {CREAM}; font-size: 80px; font-weight: 800;
  line-height: 1.45; padding: 46px 40px; border-radius: 32px; }}
.box small {{ display: block; font-size: 44px; font-weight: 600; color: #D9CFB6; margin-top: 18px; line-height: 1.5; }}
.item {{ position: absolute; top: 640px; right: 90px; left: 90px; text-align: center; color: {CREAM}; }}
.item .num {{ font-size: 230px; font-weight: 900; color: #F0B847; line-height: 1;
  text-shadow: 0 6px 24px rgba(0,0,0,.7); }}
.item .txt {{ margin-top: 26px; display: inline-block; background: rgba(27,42,74,.88); font-size: 80px;
  font-weight: 800; line-height: 1.42; padding: 34px 48px; border-radius: 30px; }}
.item .txt small {{ display: block; font-size: 44px; font-weight: 600; color: #D9CFB6; margin-top: 12px; }}
.big {{ position: absolute; top: 700px; right: 0; left: 0; text-align: center; color: #FFF8EA;
  text-shadow: 0 6px 28px rgba(0,0,0,.85); }}
.big .n {{ font-size: 260px; font-weight: 900; color: #F0B847; line-height: 1.05; }}
.big .s {{ display: inline-block; margin-top: 30px; font-size: 50px; font-weight: 700; background: rgba(27,42,74,.85);
  padding: 22px 40px; border-radius: 26px; color: {CREAM}; }}
.chips {{ position: absolute; top: 1010px; right: 0; left: 0; text-align: center; direction: rtl; }}
.chips span {{ display: inline-block; width: 120px; height: 120px; line-height: 124px; margin: 0 10px; border-radius: 50%;
  background: rgba(27,42,74,.92); border: 4px solid {GOLD}; color: #F0B847; font-size: 70px; font-weight: 900; }}
.logo {{ position: absolute; top: 1290px; right: 0; left: 0; text-align: center; }}
.logo img {{ width: 120px; height: 120px; border-radius: 28px; }}
/* chat mock (Thursday, item 5) */
.phone {{ position: absolute; top: 760px; left: 190px; width: 700px; height: 640px; border-radius: 44px;
  background: #0F1A30; border: 3px solid rgba(201,154,60,.55); overflow: hidden; box-shadow: 0 30px 80px rgba(0,0,0,.6); }}
.phone .bar {{ height: 110px; background: #16233F; display: flex; align-items: center; padding: 0 34px; gap: 22px; }}
.phone .av {{ width: 66px; height: 66px; border-radius: 50%; background: #2D3F66; }}
.phone .nm {{ color: {CREAM}; font-size: 40px; font-weight: 700; }}
.phone .area {{ position: absolute; top: 110px; bottom: 120px; left: 0; right: 0; padding: 30px; }}
.phone .bub {{ position: absolute; bottom: 30px; right: 30px; max-width: 520px; background: {GOLD}; color: #1B2A4A;
  font-size: 44px; font-weight: 700; line-height: 1.45; padding: 22px 30px; border-radius: 30px 30px 6px 30px; }}
.phone .bub i {{ font-style: normal; font-size: 28px; font-weight: 600; margin-right: 14px; opacity: .8; }}
.phone .inp {{ position: absolute; bottom: 22px; left: 26px; right: 26px; height: 80px; border-radius: 40px;
  background: #1E2D4F; color: {CREAM}; font-size: 38px; line-height: 80px; padding: 0 34px; box-sizing: border-box; }}
.phone .inp.ph {{ color: #7D8AA6; }}
/* list card (Friday) */
.card {{ position: absolute; top: 640px; right: 110px; left: 110px; background: rgba(242,234,211,.96); color: {NAVY};
  border-radius: 34px; padding: 44px 54px 50px; box-shadow: 0 30px 80px rgba(0,0,0,.55); }}
.card h3 {{ margin: 0 0 22px; font-size: 76px; font-weight: 900; border-bottom: 5px solid {GOLD}; padding-bottom: 14px; }}
.card .r {{ font-size: 64px; font-weight: 700; line-height: 1.6; }}
.card .r.dim {{ visibility: hidden; }}
.card .eq {{ margin-top: 18px; font-size: 70px; font-weight: 900; color: #9A6E1B; }}
"""


def render(html: str, png: Path) -> Path:
    src = png.with_suffix(".html")
    src.write_text(f"<!doctype html><meta charset='utf-8'><style>{BASE_CSS}</style>{html}", encoding="utf-8")
    subprocess.run([EDGE, "--headless=new", "--disable-gpu", "--hide-scrollbars",
                    "--default-background-color=00000000", "--window-size=1080,1920",
                    "--virtual-time-budget=2000", f"--screenshot={png}", src.as_uri()], check=True, capture_output=True)
    src.unlink()
    return png


def run(args):
    subprocess.run([FF, "-hide_banner", "-loglevel", "error", "-y", *args], check=True)


# ---------------------------------------------------------------------------------------------- configs
def chat(state: str) -> str:
    inner = ("<div class='inp'>سلام، یادت افتادم. خوبی؟</div>" if state == "a" else
             "<div class='bub'>سلام، یادت افتادم. خوبی؟<i>۲۰:۳۰ ✓✓</i></div><div class='inp ph'>پیام…</div>")
    return f"<div class='phone'><div class='bar'><div class='av'></div><div class='nm'>یه دوست</div></div><div class='area'></div>{inner}</div>"


def item(n, txt, small=""):
    s = f"<small>{small}</small>" if small else ""
    return f"<div class='item'><div class='num'>{n}</div><div class='txt'>{txt}{s}</div></div>"


CFG = {
    "d013": dict(
        out="reel_d013", name="peleh_D013_dast_khodet.mp4", series=None,
        narration="narration_v2_take1.mp3", tempo=1.15,
        # speech chunks in the raw take (from silencedetect -35 dB) and the gap AFTER each chunk (raw seconds)
        chunks=[(0.0, 3.08), (3.39, 3.86), (4.21, 5.71), (5.92, 7.31), (7.63, 9.79), (10.01, 11.77),
                (12.02, 12.73), (12.95, 13.76), (13.98, 14.93), (15.22, 15.83), (16.08, 17.50)],
        gaps=[0.16, 0.06, 0.12, 0.12, 0.12, 0.14, 0.08, 0.14, 0.24, 0.1, 0.0],
        music=W / "reel_d010" / "music_leberch_reading.mp3", music_from=40.0, music_vol=0.5,
        tail=0.45, loop=0.5,
        hook=("<div class='hook'><div class='l1'>۵ کار کوچیک</div>"
              "<div class='l2'>که هنوز <g>دست خودته</g>.</div></div>"),
        # (first chunk index, kind, source, params, [ (html, from-chunk-or-None) ... ])
        segs=[
            (0, "photo", PH / "candletea_134921905.jpg", dict(z0=1.0, z1=1.06, fx=0.5, fy=0.62), ["HOOK"]),
            ("t1.3", "photo", PH / "candletea_134921905.jpg", dict(z0=1.45, z1=1.55, fx=0.42, fy=0.72), ["HOOK"]),
            (1, "video", STOCK / "f_hourglass_fog.mp4", dict(ss=7.4, cx=380), [item("۱", "خبر، فقط <g>صبح و عصر</g>.")]),
            (3, "photo", PH / "shoes_3170825_w.jpg", dict(z0=1.12, z1=1.0, fx=0.33, fy=0.5), [item("۲", "۱۰ دقیقه <g>راه رفتن</g>.")]),
            (4, "video", STOCK / "b_hands_flip_pages.mp4", dict(ss=2.0, cx=900), [item("۳", "یه کار کوچیکِ <g>تموم‌شدنی</g>.", "۲ صفحه کتاب، یا مرتب کردن یه کشو")]),
            (5, "video", STOCK / "e_night_reading_bed.mp4", dict(ss=3.0, dark=0.72), [item("۴", "گوشی، <g>بیرون از تخت</g>.")]),
            (6, "photo", PH / "candletea_134921905_w.jpg", dict(z0=1.05, z1=1.0, fx=0.5, fy=0.5, blur=22, dark=0.55),
             [("<div class='item' style='top:330px'><div class='num' style='font-size:190px'>۵</div>"
               "<div class='txt'>یه پیام، به <g>یه نفر</g>.</div></div>" + chat("a"), None),
              ("<div class='item' style='top:330px'><div class='num' style='font-size:190px'>۵</div>"
               "<div class='txt'>یه پیام، به <g>یه نفر</g>.</div></div>" + chat("b"), 7)]),
            (8, "photo", PH / "darkread_404515042.jpg", dict(z0=1.0, z1=1.08, fx=0.5, fy=0.35),
             ["<div class='box'>لازم نیست همه‌ش باشه.<br><g>یکی‌ش کافیه.</g></div>"]),
            (9, "photo", PH / "night_17805164.jpg", dict(z0=1.08, z1=1.0, fx=0.5, fy=0.5, dark=0.75),
             ["<div class='box' style='top:620px'>امروز <g>کدومش</g>؟</div>"
              "<div class='chips'><span>۱</span><span>۲</span><span>۳</span><span>۴</span><span>۵</span></div>"
              "<div class='box' style='top:1180px;font-size:62px;padding:30px 30px'>شماره‌ش رو <g>کامنت</g> کن.</div>"
              "<div class='logo' style='top:1440px'><img src='" + ICON + "'></div>"]),
        ],
        # (sfx, at = chunk index start or absolute seconds as float string, volume)
        sfx=[("tick", 0.03, 0.35), ("tick", "c1", 0.3), ("tick", "c3", 0.3), ("page", "c4", 0.35),
             ("tick", "c5", 0.3), ("pop", "c7", 0.45), ("whoosh", "c9", 0.3)],
    ),
    "d014r": dict(
        out="reel_d014r", name="peleh_D014r_farda_jobran.mp4", series="جمعه‌ی مرور",
        narration="narration_v2_take1.mp3", tempo=1.08,
        chunks=[(0.0, 1.36), (1.85, 2.60), (2.85, 4.31), (4.66, 7.14), (7.52, 8.12), (8.48, 10.75),
                (11.05, 11.68), (12.10, 13.75), (14.07, 16.18)],
        gaps=[0.38, 0.08, 0.28, 0.2, 0.1, 0.24, 0.3, 0.12, 0.0],
        music=W / "audio" / "music.mp3", music_from=20.0, music_vol=0.42,
        tail=0.45, loop=0.5,
        hook=("<div class='hook'><div class='l1'>«فردا جبران می‌کنم.»</div>"
              "<div class='l2'>ترجمه: <g>فردا هم شلوغه.</g></div></div>"),
        segs=[
            (0, "photo", PH / "stack_13130636.jpg", dict(z0=1.0, z1=1.06, fx=0.5, fy=0.42), ["HOOK"]),
            (1, "photo", PH / "stackred_13130591.jpg", dict(z0=1.15, z1=1.24, fx=0.5, fy=0.72), ["HOOK"]),
            (3, "photo", PH / "stack_13130636.jpg", dict(z0=1.1, z1=1.0, fx=0.5, fy=0.42, blur=18, dark=0.6),
             [("<div class='card'><h3>فردا</h3><div class='r'>· کارای خودِ فردا</div>"
               "<div class='r dim'>· + کارای امروز</div><div class='eq' style='visibility:hidden'>= دوبرابر</div></div>", None),
              ("<div class='card'><h3>فردا</h3><div class='r'>· کارای خودِ فردا</div>"
               "<div class='r'>· + کارای امروز</div><div class='eq'>= دوبرابر</div></div>", 1.45)]),
            (4, "video", STOCK / "g_hands_reading_book.mp4", dict(ss=2.0),
             ["<div class='box'>به جاش:<br>کوچیک‌ترین نسخه‌ش،<br><g>همین امشب.</g></div>"]),
            (6, "photo", PH / "hourglass_8943578.jpg", dict(z0=1.0, z1=1.1, fx=0.5, fy=0.55),
             ["<div class='big'><div class='n'>۲ دقیقه</div>"
              "<div class='s'>یه صفحه · یه ست ورزش · یه خط گزارش</div></div>"]),
            (7, "photo", PH / "night_17805164.jpg", dict(z0=1.08, z1=1.0, fx=0.5, fy=0.5, dark=0.75),
             ["<div class='box' style='top:640px'>کدوم کارت این هفته<br><g>عقب موند</g>؟</div>"
              "<div class='box' style='top:1060px;font-size:60px;padding:30px 30px'>نسخه‌ی ۲ دقیقه‌ایش رو<br><g>کامنت</g> کن.</div>"
              "<div class='logo' style='top:1400px'><img src='" + ICON + "'></div>"]),
        ],
        sfx=[("tick", 0.03, 0.35), ("tick", "c3+1.45", 0.3), ("page", "c4", 0.35), ("tick", "c6", 0.3),
             ("whoosh", "c7", 0.3)],
    ),
}


# ---------------------------------------------------------------------------------------------- audio
def make_sfx(build: Path) -> dict:
    out = {}
    specs = {
        "tick": "aevalsrc='0.6*sin(2*PI*1800*t)*exp(-60*t)':d=0.12",
        "pop": "aevalsrc='0.7*sin(2*PI*(900+600*t)*t)*exp(-25*t)':d=0.25",
    }
    for k, src in specs.items():
        p = build / f"sfx_{k}.wav"
        run(["-f", "lavfi", "-i", src + ":s=44100", "-ac", "2", str(p)])
        out[k] = p
    p = build / "sfx_whoosh.wav"
    run(["-f", "lavfi", "-i", "anoisesrc=d=0.6:c=pink:a=0.5:r=44100", "-af",
         "highpass=f=400,lowpass=f=3000,afade=t=in:d=0.3,afade=t=out:st=0.3:d=0.3,volume=0.6", "-ac", "2", str(p)])
    out["whoosh"] = p
    out["page"] = W / "audio" / "page_turn.wav"
    return out


def make_narration(c: dict, out: Path, build: Path):
    """Cut the take into chunks, re-join with tight gaps, speed up. Returns final-timeline chunk starts/ends."""
    src = out / c["narration"]
    pad = 0.03
    parts, starts, ends, t = [], [], [], 0.0
    filt = []
    for i, ((a, b), g) in enumerate(zip(c["chunks"], c["gaps"])):
        a2, b2 = max(0.0, a - pad), b + pad
        filt.append(f"[0:a]atrim={a2}:{b2},asetpts=PTS-STARTPTS,aresample=44100,aformat=channel_layouts=mono[c{i}];")
        parts.append(f"[c{i}]")
        starts.append(t / c["tempo"])
        t += b2 - a2
        ends.append(t / c["tempo"])
        if g > 0:
            filt.append(f"anullsrc=r=44100:cl=mono,atrim=duration={g}[g{i}];")
            parts.append(f"[g{i}]")
            t += g
    n = len(parts)
    wav = build / "narration_tight.wav"
    run(["-i", str(src), "-filter_complex",
         "".join(filt) + "".join(parts) + f"concat=n={n}:v=0:a=1,atempo={c['tempo']}[a]", "-map", "[a]", str(wav)])
    return wav, starts, ends


def at(spec, starts):
    if isinstance(spec, (int, float)):
        return float(spec)
    if spec.startswith("c"):
        if "+" in spec:
            k, off = spec[1:].split("+")
            return starts[int(k)] + float(off)
        return starts[int(spec[1:])]
    return float(spec)


# ---------------------------------------------------------------------------------------------- video
def seg_video(kind, src, p, dur, overlays, outp: Path):
    """overlays: list of (png, t_from, t_to) in segment-local seconds."""
    args = []
    if kind == "video":
        args += ["-ss", str(p.get("ss", 0)), "-t", str(dur + 0.3), "-i", str(src)]
        crop = "crop=1080:1920" if p.get("cx") is None else f"crop=1080:1920:{p['cx']}:0"
        base = (f"[0:v]scale=1080:1920:force_original_aspect_ratio=increase,{crop},fps=30,setsar=1,"
                f"eq=brightness=-0.04:saturation=0.85,trim=duration={dur},setpts=PTS-STARTPTS")
    else:
        frames = int(round(dur * 30)) + 2
        z0, z1 = p.get("z0", 1.0), p.get("z1", 1.1)
        fx, fy = p.get("fx", 0.5), p.get("fy", 0.5)
        args += ["-loop", "1", "-framerate", "30", "-t", str(dur + 0.2), "-i", str(src)]
        # 2x canvas, crop around the focus point, then a smooth zoom from z0 to z1
        base = (f"[0:v]scale=2160:3840:force_original_aspect_ratio=increase,"
                f"crop=2160:3840:(iw-2160)*{fx}:(ih-3840)*{fy},"
                f"zoompan=z='{z0}+({z1}-{z0})*on/{frames}':x='(iw-iw/zoom)*{fx}':y='(ih-ih/zoom)*{fy}':"
                f"d=1:s=1080x1920:fps=30,setsar=1,eq=brightness=-0.03:saturation=0.88")
        if p.get("blur"):
            base += f",gblur=sigma={p['blur']}"
        base += f",trim=duration={dur},setpts=PTS-STARTPTS"
    if p.get("dark"):
        base += f",colorchannelmixer=rr={p['dark']}:gg={p['dark']}:bb={p['dark']}"
    for png, _, _ in overlays:
        args += ["-loop", "1", "-framerate", "30", "-t", str(dur + 0.2), "-i", str(png)]
    fc = base + "[b0];"
    for j, (_, t0, t1) in enumerate(overlays):
        fc += f"[{j + 1}:v]format=rgba[o{j}];[b{j}][o{j}]overlay=0:0:enable='between(t,{t0:.3f},{t1:.3f})'[b{j + 1}];"
    fc += f"[b{len(overlays)}]scale=out_range=tv,format=yuv420p[v]"
    run([*args, "-filter_complex", fc, "-map", "[v]", "-t", f"{dur:.3f}", "-r", "30", "-an",
         "-c:v", "libx264", "-preset", "medium", "-crf", "17", "-color_range", "tv", "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709", str(outp)])


def build(key: str):
    c = CFG[key]
    out = W / c["out"]
    b = out / "_build"
    b.mkdir(parents=True, exist_ok=True)
    wav, starts, ends = make_narration(c, out, b)
    nar_end = ends[-1]
    body = nar_end + c["tail"]
    total = round(body + c["loop"], 3)
    pill = f"<div class='series'><span>{c['series']}</span></div>" if c["series"] else ""

    # segment boundaries
    segs = c["segs"]
    bounds = [0.0] + [float(s[0][1:]) if isinstance(s[0], str) else starts[s[0]] for s in segs[1:]] + [body]
    seg_files = []
    for i, (ci, kind, src, p, ovs) in enumerate(segs):
        s0, s1 = bounds[i], bounds[i + 1]
        dur = round(s1 - s0, 3)
        pngs = []
        states = [(o, None) if isinstance(o, str) else o for o in ovs]
        for j, (html, frm) in enumerate(states):
            html = c["hook"] if html == "HOOK" else html
            png = render(pill + html, b / f"ov_{i}_{j}.png")
            t0 = 0.0 if frm is None else ((starts[frm] if isinstance(frm, int) else s0 + float(frm)) - s0)
            pngs.append([png, t0, dur + 1])
        for j in range(len(pngs) - 1):
            pngs[j][2] = pngs[j + 1][1]
        f = b / f"seg_{i}.mp4"
        seg_video(kind, src, p, dur, [tuple(x) for x in pngs], f)
        seg_files.append(f)
    # loop tail: the hook frame again (first segment's opening), so the replay starts seamlessly
    first = segs[0]
    hook_png = b / "ov_0_0.png"
    loopf = b / "seg_loop.mp4"
    seg_video(first[1], first[2], first[3], c["loop"], [(hook_png, 0, 9)], loopf)
    seg_files.append(loopf)

    concat = b / "concat.txt"
    concat.write_text("".join(f"file '{f.as_posix()}'\n" for f in seg_files), encoding="utf-8")
    silent = b / "video_only.mp4"
    run(["-f", "concat", "-safe", "0", "-i", str(concat), "-c", "copy", str(silent)])

    # audio mix
    sfx = make_sfx(b)
    events = [(sfx[k], at(t, starts), v) for k, t, v in c["sfx"]]
    args = ["-i", str(silent), "-i", str(wav), "-ss", str(c["music_from"]), "-i", str(c["music"])]
    for f, _, _ in events:
        args += ["-i", str(f)]
    fc = (f"[1:a]aresample=44100,aformat=channel_layouts=stereo,apad=whole_dur={total},asplit=2[na][key];"
          f"[2:a]aresample=44100,aformat=channel_layouts=stereo,atrim=duration={total},asetpts=PTS-STARTPTS,"
          f"volume={c['music_vol']},afade=t=in:d=0.3,afade=t=out:st={total - 0.8}:d=0.8[mraw];"
          "[mraw][key]sidechaincompress=threshold=0.03:ratio=8:attack=20:release=350[mu];")
    mix = "[na][mu]"
    for j, (_, t, v) in enumerate(events):
        fc += (f"[{3 + j}:a]aresample=44100,aformat=channel_layouts=stereo,atrim=duration=1.5,asetpts=PTS-STARTPTS,"
               f"volume={v},adelay={int(t * 1000)}:all=1[e{j}];")
        mix += f"[e{j}]"
    fc += (mix + f"amix=inputs={2 + len(events)}:normalize=0:duration=first,atrim=duration={total},"
           "loudnorm=I=-15:TP=-1.5:LRA=11,aresample=44100[aout]")
    final = out / c["name"]
    run([*args, "-filter_complex", fc, "-map", "0:v", "-map", "[aout]", "-t", f"{total}",
         "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-ar", "44100", "-movflags", "+faststart", str(final)])

    # check sheets: 1 fps overview + every 0.5 s
    run(["-i", str(final), "-vf", "fps=1,scale=216:-2,tile=8x2", "-frames:v", "1", str(out / "check_sheet.jpg")])
    run(["-i", str(final), "-vf", "fps=2,scale=180:-2,tile=8x4", "-frames:v", "1", str(out / "check_sheet_halfsec.jpg")])
    run(["-ss", "0", "-i", str(final), "-frames:v", "1", "-q:v", "2", str(out / "frame0.jpg")])
    info = dict(total=total, narration_end=round(nar_end, 3), seg_bounds=[round(x, 3) for x in bounds],
                chunk_starts=[round(x, 3) for x in starts], chunk_ends=[round(x, 3) for x in ends])
    (b / "timing.json").write_text(json.dumps(info, indent=1), encoding="utf-8")
    print(final, json.dumps(info))


if __name__ == "__main__":
    for k in sys.argv[1:] or ["d013", "d014r"]:
        build(k)
