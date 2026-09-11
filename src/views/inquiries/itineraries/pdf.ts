import quoteHeaderUrl from "@/assets/images/quote/header.png";
import quoteFooterUrl from "@/assets/images/quote/footer.png";
import { getDayBreakfastStatus } from "./hotel-plans";
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
import { HOTEL_PLAN_TIER_LABELS } from "./hotel-plans";
import { calculateItineraryQuote } from "./quote-pricing";
import {
  getEnabledVehiclePlans,
} from "./vehicle-plans";

const MAX_QUOTE_OPTIONS_PER_TABLE = 4;

interface QuoteDisplayOption {
  option: ItineraryQuoteOption;
  calculation: ItineraryQuoteOptionCalculation;
}

export interface ItineraryPrintDocument {
  blob: Blob;
  fileName: string;
  generatedAt: string;
}

export async function generateItineraryPrintDocument(itinerary: ItineraryRecord, inquiry: InquiryRecord, snapshot?: { generatedAt: string; calculation: ItineraryQuoteCalculation; quoteCode: string; quoteVersion: number }): Promise<ItineraryPrintDocument> {
  const generatedAt = snapshot ? formatDateTime(new Date(snapshot.generatedAt)) : formatDateTime(new Date());
  const fileName = `${sanitizeFileName(itinerary.code)}-${sanitizeFileName(itinerary.title)}.pdf`;
  const [header, footer] = await Promise.all([quoteHeaderUrl, quoteFooterUrl].map(async (url) => {
    const image = new Image();
    image.src = url;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = Math.min(image.naturalWidth, 2400);
    canvas.height = Math.round(image.naturalHeight * canvas.width / image.naturalWidth);
    const context = canvas.getContext("2d")!;
    context.fillStyle = "#fff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/png");
  }));
  const html = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8">
    <title>${escapeHtml(fileName.replace(/\.pdf$/, ""))}</title>
    <style>
      @page { size: A4; margin: 0; }
      * { box-sizing: border-box; }
      html { background: #eee; }
      body { margin: 0 auto; padding: 10mm; width: 210mm; background: white; color: #111; font-family: Arial, "Microsoft YaHei", "PingFang SC", sans-serif; }
      .quote-header, .quote-footer { display: block; width: 190mm; }
      .quote-header { margin-bottom: 3mm; }
      .quote-footer { margin-top: 3mm; }
      .print-layout { width: 100%; border-collapse: collapse; }
      .print-layout > tbody > tr > td { padding: 0; }
      .print-layout > thead, .print-layout > tfoot { display: none; }
      [data-pdf-block] { margin: 0 0 1.5mm; }
      [data-pdf-gap-mm="0"] { margin-top: -1.5mm; }
      [data-pdf-keep-with-next] { break-after: avoid; }
      tr { break-inside: avoid; }
      thead { display: table-header-group; }
      h1, h2 { break-after: avoid; }
      @media print {
        html { background: white; }
        body { width: 190mm; margin: 0 10mm; padding: 0; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
        .print-layout > thead { display: table-header-group; }
        .print-layout > tfoot { display: table-footer-group; }
        .print-layout > thead td { height: 35mm; padding: 0; }
        .print-layout > tfoot td { height: 25mm; padding: 0; }
        .print-layout > tbody > tr { break-inside: auto; }
        .quote-header { position: fixed; top: 10mm; left: 10mm; margin: 0; }
        .quote-footer { position: fixed; bottom: 10mm; left: 10mm; margin: 0; }
      }
    </style></head><body>
    <img class="quote-header" src="${header}" alt="">
    <table class="print-layout"><thead><tr><td></td></tr></thead><tbody><tr><td><main>${buildPdfHtml(itinerary, inquiry, generatedAt, snapshot)}</main></td></tr></tbody><tfoot><tr><td></td></tr></tfoot></table>
    <img class="quote-footer" src="${footer}" alt="">
    </body></html>`;
  return { blob: new Blob([html], { type: "text/html;charset=utf-8" }), fileName, generatedAt };
}

export async function printItineraryDocument(file: ItineraryPrintDocument): Promise<void> {
  const frame = document.createElement("iframe");
  frame.title = file.fileName;
  frame.style.cssText = "position:fixed;left:-10000px;top:0;width:210mm;height:297mm;border:0;";
  const url = URL.createObjectURL(file.blob);
  const previousTitle = document.title;
  try {
    await new Promise<void>((resolve, reject) => {
      frame.onload = () => resolve();
      frame.onerror = () => reject(new Error("Unable to load print document"));
      frame.src = url;
      document.body.appendChild(frame);
    });
    const printWindow = frame.contentWindow!;
    await printWindow.document.fonts.ready;
    await Promise.all(Array.from(printWindow.document.images).map(image => image.decode()));
    document.title = file.fileName.replace(/\.pdf$/, "");
    await new Promise<void>((resolve, reject) => {
      printWindow.addEventListener("afterprint", () => resolve(), { once: true });
      try { printWindow.focus(); printWindow.print(); } catch (error) { reject(error); }
    });
  } finally {
    document.title = previousTitle;
    frame.remove();
    URL.revokeObjectURL(url);
  }
}

export function buildPdfHtml(itinerary: ItineraryRecord, _inquiry: InquiryRecord, _generatedAt: string, snapshot?: { calculation: ItineraryQuoteCalculation; quoteCode: string; quoteVersion: number }) {
  const totalCost = sumMoney(itinerary.dailyPlans
    .flatMap((day) => day.items)
    .filter((item) => item.type === "restaurant" || item.type === "attraction")
    .map((item) => item.totalCost));
  const quote = snapshot?.calculation ?? calculateItineraryQuote(itinerary, totalCost);
  const scheduleSections = buildScheduleSections(itinerary.dailyPlans, itinerary);

  return `
    <header data-pdf-block style="box-sizing:border-box;text-align:center;">
      <h1 style="margin:0;font-size:20px;line-height:1.4;">${escapeHtml(itinerary.title)}</h1>
    </header>
    ${scheduleSections}
    ${buildCustomerTerms(itinerary)}
    ${buildQuoteSections(itinerary, quote)}
    ${buildCustomerNotes(itinerary)}`;

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
      <h2 style="margin:0;font-size:13px;">三、团队报价【团费不含任何段的机票、动车票、额外自费、小费及司陪费】</h2>
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
    <table data-pdf-block data-pdf-gap-mm="0" style="width:100%;border-collapse:collapse;table-layout:fixed;font-size:11px;box-sizing:border-box;">
      <thead>
        <tr style="background:#f3f4f6;">
          <th style="${quoteHeaderStyle()};width:18%;"></th>
          ${options.map(({ option }) => `
            <th style="${quoteHeaderStyle()}">
              ${new Set(itinerary.quote.options.map(option => option.hotelTier)).size > 1 ? `<div>${escapeHtml(HOTEL_PLAN_TIER_LABELS[option.hotelTier])}</div>` : ""}
              <div style="margin-top:3px;">${guestCount}PAX【${escapeHtml(getVehicleQuoteLabel(itinerary, option.vehicleTier))}】</div>
            </th>`).join("")}
        </tr>
      </thead>
      <tbody>
        ${buildQuoteRow("成人团费", options, ({ option, calculation }) => `
          <strong>RMB ${formatMoney(calculation.adultUnitPrice)} PP</strong>
          <div style="display:inline;margin-left:4px;color:${(option.leaderFocEnabled && itinerary.leaderCount > 0) ? "#15803d" : "#606266"};font-size:10px;">
            ${(option.leaderFocEnabled && itinerary.leaderCount > 0) ? `${guestCount}+${itinerary.leaderCount} FOC` : "NO FOC"}
          </div>`)}
        ${childRow}
        ${buildExtraFeeRows(itinerary, options.length)}
        ${buildQuoteRow("单房差", options, ({ calculation }) => `RMB ${formatMoney(calculation.singleSupplementUnitCost)}`)}
        ${buildTipRows(itinerary, options.length)}
        ${(itinerary.quote.otherExpenses ?? 0) > 0 ? `<tr><th style="${quoteLabelStyle()}">司陪费及其他支出（另付）</th><td colspan="${options.length}" style="${quoteCellStyle()}">RMB ${formatMoney(itinerary.quote.otherExpenses ?? 0)}（整团）</td></tr>` : ""}
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

function getVehicleQuoteLabel(itinerary: ItineraryRecord, tier: ItineraryQuoteOption["vehicleTier"]) {
  const plan = getEnabledVehiclePlans(itinerary).find(plan => plan.tier === tier);
  const seats = [...new Set(plan?.arrangements.flatMap(a => a.vehicles.map(v => v.seats)) ?? [])];
  return `${seats.length ? `${seats.join("/")}座` : ""}${tier === "vip" ? "VIP" : "普通"}巴士`;
}

function quoteHeaderStyle() {
  return "padding:3px 5px;border:1px solid #9ca3af;text-align:center;vertical-align:middle;font-weight:700;word-break:break-word;";
}

function quoteLabelStyle() {
  return "padding:3px 5px;border:1px solid #9ca3af;background:#f9fafb;text-align:left;vertical-align:middle;font-weight:700;";
}

function quoteCellStyle() {
  return "padding:3px 5px;border:1px solid #9ca3af;text-align:center;vertical-align:middle;word-break:break-word;";
}

function buildScheduleSections(days: ItineraryDayRecord[], itinerary: ItineraryRecord) {
  const rows = days.map((day) => {
    return `
      <tr>
          <td style="${scheduleCellStyle("center")}">${escapeHtml(formatScheduleDate(day.date))}</td>
          <td style="${scheduleCellStyle("center")}">${escapeHtml(formatScheduleRoute(day))}</td>
          <td style="${scheduleCellStyle("center")}">${escapeHtml(getTransportMethodNames(day.transport) || "-")}</td>
          <td style="${scheduleCellStyle("left")};white-space:pre-wrap;line-height:1.35;">${escapeHtml(day.description?.trim() || "-")}</td>
          <td style="${scheduleCellStyle("center")}">${escapeHtml(day.overnightDestination || "-")}</td>
          <td style="${scheduleCellStyle("center")}">${escapeHtml(getDailyMealCodes(day, getDayBreakfastStatus(itinerary, itinerary.dailyPlans.indexOf(day))) || "-")}</td>
      </tr>`;
  }).join("");

  return `
    <section data-pdf-block data-pdf-keep-with-next style="box-sizing:border-box;">
      <h2 style="margin:0;font-size:13px;">一、行程安排</h2>
    </section>
    <table data-pdf-block data-pdf-kind="schedule" data-pdf-gap-mm="0" style="${scheduleTableStyle()}">
      ${scheduleColgroup()}
      <thead><tr style="background:#f3f4f6;">
        <th style="${scheduleHeaderStyle()}">D</th>
        <th style="${scheduleHeaderStyle()}">DEPART.</th>
        <th style="${scheduleHeaderStyle()}">T</th>
        <th style="${scheduleHeaderStyle()}">SIGHT-SEEING REGION</th>
        <th style="${scheduleHeaderStyle()}">HOTEL</th>
        <th style="${scheduleHeaderStyle()}">M</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function scheduleTableStyle() {
  return "width:100%;border-collapse:collapse;table-layout:fixed;font-size:12px;";
}

function scheduleColgroup() {
  return `<colgroup>
    <col style="width:8%;"><col style="width:17%;"><col style="width:8%;">
    <col style="width:49%;"><col style="width:12%;"><col style="width:6%;">
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
  return rows.map(([label, value]) => `<tr><th style="${quoteLabelStyle()}">${escapeHtml(label)}</th><td colspan="${columnCount}" style="${quoteCellStyle()}">${escapeHtml(value)}</td></tr>`).join("");
}

function buildTipRows(itinerary: ItineraryRecord, columnCount: number) {
  const tips = [["中文", itinerary.quote.chineseTip], ["英文", itinerary.quote.englishTip]] as const;
  const visible = tips.filter(([, amount]) => (amount ?? 0) > 0);
  return visible.map(([language, amount], index) => `<tr>
    ${index === 0 ? `<th rowspan="${visible.length}" style="${quoteLabelStyle()}">全程小费</th>` : ""}
    <td colspan="${columnCount}" style="${quoteCellStyle()};text-align:left;">【${language}】 RMB ${formatMoney(amount ?? 0)} PP NO FOC【大小同价，不含行李费】</td>
  </tr>`).join("");
}

function buildCustomerTerms(itinerary: ItineraryRecord) {
  const hasMeals = itinerary.dailyPlans.some((day) => day.meals.lunch || day.meals.dinner);
  const rows: Array<[string, string]> = [
    ["酒店", "行程中所标注或同级酒店，双标间两人入住，含早餐。"],
    ["餐食", hasMeals ? "行程中所列酒店提供早餐；包含标注的午餐 L、晚餐 D，未标注的正餐自理。" : "行程中所列酒店提供早餐，团费不含正餐，请自理。"],
    ["门票", "包含行程中所列门票及景区内区间费用。"],
    ...itinerary.guidePlans.length ? [["导游", "行程安排的导游服务。"] as [string, string]] : [],
    ["交通", "行程中所列巴士服务。"],
  ];
  return `<section data-pdf-block data-pdf-keep-with-next><h2 style="margin:0;font-size:13px;">二、团队标准</h2></section>
    <table data-pdf-block data-pdf-gap-mm="0" style="width:100%;border-collapse:collapse;table-layout:fixed;font-size:11px;">
      ${rows.map(([label, value], index) => `<tr>${index === 0 ? `<th rowspan="${rows.length}" style="${quoteLabelStyle()};width:10%;">团费包含</th>` : ""}<th style="${quoteLabelStyle()};width:10%;">${label}</th><td style="${quoteCellStyle()};text-align:left;">${escapeHtml(value)}</td></tr>`).join("")}
      <tr><th colspan="2" style="${quoteLabelStyle()}">团费不含</th><td style="${quoteCellStyle()};text-align:left;">1] 任何段机票、机场税及燃油费、动车票；<br>2] 任何客人保险；</td></tr>
    </table>`;
}

function buildCustomerNotes(itinerary: ItineraryRecord) {
  const notes = [itinerary.quote.holidayRestrictions, itinerary.quote.hotelReplacementTerms, itinerary.quote.customerNotes].filter(value => value.trim());
  if (!notes.length) return "";
  return `<section data-pdf-block data-pdf-keep-with-next><h2 style="margin:0;font-size:13px;">四、备注</h2></section>` +
    notes.map(value => `<section data-pdf-block data-pdf-gap-mm="0" style="font-size:11px;line-height:1.35;white-space:pre-wrap;overflow-wrap:anywhere;">${escapeHtml(value)}</section>`).join("");
}

function scheduleHeaderStyle() {
  return "padding:3px 4px;border:1px solid #4b5563;text-align:center;vertical-align:middle;font-weight:700;";
}

function scheduleCellStyle(textAlign: "left" | "center") {
  return `padding:4px 4px;border-right:1px solid #4b5563;border-bottom:1px solid #4b5563;border-left:1px solid #4b5563;text-align:${textAlign};vertical-align:middle;word-break:break-word;`;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", "\"": "&quot;" })[character] ?? character);
}

function sanitizeFileName(value: string) {
  return value.replace(/[\\/:*?"<>|]/g, "-");
}
