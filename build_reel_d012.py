"""Build the D012 Reel «پله از نزدیک ۱» — calm version (6 Aban 1405).

App footage is a faithful HTML recreation of the real Books > Challenges tab and the «نفرات برتر» sheet,
using the app's own CSS (peleh-theme.css + peleh-app.css, v2.4.2) and markup from books.js, filled with
DEMO data only (fictional names, blurred). Nothing touches the live app or any account.
Headless Edge renders screens/frames → ffmpeg animates inside a device frame and mixes audio.
"""
import re
import subprocess
from pathlib import Path

import imageio_ffmpeg

W = Path(__file__).resolve().parent
OUT = W / "reel_d012"
UI = OUT / "_ui"
TMP = OUT / "_build"
TMP.mkdir(parents=True, exist_ok=True)
EDGE = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
FF = imageio_ffmpeg.get_ffmpeg_exe()
FONT = (W / "app_ref" / "Vazirmatn-Variable.woff2").as_uri()
ICON = (W / "app_ref" / "icon-512.png").as_uri()
NAVY, CREAM, GOLD = "#1B2A4A", "#F2EAD3", "#C99A3C"
BG_PHOTO = (W / "stories_v2" / "assets" / "night_17805164_w.jpg").as_uri()

# phone geometry on the 1080x1920 canvas
SCR_X, SCR_Y, SCR_W = 190, 500, 700
SCR_H = 1920 - SCR_Y          # visible part of the screen (the phone runs off the bottom edge)
DSF = SCR_W / 390             # device scale factor: 390 CSS px -> 700 px

# v3 (2026-10-26 hook rewrite): no static opening card — app footage from 0 s.
# timeline (s), cut in the pauses of narration_v3_take1 (sentences end 1.58 / 3.63 / 6.55 / 9.32 / 11.43 / 12.73)
T = dict(hook=3.69, chal=2.94, lb=2.78, line1=2.06, line2=1.46, loop=0.60)
HOOK_B_AT = 1.72              # «یعنی ۲۵ روز دیگه.» lands with the narrator's second sentence
START_TAP = 2.55              # finger taps «شروع چالش» on the 30-day card -> card turns into day 1
TAP_AT = 1.05                 # inside the challenge shot: today's 15 minutes get logged
NARRATION = OUT / "narration_v3_take1.mp3"   # ElevenLabs web app (connector 429), Connery - Persian Narrator, Eleven v4, one take
MUSIC = OUT / "music_white_clouds_leberch.mp3"  # Pixabay Music: "White Clouds (Calm Piano)" by leberch (Pixabay Content License)
MUSIC_FROM = 2.0

FA = str.maketrans("0123456789", "۰۱۲۳۴۵۶۷۸۹")


def fa(n) -> str:
    return str(n).translate(FA)


def edge_shot(html: str, out: Path, w: int, h: int, scale: float = 1.0, transparent=False) -> None:
    src = TMP / (out.stem + ".html")
    src.write_text(html, encoding="utf-8")
    args = [EDGE, "--headless=new", "--disable-gpu", "--hide-scrollbars", f"--window-size={w},{h}",
            f"--force-device-scale-factor={scale}", "--virtual-time-budget=3000", f"--screenshot={out}", src.as_uri()]
    if transparent:
        args.insert(4, "--default-background-color=00000000")
    subprocess.run(args, check=True, capture_output=True)


def edge_dom(html: str, name: str, w: int, h: int) -> str:
    src = TMP / f"{name}.html"
    src.write_text(html, encoding="utf-8")
    r = subprocess.run([EDGE, "--headless=new", "--disable-gpu", f"--window-size={w},{h}",
                        "--virtual-time-budget=3000", "--dump-dom", src.as_uri()], capture_output=True)
    return r.stdout.decode("utf-8", "replace")


