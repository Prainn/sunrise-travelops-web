import { itineraryDuration } from "./duration";
import { getDayBreakfastStatus } from "./hotel-plans";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import type { InquiryRecord } from "@/types/inquiry";
import type {
  ItineraryDayRecord,
  ItineraryQuoteCalculation,
  ItineraryQuoteOption,
  ItineraryQuoteOptionCalculation,
  ItineraryRecord,
} from "@/types/itinerary";
import { formatDateTime, formatMoney, sumMoney } from "@/utils";
import { getTransportMethodNames } from "@/utils/transport-method";
import { calculateDestinationNights, getEnabledHotelPlans, HOTEL_PLAN_TIER_LABELS } from "./hotel-plans";
import { calculateItineraryQuote } from "./quote-pricing";
import {
  getEnabledVehiclePlans,
  VEHICLE_PLAN_TIER_LABELS,
} from "./vehicle-plans";

const PAGE_MARGIN_MM = 10;
const PAGE_CONTENT_WIDTH_MM = 190;
const PAGE_CONTENT_HEIGHT_MM = 277;
const BLOCK_GAP_MM = 5;
const MAX_QUOTE_OPTIONS_PER_TABLE = 4;

interface QuoteDisplayOption {
  option: ItineraryQuoteOption;
  calculation: ItineraryQuoteOptionCalculation;
}

export interface GeneratedItineraryPdf {
  blob: Blob;
  fileName: string;
  generatedAt: string;
}

