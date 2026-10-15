"use client";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Campo, GradeForm, Input, Textarea } from "@/components/ui/form";
import { SeletorCliente, SeletorMaquina } from "@/components/ui/seletores";
import { useToast } from "@/components/ui/toast";
import { hoje, moeda } from "@/lib/formatar";
import { supabase } from "@/lib/supabase/client";

// ORÇAMENTO: dados + vários itens (peça/serviço/mão de obra). Subtotal e total são calculados na tela
// e o banco recalcula o total de novo ao salvar (ninguém consegue digitar um total errado).
export function FormOrcamento({ inicial, itensIniciais, onSalvo, onCancelar }: { inicial?: any; itensIniciais?: any[]; onSalvo: (id: string) => void; onCancelar: () => void }) {
  const toast = useToast();
  const [f, setF] = useState<any>(inicial ?? { cliente_id: "", maquina_id: "", data_entrada: hoje(), validade: "", desconto: "", observacoes: "" });
  const [nomeCliente, setNomeCliente] = useState(inicial?.cliente_nome ?? "");
  const [itens, setItens] = useState<any[]>(itensIniciais?.length ? itensIniciais : [{ descricao: "", quantidade: 1, valor_unitario: "" }]);
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value });
  const setItem = (i: number, k: string, v: any) => setItens(itens.map((x, j) => (j === i ? { ...x, [k]: v } : x)));

  const subtotal = itens.reduce((s, i) => s + Number(i.quantidade || 0) * Number(i.valor_unitario || 0), 0);
  const total = Math.max(subtotal - Number(f.desconto || 0), 0);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    const validos = itens.filter((i) => i.descricao.trim());
    if (!f.cliente_id) return setErro("Escolha o cliente.");
    if (!validos.length) return setErro("Adicione pelo menos um item com descrição.");
    setErro(""); setSalvando(true);
    try {
      const dados = { cliente_id: f.cliente_id, maquina_id: f.maquina_id || null, data_entrada: f.data_entrada, validade: f.validade || null, desconto: Number(f.desconto || 0), observacoes: f.observacoes || null };
      const r = inicial?.id ? await supabase.from("orcamentos").update(dados).eq("id", inicial.id).select("id").single()
                            : await supabase.from("orcamentos").insert(dados).select("id").single();
      if (r.error) throw r.error;
      if (inicial?.id) { const d = await supabase.from("orcamento_itens").delete().eq("orcamento_id", inicial.id); if (d.error) throw d.error; }
      const ins = await supabase.from("orcamento_itens").insert(validos.map((i) => ({ orcamento_id: r.data.id, descricao: i.descricao.trim(), quantidade: Number(i.quantidade || 1), valor_unitario: Number(i.valor_unitario || 0) })));
      if (ins.error) throw ins.error;
      toast.ok("✓ Orçamento salvo com sucesso"); onSalvo(r.data.id);
    } catch (err: any) { toast.erro("Não foi possível salvar o orçamento. " + (err?.message ?? "")); }
    setSalvando(false);
  }

  return (
    <form onSubmit={salvar} className="space-y-4">
      {inicial?.garantia_numero && <p className="rounded-xl bg-aviso/10 p-3 text-sm text-aviso">Este orçamento veio da garantia #{String(inicial.garantia_numero).padStart(3, "0")} (recusada).</p>}
      <SeletorCliente valor={f.cliente_id} nome={nomeCliente} erro={erro} onMudar={(id, n) => { setF({ ...f, cliente_id: id, maquina_id: "" }); setNomeCliente(n); }} />
      <SeletorMaquina clienteId={f.cliente_id} valor={f.maquina_id ?? ""} onMudar={(id) => setF({ ...f, maquina_id: id })} />
      <GradeForm>
        <Campo rotulo="Data"><Input type="date" value={f.data_entrada} onChange={set("data_entrada")} /></Campo>
        <Campo rotulo="Validade"><Input type="date" value={f.validade ?? ""} onChange={set("validade")} /></Campo>
      </GradeForm>

      <div>
        <div className="mb-2 text-sm font-medium text-suave">Itens (peças, serviços, mão de obra)</div>
        <div className="space-y-3">{itens.map((it, i) => (
          <div key={i} className="grid grid-cols-12 gap-2 rounded-xl bg-fundo2 p-3">
            <Input className="col-span-12 md:col-span-6" placeholder="Descrição (ex.: Rolamento)" value={it.descricao} onChange={(e) => setItem(i, "descricao", e.target.value)} />
            <Input className="col-span-4 md:col-span-2" type="number" min="0" step="0.01" inputMode="decimal" placeholder="Qtd." value={it.quantidade} onChange={(e) => setItem(i, "quantidade", e.target.value)} />
            <Input className="col-span-5 md:col-span-2" type="number" min="0" step="0.01" inputMode="decimal" placeholder="Valor unit." value={it.valor_unitario} onChange={(e) => setItem(i, "valor_unitario", e.target.value)} />
            <div className="col-span-3 flex items-center justify-end gap-1 md:col-span-2">
              <span className="text-sm font-semibold">{moeda(Number(it.quantidade || 0) * Number(it.valor_unitario || 0))}</span>
              <button type="button" aria-label="Remover item" onClick={() => setItens(itens.length > 1 ? itens.filter((_, j) => j !== i) : itens)} className="grid h-9 w-9 place-items-center rounded-full text-suave hover:bg-white/[0.06] hover:text-perigo"><Trash2 className="h-4 w-4" /></button>
            </div>
          </div>))}</div>
        <Button type="button" variante="fantasma" className="mt-2" icone={<Plus className="h-4 w-4" />} onClick={() => setItens([...itens, { descricao: "", quantidade: 1, valor_unitario: "" }])}>Adicionar item</Button>
      </div>

      <GradeForm>
        <Campo rotulo="Desconto (R$)"><Input type="number" min="0" step="0.01" inputMode="decimal" value={f.desconto ?? ""} onChange={set("desconto")} /></Campo>
        <div className="flex flex-col justify-end rounded-xl bg-marca/10 px-4 py-3 text-right"><span className="text-sm text-suave">Subtotal {moeda(subtotal)}</span><span className="text-xl font-semibold text-marca2">Total {moeda(total)}</span></div>
        <Campo rotulo="Observações" className="md:col-span-2"><Textarea value={f.observacoes ?? ""} onChange={set("observacoes")} /></Campo>
      </GradeForm>
      <div className="flex justify-end gap-3 pt-2"><Button type="button" variante="secundario" onClick={onCancelar}>Cancelar</Button><Button type="submit" carregando={salvando}>Salvar orçamento</Button></div>
    </form>
  );
}