# ------------------------------------------------------------------ app screens (demo data)
ICONS = {  # from peleh-ui.js
    "today": '<rect x="4" y="5" width="16" height="15" rx="1.8"/><path d="M4 9.5h16M8 3.5v3M16 3.5v3M9 14.5l2 2 4-4"/>',
    "books": '<rect x="4.5" y="4.5" width="4" height="15" rx="1"/><rect x="10" y="7" width="4" height="12.5" rx="1"/><path d="M15.6 8.4l3.4-.9 2.6 11.1-3.4.9z"/>',
    "health": '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/><path d="M7.5 12h2l1.5-2.5 2 4.5 1.5-2h2"/>',
    "calendar": '<rect x="4" y="5" width="16" height="15" rx="1.8"/><path d="M4 9.5h16M8 3.5v3M16 3.5v3"/>',
    "more": '<circle cx="5.5" cy="12" r="1.7" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.7" fill="currentColor" stroke="none"/><circle cx="18.5" cy="12" r="1.7" fill="currentColor" stroke="none"/>',
}
TEMPLATES = [  # books.js CHALLENGE_TEMPLATES
    ("c3books", "چالش ۳ کتاب", "در یک ماه ۳ کتاب تمام کن.", 200),
    ("cgenre", "چالش ژانر", "در این ماه یک کتاب روان‌شناسی، یک رمان و یک کتاب کسب‌وکار بخوان.", 250),
    ("c30day", "چالش ۳۰ روزه", "۳۰ روز، روزی حداقل ۱۵ دقیقه مطالعه کن.", 350),
    ("c10books", "چالش ۱۰ کتاب", "در ۹۰ روز ۱۰ کتاب بخوان.", 900),
]


def page(body: str, extra_css: str = "") -> str:
    return (f"<!doctype html><html lang='fa' dir='ltr' style='direction:ltr'><head><meta charset='utf-8'>"
            f"<style>@font-face{{font-family:'Vazirmatn';src:url('{(UI / 'fonts' / 'Vazirmatn-Variable.woff2').as_uri()}') format('woff2');font-weight:100 900;}}</style>"
            f"<link rel='stylesheet' href='{(UI / 'peleh-theme.css').as_uri()}'>"
            f"<link rel='stylesheet' href='{(UI / 'peleh-app.css').as_uri()}'>"
            "<style>html,body{min-width:0!important;} body{margin:0;overflow:hidden;direction:ltr;background:var(--bg);} #ph{width:390px;position:relative;overflow:hidden;direction:rtl;min-height:1700px;background:var(--bg);} #ph .app{display:block!important;min-height:0!important;} .app{max-width:390px!important;margin:0!important;} .tabbar{width:390px!important;left:0!important;right:auto!important;max-width:390px!important;margin:0!important;transform:none!important;} .sheet{max-width:390px!important;width:390px!important;box-sizing:border-box;} .peleh-toast{left:195px!important;} .sb{height:34px;display:flex;justify-content:space-between;align-items:center;"
            "padding:0 22px;font-size:13px;font-weight:700;direction:ltr;color:var(--text);} .sb i{display:inline-block;width:22px;height:11px;"
            "border:1.5px solid var(--text);border-radius:3px;margin-left:6px;position:relative;opacity:.9}"
            ".sb i::after{content:'';position:absolute;inset:1.5px;right:5px;background:var(--text);border-radius:1px}"
            ".pi{width:22px;height:22px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}"
            f"{extra_css}</style></head><body class='theme-goldnavy'><div id='ph'>{body}</div></body></html>")


def statusbar() -> str:
    return "<div class='sb'><span>۲۰:۴۵</span><span>۵G <i></i></span></div>"


def tabbar() -> str:
    tabs = [("today", "امروز"), ("books", "کتاب"), ("health", "سلامت"), ("calendar", "تقویم"), ("more", "بیشتر")]
    return ("<div class='tabbar has-tabs'>" + "".join(
        f"<button class='tabbtn {'active' if k == 'books' else ''}'><svg class='pi' viewBox='0 0 24 24'>{ICONS[k]}</svg>"
        f"<span>{lab}</span></button>" for k, lab in tabs) + "</div>")


def challenge_card_30(ok_days: int, today_min: int, day: int = 6) -> str:
    bar = f"<div style='height:8px;border-radius:6px;background:var(--surf-a, var(--track));overflow:hidden;margin:6px 0 8px;'><div style='height:100%;width:{round(ok_days / 30 * 100)}%;background:var(--gold);border-radius:6px;'></div></div>"
    line = lambda a, b: f"<div class='row-between' style='font-size:12.5px;padding:3px 0;'><span style='color:var(--muted);'>{a}</span><b>{b}</b></div>"
    today = f"✅ {fa(today_min)} دقیقه" if today_min >= 15 else f"{fa(today_min)} از ۱۵ دقیقه — {fa(15 - today_min)} دقیقه‌ی دیگه بخون"
    cells = "".join(
        f"<span style='width:14px;height:14px;border-radius:4px;display:inline-block;background:"
        f"{'var(--gold)' if i < ok_days else 'transparent'};{'border:1.5px solid var(--gold);' if i >= ok_days else ''}'></span>"
        for i in range(day))
    return (f"{bar}{line('روزهای موفق', f'{fa(ok_days)} از ۳۰')}{line('روز چالش', f'روز {fa(day)}')}"
            f"{line('امروز', today)}{line('مونده', f'{fa(30 - ok_days)} روز موفق دیگه')}"
            f"<div style='display:flex;flex-wrap:wrap;gap:3px;margin:8px 0 10px;direction:rtl;'>{cells}</div>"
            "<button class='btn btn-ghost' style='width:100%;color:var(--danger);'>خروج از چالش (−۳۰ امتیاز)</button>")


