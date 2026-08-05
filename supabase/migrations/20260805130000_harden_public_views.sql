-- As views continuam security definer para manter as tabelas-base inacessíveis ao público.
-- A barreira impede que expressões externas sejam antecipadas aos filtros da view.

alter view public.caes_public set (security_barrier = true, security_invoker = false);
alter view public.eventos_public set (security_barrier = true, security_invoker = false);
alter view public.historias_public set (security_barrier = true, security_invoker = false);
alter view public.produto_variacao_opcoes_public set (security_barrier = true, security_invoker = false);
alter view public.produto_variacoes_public set (security_barrier = true, security_invoker = false);
alter view public.produtos_public set (security_barrier = true, security_invoker = false);
alter view public.rifa_numeros_public set (security_barrier = true, security_invoker = false);
alter view public.rifa_premios_public set (security_barrier = true, security_invoker = false);
alter view public.rifas_public set (security_barrier = true, security_invoker = false);
alter view public.site_settings_public set (security_barrier = true, security_invoker = false);
alter view public.social_links_public set (security_barrier = true, security_invoker = false);
