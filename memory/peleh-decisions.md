---
name: peleh-decisions
description: "Business decisions the Peleh founder has confirmed (prizes, premium trial, who sends DMs, Miobook)"
metadata:
  node_type: memory
  type: project
  originSessionId: 061160d8-ceb2-4a4f-a973-f9bc42a14ee4
  modified: 2026-11-11T02:52:07.039Z
---

Confirmed by the user on 2026-10-24:
- **Monthly leaderboard first prize (a book):** Vahid buys it himself and ships it by post or Tipax.
- **«۷ روز پریمیوم رایگان»:** still active, so it may be claimed in posts and the bio.
- **Outreach DMs:** sent from the Peleh page itself (@pelehapp), not from a personal account.
- **Miobook:** ask them to sponsor future prize books. The DM was sent on 2026-10-24.

Confirmed by the user on 2026-10-25:
- **Premium prices:** currently 149,000 to 1,490,000 tomans.
- **Internet shutdown:** if war starts, the international internet is cut immediately. For that case an Iran server and an Iran DNS **have already been set up**.
- **Weekly advisor scan:** every Saturday at 10:00.
- **Outreach:** prepare messages for two cases: (a) page-to-page exchange (تبادل), and (b) bookstores, where Peleh gives their customers free premium and gets books (prizes) in return. Drafts only; nothing is sent without approval.

Confirmed by the user on 2026-10-26:
- **The 30-day growth plan** (`peleh_growth_push_30d.pdf`) and **4–5 Reels a week** are approved.
- **Outreach DMs:** send each text to Vahid first. After he approves it, Claude sends it (Chrome, from @pelehapp). Free premium for partners: 30 days by default, unless Vahid changes it on review.
- **Prize book:** up to 1,000,000 tomans.
  - Shipping: preferably Peleh buys and ships the book itself, and films the buying and shipping as content.
  - If the bookstore is far away and routing the book via Vahid would be slow, the bookstore ships straight to the winner.
- **Bale and Rubika channels:** Vahid creates them himself (2026-10-26).
- **Bio and highlights:** fix them if needed (approved). For pinned posts, tell Vahid which ones and he pins them from his phone.

Known bug, reported 2026-10-26: the web app's phone signup sends the SMS OTP to Iranian numbers only, so Iranians abroad can't sign up. It must be fixed (peleh-dev is investigating). Until it's fixed, never claim "works outside Iran". The founder picked @rangibano for exchange DM #8.

2026-10-26 (later):
- **The 8 outreach DMs are APPROVED.** Sends are scheduled as one-time tasks `peleh-dm-send-5aban`, `-6aban` and `-7aban` (10:30), from the frozen file `outreach_first8_APPROVED_2026-10-26.md`. The rangibano comment 2 needs Vahid's own text (`rangibano_comment2_APPROVED.txt`).
- **Prize model:** today Vahid personally funds 1 book a month. With sponsors: books for the top 3, and premium for 4th place down. **Finding sponsors is the key priority.**

2026-10-26 (evening):
- **Every system change must also be applied to the Iran server.** Vahid reaches it with PuTTY (SSH). Claude must never type passwords or keys. Vahid logs in himself or sets up key auth. Deploys still need his explicit yes.
- **No Cafe Bazaar Android update until the end of Aban 1405** (about 2026-11-21). Bazaar fixes wait.
- **Prize book postage is paid by Peleh,** not the sponsor (2026-10-26).
- The rangibano comment 2 text was supplied by Vahid and saved in `rangibano_comment2_APPROVED.txt`.
- The previous round's winner was «محسن», who received the book «اتاق شماره ۶». The Mehr facts are confirmed (17 participants, winner got the prize). Use his name in public posts only once Vahid confirms Mohsen agreed.
- Sponsor wave-1 texts: Vahid approves them IF the senior advisor approves («اگه مورد تایید مشاور ارشد هست … ارسال کنید»).
- Facts for the sponsor deck: the Telegram channel has 0 members; the Mehr leaderboard had 17 participants; the previous round had a winner.

