"""D016 final: Vahid's own narration (ElevenLabs Sara v4), used exactly as delivered (tempo 1.0, original pauses kept;
only the lead-in/tail silence is trimmed). Same visuals/music/SFX as build_reel_d016.py, overlays re-timed to the take.
Usage: python build_reel_d016_final.py"""
import build_reel_d016 as D

B = D.B
# speech chunks from silencedetect -35 dB d=0.12 (chunk 3 merges a 0.13 s micro-pause inside «فقط...»)
chunks = [(0.13, 2.74), (3.54, 4.76), (5.41, 6.30), (6.88, 7.59), (8.26, 8.96),
          (9.79, 10.83), (11.43, 13.34), (13.76, 15.18), (15.63, 17.47)]
PAD = 0.03  # build_reels_7_8aban pads each chunk by 0.03 s; gaps below restore the original pauses exactly
gaps = [round(chunks[i + 1][0] - chunks[i][1] - 2 * PAD, 3) for i in range(len(chunks) - 1)] + [0.0]

c = dict(B.CFG["d016"])
segs = list(c["segs"])
# three pick-up beats spread evenly over the longer hook line (chunk 1 starts at ~3.41 s)
beat = [("t0.57", 1), ("t1.14", 2), ("t1.71", 2), ("t2.28", 3), ("t2.85", 3)]
for k, (t, n) in enumerate(beat, start=1):
    ci, kind, src, p, _ = segs[k]
    segs[k] = (t, kind, src, p, [D.hook(n)])
c.update(
    name="peleh_D016_gooshi_bidalil_final.mp4",
    narration="narration_vahid_sara_v4.mp3", tempo=1.0,
    chunks=chunks, gaps=gaps, segs=segs, tail=0.6, loop=0.5,
    sfx=[("tick", 0.03, 0.35), ("thud", 0.6, 0.45), ("tick", 1.17, 0.35), ("thud", 1.74, 0.45),
         ("tick", 2.31, 0.35), ("thud", 2.88, 0.5), ("whoosh", "c1", 0.25), ("tick", "c4", 0.3),
         ("pop", "c5", 0.35), ("whoosh", "c6", 0.28), ("tick", "c7", 0.25), ("tick", "c8", 0.25)],
)
B.CFG["d016_final"] = c

if __name__ == "__main__":
    B.build("d016_final")
