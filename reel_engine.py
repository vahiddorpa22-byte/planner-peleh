"""Shared Reel engine (week 17-23 Aban 1405): beat-timed segments, Edge overlays, PIL-animated layers,
narration re-timing to phrase boundaries, ducked music + SFX, loudnorm, upload copy, check sheets.

Grown out of build_reels_7_8aban.py. A Reel is a config dict (see build_reel_r3_20aban.py):

  phrases : [(text, default_seconds), ...]  one entry per spoken phrase (split at the «||» marks of the script)
  segs    : [dict(at=SPEC, kind="video"|"photo", src=Path, p={...}, layers=[...]), ...]
  sfx     : [(name, SPEC, volume), ...]

Time SPECs: a number (absolute s) · "P3" (phrase 3 starts) · "P3+0.6" · "P3*0.5" (half-way through phrase 3's speech)
            · "E3" (phrase 3's speech ends).  Without narration the phrase timing comes from default_seconds;
            with --narration the take is cut at its silences, the phrase boundaries are found (longest pauses
            near the expected positions), long pauses are tightened, and every beat lands on the real speech.

Layers (in a segment):
  dict(html=..., at=SPEC|None, until=SPEC|None, fade=0.15)            static overlay state
  dict(html=..., at=SPEC, anim="pop"|"slide"|"flipx"|"wipe"|"fadeup", dur=0.4, dx=320)   animated element
"""
import json
import math
import re
import subprocess
import tempfile
from pathlib import Path

import imageio_ffmpeg
from PIL import Image

W = Path(__file__).resolve().parent
FF = imageio_ffmpeg.get_ffmpeg_exe()
EDGE = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
FPS = 30
FONT = (W / "app_ref" / "Vazirmatn-Variable.woff2").as_uri()
ICON = (W / "app_ref" / "icon-192.png").as_uri()
ICON512 = (W / "app_ref" / "icon-512.png").as_uri()


def run(args, capture=False):
    r = subprocess.run([FF, "-hide_banner", "-loglevel", "info" if capture else "error", "-y", *args],
                       check=True, capture_output=capture, text=capture, encoding="utf-8" if capture else None,
                       errors="replace" if capture else None)
    return r.stderr if capture else None


def duration(path) -> float:
    r = subprocess.run([FF, "-hide_banner", "-i", str(path)], capture_output=True, text=True, errors="replace")
    m = re.search(r"Duration: (\d+):(\d+):([\d.]+)", r.stderr)
    return int(m[1]) * 3600 + int(m[2]) * 60 + float(m[3])


# ------------------------------------------------------------------------------------------------ overlays
def render(html: str, png: Path, css: str, transparent=True) -> Path:
    with tempfile.TemporaryDirectory() as td:
        src = Path(td) / "o.html"
        src.write_text(f"<!doctype html><meta charset='utf-8'><style>{css}</style>{html}", encoding="utf-8")
        args = [EDGE, "--headless=new", "--disable-gpu", "--hide-scrollbars", f"--user-data-dir={td}\\u",
                "--window-size=1080,1920", "--virtual-time-budget=2500", f"--screenshot={png}", src.as_uri()]
        if transparent:
            args.insert(4, "--default-background-color=00000000")
        subprocess.run(args, check=True, capture_output=True)
    return png


def _ease_out_cubic(x):
    return 1 - (1 - x) ** 3


def _ease_out_back(x, s=1.6):
    x -= 1
    return 1 + (s + 1) * x ** 3 + s * x ** 2


def _ease_in_out(x):
    return 0.5 - 0.5 * math.cos(math.pi * x)


