import clsx from "clsx";
import { Inbox } from "lucide-react";

// Cabeçalho de página: título + descrição + botão de ação, sempre no mesmo lugar
export function PageHeader({ titulo, descricao, acao }: { titulo: string; descricao?: string; acao?: React.ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{titulo}</h1>
        {descricao && <p className="mt-1 text-suave">{descricao}</p>}
      </div>
      {acao}
    </div>
  );
}

// Tela vazia amigável, com botão de ação
export function EmptyState({ titulo, acao }: { titulo: string; acao?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-4 py-14 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-full bg-marca/15 text-marca2"><Inbox className="h-6 w-6" /></div>
      <p className="max-w-sm text-suave">{titulo}</p>
      {acao}
    </div>
  );
}

// Carregamento: caixas cinzas arredondadas em vez de tela em branco
export const Skeleton = ({ className }: { className?: string }) => (
  <div className={clsx("animate-pulse rounded-xl bg-white/[0.06]", className)} />
);
export const ListaSkeleton = () => (
  <div className="space-y-3">{[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-14" />)}</div>
);

// Card de número do dashboard: ícone em círculo, número grande e texto pequeno
export function StatCard({ icone, titulo, valor, detalhe, href }: { icone: React.ReactNode; titulo: string; valor: React.ReactNode; detalhe?: string; href?: string }) {
  const conteudo = (
    <div className="h-full rounded-2xl bg-card borda-fina p-6 shadow-suave transition duration-200 hover:border-marca2/40">
      <div className="mb-4 grid h-11 w-11 place-items-center rounded-full bg-marca/15 text-marca2">{icone}</div>
      <div className="text-3xl font-semibold tracking-tight">{valor}</div>
      <div className="mt-1 text-[15px] text-suave">{titulo}</div>
      {detalhe && <div className="mt-1 text-sm text-suave/70">{detalhe}</div>}
    </div>
  );
  return href ? <a href={href}>{conteudo}</a> : conteudo;
}
