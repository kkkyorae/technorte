"use client";
import { LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { NOME_PERFIL } from "@/lib/permissoes";
import { BuscaGlobal } from "./BuscaGlobal";
import { Logo } from "./Logo";
import { Notificacoes } from "./Notificacoes";

// Barra de cima: busca global no centro, notificações, nome/cargo do usuário e botão sair
export function Topbar() {
  const { usuario, sair } = useAuth();
  return (
    <header className="sticky top-0 z-30 flex h-20 items-center justify-between gap-4 border-b border-white/[0.07] bg-fundo/80 px-4 backdrop-blur-md sm:px-8">
      <div className="md:hidden"><Logo pequeno /></div>
      <div className="hidden flex-1 justify-center md:flex"><BuscaGlobal /></div>
      <div className="flex items-center gap-3">
        <Notificacoes />
        <div className="hidden text-right lg:block">
          <div className="text-sm font-semibold">{usuario?.nome}</div>
          <div className="text-xs text-suave">{usuario?.cargo || NOME_PERFIL[usuario?.perfil ?? "funcionario"]}</div>
        </div>
        <button onClick={sair} aria-label="Sair" className="hidden h-11 w-11 place-items-center rounded-full bg-fundo2 borda-fina text-suave transition hover:text-texto md:grid"><LogOut className="h-5 w-5" /></button>
      </div>
    </header>
  );
}