def books_challenges(ok_days: int, today_min: int, toast: bool, toast_top: int = 0, day: int = 6,
                     joined: bool = True) -> str:
    cards = []
    for cid, title, desc, reward in TEMPLATES:
        inner = challenge_card_30(ok_days, today_min, day) if (cid == "c30day" and joined) else \
            f"<button class='btn btn-primary' {'id=start30' if cid == 'c30day' else ''} style='width:100%;'>شروع چالش</button>"
        cards.append(
            f"<div class='card' id='{cid}' style='margin-bottom:12px;'><div class='row-between'><div style='font-weight:800;'>{title}</div>"
            "<button type='button' class='btn btn-ghost' style='flex:none;padding:5px 10px;font-size:11px;'>شرکت‌کننده‌ها</button></div>"
            f"<div class='note' style='margin:4px 0 10px;'>{desc}</div>"
            "<div style='display:inline-block;background:var(--gold-soft);color:var(--gold);font-weight:800;font-size:11.5px;"
            f"padding:5px 10px;border-radius:10px;margin-bottom:10px;'>🎁 پاداش تکمیل: +{fa(reward)} امتیاز</div>{inner}</div>")
    chips = "".join(f"<button type='button' class='suggest-chip {'on' if t == 'چالش‌ها' else ''}'>{t}</button>"
                    for t in ["امروز", "کتابخانه", "چالش‌ها", "نشان‌ها", "هدیه‌ها"])
    t = (f"<div class='peleh-toast' style='position:absolute;left:50%;top:{toast_top}px;bottom:auto;transform:translateX(-50%);opacity:1;"
         "background:var(--toast-bg);color:var(--toast-text);padding:12px 18px;border-radius:16px;font-weight:800;font-size:14px;"
         f"box-shadow:var(--elev-2);white-space:nowrap;z-index:60'>✅ ۱۵ دقیقه ثبت شد · روز {fa(day)} کامل</div>") if toast else ""
    return page(statusbar() + "<div class='app' style='padding:6px 16px 120px;'>"
                "<div class='row-between' style='margin-top:2px;margin-bottom:2px;'><div class='section-title' style='margin:0;'>پله کتاب</div>"
                "<button type='button' class='btn btn-ghost' style='flex:none;padding:8px 14px;font-size:12px;'>ویرایش سبک و ترجیحات</button></div>"
                f"<div class='suggest-chips' style='margin:12px 0 14px;'>{chips}</div>"
                "<button type='button' class='btn btn-primary' style='width:100%;margin-bottom:14px;display:flex;align-items:center;justify-content:center;gap:6px;'>🏆 نفرات برتر</button>"
                + "".join(cards) + "</div>" + t,
                ".tabbar{position:fixed}")


DEMO = [("مریم ک.", 1260), ("علی ر.", 1185), ("سارا م.", 1110), ("نیما ش.", 980), ("الهام ت.", 925), ("رضا ا.", 870),
        ("زهرا ن.", 805), ("امید ج.", 760), ("کیان ب.", 715), ("نگار ص.", 690), ("حامد ف.", 640), ("ترانه د.", 610)]
COLORS = ["var(--gold)", "var(--info)", "var(--ok)", "var(--warn)", "var(--danger)", "var(--muted)"]
MEDAL = lambda i: ["var(--medal-1)", "var(--medal-2)", "var(--medal-3)"][i] if i < 3 else "var(--faint)"


