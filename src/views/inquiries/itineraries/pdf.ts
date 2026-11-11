import quoteHeaderUrl from "@/assets/images/quote/header.png";
import quoteFooterUrl from "@/assets/images/quote/footer.png";
import type { InquiryRecord } from "@/types/inquiry";
import type {
  ItineraryQuoteCalculation,
  ItineraryQuoteOption,
  LegacyQuoteOptionCalculation,
  LegacyQuoteCalculation,
  PaxQuoteCalculation,
  ItineraryQuoteSettings,
  ItineraryRecord,
} from "@/types/itinerary";
import { formatDateTime, formatMoney } from "@/utils";
import { buildCustomerDocument, type CustomerDocument, type CustomerSnapshot } from "./customer-document";

const MAX_QUOTE_OPTIONS_PER_TABLE = 4;

interface LegacyQuoteOption {
  id: string;
  hotelTier: ItineraryQuoteOption["hotelTier"];
  vehicleTier: ItineraryQuoteOption["vehicleTier"];
  adultUnitPrice: number | null;
  leaderFocEnabled: boolean;
}
type LegacyItineraryRecord = Omit<
  ItineraryRecord,
  "paxTiers" | "childRate" | "childWithoutBedRate" | "quote"
> & {
  adults: number;
  childrenCount: number;
  leaderCount: number;
  quote: Omit<ItineraryQuoteSettings, "options"> & {
    options: LegacyQuoteOption[];
    otherExpenses: number | null;
  };
};
interface QuoteDisplayOption {
  option: LegacyQuoteOption;
  calculation: LegacyQuoteOptionCalculation;
}

interface PdfSnapshot extends CustomerSnapshot {
  calculation: ItineraryQuoteCalculation;
  quoteCode: string;
  quoteVersion: number;
}

export interface ItineraryPrintDocument {
  blob: Blob;
  fileName: string;
  generatedAt: string;
}

