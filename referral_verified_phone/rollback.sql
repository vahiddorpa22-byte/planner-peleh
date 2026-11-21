-- Rollback for migration_referral_verified_phone.sql
-- After this, ALSO redeploy the previous apply-referral (v6, saved as apply-referral.index.v6.orig.ts),
-- otherwise the patched function calls an RPC that no longer exists and referrers get nothing.
drop trigger if exists peleh_referral_reward_on_verified_phone on public.profiles;
drop function if exists public.peleh_referral_on_verified_phone();
drop function if exists public.peleh_grant_referrer_reward(uuid);
-- Keep the column (harmless, preserves the history of who was rewarded). To remove it as well:
-- alter table public.referrals drop column if exists referrer_rewarded_at;
