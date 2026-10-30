import {
  AlignmentType, BorderStyle, Document, Footer, Header, ImageRun, Packer,
  Paragraph, Table, TableCell, TableLayoutType, TableRow, TextRun, VerticalAlign, WidthType,
} from "docx";
import type { WebsiteQuotation } from "@/types/website";
import { websitePrintHtml } from "./print";

const CONTENT_WIDTH = 10942;
const FONT = { ascii: "Arial", hAnsi: "Arial", eastAsia: "Songti SC", cs: "Arial" };

// 只消费本模块的打印模板；HTML 不嵌入 Word，正文转换为原生段落和表格。
function runs(node: Node, bold = false, color?: string): TextRun[] {
  if (node.nodeType === Node.TEXT_NODE) {
    const value = node.textContent ?? "";
    if (!value.trim()) return [];
    return value.split("\n").map((line, index) => new TextRun({ text: line, break: index ? 1 : undefined, bold, color }));
  }
  if (!(node instanceof Element)) return [];
  if (node.tagName === "BR") return [new TextRun({ break: 1 })];
  return [...node.childNodes].flatMap(child => runs(child, bold || ["STRONG", "B"].includes(node.tagName), color));
}

function paragraphs(element: Element, options: { bold?: boolean; center?: boolean; keepNext?: boolean } = {}): Paragraph[] {
  const blocks: TextRun[][] = [];
  let inline: TextRun[] = [];
  for (const node of element.childNodes) {
    if (node instanceof Element && node.tagName === "P") {
      if (inline.length) blocks.push(inline);
      inline = [];
      blocks.push(runs(node, options.bold, node.classList.contains("quote-breakdown") ? "4B5563" : undefined));
    } else inline.push(...runs(node, options.bold));
  }
  if (inline.length || !blocks.length) blocks.push(inline);
  return blocks.map(children => new Paragraph({
    children,
    alignment: options.center ? AlignmentType.CENTER : AlignmentType.LEFT,
    keepNext: options.keepNext,
    spacing: { after: 30, line: 240 },
  }));
}

function wordTable(source: HTMLTableElement): Table {
  const count = Math.max(...[...source.rows].map(row => [...row.cells].reduce((sum, cell) => sum + cell.colSpan, 0)));
  const cols = [...source.querySelectorAll<HTMLTableColElement>(":scope > colgroup > col")];
  const widths = cols.length
    ? cols.map(col => Math.round(CONTENT_WIDTH * parseFloat(col.style.width) / 100))
    : Array.from({ length: count }, () => Math.floor(CONTENT_WIDTH / count));
  // Word 字体度量不同于浏览器，给短标签留足宽度，避免 Vehicle/Transport 从单词中间换行。
  const wordColumns = source.classList.contains("itinerary") ? [10, 12, 12, 40, 13, 13]
    : source.classList.contains("standards") ? [12, 9, 33.5, 12, 33.5] : undefined;
  if (wordColumns) widths.splice(0, widths.length, ...wordColumns.map(width => Math.round(CONTENT_WIDTH * width / 100)));
  if (source.classList.contains("notes")) widths.splice(0, widths.length, 1422, CONTENT_WIDTH - 1422);
  const quote = source.classList.contains("quotation-v5");
  const border = { style: BorderStyle.SINGLE, size: 4, color: quote ? "9CA3AF" : "000000" };
  const occupied: number[] = [];
  const rows = [...source.rows].map((row, rowIndex) => {
    let column = 0;
    const children = [...row.cells].map((cell) => {
      while ((occupied[column] ?? 0) > 0) column++;
      const width = widths.slice(column, column + cell.colSpan).reduce((sum, value) => sum + value, 0);
      for (let index = column; index < column + cell.colSpan; index++) occupied[index] = cell.rowSpan;
      column += cell.colSpan;
      const heading = cell.tagName === "TH";
      const vehicle = cell.classList.contains("quote-vehicle");
      return new TableCell({
        columnSpan: cell.colSpan,
        rowSpan: cell.rowSpan,
        width: { size: width, type: WidthType.DXA },
        verticalAlign: VerticalAlign.CENTER,
        borders: { top: border, bottom: border, left: border, right: border },
        margins: { top: quote ? 85 : 45, bottom: quote ? 85 : 45, left: 90, right: 90 },
        shading: quote && (heading || vehicle) ? { fill: heading ? "F3F4F6" : "F9FAFB" } : undefined,
        children: paragraphs(cell, { bold: heading || vehicle, center: heading || (quote && !vehicle) || cell.classList.contains("center"), keepNext: source.classList.contains("notes") && rowIndex < source.rows.length - 1 }),
      });
    });
    for (let index = 0; index < occupied.length; index++) occupied[index] = Math.max(0, (occupied[index] ?? 0) - 1);
    return new TableRow({ tableHeader: row.parentElement?.tagName === "THEAD", cantSplit: true, children });
  });
  return new Table({ width: { size: CONTENT_WIDTH, type: WidthType.DXA }, layout: TableLayoutType.FIXED, columnWidths: widths, rows });
}

