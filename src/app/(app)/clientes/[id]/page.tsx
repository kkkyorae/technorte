"use client";
import { Archive, Mail, MapPin, Pencil, Phone } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardTitulo } from "@/components/ui/card";
import { StatusPilula } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { ListaSkeleton, PageHeader } from "@/components/ui/page";
import { PrazoBadge } from "@/components/ui/prazo-badge";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/lib/auth";
import { dataBR, dataHoraBR, moeda, pad } from "@/lib/formatar";
import { useCarregar } from "@/lib/hooks";
import { podeEditar, podeVer } from "@/lib/permissoes";
import { supabase } from "@/lib/supabase/client";
import { FormCliente } from "@/components/forms/FormCliente";

// Ficha do cliente: dados + máquinas + garantias + orçamentos + financeiro + histórico completo
export default function ClienteDetalhe() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const { usuario } = useAuth();
  const p = usuario?.perfil;
  const [editando, setEditando] = useState(false);
  const { dados: d, carregando, recarregar } = useCarregar(async () => {
    const [c, m, g, o, f, h] = await Promise.all([
      supabase.from("clientes").select("*").eq("id", id).single(),
      supabase.from("maquinas").select("*").eq("cliente_id", id).eq("arquivado", false),
      podeVer(p, "garantias") ? supabase.from("v_garantias").select("id,numero,status,dias,aberta,data_entrada,tipo_equipamento,modelo").eq("cliente_id", id).order("data_entrada", { ascending: false }) : null,
      podeVer(p, "orcamentos") ? supabase.from("v_orcamentos").select("id,numero_orcamento,status,dias,aberta,valor_total,data_entrada").eq("cliente_id", id).order("data_entrada", { ascending: false }) : null,
      podeVer(p, "financeiro") ? supabase.from("financeiro").select("id,tipo,categoria,descricao,valor,data,pago").eq("cliente_id", id).order("data", { ascending: false }) : null,
      supabase.from("historico").select("acao,created_at,profiles(nome)").eq("cliente_id", id).order("created_at", { ascending: false }).limit(50),
    ]);
    return { c: c.data, m: m.data ?? [], g: g?.data ?? null, o: o?.data ?? null, f: f?.data ?? null, h: h.data ?? [] };
  }, [id, p]);

  async function arquivar() {
    if (!confirm("Arquivar este cliente? Ele sai das listas, mas o histórico é mantido.")) return;
    const { error } = await supabase.from("clientes").update({ arquivado: true }).eq("id", id);
    if (error) return toast.erro("Não foi possível arquivar.");
    toast.ok("✓ Cliente arquivado"); router.push("/clientes");
  }

  if (carregando) return <ListaSkeleton />;
  if (!d?.c) return <p className="text-suave">Cliente não encontrado.</p>;
  const c = d.c;
  const editar = podeEditar(p, "clientes");

  return (
    <>
      <PageHeader titulo={c.nome} descricao={c.cpf_cnpj || "Cliente"}
        acao={editar && <div className="flex gap-3"><Button variante="secundario" icone={<Pencil className="h-4 w-4" />} onClick={() => setEditando(true)}>Editar</Button><Button variante="fantasma" icone={<Archive className="h-4 w-4" />} onClick={arquivar}>Arquivar</Button></div>} />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="space-y-3">
          <CardTitulo>Contato</CardTitulo>
          <div className="flex items-center gap-3"><Phone className="h-4 w-4 text-marca2" />{c.telefone || "—"} {c.telefone_secundario && <span className="text-suave">/ {c.telefone_secundario}</span>}</div>
          <div className="flex items-center gap-3"><Mail className="h-4 w-4 text-marca2" />{c.email || "—"}</div>
          <div className="flex items-start gap-3"><MapPin className="mt-1 h-4 w-4 shrink-0 text-marca2" /><span>{[c.endereco, c.cidade && `${c.cidade}${c.estado ? "/" + c.estado : ""}`].filter(Boolean).join(" · ") || "—"}</span></div>
          {c.observacoes && <p className="border-t border-white/[0.07] pt-3 text-suave">{c.observacoes}</p>}
        </Card>

        <Card className="lg:col-span-2">
          <CardTitulo acao={editar && <Link href={`/maquinas?novo=${id}`} className="text-sm font-semibold text-marca2">+ Máquina</Link>}>Máquinas ({d.m.length})</CardTitulo>
          {d.m.length === 0 && <p className="text-suave">Nenhuma máquina cadastrada.</p>}
          <div className="space-y-2">{d.m.map((m: any) => (
            <Link key={m.id} href={`/maquinas/${m.id}`} className="flex items-center justify-between rounded-xl bg-fundo2 px-4 py-3 transition hover:bg-white/[0.05]">
              <span className="font-medium">{m.tipo_equipamento} {m.marca} {m.modelo}</span><span className="text-sm text-suave">Série {m.numero_serie || "—"}</span>
            </Link>))}</div>
        </Card>

        {d.g && (
          <Card className="lg:col-span-3">
            <CardTitulo>Garantias</CardTitulo>
            {d.g.length === 0 && <p className="text-suave">Nenhuma garantia.</p>}
            <div className="space-y-2">{d.g.map((g: any) => (
              <Link key={g.id} href={`/garantias?abrir=${g.id}`} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-fundo2 px-4 py-3 transition hover:bg-white/[0.05]">
                <span className="font-medium">Garantia #{pad(g.numero)} <span className="text-suave">· {dataBR(g.data_entrada)}</span></span><div className="flex items-center gap-3"><StatusPilula status={g.status} /><PrazoBadge dias={g.dias} aberta={g.aberta} /></div>
              </Link>))}</div>
          </Card>
        )}
        {d.o && (
          <Card className="lg:col-span-3">
            <CardTitulo>Orçamentos</CardTitulo>
            {d.o.length === 0 && <p className="text-suave">Nenhum orçamento.</p>}
            <div className="space-y-2">{d.o.map((o: any) => (
              <Link key={o.id} href={`/orcamentos?abrir=${o.id}`} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-fundo2 px-4 py-3 transition hover:bg-white/[0.05]">
                <span className="font-medium">Orçamento #{pad(o.numero_orcamento)} <span className="text-suave">· {moeda(o.valor_total)}</span></span><div className="flex items-center gap-3"><StatusPilula status={o.status} /><PrazoBadge dias={o.dias} aberta={o.aberta} /></div>
              </Link>))}</div>
          </Card>
        )}
        {d.f && d.f.length > 0 && (
          <Card className="lg:col-span-3">
            <CardTitulo>Financeiro relacionado</CardTitulo>
            <div className="space-y-2">{d.f.map((x: any) => (
              <div key={x.id} className="flex justify-between rounded-xl bg-fundo2 px-4 py-3"><span>{dataBR(x.data)} · {x.categoria} {x.descricao && `· ${x.descricao}`}</span><span className={x.tipo === "entrada" ? "font-semibold text-marca2" : "font-semibold text-perigo"}>{x.tipo === "saida" && "−"}{moeda(x.valor)}{!x.pago && " (pendente)"}</span></div>))}</div>
          </Card>
        )}
        <Card className="lg:col-span-3">
          <CardTitulo>Histórico completo</CardTitulo>
          {d.h.length === 0 && <p className="text-suave">Sem registros ainda.</p>}
          <ul className="space-y-4 border-l border-white/[0.1] pl-5">{d.h.map((h: any, i: number) => (
            <li key={i} className="relative"><span className="absolute -left-[26px] top-2 h-2.5 w-2.5 rounded-full bg-marca2" /><div className="text-sm text-suave">{dataHoraBR(h.created_at)} {h.profiles?.nome && `· ${h.profiles.nome}`}</div><div>→ {h.acao}</div></li>))}</ul>
        </Card>
      </div>
      <Modal aberto={editando} onFechar={() => setEditando(false)} titulo="Editar cliente">
        <FormCliente inicial={c} onCancelar={() => setEditando(false)} onSalvo={() => { setEditando(false); recarregar(); }} />
      </Modal>
    </>
  );
}
