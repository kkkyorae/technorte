import type { Config } from "tailwindcss";

// As cores vêm de variáveis CSS definidas em src/app/globals.css.
// Para mudar a paleta do sistema inteiro, altere SOMENTE lá.
const cor = (v: string) => `rgb(var(--${v}) / <alpha-value>)`;

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        fundo: cor("fundo"),
        fundo2: cor("fundo2"),
        card: cor("card"),
        marca: cor("marca"),
        marca2: cor("marca2"),
        "marca-escuro": cor("marca-escuro"),
        texto: cor("texto"),
        suave: cor("suave"),
        perigo: cor("perigo"),
        aviso: cor("aviso"),
        laranja: cor("laranja"),
      },
      fontFamily: { sans: ["var(--fonte)", "system-ui", "sans-serif"] },
      boxShadow: { suave: "0 8px 30px rgba(0,0,0,.35)", brilho: "0 0 0 1px rgba(22,166,106,.35), 0 6px 24px rgba(15,143,91,.25)" },
    },
  },
  plugins: [],
};
export default config;
