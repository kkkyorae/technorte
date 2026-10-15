"use client";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Campo, Input } from "@/components/ui/form";
import { Logo } from "@/components/layout/Logo";
import { supabase } from "@/lib/supabase/client";

// Envia por e-mail o link para criar uma nova senha
export default function Recuperar() {
  const [email, setEmail] = useState("");
  const [enviado, setEnviado] = useState(false);
  const [carregando, setCarregando] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault(); setCarregando(true);
    await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/auth/callback?next=/nova-senha` });
    setEnviado(true); setCarregando(false);
  }
  return (
    <div className="grid min-h-screen place-items-center px-4">
      <form onSubmit={enviar} className="w-full max-w-md space-y-5 rounded-3xl bg-card p-8 borda-fina shadow-suave sm:p-10">
        <div className="text-center"><Logo /><p className="mt-2 text-suave">Recuperar senha</p></div>
        {enviado ? <p className="rounded-xl bg-marca/10 p-4 text-marca2">✓ Se o e-mail existir, você receberá um link para criar uma nova senha.</p> : (
          <>
            <Campo rotulo="Seu e-mail"><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></Campo>
            <Button type="submit" carregando={carregando} className="w-full">Enviar link</Button>
          </>
        )}
        <Link href="/login" className="block text-center text-sm text-suave hover:text-marca2">Voltar ao login</Link>
      </form>
    </div>
  );
}
