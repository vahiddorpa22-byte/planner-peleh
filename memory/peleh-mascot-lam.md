---
name: peleh-mascot-lam
description: "Peleh's brand mascot — navy staircase designer-toy character, renamed from «پِلَک» to «لَم» (advisor-approved 2026-11-02)"
metadata:
  node_type: memory
  type: project
  originSessionId: 63001156-4509-4dc8-860a-376aa2532722
  modified: 2026-11-03T09:31:26.536Z
---

On 2026-11-02 Vahid shared a 3D mascot (brief + `C:\Users\dorpa.SHAHIN\Downloads\pelak-animation-method.md`): navy 4-step staircase body, cream half-lidded sarcastic eyes, brown brows, cream/gold sneakers; palette #1B2A4A / #C9A227 / #F3F0E8; matte clay designer-toy finish. Personality: smart, witty, lazy, sarcastic, always has a "logical" excuse («از فردا شروع می‌کنم»). Planned series: 10–20 s comedic Reels where he argues with an inner "logical voice". He wanted to rename it from «پِلَک» to «لَم»; the senior advisor approved, with conditions:
- Always write «لَم» with the fatha (otherwise it reads «لِم»). The first caption says «لَم (از لم دادن)».
- Series «بهانه‌های لَم», hashtags #بهانه_های_لم #لم_پله; #لم alone is noise.
- No separate account; keep everything on @pelehapp.
- Arc: a relatable anti-hero who climbs one of his own steps every few episodes. Endings stay calm.
- The character sheet is the ONLY reference for new images, never the profile render.
- Suggested intro Reel: «من لَم‌ام. از فردا شروع می‌کنم.» Decide on continuing after ~4 episodes, using Friday Insights.

Existing animation method: a 2.5D Python/OpenCV warp + energy-based lip-sync from an ElevenLabs MP3 (described in that .md); its upgrade path is a layered rig or image-to-video tools.

The series bible is `peleh_work/mascot/bahanehaye_lam_series_bible.md` (`peleh_bahanehaye_lam.pdf`), approved by the advisor on 2026-11-02 with a strict respect rule: the sarcasm targets only Lam, never "تو".

**Advisor's verdict on having a mascot at all (2026-11-02): yes, but as a TEST, not the page's main format.**
- Merge it with the winning format: Lam gives the excuse, then asks «تو هم این بهانه رو داری؟», then Peleh offers a tiny step.
- 4 episodes alongside the current plan, not replacing the question Reels: 2 in 17–22 Aban (after the Friday Insights), 1 in Book Week only if ready by 20 Aban, 1 in 1–7 Azar.
- Bad lip-sync is worse than none; fall back to a still character with a few expressions plus subtitles.
- KPI: 3-s hold ≥40% and follows/1k views at least the question-Reel median.
- Kill rule: if 3 of 4 episodes have <35% hold and ~1 follow, Lam stays only in the app (onboarding, empty states).

Vahid's decisions on 2026-11-02:
- One gold step lights up per episode and resets in the next one; it is not cumulative.
- Test episodes 0–3 are approved.

Character-sheet "P1 lock pack" (advisor spec `peleh_work/mascot/character_sheet_spec.md`):
- The graphics team builds the grid, vector face kit, visemes, gold-step effect and sheet pages in `peleh_work/mascot/sheet_v2/`.
- DONE 2026-11-02 in `peleh_work/mascot/sheet_v2/` (scripts in `src/`):
  - face kit: SVG/PNG, 10 expressions, 20 visemes
  - style test: vector face on Vahid's renders; works at phone size; lids and eye-white falloff need ~1 h polish
  - gold-step effect `src/gold_step.py`
  - 14-page sheet `pages/lam_sheet_v2_P1.pdf`
  - Recommended form lock: "v2-R" with R3c as master. 4 equal step heights; step 1 is a wide face wall, 3 narrow steps; width:height ≥0.85. **LOCKED by Vahid on 2026-11-02**; the spec's 8:7 is obsolete.
