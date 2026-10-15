-- =====================================================================
-- TECHNORTE - 03: SEGURANÇA (RLS) E ARQUIVOS (Storage)
-- Rode POR ÚLTIMO. Aqui é decidido QUEM pode ler/gravar cada tabela.
-- Mesmo que alguém acesse o banco direto, essas regras valem.
-- Obs.: não existe regra de DELETE -> ninguém consegue apagar registros
-- importantes (use "arquivar"). Exceção: itens de orçamento em edição.
-- =====================================================================
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant execute on all functions in schema public to authenticated;
revoke all on all tables in schema public from anon;

alter table public.profiles enable row level security;
alter table public.configuracoes enable row level security;
alter table public.historico enable row level security;

-- Perfis: todos logados veem nomes; só o admin altera (perfil, cargo, ativo)
create policy "perfis_ler" on public.profiles for select to authenticated using (auth.uid() is not null);
create policy "perfis_editar" on public.profiles for update to authenticated
  using (public.tem_perfil('admin')) with check (public.tem_perfil('admin'));

create policy "config_ler" on public.configuracoes for select to authenticated using (true);
create policy "config_editar" on public.configuracoes for update to authenticated
  using (public.tem_perfil('admin')) with check (public.tem_perfil('admin'));

-- Histórico: cada perfil vê só o que faz sentido para o seu trabalho
create policy "historico_ler" on public.historico for select to authenticated using (
  public.tem_perfil('admin','funcionario')
  or (public.tem_perfil('estoque') and entidade = 'estoque')
  or (public.tem_perfil('financeiro') and entidade in ('financeiro','garantia','orcamento'))
);

-- Padrão repetido para cada grupo de tabelas: [quem lê] / [quem grava]
do $$
declare t text;
begin
  -- Clientes e máquinas: todos leem; admin e funcionário gravam
  foreach t in array array['clientes','maquinas'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format($p$create policy "ler" on public.%I for select to authenticated using (public.tem_perfil('admin','funcionario','estoque','financeiro'))$p$, t);
    execute format($p$create policy "criar" on public.%I for insert to authenticated with check (public.tem_perfil('admin','funcionario'))$p$, t);
    execute format($p$create policy "editar" on public.%I for update to authenticated using (public.tem_perfil('admin','funcionario')) with check (public.tem_perfil('admin','funcionario'))$p$, t);
  end loop;

  -- Garantias e orçamentos: admin, funcionário e financeiro leem; admin e funcionário gravam
  foreach t in array array['garantias','documentos_garantia','orcamentos','orcamento_itens'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format($p$create policy "ler" on public.%I for select to authenticated using (public.tem_perfil('admin','funcionario','financeiro'))$p$, t);
    execute format($p$create policy "criar" on public.%I for insert to authenticated with check (public.tem_perfil('admin','funcionario'))$p$, t);
    execute format($p$create policy "editar" on public.%I for update to authenticated using (public.tem_perfil('admin','funcionario')) with check (public.tem_perfil('admin','funcionario'))$p$, t);
  end loop;

  -- Estoque: todos leem; admin, funcionário e estoque gravam
  foreach t in array array['estoque','movimentacoes_estoque'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format($p$create policy "ler" on public.%I for select to authenticated using (public.tem_perfil('admin','funcionario','estoque'))$p$, t);
    execute format($p$create policy "criar" on public.%I for insert to authenticated with check (public.tem_perfil('admin','funcionario','estoque'))$p$, t);
    execute format($p$create policy "editar" on public.%I for update to authenticated using (public.tem_perfil('admin','funcionario','estoque')) with check (public.tem_perfil('admin','funcionario','estoque'))$p$, t);
  end loop;
end $$;

-- Itens do orçamento podem ser apagados enquanto se edita o orçamento
create policy "apagar_itens" on public.orcamento_itens for delete to authenticated
  using (public.tem_perfil('admin','funcionario'));

-- Financeiro: SOMENTE admin e financeiro (funcionário não vê dinheiro)
alter table public.financeiro enable row level security;
create policy "ler" on public.financeiro for select to authenticated using (public.tem_perfil('admin','financeiro'));
create policy "criar" on public.financeiro for insert to authenticated with check (public.tem_perfil('admin','financeiro'));
create policy "editar" on public.financeiro for update to authenticated
  using (public.tem_perfil('admin','financeiro')) with check (public.tem_perfil('admin','financeiro'));

-- ---------- STORAGE: fotos de NF-e, equipamentos, PDFs ----------
-- Bucket privado "documentos". Organização: garantias/<id-da-garantia>/arquivo
insert into storage.buckets (id, name, public) values ('documentos', 'documentos', false)
on conflict (id) do nothing;

create policy "docs_ler" on storage.objects for select to authenticated
  using (bucket_id = 'documentos' and public.tem_perfil('admin','funcionario','financeiro'));
create policy "docs_enviar" on storage.objects for insert to authenticated
  with check (bucket_id = 'documentos' and public.tem_perfil('admin','funcionario'));
create policy "docs_editar" on storage.objects for update to authenticated
  using (bucket_id = 'documentos' and public.tem_perfil('admin','funcionario'));
