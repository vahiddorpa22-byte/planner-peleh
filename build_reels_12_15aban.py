"""Peleh Reels for 12, 14 and 15 Aban 1405 (D017, D018, D019) — all on NEW Magnific/Freepik footage
(peleh_work/stock/magnific_2026-11/, see LICENSE_LOG.md there).

Same pipeline and quality bar as D016 (build_reels_7_8aban.py: Edge overlays, ElevenLabs chunks re-timed,
ducked music, synthesised SFX, loudnorm, check sheets), plus:
  * narration chunks can come from several takes, so a part-2 Reel is a TEMPLATE: the fixed take is
    reused and only a tiny chunk (the number / the task + step) changes;
  * "gs" segments: the green-screen phone on the wooden table is keyed and its screen shows our own content
    (the big number), with an optional smooth pull-back (zoom 1.5 -> 1.0 = the phone "goes further away");
  * video segments can freeze on a frame (the pen stops) and get a slow push-in.

Usage
  D017 (Tue 12 Aban, template):
    python build_reels_12_15aban.py d017 --x 23                 # real median; needs reel_d017/num/x_23.mp3
    python build_reels_12_15aban.py d017 --x 20 --preview       # PREVIEW render (uses the 20 chunk we have)
    python build_reels_12_15aban.py d017 --fallback             # <10 comments: «دیروز پرسیدم چند بار…»
    Number audio: one tiny ElevenLabs line, Connery voice, text «بیست و سه بار.», saved as reel_d017/num/x_23.mp3.
    Without that file use --silent-number: the number is shown on screen and the narrator skips it.
  D018 (Thu 14 Aban, final):
    python build_reels_12_15aban.py d018
  D019 (Fri 15 Aban, template):
    python build_reels_12_15aban.py d019 --task "کتاب" --step "از همون صفحه‌ای که مونده باز کن؛<br>فقط <g>یک صفحه</g> بخون." \
        --audio reel_d019/vars/ketab.mp3 [--preview]
    The --audio file is ONE ElevenLabs line: «<task>. <step sentence>» — the first speech chunk is the task word,
    the rest is the step (split automatically on pauses).
"""
import argparse
import json
import re
import subprocess
import sys
from pathlib import Path

import build_reels_7_8aban as B

W, ICON, FF = B.W, B.ICON, B.FF
MAG = W / "stock" / "magnific_2026-11"
PHONE = MAG / "m02_phone_gs_wood_b_3437672.mp4"      # static green-screen phone on wood (decodable 0-14.6 s)
TYPING = MAG / "m05_typing_laptop_v_6128834.mp4"     # hands typing, phone nowhere (15.5 s)
WRITE = MAG / "m08_hand_writing_v_6129005.mp4"       # hand writing in a notebook (vertical)
TEA = MAG / "m07b_tea_hands_720_5583255.mp4"       # hands around a small cup by a window (14.5 s)
SCREEN_BOX = (373, 615, 712, 1363)                   # the phone's green screen in the 1080x1920 frame
PHONE_CX, PHONE_CY = 542.5 / 1080, 989 / 1920
FA = str.maketrans("0123456789", "۰۱۲۳۴۵۶۷۸۹")


def fa(n) -> str:
    return str(n).translate(FA)


# ------------------------------------------------------------------------------------------- audio helpers
def speech_chunks(path: Path, db=-35, d=0.12):
    """Speech chunks (start, end) of a take, from silencedetect."""
    e = subprocess.run([FF, "-i", str(path), "-af", f"silencedetect=n={db}dB:d={d}", "-f", "null", "-"],
                       capture_output=True, text=True).stderr
    m = re.search(r"Duration: (\d+):(\d+):([\d.]+)", e)
    total = int(m[1]) * 3600 + int(m[2]) * 60 + float(m[3])
    ss = [float(x) for x in re.findall(r"silence_start: ([\d.]+)", e)]
    se = [float(x) for x in re.findall(r"silence_end: ([\d.]+)", e)]
    out, t = [], 0.0
    for a, b in zip(ss, se + [total]):
        if a - t > 0.12:
            out.append((round(t, 3), round(a, 3)))
        t = b
    if total - t > 0.12:
        out.append((round(t, 3), round(total, 3)))
    return out


