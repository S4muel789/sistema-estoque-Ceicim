import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";

export type PdfInventoryItem = { name: string; category: string; quantity: number; minStock: number };

const PAGE_WIDTH = 841.89;
const PAGE_HEIGHT = 595.28;
const MARGIN = 42;
const ROW_HEIGHT = 25;
const columns = [
  { label: "Categoria", x: MARGIN, width: 185, align: "left" },
  { label: "Item", x: MARGIN + 185, width: 300, align: "left" },
  { label: "Saldo", x: MARGIN + 485, width: 75, align: "center" },
  { label: "Mínimo", x: MARGIN + 560, width: 75, align: "center" },
  { label: "Status", x: MARGIN + 635, width: 122, align: "left" },
] as const;

function fit(text: string, font: PDFFont, size: number, maxWidth: number) {
  const normalized = text.replace(/[^\u0020-\u00FF]/g, "?");
  if (font.widthOfTextAtSize(normalized, size) <= maxWidth) return normalized;
  let result = normalized;
  while (result.length > 1 && font.widthOfTextAtSize(`${result}...`, size) > maxWidth) result = result.slice(0, -1);
  return `${result.trim()}...`;
}

function drawTextCell(page: PDFPage, text: string, x: number, y: number, width: number, font: PDFFont, size: number, align: "left" | "center" = "left") {
  const value = fit(text, font, size, width - 12);
  const textWidth = font.widthOfTextAtSize(value, size);
  page.drawText(value, { x: align === "center" ? x + (width - textWidth) / 2 : x + 6, y, size, font, color: rgb(0.12, 0.2, 0.3) });
}

export async function buildInventoryPdf(items: PdfInventoryItem[], generatedAt = new Date()) {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const sorted = [...items].sort((a, b) => `${a.category} ${a.name}`.localeCompare(`${b.category} ${b.name}`, "pt-BR"));
  const totalUnits = sorted.reduce((sum, item) => sum + item.quantity, 0);
  const lowStock = sorted.filter((item) => item.quantity <= item.minStock).length;
  let pageNumber = 0;
  let page!: PDFPage;
  let y = 0;

  function startPage() {
    pageNumber += 1;
    page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    page.drawRectangle({ x: 0, y: PAGE_HEIGHT - 84, width: PAGE_WIDTH, height: 84, color: rgb(0.03, 0.13, 0.23) });
    page.drawRectangle({ x: MARGIN, y: PAGE_HEIGHT - 57, width: 30, height: 30, color: rgb(0.28, 0.82, 0.81), borderColor: rgb(0.28, 0.82, 0.81) });
    page.drawText("C", { x: MARGIN + 9, y: PAGE_HEIGHT - 49, size: 15, font: bold, color: rgb(0.03, 0.13, 0.23) });
    page.drawText("CEICIM", { x: MARGIN + 42, y: PAGE_HEIGHT - 41, size: 17, font: bold, color: rgb(1, 1, 1) });
    page.drawText("Relatório de estoque ativo", { x: MARGIN + 42, y: PAGE_HEIGHT - 58, size: 9, font: regular, color: rgb(0.7, 0.82, 0.88) });
    const emitted = generatedAt.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
    page.drawText(`Emitido em ${emitted}`, { x: PAGE_WIDTH - MARGIN - 120, y: PAGE_HEIGHT - 48, size: 8.5, font: regular, color: rgb(0.8, 0.88, 0.92) });
    y = PAGE_HEIGHT - 112;
    columns.forEach((column) => {
      page.drawRectangle({ x: column.x, y: y - 7, width: column.width, height: 24, color: rgb(0.9, 0.95, 0.96) });
      drawTextCell(page, column.label, column.x, y, column.width, bold, 8.5, column.align);
    });
    y -= 31;
  }

  function footer(current: PDFPage) {
    current.drawLine({ start: { x: MARGIN, y: 29 }, end: { x: PAGE_WIDTH - MARGIN, y: 29 }, color: rgb(0.85, 0.89, 0.92), thickness: 0.6 });
    current.drawText("Sistema de Gestão do CEICIM - Desenvolvido por Samuel Ladeia", { x: MARGIN, y: 16, size: 7.5, font: regular, color: rgb(0.43, 0.5, 0.58) });
    current.drawText(`Página ${pageNumber}`, { x: PAGE_WIDTH - MARGIN - 42, y: 16, size: 7.5, font: regular, color: rgb(0.43, 0.5, 0.58) });
  }

  startPage();
  if (sorted.length === 0) {
    page.drawText("Nenhum item ativo cadastrado.", { x: MARGIN, y: y - 12, size: 11, font: regular, color: rgb(0.35, 0.42, 0.5) });
  } else {
    sorted.forEach((item, index) => {
      if (y < 65) { footer(page); startPage(); }
      if (index % 2 === 1) page.drawRectangle({ x: MARGIN, y: y - 8, width: PAGE_WIDTH - MARGIN * 2, height: ROW_HEIGHT, color: rgb(0.97, 0.98, 0.99) });
      const status = item.quantity <= item.minStock ? "Estoque baixo" : "Disponível";
      drawTextCell(page, item.category, columns[0].x, y, columns[0].width, regular, 8.5);
      drawTextCell(page, item.name, columns[1].x, y, columns[1].width, bold, 8.5);
      drawTextCell(page, String(item.quantity), columns[2].x, y, columns[2].width, bold, 8.5, "center");
      drawTextCell(page, String(item.minStock), columns[3].x, y, columns[3].width, regular, 8.5, "center");
      drawTextCell(page, status, columns[4].x, y, columns[4].width, regular, 8.5);
      page.drawLine({ start: { x: MARGIN, y: y - 8 }, end: { x: PAGE_WIDTH - MARGIN, y: y - 8 }, color: rgb(0.89, 0.92, 0.94), thickness: 0.4 });
      y -= ROW_HEIGHT;
    });
  }
  y = Math.max(y - 12, 52);
  page.drawText(`Resumo: ${sorted.length} itens cadastrados | ${totalUnits} unidades | ${lowStock} com estoque baixo`, { x: MARGIN, y, size: 9, font: bold, color: rgb(0.04, 0.38, 0.44) });
  footer(page);
  pdf.setTitle("Estoque ativo - CEICIM");
  pdf.setAuthor("Sistema de Gestão do CEICIM");
  pdf.setSubject("Relatório de estoque ativo");
  return pdf.save();
}
