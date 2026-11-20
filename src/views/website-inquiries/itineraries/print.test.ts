import { describe, expect, it, vi } from "vitest";
import type { WebsiteOutput, WebsiteQuotation } from "@/types/website";
vi.mock("@/views/inquiries/itineraries/pdf", () => ({ printItineraryDocument: vi.fn() }));
import { printItineraryDocument } from "@/views/inquiries/itineraries/pdf";
import { printWebsiteQuotation, websitePrintBlob, websitePrintHtml } from "./print";

const empty: WebsiteOutput = { title: "Fixture", itinerary: [], inclusions: [], exclusions: [], hotelOptions: [], quotation: [], notes: [] };
it.each(["zh", "en"] as const)("uses the four frozen service dates and distinct hotel stays in %s", (language) => {
  const dates = ["2026-11-21", "2026-11-23", "2026-11-24", "2026-11-26"];
  const hotel = { tier: "A" as const, city: "Kunming", hotel: "Hotel", roomType: "Twin" };
  const guide = language === "zh" ? "2026-11-26：包含英语导游服务。" : "2026-11-26: Tour guide (English) included.";
  const html = websitePrintHtml({
    ...empty,
    itinerary: dates.map(day => ({ day, depart: "KM", sightseeing: "", transportation: "", hotel: "", meal: "" })),
    teamStandard: [{ category: "service", included: [guide] }],
    hotelOptions: [
      { ...hotel, startDay: 1, endDay: 1, startDate: dates[0], endDate: dates[0], nights: 1 },
      { ...hotel, startDay: 2, endDay: 3, startDate: dates[1], endDate: dates[2], nights: 2 },
    ],
  }, language);
  for (const date of dates) expect(html).toContain(`<td class="center">${date}</td>`);
  expect(html).toContain("2026-11-23–2026-11-24");
  expect(html).toContain(guide);
  expect(html).not.toMatch(/2026-11-(22|25)/);
});
describe("frozen report rendering", () => {
  it.each(["en", "zh"] as const)("renders a hotel-free quotation with overnight cities in %s", (language) => {
    const html = websitePrintHtml({
      ...empty,
      itinerary: ["D1", "D2"].map(day => ({ day, depart: "Kunming", transportation: "", sightseeing: "", hotel: "Kunming", meal: "" })),
      quotation: [{ vehicle: "7-seat vehicle", hotelTier: null, hotelCategory: language === "en" ? "No hotel arranged" : "未安排酒店", unitPrice: "500.00", totalPrice: "1500.00", pax: 3, price: "RMB 500.00 PP" }],
    }, language);
    expect(html).toContain(language === "en" ? "No hotel arranged." : "本行程未安排酒店。");
    expect(html).toContain("RMB 1,500.00");
    expect(html).toContain("Kunming");
    expect(html).toContain('<td class="center">D1</td>');
    expect(html).toContain('<td class="center">D2</td>');
    expect(html).not.toContain('<table class="hotels-v5">');
  });

  it("escapes customer content and uses the frozen total without recomputing it", () => {
    const html = websitePrintHtml({
      ...empty,
      title: "<script>alert(1)</script>",
      notes: ["<img src=x onerror=alert(1)>", "Terms & conditions"],
      quotation: [{ vehicle: "7 seats", hotelCategory: "5-star", price: "RMB 10.00 PP", unitPrice: "10.00", pax: 3, totalPrice: "29.99" }],
    }, "en");
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<img src=x");
    expect(html).toContain("&lt;img src=x onerror=alert(1)&gt;");
    expect(html).toContain("RMB 29.99");
    expect(html).not.toContain("RMB 30.00");
  });
});

