"use client";
import { Archive, FileText, Paperclip, Pencil, Plus, Search } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { FormGarantia, enviarArquivos, TIPOS_DOC } from "@/components/forms/FormGarantia";
import { StatusPilula } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";
import { EmptyState, ListaSkeleton, PageHeader } from "@/components/ui/page";
import { PrazoBadge } from "@/components/ui/prazo-badge";
import { Tabela } from "@/components/ui/tabela";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/lib/auth";
import { STATUS_GARANTIA } from "@/lib/constantes";
import { dataBR, limparBusca, moeda, pad } from "@/lib/formatar";
import { useCarregar, useDebounce } from "@/lib/hooks";
import { podeEditar } from "@/lib/permissoes";
import { ESTILO_FAIXA, FAIXAS, faixaPrazo } from "@/lib/prazo";
import { supabase } from "@/lib/supabase/client";

// ---------- Detalhe da garantia (janela) ----------
function Detalhe({ g, editar, onFechar, onMudou }: { g: any; editar: boolean; onFechar: () => void; onMudou: () => void }) {
  const toast = useToast();
  const router = useRouter();
  const { usuario } = useAuth();
  const [status, setStatus] = useState(g.status);
  const [editando, setEditando] = useState(false);
  const arq = useRef<HTMLInputElement>(null);
  const [tipoNovo, setTipoNovo] = useState("outro");
  const { dados: docs, recarregar } = useCarregar(async () => {
    const { data } = await supabase.from("documentos_garantia").select("*").eq("garantia_id", g.id).order("created_at");
    const lista = data ?? [];
    if (!lista.length) return [];
    const { data: urls } = await supabase.storage.from("documentos").createSignedUrls(lista.map((d: any) => d.arquivo_url), 3600); // links temporários e seguros
    return lista.map((d: any, i: number) => ({ ...d, url: urls?.[i]?.signedUrl }));
  }, [g.id]);

  async function mudarStatus() {
    if (status === g.status) return;
    if (!confirm(`Alterar o status da garantia #${pad(g.numero)} para "${status}"?`)) return;
    const { error } = await supabase.from("garantias").update({ status }).eq("id", g.id);
    if (error) return toast.erro("Não foi possível alterar o status.");
    toast.ok(`✓ Status alterado para ${status}`); onMudou();
  }
  async function transformar() {
    if (!confirm("Criar um orçamento a partir desta garantia recusada?")) return;
    const { data, error } = await supabase.rpc("transformar_garantia_em_orcamento", { p_garantia: g.id });
    if (error) return toast.erro("Não foi possível criar o orçamento. " + error.message);
    const { data: o } = await supabase.from("orcamentos").select("numero_orcamento").eq("id", data).single();
    toast.ok(`✓ Orçamento #${pad(o?.numero_orcamento)} criado automaticamente`);
    router.push(`/orcamentos?abrir=${data}`);
  }
  async function arquivar() {
    if (!confirm("Arquivar esta garantia? Ela sai da lista, mas o histórico é mantido.")) return;
    const { error } = await supabase.from("garantias").update({ arquivado: true }).eq("id", g.id);
    if (error) return toast.erro("Não foi possível arquivar.");
    toast.ok("✓ Garantia arquivada"); onMudou(); onFechar();
  }
  async function anexar(files: FileList | null) {
    if (!files?.length) return;
    try { await enviarArquivos(g, Array.from(files).map((file) => ({ tipo: tipoNovo, file })), usuario?.id); toast.ok("✓ Arquivo anexado com sucesso"); recarregar(); }
    catch (e: any) { toast.erro("Não foi possível enviar o arquivo. " + e.message); }
  }

  if (editando) return <FormGarantia inicial={g} onCancelar={() => setEditando(false)} onSalvo={() => { setEditando(false); onMudou(); }} />;
  const linhas: [string, any][] = [
    ["Cliente", g.cliente_nome], ["Equipamento", [g.tipo_equipamento, g.marca, g.modelo].filter(Boolean).join(" ") || "—"], ["Nº de série", g.numero_serie || "—"],
    ["NF-e", g.numero_nf || "—"], ["OS da fábrica", g.ordem_servico_fabrica || "—"], ["Valor do reparo", moeda(g.valor_reparo)],
    ["Entrada", dataBR(g.data_entrada)], ["Encaminhada", dataBR(g.data_encaminhamento)], ["Aprovada", dataBR(g.data_aprovacao)],
    ["Recusada", dataBR(g.data_recusa)], ["Entregue", dataBR(g.data_entrega)], ["Finalização", dataBR(g.data_finalizacao)],
  ];
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3"><StatusPilula status={g.status} /><PrazoBadge dias={g.dias} aberta={g.aberta} /></div>
      <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2">{linhas.map(([k, v]) => <div key={k} className="flex justify-between gap-4 border-b border-white/[0.05] pb-2"><dt className="text-suave">{k}</dt><dd className="text-right font-medium">{v}</dd></div>)}</dl>
      {g.descricao_problema && <div><div className="mb-1 text-sm text-suave">Problema</div><p>{g.descricao_problema}</p></div>}
      {g.observacoes && <div><div className="mb-1 text-sm text-suave">Observações</div><p>{g.observacoes}</p></div>}

      {editar && (
        <div className="flex flex-wrap items-end gap-3 rounded-2xl bg-fundo2 p-4">
          <div className="min-w-[180px] flex-1"><div className="mb-1.5 text-sm text-suave">Status</div><Select value={status} onChange={(e) => setStatus(e.target.value)}>{STATUS_GARANTIA.map((s) => <option key={s}>{s}</option>)}</Select></div>
          <Button onClick={mudarStatus} disabled={status === g.status}>Alterar status</Button>
          {g.status === "Recusada" && <Button variante="secundario" icone={<FileText className="h-4 w-4" />} onClick={transformar}>Transformar em orçamento</Button>}
        </div>
      )}

      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3"><h4 className="font-semibold">Arquivos</h4>
          {editar && <div className="flex items-center gap-2"><Select className="!min-h-[40px] w-auto py-0 text-sm" value={tipoNovo} onChange={(e) => setTipoNovo(e.target.value)}>{TIPOS_DOC.map((t) => <option key={t.k} value={t.k}>{t.r}</option>)}</Select>
            <input ref={arq} type="file" multiple hidden accept="image/*,application/pdf" onChange={(e) => { anexar(e.target.files); e.target.value = ""; }} />
            <Button variante="secundario" icone={<Paperclip className="h-4 w-4" />} onClick={() => arq.current?.click()}>Anexar</Button></div>}</div>
        {(docs ?? []).length === 0 && <p className="text-suave">Nenhum arquivo anexado.</p>}
        <div className="grid gap-3 sm:grid-cols-3">{(docs ?? []).map((d: any) => (
          <a key={d.id} href={d.url} target="_blank" rel="noreferrer" className="overflow-hidden rounded-xl bg-fundo2 borda-fina transition hover:border-marca2/50">
            {/\.(jpe?g|png|webp|gif)$/i.test(d.nome_arquivo ?? "") ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={d.url} alt={d.nome_arquivo} className="h-28 w-full object-cover" /> : <div className="grid h-28 place-items-center text-suave"><FileText className="h-8 w-8" /></div>}
            <div className="truncate px-3 py-2 text-sm">{TIPOS_DOC.find((t) => t.k === d.tipo_documento)?.r}: {d.nome_arquivo}</div>
          </a>))}</div>
      </div>

      {editar && <div className="flex justify-end gap-3 border-t border-white/[0.07] pt-4"><Button variante="fantasma" icone={<Archive className="h-4 w-4" />} onClick={arquivar}>Arquivar</Button><Button variante="secundario" icone={<Pencil className="h-4 w-4" />} onClick={() => setEditando(true)}>Editar</Button></div>}
    </div>
  );
}

