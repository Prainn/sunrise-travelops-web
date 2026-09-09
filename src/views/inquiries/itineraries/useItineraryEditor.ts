import type { GuideRecord } from "@/types/resource";
import { getDayBreakfastStatus } from "./hotel-plans";
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
  ItineraryVehicleTier,
  ItineraryQuoteSettings,
  MealSlot,
} from "@/types/itinerary";
import type { HotelRecord, TransportRecord } from "@/types/resource";
import { addDays, createId, formatDateTime } from "@/utils";
import { transitionInquiry } from "../inquiry-workflow";
import { getHotelUnitCost, recalculateItem } from "./pricing";
import { createDefaultHotelPlans, getHotelPlan, HOTEL_PLAN_TIERS, isHotelEligibleForTier } from "./hotel-plans";
import { createDefaultQuoteOption, createDefaultQuoteSettings } from "./quote-pricing";
import { createDefaultVehiclePlans, getVehiclePlan, VEHICLE_PLAN_TIERS } from "./vehicle-plans";

type EditableDayField = "departure" | "destination" | "overnightDestination" | "transport" | "description";

interface ItineraryEditorOptions {
  inquiry: Readonly<Ref<InquiryRecord | undefined>>;
  inquiryId: ComputedRef<string>;
  itineraryStore: ItineraryRecord[];
  selectedItinerary: ComputedRef<ItineraryRecord | undefined>;
  selectedItineraryId: Ref<string>;
  canCreate: () => boolean;
  canEditContent: () => boolean;
  canEditPrice: () => boolean;
  getCreator: () => string;
  findHotel: (id: string) => HotelRecord | undefined;
  findGuide: (id: string) => GuideRecord | undefined;
  findVehicle: (id: string) => TransportRecord | undefined;
}

