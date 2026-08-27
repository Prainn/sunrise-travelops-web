import { computed, ref } from "vue";
import { describe, expect, it } from "vitest";
import type { InquiryRecord } from "@/types/inquiry";
import type { ItineraryRecord } from "@/types/itinerary";
import { useItineraryEditor } from "./useItineraryEditor";

function createEditor() {
  const inquiry = ref<InquiryRecord>({
    id: "inquiry-1", code: "INQ-001", agencyId: "agency-1", agencyCode: "AGY-001", agencyName: "Agency",
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
  });
  return { editor, inquiry, itineraryStore, selectedItinerary };
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
    const record = { ...editor.createEmptyItinerary(), code: "ITI-001", startDate: "2026-10-01", days: 1 };
    const original = editor.createItinerary(record);
    expect(original).not.toBeNull();
    original?.dailyPlans[0].items.push({
      id: "item-original", type: "hotel", resourceId: "hotel-1", resourcePriceId: "price-1", resourceName: "Hotel",
      priceName: "Room", providerName: "直营报价", quantity: 1, unit: "roomNight", unitCost: 100,
      unitPrice: 120, totalCost: 100, totalPrice: 120, remark: "",
    });

    const copied = editor.copyItinerary("副本");

    expect(copied?.id).not.toBe(original?.id);
    expect(copied?.dailyPlans[0].id).not.toBe(original?.dailyPlans[0].id);
    expect(copied?.dailyPlans[0].items[0].id).not.toBe("item-original");
    expect(selectedItinerary.value?.id).toBe(copied?.id);
  });

  it("updates basic information while preserving daily plans and resource items", () => {
    const { editor } = createEditor();
    const record = { ...editor.createEmptyItinerary(), code: "ITI-001", title: "Original", startDate: "2026-10-01", days: 2 };
    const created = editor.createItinerary(record);
    expect(created).not.toBeNull();
    created?.dailyPlans[0].items.push({
      id: "item-original", type: "hotel", resourceId: "hotel-1", resourcePriceId: "price-1", resourceName: "Hotel",
      priceName: "Room", providerName: "直营报价", quantity: 1, unit: "roomNight", unitCost: 100,
      unitPrice: 120, totalCost: 100, totalPrice: 120, remark: "",
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
});