def anim_frames(png: Path, mode: str, dur: float, outdir: Path, dx=320) -> str:
    """Render an element's entrance as a PNG sequence (full 1080x1920 canvas). Returns an ffmpeg pattern."""
    im = Image.open(png).convert("RGBA")
    bbox = im.getbbox() or (0, 0, 1080, 1920)
    el = im.crop(bbox)
    cx, cy = (bbox[0] + bbox[2]) / 2, (bbox[1] + bbox[3]) / 2
    n = max(2, int(round(dur * FPS)) + 1)
    outdir.mkdir(parents=True, exist_ok=True)
    for i in range(n):
        x = i / (n - 1)
        can = Image.new("RGBA", im.size, (0, 0, 0, 0))
        a = min(1.0, x / 0.45) if mode != "wipe" else 1.0
        if mode == "pop":
            s = max(0.05, 0.55 + 0.45 * _ease_out_back(x))
            e = el.resize((max(1, int(el.width * s)), max(1, int(el.height * s))), Image.LANCZOS)
            pos = (int(cx - e.width / 2), int(cy - e.height / 2))
        elif mode == "flipx":
            s = max(0.03, _ease_out_cubic(x))
            e = el.resize((max(1, int(el.width * s)), el.height), Image.LANCZOS)
            pos = (int(cx - e.width / 2), bbox[1])
        elif mode == "slide":
            off = dx * (1 - _ease_out_cubic(x))
            e, pos = el, (int(bbox[0] + off), bbox[1])
        elif mode == "fadeup":
            off = 60 * (1 - _ease_out_cubic(x))
            e, pos = el, (bbox[0], int(bbox[1] + off))
        elif mode == "wipe":  # reveal left -> right
            wv = max(1, int(el.width * _ease_in_out(x)))
            e = el.crop((0, 0, wv, el.height))
            pos = (bbox[0], bbox[1])
        else:
            raise ValueError(mode)
        if a < 1:
            r, g, b, al = e.split()
            al = al.point(lambda v: int(v * a))
            e = Image.merge("RGBA", (r, g, b, al))
        can.paste(e, pos, e)  # clips safely at the canvas edge
        can.save(outdir / f"f_{i:03d}.png", compress_level=1)
    return str(outdir / "f_%03d.png")


# ------------------------------------------------------------------------------------------------ timing
def clean_chars(t: str) -> int:
    return len(re.sub(r"[\s|«»،.؟?!:؛↗↘*]", "", t)) or 1


def visual_timing(cfg):
    starts, ends, t = [], [], cfg.get("lead", 0.12)
    for _, d in cfg["phrases"]:
        starts.append(t)
        ends.append(t + d * 0.86)
        t += d
    return starts, ends


def detect_speech(src: Path, noise=-35, mind=0.12):
    err = run(["-i", str(src), "-af", f"silencedetect=noise={noise}dB:d={mind}", "-f", "null", "-"], capture=True)
    total = duration(src)
    sil = []
    for m in re.finditer(r"silence_start: ([\d.]+)[\s\S]*?silence_end: ([\d.]+)", err):
        sil.append((float(m[1]), float(m[2])))
    chunks, t = [], 0.0
    for a, b in sil:
        if a - t > 0.05:
            chunks.append([t, a])
        t = b
    if total - t > 0.05:
        chunks.append([t, total])
    merged = []
    for c in chunks:  # merge chunks separated by <0.09 s (breaths / plosives)
        if merged and c[0] - merged[-1][1] < 0.09:
            merged[-1][1] = c[1]
        else:
            merged.append(c)
    return [c for c in merged if c[1] - c[0] > 0.06], total


def pick_boundaries(chunks, texts):
    """Choose len(texts)-1 gaps as phrase boundaries: long pauses close to the char-proportional expected times."""
    n = len(texts)
    if n == 1:
        return []
    gaps = [(chunks[j][1], chunks[j + 1][0]) for j in range(len(chunks) - 1)]
    if len(gaps) < n - 1:
        return None
    S, E = chunks[0][0], chunks[-1][1]
    # expected phrase starts: speech time ∝ characters, plus a pause per «|» inside a phrase and per phrase cut
    pause_in, pause_cut = 0.35, 0.45
    nin = [t.count("|") for t in texts]
    w = [clean_chars(t) for t in texts]
    speech = (E - S) - pause_in * sum(nin) - pause_cut * (n - 1)
    rate = max(speech, 0.3 * (E - S)) / sum(w)
    cum, exp = S, []
    for k in range(n - 1):
        cum += w[k] * rate + nin[k] * pause_in
        exp.append(cum + pause_cut / 2)
        cum += pause_cut
    span = (E - S) / min(n, 8)

    def score(k, j):
        a, b = gaps[j]
        return min(b - a, 1.2) * 2.0 - abs((a + b) / 2 - exp[k]) / span

    NEG = -1e9
    G = len(gaps)
    best = [[NEG] * G for _ in range(n - 1)]
    prev = [[-1] * G for _ in range(n - 1)]
    for j in range(G):
        best[0][j] = score(0, j)
    for k in range(1, n - 1):
        run_best, run_arg = NEG, -1
        for j in range(G):
            if j - 1 >= 0 and best[k - 1][j - 1] > run_best:
                run_best, run_arg = best[k - 1][j - 1], j - 1
            if run_arg >= 0:
                best[k][j] = run_best + score(k, j)
                prev[k][j] = run_arg
    j = max(range(G), key=lambda x: best[n - 2][x])
    sel = []
    for k in range(n - 2, -1, -1):
        sel.append(j)
        j = prev[k][j]
    return sorted(sel)


