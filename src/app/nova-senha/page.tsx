"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Campo, Input } from "@/components/ui/form";
import { Logo } from "@/components/layout/Logo";
import { supabase } from "@/lib/supabase/client";

// Aqui a pessoa chega pelo link do e-mail e define a nova senha
export default function NovaSenha() {
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (senha.length < 6) { setErro("A senha precisa ter pelo menos 6 caracteres."); return; }
    setCarregando(true);
    const { error } = await supabase.auth.updateUser({ password: senha });
    if (error) { setErro("Não foi possível salvar. Peça um novo link."); setCarregando(false); return; }
    window.location.href = "/dashboard";
  }
  return (
    <div className="grid min-h-screen place-items-center px-4">
      <form onSubmit={salvar} className="w-full max-w-md space-y-5 rounded-3xl bg-card p-8 borda-fina shadow-suave sm:p-10">
        <div className="text-center"><Logo /><p className="mt-2 text-suave">Criar nova senha</p></div>
        <Campo rotulo="Nova senha" erro={erro}><Input type="password" required value={senha} onChange={(e) => setSenha(e.target.value)} /></Campo>
        <Button type="submit" carregando={carregando} className="w-full">Salvar senha</Button>
      </form>
    </div>
  );
}
