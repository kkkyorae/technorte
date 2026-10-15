import "./globals.css";
import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { ToastProvider } from "@/components/ui/toast";

// Fonte moderna e legível usada no sistema inteiro
const fonte = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--fonte" });

export const metadata: Metadata = { title: "TECHNORTE", description: "Sistema interno TECHNORTE" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={fonte.variable}>
      <body className="font-sans">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
