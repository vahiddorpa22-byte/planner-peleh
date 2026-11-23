---
name: peleh-content-preferences
description: "How the Peleh founder wants content made — no on-camera, rich designs, baked-in audio, work via sub-teams, replies in Persian"
metadata:
  node_type: memory
  type: feedback
  originSessionId: 061160d8-ceb2-4a4f-a973-f9bc42a14ee4
  modified: 2026-10-26T02:45:06.701Z
---

- **Default: no one on camera.** Reels use free stock footage (Magnific), screen recordings, kinetic text and hands-only shots.
- **Exception, from 2026-10-24:** a 4-week test of founder-on-camera Reels, 2 per week. The first two are D015 and D017 (9 and 11 Aban), in peleh_on_camera_9-15_aban.md.
  - Every personal line must be true, so offer A/B lines where unsure.
  - Decision rule: scale up on-camera Reels if follows per 1k reach and 3-second hold beat faceless by 20% or more.
- **Every Reel needs narration, music and SFX baked into the file.** The user called a silent Reel "too raw". Some viewers can't hear music added from Instagram's in-app library, so never rely on in-app music.
- **Stories must be highly attractive, not plain.** The user rejected the simple text-on-colour frames. Use the graphics sub-team's template: real photos, depth, and a 5-second motion MP4. Leave sticker zones empty, with no placeholder words.
- **Reel covers must match the page's existing cover template exactly**, so the grid stays uniform. The template:
  - solid navy #1B2A4A background
  - line 1 in cream #F2EAD3, line 2 in gold #C99A3C, both ~128px Vazirmatn bold
  - a smaller gold subline, usually «جوابش تو این ویدیو»
  - a short gold rule
  - the app icon in a rounded box, with «پله» under it
  - Built by `peleh_work/build_reel_cover.py`. The user rejected a custom cover on 2026-10-24.
  - **From 2026-10-26 (approved):** same template plus a small real scene photo from the Reel (gold-bordered box between the subline and the logo). Pass `--photo IMG` or `--video MP4 --at S` (optional `--size` for long hooks). Without them the old text-only layout renders unchanged. Carousels keep their own 1080x1350 cover style.
- **Route work through the units:** the scenario team writes and revises scripts, then the graphics/editing team produces them.
- **Delivery:** the user uploads Stories and Reels themselves. Send the files in chat plus the exact copy (caption, pinned comment, Threads text) and a posting schedule.
- **Documents go out as PDF, not .md.** The user reads on their phone, where .md files don't open. Use `peleh_work/md_to_pdf.py` (RTL, Vazirmatn, brand colours) and combine related docs into one PDF.
- **Language:** chat in Persian. All audience-facing copy is Persian.

**Why:** stated directly by the user on 2026-10-24 after seeing first drafts.
**How to apply:** default to these for every Peleh content piece. Related: [[peleh-resources]].
