// apply-referral — v7 (۲۲ آبان ۱۴۰۵، با تأیید وحید): جایزه‌ی معرف فقط وقتی که دعوت‌شده شماره‌ی تأییدشده دارد.
// تغییر نسبت به v6:
//  • هدیه‌ی ۳ روزه‌ی دعوت‌شده مثل قبل همین الان داده می‌شود.
//  • ۱۰۰ امتیاز معرف و «هر ۵ دعوت = ۱ ماه پرمیوم» دیگر این‌جا مستقیم داده نمی‌شود؛ تابع دیتابیس
//    peleh_grant_referrer_reward تصمیم می‌گیرد: اگر دعوت‌شده verified_phone دارد همین الان، وگرنه
//    بعداً با trigger روی profiles.verified_phone (یک‌بار، اتمیک). شمارش ۵تایی فقط دعوت‌های تأییدشده را می‌شمارد.
// پیش‌نیاز: migration_referral_verified_phone.sql. ترتیب: اول migration، بعد دیپلوی همین تابع.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const REFERRED_BONUS_DAYS = 3;

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

    // هدیه‌ی دعوت‌شده (بدون تغییر)
    const { data: g } = await admin.rpc("peleh_premium_grant", {
      p_user: user.id, p_days: REFERRED_BONUS_DAYS, p_source: "referral", p_ref: "referral:" + user.id, p_months: 0,
    });

    // جایزه‌ی معرف: فقط با شماره‌ی تأییدشده‌ی دعوت‌شده؛ وگرنه بعداً با trigger. خطایش جلوی جواب رو نمی‌گیره.
    const { data: rr, error: rrErr } = await admin.rpc("peleh_grant_referrer_reward", { p_referred: user.id });
    if (rrErr) console.error("peleh_grant_referrer_reward failed:", rrErr.message);

    return json({
      success: true,
      bonusDays: REFERRED_BONUS_DAYS,
      premiumUntil: g?.premium_until ?? null,
      referrerRewardPending: !rrErr && rr?.reason === "pending_verified_phone",
    });
  } catch (_e) {
    return json({ error: "خطای غیرمنتظره." }, 500);
  }
});
