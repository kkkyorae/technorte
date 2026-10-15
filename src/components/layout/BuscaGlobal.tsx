"use client";
import { Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useDebounce } from "@/lib/hooks";
import { limparBusca } from "@/lib/formatar";

// Busca global: procura clientes, máquinas, séries, garantias, orçamentos e peças de uma vez
// (usa a função busca_global do banco, que já respeita as permissões).
export function BuscaGlobal() {
  const [texto, setTexto] = useState("");
  const [res, setRes] = useState<any[]>([]);
  const [aberto, setAberto] = useState(false);
  const q = useDebounce(texto);

  useEffect(() => {
    if (q.trim().length < 2) { setRes([]); return; }
    supabase.rpc("busca_global", { q: limparBusca(q) }).then(({ data }) => setRes(data ?? []));
  }, [q]);

  return (
    <div className="relative w-full max-w-xl">
      <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-suave" />
      <input value={texto} onChange={(e) => { setTexto(e.target.value); setAberto(true); }} onFocus={() => setAberto(true)} onBlur={() => setTimeout(() => setAberto(false), 200)}
        placeholder="Buscar cliente, série, NF, orçamento, peça..." className="campo rounded-full pl-11" />
      {aberto && q.trim().length >= 2 && (
        <div className="absolute z-50 mt-2 max-h-96 w-full overflow-y-auto rounded-2xl bg-card p-2 borda-fina shadow-suave">
          {res.length === 0 && <div className="px-4 py-3 text-suave">Nenhum resultado encontrado.</div>}
          {res.map((r) => (
            <Link key={r.tipo + r.id} href={r.link} onClick={() => { setTexto(""); setAberto(false); }} className="flex items-center justify-between gap-3 rounded-xl px-4 py-3 transition hover:bg-white/[0.05]">
              <div className="min-w-0"><div className="truncate font-medium">{r.titulo}</div><div className="truncate text-sm text-suave">{r.subtitulo}</div></div>
              <span className="rounded-full bg-marca/15 px-3 py-1 text-xs font-semibold text-marca2">{r.tipo}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