def make_narration(c: dict, out: Path, build: Path):
    """Like B.make_narration, but a chunk may name its own take: (a, b) or (a, b, 'file.mp3')."""
    pad = 0.03
    srcs, filt, parts, starts, ends, t = {}, [], [], [], [], 0.0
    for i, (ch, g) in enumerate(zip(c["chunks"], c["gaps"])):
        a, b = ch[0], ch[1]
        f = Path(ch[2]) if len(ch) > 2 else Path(c["narration"])
        f = f if f.is_absolute() else out / f
        k = srcs.setdefault(f, len(srcs))
        a2, b2 = max(0.0, a - pad), b + pad
        filt.append(f"[{k}:a]atrim={a2}:{b2},asetpts=PTS-STARTPTS,aresample=44100,aformat=channel_layouts=mono[c{i}];")
        parts.append(f"[c{i}]")
        starts.append(t / c["tempo"])
        t += b2 - a2
        ends.append(t / c["tempo"])
        if g > 0:
            filt.append(f"anullsrc=r=44100:cl=mono,atrim=duration={g}[g{i}];")
            parts.append(f"[g{i}]")
            t += g
    wav = build / "narration_tight.wav"
    args = []
    for f in srcs:
        args += ["-i", str(f)]
    B.run([*args, "-filter_complex",
           "".join(filt) + "".join(parts) + f"concat=n={len(parts)}:v=0:a=1,atempo={c['tempo']}[a]",
           "-map", "[a]", str(wav)])
    return wav, starts, ends


B.make_narration = make_narration

_orig_sfx = B.make_sfx


def make_sfx(build):
    out = _orig_sfx(build)
    p = build / "sfx_thud.wav"
    B.run(["-f", "lavfi", "-i", "aevalsrc='0.9*sin(2*PI*95*t)*exp(-28*t)+0.25*sin(2*PI*190*t)*exp(-40*t)':d=0.3:s=44100",
           "-ac", "2", str(p)])
    out["thud"] = p
    p = build / "sfx_scratch.wav"   # a short pen stroke on paper
    B.run(["-f", "lavfi", "-i", "anoisesrc=d=0.35:c=white:a=0.35:r=44100", "-af",
           "highpass=f=2500,lowpass=f=7000,afade=t=in:d=0.05,afade=t=out:st=0.2:d=0.15,volume=0.7", "-ac", "2", str(p)])
    out["scratch"] = p
    return out


B.make_sfx = make_sfx


# ------------------------------------------------------------------------------------------- video segments
def screen_png(inner: str, png: Path) -> Path:
    """Opaque 1080x1920 layer: dark phone UI inside SCREEN_BOX (it shows through the keyed green)."""
    x0, y0, x1, y1 = SCREEN_BOX
    html = (f"<div style='position:absolute;inset:0;background:#0E1628'></div>"
            f"<div style='position:absolute;left:{x0 - 6}px;top:{y0 - 6}px;width:{x1 - x0 + 12}px;height:{y1 - y0 + 12}px;"
            "background:radial-gradient(120% 80% at 50% 35%, #22355E 0%, #142242 55%, #0C1630 100%);"
            "display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;color:#F2EAD3'>"
            f"{inner}</div>")
    return B.render(html, png)


