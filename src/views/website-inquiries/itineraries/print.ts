import type { WebsiteOutput, WebsitePreview, WebsiteQuotation } from "@/types/website";
import headerRule from "@/assets/images/quote/lynxtour-header-rule.png?inline";
import logo from "@/assets/images/quote/lynxtour-logo.png?inline";
import { printItineraryDocument } from "@/views/inquiries/itineraries/pdf";
import enLocale from "@/lang/package/en.json";
import zhCnLocale from "@/lang/package/zh-cn.json";

type PrintTextKey = keyof typeof enLocale.websitePrint;
/** 打印件语言由参数指定，不跟随界面 locale；静态文案取自对应语言包。 */
function printText(language: "en" | "zh", key: PrintTextKey, params: Record<string, string | number> = {}) {
  const template: string = (language === "en" ? enLocale : zhCnLocale).websitePrint[key];
  return template.replace(/\{(\w+)\}/g, (match, name: string) => (name in params ? String(params[name]) : match));
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);
}

/** Render frozen business content only; configuration and prices are never read or recalculated here. */
export function websitePrintHtml(output: WebsiteOutput, language: "en" | "zh"): string {
  const en = language === "en";
  const text = (key: PrintTextKey, params?: Record<string, string | number>) => printText(language, key, params);
  const headings = ["itineraryHeading", "standardsHeading", "quotationHeading", "hotelHeading", "mileageHeading"] as const;
  const columns = ["dayColumn", "departureColumn", "transportColumn", "sightseeingColumn", "overnightColumn", "mealsColumn"] as const;
  const paragraphs = (values: string[]) => values.map(value => `<p>${escapeHtml(value)}</p>`).join("");
  const dayRows = output.itinerary.map((day, dayIndex) => {
    const dayLabel = /^\d{4}-\d{2}-\d{2}$/.test(day.day) ? day.day : `D${dayIndex + 1}`;
    const meal = en ? day.meal : day.meal
      .split(/ *\/ */)
      .map(label => label.replace(/^([早午晚])餐$/, "$1"))
      .join("/");
    return `<tr>${[dayLabel, day.depart, day.transportation, day.sightseeing, day.hotel, meal]
      .map((value, index) => `<td class="${index === 3 ? "sightseeing" : "center"}">${escapeHtml(value)}</td>`).join("")}</tr>`;
  }).join("");
  const included = (category: string) => paragraphs(output.teamStandard?.find(row => row.category === category)?.included ?? []);
  // 司机说明、导游及其他服务、报价车型由服务端分别写入 driver/service/transport，前端只换标签不再拼接。
  const transportLabel = text("transportation");
  const standardWidths = [11, 11, 34, 10, 34];
  const standard = output.teamStandard
    ? `<table class="standards"><colgroup>${standardWidths.map(width => `<col style="width:${width}%">`).join("")}</colgroup><tbody>
      <tr><th rowspan="3">${text("includes")}</th><th>${text("hotel")}</th><td>${included("hotel")}</td><th>${text("mealsColumn")}</th><td>${included("meal")}</td></tr>
      <tr><th>${text("admission")}</th><td>${included("entry")}</td><th>${text("driver")}</th><td>${included("driver")}</td></tr>
      <tr><th>${escapeHtml(transportLabel)}</th><td>${included("transport")}</td><th>${text("guide")}</th><td>${included("service")}</td></tr>
      <tr><th>${text("excludes")}</th><td colspan="4">${paragraphs(output.exclusions)}</td></tr>
      </tbody></table>`
    : `<table><tbody><tr><th class="label">${text("includes")}</th><td>${paragraphs(output.inclusions)}</td></tr><tr><th>${text("excludes")}</th><td>${paragraphs(output.exclusions)}</td></tr></tbody></table>`;
  const componentLabels = (en ? enLocale : zhCnLocale).websiteItineraryUi.priceCategories;
  // 说明行并入最后一张报价表底部，与报价成为一个整体；无报价时单独成表。
  const notesRows = (span: number) => {
    const shopping = output.noShopping
      ? `<tr class="no-shopping"><td colspan="${span + 1}"><strong>${escapeHtml(en ? output.noShopping.replace(/^no shopping([.!]?)$/i, "No shopping$1") : output.noShopping)}</strong></td></tr>`
      : "";
    return `<tr class="quote-notes"><th class="label">${text("notes")}</th><td colspan="${span}">${output.notes.map((note, index) => `<p>${index + 1}. ${escapeHtml(note)}</p>`).join("")}</td></tr>${shopping}`;
  };
  const quotationV5 = () => {
    const pax = output.quotation[0]?.pax;
    const meta = `<p class="quote-meta">${escapeHtml(pax == null ? text("guestsPending") : text("guests", { pax }))}</p>`;
    const money = (value: string) => escapeHtml(value.replace(/\B(?=(\d{3})+(?!\d))/g, ","));
    const groups = new Map<string, WebsiteOutput["quotation"]>();
    for (const quote of output.quotation) {
      const category = quote.hotelCategory ?? "";
      const group = groups.get(category) ?? [];
      group.push(quote);
      groups.set(category, group);
    }
    // 保留服务端顺序及冻结金额，仅按酒店档次分表，不重算或补分项。
    // 四列网格：首列与说明标签同宽（13%），车型单元格跨前两列。
    const tables = [...groups].map(([category, rows], index, all) => {
      const head = `<thead><tr><th colspan="4" class="quote-category">${escapeHtml(category)}</th></tr><tr>${(["vehicle", "perPerson", "groupTotal"] as const).map(key => `<th${key === "vehicle" ? ' colspan="2"' : ""}>${escapeHtml(text(key))}</th>`).join("")}</tr></thead>`;
      const body = rows.map(quote => `<tr class="quote-option"><td class="quote-vehicle" colspan="2">${escapeHtml(quote.vehicle)}</td>
        <td><strong>RMB ${money(quote.unitPrice ?? "")}</strong>${(quote.priceComponents ?? []).map(component => `<p class="quote-breakdown">${escapeHtml(text("componentPerPerson", { category: componentLabels[component.category] }))}: RMB ${money(component.unitPrice)}</p>`).join("")}</td>
        <td>${quote.totalPrice == null ? escapeHtml(text("toBeConfirmed")) : `RMB ${money(quote.totalPrice)}`}</td></tr>`).join("");
      return `<table class="quotation quotation-v5"><colgroup>${[13, 21, 33, 33].map(width => `<col style="width:${width}%">`).join("")}</colgroup>${head}<tbody>${body}${index === all.length - 1 ? notesRows(3) : ""}</tbody></table>`;
    }).join("");
    return `${meta}${tables || `<p class="empty">${escapeHtml(text("noQuotation"))}</p><table class="notes"><tbody>${notesRows(1)}</tbody></table>`}`;
  };
  const hotelsV5 = () => {
    if (output.hotelPricingMode === "nightly" && output.hotelOptions.length) {
      const showMoney = output.nightlyHotelTotal !== undefined || output.hotelOptions.some(h => h.nightlyRate !== undefined);
      const headers = [text("stay"), text("hotel"), text("roomType"), text("nightlyRoomCount"), ...(showMoney ? [text("nightlyCharge")] : [])];
      const widths = showMoney ? [27, 26, 19, 9, 19] : [31, 32, 24, 13];
      const rows = output.hotelOptions.map(hotel => {
        const stay = hotel.startDate && hotel.checkoutDate ? `${hotel.startDate} → ${hotel.checkoutDate}` : `D${hotel.startDay} → D${(hotel.endDay ?? 0) + 1}`;
        const nights = text(hotel.nights === 1 ? "night" : "nights", { count: hotel.nights ?? 1 });
        const breakfast = text(hotel.breakfastIncluded ? "breakfastIncluded" : "breakfastExcluded");
        const cells = [[stay, hotel.city, nights].join(" · "), [hotel.hotel, hotel.tierLabel].filter(Boolean).join(" · "),
          [hotel.roomType, breakfast].filter(Boolean).join(" · "), String(hotel.roomCount ?? "—"),
          ...(showMoney ? [[hotel.nightlyRate ?? "—", hotel.subtotal ?? "—"].join(" / ")] : [])];
        return `<tr>${cells.map(value => `<td>${escapeHtml(value)}</td>`).join("")}</tr>`;
      }).join("");
      const total = output.nightlyHotelTotal === undefined ? "" : `<tr><th colspan="4">${text("hotelGroupTotal")}</th><td>${escapeHtml(output.nightlyHotelTotal)}</td></tr>`;
      return `<table class="hotels-v5"><colgroup>${widths.map(width => `<col style="width:${width}%">`).join("")}</colgroup><thead><tr>${headers.map(label => `<th>${escapeHtml(label)}</th>`).join("")}</tr></thead><tbody>${rows}${total}</tbody></table>`;
    }
    // 使用服务端合并后的 hotelOptions，仅按档次、起始日排序，不再去重。
    const sorted = [...output.hotelOptions].sort((a, b) => a.tier.localeCompare(b.tier) || (a.startDay ?? 0) - (b.startDay ?? 0));
    if (!sorted.length) return `<p class="empty">${escapeHtml(text("noHotels"))}</p>`;
    const tiers = [...new Set(sorted.map(hotel => hotel.tier))];
    const head = `<tr>${(["stay", "hotel", "roomType", "breakfast"] as const).map(key => `<th>${escapeHtml(text(key))}</th>`).join("")}</tr>`;
    return tiers.map((tier) => {
      const rows = sorted.filter(hotel => hotel.tier === tier);
      const body = rows.map((hotel) => {
        // 自选服务日快照带实际入住日期（空档两侧分段），连续模式及历史冻结沿用 D 序号。
        const days = hotel.startDate
          ? hotel.endDate && hotel.endDate !== hotel.startDate ? `${hotel.startDate}–${hotel.endDate}` : hotel.startDate
          : hotel.startDay === undefined ? "" : hotel.endDay !== undefined && hotel.endDay !== hotel.startDay ? `D${hotel.startDay}–D${hotel.endDay}` : `D${hotel.startDay}`;
        const nights = hotel.nights === undefined ? "" : text(hotel.nights === 1 ? "night" : "nights", { count: hotel.nights });
        const stay = [days, hotel.city, nights].filter(Boolean).join(" · ");
        const breakfast = hotel.breakfastIncluded === undefined ? "-" : text(hotel.breakfastIncluded ? "breakfastIncluded" : "breakfastExcluded");
        return `<tr>${[stay, hotel.hotel, hotel.roomType || "-", breakfast].map(value => `<td>${escapeHtml(value)}</td>`).join("")}</tr>`;
      }).join("");
      return `<table class="hotels-v5"><colgroup>${[28, 36, 20, 16].map(width => `<col style="width:${width}%">`).join("")}</colgroup><thead><tr><th colspan="4" class="tier">${escapeHtml(rows[0]!.tierLabel ?? tier)}</th></tr>${head}</thead><tbody>${body}</tbody></table>`;
    }).join("");
  };
  const mileageHead = [text("routeColumn"), text("distanceColumn"), text("timeColumn"), text("transportColumn")];
  const mileage = output.mileage ?? [];
  const mileageRows = mileage.map((row) => {
    const hours = Math.floor((row.durationMinutes ?? 0) / 60);
    const minutes = (row.durationMinutes ?? 0) % 60;
    const duration = row.durationMinutes == null ? "-" : en ? `${hours ? `${hours} h` : ""}${minutes ? ` ${minutes} min` : ""}`.trim() : `${hours ? `${hours}小时` : ""}${minutes ? `${minutes}分钟` : ""}`;
    const distance = row.distanceKm == null ? "-" : `${row.distanceKm} km`;
    const cells = [row.route, distance, duration, row.transport].map(value => `<td>${escapeHtml(value)}</td>`).join("");
    return `<tr>${cells}</tr>`;
  }).join("");
  return `<!doctype html><html lang="${en ? "en" : "zh-CN"}"><head><meta charset="utf-8"><title>${escapeHtml(output.title)}</title>
    <style>
      @page { size: A4; margin: 0; }
      * { box-sizing: border-box; }
      html { background: #eee; }
      body { position: relative; width: 210mm; min-height: 297mm; margin: 0 auto; padding: 35mm 8.5mm 24mm; background: white; color: #000; font: 7.5pt/1.85 "Times New Roman", "Songti SC", serif; }
      .brand-header { position: absolute; top: 10mm; left: 8.5mm; right: 8.5mm; height: 22mm; display: flex; align-items: flex-start; gap: 8mm; background: url("${headerRule}") right bottom / 82% auto no-repeat; font: 9pt/1.65 Arial, "PingFang SC", sans-serif; color: #ffcaa6; }
      .brand-header img { display: block; width: auto; height: 22mm; margin-left: 8mm; object-fit: contain; }
      .brand-contact { flex: 1; text-align: right; padding-top: .5mm; }
      .brand-contact p { margin: 0; white-space: normal; }
      .brand-footer { position: absolute; bottom: 10mm; left: 0; width: 100%; color: #b80021; text-align: center; font: 9pt/1.7 Arial, "PingFang SC", sans-serif; letter-spacing: 1.5px; }
      h2 { margin: 2.5mm 1mm; font: bold 9pt/1.3 Arial, "PingFang SC", sans-serif; break-after: avoid; }
      h2:first-child { margin-top: 0; }
      table { width: 100%; border-collapse: collapse; table-layout: fixed; margin: 0; }
      th, td { border: .5pt solid black; padding: .5mm 1.8mm; vertical-align: top; overflow-wrap: anywhere; white-space: pre-wrap; }
      td { padding-top: 0; padding-bottom: 0; }
      th { font: bold 7.5pt/1.5 Arial, "PingFang SC", sans-serif; vertical-align: middle; text-align: center; }
      p { margin: 0; white-space: pre-wrap; }
      thead { display: table-header-group; }
      tr { break-inside: avoid; }
      .center { text-align: center; vertical-align: middle; }
      .sightseeing { text-align: justify; }
      .itinerary th { overflow-wrap: normal; padding-left: .7mm; padding-right: .7mm; }
      .itinerary td:first-child { font-family: Arial, sans-serif; font-weight: bold; }
      .itinerary td:last-child { text-align: left; overflow-wrap: normal; word-break: normal; line-height: 1.6; }
      .standards th { overflow-wrap: normal; }
      .quotation { font-family: Arial, "PingFang SC", sans-serif; margin-top: 1.5mm; }
      .quotation th, .quotation td { line-height: 1.5; }
      .label { width: 13%; }
      .quote-notes th, .quotation-v5 .quote-notes th { font-size: 9pt; padding: .5mm 1.8mm; }
      .quotation-v5 .quote-notes td { text-align: left; vertical-align: top; padding: 0 1.8mm; font: 7.5pt/1.85 "Times New Roman", "Songti SC", serif; }
      .no-shopping td, .quotation-v5 .no-shopping td { text-align: right; padding: 0 1.8mm; color: #b80021; text-transform: uppercase; font: bold 7.5pt/1.85 Arial, "PingFang SC", sans-serif; }
      .quote-meta { margin: 0 1mm 1mm; font: bold 7.5pt/1.5 Arial, "PingFang SC", sans-serif; }
      .quotation-v5 { margin: 0 0 2.5mm; font-size: 8.5pt; }
      .quotation-v5 th, .quotation-v5 td { padding: 1.5mm 2mm; vertical-align: middle; }
      .quotation-v5 th { font-size: 8pt; }
      .quotation-v5 td { text-align: center; font-variant-numeric: tabular-nums; }
      .quotation-v5 .quote-category { font-size: 9pt; }
      .quotation-v5 .quote-vehicle { font-weight: bold; }
      .quotation-v5 .quote-breakdown { margin-top: .8mm; font-size: 7.5pt; color: #4b5563; }
      .quote-option { break-inside: avoid; }
      .hotels-v5 { margin-bottom: 2mm; font-family: Arial, "PingFang SC", sans-serif; }
      .hotels-v5 th, .hotels-v5 td { line-height: 1.5; }
      .hotels-v5 .tier { text-align: left; font-size: 8pt; }
      .empty { margin: 0 1mm 2mm; }
      .mileage { font-size: 7pt; line-height: 1.4; }
      .mileage td { text-align: center; vertical-align: middle; }
      .estimate { margin: 1mm 0; font-size: 7pt; }
      .print-layout > thead, .print-layout > tfoot { display: none; }
      .print-layout > tbody > tr > td { border: 0; padding: 0; white-space: normal; }
      .print-layout > tbody > tr { break-inside: auto; }
      @media print {
        html { background: white; }
        body { position: static; width: 193mm; min-height: 0; padding: 0; margin: 0 8.5mm; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
        .print-layout > thead { display: table-header-group; }
        .print-layout > tfoot { display: table-footer-group; }
        .print-layout > thead td { height: 35mm; border: 0; padding: 0; }
        .print-layout > tfoot td { height: 24mm; border: 0; padding: 0; }
        .brand-header { position: fixed; top: 10mm; left: 8.5mm; right: 8.5mm; }
        .brand-footer { position: fixed; bottom: 10mm; }
      }
    </style></head><body>
    <header class="brand-header"><img src="${logo}" alt=""><div class="brand-contact">
      <p><strong>电话/Tel:</strong> +86-871-63218088 63218099&emsp; <strong>传真/Fax:</strong> +86-871-63218066&emsp; <strong>邮编/Postcode:</strong> 650011</p>
      <p><strong>地址 /</strong> 中国 · 云南省 · 昆明市 · 北京路 1079#· 欣都龙城购物中心</p>
      <p><strong>Address: </strong>Xindu Longcheng VC Park, No. 1079 Beijing Rd., Kunming, Yunnan</p>
    </div></header>
    <table class="print-layout"><thead><tr><td></td></tr></thead><tbody><tr><td><main><h2>${text(headings[0])}</h2><table class="itinerary"><colgroup>${[10, 11, 8, 50, 13, 8].map(width => `<col style="width:${width}%">`).join("")}</colgroup><thead><tr>${columns.map(column => `<th>${escapeHtml(text(column))}</th>`).join("")}</tr></thead><tbody>${dayRows}</tbody></table>
    <h2>${text(headings[1])}</h2>${standard}
    <h2>${text(headings[2])}</h2>${quotationV5()}
    <h2>${text(headings[3])}</h2>${hotelsV5()}
    ${mileage.length ? `<h2>${text(headings[4])}</h2><table class="mileage"><colgroup>${[30, 16, 20, 34].map(width => `<col style="width:${width}%">`).join("")}</colgroup><thead><tr>${mileageHead.map(column => `<th>${column}</th>`).join("")}</tr></thead><tbody>${mileageRows}</tbody></table><p class="estimate">${en ? "Distances and travel times are estimates." : "里程及行车时间均为预计值。"}</p>` : ""}
    </main></td></tr></tbody><tfoot><tr><td></td></tr></tfoot></table><footer class="brand-footer">昆明霖熹旅行社有限公司<br>Kunming&emsp;Lynxtour Travel Agency Co., Ltd.</footer>
    </body></html>`;
}

export function websitePrintBlob(preview: WebsitePreview, language: "en" | "zh") {
  return new Blob([websitePrintHtml(language === "en" ? preview.english : preview.chinese, language)], { type: "text/html;charset=utf-8" });
}
export async function printWebsiteQuotation(quotation: WebsiteQuotation, language: "en" | "zh") {
  await printItineraryDocument({ blob: websitePrintBlob(quotation, language), fileName: `${quotation.code}-${language}.pdf`, generatedAt: quotation.confirmedAt });
}
