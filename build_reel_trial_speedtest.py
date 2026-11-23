"""Trial «تست سرعت خوندن» · Sun 24 Aban 1405, 21:00 (~43 s). Approved by growth, Instagram and scriptwriter leads (2026-11-15).
Narration = one ElevenLabs take; the engine inserts a 30 s silent reading window after phrase 0 (cfg hold_after).

  python build_reel_trial_speedtest.py --narration reel_trial_speedtest/narration.mp3
"""
import argparse
from pathlib import Path

import reel_engine as E
from build_reel_trial_t4 import CSS as T4CSS
from build_reel_r3_20aban import GOLD, CREAM, NAVY

W = E.W
M = W / "stock" / "magnific_2026-11"
READ = 30

PARA = ("ساعت یازده شبه. گوشی دستته و انگشتت خودش بالا و پایین می‌ره. یه ویدیو، یه ویدیوی دیگه، یه ویدیوی دیگه. "
        "یهو می‌بینی یه ساعت گذشته و هیچی یادت نمونده. حالا تصور کن همون یه ساعت، یه کتاب دستت بود. "
        "نه برای اینکه باهوش‌تر به نظر بیای؛ فقط برای اینکه وقتی چراغ رو خاموش می‌کنی، یه چیزی تو ذهنت مونده باشه. "
        "یه جمله، یه آدم، یه دنیای دیگه. شاید فردا صبح هم هنوز بهش فکر کنی، وقتی تو تاکسی نشستی یا منتظر چایی هستی. "
        "لازم نیست زیاد باشه؛ فقط باید از یه جایی شروع کرد. مثلاً از همین متن. "
        "اگه تا اینجا خوندی، زیر همین ویدیو بنویس: <g>«رسیدم»</g>.")

CSS = T4CSS + f"""
.hks {{ position:absolute; top:300px; left:40px; right:40px; text-align:center; color:#FFF8EA; font-weight:900; line-height:1.25;
  text-shadow:0 4px 20px rgba(0,0,0,.9); padding:56px 0;
  background:linear-gradient(180deg,rgba(10,16,30,0) 0%,rgba(10,16,30,.66) 22%,rgba(10,16,30,.66) 78%,rgba(10,16,30,0) 100%); }}
.hks .a {{ font-size:66px; color:#E8DDC0; }} .hks .b {{ font-size:118px; }}
.para {{ position:absolute; top:470px; left:64px; right:64px; direction:rtl; text-align:justify; color:#FFF8EA; font-size:50px; font-weight:700;
  line-height:1.78; padding:44px 50px; border-radius:34px; background:rgba(12,18,34,.78); border:3px solid rgba(201,154,60,.55);
  box-shadow:0 24px 60px rgba(0,0,0,.5); }}
.para g {{ color:#F0B847; font-weight:900; }}
.cd {{ position:absolute; top:250px; left:0; right:0; text-align:center; }}
.cd span {{ display:inline-block; direction:ltr; min-width:220px; background:{GOLD}; color:{NAVY}; font-size:110px; font-weight:900;
  padding:6px 40px; border-radius:40px; box-shadow:0 14px 40px rgba(0,0,0,.5); }}
.cd span.r {{ background:#E0584A; color:#FFF8EA; }}
.big2 {{ position:absolute; top:700px; left:0; right:0; text-align:center; color:#FFF8EA; font-size:140px; font-weight:900;
  text-shadow:0 6px 24px rgba(0,0,0,.9); }}
"""
FA = "۰۱۲۳۴۵۶۷۸۹"
fa = lambda n: "".join(FA[int(c)] for c in str(n))

read_layers = [dict(html=f"<div class='para'>{PARA}</div>", at="E0+0.15", anim="fadeup", dur=0.3)]
for k in range(READ + 1):
    n = READ - k
    d = dict(html=f"<div class='cd'><span class='{'r' if n <= 5 else ''}'>⏱ {fa(n)}</span></div>", at=f"E0+{k}")
    if k < READ:
        d["until"] = f"E0+{k + 1}"
    read_layers.append(d)

