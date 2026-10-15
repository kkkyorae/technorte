"use client";
import { Archive, Pencil } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardTitulo } from "@/components/ui/card";
import { StatusPilula } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { ListaSkeleton, PageHeader } from "@/components/ui/page";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/lib/auth";
import { dataBR, dataHoraBR, moeda, pad } from "@/lib/formatar";
import { useCarregar } from "@/lib/hooks";
import { podeEditar, podeVer } from "@/lib/permissoes";
import { supabase } from "@/lib/supabase/client";
import { FormMaquina } from "@/components/forms/FormMaquina";

// Ficha da máquina: dá para abrir anos depois e ver tudo que já foi feito nela
export default function MaquinaDetalhe() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const { usuario } = useAuth();
  const p = usuario?.perfil;
  const [editando, setEditando] = useState(false);
  const { dados: d, carregando, recarregar } = useCarregar(async () => {
    const [m, g, o, h] = await Promise.all([
      supabase.from("maquinas").select("*,clientes(id,nome)").eq("id", id).single(),
      podeVer(p, "garantias") ? supabase.from("v_garantias").select("id,numero,status,data_entrada").eq("maquina_id", id).order("data_entrada", { ascending: false }) : null,
      podeVer(p, "orcamentos") ? supabase.from("v_orcamentos").select("id,numero_orcamento,status,data_entrada,valor_total").eq("maquina_id", id).order("data_entrada", { ascending: false }) : null,
      supabase.from("historico").select("acao,created_at,profiles(nome)").eq("maquina_id", id).order("created_at", { ascending: false }).limit(50),
    ]);
    return { m: m.data, g: g?.data ?? [], o: o?.data ?? [], h: h.data ?? [] };
  }, [id, p]);

  async function arquivar() {
    if (!confirm("Arquivar esta máquina? O histórico é mantido.")) return;
    const { error } = await supabase.from("maquinas").update({ arquivado: true }).eq("id", id);
    if (error) return toast.erro("Não foi possível arquivar.");
    toast.ok("✓ Máquina arquivada"); router.push("/maquinas");
  }
  if (carregando) return <ListaSkeleton />;
  if (!d?.m) return <p className="text-suave">Máquina não encontrada.</p>;
  const m = d.m;
  const editar = podeEditar(p, "maquinas");
  const linhas: [string, any][] = [["Tipo", m.tipo_equipamento], ["Marca", m.marca], ["Modelo", m.modelo], ["Nº de série", m.numero_serie], ["Identificação", m.numero_identificacao], ["Descrição", m.descricao]];

  return (
    <>
      <PageHeader titulo={`${m.tipo_equipamento} ${m.marca ?? ""} ${m.modelo ?? ""}`} descricao={`Cliente: ${m.clientes?.nome}`}
        acao={editar && <div className="flex gap-3"><Button variante="secundario" icone={<Pencil className="h-4 w-4" />} onClick={() => setEditando(true)}>Editar</Button><Button variante="fantasma" icone={<Archive className="h-4 w-4" />} onClick={arquivar}>Arquivar</Button></div>} />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardTitulo>Dados</CardTitulo>
          <dl className="space-y-3">{linhas.map(([k, v]) => <div key={k} className="flex justify-between gap-4"><dt className="text-suave">{k}</dt><dd className="text-right font-medium">{v || "—"}</dd></div>)}</dl>
          <Link href={`/clientes/${m.clientes?.id}`} className="mt-4 block text-sm font-semibold text-marca2">Ver cliente →</Link>
          {m.observacoes && <p className="mt-4 border-t border-white/[0.07] pt-3 text-suave">{m.observacoes}</p>}
        </Card>
        <Card className="lg:col-span-2">
          <CardTitulo>Garantias e orçamentos desta máquina</CardTitulo>
          {d.g.length + d.o.length === 0 && <p className="text-suave">Nenhum atendimento registrado.</p>}
          <div className="space-y-2">
            {d.g.map((g: any) => <Link key={g.id} href={`/garantias?abrir=${g.id}`} className="flex items-center justify-between rounded-xl bg-fundo2 px-4 py-3 hover:bg-white/[0.05]"><span>Garantia #{pad(g.numero)} · {dataBR(g.data_entrada)}</span><StatusPilula status={g.status} /></Link>)}
            {d.o.map((o: any) => <Link key={o.id} href={`/orcamentos?abrir=${o.id}`} className="flex items-center justify-between rounded-xl bg-fundo2 px-4 py-3 hover:bg-white/[0.05]"><span>Orçamento #{pad(o.numero_orcamento)} · {moeda(o.valor_total)}</span><StatusPilula status={o.status} /></Link>)}
          </div>
        </Card>
        <Card className="lg:col-span-3">
          <CardTitulo>Histórico da máquina</CardTitulo>
          {d.h.length === 0 && <p className="text-suave">Sem registros ainda.</p>}
          <ul className="space-y-4 border-l border-white/[0.1] pl-5">{d.h.map((h: any, i: number) => (
            <li key={i} className="relative"><span className="absolute -left-[26px] top-2 h-2.5 w-2.5 rounded-full bg-marca2" /><div className="text-sm text-suave">{dataHoraBR(h.created_at)} {h.profiles?.nome && `· ${h.profiles.nome}`}</div><div>→ {h.acao}</div></li>))}</ul>
        </Card>
      </div>
      <Modal aberto={editando} onFechar={() => setEditando(false)} titulo="Editar máquina">
        <FormMaquina inicial={{ ...m, cliente_nome: m.clientes?.nome }} onCancelar={() => setEditando(false)} onSalvo={() => { setEditando(false); recarregar(); }} />
      </Modal>
    </>
  );
}
