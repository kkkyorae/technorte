import clsx from "clsx";
import { Loader2 } from "lucide-react";

// Botão padrão do sistema. Variantes: primario (verde), secundario, perigo, fantasma.
// Altura mínima de 44px para ser fácil de tocar no celular.
const VARIANTES = {
  primario: "bg-marca text-white hover:bg-marca2 hover:shadow-brilho",
  secundario: "bg-fundo2 borda-fina text-texto hover:border-marca2/50 hover:bg-white/[0.04]",
  perigo: "bg-perigo/90 text-white hover:bg-perigo",
  fantasma: "text-suave hover:text-texto hover:bg-white/[0.05]",
};

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variante?: keyof typeof VARIANTES; carregando?: boolean; icone?: React.ReactNode;
};

export function Button({ variante = "primario", carregando, icone, className, children, disabled, ...rest }: Props) {
  return (
    <button
      {...rest}
      disabled={disabled || carregando}
      className={clsx(
        "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl px-5 text-[15px] font-semibold",
        "transition duration-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50",
        VARIANTES[variante], className
      )}
    >
      {carregando ? <Loader2 className="h-4 w-4 animate-spin" /> : icone}
      {children}
    </button>
  );
}
