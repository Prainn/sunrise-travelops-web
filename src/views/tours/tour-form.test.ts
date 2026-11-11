import { describe, expect, it } from "vitest";
import type { TourGuideAvailability, TourGuideService, TourRecord } from "@/types/tour";
import {
  cancelReasonError,
  createTourRequest,
  emptyTourForm,
  guideAssignmentRequest,
  guideAvailabilityRequest,
  guideServiceChanged,
  guideServiceErrors,
  guideServiceInputs,
  guideServiceRowFromRecord,
  emptyGuideServiceRow,
  isGuideServiceUnavailable,
  isItinerarySummaryTooLong,
  ledgerTourInput,
  tourFormFromLedgerDraft,
  type LedgerTourDraft,
  outsideTeamWindow,
  type GuideServiceRow,
  manualScheduleError,
  syncLedgerDropDate,
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
    isSeriesSource: false,
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
    guideServices: [],
    remark: "",
    status: "active",
    cancelReason: null,
    directLedgerId: null,
    directLedgerOrderNo: null,
    canEdit: true,
    canCancel: false,
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

describe("ledger drop date", () => {
  it.each([
    ["2026-10-27", 3, "2026-10-29"],
    ["2026-10-27", 1, "2026-10-27"],
    ["2026-12-31", 2, "2027-01-01"],
    ["2028-02-28", 2, "2028-02-29"],
  ])("counts the start day for %s over %i days", (startDate, days, endDate) => {
    const form = manualForm({ startDate, days, pickupAt: `${startDate} 09:30`, dropAt: "" });
    syncLedgerDropDate(form);
    expect(form.dropAt).toBe(`${endDate} 09:30`);
  });

  it("updates the date while preserving the chosen drop time", () => {
    const form = manualForm({ startDate: "2026-10-27", days: 3, dropAt: "2026-10-28 18:45" });
    syncLedgerDropDate(form);
    expect(form.dropAt).toBe("2026-10-29 18:45");
    form.startDate = "2026-10-30";
    form.days = 4;
    syncLedgerDropDate(form);
    expect(form.dropAt).toBe("2026-11-02 18:45");
  });

  it("waits for a valid duration and start date, and leaves flight mode unchanged", () => {
    const patches: Partial<TourFormState>[] = [
      { days: null }, { days: 0 }, { days: 1.5 }, { days: 366 },
      { startDate: "" }, { scheduleMode: "flight" },
    ];
    for (const patch of patches) {
      const form = manualForm(patch);
      const original = form.dropAt;
      syncLedgerDropDate(form);
      expect(form.dropAt).toBe(original);
    }
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

function service(patch: Partial<TourGuideService> = {}): TourGuideService {
  return {
    id: "svc-1",
    tourId: "tour-1",
    guideId: "guide-1",
    guideName: "导游甲",
    guideCode: "G1",
    language: "英语",
    serviceStartDate: "2026-08-01",
    serviceEndDate: "2026-08-03",
    remark: "",
    timeSource: "manual",
    invalidDuration: false,
    outsideTourWindow: false,
    conflictConfirmation: null,
    createdAt: "2026-07-01T00:00:00Z",
    createdBy: "u1",
    updatedAt: "2026-07-01T00:00:00Z",
    updatedBy: "u1",
    ...patch,
  };
}
function row(patch: Partial<GuideServiceRow> = {}): GuideServiceRow {
  return {
    ...emptyGuideServiceRow(),
    guideId: "guide-1",
    language: "英语",
    serviceStartDate: "2026-08-01",
    serviceEndDate: "2026-08-03",
    ...patch,
  };
}

describe("guide service requests", () => {
  it("assigns guides without resubmitting manual source or changing saved tour fields", () => {
    const tour = manualTour({
      countryItemId: null,
      agencyId: null,
      adults: 7,
      children: 2,
      leaders: 1,
      shopping: true,
      remark: "原备注",
    });
    const services = [guideServiceRowFromRecord(service()), row({ guideId: "guide-2" })];
    const body = guideAssignmentRequest(tour, services);
    expect(body).toEqual({
      version: 3,
      operatorId: tour.operatorId,
      adults: 7,
      children: 2,
      leaders: 1,
      language: tour.language,
      shopping: true,
      remark: "原备注",
      scheduleMode: "manual",
      pickupAt: tour.pickupAt,
      dropAt: tour.dropAt,
      guideServices: guideServiceInputs(services),
    });
    expect(tour.guideServices).toEqual([]);
  });

  it("keeps linked tour flight IDs and version when assigning or clearing guides", () => {
    const tour = manualTour({ sourceModule: "website", scheduleMode: "flight", pickupFlightId: "a", dropFlightId: "b" });
    const body = guideAssignmentRequest(tour, []);
    expect(body).toMatchObject({ version: 3, scheduleMode: "flight", pickupFlightId: "a", dropFlightId: "b", guideServices: [] });
    expect(body).not.toHaveProperty("manualSource");
    expect(body).not.toHaveProperty("pickupAt");
    expect(body).not.toHaveProperty("dropAt");
  });

  it("always submits the whitelisted array; empty means explicitly none", () => {
    expect(createTourRequest(manualForm(), { sourceModule: "manual" })).toHaveProperty("guideServices", []);
    expect(updateTourRequest(manualTour(), manualForm())).toHaveProperty("guideServices", []);
    expect(createTourRequest(manualForm(), { sourceModule: "standard", inquiryId: "i", quoteId: "q" }))
      .toHaveProperty("guideServices", []);
  });

  it("keeps original IDs, omits IDs for new segments and never sends read-only fields", () => {
    const old = service({ timeSource: "legacy", invalidDuration: true, outsideTourWindow: true });
    const tour = manualTour({ guideServices: [old] });
    const form = tourFormFromRecord(tour);
    form.guideServices.push(row({ guideId: "guide-2", remark: " 接送 " }));
    const { guideServices } = updateTourRequest(tour, form);

    expect(guideServices).toEqual([
      {
        id: "svc-1",
        guideId: "guide-1",
        language: "英语",
        serviceStartDate: "2026-08-01",
        serviceEndDate: "2026-08-03",
        remark: "",
      },
      {
        guideId: "guide-2",
        language: "英语",
        serviceStartDate: "2026-08-01",
        serviceEndDate: "2026-08-03",
        remark: "接送",
      },
    ]);
    for (const item of guideServices)
      for (const key of ["timeSource", "guideName", "invalidDuration", "outsideTourWindow", "tourId", "createdAt"])
        expect(item).not.toHaveProperty(key);
  });

  it("sends confirmTime only for explicitly confirmed existing segments", () => {
    const legacy = guideServiceRowFromRecord(service({ timeSource: "legacy" }));
    expect(guideServiceInputs([legacy])[0]).not.toHaveProperty("confirmTime");
    legacy.confirmTime = true;
    expect(guideServiceInputs([legacy])[0]).toHaveProperty("confirmTime", true);
    expect(guideServiceInputs([row({ confirmTime: true })])[0]).not.toHaveProperty("confirmTime");
  });

  it("does not rewrite segments when the tour pickup/drop times change", () => {
    const tour = manualTour({ guideServices: [service()] });
    const form = tourFormFromRecord(tour);
    form.startDate = "2026-08-09";
    form.pickupAt = "2026-08-09 10:00";
    form.dropAt = "2026-08-12 10:00";
    expect(updateTourRequest(tour, form).guideServices[0]).toMatchObject({
      serviceStartDate: "2026-08-01",
      serviceEndDate: "2026-08-03",
    });
  });
});

describe("guide service validation", () => {
  it("allows the same guide in two non-overlapping segments and different guides to overlap", () => {
    const rows = [
      row(),
      row({ serviceStartDate: "2026-08-03", serviceEndDate: "2026-08-05" }),
      row({ guideId: "guide-2" }),
    ];
    expect(guideServiceErrors(rows)).toEqual([null, null, null]);
  });

  it("leaves same-guide date overlap to the server confirmation instead of blocking locally", () => {
    const rows = [row(), row({ serviceStartDate: "2026-08-03", serviceEndDate: "2026-08-04" })];
    expect(guideServiceErrors(rows)).toEqual([null, null]);
  });

  it("requires complete fields and an end date not before the start for new or changed segments", () => {
    expect(guideServiceErrors([row({ guideId: "" })])).toEqual(["incomplete"]);
    expect(guideServiceErrors([row({ serviceEndDate: "2026-08-01" })])).toEqual([null]);
    expect(guideServiceErrors([row({ serviceEndDate: "2026-07-31" })])).toEqual(["order"]);
  });

  it("keeps an unchanged invalid legacy segment but demands a valid range to confirm or adjust it", () => {
    const legacy = service({
      timeSource: "legacy",
      invalidDuration: true,
      serviceStartDate: "2026-08-02",
      serviceEndDate: "2026-08-01",
    });
    const kept = guideServiceRowFromRecord(legacy);
    expect(guideServiceErrors([kept])).toEqual([null]);
    expect(guideServiceInputs([kept])[0]).toMatchObject({ serviceEndDate: "2026-08-01" });
    kept.confirmTime = true;
    expect(guideServiceErrors([kept])).toEqual(["order"]);
    kept.confirmTime = false;
    kept.serviceEndDate = "2026-08-03";
    expect(guideServiceErrors([kept])).toEqual([null]);
  });

  it("flags windows only as a hint: segments may exceed the tour transfer window", () => {
    const window = { from: "2026-08-01 15:20", to: "2026-08-10 12:00" };
    expect(outsideTeamWindow(row({ serviceEndDate: "2026-08-09", serviceStartDate: "2026-08-02" }), window)).toBe(false);
    // 导游服务只比日期：接送当天仍在范围内，次日才提示。
    expect(outsideTeamWindow(row({ serviceEndDate: "2026-08-10" }), window)).toBe(false);
    expect(outsideTeamWindow(row({ serviceEndDate: "2026-08-11" }), window)).toBe(true);
    expect(outsideTeamWindow(row(), null)).toBe(false);
    expect(guideServiceErrors([row({ serviceEndDate: "2026-08-11" })])).toEqual([null]);
  });
});

describe("guide availability", () => {
  it("needs language and a valid date range; the name is optional and at most 150 characters", () => {
    const rows = [row({ language: "" }), row({ serviceEndDate: "2026-07-31" }), row()];
    expect(guideAvailabilityRequest("shengxu", rows, 0, "甲", 1)).toEqual({ ready: false, missing: "conditions" });
    expect(guideAvailabilityRequest("shengxu", rows, 1, "甲", 1)).toEqual({ ready: false, missing: "conditions" });
    expect(guideAvailabilityRequest(null, rows, 2, "甲", 1)).toEqual({ ready: false, missing: "conditions" });
    const blank = guideAvailabilityRequest("shengxu", rows, 2, "  ", 1);
    expect(blank).toMatchObject({ ready: true, query: { page: 1, pageSize: 20 } });
    expect(blank.ready && blank.query).not.toHaveProperty("keyword");
    expect(guideAvailabilityRequest("shengxu", rows, 2, "甲".repeat(151), 1)).toEqual({ ready: false, missing: "keywordTooLong" });
    expect(guideAvailabilityRequest("shengxu", rows, 2, ` ${"甲".repeat(150)} `, 2)).toMatchObject({ ready: true, query: { keyword: "甲".repeat(150), page: 2 } });
  });

  it("sends complete siblings with only 3 fields and maps each back to its full form row", () => {
    const rows = [
      row({ guideId: "", serviceStartDate: "", serviceEndDate: "" }),
      row({ guideId: "guide-2", serviceStartDate: "2026-08-05", serviceEndDate: "2026-08-05", remark: "x" }),
      row({ id: "svc-9", guideId: "guide-3", serviceStartDate: "2026-08-06", serviceEndDate: "2026-08-07" }),
      row({ guideId: "guide-4", serviceStartDate: "2026-08-09", serviceEndDate: "2026-08-08" }),
      row({ guideId: "guide-5", serviceStartDate: "2026-08-10", serviceEndDate: "2026-08-11" }),
    ];
    expect(guideAvailabilityRequest("shengxu", rows, 2, " 导游 ", 1, "tour-1")).toEqual({
      ready: true,
      siblingIndexes: [1, 4],
      query: {
        keyword: "导游",
        businessUnit: "shengxu",
        language: "英语",
        serviceStartDate: "2026-08-06",
        serviceEndDate: "2026-08-07",
        page: 1,
        pageSize: 20,
        excludeTourId: "tour-1",
        otherServices: [
          { guideId: "guide-2", serviceStartDate: "2026-08-05", serviceEndDate: "2026-08-05" },
          { guideId: "guide-5", serviceStartDate: "2026-08-10", serviceEndDate: "2026-08-11" },
        ],
      },
    });
    const single = guideAvailabilityRequest("shengxu", [row()], 0, "甲", 1);
    expect(single.ready && single.query).not.toHaveProperty("otherServices");
  });

  it("flags only guides the current preview reports unavailable, never ones missing from the search", () => {
    const guide = { id: "guide-1", code: "G1", name: "导游甲", language: "英语" };
    const other = { id: "guide-9", code: "G9", name: "导游乙", language: "英语" };
    const result = (patch: Partial<TourGuideAvailability>): TourGuideAvailability => ({
      status: "available", message: "", matchedCount: 0, total: 0, page: 1, pageSize: 20, list: [], unavailable: [], ...patch,
    });
    const blocked = result({ unavailable: [{ ...guide, canOverride: false, reasons: [{ code: "GUIDE_DISABLED", message: "" }] }] });
    expect(isGuideServiceUnavailable(row(), null)).toBe(false);
    expect(isGuideServiceUnavailable(row(), result({ list: [guide] }))).toBe(false);
    // 换搜索词后已选人员未命中：不判为不可用。
    expect(isGuideServiceUnavailable(row(), result({ list: [other] }))).toBe(false);
    expect(isGuideServiceUnavailable(row(), result({ status: "not_found" }))).toBe(false);
    expect(isGuideServiceUnavailable(row(), blocked)).toBe(true);
    const kept = guideServiceRowFromRecord(service());
    expect(isGuideServiceUnavailable(kept, blocked)).toBe(false);
    kept.remark = "仅改备注";
    expect(isGuideServiceUnavailable(kept, blocked)).toBe(false);
    kept.serviceEndDate = "2026-08-04";
    expect(guideServiceChanged(kept)).toBe(true);
    expect(isGuideServiceUnavailable(kept, blocked)).toBe(true);
  });
});

describe("cancelReasonError", () => {
  it("requires a trimmed reason of at most 500 characters", () => {
    expect([null, undefined, "", "   "].map(cancelReasonError)).toEqual(Array(4).fill("required"));
    expect(cancelReasonError(` ${"因".repeat(500)} `)).toBeNull();
    expect(cancelReasonError("因".repeat(501))).toBe("tooLong");
  });
});

describe("ledger tour form", () => {
  const draft: LedgerTourDraft = {
    mode: "convert",
    businessUnit: "linxi",
    collectCoordinatorId: "collector-1",
    collectCoordinatorName: "收客",
    operatorId: "operator-1",
    operatorName: "操作",
    countryItemId: "",
    countryName: "",
    startDate: "2026-12-01",
    itinerarySummary: "因".repeat(501),
    contactName: "",
    submit: async () => undefined,
  };

  it("defaults headcount to zero and keeps long itinerary intact", () => {
    const form = tourFormFromLedgerDraft(draft);

    expect([form.adults, form.children, form.leaders]).toEqual([0, 0, 0]);
    expect(form.itinerarySummary).toHaveLength(501);
    expect(isItinerarySummaryTooLong(form.itinerarySummary)).toBe(true);
    expect(form.pickupAt).toBe("2026-12-01 00:00");
    expect(form.scheduleMode).toBe("manual");
    expect(form.guideServices).toEqual([]);
  });

  it("does not build a request until country, days and headcount are explicit", () => {
    const form = { ...tourFormFromLedgerDraft(draft), itinerarySummary: "昆大丽", days: 5 };

    expect(ledgerTourInput(form)).toBeNull();
    expect(ledgerTourInput({ ...form, countryItemId: "country-1", adults: 2, children: 0, leaders: null })).toBeNull();
    expect(
      ledgerTourInput({
        ...form,
        countryItemId: "country-1",
        adults: 2,
        children: 0,
        leaders: 0,
        dropAt: "2026-12-05 12:00",
      }),
    ).toEqual({
      countryItemId: "country-1",
      contactName: "",
      itinerarySummary: "昆大丽",
      startDate: "2026-12-01",
      days: 5,
      adults: 2,
      children: 0,
      leaders: 0,
      language: "",
      shopping: false,
      remark: "",
      guideServices: [],
      scheduleMode: "manual",
      pickupAt: "2026-12-01 00:00",
      dropAt: "2026-12-05 12:00",
    });
  });
});
