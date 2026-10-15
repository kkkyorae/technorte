"use client";
import { CheckCircle2, Download, FileSpreadsheet, TriangleAlert } from "lucide-react";
import Link from "next/link";
import Papa from "papaparse";
import { useRef, useState } from "react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Card, CardTitulo } from "@/components/ui/card";
import { Pilula } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page";
import { useToast } from "@/components/ui/toast";
import { analisar, importar, LinhaImport, normalizar } from "@/lib/importacao";

// IMPORTAR MÁQUINAS: 1 escolher arquivo -> 2 ler -> 3 prévia -> 4 validar -> 5 erros -> 6 duplicados -> 7 confirmar -> 8 importar
export default function ImportarMaquinas() {
  const toast = useToast();
  const entrada = useRef<HTMLInputElement>(null);
  const [linhas, setLinhas] = useState<LinhaImport[] | null>(null);
  const [lendo, setLendo] = useState(false);
  const [progresso, setProgresso] = useState<number | null>(null);
  const [fim, setFim] = useState<{ maquinas: number; clientesNovos: number } | null>(null);

  async function ler(arquivo: File) {
    setLendo(true); setFim(null); setLinhas(null);
    try {
      let brutas: any[];
      if (arquivo.name.toLowerCase().endsWith(".csv")) {
        brutas = await new Promise<any[]>((ok, no) => Papa.parse(arquivo, { header: true, skipEmptyLines: true, complete: (r) => ok(r.data as any[]), error: no }));
      } else {
        const wb = XLSX.read(await arquivo.arrayBuffer());
        brutas = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: "" });
      }
      const norm = normalizar(brutas);
      if (!norm.length) { toast.erro("Não encontrei linhas na planilha. Confira se a primeira linha tem os nomes das colunas."); setLendo(false); return; }
      setLinhas(await analisar(norm));
    } catch (e: any) { toast.erro("Não foi possível ler o arquivo. " + (e?.message ?? "")); }
    setLendo(false);
  }

  async function confirmar() {
    if (!linhas) return;
    setProgresso(0);
    try {
      const r = await importar(linhas, setProgresso);
      setFim(r); setLinhas(null); toast.ok(`✓ ${r.maquinas} máquinas importadas com sucesso`);
    } catch (e: any) { toast.erro("A importação parou: " + (e?.message ?? "erro desconhecido")); }
    setProgresso(null);
  }
  const alternar = (n: number) => setLinhas((l) => l!.map((x) => (x.n === n ? { ...x, incluir: !x.incluir } : x)));

  // modelo de planilha para baixar
  function baixarModelo() {
    const csv = "cliente,telefone,tipo_equipamento,marca,modelo,numero_serie,numero_identificacao,observacoes\nJoão da Silva,(44) 99999-0000,Motor,WEG,XYZ,123456,ID-001,Exemplo\n";
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv" })); a.download = "modelo-importacao-maquinas.csv"; a.click();
  }

  const total = linhas?.length ?? 0;
  const novos = linhas?.filter((l) => l.situacao === "novo").length ?? 0;
  const dups = linhas?.filter((l) => l.situacao === "duplicado").length ?? 0;
  const erros = linhas?.filter((l) => l.situacao === "erro").length ?? 0;
  const aImportar = linhas?.filter((l) => l.incluir).length ?? 0;
  const problemas = linhas?.filter((l) => l.situacao !== "novo").slice(0, 200) ?? [];

  return (
    <>
      <PageHeader titulo="Importar máquinas" descricao="Envie a planilha (Excel ou CSV). Você confere tudo antes de confirmar." />
      <Card className="space-y-4">
        <input ref={entrada} type="file" accept=".xlsx,.xls,.csv" hidden onChange={(e) => e.target.files?.[0] && ler(e.target.files[0])} />
        <div className="flex flex-wrap gap-3">
          <Button icone={<FileSpreadsheet className="h-5 w-5" />} carregando={lendo} onClick={() => entrada.current?.click()}>Escolher planilha</Button>
          <Button variante="secundario" icone={<Download className="h-5 w-5" />} onClick={baixarModelo}>Baixar modelo</Button>
        </div>
        <p className="text-sm text-suave">Colunas aceitas: cliente, telefone, tipo_equipamento, marca, modelo, numero_serie, numero_identificacao, observacoes. Clientes que ainda não existem são criados automaticamente.</p>
      </Card>

      {fim && (
        <Card className="mt-6 flex items-center gap-4"><CheckCircle2 className="h-8 w-8 text-marca2" />
          <div><div className="text-lg font-semibold">Importação concluída</div><div className="text-suave">{fim.maquinas} máquinas importadas e {fim.clientesNovos} clientes novos criados. <Link href="/maquinas" className="font-semibold text-marca2">Ver máquinas</Link></div></div></Card>
      )}

      {linhas && (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-4">
            <Card><div className="text-3xl font-semibold">{total}</div><div className="text-suave">registros encontrados</div></Card>
            <Card><div className="text-3xl font-semibold text-marca2">{novos}</div><div className="text-suave">novos</div></Card>
            <Card><div className="text-3xl font-semibold text-aviso">{dups}</div><div className="text-suave">possíveis duplicados</div></Card>
            <Card><div className="text-3xl font-semibold text-perigo">{erros}</div><div className="text-suave">com erro (não entram)</div></Card>
          </div>
          {problemas.length > 0 && (
            <Card className="mt-6">
              <CardTitulo>Revisar antes de importar</CardTitulo>
              <p className="mb-3 text-sm text-suave">Duplicados vêm desmarcados. Marque os que você quer importar mesmo assim.</p>
              <div className="space-y-2">{problemas.map((l) => (
                <label key={l.n} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-fundo2 px-4 py-3">
                  <span className="flex items-center gap-3">
                    {l.situacao === "duplicado" ? <input type="checkbox" className="h-5 w-5 accent-[#16A66A]" checked={l.incluir} onChange={() => alternar(l.n)} /> : <TriangleAlert className="h-5 w-5 text-perigo" />}
                    <span>Linha {l.n}: <b>{l.cliente || "(sem cliente)"}</b> · {l.tipo_equipamento} {l.modelo} {l.numero_serie && `· Série ${l.numero_serie}`}</span>
                  </span>
                  <Pilula tom={l.situacao === "erro" ? "vermelho" : "amarelo"}>{l.motivo}</Pilula>
                </label>))}</div>
              {dups + erros > 200 && <p className="mt-3 text-sm text-suave">Mostrando os 200 primeiros problemas.</p>}
            </Card>
          )}
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <Button onClick={confirmar} carregando={progresso !== null} disabled={aImportar === 0}>Confirmar e importar {aImportar} registros</Button>
            {progresso !== null && <div className="h-3 w-56 overflow-hidden rounded-full bg-white/10"><div className="h-full bg-marca2 transition-all" style={{ width: `${progresso}%` }} /></div>}
          </div>
        </>
      )}
    </>
  );
}
