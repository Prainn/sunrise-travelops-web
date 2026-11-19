import { createRequire } from "node:module";
import { describe, expect, it, vi } from "vitest";
import type { InquiryRecord } from "@/types/inquiry";
import type { CustomerPresentation, ItineraryRecord, ItineraryQuoteCalculation } from "@/types/itinerary";
import { buildCustomerDocument, type CustomerSnapshot } from "./customer-document";
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
  } as ItineraryQuoteCalculation;
  return { itinerary, snapshot: { calculation, quoteCode: "ITI-REGRESSION-V1", quoteVersion: 1 } };
}

async function exportText(sample: ReturnType<typeof fixture>, children: boolean, options: CustomerSnapshot = {}) {
  const snapshot = { ...sample.snapshot, ...options };
  const html = buildPdfHtml(sample.itinerary, (options.inquiry ?? {}) as InquiryRecord, "2026-10-14", snapshot, children);
  const word = await generateItineraryWordDocument(sample.itinerary, snapshot, children);
  const archive = await zip.loadAsync(await word.blob.arrayBuffer());
  return [html, await archive.file("word/document.xml").async("string")];
}

describe("customer quotation exports", () => {
  it.each([false, true])("shows series day numbers and the return day in both formats (frozen=%s)", async (frozen) => {
    const sample = fixture();
    sample.itinerary.customerDisplayMode = "returnArrival";
    sample.itinerary.returnArrivalText = "返回温馨的家";
    const content: CustomerPresentation["zh"] = {
      title: sample.itinerary.title,
      country: "中国",
      days: sample.itinerary.dailyPlans.map((day, index) => ({
        ...day, dayNumber: index + 1, route: [day.departure], description: day.description ?? "",
        overnightDestination: day.overnightDestination ?? "", items: [],
      })),
      returnArrival: { dayNumber: 3, date: "2026-10-16", text: sample.itinerary.returnArrivalText },
      hotels: [], notes: [], transportFees: [],
    };
    const customerPresentation = frozen ? {
      version: 1 as const, serviceDays: 2, displayDays: 3, accommodationNights: 1,
      noAccommodation: false, missingEnglish: [], zh: content, en: content,
    } : undefined;
    for (const output of await exportText(sample, false, { inquiry: { isSeries: true }, customerPresentation })) {
      expect(output).toMatch(/>D1</);
      expect(output).toMatch(/>D2</);
      expect(output).toMatch(/>D3</);
      expect(output).toContain("返回温馨的家");
      expect(output).not.toMatch(/>1[456]\/10</);
    }
    for (const output of await exportText(sample, false, { inquiry: { isSeries: false }, customerPresentation })) {
      expect(output).toMatch(/>14\/10</);
      expect(output).toMatch(/>16\/10</);
    }
  });

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
    itinerary.dailyPlans[0]!.overnightDestination = "";
    expect(getDayBreakfastStatus(itinerary, 1)).toBe("excluded");
  });
});

it("exports missing English as blank in both formats, including snapshots without English", async () => {
  const sample = fixture();
  sample.itinerary.customerDisplayMode = "returnArrival";
  const customer = buildCustomerDocument(sample.itinerary, { exportLanguage: "en" });
  expect(customer.title).toBe("");
  expect(customer.schedule).toHaveLength(3);
  expect(customer.schedule[0]).toMatchObject({ route: "", transport: "", description: "", hotel: "" });
  expect(customer.schedule[2]!.description).toBe("");
  for (const output of await exportText(sample, true, { exportLanguage: "en" })) {
    for (const source of ["杭州两日游", "西湖游览", "上海", "杭州", "不应导出内部调价原因"])
      expect(output).not.toContain(source);
    expect(output).toContain("1,000.00");
  }
});