// ---------- Lista de garantias ----------
export default function Garantias() {
  const params = useSearchParams();
  const { usuario } = useAuth();
  const editar = podeEditar(usuario?.perfil, "garantias");
  const [busca, setBusca] = useState("");
  const [situacao, setSituacao] = useState("abertas");
  const [status, setStatus] = useState("");
  const [faixa, setFaixa] = useState("");
  const [antigosPrimeiro, setAntigos] = useState(true);
  const [novo, setNovo] = useState(false);
  const [detalhe, setDetalhe] = useState<any>(null);
  const q = useDebounce(busca);

  const { dados, carregando, recarregar } = useCarregar(async () => {
    let qb = supabase.from("v_garantias").select("*").eq("arquivado", false).limit(300).order("data_entrada", { ascending: antigosPrimeiro });
    if (situacao !== "todas") qb = qb.eq("aberta", situacao === "abertas");
    if (status) qb = qb.eq("status", status);
    if (faixa) qb = qb.eq("aberta", true).gte("dias", FAIXAS[faixa].min).lte("dias", FAIXAS[faixa].max);
    if (q.trim()) {
      const t = limparBusca(q);
      qb = qb.or(`cliente_nome.ilike.%${t}%,numero_serie.ilike.%${t}%,numero_nf.ilike.%${t}%,ordem_servico_fabrica.ilike.%${t}%${/^\d+$/.test(t) ? `,numero.eq.${t}` : ""}`);
    }
    return (await qb).data ?? [];
  }, [q, situacao, status, faixa, antigosPrimeiro]);

  // ?abrir=<id> (vindo da busca global, notificações ou ficha do cliente) abre a garantia direto
  const abrirId = params.get("abrir");
  useEffect(() => {
    if (!abrirId) return;
    supabase.from("v_garantias").select("*").eq("id", abrirId).single().then(({ data }) => data && setDetalhe(data));
  }, [abrirId]);

  const pilulas = [["", "Todos"], ...Object.entries(FAIXAS).map(([k, v]) => [k, v.rotulo])];
  return (
    <>
      <PageHeader titulo="Garantias" descricao="Entrada, acompanhamento e prazo de 30 dias"
        acao={editar && <Button icone={<Plus className="h-5 w-5" />} onClick={() => setNovo(true)}>Entrada de garantia</Button>} />
      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative min-w-[240px] flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-suave" />
          <input className="campo rounded-full pl-11" placeholder="Cliente, série, NF, OS da fábrica ou nº..." value={busca} onChange={(e) => setBusca(e.target.value)} />
        </div>
        <Select className="w-auto rounded-full" value={situacao} onChange={(e) => setSituacao(e.target.value)}><option value="abertas">Em andamento</option><option value="finalizadas">Finalizadas</option><option value="todas">Todas</option></Select>
        <Select className="w-auto rounded-full" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">Todos os status</option>{STATUS_GARANTIA.map((s) => <option key={s}>{s}</option>)}</Select>
        <Select className="w-auto rounded-full" value={antigosPrimeiro ? "a" : "n"} onChange={(e) => setAntigos(e.target.value === "a")}><option value="a">Mais antigos primeiro</option><option value="n">Mais novos primeiro</option></Select>
      </div>
      <div className="mb-6 flex flex-wrap gap-2">{pilulas.map(([k, r]) => (
        <button key={k} onClick={() => setFaixa(k)} className={clsx("min-h-[40px] rounded-full px-4 text-sm font-medium transition", faixa === k ? "bg-marca text-white" : "bg-fundo2 borda-fina text-suave hover:text-texto")}>{r}</button>))}</div>

      {carregando ? <ListaSkeleton /> : (
        <Tabela linhas={dados ?? []} aoClicar={setDetalhe} classeLinha={(g: any) => (g.aberta ? ESTILO_FAIXA[faixaPrazo(g.dias)].linha : "")}
          vazio={<EmptyState titulo="Nenhuma garantia encontrada." acao={editar && <Button onClick={() => setNovo(true)}>Cadastrar primeira garantia</Button>} />}
          colunas={[
            { titulo: "Nº", render: (g: any) => <span className="font-semibold">#{pad(g.numero)}</span> },
            { titulo: "Cliente", render: (g: any) => g.cliente_nome },
            { titulo: "Equipamento", render: (g: any) => [g.tipo_equipamento, g.modelo].filter(Boolean).join(" ") || "—" },
            { titulo: "Entrada", render: (g: any) => dataBR(g.data_entrada) },
            { titulo: "Status", render: (g: any) => <StatusPilula status={g.status} /> },
            { titulo: "Prazo", render: (g: any) => <PrazoBadge dias={g.dias} aberta={g.aberta} /> },
          ]} />
      )}
      <Modal aberto={novo} onFechar={() => setNovo(false)} titulo="Entrada de garantia" largura="max-w-3xl">
        <FormGarantia onCancelar={() => setNovo(false)} onSalvo={() => { setNovo(false); recarregar(); }} />
      </Modal>
      <Modal aberto={!!detalhe} onFechar={() => setDetalhe(null)} titulo={detalhe ? `Garantia #${pad(detalhe.numero)}` : ""} largura="max-w-3xl">
        {detalhe && <Detalhe key={detalhe.id + detalhe.status + detalhe.updated_at} g={detalhe} editar={editar} onFechar={() => setDetalhe(null)}
          onMudou={async () => { recarregar(); const { data } = await supabase.from("v_garantias").select("*").eq("id", detalhe.id).single(); data && setDetalhe(data); }} />}
      </Modal>
    </>
  );
}
