"use client";
import clsx from "clsx";
import { X } from "lucide-react";
import { useEffect } from "react";

// Janela (modal) padrão. Fecha com ESC ou clicando fora. Rola por dentro se o conteúdo for grande.
export function Modal({ aberto, onFechar, titulo, children, largura = "max-w-2xl" }: {
  aberto: boolean; onFechar: () => void; titulo: string; children: React.ReactNode; largura?: string;
}) {
  useEffect(() => {
    if (!aberto) return;
    const h = (e: KeyboardEvent) => e.key === "Escape" && onFechar();
    window.addEventListener("keydown", h);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", h); document.body.style.overflow = ""; };
  }, [aberto, onFechar]);
  if (!aberto) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-6" onMouseDown={onFechar}>
      <div
        onMouseDown={(e) => e.stopPropagation()}
        className={clsx("flex max-h-[92vh] w-full flex-col rounded-t-2xl bg-card borda-fina shadow-suave sm:rounded-2xl", largura)}
      >
        <div className="flex items-center justify-between border-b border-white/[0.07] px-6 py-4">
          <h3 className="text-lg font-semibold">{titulo}</h3>
          <button onClick={onFechar} aria-label="Fechar" className="grid h-10 w-10 place-items-center rounded-full text-suave transition hover:bg-white/[0.06] hover:text-texto">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-y-auto p-6">{children}</div>
      </div>
    </div>
  );
}
