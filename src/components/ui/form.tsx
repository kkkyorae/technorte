import clsx from "clsx";
import { forwardRef } from "react";

// Campos de formulário padrão. "Campo" coloca o rótulo em cima e a mensagem de erro embaixo.
export function Campo({ rotulo, erro, children, className }: { rotulo: string; erro?: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={clsx("block", className)}>
      <span className="mb-1.5 block text-sm font-medium text-suave">{rotulo}</span>
      {children}
      {erro && <span className="mt-1 block text-sm text-perigo">{erro}</span>}
    </label>
  );
}

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...p }, ref) => <input ref={ref} {...p} className={clsx("campo", className)} />
);
Input.displayName = "Input";

export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...p }, ref) => <select ref={ref} {...p} className={clsx("campo", className)}>{children}</select>
);
Select.displayName = "Select";

export const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...p }, ref) => <textarea ref={ref} rows={3} {...p} className={clsx("campo py-3", className)} />
);
Textarea.displayName = "Textarea";

// Grade de formulário: 1 coluna no celular, no máximo 2 no computador
export const GradeForm = ({ children }: { children: React.ReactNode }) => (
  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">{children}</div>
);
