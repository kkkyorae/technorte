"use client";
import clsx from "clsx";
import { Archive, ArrowDownToLine, ArrowUpFromLine, Pencil, Plus, Search, SlidersHorizontal } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { Pilula } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Campo, GradeForm, Input, Select, Textarea } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";
import { EmptyState, ListaSkeleton, PageHeader } from "@/components/ui/page";
import { Tabela } from "@/components/ui/tabela";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/lib/auth";
import { UNIDADES } from "@/lib/constantes";
import { dataHoraBR, limparBusca, moeda, numero } from "@/lib/formatar";
import { useCarregar, useDebounce } from "@/lib/hooks";
import { podeEditar } from "@/lib/permissoes";
import { supabase } from "@/lib/supabase/client";

// Estoque normal / baixo / crítico (🟢 🟡 🔴)
function situacaoEstoque(p: any): "normal" | "baixo" | "critico" {
  const q = Number(p.quantidade), m = Number(p.estoque_minimo);
  if (q <= 0 || (m > 0 && q <= m / 2)) return "critico";
  if (m > 0 && q <= m) return "baixo";
  return "normal";
}
const SIT = { normal: { t: "verde", r: "Estoque normal" }, baixo: { t: "amarelo", r: "Estoque baixo" }, critico: { t: "vermelho", r: "Estoque crítico" } } as const;

function FormPeca({ inicial, onSalvo, onCancelar }: { inicial?: any; onSalvo: () => void; onCancelar: () => void }) {
  const toast = useToast();
  const [f, setF] = useState<any>(inicial ?? { nome_peca: "", codigo: "", descricao: "", quantidade: 0, unidade: "un", valor_unitario: "", estoque_minimo: "", localizacao: "", observacoes: "" });
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value });
  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!f.nome_peca.trim()) return setErro("Informe o nome da peça.");
    setSalvando(true);
    const dados: any = { nome_peca: f.nome_peca.trim(), codigo: f.codigo || null, descricao: f.descricao || null, unidade: f.unidade, valor_unitario: Number(f.valor_unitario || 0), estoque_minimo: Number(f.estoque_minimo || 0), localizacao: f.localizacao || null, observacoes: f.observacoes || null };
    // a quantidade só é definida na criação; depois muda por Entrada/Saída/Ajuste (assim fica tudo no histórico)
    if (!inicial?.id) dados.quantidade = Number(f.quantidade || 0);
    const r = inicial?.id ? await supabase.from("estoque").update(dados).eq("id", inicial.id) : await supabase.from("estoque").insert(dados);
    setSalvando(false);
    if (r.error) return toast.erro(r.error.code === "23505" ? "Já existe uma peça com esse código." : "Não foi possível salvar a peça. " + r.error.message);
    toast.ok("✓ Peça salva com sucesso"); onSalvo();
  }
  return (
    <form onSubmit={salvar} className="space-y-4">
      <GradeForm>
        <Campo rotulo="Nome da peça" erro={erro} className="md:col-span-2"><Input value={f.nome_peca} onChange={set("nome_peca")} autoFocus /></Campo>
        <Campo rotulo="Código"><Input value={f.codigo ?? ""} onChange={set("codigo")} /></Campo>
        <Campo rotulo="Localização"><Input placeholder="Ex.: Prateleira B2" value={f.localizacao ?? ""} onChange={set("localizacao")} /></Campo>
        {!inicial?.id && <Campo rotulo="Quantidade inicial"><Input type="number" min="0" step="0.01" value={f.quantidade} onChange={set("quantidade")} /></Campo>}
        <Campo rotulo="Unidade"><Select value={f.unidade} onChange={set("unidade")}>{UNIDADES.map((u) => <option key={u}>{u}</option>)}</Select></Campo>
        <Campo rotulo="Valor unitário (R$)"><Input type="number" min="0" step="0.01" inputMode="decimal" value={f.valor_unitario ?? ""} onChange={set("valor_unitario")} /></Campo>
        <Campo rotulo="Estoque mínimo"><Input type="number" min="0" step="0.01" value={f.estoque_minimo ?? ""} onChange={set("estoque_minimo")} /></Campo>
        <Campo rotulo="Descrição" className="md:col-span-2"><Textarea value={f.descricao ?? ""} onChange={set("descricao")} /></Campo>
      </GradeForm>
      <div className="flex justify-end gap-3 pt-2"><Button type="button" variante="secundario" onClick={onCancelar}>Cancelar</Button><Button type="submit" carregando={salvando}>Salvar peça</Button></div>
    </form>
  );
}