it("renders only the frozen customer breakdown in both languages", () => {
  const output: WebsiteOutput = { ...empty, quotation: [{ vehicle: "7 seats", hotelCategory: "5-star", price: "RMB 10000.00 PP", unitPrice: "10000.00", pax: 2, totalPrice: "20000.00", priceComponents: [{ category: "hotel", unitPrice: "2000.00" }, { category: "attraction", unitPrice: "2000.00" }] }] };
  const zh = websitePrintHtml(output, "zh");
  const en = websitePrintHtml(output, "en");
  expect(en).toContain("Hotel (per person): RMB 2,000.00");
  expect(en).toContain("Attractions (per person): RMB 2,000.00");
  for (const html of [zh, en]) {
    expect(html).toContain("RMB 10,000.00");
    expect(html).toContain("RMB 20,000.00");
    expect(html.match(/class="quote-breakdown"/g)).toHaveLength(2);
  }
});

it.each(["en", "zh"] as const)("uses identical frozen HTML for %s preview and formal printing", async (language) => {
  const output: WebsiteOutput = {
    ...empty,
    itinerary: ["2026-10-31", "2026-11-01"].map(day => ({ day, depart: "Kunming", transportation: "Private vehicle", sightseeing: "Visit Green Lake Park.", hotel: "Kunming", meal: "B" })),
    quotation: [{ vehicle: "5-seat vehicle", hotelTier: "A", hotelCategory: "5-star", pax: 2, unitPrice: "5500.00", totalPrice: "11000.00", price: "RMB 5500.00 PP" }],
    hotelOptions: [{ tier: "A", tierLabel: "5-star", city: "Kunming", hotel: "JEN", roomType: "Twin", startDay: 1, endDay: 1, nights: 1, breakfastIncluded: true }],
    notes: ["Reconfirm peak-season arrangements.", "Same-category hotel substitution."],
    noShopping: "NO SHOPPING.",
  };
  const quotation: WebsiteQuotation = { itineraryId: "trip", sourceVersion: 3, inquiryVersion: 2, configVersion: 1, schemaVersion: 6, validationVersion: 5, issues: [], english: output, chinese: { ...output, noShopping: "无购物。" }, id: "quote", code: "WQT-TEST", confirmedAt: "2026-10-29T00:00:00Z", confirmedBy: "Test", acknowledgedWarnings: [] };
  const previewHtml = await websitePrintBlob(quotation, language).text();
  vi.mocked(printItineraryDocument).mockClear();
  await printWebsiteQuotation(quotation, language);
  const printDocument = vi.mocked(printItineraryDocument).mock.calls[0]![0];
  expect(await printDocument.blob.text()).toBe(previewHtml);
  expect(printDocument.fileName).toBe(`WQT-TEST-${language}.pdf`);
  const statement = language === "en" ? "No shopping." : "无购物。";
  const notes = previewHtml.indexOf('<tr class="quote-notes">');
  const shopping = previewHtml.indexOf('<tr class="no-shopping">');
  const hotels = previewHtml.indexOf('<table class="hotels-v5">');
  expect(notes).toBeLessThan(shopping);
  expect(shopping).toBeLessThan(hotels);
  expect(previewHtml).toContain(`<strong>${statement}</strong>`);
  expect(previewHtml).not.toContain(`3. ${statement}`);
  expect(previewHtml).not.toMatch(/Luxury|Comfort|Economy/);
  expect(previewHtml).toContain('class="tier">5-star</th>');
  expect(previewHtml).toContain('<td class="center">2026-10-31</td>');
  expect(previewHtml).toContain('<td class="center">2026-11-01</td>');
});

it("keeps historical frozen notes and labels without deriving a new statement", () => {
  const output: WebsiteOutput = { ...empty, notes: ["Peak season.", "Hotel substitution.", "NO SHOPPING."], quotation: [{ vehicle: "5-seat vehicle", hotelCategory: "Luxury 5-star", unitPrice: "5500.00", price: "RMB 5500.00 PP" }] };
  const html = websitePrintHtml(output, "en");
  expect(html).toContain("3. NO SHOPPING.");
  expect(html).toContain("Luxury 5-star");
  expect(html).not.toContain('<tr class="no-shopping">');
});

