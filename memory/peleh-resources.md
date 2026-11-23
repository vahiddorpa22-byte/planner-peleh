---
name: peleh-resources
description: "Where Peleh's files, accounts and tools are (Excel calendar, app zip, Metricool brand, Supabase, ElevenLabs limits, build scripts)"
metadata:
  node_type: memory
  type: reference
  originSessionId: 061160d8-ceb2-4a4f-a973-f9bc42a14ee4
  modified: 2026-11-14T15:36:14.017Z
---

**Files:**
- Content calendar: `C:\Users\dorpa.SHAHIN\Desktop\peleh_instagram_calendar_v2.1.xlsx`. It covers 186 days, 2026-10-17 to 2027-04-20 (25 Mehr 1405 to 31 Farvardin 1406). The full plan JSON (features F01–F12, series, approvals) is embedded in the `_plan` sheet.
- App source: `C:\Users\dorpa.SHAHIN\Downloads\peleh-v2_4_3-failover_2026-10-22_10-57.zip`. It contains the web, Android (Bazaar) and server builds, books.js, the Vazirmatn font and the icons.

**Scheduling posts:**
- Since 2026-10-26, Chrome is logged in to Metricool web (app.metricool.com). Vahid asked Claude to schedule posts.
- Free plan: 20 posts a month.
- Reels with media: open Planning → Create post in Chrome, set the type to Reel, then upload the local file. The page's file input only appears after a `HTMLInputElement.prototype.click` override; then use `file_upload`. Upload the cover via the thumbnail menu → Upload video thumbnail, add the first comment, set the time, and click Schedule.
- Text-only Threads posts go through the Metricool API `createScheduledPost` (provider threads).
- The pinned comment must still be pinned by hand.
- Instagram can't be reached through Meta Business Suite (it isn't linked).

**Accounts and tools:**
- **Metricool:** brand "pelehapp", brandId 7538990, timezone Asia/Tehran. Instagram and Threads are connected. Use it for analytics and for scheduling "for review".
- **Supabase:** project "peleh", id gzcwtrqysjedwdfmhbzx. Storage holds no brand assets.
- **GitHub:** no CLI or connector on this machine.
- **Claude in Chrome:** logged in as @pelehapp on Instagram/Threads. Instagram web cannot pin posts.
- **ElevenLabs:**
  - The connector kept returning 429 on 2026-10-24.
  - The web app in the user's Chrome works, but it is on the Free plan: music downloads need a paid plan, and the commercial licence for speech is unverified.
  - 2026-11-14 route that works: Chrome tab elevenlabs.io/app/speech-synthesis/text-to-speech, voice «Sara - Neutral Persian Female» (Explore → search Sara), model Eleven v4; type text, Generate (2 takes), click each take's download icon → `%USERPROFILE%\Downloads\ElevenLabs_*.mp3` (downloads worked, no VPN). ~8,200 credits left after T4/T5/R13. Vahid (2026-11-14) told Claude to make narrations itself in this account. Pick takes with `scratchpad/check_takes.py`-style whisper transcripts.
  - Voice (2026-10-31): Vahid said Connery (4D8rX5FMrycxXbF6iW0I) sounded Afghan on D016, and Sara (RBEKbcQ62sKk2tsmPsAU) on eleven_multilingual_v2 sounded Indian. He then made the narration himself in ElevenLabs (Sara, **eleven_v4**) from Claude's script with pauses/intonation marks (`peleh_copy_texts/narration_11aban_doshanbe.txt`), and D016 was rebuilt on his file. Default: give Vahid a marked-up narration script (pauses ↗↘, emphasis, timings) and build on the audio he returns; if Claude generates, use Sara on eleven_v4, never multilingual_v2. He accepted Connery on D017–D019.
- **Paid generation:** Magnific and Krea both have 0 credits.
- **Free Magnific stock videos via the MCP (verified 2026-10-31):** `stock_search` (license free) + `stock_download` type video return a 1080p download URL with balance still 0, even though creditCost shows 150. Vahid wants NEW Magnific footage each week (2026-10-31: last week's visuals were repetitive). New clips go in `peleh_work/stock/magnific_2026-11/` with a LICENSE_LOG.md.
- **Music:** Pixabay Music (free for commercial use) is the source.

**Telegram bot (2026-11-09):** telegram-bot v5 is live; the source is `peleh_work/dev/telegram_bot_v5/`, and the browser test page is `harness_browser/` (served via launch config `pelehbot-v5-tests`; no Node or Deno on this PC). On disk, `temp_fallback.ts` is empty on purpose. A redeploy must carry the server's copy of that file unchanged (from get_edge_function) until Vahid rotates the token. Never write it to disk or chat. Post types in tg_schedule are checkin/post/summary/discussion/poll/poll_result. The 23:50 nightly table is sent via postSummaryOnce with dedupe key `circle:<date>`.

**Project folder (since 2026-10-24):** `D:\me\khodam\my page\peleh`. It holds `peleh_week_2-8_aban.md` and `peleh_work/` (Reels, Stories, audio, stock, scripts).

**Build scripts** (in `peleh_work/`):
- `build_reel_d009.py`: Edge headless renders Persian overlays, ffmpeg composites and mixes the audio.
- `build_stories_d008.py` and `stories_v2/build_stories_v2.py`: the Story template.
- ffmpeg comes from the imageio-ffmpeg pip package.

Re-check that files exist before relying on them.
