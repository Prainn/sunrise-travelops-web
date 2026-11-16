import {
  AlignmentType, BorderStyle, Document, Footer, Header, HorizontalPositionAlign, HorizontalPositionRelativeFrom, ImageRun,
  LineRuleType, Packer, Paragraph, Table, TableCell, TableLayoutType, TableRow, TextRun, TextWrappingType, VerticalAlign,
  VerticalPositionRelativeFrom, WidthType,
} from "docx";
import headerRule from "@/assets/images/quote/lynxtour-header-rule.png?inline";
import type { WebsiteQuotation } from "@/types/website";
import { websitePrintHtml } from "./print";

// 版式以 print.ts 的 PDF 样式为准：页边距、字体、字号、行高、内边距与颜色均按其 CSS 换算。
const CONTENT_WIDTH = 10942;
const SERIF = { ascii: "Times New Roman", hAnsi: "Times New Roman", eastAsia: "Songti SC", cs: "Times New Roman" };
const SANS = { ascii: "Arial", hAnsi: "Arial", eastAsia: "PingFang SC", cs: "Arial" };
const mm = (value: number) => Math.round(value * 56.7);
const emu = (value: number) => Math.round(value * 36000);
/** 毫米换算为 docx 图片尺寸使用的 96dpi 像素。 */
const px = (value: number) => Math.round(value * 96 / 25.4);

interface RunStyle { bold?: boolean; color?: string; size: number; font: typeof SANS; caps?: boolean; characterSpacing?: number }
interface BlockStyle extends RunStyle { align: (typeof AlignmentType)[keyof typeof AlignmentType]; lineHeight: number; before?: number; after?: number; indent?: number }

// 只消费本模块的打印模板；HTML 不嵌入 Word，正文转换为原生段落和表格。
/** 按换行拆成多行；每行单独成段，避免两端对齐把手动换行前的短行拉散。 */
function lines(node: Node, style: RunStyle): TextRun[][] {
  if (node.nodeType === Node.TEXT_NODE) {
    const value = node.textContent ?? "";
    if (!value.trim()) return [[]];
    return value.split("\n").map(line => [new TextRun({ text: line, bold: style.bold, color: style.color, size: style.size, font: style.font, allCaps: style.caps, characterSpacing: style.characterSpacing })]);
  }
  if (!(node instanceof Element)) return [[]];
  if (node.tagName === "BR") return [[], []];
  const bold = style.bold || ["STRONG", "B"].includes(node.tagName);
  return [...node.childNodes].reduce<TextRun[][]>((result, child) => {
    const [first = [], ...rest] = lines(child, { ...style, bold });
    result[result.length - 1]!.push(...first);
    return [...result, ...rest];
  }, [[]]);
}

const runs = (node: Node, style: RunStyle) => lines(node, style).flat();

function paragraph(children: Array<TextRun | ImageRun>, style: BlockStyle, keepNext?: boolean) {
  return new Paragraph({
    children,
    alignment: style.align,
    keepNext,
    indent: style.indent ? { left: style.indent, right: style.indent } : undefined,
    // CSS line-height 是行盒高度；atLeast 保证不小于该值，又不会裁切中文字形。
    spacing: { before: style.before ?? 0, after: style.after ?? 0, line: Math.round(style.size * 10 * style.lineHeight), lineRule: LineRuleType.AT_LEAST },
  });
}

function paragraphs(element: Element, style: BlockStyle, keepNext?: boolean): Paragraph[] {
  const blocks: Array<{ children: TextRun[]; style: BlockStyle }> = [];
  let inline: TextRun[][] = [[]];
  const flush = () => {
    if (inline.some(line => line.length)) blocks.push(...inline.map(children => ({ children, style })));
    inline = [[]];
  };
  for (const node of element.childNodes) {
    if (node instanceof Element && node.tagName === "P") {
      flush();
      // .quote-breakdown：7.5pt、#4b5563、上间距 .8mm。
      const own = node.classList.contains("quote-breakdown") ? { ...style, size: 15, color: "4B5563", before: mm(0.8) } : style;
      blocks.push(...lines(node, own).map(children => ({ children, style: own })));
    } else {
      const [first = [], ...rest] = lines(node, style);
      inline[inline.length - 1]!.push(...first);
      inline.push(...rest);
    }
  }
  flush();
  if (!blocks.length) blocks.push({ children: [], style });
  return blocks.map(block => paragraph(block.children, block.style, keepNext));
}

interface CellStyle extends BlockStyle { valign: typeof VerticalAlign.TOP | typeof VerticalAlign.CENTER; margins: { top: number; bottom: number; left: number; right: number } }

const isNotesRow = (row?: Element | null) => !!row && (row.classList.contains("quote-notes") || row.classList.contains("no-shopping"));

