"""Instagram highlight «شروع اینجا» — 5 permanent stories for newcomers (mostly from Trial Reels) + a highlight cover.
Same template as the weekly stories. Output: highlight_start/H1..H5_*.png, cover_highlight_start.png, _build/contact.jpg
"""
import sys, subprocess
from pathlib import Path

HERE = Path(__file__).resolve().parent
WORK = HERE.parent
sys.path.insert(0, str(WORK / "stories_week_23-30aban"))
import build_stories_23_30 as S  # noqa: E402
import imageio_ffmpeg

S.v2.TMP = HERE / "_build"
S.v2.TMP.mkdir(exist_ok=True)
frame, head, line, zone, big, card = S.frame, S.head, S.line, S.zone, S.big, S.card
M = WORK / "stock" / "magnific_2026-11"
STILL = HERE / "_stills"; STILL.mkdir(exist_ok=True)


def still(clip, t):
    out = STILL / f"{Path(clip).stem}_{t}.jpg"
    if not out.exists():
        subprocess.run([imageio_ffmpeg.get_ffmpeg_exe(), "-v", "error", "-y", "-ss", str(t), "-i", str(M / clip), "-frames:v", "1", "-q:v", "2", str(out)], check=True)
    return str(out)


SZ = "auto 1920px"
LAM = str(WORK / "mascot" / "ep4" / "lam_ep4_B_start.png")
FR = {
    "H1_pele_chie": lambda: frame(still("m35_girl_couch_reading_473257.mp4", 4), "62% 50%", "شروع اینجا ۱/۵", "",
        head(330, "به پله خوش اومدی 👋", "پله <g>چیه</g>؟", 110) +
        card(700, [("📖", "اپ عادت کتاب‌خونی"), ("⏱", "روزی فقط ۱۵ دقیقه"), ("🪜", "قدم‌به‌قدم، بدون فشار"), ("🔥", "زنجیره‌ی شب‌های خوندن")], 52),
        bright=.45, size=SZ),
    "H2_chalesh": lambda: frame(still("m21_reading_bed_night_v_3703843.mp4", 6), "50% 45%", "شروع اینجا ۲/۵", "",
        head(330, "از ۱ آذر", "چالش <g>۳۰ شب</g> کتاب", 100) +
        big(640, "۱۰", "صفحه در شب") + line(1140, "۳۰ شب = <g>یه کتاب کامل</g><br>هر شب با هم، ساعت ۹:۳۰", 56, 860),
        bright=.5, size=SZ),
    "H3_chetor": lambda: frame(still("m36_hands_touch_book_2492925.mp4", 6), "50% 50%", "شروع اینجا ۳/۵", "",
        head(330, "۳ قدم", "چطور <g>وارد چالش</g> بشم؟", 92) +
        card(680, [("۱", "پله رو نصب کن<br><small style='font-size:38px;opacity:.85'>کافه‌بازار یا app.pelehapp.ir</small>"),
                   ("۲", "ثبت‌نام کن"),
                   ("۳", "کتاب ← چالش‌ها ← <b style='color:#F0B847'>چالش ۳۰ روزه</b>")], 54),
        bright=.45, size=SZ),
    "H4_jayeze": lambda: frame(still("m33_tea_fireplace_58545.mp4", 14), "45% 50%", "شروع اینجا ۴/۵", "",
        head(330, "هدیه‌ی نشر خوب", "<g>جایزه‌ها</g> 🎁", 110) +
        card(660, [("🥇", "نفر ۱ تا ۳ جدول: یکی از ۳ کتاب تازه‌ی نشر خوب"),
                   ("📚", "داستان کاهو · غریبه‌ها · آشپزخانه‌ی کرملین"),
                   ("⭐", "نفر ۴ تا ۱۰: هفت روز پریمیوم پله"),
                   ("✅", "برای جایزه، شماره‌ی تأییدشده لازمه")], 46),
        bright=.45, size=SZ),
    "H5_ba_ham": lambda: frame(LAM, "50% 38%", "شروع اینجا ۵/۵", zone(1430, 290, 520, 110, 30),
        head(330, "هر شب، با هم", "تنها <g>نخون</g> 🌙", 104) +
        card(640, [("💬", "گروه تلگرام · هر شب ۹:۳۰"), ("🪜", "لَم · هر دوشنبه یه قسمت تازه"), ("👆", "لینک اپ و گروه تو بیو")], 52),
        bright=.42, size="auto 2300px"),
}

if __name__ == "__main__":
    for k in (sys.argv[1:] or list(FR)):
        S.shot(S.page(FR[k](), "all"), HERE / f"{k}.png")
        print(k)
    # highlight cover: Instagram shows only the centre circle → navy field, gold ring, Peleh stairs icon in the middle
    from PIL import Image, ImageDraw
    cov = Image.new("RGB", (1080, 1920), (27, 42, 74))
    d = ImageDraw.Draw(cov)
    d.ellipse((540 - 330, 960 - 330, 540 + 330, 960 + 330), outline=(201, 162, 39), width=14)
    icon = Image.open(WORK / "app_ref" / "icon-512.png").convert("RGBA").resize((420, 420))
    cov.paste(icon, (540 - 210, 960 - 210), icon)
    cov.save(HERE / "cover_highlight_start.png")
    fs = sorted(HERE.glob("H*.png")) + [HERE / "cover_highlight_start.png"]
    sheet = Image.new("RGB", (216 * len(fs), 384), "black")
    for i, f in enumerate(fs):
        sheet.paste(Image.open(f).convert("RGB").resize((216, 384)), (i * 216, 0))
    sheet.save(HERE / "_build" / "contact.jpg", quality=88)
