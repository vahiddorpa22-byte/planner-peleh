---
name: peleh-lam-lipsync
description: "Lam episodes must have real face-kit lip-sync (eyes, brows, mouth per phoneme); how to apply the kit to a new pose"
metadata:
  node_type: memory
  type: feedback
  originSessionId: d2fe4aa1-7c0e-4c3e-bea6-c5c79bbefd4e
  modified: 2026-11-11T04:26:06.536Z
---

Vahid rejected Lam ep2 v1 (2026-11-11). It used his new Flow still with its baked face, so Lam's lips didn't move. His words: «اصلا قابل قبول نیست… مخاطب باهاش ارتباط برقرار نمی‌کنه». Every Lam episode needs precise lip-sync, eyes and brows from the face kit in the Lam sheet, at a "super professional animation" level.

**Why:** Lam is the best-performing format (ep1 got 2,011 views). A dead face breaks the connection with the audience.

**How to apply:**
- For a new pose, first remove the baked face. Use `mascot/sheet_v2/src/ep2_faceless.py`: quarter-scale inpaint plus a cubic surface fitted on the face plane, then procedural clay grain.
- Draw the kit with `lam_facekit` (`K.face` for eyes and brows, `K.mouth` for the 10 visemes). Use the eye, brow and mouth anchors measured on that render.
- Time the visemes phoneme by phoneme from a 10 ms energy map plus whisper word timestamps. Don't rely on the energy-and-centroid guess alone.
- Lam never speaks over a Flow clip, because its face is baked. Use clips only for silent action.
- Template: `ep2_assemble_v2.py`. Check full-resolution face crops before sending.

Related: [[peleh-mascot-lam]].
