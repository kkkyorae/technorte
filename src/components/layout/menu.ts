import { Cog, FileText, LayoutDashboard, Package, Settings, ShieldCheck, UserCog, Users, Wallet } from "lucide-react";
import type { Modulo } from "@/lib/permissoes";

// Itens do menu (sidebar no computador, menu inferior no celular)
export const MENU: { rotulo: string; href: string; modulo: Modulo; icone: any }[] = [
  { rotulo: "Dashboard", href: "/dashboard", modulo: "dashboard", icone: LayoutDashboard },
  { rotulo: "Clientes", href: "/clientes", modulo: "clientes", icone: Users },
  { rotulo: "Máquinas", href: "/maquinas", modulo: "maquinas", icone: Cog },
  { rotulo: "Garantias", href: "/garantias", modulo: "garantias", icone: ShieldCheck },
  { rotulo: "Orçamentos", href: "/orcamentos", modulo: "orcamentos", icone: FileText },
  { rotulo: "Estoque", href: "/estoque", modulo: "estoque", icone: Package },
  { rotulo: "Financeiro", href: "/financeiro", modulo: "financeiro", icone: Wallet },
  { rotulo: "Usuários", href: "/usuarios", modulo: "usuarios", icone: UserCog },
  { rotulo: "Configurações", href: "/configuracoes", modulo: "configuracoes", icone: Settings },
];
