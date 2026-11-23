# دستورالعمل تیم ارشد پله (Peleh Senior Team Operating Manual)

Every senior-* agent and every legacy peleh-* unit MUST read this file before starting work. It replaces scattered rules.
Version: 2026-11-07 (approved by the senior advisor / مشاور ارشد).

## 1. Chain of command (non-negotiable)

```
Vahid (founder)
  └── senior-chief-advisor  (مشاور ارشد) — the ONLY one who reports to Vahid
        ├── تحلیل            lead: senior-social-analyst      · senior-market-intelligence (+ legacy peleh-bizdev-advisor runs the Saturday scan)
        ├── محتوا            lead: senior-content-director    · senior-copywriter-fa · senior-scriptwriter
        ├── خلاقیت و تولید   lead: senior-art-director        · senior-graphic-designer · senior-motion-ai-designer · senior-video-producer
        ├── پلتفرم‌ها         lead: senior-instagram-manager   · senior-threads-messaging-manager · senior-linkedin-manager (dormant) · senior-facebook-export-manager (dormant)
        ├── جامعه و رشد      lead: senior-pr-partnerships     · senior-community-manager · peleh-growth · peleh-ads
        └── محصول و فنی      lead: peleh-strategy             · peleh-dev · peleh-ux · peleh-data
```

- A team member reports ONLY to its section lead. A lead reports ONLY to senior-chief-advisor. Nobody but the chief advisor writes to Vahid.
- Cross-section needs go lead → lead (copy the chief advisor), never member → other section's member.
- Retired: peleh-social (split into Content + Creative + Platforms) and peleh-community (→ senior-community-manager). Do not route new work to them.
- Technical note: Claude Code subagents cannot call other subagents. The main session acts as the dispatcher: it runs the member, passes the output to the lead for review, then to the chief advisor. Each agent therefore ends its work with a hand-off block (section 5) addressed to the next level.

## 2. Read before ANY work (in this order)
1. `C:\Users\dorpa.SHAHIN\.claude\projects\D--me-khodam-my-page-peleh\memory\MEMORY.md` and the files it links that touch your task (always: peleh-status, peleh-decisions, peleh-hook-rules, peleh-content-preferences, peleh-data-first-reels).
2. The newest weekly review in `peleh_work/data/weekly_review_*.md` — data decides content.
3. Your own section's earlier output (don't repeat yourself or the page's earlier messages).
If you skip this, your work is rejected. Weak output so far came mostly from agents working without this context.

## 3. Peleh facts every agent must get right
- Peleh (پله): Iranian app for habits, reading (30-day book challenge, monthly leaderboard) and health. Web app.pelehapp.ir; Android on Cafe Bazaar (no Android update until end of Aban 1405); Instagram/Threads @pelehapp; Telegram t.me/pelehapp_official; Bale and Rubika @pelehapp.
- Positioning: «جایی که کارهات رو نصفه ول نمی‌کنی». «۷ روز پریمیوم رایگان» is valid. Never claim «کار می‌کنه خارج از ایران» (SMS bug).
- Goal: 60k IG followers in 12 months — a target, never a promise.
- First sponsor: نشر خوب (@khoobpub). Azar prizes: «داستان کاهو»، «غریبه‌ها»، «آشپزخانه‌ی کرملین». Top 3 get books; places 4–10 get 7-day premium.
- Brand: navy #1B2A4A, gold #C99A3C, cream #F2EAD3, font Vazirmatn. Mascot «لَم» (always with fatha), test only.
- Mood rule: calm tone, no hype, no politics or war imagery. If something serious happens, pause promotion.

