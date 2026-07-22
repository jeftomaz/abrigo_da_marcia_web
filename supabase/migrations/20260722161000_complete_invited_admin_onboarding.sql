create or replace function public.complete_invited_admin_onboarding()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.raw_app_meta_data := coalesce(new.raw_app_meta_data, '{}'::jsonb)
    || '{"admin_onboarding_completed":true}'::jsonb;
  return new;
end;
$$;

revoke all on function public.complete_invited_admin_onboarding() from public;
grant execute on function public.complete_invited_admin_onboarding() to supabase_auth_admin;

create trigger complete_invited_admin_onboarding
before update of encrypted_password on auth.users
for each row
when (
  old.invited_at is not null
  and old.encrypted_password is distinct from new.encrypted_password
)
execute function public.complete_invited_admin_onboarding();
