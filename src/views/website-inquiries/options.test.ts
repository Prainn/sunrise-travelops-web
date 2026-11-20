import { describe, expect, it, vi } from "vitest";
import { isReactive, reactive } from "vue";
import { websiteInquiryInput } from "@/services/website.service";
import { cloneWebsiteDraft, emptyInquiry, emptyItinerary } from "./options";
import { inquiryDatesInput, selectServiceDates, setServiceDates, switchToConsecutiveDates } from "./inquiry-dates";
import { serviceDateRanges, serviceDayDate } from "@/utils/service-dates";

vi.mock("@/api/request", () => ({
  ApiError: class extends Error {},
  request: {},
}));

describe("website draft cloning", () => {
  it("copies a reactive draft without sharing its nested arrays", () => {
    const draft = reactive({ ...emptyInquiry(), destinations: ["昆明"] });

    const copy = cloneWebsiteDraft(draft);
    copy.destinations.push("大理");

    expect(isReactive(copy)).toBe(false);
    expect(draft.destinations).toEqual(["昆明"]);
    expect(copy.destinations).toEqual(["昆明", "大理"]);
  });

  it("clones a plain object spread from a reactive draft with nested proxies", () => {
    const draft = reactive({ vehicleOptions: [{ vehicleType: "5", durationMinutes: 60 }] });

    const copy = cloneWebsiteDraft({ ...draft, distanceKm: "50" });
    copy.vehicleOptions[0]!.durationMinutes = 80;

    expect(isReactive(copy.vehicleOptions)).toBe(false);
    expect(draft.vehicleOptions[0]?.durationMinutes).toBe(60);
  });

  it("clones mapped inquiry input containing reactive destinations", () => {
    const draft = reactive({ ...emptyInquiry(), destinations: ["昆明"] });

    const copy = cloneWebsiteDraft(websiteInquiryInput(draft));
    copy.destinations.push("大理");

    expect(draft.destinations).toEqual(["昆明"]);
    expect(copy).toHaveProperty("ownerId", undefined);
  });
});

describe("独立站询盘日期", () => {
  it("把乱序点选的日期写入请求，重开按真实服务日显示，并可显式切回连续", () => {
    const form = { ...emptyInquiry(), startDate: "2026-11-21", plannedDays: 8 };
    selectServiceDates(form);
    expect(form.serviceDates).toEqual(["2026-11-21"]);
    setServiceDates(form, ["2026-11-26", "2026-11-21", "2026-11-24", "2026-11-23", "2026-11-24"]);
    const saved = websiteInquiryInput({ ...form, ...inquiryDatesInput(form, true) });
    expect(saved).toMatchObject({ startDate: "2026-11-21", plannedDays: 4, serviceDates: ["2026-11-21", "2026-11-23", "2026-11-24", "2026-11-26"] });
    const reopened = cloneWebsiteDraft(saved);
    const plan = emptyItinerary(reopened, 1, "Trip");
    expect(serviceDayDate(plan, 4)).toBe("2026-11-26");
    switchToConsecutiveDates(reopened);
    expect(inquiryDatesInput(reopened, true)).toEqual({ startDate: "2026-11-21", plannedDays: 4, serviceDates: null });
    expect(serviceDayDate(reopened, 4)).toBe("2026-11-24");
  });

  it("区分空选、连续及霖熹来源，并按自然日展示跨月跨年清单", () => {
    const form = emptyInquiry();
    selectServiceDates(form);
    setServiceDates(form, undefined);
    expect(inquiryDatesInput(form, true)).toMatchObject({ serviceDates: [], plannedDays: 0 });
    setServiceDates(form, ["2027-01-03", "2027-01-01", "2026-12-31"]);
    expect(serviceDateRanges(form.serviceDates!)).toEqual(["2026-12-31 ~ 2027-01-01", "2027-01-03"]);
    expect(JSON.parse(JSON.stringify(inquiryDatesInput(form, false)))).toEqual({ startDate: null, plannedDays: 1 });
  });
});
