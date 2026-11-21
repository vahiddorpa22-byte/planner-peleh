-- SIMULATION ONLY: everything is rolled back by the exception at the end. Safe on production.
begin;
-- Peleh: referrer reward only after the invited user has a verified phone (approved by Vahid 2026-11-12:
-- «برای امتیاز جمع کردن دعوت هم باهاتون موافقم»).
--
-- Before: apply-referral gave the referrer 100 bonus points at once and 1 month Premium on every 5th
--         referral (counting ALL referrals), no matter who the invitee was.
-- After:  - the invitee still gets their 3 bonus days at once (unchanged, in apply-referral);
--         - the referrer gets 100 points + the 5-referral milestone only when the invitee has
--           profiles.verified_phone (written only by verify-otp / service role);
--         - if the invitee verifies later, a trigger grants it then;
--         - idempotent: referrals.referrer_rewarded_at is claimed once; milestone uses the existing
--           premium_grants.ref unique key ("referral_milestone:<referrer>:<n>", same pattern as before,
--           so a milestone that was already paid under the old logic can never be paid twice);
--         - the milestone now counts only REWARDED (verified) referrals.
-- Apply together with the patched apply-referral edge function (apply-referral.index.ts).

-- 1) idempotency marker
alter table public.referrals add column if not exists referrer_rewarded_at timestamptz;

-- 2) referrals that already existed were rewarded by the old code -> mark them so nothing is paid twice
update public.referrals set referrer_rewarded_at = coalesce(referrer_rewarded_at, created_at, now())
 where referrer_rewarded_at is null;

-- 3) grant function (service role / triggers only)
create or replace function public.peleh_grant_referrer_reward(p_referred uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  r record;
  v_verified text;
  n int;
  c int;
  v_points int := 100;   -- REFERRER_BONUS_POINTS
  v_every int := 5;      -- REFERRER_MILESTONE_COUNT
  v_months int := 1;     -- REFERRER_MILESTONE_MONTHS
begin
  if p_referred is null then return jsonb_build_object('rewarded', false, 'reason', 'no_user'); end if;

  select id, referrer_id, referrer_rewarded_at into r
    from public.referrals where referred_id = p_referred for update;
  if not found then return jsonb_build_object('rewarded', false, 'reason', 'no_referral'); end if;
  if r.referrer_rewarded_at is not null then return jsonb_build_object('rewarded', false, 'reason', 'already'); end if;

  select verified_phone into v_verified from public.profiles where id = p_referred;
  if v_verified is null then return jsonb_build_object('rewarded', false, 'reason', 'pending_verified_phone'); end if;

  update public.referrals set referrer_rewarded_at = now()
   where id = r.id and referrer_rewarded_at is null;
  get diagnostics n = row_count;
  if n = 0 then return jsonb_build_object('rewarded', false, 'reason', 'already'); end if;

  perform public.peleh_add_bonus_points(r.referrer_id, v_points);

  select count(*) into c from public.referrals
   where referrer_id = r.referrer_id and referrer_rewarded_at is not null;
  if c > 0 and c % v_every = 0 then
    perform public.peleh_premium_grant(r.referrer_id, 0, 'referral_milestone',
      'referral_milestone:' || r.referrer_id || ':' || c, v_months);
  end if;

  return jsonb_build_object('rewarded', true, 'referrer_rewarded_count', c);
end
$function$;

revoke all on function public.peleh_grant_referrer_reward(uuid) from public, anon, authenticated;
grant execute on function public.peleh_grant_referrer_reward(uuid) to service_role;

-- 4) invitee verifies later -> reward then. Never breaks the phone verification itself.
create or replace function public.peleh_referral_on_verified_phone()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  begin
    perform public.peleh_grant_referrer_reward(new.id);
  exception when others then
    raise warning 'peleh_referral_on_verified_phone failed for %: %', new.id, sqlerrm;
  end;
  return new;
end
$function$;

revoke all on function public.peleh_referral_on_verified_phone() from public, anon, authenticated;

drop trigger if exists peleh_referral_reward_on_verified_phone on public.profiles;
create trigger peleh_referral_reward_on_verified_phone
  after update of verified_phone on public.profiles
  for each row
  when (old.verified_phone is null and new.verified_phone is not null)
  execute function public.peleh_referral_on_verified_phone();

