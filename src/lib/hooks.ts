"use client";
import { useEffect, useState } from "react";

// Carrega dados e permite "recarregar" depois de salvar. Evita repetir código em cada página.
export function useCarregar<T>(fn: () => Promise<T>, deps: any[] = []) {
  const [dados, setDados] = useState<T | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let vivo = true;
    setCarregando(true);
    fn()
      .then((d) => { if (vivo) { setDados(d); setCarregando(false); } })
      .catch((e) => { console.error(e); if (vivo) setCarregando(false); });
    return () => { vivo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);
  return { dados, carregando, recarregar: () => setTick((t) => t + 1) };
}

// Espera o usuário parar de digitar antes de buscar (deixa a pesquisa leve)
export function useDebounce<T>(valor: T, ms = 350) {
  const [v, setV] = useState(valor);
  useEffect(() => { const t = setTimeout(() => setV(valor), ms); return () => clearTimeout(t); }, [valor, ms]);
  return v;
}
