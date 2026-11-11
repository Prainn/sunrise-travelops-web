import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("@/api/request", () => ({ request: { put: vi.fn(), post: vi.fn() } }));
import { request } from "@/api/request";
import { itineraryInput, normalizeInquiryMoney } from "./inquiry.service";
import { inquiryService } from "./inquiry.service";
import type { ItineraryRecord } from "@/types/itinerary";

beforeEach(() => { vi.clearAllMocks(); });

describe("inquiry money normalization", () => {
  it("preserves missing prices and zeros in nested response data", () => {
    expect(normalizeInquiryMoney({
      title: "", items: [
        { unitCost: "", referencePrice: null, totalCost: "0.00" },
        { unitCost: "  ", referencePrice: undefined, totalCost: "12.30" },
      ],
    })).toEqual({
      title: "", items: [
        { unitCost: null, referencePrice: null, totalCost: 0 },
        { unitCost: null, referencePrice: undefined, totalCost: 12.3 },
      ],
    });
  });
});

describe("PAX vehicle payloads", () => {
  const record = {
    id: "plan-1", version: 3, title: "", startDate: "2026-12-12", paxTiers: [15, 20],
    childRate: 90, childWithoutBedRate: 90, destinations: [], dailyPlans: [], hotelPlans: [],
    guidePlans: [], quote: {} as ItineraryRecord["quote"],
    vehiclePlans: [{
      tier: "standard", quotationMode: "stage", totalPrice: 999, pricingMode: "automatic",
      segmentTotal: 27200, adjustmentReason: "old",
      paxPrices: [
        { pax: 15, totalPrice: 13200, pricingMode: "automatic", segmentTotal: 13200 },
        { pax: 20, totalPrice: null, pricingMode: "automatic", segmentTotal: null },
      ],
      arrangements: [{
        id: "range-1", startDate: "2026-12-12", endDate: "2026-12-22", vehicles: [], totalPrice: 5,
        paxPrices: [{ pax: 15, totalPrice: 13200 }, { pax: 20, totalPrice: null }],
      }],
    }],
  } as unknown as ItineraryRecord;

  it("clears shared prices and the derived segmentTotal while keeping null PAX prices", () => {
    const [plan] = itineraryInput(record).vehiclePlans;
    expect(plan).toMatchObject({ totalPrice: null, pricingMode: null, segmentTotal: null, adjustmentReason: "" });
    expect(plan!.paxPrices).toEqual([
      { pax: 15, totalPrice: 13200, pricingMode: "automatic", adjustmentReason: "" },
      { pax: 20, totalPrice: null, pricingMode: "automatic", adjustmentReason: "" },
    ]);
    expect(plan!.arrangements[0]!.totalPrice).toBeNull();
  });

  it("sends the mode-change confirmation only when requested", async () => {
    await inquiryService.saveItinerary(record);
    expect(vi.mocked(request.put).mock.calls[0]?.[1]).not.toHaveProperty("confirmVehicleModeChange");
    await inquiryService.saveItinerary(record, { confirmVehicleModeChange: true });
    expect(vi.mocked(request.put).mock.calls[1]?.[1]).toMatchObject({ confirmVehicleModeChange: true, version: 3 });
  });
});
