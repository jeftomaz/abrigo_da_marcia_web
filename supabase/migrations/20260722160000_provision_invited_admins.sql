create or replace function public.assign_invited_admin_role()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.invited_at is not null then
    new.raw_app_meta_data := coalesce(new.raw_app_meta_data, '{}'::jsonb)
      || '{"role":"admin"}'::jsonb;
  end if;

  return new;
end;
$$;

revoke all on function public.assign_invited_admin_role() from public;
grant execute on function public.assign_invited_admin_role() to supabase_auth_admin;

create trigger assign_invited_admin_role
before insert on auth.users
for each row
execute function public.assign_invited_admin_role();