def leaderboard() -> str:
    pod = "".join(
        f"<div class='lb-podium-col p{idx + 1}'><div class='lb-podium-crown'>{'👑' if idx == 0 else '&nbsp;'}</div>"
        f"<div class='lb-podium-avatar-wrap'><div class='lb-podium-avatar blur' style='background:{COLORS[(idx * 2) % 6]};'>{DEMO[idx][0][0]}</div>"
        f"<div class='lb-podium-badge' style='background:{MEDAL(idx)};'>{fa(idx + 1)}</div></div>"
        f"<div class='lb-podium-name blur'>{DEMO[idx][0]}</div><div class='lb-podium-pts'>{fa(DEMO[idx][1])} امتیاز</div></div>"
        for idx in [1, 0, 2])
    rows = "".join(
        f"<div class='lb-row'><div class='lb-badge' style='background:{MEDAL(i)};'>{fa(i + 1)}</div>"
        f"<div class='lb-avatar blur' style='background:{COLORS[(i * 5) % 6]};'>{n[0]}</div>"
        f"<div class='lb-name blur'>{n}</div><div class='lb-pts'>{fa(p)}</div></div>"
        for i, (n, p) in enumerate(DEMO))
    chips = ("<div class='suggest-chips' style='margin-bottom:12px;'><button type='button' class='suggest-chip on'>این ماه</button>"
             "<button type='button' class='suggest-chip'>امسال</button></div>")
    sheet = (f"<div class='sheet' style='position:absolute;top:150px;left:0;right:0;border-radius:28px 28px 0 0;min-height:1400px;'>"
             f"<h3>🏆 نفرات برتر — این ماه</h3>{chips}<div class='lb-podium'>{pod}</div><div class='lb-list' id='lbl'>{rows}</div></div>")
    under = "<div style='position:absolute;inset:0;background:var(--bg)'></div><div style='position:absolute;inset:0;background:var(--scrim)'></div>"
    return page(statusbar() + under + sheet, ".blur{filter:blur(5px);} #ph{height:1700px;}")


# ------------------------------------------------------------------ brand frames
BASE = f"""@font-face {{ font-family: V; src: url('{FONT}') format('woff2'); font-weight: 100 900; }}
html, body {{ margin:0; width:1080px; height:1920px; overflow:hidden; }}
body {{ font-family: V; direction: rtl; position: relative; color: {CREAM}; background: transparent; }}
g {{ color: {GOLD}; font-style: normal; }}
.pill {{ position:absolute; top:300px; right:60px; left:60px; text-align:center; }}
.pill span {{ display:inline-block; background:rgba(27,42,74,.92); border:1.5px solid rgba(201,154,60,.45); color:{CREAM};
  font-size:50px; font-weight:800; padding:22px 40px; border-radius:30px; box-shadow:0 20px 60px rgba(0,0,0,.45); line-height:1.4; }}
.series {{ position:absolute; top:300px; right:0; left:0; text-align:center; }}
.series span {{ display:inline-block; background:rgba(27,42,74,.9); color:{CREAM}; font-size:38px; font-weight:700; padding:12px 32px; border-radius:40px; }}
.series span:before {{ content:''; display:inline-block; width:13px; height:13px; border-radius:50%; background:{GOLD}; margin-left:14px; vertical-align:middle; }}
"""


def frame(html: str, out: Path, bg: bool) -> None:
    back = ""
    if bg:
        back = (f"<div style=\"position:absolute;inset:-40px;background:url('{BG_PHOTO}') center/cover;filter:blur(26px) brightness(.55) saturate(.8)\"></div>"
                f"<div style='position:absolute;inset:0;background:linear-gradient(180deg,rgba(27,42,74,.92),rgba(27,42,74,.78) 50%,rgba(14,22,42,.95))'></div>"
                f"<div style='position:absolute;inset:0;background:radial-gradient(45% 30% at 50% 50%,rgba(255,205,120,.12),rgba(0,0,0,0) 70%)'></div>")
    edge_shot(f"<!doctype html><meta charset='utf-8'><style>{BASE}</style>{back}{html}", out, 1080, 1920, transparent=not bg)


def phone_frame(out: Path) -> None:
    html = (f"<div style='position:absolute;left:{SCR_X - 22}px;top:{SCR_Y - 22}px;width:{SCR_W + 44}px;height:1700px;border-radius:92px;"
            "background:linear-gradient(145deg,#3a4357,#12161f 40%,#2b3242);box-shadow:0 60px 140px rgba(0,0,0,.65),inset 0 0 0 2px rgba(255,255,255,.08)'></div>"
            f"<div style='position:absolute;left:{SCR_X}px;top:{SCR_Y}px;width:{SCR_W}px;height:1700px;border-radius:72px;background:#000'></div>")
    edge_shot(f"<!doctype html><meta charset='utf-8'><style>html,body{{margin:0;background:transparent}}</style>{html}", out, 1080, 1920, transparent=True)