def seg_gs(src, p, dur, overlays, outp: Path):
    z0 = p.get("z0", 1.0)
    z1 = p.get("z1", z0)
    n = max(1, int(round(p.get("zt", 0.7) * 30)))
    ease = f"(on/{n})*(on/{n})*(3-2*on/{n})"
    zexpr = f"if(lt(on,{n}),{z0}+({z1}-{z0})*{ease},{z1})"
    args = ["-ss", str(p.get("ss", 0)), "-t", f"{dur + 0.3:.3f}", "-i", str(src),
            "-loop", "1", "-framerate", "30", "-t", f"{dur + 0.3:.3f}", "-i", str(p["screen"])]
    for png, _, _ in overlays:
        args += ["-loop", "1", "-framerate", "30", "-t", f"{dur + 0.2:.3f}", "-i", str(png)]
    x0, y0, x1, y1 = SCREEN_BOX
    bx, by, bw, bh = x0 - 14, y0 - 14, x1 - x0 + 28, y1 - y0 + 28
    # key ONLY inside the screen box (so the wood is never touched), lay that over our screen layer
    fc = ("[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=30,setsar=1,split[full][vb];"
          f"[vb]crop={bw}:{bh}:{bx}:{by},format=rgba,chromakey=0xAFE854:0.13:0.06,despill=type=green[fg];"
          f"[1:v]crop={bw}:{bh}:{bx}:{by},format=rgba[sc];"
          f"[sc][fg]overlay=0:0:shortest=1[box];[full][box]overlay={bx}:{by}:shortest=1,"
          "format=yuv420p,scale=1620:2880:flags=lanczos,"
          f"zoompan=z='{zexpr}':x='max(0,min(iw-iw/zoom,iw*{PHONE_CX}-iw/zoom/2))':"
          f"y='max(0,min(ih-ih/zoom,ih*{PHONE_CY}-ih/zoom/2))':d=1:s=1080x1920:fps=30,setsar=1,"
          f"eq=brightness=-0.02:saturation=0.92,trim=duration={dur},setpts=PTS-STARTPTS")
    if p.get("dark"):
        fc += f",colorchannelmixer=rr={p['dark']}:gg={p['dark']}:bb={p['dark']}"
    fc += "[b0];"
    for j, (_, t0, t1) in enumerate(overlays):
        fc += f"[{j + 2}:v]format=rgba[o{j}];[b{j}][o{j}]overlay=0:0:enable='between(t,{t0:.3f},{t1:.3f})'[b{j + 1}];"
    fc += f"[b{len(overlays)}]scale=out_range=tv,format=yuv420p[v]"
    B.run([*args, "-filter_complex", fc, "-map", "[v]", "-t", f"{dur:.3f}", "-r", "30", "-an",
           "-c:v", "libx264", "-preset", "medium", "-crf", "17", "-color_range", "tv", "-colorspace", "bt709",
           "-color_primaries", "bt709", "-color_trc", "bt709", str(outp)])


def seg_vid2(src, p, dur, overlays, outp: Path):
    """Video with optional freeze (pen stops) and slow push-in (z0 -> z1 over the whole segment)."""
    args = ["-ss", str(p.get("ss", 0)), "-t", f"{dur + 0.3:.3f}", "-i", str(src)]
    for png, _, _ in overlays:
        args += ["-loop", "1", "-framerate", "30", "-t", f"{dur + 0.2:.3f}", "-i", str(png)]
    base = "[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=30,setsar=1"
    if p.get("freeze") is not None:
        base += f",trim=duration={p['freeze']},setpts=PTS-STARTPTS,tpad=stop_mode=clone:stop_duration={dur + 0.5}"
    z0, z1 = p.get("z0", 1.0), p.get("z1", 1.0)
    if z0 != 1.0 or z1 != 1.0:
        n = int(round(dur * 30)) + 2
        fx, fy = p.get("fx", 0.5), p.get("fy", 0.5)
        base += (f",scale=1620:2880:flags=lanczos,zoompan=z='{z0}+({z1}-{z0})*on/{n}':"
                 f"x='(iw-iw/zoom)*{fx}':y='(ih-ih/zoom)*{fy}':d=1:s=1080x1920:fps=30,setsar=1")
    base += ",eq=brightness=-0.03:saturation=0.9"
    if p.get("blur"):
        base += f",gblur=sigma={p['blur']}"
    if p.get("dark"):
        base += f",colorchannelmixer=rr={p['dark']}:gg={p['dark']}:bb={p['dark']}"
    base += f",trim=duration={dur},setpts=PTS-STARTPTS[b0];"
    fc = base
    for j, (_, t0, t1) in enumerate(overlays):
        fc += f"[{j + 1}:v]format=rgba[o{j}];[b{j}][o{j}]overlay=0:0:enable='between(t,{t0:.3f},{t1:.3f})'[b{j + 1}];"
    fc += f"[b{len(overlays)}]scale=out_range=tv,format=yuv420p[v]"
    B.run([*args, "-filter_complex", fc, "-map", "[v]", "-t", f"{dur:.3f}", "-r", "30", "-an",
           "-c:v", "libx264", "-preset", "medium", "-crf", "17", "-color_range", "tv", "-colorspace", "bt709",
           "-color_primaries", "bt709", "-color_trc", "bt709", str(outp)])


_orig_seg = B.seg_video


def seg_video(kind, src, p, dur, overlays, outp):
    if kind == "gs":
        return seg_gs(src, p, dur, overlays, outp)
    if kind == "vid2":
        return seg_vid2(src, p, dur, overlays, outp)
    return _orig_seg(kind, src, p, dur, overlays, outp)


B.seg_video = seg_video