create temp table _r(step text, info text);
insert into _r select '0_existing_referrals_marked', (select count(*) filter (where referrer_rewarded_at is not null) || '/' || count(*) from public.referrals);
insert into auth.users(id, instance_id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values
('c0a00000-0000-4000-8000-000000000000','00000000-0000-0000-0000-000000000000','authenticated','authenticated','sim-ref-r0@example.invalid','{}','{}',now(),now()),
('c0b00001-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','sim-ref-01@example.invalid','{}','{}',now(),now()),
('c0b00002-0000-4000-8000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','sim-ref-02@example.invalid','{}','{}',now(),now()),
('c0b00003-0000-4000-8000-000000000003','00000000-0000-0000-0000-000000000000','authenticated','authenticated','sim-ref-03@example.invalid','{}','{}',now(),now()),
('c0b00004-0000-4000-8000-000000000004','00000000-0000-0000-0000-000000000000','authenticated','authenticated','sim-ref-04@example.invalid','{}','{}',now(),now()),
('c0b00005-0000-4000-8000-000000000005','00000000-0000-0000-0000-000000000000','authenticated','authenticated','sim-ref-05@example.invalid','{}','{}',now(),now()),
('c0b00006-0000-4000-8000-000000000006','00000000-0000-0000-0000-000000000000','authenticated','authenticated','sim-ref-06@example.invalid','{}','{}',now(),now());
insert into public.profiles(id,name,data) values ('c0a00000-0000-4000-8000-000000000000','Sim','{}'::jsonb),('c0b00001-0000-4000-8000-000000000001','Sim','{}'::jsonb),('c0b00002-0000-4000-8000-000000000002','Sim','{}'::jsonb),('c0b00003-0000-4000-8000-000000000003','Sim','{}'::jsonb),('c0b00004-0000-4000-8000-000000000004','Sim','{}'::jsonb),('c0b00005-0000-4000-8000-000000000005','Sim','{}'::jsonb);
insert into public.profiles(id,name,data,verified_phone) values ('c0b00006-0000-4000-8000-000000000006','Sim','{}'::jsonb,'09120000006');
insert into public.referrals(referrer_id, referred_id) values ('c0a00000-0000-4000-8000-000000000000','c0b00001-0000-4000-8000-000000000001');
insert into _r select 'A_unverified_invitee', public.peleh_grant_referrer_reward('c0b00001-0000-4000-8000-000000000001')::text || ' bonus=' || (select coalesce(data->>'bonusPoints','0') from public.profiles where id='c0a00000-0000-4000-8000-000000000000');
update public.profiles set verified_phone='09120000001' where id='c0b00001-0000-4000-8000-000000000001';
insert into _r select 'B_invitee_verifies_trigger', 'bonus=' || (select coalesce(data->>'bonusPoints','0') from public.profiles where id='c0a00000-0000-4000-8000-000000000000') || ' rewarded=' || (select (referrer_rewarded_at is not null)::text from public.referrals where referred_id='c0b00001-0000-4000-8000-000000000001');
insert into _r select 'C_call_again_idempotent', public.peleh_grant_referrer_reward('c0b00001-0000-4000-8000-000000000001')::text || ' bonus=' || (select coalesce(data->>'bonusPoints','0') from public.profiles where id='c0a00000-0000-4000-8000-000000000000');
update public.profiles set verified_phone='09129999999' where id='c0b00001-0000-4000-8000-000000000001';
insert into _r select 'D_phone_changed_no_double', 'bonus=' || (select coalesce(data->>'bonusPoints','0') from public.profiles where id='c0a00000-0000-4000-8000-000000000000');
insert into public.referrals(referrer_id, referred_id) values ('c0a00000-0000-4000-8000-000000000000','c0b00002-0000-4000-8000-000000000002'),('c0a00000-0000-4000-8000-000000000000','c0b00003-0000-4000-8000-000000000003'),('c0a00000-0000-4000-8000-000000000000','c0b00004-0000-4000-8000-000000000004'),('c0a00000-0000-4000-8000-000000000000','c0b00005-0000-4000-8000-000000000005');
insert into _r select 'E0_4_more_unverified', 'bonus=' || (select coalesce(data->>'bonusPoints','0') from public.profiles where id='c0a00000-0000-4000-8000-000000000000') || ' milestones=' || (select count(*) from public.premium_grants where ref like 'referral_milestone:c0a00000-0000-4000-8000-000000000000:%');
update public.profiles set verified_phone='0912000000' || right(id::text,1) where id in ('c0b00002-0000-4000-8000-000000000002','c0b00003-0000-4000-8000-000000000003','c0b00004-0000-4000-8000-000000000004','c0b00005-0000-4000-8000-000000000005');
insert into _r select 'E_5_verified_milestone', 'bonus=' || (select coalesce(data->>'bonusPoints','0') from public.profiles where id='c0a00000-0000-4000-8000-000000000000') || ' milestones=' || coalesce((select string_agg(ref || ' months=' || months, ',') from public.premium_grants where ref like 'referral_milestone:c0a00000-0000-4000-8000-000000000000:%'),'none') || ' premiumUntil=' || coalesce((select data->'books'->>'premiumUntil' from public.profiles where id='c0a00000-0000-4000-8000-000000000000'),'none');
insert into public.referrals(referrer_id, referred_id) values ('c0a00000-0000-4000-8000-000000000000','c0b00006-0000-4000-8000-000000000006');
insert into _r select 'F1_already_verified_invitee_immediate', public.peleh_grant_referrer_reward('c0b00006-0000-4000-8000-000000000006')::text;
-- read the balance in a separate statement: a sub-select in the same statement cannot see the function's write
insert into _r select 'F2_after_F1', 'bonus=' || (select coalesce(data->>'bonusPoints','0') from public.profiles where id='c0a00000-0000-4000-8000-000000000000') || ' milestones=' || (select count(*) from public.premium_grants where ref like 'referral_milestone:c0a00000-0000-4000-8000-000000000000:%');
insert into _r select 'G_no_referral', public.peleh_grant_referrer_reward('c0a00000-0000-4000-8000-000000000000')::text;
insert into _r select 'H_privileges', 'authenticated=' || has_function_privilege('authenticated','public.peleh_grant_referrer_reward(uuid)','execute') || ' anon=' || has_function_privilege('anon','public.peleh_grant_referrer_reward(uuid)','execute') || ' service_role=' || has_function_privilege('service_role','public.peleh_grant_referrer_reward(uuid)','execute');
do $$ begin raise exception 'SIMULATION_RESULT %', (select json_agg(_r order by step) from _r); end $$;