def screen_mask(out: Path) -> None:
    edge_shot("<!doctype html><style>html,body{margin:0;background:#000}</style>"
              f"<div style='position:absolute;left:{SCR_X}px;top:{SCR_Y}px;width:{SCR_W}px;height:1700px;border-radius:72px;background:#fff'></div>",
              out, 1080, 1920)


def offset_of(html: str, el_id: str, name: str) -> int:
    probe = html.replace("</body>", f"<script>document.body.setAttribute('data-y', Math.round(document.getElementById('{el_id}').getBoundingClientRect().top));</script></body>")
    dom = edge_dom(probe, name, 500, 1700)
    return int(re.search(r'data-y="(-?\d+)"', dom).group(1))


def build_assets() -> dict:
    a = {}
    # screens: tall CSS 1700 px renders at 700 px width
    start = books_challenges(0, 0, False, joined=False)
    y30 = offset_of(start, "c30day", "probe_c30")
    yb = offset_of(start, "start30", "probe_btn")
    day1_a = books_challenges(0, 0, False, day=1)
    day1_b = books_challenges(1, 15, True, toast_top=max(0, y30 - 150) + 610, day=1)
    for key, html in [("start", start), ("day1_a", day1_a), ("day1_b", day1_b), ("lb", leaderboard())]:
        p = TMP / f"scr_{key}.png"
        edge_shot(html, p, 500, 1700, scale=DSF)
        a[key] = p
    a["chal_scroll"] = max(0, round((y30 - 150) * DSF))       # card near the top of the visible screen
    # where the «شروع چالش» button of the 30-day card sits on the 1080x1920 canvas once scrolled
    a["tap_y"] = SCR_Y + round((yb + 20) * DSF) - a["chal_scroll"]
    phone_frame(TMP / "phone.png"); a["phone"] = TMP / "phone.png"
    screen_mask(TMP / "mask.png"); a["mask"] = TMP / "mask.png"

    # hook overlay: scrim over the top of the phone + 3 lines (max 7 words per line, 92-104 px)
    scrim = ("<div style='position:absolute;left:0;right:0;top:0;height:960px;background:linear-gradient(180deg,"
             "rgba(12,19,36,.96) 0%,rgba(12,19,36,.94) 76%,rgba(12,19,36,0) 100%)'></div>")
    line_a = ("<div style='position:absolute;top:290px;right:50px;left:50px;text-align:center;font-size:92px;"
              "font-weight:900;line-height:1.32;text-shadow:0 4px 18px rgba(0,0,0,.7)'>«از اول ماه بعد<br>شروع می‌کنم.»</div>")
    line_b = ("<div style='position:absolute;top:560px;right:40px;left:40px;text-align:center;font-size:104px;"
              "font-weight:900;color:#F0B847;text-shadow:0 4px 18px rgba(0,0,0,.7)'>یعنی ۲۵ روز دیگه.</div>")
    frame(scrim + line_a, TMP / "o_hook_a.png", False); a["o_hook_a"] = TMP / "o_hook_a.png"
    frame(scrim + line_a + line_b, TMP / "o_hook_ab.png", False); a["o_hook_ab"] = TMP / "o_hook_ab.png"
    # touch indicator (screen-recording style) on the 30-day «شروع چالش» button
    ring = (f"<div style='position:absolute;left:{540 - 62}px;top:{a['tap_y'] - 62}px;width:124px;height:124px;border-radius:50%;"
            "background:rgba(255,255,255,.28);border:5px solid rgba(255,255,255,.85);box-sizing:border-box;"
            "box-shadow:0 0 0 14px rgba(255,255,255,.12)'></div>")
    frame(ring, TMP / "o_tap.png", False); a["o_tap"] = TMP / "o_tap.png"

    frame("<div style='position:absolute;top:760px;right:70px;left:70px;text-align:center;font-size:118px;font-weight:900;line-height:1.45;'>"
          "<g>۲۵ روز</g><br>صبر نکن.</div>", TMP / "f_line1.png", True); a["line1"] = TMP / "f_line1.png"
    frame("<div style='position:absolute;top:720px;right:70px;left:70px;text-align:center;'>"
          "<div style='font-size:116px;font-weight:900;'>از <g>همین امروز.</g></div>"
          f"<img src='{ICON}' style='display:block;margin:70px auto 18px;width:150px;height:150px;border-radius:36px;box-shadow:0 20px 60px rgba(0,0,0,.5)'>"
          "<div style='font-size:46px;font-weight:800;color:#C99A3C'>پله · لینک در بیو</div></div>", TMP / "f_line2.png", True)
    a["line2"] = TMP / "f_line2.png"
    frame("<div style='position:absolute;inset:0;background:linear-gradient(180deg,#0D1830 0%,#1B2A4A 45%,#0D1830 100%)'></div>"
          "<div style='position:absolute;inset:0;background:radial-gradient(50% 30% at 50% 62%,rgba(224,176,74,.14),rgba(0,0,0,0) 70%)'></div>",
          TMP / "f_stage.png", False); a["stage"] = TMP / "f_stage.png"
    frame("<div class='pill'><span>روز اولت همون روزیه که <g>شروع می‌کنی</g>.</span></div>", TMP / "o_chal.png", False)
    a["o_chal"] = TMP / "o_chal.png"
    # only what is confirmed: the Aban leaderboard is running (prize details stay out of the frame)
    frame("<div class='pill'><span>جدول آبان <g>هنوز ادامه داره</g>.</span></div>", TMP / "o_lb.png", False)
    a["o_lb"] = TMP / "o_lb.png"
    return a