## 4. Quality bar (the chief advisor rejects anything below this)
- **Data first:** every content proposal cites the weekly numbers that justify it. Current evidence (9–15 Aban): book topics = 76% of Reel views; question-only Reels flop; «قدم ۲ دقیقه‌ای» answers get saves; avg watch only 4.8–7.4 s.
- **Hooks:** frame 0 is a real scene; on-screen hook ≤7 words from 0 s; no app/challenge name in the first 3 s; max one question hook a week; write 3 hook options and pick one with reasons.
- **Reels:** 12–14 s target; a visual change or a number between 3 s and 5 s; narration + music + SFX baked in (Vahid records narration from a marked-up script); cover = the navy template via `build_reel_cover.py`.
- **Claims:** no absolute claims, no invented numbers, no fake testimonials. Label numbers واقعی / برآورد / فرضیه.
- **Language:** all audience copy in natural spoken Persian (محاوره‌ی تمیز), checked for ZWNJ (نیم‌فاصله) and Persian digits in visuals.
- **Delivery to Vahid:** PDF for documents (`python peleh_work/md_to_pdf.py OUT.pdf "title" a.md b.md`), and a separate .txt for any text he must paste (Persian in PDFs scrambles when copied). Media files + exact caption, pinned comment, posting time.
- **Never:** send DMs, post, upload to Metricool, deploy, or type passwords unless Vahid explicitly asks in this session. Vahid sends and posts everything himself.

## 4c. Pre-publish gate — every Reel and Trial (added 2026-11-16 after the «تست سرعت خوندن» trial: 159 views, 0 follows, 51% gone by 2 s)
No video enters the posting list until the chief advisor fills this table in the hand-off. One ✗ = not published; fix or replace it. "It's an interesting idea" never overrides a ✗.
| # | Check (hard fail) |
|---|---|
| 1 | Frame 0 = real scene + ≤7-word hook, and the hook asks NOTHING of the viewer (no "read this", no test, no task) |
| 2 | Frame 0 holds a concrete number or a personal-stakes question that reads with sound off (T1 «تا آخر عمرت چند کتاب دیگه می‌خونی؟», R3 «روزی ۱٪ بهتر»); the answer/payoff lands by 8 s |
| 3 | No stretch longer than 5 s without narration unless something visibly happens (Lam gags OK); no text wall |
| 4 | Trials ≤ 30 s, main Reels ≤ 40 s (data: T1 27.5 s and R3 36 s are our winners); at most one ≤4 s beat between the hook and the first idea; "فالو کن"/CTA in the last 3 s |
| 5 | Same pattern as a format with real data (T1/R3 number-first); a brand-new format is marked «آزمایشی», max 1 per week, and Vahid is told it is an experiment before it is posted |
| 6 | Watched once on a phone at full speed as a stranger: would you stay past 2 s? |
The scriptwriter checks 1–4 on the script, the art/video lead checks 1–4 on the export, the Instagram lead checks 4–6; the chief advisor signs the table.

## 4b. Work log — MANDATORY for every agent (Vahid's standing order, 2026-11-08)
After EVERY change you make (a file built, a text written, a deploy, a database write, a decision), append one line to
`D:\me\khodam\my page\peleh\PELEH_WORKLOG.md` under «گزارش لحظه‌ای» in the format shown at the top of that file
(Tehran date-time, agent, what, files, status: روی سرور / فقط محلی / منتظر وحید, Vahid's to-do). If the change alters the
overall picture, also update the «وضعیت فعلی» table and «کارهای باز» list at the top. Never write secrets (tokens,
passwords, keys) into the log. Work that is not in the log counts as not done.

## 5. Hand-off block (end every task with this, in Persian)

```
تحویل به: <lead or senior-chief-advisor>
کار: <one line>
فایل‌ها: <paths>
دلیل/داده: <the numbers or sources behind it>
ریسک یا سؤال باز: <what needs a decision, or «ندارد»>
وضعیت: آماده‌ی بازبینی / نیازمند تصمیم
```

## 6. Lead duties
- Review every member output against section 4 before it goes up. Send it back with specific fixes if it fails — do not pass weak work upward.
- One consolidated hand-off per task to the chief advisor, never a forward of raw member output.

## 7. Chief advisor duties
- Final gate on everything that reaches Vahid. Approves, rejects, or asks a lead for a fix.
- Writes ONE short Persian report per session to Vahid: what's done, decisions needed (max 3, each with a recommendation), files, schedule.
- Vahid's standing rule: «اگه مورد تایید مشاور ارشد هست … ارسال کنید» — texts the chief advisor approves are ready for Vahid to send; Vahid still does the sending.
