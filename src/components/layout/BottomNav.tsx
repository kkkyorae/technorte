"use client";
import clsx from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, MoreHorizontal } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { podeVer } from "@/lib/permissoes";
import { MENU } from "./menu";

// Menu inferior do celular: 4 itens principais + "Mais" com o resto
export function BottomNav() {
  const path = usePathname();
  const { usuario, sair } = useAuth();
  const [mais, setMais] = useState(false);
  const itens = MENU.filter((i) => podeVer(usuario?.perfil, i.modulo));
  const principais = itens.slice(0, 4);
  const resto = itens.slice(4);
  const ativo = (h: string) => path === h || path.startsWith(h + "/");

  return (
    <>
      {mais && (
        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden" onClick={() => setMais(false)}>
          <div className="absolute bottom-20 left-3 right-3 space-y-1 rounded-2xl bg-card p-3 borda-fina shadow-suave" onClick={(e) => e.stopPropagation()}>
            {resto.map((i) => (
              <Link key={i.href} href={i.href} onClick={() => setMais(false)} className="flex min-h-[48px] items-center gap-3 rounded-xl px-4 text-suave hover:bg-white/[0.05]">
                <i.icone className="h-5 w-5" />{i.rotulo}
              </Link>
            ))}
            <button onClick={sair} className="flex min-h-[48px] w-full items-center gap-3 rounded-xl px-4 text-suave hover:bg-white/[0.05]"><LogOut className="h-5 w-5" />Sair</button>
          </div>
        </div>
      )}
      <nav className="fixed bottom-0 left-0 right-0 z-30 flex justify-around border-t border-white/[0.07] bg-fundo2/95 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        {principais.map((i) => (
          <Link key={i.href} href={i.href} className={clsx("flex min-h-[64px] flex-1 flex-col items-center justify-center gap-1 text-xs", ativo(i.href) ? "text-marca2" : "text-suave")}>
            <i.icone className="h-5 w-5" />{i.rotulo}
          </Link>
        ))}
        <button onClick={() => setMais(!mais)} className="flex min-h-[64px] flex-1 flex-col items-center justify-center gap-1 text-xs text-suave">
          <MoreHorizontal className="h-5 w-5" />Mais
        </button>
      </nav>
    </>
  );
}
