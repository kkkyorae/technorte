import { Shell } from "@/components/layout/Shell";

// Páginas internas dependem de login e dados em tempo real, então nunca são "congeladas" no build
export const dynamic = "force-dynamic";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <Shell>{children}</Shell>;
}
