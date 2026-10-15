import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { supabaseServidor } from "@/lib/supabase/server";

// Rota do SERVIDOR: o administrador cria um novo usuário (login + perfil).
// Usa a chave service_role (que nunca vai para o navegador) e antes confere se quem pediu é admin.
export async function POST(req: Request) {
  const sb = supabaseServidor();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });
  const { data: eu } = await sb.from("profiles").select("perfil,ativo").eq("id", user.id).single();
  if (!eu?.ativo || eu.perfil !== "admin") return NextResponse.json({ erro: "Sem permissão" }, { status: 403 });

  const { nome, email, senha, cargo, perfil } = await req.json();
  if (!email || !senha || senha.length < 6) return NextResponse.json({ erro: "Informe e-mail e uma senha com 6+ caracteres." }, { status: 400 });

  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  const { data, error } = await admin.auth.admin.createUser({ email, password: senha, email_confirm: true, user_metadata: { nome } });
  if (error) return NextResponse.json({ erro: error.message }, { status: 400 });

  // o gatilho do banco já criou o perfil; aqui só ajustamos cargo e perfil
  await admin.from("profiles").update({ nome, cargo, perfil: perfil ?? "funcionario" }).eq("id", data.user.id);
  return NextResponse.json({ ok: true });
}
