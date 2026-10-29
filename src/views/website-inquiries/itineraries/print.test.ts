import { describe, expect, it, vi } from "vitest";
import type { WebsiteOutput } from "@/types/website";
vi.mock("@/views/inquiries/itineraries/pdf", () => ({ printItineraryDocument: vi.fn() }));
import { websitePrintHtml } from "./print";

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
    expect(html).not.toContain("5.MILEAGE</h2>");
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