def enc(args: list, out: Path) -> Path:
    subprocess.run([FF, "-hide_banner", "-loglevel", "error", "-y", *args, "-an", "-r", "30", "-c:v", "libx264",
                    "-preset", "medium", "-crf", "16", "-pix_fmt", "yuv420p", str(out)], check=True)
    return out


def still(p: Path, dur: float) -> list:
    return ["-loop", "1", "-framerate", "30", "-t", f"{dur}", "-i", str(p)]


def phone_shot(a: dict, scr_in: str, extra_inputs: list, dur: float, overlays: str, out: Path) -> Path:
    """stage + phone + masked screen [scr] + overlay chain; inputs 0 stage, 1 phone, 2 mask, then extras."""
    args = still(a["stage"], dur) + still(a["phone"], dur) + still(a["mask"], dur) + extra_inputs
    fc = (scr_in + f"[2:v]format=gray,crop={SCR_W}:{SCR_H}:{SCR_X}:{SCR_Y}[m];[scr][m]alphamerge[sm];"
          f"[0:v][1:v]overlay=0:0[st];[st][sm]overlay={SCR_X}:{SCR_Y}[base];" + overlays)
    return enc(args + ["-filter_complex", fc, "-map", "[v]", "-t", f"{dur}"], out)


def build_segments(a: dict) -> list[Path]:
    ys, d, segs = a["chal_scroll"], T, []
    # 1. hook: the challenges list drifts up to the 30-day card, the finger taps «شروع چالش» -> day 1
    drift = 140
    pan = f"'{ys - drift}+{drift}*min(1,t/1.9)'"
    ex = still(a["start"], d["hook"]) + still(a["day1_a"], d["hook"]) + still(a["o_hook_a"], d["hook"]) + \
        still(a["o_hook_ab"], d["hook"]) + still(a["o_tap"], d["hook"])
    scr = (f"[3:v]crop={SCR_W}:{SCR_H}:0:{pan}[sa];[4:v]crop={SCR_W}:{SCR_H}:0:{ys}[sb];"
           f"[sa][sb]xfade=transition=fade:duration=0.15:offset={START_TAP}[scr];")
    ov = (f"[base][7:v]overlay=0:0:enable='between(t,{START_TAP - 0.3},{START_TAP + 0.25})'[t1];"
          f"[t1][5:v]overlay=0:0:enable='lt(t,{HOOK_B_AT})'[t2];"
          f"[t2][6:v]overlay=0:0:enable='gte(t,{HOOK_B_AT})',setsar=1[v]")
    segs.append(phone_shot(a, scr, ex, d["hook"], ov, TMP / "seg1_hook.mp4"))
    # 2. day 1: today's 15 minutes get logged (crossfade + toast)
    ex = still(a["day1_a"], d["chal"]) + still(a["day1_b"], d["chal"]) + still(a["o_chal"], d["chal"])
    scr = (f"[3:v]crop={SCR_W}:{SCR_H}:0:{ys}[sa];[4:v]crop={SCR_W}:{SCR_H}:0:{ys}[sb];"
           f"[sa][sb]xfade=transition=fade:duration=0.25:offset={TAP_AT}[scr];")
    segs.append(phone_shot(a, scr, ex, d["chal"], "[base][5:v]overlay=0:0,setsar=1[v]", TMP / "seg2_chal.mp4"))
    # 3. leaderboard sheet, slow scroll
    ex = still(a["lb"], d["lb"]) + still(a["o_lb"], d["lb"])
    scr = f"[3:v]crop={SCR_W}:{SCR_H}:0:'min(260,260*t/{d['lb']})'[scr];"
    segs.append(phone_shot(a, scr, ex, d["lb"], "[base][4:v]overlay=0:0,setsar=1[v]", TMP / "seg3_lb.mp4"))
    # 4-5. text lines with a slow push-in (never a frozen frame)
    for key, name in [("line1", "seg4_line1.mp4"), ("line2", "seg5_line2.mp4")]:
        n = int(d[key] * 30)
        segs.append(enc(still(a[key], d[key]) + ["-filter_complex",
                    f"[0:v]scale=1080:1920,zoompan=z='1+0.035*on/{n}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=1080x1920:fps=30,setsar=1[v]",
                    "-map", "[v]", "-t", f"{d[key]}"], TMP / name))
    # 6. loop: the first 0.6 s of the hook
    segs.append(enc(["-i", str(segs[0]), "-t", f"{d['loop']}"], TMP / "seg6_loop.mp4"))
    return segs


