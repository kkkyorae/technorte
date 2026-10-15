"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Campo, GradeForm, Input, Textarea } from "@/components/ui/form";
import { SeletorCliente } from "@/components/ui/seletores";
import { useToast } from "@/components/ui/toast";
import { supabase } from "@/lib/supabase/client";

// Formulário de máquina (novo/editar). Também é usado na ficha da máquina.
export function FormMaquina({ inicial, clienteInicial, onSalvo, onCancelar }: { inicial?: any; clienteInicial?: { id: string; nome: string }; onSalvo: (id: string) => void; onCancelar: () => void }) {
  const toast = useToast();
  const [f, setF] = useState<any>(inicial ?? { cliente_id: clienteInicial?.id ?? "", tipo_equipamento: "", marca: "", modelo: "", numero_serie: "", numero_identificacao: "", descricao: "", observacoes: "" });
  const [nomeCliente, setNomeCliente] = useState(clienteInicial?.nome ?? inicial?.cliente_nome ?? "");
  const [erros, setErros] = useState<any>({});
  const [salvando, setSalvando] = useState(false);
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value });

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    const er: any = {};
    if (!f.cliente_id) er.cliente = "Escolha o cliente.";
    if (!f.tipo_equipamento.trim()) er.tipo = "Informe o tipo de equipamento (ex.: Motor).";
    setErros(er); if (Object.keys(er).length) return;
    setSalvando(true);
    const dados = { cliente_id: f.cliente_id, tipo_equipamento: f.tipo_equipamento.trim(), marca: f.marca || null, modelo: f.modelo || null, numero_serie: f.numero_serie || null, numero_identificacao: f.numero_identificacao || null, descricao: f.descricao || null, observacoes: f.observacoes || null };
    const r = inicial?.id ? await supabase.from("maquinas").update(dados).eq("id", inicial.id).select("id").single()
                          : await supabase.from("maquinas").insert(dados).select("id").single();
    setSalvando(false);
    if (r.error) return toast.erro("Não foi possível salvar a máquina. " + r.error.message);
    toast.ok("✓ Máquina salva com sucesso"); onSalvo(r.data.id);
  }
  return (
    <form onSubmit={salvar} className="space-y-4">
      <SeletorCliente valor={f.cliente_id} nome={nomeCliente} erro={erros.cliente} onMudar={(id, n) => { setF({ ...f, cliente_id: id }); setNomeCliente(n); }} />
      <GradeForm>
        <Campo rotulo="Tipo de equipamento" erro={erros.tipo}><Input placeholder="Ex.: Motor, Bomba, Compressor" value={f.tipo_equipamento} onChange={set("tipo_equipamento")} /></Campo>
        <Campo rotulo="Marca"><Input value={f.marca ?? ""} onChange={set("marca")} /></Campo>
        <Campo rotulo="Modelo"><Input value={f.modelo ?? ""} onChange={set("modelo")} /></Campo>
        <Campo rotulo="Número de série"><Input value={f.numero_serie ?? ""} onChange={set("numero_serie")} /></Campo>
        <Campo rotulo="Número de identificação"><Input value={f.numero_identificacao ?? ""} onChange={set("numero_identificacao")} /></Campo>
        <Campo rotulo="Descrição"><Input value={f.descricao ?? ""} onChange={set("descricao")} /></Campo>
        <Campo rotulo="Observações" className="md:col-span-2"><Textarea value={f.observacoes ?? ""} onChange={set("observacoes")} /></Campo>
      </GradeForm>
      <div className="flex justify-end gap-3 pt-2"><Button type="button" variante="secundario" onClick={onCancelar}>Cancelar</Button><Button type="submit" carregando={salvando}>Salvar máquina</Button></div>
    </form>
  );
}