function cellStyle(table: HTMLTableElement, cell: HTMLTableCellElement): CellStyle {
  const has = (name: string) => table.classList.contains(name);
  const heading = cell.tagName === "TH";
  const last = cell === cell.parentElement?.lastElementChild;
  const quote = has("quotation-v5");
  const sansTable = quote || has("hotels-v5");
  const base: CellStyle = heading
    ? { font: SANS, size: 15, bold: true, lineHeight: 1.5, align: AlignmentType.CENTER, valign: VerticalAlign.CENTER, margins: { top: mm(0.5), bottom: mm(0.5), left: mm(1.8), right: mm(1.8) } }
    : { font: sansTable ? SANS : SERIF, size: has("mileage") ? 14 : 15, lineHeight: has("mileage") ? 1.4 : sansTable ? 1.5 : 1.85, align: AlignmentType.LEFT, valign: VerticalAlign.TOP, margins: { top: 0, bottom: 0, left: mm(1.8), right: mm(1.8) } };
  if (heading && sansTable) base.lineHeight = 1.5;
  if (heading && (has("itinerary") || has("standards"))) base.margins = { ...base.margins, left: mm(0.7), right: mm(0.7) };
  if (cell.classList.contains("center")) Object.assign(base, { align: AlignmentType.CENTER, valign: VerticalAlign.CENTER });
  if (has("itinerary") && !heading) {
    if (cell.cellIndex === 0) Object.assign(base, { font: SANS, bold: true });
    if (last) Object.assign(base, { align: AlignmentType.LEFT, lineHeight: 1.6 });
    if (cell.classList.contains("sightseeing")) base.align = AlignmentType.JUSTIFIED;
  }
  const row = cell.closest("tr")!;
  const notesRow = isNotesRow(row);
  if (row.classList.contains("quote-notes") && heading) base.size = 18;
  if (row.classList.contains("no-shopping"))
    Object.assign(base, { font: SANS, bold: true, color: "B80021", caps: true, align: AlignmentType.RIGHT });
  if (notesRow && !heading) base.font = row.classList.contains("no-shopping") ? SANS : SERIF;
  if (notesRow && !heading) base.lineHeight = 1.85;
  if (quote && !notesRow) {
    Object.assign(base, { size: heading ? 16 : 17, valign: VerticalAlign.CENTER, margins: { top: mm(1.5), bottom: mm(1.5), left: mm(2), right: mm(2) } });
    if (!heading) base.align = AlignmentType.CENTER;
    if (cell.classList.contains("quote-category")) base.size = 18;
    if (cell.classList.contains("quote-vehicle")) base.bold = true;
  }
  if (has("hotels-v5") && cell.classList.contains("tier")) Object.assign(base, { size: 16, align: AlignmentType.LEFT });
  if (has("mileage") && !heading) Object.assign(base, { align: AlignmentType.CENTER, valign: VerticalAlign.CENTER });
  return base;
}

function wordTable(source: HTMLTableElement): Table {
  const count = Math.max(...[...source.rows].map(row => [...row.cells].reduce((sum, cell) => sum + cell.colSpan, 0)));
  const cols = [...source.querySelectorAll<HTMLTableColElement>(":scope > colgroup > col")];
  const widths = cols.length
    ? cols.map(col => Math.round(CONTENT_WIDTH * parseFloat(col.style.width) / 100))
    : Array.from({ length: count }, () => Math.floor(CONTENT_WIDTH / count));
  // 说明表无 colgroup，标签列沿用 .label 的 13%。
  if (source.classList.contains("notes")) widths.splice(0, widths.length, Math.round(CONTENT_WIDTH * 0.13), CONTENT_WIDTH - Math.round(CONTENT_WIDTH * 0.13));
  const border = { style: BorderStyle.SINGLE, size: 4, color: "000000" };
  const occupied: number[] = [];
  const rows = [...source.rows].map((row, rowIndex) => {
    let column = 0;
    const children = [...row.cells].map((cell) => {
      while ((occupied[column] ?? 0) > 0) column++;
      const start = column;
      const width = widths.slice(column, column + cell.colSpan).reduce((sum, value) => sum + value, 0);
      for (let index = column; index < column + cell.colSpan; index++) occupied[index] = cell.rowSpan;
      column += cell.colSpan;
      const style = cellStyle(source, cell);
      // WPS 以首列单元格左边距外推表格边框；首列统一 1.8mm，各表左右边缘才能对齐。
      if (start === 0) style.margins = { ...style.margins, left: mm(1.8) };
      return new TableCell({
        columnSpan: cell.colSpan,
        rowSpan: cell.rowSpan,
        width: { size: width, type: WidthType.DXA },
        verticalAlign: style.valign,
        borders: { top: border, bottom: border, left: border, right: border },
        margins: style.margins,
        // 显式白底，避免 WPS/Word 给重复标题行套用默认灰色底纹。
        shading: { fill: "FFFFFF", color: "auto", type: "clear" },
        // 说明行与其上一行保持同页。
        children: paragraphs(cell, style, isNotesRow(source.rows[rowIndex + 1])),
      });
    });
    for (let index = 0; index < occupied.length; index++) occupied[index] = Math.max(0, (occupied[index] ?? 0) - 1);
    return new TableRow({ tableHeader: row.parentElement?.tagName === "THEAD", cantSplit: true, children });
  });
  return new Table({ width: { size: CONTENT_WIDTH, type: WidthType.DXA }, layout: TableLayoutType.FIXED, columnWidths: widths, rows });
}

