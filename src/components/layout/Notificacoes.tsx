"use client";
import { Bell } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useCarregar } from "@/lib/hooks";
import { textoPrazo } from "@/lib/prazo";
import { pad } from "@/lib/formatar";

// Sininho: lista garantias e orçamentos abertos com 21 dias ou mais (alertas automáticos de prazo)
export function Notificacoes() {
  const [aberto, setAberto] = useState(false);
  const { dados } = useCarregar(async () => {
    const [g, o] = await Promise.all([
      supabase.from("v_garantias").select("id,numero,cliente_nome,dias").eq("aberta", true).eq("arquivado", false).gte("dias", 21).order("dias", { ascending: false }).limit(20),
      supabase.from("v_orcamentos").select("id,numero_orcamento,cliente_nome,dias").eq("aberta", true).eq("arquivado", false).gte("dias", 21).order("dias", { ascending: false }).limit(20),
    ]);
    return [
      ...(g.data ?? []).map((x: any) => ({ k: "g" + x.id, titulo: `Garantia #${pad(x.numero)}`, href: `/garantias?abrir=${x.id}`, ...x })),
      ...(o.data ?? []).map((x: any) => ({ k: "o" + x.id, titulo: `Orçamento #${pad(x.numero_orcamento)}`, href: `/orcamentos?abrir=${x.id}`, ...x })),
    ].sort((a, b) => b.dias - a.dias);
  }, []);
  const lista = dados ?? [];

  return (
    <div className="relative">
      <button onClick={() => setAberto(!aberto)} aria-label="Notificações" className="relative grid h-11 w-11 place-items-center rounded-full bg-fundo2 borda-fina text-suave transition hover:text-texto">
        <Bell className="h-5 w-5" />
        {lista.length > 0 && <span className="absolute -right-1 -top-1 grid h-5 min-w-[20px] place-items-center rounded-full bg-perigo px-1 text-[11px] font-bold text-white">{lista.length}</span>}
      </button>
      {aberto && (
        <div className="absolute right-0 z-50 mt-2 max-h-96 w-80 overflow-y-auto rounded-2xl bg-card p-2 borda-fina shadow-suave">
          <div className="px-3 py-2 text-sm font-semibold text-suave">Alertas de prazo</div>
          {lista.length === 0 && <div className="px-3 py-4 text-sm text-suave">Nenhum prazo próximo do limite.</div>}
          {lista.map((n: any) => (
            <Link key={n.k} href={n.href} onClick={() => setAberto(false)} className="block rounded-xl px-3 py-3 transition hover:bg-white/[0.05]">
              <div className="flex justify-between gap-2"><span className="font-medium">{n.titulo}</span><span className={n.dias >= 29 ? "font-semibold text-perigo" : "font-semibold text-laranja"}>{n.dias} dias</span></div>
              <div className="truncate text-sm text-suave">{n.cliente_nome} {textoPrazo(n.dias) && `· ${textoPrazo(n.dias)}`}</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
