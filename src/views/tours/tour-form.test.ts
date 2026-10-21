import { describe, expect, it } from "vitest";
import type { TourRecord } from "@/types/tour";
import {
  createTourRequest,
  emptyTourForm,
  guideQuery,
  isGuideUnavailable,
  manualScheduleError,
  syncManualPickupDate,
  tourFormFromRecord,
  updateTourRequest,
  type TourFormState,
} from "./tour-form";

function manualForm(patch: Partial<TourFormState> = {}): TourFormState {
  return {
    ...emptyTourForm(),
    businessUnit: "shengxu",
    countryItemId: "country-1",
    collectCoordinatorId: "user-1",
    agencyId: "agency-1",
    itinerarySummary: "昆大丽9N10D",
    language: "英语",
    startDate: "2026-08-01",
    days: 10,
    operatorId: "user-2",
    pickupAt: "2026-08-01 15:20",
    dropAt: "2026-08-10 12:00",
    pickupFlightId: "flight-a",
    dropFlightId: "flight-b",
    ...patch,
  };
}

function manualTour(patch: Partial<TourRecord> = {}): TourRecord {
  return {
    id: "tour-1",
    tourNo: "YNSS-260801AS1-CHN",
    sourceModule: "manual",
    businessUnit: "shengxu",
    inquiryId: null,
    quoteId: null,
    itineraryId: null,
    inquiryCode: null,
    itineraryCode: null,
    quoteCode: null,
    itinerarySummary: "昆大丽9N10D",
    agencyId: "agency-1",
    agencyName: "某组团社",
    contactName: "",
    days: 10,
    startDate: "2026-08-01",
    pickupAt: "2026-08-01 15:20",
    dropAt: "2026-08-10 12:00",
    occupyFrom: "2026-08-01",
    occupyTo: "2026-08-10",
    countryItemId: "country-1",
    countryCode: "CHN",
    countryName: "中国",
    creatorId: "user-1",
    creatorTourCode: "AS",
    collectCoordinatorId: "user-1",
    collectCoordinatorName: "计调A",
    operatorId: "user-2",
    operatorName: "计调B",
    adults: 0,
    children: 0,
    leaders: 0,
    totalPeople: 0,
    language: "英语",
    shopping: false,
    scheduleMode: "manual",
    pickupFlightId: null,
    dropFlightId: null,
    pickupFlight: null,
    dropFlight: null,
    guideId: "guide-1",
    guideCode: "G1",
    guideName: "导游甲",
    remark: "",
    status: "active",
    cancelReason: null,
    version: 3,
    ...patch,
  };
}

describe("tour create requests", () => {
  it("sends manual source and manual times without inquiry, quote or flight fields", () => {
    const body = createTourRequest(manualForm(), { sourceModule: "manual" });

    expect(body).toMatchObject({
      sourceModule: "manual",
      scheduleMode: "manual",
      pickupAt: "2026-08-01 15:20",
      dropAt: "2026-08-10 12:00",
      adults: 0,
      children: 0,
      leaders: 0,
      manualSource: { businessUnit: "shengxu", itinerarySummary: "昆大丽9N10D", days: 10 },
    });
    for (const key of ["inquiryId", "quoteId", "pickupFlightId", "dropFlightId"])
      expect(body).not.toHaveProperty(key);
  });

  it("sends flight ids only when a manual tour uses flight mode", () => {
    const body = createTourRequest(manualForm({ scheduleMode: "flight" }), { sourceModule: "manual" });

    expect(body).toMatchObject({ scheduleMode: "flight", pickupFlightId: "flight-a", dropFlightId: "flight-b" });
    expect(body).not.toHaveProperty("pickupAt");
    expect(body).not.toHaveProperty("dropAt");
  });

  it("sends a resource ID for Shengxu and never sends an agency or free platform name for direct businesses", () => {
    const sx = createTourRequest(manualForm(), { sourceModule: "manual" });
    expect(sx).toHaveProperty("manualSource.agencyId", "agency-1");
    expect(sx).not.toHaveProperty("manualSource.agencyName");
    for (const businessUnit of ["linxi", "website"] as const) {
      const body = createTourRequest(manualForm({ businessUnit }), { sourceModule: "manual" });
      expect(body).not.toHaveProperty("manualSource.agencyId");
      expect(body).not.toHaveProperty("manualSource.agencyName");
    }
  });

  it("forces flight mode and omits manualSource for linked inquiries", () => {
    const body = createTourRequest(manualForm(), {
      sourceModule: "standard",
      inquiryId: "inquiry-1",
      quoteId: "quote-1",
    });

    expect(body).toMatchObject({ sourceModule: "standard", inquiryId: "inquiry-1", scheduleMode: "flight" });
    expect(body).not.toHaveProperty("manualSource");
    expect(body).not.toHaveProperty("pickupAt");
  });
});

