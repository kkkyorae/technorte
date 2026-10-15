"use client";
import clsx from "clsx";
import { Archive, FileDown, HandCoins, Pencil, Plus, Search } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { FormOrcamento } from "@/components/forms/FormOrcamento";
import { StatusPilula } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";
import { EmptyState, ListaSkeleton, PageHeader } from "@/components/ui/page";
import { PrazoBadge } from "@/components/ui/prazo-badge";
import { Tabela } from "@/components/ui/tabela";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/lib/auth";
import { STATUS_ORCAMENTO } from "@/lib/constantes";
import { dataBR, limparBusca, moeda, pad } from "@/lib/formatar";
import { useCarregar, useDebounce } from "@/lib/hooks";
import { podeEditar } from "@/lib/permissoes";
import { gerarOrcamentoPdf } from "@/lib/pdf";
import { ESTILO_FAIXA, FAIXAS, faixaPrazo } from "@/lib/prazo";
import { supabase } from "@/lib/supabase/client";

// ---------- Detalhe do orçamento ----------
function Detalhe({ o, editar, onFechar, onMudou }: { o: any; editar: boolean; onFechar: () => void; onMudou: () => void }) {
  const toast = useToast();
  const { usuario } = useAuth();
  const [status, setStatus] = useState(o.status);
  const [editando, setEditando] = useState(false);
  const { dados: itens } = useCarregar(async () => (await supabase.from("orcamento_itens").select("*").eq("orcamento_id", o.id).order("descricao")).data ?? [], [o.id]);

  async function mudarStatus() {
    if (status === o.status || !confirm(`Alterar o status do orçamento #${pad(o.numero_orcamento)} para "${status}"?`)) return;
    const { error } = await supabase.from("orcamentos").update({ status }).eq("id", o.id);
    if (error) return toast.erro("Não foi possível alterar o status.");
    toast.ok(`✓ Status alterado para ${status}`); onMudou();
  }
  async function pdf() {
    const [{ data: cliente }, { data: empresa }] = await Promise.all([
      supabase.from("clientes").select("*").eq("id", o.cliente_id).single(),
      supabase.from("configuracoes").select("*").eq("id", 1).single(),
    ]);
    gerarOrcamentoPdf(o, itens ?? [], cliente, empresa);
    toast.ok("✓ PDF gerado com sucesso");
  }
  async function lancarFinanceiro() {
    if (!confirm(`Lançar ${moeda(o.valor_total)} como entrada pendente no financeiro?`)) return;
    const { error } = await supabase.from("financeiro").insert({ tipo: "entrada", categoria: "Orçamento", descricao: `Orçamento #${pad(o.numero_orcamento)}`, valor: o.valor_total, cliente_id: o.cliente_id, orcamento_id: o.id, pago: false });
    if (error) return toast.erro("Não foi possível lançar. " + error.message);
    toast.ok("✓ Lançado no financeiro como pendente");
  }
  async function arquivar() {
    if (!confirm("Arquivar este orçamento? O histórico é mantido.")) return;
    const { error } = await supabase.from("orcamentos").update({ arquivado: true }).eq("id", o.id);
    if (error) return toast.erro("Não foi possível arquivar.");
    toast.ok("✓ Orçamento arquivado"); onMudou(); onFechar();
  }

  if (editando) return <FormOrcamento inicial={o} itensIniciais={itens ?? []} onCancelar={() => setEditando(false)} onSalvo={() => { setEditando(false); onMudou(); }} />;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3"><StatusPilula status={o.status} /><PrazoBadge dias={o.dias} aberta={o.aberta} />{o.garantia_numero && <span className="text-sm text-aviso">Origem: garantia #{pad(o.garantia_numero)} recusada</span>}</div>
      <div className="grid gap-2 sm:grid-cols-2">
        <div><span className="text-suave">Cliente: </span><b>{o.cliente_nome}</b></div>
        <div><span className="text-suave">Equipamento: </span>{[o.tipo_equipamento, o.marca, o.modelo].filter(Boolean).join(" ") || "—"}</div>
        <div><span className="text-suave">Data: </span>{dataBR(o.data_entrada)}</div><div><span className="text-suave">Validade: </span>{dataBR(o.validade)}</div>
      </div>
      <div className="overflow-hidden rounded-2xl borda-fina">
        <table className="w-full text-[15px]"><thead className="bg-white/[0.04] text-sm text-suave"><tr><th className="px-4 py-3 text-left">Descrição</th><th className="px-4 py-3 text-right">Qtd.</th><th className="px-4 py-3 text-right">Unit.</th><th className="px-4 py-3 text-right">Total</th></tr></thead>
          <tbody>{(itens ?? []).map((i: any) => <tr key={i.id} className="border-t border-white/[0.05]"><td className="px-4 py-3">{i.descricao}</td><td className="px-4 py-3 text-right">{i.quantidade}</td><td className="px-4 py-3 text-right">{moeda(i.valor_unitario)}</td><td className="px-4 py-3 text-right">{moeda(i.valor_total)}</td></tr>)}</tbody></table>
        <div className="space-y-1 border-t border-white/[0.07] bg-white/[0.02] px-4 py-3 text-right"><div className="text-suave">Desconto: {moeda(o.desconto)}</div><div className="text-xl font-semibold text-marca2">Total: {moeda(o.valor_total)}</div></div>
      </div>
      {o.observacoes && <p className="whitespace-pre-line text-suave">{o.observacoes}</p>}
      <div className="flex flex-wrap items-end gap-3 rounded-2xl bg-fundo2 p-4">
        {editar && <><div className="min-w-[180px] flex-1"><div className="mb-1.5 text-sm text-suave">Status</div><Select value={status} onChange={(e) => setStatus(e.target.value)}>{STATUS_ORCAMENTO.map((s) => <option key={s}>{s}</option>)}</Select></div>
          <Button onClick={mudarStatus} disabled={status === o.status}>Alterar status</Button></>}
        <Button variante="secundario" icone={<FileDown className="h-4 w-4" />} onClick={pdf}>Gerar orçamento PDF</Button>
        {podeEditar(usuario?.perfil, "financeiro") && <Button variante="secundario" icone={<HandCoins className="h-4 w-4" />} onClick={lancarFinanceiro}>Lançar no financeiro</Button>}
      </div>
      {editar && <div className="flex justify-end gap-3 border-t border-white/[0.07] pt-4"><Button variante="fantasma" icone={<Archive className="h-4 w-4" />} onClick={arquivar}>Arquivar</Button><Button variante="secundario" icone={<Pencil className="h-4 w-4" />} onClick={() => setEditando(true)}>Editar</Button></div>}
    </div>
  );
}

