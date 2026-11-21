"""Build unified diff for sms_fix and a headless-Edge JS test page (syntax + helper unit tests)."""
import difflib, json, re, subprocess, sys
from pathlib import Path

D = Path(r"D:\me\khodam\my page\peleh\peleh_work\dev\sms_fix")
OUT = Path(sys.argv[1])
files = ["app.js", "sw.js", "supabase/functions/send-otp/index.ts"]
parts = []
for f in files:
    a = (D / "original" / f).read_text(encoding="utf-8").splitlines(keepends=True)
    b = (D / "patched" / f).read_text(encoding="utf-8").splitlines(keepends=True)
    parts.extend(difflib.unified_diff(a, b, "original/" + f, "patched/" + f, n=3))
(D / "sms_fix.diff").write_text("".join(parts), encoding="utf-8")
print("diff lines:", sum(1 for _ in "".join(parts).splitlines()))

src = (D / "patched" / "app.js").read_text(encoding="utf-8")
ts = (D / "patched" / "supabase/functions/send-otp/index.ts").read_text(encoding="utf-8")
# Extract the TS helpers and strip type annotations so they run as JS
def grab(fn):
    m = re.search(r"function " + fn + r"\(.*?\n}\n", ts, re.S)
    return m.group(0)
ts_js = grab("normalizeIranMobile") + grab("looksInternationalPhone")
ts_js = re.sub(r"\(raw: string\): (string \| null|boolean)", "(raw)", ts_js)

html = """<!doctype html><meta charset=utf-8><body><pre id=o></pre><script>
const out=[];function ok(c,m){out.push((c?'PASS ':'FAIL ')+m);}
try{ new Function(%s); ok(true,'app.js parses'); }catch(e){ ok(false,'app.js parse: '+e.message); }
// app.js helpers in isolation
function faToEnDigits(s){return String(s).replace(/[۰-۹]/g,d=>'۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).replace(/[٠-٩]/g,d=>'٠١٢٣٤٥٦٧٨٩'.indexOf(d));}
let currentUser=null, DATA={};
%s
const iranCases=['09121234567','+989121234567','00989121234567','۰۹۱۲۱۲۳۴۵۶۷','9121234567'];
iranCases.forEach(c=>{ok(normalizeIranMobile(c)==='09121234567','iran normalize '+c); ok(!looksInternationalPhone(c),'iran not intl '+c);});
['+14155550123','0044 7700 900123','+49 151 2345678','+971501234567'].forEach(c=>ok(looksInternationalPhone(c),'intl '+c));
['abc','+98123','0912','',null,'+1 23'].forEach(c=>ok(!looksInternationalPhone(c),'not intl '+JSON.stringify(c)));
ok(phoneErrorFor('+14155550123')===INTL_PHONE_MSG,'intl msg');
ok(phoneErrorFor('0912')===PHONE_INVALID_MSG,'invalid msg');
currentUser={email:'09121234567@phone.pelehapp.ir'}; DATA={phoneSkip:{abroad:true}};
ok(!isPhoneOptionalAccount() && !phoneSkipped(),'shadow phone account cannot skip');
currentUser={email:'someone@gmail.com'}; DATA={};
ok(isPhoneOptionalAccount() && !phoneSkipped(),'google account, not skipped yet');
DATA={phoneSkip:{abroad:true}}; ok(phoneSkipped(),'google account skipped');
currentUser=null; ok(!isPhoneOptionalAccount(),'signed out');
// send-otp helpers (TS stripped)
(function(){ %s
  ok(looksInternationalPhone('+14155550123'),'ts intl');
  ok(!looksInternationalPhone('+989121234567'),'ts iran');
  ok(normalizeIranMobile('09121234567')==='09121234567','ts normalize');
})();
document.getElementById('o').textContent=out.join('\\n')+'\\nTOTAL '+out.length+' FAIL '+out.filter(x=>x.startsWith('FAIL')).length;
</script>"""
helpers = src[src.index("const PHONE_INVALID_MSG"):src.index("function onlyDigits")]
page = html % (json.dumps(src), helpers, ts_js)
OUT.write_text(page, encoding="utf-8")
edge = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
r = subprocess.run([edge, "--headless", "--disable-gpu", "--dump-dom", OUT.as_uri()], capture_output=True, text=True, encoding="utf-8")
m = re.search(r"<pre id=\"o\">(.*?)</pre>", r.stdout, re.S)
res = m.group(1) if m else r.stdout[:3000] + r.stderr[:2000]
OUT.with_suffix(".txt").write_text(res, encoding="utf-8")
print(res.encode("ascii", "replace").decode())
