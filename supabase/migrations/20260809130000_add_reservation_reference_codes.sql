alter table public.reservas
  add column reference_code text;

update public.reservas
set reference_code = upper(encode(extensions.gen_random_bytes(6), 'hex'));

alter table public.reservas
  alter column reference_code set default upper(encode(extensions.gen_random_bytes(6), 'hex')),
  alter column reference_code set not null,
  add constraint reservas_reference_code_format check (reference_code ~ '^[0-9A-F]{12}$'),
  add constraint reservas_reference_code_key unique (reference_code);
