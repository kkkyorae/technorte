"use client";
import { CheckCircle2, XCircle } from "lucide-react";
import { createContext, useCallback, useContext, useState } from "react";

// Mensagens rápidas no canto da tela: toast.ok("Salvo!") / toast.erro("Algo deu errado")
type T = { id: number; tipo: "ok" | "erro"; msg: string };
const Ctx = createContext<{ ok: (m: string) => void; erro: (m: string) => void }>({ ok: () => {}, erro: () => {} });
export const useToast = () => useContext(Ctx);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [itens, setItens] = useState<T[]>([]);
  const add = useCallback((tipo: T["tipo"], msg: string) => {
    const id = Date.now() + Math.random();
    setItens((l) => [...l, { id, tipo, msg }]);
    setTimeout(() => setItens((l) => l.filter((i) => i.id !== id)), 4500);
  }, []);
  return (
    <Ctx.Provider value={{ ok: (m) => add("ok", m), erro: (m) => add("erro", m) }}>
      {children}
      <div className="pointer-events-none fixed bottom-24 right-4 z-[60] flex flex-col gap-2 md:bottom-6 md:right-6">
        {itens.map((i) => (
          <div key={i.id} className="pointer-events-auto flex max-w-sm items-center gap-3 rounded-2xl bg-card px-4 py-3 text-[15px] shadow-suave borda-fina">
            {i.tipo === "ok" ? <CheckCircle2 className="h-5 w-5 shrink-0 text-marca2" /> : <XCircle className="h-5 w-5 shrink-0 text-perigo" />}
            {i.msg}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