function Movimento({ peca, tipo, onSalvo, onCancelar }: { peca: any; tipo: string; onSalvo: () => void; onCancelar: () => void }) {
  const toast = useToast();
  const [qtd, setQtd] = useState("");
  const [motivo, setMotivo] = useState("");
  const [salvando, setSalvando] = useState(false);
  async function salvar(e: React.FormEvent) {
    e.preventDefault(); setSalvando(true);
    // a função do banco atualiza a quantidade e grava o histórico juntas
    const { error } = await supabase.rpc("movimentar_estoque", { p_estoque: peca.id, p_tipo: tipo, p_quantidade: Number(qtd), p_motivo: motivo || null });
    setSalvando(false);
    if (error) return toast.erro(error.message);
    toast.ok(tipo === "entrada" ? "✓ Entrada registrada" : tipo === "saida" ? "✓ Saída registrada" : "✓ Estoque ajustado"); onSalvo();
  }
  return (
    <form onSubmit={salvar} className="space-y-4">
      <p className="text-suave">{peca.nome_peca} — em estoque agora: <b className="text-texto">{numero(peca.quantidade)} {peca.unidade}</b></p>
      <Campo rotulo={tipo === "ajuste" ? "Quantidade correta (contagem real)" : "Quantidade"}><Input type="number" required min="0" step="0.01" inputMode="decimal" value={qtd} onChange={(e) => setQtd(e.target.value)} autoFocus /></Campo>
      <Campo rotulo="Motivo"><Input placeholder={tipo === "saida" ? "Ex.: usada no orçamento #034" : tipo === "entrada" ? "Ex.: compra do fornecedor" : "Ex.: contagem do inventário"} value={motivo} onChange={(e) => setMotivo(e.target.value)} /></Campo>
      <div className="flex justify-end gap-3"><Button type="button" variante="secundario" onClick={onCancelar}>Cancelar</Button><Button type="submit" carregando={salvando}>Confirmar</Button></div>
    </form>
  );
}

function Detalhe({ p, editar, onMudou, onFechar }: { p: any; editar: boolean; onMudou: () => void; onFechar: () => void }) {
  const toast = useToast();
  const [modo, setModo] = useState<"ver" | "editar" | "entrada" | "saida" | "ajuste">("ver");
  const { dados: hist, recarregar } = useCarregar(async () => (await supabase.from("movimentacoes_estoque").select("*,profiles(nome)").eq("estoque_id", p.id).order("created_at", { ascending: false }).limit(30)).data ?? [], [p.id, p.quantidade]);
  const fim = () => { setModo("ver"); onMudou(); recarregar(); };
  async function arquivar() {
    if (!confirm("Arquivar esta peça? O histórico de movimentações é mantido.")) return;
    const { error } = await supabase.from("estoque").update({ arquivado: true }).eq("id", p.id);
    if (error) return toast.erro("Não foi possível arquivar."); toast.ok("✓ Peça arquivada"); onMudou(); onFechar();
  }
  if (modo === "editar") return <FormPeca inicial={p} onCancelar={() => setModo("ver")} onSalvo={fim} />;
  if (modo !== "ver") return <Movimento peca={p} tipo={modo} onCancelar={() => setModo("ver")} onSalvo={fim} />;
  const s = SIT[situacaoEstoque(p)];
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3"><Pilula tom={s.t}>{s.r}</Pilula><span className="text-2xl font-semibold">{numero(p.quantidade)} {p.unidade}</span><span className="text-suave">mínimo {numero(p.estoque_minimo)}</span></div>
      <dl className="grid gap-3 sm:grid-cols-2">{([["Código", p.codigo], ["Localização", p.localizacao], ["Valor unitário", moeda(p.valor_unitario)], ["Descrição", p.descricao]] as [string, any][]).map(([k, v]) => <div key={k} className="flex justify-between gap-4 border-b border-white/[0.05] pb-2"><dt className="text-suave">{k}</dt><dd className="text-right">{v || "—"}</dd></div>)}</dl>
      {editar && <div className="flex flex-wrap gap-3">
        <Button icone={<ArrowDownToLine className="h-4 w-4" />} onClick={() => setModo("entrada")}>Entrada</Button>
        <Button variante="secundario" icone={<ArrowUpFromLine className="h-4 w-4" />} onClick={() => setModo("saida")}>Saída</Button>
        <Button variante="secundario" icone={<SlidersHorizontal className="h-4 w-4" />} onClick={() => setModo("ajuste")}>Ajuste</Button></div>}
      <div><h4 className="mb-3 font-semibold">Histórico de movimentações</h4>
        {(hist ?? []).length === 0 && <p className="text-suave">Nenhuma movimentação.</p>}
        <div className="space-y-2">{(hist ?? []).map((m: any) => (
          <div key={m.id} className="flex flex-wrap justify-between gap-2 rounded-xl bg-fundo2 px-4 py-3 text-sm">
            <span><b className={m.tipo === "entrada" ? "text-marca2" : m.tipo === "saida" ? "text-perigo" : "text-aviso"}>{m.tipo === "entrada" ? "+" : m.tipo === "saida" ? "−" : "="}{numero(m.quantidade)}</b> {m.motivo && `· ${m.motivo}`}</span>
            <span className="text-suave">{dataHoraBR(m.created_at)} {m.profiles?.nome && `· ${m.profiles.nome}`}</span></div>))}</div></div>
      {editar && <div className="flex justify-end gap-3 border-t border-white/[0.07] pt-4"><Button variante="fantasma" icone={<Archive className="h-4 w-4" />} onClick={arquivar}>Arquivar</Button><Button variante="secundario" icone={<Pencil className="h-4 w-4" />} onClick={() => setModo("editar")}>Editar</Button></div>}
    </div>
  );
}

