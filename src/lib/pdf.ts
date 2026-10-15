import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { dataBR, moeda, pad } from "@/lib/formatar";

// GERA O PDF DO ORÇAMENTO com a identidade visual da TECHNORTE (faixa escura + verde).
// Roda no navegador e baixa o arquivo direto. Para mudar o layout, edite só este arquivo.
export function gerarOrcamentoPdf(o: any, itens: any[], cliente: any, empresa: any) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const L = 14, R = 196;

  // Faixa de cima
  doc.setFillColor(8, 11, 10); doc.rect(0, 0, 210, 34, "F");
  doc.setFont("helvetica", "bold"); doc.setFontSize(24);
  doc.setTextColor(255, 255, 255); doc.text("TECH", L, 21);
  doc.setTextColor(22, 166, 106); doc.text("NORTE", L + doc.getTextWidth("TECH"), 21);
  doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(180, 190, 185);
  doc.text([empresa?.telefone, empresa?.email, empresa?.endereco].filter(Boolean).join("  |  "), L, 28);
  doc.setFont("helvetica", "bold"); doc.setFontSize(13); doc.setTextColor(255, 255, 255);
  doc.text(`ORÇAMENTO Nº ${pad(o.numero_orcamento)}`, R, 18, { align: "right" });
  doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(180, 190, 185);
  doc.text(`Data: ${dataBR(o.data_entrada)}   Validade: ${dataBR(o.validade)}`, R, 25, { align: "right" });

  // Dados do cliente e do equipamento
  let y = 46;
  const bloco = (titulo: string, linhas: string[]) => {
    doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(15, 143, 91); doc.text(titulo, L, y); y += 5;
    doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(40, 40, 40);
    linhas.filter(Boolean).forEach((t) => { doc.text(t, L, y); y += 5; }); y += 3;
  };
  bloco("CLIENTE", [cliente?.nome, [cliente?.cpf_cnpj && `CPF/CNPJ: ${cliente.cpf_cnpj}`, cliente?.telefone && `Tel.: ${cliente.telefone}`].filter(Boolean).join("   "),
    cliente?.email, [cliente?.endereco, cliente?.cidade && `${cliente.cidade}${cliente.estado ? "/" + cliente.estado : ""}`].filter(Boolean).join(" - ")]);
  bloco("EQUIPAMENTO", [[o.tipo_equipamento, o.marca, o.modelo].filter(Boolean).join(" ") || "Não informado", o.numero_serie && `Nº de série: ${o.numero_serie}`]);

  // Tabela de peças, serviços e mão de obra
  autoTable(doc, {
    startY: y, margin: { left: L, right: 14 },
    head: [["Descrição (peças / serviços / mão de obra)", "Qtd.", "Valor unit.", "Total"]],
    body: itens.map((i) => [i.descricao, String(i.quantidade).replace(".", ","), moeda(i.valor_unitario), moeda(i.valor_total)]),
    headStyles: { fillColor: [11, 92, 61], textColor: 255 }, styles: { fontSize: 10, cellPadding: 3 },
    columnStyles: { 1: { halign: "right", cellWidth: 20 }, 2: { halign: "right", cellWidth: 32 }, 3: { halign: "right", cellWidth: 32 } },
    alternateRowStyles: { fillColor: [244, 247, 245] },
  });
  y = (doc as any).lastAutoTable.finalY + 8;

  // Totais
  const subtotal = itens.reduce((s, i) => s + Number(i.valor_total), 0);
  doc.setFontSize(10); doc.setTextColor(40, 40, 40); doc.setFont("helvetica", "normal");
  doc.text("Subtotal:", 140, y); doc.text(moeda(subtotal), R, y, { align: "right" }); y += 6;
  doc.text("Desconto:", 140, y); doc.text("- " + moeda(o.desconto), R, y, { align: "right" }); y += 8;
  doc.setFillColor(15, 143, 91); doc.roundedRect(134, y - 6, R - 134, 11, 2, 2, "F");
  doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.setTextColor(255, 255, 255);
  doc.text("TOTAL:", 138, y + 1.5); doc.text(moeda(o.valor_total), R - 3, y + 1.5, { align: "right" }); y += 16;

  // Prazo, condições e observações
  doc.setTextColor(40, 40, 40); doc.setFontSize(10);
  const texto = (titulo: string, t?: string) => {
    if (!t) return;
    doc.setFont("helvetica", "bold"); doc.text(titulo, L, y); y += 5;
    doc.setFont("helvetica", "normal");
    const linhas = doc.splitTextToSize(t, R - L); doc.text(linhas, L, y); y += linhas.length * 5 + 4;
  };
  texto("Prazo", `Entrada do equipamento em ${dataBR(o.data_entrada)} (${o.dias} dia${o.dias === 1 ? "" : "s"} em atendimento). Validade do orçamento: ${dataBR(o.validade)}.`);
  texto("Condições", empresa?.condicoes_orcamento);
  texto("Observações", o.observacoes);

  doc.save(`orcamento-${pad(o.numero_orcamento)}-technorte.pdf`);
}