export async function generateItineraryPdf(itinerary: ItineraryRecord, inquiry: InquiryRecord, snapshot?: { generatedAt: string; calculation: ItineraryQuoteCalculation; quoteCode: string; quoteVersion: number }): Promise<GeneratedItineraryPdf> {
  const generatedAt = snapshot ? formatDateTime(new Date(snapshot.generatedAt)) : formatDateTime(new Date());
  const documentRoot = document.createElement("section");
  documentRoot.style.cssText = "position:fixed;left:-10000px;top:0;width:760px;padding:32px;background:#fff;color:#1f2937;font-family:Arial,'Microsoft YaHei',sans-serif;box-sizing:content-box;";
  documentRoot.innerHTML = buildPdfHtml(itinerary, inquiry, generatedAt, snapshot);
  document.body.appendChild(documentRoot);

  try {
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    let cursorY = PAGE_MARGIN_MM;
    const blocks = Array.from(documentRoot.querySelectorAll<HTMLElement>("[data-pdf-block]"));
    let scheduleHeaderCanvas: HTMLCanvasElement | undefined;
    let pendingHeading: { canvas: HTMLCanvasElement; gap: number } | undefined;

    for (const block of blocks) {
      const canvas = await html2canvas(block, { scale: 2, backgroundColor: "#ffffff", useCORS: true });
      const blockKind = block.dataset.pdfKind;
      const blockGap = Number(block.dataset.pdfGapMm ?? BLOCK_GAP_MM);
      if (block.hasAttribute("data-pdf-keep-with-next")) {
        pendingHeading = { canvas, gap: blockGap };
        continue;
      }
      if (pendingHeading) {
        const headingHeight = pendingHeading.canvas.height * PAGE_CONTENT_WIDTH_MM / pendingHeading.canvas.width;
        const contentHeight = canvas.height * PAGE_CONTENT_WIDTH_MM / canvas.width;
        const needed = pendingHeading.gap + headingHeight + blockGap + contentHeight;
        if (cursorY > PAGE_MARGIN_MM && cursorY + needed > PAGE_MARGIN_MM + PAGE_CONTENT_HEIGHT_MM) cursorY = addPdfPage(pdf);
        cursorY = addBlockToPdf(pdf, pendingHeading.canvas, cursorY, pendingHeading.gap);
        pendingHeading = undefined;
      }
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

export function buildPdfHtml(itinerary: ItineraryRecord, inquiry: InquiryRecord, generatedAt: string, snapshot?: { calculation: ItineraryQuoteCalculation; quoteCode: string; quoteVersion: number }) {
  const totalCost = sumMoney(itinerary.dailyPlans
    .flatMap((day) => day.items)
    .filter((item) => item.type === "restaurant" || item.type === "attraction")
    .map((item) => item.totalCost));
  const quote = snapshot?.calculation ?? calculateItineraryQuote(itinerary, totalCost);
  const scheduleSections = buildScheduleSections(itinerary.dailyPlans, itinerary);

  return `
    <header data-pdf-block style="padding-bottom:18px;border-bottom:2px solid #2563eb;box-sizing:border-box;">
      <h1 style="margin:0 0 8px;font-size:26px;">${escapeHtml(itinerary.title)}</h1>
      <div style="color:#606266;">行程编号：${escapeHtml(itinerary.code)} · 旅行社：${escapeHtml(inquiry.agencyName)}</div>
      <div style="margin-top:6px;color:#606266;">日期：${escapeHtml(itinerary.startDate)} — ${escapeHtml(itinerary.endDate)} · ${itineraryDuration(itinerary.dailyPlans).days}天${itineraryDuration(itinerary.dailyPlans).nights}晚</div>
      <div style="margin-top:6px;color:#606266;">人数：成人 ${itinerary.adults} 人 · 儿童 ${itinerary.childrenCount} 人 · 领队 ${itinerary.leaderCount} 人（${itinerary.adults + itinerary.childrenCount}+${itinerary.leaderCount}）</div>
      <div style="margin-top:6px;color:#606266;">${snapshot ? `报价编号：${escapeHtml(snapshot.quoteCode)} · V${snapshot.quoteVersion}<br>` : ""}报价生成时间：${escapeHtml(generatedAt)}</div>
    </header>
    ${scheduleSections}
    ${buildHotelPairingSection(itinerary)}
    ${buildQuoteSections(itinerary, quote)}
    ${buildCustomerTerms(itinerary)}`;
}

function buildHotelPairingSection(itinerary: ItineraryRecord) {
  const hotelPlans = getEnabledHotelPlans(itinerary);
  const vehiclePlans = getEnabledVehiclePlans(itinerary);
  const hotelDestinations = Object.keys(calculateDestinationNights(itinerary));
  return `
    <section data-pdf-block data-pdf-keep-with-next style="box-sizing:border-box;">
      <h2 style="margin:0;font-size:18px;">酒店与车型搭配</h2>
    </section>
    <table data-pdf-block data-pdf-gap-mm="3" style="width:100%;border-collapse:collapse;table-layout:fixed;font-size:11px;box-sizing:border-box;">
      <thead>
        <tr style="background:#f3f4f6;">
          <th style="${quoteHeaderStyle()};width:18%;">资源类别</th>
          ${hotelDestinations.map((destination) => `<th style="${quoteHeaderStyle()}">${escapeHtml(destination)}</th>`).join("")}
        </tr>
      </thead>
      <tbody>
        ${hotelPlans.map((plan) => `<tr>
          <th style="${quoteLabelStyle()}">${escapeHtml(HOTEL_PLAN_TIER_LABELS[plan.tier])}</th>
          ${hotelDestinations.map((destination) => {
            const hotel = plan.hotels.find((selection) => selection.destination === destination);
            return `<td style="${quoteCellStyle()}">${escapeHtml(hotel ? `${hotel.hotelName}（含早餐）` : "-")}</td>`;
          }).join("")}
        </tr>`).join("")}
        ${vehiclePlans.map((plan) => `<tr>
          <th style="${quoteLabelStyle()}">${escapeHtml(VEHICLE_PLAN_TIER_LABELS[plan.tier])}</th>
          <td colspan="${hotelDestinations.length}" style="${quoteCellStyle()}">${escapeHtml(
            plan.arrangements.map(a => `${a.dayIds.map(id => 'D' + itinerary.dailyPlans.find(d => d.id === id)?.dayNumber).join('、')}：${a.vehicles.map(v => `${v.vehicleName}（${v.seats}座）×${v.quantity}辆`).join('、')}`).join('；')
          )}</td>
        </tr>`).join("")}
      </tbody>
    </table>`;
}

function buildQuoteSections(itinerary: ItineraryRecord, quote: ItineraryQuoteCalculation) {
  const guestCount = itinerary.adults + itinerary.childrenCount;
  const options = itinerary.quote.options.flatMap((option) => {
    const calculation = quote.options.find((record) => record.optionId === option.id);
    return calculation ? [{ option, calculation }] : [];
  });
  const optionGroups = chunkQuoteOptions(options);

  return `
    <section data-pdf-block data-pdf-keep-with-next style="box-sizing:border-box;">
      <h2 style="margin:0 0 6px;font-size:18px;">团队报价</h2>
      <div style="color:#606266;font-size:12px;">报价按 ${guestCount} 名付费游客计算，FOC 仅适用于领队。</div>
    </section>
    ${optionGroups.map((group) => buildQuoteTable(group, itinerary, guestCount)).join("")}`;
}

function buildQuoteTable(
  options: QuoteDisplayOption[],
  itinerary: ItineraryRecord,
  guestCount: number
) {
  const childRow = itinerary.childrenCount
    ? buildQuoteRow("儿童团费", options, ({ calculation }) => `RMB ${formatMoney(calculation.childUnitPrice)} PP`)
    : "";

  return `
    <table data-pdf-block data-pdf-gap-mm="3" style="width:100%;border-collapse:collapse;table-layout:fixed;font-size:11px;box-sizing:border-box;">
      <thead>
        <tr style="background:#f3f4f6;">
          <th style="${quoteHeaderStyle()};width:18%;">报价项目</th>
          ${options.map(({ option }) => `
            <th style="${quoteHeaderStyle()}">
              <div>${escapeHtml(HOTEL_PLAN_TIER_LABELS[option.hotelTier])}</div>
              <div style="margin-top:3px;">${guestCount}PAX｜${escapeHtml(getVehicleQuoteLabel(option.vehicleTier))}</div>
            </th>`).join("")}
        </tr>
      </thead>
      <tbody>
        ${buildQuoteRow("成人团费", options, ({ option, calculation }) => `
          <strong>RMB ${formatMoney(calculation.adultUnitPrice)} PP</strong>
          <div style="margin-top:4px;color:${(option.leaderFocEnabled && itinerary.leaderCount > 0) ? "#15803d" : "#606266"};font-size:10px;">
            ${(option.leaderFocEnabled && itinerary.leaderCount > 0) ? `${guestCount}+${itinerary.leaderCount} FOC (TOUR LEADER ONLY)` : "NO FOC"}
          </div>`)}
        ${childRow}
        ${buildExtraFeeRows(itinerary, options.length)}
        ${buildQuoteRow("单房差", options, ({ calculation }) => `RMB ${formatMoney(calculation.singleSupplementUnitCost)}`)}
        ${buildQuoteRow("团费总计", options, ({ calculation }) => `<strong>RMB ${formatMoney(calculation.totalPrice)}</strong>`)}
        ${buildQuoteRow("其中：司陪费和其它支出（已含）", options, () => `RMB ${formatMoney(itinerary.quote.otherExpenses)}`)}
      </tbody>
    </table>`;
}

function buildQuoteRow(
  label: string,
  options: QuoteDisplayOption[],
  renderValue: (option: QuoteDisplayOption) => string
) {
  return `<tr>
    <th style="${quoteLabelStyle()}">${label}</th>
    ${options.map((option) => `<td style="${quoteCellStyle()}">${renderValue(option)}</td>`).join("")}
  </tr>`;
}

function chunkQuoteOptions(options: QuoteDisplayOption[]) {
  return Array.from(
    { length: Math.ceil(options.length / MAX_QUOTE_OPTIONS_PER_TABLE) },
    (_, index) => options.slice(index * MAX_QUOTE_OPTIONS_PER_TABLE, (index + 1) * MAX_QUOTE_OPTIONS_PER_TABLE)
  );
}

function getVehicleQuoteLabel(tier: ItineraryQuoteOption["vehicleTier"]) {
  return VEHICLE_PLAN_TIER_LABELS[tier];
}

function quoteHeaderStyle() {
  return "padding:9px 7px;border:1px solid #9ca3af;text-align:center;vertical-align:middle;font-weight:700;word-break:break-word;";
}

function quoteLabelStyle() {
  return "padding:9px 7px;border:1px solid #9ca3af;background:#f9fafb;text-align:left;vertical-align:middle;font-weight:700;";
}

function quoteCellStyle() {
  return "padding:9px 7px;border:1px solid #9ca3af;text-align:center;vertical-align:middle;word-break:break-word;";
}

function buildScheduleSections(days: ItineraryDayRecord[], itinerary: ItineraryRecord) {
  const rows = days.map((day) => {
    return `
      <table data-pdf-block data-pdf-kind="schedule-row" data-pdf-gap-mm="0" style="${scheduleTableStyle()}">
        ${scheduleColgroup()}
        <tbody><tr>
          <td style="${scheduleCellStyle("center")}">${escapeHtml(formatScheduleDate(day.date))}</td>
          <td style="${scheduleCellStyle("center")}">${escapeHtml(formatScheduleRoute(day))}</td>
          <td style="${scheduleCellStyle("center")}">${escapeHtml(getTransportMethodNames(day.transport) || "-")}</td>
          <td style="${scheduleCellStyle("left")};white-space:pre-wrap;line-height:1.6;">${escapeHtml(day.description?.trim() || "-")}</td>
          <td style="${scheduleCellStyle("center")}">${escapeHtml(day.overnightDestination || "-")}</td>
          <td style="${scheduleCellStyle("center")}">${escapeHtml(getDailyMealCodes(day, getDayBreakfastStatus(itinerary, itinerary.dailyPlans.indexOf(day))) || "-")}</td>
        </tr></tbody>
      </table>`;
  }).join("");

  return `
    <section data-pdf-block data-pdf-keep-with-next style="box-sizing:border-box;">
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

export function getDailyMealCodes(day: ItineraryDayRecord, breakfastStatus: "included" | "excluded" | "pending" = day.meals.breakfast ? "included" : "excluded") {
  return [breakfastStatus === "pending" ? "早餐待确认" : breakfastStatus === "included" ? "B" : "", day.meals.lunch ? "L" : "", day.meals.dinner ? "D" : ""].filter(Boolean).join(", ");
}

function buildExtraFeeRows(itinerary: ItineraryRecord, columnCount: number) {
  const cabins = { economy: "经济舱", business: "商务舱", first: "一等座", second: "二等座" };
  const rows: Array<[string, string]> = itinerary.quote.transportFees.map((fee) => [
    fee.type === "flight" ? "机票（另付）" : "动车票（另付）",
    `${fee.departureCity} → ${fee.arrivalCity} · ${cabins[fee.cabin]} · RMB ${formatMoney(fee.unitPrice ?? 0)} PP`,
  ]);
  if (itinerary.quote.chineseTip !== null) rows.push(["中文小费（另付）", `RMB ${formatMoney(itinerary.quote.chineseTip)} PP（全程，大小同价）`]);
  if (itinerary.quote.englishTip !== null) rows.push(["英文小费（另付）", `RMB ${formatMoney(itinerary.quote.englishTip)} PP（全程，大小同价）`]);
  return rows.map(([label, value]) => `<tr><th style="${quoteLabelStyle()}">${escapeHtml(label)}</th><td colspan="${columnCount}" style="${quoteCellStyle()}">${escapeHtml(value)}</td></tr>`).join("");
}

function buildCustomerTerms(itinerary: ItineraryRecord) {
  const hasMeals = itinerary.dailyPlans.some((day) => day.meals.lunch || day.meals.dinner);
  const rows: Array<[string, string]> = [
    ["酒店", "行程所列酒店按双人入住标准报价，均含早餐。早餐由前一晚酒店提供；每日 B 标记表示含早餐。"],
    ["餐食", hasMeals ? "仅包含行程标注的午餐 L、晚餐 D，未标注的正餐自理。" : "团费不含正餐，请自理。"],
    ["交通", "行程所列旅游车服务；机票、动车票及小费不包含在团费中，另列报价不计入团费总计。"],
  ];
  if (itinerary.guidePlans.length > 0) rows.push(["导游", itinerary.guidePlans.map(g => `${g.destination}：${g.guideName}，服务${g.serviceDays}天`).join("；")]);
  if (itinerary.quote.holidayRestrictions.trim()) rows.push(["节假日限制", itinerary.quote.holidayRestrictions]);
  if (itinerary.quote.hotelReplacementTerms.trim()) rows.push(["同级酒店替换条款", itinerary.quote.hotelReplacementTerms]);
  if (itinerary.quote.customerNotes.trim()) rows.push(["客户备注", itinerary.quote.customerNotes]);
  return `<section data-pdf-block data-pdf-keep-with-next><h2 style="margin:0;font-size:18px;">团队标准与备注</h2></section>` + rows.map(([label, value]) => `
    <section data-pdf-block data-pdf-gap-mm="2" style="font-size:12px;line-height:1.6;white-space:pre-wrap;overflow-wrap:anywhere;"><strong>${escapeHtml(label)}：</strong>${escapeHtml(value)}</section>
  `).join("");
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
