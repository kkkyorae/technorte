"use client";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Campo, Input } from "@/components/ui/form";
import { Logo } from "@/components/layout/Logo";
import { supabase } from "@/lib/supabase/client";

// Tela de login centralizada, com um brilho verde bem sutil ao fundo
export default function Login() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setCarregando(true); setErro("");
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    if (error) { setErro("E-mail ou senha incorretos."); setCarregando(false); return; }
    window.location.href = "/dashboard"; // recarrega para a sessão ser lida pelo servidor
  }

  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden px-4">
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-marca/20 blur-[120px]" />
      <form onSubmit={entrar} className="relative w-full max-w-md space-y-5 rounded-3xl bg-card p-8 borda-fina shadow-suave sm:p-10">
        <div className="text-center"><Logo /><p className="mt-2 text-suave">Entre para acessar o sistema</p></div>
        {typeof window !== "undefined" && window.location.search.includes("inativo") && <p className="rounded-xl bg-perigo/10 p-3 text-sm text-perigo">Seu usuário está desativado. Fale com o administrador.</p>}
        <Campo rotulo="E-mail"><Input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Campo>
        <Campo rotulo="Senha" erro={erro}><Input type="password" required autoComplete="current-password" value={senha} onChange={(e) => setSenha(e.target.value)} /></Campo>
        <Button type="submit" carregando={carregando} className="w-full">Entrar</Button>
        <Link href="/recuperar-senha" className="block text-center text-sm text-suave transition hover:text-marca2">Esqueci minha senha</Link>
      </form>
    </div>
  );
}