export async function generateItineraryPrintDocument(
  itinerary: ItineraryRecord,
  inquiry: InquiryRecord,
  snapshot: PdfSnapshot & { generatedAt: string },
  showChildPrice = false,
): Promise<ItineraryPrintDocument> {
  const generatedAt = formatDateTime(new Date(snapshot.generatedAt));
  const customer = buildCustomerDocument(itinerary, snapshot);
  const fileName = `${sanitizeFileName(itinerary.code)}-${sanitizeFileName(customer.title)}.pdf`;
  const [header, footer] = await Promise.all(
    [quoteHeaderUrl, quoteFooterUrl].map(async (url) => {
      const image = new Image();
      image.src = url;
      await image.decode();
      const canvas = document.createElement("canvas");
      canvas.width = Math.min(image.naturalWidth, 2400);
      canvas.height = Math.round((image.naturalHeight * canvas.width) / image.naturalWidth);
      const context = canvas.getContext("2d")!;
      context.fillStyle = "#fff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL("image/png");
    }),
  );
  const html = `<!doctype html><html lang="${customer.text.htmlLang}"><head><meta charset="utf-8">
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
    <table class="print-layout"><thead><tr><td></td></tr></thead><tbody><tr><td><main>${buildPdfHtml(itinerary, inquiry, generatedAt, snapshot, showChildPrice, customer)}</main></td></tr></tbody><tfoot><tr><td></td></tr></tfoot></table>
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
    await Promise.all(Array.from(printWindow.document.images).map((image) => image.decode()));
    document.title = file.fileName.replace(/\.pdf$/, "");
    await new Promise<void>((resolve, reject) => {
      printWindow.addEventListener("afterprint", () => resolve(), { once: true });
      try {
        printWindow.focus();
        printWindow.print();
      } catch (error) {
        reject(error);
      }
    });
  } finally {
    document.title = previousTitle;
    frame.remove();
    URL.revokeObjectURL(url);
  }
}

export function buildPdfHtml(
  itinerary: ItineraryRecord,
  _inquiry: InquiryRecord,
  _generatedAt: string,
  snapshot: PdfSnapshot,
  showChildPrice = false,
  customer = buildCustomerDocument(itinerary, snapshot),
) {
  const quote = snapshot.calculation;
  return `
    <header data-pdf-block style="box-sizing:border-box;text-align:center;">
      <h1 style="margin:0;font-size:20px;line-height:1.4;">${escapeHtml(customer.title)}</h1>
    </header>
    ${buildScheduleSections(customer)}
    ${buildCustomerTerms(customer)}
    ${"pricingVersion" in quote ? buildPaxQuoteSections(itinerary, quote, showChildPrice, customer) : buildQuoteSections(itinerary as unknown as LegacyItineraryRecord, quote, showChildPrice, customer)}
    ${buildCustomerNotes(customer)}`;
}

function buildPaxQuoteSections(
  itinerary: ItineraryRecord,
  quote: PaxQuoteCalculation,
  showChildPrice: boolean,
  customer: CustomerDocument,
) {
  const labels = customer.text;
  const tables = quote.options
    .map((option) => {
      const title = `${customer.hotelTierLabel(option.hotelTier)} · ${customer.vehicleLabel(option.vehicleTier)}`;
      const hasBedRates = option.paxPrices.some((price) => price.childWithoutBedUnitPrice != null);
      const childColumns = showChildPrice ? (hasBedRates ? 2 : 1) : 0;
      const rows = option.paxPrices
        .map((price) => {
          return `<tr><th style="${quoteLabelStyle()}">${price.pax} PAX</th>
        <td style="${quoteCellStyle()}">RMB ${formatMoney(price.adultUnitPrice)}</td>
        ${showChildPrice ? `<td style="${quoteCellStyle()}">RMB ${formatMoney(price.childUnitPrice)}</td>${hasBedRates ? `<td style="${quoteCellStyle()}">RMB ${formatMoney(price.childWithoutBedUnitPrice)}</td>` : ""}` : ""}
        <td style="${quoteCellStyle()}">RMB ${formatMoney(price.singleSupplementUnitCost)}</td></tr>`;
        })
        .join("");
      const header = [
        labels.paxTier,
        labels.adult,
        ...(showChildPrice
          ? hasBedRates
            ? [labels.childWithBed(itinerary.childRate), labels.childWithoutBed(itinerary.childWithoutBedRate)]
            : [labels.childRate(itinerary.childRate)]
          : []),
        labels.singleSupplement,
      ];
      return `<table data-pdf-block style="width:100%;border-collapse:collapse;table-layout:fixed;font-size:11px;">
      <thead><tr><th colspan="${3 + childColumns}" style="${quoteHeaderStyle()}">${escapeHtml(title)}</th></tr>
        <tr>${header.map((label) => `<th style="${quoteHeaderStyle()}">${escapeHtml(label)}</th>`).join("")}</tr></thead>
      <tbody>${rows}${buildExtraFeeRows(customer, 2 + childColumns)}</tbody>
    </table>`;
    })
    .join("");
  return `<section data-pdf-block data-pdf-keep-with-next><h2 style="margin:0;font-size:13px;">${escapeHtml(labels.quoteHeading)}</h2></section>${tables}`;
}

function buildQuoteSections(
  itinerary: LegacyItineraryRecord,
  quote: LegacyQuoteCalculation,
  showChildPrice: boolean,
  customer: CustomerDocument,
) {
  const guestCount = itinerary.adults + itinerary.childrenCount;
  const options = itinerary.quote.options.flatMap((option) => {
    const calculation = quote.options.find((record) => record.optionId === option.id);
    return calculation ? [{ option, calculation }] : [];
  });
  const optionGroups = chunkQuoteOptions(options);

  return `
    <section data-pdf-block data-pdf-keep-with-next style="box-sizing:border-box;">
      <h2 style="margin:0;font-size:13px;">${escapeHtml(customer.text.legacyQuoteHeading)}</h2>
    </section>
    ${optionGroups.map((group) => buildQuoteTable(group, itinerary, guestCount, showChildPrice, customer)).join("")}`;
}

function buildQuoteTable(
  options: QuoteDisplayOption[],
  itinerary: LegacyItineraryRecord,
  guestCount: number,
  showChildPrice: boolean,
  customer: CustomerDocument,
) {
  const labels = customer.text;
  const childRow =
    showChildPrice && itinerary.childrenCount
      ? buildQuoteRow(
        labels.child,
        options,
        ({ calculation }) => `RMB ${formatMoney(calculation.childUnitPrice)} PP`,
      )
      : "";

  return `
    <table data-pdf-block data-pdf-gap-mm="0" style="width:100%;border-collapse:collapse;table-layout:fixed;font-size:11px;box-sizing:border-box;">
      <thead>
        <tr style="background:#f3f4f6;">
          <th style="${quoteHeaderStyle()};width:18%;"></th>
          ${options
            .map(
              ({ option }) => `
            <th style="${quoteHeaderStyle()}">
              ${new Set(itinerary.quote.options.map((option) => option.hotelTier)).size > 1 ? `<div>${escapeHtml(customer.hotelTierLabel(option.hotelTier))}</div>` : ""}
              <div style="margin-top:3px;">${guestCount}PAX【${escapeHtml(customer.vehicleLabel(option.vehicleTier))}】</div>
            </th>`,
            )
            .join("")}
        </tr>
      </thead>
      <tbody>
        ${buildQuoteRow(
          labels.adult,
          options,
          ({ option, calculation }) => `
          <strong>RMB ${formatMoney(calculation.adultUnitPrice)} PP</strong>
          <div style="display:inline;margin-left:4px;color:${option.leaderFocEnabled && itinerary.leaderCount > 0 ? "#15803d" : "#606266"};font-size:10px;">
            ${option.leaderFocEnabled && itinerary.leaderCount > 0 ? `${guestCount}+${itinerary.leaderCount} FOC` : "NO FOC"}
          </div>`,
        )}
        ${childRow}
        ${buildExtraFeeRows(customer, options.length)}
        ${buildQuoteRow(labels.singleSupplement, options, ({ calculation }) => `RMB ${formatMoney(calculation.singleSupplementUnitCost)}`)}
        ${(itinerary.quote.otherExpenses ?? 0) > 0 ? `<tr><th style="${quoteLabelStyle()}">${escapeHtml(labels.otherExpenses)}</th><td colspan="${options.length}" style="${quoteCellStyle()}">RMB ${formatMoney(itinerary.quote.otherExpenses)}${escapeHtml(labels.wholeGroup)}</td></tr>` : ""}
      </tbody>
    </table>`;
}

function buildQuoteRow(
  label: string,
  options: QuoteDisplayOption[],
  renderValue: (option: QuoteDisplayOption) => string,
) {
  return `<tr>
    <th style="${quoteLabelStyle()}">${escapeHtml(label)}</th>
    ${options.map((option) => `<td style="${quoteCellStyle()}">${renderValue(option)}</td>`).join("")}
  </tr>`;
}

function chunkQuoteOptions(options: QuoteDisplayOption[]) {
  return Array.from(
    { length: Math.ceil(options.length / MAX_QUOTE_OPTIONS_PER_TABLE) },
    (_, index) =>
      options.slice(index * MAX_QUOTE_OPTIONS_PER_TABLE, (index + 1) * MAX_QUOTE_OPTIONS_PER_TABLE),
  );
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

function buildScheduleSections(customer: CustomerDocument) {
  const rows = customer.schedule
    .map((day) => {
      return `
      <tr>
          <td style="${scheduleCellStyle("center")}">${escapeHtml(day.date)}</td>
          <td style="${scheduleCellStyle("center")}">${escapeHtml(day.route)}</td>
          <td style="${scheduleCellStyle("center")}">${escapeHtml(day.transport)}</td>
          <td style="${scheduleCellStyle("left")};white-space:pre-wrap;line-height:1.35;">${escapeHtml(day.description)}</td>
          <td style="${scheduleCellStyle("center")}">${escapeHtml(day.hotel)}</td>
          <td style="${scheduleCellStyle("center")}">${escapeHtml(day.meals)}</td>
      </tr>`;
    })
    .join("");

  return `
    <section data-pdf-block data-pdf-keep-with-next style="box-sizing:border-box;">
      <h2 style="margin:0;font-size:13px;">${escapeHtml(customer.text.scheduleHeading)}</h2>
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

function buildExtraFeeRows(customer: CustomerDocument, columnCount: number) {
  return customer.extraFees
    .map(
      ([label, value]) =>
        `<tr><th style="${quoteLabelStyle()}">${escapeHtml(label)}</th><td colspan="${columnCount}" style="${quoteCellStyle()}">${escapeHtml(value)}</td></tr>`,
    )
    .join("");
}

function buildCustomerTerms(customer: CustomerDocument) {
  const { text: labels, termRows: rows } = customer;
  return `<section data-pdf-block data-pdf-keep-with-next><h2 style="margin:0;font-size:13px;">${escapeHtml(labels.termsHeading)}</h2></section>
    <table data-pdf-block data-pdf-gap-mm="0" style="width:100%;border-collapse:collapse;table-layout:fixed;font-size:11px;">
      ${rows.map(([label, value], index) => `<tr>${index === 0 ? `<th rowspan="${rows.length}" style="${quoteLabelStyle()};width:10%;">${escapeHtml(labels.included)}</th>` : ""}<th style="${quoteLabelStyle()};width:10%;">${escapeHtml(label)}</th><td style="${quoteCellStyle()};text-align:left;">${escapeHtml(value)}</td></tr>`).join("")}
      <tr><th colspan="2" style="${quoteLabelStyle()}">${escapeHtml(labels.excluded)}</th><td style="${quoteCellStyle()};text-align:left;">${labels.exclusions.map((line, index) => `[${index + 1}] ${escapeHtml(line)}`).join("<br>")}</td></tr>
    </table>`;
}

function buildCustomerNotes(customer: CustomerDocument) {
  const { notes } = customer;
  if (!notes.length) return "";
  return (
    `<section data-pdf-block data-pdf-keep-with-next><h2 style="margin:0;font-size:13px;">${escapeHtml(customer.text.notesHeading)}</h2></section>` +
    notes
      .map(
        (value) =>
          `<section data-pdf-block data-pdf-gap-mm="0" style="font-size:11px;line-height:1.35;white-space:pre-wrap;overflow-wrap:anywhere;">${escapeHtml(value)}</section>`,
      )
      .join("")
  );
}

function scheduleHeaderStyle() {
  return "padding:3px 4px;border:1px solid #4b5563;text-align:center;vertical-align:middle;font-weight:700;";
}

function scheduleCellStyle(textAlign: "left" | "center") {
  return `padding:4px 4px;border-right:1px solid #4b5563;border-bottom:1px solid #4b5563;border-left:1px solid #4b5563;text-align:${textAlign};vertical-align:middle;word-break:break-word;`;
}

function escapeHtml(value: string) {
  return value.replace(
    /[&<>'"]/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] ??
      character,
  );
}

function sanitizeFileName(value: string) {
  return value.replace(/[\\/:*?"<>|]/g, "-");
}
