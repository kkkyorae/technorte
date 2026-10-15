"use client";
import clsx from "clsx";
import { ArrowDownCircle, ArrowUpCircle, CheckCircle2, Clock, Plus, Wallet } from "lucide-react";
import { useState } from "react";
import { Pilula } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardTitulo } from "@/components/ui/card";
import { Campo, GradeForm, Input, Select, Textarea } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";
import { EmptyState, ListaSkeleton, PageHeader, StatCard } from "@/components/ui/page";
import { Tabela } from "@/components/ui/tabela";
import { useToast } from "@/components/ui/toast";
import { CATEGORIAS_ENTRADA, CATEGORIAS_SAIDA } from "@/lib/constantes";
import { dataBR, hoje, moeda } from "@/lib/formatar";
import { useCarregar } from "@/lib/hooks";
import { supabase } from "@/lib/supabase/client";

// Calcula a data inicial do período escolhido (dia, semana, mês, ano)
function inicioPeriodo(p: string) {
  const d = new Date();
  if (p === "semana") d.setDate(d.getDate() - d.getDay());
  if (p === "mes") d.setDate(1);
  if (p === "ano") { d.setMonth(0); d.setDate(1); }
  return d.toLocaleDateString("sv-SE");
}

function FormLancamento({ onSalvo, onCancelar }: { onSalvo: () => void; onCancelar: () => void }) {
  const toast = useToast();
  const [f, setF] = useState<any>({ tipo: "entrada", categoria: CATEGORIAS_ENTRADA[0], descricao: "", valor: "", data: hoje(), pago: true, observacoes: "" });
  const [salvando, setSalvando] = useState(false);
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value });
  const cats = f.tipo === "entrada" ? CATEGORIAS_ENTRADA : CATEGORIAS_SAIDA;
  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!(Number(f.valor) > 0)) return toast.erro("Informe um valor maior que zero.");
    setSalvando(true);
    const { error } = await supabase.from("financeiro").insert({ tipo: f.tipo, categoria: f.categoria, descricao: f.descricao || null, valor: Number(f.valor), data: f.data, pago: f.pago, observacoes: f.observacoes || null });
    setSalvando(false);
    if (error) return toast.erro("Não foi possível registrar. " + error.message);
    toast.ok(`✓ ${moeda(f.valor)} registrado no financeiro`); onSalvo();
  }
  return (
    <form onSubmit={salvar} className="space-y-4">
      <GradeForm>
        <Campo rotulo="Tipo"><Select value={f.tipo} onChange={(e) => setF({ ...f, tipo: e.target.value, categoria: (e.target.value === "entrada" ? CATEGORIAS_ENTRADA : CATEGORIAS_SAIDA)[0] })}><option value="entrada">Entrada (recebimento)</option><option value="saida">Saída (gasto)</option></Select></Campo>
        <Campo rotulo="Categoria"><Select value={f.categoria} onChange={set("categoria")}>{cats.map((c) => <option key={c}>{c}</option>)}</Select></Campo>
        <Campo rotulo="Valor (R$)"><Input type="number" min="0" step="0.01" inputMode="decimal" value={f.valor} onChange={set("valor")} autoFocus /></Campo>
        <Campo rotulo="Data"><Input type="date" value={f.data} onChange={set("data")} /></Campo>
        <Campo rotulo="Descrição" className="md:col-span-2"><Input value={f.descricao} onChange={set("descricao")} /></Campo>
        <Campo rotulo="Situação"><Select value={f.pago ? "1" : "0"} onChange={(e) => setF({ ...f, pago: e.target.value === "1" })}><option value="1">Pago / recebido</option><option value="0">Pendente</option></Select></Campo>
        <Campo rotulo="Observações" className="md:col-span-2"><Textarea value={f.observacoes} onChange={set("observacoes")} /></Campo>
      </GradeForm>
      <div className="flex justify-end gap-3"><Button type="button" variante="secundario" onClick={onCancelar}>Cancelar</Button><Button type="submit" carregando={salvando}>Registrar</Button></div>
    </form>
  );
}

