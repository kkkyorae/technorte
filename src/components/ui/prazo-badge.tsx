import clsx from "clsx";
import { AlertTriangle } from "lucide-react";
import { ESTILO_FAIXA, faixaPrazo, textoPrazo } from "@/lib/prazo";

// Indicador do PRAZO: bolinha colorida + dias + aviso ("Restam 3 dias", "PRAZO EXCEDIDO"...).
// Se o item já foi finalizado, mostra só "Tempo total: X dias" (o histórico do prazo é mantido).
export function PrazoBadge({ dias, aberta }: { dias: number; aberta: boolean }) {
  if (!aberta) return <span className="text-sm text-suave">Tempo total: {dias} dia{dias === 1 ? "" : "s"}</span>;
  const f = faixaPrazo(dias);
  const aviso = textoPrazo(dias);
  return (
    <div className={clsx("inline-flex flex-col rounded-xl px-3 py-1.5", ESTILO_FAIXA[f].cor)}>
      <span className="flex items-center gap-1.5 text-sm font-semibold">
        {f === "excedido" ? <AlertTriangle className="h-4 w-4" /> : <span className={clsx("h-2.5 w-2.5 rounded-full", ESTILO_FAIXA[f].ponto)} />}
        {dias} dia{dias === 1 ? "" : "s"}
      </span>
      {aviso && <span className="text-xs font-semibold">{aviso}</span>}
    </div>
  );
}
