-- =====================================================================
-- TECHNORTE - 01: TABELAS
-- Rode este arquivo PRIMEIRO no Supabase (SQL Editor > New query > Run).
-- =====================================================================
create extension if not exists pg_trgm; -- deixa a pesquisa rápida mesmo com milhares de registros

-- Usuários do sistema (ligado ao login do Supabase Auth)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null default '',
  email text,
  cargo text,
  perfil text not null default 'funcionario' check (perfil in ('admin','funcionario','estoque','financeiro')),
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

-- Dados da empresa usados no PDF do orçamento (sempre 1 única linha)
create table public.configuracoes (
  id int primary key default 1 check (id = 1),
  empresa_nome text default 'TECHNORTE',
  telefone text, email text, endereco text,
  condicoes_orcamento text default 'Orçamento válido pelo prazo indicado. Peças com garantia conforme o fabricante.',
  validade_dias int default 15
);
insert into public.configuracoes (id) values (1) on conflict do nothing;

create table public.clientes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  cpf_cnpj text, telefone text, telefone_secundario text, email text,
  endereco text, cidade text, estado text, observacoes text,
  arquivado boolean not null default false, -- "arquivar" em vez de apagar
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.maquinas (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes(id),
  tipo_equipamento text not null,
  marca text, modelo text, numero_serie text, numero_identificacao text,
  descricao text, observacoes text,
  arquivado boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.garantias (
  id uuid primary key default gen_random_uuid(),
  numero bigint generated always as identity unique, -- número da garantia (#001, #002...)
  cliente_id uuid not null references public.clientes(id),
  maquina_id uuid references public.maquinas(id),
  numero_nf text, ordem_servico_fabrica text,
  data_entrada date not null default current_date,
  data_encaminhamento date, data_aprovacao date, data_recusa date, data_entrega date,
  valor_reparo numeric(12,2) default 0,
  descricao_problema text, observacoes text,
  status text not null default 'Entrada'
    check (status in ('Entrada','Em análise','Encaminhada','Auditoria','Aprovada','Recusada','Pronta','Entregue')),
  criado_por uuid references public.profiles(id),
  data_finalizacao date, -- preenchida automaticamente: para de contar o prazo
  arquivado boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.documentos_garantia (
  id uuid primary key default gen_random_uuid(),
  garantia_id uuid not null references public.garantias(id),
  tipo_documento text not null default 'outro', -- nfe | equipamento | outro
  arquivo_url text not null,                    -- caminho do arquivo no Supabase Storage
  nome_arquivo text,
  enviado_por uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.orcamentos (
  id uuid primary key default gen_random_uuid(),
  numero_orcamento bigint generated always as identity unique,
  cliente_id uuid not null references public.clientes(id),
  maquina_id uuid references public.maquinas(id),
  garantia_origem_id uuid references public.garantias(id), -- preenchido quando veio de garantia recusada
  data_entrada date not null default current_date,
  validade date,
  status text not null default 'Rascunho'
    check (status in ('Rascunho','Encaminhado','Autorizado','Recusado','Pronto','Finalizado')),
  desconto numeric(12,2) not null default 0,
  valor_total numeric(12,2) not null default 0, -- calculado automaticamente pelo banco
  observacoes text,
  created_by uuid references public.profiles(id),
  data_finalizacao date,
  arquivado boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.orcamento_itens (
  id uuid primary key default gen_random_uuid(),
  orcamento_id uuid not null references public.orcamentos(id) on delete cascade,
  descricao text not null,
  quantidade numeric(12,2) not null default 1,
  valor_unitario numeric(12,2) not null default 0,
  valor_total numeric(12,2) generated always as (quantidade * valor_unitario) stored
);

create table public.estoque (
  id uuid primary key default gen_random_uuid(),
  nome_peca text not null,
  codigo text unique,
  descricao text,
  quantidade numeric(12,2) not null default 0,
  unidade text not null default 'un',
  valor_unitario numeric(12,2) not null default 0,
  estoque_minimo numeric(12,2) not null default 0,
  localizacao text, observacoes text,
  arquivado boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.movimentacoes_estoque (
  id uuid primary key default gen_random_uuid(),
  estoque_id uuid not null references public.estoque(id),
  tipo text not null check (tipo in ('entrada','saida','ajuste')),
  quantidade numeric(12,2) not null,
  valor numeric(12,2),
  motivo text,
  usuario_id uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.financeiro (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('entrada','saida')),
  categoria text not null,
  descricao text,
  valor numeric(12,2) not null check (valor >= 0),
  data date not null default current_date,
  cliente_id uuid references public.clientes(id),
  orcamento_id uuid references public.orcamentos(id),
  garantia_id uuid references public.garantias(id),
  pago boolean not null default false,
  observacoes text,
  criado_por uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

-- Histórico de tudo que acontece (cliente, máquina, garantia, orçamento, estoque, financeiro).
-- Nunca é apagado: é ele que substitui as folhas de papel.
create table public.historico (
  id uuid primary key default gen_random_uuid(),
  entidade text not null,            -- garantia | orcamento | estoque | financeiro
  entidade_id uuid,
  cliente_id uuid references public.clientes(id),
  maquina_id uuid references public.maquinas(id),
  acao text not null,
  usuario_id uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

-- Índices: deixam as buscas rápidas com milhares de registros
create index on public.clientes using gin (nome gin_trgm_ops);
create index on public.clientes using gin (telefone gin_trgm_ops);
create index on public.maquinas using gin (numero_serie gin_trgm_ops);
create index on public.maquinas using gin (numero_identificacao gin_trgm_ops);
create index on public.estoque using gin (nome_peca gin_trgm_ops);
create index on public.estoque using gin (codigo gin_trgm_ops);
create index on public.garantias using gin (numero_nf gin_trgm_ops);
create index on public.garantias using gin (ordem_servico_fabrica gin_trgm_ops);
create index on public.maquinas (cliente_id);
create index on public.garantias (cliente_id);
create index on public.garantias (maquina_id);
create index on public.garantias (data_entrada);
create index on public.orcamentos (cliente_id);
create index on public.orcamentos (maquina_id);
create index on public.orcamentos (data_entrada);
create index on public.financeiro (data);
create index on public.historico (cliente_id);
create index on public.historico (maquina_id);
create index on public.historico (created_at desc);
