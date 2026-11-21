"""Re-apply the sms-fix hunks (original -> patched) onto the LIVE app.js, anchored by context.
Fails loudly if any hunk's context is not found exactly once.

    python -I rebase_on_live.py <live_app.js> <live_sw.js> <out_dir>
"""
import difflib, sys
from pathlib import Path

D = Path(__file__).resolve().parent.parent
orig = (D / "original" / "app.js").read_text(encoding="utf-8").split("\n")
patched = (D / "patched" / "app.js").read_text(encoding="utf-8").split("\n")
live_app = Path(sys.argv[1]).read_text(encoding="utf-8")
live_sw = Path(sys.argv[2]).read_text(encoding="utf-8")
out = Path(sys.argv[3])
CTX = 3

text = live_app
hunks = [op for op in difflib.SequenceMatcher(None, orig, patched, autojunk=False).get_opcodes() if op[0] != "equal"]
for tag, i1, i2, j1, j2 in hunks:
    a0, a1 = max(0, i1 - CTX), min(len(orig), i2 + CTX)
    old = "\n".join(orig[a0:a1])
    new = "\n".join(orig[a0:i1] + patched[j1:j2] + orig[i2:a1])
    n = text.count(old)
    if n != 1:
        sys.exit(f"hunk at original line {i1+1}: context found {n} times - aborting")
    text = text.replace(old, new)
print(f"applied {len(hunks)} hunks to live app.js")

old_cache = 'const CACHE_NAME = "peleh-v24"; // '
if live_sw.count(old_cache) != 1:
    sys.exit("live sw.js is not peleh-v24 - re-check before bumping")
sw = live_sw.replace(old_cache, 'const CACHE_NAME = "peleh-v25"; // v25: کاربر خارج از ایران — پیام روشن برای شماره‌ی خارجی و ادامه‌ی بدون شماره برای حساب گوگلی (sms-fix) — ')

for sub, files in (("original", {"app.js": live_app, "sw.js": live_sw}), ("patched", {"app.js": text, "sw.js": sw})):
    (out / sub).mkdir(parents=True, exist_ok=True)
    for name, body in files.items():
        (out / sub / name).write_text(body, encoding="utf-8", newline="\n")

parts = []
for name in ("app.js", "sw.js"):
    a = (out / "original" / name).read_text(encoding="utf-8").splitlines(keepends=True)
    b = (out / "patched" / name).read_text(encoding="utf-8").splitlines(keepends=True)
    parts.extend(difflib.unified_diff(a, b, "live/" + name, "live-patched/" + name, n=3))
(out / "sms_fix_live.diff").write_text("".join(parts), encoding="utf-8")
print("diff lines:", "".join(parts).count("\n"))
