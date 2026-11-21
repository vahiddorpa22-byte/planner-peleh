// Supabase Edge Function: send-fixed-reminders — v9 (2026-11-08, Vahid: «همه‌ی تغییرات برای همه‌ی کاربرها»)
// v9 change vs v8: BETA_ALL = true — the personal-slot logic below runs for EVERY push subscriber and the
// legacy broadcast path is skipped. Behaviour for users who never chose a slot is unchanged (17:00 / 21:00
// broadcast); users who chose a slot now get it at their time, only if nothing was ticked that Tehran day;
// «خاموش» gets nothing. Rows without user_id keep the broadcast. Rollback = v8 (BETA_ALL false).
//
// v8 (2026-11-08, deployed with Vahid's yes)
// v8 change vs v7: the beta path no longer passes the Web Push `topic` option. Apple's push service
// (web.push.apple.com) rejected every beta personal reminder with 400 {"reason":"BadWebPushTopic"},
// so iPhone PWA users got no 21:30 reminder. Nothing else changed (legacy path is identical).
//
// v6 + BETA GATE (batch 2026-11-03; deployed 2026-11-04 with Vahid's yes)
// Deploy with:  supabase functions deploy send-fixed-reminders --no-verify-jwt   (same secrets, same cron, no migration)
//
// Vahid's decision (2026-11-03): the new reminder logic runs ONLY for the users in BETA_USER_IDS.
// Everyone else keeps the CURRENT live behaviour (version 6) exactly: the 17:00 / 21:00 Tehran broadcast
// to every push subscriber, same texts, same tag, same web-push options, same 404/410 cleanup,
// same JSON responses. The legacy code path below is v6 verbatim; the only change in it is that
// beta users' subscriptions are excluded from the broadcast query (they get the beta logic instead).
//
// Beta logic (= the v2 reviewed earlier, restricted to beta users, plus the 21:30 default slot):
//   - the time the user chose (DATA.settings.reminderSlot) is honoured: morning 08:30, noon 13:00,
//     evening 18:30, night 21:00, late 21:30 (new beta default) — only if nothing was ticked today (Tehran date);
//   - «خاموش» (reminderSlot = "none") gets nothing; a personal slot replaces the broadcast in the same minute;
//   - TTL 3 h, urgency high; per-push-service result counts in the log. (no `topic` since v8)
//   - Its own de-dup rows in daily_reminder_log use slot keys prefixed with "b" (e.g. "b21:30"), so they never
//     collide with the legacy "17:00"/"21:00" rows. (slot is a text column; no schema change.)
//   - A failure in the beta part is caught and logged; it can never stop or change the legacy broadcast.
//
// To open the new logic for everyone later: replace the legacy path with the beta one (or set BETA_ALL = true).

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import webpush from "npm:web-push@3.6.7";

// ---- BETA GATE (keep in sync with peleh-beta-gate.js on the web) ----
const BETA_ALL = true; // v9: personal-slot logic for everyone; the legacy path below is skipped.
const BETA_USER_IDS: string[] = ["295bf792-5f7e-495c-b933-4bdd6739d9ab"]; // vahid.dorpa22@gmail.com
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const BETA_IDS = BETA_USER_IDS.filter(id => UUID_RE.test(id)); // only well-formed ids reach the REST filter

function getServiceRoleKey(): string {
  const manual = Deno.env.get("MANUAL_SERVICE_ROLE_KEY");
  if (manual) return manual;
  const legacy = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (legacy) return legacy;
  const dictRaw = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (dictRaw) {
    const parsed = JSON.parse(dictRaw);
    if (parsed && parsed.default) return parsed.default;
  }
  throw new Error("no MANUAL_SERVICE_ROLE_KEY, SUPABASE_SERVICE_ROLE_KEY, or SUPABASE_SECRET_KEYS.default found");
}

