import { describe, expect, it, vi } from "vitest";
import type { WebsiteOutput, WebsiteQuotation } from "@/types/website";
vi.mock("@/views/inquiries/itineraries/pdf", () => ({ printItineraryDocument: vi.fn() }));
import { printItineraryDocument } from "@/views/inquiries/itineraries/pdf";
import { printWebsiteQuotation, websitePrintBlob, websitePrintHtml } from "./print";

const empty: WebsiteOutput = { title: "Fixture", itinerary: [], inclusions: [], exclusions: [], hotelOptions: [], quotation: [], notes: [] };
describe("frozen report rendering", () => {
  it.each(["en", "zh"] as const)("renders a hotel-free quotation with overnight cities in %s", (language) => {
    const html = websitePrintHtml({
      ...empty,
      itinerary: [{ day: "D1", depart: "Kunming", transportation: "", sightseeing: "", hotel: "Kunming", meal: "" }],
      quotation: [{ vehicle: "7-seat vehicle", hotelTier: null, hotelCategory: language === "en" ? "No hotel arranged" : "未安排酒店", unitPrice: "500.00", totalPrice: "1500.00", pax: 3, price: "RMB 500.00 PP" }],
    }, language);
    expect(html).toContain(language === "en" ? "No hotel arranged." : "本行程未安排酒店。");
    expect(html).toContain("RMB 1,500.00");
    expect(html).toContain("Kunming");
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
    itinerary: [{ day: "2026-10-30", depart: "Kunming", transportation: "Private vehicle", sightseeing: "Visit Green Lake Park.", hotel: "Kunming", meal: "B" }],
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
  const notes = previewHtml.indexOf('<table class="notes">');
  const shopping = previewHtml.indexOf('<tr class="no-shopping">');
  const hotels = previewHtml.indexOf('<table class="hotels-v5">');
  expect(notes).toBeLessThan(shopping);
  expect(shopping).toBeLessThan(hotels);
  expect(previewHtml).toContain(`<strong>${statement}</strong>`);
  expect(previewHtml).not.toContain(`3. ${statement}`);
  expect(previewHtml).not.toMatch(/Luxury|Comfort|Economy/);
  expect(previewHtml).toContain('class="tier">5-star</th>');
  // 天数列按顺序输出 D{n}，不输出冻结日期。
  expect(previewHtml).toContain('<td class="center">D1</td>');
  expect(previewHtml).not.toContain("2026-10-30");
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

it("labels team standard rows as Driver & Guide and Transportation while quotations keep Vehicle", () => {
  const teamStandard = (["hotel", "meal", "entry", "service", "transport"] as const).map(category => ({ category, included: [] }));
  const output: WebsiteOutput = { ...empty, teamStandard, quotation: [{ vehicle: "7-seat vehicle", hotelCategory: "5-star", unitPrice: "800.00", price: "RMB 800.00 PP" }] };
  const en = websitePrintHtml(output, "en");
  expect(en).toContain("<th>Driver &amp; Guide</th>");
  expect(en).toContain("<th>Transportation</th>");
  expect(en).toContain("<th>Vehicle</th>");
  const zh = websitePrintHtml(output, "zh");
  expect(zh).toContain("<th>司机与导游</th>");
  expect(zh).toContain("<th>交通</th>");
});
