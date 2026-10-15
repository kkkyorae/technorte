"use client";
import { AuthProvider, useAuth } from "@/lib/auth";
import { BuscaGlobal } from "./BuscaGlobal";
import { BottomNav } from "./BottomNav";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { Skeleton } from "../ui/page";

// "Casca" do sistema: sidebar + topbar + conteúdo centralizado (máx. ~1280px) + menu do celular
function Casca({ children }: { children: React.ReactNode }) {
  const { carregando } = useAuth();
  if (carregando) return <div className="grid min-h-screen place-items-center"><Skeleton className="h-16 w-64" /></div>;
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="min-w-0 flex-1">
        <Topbar />
        <div className="px-4 pt-4 md:hidden"><BuscaGlobal /></div>
        <main className="mx-auto w-full max-w-[1280px] px-4 py-8 pb-28 sm:px-8 md:pb-12">{children}</main>
      </div>
      <BottomNav />
    </div>
  );
}
export function Shell({ children }: { children: React.ReactNode }) {
  return <AuthProvider><Casca>{children}</Casca></AuthProvider>;
}
