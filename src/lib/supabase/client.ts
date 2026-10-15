import { createBrowserClient } from "@supabase/ssr";

// Cliente do Supabase usado nas telas (navegador). Usa a chave pública "anon";
// a segurança real está nas regras RLS do banco (supabase/03_seguranca_rls_storage.sql).
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
