"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Campo, GradeForm, Input, Textarea } from "@/components/ui/form";
import { SeletorCliente, SeletorMaquina } from "@/components/ui/seletores";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/lib/auth";
import { hoje, pad } from "@/lib/formatar";
import { supabase } from "@/lib/supabase/client";

export const TIPOS_DOC = [{ k: "nfe", r: "Foto da NF-e" }, { k: "equipamento", r: "Foto do equipamento" }, { k: "outro", r: "Outros documentos" }];
const nomeSeguro = (n: string) => n.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9._-]/g, "_");

// Envia arquivos para o Supabase Storage (pasta garantias/garantia-001/...) e guarda o caminho no banco.
// As imagens NUNCA ficam dentro do PostgreSQL, só o caminho delas.
export async function enviarArquivos(garantia: { id: string; numero: number }, arquivos: { tipo: string; file: File }[], usuarioId?: string) {
  for (const a of arquivos) {
    const caminho = `garantias/garantia-${pad(garantia.numero)}/${a.tipo}-${Date.now()}-${nomeSeguro(a.file.name)}`;
    const up = await supabase.storage.from("documentos").upload(caminho, a.file);
    if (up.error) throw up.error;
    const { error } = await supabase.from("documentos_garantia").insert({ garantia_id: garantia.id, tipo_documento: a.tipo, arquivo_url: caminho, nome_arquivo: a.file.name, enviado_por: usuarioId });
    if (error) throw error;
  }
}

// ENTRADA DE GARANTIA (nova ou edição)
export function FormGarantia({ inicial, onSalvo, onCancelar }: { inicial?: any; onSalvo: () => void; onCancelar: () => void }) {
  const toast = useToast();
  const { usuario } = useAuth();
  const [f, setF] = useState<any>(inicial ?? { cliente_id: "", maquina_id: "", numero_nf: "", ordem_servico_fabrica: "", data_entrada: hoje(), valor_reparo: "", descricao_problema: "", observacoes: "" });
  const [nomeCliente, setNomeCliente] = useState(inicial?.cliente_nome ?? "");
  const [arquivos, setArquivos] = useState<Record<string, File[]>>({});
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value });

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!f.cliente_id) { setErro("Escolha o cliente."); return; }
    setSalvando(true);
    try {
      const dados = { cliente_id: f.cliente_id, maquina_id: f.maquina_id || null, numero_nf: f.numero_nf || null, ordem_servico_fabrica: f.ordem_servico_fabrica || null, data_entrada: f.data_entrada, valor_reparo: f.valor_reparo === "" ? 0 : Number(f.valor_reparo), descricao_problema: f.descricao_problema || null, observacoes: f.observacoes || null };
      const r = inicial?.id ? await supabase.from("garantias").update(dados).eq("id", inicial.id).select("id,numero").single()
                            : await supabase.from("garantias").insert(dados).select("id,numero").single();
      if (r.error) throw r.error;
      const lista = TIPOS_DOC.flatMap((t) => (arquivos[t.k] ?? []).map((file) => ({ tipo: t.k, file })));
      if (lista.length) await enviarArquivos(r.data, lista, usuario?.id);
      toast.ok(inicial?.id ? "✓ Garantia atualizada com sucesso" : "✓ Garantia cadastrada com sucesso");
      onSalvo();
    } catch (err: any) { toast.erro("Não foi possível salvar a garantia. " + (err?.message ?? "")); }
    setSalvando(false);
  }

  return (
    <form onSubmit={salvar} className="space-y-4">
      <SeletorCliente valor={f.cliente_id} nome={nomeCliente} erro={erro} onMudar={(id, n) => { setF({ ...f, cliente_id: id, maquina_id: "" }); setNomeCliente(n); }} />
      <SeletorMaquina clienteId={f.cliente_id} valor={f.maquina_id} onMudar={(id) => setF({ ...f, maquina_id: id })} />
      <GradeForm>
        <Campo rotulo="Número da NF-e"><Input value={f.numero_nf ?? ""} onChange={set("numero_nf")} /></Campo>
        <Campo rotulo="Ordem de Serviço da fábrica"><Input value={f.ordem_servico_fabrica ?? ""} onChange={set("ordem_servico_fabrica")} /></Campo>
        <Campo rotulo="Data de entrada"><Input type="date" value={f.data_entrada} onChange={set("data_entrada")} /></Campo>
        <Campo rotulo="Valor do reparo (R$)"><Input type="number" step="0.01" min="0" inputMode="decimal" value={f.valor_reparo ?? ""} onChange={set("valor_reparo")} /></Campo>
        <Campo rotulo="Descrição do problema" className="md:col-span-2"><Textarea value={f.descricao_problema ?? ""} onChange={set("descricao_problema")} /></Campo>
        <Campo rotulo="Observações" className="md:col-span-2"><Textarea value={f.observacoes ?? ""} onChange={set("observacoes")} /></Campo>
      </GradeForm>
      {!inicial?.id && (
        <div className="grid gap-4 md:grid-cols-3">
          {TIPOS_DOC.map((t) => (
            <Campo key={t.k} rotulo={t.r}>
              <input type="file" multiple accept="image/*,application/pdf" onChange={(e) => setArquivos({ ...arquivos, [t.k]: Array.from(e.target.files ?? []) })}
                className="campo py-2.5 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-marca/20 file:px-3 file:py-1.5 file:text-marca2" />
            </Campo>
          ))}
        </div>
      )}
      <div className="flex justify-end gap-3 pt-2"><Button type="button" variante="secundario" onClick={onCancelar}>Cancelar</Button><Button type="submit" carregando={salvando}>Salvar garantia</Button></div>
    </form>
  );
}
