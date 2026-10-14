import { createRequire } from "node:module";
import { describe, expect, it, vi } from "vitest";
import type { InquiryRecord } from "@/types/inquiry";
import type { ItineraryRecord, PaxQuoteCalculation } from "@/types/itinerary";
import { generateItineraryWordDocument } from "./docx";
import { getDayBreakfastStatus } from "./hotel-plans";
import { buildPdfHtml } from "./pdf";
import { createDefaultQuoteSettings } from "./quote-pricing";

vi.mock("@/lang/utils", () => ({
  translate: (key: string) => key,
  translateIfExists: () => undefined,
}));

// Inspect the actual DOCX using the ZIP reader already shipped with docx.
const requireDocx = createRequire(createRequire(import.meta.url).resolve("docx"));
const zip = requireDocx("jszip") as {
  loadAsync(data: ArrayBuffer): Promise<{ file(path: string): { async(type: "string"): Promise<string> } }>;
};

function fixture(tier: number | string = 4) {
  // String tiers deliberately represent immutable snapshots created before the diamond migration.
  const itinerary = {
    code: "ITI-REGRESSION",
    title: "杭州两日游",
    childRate: 80,
    childWithoutBedRate: 60,
    hotelPlans: [{ tier, hotels: [{ destination: "杭州", hotelId: "old-hotel" }] }],
    vehiclePlans: [],
    guidePlans: [],
    dailyPlans: [0, 1].map((index) => ({
      id: `day-${index}`,
      date: `2026-10-${14 + index}`,
      departure: "杭州",
      destination: "杭州",
      overnightDestination: index === 0 ? "杭州" : "",
      description: "西湖游览",
      transport: "coach",
      meals: { breakfast: index > 0, lunch: false, dinner: false },
      items: [],
    })),
    quote: {
      ...createDefaultQuoteSettings(),
      chineseTip: 123.45,
      mealOtherReason: "不应导出内部调价原因",
      transportFees: [{ id: "flight", type: "flight", departureCity: "上海", arrivalCity: "杭州", cabin: "economy", unitPrice: 456.78 }],
    },
  } as unknown as ItineraryRecord;
  const calculation = {
    pricingVersion: 2,
    options: [{
      optionId: "option",
      hotelTier: tier,
      vehicleTier: "standard",
      paxPrices: [10, 20].map((pax) => ({
        pax, adultUnitPrice: 1000, childUnitPrice: 800, childWithoutBedUnitPrice: 600,
        singleSupplementUnitCost: 150, tipUnitPrice: 123.45, profitPerPerson: 987.65,
      })),
    }],
  } as PaxQuoteCalculation;
  return { itinerary, snapshot: { calculation, quoteCode: "ITI-REGRESSION-V1", quoteVersion: 1 } };
}

async function exportText(sample: ReturnType<typeof fixture>, children: boolean) {
  const html = buildPdfHtml(sample.itinerary, {} as InquiryRecord, "2026-10-14", sample.snapshot, children);
  const word = await generateItineraryWordDocument(sample.itinerary, sample.snapshot, children);
  const archive = await zip.loadAsync(await word.blob.arrayBuffer());
  return [html, await archive.file("word/document.xml").async("string")];
}

describe("customer quotation exports", () => {
  it.each([false, true])("omits tips with children=%s without changing frozen values", async (children) => {
    const sample = fixture();
    const before = structuredClone(sample);
    for (const output of await exportText(sample, children)) {
      expect(output).not.toContain("小费");
      expect(output).not.toContain("123.45");
      expect(output).toContain("1,000.00");
      expect(output).toContain("456.78");
      expect(output.includes("800.00")).toBe(children);
      expect(output.includes("600.00")).toBe(children);
      expect(output).not.toContain("987.65");
      expect(output).not.toContain("不应导出内部调价原因");
    }
    expect(sample).toEqual(before);
  });

  it("omits second-language tips in both formats", async () => {
    const sample = fixture();
    sample.itinerary.quote.chineseTip = null;
    sample.itinerary.quote.englishTip = 123.45;
    for (const output of await exportText(sample, false)) {
      expect(output).not.toContain("小费");
      expect(output).not.toContain("123.45");
    }
  });

  it.each([null, 0])("omits a %s tip in both formats", async (tip) => {
    const sample = fixture();
    sample.itinerary.quote.chineseTip = tip;
    for (const output of await exportText(sample, false)) expect(output).not.toContain("全程小费");
  });

  it.each(["international_five_star", "preferred_non_five_star", 3, 4, 5])("keeps breakfast for saved hotel tier %s", async (tier) => {
    const sample = fixture(tier);
    expect(getDayBreakfastStatus(sample.itinerary, 0)).toBe("excluded");
    expect(getDayBreakfastStatus(sample.itinerary, 1)).toBe("included");
    for (const output of await exportText(sample, true)) {
      expect(output).not.toContain("早餐待确认");
      expect(output).toMatch(/>B</);
    }
  });

  it("still marks an overnight stay without a hotel as pending", () => {
    const { itinerary } = fixture();
    itinerary.hotelPlans = [];
    expect(getDayBreakfastStatus(itinerary, 1)).toBe("pending");
    itinerary.dailyPlans[0].overnightDestination = "";
    expect(getDayBreakfastStatus(itinerary, 1)).toBe("excluded");
  });
});
