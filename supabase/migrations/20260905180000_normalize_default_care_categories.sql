-- Padroniza somente a grafia das categorias iniciais, preservando as personalizadas.

update public.cuidado_categorias category
set name = default_category.name
from (values
  ('Vacina'),
  ('Medicamento'),
  ('Exame'),
  ('Suplemento'),
  ('Procedimento'),
  ('Outro')
) as default_category(name)
where lower(category.name) = lower(default_category.name)
  and category.name <> default_category.name;
