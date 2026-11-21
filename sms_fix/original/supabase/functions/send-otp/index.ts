// send-otp: یک کد OTP تصادفی می‌سازه، در جدول otp_codes (Supabase) ذخیره می‌کنه و از طریق MrOTP.ir
// (تابع setOTP با type=SMS) ارسال می‌کنه تا بعداً توسط verify-otp چک بشه.
//
// تغییرات این نسخه:
//  • کد با crypto.getRandomValues ساخته می‌شه (Math.random قابل پیش‌بینی بود)
//  • شماره سمت سرور هم اعتبارسنجی/یکدست می‌شه (09xxxxxxxxx)
//  • محدودیت ارسال سمت سرور: حداکثر ۱ کد در هر ۶۰ ثانیه و ۵ کد در ساعت برای هر شماره — قبلاً فقط
//    خود اپ محدود می‌کرد و هرکسی با یه اسکریپت ساده می‌تونست هزاران پیامک (به خرج تو) بفرسته
//  • اول کد ذخیره می‌شه بعد پیامک می‌ره (قبلاً اگه ذخیره شکست می‌خورد، کاربر کدی می‌گرفت که هیچ‌وقت قبول نمی‌شد)؛
//    اگه ارسال پیامک شکست بخوره، کد ذخیره‌شده پاک می‌شه
//  • پاسخ خام سرویس پیامک دیگه برای اپ فرستاده نمی‌شه (فقط تو لاگ سرور)
//
// v2.4.0 (ممیزی S4) — کد همچنان ۴ رقمی:
//  • سقف ارسال برای هر IP (ساعتی/روزانه) و بودجه‌ی کل ساعتی پیامک، و قفل ۲۴ ساعته‌ی شماره‌ای که ۱۰ بار کد
//    اشتباه زده (peleh_otp_send_gate در migration 023؛ سقف‌ها از پنل ادمین قابل تغییرن)
//  • اگه بررسی سقف‌ها خطا بده، دیگه «بدون محدودیت» ارسال نمی‌شه (fail-closed)
//
// دیپلوی:  supabase functions deploy send-otp
// (فقط از ستون‌های mobile / otp_code / expires_at جدول otp_codes استفاده می‌کنه، مثل قبل)

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const OTP_TTL_MINUTES = 5;
const MIN_SECONDS_BETWEEN_CODES = 60;
const MAX_CODES_PER_HOUR = 5;

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function generateOtp(length = 4): string {
  const bytes = new Uint32Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => String(b % 10)).join("");
}

function normalizeIranMobile(raw: string): string | null {
  const fa = "۰۱۲۳۴۵۶۷۸۹", ar = "٠١٢٣٤٥٦٧٨٩";
  let s = String(raw || "").replace(/[۰-۹٠-٩]/g, (ch) => {
    const i = fa.indexOf(ch);
    return String(i >= 0 ? i : ar.indexOf(ch));
  }).replace(/[\s\-().]/g, "");
  if (s.startsWith("+98")) s = "0" + s.slice(3);
  else if (s.startsWith("0098")) s = "0" + s.slice(4);
  else if (/^989\d{9}$/.test(s)) s = "0" + s.slice(2);
  else if (/^9\d{9}$/.test(s)) s = "0" + s;
  return /^09\d{9}$/.test(s) ? s : null;
}

