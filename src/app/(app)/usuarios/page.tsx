"use client";
import { Plus } from "lucide-react";
import { useState } from "react";
import { Pilula } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Campo, GradeForm, Input, Select } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";
import { ListaSkeleton, PageHeader } from "@/components/ui/page";
import { Tabela } from "@/components/ui/tabela";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/lib/auth";
import { useCarregar } from "@/lib/hooks";
import { NOME_PERFIL } from "@/lib/permissoes";
import { supabase } from "@/lib/supabase/client";

// USUÁRIOS (só o administrador): criar, trocar perfil/cargo e ativar/desativar
export default function Usuarios() {
  const toast = useToast();
  const { usuario } = useAuth();
  const [novo, setNovo] = useState(false);
  const [f, setF] = useState<any>({ nome: "", email: "", senha: "", cargo: "", perfil: "funcionario" });
  const [salvando, setSalvando] = useState(false);
  const { dados, carregando, recarregar } = useCarregar(async () => (await supabase.from("profiles").select("*").order("nome")).data ?? [], []);
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value });

  async function criar(e: React.FormEvent) {
    e.preventDefault(); setSalvando(true);
    const r = await fetch("/api/usuarios", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) });
    const j = await r.json(); setSalvando(false);
    if (!r.ok) return toast.erro(j.erro ?? "Não foi possível criar o usuário.");
    toast.ok("✓ Usuário criado com sucesso"); setNovo(false); setF({ nome: "", email: "", senha: "", cargo: "", perfil: "funcionario" }); recarregar();
  }
  async function alterar(id: string, campos: any) {
    const { error } = await supabase.from("profiles").update(campos).eq("id", id);
    if (error) return toast.erro("Não foi possível alterar."); toast.ok("✓ Usuário atualizado"); recarregar();
  }

  return (
    <>
      <PageHeader titulo="Usuários" descricao="Quem pode entrar no sistema e o que pode fazer" acao={<Button icone={<Plus className="h-5 w-5" />} onClick={() => setNovo(true)}>Novo usuário</Button>} />
      {carregando ? <ListaSkeleton /> : (
        <Tabela linhas={dados ?? []} colunas={[
          { titulo: "Nome", render: (u: any) => <span className="font-semibold">{u.nome} {u.id === usuario?.id && <Pilula tom="verde">você</Pilula>}</span> },
          { titulo: "E-mail", render: (u: any) => u.email },
          { titulo: "Cargo", render: (u: any) => u.cargo || "—" },
          { titulo: "Perfil", render: (u: any) => <Select className="!min-h-[40px] w-auto text-sm" value={u.perfil} disabled={u.id === usuario?.id} onChange={(e) => alterar(u.id, { perfil: e.target.value })}>{Object.entries(NOME_PERFIL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select> },
          { titulo: "Situação", render: (u: any) => u.id === usuario?.id ? <Pilula tom="verde">Ativo</Pilula> : <Button variante={u.ativo ? "secundario" : "primario"} className="!min-h-[36px] !px-3 text-sm" onClick={() => alterar(u.id, { ativo: !u.ativo })}>{u.ativo ? "Desativar" : "Reativar"}</Button> },
        ]} />
      )}
      <Modal aberto={novo} onFechar={() => setNovo(false)} titulo="Novo usuário">
        <form onSubmit={criar} className="space-y-4">
          <GradeForm>
            <Campo rotulo="Nome"><Input required value={f.nome} onChange={set("nome")} /></Campo>
            <Campo rotulo="Cargo"><Input value={f.cargo} onChange={set("cargo")} /></Campo>
            <Campo rotulo="E-mail"><Input type="email" required value={f.email} onChange={set("email")} /></Campo>
            <Campo rotulo="Senha inicial (mín. 6)"><Input type="text" required minLength={6} value={f.senha} onChange={set("senha")} /></Campo>
            <Campo rotulo="Perfil" className="md:col-span-2"><Select value={f.perfil} onChange={set("perfil")}>{Object.entries(NOME_PERFIL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></Campo>
          </GradeForm>
          <div className="flex justify-end gap-3"><Button type="button" variante="secundario" onClick={() => setNovo(false)}>Cancelar</Button><Button type="submit" carregando={salvando}>Criar usuário</Button></div>
        </form>
      </Modal>
    </>
  );
}