/** 两张相邻表格之间必须有段落；用极小行高段落承载 PDF 中表格的下边距。 */
function spacer(after: number) {
  return new Paragraph({ children: [], spacing: { before: 0, after, line: 20, lineRule: LineRuleType.EXACT } });
}

async function imageData(src: string) {
  const response = await fetch(src);
  if (!response.ok) throw new Error(`Image: ${response.status}`);
  return new Uint8Array(await response.arrayBuffer());
}

export async function generateWebsiteWordDocument(quotation: WebsiteQuotation, language: "en" | "zh") {
  const output = language === "en" ? quotation.english : quotation.chinese;
  const html = new DOMParser().parseFromString(websitePrintHtml(output, language), "text/html");
  const [logoData, ruleData] = await Promise.all([imageData(html.querySelector<HTMLImageElement>(".brand-header img")!.src), imageData(headerRule)]);
  const tableAfter = (table: Element) => table.classList.contains("quotation-v5") ? mm(2.5) : table.classList.contains("hotels-v5") ? mm(2) : 0;
  const children: (Paragraph | Table)[] = [];
  for (const element of html.querySelector("main")!.children) {
    if (element instanceof HTMLTableElement) {
      children.push(wordTable(element), spacer(tableAfter(element)));
    } else if (element.tagName === "H2") {
      const first = element === element.parentElement?.firstElementChild;
      children.push(paragraph(runs(element, { font: SANS, size: 18, bold: true }), { font: SANS, size: 18, lineHeight: 1.3, align: AlignmentType.LEFT, before: first ? 0 : mm(2.5), after: mm(2.5), indent: mm(1) }, true));
    } else if (element.classList.contains("quote-meta")) {
      children.push(...paragraphs(element, { font: SANS, size: 15, bold: true, lineHeight: 1.5, align: AlignmentType.LEFT, after: mm(1), indent: mm(1) }, true));
    } else {
      const estimate = element.classList.contains("estimate");
      children.push(...paragraphs(element, { font: SERIF, size: estimate ? 14 : 15, lineHeight: 1.85, align: AlignmentType.LEFT, before: estimate ? mm(1) : 0, after: estimate ? mm(1) : mm(2), indent: estimate ? 0 : mm(1) }));
    }
  }
  // 页眉：logo 距页边 8mm、高 22mm；页眉线为右下角 82% 宽的底图；联系方式右对齐 9pt。
  const headerTop = 10;
  const headerHeight = 22;
  const ruleWidth = 193 * 0.82;
  const ruleHeight = ruleWidth * 49 / 1645;
  const floating = (horizontal: object, top: number) => ({
    horizontalPosition: horizontal,
    verticalPosition: { relative: VerticalPositionRelativeFrom.PAGE, offset: emu(top) },
    wrap: { type: TextWrappingType.NONE },
    behindDocument: true,
    allowOverlap: true,
  });
  const contactStyle: BlockStyle = { font: SANS, size: 18, color: "FFCAA6", lineHeight: 1.65, align: AlignmentType.RIGHT };
  const contacts = [...html.querySelectorAll(".brand-contact p")].map((p, index) => paragraph([
    ...(index ? [] : [
      new ImageRun({ type: "png", data: logoData, transformation: { width: px(headerHeight * 600 / 716), height: px(headerHeight) }, floating: floating({ relative: HorizontalPositionRelativeFrom.MARGIN, offset: emu(8) }, headerTop) }),
      new ImageRun({ type: "png", data: ruleData, transformation: { width: px(ruleWidth), height: px(ruleHeight) }, floating: floating({ relative: HorizontalPositionRelativeFrom.MARGIN, align: HorizontalPositionAlign.RIGHT }, headerTop + headerHeight - ruleHeight) }),
    ]),
    ...runs(p, contactStyle),
  ], { ...contactStyle, before: index ? 0 : mm(0.5) }));
  const document = new Document({
    title: output.title,
    styles: { default: { document: { run: { font: SERIF, size: 15 } } } },
    sections: [{
      properties: { grid: { type: "default", linePitch: 240 }, page: {
        size: { width: 11906, height: 16838 },
        margin: { top: mm(35), bottom: mm(24), left: mm(8.5), right: mm(8.5), header: mm(headerTop), footer: mm(10) },
      } },
      headers: { default: new Header({ children: contacts }) },
      // letter-spacing 1.5px ≈ 1.125pt，Word 以 1/20pt 计。
      footers: { default: new Footer({ children: lines(html.querySelector(".brand-footer")!, { font: SANS, size: 18, color: "B80021", characterSpacing: 23 })
        .map(children => paragraph(children, { font: SANS, size: 18, lineHeight: 1.7, align: AlignmentType.CENTER })) }) },
      children,
    }],
  });
  const safeCode = quotation.code.replace(/[\\/:*?"<>|]/g, "-");
  return { blob: await Packer.toBlob(document), fileName: `${safeCode}-${language}.docx` };
}
