import type { WebsiteOutput, WebsitePreview, WebsiteQuotation } from "@/types/website";
import { printItineraryDocument } from "@/views/inquiries/itineraries/pdf";

function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!,
  );
}
export function websitePrintHtml(output: WebsiteOutput, language: "en" | "zh"): string {
  const headings =
    language === "en"
      ? ["ITINERARY", "INCLUSIONS & EXCLUSIONS", "HOTEL OPTIONS", "QUOTATION", "NOTES"]
      : ["行程", "包含与不含", "酒店方案", "报价", "说明"];
  const columns =
    language === "en"
      ? ["DAY", "DEPART", "TRANSPORTATION", "SIGHTSEEING", "HOTEL", "MEAL"]
      : ["天数", "出发", "交通", "游览", "酒店", "餐食"];
  const list = (values: string[]) =>
    `<ul>${values.map((value) => `<li>${escapeHtml(value)}</li>`).join("")}</ul>`;
  const dayRows = output.itinerary
    .map((day) => {
      const cells = [day.day, day.depart, day.transportation, day.sightseeing, day.hotel, day.meal];
      return `<tr>${cells.map((value) => `<td>${escapeHtml(value)}</td>`).join("")}</tr>`;
    })
    .join("");
  const hotelRows = output.hotelOptions
    .map(
      (hotel) =>
        `<tr><td>${hotel.tier}</td><td>${escapeHtml(hotel.city)}</td><td>${escapeHtml(hotel.hotel)}</td><td>${escapeHtml(hotel.roomType)}</td></tr>`,
    )
    .join("");
  const quoteRows = output.quotation
    .map(
      (quote) =>
        `<p class="quote-price">${escapeHtml(quote.vehicle)} — ${escapeHtml(quote.price)}</p>`,
    )
    .join("");
  return `<!doctype html>
    <html lang="${language === "en" ? "en" : "zh-CN"}">
    <head>
      <meta charset="utf-8">
      <title>${escapeHtml(output.title)}</title>
      <style>
        @page { size: A4; margin: 12mm; }
        * { box-sizing: border-box; }
        body { margin: 0; padding: 16px; font-family: Arial, "Microsoft YaHei", sans-serif; color: #222; font-size: 11px; }
        h1 { text-align: center; font-size: 22px; }
        h2 { font-size: 15px; margin-top: 22px; break-after: avoid; }
        h3 { font-size: 12px; }
        table { width: 100%; border-collapse: collapse; table-layout: fixed; }
        th, td { border: 1px solid #999; padding: 7px; vertical-align: top; white-space: pre-wrap; overflow-wrap: anywhere; }
        thead { display: table-header-group; }
        tr { break-inside: avoid; }
        li { margin: 6px 0; white-space: pre-wrap; }
        .quote-price { font-size: 15px; }
        @media print { body { padding: 0; } }
      </style>
    </head>
    <body>
      <h1>${escapeHtml(output.title)}</h1>
      <h2>${headings[0]}</h2>
      <table>
        <thead><tr>${columns.map((column) => `<th>${column}</th>`).join("")}</tr></thead>
        <tbody>${dayRows}</tbody>
      </table>
      <h2>${headings[1]}</h2>
      <h3>${language === "en" ? "Included" : "包含"}</h3>
      ${list(output.inclusions)}
      <h3>${language === "en" ? "Excluded" : "不含"}</h3>
      ${list(output.exclusions)}
      <h2>${headings[2]}</h2>
      <table><tbody>${hotelRows}</tbody></table>
      <h2>${headings[3]}</h2>
      ${quoteRows}
      <h2>${headings[4]}</h2>
      ${list(output.notes)}
    </body>
    </html>`;
}
export function websitePrintBlob(preview: WebsitePreview, language: "en" | "zh") {
  return new Blob(
    [websitePrintHtml(language === "en" ? preview.english : preview.chinese, language)],
    { type: "text/html;charset=utf-8" },
  );
}
export async function printWebsiteQuotation(quotation: WebsiteQuotation, language: "en" | "zh") {
  await printItineraryDocument({
    blob: websitePrintBlob(quotation, language),
    fileName: `${quotation.code}-${language}.pdf`,
    generatedAt: quotation.confirmedAt,
  });
}
