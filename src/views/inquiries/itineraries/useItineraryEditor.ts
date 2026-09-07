import type { ComputedRef, Ref } from "vue";
import type { InquiryRecord } from "@/types/inquiry";
import type {
  ItineraryDayRecord,
  ItineraryHotelPlan,
  ItineraryHotelTier,
  ItineraryQuoteOption,
  ItineraryRecord,
  ItineraryResourceItem,
  ItineraryVehiclePlan,
  ItineraryVehicleSelection,
  ItineraryVehicleTier,
} from "@/types/itinerary";
import type { HotelRecord, TransportRecord } from "@/types/resource";
import { addDays, createId, formatDate, formatDateTime, generateNextCode } from "@/utils";
import { transitionInquiry } from "../inquiry-workflow";
import { getHotelUnitCost, recalculateItem } from "./pricing";
import { createDefaultHotelPlans, getHotelPlan, HOTEL_PLAN_TIERS, isHotelEligibleForTier } from "./hotel-plans";
import { createDefaultQuoteOption, createDefaultQuoteSettings } from "./quote-pricing";
import { createDefaultVehiclePlans, getVehiclePlan, VEHICLE_PLAN_TIERS } from "./vehicle-plans";

type EditableDayField = "departure" | "destination" | "overnightDestination" | "transport" | "description";

interface ItineraryEditorOptions {
  inquiry: ComputedRef<InquiryRecord | undefined>;
  inquiryId: ComputedRef<string>;
  itineraryStore: ItineraryRecord[];
  selectedItinerary: ComputedRef<ItineraryRecord | undefined>;
  selectedItineraryId: Ref<string>;
  canCreate: () => boolean;
  canEditContent: () => boolean;
  canEditPrice: () => boolean;
  getCreator: () => string;
  findHotel: (id: string) => HotelRecord | undefined;
  findVehicle: (id: string) => TransportRecord | undefined;
}

