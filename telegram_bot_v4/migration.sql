-- پله‌بات v4 — مایگریشن
-- ۱۴۰۵/۰۸/۱۷: با تأیید وحید در حالت موقت (رمزهای فعلی) اجرا شد. راز کران tg_cron_secret همین‌جا
--   داخل Vault به‌صورت تصادفی ساخته می‌شود و مقدارش هیچ‌جا نوشته نمی‌شود.
-- همه‌ی تغییرها افزایشی‌اند؛ داده‌ی موجود (tg_warns, tg_bot_messages) دست نمی‌خورد.
-- پیش‌نیاز (بررسی‌شده ۱۴۰۵/۰۸/۱۷): pg_cron 1.6.4، pg_net 0.20.4، supabase_vault 0.3.1 نصب‌اند.

-- (بدون begin/commit صریح: apply_migration خودش تراکنش می‌سازد)

-- ۰) تنظیمات کوچک ربات + راز کران در Vault (حالت موقت تا چرخش رمزها)
create table if not exists public.tg_bot_settings (
  key        text primary key,
  value      text not null,
  updated_at timestamptz not null default now()
);
alter table public.tg_bot_settings enable row level security;
revoke all on public.tg_bot_settings from anon, authenticated;
-- شناسه‌ی گروه از تنها ردیف موجود tg_warns (اخطار ثبت‌شده در گروه «گفت‌وگوی پله»، ۱۴۰۵/۰۸/۱۶)
insert into public.tg_bot_settings (key, value)
select 'group_id', chat_id::text from public.tg_warns where chat_id < 0 order by updated_at desc limit 1
on conflict (key) do nothing;
-- راز تصادفی کران؛ مقدار داخل خود دیتابیس ساخته می‌شود و هیچ‌جا نوشته نمی‌شود
do $$
begin
  if not exists (select 1 from vault.secrets where name = 'tg_cron_secret') then
    perform vault.create_secret(encode(extensions.gen_random_bytes(24), 'hex'), 'tg_cron_secret',
                                'pelehbot cron/setup secret');
  end if;
end $$;
create or replace function public.tg_get_cron_secret()
returns text
language sql
security definer
set search_path = public
as $$ select decrypted_secret from vault.decrypted_secrets where name = 'tg_cron_secret' limit 1 $$;
revoke all on function public.tg_get_cron_secret() from public, anon, authenticated;
grant execute on function public.tg_get_cron_secret() to service_role;

-- ۱) شمارنده‌ی جدای اخطار تبلیغ (فحش در ستون count می‌ماند)
alter table public.tg_warns add column if not exists ad_count integer not null default 0;

-- ۲) ضربه‌های سیاسی با زمان (برای «۳ مورد در ۲۴ ساعت = ۱ ساعت سایلنت»)
create table if not exists public.tg_political_strikes (
  id         bigserial primary key,
  chat_id    bigint      not null,
  user_id    bigint      not null,
  created_at timestamptz not null default now()
);
create index if not exists tg_political_strikes_user_time
  on public.tg_political_strikes (chat_id, user_id, created_at desc);

-- ۳) پست‌های زمان‌بندی‌شده (send_at = timestamptz؛ در seed با «at time zone 'Asia/Tehran'» پر می‌شود)
create table if not exists public.tg_schedule (
  id          bigserial primary key,
  target      text        not null check (target in ('group', 'channel')),
  send_at     timestamptz not null,
  kind        text        not null check (kind in ('checkin', 'post', 'summary')),
  text        text        not null default '',
  sent_at     timestamptz,
  message_id  bigint,
  dedupe_key  text unique,          -- seed:… برای اجرای تکراری seed، circle:/weekly: برای خلاصه‌ها
  claimed_at  timestamptz,
  attempts    integer     not null default 0,
  error       text,
  created_at  timestamptz not null default now()
);
create index if not exists tg_schedule_due on public.tg_schedule (send_at) where sent_at is null;
create index if not exists tg_schedule_msg on public.tg_schedule (message_id) where message_id is not null;

