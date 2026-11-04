-- Replica a exigência de perfil no módulo de cuidados, ainda local.

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'cuidado_itens',
    'cuidado_programas',
    'cae_cuidados',
    'cae_cuidado_registros'
  ] loop
    execute format(
      'alter policy %I on public.%I
       using ((select public.is_profiled_admin()))
       with check ((select public.is_profiled_admin()))',
      'Admins manage ' || table_name,
      table_name
    );
  end loop;
end;
$$;

alter policy "Admins manage cuidado_frequencias"
  on public.cuidado_frequencias
  using ((select public.is_profiled_admin()))
  with check ((select public.is_profiled_admin()));

alter policy "Admins read cuidado_estoque_movimentos"
  on public.cuidado_estoque_movimentos
  using ((select public.is_profiled_admin()));

alter policy "Admins manage cuidado_categorias"
  on public.cuidado_categorias
  using ((select public.is_profiled_admin()))
  with check ((select public.is_profiled_admin()));
