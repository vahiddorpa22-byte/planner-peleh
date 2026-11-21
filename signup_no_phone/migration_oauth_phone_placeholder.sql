-- Peleh: Google sign-up without a mobile number (Phase 1, approved by Vahid 2026-11-12)
-- Android 2.5.0 is frozen. Its onboarding requires name + profiles.phone ~ '^09\d{9}$' + phone_verified.
-- For accounts that signed in with Google and have NO verified phone, this trigger puts a placeholder
-- phone (09000000000) and the UI flag phone_verified = true on the NEW profile row, so the onboarding
-- screen asks only for the name (the user types it; the name is never auto-filled).
-- verified_phone stays NULL: it remains the only "really verified" source (verify-otp, prizes, admin).
--
-- Trigger order: BEFORE INSERT triggers fire in name order. This one is named peleh_zz_* so it runs
-- AFTER peleh_guard_system_columns (which forces phone_verified=false on client inserts) and after
-- peleh_protect_verified_phone (which forces verified_phone=NULL on client inserts).
-- Runs as the invoker (role authenticated). The Google check uses the JWT app_metadata (signed by
-- Supabase Auth, cannot be forged by the client) — no access to auth.* tables is needed.

create or replace function public.peleh_oauth_phone_placeholder()
returns trigger
language plpgsql
set search_path to 'public'
as $function$
declare
  v_claims jsonb;
begin
  -- only rows written by the app itself (service_role / admin writes are left alone)
  if current_user <> 'authenticated' then return new; end if;
  if new.id is distinct from auth.uid() then return new; end if;
  if new.verified_phone is not null then return new; end if;
  if coalesce(new.phone, '') ~ '^09[0-9]{9}$' then return new; end if;

  v_claims := coalesce(auth.jwt(), '{}'::jsonb);
  if not (
       coalesce(v_claims -> 'app_metadata' -> 'providers', '[]'::jsonb) ? 'google'
    or (v_claims -> 'app_metadata' ->> 'provider') = 'google'
  ) then
    return new;
  end if;

  new.phone := '09000000000';   -- placeholder, never a real number for this account
  new.phone_verified := true;   -- UI flag only (hides the SMS step); verified_phone stays NULL
  return new;
end
$function$;

revoke all on function public.peleh_oauth_phone_placeholder() from public, anon;

drop trigger if exists peleh_zz_oauth_phone_placeholder on public.profiles;
create trigger peleh_zz_oauth_phone_placeholder
  before insert on public.profiles
  for each row execute function public.peleh_oauth_phone_placeholder();

comment on function public.peleh_oauth_phone_placeholder() is
  'Google accounts without a verified phone get phone=09000000000 + phone_verified=true (UI flag) on profile insert. verified_phone stays NULL. Approved by Vahid 2026-11-12.';
