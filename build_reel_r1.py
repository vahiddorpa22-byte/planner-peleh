"""Reel R1 «هر مربع، یه کتابه» (Sun 17 Aban 1405, 17:00) — data-viz motion Reel, 1080x1920, 30 fps.

Look: a 30x22 grid = 660 small squares on navy; 1 square = 1 book (one book a month from 25 to 80 = 55 x 12 = 660).
Rows fill right-to-left (RTL). Weekend columns = the 8 «weekend days» of a 30-day month (8/30 of the squares ~ 176,
shown as «حدود ۱۷۰», برآورد). Persian text = Edge-headless sprites (Vazirmatn); grid, counter, glow = numpy/Pillow;
one real footage shot (stock/e_night_reading_bed.mp4); Pixabay piano bed + synthesised SFX; ffmpeg from imageio-ffmpeg.

Usage
  python build_reel_r1.py                         -> reel_r1_17aban/r1_visual_nomix.mp4 (music + SFX, default timing)
  python build_reel_r1.py --narration PATH.mp3    -> beats re-timed to the 8 spoken lines (silencedetect),
                                                     mixed at -14 LUFS, exports peleh_R1_har_moraba.mp4 + _upload.mp4
  options: --lines "0.1,2.9,7.6,13.2,19.0,24.1,30.2,35.4"  manual line starts (s, narration time) if detection fails
           --noise -35  --mind 0.22   silencedetect threshold (dB) / min silence (s)
           --preview S  render only the first S seconds (quick look)
           --detect-only  with --narration: only print the speech parts and the 8 chosen lines
"""
import argparse
import hashlib
import json
import math
import re
import subprocess
import sys
from pathlib import Path

import imageio_ffmpeg
import numpy as np
from PIL import Image, ImageFilter

W = Path(__file__).resolve().parent
OUT = W / "reel_r1_17aban"
BUILD = OUT / "_build"
FONT = (W / "app_ref" / "Vazirmatn-Variable.woff2").as_uri()
ICON = W / "app_ref" / "icon-512.png"
EDGE = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
FF = imageio_ffmpeg.get_ffmpeg_exe()
FOOTAGE = W / "stock" / "e_night_reading_bed.mp4"
# Pixabay Music: «White Clouds (Calm Piano)» by leberch, Pixabay Content License
# https://pixabay.com/music/modern-classical-white-clouds-calm-piano-615220/
MUSIC = W / "reel_d012" / "music_white_clouds_leberch.mp3"
MUSIC_FROM = 0.0
FPS, SR, WD, HT = 30, 48000, 1080, 1920

NAVY = np.array([27, 42, 74], float)
UNLIT = np.array([44, 61, 99], float)
GOLD = np.array([226, 180, 87], float)
FLASH = np.array([255, 233, 172], float)

# ------------------------------------------------------------------------------------ timing config
# start = seconds on the final timeline. Re-timed automatically from the narration with --narration.
BEATS = [
    dict(key="hook", start=0.0),      # «هر مربع، یه کتابه.»
    dict(key="month", start=3.0),     # «اگه روزی پونزده دقیقه…»
    dict(key="life", start=8.0),      # «از بیست‌وپنج تا هشتاد سالگی؟ ششصد و شصت تا»
    dict(key="weekend", start=14.0),  # «اگه فقط آخر هفته‌ها…»
    dict(key="never", start=20.0),    # «و اگه هیچ‌وقت شروع نکنی… صفر»
    dict(key="diff", start=25.0),     # «فرقِ ششصد و شصت و صفر…»
    dict(key="night", start=31.0),    # «خبر خوب؟…»  (footage)
    dict(key="cta", start=36.0),      # «سنت رو کامنت کن…»
]
END = 40.5
DEFAULT_STARTS = [b["start"] for b in BEATS]
DEFAULT_END = END

# ------------------------------------------------------------------------------------ grid geometry
COLS, ROWS, CELL, SQ = 30, 22, 29, 23
N = COLS * ROWS  # 660
GW, GH = COLS * CELL - (CELL - SQ), ROWS * CELL - (CELL - SQ)
GX, GY = (WD - GW) // 2, 700
GCX, GCY = GX + GW / 2, GY + GH / 2
IDX = np.arange(N)
ROW = IDX // COLS
KR = IDX % COLS                     # column counted from the right (RTL fill order)
WEEKEND = np.isin(KR, [5, 6, 12, 13, 19, 20, 26, 27])  # Thu/Fri of each week in a 30-day month -> 176 squares
RNG = np.random.default_rng(17)
RAND_OFF = RNG.random(N)

_m = np.zeros((CELL, CELL))
_yy, _xx = np.mgrid[0:CELL, 0:CELL]
_r = 4.5
_dx = np.maximum(np.maximum(_r - _xx, _xx - (SQ - 1 - _r)), 0)
_dy = np.maximum(np.maximum(_r - _yy, _yy - (SQ - 1 - _r)), 0)
_m = np.clip(_r + 0.5 - np.sqrt(_dx ** 2 + _dy ** 2), 0, 1) * ((_xx < SQ) & (_yy < SQ))
CELLMASK = np.tile(_m, (ROWS, COLS))[:GH, :GW]


def fa(n) -> str:
    return str(int(n)).translate(str.maketrans("0123456789", "۰۱۲۳۴۵۶۷۸۹"))


def ss(x):
    x = np.clip(x, 0, 1)
    return x * x * (3 - 2 * x)


