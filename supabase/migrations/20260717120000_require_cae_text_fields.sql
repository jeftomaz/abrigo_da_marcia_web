alter table public.caes
  add constraint caes_name_not_blank
    check (length(btrim(name)) > 0),
  add constraint caes_description_not_blank
    check (length(btrim(description)) > 0);