export default function Estoque() {
  const params = useSearchParams();
  const { usuario } = useAuth();
  const editar = podeEditar(usuario?.perfil, "estoque");
  const [busca, setBusca] = useState(params.get("q") ?? "");
  const [filtro, setFiltro] = useState("");
  const [novo, setNovo] = useState(false);
  const [detalhe, setDetalhe] = useState<any>(null);
  const q = useDebounce(busca);
  const { dados, carregando, recarregar } = useCarregar(async () => {
    let qb = supabase.from("estoque").select("*").eq("arquivado", false).order("nome_peca").limit(500);
    if (q.trim()) { const t = limparBusca(q); qb = qb.or(`nome_peca.ilike.%${t}%,codigo.ilike.%${t}%,localizacao.ilike.%${t}%`); }
    return (await qb).data ?? [];
  }, [q]);
  const lista = (dados ?? []).filter((p: any) => !filtro || situacaoEstoque(p) === filtro);

  return (
    <>
      <PageHeader titulo="Estoque" descricao="Peças, entradas, saídas e alertas de estoque baixo" acao={editar && <Button icone={<Plus className="h-5 w-5" />} onClick={() => setNovo(true)}>Nova peça</Button>} />
      <div className="mb-4 relative max-w-md"><Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-suave" />
        <input className="campo rounded-full pl-11" placeholder="Pesquisar por nome, código ou local" value={busca} onChange={(e) => setBusca(e.target.value)} /></div>
      <div className="mb-6 flex flex-wrap gap-2">{[["", "Todas"], ["normal", "🟢 Normal"], ["baixo", "🟡 Baixo"], ["critico", "🔴 Crítico"]].map(([k, r]) => (
        <button key={k} onClick={() => setFiltro(k)} className={clsx("min-h-[40px] rounded-full px-4 text-sm font-medium transition", filtro === k ? "bg-marca text-white" : "bg-fundo2 borda-fina text-suave hover:text-texto")}>{r}</button>))}</div>
      {carregando ? <ListaSkeleton /> : (
        <Tabela linhas={lista} aoClicar={setDetalhe} vazio={<EmptyState titulo="Nenhuma peça encontrada." acao={editar && <Button onClick={() => setNovo(true)}>Cadastrar primeira peça</Button>} />}
          colunas={[
            { titulo: "Peça", render: (p: any) => <span className="font-semibold">{p.nome_peca}</span> },
            { titulo: "Código", render: (p: any) => p.codigo || "—" },
            { titulo: "Quantidade", render: (p: any) => `${numero(p.quantidade)} ${p.unidade}` },
            { titulo: "Local", render: (p: any) => p.localizacao || "—" },
            { titulo: "Valor", render: (p: any) => moeda(p.valor_unitario) },
            { titulo: "Situação", render: (p: any) => { const s = SIT[situacaoEstoque(p)]; return <Pilula tom={s.t}>{s.r}</Pilula>; } },
          ]} />
      )}
      <Modal aberto={novo} onFechar={() => setNovo(false)} titulo="Nova peça"><FormPeca onCancelar={() => setNovo(false)} onSalvo={() => { setNovo(false); recarregar(); }} /></Modal>
      <Modal aberto={!!detalhe} onFechar={() => setDetalhe(null)} titulo={detalhe?.nome_peca ?? ""} largura="max-w-3xl">
        {detalhe && <Detalhe key={detalhe.id + detalhe.quantidade} p={detalhe} editar={editar} onFechar={() => setDetalhe(null)}
          onMudou={async () => { recarregar(); const { data } = await supabase.from("estoque").select("*").eq("id", detalhe.id).single(); data && setDetalhe(data); }} />}
      </Modal>
    </>
  );
}
