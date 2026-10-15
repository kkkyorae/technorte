import clsx from "clsx";

// Card padrão: fundo um pouco mais claro que a página, borda fina e cantos bem arredondados
export function Card({ className, children, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div {...rest} className={clsx("rounded-2xl bg-card borda-fina p-6 shadow-suave", className)}>
      {children}
    </div>
  );
}
export function CardTitulo({ children, acao }: { children: React.ReactNode; acao?: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <h2 className="text-lg font-semibold">{children}</h2>
      {acao}
    </div>
  );
}
