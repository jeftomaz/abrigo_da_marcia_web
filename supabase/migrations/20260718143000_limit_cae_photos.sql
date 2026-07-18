alter table public.caes
  add constraint caes_photos_max_count
    check (cardinality(photos) <= 5);
