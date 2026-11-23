---
name: peleh-copy-text-format
description: "Copy-ready texts (DMs, captions, Threads) must go to Vahid as plain .txt, not PDF — Persian copied from our PDFs scrambles"
metadata:
  node_type: memory
  type: feedback
  originSessionId: 63001156-4509-4dc8-860a-376aa2532722
  modified: 2026-10-31T10:16:57.905Z
---

On 2026-10-31 Vahid said Persian text copied from the PDFs (md_to_pdf.py, Edge print) comes out scrambled, so he couldn't copy the sponsor DMs, Threads posts or the Rayhan follow-up.

**Why:** Edge's PDF text layer breaks Persian shaping/order on copy.
**How to apply:** keep PDFs for reading/plans, but always also send every text he must paste (DMs, captions, pinned/first comments, sticker text, Threads, Bale/Rubika lines, reply templates) as a plain UTF-8 (BOM) .txt in `peleh_copy_texts/`, one block per text with a "▼ label" line and "────────────" separators. Example: `peleh_copy_texts/reel_11aban_doshanbe.txt`. Related: [[peleh-content-preferences]].
