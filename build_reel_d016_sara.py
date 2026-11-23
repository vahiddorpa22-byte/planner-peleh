"""D016 re-voiced with ElevenLabs "Sara - Neutral Persian Female" (Tehrani). Same visuals/music/SFX as build_reel_d016.py;
only the narration take and its chunk timings change. Usage: python build_reel_d016_sara.py"""
import build_reel_d016 as D

B = D.B
c = dict(B.CFG["d016"])
c.update(
    name="peleh_D016_gooshi_bidalil_sara.mp4",
    narration="narration_sara_take1.mp3",
    # silencedetect -35 dB, d=0.12 on the Sara take (same 9 phrases)
    chunks=[(0.0, 2.45), (2.67, 3.52), (3.90, 4.68), (5.20, 5.53), (5.99, 6.67),
            (7.01, 8.34), (8.74, 10.33), (10.64, 12.19), (12.55, 14.53)],
)
B.CFG["d016_sara"] = c

if __name__ == "__main__":
    B.build("d016_sara")