CFG = dict(
    out=W / "reel_trial_speedtest", name="peleh_T_speedtest",
    music=W / "audio" / "music.mp3", music_from=20.0,
    tail=1.4, loop=0.0, lead=0.1,
    hold_after={0: READ + 0.4},
    phrases=[("یه تست کوچیک. | این متن رو بخون؛ | زمان از همین الان.", 5.0),
             ("تموم شد؟", 1.0),
             ("اگه رسیدی، تو پونزده دقیقه حدود دوازده صفحه می‌خونی.", 4.2),
             ("یعنی یه کتاب کامل، | بیست و پنج شب.", 3.0),
             ("از یک آذر، سی شب کتاب. | فالو کن که جا نمونی.", 4.2)],
    segs=[
        dict(at=0, kind="video", src=M / "m30_couple_book_phone_2368240.mp4",
             p=dict(ss=0.5, fx=0.52, fy=0.4, z0=1.0, z1=1.08, br=-0.03),
             layers=[dict(html="<div class='hks'><div class='a'>تست</div><div class='b'>این متن رو<br><g>۳۰ ثانیه‌ای</g> بخون</div></div>")]),
        dict(at="E0", kind="video", src=M / "m32_rain_night_window_3543939.mp4",
             p=dict(ss=0.0, speed=0.2, fx=0.5, fy=0.5, dark=0.6, blur=6, z0=1.0, z1=1.12), layers=read_layers),
        dict(at="P1", kind="video", src=M / "m35_girl_couch_reading_473257.mp4",
             p=dict(ss=1.0, fx=0.62, fy=0.5, dark=0.6, blur=3, z0=1.0, z1=1.06),
             layers=[dict(html="<div class='big2'>تموم شد؟</div>", at="P1", anim="pop", dur=0.3)]),
        dict(at="P2", kind="video", src=M / "m31_man_sofa_reading_177804.mp4",
             p=dict(ss=6.0, fx=0.6, fy=0.5, dark=0.55, blur=4, z0=1.0, z1=1.06),
             layers=[dict(html="<div class='eq'><span>۱۵ دقیقه ≈ <g>۱۲ صفحه</g></span></div>", at="P2+0.3", anim="pop", dur=0.3)]),
        dict(at="P3", kind="video", src=M / "m31_man_sofa_reading_177804.mp4",
             p=dict(ss=12.0, fx=0.6, fy=0.5, dark=0.5, blur=6, z0=1.04, z1=1.0),
             layers=[dict(html="<div class='yr' style='top:820px'><span>یه کتاب کامل = <g style='color:#B8862C'>۲۵ شب</g></span></div>",
                          at="P3+0.1", anim="pop", dur=0.35)]),
        dict(at="P4", kind="video", src=M / "m33_tea_fireplace_58545.mp4",
             p=dict(ss=10.0, fx=0.45, fy=0.5, dark=0.55, blur=5, z0=1.0, z1=1.05),
             layers=[dict(html=f"<div class='end'><img src='{E.ICON}'><div class='l'>چالش ۳۰ شب کتاب<br><g>از ۱ آذر</g></div></div>",
                          anim="fadeup", dur=0.35, at="P4"),
                     dict(html="<div class='end' style='top:1260px'><span class='c'>فالو کن که جا نمونی</span></div>", at="P4*0.5", anim="pop", dur=0.35)]),
    ],
    sfx=[("whoosh", "E0", 0.25)] + [("tick", f"E0+{k}", 0.25) for k in range(READ - 5, READ)]
        + [("pop", "P1", 0.4), ("pop", "P2+0.3", 0.35), ("pop", "P3+0.1", 0.4), ("whoosh", "P4", 0.25), ("soft", "P4*0.5", 0.4)],
)

if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--narration"); ap.add_argument("--tempo", type=float, default=1.0); ap.add_argument("--bounds")
    a = ap.parse_args()
    if a.bounds:
        CFG["force_bounds"] = [int(x) for x in a.bounds.split(",")]
    E.build(CFG, Path(a.narration) if a.narration else None, a.tempo, CSS)
