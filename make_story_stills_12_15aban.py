"""Real stills for the 12/14/15 Aban Stories, all from the new Magnific clips (no overlay text).
Writes stories_v2/assets/: m02_phone_wood_farda.jpg, m08_notebook_pen.jpg, m07_tea_hands.jpg
"""
import build_reels_12_15aban as R

A = R.W / "stories_v2" / "assets"
b = R.W / "reel_d017" / "_build"
b.mkdir(parents=True, exist_ok=True)

scr = R.screen_png("<div style='font-size:52px;font-weight:700;opacity:.8'>فردا</div>"
                   "<div style='font-size:230px;font-weight:900;color:#F0B847;line-height:1.1'>؟</div>",
                   b / "screen_story.png")
tmp = b / "story_phone.mp4"
R.seg_gs(R.PHONE, dict(ss=6.0, z0=1.0, screen=scr), 0.5, [], tmp)
R.B.run(["-i", str(tmp), "-frames:v", "1", "-q:v", "2", str(A / "m02_phone_wood_farda.jpg")])
R.B.run(["-ss", "1.25", "-i", str(R.WRITE), "-frames:v", "1", "-q:v", "2", str(A / "m08_notebook_pen.jpg")])
R.B.run(["-ss", "1.0", "-i", str(R.MAG / "m07_tea_hands_v_5583255.mp4"), "-frames:v", "1", "-q:v", "2",
         str(A / "m07_tea_hands.jpg")])
print("ok")
