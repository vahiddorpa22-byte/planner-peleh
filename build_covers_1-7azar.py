"""Covers for T4, T5, R13 (1–7 Azar 1405). Photos are clean frames from the new Magnific clips."""
import tempfile
from pathlib import Path

import build_reel_cover as C

W = Path(__file__).resolve().parent
M = W / "stock" / "magnific_2026-11"
T = Path(tempfile.gettempdir())

jobs = [
    (W / "reel_trial_t4" / "cover_t4.png", "۲۰ تا ریلز کمتر", "= سالی ۸ کتاب", "تریال · چالش ۳۰ شب کتاب",
     M / "m24_phone_scroll_sofa_b_3442606.mp4", 5.0, "62% 50%"),
    (W / "reel_trial_t5" / "cover_t5.png", "۱۰ سال دیگه:", "۱۲۰ کتاب", "یا هیچی؟ · فرقش ۱۵ دقیقه‌ست",
     M / "m28_pages_wind_black_3042472.mp4", 4.0, "50% 50%"),
    (W / "reel_r13_7azar" / "cover_r13.png", "۷ شب", "= ۷۰ صفحه", "هفته‌ی اول چالش تموم شد",
     M / "m21_reading_bed_night_v_3703843.mp4", 3.0, "50% 45%"),
]
for out, l1, l2, sub, vid, at, focus in jobs:
    ph = C.grab_frame(vid, at, T / f"{out.stem}_scene.jpg")
    C.build(out, l1, l2, sub, ph, focus)
    print(out)
