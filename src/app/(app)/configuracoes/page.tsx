"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Campo, GradeForm, Input, Textarea } from "@/components/ui/form";
import { PageHeader } from "@/components/ui/page";
import { useToast } from "@/components/ui/toast";
import { supabase } from "@/lib/supabase/client";

// CONFIGURAÇÕES: dados da empresa que aparecem no PDF do orçamento
export default function Configuracoes() {
  const toast = useToast();
  const [f, setF] = useState<any>(null);
  const [salvando, setSalvando] = useState(false);
  useEffect(() => { supabase.from("configuracoes").select("*").eq("id", 1).single().then(({ data }) => setF(data)); }, []);
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value });

  async function salvar(e: React.FormEvent) {
    e.preventDefault(); setSalvando(true);
    const { error } = await supabase.from("configuracoes").update({ empresa_nome: f.empresa_nome, telefone: f.telefone, email: f.email, endereco: f.endereco, condicoes_orcamento: f.condicoes_orcamento, validade_dias: Number(f.validade_dias || 15) }).eq("id", 1);
    setSalvando(false);
    error ? toast.erro("Não foi possível salvar.") : toast.ok("✓ Configurações salvas com sucesso");
  }
  if (!f) return null;
  return (
    <>
      <PageHeader titulo="Configurações" descricao="Dados da empresa usados nos orçamentos em PDF" />
      <Card className="max-w-3xl">
        <form onSubmit={salvar} className="space-y-4">
          <GradeForm>
            <Campo rotulo="Nome da empresa"><Input value={f.empresa_nome ?? ""} onChange={set("empresa_nome")} /></Campo>
            <Campo rotulo="Telefone"><Input value={f.telefone ?? ""} onChange={set("telefone")} /></Campo>
            <Campo rotulo="E-mail"><Input value={f.email ?? ""} onChange={set("email")} /></Campo>
            <Campo rotulo="Validade padrão do orçamento (dias)"><Input type="number" min="1" value={f.validade_dias ?? 15} onChange={set("validade_dias")} /></Campo>
            <Campo rotulo="Endereço" className="md:col-span-2"><Input value={f.endereco ?? ""} onChange={set("endereco")} /></Campo>
            <Campo rotulo="Condições que aparecem no PDF" className="md:col-span-2"><Textarea rows={5} value={f.condicoes_orcamento ?? ""} onChange={set("condicoes_orcamento")} /></Campo>
          </GradeForm>
          <div className="flex justify-end"><Button type="submit" carregando={salvando}>Salvar configurações</Button></div>
        </form>
      </Card>
    </>
  );
}
