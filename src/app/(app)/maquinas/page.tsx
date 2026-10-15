"use client";
import { FileSpreadsheet, Plus, Search } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
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
import { FormMaquina } from "@/components/forms/FormMaquina";

export default function Maquinas() {
  const router = useRouter();
  const params = useSearchParams();
  const { usuario } = useAuth();
  const editar = podeEditar(usuario?.perfil, "maquinas");
  const [busca, setBusca] = useState("");
  const [novo, setNovo] = useState(!!params.get("novo")); // ?novo=<id do cliente> abre o formulário já com o cliente
  const q = useDebounce(busca);
  const { dados: cli } = useCarregar(async () => {
    const id = params.get("novo"); if (!id) return null;
    return (await supabase.from("clientes").select("id,nome").eq("id", id).single()).data;
  }, []);
  const { dados, carregando } = useCarregar(async () => {
    let qb = supabase.from("maquinas").select("id,tipo_equipamento,marca,modelo,numero_serie,numero_identificacao,clientes(nome)").eq("arquivado", false).order("created_at", { ascending: false }).limit(100);
    if (q.trim()) { const t = limparBusca(q); qb = qb.or(`numero_serie.ilike.%${t}%,numero_identificacao.ilike.%${t}%,modelo.ilike.%${t}%,marca.ilike.%${t}%,tipo_equipamento.ilike.%${t}%`); }
    return (await qb).data ?? [];
  }, [q]);

  return (
    <>
      <PageHeader titulo="Máquinas" descricao="Cada máquina guarda o seu próprio histórico"
        acao={editar && <div className="flex flex-wrap gap-3"><Link href="/maquinas/importar"><Button variante="secundario" icone={<FileSpreadsheet className="h-5 w-5" />}>Importar máquinas</Button></Link><Button icone={<Plus className="h-5 w-5" />} onClick={() => setNovo(true)}>Nova máquina</Button></div>} />
      <div className="relative mb-6 max-w-md">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-suave" />
        <input className="campo rounded-full pl-11" placeholder="Pesquisar por série, identificação, modelo..." value={busca} onChange={(e) => setBusca(e.target.value)} />
      </div>
      {carregando ? <ListaSkeleton /> : (
        <Tabela linhas={dados ?? []} aoClicar={(m: any) => router.push(`/maquinas/${m.id}`)}
          vazio={<EmptyState titulo={busca ? "Nenhuma máquina encontrada." : "Nenhuma máquina ainda — cadastre ou importe da planilha."} />}
          colunas={[
            { titulo: "Equipamento", render: (m: any) => <span className="font-semibold">{m.tipo_equipamento} {m.marca} {m.modelo}</span> },
            { titulo: "Cliente", render: (m: any) => m.clientes?.nome },
            { titulo: "Nº de série", render: (m: any) => m.numero_serie || "—" },
            { titulo: "Identificação", render: (m: any) => m.numero_identificacao || "—" },
          ]} />
      )}
      <Modal aberto={novo} onFechar={() => setNovo(false)} titulo="Nova máquina">
        <FormMaquina clienteInicial={cli ?? undefined} onCancelar={() => setNovo(false)} onSalvo={(id) => router.push(`/maquinas/${id}`)} />
      </Modal>
    </>
  );
}
