import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { effectScope } from "vue";
import { ElMessage } from "element-plus";
import { websiteService } from "@/services/website.service";
import type { WebsiteConfig, WebsiteInquiry, WebsiteItinerary, WebsitePreview, WebsiteQuotation } from "@/types/website";
import { useWebsiteWorkspace } from "./useWebsiteWorkspace";
import { printWebsiteQuotation } from "./print";

vi.mock("vue-router", () => ({
  useRoute: () => ({ params: { inquiryId: "inquiry" }, query: {} }),
  onBeforeRouteLeave: vi.fn(), onBeforeRouteUpdate: vi.fn(),
}));
vi.mock("vue-i18n", () => ({ useI18n: () => ({ t: (key: string) => key }) }));
vi.mock("element-plus", () => ({ ElMessage: { error: vi.fn(), warning: vi.fn(), success: vi.fn() }, ElMessageBox: {} }));
vi.mock("@/stores/user", () => ({ useUserStore: () => ({ userInfo: {} }) }));
vi.mock("@/utils/permission", () => ({ hasUserPermission: () => true }));
vi.mock("@/api/request", () => ({ ApiError: class extends Error {}, request: {} }));
vi.mock("./print", () => ({ printWebsiteQuotation: vi.fn() }));

let scope: ReturnType<typeof effectScope>;
const inquiry = { id: "inquiry", status: "new", version: 2 } as WebsiteInquiry;
const plan = { id: "plan", status: "draft", version: 3, configVersion: 1, title: "Trip", days: [] } as unknown as WebsiteItinerary;
const preview = { itineraryId: "plan", sourceVersion: 3 } as WebsitePreview;
const quotation = { ...preview, id: "quote", code: "Q1" } as WebsiteQuotation;

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(websiteService, "inquiry").mockResolvedValue({ ...inquiry });
  vi.spyOn(websiteService, "itineraries").mockResolvedValue([{ ...plan }]);
  vi.spyOn(websiteService, "config").mockResolvedValue({ version: 1 } as WebsiteConfig);
  vi.spyOn(websiteService, "preview").mockResolvedValue(preview);
  vi.spyOn(websiteService, "confirm").mockResolvedValue(quotation);
  vi.spyOn(websiteService, "itinerary").mockRejectedValue(new Error("reload failed"));
  vi.spyOn(websiteService, "recordDownload").mockResolvedValue(undefined);
  scope = effectScope();
});
afterEach(() => { scope.stop(); vi.restoreAllMocks(); });

async function setup() {
  const workspace = scope.run(useWebsiteWorkspace)!;
  await vi.waitFor(() => expect(workspace.loading.value).toBe(false));
  await workspace.openPreview();
  return workspace;
}

describe("website confirmation recovery", () => {
  it("retains quotation and disables draft edits when both reloads fail", async () => {
    const workspace = await setup();
    vi.mocked(websiteService.inquiry).mockRejectedValue(new Error("reload failed"));
    await workspace.confirm([]);
    expect(workspace.quotation.value).toEqual(quotation);
    expect(workspace.preview.value).toEqual(quotation);
    expect(workspace.plan.value?.status).toBe("quoted");
    expect(workspace.plans.value[0]?.status).toBe("quoted");
    expect(workspace.inquiry.value?.status).toBe("quoted");
    expect(workspace.plan.value?.version).toBe(3);
    expect(workspace.editable.value).toBe(false);
    expect(workspace.canConfirm.value).toBe(false);
    expect(workspace.saving.value).toBe(false);
    expect(ElMessage.warning).toHaveBeenCalledWith("itinerary.confirmedRefreshFailed");
    expect(ElMessage.error).not.toHaveBeenCalled();
    await workspace.confirm([]);
    expect(websiteService.confirm).toHaveBeenCalledOnce();
    await workspace.print("zh");
    expect(printWebsiteQuotation).toHaveBeenCalledWith(quotation, "zh");
  });

  it("refreshes the successful detail without losing the frozen quotation", async () => {
    const workspace = await setup();
    vi.mocked(websiteService.itinerary).mockResolvedValue({ ...plan, status: "quoted", version: 4 });
    vi.mocked(websiteService.inquiry).mockRejectedValue(new Error("reload failed"));
    await workspace.confirm([]);
    expect(workspace.plan.value?.version).toBe(4);
    expect(workspace.plans.value[0]?.version).toBe(4);
    expect(workspace.quotation.value).toEqual(quotation);
    expect(workspace.dirty.value).toBe(false);
  });

  it("leaves the draft editable when confirmation itself fails", async () => {
    const workspace = await setup();
    vi.mocked(websiteService.confirm).mockRejectedValue(new Error("conflict"));
    await workspace.confirm([]);
    expect(workspace.plan.value?.status).toBe("draft");
    expect(workspace.editable.value).toBe(true);
    expect(workspace.quotation.value).toBeUndefined();
    expect(websiteService.itinerary).not.toHaveBeenCalled();
    expect(workspace.saving.value).toBe(false);
  });
});