EXTRA_CSS = """
.top { position: absolute; left: 0; right: 0; text-align: center; color: #FFF8EA; font-weight: 900; line-height: 1.3;
  text-shadow: 0 4px 18px rgba(0,0,0,.85), 0 0 3px rgba(0,0,0,.9); }
.band { padding: 40px 20px; background: linear-gradient(180deg, rgba(10,16,30,0) 0%, rgba(10,16,30,.62) 25%,
  rgba(10,16,30,.62) 75%, rgba(10,16,30,0) 100%); }
.paper { position: absolute; right: 150px; left: 150px; background: #F4EEDC; color: #1B2A4A; border-radius: 26px;
  padding: 40px 56px; box-shadow: 0 30px 80px rgba(0,0,0,.5); }
.paper .ln { font-size: 66px; font-weight: 800; line-height: 1.75; border-bottom: 2px solid rgba(27,42,74,.12); position: relative; }
.paper .ln.off { opacity: .28; }
.paper .ln.hi { color: #9A6E1B; }
.paper .strike { position: absolute; right: 0; top: 50%; height: 10px; border-radius: 5px; background: #C99A3C;
  box-shadow: 0 2px 6px rgba(0,0,0,.25); }
"""
B.BASE_CSS += EXTRA_CSS


# ------------------------------------------------------------------------------------------- D017
def hook017(top: str, bottom: str) -> str:
    return (f"<div class='top band' style='top:150px;font-size:96px'>{top}</div>"
            f"<div class='top band' style='top:1560px;font-size:100px'>{bottom}</div>")


def cfg_d017(x=None, fallback=False, preview=False, silent_number=False):
    out = W / "reel_d017"
    b = out / "_build"
    b.mkdir(parents=True, exist_ok=True)
    fixed = "narration_fixed_take1.mp3"
    if fallback:
        name = "peleh_D017_fallback_kamtar_az_10_comment.mp4"
        head = [(17.12, 19.82, fixed)]
        head_gaps = [0.3]
        screen = screen_png("<div style='font-size:44px;font-weight:700;opacity:.75'>دیروز پرسیدم</div>"
                            "<div style='font-size:120px;font-weight:900;color:#F0B847;line-height:1.25'>چند<br>بار؟</div>",
                            b / "screen_hook.png")
        hook = hook017("دیروز پرسیدم:", "<g>نصفش</g> اینه:")
        n_head = 1
    else:
        num_file = None
        if preview and x == 20:
            num_file, ab = out / "vars_preview_take1.mp3", (0.0, 0.79)
        elif not silent_number:
            f = out / "num" / f"x_{x}.mp3"
            if not f.exists():
                sys.exit(f"Missing {f}. Make a one-line ElevenLabs take («... بار.») or use --silent-number.")
            num_file, ab = f, speech_chunks(f)[0]
            ch = speech_chunks(f)
            ab = (ch[0][0], ch[-1][1])
        head = [(0.0, 1.69, fixed)]
        head_gaps = [0.12]
        if num_file:
            head.append((ab[0], ab[1], str(num_file)))
            head_gaps.append(0.18)
        name = f"peleh_D017_PREVIEW_x{x}.mp4" if preview else f"peleh_D017_adad_x{x}.mp4"
        screen = screen_png("<div style='font-size:46px;font-weight:700;opacity:.75'>دیروز</div>"
                            f"<div style='font-size:250px;font-weight:900;color:#F0B847;line-height:1.05'>{fa(x)}</div>"
                            "<div style='font-size:70px;font-weight:800'>بار</div>", b / "screen_hook.png")
        hook = hook017(f"عدد شما دیروز: <g>{fa(x)}</g> بار.", "<g>نصفش</g> اینه:")
        n_head = len(head)
    screen_end = screen_png("<div style='font-size:52px;font-weight:700;opacity:.8'>فردا</div>"
                            "<div style='font-size:230px;font-weight:900;color:#F0B847;line-height:1.1'>؟</div>",
                            b / "screen_end.png")
    body = [(2.0, 2.89), (3.32, 4.30), (4.42, 5.88), (6.15, 7.05), (7.19, 8.65), (8.97, 12.4), (12.72, 13.96),
            (14.12, 16.67)]
    body_gaps = [0.35, 0.08, 0.25, 0.08, 0.25, 0.25, 0.06, 0.0]
    k = n_head                       # index of «نصفش اینه»
    i_hour, i_room, i_off, i_far, i_less, i_tom, i_new = k + 1, k + 2, k + 3, k + 4, k + 5, k + 6, k + 7
    box = "<div class='box' style='top:{t}px'>{h}</div>"
    return dict(
        out="reel_d017", name=name, series=None, narration=fixed, tempo=1.17,
        chunks=head + body, gaps=head_gaps + body_gaps,
        music=W / "audio" / "music.mp3", music_from=52.0, music_vol=0.42, tail=0.4, loop=0.35,
        hook=hook,
        segs=[
            (0, "gs", PHONE, dict(ss=0.4, z0=1.5, screen=screen), [hook]),
            (i_hour, "gs", PHONE, dict(ss=3.6, z0=1.5, z1=1.0, zt=0.9, screen=screen),
             [(box.format(t=1430, h="<g>یه ساعت</g>…"), None),
              (box.format(t=1430, h="یه ساعت، گوشی<br><g>اون یکی اتاق.</g>"), i_room)]),
            (i_off, "vid2", TYPING, dict(ss=1.2, z0=1.0, z1=1.06),
             [(box.format(t=760, h="خاموش؟ <g>نه.</g>"), None),
              (box.format(t=760, h="خاموش؟ نه.<br>فقط <g>دور از دست.</g>"), i_far)]),
            (i_less, "vid2", TEA, dict(ss=2.0, z0=1.0, z1=1.07, fx=0.45, fy=0.6, dark=0.85),
             [box.format(t=700, h="دم دست نباشه،<br>معمولاً <g>کمتر</g> سراغش می‌ری.")]),
            (i_tom, "gs", PHONE, dict(ss=9.5, z0=1.0, screen=screen_end),
             [(box.format(t=1420, h="فردا <g>امتحانش کن.</g>"), None),
              (box.format(t=1420, h="فردا امتحانش کن.<br>عدد تازه رو <g>زیر همین</g> بنویس.")
               + f"<div class='logo' style='top:240px'><img src='{ICON}'></div>", i_new)]),
        ],
        sfx=[("tick", 0.03, 0.35), ("pop", "c1", 0.3) if n_head > 1 else ("tick", 1.4, 0.2),
             ("whoosh", f"c{i_hour}", 0.3), ("thud", f"c{i_room}", 0.45), ("tick", f"c{i_off}", 0.3),
             ("tick", f"c{i_far}", 0.25), ("whoosh", f"c{i_less}", 0.25), ("pop", f"c{i_tom}", 0.35),
             ("tick", f"c{i_new}", 0.25)],
    )