def retime_narration(cfg, src: Path, build: Path, tempo=1.0):
    """Tighten the take and return (wav, phrase starts, phrase speech ends) on the Reel timeline."""
    chunks, total = detect_speech(src)
    texts = [t for t, _ in cfg["phrases"]]  # «|» marks inside a phrase = expected short pauses
    bnd = pick_boundaries(chunks, texts)
    if cfg.get("force_bounds"):
        bnd = list(cfg["force_bounds"])
    fallback = bnd is None
    bset = set(bnd or [])
    lead, pad = cfg.get("lead", 0.12), 0.04
    cap_phrase, cap_inner = cfg.get("gap_phrase", 0.42), cfg.get("gap_inner", 0.26)
    filt, parts = [], []
    new_t = lead
    filt.append(f"anullsrc=r=44100:cl=mono,atrim=duration={lead}[lead];")
    parts.append("[lead]")
    mapping = []  # (raw_a, raw_b, new_a)
    for j, (a, b) in enumerate(chunks):
        a2, b2 = max(0.0, a - pad), min(total, b + pad)
        filt.append(f"[0:a]atrim={a2:.3f}:{b2:.3f},asetpts=PTS-STARTPTS,aresample=44100,aformat=channel_layouts=mono[c{j}];")
        parts.append(f"[c{j}]")
        mapping.append((a2, b2, new_t))
        new_t += b2 - a2
        if j < len(chunks) - 1:
            g = chunks[j + 1][0] - b
            cap = cap_phrase if j in bset else cap_inner
            g2 = min(g, cap) - 2 * pad
            hold = cfg.get("hold_after") or {}  # {phrase index: seconds of silence after it} e.g. a reading countdown
            if j in bset and sorted(bset).index(j) in hold:
                g2 = float(hold[sorted(bset).index(j)])
            if g2 > 0.01:
                filt.append(f"anullsrc=r=44100:cl=mono,atrim=duration={g2:.3f}[g{j}];")
                parts.append(f"[g{j}]")
                new_t += g2
    wav = build / "narration_retimed.wav"
    run(["-i", str(src), "-filter_complex",
         "".join(filt) + "".join(parts) + f"concat=n={len(parts)}:v=0:a=1,atempo={tempo},"
         "loudnorm=I=-16:TP=-2:LRA=9[a]", "-map", "[a]", "-ar", "44100", str(wav)])

    def to_new(t):
        for a2, b2, na in mapping:
            if t <= b2:
                return (na + max(0.0, t - a2)) / tempo
        return (mapping[-1][2] + mapping[-1][1] - mapping[-1][0]) / tempo

    if not fallback:
        first = [0] + [j + 1 for j in sorted(bset)]
        last = [j for j in sorted(bset)] + [len(chunks) - 1]
        starts = [to_new(chunks[i][0]) for i in first]
        ends = [to_new(chunks[i][1]) for i in last]
    else:  # fewer pauses than phrases: char-proportional positions
        S, E = chunks[0][0], chunks[-1][1]
        w = [clean_chars(t) for t in texts]
        cum, starts, ends = 0, [], []
        for k, wk in enumerate(w):
            starts.append(to_new(S + (E - S) * cum / sum(w)))
            cum += wk
            ends.append(to_new(S + (E - S) * cum / sum(w)))
    info = dict(chunks=[[round(a, 3), round(b, 3)] for a, b in chunks], boundaries_after_chunk=sorted(bset),
                fallback=fallback, raw_duration=round(total, 3), tempo=tempo)
    return wav, starts, ends, info


class Timeline:
    def __init__(self, starts, ends):
        self.s, self.e = starts, ends

    def __call__(self, spec):
        if spec is None:
            return None
        if isinstance(spec, (int, float)):
            return float(spec)
        m = re.fullmatch(r"([PE])(\d+)(?:([+*-])([\d.]+))?", spec)
        if not m:
            return float(spec)
        k = int(m[2])
        base = self.s[k] if m[1] == "P" else self.e[k]
        if m[3] == "+":
            return base + float(m[4])
        if m[3] == "-":
            return base - float(m[4])
        if m[3] == "*":
            return self.s[k] + float(m[4]) * (self.e[k] - self.s[k])
        return base


