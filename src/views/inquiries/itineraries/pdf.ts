import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import type { InquiryRecord } from "@/types/inquiry";
import type { ItineraryDayRecord, ItineraryRecord } from "@/types/itinerary";
import { formatDateTime, formatMoney, sumMoney } from "@/utils";
import { getTransportMethodNames } from "@/utils/transport-method";
import { calculateItineraryQuote } from "./quote-pricing";

const PAGE_MARGIN_MM = 10;
const PAGE_CONTENT_WIDTH_MM = 190;
const PAGE_CONTENT_HEIGHT_MM = 277;
const BLOCK_GAP_MM = 5;

export interface GeneratedItineraryPdf {
  blob: Blob;
  fileName: string;
  generatedAt: string;
}

export async function generateItineraryPdf(itinerary: ItineraryRecord, inquiry: InquiryRecord): Promise<GeneratedItineraryPdf> {
  const generatedAt = formatDateTime(new Date());
  const documentRoot = document.createElement("section");
  documentRoot.style.cssText = "position:fixed;left:-10000px;top:0;width:760px;padding:32px;background:#fff;color:#1f2937;font-family:Arial,'Microsoft YaHei',sans-serif;box-sizing:content-box;";
  documentRoot.innerHTML = buildPdfHtml(itinerary, inquiry, generatedAt);
  document.body.appendChild(documentRoot);

  try {
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    let cursorY = PAGE_MARGIN_MM;
    const blocks = Array.from(documentRoot.querySelectorAll<HTMLElement>("[data-pdf-block]"));
    let scheduleHeaderCanvas: HTMLCanvasElement | undefined;

    for (const block of blocks) {
      const canvas = await html2canvas(block, { scale: 2, backgroundColor: "#ffffff", useCORS: true });
      const blockKind = block.dataset.pdfKind;
      const blockGap = Number(block.dataset.pdfGapMm ?? BLOCK_GAP_MM);
      if (blockKind === "schedule-header") {
        scheduleHeaderCanvas = canvas;
        cursorY = addBlockToPdf(pdf, canvas, cursorY, blockGap);
      } else if (blockKind === "schedule-row" && scheduleHeaderCanvas) {
        cursorY = addScheduleRowToPdf(pdf, canvas, scheduleHeaderCanvas, cursorY);
      } else {
        cursorY = addBlockToPdf(pdf, canvas, cursorY, blockGap);
      }
    }

    return {
      blob: pdf.output("blob"),
      fileName: `${sanitizeFileName(itinerary.code)}-${sanitizeFileName(itinerary.title)}.pdf`,
      generatedAt,
    };
  } finally {
    documentRoot.remove();
  }
}