export default function Financeiro() {
  const toast = useToast();
  const [periodo, setPeriodo] = useState("mes");
  const [categoria, setCategoria] = useState("");
  const [novo, setNovo] = useState(false);
  const { dados, carregando, recarregar } = useCarregar(async () => {
    let qb = supabase.from("financeiro").select("*,clientes(nome)").gte("data", inicioPeriodo(periodo)).order("data", { ascending: false }).limit(500);
    if (categoria) qb = qb.eq("categoria", categoria);
    // histórico dos meses anteriores (resumo dos últimos 12 meses)
    const ano = new Date(); ano.setMonth(ano.getMonth() - 11); ano.setDate(1);
    const [l, h] = await Promise.all([qb, supabase.from("financeiro").select("tipo,valor,data,pago").eq("pago", true).gte("data", ano.toLocaleDateString("sv-SE"))]);
    return { linhas: l.data ?? [], hist: h.data ?? [] };
  }, [periodo, categoria]);

  const linhas = dados?.linhas ?? [];
  const soma = (f: (x: any) => boolean) => linhas.filter(f).reduce((s: number, x: any) => s + Number(x.valor), 0);
  const entradas = soma((x) => x.tipo === "entrada" && x.pago), saidas = soma((x) => x.tipo === "saida" && x.pago);
  const pendencias = soma((x) => !x.pago);

  const meses: Record<string, { e: number; s: number }> = {};
  (dados?.hist ?? []).forEach((x: any) => { const k = x.data.slice(0, 7); meses[k] ??= { e: 0, s: 0 }; x.tipo === "entrada" ? (meses[k].e += Number(x.valor)) : (meses[k].s += Number(x.valor)); });

  async function marcarPago(x: any) {
    if (!confirm(`Marcar ${moeda(x.valor)} como ${x.tipo === "entrada" ? "recebido" : "pago"}?`)) return;
    const { error } = await supabase.from("financeiro").update({ pago: true }).eq("id", x.id);
    if (error) return toast.erro("Não foi possível atualizar."); toast.ok("✓ Pagamento registrado"); recarregar();
  }

  return (
    <>
      <PageHeader titulo="Financeiro" descricao="Entradas, saídas, saldo e pendências" acao={<Button icone={<Plus className="h-5 w-5" />} onClick={() => setNovo(true)}>Novo lançamento</Button>} />
      <div className="mb-6 flex flex-wrap gap-3">
        <div className="flex gap-2">{[["dia", "Hoje"], ["semana", "Semana"], ["mes", "Mês"], ["ano", "Ano"]].map(([k, r]) => (
          <button key={k} onClick={() => setPeriodo(k)} className={clsx("min-h-[44px] rounded-full px-5 text-sm font-medium transition", periodo === k ? "bg-marca text-white" : "bg-fundo2 borda-fina text-suave hover:text-texto")}>{r}</button>))}</div>
        <Select className="w-auto rounded-full" value={categoria} onChange={(e) => setCategoria(e.target.value)}><option value="">Todas as categorias</option>{[...CATEGORIAS_ENTRADA, ...CATEGORIAS_SAIDA].map((c) => <option key={c}>{c}</option>)}</Select>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icone={<ArrowUpCircle className="h-5 w-5" />} titulo="Entradas" valor={moeda(entradas)} />
        <StatCard icone={<ArrowDownCircle className="h-5 w-5" />} titulo="Saídas" valor={moeda(saidas)} />
        <StatCard icone={<Wallet className="h-5 w-5" />} titulo="Saldo" valor={moeda(entradas - saidas)} />
        <StatCard icone={<Clock className="h-5 w-5" />} titulo="Pendências" valor={moeda(pendencias)} />
      </div>
      <div className="mt-6">
        {carregando ? <ListaSkeleton /> : (
          <Tabela linhas={linhas} vazio={<EmptyState titulo="Nenhum lançamento neste período." acao={<Button onClick={() => setNovo(true)}>Registrar lançamento</Button>} />}
            colunas={[
              { titulo: "Data", render: (x: any) => dataBR(x.data) },
              { titulo: "Descrição", render: (x: any) => <span><b>{x.categoria}</b> {x.descricao && <span className="text-suave">· {x.descricao}</span>}{x.clientes?.nome && <span className="text-suave"> · {x.clientes.nome}</span>}</span> },
              { titulo: "Valor", render: (x: any) => <span className={clsx("font-semibold", x.tipo === "entrada" ? "text-marca2" : "text-perigo")}>{x.tipo === "saida" && "−"}{moeda(x.valor)}</span> },
              { titulo: "Situação", render: (x: any) => x.pago ? <Pilula tom="verde"><CheckCircle2 className="h-3.5 w-3.5" />{x.tipo === "entrada" ? "Recebido" : "Pago"}</Pilula> : <Button variante="secundario" className="!min-h-[36px] !px-3 text-sm" onClick={() => marcarPago(x)}>Marcar pago</Button> },
            ]} />
        )}
      </div>
      <Card className="mt-6">
        <CardTitulo>Histórico dos meses anteriores</CardTitulo>
        <div className="grid gap-2">{Object.keys(meses).sort().reverse().map((k) => (
          <div key={k} className="flex flex-wrap justify-between gap-2 rounded-xl bg-fundo2 px-4 py-3">
            <span className="font-medium">{new Date(k + "-15").toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}</span>
            <span className="text-sm"><span className="text-marca2">+{moeda(meses[k].e)}</span> · <span className="text-perigo">−{moeda(meses[k].s)}</span> · <b>Saldo {moeda(meses[k].e - meses[k].s)}</b></span></div>))}
          {Object.keys(meses).length === 0 && <p className="text-suave">Sem histórico ainda.</p>}</div>
      </Card>
      <Modal aberto={novo} onFechar={() => setNovo(false)} titulo="Novo lançamento"><FormLancamento onCancelar={() => setNovo(false)} onSalvo={() => { setNovo(false); recarregar(); }} /></Modal>
    </>
  );
}