export function useItineraryEditor(options: ItineraryEditorOptions) {
  function createEmptyItinerary(): ItineraryRecord {
    return {
      id: "", inquiryId: options.inquiryId.value, code: "", title: "", startDate: "", endDate: "", days: 0,
      adults: 1, childrenCount: 0, leaderCount: 0, version: 0,
      guidePlans: [], destinations: [], hotelPlans: createDefaultHotelPlans(), vehiclePlans: createDefaultVehiclePlans(), quote: createDefaultQuoteSettings(),
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
      createdAt: timestamp,
      updatedAt: timestamp,
      destinations: [...record.destinations],
      guidePlans: record.guidePlans.map((plan) => ({ ...plan })),
      hotelPlans: cloneHotelPlans(record.hotelPlans),
      vehiclePlans: cloneVehiclePlans(record.vehiclePlans),
      quote: cloneQuoteSettings(record.quote),
      dailyPlans: createDailyPlans(record.startDate, 1),
      days: 1, endDate: record.startDate,
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
      leaderCount: record.leaderCount,
      destinations: [...record.destinations],
    });
    syncPlanDates(plan);
    syncDestinations(plan);
    syncBreakfast(plan);
    syncQuoteOptions(plan);
    return plan;
  }

  function createDailyPlans(startDate: string, dayCount: number): ItineraryDayRecord[] {
    return Array.from({ length: dayCount }, (_, index) => ({
      id: createId("day"), dayNumber: index + 1, date: addDays(startDate, index), departure: "", destination: "",
      overnightDestination: null, meals: { breakfast: index > 0, lunch: false, dinner: false }, transport: "", description: "", items: [],
    }));
  }

  function updateDayField(index: number, field: EditableDayField, value: string | null) {
    if (!options.canEditContent()) return;
    const day = options.selectedItinerary.value?.dailyPlans[index];
    if (!day) return;
    if (field === "overnightDestination") day.overnightDestination = value;
    else day[field] = value ?? "";
    if (field === "overnightDestination" && options.selectedItinerary.value) syncBreakfast(options.selectedItinerary.value);
    touchSelectedItinerary();
  }

  function addResourceItem(dayId: string, item: ItineraryResourceItem): boolean {
    if (!options.canEditContent()) return false;
    const plan = options.selectedItinerary.value;
    const day = plan?.dailyPlans.find((record) => record.id === dayId);
    if (!plan || !day || !["attraction", "restaurant"].includes(item.type)) return false;
    if (item.type === "restaurant") {
      if (!item.mealSlot || !day.meals[item.mealSlot]) return false;
      const previous = day.items.findIndex((record) => record.type === "restaurant" && record.mealSlot === item.mealSlot);
      if (previous >= 0) day.items.splice(previous, 1);
    }
    day.items.push(item);
    touchSelectedItinerary();
    return true;
  }

  function updateMeal(index: number, slot: MealSlot, included: boolean) {
    if (!options.canEditContent()) return;
    const day = options.selectedItinerary.value?.dailyPlans[index];
    if (!day) return;
    day.meals[slot] = included;
    if (!included) day.items = day.items.filter((item) => item.mealSlot !== slot);
    touchSelectedItinerary();
  }

  function updateQuoteSettings(changes: Partial<Omit<ItineraryQuoteSettings, "options">>) {
    if (!options.canEditPrice() || !options.selectedItinerary.value) return;
    Object.assign(options.selectedItinerary.value.quote, changes);
    touchSelectedItinerary();
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
      : changes.adultUnitPrice === null ? null : normalizeQuoteValue(changes.adultUnitPrice);
    Object.assign(option, changes, { adultUnitPrice });
    touchSelectedItinerary();
  }

  function updateGuideSelection(destination: string, guideId: string) {
    const plan = options.selectedItinerary.value;
    if (!options.canEditContent() || !plan || !plan.destinations.includes(destination)) return;
    const current = plan.guidePlans.find((item) => item.destination === destination);
    if (!guideId) { plan.guidePlans = plan.guidePlans.filter((item) => item.destination !== destination); touchSelectedItinerary(); return; }
    const guide = options.findGuide(guideId);
    if (!guide || guide.status !== "enabled") return;
    const selected = { destination, guideId, guideName: guide.name, secondLanguage: guide.secondLanguage, shopping: guide.shopping, dailyPrice: guide.dailyPrice, serviceDays: current?.serviceDays ?? options.inquiry.value?.plannedDays ?? 1 };
    if (current) Object.assign(current, selected); else plan.guidePlans.push(selected);
    touchSelectedItinerary();
  }
  function updateGuidePrice(destination: string, dailyPrice: number) {
    if (!options.canEditContent()) return;
    const guide = options.selectedItinerary.value?.guidePlans.find(g => g.destination === destination);
    if (guide) { guide.dailyPrice = normalizeQuoteValue(dailyPrice); touchSelectedItinerary(); }
  }
  function updateGuideDays(destination: string, serviceDays: number) {
    if (!options.canEditContent()) return;
    const guide = options.selectedItinerary.value?.guidePlans.find(g => g.destination === destination);
    if (guide) { guide.serviceDays = Math.max(1, Math.floor(serviceDays)); touchSelectedItinerary(); }
  }
  function updateHotelCost(tier: ItineraryHotelTier, destination: string, price: number) {
    if (!options.canEditContent()) return;
    const hotel = options.selectedItinerary.value?.hotelPlans.find(p => p.tier === tier)?.hotels.find(h => h.destination === destination);
    if (hotel) { hotel.unitCost = normalizeQuoteValue(price); touchSelectedItinerary(); }
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
      breakfast: hotel.breakfast,
      unit: hotel.unit,
      unitCost: getHotelUnitCost(hotel, plan.adults + plan.childrenCount + plan.leaderCount),
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

  function updateVehiclePlan(tier: ItineraryVehicleTier, value: ItineraryVehiclePlan) {
    if (!options.canEditContent()) return;
    const plan = options.selectedItinerary.value;
    const target = plan && getVehiclePlan(plan, tier);
    if (!plan || !target) return;
    Object.assign(target, cloneVehiclePlans([value])[0]);
    syncQuoteOptions(plan);
    touchSelectedItinerary();
  }

  function copyItinerary(copySuffix: string): ItineraryRecord | null {
    const source = options.selectedItinerary.value;
    if (!source || !options.canCreate() || !options.inquiry.value) return null;
    const dayIdMap = new Map(source.dailyPlans.map((day) => [day.id, createId("day")]));
    const copied: ItineraryRecord = {
      ...source,
      id: createId("itinerary"),
      code: "",
      title: `${source.title} ${copySuffix}`,
      status: "draft",
      quoteGeneratedAt: "",
      creator: options.getCreator(),
      createdAt: formatDateTime(new Date()),
      updatedAt: formatDateTime(new Date()),
      destinations: [...source.destinations],
      guidePlans: source.guidePlans.map((plan) => ({ ...plan })),
      hotelPlans: cloneHotelPlans(source.hotelPlans),
      vehiclePlans: cloneVehiclePlans(source.vehiclePlans).map(p => ({ ...p, arrangements: p.arrangements.map(a => ({ ...a, id: createId("vehicle-arrangement"), dayIds: a.dayIds.map(id => dayIdMap.get(id)!).filter(Boolean) })) })),
      quote: { ...cloneQuoteSettings(source.quote), options: source.quote.options.map((option) => ({ ...option, id: createId("quote-option") })) },
      dailyPlans: source.dailyPlans.map((day) => ({
        ...day,
        meals: { ...day.meals },
        id: dayIdMap.get(day.id)!,
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
      departure: "", destination: "", overnightDestination: null, meals: { breakfast: plan.dailyPlans.length > 0, lunch: false, dinner: false }, transport: "", items: [],
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
      meals: { ...source.meals },
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

  function syncPlanDates(plan: ItineraryRecord) {
    plan.vehiclePlans.forEach(p => p.arrangements.forEach(a => { a.dayIds = a.dayIds.filter(id => plan.dailyPlans.some(day => day.id === id)); }));
    plan.dailyPlans.forEach((day, index) => {
      day.dayNumber = index + 1;
      day.date = addDays(plan.startDate, index);
    });
    syncBreakfast(plan);
    plan.days = plan.dailyPlans.length;
    plan.endDate = plan.days ? addDays(plan.startDate, plan.days - 1) : plan.startDate;
    plan.updatedAt = formatDateTime(new Date());
  }

  function syncBreakfast(plan: ItineraryRecord) {
    plan.dailyPlans.forEach((day, index) => {
      day.meals.breakfast = getDayBreakfastStatus(plan, index) === "included";
    });
  }

  function touchSelectedItinerary() {
    if (options.selectedItinerary.value) {
      syncBreakfast(options.selectedItinerary.value);
      options.selectedItinerary.value.updatedAt = formatDateTime(new Date());
    }
  }

  function syncDestinations(plan: ItineraryRecord) {
    const destinationSet = new Set(plan.destinations);
    plan.guidePlans = plan.guidePlans.filter((guide) => destinationSet.has(guide.destination));
    plan.dailyPlans.forEach((day) => {
      if (day.overnightDestination && !destinationSet.has(day.overnightDestination)) day.overnightDestination = null;
    });
    plan.hotelPlans.forEach((hotelPlan) => {
      hotelPlan.hotels = hotelPlan.hotels.filter((hotel) => destinationSet.has(hotel.destination));
    });
  }

  function syncQuoteOptions(plan: ItineraryRecord) {
    const existing = new Map(plan.quote.options.map((option) => [`${option.hotelTier}:${option.vehicleTier}`, option]));
    plan.quote.options = HOTEL_PLAN_TIERS.flatMap((hotelTier) => {
      const hotelPlan = getHotelPlan(plan, hotelTier);
      if (!hotelPlan?.hotels.length) return [];
      return VEHICLE_PLAN_TIERS.flatMap((vehicleTier) => {
        const vehiclePlan = getVehiclePlan(plan, vehicleTier);
        if (!vehiclePlan?.arrangements.length) return [];
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
    return { ...quote, transportFees: quote.transportFees.map((fee) => ({ ...fee })), options: quote.options.map((option) => ({ ...option })) };
  }

  function cloneHotelPlans(hotelPlans: ItineraryHotelPlan[]): ItineraryHotelPlan[] {
    return hotelPlans.map((plan) => ({ ...plan, hotels: plan.hotels.map((hotel) => ({ ...hotel })) }));
  }

  function cloneVehiclePlans(vehiclePlans: ItineraryVehiclePlan[]) {
    return vehiclePlans.map(plan => ({ ...plan, arrangements: plan.arrangements.map(a => ({ ...a, dayIds: [...a.dayIds], vehicles: a.vehicles.map(v => ({ ...v })) })) }));
  }

  return {
    updateGuideSelection, updateGuideDays, updateGuidePrice, updateHotelCost, addDay, addResourceItem, clearHotelPlan, copyItinerary, createEmptyItinerary, createItinerary,
    duplicateDay, moveDay, removeDay, removeItem, updateDayField,
    updateHotelPlanSelection, updateItineraryBasics, updateItemQuantity, updateQuoteOption,
    updateVehiclePlan, updateMeal, updateQuoteSettings,
  };
}
