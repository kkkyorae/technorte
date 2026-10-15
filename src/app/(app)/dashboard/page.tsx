"use client";
import { AlertTriangle, ArrowDownCircle, ArrowUpCircle, Clock, FileCheck2, FileText, PackageMinus, ShieldCheck, Wallet } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import Link from "next/link";
import { Card, CardTitulo } from "@/components/ui/card";
import { PageHeader, Skeleton, StatCard } from "@/components/ui/page";
import { useAuth } from "@/lib/auth";
import { useCarregar } from "@/lib/hooks";
import { dataHoraBR, hoje, moeda } from "@/lib/formatar";
import { podeVer } from "@/lib/permissoes";
import { ESTILO_FAIXA, FAIXAS, faixaPrazo } from "@/lib/prazo";
import { supabase } from "@/lib/supabase/client";

// DASHBOARD: todos os números vêm do banco (nada fictício). Cada perfil só vê o que tem permissão.
export default function Dashboard() {
  const { usuario } = useAuth();
  const p = usuario?.perfil;
  const { dados: d, carregando } = useCarregar(async () => {
    const mesInicio = hoje().slice(0, 7) + "-01";
    const seisMeses = new Date(); seisMeses.setMonth(seisMeses.getMonth() - 5); seisMeses.setDate(1);
    const [g, o, e, f, h] = await Promise.all([
      podeVer(p, "garantias") ? supabase.from("v_garantias").select("status,dias").eq("aberta", true).eq("arquivado", false) : null,
      podeVer(p, "orcamentos") ? supabase.from("v_orcamentos").select("status,dias").eq("aberta", true).eq("arquivado", false) : null,
      podeVer(p, "estoque") ? supabase.from("estoque").select("quantidade,estoque_minimo").eq("arquivado", false) : null,
      podeVer(p, "financeiro") ? supabase.from("financeiro").select("tipo,valor,data,pago").gte("data", seisMeses.toLocaleDateString("sv-SE")) : null,
      supabase.from("historico").select("acao,created_at,profiles(nome)").order("created_at", { ascending: false }).limit(8),
    ]);
    return { g: g?.data ?? null, o: o?.data ?? null, e: e?.data ?? null, f: f?.data ?? null, h: h.data ?? [], mesInicio };
  }, [p]);

  if (carregando || !d) return <><PageHeader titulo="Dashboard" /><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[0,1,2,3].map((i) => <Skeleton key={i} className="h-40" />)}</div></>;

  const mes = (d.f ?? []).filter((x: any) => x.data >= d.mesInicio && x.pago);
  const entradas = mes.filter((x: any) => x.tipo === "entrada").reduce((s: number, x: any) => s + Number(x.valor), 0);
  const saidas = mes.filter((x: any) => x.tipo === "saida").reduce((s: number, x: any) => s + Number(x.valor), 0);
  const estoqueBaixo = (d.e ?? []).filter((x: any) => Number(x.estoque_minimo) > 0 && Number(x.quantidade) <= Number(x.estoque_minimo)).length;

  // contagem do CONTROLE DE PRAZO (garantias + orçamentos abertos)
  const prazos: Record<string, number> = { dentro: 0, atencao: 0, limite: 0, critico: 0, excedido: 0 };
  const mapa: any = { verde: "dentro", amarelo: "atencao", laranja: "limite", vermelho: "critico", excedido: "excedido" };
  [...(d.g ?? []), ...(d.o ?? [])].forEach((x: any) => { prazos[mapa[faixaPrazo(x.dias)]]++; });
  const cor: any = { dentro: "verde", atencao: "amarelo", limite: "laranja", critico: "vermelho", excedido: "excedido" };

  // gráfico de entradas x saídas dos últimos 6 meses
  const meses: any[] = [];
  for (let i = 5; i >= 0; i--) {
    const dt = new Date(); dt.setDate(1); dt.setMonth(dt.getMonth() - i);
    const chave = dt.toLocaleDateString("sv-SE").slice(0, 7);
    const linhas = (d.f ?? []).filter((x: any) => x.data.startsWith(chave) && x.pago);
    meses.push({ mes: dt.toLocaleDateString("pt-BR", { month: "short" }),
      Entradas: linhas.filter((x: any) => x.tipo === "entrada").reduce((s: number, x: any) => s + Number(x.valor), 0),
      Saídas: linhas.filter((x: any) => x.tipo === "saida").reduce((s: number, x: any) => s + Number(x.valor), 0) });
  }

  return (
    <>
      <PageHeader titulo="Dashboard" descricao="Visão geral da TECHNORTE" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {d.g && <StatCard href="/garantias" icone={<ShieldCheck className="h-5 w-5" />} titulo="Garantias em andamento" valor={d.g.length} />}
        {d.g && <StatCard href="/garantias" icone={<Clock className="h-5 w-5" />} titulo="Garantias aguardando aprovação" valor={d.g.filter((x: any) => ["Encaminhada", "Auditoria"].includes(x.status)).length} />}
        {d.o && <StatCard href="/orcamentos" icone={<FileText className="h-5 w-5" />} titulo="Orçamentos pendentes" valor={d.o.filter((x: any) => ["Rascunho", "Encaminhado"].includes(x.status)).length} />}
        {d.o && <StatCard href="/orcamentos" icone={<FileCheck2 className="h-5 w-5" />} titulo="Orçamentos aprovados" valor={d.o.filter((x: any) => x.status === "Autorizado").length} />}
        {d.e && <StatCard href="/estoque" icone={<PackageMinus className="h-5 w-5" />} titulo="Peças com estoque baixo" valor={estoqueBaixo} />}
        {d.f && <StatCard icone={<ArrowUpCircle className="h-5 w-5" />} titulo="Entradas do mês" valor={moeda(entradas)} />}
        {d.f && <StatCard icone={<ArrowDownCircle className="h-5 w-5" />} titulo="Saídas do mês" valor={moeda(saidas)} />}
        {d.f && <StatCard icone={<Wallet className="h-5 w-5" />} titulo="Saldo do mês" valor={moeda(entradas - saidas)} />}
      </div>

      {(d.g || d.o) && (
        <Card className="mt-6">
          <CardTitulo>Controle de prazo (30 dias)</CardTitulo>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {Object.keys(prazos).map((k) => (
              <Link key={k} href={`/prazos?faixa=${k}`} className={`rounded-2xl p-4 transition hover:brightness-125 ${ESTILO_FAIXA[cor[k] as keyof typeof ESTILO_FAIXA].cor}`}>
                <div className="flex items-center gap-2 text-3xl font-semibold">{k === "excedido" && <AlertTriangle className="h-6 w-6" />}{prazos[k]}</div>
                <div className="text-sm font-medium">{FAIXAS[k].rotulo}</div>
              </Link>
            ))}
          </div>
        </Card>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {d.f && (
          <Card>
            <CardTitulo>Entradas e saídas (6 meses)</CardTitulo>
            <div className="h-64">
              <ResponsiveContainer>
                <BarChart data={meses}>
                  <CartesianGrid stroke="rgba(255,255,255,.06)" vertical={false} />
                  <XAxis dataKey="mes" stroke="#94A09A" tickLine={false} axisLine={false} />
                  <YAxis stroke="#94A09A" tickLine={false} axisLine={false} width={60} />
                  <Tooltip contentStyle={{ background: "#141A17", border: "1px solid rgba(255,255,255,.1)", borderRadius: 12 }} formatter={(v: any) => moeda(v)} />
                  <Bar dataKey="Entradas" fill="#16A66A" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="Saídas" fill="#3b4742" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}
        <Card>
          <CardTitulo>Atividades recentes</CardTitulo>
          {d.h.length === 0 && <p className="text-suave">Nenhuma atividade ainda.</p>}
          <ul className="space-y-4">
            {d.h.map((a: any, i: number) => (
              <li key={i} className="flex gap-3">
                <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-marca2" />
                <div><div>{a.acao}</div><div className="text-sm text-suave">{dataHoraBR(a.created_at)} {a.profiles?.nome && `· ${a.profiles.nome}`}</div></div>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