it("preserves frozen combination totals and visible zero-price components when grouping quotations", () => {
  const html = websitePrintHtml({
    ...empty,
    quotation: [
      { vehicle: "Custom <vehicle>", hotelCategory: "5-star", pax: 3, unitPrice: "1000.00", totalPrice: "2999.99", price: "RMB 1000.00 PP", priceComponents: [{ category: "hotel", unitPrice: "0.00" }] },
      { vehicle: "7-seat vehicle", hotelCategory: "4-star", pax: null, unitPrice: "800.00", totalPrice: null, price: "RMB 800.00 PP" },
    ],
  }, "en");
  expect(html).toContain("RMB 2,999.99");
  expect(html).not.toContain("RMB 3,000.00");
  expect(html).toContain("Hotel (per person): RMB 0.00");
  expect(html).toContain("To be confirmed");
  expect(html).toContain("Custom &lt;vehicle&gt;");
});

it("labels team standard rows as Driver, Guide and Transportation while quotations keep Vehicle", () => {
  const teamStandard = (["hotel", "meal", "entry", "service", "driver", "transport"] as const).map(category => ({ category, included: [] }));
  const output: WebsiteOutput = { ...empty, teamStandard, quotation: [{ vehicle: "7-seat vehicle", hotelCategory: "5-star", unitPrice: "800.00", price: "RMB 800.00 PP" }] };
  const en = websitePrintHtml(output, "en");
  expect(en).toContain("<th>Driver</th>");
  expect(en).toContain("<th>Guide</th>");
  expect(en).toContain("<th>Transportation</th>");
  expect(en).toContain('<th colspan="2">Vehicle</th>');
  const zh = websitePrintHtml(output, "zh");
  expect(zh).toContain("<th>司机</th>");
  expect(zh).toContain("<th>导游</th>");
  expect(zh).toContain("<th>交通</th>");
});

it("lays out driver and guide as separate 2x2 service-standard cells", () => {
  const html = websitePrintHtml({
    ...empty,
    teamStandard: [
      { category: "entry", included: ["Ticket A included."] },
      { category: "driver", included: ["Private driver included on D1."] },
      { category: "transport", included: ["Vehicle options: 7-seat vehicle."] },
      { category: "service", included: ["D1: Tour guide (English) included."] },
    ],
  }, "en");
  expect(html).toContain("<th>Tickets</th><td><p>Ticket A included.</p></td><th>Driver</th><td><p>Private driver included on D1.</p></td>");
  expect(html).toContain("<th>Transportation</th><td><p>Vehicle options: 7-seat vehicle.</p></td><th>Guide</th><td><p>D1: Tour guide (English) included.</p></td>");
  expect(html).not.toContain("Driver &amp; Guide");
});

it("closes the last quotation table with notes and no-shopping rows without fills", () => {
  const quote = { vehicle: "7-seat vehicle", unitPrice: "800.00", price: "RMB 800.00 PP" };
  const html = websitePrintHtml({ ...empty, notes: ["Peak season."], noShopping: "No shopping", quotation: [{ ...quote, hotelCategory: "5-star" }, { ...quote, hotelCategory: "4-star" }] }, "en");
  const tables = html.match(/<table class="quotation quotation-v5">[\s\S]*?<\/table>/g)!;
  expect(tables).toHaveLength(2);
  expect(tables[0]).not.toContain("quote-notes");
  expect(tables[1]).toContain('<tr class="quote-notes"><th class="label">Notes</th><td colspan="3"><p>1. Peak season.</p></td></tr><tr class="no-shopping"><td colspan="4">');
  expect(html).not.toContain('<table class="notes">');
  expect(html).not.toMatch(/background: #f[39]f[4a]f[6b]|#9ca3af/);
  const standalone = websitePrintHtml({ ...empty, notes: ["Peak season."] }, "en");
  expect(standalone).toContain('<table class="notes"><tbody><tr class="quote-notes"><th class="label">Notes</th><td colspan="1">');
});