describe("customer hotel column and single supplement", () => {
  function kunmingPresentation() {
    const day = (index: number, name: string, nameEn: string) => ({
      id: `day-${index}`, dayNumber: index + 1, date: `2026-10-${14 + index}`, route: ["昆明"],
      transport: "", description: "游览", overnightDestination: "昆明",
      hotels: [{ tier: 4, name }, { tier: 5, name: nameEn }],
      meals: { breakfast: index > 0, lunch: false, dinner: false }, items: [],
    });
    const zh: CustomerPresentation["zh"] = {
      title: "昆明", country: "中国", hotels: [], notes: [], transportFees: [], returnArrival: null,
      days: [day(0, "春城酒店", "滇池酒店"), day(1, "翠湖酒店", "")],
    };
    const en: CustomerPresentation["en"] = {
      ...zh,
      days: [day(0, "Spring Hotel", "Lake Hotel"), day(1, "Green Lake Hotel", "")]
        .map((night) => ({ ...night, overnightDestination: "Kunming" })),
    };
    return {
      version: 1 as const, serviceDays: 2, displayDays: 2, accommodationNights: 2,
      noAccommodation: false, missingEnglish: [], zh, en,
    } satisfies CustomerPresentation;
  }

  it("lists that night's hotel per tier for the same city on different nights", async () => {
    const sample = fixture();
    const customerPresentation = kunmingPresentation();
    const zh = buildCustomerDocument(sample.itinerary, { customerPresentation });
    expect(zh.schedule.map((row) => row.hotel)).toEqual([
      "昆明\n四钻：春城酒店\n五钻：滇池酒店",
      "昆明\n四钻：翠湖酒店",
    ]);
    const en = buildCustomerDocument(sample.itinerary, { customerPresentation, exportLanguage: "en" });
    expect(en.schedule[1]!.hotel).toBe("Kunming\n4-Diamond: Green Lake Hotel");
    const [html = "", word = ""] = await exportText(sample, false, { customerPresentation });
    expect(html).toContain("昆明\n四钻：春城酒店\n五钻：滇池酒店");
    expect(word).toMatch(/>四钻：翠湖酒店</);
  });

  it("keeps a known English hotel when the city translation is missing", () => {
    const sample = fixture();
    const customerPresentation = kunmingPresentation();
    customerPresentation.en.days[0]!.overnightDestination = "";
    const en = buildCustomerDocument(sample.itinerary, { customerPresentation, exportLanguage: "en" });
    expect(en.schedule[0]!.hotel).toBe("4-Diamond: Spring Hotel\n5-Diamond: Lake Hotel");
  });

  it("matches a city-based frozen selection by its original city in an English document", () => {
    const { itinerary } = fixture();
    const presentation: CustomerPresentation = kunmingPresentation();
    delete presentation.en.days[0]!.hotels;
    presentation.en.days[0]!.overnightDestination = "Hangzhou";
    presentation.en.hotels = [{ hotelId: "old-hotel", name: "West Lake Hotel", destination: "Hangzhou" }];
    const en = buildCustomerDocument(itinerary, { customerPresentation: presentation, exportLanguage: "en" });
    expect(en.schedule[0]!.hotel).toBe("Hangzhou\n4-Diamond: West Lake Hotel");
  });

  it("falls back to the frozen hotel only when the night's hotel is unique", () => {
    const sample = fixture();
    sample.itinerary.dailyPlans[1]!.overnightDestination = "杭州";
    sample.itinerary.hotelPlans = [
      { tier: 4, hotels: [{ destination: "杭州", hotelId: "h1", hotelName: "西湖酒店" }] },
      { tier: 5, hotels: [
        { destination: "杭州", hotelId: "h2", hotelName: "湖滨酒店" },
        { destination: "杭州", hotelId: "h3", hotelName: "灵隐酒店" },
      ] },
    ] as unknown as ItineraryRecord["hotelPlans"];
    const rows = buildCustomerDocument(sample.itinerary).schedule;
    expect(rows.map((row) => row.hotel)).toEqual(["杭州\n四钻：西湖酒店", "杭州\n四钻：西湖酒店"]);
    // 已按住宿日保存的酒店优先于城市匹配。
    sample.itinerary.hotelPlans[1]!.hotels[0]!.dayId = "day-1";
    expect(buildCustomerDocument(sample.itinerary).schedule[1]!.hotel).toBe("杭州\n四钻：西湖酒店\n五钻：湖滨酒店");
  });

  it("keeps the sight-seeing and hotel columns equally wide in both formats", async () => {
    const [html = "", word = ""] = await exportText(fixture(), false);
    expect(html.match(/<col style="width:31%;">/g)).toHaveLength(2);
    expect(word).toContain('<w:tblLayout w:type="fixed"/>');
    expect(word.match(/<w:gridCol w:w="3339"\/>/g)).toHaveLength(2);
  });

  it.each([
    [1685, "1,685.00"],
    [0, "0.00"],
    [null, "150.00"],
  ])("exports single supplement quote %s as %s without changing other prices", async (quote, shown) => {
    const sample = fixture();
    sample.snapshot.calculation.options[0]!.paxPrices.forEach((price) => { price.singleSupplementQuote = quote; });
    for (const output of await exportText(sample, false)) {
      expect(output).toContain(`RMB ${shown}`);
      expect(output).toContain("RMB 1,000.00");
      if (quote !== null) expect(output).not.toContain("RMB 150.00");
    }
  });
});
