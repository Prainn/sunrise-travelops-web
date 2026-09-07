import { computed, ref } from "vue";
import { describe, expect, it } from "vitest";
import type { InquiryRecord } from "@/types/inquiry";
import type { ItineraryRecord } from "@/types/itinerary";
import type { HotelRecord, TransportRecord } from "@/types/resource";
import { useItineraryEditor } from "./useItineraryEditor";

const hotelResourceId = "00000000-0000-4000-8000-000000000002";
const vehicleResourceId = "00000000-0000-4000-8000-000000000004";
const vipVehicleResourceId = "00000000-0000-4000-8000-000000000005";

function createEditor() {
  const preferredHotel: HotelRecord = {
    id: hotelResourceId, code: "HTL-002", name: "Hotel", province: "云南省", city: "昆明市",
    rating: "四星", facilities: "", breakfast: "", address: "", phone: "", nearby: "", basicRoomType: "Room",
    individualPrice: 428, groupPrice: 200, minimumGroupSize: 10, unit: "roomNight", status: "enabled",
  };
  const fiveStarHotel: HotelRecord = {
    ...preferredHotel,
    id: "00000000-0000-4000-8000-000000000003",
    code: "HTL-003",
    name: "Five Star Hotel",
    rating: "五星",
    individualPrice: 600,
    groupPrice: 500,
  };
  const hotels = [preferredHotel, fiveStarHotel];
  const vehicle: TransportRecord = {
    id: vehicleResourceId, code: "VEH-001", name: "Coach", city: "昆明市", countryOrRegion: "中国",
    serviceLevel: "standard", plateNumber: "云A00001", seats: 38, dailyPrice: 800, unit: "vehicleDay", contact: "赵师傅",
    email: "", phone: "", status: "enabled", remark: "",
  };
  const vipVehicle: TransportRecord = {
    ...vehicle,
    id: vipVehicleResourceId,
    code: "VEH-002",
    name: "VIP Coach",
    serviceLevel: "vip",
    plateNumber: "云A00002",
    dailyPrice: 1200,
  };
  const vehicles = [vehicle, vipVehicle];
  const inquiry = ref<InquiryRecord>({
    id: "inquiry-1", code: "INQ-001", agencyId: "00000000-0000-4000-8000-000000000001", agencyCode: "AGY-001", agencyName: "Agency",
    contactName: "Contact", email: "", phone: "", countryOrRegion: "", sourceChannel: "Email", originalMessage: "",
    internalRemark: "", owner: "Owner", operationsCoordinator: "Operator", nextFollowUpAt: "", plannedDays: 2,
    lostReason: "", status: "new", creator: "admin", createdAt: "2026-08-26 10:00",
  });
  const itineraryStore: ItineraryRecord[] = [];
  const selectedItineraryId = ref("");
  const selectedItinerary = computed(() => itineraryStore.find((item) => item.id === selectedItineraryId.value));
  const editor = useItineraryEditor({
    inquiry: computed(() => inquiry.value),
    inquiryId: computed(() => inquiry.value.id),
    itineraryStore,
    selectedItinerary,
    selectedItineraryId,
    canCreate: () => true,
    canEditContent: () => true,
    canEditPrice: () => true,
    getCreator: () => "operator",
    findHotel: (id) => hotels.find((hotel) => hotel.id === id),
    findVehicle: (id) => vehicles.find((record) => record.id === id),
  });
  return { editor, hotels, inquiry, itineraryStore, selectedItinerary, vehicle, vipVehicle };
}

