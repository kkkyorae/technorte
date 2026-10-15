// REGRAS DO PRAZO DE 30 DIAS (garantias e orçamentos).
// O número de dias é calculado pelo banco (views v_garantias / v_orcamentos), ninguém digita.
export type FaixaPrazo = "verde" | "amarelo" | "laranja" | "vermelho" | "excedido";

export function faixaPrazo(dias: number): FaixaPrazo {
  if (dias >= 30) return "excedido";
  if (dias >= 29) return "vermelho";
  if (dias >= 21) return "laranja";
  if (dias >= 11) return "amarelo";
  return "verde";
}

// Texto exibido ao lado dos dias (ex.: "Restam 5 dias", "2 dias de atraso")
export function textoPrazo(dias: number): string {
  if (dias > 30) return `${dias - 30} dia${dias - 30 > 1 ? "s" : ""} de atraso`;
  if (dias === 30) return "PRAZO EXCEDIDO";
  if (dias >= 25) { const r = 30 - dias; return `Restam ${r} dia${r > 1 ? "s" : ""}`; }
  return "";
}

export const FAIXAS: Record<string, { rotulo: string; min: number; max: number }> = {
  dentro: { rotulo: "Dentro do prazo", min: 0, max: 10 },
  atencao: { rotulo: "Atenção", min: 11, max: 20 },
  limite: { rotulo: "Próximos do limite", min: 21, max: 28 },
  critico: { rotulo: "Críticos", min: 29, max: 29 },
  excedido: { rotulo: "Prazo excedido", min: 30, max: 99999 },
};

export const ESTILO_FAIXA: Record<FaixaPrazo, { cor: string; linha: string; ponto: string }> = {
  verde: { cor: "bg-marca2/15 text-marca2", linha: "", ponto: "bg-marca2" },
  amarelo: { cor: "bg-aviso/15 text-aviso", linha: "bg-aviso/[0.03]", ponto: "bg-aviso" },
  laranja: { cor: "bg-laranja/15 text-laranja", linha: "bg-laranja/[0.05]", ponto: "bg-laranja" },
  vermelho: { cor: "bg-perigo/15 text-perigo", linha: "bg-perigo/[0.06]", ponto: "bg-perigo" },
  excedido: { cor: "bg-perigo/20 text-perigo", linha: "bg-perigo/[0.08]", ponto: "bg-perigo" },
};