# ------------------------------------------------------------------------------------------- D018
def still(src: Path, at: float, out: Path) -> Path:
    if not out.exists():
        B.run(["-ss", str(at), "-i", str(src), "-frames:v", "1", "-q:v", "2", str(out)])
    return out


def paper_list(state: str) -> str:
    items = ["ورزش", "کتاب", "زبان", "اون پروژه"]
    rows = ""
    for i, it in enumerate(items):
        cls = "ln" if state == "all" else ("ln hi" if i == 3 else "ln off")
        rows += f"<div class='{cls}'>· {it}</div>"
    return f"<div class='paper' style='top:560px'>{rows}</div>"


def cfg_d018():
    out = W / "reel_d018"
    b = out / "_build"
    b.mkdir(parents=True, exist_ok=True)
    bg_end = still(WRITE, 6.0, b / "write_still.jpg")
    hook = ("<div class='top band' style='top:250px;font-size:96px'>یه کار نصفه. فقط یکی.<br>"
            "اسمش رو <g>بنویس.</g></div>")
    card = ("<div class='series' style='top:430px'><span>قسمت بعد</span></div>"
            "<div class='card' style='top:560px'><h3>فردا <span style='color:#9A6E1B'>۲۰:۳۰</span></h3>"
            "<div class='r{a}'>· یکی از کارهای شما</div>"
            "<div class='r{b}'>· قدم <span style='color:#9A6E1B'>۲ دقیقه‌ای</span>ش</div></div>")
    return dict(
        out="reel_d018", name="peleh_D018_ye_kar_nesfe.mp4", series=None,
        narration="narration_take1.mp3", tempo=1.1,
        # 0 یه کار نصفه | 1 فقط یکی | 2 اسمش رو بنویس | 3 نه کل لیستت | 4 همون یکی که هر بار یادش می‌افتی
        # 5 یک کلمه کافیه | 6 فردا ساعت هشت و نیم شب، یکی از کارهای شما رو برمی‌دارم و قدم دو دقیقه‌ایش رو می‌گم
        chunks=[(0.0, 1.22), (1.41, 2.46), (2.76, 3.88), (4.03, 5.32), (5.48, 7.85), (8.12, 9.38), (9.71, 16.52)],
        gaps=[0.1, 0.12, 0.3, 0.08, 0.25, 0.25, 0.0],
        music=W / "reel_d010" / "music_leberch_reading.mp3", music_from=75.0, music_vol=0.45,
        tail=0.4, loop=0.35, hook=hook,
        segs=[
            # pen writes a line, then stops mid-line (freeze) while the hook stays on
            (0, "vid2", WRITE, dict(ss=0.0, freeze=1.25, z0=1.0, z1=1.07, fx=0.4, fy=0.75), [hook]),
            (3, "vid2", WRITE, dict(ss=7.0, blur=10, dark=0.7),
             [(paper_list("all"), None), (paper_list("one"), 4)]),
            (5, "vid2", WRITE, dict(ss=10.5, z0=1.15, z1=1.0, fx=0.45, fy=0.8),
             ["<div class='box' style='top:420px'><g>یک کلمه</g> کافیه.<small>همین زیر، تو کامنت</small></div>"]),
            (6, "photo", bg_end, dict(z0=1.06, z1=1.0, fx=0.5, fy=0.6, blur=16, dark=0.6),
             [(card.format(a=" dim", b=" dim"), None),
              (card.format(a="", b=" dim"), 2.2),
              (card.format(a="", b="") + f"<div class='logo' style='top:1250px'><img src='{ICON}'></div>", 4.3)]),
        ],
        sfx=[("scratch", 0.05, 0.35), ("scratch", 0.6, 0.3), ("tick", 1.2, 0.3), ("whoosh", "c3", 0.28),
             ("pop", "c4", 0.3), ("tick", "c5", 0.3), ("whoosh", "c6", 0.28), ("tick", "c6+2.2", 0.25),
             ("tick", "c6+4.3", 0.25)],
    )


