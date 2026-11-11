import { computed, ref } from "vue";
import { describe, expect, it, vi } from "vitest";
import type { InquiryRecord } from "@/types/inquiry";
import type { ItineraryRecord } from "@/types/itinerary";
import { itineraryInput } from "@/services/inquiry.service";
import { itineraryDayNumber } from "./duration";
import { useItineraryEditor } from "./useItineraryEditor";

vi.mock("@/api/request", () => ({ request: {} }));
vi.mock("@/lang/utils", () => ({ translate: (key: string) => key }));

function editorFor(isSeries: boolean) {
  const inquiry = ref({ isSeries, plannedDays: isSeries ? null : 2, status: "new" } as InquiryRecord);
  const editor = useItineraryEditor({
    inquiry,
    inquiryId: computed(() => "inquiry-id"),
    itineraryStore: [],
    selectedItinerary: computed<ItineraryRecord | undefined>(() => undefined),
    selectedItineraryId: ref(""),
    canCreate: () => true,
    canEditContent: () => true,
    canEditPrice: () => true,
    getCreator: () => "coordinator",
    findHotel: () => undefined,
  });
  return editor;
}

describe("new itinerary dates", () => {
  it("builds a series payload without a user date and maps vehicle dates back to trip day numbers", () => {
    const editor = editorFor(true);
    const record = editor.createItinerary({ ...editor.createEmptyItinerary(), days: 61 })!;
    const input = itineraryInput(record);
    expect(input.startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(input.dailyPlans).toHaveLength(61);
    expect(input.dailyPlans[0]?.date).toBe(input.startDate);
    expect(input.dailyPlans.at(-1)?.date).toBe(record.endDate);
    expect(input.dailyPlans.map((day) => itineraryDayNumber(input.startDate, day.date))).toEqual(
      input.dailyPlans.map((day) => day.dayNumber),
    );
  });

  it("keeps the selected calendar start and the inquiry day count for ordinary itineraries", () => {
    const editor = editorFor(false);
    const record = editor.createItinerary({ ...editor.createEmptyItinerary(), startDate: "2026-12-31" })!;
    const input = itineraryInput(record);
    expect(input.startDate).toBe("2026-12-31");
    expect(input.dailyPlans.map((day) => day.date)).toEqual(["2026-12-31", "2027-01-01"]);
  });
});
