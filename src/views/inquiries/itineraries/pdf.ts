import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import type { InquiryRecord } from "@/data/data";
import type { ItineraryPriceUnit, ItineraryRecord } from "@/types/itinerary";

const UNIT_LABELS: Record<ItineraryPriceUnit, string> = {
  roomNight: "间夜",
  person: "人",
  table: "桌",
  vehicleDay: "车/天",
  guideDay: "导游/天",
};

const PAGE_MARGIN_MM = 10;
const PAGE_CONTENT_WIDTH_MM = 190;
const PAGE_CONTENT_HEIGHT_MM = 277;
const BLOCK_GAP_MM = 5;

export interface GeneratedItineraryPdf {
  blob: Blob;
  fileName: string;
}

export async function generateItineraryPdf(itinerary: ItineraryRecord, inquiry: InquiryRecord): Promise<GeneratedItineraryPdf> {
  const documentRoot = document.createElement("section");
  documentRoot.style.cssText = "position:fixed;left:-10000px;top:0;width:760px;padding:32px;background:#fff;color:#1f2937;font-family:Arial,'Microsoft YaHei',sans-serif;box-sizing:content-box;";
  documentRoot.innerHTML = buildPdfHtml(itinerary, inquiry);
  document.body.appendChild(documentRoot);

  try {
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    let cursorY = PAGE_MARGIN_MM;
    const blocks = Array.from(documentRoot.querySelectorAll<HTMLElement>("[data-pdf-block]"));

    for (const block of blocks) {
      const canvas = await html2canvas(block, { scale: 2, backgroundColor: "#ffffff", useCORS: true });
      cursorY = addBlockToPdf(pdf, canvas, cursorY);
    }

    return {
      blob: pdf.output("blob"),
      fileName: `${sanitizeFileName(itinerary.code)}-${sanitizeFileName(itinerary.title)}.pdf`,
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

function addBlockToPdf(pdf: jsPDF, canvas: HTMLCanvasElement, cursorY: number) {
  const blockHeight = canvas.height * PAGE_CONTENT_WIDTH_MM / canvas.width;
  if (blockHeight <= PAGE_CONTENT_HEIGHT_MM) {
    const pageBottom = PAGE_MARGIN_MM + PAGE_CONTENT_HEIGHT_MM;
    const nextY = cursorY > PAGE_MARGIN_MM ? cursorY + BLOCK_GAP_MM : cursorY;
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

function addPdfPage(pdf: jsPDF) {
  pdf.addPage();
  return PAGE_MARGIN_MM;
}

function buildPdfHtml(itinerary: ItineraryRecord, inquiry: InquiryRecord) {
  const totalPrice = itinerary.dailyPlans.flatMap((day) => day.items)
    .reduce((total, item) => total + item.totalPrice, 0);
  const daySections = itinerary.dailyPlans.map((day) => `
    <article data-pdf-block style="padding:16px;border:1px solid #dcdfe6;border-radius:8px;box-sizing:border-box;">
      <h2 style="margin:0 0 8px;font-size:18px;">D${day.dayNumber} · ${escapeHtml(day.departure)} → ${escapeHtml(day.destination)}</h2>
      <div style="color:#606266;font-size:13px;">${escapeHtml(day.date)} · ${escapeHtml(day.transport)}</div>
      <h3 style="margin:12px 0 6px;font-size:15px;">${escapeHtml(day.title)}</h3>
      <p style="margin:0 0 12px;line-height:1.7;white-space:pre-wrap;">${escapeHtml(day.description)}</p>
      <div style="margin-bottom:12px;color:#606266;font-size:13px;">用餐：${escapeHtml(day.mealSummary)} · 住宿：${escapeHtml(day.accommodationSummary)}</div>
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <thead><tr><th style="${cellStyle()}">项目</th><th style="${cellStyle()}">数量</th><th style="${cellStyle()}">价格</th><th style="${cellStyle()}">小计</th></tr></thead>
        <tbody>${day.items.map((item) => `<tr>
          <td style="${cellStyle()}">${escapeHtml(item.resourceName)}<br><small>${escapeHtml(item.priceName)}</small></td>
          <td style="${cellStyle()}">${item.quantity} ${UNIT_LABELS[item.unit]}</td>
          <td style="${cellStyle()}">¥${formatMoney(item.unitPrice ?? 0)}</td>
          <td style="${cellStyle()}">¥${formatMoney(item.totalPrice)}</td>
        </tr>`).join("")}</tbody>
      </table>
    </article>`).join("");

  return `
    <header data-pdf-block style="padding-bottom:18px;border-bottom:2px solid #2563eb;box-sizing:border-box;">
      <h1 style="margin:0 0 8px;font-size:26px;">${escapeHtml(itinerary.title)}</h1>
      <div style="color:#606266;">行程编号：${escapeHtml(itinerary.code)} · 旅行社：${escapeHtml(inquiry.agencyName)}</div>
      <div style="margin-top:6px;color:#606266;">日期：${escapeHtml(itinerary.startDate)} — ${escapeHtml(itinerary.endDate)} · 共 ${itinerary.days} 天</div>
    </header>
    ${daySections}
    <footer data-pdf-block style="padding:18px;background:#ecf5ff;text-align:right;font-size:20px;font-weight:700;color:#2563eb;box-sizing:border-box;">
      行程总价：¥${formatMoney(totalPrice)}
    </footer>`;
}

function cellStyle() {
  return "padding:8px;border:1px solid #dcdfe6;text-align:left;vertical-align:top;";
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", "\"": "&quot;" })[character] ?? character);
}

function sanitizeFileName(value: string) {
  return value.replace(/[\\/:*?"<>|]/g, "-");
}

function formatMoney(value: number) {
  return value.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
