import { describe, expect, it, vi } from "vitest";
import { computed } from "vue";
import type { ItineraryRecord } from "@/types/itinerary";
import type { GuideRecord } from "@/types/resource";

vi.mock("@/services/inquiry.service", () => ({ inquiryService: {} }));
const fixtures = vi.hoisted(() => ({
  plan: {
    id: "plan-1", title: "Existing plan", status: "draft", destinations: ["昆明"], dailyPlans: [], guidePlans: [], updatedAt: "",
  },
}));
const requests = vi.hoisted(() => ({
  getPriceOptions: vi.fn(), getPriceSelection: vi.fn(), getSelectionOptions: vi.fn(),
  getGuideDetail: vi.fn(), createGuide: vi.fn(), loadCityOptions: vi.fn(), ensureBuiltInTypesLoaded: vi.fn(),
}));
vi.mock("@/services/resource.service", () => ({ resourceService: {
  ...requests, hotels: [], guides: [], transports: [], cityOptions: [],
  guideApi: { getDetail: requests.getGuideDetail, create: requests.createGuide },
} }));
vi.mock("@/services/business-dictionary.service", () => ({ businessDictionaryService: { ensureBuiltInTypesLoaded: requests.ensureBuiltInTypesLoaded } }));
vi.mock("@/stores/user", () => ({ useUserStore: () => ({ userInfo: { username: "test", perms: ["itinerary:update", "resource:guide:create"] } }) }));
vi.mock("./useItineraryPdf", () => ({ useItineraryPdf: () => ({}) }));
vi.mock("./useItineraryQuote", () => ({ useItineraryQuote: () => ({ calculation: computed(() => null) }) }));
vi.mock("./useItinerarySelection", () => ({ useItinerarySelection: () => ({
  inquiry: computed(() => ({ id: "inquiry-1", status: "planning", plannedDays: 7 })),
  inquiryId: computed(() => "inquiry-1"),
  itineraryStore: [],
  selectedItinerary: computed(() => fixtures.plan as unknown as ItineraryRecord),
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

  it("matches one guide type, reports missing combinations, and selects a newly created rate", async () => {
    const workspace = useItineraryWorkspace({ confirm: vi.fn(), error: vi.fn(), success: vi.fn(), warning: vi.fn(), translate: (key) => key });
    const guide: GuideRecord = { id: "guide-1", code: "GDE-001", name: "英文 · 不进店", status: "enabled", secondLanguage: "en", shopping: false, dailyPrice: 600 };
    requests.getSelectionOptions.mockResolvedValueOnce({ list: [{ id: guide.id }], total: 1, page: 1, pageSize: 1 });
    requests.getGuideDetail.mockResolvedValueOnce(guide);
    await workspace.updateGuideType("en", false);
    expect(fixtures.plan.guidePlans).toEqual([expect.objectContaining({ guideId: guide.id, dailyPrice: 600, serviceDays: 7 })]);

    requests.getSelectionOptions.mockResolvedValueOnce({ list: [], total: 0, page: 1, pageSize: 1 });
    await workspace.updateGuideType("th", true);
    expect(workspace.isGuideMissing.value).toBe(true);
    expect(fixtures.plan.guidePlans).toEqual([]);

    workspace.openGuideCreateDialog();
    expect(workspace.guideForm.value).toMatchObject({ secondLanguage: "th", shopping: true });
    const created: GuideRecord = { ...guide, id: "guide-2", code: "GDE-002", name: "泰语 · 进店", secondLanguage: "th", shopping: true, dailyPrice: 500 };
    requests.createGuide.mockResolvedValueOnce(created);
    await workspace.createGuide(created);
    expect(fixtures.plan.guidePlans).toEqual([expect.objectContaining({ guideId: created.id, dailyPrice: 500, serviceDays: 7 })]);
    expect(workspace.isGuideMissing.value).toBe(false);
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
