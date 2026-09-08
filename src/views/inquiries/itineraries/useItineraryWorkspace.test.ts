import { describe, expect, it, vi } from "vitest";
import { computed } from "vue";
import type { ItineraryRecord } from "@/types/itinerary";

const requests = vi.hoisted(() => ({ getPriceOptions: vi.fn(), getPriceSelection: vi.fn(), loadCityOptions: vi.fn(), ensureBuiltInTypesLoaded: vi.fn() }));
vi.mock("@/services/resource.service", () => ({ resourceService: {
  ...requests, hotels: [], guides: [], transports: [], cityOptions: [],
} }));
vi.mock("@/services/business-dictionary.service", () => ({ businessDictionaryService: { ensureBuiltInTypesLoaded: requests.ensureBuiltInTypesLoaded } }));
vi.mock("@/stores/user", () => ({ useUserStore: () => ({ userInfo: { username: "test", perms: ["itinerary:update"] } }) }));
vi.mock("@/composables/useInquiryLog", () => ({ useInquiryLog: () => ({ recordInquiryLog: vi.fn() }) }));
vi.mock("./useItineraryPdf", () => ({ useItineraryPdf: () => ({}) }));
vi.mock("./useItinerarySelection", () => ({ useItinerarySelection: () => ({
  inquiry: computed(() => ({ id: "inquiry-1", status: "planning" })),
  inquiryId: computed(() => "inquiry-1"),
  itineraryStore: [],
  selectedItinerary: computed(() => ({ id: "plan-1", title: "Existing plan", status: "draft", dailyPlans: [] } as unknown as ItineraryRecord)),
  selectedItineraryId: computed(() => "plan-1"),
}) }));

import { useItineraryWorkspace } from "./useItineraryWorkspace";

describe("itinerary basic editor", () => {
  it("opens the existing plan without loading the pricing catalogue", async () => {
    const workspace = useItineraryWorkspace({ confirm: vi.fn(), error: vi.fn(), success: vi.fn(), warning: vi.fn(), translate: (key) => key });
    await workspace.openEditDialog();
    expect(workspace.isPlanDialogVisible.value).toBe(true);
    expect(workspace.itineraryForm.value.title).toBe("Existing plan");
    expect(requests.getPriceOptions).not.toHaveBeenCalled();
    expect(requests.getPriceSelection).not.toHaveBeenCalled();
  });
});

it("initializes the display dictionaries without loading resource catalogues", async () => {
  const workspace = useItineraryWorkspace({ confirm: vi.fn(), error: vi.fn(), success: vi.fn(), warning: vi.fn(), translate: key => key });
  await workspace.loadDestinationResourceOptions();
  expect(requests.loadCityOptions).toHaveBeenCalledOnce();
  expect(requests.ensureBuiltInTypesLoaded).toHaveBeenCalledOnce();
  expect(requests.getPriceOptions).not.toHaveBeenCalled();
  expect(requests.getPriceSelection).not.toHaveBeenCalled();
});
