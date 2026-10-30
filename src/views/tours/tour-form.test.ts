import { describe, expect, it } from "vitest";
import type { TourGuideService, TourRecord } from "@/types/tour";
import {
  createTourRequest,
  emptyTourForm,
  guideAssignmentRequest,
  guideAvailabilityQuery,
  guideServiceChanged,
  guideServiceErrors,
  guideServiceInputs,
  guideServiceRowFromRecord,
  emptyGuideServiceRow,
  isGuideServiceUnavailable,
  outsideTeamWindow,
  type GuideServiceRow,
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
    guideServices: [],
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

function service(patch: Partial<TourGuideService> = {}): TourGuideService {
  return {
    id: "svc-1",
    tourId: "tour-1",
    guideId: "guide-1",
    guideName: "导游甲",
    guideCode: "G1",
    language: "英语",
    serviceStartAt: "2026-08-01 09:00",
    serviceEndAt: "2026-08-03 12:00",
    remark: "",
    timeSource: "manual",
    invalidDuration: false,
    outsideTourWindow: false,
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
    serviceStartAt: "2026-08-01 09:00",
    serviceEndAt: "2026-08-03 12:00",
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
        serviceStartAt: "2026-08-01 09:00",
        serviceEndAt: "2026-08-03 12:00",
        remark: "",
      },
      {
        guideId: "guide-2",
        language: "英语",
        serviceStartAt: "2026-08-01 09:00",
        serviceEndAt: "2026-08-03 12:00",
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
      serviceStartAt: "2026-08-01 09:00",
      serviceEndAt: "2026-08-03 12:00",
    });
  });
});

describe("guide service validation", () => {
  it("allows the same guide in two non-overlapping segments and different guides to overlap", () => {
    const rows = [
      row(),
      row({ serviceStartAt: "2026-08-03 12:01", serviceEndAt: "2026-08-05 10:00" }),
      row({ guideId: "guide-2" }),
    ];
    expect(guideServiceErrors(rows)).toEqual([null, null, null]);
  });

  it("rejects same-minute handover and overlap for one guide", () => {
    const rows = [row(), row({ serviceStartAt: "2026-08-03 12:00", serviceEndAt: "2026-08-04 12:00" })];
    expect(guideServiceErrors(rows)).toEqual(["overlap", "overlap"]);
  });

  it("requires complete fields and a positive duration for new or changed segments", () => {
    expect(guideServiceErrors([row({ guideId: "" })])).toEqual(["incomplete"]);
    expect(guideServiceErrors([row({ serviceEndAt: "2026-08-01 09:00" })])).toEqual(["order"]);
  });

  it("keeps an unchanged zero-duration legacy segment but demands a real duration to confirm or adjust it", () => {
    const legacy = service({
      timeSource: "legacy",
      invalidDuration: true,
      serviceStartAt: "2026-08-01 15:20",
      serviceEndAt: "2026-08-01 15:20",
    });
    const kept = guideServiceRowFromRecord(legacy);
    expect(guideServiceErrors([kept])).toEqual([null]);
    expect(guideServiceInputs([kept])[0]).toMatchObject({ serviceEndAt: "2026-08-01 15:20" });
    kept.confirmTime = true;
    expect(guideServiceErrors([kept])).toEqual(["order"]);
    kept.confirmTime = false;
    kept.serviceEndAt = "2026-08-01 18:00";
    expect(guideServiceErrors([kept])).toEqual([null]);
  });

  it("flags windows only as a hint: segments may exceed the tour transfer window", () => {
    const window = { from: "2026-08-01 15:20", to: "2026-08-10 12:00" };
    expect(outsideTeamWindow(row({ serviceEndAt: "2026-08-09 12:00", serviceStartAt: "2026-08-02 00:00" }), window)).toBe(false);
    // 游客 10 号离境但服务 9 号结束；27 号凌晨航班但 26 号结束，均不依赖团队时间。
    expect(outsideTeamWindow(row({ serviceEndAt: "2026-08-10 12:01" }), window)).toBe(true);
    expect(outsideTeamWindow(row(), null)).toBe(false);
    expect(guideServiceErrors([row({ serviceEndAt: "2026-08-10 12:01" })])).toEqual([null]);
  });
});

describe("guide availability", () => {
  it("needs language and a strictly positive range for the queried segment", () => {
    const rows = [row({ language: "" }), row({ serviceEndAt: "2026-08-01 09:00" }), row()];
    expect(guideAvailabilityQuery("shengxu", rows, 0)).toBeNull();
    expect(guideAvailabilityQuery("shengxu", rows, 1)).toBeNull();
    expect(guideAvailabilityQuery(null, rows, 2)).toBeNull();
  });

  it("sends all other filled siblings with only 3 fields, excluding the queried one", () => {
    const rows = [
      row({ guideId: "", serviceStartAt: "", serviceEndAt: "" }),
      row({ guideId: "guide-2", serviceStartAt: "2026-08-05 08:00", serviceEndAt: "2026-08-05 08:00", remark: "x" }),
      row({ id: "svc-9", guideId: "guide-3", serviceStartAt: "2026-08-06 08:00", serviceEndAt: "2026-08-07 08:00" }),
    ];
    expect(guideAvailabilityQuery("shengxu", rows, 2, "tour-1")).toEqual({
      businessUnit: "shengxu",
      language: "英语",
      serviceStartAt: "2026-08-06 08:00",
      serviceEndAt: "2026-08-07 08:00",
      excludeTourId: "tour-1",
      otherServices: [
        { guideId: "guide-2", serviceStartAt: "2026-08-05 08:00", serviceEndAt: "2026-08-05 08:00" },
      ],
    });
    expect(guideAvailabilityQuery("shengxu", [row()], 0)).not.toHaveProperty("otherServices");
  });

  it("flags an unavailable guide only for new or adjusted segments, keeping unchanged archived guides", () => {
    const candidates = [{ id: "guide-1", code: "G1", name: "导游甲", language: "英语" }];
    const kept = guideServiceRowFromRecord(service());
    expect(isGuideServiceUnavailable(kept, [])).toBe(false);
    expect(isGuideServiceUnavailable(row(), candidates)).toBe(false);
    expect(isGuideServiceUnavailable(row(), [])).toBe(true);
    kept.remark = "仅改备注";
    expect(isGuideServiceUnavailable(kept, [])).toBe(false);
    kept.serviceEndAt = "2026-08-04 12:00";
    expect(guideServiceChanged(kept)).toBe(true);
    expect(isGuideServiceUnavailable(kept, [])).toBe(true);
  });
});