function clientIp(req: Request): string {
  const xf = req.headers.get("x-forwarded-for") || "";
  const first = xf.split(",")[0].trim();
  return (first || req.headers.get("x-real-ip") || req.headers.get("cf-connecting-ip") || "").slice(0, 64);
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    let body: { mobile?: unknown } = {};
    try { body = await req.json(); } catch { body = {}; }
    const mobile = typeof body.mobile === "string" ? normalizeIranMobile(body.mobile) : null;
    if (!mobile) {
      return json({ error: "شماره موبایل معتبر نیست (مثلاً ۰۹۱۲۳۴۵۶۷۸۹)." }, 400);
    }

    const apiKey = Deno.env.get("MROTP_API_KEY");
    if (!apiKey) {
      console.error("MROTP_API_KEY is not set");
      return json({ error: "سرویس پیامک پیکربندی نشده — با پشتیبانی تماس بگیر." }, 500);
    }

    // ---- محدودیت ارسال (فقط با expires_at: زمان ساخت = expires_at − TTL) ----
    const now = Date.now();
    const ttlMs = OTP_TTL_MINUTES * 60 * 1000;
    try {
      const { data: recent, error: recentErr } = await supabase
        .from("otp_codes")
        .select("expires_at")
        .eq("mobile", mobile)
        .gt("expires_at", new Date(now - 60 * 60 * 1000 + ttlMs).toISOString()) // ساخته‌شده در یک ساعت اخیر
        .order("expires_at", { ascending: false })
        .limit(MAX_CODES_PER_HOUR + 1);
      if (!recentErr && recent && recent.length) {
        const lastCreated = new Date(recent[0].expires_at).getTime() - ttlMs;
        const secondsSince = Math.floor((now - lastCreated) / 1000);
        if (secondsSince < MIN_SECONDS_BETWEEN_CODES) {
          const retryAfter = MIN_SECONDS_BETWEEN_CODES - secondsSince;
          return json({ error: `کد قبلی همین الان فرستاده شد — ${retryAfter} ثانیه‌ی دیگه دوباره امتحان کن.`, retryAfter }, 429);
        }
        if (recent.length >= MAX_CODES_PER_HOUR) {
          const oldestCreated = new Date(recent[recent.length - 1].expires_at).getTime() - ttlMs;
          const retryAfter = Math.max(60, Math.ceil((oldestCreated + 60 * 60 * 1000 - now) / 1000));
          return json({ error: "تعداد درخواست کد برای این شماره زیاد شده — کمی بعد دوباره امتحان کن.", retryAfter }, 429);
        }
      } else if (recentErr) {
        console.error("rate-limit query failed:", recentErr.message);
        return json({ error: "الان نمی‌شه کد فرستاد — چند لحظه بعد دوباره امتحان کن." }, 503);
      }
    } catch (e) {
      console.error("rate-limit check threw:", e);
      return json({ error: "الان نمی‌شه کد فرستاد — چند لحظه بعد دوباره امتحان کن." }, 503);
    }

    // ---- سقف IP، سقف کل و قفل شماره (اتمیک، سمت دیتابیس) ----
    const { data: gate, error: gateErr } = await supabase.rpc("peleh_otp_send_gate", { p_mobile: mobile, p_ip: clientIp(req) });
    if (gateErr || !gate) {
      console.error("otp gate failed:", gateErr?.message);
      return json({ error: "الان نمی‌شه کد فرستاد — چند لحظه بعد دوباره امتحان کن." }, 503);
    }
    if (!gate.ok) {
      const msg = gate.reason === "mobile_locked"
        ? "به‌خاطر تلاش‌های اشتباه زیاد، ورود با این شماره تا ۲۴ ساعت قفل شده. اگه مشکلی هست با پشتیبانی تماس بگیر."
        : "تعداد درخواست کد زیاد شده — کمی بعد دوباره امتحان کن.";
      return json({ error: msg, retryAfter: gate.reason === "mobile_locked" ? 86400 : 3600 }, 429);
    }

    // ---- اول ذخیره، بعد ارسال ----
    const code = generateOtp(4);
    const expiresAt = new Date(now + ttlMs).toISOString();
    const { error: dbError } = await supabase.from("otp_codes").insert({
      mobile,
      otp_code: code,
      expires_at: expiresAt,
    });
    if (dbError) {
      console.error("otp_codes insert failed:", dbError.message);
      return json({ error: "خطای سرور — چند لحظه بعد دوباره امتحان کن." }, 500);
    }

    let providerOk = false;
    let providerResult: unknown = null;
    try {
      const mrotpResponse = await fetch("https://my.mrotp.ir/api/OTP/v1/setOTP", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          apiKey,
          mobile,
          OTP: code,
          validTime: String(OTP_TTL_MINUTES),
          type: "SMS", // مهم: بدون این، پیش‌فرض روی USSD می‌رفت
        }),
      });
      const text = await mrotpResponse.text();
      try { providerResult = JSON.parse(text); } catch { providerResult = text; }
      const resultCode = Number((providerResult as { code?: unknown })?.code);
      // کدهای بالای 100 یعنی موفقیت‌آمیز طبق مستندات MrOTP
      providerOk = mrotpResponse.ok && Number.isFinite(resultCode) && resultCode > 100;
    } catch (e) {
      providerResult = String(e);
      providerOk = false;
    }

    if (!providerOk) {
      console.error("MrOTP send failed:", JSON.stringify(providerResult));
      // کدی که هیچ‌وقت نرسیده رو پاک کن تا جلوی درخواست بعدی رو نگیره و کد معتبر آخر نباشه
      await supabase.from("otp_codes").delete()
        .eq("mobile", mobile).eq("otp_code", code).eq("expires_at", expiresAt);
      return json({ error: "ارسال پیامک ناموفق بود — چند لحظه بعد دوباره امتحان کن." }, 502);
    }

    return json({ success: true, message: "کد ارسال شد.", expiresInSeconds: OTP_TTL_MINUTES * 60 });
  } catch (err) {
    console.error("send-otp internal error:", err);
    return json({ error: "خطای داخلی سرور — دوباره امتحان کن." }, 500);
  }
});
