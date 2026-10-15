"use client";
import clsx from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronsLeft, ChevronsRight, LogOut } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { NOME_PERFIL, podeVer } from "@/lib/permissoes";
import { MENU } from "./menu";
import { Logo } from "./Logo";

// Barra lateral (só aparece no computador/tablet). Recolhível. Mostra só o que o perfil pode ver.
export function Sidebar() {
  const path = usePathname();
  const { usuario, sair } = useAuth();
  const [recolhida, setRecolhida] = useState(false);

  return (
    <aside className={clsx("sticky top-0 hidden h-screen shrink-0 flex-col border-r border-white/[0.07] bg-fundo2 transition-all duration-200 md:flex", recolhida ? "w-[84px]" : "w-72")}>
      <div className="flex h-20 items-center justify-between px-5">
        {recolhida ? <span className="text-xl font-bold text-marca2">TN</span> : <Logo pequeno />}
        <button onClick={() => setRecolhida(!recolhida)} aria-label="Recolher menu" className="grid h-9 w-9 place-items-center rounded-full text-suave hover:bg-white/[0.06] hover:text-texto">
          {recolhida ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
        </button>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
        {MENU.filter((i) => podeVer(usuario?.perfil, i.modulo)).map((i) => {
          const ativo = path === i.href || path.startsWith(i.href + "/");
          return (
            <Link key={i.href} href={i.href} title={i.rotulo}
              className={clsx("relative flex min-h-[48px] items-center gap-3 rounded-xl px-4 text-[15px] font-medium transition duration-200",
                ativo ? "bg-marca/15 text-marca2" : "text-suave hover:bg-white/[0.04] hover:text-texto")}>
              {ativo && <span className="absolute left-0 top-2 bottom-2 w-1 rounded-full bg-marca2" />}
              <i.icone className="h-5 w-5 shrink-0" />
              {!recolhida && i.rotulo}
            </Link>
          );
        })}
      </nav>
      {/* usuário e botão sair ficam embaixo */}
      <div className="border-t border-white/[0.07] p-4">
        {!recolhida && (
          <div className="mb-3 flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-marca/20 font-semibold text-marca2">{usuario?.nome?.[0]?.toUpperCase()}</div>
            <div className="min-w-0"><div className="truncate text-sm font-semibold">{usuario?.nome}</div><div className="text-xs text-suave">{usuario?.cargo || NOME_PERFIL[usuario?.perfil ?? "funcionario"]}</div></div>
          </div>
        )}
        <button onClick={sair} className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl text-suave transition hover:bg-white/[0.05] hover:text-texto">
          <LogOut className="h-4 w-4" />{!recolhida && "Sair"}
        </button>
      </div>
    </aside>
  );
}
