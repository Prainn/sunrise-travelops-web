import { describe, expect, it, vi } from "vitest";
import type { WebsiteOutput, WebsiteQuotation } from "@/types/website";
vi.mock("@/views/inquiries/itineraries/pdf", () => ({ printItineraryDocument: vi.fn() }));
import { printItineraryDocument } from "@/views/inquiries/itineraries/pdf";
import { printWebsiteQuotation, websitePrintBlob, websitePrintHtml } from "./print";

const empty: WebsiteOutput = { title: "Fixture", itinerary: [], inclusions: [], exclusions: [], hotelOptions: [], quotation: [], notes: [] };
describe("frozen report rendering", () => {
  it("escapes customer content and uses the frozen total without recomputing it", () => {
    const html = websitePrintHtml({
      ...empty,
      title: "<script>alert(1)</script>",
      notes: ["<img src=x onerror=alert(1)>", "Terms & conditions"],
      quotation: [{ vehicle: "7 seats", plan: "B", services: "Driver < guide", price: "RMB 10.00 PP", pax: 3, totalPrice: "29.99" }],
    }, "en");
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<img src=x");
    expect(html).toContain("&lt;img src=x onerror=alert(1)&gt;");
    expect(html).toContain("RMB 29.99");
    expect(html).not.toContain("RMB 30.00");
  });
  it("does not invent A/B, guests, totals or mileage for a schema 1 snapshot", () => {
    const html = websitePrintHtml({ ...empty, quotation: [{ vehicle: "7 seats", price: "RMB 10.00 PP" }] }, "en");
    expect(html).toContain("RMB 10.00 PP");
    expect(html).not.toContain("Total tour fare</th>");
    expect(html).not.toContain("5. Distance and travel time</h2>");
    expect(html).not.toContain("Private driver");
  });
});

it("renders only the frozen customer breakdown in both languages", () => {
  const output: WebsiteOutput = { ...empty, quotation: [{ vehicle: "7 seats", plan: "A", services: "Driver", price: "RMB 10000.00 PP", pax: 2, totalPrice: "20000.00", priceComponents: [{ category: "hotel", unitPrice: "2000.00" }, { category: "attraction", unitPrice: "2000.00" }] }] };
  const zh = websitePrintHtml(output, "zh");
  const en = websitePrintHtml(output, "en");
  expect(zh).toContain("酒店: RMB 2000.00 ／人");
  expect(zh).toContain("景点: RMB 2000.00 ／人");
  expect(en).toContain("Hotel: RMB 2000.00 / person");
  expect(en).toContain("Attractions: RMB 2000.00 / person");
  for (const html of [zh, en]) {
    expect(html).toContain("RMB 10000.00 PP");
    expect(html).toContain("RMB 20000.00");
    expect(html).not.toContain("Meals:");
    expect(html).not.toContain("导游:");
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
  const shopping = previewHtml.indexOf('<table class="no-shopping">');
  const hotels = previewHtml.indexOf('<table class="hotels-v5">');
  expect(notes).toBeLessThan(shopping);
  expect(shopping).toBeLessThan(hotels);
  expect(previewHtml).toContain(`<strong>${statement}</strong>`);
  expect(previewHtml).not.toContain(`3. ${statement}`);
  expect(previewHtml).not.toMatch(/Luxury|Comfort|Economy/);
  expect(previewHtml).toContain('class="tier">5-star</th>');
});

it("keeps historical frozen notes and labels without deriving a new statement", () => {
  const output: WebsiteOutput = { ...empty, notes: ["Peak season.", "Hotel substitution.", "NO SHOPPING."], quotation: [{ vehicle: "5-seat vehicle", hotelCategory: "Luxury 5-star", unitPrice: "5500.00", price: "RMB 5500.00 PP" }] };
  const html = websitePrintHtml(output, "en", 5);
  expect(html).toContain("3. NO SHOPPING.");
  expect(html).toContain("Luxury 5-star");
  expect(html).not.toContain('<table class="no-shopping">');
});
