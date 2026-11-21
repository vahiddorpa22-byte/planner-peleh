-- ============================================================================================
-- پله — جایزه‌ی ماه‌های اسپانسردار: نفر اول تا سوم ماه، هر نفر یک کتاب (تصمیم وحید، ۱۷ آبان ۱۴۰۵)
-- اولین ماه: آذر ۱۴۰۵ (period_key = '1405-09') — اسپانسر: نشر خوب.
-- ماه‌هایی که تو تنظیم book_prize_months نیستن، همون جایزه‌ی قبلی رو می‌گیرن
-- (۱: کتاب، ۲: ۳۰ روز Premium، ۳: نشان). جایزه‌ی سالانه دست نمی‌خوره.
-- ماه بعدی اسپانسر: فقط مقدار تنظیم رو با کاما اضافه کن، مثلاً '1405-09,1405-10'
-- (و همون ماه رو تو CHALLENGE_SPONSORS داخل books.js بذار).
-- اجرا فقط با تأیید وحید. بازگشت: پایین فایل.
-- ============================================================================================

insert into public.peleh_settings (key, value) values ('book_prize_months', '1405-09')
on conflict (key) do nothing;

create or replace function public.peleh_award_period(p_scope text, p_key text)
 returns integer
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  r record; n_ins integer; v_winners integer := 0; v_prize text; v_days integer; v_badge text;
  v_book_month boolean := false;
begin
  if p_scope not in ('month', 'year') then raise exception 'bad scope'; end if;
  if p_scope = 'month' then
    v_book_month := p_key = any (string_to_array(replace(coalesce(public.peleh_setting('book_prize_months'), ''), ' ', ''), ','));
  end if;
  insert into public.leaderboard_award_runs(scope, period_key) values (p_scope, p_key) on conflict do nothing;
  get diagnostics n_ins = row_count;
  if n_ins = 0 then return 0; end if;
  for r in
    with cand as (
      select user_id, display_name, case when p_scope = 'month' then month_points else year_points end as pts
        from public.leaderboard where (case when p_scope = 'month' then month_key else year_key end) = p_key
      union all
      select user_id, display_name, points from public.leaderboard_history where scope = p_scope and period_key = p_key
    ), best as (
      select user_id, max(pts) as pts, (array_agg(display_name order by pts desc))[1] as display_name from cand group by user_id
    )
    select b.user_id, b.display_name, b.pts,
           row_number() over (order by b.pts desc, coalesce(l.total_points, 0) desc, b.user_id) as rnk
      from best b left join public.leaderboard l on l.user_id = b.user_id
     where b.pts > 0 order by rnk limit 10
  loop
    v_prize := null; v_days := null; v_badge := null;
    if p_scope = 'month' then
      if v_book_month and r.rnk <= 3 then v_prize := 'book';
      elsif r.rnk = 1 then v_prize := 'book';
      elsif r.rnk = 2 then v_prize := 'premium_days'; v_days := 30;
      elsif r.rnk = 3 then v_prize := 'badge'; v_badge := 'monthly_top3';
      else v_prize := 'badge'; v_badge := 'top10'; end if;
    else
      if r.rnk = 1 then v_prize := 'premium_days'; v_days := 365;
      elsif r.rnk = 2 then v_prize := 'premium_days'; v_days := 90;
      elsif r.rnk = 3 then v_prize := 'badge'; v_badge := 'yearly_top3';
      else v_prize := 'badge'; v_badge := 'yearly_top10'; end if;
    end if;
    insert into public.leaderboard_awards(scope, period_key, user_id, display_name, rank, points, prize, days, badge_id, review_status)
    values (p_scope, p_key, r.user_id, coalesce(r.display_name, 'کاربر پله'), r.rnk, r.pts, v_prize, v_days, v_badge, 'pending')
    on conflict (scope, period_key, user_id) do nothing;
    get diagnostics n_ins = row_count;
    if n_ins > 0 then v_winners := v_winners + 1; end if;
  end loop;
  update public.leaderboard_award_runs set winners = v_winners, ran_at = now() where scope = p_scope and period_key = p_key;
  return v_winners;
end $function$;

-- فقط متن پیام کتاب عوض می‌شه: «نفر اول/دوم/سوم» به‌جای همیشه «نفر اول». بقیه عیناً قبلی.
create or replace function public.admin_review_award(p_id bigint, p_approve boolean)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare a public.leaderboard_awards; g jsonb := null; v_until timestamptz := null; msg text; when_txt text; rank_txt text;
begin
  if not public.is_admin() then raise exception 'not allowed' using errcode = '42501'; end if;
  select * into a from public.leaderboard_awards where id = p_id for update;
  if not found then raise exception 'جایزه پیدا نشد'; end if;
  if a.review_status <> 'pending' then return jsonb_build_object('ok', true, 'already', true, 'review_status', a.review_status); end if;
  when_txt := case when a.scope = 'year' then 'سال ' || a.period_key else 'ماه ' || a.period_key end;
  rank_txt := case a.rank when 1 then '🥇 تبریک! نفر اول' when 2 then '🥈 تبریک! نفر دوم' when 3 then '🥉 تبریک! نفر سوم' else '🏆 تبریک! رتبه‌ی ' || a.rank end;
  if p_approve then
    if a.prize = 'premium_days' and coalesce(a.days, 0) > 0 then
      g := public.peleh_premium_grant(a.user_id, a.days, 'leaderboard', 'award:' || a.id);
      v_until := nullif(g ->> 'premium_until', '')::timestamptz;
      msg := format('🎉 تبریک! رتبه‌ی %s جدول برترهای %s شدی و %s روز اشتراک Premium هدیه برات فعال شد.', a.rank, when_txt, a.days);
    elsif a.prize = 'badge' and a.badge_id is not null then
      perform public.peleh_add_badge(a.user_id, a.badge_id);
      msg := null;
    elsif a.prize = 'book' then
      msg := format('%s جدول برترهای %s شدی و یک کتاب جایزه گرفتی. لطفاً همین‌جا جواب بده (اسم، شماره‌ی تماس و آدرس پستی) تا برای ارسال کتاب باهات هماهنگ کنیم.', rank_txt, when_txt);
    end if;
    if msg is not null and to_regclass('public.support_messages') is not null then
      execute 'insert into public.support_messages (user_id, sender, body) values ($1, $2, $3)' using a.user_id, 'admin', msg;
    end if;
  end if;
  update public.leaderboard_awards
     set review_status = case when p_approve then 'approved' else 'rejected' end,
         reviewed_at = now(), reviewed_by = auth.uid(),
         premium_until = coalesce(v_until, premium_until)
   where id = p_id;
  insert into public.admin_audit_log (admin_id, action, target, detail)
    values (auth.uid(), 'review_award', p_id::text, jsonb_build_object('approve', p_approve, 'prize', a.prize, 'user', a.user_id, 'grant', g));
  return jsonb_build_object('ok', true, 'review_status', case when p_approve then 'approved' else 'rejected' end, 'grant', g);
end $function$;

-- --------------------------------------------------------------------------------------------
-- بازگشت (ROLLBACK): ساده‌ترین راه خالی کردن تنظیمه — رفتار دقیقاً مثل قبل می‌شه:
--   update public.peleh_settings set value = '' where key = 'book_prize_months';
-- (متن پیام جدید برای رتبه‌ی ۱ همون «🥇 تبریک! نفر اول ...» قبلیه.)
-- --------------------------------------------------------------------------------------------
