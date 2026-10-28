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