-- ۴) دورهمی کتاب‌خونی: یک ردیف برای هر نفر در هر روز (پیام بعدی جایگزین می‌شود)
create table if not exists public.tg_reading (
  chat_id    bigint      not null,
  user_id    bigint      not null,
  first_name text,
  day        date        not null,  -- روز دورهمی به وقت تهران (برش ۳ بامداد)
  pages      integer     not null check (pages between 0 and 1000),
  updated_at timestamptz not null default now(),
  primary key (chat_id, user_id, day)
);
create index if not exists tg_reading_chat_day on public.tg_reading (chat_id, day);

-- ۵) RLS روشن، بدون هیچ policy عمومی (فقط service_role تابع به آن دسترسی دارد)
alter table public.tg_political_strikes enable row level security;
alter table public.tg_schedule          enable row level security;
alter table public.tg_reading           enable row level security;
alter table public.tg_warns             enable row level security;
alter table public.tg_bot_messages      enable row level security;
revoke all on public.tg_political_strikes, public.tg_schedule, public.tg_reading from anon, authenticated;
revoke all on sequence public.tg_political_strikes_id_seq, public.tg_schedule_id_seq from anon, authenticated;

-- ۶) برداشتن ردیف‌های سررسید به‌صورت اتمی (دو tick هم‌زمان یک پست را دو بار نمی‌فرستند)
--    فقط ردیف‌های ۳۰ دقیقه‌ی اخیر؛ ردیف‌های قدیمی‌تر (مثلاً قبل از دیپلوی) فرستاده نمی‌شوند.
create or replace function public.tg_claim_due(p_limit integer default 10)
returns setof public.tg_schedule
language sql
security definer
set search_path = public
as $$
  update public.tg_schedule s
     set claimed_at = now(), attempts = s.attempts + 1
   where s.id in (
     select id from public.tg_schedule
      where sent_at is null
        and send_at <= now()
        and send_at >  now() - interval '30 minutes'
        and attempts < 3
        and (claimed_at is null or claimed_at < now() - interval '2 minutes')
      order by send_at
      limit p_limit
      for update skip locked)
  returning s.*;
$$;
revoke all on function public.tg_claim_due(integer) from public, anon, authenticated;
grant execute on function public.tg_claim_due(integer) to service_role;

-- ۷) کران‌ها
-- کار قدیمی tg-bot-sweep راز قدیمی وب‌هوک را داخل URL دارد؛ حذفش می‌کنیم.
do $$
begin
  if exists (select 1 from cron.job where jobname = 'tg-bot-sweep') then
    perform cron.unschedule('tg-bot-sweep');
  end if;
  if exists (select 1 from cron.job where jobname = 'tg-bot-tick') then
    perform cron.unschedule('tg-bot-tick');
  end if;
  if exists (select 1 from cron.job where jobname = 'tg-bot-cleanup') then
    perform cron.unschedule('tg-bot-cleanup');
  end if;
end $$;

-- هر دقیقه: پاک‌کردن پیام‌های سررسید + ارسال پست‌های زمان‌بندی‌شده + خلاصه‌ی ۲۳:۳۰ و جمعه ۲۰:۳۰.
-- راز در هدر x-cron-secret و از Vault خوانده می‌شود (نه در URL، تا در لاگ‌ها نیاید).
select cron.schedule(
  'tg-bot-tick',
  '* * * * *',
  $job$
  select net.http_get(
    url := 'https://gzcwtrqysjedwdfmhbzx.supabase.co/functions/v1/telegram-bot',
    headers := jsonb_build_object(
      'x-cron-secret',
      (select decrypted_secret from vault.decrypted_secrets where name = 'tg_cron_secret' limit 1)
    ),
    timeout_milliseconds := 20000
  );
  $job$
);

-- روزانه ۰۴:۰۰ تهران (۰۰:۳۰ UTC): پاک‌کردن ضربه‌های سیاسی قدیمی‌تر از ۷ روز
select cron.schedule(
  'tg-bot-cleanup',
  '30 0 * * *',
  $job$ delete from public.tg_political_strikes where created_at < now() - interval '7 days'; $job$
);

-- بررسی بعد از اجرا:
--   select jobname, schedule, active from cron.job where jobname like 'tg-bot-%';
--   select status_code, left(content::text, 200) from net._http_response order by created desc limit 5;
