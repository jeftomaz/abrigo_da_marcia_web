alter table public.caes
  add constraint caes_name_max_length
    check (char_length(name) <= 40);

-- Registros anteriores podem exceder o novo limite. NOT VALID preserva esses
-- dados, mas a constraint já bloqueia toda nova inserção ou atualização inválida.
alter table public.caes
  add constraint caes_description_max_length
    check (char_length(description) <= 1000) not valid;
