import { calculateVehiclePlanAutomaticTotal } from "./vehicle-plans";
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
import type { HotelRecord } from "@/types/resource";
import { addDays, createId, formatDateTime, roundMoney, sumMoney } from "@/utils";
import { transitionInquiry } from "../inquiry-workflow";
import { recalculateItem } from "./pricing";
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
}

export function useItineraryEditor(options: ItineraryEditorOptions) {
  function createEmptyItinerary(): ItineraryRecord {
    return {
      id: "", inquiryId: options.inquiryId.value, code: "", title: "", startDate: "", endDate: "", days: 0,
      paxTiers: [], childRate: 90, version: 0,
      guidePlans: [], destinations: [], hotelPlans: createDefaultHotelPlans(), vehiclePlans: createDefaultVehiclePlans(), quote: createDefaultQuoteSettings(),
      dailyPlans: [], status: "draft", quoteGeneratedAt: "", creator: "", createdAt: "", updatedAt: "",
    };
  }

  function createItinerary(record: ItineraryRecord): ItineraryRecord | null {
    if (!options.canCreate() || !options.inquiry.value) return null;
    const plannedDays = options.inquiry.value.plannedDays;
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
      dailyPlans: createDailyPlans(record.startDate, plannedDays),
      days: plannedDays, endDate: addDays(record.startDate, plannedDays - 1),
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
      paxTiers: [...record.paxTiers],
      childRate: record.childRate,
      destinations: [...record.destinations],
    });
    ensurePlannedDays(plan, options.inquiry.value?.plannedDays ?? plan.dailyPlans.length);
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

  function ensurePlannedDays(plan: ItineraryRecord, plannedDays: number) {
    if (plan.dailyPlans.length >= plannedDays) return;
    plan.dailyPlans.push(...createDailyPlans(plan.startDate, plannedDays).slice(plan.dailyPlans.length));
  }

  function updateDayField(index: number, field: EditableDayField, value: string | null) {
    if (!options.canEditContent()) return;
    const plan = options.selectedItinerary.value;
    const day = plan?.dailyPlans[index];
    if (!plan || !day) return;
    const isLast = index === plan.dailyPlans.length - 1;
    if (field === "overnightDestination") {
      if (!isLast) return;
      day.overnightDestination = value;
    } else {
      day[field] = value ?? "";
      if (field === "destination" && !isLast) day.overnightDestination = value || null;
    }
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
      if (previous >= 0) {
        day.items[previous] = { ...item, id: day.items[previous].id, remark: day.items[previous].remark };
        touchSelectedItinerary();
        return true;
      }
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
    const quote = options.selectedItinerary.value.quote;
    const delta = sumMoney((['mealOtherCost', 'attractionOtherCost'] as const).map(key =>
      key in changes ? roundMoney((changes[key] ?? 0) - (quote[key] ?? 0)) : 0));
    if (delta) {
      for (const option of quote.options) for (const price of option.paxPrices) {
        if (price.adultUnitPrice != null) price.adultUnitPrice = Math.max(0, sumMoney([price.adultUnitPrice, delta]));
      }
    }
    Object.assign(quote, changes);
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
    Object.assign(option, changes);
    touchSelectedItinerary();
  }

  function updateGuideSelection(guide: GuideRecord | null) {
    const plan = options.selectedItinerary.value;
    if (!options.canEditContent() || !plan) return;
    if (!guide) { plan.guidePlans = []; touchSelectedItinerary(); return; }
    if (!guide || guide.status !== "enabled") return;
    plan.guidePlans = [{
      destination: plan.destinations[0] ?? "",
      guideId: guide.id,
      guideName: guide.name,
      secondLanguage: guide.secondLanguage,
      shopping: guide.shopping,
      dailyPrice: guide.dailyPrice,
      referencePrice: guide.dailyPrice, referenceBasis: "resource_price", adjustmentReason: "",
      serviceDays: options.inquiry.value?.plannedDays ?? 1,
    }];
    touchSelectedItinerary();
  }
  function updateGuidePrice(dailyPrice: number) {
    if (!options.canEditContent()) return;
    const guide = options.selectedItinerary.value?.guidePlans[0];
    if (guide) { guide.dailyPrice = normalizeQuoteValue(dailyPrice); guide.adjustmentReason = ""; touchSelectedItinerary(); }
  }
  function updateHotelCost(tier: ItineraryHotelTier, destination: string, price: number) {
    if (!options.canEditContent()) return;
    const hotel = options.selectedItinerary.value?.hotelPlans.find(p => p.tier === tier)?.hotels.find(h => h.destination === destination);
    if (hotel) { hotel.unitCost = normalizeQuoteValue(price); hotel.adjustmentReason = ""; touchSelectedItinerary(); }
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
      unitCost: hotel.individualPrice,
      referencePrice: hotel.individualPrice,
      referenceBasis: "hotel_individual", adjustmentReason: "",
    };
    if (selectionIndex >= 0) hotelPlan.hotels.splice(selectionIndex, 1, selection);
    else hotelPlan.hotels.push(selection);
    syncQuoteOptions(plan);
    touchSelectedItinerary();
  }

  function updateHotelRate(tier: ItineraryHotelTier, destination: string, basis: 'hotel_group' | 'hotel_individual') {
    if (!options.canEditContent()) return;
    const hotel = options.selectedItinerary.value?.hotelPlans.find(plan => plan.tier === tier)?.hotels.find(item => item.destination === destination);
    const resource = hotel && options.findHotel(hotel.hotelId);
    if (!hotel || !resource) return;
    const price = basis === 'hotel_group' ? resource.groupPrice : resource.individualPrice;
    if (price == null) return;
    Object.assign(hotel, { unitCost: price, referencePrice: price, referenceBasis: basis, adjustmentReason: '' });
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
    if (value.totalPrice !== target.totalPrice) value.adjustmentReason = "";
    value.pricingMode = value.totalPrice === calculateVehiclePlanAutomaticTotal(value) ? "automatic" : "manual";
    Object.assign(target, cloneVehiclePlans([value])[0]);
    syncQuoteOptions(plan);
    touchSelectedItinerary();
  }

  function syncPlanDates(plan: ItineraryRecord) {
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
    if (plan.guidePlans[0]) plan.guidePlans[0].destination = plan.destinations[0] ?? "";
    plan.dailyPlans.forEach((day) => {
      if (day.overnightDestination && !destinationSet.has(day.overnightDestination)) day.overnightDestination = null;
    });
    plan.hotelPlans.forEach((hotelPlan) => {
      hotelPlan.hotels = hotelPlan.hotels.filter((hotel) => destinationSet.has(hotel.destination));
    });
  }

  function syncQuoteOptions(plan: ItineraryRecord) {
    plan.quote.staffRoomCosts = plan.destinations.map(destination => ({
      destination,
      total: plan.quote.staffRoomCosts.find(cost => cost.destination === destination)?.total ?? null,
    }));
    const existing = new Map(plan.quote.options.map((option) => [`${option.hotelTier}:${option.vehicleTier}`, option]));
    plan.quote.options = HOTEL_PLAN_TIERS.flatMap((hotelTier) => {
      const hotelPlan = getHotelPlan(plan, hotelTier);
      if (!hotelPlan?.hotels.length) return [];
      return VEHICLE_PLAN_TIERS.flatMap((vehicleTier) => {
        const vehiclePlan = getVehiclePlan(plan, vehicleTier);
        if (!vehiclePlan?.arrangements.length) return [];
        const key = `${hotelTier}:${vehicleTier}`;
        const option = existing.get(key) ?? createDefaultQuoteOption(hotelTier, vehicleTier, createId("quote-option"));
        option.paxPrices = plan.paxTiers.map(pax => ({ pax, adultUnitPrice: option.paxPrices.find(price => price.pax === pax)?.adultUnitPrice ?? null }));
        return [option];
      });
    });
  }

  function normalizeQuoteValue(value: number) {
    if (!Number.isFinite(value)) return 0;
    return Math.max(value, 0);
  }

  function cloneQuoteSettings(quote: ItineraryRecord["quote"]): ItineraryRecord["quote"] {
    return { ...quote, staffRoomCosts: quote.staffRoomCosts.map(cost => ({ ...cost })), transportFees: quote.transportFees.map((fee) => ({ ...fee })), options: quote.options.map((option) => ({ ...option, paxPrices: option.paxPrices.map(price => ({ ...price })) })) };
  }

  function cloneHotelPlans(hotelPlans: ItineraryHotelPlan[]): ItineraryHotelPlan[] {
    return hotelPlans.map((plan) => ({ ...plan, hotels: plan.hotels.map((hotel) => ({ ...hotel })) }));
  }

  function cloneVehiclePlans(vehiclePlans: ItineraryVehiclePlan[]) {
    return vehiclePlans.map(plan => ({ ...plan, arrangements: plan.arrangements.map(a => ({ ...a, vehicles: a.vehicles.map(v => ({ ...v })) })) }));
  }

  return {
    updateGuideSelection, updateGuidePrice, updateHotelCost, updateHotelRate, addResourceItem, clearHotelPlan, createEmptyItinerary, createItinerary,
    removeItem, updateDayField,
    updateHotelPlanSelection, updateItineraryBasics, updateItemQuantity, updateQuoteOption,
    updateVehiclePlan, updateMeal, updateQuoteSettings,
  };
}
