import clsx from "clsx";
import { EmptyState } from "./page";

// Tabela responsiva: no computador vira tabela; no celular, cada linha vira um card empilhado.
export type Coluna<T> = { titulo: string; render: (l: T) => React.ReactNode; className?: string };

export function Tabela<T extends { id: string }>({ colunas, linhas, aoClicar, classeLinha, vazio }: {
  colunas: Coluna<T>[]; linhas: T[]; aoClicar?: (l: T) => void; classeLinha?: (l: T) => string; vazio?: React.ReactNode;
}) {
  if (!linhas.length) return <>{vazio ?? <EmptyState titulo="Nada por aqui ainda." />}</>;
  return (
    <>
      {/* Computador / tablet */}
      <div className="hidden overflow-hidden rounded-2xl bg-card borda-fina md:block">
        <table className="w-full text-left text-[15px]">
          <thead className="bg-white/[0.03] text-sm text-suave">
            <tr>{colunas.map((c) => <th key={c.titulo} className={clsx("px-5 py-4 font-medium", c.className)}>{c.titulo}</th>)}</tr>
          </thead>
          <tbody>
            {linhas.map((l) => (
              <tr key={l.id} onClick={() => aoClicar?.(l)}
                className={clsx("border-t border-white/[0.05] transition duration-150 hover:bg-white/[0.03]", aoClicar && "cursor-pointer", classeLinha?.(l))}>
                {colunas.map((c) => <td key={c.titulo} className={clsx("px-5 py-4 align-middle", c.className)}>{c.render(l)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Celular */}
      <div className="space-y-3 md:hidden">
        {linhas.map((l) => (
          <div key={l.id} onClick={() => aoClicar?.(l)} className={clsx("rounded-2xl bg-card borda-fina p-4", classeLinha?.(l))}>
            {colunas.map((c, i) => (
              <div key={c.titulo} className={clsx("flex items-start justify-between gap-3 py-1.5", i === 0 && "text-base font-semibold")}>
                {i > 0 && <span className="text-sm text-suave">{c.titulo}</span>}
                <span className={clsx(i > 0 && "text-right")}>{c.render(l)}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </>
  );
}
