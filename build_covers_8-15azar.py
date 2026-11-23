"""Covers for T6, T7, T8, R15, T9, R16 (8–15 Azar 1405)."""
import tempfile
from pathlib import Path

import build_reel_cover as C

W = Path(__file__).resolve().parent
M = W / "stock" / "magnific_2026-11"
T = Path(tempfile.gettempdir())
jobs = [
    ("reel_trial_t6/cover_t6.png", "شروعش سخته،", "نه خوندنش", "تریال · قانون ۲ دقیقه", "m31_man_sofa_reading_177804.mp4", 0.3, "40% 50%"),
    ("reel_trial_t7/cover_t7.png", "«از فردا می‌خونم»", "ترجمه: هیچ‌وقت", "فرهنگ لغت بهونه‌ها 📕", "m34_sleepy_alarm_2852455.mp4", 3.0, "55% 45%"),
    ("reel_trial_t8/cover_t8.png", "۳ کتاب", "زیر ۱۵۰ صفحه", "هر کدوم کمتر از ۲ هفته", None, 0, ""),
    ("reel_r15_13azar/cover_r15.png", "روزی ۱۵ دقیقه", "= سالی ۹۱ ساعت", "یعنی نزدیک ۴ روز کامل کتاب", "m33_tea_fireplace_58545.mp4", 14.0, "45% 50%"),
    ("reel_trial_t9/cover_t9.png", "۱۵ دقیقه‌ی قبل خواب", "کجا می‌ره؟", "تریال · سالی ۹۱ ساعت", "m30_couple_book_phone_2368240.mp4", 2.0, "40% 45%"),
    ("reel_r16_15azar/cover_r16.png", "شب ۱۵", "نصف راه 🎉", "۱۵۰ صفحه · نیمه‌ی چالش ۳۰ شب", "m35_girl_couch_reading_473257.mp4", 4.0, "62% 50%"),
]
for out, l1, l2, sub, clip, at, focus in jobs:
    out = W / out
    if clip:
        ph = C.grab_frame(M / clip, at, T / f"{out.stem}_scene.jpg")
    else:  # T8: the three real covers side by side
        from PIL import Image
        cv = W / "reel_trial_t8" / "covers"
        ims = [Image.open(cv / n).convert("RGB").resize((400, 592)) for n in ("c139526.jpg", "c10209.jpg", "c13291.jpg")]
        S = Image.new("RGB", (1320, 680), (20, 30, 52))
        for k, im in enumerate(ims):
            S.paste(im, (30 + k * 430, 44))
        ph = T / "cover_t8_scene.jpg"
        S.save(ph, quality=92)
        focus = "50% 50%"
    C.build(out, l1, l2, sub, ph, focus, 96 if len(l1) > 16 else 112 if len(l1) > 13 else 128)
    print(out.name)