describe("tour edit form", () => {
  it("rebuilds an empty-source, no-flight record without inventing flights", () => {
    const form = tourFormFromRecord(manualTour());

    expect(form).toMatchObject({ pickupFlightId: "", dropFlightId: "", countryItemId: "country-1", adults: 0 });
    expect(updateTourRequest(manualTour(), form)).toMatchObject({
      version: 3,
      scheduleMode: "manual",
      manualSource: { countryItemId: "country-1", collectCoordinatorId: "user-1" },
    });
  });

  it("does not send manualSource for linked tours", () => {
    const tour = manualTour({
      sourceModule: "standard",
      scheduleMode: "flight",
      pickupFlightId: "flight-a",
      dropFlightId: "flight-b",
    });

    const body = updateTourRequest(tour, tourFormFromRecord(tour));
    expect(body).not.toHaveProperty("manualSource");
    expect(body).toMatchObject({ scheduleMode: "flight", pickupFlightId: "flight-a" });
  });
});

describe("manual pickup date", () => {
  it("defaults to midnight and preserves the chosen time when moving the start date", () => {
    const form = manualForm({ startDate: "2026-10-21", pickupAt: "" });
    syncManualPickupDate(form);
    expect(form.pickupAt).toBe("2026-10-21 00:00");

    form.pickupAt = "2026-10-21 11:36";
    form.startDate = "2026-10-22";
    syncManualPickupDate(form);
    expect(form.pickupAt).toBe("2026-10-22 11:36");
  });

  it("leaves flight schedules and an empty start date unchanged", () => {
    for (const patch of [{ scheduleMode: "flight" as const }, { startDate: "" }]) {
      const form = manualForm(patch);
      const original = form.pickupAt;
      syncManualPickupDate(form);
      expect(form.pickupAt).toBe(original);
    }
  });

  it.each(["00:00", "11:36", "23:59"])("accepts any time on the start date (%s)", (time) => {
    expect(manualScheduleError("2026-10-21", `2026-10-21 ${time}`, "")).toBeNull();
  });

  it("rejects a different pickup day and a drop time before pickup", () => {
    expect(manualScheduleError("2026-10-21", "2026-10-22 00:00", "")).toBe("pickupDate");
    expect(manualScheduleError("2026-10-21", "2026-10-21 11:36", "2026-10-21 11:35")).toBe("dropOrder");
    expect(manualScheduleError("", "2026-10-21 11:36", "")).toBeNull();
  });
});

describe("guide availability", () => {
  const period = { businessUnit: "shengxu" as const, startDate: "2026-08-01", days: 10 };

  it("skips the request while required or valid manual times are missing", () => {
    expect(guideQuery(period, manualForm({ language: "" }))).toBeNull();
    expect(guideQuery(period, manualForm({ dropAt: "" }))).toBeNull();
    expect(guideQuery(period, manualForm({ pickupAt: "2026-08-02 09:00" }))).toBeNull();
    expect(guideQuery(period, manualForm({ dropAt: "2026-08-01 08:00" }))).toBeNull();
    expect(guideQuery(period, manualForm(), "tour-1")).toEqual({
      ...period,
      language: "英语",
      scheduleMode: "manual",
      pickupAt: "2026-08-01 15:20",
      dropAt: "2026-08-10 12:00",
      excludeTourId: "tour-1",
    });
  });

  it("keeps the selected guide when still available and flags it only after a real schedule change", () => {
    const tour = manualTour();
    const candidates = [{ id: "guide-1", code: "G1", name: "导游甲", language: null }];

    expect(isGuideUnavailable(tourFormFromRecord(tour), candidates, tour)).toBe(false);
    // 原导游、接送未变：候选缺失（已停用档案）也保留。
    expect(isGuideUnavailable(tourFormFromRecord(tour), [], tour)).toBe(false);
    const moved = { ...tourFormFromRecord(tour), startDate: "2026-08-02", pickupAt: "2026-08-02 15:20" };
    expect(isGuideUnavailable(moved, candidates, tour)).toBe(false);
    expect(isGuideUnavailable(moved, [], tour)).toBe(true);
    expect(isGuideUnavailable({ ...tourFormFromRecord(tour), language: "法语" }, [], tour)).toBe(true);
  });
});