async function restRequest(supabaseUrl: string, key: string, path: string, init: RequestInit = {}) {
  const res = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    ...init,
    headers: {
      "apikey": key,
      "content-type": "application/json",
      ...(init.headers || {}),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`REST ${init.method || "GET"} ${path} failed (${res.status}): ${text}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

function tehranNow(): { dateStr: string; hh: number; mm: number } {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tehran",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  });
  const parts = Object.fromEntries(fmt.formatToParts(new Date()).map(p => [p.type, p.value]));
  return {
    dateStr: `${parts.year}-${parts.month}-${parts.day}`,
    hh: parseInt(parts.hour, 10),
    mm: parseInt(parts.minute, 10),
  };
}

// ---- legacy (v6) broadcast texts — unchanged ----
const SLOTS: Record<string, { title: string; body: string }> = {
  "17:00": { title: "⏰ یادآوری پله", body: "چطور پیش می‌ره امروز؟ یه سر به پله بزن و فعالیت‌هاتو ثبت کن." },
  "21:00": { title: "🌙 جمع‌بندی امروز", body: "قبل از تموم شدن روز، یادت نره امروزتو تو پله ثبت کنی." },
};

// ---- beta: personal slots (must match the web: REMINDER_SLOTS in app.js + "late" in peleh-beta.js) ----
const BETA_PERSONAL: Record<string, string> = { "08:30": "morning", "13:00": "noon", "18:30": "evening", "21:00": "night", "21:30": "late" };
const BETA_PERSONAL_MSG = { title: "🔔 یه پله‌ی امروز", body: "عادت امروزت هنوز تیک نخورده — یه قدم کوچیک هم حسابه." };
const BETA_TTL_SECONDS = 3 * 60 * 60;
const PERSONAL_NAMES = new Set(Object.values(BETA_PERSONAL)); // morning, noon, evening, night, late

function hostOf(endpoint: string): string {
  try { return new URL(endpoint).host; } catch { return "unknown"; }
}

async function runBeta(slotKey: string, dateStr: string): Promise<Record<string, unknown>> {
  const broadcast = SLOTS[slotKey];
  const personalSlot = BETA_PERSONAL[slotKey];
  if ((!BETA_ALL && !BETA_IDS.length) || (!broadcast && !personalSlot)) return { skipped: true };

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE_KEY = getServiceRoleKey();
  const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!;
  const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) throw new Error("VAPID secret missing");

  // One beta run per Tehran day per slot ("b" prefix keeps it apart from the legacy rows).
  const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/daily_reminder_log`, {
    method: "POST",
    headers: { "apikey": SERVICE_ROLE_KEY, "content-type": "application/json", "Prefer": "return=minimal" },
    body: JSON.stringify({ log_date: dateStr, slot: `b${slotKey}` }),
  });
  if (insertRes.status === 409) return { skipped: "already sent today" };
  if (!insertRes.ok) throw new Error(`beta daily_reminder_log insert failed (${insertRes.status})`);

  webpush.setVapidDetails("mailto:support@pelehapp.ir", VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  const subs: any[] = BETA_ALL
    ? ((await restRequest(SUPABASE_URL, SERVICE_ROLE_KEY, `push_subscriptions?select=*`)) || [])
    : ((await restRequest(SUPABASE_URL, SERVICE_ROLE_KEY, `push_subscriptions?select=*&user_id=in.(${BETA_IDS.join(",")})`)) || []);
  // profiles of the subscribers (only the fields we need), fetched in chunks to keep URLs short
  const userIds = [...new Set(subs.map((s) => s.user_id).filter((id) => typeof id === "string" && UUID_RE.test(id)))];
  const rows: any[] = [];
  for (let i = 0; i < userIds.length; i += 80) {
    const chunk = userIds.slice(i, i + 80).join(",");
    const part = await restRequest(SUPABASE_URL, SERVICE_ROLE_KEY,
      `profiles?select=id,slot:data->settings->>reminderSlot,history:data->history&id=in.(${chunk})`);
    for (const r of part || []) rows.push(r);
  }
  const prefs = new Map<string, { slot: string | null; tickedToday: boolean }>();
  for (const r of rows) {
    const today = r.history && r.history[dateStr];
    prefs.set(r.id, { slot: r.slot || null, tickedToday: Array.isArray(today) && today.length > 0 });
  }

  const plan: { sub: any; msg: { title: string; body: string }; tag: string }[] = [];
  for (const sub of subs) {
    const p = prefs.get(sub.user_id) || { slot: null, tickedToday: false };
    if (p.slot === "none") continue;
    // v9: a user who chose a personal time gets ONLY that reminder (no 17:00/21:00 broadcast on top of it)
    if (p.slot && PERSONAL_NAMES.has(p.slot)) {
      if (personalSlot === p.slot && !p.tickedToday) plan.push({ sub, msg: BETA_PERSONAL_MSG, tag: `slot-${personalSlot}` });
      continue;
    }
    if (broadcast) plan.push({ sub, msg: broadcast, tag: `fixed-${slotKey.replace(":", "")}` });
  }

  let sent = 0, cleaned = 0, failed = 0;
  const byHost: Record<string, Record<string, number>> = {};
  const count = (host: string, k: string) => { (byHost[host] ||= {})[k] = ((byHost[host] || {})[k] || 0) + 1; };
  await Promise.all(plan.map(async ({ sub, msg, tag }) => {
    const host = hostOf(sub.endpoint);
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify({ title: msg.title, body: msg.body, tag, url: "/" }),
        // v8: no `topic` — Apple answered 400 BadWebPushTopic. The notification `tag` (in the payload) still collapses duplicates.
        { TTL: BETA_TTL_SECONDS, urgency: "high" },
      );
      sent++; count(host, "ok");
    } catch (e: any) {
      const code = e?.statusCode || 0;
      count(host, String(code || "err"));
      if (code === 404 || code === 410) {
        await restRequest(SUPABASE_URL, SERVICE_ROLE_KEY, `push_subscriptions?id=eq.${sub.id}`, { method: "DELETE" }).catch(() => {});
        cleaned++;
      } else {
        failed++;
        // never log the full endpoint (bearer-like URL)
        console.error(`beta reminder push failed host=${host} status=${code} body=${String(e?.body || e?.message || e).slice(0, 200)}`);
      }
    }
  }));
  const result = { slot: slotKey, date: dateStr, planned: plan.length, sent, cleaned, failed, byHost };
  console.log("send-fixed-reminders beta", JSON.stringify(result));
  return result;
}