export function downloadGeneratedItineraryPdf(file: GeneratedItineraryPdf) {
  const url = URL.createObjectURL(file.blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = file.fileName;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function addBlockToPdf(pdf: jsPDF, canvas: HTMLCanvasElement, cursorY: number, gapMm = BLOCK_GAP_MM) {
  const blockHeight = canvas.height * PAGE_CONTENT_WIDTH_MM / canvas.width;
  if (blockHeight <= PAGE_CONTENT_HEIGHT_MM) {
    const pageBottom = PAGE_MARGIN_MM + PAGE_CONTENT_HEIGHT_MM;
    const nextY = cursorY > PAGE_MARGIN_MM ? cursorY + gapMm : cursorY;
    const targetY = nextY + blockHeight > pageBottom ? addPdfPage(pdf) : nextY;
    pdf.addImage(canvas.toDataURL("image/png"), "PNG", PAGE_MARGIN_MM, targetY, PAGE_CONTENT_WIDTH_MM, blockHeight);
    return targetY + blockHeight;
  }

  let sourceY = 0;
  let targetY = cursorY > PAGE_MARGIN_MM ? addPdfPage(pdf) : cursorY;
  while (sourceY < canvas.height) {
    const availableHeight = PAGE_MARGIN_MM + PAGE_CONTENT_HEIGHT_MM - targetY;
    const sliceHeight = Math.min(
      Math.floor(availableHeight * canvas.width / PAGE_CONTENT_WIDTH_MM),
      canvas.height - sourceY
    );
    const slice = document.createElement("canvas");
    slice.width = canvas.width;
    slice.height = sliceHeight;
    slice.getContext("2d")?.drawImage(canvas, 0, sourceY, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight);
    const renderedHeight = sliceHeight * PAGE_CONTENT_WIDTH_MM / canvas.width;
    pdf.addImage(slice.toDataURL("image/png"), "PNG", PAGE_MARGIN_MM, targetY, PAGE_CONTENT_WIDTH_MM, renderedHeight);
    sourceY += sliceHeight;
    targetY = sourceY < canvas.height ? addPdfPage(pdf) : targetY + renderedHeight;
  }
  return targetY;
}

function addScheduleRowToPdf(
  pdf: jsPDF,
  rowCanvas: HTMLCanvasElement,
  headerCanvas: HTMLCanvasElement,
  cursorY: number
) {
  const rowHeight = rowCanvas.height * PAGE_CONTENT_WIDTH_MM / rowCanvas.width;
  const pageBottom = PAGE_MARGIN_MM + PAGE_CONTENT_HEIGHT_MM;
  let targetY = cursorY;

  if (targetY + rowHeight > pageBottom) {
    targetY = addPdfPage(pdf);
    const headerHeight = headerCanvas.height * PAGE_CONTENT_WIDTH_MM / headerCanvas.width;
    pdf.addImage(headerCanvas.toDataURL("image/png"), "PNG", PAGE_MARGIN_MM, targetY, PAGE_CONTENT_WIDTH_MM, headerHeight);
    targetY += headerHeight;
  }

  pdf.addImage(rowCanvas.toDataURL("image/png"), "PNG", PAGE_MARGIN_MM, targetY, PAGE_CONTENT_WIDTH_MM, rowHeight);
  return targetY + rowHeight;
}

function addPdfPage(pdf: jsPDF) {
  pdf.addPage();
  return PAGE_MARGIN_MM;
}

function buildPdfHtml(itinerary: ItineraryRecord, inquiry: InquiryRecord, generatedAt: string) {
  const totalCost = sumMoney(itinerary.dailyPlans.flatMap((day) => day.items).map((item) => item.totalCost));
  const quote = calculateItineraryQuote(itinerary, totalCost);
  const scheduleSections = buildScheduleSections(itinerary.dailyPlans);

  return `
    <header data-pdf-block style="padding-bottom:18px;border-bottom:2px solid #2563eb;box-sizing:border-box;">
      <h1 style="margin:0 0 8px;font-size:26px;">${escapeHtml(itinerary.title)}</h1>
      <div style="color:#606266;">行程编号：${escapeHtml(itinerary.code)} · 旅行社：${escapeHtml(inquiry.agencyName)}</div>
      <div style="margin-top:6px;color:#606266;">日期：${escapeHtml(itinerary.startDate)} — ${escapeHtml(itinerary.endDate)} · 共 ${itinerary.days} 天</div>
      <div style="margin-top:6px;color:#606266;">人数：成人 ${itinerary.adults} 人 · 儿童 ${itinerary.childrenCount} 人</div>
      <div style="margin-top:6px;color:#606266;">报价生成时间：${escapeHtml(generatedAt)}</div>
    </header>
    ${scheduleSections}
    <footer data-pdf-block style="padding:18px;background:#ecf5ff;text-align:right;font-size:20px;font-weight:700;color:#2563eb;box-sizing:border-box;">
      行程总价：¥${formatMoney(quote.totalPrice)}
    </footer>`;
}

function buildScheduleSections(days: ItineraryDayRecord[]) {
  const rows = days.map((day, index) => {
    const previousDay = days[index - 1];
    return `
      <table data-pdf-block data-pdf-kind="schedule-row" data-pdf-gap-mm="0" style="${scheduleTableStyle()}">
        ${scheduleColgroup()}
        <tbody><tr>
          <td style="${scheduleCellStyle("center")}">${escapeHtml(formatScheduleDate(day.date))}</td>
          <td style="${scheduleCellStyle("center")}">${escapeHtml(formatScheduleRoute(day))}</td>
          <td style="${scheduleCellStyle("center")}">${escapeHtml(getTransportMethodNames(day.transport) || "-")}</td>
          <td style="${scheduleCellStyle("left")};white-space:pre-wrap;line-height:1.6;">${escapeHtml(day.description?.trim() || "-")}</td>
          <td style="${scheduleCellStyle("center")}">${escapeHtml(getDailyHotelNames(day) || "-")}</td>
          <td style="${scheduleCellStyle("center")}">${escapeHtml(getDailyMealCodes(day, previousDay) || "-")}</td>
        </tr></tbody>
      </table>`;
  }).join("");

  return `
    <section data-pdf-block style="box-sizing:border-box;">
      <h2 style="margin:0;font-size:18px;">行程安排</h2>
    </section>
    <table data-pdf-block data-pdf-kind="schedule-header" data-pdf-gap-mm="0" style="${scheduleTableStyle()}">
      ${scheduleColgroup()}
      <thead><tr style="background:#f3f4f6;">
        <th style="${scheduleHeaderStyle()}">D</th>
        <th style="${scheduleHeaderStyle()}">DEPART.</th>
        <th style="${scheduleHeaderStyle()}">T</th>
        <th style="${scheduleHeaderStyle()}">SIGHT-SEEING REGION</th>
        <th style="${scheduleHeaderStyle()}">HOTEL</th>
        <th style="${scheduleHeaderStyle()}">M</th>
      </tr></thead>
    </table>
    ${rows}`;
}

function scheduleTableStyle() {
  return "width:100%;border-collapse:collapse;table-layout:fixed;font-size:12px;";
}

function scheduleColgroup() {
  return `<colgroup>
    <col style="width:8%;"><col style="width:17%;"><col style="width:12%;">
    <col style="width:39%;"><col style="width:16%;"><col style="width:8%;">
  </colgroup>`;
}

function formatScheduleDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return match ? `${match[3]}/${match[2]}` : value;
}

function formatScheduleRoute(day: ItineraryDayRecord) {
  if (!day.departure) return day.destination || "-";
  if (!day.destination || day.departure === day.destination) return day.departure;
  return `${day.departure} / ${day.destination}`;
}

function getDailyHotelNames(day: ItineraryDayRecord) {
  return [...new Set(day.items.filter((item) => item.type === "hotel").map((item) => item.resourceName))].join(" / ");
}

function getDailyMealCodes(day: ItineraryDayRecord, previousDay?: ItineraryDayRecord) {
  const restaurantText = day.items
    .filter((item) => item.type === "restaurant")
    .map((item) => `${item.id} ${item.priceName} ${item.remark}`)
    .join(" ");
  const dailyText = `${day.description ?? ""} ${restaurantText}`;
  const previousHotelText = previousDay?.items
    .filter((item) => item.type === "hotel")
    .map((item) => `${item.priceName} ${item.remark}`)
    .join(" ") ?? "";
  const codes: string[] = [];
  if (/早餐|早饭|breakfast/i.test(`${dailyText} ${previousHotelText}`)) codes.push("B");
  if (/午餐|中餐|lunch/i.test(dailyText)) codes.push("L");
  if (/晚餐|晚饭|傍晚[^。]{0,24}(?:用餐|餐厅)|dinner|supper/i.test(dailyText)) codes.push("D");
  return codes.join(", ");
}

function scheduleHeaderStyle() {
  return "padding:8px 6px;border:1px solid #4b5563;text-align:center;vertical-align:middle;font-weight:700;";
}

function scheduleCellStyle(textAlign: "left" | "center") {
  return `padding:9px 6px;border-right:1px solid #4b5563;border-bottom:1px solid #4b5563;border-left:1px solid #4b5563;text-align:${textAlign};vertical-align:middle;word-break:break-word;`;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", "\"": "&quot;" })[character] ?? character);
}

function sanitizeFileName(value: string) {
  return value.replace(/[\\/:*?"<>|]/g, "-");
}
