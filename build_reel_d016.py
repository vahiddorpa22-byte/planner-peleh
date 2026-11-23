"""D016 (Mon 11 Aban 1405, 17:00) - series 1 part 1 (question): «امروز چند بار گوشی رو بی‌دلیل برداشتی؟»

Frame 0 = real scene: a hand reaches for the phone and lets it go, three times (counter dots fill 1-2-3),
hook text on screen from 0 s, narrator's first word «امروز». No app name before the end card.
Ending = «قسمت بعد» card (tomorrow 20:30: everyone's average + a simple way to halve it). No share card.

Reuses the build_reels_7_8aban.py pipeline. Usage: python build_reel_d016.py
"""
import build_reels_7_8aban as B

PH, STOCK, ICON, W = B.PH, B.STOCK, B.ICON, B.W

# extra SFX: a soft low "thud" for the phone being put down
_orig_sfx = B.make_sfx


def make_sfx(build):
    out = _orig_sfx(build)
    p = build / "sfx_thud.wav"
    B.run(["-f", "lavfi", "-i", "aevalsrc='0.9*sin(2*PI*95*t)*exp(-28*t)+0.25*sin(2*PI*190*t)*exp(-40*t)':d=0.3:s=44100",
           "-ac", "2", str(p)])
    out["thud"] = p
    return out


B.make_sfx = make_sfx

HOOK_TXT = ("<div class='hook'><div class='l1'>امروز چند بار گوشی رو</div>"
            "<div class='l2'><g>بی‌دلیل</g> برداشتی؟</div></div>")


def dots(n):
    cells = "".join(
        f"<span style='display:inline-block;width:34px;height:34px;border-radius:50%;margin:0 14px;"
        f"border:4px solid #C99A3C;background:{'#F0B847' if i < n else 'rgba(27,42,74,.6)'};'></span>"
        for i in range(3))
    return f"<div style='position:absolute;top:1170px;left:0;right:0;text-align:center;direction:ltr'>{cells}</div>"


def hook(n):
    return HOOK_TXT + dots(n)


L, I, K, J = (STOCK / "l_phone_nightstand_b.mp4", STOCK / "i_phone_bed_dark_b.mp4",
              STOCK / "k_phone_scroll_close.mp4", STOCK / "j_phone_scroll_bed.mp4")

CARD = ("<div class='series' style='top:430px'><span>قسمت بعد</span></div>"
        "<div class='card' style='top:560px'><h3>فردا <span style='color:#9A6E1B'>۲۰:۳۰</span></h3>"
        "<div class='r{a}'>· میانگین عدد همه</div>"
        "<div class='r{b}'>· یه راه ساده برای <span style='color:#9A6E1B'>نصفش</span></div></div>")

B.CFG["d016"] = dict(
    out="reel_d016", name="peleh_D016_gooshi_bidalil.mp4", series=None,
    narration="narration_take1.mp3", tempo=1.1,
    # 0 امروز چند بار گوشی رو بی‌دلیل برداشتی؟ | 1 نه برای پیام | 2 نه برای کار | 3 فقط… | 4 برداشتی
    # 5 عددت رو بنویس | 6 فردا ساعت هشت و نیم شب | 7 میانگین همه رو می‌گم | 8 با یه راه ساده برای نصفش
    chunks=[(0.0, 2.53), (2.82, 3.87), (4.19, 5.33), (5.72, 6.21), (6.76, 7.48),
            (7.67, 9.02), (9.30, 11.21), (11.34, 13.10), (13.40, 15.37)],
    gaps=[0.62, 0.1, 0.22, 0.28, 0.25, 0.25, 0.06, 0.1, 0.0],
    music=W / "reel_d012" / "music_white_clouds_leberch.mp3", music_from=8.0, music_vol=0.45,
    tail=0.5, loop=0.5,
    hook=HOOK_TXT,
    segs=[
        # three pick-ups: reach (L) -> let go (I), counter dots 1-2-3
        (0, "video", L, dict(ss=1.45), [hook(1)]),
        ("t0.52", "video", I, dict(ss=5.95), [hook(1)]),
        ("t1.00", "video", L, dict(ss=2.05), [hook(2)]),
        ("t1.50", "video", I, dict(ss=6.15), [hook(2)]),
        ("t1.98", "video", K, dict(ss=0.6), [hook(3)]),
        ("t2.48", "video", I, dict(ss=6.45), [hook(3)]),
        (1, "video", K, dict(ss=3.2),
         [("<div class='box'>نه برای <g>پیام</g>.</div>", None),
          ("<div class='box'>نه برای پیام.<br>نه برای <g>کار</g>.</div>", 2)]),
        (3, "video", L, dict(ss=2.3),
         [("<div class='box' style='top:1000px'>فقط…</div>", None),
          ("<div class='box' style='top:1000px'>فقط… <g>برداشتی.</g></div>", 4)]),
        (5, "photo", PH / "phone_bed_i92b_w.jpg", dict(z0=1.0, z1=1.06, fx=0.5, fy=0.6, dark=0.85),
         ["<div class='box' style='top:700px'>عددت رو <g>بنویس.</g>"
          "<small>فقط عدد.</small></div>"]),
        (6, "photo", PH / "phone_nightstand_l06_w.jpg", dict(z0=1.06, z1=1.0, fx=0.4, fy=0.5, blur=14, dark=0.6),
         [(CARD.format(a=" dim", b=" dim"), None),
          (CARD.format(a="", b=" dim"), 7),
          (CARD.format(a="", b="") + "<div class='logo' style='top:1250px'><img src='" + ICON + "'></div>", 8)]),
    ],
    sfx=[("tick", 0.03, 0.35), ("thud", 0.55, 0.45), ("tick", 1.02, 0.35), ("thud", 1.53, 0.45),
         ("tick", 2.0, 0.35), ("thud", 2.5, 0.5), ("whoosh", "c1", 0.25), ("tick", "c4", 0.3),
         ("pop", "c5", 0.35), ("whoosh", "c6", 0.28), ("tick", "c7", 0.25), ("tick", "c8", 0.25)],
)

if __name__ == "__main__":
    B.build("d016")