def ease(x):
    x = min(max(x, 0.0), 1.0)
    return 1 - (1 - x) ** 3


def run(args, capture=False):
    r = subprocess.run([FF, "-hide_banner", "-y", *args], check=True, capture_output=True, text=True,
                       encoding="utf-8", errors="replace")
    return r.stderr if capture else None


# ------------------------------------------------------------------------------------ text sprites
CSS = f"""
@font-face {{ font-family: V; src: url('{FONT}') format('woff2'); font-weight: 100 900; }}
html, body {{ margin:0; width:1080px; height:1920px; background:transparent; }}
body {{ font-family:V; direction:rtl; position:relative; overflow:hidden; }}
.c {{ position:absolute; left:40px; right:40px; text-align:center; color:#F2EAD3; font-weight:800; line-height:1.3;
     text-shadow:0 4px 22px rgba(8,14,28,.75); white-space:nowrap; }}
g {{ color:#E2B457; }}
.band {{ position:absolute; left:0; right:0; }}
"""


def edge_png(html: str) -> Image.Image:
    key = hashlib.md5((CSS + html).encode("utf-8")).hexdigest()[:16]
    png = BUILD / "sprites" / f"{key}.png"
    if not png.exists():
        png.parent.mkdir(parents=True, exist_ok=True)
        src = png.with_suffix(".html")
        src.write_text(f"<!doctype html><meta charset='utf-8'><style>{CSS}</style>{html}", encoding="utf-8")
        subprocess.run([EDGE, "--headless=new", "--disable-gpu", "--hide-scrollbars",
                        "--default-background-color=00000000", "--window-size=1080,1920",
                        "--virtual-time-budget=3000", f"--screenshot={png}", src.as_uri()],
                       check=True, capture_output=True)
        src.unlink()
    return Image.open(png).convert("RGBA")


class Sprite:
    def __init__(self, html):
        im = edge_png(html)
        bb = im.getchannel("A").getbbox()
        self.im = im.crop(bb)
        self.x, self.y = bb[0], bb[1]


def c(top, size, inner, weight=800, extra=""):
    return f"<div class='c' style='top:{top}px;font-size:{size}px;font-weight:{weight};{extra}'>{inner}</div>"


TEXTS = {
    "hook": c(300, 104, "هر مربع، <g>یه کتابه.</g>", 900),
    "month_a": c(290, 86, "روزی ۱۵ دقیقه"),
    "month_b": c(420, 86, "<g>&rlm;≈ ماهی یه کتاب</g>"),
    "life": c(330, 80, "از ۲۵ تا ۸۰ سالگی"),
    "age25": "<div class='c' style='top:640px;left:auto;right:108px;font-size:34px;font-weight:600;color:#B9AF97'>۲۵ سالگی</div>",
    "age80": "<div class='c' style='top:1342px;right:auto;left:108px;font-size:34px;font-weight:600;color:#B9AF97'>۸۰ سالگی</div>",
    "weekend": c(330, 86, "فقط <g>آخر هفته‌ها</g>"),
    "never": c(330, 86, "اگه <g>هیچ‌وقت</g> شروع نکنی"),
    "diff_a": c(280, 80, "فرقِ ۶۶۰ و صفر:"),
    "diff_b": c(400, 104, "<g>روزی ۱۵ دقیقه</g>", 900),
    "l660": "<div class='c' style='top:1190px;left:594px;right:80px;font-size:64px;font-weight:900;color:#E2B457'>۶۶۰ <span style='font-size:40px;color:#F2EAD3;font-weight:700'>کتاب</span></div>",
    "l0": "<div class='c' style='top:1190px;left:80px;right:594px;font-size:64px;font-weight:900;color:#8C93A6'>۰ <span style='font-size:40px;font-weight:700'>کتاب</span></div>",
    "night_band": "<div class='band' style='top:200px;height:620px;background:linear-gradient(180deg,rgba(10,16,30,0),rgba(10,16,30,.62) 25%,rgba(10,16,30,.62) 75%,rgba(10,16,30,0))'></div>",
    "night_a": c(330, 80, "خبر خوب:"),
    "night_b": c(450, 92, "<g>از امشب هم دیر نیست</g>", 900),
    "cta_a": c(290, 84, "سنت رو کامنت کن"),
    "cta_b": c(415, 84, "<g>&rlm;← عددت رو می‌گم</g>"),
    "peleh": "<div class='c' style='top:1488px;font-size:36px;font-weight:700;color:#C2A066'>پله</div>",
    "unit": "<div class='c' style='top:800px;font-size:60px;font-weight:700'>کتاب</div>",
    "approx": "<div class='c' style='top:800px;font-size:50px;font-weight:600;color:#B9AF97'>حدود</div>",
}
DIGIT_HTML = "<div class='c' style='top:700px;font-size:150px;font-weight:900;color:#E2B457'>{}</div>"