# ------------------------------------------------------------------------------------------- D019
def cross_card(task: str, frac: float) -> str:
    strike = f"<div class='strike' style='width:{int(frac * 100)}%'></div>" if frac > 0 else ""
    return (f"<div class='paper' style='top:820px;right:200px;left:200px;text-align:center'>"
            f"<span class='ln' style='display:inline-block;border:none;font-size:84px;padding:0 18px'>{task}{strike}</span></div>")


def cfg_d019(task: str, step: str, audio: Path, preview=False, slug="ketab"):
    out = W / "reel_d019"
    b = out / "_build"
    b.mkdir(parents=True, exist_ok=True)
    fixed = "narration_fixed_take1.mp3"
    if preview and audio is None:
        audio, ch = out / "vars_preview_take1.mp3", [(1.28, 1.8), (2.13, 5.02), (5.26, 7.3)]
    else:
        ch = speech_chunks(audio)
    task_ch, step_ch = ch[0], ch[1:]
    chunks = [(0.0, 1.52), (*task_ch, str(audio)), (1.96, 3.35)] + [(*c, str(audio)) for c in step_ch] + \
             [(3.79, 5.95), (6.28, 8.76)]
    gaps = [0.1, 0.3, 0.15] + [0.08] * (len(step_ch) - 1) + [0.4, 0.06, 0.0]
    i_step0 = 3
    i_own = 3 + len(step_ch)
    hook = (f"<div class='top band' style='top:200px;font-size:92px'>کار نصفه‌ی شما: <g>«{task}»</g>.<br>"
            "قدم ۲ دقیقه‌ایش:</div>")
    bg_step = still(WRITE, 9.0, b / "write_still_b.jpg")
    title = ("<div class='big' style='top:420px'><div class='n' style='font-size:200px'>۲ دقیقه</div></div>")
    stepbox = f"<div class='box' style='top:900px;font-size:70px'>{step}</div>"
    name = f"peleh_D019_PREVIEW_{slug}.mp4" if preview else f"peleh_D019_kar_nesfe_{slug}.mp4"
    return dict(
        out="reel_d019", name=name, series=None, narration=fixed, tempo=1.06,
        chunks=chunks, gaps=gaps,
        music=W / "reel_d012" / "music_white_clouds_leberch.mp3", music_from=30.0, music_vol=0.42,
        tail=0.4, loop=0.35, hook=hook + cross_card(task, 0),
        segs=[
            (0, "vid2", WRITE, dict(ss=3.0, z0=1.0, z1=1.06, fx=0.4, fy=0.75, dark=0.85),
             [(hook + cross_card(task, 0), None),
              (hook + cross_card(task, 0.35), 1.15), (hook + cross_card(task, 0.7), 1.25),
              (hook + cross_card(task, 1.0), 1.35)]),
            (2, "vid2", TEA, dict(ss=6.0, z0=1.0, z1=1.06, fx=0.45, fy=0.6, dark=0.72),
             [(title, None), (title + stepbox, i_step0)]),
            (i_own, "vid2", WRITE, dict(ss=12.0, z0=1.1, z1=1.0, fx=0.45, fy=0.75),
             [(f"<div class='box' style='top:560px'>کار نصفه‌ی <g>خودت</g> رو هم بنویس.</div>", None),
              ("<div class='box' style='top:560px'>کار نصفه‌ی خودت رو هم بنویس.<small>هفته‌ی بعد چند تای دیگه رو جواب می‌دم.</small></div>"
               + f"<div class='logo' style='top:1150px'><img src='{ICON}'></div>", i_own + 1)]),
        ],
        sfx=[("tick", 0.03, 0.3), ("scratch", 1.15, 0.45), ("tick", "c2", 0.3), ("pop", f"c{i_step0}", 0.3),
             ("whoosh", f"c{i_own}", 0.28), ("tick", f"c{i_own + 1}", 0.25)],
    )


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("reel", choices=["d017", "d018", "d019"])
    ap.add_argument("--x", type=int)
    ap.add_argument("--fallback", action="store_true")
    ap.add_argument("--preview", action="store_true")
    ap.add_argument("--silent-number", action="store_true")
    ap.add_argument("--task")
    ap.add_argument("--step")
    ap.add_argument("--audio")
    ap.add_argument("--slug", default="ketab")
    a = ap.parse_args()
    if a.reel == "d017":
        if not a.fallback and a.x is None:
            sys.exit("--x N or --fallback")
        B.CFG["k"] = cfg_d017(a.x, a.fallback, a.preview, a.silent_number)
    elif a.reel == "d018":
        B.CFG["k"] = cfg_d018()
    else:
        if not (a.task and a.step):
            sys.exit("--task and --step are required")
        aud = Path(a.audio) if a.audio else None
        if aud and not aud.is_absolute():
            aud = W.parent / aud if (W.parent / aud).exists() else W / aud
        B.CFG["k"] = cfg_d019(a.task, a.step, aud, a.preview, a.slug)
    B.build("k")

    # cover in the page template (navy/cream/gold) with a real scene photo from this Reel's own clip
    import build_reel_cover as C
    c = B.CFG["k"]
    out = W / c["out"]
    b = out / "_build"
    stem = Path(c["name"]).stem
    if a.reel == "d017":
        ph = b / "cover_scene.jpg"
        tmp = b / "cover_scene.mp4"
        seg_gs(PHONE, dict(ss=1.0, z0=1.0, screen=b / "screen_hook.png"), 0.4, [], tmp)
        B.run(["-i", str(tmp), "-frames:v", "1", "-q:v", "2", str(ph)])
        if a.fallback:
            C.build(out / f"cover_{stem}.png", "دیروز پرسیدم", "چند بار؟", "قسمت ۲ · نصفش تو این ویدیو", ph, "50% 52%")
        else:
            C.build(out / f"cover_{stem}.png", f"عدد شما: {fa(a.x)} بار", "نصفش اینه", "قسمت ۲ · جوابش تو این ویدیو",
                    ph, "50% 52%", 120)
    elif a.reel == "d018":
        ph = still(WRITE, 1.25, b / "cover_scene.jpg")
        C.build(out / f"cover_{stem}.png", "یه کار نصفه.", "اسمش رو بنویس.", "قسمت ۱ · جوابش فردا ۲۰:۳۰", ph, "50% 62%")
    else:
        ph = still(TEA, 8.0, b / "cover_scene.jpg")
        C.build(out / f"cover_{stem}.png", f"کار نصفه: «{a.task}»", "قدم ۲ دقیقه‌ایش", "قسمت ۲ · جوابش تو این ویدیو",
                ph, "50% 62%", 116)
    print(out / f"cover_{stem}.png")
