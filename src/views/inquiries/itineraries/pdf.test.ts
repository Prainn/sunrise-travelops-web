import { getDayBreakfastStatus } from "./hotel-plans";
import { describe, expect, it, vi } from "vitest";
import { inquiries, itineraries } from "@/test-fixtures/inquiries";
import { createDefaultQuoteOption, createDefaultQuoteSettings } from "./quote-pricing";

vi.mock("html2canvas", () => ({ default: vi.fn() }));
vi.mock("jspdf", () => ({ jsPDF: vi.fn() }));
import { buildPdfHtml, getDailyMealCodes } from "./pdf";

describe("customer PDF content", () => {
  it("uses explicit meal choices even when the description mentions excluded meals", () => {
    const day = { ...itineraries[0].dailyPlans[0], description: "不含早餐、午餐和晚餐自理", meals: { breakfast: false, lunch: false, dinner: false } };
    expect(getDailyMealCodes(day)).toBe("");
    expect(getDailyMealCodes({ ...day, meals: { breakfast: true, lunch: true, dinner: true } })).toBe("B, L, D");
  });

  it("shows external fees and customer terms without exposing guide costs", () => {
    const itinerary = structuredClone(itineraries[0]);
    itinerary.adults = 12;
    itinerary.guidePlans = [{ destination: "昆明", guideId: "guide", guideName: "Guide", dailyPrice: 12345, secondLanguage: "en", shopping: false, serviceDays: 3 }];
    itinerary.quote = {
      ...createDefaultQuoteSettings(), chineseTip: 240, englishTip: 320,
      customerNotes: "<script>alert('note')</script>", holidayRestrictions: "春节期间不适用",
      transportFees: [
        { id: "one", type: "train", departureCity: "昆明", arrivalCity: "大理", cabin: "first", unitPrice: 185 },
        { id: "two", type: "train", departureCity: "丽江", arrivalCity: "昆明", cabin: "first", unitPrice: 308 },
        { id: "flight", type: "flight", departureCity: "新加坡", arrivalCity: "昆明", cabin: "economy", unitPrice: 1200 },
      ],
      options: [{ ...createDefaultQuoteOption("international_five_star", "standard"), adultUnitPrice: 4600 }],
    };
    itinerary.dailyPlans.forEach((day) => { day.meals = { breakfast: day.dayNumber > 1, lunch: false, dinner: false }; day.items = []; });
    const html = buildPdfHtml(itinerary, inquiries[0], "2026-09-08 10:00");
    expect(html).toContain("团费不含正餐");
    expect(html).toContain("185.00");
    expect(html).toContain("308.00");
    expect(html).toContain("240.00");
    expect(html).toContain("320.00");
    expect(html).toContain("经济舱");
    expect(html).toContain("春节期间不适用");
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("12,345");
    expect(html).not.toContain("12345");
    expect(html).toContain("55,200.00");
    itinerary.dailyPlans[1].meals.lunch = true;
    expect(buildPdfHtml(itinerary, inquiries[0], "now")).toContain("未标注的正餐自理");
  });
});

it("includes breakfast from a previous hotel night only", () => {
  const itinerary = structuredClone(itineraries[0]);
  itinerary.hotelPlans = [{ tier: "international_five_star", hotels: [{ destination: "昆明", hotelId: "hotel", hotelName: "酒店", rating: "international_five_star", breakfast: "", unit: "roomNight", unitCost: 300 }] }];
  itinerary.dailyPlans[0].overnightDestination = "昆明";
  expect(getDayBreakfastStatus(itinerary, 0)).toBe("excluded");
  expect(getDayBreakfastStatus(itinerary, 1)).toBe("included");
  itinerary.dailyPlans[0].overnightDestination = "";
  expect(getDayBreakfastStatus(itinerary, 1)).toBe("excluded");
});

it("shows pending breakfast until the prior night and every selected tier are known", () => {
  const plan = structuredClone(itineraries[0]);
  plan.hotelPlans = [];
  plan.dailyPlans[0].overnightDestination = null;
  expect(getDayBreakfastStatus(plan, 1)).toBe("pending");
  plan.dailyPlans[0].overnightDestination = "昆明";
  expect(getDayBreakfastStatus(plan, 1)).toBe("pending");
});

it("shows guide service days without inventing daily coverage", () => {
  const plan = structuredClone(itineraries[0]);
  plan.guidePlans = [{ destination: "昆明", guideId: "g", guideName: "Guide", dailyPrice: 9999, secondLanguage: "en", shopping: false, serviceDays: 3 }];
  plan.dailyPlans[0].overnightDestination = "昆明";
  const html = buildPdfHtml(plan, inquiries[0], "now");
  const daily = html.slice(0, html.indexOf("酒店与车型搭配"));
  expect(html).toContain("服务3天");
  expect(daily).not.toContain("当日不含导游服务");
  expect(daily).toMatch(/<td[^>]*>昆明<\/td>/);
  expect(daily).not.toContain("9999");
});

it('shows included expenses with a 60000 total and hides internal hotel costs', () => {
  const p = structuredClone(itineraries[0]); p.adults = 60; p.childrenCount = 0; p.leaderCount = 1;
  p.quote = { ...createDefaultQuoteSettings(), otherExpenses: 500, options: [{ ...createDefaultQuoteOption('international_five_star', 'standard'), adultUnitPrice: 1000 }] };
  const html = buildPdfHtml(p, inquiries[0], 'now');
  expect(html).toContain('60,000.00'); expect(html).not.toContain('60,500.00');
  expect(html).toContain('司陪费和其它支出（已含）'); expect(html).toContain('500.00');
  expect(html).not.toContain('领队住宿成本');
});
