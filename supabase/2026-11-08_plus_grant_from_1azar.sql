-- ============================================================================================
-- پله — batch 2026-11-08 — خرید سلامت پلاس قبل از ۱ آذر ۱۴۰۵: ۳۰ روز از ۱ آذر حساب بشه، نه از روز خرید
-- تصمیم وحید: سلامت پلاس از ۱ آذر ۱۴۰۵ (2026-11-22) پولیه. کسی که زودتر می‌خره (مثلاً داور بازار یا کاربر وفادار)
-- نباید روزهای رایگانِ قبل از ۱ آذر از اشتراکش کم بشه.
--
-- فقط تابع plus_grant_from_payment عوض می‌شه. این تابع رو این سه مسیر صدا می‌زنن (همه «پرداخت»):
--   • Edge Function verify-bazaar-purchase (کافه‌بازار)   • plus_zibal_finish (زیبال وب/اندروید مستقیم)
--   • admin_review_plus_payment (تأیید رسید کارت‌به‌کارت از پنل ادمین)
-- admin_grant_plus (اعطای دستی ادمین) دست نمی‌خوره.
--
-- منطق: شروع = بیشترینِ (الان، تاریخ شروع پولی‌شدن، انقضای فعلی اشتراک) ← + p_days.
--        تاریخ شروع از تنظیم plus_paid_from خونده می‌شه (قابل تغییر از جدول peleh_settings؛ خالی = بدون اثر).
-- ثبت یکتا در plus_payment_ledger و رفتار «قبلاً اعمال شده» بدون تغییر.
-- اجرا: فقط با تأیید وحید (مشاور ارشد اجرا می‌کنه). بازگشت: پایین همین فایل.
-- ============================================================================================

insert into public.peleh_settings (key, value)
values ('plus_paid_from', '2026-11-22T00:00:00+03:30')
on conflict (key) do nothing;

create or replace function public.plus_grant_from_payment(p_user uuid, p_days integer, p_source text, p_ref text)
 returns timestamp with time zone
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  until timestamptz;
  launch timestamptz;
  base_now timestamptz;
begin
  if p_ref is null or p_days is null or p_days <= 0 or p_days > 3660 then raise exception 'پرداخت نامعتبر'; end if;
  begin
    launch := nullif(public.peleh_setting('plus_paid_from'), '')::timestamptz;
  exception when others then
    launch := null;   -- مقدار خراب تو تنظیمات = همون رفتار قبلی (از الان)
  end;
  base_now := greatest(now(), coalesce(launch, now()));
  insert into public.plus_payment_ledger (ref, user_id, days, source) values (p_ref, p_user, p_days, coalesce(p_source, 'unknown'))
    on conflict (ref) do nothing;
  if not found then
    select active_until into until from public.plus_entitlements where user_id = p_user;
    return until; -- قبلاً اعمال شده
  end if;
  insert into public.plus_entitlements (user_id, active_until, source, updated_at)
    values (p_user, base_now + make_interval(days => p_days), coalesce(p_source, 'payment'), now())
  on conflict (user_id) do update
    set active_until = greatest(coalesce(plus_entitlements.active_until, now()), base_now) + make_interval(days => p_days),
        source = coalesce(p_source, 'payment'), updated_at = now()
  returning active_until into until;
  perform public.peleh_notify(p_user, 'plus_activated', jsonb_build_object('until', until));
  return until;
end $function$;

-- همون دسترسی‌های قبلی (فقط postgres و service_role؛ کاربر عادی مستقیم صداش نمی‌زنه)
revoke all on function public.plus_grant_from_payment(uuid, integer, text, text) from public, anon, authenticated;
grant execute on function public.plus_grant_from_payment(uuid, integer, text, text) to service_role;

-- --------------------------------------------------------------------------------------------
-- تست بعد از اجرا (فقط خواندنی):
--   select public.peleh_setting('plus_paid_from');
--   select pg_get_functiondef('public.plus_grant_from_payment'::regproc);
-- انتظار برای خرید ۳۰ روزه در ۱۸ آبان بدون اشتراک قبلی: active_until ≈ 2026-12-22 00:00 تهران.
-- --------------------------------------------------------------------------------------------
-- بازگشت (ROLLBACK) — تابع قبلی، عیناً:
-- create or replace function public.plus_grant_from_payment(p_user uuid, p_days integer, p_source text, p_ref text)
--  returns timestamp with time zone language plpgsql security definer set search_path to 'public' as $f$
-- declare until timestamptz;
-- begin
--   if p_ref is null or p_days is null or p_days <= 0 or p_days > 3660 then raise exception 'پرداخت نامعتبر'; end if;
--   insert into public.plus_payment_ledger (ref, user_id, days, source) values (p_ref, p_user, p_days, coalesce(p_source, 'unknown'))
--     on conflict (ref) do nothing;
--   if not found then
--     select active_until into until from public.plus_entitlements where user_id = p_user;
--     return until;
--   end if;
--   insert into public.plus_entitlements (user_id, active_until, source, updated_at)
--     values (p_user, now() + make_interval(days => p_days), coalesce(p_source, 'payment'), now())
--   on conflict (user_id) do update set active_until = greatest(coalesce(plus_entitlements.active_until, now()), now()) + make_interval(days => p_days),
--     source = coalesce(p_source, 'payment'), updated_at = now()
--   returning active_until into until;
--   perform public.peleh_notify(p_user, 'plus_activated', jsonb_build_object('until', until));
--   return until;
-- end $f$;
-- (یا فقط تنظیم رو خالی کن: update public.peleh_settings set value = '' where key = 'plus_paid_from';)
