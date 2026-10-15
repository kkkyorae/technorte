-- =====================================================================
-- TECHNORTE - 02: FUNÇÕES, GATILHOS (triggers) E VIEWS
-- Rode DEPOIS do 01_tabelas.sql.
-- =====================================================================

-- Atualiza "updated_at" sozinho a cada edição
create or replace function public.set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

do $$
declare t text;
begin
  foreach t in array array['clientes','maquinas','garantias','orcamentos','estoque'] loop
    execute format('create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()', t);
  end loop;
end $$;

-- Quando alguém cria login no Supabase Auth, cria o perfil automaticamente.
-- O PRIMEIRO usuário do sistema vira ADMINISTRADOR; os outros entram como funcionário.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, nome, email, perfil)
  values (new.id,
          coalesce(new.raw_user_meta_data->>'nome', split_part(new.email,'@',1)),
          new.email,
          case when (select count(*) from public.profiles) = 0 then 'admin' else 'funcionario' end);
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Verifica se o usuário logado (e ativo) tem um dos perfis informados. Usada nas regras de RLS.
create or replace function public.tem_perfil(variadic perfis text[]) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and ativo and perfil = any(perfis));
$$;

-- Grava uma linha no histórico (quem fez o quê e quando)
create or replace function public.registrar_historico(p_entidade text, p_id uuid, p_cliente uuid, p_maquina uuid, p_acao text)
returns void language sql security definer set search_path = public as $$
  insert into public.historico (entidade, entidade_id, cliente_id, maquina_id, acao, usuario_id)
  values (p_entidade, p_id, p_cliente, p_maquina, p_acao, auth.uid());
$$;

-- ---------- GARANTIAS: datas automáticas + histórico ----------
create or replace function public.trg_garantias() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    new.criado_por := coalesce(new.criado_por, auth.uid());
    perform public.registrar_historico('garantia', new.id, new.cliente_id, new.maquina_id, 'Garantia #'||new.numero||' cadastrada (entrada)');
    return new;
  end if;
  if new.status is distinct from old.status then
    if new.status = 'Encaminhada' and new.data_encaminhamento is null then new.data_encaminhamento := current_date; end if;
    if new.status = 'Aprovada' then new.data_aprovacao := current_date; end if;
    if new.status = 'Recusada' then new.data_recusa := current_date; end if;
    if new.status = 'Entregue' then new.data_entrega := current_date; end if;
    -- Entregue ou Recusada encerram a contagem do prazo (o tempo total fica guardado)
    if new.status in ('Entregue','Recusada') then
      new.data_finalizacao := coalesce(new.data_finalizacao, current_date);
    else
      new.data_finalizacao := null;
    end if;
    perform public.registrar_historico('garantia', new.id, new.cliente_id, new.maquina_id, 'Garantia #'||new.numero||' alterada para '||new.status);
  end if;
  return new;
end $$;
create trigger trg_garantias before insert or update on public.garantias
  for each row execute function public.trg_garantias();

-- ---------- ORÇAMENTOS: total automático + histórico ----------
create or replace function public.trg_orcamentos() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  -- total = soma dos itens - desconto (o usuário não digita o total)
  new.valor_total := greatest(coalesce((select sum(valor_total) from public.orcamento_itens where orcamento_id = new.id), 0) - coalesce(new.desconto, 0), 0);
  if tg_op = 'INSERT' then
    new.created_by := coalesce(new.created_by, auth.uid());
    perform public.registrar_historico('orcamento', new.id, new.cliente_id, new.maquina_id, 'Orçamento #'||new.numero_orcamento||' criado');
    return new;
  end if;
  if new.status is distinct from old.status then
    if new.status in ('Finalizado','Recusado') then
      new.data_finalizacao := coalesce(new.data_finalizacao, current_date);
    else
      new.data_finalizacao := null;
    end if;
    perform public.registrar_historico('orcamento', new.id, new.cliente_id, new.maquina_id, 'Orçamento #'||new.numero_orcamento||' alterado para '||new.status);
  end if;
  return new;
