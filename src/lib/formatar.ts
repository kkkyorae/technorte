// Funções de formatação (dinheiro, datas) em português do Brasil
export const moeda = (v: any) => Number(v ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export const numero = (v: any) => Number(v ?? 0).toLocaleString("pt-BR", { maximumFractionDigits: 2 });

// Datas "AAAA-MM-DD" são tratadas como texto para não sofrerem erro de fuso horário
export const dataBR = (d?: string | null) => (d ? d.slice(0, 10).split("-").reverse().join("/") : "—");
export const dataHoraBR = (d?: string | null) =>
  d ? new Date(d).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "—";
export const hoje = () => new Date().toLocaleDateString("sv-SE"); // AAAA-MM-DD no horário local
export const pad = (n: any, t = 3) => String(n ?? "").padStart(t, "0");
export const limparBusca = (s: string) => s.replace(/[%,()]/g, " ").trim(); // evita quebrar filtros do Supabase
