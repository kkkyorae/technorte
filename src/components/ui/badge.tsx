import clsx from "clsx";

// Pílula colorida para status. Cores só de status (verde, amarelo, laranja, vermelho, neutro).
const TONS = {
  verde: "bg-marca2/15 text-marca2", amarelo: "bg-aviso/15 text-aviso", laranja: "bg-laranja/15 text-laranja",
  vermelho: "bg-perigo/15 text-perigo", neutro: "bg-white/[0.08] text-suave",
};
export function Pilula({ tom = "neutro", children, className }: { tom?: keyof typeof TONS; children: React.ReactNode; className?: string }) {
  return <span className={clsx("inline-flex items-center gap-1 whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold", TONS[tom], className)}>{children}</span>;
}

// Cor de cada status de garantia/orçamento
export function tomStatus(s: string): keyof typeof TONS {
  if (["Aprovada", "Autorizado", "Pronta", "Pronto", "Entregue", "Finalizado"].includes(s)) return "verde";
  if (["Recusada", "Recusado"].includes(s)) return "vermelho";
  if (["Encaminhada", "Encaminhado", "Auditoria"].includes(s)) return "amarelo";
  return "neutro";
}
export const StatusPilula = ({ status }: { status: string }) => <Pilula tom={tomStatus(status)}>{status}</Pilula>;