Confirmed by the user on 2026-10-27:
- **Prize model with a sponsor (settled):** books for the top 3, and places 4 to 10 get the **7-day free premium** that the app already offers — not 30 days. Partners still get 30 days.
- **Claude no longer sends outreach DMs on a schedule.** In an unattended scheduled run the permission layer refuses to type into Instagram's DM and comment boxes (`Real-World Transactions`), so the 5 Aban task sent nothing. `peleh-dm-send-6aban` and `-7aban` were disabled on 2026-10-27. The three sponsor tasks (`peleh-sponsor-dm-9aban`, `-11aban`, `-12aban`) were rewritten the same day into **same-day reminders at 09:30** that only read `sponsor_wave1_APPROVED_2026-10-26.md` and hand Vahid the exact texts plus handles — they send nothing. **Vahid sends every DM himself**, which is how the 5 Aban batch actually went out.
- **The weekly advisor scan stays automatic** (`peleh-weekly-bizdev-scan`, Saturdays ~10:10). It is unaffected, since it only researches and writes a file.
- **Saturday on-camera Reel (D015):** Vahid films it himself if he has time and sends the footage; if he runs out of time he tells Claude to build a faceless D015 instead.

2026-10-31 (Vahid, final for this phase):
- **Vahid sends ALL DMs himself** (sponsor and collab), and posts ALL content himself: Instagram, Threads, Bale, Rubika.
  - Claude only prepares the files and texts and sends them to him.
  - No Chrome DM sending and no Metricool uploads unless he asks again.
  - The auto DM tasks for 11 and 12 Aban are disabled.
- Reel ideas and hooks are approved whenever the senior advisor approves them. This includes the 2 question hooks for 9–15 Aban and the «سؤال، بعد جواب» mini-series.
- The book club that replied «بررسی می‌کنیم» is **@rayhan.bookclub (بوک‌کلاب ریحان)**. The follow-up text is `peleh_work/outreach/collab_followup_rayhan_2026-11-04.md` (PDF sent), for Vahid to send on 13 Aban.
- **Threads (Vahid 2026-11-04):** cut to **3 posts/week, all book questions in the «بدون تعارف:» format about the reader's own book**. Drop «صادقانه بگو» self-help questions, «وقت ندارم» and promo posts.
  - Why (Metricool, 30 days): the median post fell from ~1100 to ~520 views. Book «بدون تعارف» posts get 1.9–3k views and 120–235 replies; self-help ones get 250–520.
  - Threads has ~68 followers (+11 in 2 weeks) and shows no evidence of sending follows to IG/app.
  - Spend effort replying to replies.
  - Stop rule: if there is still no IG follow from Threads by end of Aban, go down to 2/week.
- **Khoob's 3 Azar prize titles (received 2026-11-04):**
  - «داستان کاهو» (Murakami, translated by Mobina Shahriari)
  - «غریبه‌ها: روایتی از فروپاشی یک ازدواج» (Belle Burden, translated by Yalda Alaei)
  - «آشپزخانه‌ی کرملین» (Witold Szabłowski, translated by Zeinab Kazemkhah)

  All three are new releases. The reply txt asks for their logo/handle; the address goes separately; books are due by 20 Azar.
- **Lam app props from Vahid's renders** (scarf/dumbbell/volleyball/yoga) are live in the beta: GitHub upload + deploy on 2026-11-04.
- **Plus («سلامت پلاس») goes paid from 1 Azar 1405 (Vahid, 2026-11-08).** He flips the admin flags himself on 1 Azar: plus_require_entitlement, plus_payments_enabled (Zibal, web), plus_bazaar_enabled (Bazaar).
  - The Bazaar build must show the Plus purchase via Bazaar IAB now, so the Bazaar reviewer can see and test it.
  - Copy: «تا ۱ آذر رایگانه».
  - **APPLIED 2026-11-08 with Vahid's yes:** migration `plus_grant_from_1azar`. Setting `plus_paid_from` = 2026-11-22T00:00+03:30; plus_grant_from_payment starts from greatest(now, plus_paid_from, current expiry). A purchase today expires 1 Dey 00:00 Tehran. Rollback is in `peleh_work/dev/batch_2026-11-08/supabase/2026-11-08_plus_grant_from_1azar.sql`. Keep `PLUS_COUNT_FROM_LAUNCH = true` in plus-workout.js.
  - SKU peleh_plus_monthly = 5,000,000 rial.