describe("itinerary editor", () => {
  it("creates an itinerary and its days with unique IDs", () => {
    const { editor, inquiry, itineraryStore } = createEditor();
    const record = { ...editor.createEmptyItinerary(), code: "ITI-001", startDate: "2026-10-01", days: 2 };

    const created = editor.createItinerary(record);

    expect(created?.id).toMatch(/^itinerary-/);
    expect(new Set(created?.dailyPlans.map((day) => day.id)).size).toBe(2);
    expect(itineraryStore).toHaveLength(1);
    expect(inquiry.value.status).toBe("planning");
  });

  it("copies nested entities with new IDs", () => {
    const { editor, selectedItinerary } = createEditor();
    const record = {
      ...editor.createEmptyItinerary(), code: "ITI-001", startDate: "2026-10-01", days: 1, destinations: ["昆明市"],
    };
    const original = editor.createItinerary(record);
    expect(original).not.toBeNull();
    original?.dailyPlans[0].items.push({
      id: "item-original", type: "attraction", resourceId: "attraction-1", resourcePriceId: "price-1", resourceName: "Attraction",
      priceName: "Room", providerName: "直营报价", quantity: 1, unit: "roomNight", unitCost: 100,
      totalCost: 100, remark: "",
    });
    editor.updateHotelPlanSelection("preferred_non_five_star", "昆明市", hotelResourceId);
    editor.updateVehiclePlanSelection("standard", vehicleResourceId);

    const copied = editor.copyItinerary("副本");

    expect(copied?.id).not.toBe(original?.id);
    expect(copied?.dailyPlans[0].id).not.toBe(original?.dailyPlans[0].id);
    expect(copied?.dailyPlans[0].items[0].id).not.toBe("item-original");
    expect(copied?.quote.options).toHaveLength(1);
    expect(copied?.quote.options.map((option) => option.id)).not.toEqual(original?.quote.options.map((option) => option.id));
    expect(copied?.hotelPlans).not.toBe(original?.hotelPlans);
    expect(copied?.hotelPlans[1].hotels).not.toBe(original?.hotelPlans[1].hotels);
    expect(copied?.vehiclePlans).not.toBe(original?.vehiclePlans);
    expect(copied?.vehiclePlans[0].vehicle).not.toBe(original?.vehiclePlans[0].vehicle);
    expect(selectedItinerary.value?.id).toBe(copied?.id);
  });

  it("updates basic information while preserving daily plans and resource items", () => {
    const { editor } = createEditor();
    const record = { ...editor.createEmptyItinerary(), code: "ITI-001", title: "Original", startDate: "2026-10-01", days: 2 };
    const created = editor.createItinerary(record);
    expect(created).not.toBeNull();
    created?.dailyPlans[0].items.push({
      id: "item-original", type: "attraction", resourceId: "attraction-1", resourcePriceId: "price-1", resourceName: "Attraction",
      priceName: "Room", providerName: "直营报价", quantity: 1, unit: "roomNight", unitCost: 100,
      totalCost: 100, remark: "",
    });
    const originalDayIds = created?.dailyPlans.map((day) => day.id);

    const updated = editor.updateItineraryBasics({
      ...record,
      title: "Updated",
      startDate: "2026-11-10",
      adults: 3,
      childrenCount: 1,
    });

    expect(updated?.title).toBe("Updated");
    expect(updated?.adults).toBe(3);
    expect(updated?.childrenCount).toBe(1);
    expect(updated?.dailyPlans.map((day) => day.id)).toEqual(originalDayIds);
    expect(updated?.dailyPlans.map((day) => day.date)).toEqual(["2026-11-10", "2026-11-11"]);
    expect(updated?.dailyPlans[0].items[0].id).toBe("item-original");
    expect(updated?.endDate).toBe("2026-11-11");
  });

  it("activates a hotel tier by selection and updates its price with guest count", () => {
    const { editor } = createEditor();
    const record = {
      ...editor.createEmptyItinerary(), code: "ITI-001", startDate: "2026-10-01", days: 1, adults: 4,
      destinations: ["昆明市"],
    };
    const created = editor.createItinerary(record);
    expect(created).not.toBeNull();

    editor.updateVehiclePlanSelection("standard", vehicleResourceId);
    editor.updateHotelPlanSelection("preferred_non_five_star", "昆明市", hotelResourceId);

    expect(created?.quote.options).toHaveLength(1);
    expect(created?.quote.options[0].hotelTier).toBe("preferred_non_five_star");
    expect(created?.hotelPlans[1].hotels[0]).toMatchObject({ destination: "昆明市", unitCost: 428 });

    editor.updateItineraryBasics({ ...created!, adults: 9, childrenCount: 1 });

    expect(created?.hotelPlans[1].hotels[0].unitCost).toBe(200);
    editor.clearHotelPlan("preferred_non_five_star");
    expect(created?.quote.options).toHaveLength(0);
  });

  it("allows only meals and attractions as daily resource items", () => {
    const { editor } = createEditor();
    const record = { ...editor.createEmptyItinerary(), code: "ITI-001", startDate: "2026-10-01", days: 1 };
    const created = editor.createItinerary(record);

    const added = editor.addResourceItem(created!.dailyPlans[0].id, {
      id: "hotel", type: "hotel", resourceId: hotelResourceId, resourcePriceId: hotelResourceId,
      resourceName: "Hotel", priceName: "Room", providerName: "直营报价", quantity: 1,
      unit: "roomNight", unitCost: 428, totalCost: 428, remark: "",
    });

    expect(added).toBe(false);
    expect(editor.addResourceItem(created!.dailyPlans[0].id, {
      id: "vehicle", type: "vehicle", resourceId: vehicleResourceId, resourcePriceId: vehicleResourceId,
      resourceName: "Coach", priceName: "Daily Cost", providerName: "直营报价", quantity: 1,
      unit: "vehicleDay", unitCost: 800, totalCost: 800, remark: "",
    })).toBe(false);
    expect(created?.dailyPlans[0].items).toEqual([]);
  });

  it("maintains one vehicle, total service days, and actual daily cost for the itinerary", () => {
    const { editor } = createEditor();
    const record = {
      ...editor.createEmptyItinerary(), code: "ITI-001", startDate: "2026-10-01", days: 1,
      destinations: ["昆明市", "大理市", "丽江市"],
    };
    const created = editor.createItinerary(record);
    expect(created).not.toBeNull();
    editor.updateVehiclePlanSelection("standard", vehicleResourceId);
    editor.updateVehiclePlanServiceDays("standard", 3);
    editor.updateVehiclePlanUnitCost("standard", 1250.5);

    expect(created?.vehiclePlans[0].vehicle).toMatchObject({
      vehicleId: vehicleResourceId, serviceDays: 3,
      referenceUnitCost: 800, unitCost: 1250.5,
    });
  });

  it("rejects vehicles with the wrong tier or insufficient seats", () => {
    const { editor } = createEditor();
    const record = {
      ...editor.createEmptyItinerary(), code: "ITI-001", startDate: "2026-10-01", days: 1,
      adults: 39, destinations: ["昆明市"],
    };
    const created = editor.createItinerary(record);

    editor.updateVehiclePlanSelection("standard", vehicleResourceId);
    editor.updateVehiclePlanSelection("vip", vehicleResourceId);

    expect(created?.vehiclePlans[0].vehicle).toBeNull();
    expect(created?.vehiclePlans[1].vehicle).toBeNull();
  });

  it("creates the hotel and vehicle tier cartesian product", () => {
    const { editor } = createEditor();
    const created = editor.createItinerary({
      ...editor.createEmptyItinerary(), code: "ITI-001", startDate: "2026-10-01", days: 1,
      destinations: ["昆明市"],
    });

    editor.updateHotelPlanSelection("international_five_star", "昆明市", "00000000-0000-4000-8000-000000000003");
    editor.updateHotelPlanSelection("preferred_non_five_star", "昆明市", hotelResourceId);
    editor.updateVehiclePlanSelection("standard", vehicleResourceId);
    editor.updateVehiclePlanSelection("vip", vipVehicleResourceId);

    expect(created?.quote.options.map((option) => [option.hotelTier, option.vehicleTier])).toEqual([
      ["international_five_star", "standard"],
      ["international_five_star", "vip"],
      ["preferred_non_five_star", "standard"],
      ["preferred_non_five_star", "vip"],
    ]);
  });

  it("updates price and FOC on an automatically generated hotel-tier quote", () => {
    const { editor } = createEditor();
    const record = {
      ...editor.createEmptyItinerary(), code: "ITI-001", startDate: "2026-10-01", days: 1, destinations: ["昆明市"],
    };
    const created = editor.createItinerary(record);
    expect(created).not.toBeNull();
    editor.updateVehiclePlanSelection("standard", vehicleResourceId);
    editor.updateHotelPlanSelection("international_five_star", "昆明市", "00000000-0000-4000-8000-000000000003");
    const firstOptionId = created!.quote.options[0].id;

    editor.updateQuoteOption(firstOptionId, {
      adultUnitPrice: 3000,
      leaderFocEnabled: true,
    });

    expect(created?.quote.options).toHaveLength(1);
    expect(created?.quote.options[0]).toMatchObject({
      hotelTier: "international_five_star",
      vehicleTier: "standard",
      adultUnitPrice: 3000,
      leaderFocEnabled: true,
    });
  });
});