# ------------------------------------------------------------------------------------------------ video
def seg_video(kind, src, p, dur, layers, outp: Path):
    """layers: list of dict(png|pattern, t0, t1, fade, seq) in segment-local seconds."""
    args = []
    up = 1.5
    if kind == "video":
        args += ["-ss", str(p.get("ss", 0)), "-t", str(dur * p.get("speed", 1.0) + 0.5), "-i", str(src)]
        z = p.get("z", 1.0)
        H = int(1920 * z * up) // 2 * 2
        cw, ch = int(1080 * up), int(1920 * up)
        fx, fy = p.get("fx", 0.5), p.get("fy", 0.5)
        frames = int(round(dur * FPS)) + 2
        z0, z1 = p.get("z0", 1.0), p.get("z1", 1.05)
        base = (f"[0:v]setpts=PTS/{p.get('speed', 1.0)},fps={FPS},"
                + ("reverse," if p.get("reverse") else "")
                + f"scale=-2:{H},crop={cw}:{ch}:(iw-{cw})*{fx}:(ih-{ch})*{fy},"
                f"zoompan=z='{z0}+({z1}-{z0})*on/{frames}':x='(iw-iw/zoom)*{p.get('zx', 0.5)}':"
                f"y='(ih-ih/zoom)*{p.get('zy', 0.5)}':d=1:s=1080x1920:fps={FPS},setsar=1,"
                f"eq=brightness={p.get('br', -0.03)}:saturation={p.get('sat', 0.88)}:contrast={p.get('con', 1.0)}")
    else:
        frames = int(round(dur * FPS)) + 2
        z0, z1 = p.get("z0", 1.0), p.get("z1", 1.08)
        fx, fy = p.get("fx", 0.5), p.get("fy", 0.5)
        args += ["-loop", "1", "-framerate", str(FPS), "-t", str(dur + 0.3), "-i", str(src)]
        base = (f"[0:v]scale=2160:3840:force_original_aspect_ratio=increase,"
                f"crop=2160:3840:(iw-2160)*{fx}:(ih-3840)*{fy},"
                f"zoompan=z='{z0}+({z1}-{z0})*on/{frames}':x='(iw-iw/zoom)*{fx}':y='(ih-ih/zoom)*{fy}':"
                f"d=1:s=1080x1920:fps={FPS},setsar=1,eq=brightness={p.get('br', -0.03)}:saturation={p.get('sat', 0.9)}")
    if p.get("blur"):
        base += f",gblur=sigma={p['blur']}"
    if p.get("dark"):
        base += f",colorchannelmixer=rr={p['dark']}:gg={p['dark']}:bb={p['dark']}"
    base += (",tpad=stop_mode=clone:stop_duration=4" if kind == "video" else "") + f",trim=duration={dur},setpts=PTS-STARTPTS"
    for L in layers:
        if L.get("seq"):
            args += ["-framerate", str(FPS), "-i", L["png"]]
        else:
            args += ["-loop", "1", "-framerate", str(FPS), "-t", str(dur + 0.3), "-i", str(L["png"])]
    fc = base + "[b0];"
    for j, L in enumerate(layers):
        t0, t1 = L["t0"], L["t1"]
        if L.get("seq"):
            pre = f"[{j + 1}:v]format=rgba,tpad=start_duration={t0:.3f}:start_mode=add:color=black@0.0,setpts=PTS-STARTPTS"
            fc += f"{pre}[o{j}];[b{j}][o{j}]overlay=0:0:eof_action=repeat:enable='between(t,{t0:.3f},{t1:.3f})'[b{j + 1}];"
        else:
            fade = f",fade=t=in:st={t0:.3f}:d={L['fade']}:alpha=1" if L.get("fade") else ""
            fc += (f"[{j + 1}:v]format=rgba{fade}[o{j}];"
                   f"[b{j}][o{j}]overlay=0:0:enable='between(t,{t0:.3f},{t1:.3f})'[b{j + 1}];")
    fc += f"[b{len(layers)}]scale=out_range=tv,format=yuv420p[v]"
    run([*args, "-filter_complex", fc, "-map", "[v]", "-t", f"{dur:.3f}", "-r", str(FPS), "-an",
         "-c:v", "libx264", "-preset", "medium", "-crf", "17", "-color_range", "tv", "-colorspace", "bt709",
         "-color_primaries", "bt709", "-color_trc", "bt709", str(outp)])