- **Khoob prize split (Vahid, 2026-11-07):** نشر خوب gives 3 books in total; places 1, 2 and 3 get ONE book each — never word it as if each winner gets three. Use «نفر اول تا سوم، هر نفر یک کتاب».
  - **Ranks 4–10 in sponsored months = 7 days Premium (Vahid confirmed 2026-11-11; applied server-side via migration `sponsor_ranks_4_10_premium7`).**
  - **App UI is frozen for Azar (Vahid 2026-11-11):** no new Bazaar update until after the Azar challenge, and no visual change to the app. Fix things server-side only (DB, edge functions, settings). The in-app leaderboard footnote still says "badge" for ranks 4–10; that's accepted.
  - **Sponsored months, applied 2026-11-08 with Vahid's yes:** migration `sponsor_book_top3`. Setting `book_prize_months` = '1405-09'. In a listed month, ranks 1–3 get prize 'book'; other months stay 1 book / 2 Premium 30d / 3 badge. The client card is `CHALLENGE_SPONSORS` in books.js (logo and covers in `sponsors/`), in the web batch and Android 2.5.0. For a new sponsor month, add it to BOTH. Rollback: set the value to ''.
- **ElevenLabs (2026-11-07):** Vahid approved Claude generating narrations (Sara RBEKbcQ62sKk2tsmPsAU, eleven_v4) via the ElevenLabs connector. Generation works, but downloading the MP3s fails from this network (403 on elevenlabsusercontent.com and elevenlabs.io, even in Chrome) unless a VPN is on; the free tier also refuses parallel takes ("free generations are busy").
- **First sponsor YES (2026-11-03 / 12 Aban): نشر خوب @khoobpub.**
  - They send 3 books (winners can't choose from their list). Vahid asked for 3 different titles.
  - They asked whether Peleh sells books. The advisor's reply (sent as txt `peleh_copy_texts/khoob_reply_12aban.txt`) says no.
  - Next steps: 3 titles by 25 Aban; books shipped to Vahid by 20 Azar (address sent separately); their logo or handle for the leaderboard/post; an optional 30-day premium gift code.
  - Vahid promised them a short executive summary by 13 Aban.
- **Email-account login gap (found 2026-11-03, PARKED by Vahid):**
  - Cause: `EMAIL_AUTH_ENABLED = false` in app.js hides the «ورود با ایمیل» link, so legacy email+password users can't log in. Example: user mohsenraei63@mailfa.com, created 2026-08-24, provider email, no phone.
  - The Android app needs a Bazaar update to show the fix.
  - Options without an update: link the user's verified_phone on their profile (verify-otp finds the account by verified_phone), or change their email to a Gmail for Google login.
  - Vahid said to leave it for now. Re-raise for the end-of-Aban Bazaar update: always show the email sign-in link and keep email signup off.
- **Retention (2026-11-03).** Admin funnel: 132 signups, 93% finish onboarding, 38% create a habit, 20% tick once, 42% return on a later day, 2% (3 people) active in the last 7 days, 27% have reminders on.
  - Advisor memo: `peleh_retention_2026-11-03.pdf` (source `peleh_work/bizdev/retention_funnel_2026-11-03.md`).
  - Top actions:
    1. Cohort D1/D3/D7 tracking, with "active" defined as ≥1 tick.
    2. First tick inside onboarding in under 60 s.
    3. Test push delivery, then reminders on by default at 21:30.
    4. A return card «امروز فقط یه پله» for people who come back without ticking.
    5. A calm win-back push plus a Bale/Rubika post to the inactive users after 2 and 4 ship; no SMS by default.
  - Items 2–4 can ship on web now; Android waits for the end-of-Aban update.
  - Vahid decided on 2026-11-03:
    - exercise demos come from free-exercise-db
    - high BMI shows a neutral clinical body silhouette (no Lam, no "چاق" label, no red, opt-in, with a note that BMI ignores muscle)
- **DEPLOYED 2026-11-04 (Vahid's yes):** Supabase edge function `send-fixed-reminders` **v7**, the beta-gated version with a NULL-safe legacy filter. Source: `peleh_work/dev/batch_2026-11-03/deploy_beta/2_edge_function/`.
  - Cron calls return 200.
  - Non-beta users keep the v6 17:00/21:00 broadcast. Vahid gets reminders at his chosen slot (evening 18:30) only if he hasn't ticked.
  - Rollback: `deploy_beta/rollback/edge_function/` (v6).
  - **Beta web files LIVE 2026-11-04.**
    - Vahid uploaded the 121 files to GitHub (repo vahiddorpa22-byte/peleh-web, 3 commits "beta: …") and ran `/root/deploy-peleh.sh` on the Iran server.
    - That server is the only web host: /var/www/app.pelehapp.ir is a git checkout, and the script just runs `git pull` for app.pelehapp.ir and pelehapp.ir.
    - HTTPS check: all files match byte-for-byte; app.js/coach-plus.js/css/books/health are unchanged vs the old live.
    - The public login page loads; the only 404 is the old peleh-keys.js.
    - Server backup: /root/peleh-web-backup-2026-11-04-0248.tgz.
  - **Deploy method for the future:** upload to GitHub via the web UI (100 files max per upload), then run `/root/deploy-peleh.sh`. Never scp straight into the checkout.
  - Security TODO: SQL migrations, supabase/, READMEs and nginx-security-headers.conf are publicly downloadable from the web root; fix with nginx deny rules.
- **BETA GATE (Vahid 2026-11-03):** implement ALL new app items (bug fixes F/E/D, retention A1–A4, Lam in app, sport-Lam, exercise demos, BMI silhouette), but ACTIVE ONLY for his account vahid.dorpa22@gmail.com (user id 295bf792-5f7e-495c-b933-4bdd6739d9ab). No other account until he says so. Server reminder change gated the same way; others keep the current behaviour. He has an updated iPhone with the web app on the Home Screen and notifications enabled (test device).
  - BUILT LOCALLY 2026-11-03 (not deployed): `peleh_work/dev/batch_2026-11-03/patched_beta/` + upload bundle `deploy_beta/` (CHECKLIST + rollback), PDF `peleh_beta_batch_2026-11-03.pdf`. Live app.js/coach-plus.js/css untouched; new peleh-beta-gate.js (flip `PELEH_BETA_ALL`), peleh-beta.js/.css, coach-beta.js, admin-cohort.js, lam/, exercise-demos/; edge fn gated by BETA_USER_IDS. Normal user verified hash-identical to live.
  - Hosting: app.pelehapp.ir = same Ubuntu/nginx box as api (79.127.54.32, Arvan DNS, proxy off) → web upload = Iran server; only Vahid can upload (SFTP); Claude may deploy the Supabase function only with his yes.
- **App work batch (Vahid 2026-11-03: add everything). Advisor's order:**
  - On web now: F PWA push bug → A1 cohort/active definition in admin → E task-text overflow → D coach custom-exercise edit → A2 first tick in onboarding → A3 push test + default 21:30 reminder → A4 return card.
  - End-of-Aban Bazaar package (code freeze ~24 Aban): the above + B Lam onboarding/«کتاب لَم» 3 levels → G 30 exercise demos → C BMI silhouette (may slip to the next release).
  - Sport-Lam (H): YES.
    - Sport accessory = identity picked in onboarding, changeable, ground/hand slot only (ball under foot, dumbbell in hand).
    - Reading accessories = earned head/face/chest slots.
    - First sports (estimate): football/futsal, gym, walking/running (running shoes, no headband), volleyball, yoga/home workout, plus "none".
    - No team kits/logos; neutral balls.
  - F/E/D are FIXED LOCALLY (2026-11-03) in `peleh_work/dev/batch_2026-11-03/patched/` (sw cache `peleh-v25b`; whichever of this and the SMS fix ships second → `peleh-v26`). Report: `peleh_bugfix_batch_2026-11-03.pdf`. NOT deployed; waiting for Vahid's yes (web + Iran server).
    - Push root cause: the live server sends a 17:00/21:00 broadcast to everyone, even "off" users, and ignores the chosen time. `send-push` has no cron. Subscribe failures were silent.
    - The new `send-fixed-reminders` sends at the chosen time only if nothing was ticked today.
    - The private VAPID key sits in a code comment in `send-push`; remove it on deploy.
    - `peleh-keys.js` 404s on live, which broke offline caching.
    - The Android app bundles the web files, so client fixes reach Bazaar users only via an update.
- The pin swap is done: «۵۰ صفحه نه، فقط ۱۰ دقیقه» replaces «۵ صبح».

**Why:** these were open «نیازمند تأیید» items that blocked content claims.
**How to apply:** treat them as settled. Other prize details still need a check before announcing: anti-cheat is off, so review the top 5 in the admin panel first. See [[peleh-status]].

- 2026-11-16: No engagement pods. Vahid stopped sending posts to / engaging with the DM group «گروه تعاملات برای رشد پیج ها» (~15 unrelated small businesses). Why: wrong-audience signals, inauthentic-engagement risk, distorts our data. Only book-related partners for mutual engagement.
- 2026-11-16: Free/public-domain books in the app = PAUSED. Revisit mid-Azar 1405 (~2026-12-05) only if the page has grown; then DM publishers for free first chapters / sponsorship. Legal notes if resumed: Iran copyright = author life+50 (since 1389); translations protected too; avoid banned Hedayat titles; source texts from free editions (Wikisource).
