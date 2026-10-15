import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Roda ANTES de cada página: renova a sessão do Supabase e protege as rotas.
// Sem login -> vai para /login. Com login e em /login -> vai para /dashboard.
const PUBLICAS = ["/login", "/recuperar-senha", "/auth/callback"];

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(lista) {
        lista.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        lista.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  const { data: { user } } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;
  const publica = PUBLICAS.some((p) => path.startsWith(p));

  if (!user && !publica) return NextResponse.redirect(new URL("/login", request.url));
  if (user && path.startsWith("/login")) return NextResponse.redirect(new URL("/dashboard", request.url));
  return response;
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|api/usuarios).*)"] };
