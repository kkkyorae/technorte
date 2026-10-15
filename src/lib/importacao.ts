import { supabase } from "@/lib/supabase/client";

// Lê TODAS as linhas de uma tabela (o Supabase entrega no máximo 1000 por vez, então vamos paginando)
export async function buscarTudo(tabela: string, colunas: string) {
  const todas: any[] = [];
  for (let de = 0; ; de += 1000) {
    const { data, error } = await supabase.from(tabela).select(colunas).range(de, de + 999);
    if (error) throw error;
    todas.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  return todas;
}

const sem = (s: any) => String(s ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");

// Nomes de coluna aceitos na planilha (não precisa ser exatamente igual ao modelo)
const ALIAS: Record<string, string[]> = {
  cliente: ["cliente", "nome", "nomecliente", "proprietario"],
  telefone: ["telefone", "fone", "celular", "contato"],
  tipo_equipamento: ["tipo", "tipoequipamento", "equipamento", "maquina", "tipodeequipamento"],
  marca: ["marca", "fabricante"],
  modelo: ["modelo"],
  numero_serie: ["serie", "numeroserie", "nserie", "ndeserie", "numerodeserie", "ns"],
  numero_identificacao: ["identificacao", "numeroidentificacao", "nidentificacao", "ndeidentificacao", "tag", "patrimonio"],
  observacoes: ["observacoes", "observacao", "obs"],
};

export type LinhaImport = {
  n: number; cliente: string; telefone: string; tipo_equipamento: string; marca: string; modelo: string;
  numero_serie: string; numero_identificacao: string; observacoes: string;
  situacao: "novo" | "duplicado" | "erro"; motivo: string; incluir: boolean;
};

// Converte as linhas cruas da planilha para o formato do sistema
export function normalizar(brutas: any[]): LinhaImport[] {
  return brutas.map((r, i) => {
    const o: any = { n: i + 2 }; // +2 porque a linha 1 da planilha é o cabeçalho
    const chaves = Object.keys(r);
    for (const campo of Object.keys(ALIAS)) {
      const k = chaves.find((c) => ALIAS[campo].includes(sem(c)));
      o[campo] = k ? String(r[k] ?? "").trim() : "";
    }
    return o as LinhaImport;
  }).filter((l) => l.cliente || l.tipo_equipamento || l.numero_serie); // ignora linhas totalmente vazias
}

// Valida e marca possíveis duplicados (por série, por identificação, ou por cliente+equipamento+modelo)
export async function analisar(linhas: LinhaImport[]) {
  const existentes = await buscarTudo("maquinas", "numero_serie,numero_identificacao,tipo_equipamento,modelo,clientes(nome)");
  const series = new Set(existentes.map((m) => sem(m.numero_serie)).filter(Boolean));
  const idents = new Set(existentes.map((m) => sem(m.numero_identificacao)).filter(Boolean));
  const combos = new Set(existentes.map((m) => `${sem(m.clientes?.nome)}|${sem(m.tipo_equipamento)}|${sem(m.modelo)}`));

  return linhas.map((l) => {
    const serie = sem(l.numero_serie), ident = sem(l.numero_identificacao), combo = `${sem(l.cliente)}|${sem(l.tipo_equipamento)}|${sem(l.modelo)}`;
    l.situacao = "novo"; l.motivo = ""; l.incluir = true;
    if (!l.cliente) { l.situacao = "erro"; l.motivo = "Falta o nome do cliente"; l.incluir = false; return l; }
    if (!l.tipo_equipamento) { l.situacao = "erro"; l.motivo = "Falta o tipo de equipamento"; l.incluir = false; return l; }
    if (serie && series.has(serie)) { l.situacao = "duplicado"; l.motivo = "Número de série já existe"; }
    else if (ident && idents.has(ident)) { l.situacao = "duplicado"; l.motivo = "Número de identificação já existe"; }
    else if (!serie && !ident && combos.has(combo)) { l.situacao = "duplicado"; l.motivo = "Mesmo cliente + equipamento + modelo"; }
    if (l.situacao === "duplicado") l.incluir = false; // duplicados só entram se o usuário marcar
    if (serie) series.add(serie); if (ident) idents.add(ident); combos.add(combo); // detecta repetidos dentro da própria planilha
    return l;
  });
}

// Grava no banco: cria os clientes que ainda não existem e depois as máquinas, em lotes de 500
export async function importar(linhas: LinhaImport[], progresso: (p: number) => void) {
  const sel = linhas.filter((l) => l.incluir && l.situacao !== "erro");
  const clientes = await buscarTudo("clientes", "id,nome");
  const mapa = new Map<string, string>(clientes.map((c) => [sem(c.nome), c.id]));

  const novos = new Map<string, any>();
  sel.forEach((l) => { if (!mapa.has(sem(l.cliente)) && !novos.has(sem(l.cliente))) novos.set(sem(l.cliente), { nome: l.cliente, telefone: l.telefone || null }); });
  const listaNovos = Array.from(novos.values());
  for (let i = 0; i < listaNovos.length; i += 500) {
    const { data, error } = await supabase.from("clientes").insert(listaNovos.slice(i, i + 500)).select("id,nome");
    if (error) throw error;
    data!.forEach((c) => mapa.set(sem(c.nome), c.id));
  }
  for (let i = 0; i < sel.length; i += 500) {
    const lote = sel.slice(i, i + 500).map((l) => ({
      cliente_id: mapa.get(sem(l.cliente)), tipo_equipamento: l.tipo_equipamento, marca: l.marca || null, modelo: l.modelo || null,
      numero_serie: l.numero_serie || null, numero_identificacao: l.numero_identificacao || null, observacoes: l.observacoes || null,
    }));
    const { error } = await supabase.from("maquinas").insert(lote);
    if (error) throw error;
    progresso(Math.min(100, Math.round(((i + lote.length) / sel.length) * 100)));
  }
  return { maquinas: sel.length, clientesNovos: listaNovos.length };
}
