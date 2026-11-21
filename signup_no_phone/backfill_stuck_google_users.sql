-- Peleh: one-time fix for Google accounts stuck at onboarding (no name, no phone, no verified phone).
-- NOT EXECUTED. Run only after Vahid approves directly, and after migration_oauth_phone_placeholder.sql.
-- Expected: 5 rows (counted 2026-11-12). Name is NOT touched: users type their own name on onboarding.
-- verified_phone stays NULL. Runs as service role, so the client-side guard triggers do not apply.
-- The 2 other Google accounts without verified_phone already have a name and a typed (unverified)
-- phone; they are past onboarding and are deliberately left alone.

begin;

-- 1) preview: must return 5
select count(*) as will_update
from public.profiles p
where p.verified_phone is null
  and coalesce(p.phone, '') !~ '^09[0-9]{9}$'
  and exists (select 1 from auth.identities i where i.user_id = p.id and i.provider = 'google');

-- 2) update
update public.profiles p
   set phone = '09000000000',
       phone_verified = true
 where p.verified_phone is null
   and coalesce(p.phone, '') !~ '^09[0-9]{9}$'
   and exists (select 1 from auth.identities i where i.user_id = p.id and i.provider = 'google');

-- 3) check: should show 5 rows with the placeholder, 0 verified_phone
select count(*) filter (where phone = '09000000000') as placeholder_rows,
       count(*) filter (where phone = '09000000000' and verified_phone is not null) as must_be_zero
from public.profiles;

commit;
