---
name: peleh-worklog-rule
description: "Vahid's standing order — every change by Claude or any agent must be logged in PELEH_WORKLOG.md in the project folder"
metadata:
  node_type: memory
  type: feedback
  originSessionId: d2fe4aa1-7c0e-4c3e-bea6-c5c79bbefd4e
  modified: 2026-11-08T07:35:00.458Z
---

On 2026-11-08 Vahid ordered that everything done so far be saved as Markdown, and that every later change be logged too. The log is `D:\me\khodam\my page\peleh\PELEH_WORKLOG.md`. The rule applies to all agents.

**Why:** he wants one place in his own folder that shows everything done, its status, and what he still has to do, without reading chat history.

**How to apply:**
- After EVERY change (file built, text written, deploy, DB write, decision), append a line under «گزارش لحظه‌ای»: Tehran time, agent, what, files, status (روی سرور / فقط محلی / منتظر وحید), and Vahid's to-do.
- Update the «وضعیت فعلی» table and the «کارهای باز» list at the top when the picture changes.
- Never put secrets in it.
- The rule is section 4b of `peleh_work/team/OPERATING_MANUAL.md`, so every agent brief should mention it.

Related: [[peleh-senior-team]], [[peleh-status]].