def build_video(segs: list[Path]) -> Path:
    total = round(sum(T.values()), 2)
    lst = TMP / "concat.txt"
    lst.write_text("".join(f"file '{s.as_posix()}'\n" for s in segs), encoding="utf-8")
    tap1 = START_TAP
    tap2 = T["hook"] + TAP_AT
    click = "0.35*sin(2*PI*1320*t)*exp(-28*t)+0.2*sin(2*PI*1980*t)*exp(-40*t)"
    audio = (
        "[1:a]aresample=44100,volume=0.82,asplit=2[na][key];"
        f"[2:a]aresample=44100,atrim=duration={total},asetpts=PTS-STARTPTS,volume=0.95,"
        f"afade=t=in:d=0.4,afade=t=out:st={total - 1.0}:d=1.0[mraw];"
        "[mraw][key]sidechaincompress=threshold=0.03:ratio=8:attack=20:release=400[mu];"
        # soft synthesized taps: the start tap and the 15-minute log (no outside source)
        f"aevalsrc='{click}':s=44100:d=0.35,adelay={int(tap1 * 1000)}:all=1,aformat=channel_layouts=mono[tp1];"
        f"aevalsrc='{click}':s=44100:d=0.35,adelay={int(tap2 * 1000)}:all=1,aformat=channel_layouts=mono[tp2];"
        f"[na][mu][tp1][tp2]amix=inputs=4:normalize=0:duration=longest,atrim=duration={total},"
        "alimiter=limit=0.9,aformat=channel_layouts=stereo[aout]"
    )
    out = OUT / "peleh_D012_az_nazdik_1.mp4"
    subprocess.run([FF, "-hide_banner", "-loglevel", "error", "-y", "-f", "concat", "-safe", "0", "-i", str(lst),
                    "-i", str(NARRATION), "-ss", str(MUSIC_FROM), "-i", str(MUSIC),
                    "-filter_complex", audio, "-map", "0:v", "-map", "[aout]", "-t", f"{total}",
                    "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p", "-r", "30",
                    "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart", str(out)], check=True)
    return out


if __name__ == "__main__":
    assets = build_assets()
    video = build_video(build_segments(assets))
    subprocess.run([FF, "-hide_banner", "-loglevel", "error", "-y", "-i", str(video),
                    "-vf", "fps=1/1.0,scale=216:-2,tile=7x2", "-frames:v", "1", str(OUT / "check_sheet.jpg")], check=True)
    subprocess.run([FF, "-hide_banner", "-loglevel", "error", "-y", "-i", str(video),
                    "-vf", "fps=2,scale=180:-2,tile=9x3", "-frames:v", "1", str(OUT / "check_sheet_halfsec.jpg")], check=True)
    print(video)
