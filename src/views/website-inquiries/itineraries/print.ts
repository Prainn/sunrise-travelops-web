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
export function websitePrintHtml(output: WebsiteOutput, language: "en" | "zh", schemaVersion: WebsitePreview["schemaVersion"] = 4): string {
  const en = language === "en";
  // Schema 5：车型×酒店档次报价；历史 1–4 按其冻结结构原样渲染（保留方案分支）。
  const v5 = schemaVersion >= 5;
  const text = (key: PrintTextKey, params?: Record<string, string | number>) => printText(language, key, params);
  const headings = ["itineraryHeading", "standardsHeading", "quotationHeading", "hotelHeading", "mileageHeading"] as const;
  const columns = ["dayColumn", "departureColumn", "transportColumn", "sightseeingColumn", "overnightColumn", "mealsColumn"] as const;
  const paragraphs = (values: string[]) => values.map(value => `<p>${escapeHtml(value)}</p>`).join("");
  const dayRows = output.itinerary.map(day => `<tr>${[day.day, day.depart, day.transportation, day.sightseeing, day.hotel, day.meal]
    .map((value, index) => `<td class="${index === 3 ? "sightseeing" : "center"}">${escapeHtml(value)}</td>`).join("")}</tr>`).join("");
  const included = (category: string) => paragraphs(output.teamStandard?.find(row => row.category === category)?.included ?? []);
  // v5 司机/导游说明与报价车型由服务端写入 service/transport，前端只换标签不再拼接。
  const serviceLabel = v5 ? text("transportGuide") : en ? "Srv." : "服务";
  const transportLabel = v5 ? text("transportation") : en ? "T." : "交通";
  const standardWidths = v5 ? [11, 11, 34, 10, 34] : [12, 7, 38.5, 6.5, 36];
  const standard = output.teamStandard
    ? `<table class="standards"><colgroup>${standardWidths.map(width => `<col style="width:${width}%">`).join("")}</colgroup><tbody>
      <tr><th rowspan="3">${text("includes")}</th><th>${en ? "Hotel" : "酒店"}</th><td>${included("hotel")}</td><th>${text("mealsColumn")}</th><td>${included("meal")}</td></tr>
      <tr><th>${text("admission")}</th><td>${included("entry")}</td><th>${escapeHtml(serviceLabel)}</th><td>${included("service")}</td></tr>
      <tr><th>${escapeHtml(transportLabel)}</th><td colspan="3">${included("transport")}</td></tr>
      <tr><th>${text("excludes")}</th><td colspan="4">${paragraphs(output.exclusions)}</td></tr>
      </tbody></table>`
    : `<table><tbody><tr><th class="label">${text("includes")}</th><td>${paragraphs(output.inclusions)}</td></tr><tr><th>${text("excludes")}</th><td>${paragraphs(output.exclusions)}</td></tr></tbody></table>`;
  const quoteGroups = new Map<string, WebsiteOutput["quotation"]>();
  for (const quote of output.quotation) {
    const rows = quoteGroups.get(quote.vehicle) ?? [];
    rows.push(quote);
    quoteGroups.set(quote.vehicle, rows);
  }
  const componentLabels = en
    ? { hotel: "Hotel", guide: "Guide", vehicle: "Vehicle", attraction: "Attractions", meal: "Meals" }
    : { hotel: "酒店", guide: "导游", vehicle: "用车", attraction: "景点", meal: "餐食" };
  const quotes = [...quoteGroups].map(([vehicle, rows]) => {
    const plans = [...rows].sort((a, b) => (a.plan ?? "").localeCompare(b.plan ?? ""));
    // Historical schema 1 contains no structured plan, guest count or total.
    if (!plans.every(plan => plan.plan !== undefined)) return `<table class="quotation"><tbody><tr><th class="label">${escapeHtml(vehicle)}</th><td>${paragraphs(plans.map(plan => plan.price))}</td></tr></tbody></table>`;
    return `<table class="quotation"><colgroup><col style="width:13%">${plans.map(() => "<col>").join("")}</colgroup>
      <thead><tr><th>${escapeHtml(vehicle)}</th>${plans.map(plan => `<th class="plan">${escapeHtml(`${plan.plan}: ${plan.services}`)}</th>`).join("")}</tr></thead>
      <tbody><tr><th>${en ? "Quotation" : "报价人数"}</th>${plans.map(plan => `<td class="pax">${plan.pax == null ? (en ? "To be confirmed" : "未确定") : `${plan.pax} ${en ? "pax" : "人"}`}</td>`).join("")}</tr>
      <tr><th>${en ? "Tour fare / person" : "人均团费"}</th>${plans.map(plan => `<td>${escapeHtml(plan.price)}${(plan.priceComponents ?? []).map(component => `<p>${escapeHtml(componentLabels[component.category])}: RMB ${escapeHtml(component.unitPrice)} ${en ? "/ person" : "／人"}</p>`).join("")}</td>`).join("")}</tr>
      <tr><th>${en ? "Total tour fare" : "团费总额"}</th>${plans.map(plan => `<td>${plan.totalPrice == null ? (en ? "To be confirmed" : "未确定") : `RMB ${escapeHtml(plan.totalPrice)}`}</td>`).join("")}</tr></tbody></table>`;
  }).join("");
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
    const tables = [...groups].map(([category, rows]) => {
      const head = `<thead><tr><th colspan="3" class="quote-category">${escapeHtml(category)}</th></tr><tr>${(["vehicle", "perPerson", "groupTotal"] as const).map(key => `<th>${escapeHtml(text(key))}</th>`).join("")}</tr></thead>`;
      const body = rows.map(quote => `<tr class="quote-option"><td class="quote-vehicle">${escapeHtml(quote.vehicle)}</td>
        <td><strong>RMB ${money(quote.unitPrice ?? "")}</strong>${(quote.priceComponents ?? []).map(component => `<p class="quote-breakdown">${escapeHtml(text("componentPerPerson", { category: componentLabels[component.category] }))}: RMB ${money(component.unitPrice)}</p>`).join("")}</td>
        <td>${quote.totalPrice == null ? escapeHtml(text("toBeConfirmed")) : `RMB ${money(quote.totalPrice)}`}</td></tr>`).join("");
      return `<table class="quotation quotation-v5"><colgroup>${[34, 33, 33].map(width => `<col style="width:${width}%">`).join("")}</colgroup>${head}<tbody>${body}</tbody></table>`;
    }).join("");
    return `${meta}${tables || `<p class="empty">${escapeHtml(text("noQuotation"))}</p>`}`;
  };
  const noShopping = output.noShopping
    ? `<tr class="no-shopping"><td colspan="2"><strong>${escapeHtml(en ? output.noShopping.replace(/^no shopping([.!]?)$/i, "No shopping$1") : output.noShopping)}</strong></td></tr>`
    : "";
  const notes = `<table class="notes"><tbody><tr><th class="label">${text("notes")}</th><td>${output.notes.map((note, index) => `<p>${index + 1}. ${escapeHtml(note)}</p>`).join("")}</td></tr>${noShopping}</tbody></table>`;
  const cities = [...new Set(output.hotelOptions.map(row => row.city))];
  const hotelTables: string[] = [];
  for (let index = 0; index < cities.length; index += 4) {
    const group = cities.slice(index, index + 4);
    hotelTables.push(`<table class="hotels"><thead><tr>${group.map(city => `<th>${escapeHtml(city)}</th>`).join("")}</tr></thead><tbody><tr>${group.map(city => `<td>${output.hotelOptions.filter(hotel => hotel.city === city).map(hotel => `<p><strong>${escapeHtml(hotel.tier)}</strong> · ${escapeHtml(hotel.hotel)}${hotel.roomType ? `<br>${escapeHtml(hotel.roomType)}` : ""}</p>`).join("")}</td>`).join("")}</tr></tbody></table>`);
  }
  const hotelsV5 = () => {
    // 使用服务端合并后的 hotelOptions，仅按档次、起始日排序，不再去重。
    const sorted = [...output.hotelOptions].sort((a, b) => a.tier.localeCompare(b.tier) || (a.startDay ?? 0) - (b.startDay ?? 0));
    if (!sorted.length) return `<p class="empty">${escapeHtml(text("noHotels"))}</p>`;
    const tiers = [...new Set(sorted.map(hotel => hotel.tier))];
    const head = `<tr>${(["stay", "hotel", "roomType", "breakfast"] as const).map(key => `<th>${escapeHtml(text(key))}</th>`).join("")}</tr>`;
    return tiers.map((tier) => {
      const rows = sorted.filter(hotel => hotel.tier === tier);
      const body = rows.map((hotel) => {
        const days = hotel.startDay === undefined ? "" : hotel.endDay !== undefined && hotel.endDay !== hotel.startDay ? `D${hotel.startDay}–D${hotel.endDay}` : `D${hotel.startDay}`;
        const nights = hotel.nights === undefined ? "" : text(hotel.nights === 1 ? "night" : "nights", { count: hotel.nights });
        const stay = [days, hotel.city, nights].filter(Boolean).join(" · ");
        const breakfast = hotel.breakfastIncluded === undefined ? "-" : text(hotel.breakfastIncluded ? "breakfastIncluded" : "breakfastExcluded");
        return `<tr>${[stay, hotel.hotel, hotel.roomType || "-", breakfast].map(value => `<td>${escapeHtml(value)}</td>`).join("")}</tr>`;
      }).join("");
      return `<table class="hotels-v5"><colgroup>${[28, 36, 20, 16].map(width => `<col style="width:${width}%">`).join("")}</colgroup><thead><tr><th colspan="4" class="tier">${escapeHtml(rows[0]!.tierLabel ?? tier)}</th></tr>${head}</thead><tbody>${body}</tbody></table>`;
    }).join("");
  };
  const mileageHead = [text("routeColumn"), text("distanceColumn"), text("timeColumn"), text("transportColumn")];
  const mileages: string[] = [];
  const mileage = output.mileage ?? [];
  const mileageCells = (row: (typeof mileage)[number] | undefined) => {
    if (!row) return "<td></td>".repeat(4);
    const hours = Math.floor((row.durationMinutes ?? 0) / 60);
    const minutes = (row.durationMinutes ?? 0) % 60;
    const duration = row.durationMinutes == null ? (en ? "Not specified" : "未填写") : en ? `${hours ? `${hours} h` : ""}${minutes ? ` ${minutes} min` : ""}`.trim() : `${hours ? `${hours}小时` : ""}${minutes ? `${minutes}分钟` : ""}`;
    return [row.route, row.distanceKm == null ? (en ? "Not specified" : "未填写") : `${row.distanceKm} km`, duration, row.transport].map(value => `<td>${escapeHtml(value)}</td>`).join("");
  };
  for (let index = 0; index < mileage.length; index += 2) mileages.push(`<tr>${mileageCells(mileage[index])}${mileageCells(mileage[index + 1])}</tr>`);
  return `<!doctype html><html lang="${en ? "en" : "zh-CN"}"><head><meta charset="utf-8"><title>${escapeHtml(output.title)}</title>
    <style>
      @page { size: A4; margin: 0; }
      * { box-sizing: border-box; }
      html { background: #eee; }
      body { position: relative; width: 210mm; min-height: 297mm; margin: 0 auto; padding: 35mm 8.5mm 24mm; background: white; color: #000; font: 7.5pt/1.85 "Times New Roman", "Songti SC", serif; }
      .brand-header { position: absolute; top: 10mm; left: 8.5mm; right: 8.5mm; height: 22mm; display: flex; align-items: flex-start; gap: 8mm; background: url("${headerRule}") right bottom / 82% auto no-repeat; font: 9pt/1.65 Arial, "PingFang SC", sans-serif; color: #ffb380; }
      .brand-header img { display: block; width: auto; height: 21mm; margin-left: 8mm; object-fit: contain; }
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
      .plan { color: #0000ff; }
      .pax { font-weight: bold; }
      .label { width: 13%; }
      .quotation-notes { break-inside: avoid; }
      .notes { margin-top: 2mm; }
      .notes th { font-size: 9pt; }
      .hotels { margin-bottom: 2mm; }
      .hotels th { text-align: left; padding: 2mm 1.8mm; font-size: 9pt; }
      .hotels td { padding: 1mm 1.8mm 4mm; }
      .quote-meta { margin: 0 1mm 1mm; font: bold 7.5pt/1.5 Arial, "PingFang SC", sans-serif; }
      .quotation-v5 { margin: 0 0 2.5mm; font-size: 8.5pt; }
      .quotation-v5 th, .quotation-v5 td { border-color: #9ca3af; padding: 1.5mm 2mm; vertical-align: middle; }
      .quotation-v5 th { font-size: 8pt; }
      .quotation-v5 td { text-align: center; font-variant-numeric: tabular-nums; }
      .quotation-v5 .quote-category { font-size: 9pt; background: #f3f4f6; }
      .quotation-v5 .quote-vehicle { text-align: left; font-weight: bold; background: #f9fafb; }
      .quotation-v5 .quote-breakdown { margin-top: .8mm; font-size: 7.5pt; color: #4b5563; }
      .quote-option { break-inside: avoid; }
      .hotels-v5 { margin-bottom: 2mm; font-family: Arial, "PingFang SC", sans-serif; }
      .hotels-v5 th, .hotels-v5 td { line-height: 1.5; }
      .hotels-v5 .tier { text-align: left; font-size: 8pt; }
      .empty { margin: 0 1mm 2mm; }
      .mileage { font-size: 7pt; line-height: 1.4; }
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
    <table class="print-layout"><thead><tr><td></td></tr></thead><tbody><tr><td><main><h2>${text(headings[0])}</h2><table class="itinerary"><colgroup>${[8, 11, 8, 45, 13, 15].map(width => `<col style="width:${width}%">`).join("")}</colgroup><thead><tr>${columns.map(column => `<th>${escapeHtml(text(column))}</th>`).join("")}</tr></thead><tbody>${dayRows}</tbody></table>
    <h2>${text(headings[1])}</h2>${standard}
    <h2>${text(headings[2])}</h2>${v5 ? quotationV5() : quotes}<div class="quotation-notes">${notes}</div>
    <h2>${text(headings[3])}</h2>${v5 ? hotelsV5() : hotelTables.join("")}
    ${mileage.length ? `<h2>${text(headings[4])}</h2><table class="mileage"><colgroup>${[15, 8, 10, 17, 15, 8, 10, 17].map(width => `<col style="width:${width}%">`).join("")}</colgroup><thead><tr>${[...mileageHead, ...mileageHead].map(column => `<th>${column}</th>`).join("")}</tr></thead><tbody>${mileages.join("")}</tbody></table><p class="estimate">${en ? "Distances and travel times are estimates." : "里程及行车时间均为预计值。"}</p>` : ""}
    </main></td></tr></tbody><tfoot><tr><td></td></tr></tfoot></table><footer class="brand-footer">昆明霖熹旅行社有限公司<br>Kunming&emsp;Lynxtour Travel Agency Co., Ltd.</footer>
    </body></html>`;
}

export function websitePrintBlob(preview: WebsitePreview, language: "en" | "zh") {
  return new Blob([websitePrintHtml(language === "en" ? preview.english : preview.chinese, language, preview.schemaVersion)], { type: "text/html;charset=utf-8" });
}
export async function printWebsiteQuotation(quotation: WebsiteQuotation, language: "en" | "zh") {
  await printItineraryDocument({ blob: websitePrintBlob(quotation, language), fileName: `${quotation.code}-${language}.pdf`, generatedAt: quotation.confirmedAt });
}
