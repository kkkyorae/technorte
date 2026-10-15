// Logo em texto: TECHNORTE com o "NORTE" em verde
export function Logo({ pequeno }: { pequeno?: boolean }) {
  return (
    <span className={pequeno ? "text-xl font-bold tracking-tight" : "text-3xl font-bold tracking-tight"}>
      TECH<span className="text-marca2">NORTE</span>
    </span>
  );
}
