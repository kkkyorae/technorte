"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { PageHeader, ListaSkeleton } from "@/components/ui/page";
import { PrazoBadge } from "@/components/ui/prazo-badge";
import { Tabela } from "@/components/ui/tabela";
import { Pilula } from "@/components/ui/badge";
import { useCarregar } from "@/lib/hooks";
import { pad } from "@/lib/formatar";
import { FAIXAS } from "@/lib/prazo";
import { supabase } from "@/lib/supabase/client";

// Abre ao clicar num número do "Controle de prazo": lista garantias E orçamentos daquela faixa
export default function Prazos() {
  const faixa = useSearchParams().get("faixa") ?? "excedido";
  const f = FAIXAS[faixa] ?? FAIXAS.excedido;
  const { dados, carregando } = useCarregar(async () => {
    const [g, o] = await Promise.all([
      supabase.from("v_garantias").select("id,numero,cliente_nome,status,dias,aberta").eq("aberta", true).eq("arquivado", false).gte("dias", f.min).lte("dias", f.max),
      supabase.from("v_orcamentos").select("id,numero_orcamento,cliente_nome,status,dias,aberta").eq("aberta", true).eq("arquivado", false).gte("dias", f.min).lte("dias", f.max),
    ]);
    return [
      ...(g.data ?? []).map((x: any) => ({ ...x, id: "g" + x.id, tipo: "Garantia", num: x.numero, href: `/garantias?abrir=${x.id}` })),
      ...(o.data ?? []).map((x: any) => ({ ...x, id: "o" + x.id, tipo: "Orçamento", num: x.numero_orcamento, href: `/orcamentos?abrir=${x.id}` })),
    ].sort((a, b) => b.dias - a.dias); // mais antigos primeiro
  }, [faixa]);

  return (
    <>
      <PageHeader titulo={f.rotulo} descricao="Garantias e orçamentos nesta faixa de prazo (mais antigos primeiro)" />
      {carregando ? <ListaSkeleton /> : (
        <Tabela colunas={[
          { titulo: "Registro", render: (l: any) => <Link href={l.href} className="font-semibold hover:text-marca2">{l.tipo} #{pad(l.num)}</Link> },
          { titulo: "Cliente", render: (l: any) => l.cliente_nome },
          { titulo: "Status", render: (l: any) => <Pilula>{l.status}</Pilula> },
          { titulo: "Prazo", render: (l: any) => <PrazoBadge dias={l.dias} aberta={l.aberta} /> },
        ]} linhas={dados ?? []} />
      )}
    </>
  );
}