export async function generateWebsiteWordDocument(quotation: WebsiteQuotation, language: "en" | "zh") {
  const output = language === "en" ? quotation.english : quotation.chinese;
  const html = new DOMParser().parseFromString(websitePrintHtml(output, language, quotation.schemaVersion), "text/html");
  const logo = html.querySelector<HTMLImageElement>(".brand-header img")!;
  const response = await fetch(logo.src);
  if (!response.ok) throw new Error(`Logo: ${response.status}`);
  const logoData = new Uint8Array(await response.arrayBuffer());
  const none = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
  const borderless = { top: none, bottom: none, left: none, right: none };
  const children: (Paragraph | Table)[] = [];
  for (const element of html.querySelector("main")!.children) {
    if (element instanceof HTMLTableElement) {
      children.push(wordTable(element), new Paragraph({ spacing: { after: 100, line: 20 }, children: [] }));
    } else if (element.tagName === "DIV") {
      for (const table of element.querySelectorAll("table")) children.push(wordTable(table));
    } else if (element.tagName === "H2") {
      children.push(new Paragraph({
        keepNext: true, spacing: { before: 140, after: 90 },
        children: [new TextRun({ text: element.textContent ?? "", bold: true, size: 21 })],
      }));
    } else children.push(...paragraphs(element, { bold: element.classList.contains("quote-meta"), keepNext: element.classList.contains("quote-meta") }));
  }
  const document = new Document({
    title: output.title,
    styles: { default: { document: { run: { font: FONT, size: 17 } } } },
    sections: [{
      properties: { grid: { type: "default", linePitch: 240 }, page: {
        size: { width: 11906, height: 16838 },
        margin: { top: 1984, bottom: 1361, left: 482, right: 482, header: 567, footer: 567 },
      } },
      headers: { default: new Header({ children: [new Table({
        width: { size: CONTENT_WIDTH, type: WidthType.DXA },
        columnWidths: [1500, CONTENT_WIDTH - 1500],
        borders: { ...borderless, insideHorizontal: none, insideVertical: none },
        rows: [new TableRow({ children: [
          new TableCell({ borders: borderless, width: { size: 1500, type: WidthType.DXA }, children: [new Paragraph({ children: [new ImageRun({ type: "png", data: logoData, transformation: { width: 59, height: 78 } })] })] }),
          new TableCell({ borders: borderless, width: { size: CONTENT_WIDTH - 1500, type: WidthType.DXA }, children: [...html.querySelectorAll(".brand-contact p")].map(p => new Paragraph({
            alignment: AlignmentType.RIGHT, spacing: { after: 40 },
            children: [new TextRun({ text: p.textContent ?? "", color: "E98E55", size: 17 })],
          })) }),
        ] })],
      })] }) },
      footers: { default: new Footer({ children: [new Paragraph({
        alignment: AlignmentType.CENTER,
        children: runs(html.querySelector(".brand-footer")!, false, "B80021"),
      })] }) },
      children,
    }],
  });
  const safeCode = quotation.code.replace(/[\\/:*?"<>|]/g, "-");
  return { blob: await Packer.toBlob(document), fileName: `${safeCode}-${language}.docx` };
}
