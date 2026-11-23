"""D015f (Sat 9 Aban, faceless fallback for the on-camera D015): «روز اول: ۴۰ صفحه. روز سوم: هیچی.»

Reuses the build_reels_7_8aban.py pipeline (chunk re-timing, Ken Burns, kinetic overlays, ducked music, SFX, loudnorm,
check sheets). Usage: python build_reel_d015f.py
"""
import build_reels_7_8aban as B

PH, STOCK, ICON, W = B.PH, B.STOCK, B.ICON, B.W

B.CFG["d015f"] = dict(
    out="reel_d015f", name="peleh_D015f_rooz_sevom.mp4", series=None,
    narration="narration_take1.mp3", tempo=1.1,
    # speech chunks in the raw take (silencedetect -35 dB, d=0.12)
    # 0 روز اول، چهل صفحه | 1 روز سوم؟ | 2 هیچی | 3 مشکل وقت نبود | 4 چهل صفحه زیاد بود
    # 5 به جاش، هر شب دو صفحه | 6 کم، | 7 ولی تموم‌شدنی | 8 تو روز چندم ول کردی؟ | 9 عددش رو کامنت کن
    chunks=[(0.0, 1.97), (2.37, 3.18), (3.51, 3.93), (4.31, 5.68), (5.93, 7.65),
            (7.94, 9.87), (10.17, 10.55), (10.78, 11.95), (12.25, 13.81), (14.12, 15.17)],
    gaps=[0.22, 0.12, 0.26, 0.08, 0.2, 0.12, 0.06, 0.22, 0.12, 0.0],
    music=W / "reel_d010" / "music_leberch_reading.mp3", music_from=12.0, music_vol=0.5,
    tail=0.45, loop=0.5,
    hook=("<div class='hook'><div class='l1'>روز اول: ۴۰ صفحه.</div>"
          "<div class='l2'>روز سوم: <g>هیچی.</g></div></div>"),
    segs=[
        (0, "video", STOCK / "h_desk_reading.mp4", dict(ss=7.6), ["HOOK"]),
        ("t1.0", "video", STOCK / "h_desk_reading.mp4", dict(ss=1.6), ["HOOK"]),
        (1, "photo", PH / "ribbon_33754172_w.jpg", dict(z0=1.0, z1=1.08, fx=0.45, fy=0.55, dark=0.82), ["HOOK"]),
        (3, "video", STOCK / "f_hourglass_fog.mp4", dict(ss=6.0, cx=380),
         [("<div class='box'>مشکل <g>وقت</g> نبود.</div>", None),
          ("<div class='box'>مشکل <g>وقت</g> نبود.<br><g>۴۰ صفحه</g> زیاد بود.</div>", 4)]),
        (5, "video", STOCK / "g_hands_reading_book.mp4", dict(ss=2.0),
         [("<div class='box' style='top:640px'>به جاش:</div>", None),
          ("<div class='big' style='top:620px'><div class='n'>۲ صفحه</div><div class='s'>هر شب</div></div>", 0.55)]),
        (6, "photo", PH / "darkread_404515042_w.jpg", dict(z0=1.0, z1=1.07, fx=0.5, fy=0.35),
         [("<div class='box' style='top:1000px'>کم،</div>", None),
          ("<div class='box' style='top:1000px'>کم، ولی <g>تموم‌شدنی.</g></div>", 7)]),
        (8, "photo", PH / "night_17805164.jpg", dict(z0=1.08, z1=1.0, fx=0.5, fy=0.5, dark=0.72),
         ["<div class='box' style='top:600px'>روز <g>چندم</g> ول کردی؟</div>"
          "<div class='chips' style='top:930px'><span>۱</span><span>۲</span><span>۳</span><span>۷</span></div>"
          "<div class='box' style='top:1110px;font-size:62px;padding:30px 30px'>عددش رو <g>کامنت</g> کن.</div>"
          "<div class='logo' style='top:1360px'><img src='" + ICON + "'></div>"]),
    ],
    sfx=[("page", 0.0, 0.4), ("tick", "c1", 0.3), ("whoosh", "c3", 0.28), ("tick", "c4", 0.25),
         ("page", "c5", 0.3), ("tick", "c7", 0.25), ("pop", "c8", 0.4)],
)

if __name__ == "__main__":
    B.build("d015f")
