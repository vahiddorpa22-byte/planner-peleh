import tempfile
from pathlib import Path
import build_reel_cover as C

W = Path(__file__).resolve().parent
ph = C.grab_frame(W / "stock" / "magnific_2026-11" / "m30_couple_book_phone_2368240.mp4", 3.0, Path(tempfile.gettempdir()) / "cover_speed_scene.jpg")
C.build(W / "reel_trial_speedtest" / "cover_speedtest.png", "این متن رو", "۳۰ ثانیه‌ای بخون", "تست سرعت خوندن · رسیدی؟", ph, "50% 40%")