serve(async (req) => {
  try {
    const CRON_SECRET = Deno.env.get("CRON_SECRET");
    if (CRON_SECRET) {
      const auth = req.headers.get("authorization") || "";
      if (auth !== `Bearer ${CRON_SECRET}`) {
        return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 });
      }
    }

    const { dateStr, hh, mm } = tehranNow();
    const slotKey = `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;

    // ---- beta part: isolated; can never break or delay-fail the legacy path ----
    if (SLOTS[slotKey] || BETA_PERSONAL[slotKey]) {
      try { await runBeta(slotKey, dateStr); }
      catch (e: any) { console.error("send-fixed-reminders beta failed:", e?.message || String(e)); }
    }

    // v9: with BETA_ALL the beta part above already handled every subscriber — never run the legacy broadcast too.
    if (BETA_ALL) {
      return new Response(JSON.stringify({ slot: slotKey, mode: "all" }), {
        headers: { "content-type": "application/json" },
      });
    }

    // ================= legacy path (v6, unchanged except the beta exclusion) =================
    if (!SLOTS[slotKey]) {
      return new Response(JSON.stringify({ skipped: true, tehranTime: slotKey }), {
        headers: { "content-type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE_KEY = getServiceRoleKey();
    const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!;
    const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;
    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      throw new Error("VAPID_PUBLIC_KEY or VAPID_PRIVATE_KEY secret is missing/empty");
    }

    const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/daily_reminder_log`, {
      method: "POST",
      headers: {
        "apikey": SERVICE_ROLE_KEY,
        "content-type": "application/json",
        "Prefer": "return=minimal",
      },
      body: JSON.stringify({ log_date: dateStr, slot: slotKey }),
    });
    if (insertRes.status === 409) {
      return new Response(JSON.stringify({ slot: slotKey, skipped: "already sent today" }), {
        headers: { "content-type": "application/json" },
      });
    }
    if (!insertRes.ok) {
      throw new Error(`daily_reminder_log insert failed (${insertRes.status})`);
    }

    webpush.setVapidDetails("mailto:support@pelehapp.ir", VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
    const { title, body } = SLOTS[slotKey];
    // beta users are excluded here (they are handled by runBeta above)
    // NULL-safe: rows without a user_id must keep getting the broadcast (SQL NOT IN drops NULLs)
    const subsPath = BETA_IDS.length ? `push_subscriptions?select=*&or=(user_id.is.null,user_id.not.in.(${BETA_IDS.join(",")}))` : `push_subscriptions?select=*`;
    const subs = await restRequest(SUPABASE_URL, SERVICE_ROLE_KEY, subsPath);

    let sent = 0, cleaned = 0;
    for (const sub of subs || []) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify({ title, body, tag: `fixed-${slotKey}`, url: "/" })
        );
        sent++;
      } catch (e: any) {
        if (e?.statusCode === 404 || e?.statusCode === 410) {
          await restRequest(SUPABASE_URL, SERVICE_ROLE_KEY, `push_subscriptions?id=eq.${sub.id}`, { method: "DELETE" });
          cleaned++;
        } else {
          console.error("fixed reminder push failed:", e?.message || e);
        }
      }
    }

    return new Response(JSON.stringify({ slot: slotKey, sent, cleaned }), {
      headers: { "content-type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || String(e), stack: e?.stack || null }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
});
