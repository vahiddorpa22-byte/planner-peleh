// apply-referral — v6 (v2.4.0): ثبت یکتا و اعطای اتمیک.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const REFERRED_BONUS_DAYS = 3;
const REFERRER_BONUS_POINTS = 100;
const REFERRER_MILESTONE_COUNT = 5;
const REFERRER_MILESTONE_MONTHS = 1;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "برای استفاده از کد معرف باید وارد حساب شده باشی." }, 401);

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) return json({ error: "برای استفاده از کد معرف باید وارد حساب شده باشی." }, 401);

    const { code } = await req.json();
    const normalizedCode = String(code || "").trim().toUpperCase();
    if (!normalizedCode) return json({ error: "کد معرف رو وارد کن." }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const { data: me } = await admin.from("profiles").select("id, referred_by").eq("id", user.id).maybeSingle();
    if (me?.referred_by) return json({ error: "قبلاً یه کد معرف استفاده کردی." }, 400);

    const { data: referrer } = await admin.from("profiles").select("id").eq("referral_code", normalizedCode).maybeSingle();
    if (!referrer) return json({ error: "این کد معرف معتبر نیست." }, 404);
    if (referrer.id === user.id) return json({ error: "نمی‌تونی از کد خودت استفاده کنی." }, 400);

    const { error: insErr } = await admin.from("referrals").insert({ referrer_id: referrer.id, referred_id: user.id });
    if (insErr) return json({ error: "قبلاً یه کد معرف برای حسابت ثبت شده." }, 400);
    await admin.from("profiles").update({ referred_by: referrer.id }).eq("id", user.id);

    const { data: g } = await admin.rpc("peleh_premium_grant", {
      p_user: user.id, p_days: REFERRED_BONUS_DAYS, p_source: "referral", p_ref: "referral:" + user.id, p_months: 0,
    });
    await admin.rpc("peleh_add_bonus_points", { p_user: referrer.id, p_points: REFERRER_BONUS_POINTS });

    const { count } = await admin.from("referrals").select("id", { count: "exact", head: true }).eq("referrer_id", referrer.id);
    if (count && count % REFERRER_MILESTONE_COUNT === 0) {
      await admin.rpc("peleh_premium_grant", {
        p_user: referrer.id, p_days: 0, p_source: "referral_milestone",
        p_ref: `referral_milestone:${referrer.id}:${count}`, p_months: REFERRER_MILESTONE_MONTHS,
      });
    }
    return json({ success: true, bonusDays: REFERRED_BONUS_DAYS, premiumUntil: g?.premium_until ?? null });
  } catch (_e) {
    return json({ error: "خطای غیرمنتظره." }, 500);
  }
});
