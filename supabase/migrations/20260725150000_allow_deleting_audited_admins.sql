alter table public.event_deletion_audit
  drop constraint event_deletion_audit_deleted_by_fkey,
  add constraint event_deletion_audit_deleted_by_fkey
    foreign key (deleted_by) references auth.users(id) on delete set null;
