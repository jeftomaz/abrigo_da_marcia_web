alter table public.historias
  add constraint historias_name_not_blank
    check (length(btrim(name)) > 0),
  add constraint historias_name_max_length
    check (char_length(name) <= 40),
  add constraint historias_description_not_blank
    check (length(btrim(description)) > 0),
  add constraint historias_description_max_length
    check (char_length(description) <= 1000),
  add constraint historias_photos_count
    check (cardinality(photos) between 1 and 5);
