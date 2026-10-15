import { NextResponse } from "next/server";
import { supabaseServidor } from "@/lib/supabase/server";

// Recebe o link do e-mail de recuperação, troca o código por uma sessão e segue para a tela pedida
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";
  if (code) await supabaseServidor().auth.exchangeCodeForSession(code);
  return NextResponse.redirect(`${origin}${next}`);
}
