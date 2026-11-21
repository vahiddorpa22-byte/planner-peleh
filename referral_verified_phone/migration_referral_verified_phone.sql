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
