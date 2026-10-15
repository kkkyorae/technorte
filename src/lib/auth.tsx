"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import type { Perfil } from "@/lib/permissoes";

export type Usuario = { id: string; nome: string; email: string; cargo: string | null; perfil: Perfil; ativo: boolean };
const Ctx = createContext<{ usuario: Usuario | null; carregando: boolean; sair: () => Promise<void> }>({
  usuario: null, carregando: true, sair: async () => {},
});
export const useAuth = () => useContext(Ctx);

// Carrega quem está logado (e o perfil dele) uma vez e disponibiliza para o sistema todo
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [carregando, setCarregando] = useState(true);

  const sair = async () => { await supabase.auth.signOut(); window.location.href = "/login"; };

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = "/login"; return; }
      const { data: p } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      // usuário desativado pelo administrador não entra
      if (!p || !p.ativo) { await supabase.auth.signOut(); window.location.href = "/login?inativo=1"; return; }
      setUsuario(p as Usuario);
      setCarregando(false);
    })();
  }, []);

  return <Ctx.Provider value={{ usuario, carregando, sair }}>{children}</Ctx.Provider>;
}