def load_sprites():
    S = {k: Sprite(v) for k, v in TEXTS.items()}
    digits = [edge_png(DIGIT_HTML.format(fa(d))) for d in range(10)]
    # bbox of the solid glyph only (alpha > 160), so the soft text-shadow doesn't widen the spacing
    boxes = [d.getchannel("A").point(lambda v: 255 if v > 160 else 0).getbbox() for d in digits]
    boxes = [(b[0] - 4, b[1] - 30, b[2] + 4, b[3] + 30) for b in boxes]
    top = min(b[1] for b in boxes)
    bot = max(b[3] for b in boxes)
    adv = max(b[2] - b[0] for b in boxes) + 6
    D = []
    for d, b in zip(digits, boxes):
        adv = b[2] - b[0] + 10
        cell = Image.new("RGBA", (adv, bot - top), (0, 0, 0, 0))
        g = d.crop((b[0], top, b[2], bot))
        cell.paste(g, ((adv - g.width) // 2, 0))
        D.append(cell)
    # app icon in a rounded navy box with a thin gold border (as on the cover template)
    from PIL import ImageDraw
    box = Image.new("RGBA", (118, 118), (0, 0, 0, 0))
    ImageDraw.Draw(box).rounded_rectangle((1, 1, 116, 116), 28, fill=(30, 46, 80, 255),
                                          outline=(201, 154, 60, 150), width=2)
    ic = Image.open(ICON).convert("RGBA").resize((96, 96), Image.LANCZOS)
    box.alpha_composite(ic, (11, 11))
    return S, D, box


# ------------------------------------------------------------------------------------ scene logic
def beat_at(t, beats):
    i = 0
    for k, b in enumerate(beats):
        if t >= b["start"]:
            i = k
    s0 = beats[i]["start"]
    s1 = beats[i + 1]["start"] if i + 1 < len(beats) else END
    return i, beats[i]["key"], t - s0, s1 - s0


def on_times(beats):
    """Per-square light-up times for each lighting phase (absolute seconds)."""
    d = {b["key"]: (b["start"], (beats[i + 1]["start"] if i + 1 < len(beats) else END) - b["start"])
         for i, b in enumerate(beats)}
    T = {}
    b2, d2 = d["month"]
    t = np.full(N, np.inf)
    t[0] = 0.0
    k = np.arange(1, 12)
    t[1:12] = b2 + 0.05 + k * (0.42 * d2 / 11)
    t[12:120] = b2 + 0.47 * d2 + np.arange(108) / 107 * 0.46 * d2
    b3, d3 = d["life"]
    t[120:] = b3 + 0.03 * d3 + np.arange(540) / 539 * 0.70 * d3
    T["on"] = t
    b4, d4 = d["weekend"]
    T["off_wk"] = b4 + 0.06 * d4 + (KR / 29) * 0.48 * d4 + ROW * 0.004
    b5, d5 = d["never"]
    T["off_all"] = b5 + 0.06 * d5 + RAND_OFF * 0.48 * d5
    b6, d6 = d["diff"]
    T["on2"] = b6 + 0.24 * d6 + IDX / (N - 1) * 0.30 * d6
    b8, d8 = d["cta"]
    T["cta_sq"] = b8 + 0.25
    T["d"] = d
    return T


def lit_from(t, ton, fade=0.12):
    x = (t - ton) / fade
    lit = ss(x)
    fl = np.where(t >= ton, np.exp(-np.maximum(t - ton, 0) / 0.28), 0.0)
    return lit, fl


def scene(t, beats, T):
    i, key, s, d = beat_at(t, beats)
    u = s / d
    S = dict(grids=[], hero=None, texts=[], counter=None, icon=0.0)
    grid_a = 1.0

    def txt(name, at=0.0, until=None, fin=0.28, keep_end=False):
        st = at * d if at < 1.5 else at
        a = ease((s - st) / fin) if fin > 0 else (1.0 if s >= st else 0.0)
        dy = (1 - a) * 26
        end = d if until is None else until * d
        if not keep_end:
            a *= 1 - ss((s - (end - 0.2)) / 0.2)
        if a > 0.002:
            S["texts"].append((name, a, dy))

    on = T["on"]
    if key == "hook":
        lit, fl = lit_from(t, on)
        S["grids"].append((lit, fl * 0, GCX, GCY, 1.0, 1.0))
        S["hero"] = (0, 1.0 + 0.9 * (1 - ease(s / 0.9)), 1.0 + 0.6 * (1 - ease(s / 1.2)) + 0.25 * math.sin(s * 3.2) ** 2)
        if s < 0.0001 or True:
            S["texts"].append(("hook", 1 - ss((s - (d - 0.2)) / 0.2), 0))
    elif key == "month":
        lit, fl = lit_from(t, on)
        S["grids"].append((lit, fl, GCX, GCY, 1.0, 1.0))
        txt("month_a", 0.0)
        txt("month_b", 0.12)
    elif key == "life":
        lit, fl = lit_from(t, on)
        S["grids"].append((lit, fl, GCX, GCY, 1.0, 1.0))
        txt("life", 0.0)
        txt("age25", 0.0, fin=0.4, keep_end=True)
        txt("age80", 0.05, fin=0.4, keep_end=True)
        S["counter"] = (int((t >= on).sum()), ease(s / 0.3), False)
    elif key == "weekend":
        off = ss((t - T["off_wk"]) / 0.25)
        lit = np.where(WEEKEND, 1.0, 1 - off)
        S["grids"].append((lit, np.zeros(N), GCX, GCY, 1.0, 1.0))
        txt("weekend", 0.0)
        S["texts"] += [("age25", 1.0, 0), ("age80", 1.0, 0)]
        v = 660 - ease((u - 0.06) / 0.55) * (660 - 170)
        S["counter"] = (round(v / 1) if u < 0.62 else 170, 1.0, u >= 0.58)
    elif key == "never":
        off = ss((t - T["off_all"]) / 0.22)
        lit = np.where(WEEKEND, 1 - off, 0.0)
        S["grids"].append((lit, np.zeros(N), GCX, GCY, 1.0, 1.0))
        txt("never", 0.0)
        a = 1 - ss((s - (d - 0.25)) / 0.25)
        S["texts"] += [("age25", a, 0), ("age80", a, 0)]
        v = 170 * (1 - ease((u - 0.06) / 0.5))
        S["counter"] = (round(v), 1.0, u < 0.1)
    elif key == "diff":
        m = ease(u / 0.22)
        sc = 1 - 0.53 * m
        rx = GCX + (817 - GCX) * m
        lit, fl = lit_from(t, T["on2"], 0.1)
        S["grids"].append((lit, fl, rx, GCY, sc, 1.0))
        S["grids"].append((np.zeros(N), np.zeros(N), 283, GCY, 0.47, ss((u - 0.12) / 0.14)))
        txt("diff_a", 0.0)
        txt("diff_b", 0.42)
        txt("l0", 0.26)
        txt("l660", 0.56)
        S["counter"] = (0, 1 - ss(s / 0.25), False) if s < 0.25 else None
    elif key == "night":
        S["grids"].append((np.zeros(N), np.zeros(N), GCX, GCY, 1.0, 1.0))
        S["footage"] = True
        txt("night_band", 0.0, fin=0.3)
        txt("night_a", 0.08)
        txt("night_b", 0.30)
    elif key == "cta":
        sq = np.full(N, np.inf)
        sq[0] = T["cta_sq"]
        lit, fl = lit_from(t, sq)
        S["grids"].append((lit, fl * 0, GCX, GCY, 1.0, 1.0))
        if t >= T["cta_sq"]:
            ls = t - T["cta_sq"]
            S["hero"] = (0, 1.0 + 0.9 * (1 - ease(ls / 0.9)) + 0.12 * math.sin(ls * 2.6) ** 2, 1.0 + 0.6 * (1 - ease(ls / 1.2)) + 0.35 * math.sin(ls * 2.6) ** 2)
        txt("cta_a", 0.0, keep_end=True)
        txt("cta_b", 0.2, keep_end=True)
        S["icon"] = ease((s - 0.6) / 0.4)
        txt("peleh", 0.6 / d if d else 0.1, fin=0.4, keep_end=True)
    return S


# ------------------------------------------------------------------------------------ rendering
def bg_image():
    yy, xx = np.mgrid[0:HT, 0:WD]
    r = np.sqrt(((xx - WD / 2) / WD) ** 2 + ((yy - 1016) / HT) ** 2)
    v = 1.10 - 0.55 * np.clip(r, 0, 1) ** 1.6
    img = NAVY[None, None, :] * v[..., None]
    return np.clip(img, 0, 255)


def grid_rgba(lit, fl, alpha=1.0):
    col = UNLIT[None, :] * (1 - lit[:, None]) + GOLD[None, :] * lit[:, None]
    col = col * (1 - fl[:, None] * 0.8) + FLASH[None, :] * (fl[:, None] * 0.8)
    a_sq = 0.85 + 0.15 * lit
    cg = col.reshape(ROWS, COLS, 3)[:, ::-1]           # column 0 on the right
    ag = a_sq.reshape(ROWS, COLS)[:, ::-1]
    lg = lit.reshape(ROWS, COLS)[:, ::-1]
    big = np.repeat(np.repeat(cg, CELL, 0), CELL, 1)[:GH, :GW]
    am = np.repeat(np.repeat(ag, CELL, 0), CELL, 1)[:GH, :GW] * CELLMASK * alpha
    lm = np.repeat(np.repeat(lg, CELL, 0), CELL, 1)[:GH, :GW] * CELLMASK * alpha
    return big, am, lm


def paste_np(frame, rgb, a, x, y):
    h, w = a.shape
    x0, y0 = max(0, x), max(0, y)
    x1, y1 = min(WD, x + w), min(HT, y + h)
    if x1 <= x0 or y1 <= y0:
        return
    sub = frame[y0:y1, x0:x1]
    aa = a[y0 - y:y1 - y, x0 - x:x1 - x, None]
    sub[:] = sub * (1 - aa) + rgb[y0 - y:y1 - y, x0 - x:x1 - x] * aa


def add_np(frame, rgb, x, y):
    h, w = rgb.shape[:2]
    x0, y0 = max(0, x), max(0, y)
    x1, y1 = min(WD, x + w), min(HT, y + h)
    frame[y0:y1, x0:x1] += rgb[y0 - y:y1 - y, x0 - x:x1 - x]


def draw_grid(frame, lit, fl, cx, cy, sc, alpha):
    if alpha <= 0.001:
        return
    big, am, lm = grid_rgba(lit, fl, alpha)
    if abs(sc - 1) > 1e-3:
        w, h = max(2, int(GW * sc)), max(2, int(GH * sc))
        big = np.array(Image.fromarray(big.astype(np.uint8)).resize((w, h), Image.LANCZOS), float)
        am = np.array(Image.fromarray((am * 255).astype(np.uint8)).resize((w, h), Image.LANCZOS), float) / 255
        lm = np.array(Image.fromarray((lm * 255).astype(np.uint8)).resize((w, h), Image.LANCZOS), float) / 255
    h, w = am.shape
    x, y = int(round(cx - w / 2)), int(round(cy - h / 2))
    # glow from lit squares (quarter-res blur)
    if lm.max() > 0.01:
        pad = 48
        L = Image.fromarray((np.pad(lm, pad) * 255).astype(np.uint8))
        small = L.resize((L.width // 4, L.height // 4), Image.BOX).filter(ImageFilter.GaussianBlur(5))
        gl = np.array(small.resize(L.size, Image.BILINEAR), float) / 255
        add_np(frame, gl[..., None] * GOLD[None, None, :] * 0.30, x - pad, y - pad)
    paste_np(frame, big, am, x, y)


def draw_hero(frame, i, sc, glow, cx, cy, gsc):
    r, k = i // COLS, i % COLS
    x = cx - GW * gsc / 2 + (COLS - 1 - k) * CELL * gsc + SQ * gsc / 2
    y = cy - GH * gsc / 2 + r * CELL * gsc + SQ * gsc / 2
    size = int(SQ * gsc * sc)
    pad = 70
    L = Image.new("L", (size + 2 * pad, size + 2 * pad), 0)
    from PIL import ImageDraw
    ImageDraw.Draw(L).rounded_rectangle((pad, pad, pad + size, pad + size), max(3, size // 5), fill=255)
    g = np.array(L.filter(ImageFilter.GaussianBlur(16 + 10 * glow)), float) / 255
    add_np(frame, g[..., None] * GOLD[None, None, :] * (0.9 * glow), int(x - size / 2 - pad), int(y - size / 2 - pad))
    sq = np.array(L, float) / 255
    rgb = np.ones(sq.shape + (3,)) * (GOLD * 0.75 + FLASH * 0.25)
    paste_np(frame, rgb, sq, int(x - size / 2 - pad), int(y - size / 2 - pad))


def draw_sprite(frame, spr, a, dy=0.0):
    arr = np.asarray(spr.im, float)
    paste_np(frame, arr[..., :3], arr[..., 3] / 255 * a, spr.x, int(spr.y + dy))


def draw_counter(frame, S, D, val, a, approx):
    digits = [D[int(ch)] for ch in str(int(val))]
    unit = S["unit"].im
    pre = S["approx"].im if approx else None
    gap = 22
    dw = sum(d.width for d in digits)
    total = dw + gap + unit.width + ((gap + pre.width) if pre else 0)
    x = (WD - total) // 2
    cy = 1452
    # left to right: unit, number, (approx)
    ua = np.asarray(unit, float)
    paste_np(frame, ua[..., :3], ua[..., 3] / 255 * a, x, cy - unit.height // 2 + 14)
    x += unit.width + gap
    for d in digits:
        da = np.asarray(d, float)
        paste_np(frame, da[..., :3], da[..., 3] / 255 * a, x, cy - d.height // 2)
        x += d.width
    if pre:
        pa = np.asarray(pre, float)
        paste_np(frame, pa[..., :3], pa[..., 3] / 255 * a, x + gap, cy - pre.height // 2 + 14)


class Footage:
    """Night-reading shot, cropped on the hands + book, graded warm-dark, slow push-in."""

    def __init__(self, t0, t1):
        self.t0, self.dur = t0, t1 - t0
        src_ss = max(0.0, min(5.5, 13.3 - self.dur))
        self.path = BUILD / "footage_night.mp4"
        run(["-ss", f"{src_ss:.2f}", "-t", f"{self.dur + 0.5:.2f}", "-i", str(FOOTAGE), "-vf",
             "crop=1440:2560:600:600,scale=1188:2112,fps=30,eq=brightness=-0.05:saturation=0.85:gamma=0.95",
             "-an", "-c:v", "libx264", "-crf", "16", "-preset", "fast", str(self.path)])
        self.gen = imageio_ffmpeg.read_frames(str(self.path))
        meta = next(self.gen)
        self.size = meta["size"]
        self.idx, self.cur = -1, None

    def frame(self, t):
        want = int((t - self.t0) * FPS)
        while self.idx < want:
            try:
                buf = next(self.gen)
                self.cur = np.frombuffer(buf, np.uint8).reshape(self.size[1], self.size[0], 3)
            except StopIteration:
                pass
            self.idx += 1
        p = (t - self.t0) / self.dur
        z = 1.0 - 0.06 * p       # crop window shrinks -> push-in
        w, h = int(self.size[0] * z), int(self.size[1] * z)
        x0, y0 = (self.size[0] - w) // 2, (self.size[1] - h) // 2
        im = Image.fromarray(self.cur[y0:y0 + h, x0:x0 + w]).resize((WD, HT), Image.BILINEAR)
        return np.asarray(im, float)


def render_video(beats, out_mp4, preview=None):
    S, D, icon = load_sprites()
    T = on_times(beats)
    bg = bg_image()
    total = END if preview is None else min(END, preview)
    nfr = int(round(total * FPS))
    b7 = next(b["start"] for b in beats if b["key"] == "night")
    b8 = next(b["start"] for b in beats if b["key"] == "cta")
    XF = 0.35
    foot = None
    ic = np.asarray(icon, float)
    p = subprocess.Popen([FF, "-hide_banner", "-loglevel", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24",
                          "-s", f"{WD}x{HT}", "-r", str(FPS), "-i", "-", "-c:v", "libx264", "-preset", "medium",
                          "-crf", "17", "-pix_fmt", "yuv420p", "-colorspace", "bt709", "-color_primaries", "bt709",
                          "-color_trc", "bt709", str(out_mp4)], stdin=subprocess.PIPE)
    for f in range(nfr):
        t = f / FPS
        sc = scene(t, beats, T)
        fr = bg.copy()
        for g in sc["grids"]:
            draw_grid(fr, *g)
        if sc["hero"]:
            draw_hero(fr, sc["hero"][0], sc["hero"][1], sc["hero"][2], GCX, GCY, 1.0)
        # footage with cross-fades
        fa_ = 0.0
        if b7 - XF <= t < b8 + XF:
            fa_ = ss((t - (b7 - XF)) / (2 * XF)) * (1 - ss((t - (b8 - XF)) / (2 * XF)))
            if fa_ > 0:
                if foot is None:
                    foot = Footage(b7 - XF, b8 + XF)
                fr = fr * (1 - fa_) + foot.frame(t) * fa_
        if sc["counter"]:
            draw_counter(fr, S, D, *sc["counter"])
        for name, a, dy in sc["texts"]:
            draw_sprite(fr, S[name], a, dy)
        if sc["icon"] > 0:
            paste_np(fr, ic[..., :3], ic[..., 3] / 255 * sc["icon"], (WD - 118) // 2, 1360)
        p.stdin.write(np.clip(fr, 0, 255).astype(np.uint8).tobytes())
        if f % 150 == 0:
            print(f"  frame {f}/{nfr}", flush=True)
    p.stdin.close()
    p.wait()
    return T


# ------------------------------------------------------------------------------------ audio
def tone(freqs, dur, decay, amp, attack=0.002):
    t = np.arange(int(dur * SR)) / SR
    y = sum(np.sin(2 * np.pi * f * t) * (0.6 ** k) for k, f in enumerate(freqs))
    env = np.minimum(t / attack, 1) * np.exp(-t * decay)
    return y * env * amp


def sfx_bank():
    rng = np.random.default_rng(3)
    n = int(0.7 * SR)
    noise = rng.standard_normal(n)
    # soft band-passed whoosh (moving average low-pass minus heavier low-pass)
    k1, k2 = 6, 60
    lp1 = np.convolve(noise, np.ones(k1) / k1, "same")
    lp2 = np.convolve(noise, np.ones(k2) / k2, "same")
    t = np.arange(n) / SR
    wh = (lp1 - lp2) * np.sin(np.pi * t / 0.7) ** 2 * 0.22
    return {
        "tick": lambda pitch=1.0: tone([2100 * pitch, 3150 * pitch], 0.09, 70, 0.16),
        "tock": lambda pitch=1.0: tone([1100 * pitch, 1650 * pitch], 0.12, 45, 0.15),
        "chime": lambda pitch=1.0: tone([880 * pitch, 1320 * pitch, 1760 * pitch], 1.6, 3.2, 0.13, 0.004),
        "thud": lambda pitch=1.0: tone([110, 165], 0.5, 9, 0.35, 0.004),
        "whoosh": lambda pitch=1.0: wh,
    }


def sfx_events(beats, T):
    d = T["d"]
    ev = [("chime", 0.02, 1.0, 1.0)]
    on = T["on"]
    for k in range(1, 12):
        ev.append(("tick", on[k], 0.7 + 0.03 * k, 1.0 + 0.012 * k))
    for i in range(29, N, 30):           # every completed row
        ev.append(("tick", on[i], 0.55, 1.0 + 0.004 * (i // 30)))
    b4, d4 = d["weekend"]
    ev.append(("whoosh", b4 + 0.02, 0.8, 1))
    for col in range(0, 30, 3):
        if col not in (5, 6, 12, 13, 19, 20, 26, 27):
            ev.append(("tock", b4 + 0.06 * d4 + col / 29 * 0.48 * d4, 0.35, 1.0 - col * 0.008))
    b5, d5 = d["never"]
    ev.append(("thud", b5 + 0.56 * d5, 0.9, 1))
    b6, d6 = d["diff"]
    ev.append(("whoosh", b6 + 0.02, 0.8, 1))
    for i in range(59, N, 60):
        ev.append(("tick", T["on2"][i], 0.5, 1.05))
    b7, _ = d["night"]
    ev.append(("whoosh", b7 - 0.3, 0.9, 1))
    ev.append(("chime", T["cta_sq"], 1.0, 1.0))
    return ev


def read_audio(path, ss_=0.0, dur=None):
    args = [FF, "-hide_banner", "-loglevel", "error", "-ss", str(ss_)]
    if dur:
        args += ["-t", str(dur)]
    args += ["-i", str(path), "-f", "f32le", "-ac", "2", "-ar", str(SR), "-"]
    raw = subprocess.run(args, check=True, capture_output=True).stdout
    return np.frombuffer(raw, np.float32).reshape(-1, 2).astype(np.float64)


def write_wav(path, x):
    raw = path.with_suffix(".f32")
    np.clip(x, -1, 1).astype(np.float32).tofile(raw)
    run(["-loglevel", "error", "-f", "f32le", "-ar", str(SR), "-ac", "2", "-i", str(raw), "-c:a", "pcm_s16le", str(path)])
    raw.unlink()


def measure_lufs(path):
    err = run(["-i", str(path), "-af", "loudnorm=print_format=json", "-f", "null", "-"], capture=True)
    js = json.loads(err[err.rfind("{"):err.rfind("}") + 1])
    return js


def gain_to(x, target, tmp):
    write_wav(tmp, x)
    i = float(measure_lufs(tmp)["input_i"])
    return x * 10 ** ((target - i) / 20)


def loudnorm2(src, dst, target, tp=-1.5):
    js = measure_lufs(src)
    run(["-i", str(src), "-af",
         f"loudnorm=I={target}:TP={tp}:LRA=11:measured_I={js['input_i']}:measured_TP={js['input_tp']}:"
         f"measured_LRA={js['input_lra']}:measured_thresh={js['input_thresh']}:offset={js['target_offset']}:linear=true",
         "-ar", str(SR), "-c:a", "pcm_s16le", str(dst)])


def build_audio(beats, T, narration_wav=None):
    n = int(END * SR)
    mus = read_audio(MUSIC, MUSIC_FROM, END + 0.5)[:n]
    mus = np.pad(mus, ((0, n - len(mus)), (0, 0)))
    t = np.arange(n) / SR
    mus *= np.minimum(t / 0.6, 1)[:, None] * np.clip((END - t) / 1.8, 0, 1)[:, None]
    bank = sfx_bank()
    sfx = np.zeros((n, 2))
    for name, at, vol, pitch in sfx_events(beats, T):
        if not np.isfinite(at):
            continue
        y = bank[name](pitch) * vol
        a = int(at * SR)
        if a >= n:
            continue
        y = y[: n - a]
        sfx[a:a + len(y)] += y[:, None]
    if narration_wav is None:
        mus = gain_to(mus, -19.0, BUILD / "m.wav")
        mix = mus + sfx * 0.9
        write_wav(BUILD / "mix_raw.wav", mix)
        loudnorm2(BUILD / "mix_raw.wav", BUILD / "mix.wav", -16)
        return BUILD / "mix.wav", None
    sp = read_audio(narration_wav)[:n]
    sp = np.pad(sp, ((0, n - len(sp)), (0, 0)))
    sp = gain_to(sp, -16.0, BUILD / "s.wav")
    mus = gain_to(mus, -25.0, BUILD / "m.wav")
    # ducking: speech envelope (20 ms RMS) -> -10 dB under speech, attack 80 ms, release 450 ms
    blk = int(0.02 * SR)
    e = np.sqrt(np.convolve((sp ** 2).mean(1), np.ones(blk) / blk, "same"))
    active = (e > 10 ** (-42 / 20)).astype(float)
    g = np.empty_like(active)
    cur, aa, rr = 0.0, 1 / (0.08 * SR), 1 / (0.45 * SR)
    for i in range(0, n, 64):
        tgt = active[i]
        cur = min(tgt, cur + aa * 64) if tgt > cur else max(tgt, cur - rr * 64)
        g[i:i + 64] = cur
    duck = 10 ** (-10 * g / 20)
    musd = mus * duck[:, None]
    write_wav(BUILD / "music_ducked.wav", musd)
    write_wav(BUILD / "speech.wav", sp)
    mix = sp + musd + sfx * 0.6
    write_wav(BUILD / "mix_raw.wav", mix)
    loudnorm2(BUILD / "mix_raw.wav", BUILD / "mix.wav", -14, tp=-1.0)
    # report speech-over-music on the speech-active part
    act = g > 0.95
    rs = 20 * np.log10(np.sqrt((sp[act] ** 2).mean()) + 1e-9)
    rm = 20 * np.log10(np.sqrt((musd[act] ** 2).mean()) + 1e-9)
    return BUILD / "mix.wav", round(rs - rm, 1)


# ------------------------------------------------------------------------------------ narration re-time
def detect_lines(path, noise, mind):
    err = run(["-i", str(path), "-af", f"silencedetect=noise={noise}dB:d={mind}", "-f", "null", "-"], capture=True)
    dur = float(re.search(r"Duration: (\d+):(\d+):([\d.]+)", err).groups()[2]) + \
        60 * float(re.search(r"Duration: (\d+):(\d+)", err).groups()[1])
    st = [float(x) for x in re.findall(r"silence_start: ([\d.]+)", err)]
    en = [float(x) for x in re.findall(r"silence_end: ([\d.]+)", err)]
    segs, cur = [], 0.0
    for a, b in zip(st, en + [dur] * (len(st) - len(en))):
        if a > cur + 0.05:
            segs.append([cur, a])
        cur = b
    if cur < dur - 0.05:
        segs.append([cur, dur])
    segs = [s for s in segs if s[1] - s[0] > 0.12]
    if len(segs) <= 8:
        return segs, dur, segs
    # choose the 7 line breaks among the pauses: long pauses win, but a pause far from where the default
    # timing expects a line break is penalised (so a dramatic pause inside «خبر خوب؟ …» is not taken as a break)
    raw = [list(s) for s in segs]
    t0, t1 = segs[0][0], segs[-1][1]
    exp = [t0 + DEFAULT_STARTS[j] / DEFAULT_END * (t1 - t0) * 1.04 for j in range(1, 8)]
    gl = [segs[i + 1][0] - segs[i][1] for i in range(len(segs) - 1)]
    gp = [(segs[i + 1][0] + segs[i][1]) / 2 for i in range(len(segs) - 1)]
    K, LAM = len(gl), 0.06
    best = {}
    for j in range(7):
        for k in range(K):
            v = gl[k] - LAM * abs(gp[k] - exp[j])
            if j == 0:
                best[(0, k)] = (v, [k])
            else:
                prev = [best[(j - 1, q)] for q in range(k) if (j - 1, q) in best]
                if prev:
                    pv = max(prev, key=lambda x: x[0])
                    best[(j, k)] = (pv[0] + v, pv[1] + [k])
    pick = max((best[(6, k)] for k in range(K) if (6, k) in best), key=lambda x: x[0])[1]
    lines, a = [], 0
    for k in pick:
        lines.append([segs[a][0], segs[k][1]])
        a = k + 1
    lines.append([segs[a][0], segs[-1][1]])
    return lines, dur, raw


def retime(lines, nar_end):
    global END
    starts = [0.0]
    for i in range(1, 8):
        starts.append(max(starts[-1] + 1.0, lines[i] - 0.15))
    for b, s in zip(BEATS, starts):
        b["start"] = round(s, 3)
    END = round(nar_end + 1.4, 3)


# ------------------------------------------------------------------------------------ main
def mux(video, audio, out, upload=False):
    v = ["-c:v", "copy"] if not upload else ["-c:v", "libx264", "-profile:v", "high", "-level", "4.1", "-preset", "slow",
                                             "-b:v", "9M", "-maxrate", "10M", "-bufsize", "20M", "-pix_fmt", "yuv420p",
                                             "-r", "30", "-g", "60", "-colorspace", "bt709", "-color_primaries", "bt709",
                                             "-color_trc", "bt709"]
    run(["-loglevel", "error", "-i", str(video), "-i", str(audio), "-map", "0:v", "-map", "1:a", *v,
         "-c:a", "aac", "-b:a", "256k" if not upload else "192k", "-ar", "48000", "-shortest",
         "-movflags", "+faststart", str(out)])


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--narration")
    ap.add_argument("--lines")
    ap.add_argument("--noise", type=float, default=-35)
    ap.add_argument("--mind", type=float, default=0.22)
    ap.add_argument("--preview", type=float)
    ap.add_argument("--detect-only", action="store_true", help="print the detected lines and stop")
    ap.add_argument("--outdir", help="write to another folder (tests); default reel_r1_17aban")
    a = ap.parse_args()
    global OUT, BUILD
    if a.outdir:
        OUT = Path(a.outdir)
        BUILD = OUT / "_build"
    BUILD.mkdir(parents=True, exist_ok=True)
    nar = None
    info = {}
    if a.narration:
        src = Path(a.narration)
        # trim lead-in silence to 0.12 s so «هر مربع» starts on frame ~4
        segs, dur, raw = detect_lines(src, a.noise, a.mind)
        print("speech parts (narration time):", [[round(x, 2), round(y, 2)] for x, y in raw])
        print("chosen 8 lines:", [[round(x, 2), round(y, 2)] for x, y in segs])
        if a.detect_only:
            return
        lead = max(0.0, (segs[0][0] if segs else 0) - 0.12)
        nar = BUILD / "narration_trim.wav"
        run(["-loglevel", "error", "-ss", f"{lead:.3f}", "-i", str(src), "-ac", "2", "-ar", str(SR), str(nar)])
        if a.lines:
            starts = [float(x) - lead for x in a.lines.split(",")]
            if len(starts) != 8:
                sys.exit("--lines needs 8 comma-separated start times")
            nar_end = segs[-1][1] - lead
        else:
            if len(segs) < 8:
                sys.exit(f"silencedetect found only {len(segs)} speech parts: {segs}\n"
                         f"try --noise -30 or --mind 0.15, or pass --lines with 8 start times")
            starts = [s[0] - lead for s in segs]
            nar_end = segs[-1][1] - lead
        retime(starts, nar_end)
        info = dict(narration=str(src), lead_trim=round(lead, 3),
                    lines=[[round(s[0] - lead, 2), round(s[1] - lead, 2)] for s in segs])
    info.update(beats=[(b["key"], b["start"]) for b in BEATS], end=END)
    print(json.dumps(info, ensure_ascii=False, indent=1))
    vid = BUILD / "video_only.mp4"
    T = render_video(BEATS, vid, a.preview)
    if a.preview:
        print("preview:", vid)
        return
    mix, diff = build_audio(BEATS, T, nar)
    info["speech_over_music_db"] = diff
    if nar is None:
        out = OUT / "r1_visual_nomix.mp4"
        mux(vid, mix, out)
        outs = [out]
    else:
        out = OUT / "peleh_R1_har_moraba.mp4"
        up = OUT / "peleh_R1_har_moraba_upload.mp4"
        mux(vid, mix, out)
        mux(vid, mix, up, upload=True)
        outs = [out, up]
    m = measure_lufs(outs[0])
    info["final_lufs"] = m["input_i"]
    info["final_tp"] = m["input_tp"]
    (OUT / ("timing_r1.json" if nar else "timing_r1_default.json")).write_text(
        json.dumps(info, ensure_ascii=False, indent=1), encoding="utf-8")
    run(["-loglevel", "error", "-i", str(outs[0]), "-frames:v", "1", "-q:v", "2", str(OUT / "frame0.jpg")])
    sheet = OUT / ("check_sheet_r1.jpg" if nar else "check_sheet_r1_nomix.jpg")
    subprocess.run([sys.executable, str(W / "check_sheet_tool.py"), str(outs[0]), str(sheet), "1", "7"], check=True)
    print(json.dumps(info, ensure_ascii=False, indent=1))
    for o in outs:
        print("OUT", o)


if __name__ == "__main__":
    main()
