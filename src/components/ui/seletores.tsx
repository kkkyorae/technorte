"use client";
import { useEffect, useState } from "react";
import { Search, X } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useDebounce } from "@/lib/hooks";
import { limparBusca } from "@/lib/formatar";
import { Campo, Select } from "./form";

// Escolher cliente digitando (funciona bem mesmo com milhares de clientes)
export function SeletorCliente({ valor, nome, onMudar, erro }: { valor: string; nome?: string; onMudar: (id: string, nome: string) => void; erro?: string }) {
  const [texto, setTexto] = useState("");
  const [lista, setLista] = useState<any[]>([]);
  const q = useDebounce(texto);
  useEffect(() => {
    if (q.length < 2) { setLista([]); return; }
    supabase.from("clientes").select("id,nome,telefone").eq("arquivado", false)
      .ilike("nome", `%${limparBusca(q)}%`).order("nome").limit(8).then(({ data }) => setLista(data ?? []));
  }, [q]);

  if (valor) {
    return (
      <Campo rotulo="Cliente" erro={erro}>
        <div className="campo flex items-center justify-between">
          <span>{nome}</span>
          <button type="button" onClick={() => onMudar("", "")} className="text-suave hover:text-texto" aria-label="Trocar cliente"><X className="h-4 w-4" /></button>
        </div>
      </Campo>
    );
  }
  return (
    <Campo rotulo="Cliente" erro={erro}>
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-suave" />
        <input className="campo pl-11" placeholder="Digite o nome do cliente..." value={texto} onChange={(e) => setTexto(e.target.value)} />
        {lista.length > 0 && (
          <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl bg-card borda-fina shadow-suave">
            {lista.map((c) => (
              <button type="button" key={c.id} onClick={() => { onMudar(c.id, c.nome); setTexto(""); setLista([]); }}
                className="block w-full px-4 py-3 text-left transition hover:bg-white/[0.05]">
                {c.nome} <span className="text-sm text-suave">{c.telefone}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </Campo>
  );
}

// Escolher a máquina do cliente já selecionado
export function SeletorMaquina({ clienteId, valor, onMudar }: { clienteId: string; valor: string; onMudar: (id: string) => void }) {
  const [lista, setLista] = useState<any[]>([]);
  useEffect(() => {
    if (!clienteId) { setLista([]); return; }
    supabase.from("maquinas").select("id,tipo_equipamento,marca,modelo,numero_serie").eq("cliente_id", clienteId).eq("arquivado", false)
      .then(({ data }) => setLista(data ?? []));
  }, [clienteId]);
  return (
    <Campo rotulo="Máquina / equipamento">
      <Select value={valor} onChange={(e) => onMudar(e.target.value)} disabled={!clienteId}>
        <option value="">{clienteId ? (lista.length ? "Selecione a máquina" : "Cliente sem máquinas cadastradas") : "Escolha o cliente primeiro"}</option>
        {lista.map((m) => (
          <option key={m.id} value={m.id}>{m.tipo_equipamento} {m.marca} {m.modelo} {m.numero_serie ? `· Série ${m.numero_serie}` : ""}</option>
        ))}
      </Select>
    </Campo>
  );
}
