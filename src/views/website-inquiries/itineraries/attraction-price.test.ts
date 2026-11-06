import { describe, expect, it } from "vitest";
import type { WebsiteAttraction, WebsiteConfig, WebsiteDay, WebsiteItem } from "@/types/website";
import { emptyDay } from "../options";
import { attractionReferencePrice, formatAttractionPrice, websiteAttractionPriceReference } from "./attraction-price";

const attraction = (id: string, chargeable: boolean, price: string, kind: WebsiteAttraction["kind"] = "attraction") =>
  ({ id, chargeable, price, kind, status: "enabled" }) as WebsiteAttraction;
const config = { version: 7, attractions: [
  attraction("zero", true, "0.00"),
  attraction("tenth", true, "0.1", "component"),
  attraction("twenty", true, "0.20"),
  attraction("free", false, "0.00"),
  attraction("disabled", true, "5", "component"),
] } as WebsiteConfig;
config.attractions[4]!.status = "disabled";
const item = (id: string, attractionId: string | null, overrides: Partial<WebsiteItem> = {}): WebsiteItem =>
  ({ id, attractionId, nameZh: id, nameEn: id, descriptionZh: "", descriptionEn: "", appears: true, feeState: "INCLUDED", ...overrides });
function day(number: number, items: WebsiteItem[]): WebsiteDay {
  return { ...emptyDay(number), id: `day-${number}`, items };
}

describe("attraction price reference", () => {
  it("shows chargeable zero as 0.00 and hides free, manual or unlinked items", () => {
    expect(attractionReferencePrice(config, "zero")).toBe("0.00");
    expect(attractionReferencePrice(config, "free")).toBeNull();
    expect(attractionReferencePrice(config, null)).toBeNull();
    expect(attractionReferencePrice(config, "missing")).toBeNull();
    expect(formatAttractionPrice("0.00")).toBe("0.00");
    expect(formatAttractionPrice(null)).toBe("-");
    expect(formatAttractionPrice("1234567890123.40")).toBe("1,234,567,890,123.40");
  });

  it("sums every active occurrence in exact cents regardless of feeState, appears or status", () => {
    const days = [
      day(1, [item("a", "tenth"), item("b", "twenty", { feeState: "EXCLUDED", appears: false }), item("c", "free")]),
      day(2, [item("d", "tenth"), item("e", null), item("f", "missing"), item("g", "disabled"), item("h", "zero")]),
    ];
    const reference = websiteAttractionPriceReference(days, config);
    // 0.1 + 0.2 + 0.1 + 5 + 0：浮点会得到 5.4000000000000004。
    expect(reference.total).toBe("5.40");
    expect(reference.configVersion).toBe(7);
    expect(reference.items.map(row => [row.itemId, row.chargeable, row.price])).toEqual([
      ["a", true, "0.10"], ["b", true, "0.20"], ["c", false, null],
      ["d", true, "0.10"], ["e", null, null], ["f", null, null], ["g", true, "5.00"], ["h", true, "0.00"],
    ]);
  });

  it("returns 0.00 without chargeable items and supports totals beyond single-item limits", () => {
    expect(websiteAttractionPriceReference([day(1, [item("c", "free")])], config).total).toBe("0.00");
    const large = { version: 1, attractions: [attraction("max", true, "9999999999.99")] } as WebsiteConfig;
    const items = Array.from({ length: 3 }, (_, index) => item(`m${index}`, "max"));
    expect(websiteAttractionPriceReference([day(1, items)], large).total).toBe("29999999999.97");
  });
});
