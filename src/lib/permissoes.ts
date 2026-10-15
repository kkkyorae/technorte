// QUEM PODE VER/EDITAR CADA MÓDULO (só controla o que aparece na tela).
// A proteção de verdade está no banco (RLS) - veja supabase/03_seguranca_rls_storage.sql.
export type Perfil = "admin" | "funcionario" | "estoque" | "financeiro";
export type Modulo = "dashboard" | "clientes" | "maquinas" | "garantias" | "orcamentos" | "estoque" | "financeiro" | "usuarios" | "configuracoes";

const VER: Record<Perfil, Modulo[]> = {
  admin: ["dashboard", "clientes", "maquinas", "garantias", "orcamentos", "estoque", "financeiro", "usuarios", "configuracoes"],
  funcionario: ["dashboard", "clientes", "maquinas", "garantias", "orcamentos", "estoque"],
  estoque: ["dashboard", "clientes", "maquinas", "estoque"],
  financeiro: ["dashboard", "clientes", "garantias", "orcamentos", "financeiro"],
};
const EDITAR: Record<Perfil, Modulo[]> = {
  admin: VER.admin,
  funcionario: ["clientes", "maquinas", "garantias", "orcamentos", "estoque"],
  estoque: ["estoque"],
  financeiro: ["financeiro"],
};

export const podeVer = (p: Perfil | undefined, m: Modulo) => !!p && VER[p].includes(m);
export const podeEditar = (p: Perfil | undefined, m: Modulo) => !!p && EDITAR[p].includes(m);
export const NOME_PERFIL: Record<Perfil, string> = { admin: "Administrador", funcionario: "Funcionário", estoque: "Estoque", financeiro: "Financeiro" };
