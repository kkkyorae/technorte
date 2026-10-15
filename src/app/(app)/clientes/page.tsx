"use client";
import { Plus, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { EmptyState, ListaSkeleton, PageHeader } from "@/components/ui/page";
import { Tabela } from "@/components/ui/tabela";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/lib/auth";
import { limparBusca } from "@/lib/formatar";
import { useCarregar, useDebounce } from "@/lib/hooks";
import { podeEditar } from "@/lib/permissoes";
import { supabase } from "@/lib/supabase/client";
import { FormCliente } from "@/components/forms/FormCliente";

export default function Clientes() {
  const router = useRouter();
  const { usuario } = useAuth();
  const editar = podeEditar(usuario?.perfil, "clientes");
  const [busca, setBusca] = useState("");
  const [novo, setNovo] = useState(false);
  const q = useDebounce(busca);
  const { dados, carregando } = useCarregar(async () => {
    let qb = supabase.from("clientes").select("id,nome,telefone,email,cidade,estado").eq("arquivado", false).order("nome").limit(100);
    if (q.trim()) { const t = limparBusca(q); qb = qb.or(`nome.ilike.%${t}%,telefone.ilike.%${t}%,cpf_cnpj.ilike.%${t}%,email.ilike.%${t}%`); }
    return (await qb).data ?? [];
  }, [q]);

  return (
    <>
      <PageHeader titulo="Clientes" descricao="Cadastro e histórico de cada cliente"
        acao={editar && <Button icone={<Plus className="h-5 w-5" />} onClick={() => setNovo(true)}>Novo cliente</Button>} />
      <div className="relative mb-6 max-w-md">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-suave" />
        <input className="campo rounded-full pl-11" placeholder="Pesquisar por nome, telefone ou CPF/CNPJ" value={busca} onChange={(e) => setBusca(e.target.value)} />
      </div>
      {carregando ? <ListaSkeleton /> : (
        <Tabela aoClicar={(c: any) => router.push(`/clientes/${c.id}`)} linhas={dados ?? []}
          vazio={<EmptyState titulo={busca ? "Nenhum cliente encontrado." : "Nenhum cliente ainda — cadastre o primeiro cliente."} acao={editar && !busca && <Button onClick={() => setNovo(true)}>Cadastrar cliente</Button>} />}
          colunas={[
            { titulo: "Nome", render: (c: any) => <span className="font-semibold">{c.nome}</span> },
            { titulo: "Telefone", render: (c: any) => c.telefone || "—" },
            { titulo: "E-mail", render: (c: any) => c.email || "—" },
            { titulo: "Cidade", render: (c: any) => (c.cidade ? `${c.cidade}${c.estado ? "/" + c.estado : ""}` : "—") },
          ]} />
      )}
      <Modal aberto={novo} onFechar={() => setNovo(false)} titulo="Novo cliente">
        <FormCliente onCancelar={() => setNovo(false)} onSalvo={(id) => router.push(`/clientes/${id}`)} />
      </Modal>
    </>
  );
}