export function useItineraryEditor(options: ItineraryEditorOptions) {
  function createEmptyItinerary(): ItineraryRecord {
    return {
      id: "", inquiryId: options.inquiryId.value, code: "", title: "", startDate: "", endDate: "", days: 0,
      adults: 1, childrenCount: 0, operationsCoordinator: options.inquiry.value?.operationsCoordinator ?? "",
      destinations: [], hotelPlans: createDefaultHotelPlans(), vehiclePlans: createDefaultVehiclePlans(), quote: createDefaultQuoteSettings(),
      dailyPlans: [], status: "draft", quoteGeneratedAt: "", creator: "", createdAt: "", updatedAt: "",
    };
  }

  function createItinerary(record: ItineraryRecord): ItineraryRecord | null {
    if (!options.canCreate() || !options.inquiry.value) return null;
    const timestamp = formatDateTime(new Date());
    const created: ItineraryRecord = {
      ...record,
      id: createId("itinerary"),
      inquiryId: options.inquiryId.value,
      creator: options.getCreator(),
      operationsCoordinator: options.inquiry.value.operationsCoordinator,
      createdAt: timestamp,
      updatedAt: timestamp,
      destinations: [...record.destinations],
      hotelPlans: cloneHotelPlans(record.hotelPlans),
      vehiclePlans: cloneVehiclePlans(record.vehiclePlans),
      quote: cloneQuoteSettings(record.quote),
      dailyPlans: createDailyPlans(record.startDate, record.days),
    };
    syncQuoteOptions(created);
    options.itineraryStore.unshift(created);
    options.inquiry.value.status = transitionInquiry(options.inquiry.value.status, "itinerary_created");
    options.selectedItineraryId.value = created.id;
    return created;
  }

  function updateItineraryBasics(record: ItineraryRecord): ItineraryRecord | null {
    if (!options.canEditContent()) return null;
    const plan = options.selectedItinerary.value;
    if (!plan) return null;
    Object.assign(plan, {
      title: record.title,
      startDate: record.startDate,
      adults: record.adults,
      childrenCount: record.childrenCount,
      destinations: [...record.destinations],
    });
    resizeDailyPlans(plan, record.days);
    syncDestinations(plan);
    syncHotelPlanPrices(plan);
    syncVehiclePlanSelections(plan);
    syncQuoteOptions(plan);
    return plan;
  }

  function createDailyPlans(startDate: string, dayCount: number): ItineraryDayRecord[] {
    return Array.from({ length: dayCount }, (_, index) => ({
      id: createId("day"), dayNumber: index + 1, date: addDays(startDate, index), departure: "", destination: "",
      overnightDestination: "", transport: "", description: "", items: [],
    }));
  }

  function updateDayField(index: number, field: EditableDayField, value: string) {
    if (!options.canEditContent()) return;
    const day = options.selectedItinerary.value?.dailyPlans[index];
    if (!day) return;
    day[field] = value;
    touchSelectedItinerary();
  }

  function addResourceItem(dayId: string, item: ItineraryResourceItem): boolean {
    if (!options.canEditContent()) return false;
    const plan = options.selectedItinerary.value;
    const day = plan?.dailyPlans.find((record) => record.id === dayId);
    if (!plan || !day || !["attraction", "restaurant"].includes(item.type)) return false;
    day.items.push(item);
    touchSelectedItinerary();
    return true;
  }

  function removeItem(dayId: string, itemIndex: number) {
    if (!options.canEditContent()) return;
    options.selectedItinerary.value?.dailyPlans.find((day) => day.id === dayId)?.items.splice(itemIndex, 1);
    touchSelectedItinerary();
  }

  function updateItemQuantity(dayId: string, itemIndex: number, quantity: number) {
    if (!options.canEditContent()) return;
    const item = options.selectedItinerary.value?.dailyPlans.find((day) => day.id === dayId)?.items[itemIndex];
    if (!item) return;
    item.quantity = quantity;
    recalculateItem(item);
    touchSelectedItinerary();
  }

  function updateQuoteOption(optionId: string, changes: Partial<Omit<ItineraryQuoteOption, "id">>) {
    if (!options.canEditPrice()) return;
    const option = options.selectedItinerary.value?.quote.options.find((record) => record.id === optionId);
    if (!option) return;
    const adultUnitPrice = changes.adultUnitPrice === undefined
      ? option.adultUnitPrice
      : normalizeQuoteValue(changes.adultUnitPrice ?? 0);
    Object.assign(option, changes, { adultUnitPrice });
    touchSelectedItinerary();
  }

  function updateHotelPlanSelection(tier: ItineraryHotelTier, destination: string, hotelId: string) {
    if (!options.canEditContent()) return;
    const plan = options.selectedItinerary.value;
    const hotelPlan = plan ? getHotelPlan(plan, tier) : undefined;
    if (!plan || !hotelPlan || !plan.destinations.includes(destination)) return;
    const selectionIndex = hotelPlan.hotels.findIndex((hotel) => hotel.destination === destination);
    if (!hotelId) {
      if (selectionIndex >= 0) hotelPlan.hotels.splice(selectionIndex, 1);
      syncQuoteOptions(plan);
      touchSelectedItinerary();
      return;
    }
    const hotel = options.findHotel(hotelId);
    if (!hotel || hotel.status !== "enabled" || hotel.city !== destination || !isHotelEligibleForTier(hotel, tier)) return;
    const selection = {
      destination,
      hotelId: hotel.id,
      hotelName: hotel.name,
      rating: hotel.rating,
      roomType: hotel.basicRoomType,
      breakfast: hotel.breakfast,
      unit: hotel.unit,
      unitCost: getHotelUnitCost(hotel, plan.adults + plan.childrenCount),
    };
    if (selectionIndex >= 0) hotelPlan.hotels.splice(selectionIndex, 1, selection);
    else hotelPlan.hotels.push(selection);
    syncQuoteOptions(plan);
    touchSelectedItinerary();
  }

  function clearHotelPlan(tier: ItineraryHotelTier) {
    if (!options.canEditContent()) return;
    const plan = options.selectedItinerary.value;
    const hotelPlan = plan ? getHotelPlan(plan, tier) : undefined;
    if (!plan || !hotelPlan) return;
    hotelPlan.hotels = [];
    syncQuoteOptions(plan);
    touchSelectedItinerary();
  }

  function updateVehiclePlanSelection(tier: ItineraryVehicleTier, vehicleId: string) {
    if (!options.canEditContent()) return;
    const itinerary = options.selectedItinerary.value;
    const vehiclePlan = itinerary ? getVehiclePlan(itinerary, tier) : undefined;
    if (!itinerary || !vehiclePlan) return;
    if (!vehicleId) {
      vehiclePlan.vehicle = null;
      syncQuoteOptions(itinerary);
      touchSelectedItinerary();
      return;
    }
    const vehicle = options.findVehicle(vehicleId);
    const guestCount = itinerary.adults + itinerary.childrenCount;
    if (
      !vehicle
      || vehicle.status !== "enabled"
      || vehicle.serviceLevel !== tier
      || vehicle.seats < guestCount
    ) return;
    const existing = vehiclePlan.vehicle;
    const selection: ItineraryVehicleSelection = {
      vehicleId: vehicle.id,
      vehicleName: vehicle.name,
      seats: vehicle.seats,
      serviceDays: existing?.serviceDays ?? Math.max(itinerary.days, 1),
      unit: vehicle.unit,
      referenceUnitCost: vehicle.dailyPrice,
      unitCost: vehicle.dailyPrice,
    };
    vehiclePlan.vehicle = selection;
    syncQuoteOptions(itinerary);
    touchSelectedItinerary();
  }

  function updateVehiclePlanServiceDays(tier: ItineraryVehicleTier, serviceDays: number) {
    if (!options.canEditContent()) return;
    const vehicle = options.selectedItinerary.value
      ? getVehiclePlan(options.selectedItinerary.value, tier)?.vehicle
      : null;
    if (!vehicle) return;
    vehicle.serviceDays = Math.max(Math.round(serviceDays), 1);
    touchSelectedItinerary();
  }

  function updateVehiclePlanUnitCost(tier: ItineraryVehicleTier, unitCost: number) {
    if (!options.canEditContent()) return;
    const vehicle = options.selectedItinerary.value
      ? getVehiclePlan(options.selectedItinerary.value, tier)?.vehicle
      : null;
    if (!vehicle) return;
    vehicle.unitCost = normalizeQuoteValue(unitCost);
    touchSelectedItinerary();
  }

  function copyItinerary(copySuffix: string): ItineraryRecord | null {
    const source = options.selectedItinerary.value;
    if (!source || !options.canCreate() || !options.inquiry.value) return null;
    const copied: ItineraryRecord = {
      ...source,
      id: createId("itinerary"),
      code: generateItineraryCode(),
      title: `${source.title} ${copySuffix}`,
      status: "draft",
      quoteGeneratedAt: "",
      creator: options.getCreator(),
      createdAt: formatDateTime(new Date()),
      updatedAt: formatDateTime(new Date()),
      destinations: [...source.destinations],
      hotelPlans: cloneHotelPlans(source.hotelPlans),
      vehiclePlans: cloneVehiclePlans(source.vehiclePlans),
      quote: { options: source.quote.options.map((option) => ({ ...option, id: createId("quote-option") })) },
      dailyPlans: source.dailyPlans.map((day) => ({
        ...day,
        id: createId("day"),
        items: day.items.map((item) => ({ ...item, id: createId("item") })),
      })),
    };
    options.itineraryStore.unshift(copied);
    options.inquiry.value.status = transitionInquiry(options.inquiry.value.status, "itinerary_created");
    options.selectedItineraryId.value = copied.id;
    return copied;
  }

  function addDay() {
    if (!options.canEditContent()) return;
    const plan = options.selectedItinerary.value;
    if (!plan) return;
    plan.dailyPlans.push({
      id: createId("day"), dayNumber: plan.dailyPlans.length + 1, date: addDays(plan.startDate, plan.dailyPlans.length),
      departure: "", destination: "", overnightDestination: "", transport: "", items: [],
    });
    syncPlanDates(plan);
  }

  function duplicateDay(index: number) {
    if (!options.canEditContent()) return;
    const plan = options.selectedItinerary.value;
    const source = plan?.dailyPlans[index];
    if (!plan || !source) return;
    plan.dailyPlans.splice(index + 1, 0, {
      ...source,
      id: createId("day"),
      items: source.items.map((item) => ({ ...item, id: createId("item") })),
    });
    syncPlanDates(plan);
  }

  function removeDay(index: number) {
    if (!options.canEditContent()) return;
    const plan = options.selectedItinerary.value;
    if (!plan) return;
    plan.dailyPlans.splice(index, 1);
    syncPlanDates(plan);
  }

  function moveDay(index: number, offset: number) {
    if (!options.canEditContent()) return;
    const plan = options.selectedItinerary.value;
    if (!plan) return;
    const target = index + offset;
    if (target < 0 || target >= plan.dailyPlans.length) return;
    [plan.dailyPlans[index], plan.dailyPlans[target]] = [plan.dailyPlans[target], plan.dailyPlans[index]];
    syncPlanDates(plan);
  }

  function resizeDailyPlans(plan: ItineraryRecord, dayCount: number) {
    const targetDayCount = Math.max(Math.round(dayCount), 1);
    if (plan.dailyPlans.length > targetDayCount) plan.dailyPlans.splice(targetDayCount);
    while (plan.dailyPlans.length < targetDayCount) {
      const index = plan.dailyPlans.length;
      plan.dailyPlans.push({
        id: createId("day"), dayNumber: index + 1, date: addDays(plan.startDate, index), departure: "", destination: "",
        overnightDestination: "", transport: "", items: [],
      });
    }
    syncPlanDates(plan);
  }

  function syncPlanDates(plan: ItineraryRecord) {
    plan.dailyPlans.forEach((day, index) => {
      day.dayNumber = index + 1;
      day.date = addDays(plan.startDate, index);
    });
    plan.days = plan.dailyPlans.length;
    plan.endDate = plan.days ? addDays(plan.startDate, plan.days - 1) : plan.startDate;
    plan.updatedAt = formatDateTime(new Date());
  }

  function touchSelectedItinerary() {
    if (options.selectedItinerary.value) options.selectedItinerary.value.updatedAt = formatDateTime(new Date());
  }

  function syncDestinations(plan: ItineraryRecord) {
    const destinationSet = new Set(plan.destinations);
    plan.dailyPlans.forEach((day) => {
      if (!destinationSet.has(day.overnightDestination)) day.overnightDestination = "";
    });
    plan.hotelPlans.forEach((hotelPlan) => {
      hotelPlan.hotels = hotelPlan.hotels.filter((hotel) => destinationSet.has(hotel.destination));
    });
  }

  function syncHotelPlanPrices(plan: ItineraryRecord) {
    plan.hotelPlans.flatMap((hotelPlan) => hotelPlan.hotels).forEach((selection) => {
      const hotel = options.findHotel(selection.hotelId);
      if (hotel) selection.unitCost = getHotelUnitCost(hotel, plan.adults + plan.childrenCount);
    });
  }

  function syncVehiclePlanSelections(plan: ItineraryRecord) {
    const guestCount = plan.adults + plan.childrenCount;
    plan.vehiclePlans.forEach((vehiclePlan) => {
      const selected = vehiclePlan.vehicle;
      if (!selected) return;
      const vehicle = options.findVehicle(selected.vehicleId);
      if (
        !vehicle
        || vehicle.status !== "enabled"
        || vehicle.serviceLevel !== vehiclePlan.tier
        || vehicle.seats < guestCount
      ) vehiclePlan.vehicle = null;
    });
  }

  function syncQuoteOptions(plan: ItineraryRecord) {
    const existing = new Map(plan.quote.options.map((option) => [`${option.hotelTier}:${option.vehicleTier}`, option]));
    plan.quote.options = HOTEL_PLAN_TIERS.flatMap((hotelTier) => {
      const hotelPlan = getHotelPlan(plan, hotelTier);
      if (!hotelPlan?.hotels.length) return [];
      return VEHICLE_PLAN_TIERS.flatMap((vehicleTier) => {
        const vehiclePlan = getVehiclePlan(plan, vehicleTier);
        if (!vehiclePlan?.vehicle) return [];
        const key = `${hotelTier}:${vehicleTier}`;
        return [existing.get(key) ?? createDefaultQuoteOption(hotelTier, vehicleTier, createId("quote-option"))];
      });
    });
  }

  function normalizeQuoteValue(value: number) {
    if (!Number.isFinite(value)) return 0;
    return Math.max(value, 0);
  }

  function cloneQuoteSettings(quote: ItineraryRecord["quote"]): ItineraryRecord["quote"] {
    return { options: quote.options.map((option) => ({ ...option })) };
  }

  function cloneHotelPlans(hotelPlans: ItineraryHotelPlan[]): ItineraryHotelPlan[] {
    return hotelPlans.map((plan) => ({ ...plan, hotels: plan.hotels.map((hotel) => ({ ...hotel })) }));
  }

  function cloneVehiclePlans(vehiclePlans: ItineraryVehiclePlan[]) {
    return vehiclePlans.map((plan) => ({ ...plan, vehicle: plan.vehicle ? { ...plan.vehicle } : null }));
  }

  function generateItineraryCode() {
    const month = formatDate(new Date()).slice(0, 7).replace("-", "");
    return generateNextCode(options.itineraryStore, `ITI-${month}`);
  }

  return {
    addDay, addResourceItem, clearHotelPlan, copyItinerary, createEmptyItinerary, createItinerary,
    duplicateDay, generateItineraryCode, moveDay, removeDay, removeItem, updateDayField,
    updateHotelPlanSelection, updateItineraryBasics, updateItemQuantity, updateQuoteOption,
    updateVehiclePlanSelection, updateVehiclePlanServiceDays, updateVehiclePlanUnitCost,
  };
}