end $$;
create trigger trg_orcamentos before insert or update on public.orcamentos
  for each row execute function public.trg_orcamentos();

-- Quando um item muda, força o orçamento a recalcular o total
create or replace function public.trg_itens() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.orcamentos set updated_at = now() where id = coalesce(new.orcamento_id, old.orcamento_id);
  return null;
end $$;
create trigger trg_itens after insert or update or delete on public.orcamento_itens
  for each row execute function public.trg_itens();

-- ---------- FINANCEIRO: histórico ----------
create or replace function public.trg_financeiro() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.criado_por := coalesce(new.criado_por, auth.uid());
  return new;
end $$;
create trigger trg_financeiro before insert on public.financeiro
  for each row execute function public.trg_financeiro();

create or replace function public.trg_financeiro_log() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform public.registrar_historico('financeiro', new.id, new.cliente_id, null,
    'R$ '||to_char(new.valor,'FM999G999G990D00')||' ('||new.tipo||') registrado no financeiro');
  return new;
end $$;
create trigger trg_financeiro_log after insert on public.financeiro
  for each row execute function public.trg_financeiro_log();

-- ---------- FUNÇÃO: transformar garantia recusada em orçamento ----------
create or replace function public.transformar_garantia_em_orcamento(p_garantia uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare g public.garantias%rowtype; o_id uuid; dias int;
begin
  if not public.tem_perfil('admin','funcionario') then raise exception 'Sem permissão'; end if;
  select * into g from public.garantias where id = p_garantia;
  if not found then raise exception 'Garantia não encontrada'; end if;
  if g.status <> 'Recusada' then raise exception 'Só garantias recusadas podem virar orçamento'; end if;
  -- se já existe orçamento dessa garantia, devolve o mesmo (evita duplicar)
  select id into o_id from public.orcamentos where garantia_origem_id = p_garantia limit 1;
  if o_id is not null then return o_id; end if;
  select validade_dias into dias from public.configuracoes where id = 1;
  insert into public.orcamentos (cliente_id, maquina_id, garantia_origem_id, data_entrada, validade, status, observacoes)
  values (g.cliente_id, g.maquina_id, g.id, current_date, current_date + coalesce(dias,15), 'Rascunho',
          'Origem: garantia #'||g.numero||' recusada.'||
          case when g.descricao_problema is not null then E'\nProblema: '||g.descricao_problema else '' end ||
          case when g.observacoes is not null then E'\nObs. da garantia: '||g.observacoes else '' end)
  returning id into o_id;
  return o_id;
end $$;

-- ---------- FUNÇÃO: movimentar estoque (entrada, saída ou ajuste) ----------
-- Atualiza a quantidade e grava a movimentação juntas (tudo ou nada).
create or replace function public.movimentar_estoque(p_estoque uuid, p_tipo text, p_quantidade numeric, p_motivo text) returns void
language plpgsql security definer set search_path = public as $$
declare e public.estoque%rowtype; nova numeric;
begin
  if not public.tem_perfil('admin','funcionario','estoque') then raise exception 'Sem permissão'; end if;
  if p_quantidade is null or p_quantidade < 0 then raise exception 'Quantidade inválida'; end if;
  select * into e from public.estoque where id = p_estoque for update;
  if not found then raise exception 'Peça não encontrada'; end if;
  if p_tipo = 'entrada' then nova := e.quantidade + p_quantidade;
  elsif p_tipo = 'saida' then
    nova := e.quantidade - p_quantidade;
    if nova < 0 then raise exception 'Estoque insuficiente (disponível: %)', e.quantidade; end if;
  elsif p_tipo = 'ajuste' then nova := p_quantidade; -- ajuste = define a quantidade correta
  else raise exception 'Tipo inválido'; end if;
  update public.estoque set quantidade = nova where id = p_estoque;
  insert into public.movimentacoes_estoque (estoque_id, tipo, quantidade, valor, motivo, usuario_id)
  values (p_estoque, p_tipo, p_quantidade, e.valor_unitario * p_quantidade, p_motivo, auth.uid());
  perform public.registrar_historico('estoque', p_estoque, null, null,
    initcap(p_tipo)||' de '||p_quantidade||' '||e.unidade||' - '||e.nome_peca);
end $$;

-- ---------- PESQUISA GLOBAL ----------
-- Procura em clientes, máquinas, garantias, orçamentos e peças de uma vez.
create or replace function public.busca_global(q text)
returns table (tipo text, id uuid, titulo text, subtitulo text, link text)
language sql stable as $$
  (select 'Cliente'::text, c.id, c.nome, coalesce(c.telefone,'')::text, ('/clientes/'||c.id)::text
     from public.clientes c
     where c.nome ilike '%'||q||'%' or c.telefone ilike '%'||q||'%' or c.cpf_cnpj ilike '%'||q||'%' limit 5)
  union all
  (select 'Máquina'::text, m.id, (m.tipo_equipamento||' '||coalesce(m.marca,'')||' '||coalesce(m.modelo,''))::text,
          ('Série '||coalesce(m.numero_serie,'-'))::text, ('/maquinas/'||m.id)::text
     from public.maquinas m
     where m.numero_serie ilike '%'||q||'%' or m.numero_identificacao ilike '%'||q||'%' or m.modelo ilike '%'||q||'%' limit 5)
  union all
  (select 'Garantia'::text, g.id, ('Garantia #'||g.numero)::text, ('NF '||coalesce(g.numero_nf,'-')||' · OS '||coalesce(g.ordem_servico_fabrica,'-'))::text, ('/garantias?abrir='||g.id)::text
     from public.garantias g
     where g.numero::text = q or g.numero_nf ilike '%'||q||'%' or g.ordem_servico_fabrica ilike '%'||q||'%' limit 5)
  union all
  (select 'Orçamento'::text, o.id, ('Orçamento #'||o.numero_orcamento)::text, o.status::text, ('/orcamentos?abrir='||o.id)::text
     from public.orcamentos o where o.numero_orcamento::text = q limit 5)
  union all
  (select 'Peça'::text, s.id, s.nome_peca::text, ('Código '||coalesce(s.codigo,'-'))::text, ('/estoque?q='||coalesce(s.codigo, s.nome_peca))::text
     from public.estoque s
     where s.nome_peca ilike '%'||q||'%' or s.codigo ilike '%'||q||'%' limit 5);
$$;

-- ---------- VIEWS (listas prontas, com o cálculo de dias do prazo) ----------
-- "dias" = data de entrada até hoje (ou até a finalização). O usuário não consegue alterar.
create or replace view public.v_garantias with (security_invoker = true) as
select g.*, c.nome as cliente_nome, m.tipo_equipamento, m.marca, m.modelo, m.numero_serie,
       (coalesce(g.data_finalizacao, current_date) - g.data_entrada) as dias,
       (g.data_finalizacao is null) as aberta
from public.garantias g
join public.clientes c on c.id = g.cliente_id
left join public.maquinas m on m.id = g.maquina_id;

create or replace view public.v_orcamentos with (security_invoker = true) as
select o.*, c.nome as cliente_nome, m.tipo_equipamento, m.marca, m.modelo, m.numero_serie,
       g.numero as garantia_numero,
       (coalesce(o.data_finalizacao, current_date) - o.data_entrada) as dias,
       (o.data_finalizacao is null) as aberta
from public.orcamentos o
join public.clientes c on c.id = o.cliente_id
left join public.maquinas m on m.id = o.maquina_id
left join public.garantias g on g.id = o.garantia_origem_id;
