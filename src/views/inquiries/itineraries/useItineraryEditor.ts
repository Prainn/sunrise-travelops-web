import type { ComputedRef, Ref } from "vue";
import type { InquiryRecord } from "@/types/inquiry";
import type { ItineraryDayRecord, ItineraryRecord, ItineraryResourceItem } from "@/types/itinerary";
import { addDays, createId, formatDate, formatDateTime, generateNextCode } from "@/utils";
import { transitionInquiry } from "../inquiry-workflow";
import { recalculateItem } from "./pricing";

type EditableDayField = "departure" | "destination" | "transport" | "title" | "description" | "mealSummary" | "accommodationSummary";

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
}

export function useItineraryEditor(options: ItineraryEditorOptions) {
  function createEmptyItinerary(): ItineraryRecord {
    return {
      id: "", inquiryId: options.inquiryId.value, code: "", title: "", destinations: "", startDate: "", endDate: "", days: 0,
      adults: 1, childrenCount: 0, otherGuests: 0, hotelLevel: "", roomPreference: "", transportPreference: "",
      guideRequired: false, guideLanguage: "", pace: "", mealRequirements: "", budget: 0, specialRequirements: "",
      inquiryCoordinatorNotes: "", operationsCoordinator: options.inquiry.value?.operationsCoordinator ?? "", dailyPlans: [], status: "draft", creator: "", createdAt: "", updatedAt: "",
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
      dailyPlans: createDailyPlans(record.startDate, record.days),
    };
    options.itineraryStore.unshift(created);
    options.inquiry.value.status = transitionInquiry(options.inquiry.value.status, "itinerary_created");
    options.selectedItineraryId.value = created.id;
    return created;
  }

  function createDailyPlans(startDate: string, dayCount: number): ItineraryDayRecord[] {
    return Array.from({ length: dayCount }, (_, index) => ({
      id: createId("day"), dayNumber: index + 1, date: addDays(startDate, index), departure: "", destination: "",
      transport: "", title: "", description: "", mealSummary: "", accommodationSummary: "", items: [],
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
    const day = options.selectedItinerary.value?.dailyPlans.find((record) => record.id === dayId);
    if (!day) return false;
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

  function updateItemPrice(dayId: string, itemIndex: number, price: number | null) {
    if (!options.canEditPrice()) return;
    const item = options.selectedItinerary.value?.dailyPlans.find((day) => day.id === dayId)?.items[itemIndex];
    if (!item) return;
    item.unitPrice = price;
    recalculateItem(item);
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
      creator: options.getCreator(),
      createdAt: formatDateTime(new Date()),
      updatedAt: formatDateTime(new Date()),
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
      departure: "", destination: "", transport: "", title: "", description: "", mealSummary: "", accommodationSummary: "", items: [],
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

  function generateItineraryCode() {
    const month = formatDate(new Date()).slice(0, 7).replace("-", "");
    return generateNextCode(options.itineraryStore, `ITI-${month}`);
  }

  return {
    addDay, addResourceItem, copyItinerary, createEmptyItinerary, createItinerary, duplicateDay,
    generateItineraryCode, moveDay, removeDay, removeItem, updateDayField, updateItemPrice, updateItemQuantity,
  };
}