export default function Orcamentos() {
  const params = useSearchParams();
  const { usuario } = useAuth();
  const editar = podeEditar(usuario?.perfil, "orcamentos");
  const [busca, setBusca] = useState("");
  const [situacao, setSituacao] = useState("abertas");
  const [status, setStatus] = useState("");
  const [faixa, setFaixa] = useState("");
  const [antigosPrimeiro, setAntigos] = useState(true);
  const [novo, setNovo] = useState(false);
  const [detalhe, setDetalhe] = useState<any>(null);
  const q = useDebounce(busca);

  const { dados, carregando, recarregar } = useCarregar(async () => {
    let qb = supabase.from("v_orcamentos").select("*").eq("arquivado", false).limit(300).order("data_entrada", { ascending: antigosPrimeiro });
    if (situacao !== "todas") qb = qb.eq("aberta", situacao === "abertas");
    if (status) qb = qb.eq("status", status);
    if (faixa) qb = qb.eq("aberta", true).gte("dias", FAIXAS[faixa].min).lte("dias", FAIXAS[faixa].max);
    if (q.trim()) { const t = limparBusca(q); qb = qb.or(`cliente_nome.ilike.%${t}%,numero_serie.ilike.%${t}%${/^\d+$/.test(t) ? `,numero_orcamento.eq.${t}` : ""}`); }
    return (await qb).data ?? [];
  }, [q, situacao, status, faixa, antigosPrimeiro]);

  const abrirId = params.get("abrir");
  useEffect(() => {
    if (!abrirId) return;
    supabase.from("v_orcamentos").select("*").eq("id", abrirId).single().then(({ data }) => data && setDetalhe(data));
  }, [abrirId]);

  const pilulas = [["", "Todos"], ...Object.entries(FAIXAS).map(([k, v]) => [k, v.rotulo])];
  return (
    <>
      <PageHeader titulo="Orçamentos" descricao="Orçamentos normais e vindos de garantias recusadas"
        acao={editar && <Button icone={<Plus className="h-5 w-5" />} onClick={() => setNovo(true)}>Novo orçamento</Button>} />
      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative min-w-[240px] flex-1"><Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-suave" />
          <input className="campo rounded-full pl-11" placeholder="Cliente, série ou nº do orçamento..." value={busca} onChange={(e) => setBusca(e.target.value)} /></div>
        <Select className="w-auto rounded-full" value={situacao} onChange={(e) => setSituacao(e.target.value)}><option value="abertas">Em andamento</option><option value="finalizadas">Finalizados</option><option value="todas">Todos</option></Select>
        <Select className="w-auto rounded-full" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">Todos os status</option>{STATUS_ORCAMENTO.map((s) => <option key={s}>{s}</option>)}</Select>
        <Select className="w-auto rounded-full" value={antigosPrimeiro ? "a" : "n"} onChange={(e) => setAntigos(e.target.value === "a")}><option value="a">Mais antigos primeiro</option><option value="n">Mais novos primeiro</option></Select>
      </div>
      <div className="mb-6 flex flex-wrap gap-2">{pilulas.map(([k, r]) => (
        <button key={k} onClick={() => setFaixa(k)} className={clsx("min-h-[40px] rounded-full px-4 text-sm font-medium transition", faixa === k ? "bg-marca text-white" : "bg-fundo2 borda-fina text-suave hover:text-texto")}>{r}</button>))}</div>
      {carregando ? <ListaSkeleton /> : (
        <Tabela linhas={dados ?? []} aoClicar={setDetalhe} classeLinha={(o: any) => (o.aberta ? ESTILO_FAIXA[faixaPrazo(o.dias)].linha : "")}
          vazio={<EmptyState titulo="Nenhum orçamento encontrado." acao={editar && <Button onClick={() => setNovo(true)}>Criar primeiro orçamento</Button>} />}
          colunas={[
            { titulo: "Nº", render: (o: any) => <span className="font-semibold">#{pad(o.numero_orcamento)}</span> },
            { titulo: "Cliente", render: (o: any) => <>{o.cliente_nome}{o.garantia_numero && <span className="ml-2 text-xs text-aviso">(garantia #{pad(o.garantia_numero)})</span>}</> },
            { titulo: "Data", render: (o: any) => dataBR(o.data_entrada) },
            { titulo: "Total", render: (o: any) => moeda(o.valor_total) },
            { titulo: "Status", render: (o: any) => <StatusPilula status={o.status} /> },
            { titulo: "Prazo", render: (o: any) => <PrazoBadge dias={o.dias} aberta={o.aberta} /> },
          ]} />
      )}
      <Modal aberto={novo} onFechar={() => setNovo(false)} titulo="Novo orçamento" largura="max-w-3xl">
        <FormOrcamento onCancelar={() => setNovo(false)} onSalvo={() => { setNovo(false); recarregar(); }} />
      </Modal>
      <Modal aberto={!!detalhe} onFechar={() => setDetalhe(null)} titulo={detalhe ? `Orçamento #${pad(detalhe.numero_orcamento)}` : ""} largura="max-w-3xl">
        {detalhe && <Detalhe key={detalhe.id + detalhe.status + detalhe.updated_at} o={detalhe} editar={editar} onFechar={() => setDetalhe(null)}
          onMudou={async () => { recarregar(); const { data } = await supabase.from("v_orcamentos").select("*").eq("id", detalhe.id).single(); data && setDetalhe(data); }} />}
      </Modal>
    </>
  );
}
