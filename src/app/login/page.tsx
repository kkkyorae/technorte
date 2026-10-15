"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Campo, Input } from "@/components/ui/form";
import { Logo } from "@/components/layout/Logo";
import { supabase } from "@/lib/supabase/client";

// Descobre a que projeto Supabase este site está ligado e se a chave é do tipo certo.
// Só aparece em /login?debug=1 e NUNCA mostra a chave inteira.
function diagnostico() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  let host = "vazia";
  try { host = new URL(url).host; } catch { if (url) host = "URL inválida"; }
  let tipo = key ? "formato desconhecido" : "vazia";
  if (key.startsWith("sb_publishable_")) tipo = "publishable (ok)";
  else if (key.startsWith("sb_secret_")) tipo = "SECRETA (errado! use a pública)";
  else if (key.split(".").length === 3) {
    try {
      const p = JSON.parse(atob(key.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
      tipo = p.role === "anon" ? "anon (ok)" : `${p.role} (errado! use a anon)`;
    } catch { tipo = "formato inválido"; }
  }
  return { host, tipo, espacos: url !== url.trim() || key !== key.trim() };
}

// Tela de login centralizada, com um brilho verde bem sutil ao fundo
export default function Login() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [bruto, setBruto] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [debug, setDebug] = useState(false);
  const [inativo, setInativo] = useState(false);
  useEffect(() => {
    setDebug(window.location.search.includes("debug"));
    setInativo(window.location.search.includes("inativo"));
  }, []);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setCarregando(true); setErro(""); setBruto("");
    // trim/minúsculas: teclado do celular e autopreenchimento costumam deixar espaço no fim
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password: senha });
    if (error) {
      // mostra o motivo real (antes todo erro virava "senha incorreta" e escondia o problema)
      const m = error.message.toLowerCase();
      setBruto(`${error.status ?? ""} ${error.code ?? ""} ${error.message}`);
      setErro(m.includes("not confirmed") ? "Este e-mail ainda não foi confirmado no Supabase."
        : m.includes("invalid login") ? "E-mail ou senha incorretos."
        : "Não foi possível entrar: " + error.message);
      setCarregando(false); return;
    }
    window.location.href = "/dashboard"; // recarrega para a sessão ser lida pelo servidor
  }

  const d = debug ? diagnostico() : null;
  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden px-4">
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-marca/20 blur-[120px]" />
      <form onSubmit={entrar} className="relative w-full max-w-md space-y-5 rounded-3xl bg-card p-8 borda-fina shadow-suave sm:p-10">
        <div className="text-center"><Logo /><p className="mt-2 text-suave">Entre para acessar o sistema</p></div>
        {inativo && <p className="rounded-xl bg-perigo/10 p-3 text-sm text-perigo">Seu usuário está desativado ou sem perfil. Fale com o administrador.</p>}
        <Campo rotulo="E-mail"><Input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Campo>
        <Campo rotulo="Senha" erro={erro}><Input type="password" required autoComplete="current-password" value={senha} onChange={(e) => setSenha(e.target.value)} /></Campo>
        <Button type="submit" carregando={carregando} className="w-full">Entrar</Button>
        <Link href="/recuperar-senha" className="block text-center text-sm text-suave transition hover:text-marca2">Esqueci minha senha</Link>
        {d && (
          <div className="space-y-1 rounded-xl bg-fundo2 p-3 text-xs text-suave">
            <div>login v2 · projeto: <b className="text-texto">{d.host}</b></div>
            <div>chave pública: <b className="text-texto">{d.tipo}</b>{d.espacos && <b className="text-perigo"> · há espaço sobrando nas variáveis!</b>}</div>
            {bruto && <div>resposta do Supabase: <b className="text-texto">{bruto}</b></div>}
          </div>
        )}
      </form>
    </div>
  );
}