# ------------------------------------------------------------------------------------------------ audio
def make_sfx(build: Path) -> dict:
    out = {}
    specs = {
        "tick": "aevalsrc='0.6*sin(2*PI*1800*t)*exp(-60*t)':d=0.12",
        "pop": "aevalsrc='0.7*sin(2*PI*(900+600*t)*t)*exp(-25*t)':d=0.25",
        "soft": "aevalsrc='0.5*sin(2*PI*660*t)*exp(-14*t)+0.3*sin(2*PI*990*t)*exp(-18*t)':d=0.45",
        "rise": "aevalsrc='0.35*sin(2*PI*(300*t+700*t*t))*min(1\\,t*6)*exp(-1.8*t)':d=1.1",
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


def mix(video: Path, out: Path, cfg, total, events, narration_wav=None):
    """Narration (already -16 LUFS) over ducked music + SFX; final loudnorm -14 LUFS / -1.5 dBTP."""
    args = ["-i", str(video)]
    idx = 1
    if narration_wav:
        args += ["-i", str(narration_wav)]
        nidx = idx
        idx += 1
    args += ["-ss", str(cfg["music_from"]), "-i", str(cfg["music"])]
    midx = idx
    idx += 1
    for f, _, _ in events:
        args += ["-i", str(f)]
    mus_lufs = cfg.get("music_lufs", -28) if narration_wav else cfg.get("music_lufs_nomix", -20)
    fc = (f"[{midx}:a]aresample=44100,aformat=channel_layouts=stereo,atrim=duration={total},asetpts=PTS-STARTPTS,"
          f"loudnorm=I={mus_lufs}:TP=-4:LRA=8,afade=t=in:d=0.3,afade=t=out:st={max(0.1, total - 0.9)}:d=0.9[mraw];")
    if narration_wav:
        fc += (f"[{nidx}:a]aresample=44100,aformat=channel_layouts=stereo,apad=whole_dur={total},asplit=2[na][key];"
               "[mraw][key]sidechaincompress=threshold=0.02:ratio=6:attack=15:release=400[mu];")
        mixin, n = "[na][mu]", 2
    else:
        fc += "[mraw]anull[mu];"
        mixin, n = "[mu]", 1
    for j, (_, t, v) in enumerate(events):
        k = idx + j
        fc += (f"[{k}:a]aresample=44100,aformat=channel_layouts=stereo,atrim=duration=1.5,asetpts=PTS-STARTPTS,"
               f"volume={v},adelay={int(max(0, t) * 1000)}:all=1[e{j}];")
        mixin += f"[e{j}]"
        n += 1
    fc += (mixin + f"amix=inputs={n}:normalize=0:duration=first,atrim=duration={total},"
           "loudnorm=I=-14:TP=-1.5:LRA=11,aresample=44100[aout]")
    run([*args, "-filter_complex", fc, "-map", "0:v", "-map", "[aout]", "-t", f"{total}",
         "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-ar", "44100", "-movflags", "+faststart", str(out)])


def loudness(path: Path) -> dict:
    err = run(["-i", str(path), "-af", "ebur128=peak=true", "-f", "null", "-"], capture=True)
    tail = err[err.rfind("Summary:"):]
    i = re.search(r"I:\s+(-?[\d.]+) LUFS", tail)
    tp = re.search(r"Peak:\s+(-?[\d.]+) dBFS", tail)
    return dict(I=float(i[1]) if i else None, TP=float(tp[1]) if tp else None)


def upload_copy(src: Path, dst: Path, build: Path, limit_mb=3.9):
    dur = duration(src)
    kbps = int(limit_mb * 8 * 1024 / dur) - 96 - 8
    for attempt in range(4):
        scale = "scale=1080:1920" if kbps >= 1400 else "scale=720:1280"
        log = str(build / "x264pass")
        common = ["-i", str(src), "-vf", scale, "-c:v", "libx264", "-preset", "slow", "-b:v", f"{kbps}k",
                  "-maxrate", f"{int(kbps * 1.4)}k", "-bufsize", f"{kbps * 2}k", "-pix_fmt", "yuv420p", "-passlogfile", log]
        run([*common, "-pass", "1", "-an", "-f", "mp4", "NUL"])
        run([*common, "-pass", "2", "-c:a", "aac", "-b:a", "96k", "-movflags", "+faststart", str(dst)])
        mb = dst.stat().st_size / 1048576
        if mb <= limit_mb + 0.05:
            return mb
        kbps = int(kbps * 0.9)
    return dst.stat().st_size / 1048576


def sheets(final: Path, out: Path, tag=""):
    dur = duration(final)
    rows = max(1, math.ceil(dur / 8))
    run(["-i", str(final), "-vf", f"fps=1,scale=216:-2,tile=8x{rows}", "-frames:v", "1", str(out / f"check_sheet{tag}.jpg")])
    rows2 = max(1, math.ceil(dur * 2 / 10))
    run(["-i", str(final), "-vf", f"fps=2,scale=160:-2,tile=10x{rows2}", "-frames:v", "1",
         str(out / f"check_sheet_halfsec{tag}.jpg")])
    run(["-ss", "0", "-i", str(final), "-frames:v", "1", "-q:v", "2", str(out / "frame0.jpg")])


# ------------------------------------------------------------------------------------------------ build
def build(cfg, narration: Path | None = None, tempo=1.0, css="", keep_video=False):
    out = Path(cfg["out"])
    b = out / "_build"
    b.mkdir(parents=True, exist_ok=True)
    ninfo = None
    if narration:
        wav, starts, ends, ninfo = retime_narration(cfg, Path(narration), b, tempo)
    else:
        wav = None
        starts, ends = visual_timing(cfg)
    T = Timeline(starts, ends)
    body = round(ends[-1] + cfg.get("tail", 0.6), 3)
    total = round(body + cfg.get("loop", 0.0), 3)

    segs = cfg["segs"]
    bounds = [T(s["at"]) for s in segs] + [body]
    bounds[0] = 0.0
    files = []
    for i, s in enumerate(segs):
        s0, s1 = bounds[i], bounds[i + 1]
        dur = round(s1 - s0, 3)
        layers = []
        for j, L in enumerate(s.get("layers", [])):
            png = render(L["html"], b / f"ov_{i}_{j}.png", css)
            t0 = 0.0 if L.get("at") is None else max(0.0, T(L["at"]) - s0)
            t1 = dur + 1 if L.get("until") is None else T(L["until"]) - s0
            if L.get("anim"):
                pat = anim_frames(png, L["anim"], L.get("dur", 0.4), b / f"anim_{i}_{j}", L.get("dx", 320))
                layers.append(dict(png=pat, t0=t0, t1=t1, seq=True))
            else:
                layers.append(dict(png=png, t0=t0, t1=t1, fade=L.get("fade")))
        f = b / f"seg_{i}.mp4"
        seg_video(s["kind"], s["src"], s.get("p", {}), dur, layers, f)
        files.append(f)
        if i == 0:
            first_layers = [L for L in layers if not L.get("seq") and L["t0"] == 0.0]
    if cfg.get("loop", 0) > 0:
        s = segs[0]
        f = b / "seg_loop.mp4"
        seg_video(s["kind"], s["src"], s.get("p", {}), cfg["loop"],
                  [dict(png=L["png"], t0=0, t1=9) for L in first_layers], f)
        files.append(f)
    concat = b / "concat.txt"
    concat.write_text("".join(f"file '{f.as_posix()}'\n" for f in files), encoding="utf-8")
    silent = b / "video_only.mp4"
    run(["-f", "concat", "-safe", "0", "-i", str(concat), "-c", "copy", str(silent)])

    sfx = make_sfx(b)
    events = [(sfx[k], T(t), v) for k, t, v in cfg["sfx"]]
    name = cfg["name"]
    result = dict(total=total, phrase_starts=[round(x, 3) for x in starts], phrase_ends=[round(x, 3) for x in ends],
                  seg_bounds=[round(x, 3) for x in bounds], narration=str(narration) if narration else None,
                  narration_info=ninfo)
    if narration:
        final = out / f"{name}.mp4"
        mix(silent, final, cfg, total, events, wav)
        up = out / f"{name}_upload.mp4"
        result["upload_mb"] = round(upload_copy(final, up, b), 2)
        sheets(final, out)
    else:
        final = out / f"{name}_visual_nomix.mp4"
        mix(silent, final, cfg, total, events, None)
        sheets(final, out, "_visual")
    result["final"] = str(final)
    result["final_mb"] = round(final.stat().st_size / 1048576, 2)
    result["loudness"] = loudness(final)
    (b / ("timing_final.json" if narration else "timing_visual.json")).write_text(
        json.dumps(result, indent=1, ensure_ascii=False), encoding="utf-8")
    print(json.dumps(result, ensure_ascii=False, indent=1))
    return result
