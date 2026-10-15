"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Campo, GradeForm, Input, Select, Textarea } from "@/components/ui/form";
import { useToast } from "@/components/ui/toast";
import { ESTADOS } from "@/lib/constantes";
import { supabase } from "@/lib/supabase/client";

// Formulário reutilizado em "Novo cliente" e "Editar cliente" (também usado na página do cliente)
export function FormCliente({ inicial, onSalvo, onCancelar }: { inicial?: any; onSalvo: (id: string) => void; onCancelar: () => void }) {
  const toast = useToast();
  const [f, setF] = useState<any>(inicial ?? { nome: "", cpf_cnpj: "", telefone: "", telefone_secundario: "", email: "", endereco: "", cidade: "", estado: "", observacoes: "" });
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value });

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!f.nome.trim()) { setErro("Informe o nome do cliente."); return; }
    setSalvando(true);
    const dados = { nome: f.nome.trim(), cpf_cnpj: f.cpf_cnpj || null, telefone: f.telefone || null, telefone_secundario: f.telefone_secundario || null, email: f.email || null, endereco: f.endereco || null, cidade: f.cidade || null, estado: f.estado || null, observacoes: f.observacoes || null };
    const r = inicial?.id ? await supabase.from("clientes").update(dados).eq("id", inicial.id).select("id").single()
                          : await supabase.from("clientes").insert(dados).select("id").single();
    setSalvando(false);
    if (r.error) { toast.erro("Não foi possível salvar o cliente. " + r.error.message); return; }
    toast.ok(inicial?.id ? "✓ Cliente atualizado com sucesso" : "✓ Cliente cadastrado com sucesso");
    onSalvo(r.data.id);
  }
  return (
    <form onSubmit={salvar} className="space-y-4">
      <GradeForm>
        <Campo rotulo="Nome / Razão social" erro={erro} className="md:col-span-2"><Input value={f.nome} onChange={set("nome")} autoFocus /></Campo>
        <Campo rotulo="CPF / CNPJ"><Input value={f.cpf_cnpj ?? ""} onChange={set("cpf_cnpj")} /></Campo>
        <Campo rotulo="E-mail"><Input type="email" value={f.email ?? ""} onChange={set("email")} /></Campo>
        <Campo rotulo="Telefone"><Input inputMode="tel" value={f.telefone ?? ""} onChange={set("telefone")} /></Campo>
        <Campo rotulo="Telefone secundário"><Input inputMode="tel" value={f.telefone_secundario ?? ""} onChange={set("telefone_secundario")} /></Campo>
        <Campo rotulo="Endereço" className="md:col-span-2"><Input value={f.endereco ?? ""} onChange={set("endereco")} /></Campo>
        <Campo rotulo="Cidade"><Input value={f.cidade ?? ""} onChange={set("cidade")} /></Campo>
        <Campo rotulo="Estado"><Select value={f.estado ?? ""} onChange={set("estado")}><option value="">—</option>{ESTADOS.map((s) => <option key={s}>{s}</option>)}</Select></Campo>
        <Campo rotulo="Observações" className="md:col-span-2"><Textarea value={f.observacoes ?? ""} onChange={set("observacoes")} /></Campo>
      </GradeForm>
      <div className="flex justify-end gap-3 pt-2"><Button type="button" variante="secundario" onClick={onCancelar}>Cancelar</Button><Button type="submit" carregando={salvando}>Salvar cliente</Button></div>
    </form>
  );
}
