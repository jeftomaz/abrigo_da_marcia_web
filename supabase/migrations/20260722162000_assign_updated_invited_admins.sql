create trigger assign_invited_admin_role_on_invite
before update of invited_at on auth.users
for each row
when (old.invited_at is null and new.invited_at is not null)
execute function public.assign_invited_admin_role();

update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
  || '{"role":"admin"}'::jsonb
where invited_at is not null
  and raw_app_meta_data ->> 'role' is distinct from 'admin';
