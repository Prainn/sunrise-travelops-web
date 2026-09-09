import type { GuideRecord } from "@/types/resource";
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
    id: hotelResourceId, code: "HTL-002", name: "Hotel", province: "云南省", city: "昆明",
    rating: "ctrip_preferred", facilities: "", breakfast: "", address: "", phone: "", nearby: "",
    individualPrice: 428, groupPrice: 200, minimumGroupSize: 10, unit: "roomNight", status: "enabled",
  };
  const fiveStarHotel: HotelRecord = {
    ...preferredHotel,
    id: "00000000-0000-4000-8000-000000000003",
    code: "HTL-003",
    name: "Five Star Hotel",
    rating: "international_five_star",
    individualPrice: 600,
    groupPrice: 500,
  };
  const hotels = [preferredHotel, fiveStarHotel];
  const vehicle: TransportRecord = {
    id: vehicleResourceId, code: "VEH-001", name: "Coach", city: "昆明",
    serviceLevel: "standard", seats: 38, dailyPrice: 800, unit: "vehicleDay",
    phone: "", status: "enabled", remark: "",
  };
  const vipVehicle: TransportRecord = {
    ...vehicle,
    id: vipVehicleResourceId,
    code: "VEH-002",
    name: "VIP Coach",
    serviceLevel: "vip",

  };
  const vehicles = [vehicle, vipVehicle];
  const inquiry = ref<InquiryRecord>({
    id: "inquiry-1", code: "INQ-001", agencyId: "00000000-0000-4000-8000-000000000001", agencyCode: "AGY-001", agencyName: "Agency",
    contactName: "Contact", email: "", phone: "", countryOrRegion: "", sourceChannel: "Email", originalMessage: "",
    internalRemark: "", owner: "Owner", ownerId: "owner-id", contactId: "contact-id", version: 1, nextFollowUpAt: "", plannedDays: 2,
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
    findGuide: (id) => id === "g1" ? ({ id, name: "Guide", dailyPrice: 600, status: "enabled" } as GuideRecord) : undefined,
    findHotel: (id) => hotels.find((hotel) => hotel.id === id),
    findVehicle: (id) => vehicles.find((record) => record.id === id),
  });
  return { editor, hotels, inquiry, itineraryStore, selectedItinerary, vehicle, vipVehicle };
}

describe('itinerary editor business rules', () => {
  it('creates only D1 despite the requested plan duration', () => {
    const { editor } = createEditor();
    const plan = editor.createItinerary({ ...editor.createEmptyItinerary(), startDate: '2026-11-05', days: 7 })!;
    expect(plan.dailyPlans).toHaveLength(1);
    expect(plan.endDate).toBe('2026-11-05');
    editor.addDay();
    expect(plan.dailyPlans[1].date).toBe('2026-11-06');
  });
  it('preserves manually agreed hotel prices through basic edits and copies', () => {
    const { editor, hotels } = createEditor();
    const plan = editor.createItinerary({ ...editor.createEmptyItinerary(), startDate: '2026-11-05', days: 7, destinations: [hotels[1].city] })!;
    editor.updateHotelPlanSelection('international_five_star', hotels[1].city, hotels[1].id);
    editor.updateHotelCost('international_five_star', hotels[1].city, 123);
    editor.updateItineraryBasics({ ...plan, adults: 19, leaderCount: 1 });
    expect(plan.hotelPlans[0].hotels[0].unitCost).toBe(123);
    const copy = editor.copyItinerary('copy')!;
    expect(copy.hotelPlans[0].hotels[0].unitCost).toBe(123);
    expect(copy.hotelPlans[0].hotels[0]).not.toBe(plan.hotelPlans[0].hotels[0]);
  });
  it('remaps vehicle dates in copies and removes deleted day associations', () => {
    const { editor } = createEditor();
    const plan = editor.createItinerary({ ...editor.createEmptyItinerary(), startDate: '2026-11-05' })!;
    editor.addDay();
    editor.updateVehiclePlan('standard', { tier: 'standard', totalPrice: 5000, arrangements: [{ id: 'a', dayIds: plan.dailyPlans.map(d => d.id), vehicles: [{ vehicleId: 'v', vehicleName: 'Bus', seats: 39, quantity: 2 }] }] });
    const copy = editor.copyItinerary('copy')!;
    expect(copy.vehiclePlans[0].arrangements[0].dayIds).toEqual(copy.dailyPlans.map(d => d.id));
    expect(copy.vehiclePlans[0].arrangements[0].dayIds).not.toEqual(plan.dailyPlans.map(d => d.id));
    editor.removeDay(1);
    expect(copy.vehiclePlans[0].arrangements[0].dayIds).toEqual([copy.dailyPlans[0].id]);
    expect(plan.vehiclePlans[0].arrangements[0].dayIds).toHaveLength(2);
  });
});