- Vahid's renders are in `peleh_work/mascot/renders_vahid/` (R1, R3a, R3b, R3c, R4). R2 (3/4 view) is still missing.
- Vahid renders R1, R3a and R4 first, then R3b and R3c, in his own tool. R2 (3/4 view) arrived on 2026-11-02.
- **Story plan (advisor; Vahid approved 2026-11-02):** no Lam Stories during the 11–15 Aban series.
  - Sat 16 Aban: one Story without Lam's name, question sticker «بهانه‌ی همیشگی‌ت برای شروع‌نکردن چیه؟». It collects real excuses for episodes.
  - Sun 17: a silhouette teaser, only if the Friday stats are good.
  - No name or face reveal before episode 0 (~18 Aban).
  - KPI: ≥5 sticker replies; under 3 means it's too early for Lam.
- **Episode 1 BUILT 2026-11-02:** `peleh_work/mascot/ep1/lam_ep1_final.mp4` (22.9 s), `cover_lam_ep1.png`, caption `peleh_copy_texts/lam_ep1_caption.txt`; build script `sheet_v2/src/ep1_assemble.py`.
  - Voices: Danesh (Lam) + Sara (Peleh), v4, made by Vahid from `lam_ep1_narration_v4.txt`, which uses English tone tags in [].
  - Lip-sync uses the energy fallback, since Rhubarb isn't installed.
  - The Flow page-turn shot has round eyes, a visible cut.
  - Gold glaze on step 1, face untinted.
  - Publish only after the Friday 15 Aban Insights.
- **Lam in the app (advisor, 2026-11-03; Vahid hasn't decided):**
  - Ideas:
    - Onboarding and empty states: YES.
    - BMI «fat Lam»: NO, it's body-shaming. Lam reacts only to logging consistency; the BMI section stays neutral.
    - AI suggestions in Lam's voice: only with changes. Lam says one pre-written confession line from a ~50-line bank; the AI text appears only under «پله می‌گه»; no medical advice in his voice.
    - «کتاب لَم» progression: YES, the highest impact. L1 = 7 log days or 50 pages → glasses; L2 → scarf; L3 = challenge done → chest badge; L4 = 2 challenges → hat, all 4 steps lit. In-app steps stay lit, unlike the IG reset.
  - Animation: CSS layers or animated WebP; not GIF, not Lottie.
  - MVP: onboarding + 3 levels, ~4–6 days. It doesn't depend on the Instagram test.
  - Vahid said Android changes need a Bazaar update, so this goes in the end-of-Aban update.
- **Exercise demos (advisor, 2026-11-03):**
  - Use free-exercise-db (yuhonas, Unlicense; 800+ moves, each with 2 JPG frames) as a CSS 2-frame loop. First phase: 30 moves with Persian cues and a safety note.
  - Fallback: wger, which is CC-BY-SA and needs attribution.
  - Not usable: ExerciseDB (subscription-only licence, no storing, sanctions) and MuscleWiki (no rehosting).
  - Lam is not used to demonstrate exercise form.
  - Phase 2: custom vector or Google Flow loops as MP4/WebM.
- **Production method (Vahid, 2026-11-02):**
  - Claude's side: one render per scene, the vector face kit, and a simple arm cut-out rig.
  - Vahid's side: short motion clips he makes himself in Google Flow ("omni", 50 free credits/day) from start frames + prompts Claude writes.
  - He also generates both voices: Lam is a young playful male voice, Peleh is Sara on v4.
  - Episode 1 is built now and published only after the Friday Insights. Its pack is `peleh_copy_texts/lam_ep1_pack.txt`. He uses the ready prompts in `peleh_copy_texts/lam_render_prompts.txt` and attaches ONLY `lam_character_sheet_v1.jpg`. Related: [[peleh-data-first-reels]], [[peleh-content-preferences]].
