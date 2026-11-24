import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { effectScope } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { request } from "@/api/request";
import { websiteItineraryInput, websiteService } from "@/services/website.service";
import type { WebsiteConfig, WebsiteInquiry, WebsiteItinerary, WebsitePreview, WebsiteQuotation, WebsiteVehiclePrice } from "@/types/website";
import { useWebsiteWorkspace } from "./useWebsiteWorkspace";
import { printWebsiteQuotation } from "./print";
import { generateWebsiteWordDocument } from "./docx";
import { downloadWordDocument } from "@/views/inquiries/itineraries/docx";
import { emptyDay } from "../options";
import { PRICE_CATEGORIES, quotationCandidates } from "./vehicle-price";
import { applyReschedule, defaultRescheduleTargets, rescheduleDiff } from "./reschedule";

vi.mock("vue-router", () => ({
  useRoute: () => ({ params: { inquiryId: "inquiry" }, query: {} }),
  onBeforeRouteLeave: vi.fn(), onBeforeRouteUpdate: vi.fn(),
}));
vi.mock("vue-i18n", () => ({ useI18n: () => ({ t: (key: string) => key }) }));
vi.mock("element-plus", () => ({ ElMessage: { error: vi.fn(), warning: vi.fn(), success: vi.fn() }, ElMessageBox: { confirm: vi.fn() } }));
vi.mock("@/stores/user", () => ({ useUserStore: () => ({ userInfo: {} }) }));
vi.mock("@/utils/permission", () => ({ hasUserPermission: () => true }));
vi.mock("@/api/request", () => ({ ApiError: class extends Error {}, request: { post: vi.fn(), put: vi.fn() } }));
vi.mock("./print", () => ({ printWebsiteQuotation: vi.fn() }));
vi.mock("./docx", () => ({ generateWebsiteWordDocument: vi.fn() }));
vi.mock("@/views/inquiries/itineraries/docx", () => ({ downloadWordDocument: vi.fn() }));

let scope: ReturnType<typeof effectScope>;
const inquiry = { id: "inquiry", status: "new", version: 2 } as WebsiteInquiry;
const plan = { id: "plan", status: "draft", version: 3, configVersion: 1, title: "Trip", days: [], vehiclePrices: [] } as unknown as WebsiteItinerary;
const preview = { itineraryId: "plan", sourceVersion: 3, issues: [] } as unknown as WebsitePreview;
const quotation = { ...preview, id: "quote", code: "Q1" } as WebsiteQuotation;

it("locates actionable preview issues without guessing from a shared error code", async () => {
  const workspace = await setup();
  const locate = workspace.previewIssueLocation;
  const generic = { code: "ITINERARY_INVALID", severity: "ERROR" as const, message: "Test" };
  const prices = { ...generic, code: "VAL-E09", target: { kind: "prices" as const } };
  const basics = { ...generic, target: { kind: "basics" as const } };
  const dates = { ...generic, code: "REQUIREMENTS_MISMATCH", target: { kind: "reschedule" as const } };
  expect(locate(prices)?.kind).toBe("prices");
  expect(locate(basics)?.kind).toBe("basics");
  expect(locate(generic)).toBeUndefined();
  workspace.plan.value!.days = [emptyDay(1)];
  expect(locate({ ...prices, code: "VAL-E06", dayNumber: 1 })?.kind).toBe("prices");
  expect(locate({ ...prices, dayNumber: 99 })).toBeUndefined();
  expect(locate(dates)).toBeUndefined();
  workspace.inquiry.value!.serviceDates = ["2026-11-20"];
  expect(locate(dates)?.kind).toBe("reschedule");
  workspace.plan.value!.status = "quoted";
  expect(locate(basics)).toBeUndefined();
  expect(locate(dates)).toBeUndefined();
  expect(locate(prices)?.kind).toBe("prices");
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(ElMessageBox.confirm).mockResolvedValue("confirm" as Awaited<ReturnType<typeof ElMessageBox.confirm>>);
  vi.mocked(generateWebsiteWordDocument).mockResolvedValue({ blob: new Blob(["docx"]), fileName: "Q1-en.docx" });
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

describe("main-page item deletion", () => {
  it("confirms deletion, updates candidates, and keeps other days and the saved source unchanged", async () => {
    const workspace = await setup();
    const day = emptyDay(1);
    day.overnightCityId = "city";
    day.hotels = [{ id: "hotel", tier: "A", cityId: "city", configHotelId: null, resourceId: "public-hotel", nameZh: "酒店", nameEn: "Hotel", roomType: "", breakfastIncluded: true }];
    day.eventOrder = ["hotel"];
    workspace.plan.value!.days = [day, { ...emptyDay(2), id: "other-day" }];
    const otherDay = JSON.stringify(workspace.plan.value!.days[1]);
    const save = vi.spyOn(websiteService, "saveItinerary");
    let resolve!: () => void;
    vi.mocked(ElMessageBox.confirm).mockReturnValueOnce(new Promise(done => { resolve = () => done("confirm" as Awaited<ReturnType<typeof ElMessageBox.confirm>>); }));
    const removing = workspace.removeItem(day.id, "hotel", "酒店");
    expect(workspace.plan.value!.days[0]!.hotels).toHaveLength(1);
    resolve();
    await removing;
    expect(workspace.plan.value!.days[0]!.hotels).toEqual([]);
    expect(workspace.plan.value!.days[0]!.eventOrder).not.toContain("hotel");
    expect(workspace.plan.value!.days[0]!.overnightCityId).toBe("city");
    expect(quotationCandidates(workspace.plan.value!.days).hotelTiers).toEqual([null]);
    expect(JSON.stringify(workspace.plan.value!.days[1])).toBe(otherDay);
    expect(workspace.plans.value[0]!.days).toEqual([]);
    expect(workspace.preview.value).toBeUndefined();
    expect(save).not.toHaveBeenCalled();
  });

  it("leaves cancellation, readonly, saving and switched-plan data unchanged", async () => {
    const workspace = await setup();
    const day = emptyDay(1);
    day.services = [{ id: "service", nameZh: "服务", nameEn: "Service", appears: true, feeState: "INCLUDED" }];
    workspace.plan.value!.days = [day];
    vi.mocked(ElMessageBox.confirm).mockRejectedValueOnce("cancel");
    await workspace.removeItem(day.id, "service", "服务");
    expect(workspace.plan.value!.days[0]!.services).toHaveLength(1);
    vi.mocked(ElMessageBox.confirm).mockClear();
    workspace.plan.value!.status = "quoted";
    await workspace.removeItem(day.id, "service", "服务");
    workspace.plan.value!.status = "draft";
    workspace.saving.value = true;
    await workspace.removeItem(day.id, "service", "服务");
    expect(ElMessageBox.confirm).not.toHaveBeenCalled();
    workspace.saving.value = false;
    const old = workspace.plan.value!;
    let resolve!: () => void;
    vi.mocked(ElMessageBox.confirm).mockReturnValueOnce(new Promise(done => { resolve = () => done("confirm" as Awaited<ReturnType<typeof ElMessageBox.confirm>>); }));
    const removing = workspace.removeItem(day.id, "service", "服务");
    workspace.plan.value = { ...old, id: "other-plan", days: [] };
    resolve();
    await removing;
    expect(old.days[0]!.services).toHaveLength(1);
    expect(workspace.plan.value.days).toEqual([]);
  });

  it("protects copies in the stashed board until that arrangement is applied", async () => {
    const workspace = await setup();
    const day = emptyDay(1);
    day.services = [{ id: "service", nameZh: "服务", nameEn: "Service", appears: true, feeState: "INCLUDED" }];
    workspace.plan.value!.days = [day];
    workspace.plan.value!.reorderDraft = { dayIds: [day.id], addedDayIds: [], deletedDays: [], placements: [], overnight: [], copies: [{ id: "copy", sourceId: "service", parentId: "service", dayId: day.id, placed: false }] };
    await workspace.removeItem(day.id, "service", "服务");
    expect(ElMessageBox.confirm).not.toHaveBeenCalled();
    expect(ElMessage.warning).toHaveBeenCalledWith("websiteItineraryUi.applyBoardBeforeDelete");
    expect(workspace.plan.value!.days[0]!.services).toHaveLength(1);
    expect(workspace.plan.value!.reorderDraft.copies).toHaveLength(1);
  });
});

describe("自选服务日改期", () => {
  it("按已保存的日序识别未排满的草稿，并可把移除日整天改排到新日期", () => {
    const dates = ["2026-11-21", "2026-11-23", "2026-11-24", "2026-11-26"];
    const target = ["2026-11-21", "2026-11-23", "2026-11-25", "2026-11-26"];
    const third = { ...emptyDay(3), guideLanguage: "English" };
    const fourth = { ...emptyDay(4), endCityId: "kunming" };
    const draft = { ...plan, duration: 4, serviceDates: dates, startDate: dates[0]!, days: [third, fourth] };
    const diff = rescheduleDiff(draft, target);
    expect(diff.kept).toEqual([{ day: fourth, date: "2026-11-26" }]);
    expect(diff.removed).toEqual([{ day: third, date: "2026-11-24" }]);
    const destinations = defaultRescheduleTargets(diff);
    expect(destinations).toEqual({ [third.id]: "2026-11-25" });
    const result = applyReschedule(draft, target, destinations, { startDate: target[0]!, plannedDays: 4 });
    expect(result.days.slice(2)).toEqual([third, fourth]);
    expect(result.deletedDays).toEqual([]);
    const consecutive = applyReschedule(result, null, {}, { startDate: "2026-12-31", plannedDays: 4 });
    expect(consecutive).toMatchObject({ serviceDates: null, startDate: "2026-12-31", duration: 4, days: result.days });
  });
  it("保存失败可按原明细重试；成功后替换日期并保留重合日、回收历史及版本", async () => {
    const dates = ["2026-11-21", "2026-11-23", "2026-11-24", "2026-11-26"];
    const target = [dates[0]!, dates[1]!, "2026-11-25", dates[3]!];
    const days = dates.map((_, index) => ({ ...emptyDay(index + 1), id: `d${index + 1}`, guideLanguage: `guide-${index}` }));
    vi.mocked(websiteService.inquiry).mockResolvedValue({ ...inquiry, serviceDates: target, plannedDays: 4, startDate: dates[0]! });
    vi.mocked(websiteService.itineraries).mockResolvedValue([{ ...plan, days, duration: 4, startDate: dates[0]!, serviceDates: dates }]);
    const save = vi.spyOn(websiteService, "saveItinerary").mockRejectedValueOnce(new Error("network"));
    save.mockImplementationOnce(async record => ({ ...record, version: record.version + 1 }));
    const workspace = await setup();
    expect(workspace.datesMismatch.value).toBe(true);
    expect(await workspace.reschedule({ d3: null })).toBe(false);
    expect(workspace.plan.value?.serviceDates).toEqual(dates);
    expect(workspace.plan.value?.days).toEqual(days);
    expect(await workspace.reschedule({ d3: null })).toBe(true);
    const saved = workspace.plan.value!;
    expect(saved).toMatchObject({ version: 4, duration: 4, serviceDates: target, deletedDays: [{ day: days[2], originalDate: "2026-11-24" }] });
    expect(saved.days.filter(day => day.dayNumber !== 3)).toEqual([days[0], days[1], days[3]]);
    expect(saved.days[2]?.guideLanguage).toBe("");
    expect(websiteItineraryInput(save.mock.calls[1]![0]).serviceDates).toEqual(target);
    expect(workspace.datesMismatch.value).toBe(false);
  });
});

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

describe("website Word export", () => {
  it("freezes once, uses the selected language, and retries download without confirming again", async () => {
    const workspace = await setup();
    vi.mocked(websiteService.recordDownload).mockRejectedValueOnce(new Error("download failed"));
    await workspace.exportWord("zh", []);
    expect(websiteService.confirm).toHaveBeenCalledOnce();
    expect(generateWebsiteWordDocument).toHaveBeenCalledWith(quotation, "zh");
    expect(downloadWordDocument).not.toHaveBeenCalled();
    expect(workspace.plan.value?.status).toBe("quoted");
    await workspace.exportWord("en", []);
    expect(websiteService.confirm).toHaveBeenCalledOnce();
    expect(generateWebsiteWordDocument).toHaveBeenLastCalledWith(quotation, "en");
    expect(downloadWordDocument).toHaveBeenCalledOnce();
    expect(workspace.saving.value).toBe(false);
  });
  it("does not freeze or export on cancellation, errors, or unacknowledged warnings", async () => {
    const workspace = await setup();
    workspace.preview.value = { ...preview, issues: [{ code: "E", severity: "ERROR", message: "Missing" }] };
    await workspace.exportWord("en", []);
    workspace.preview.value = { ...preview, issues: [{ code: "W", severity: "WARNING", message: "Check" }] };
    await workspace.exportWord("en", []);
    expect(ElMessageBox.confirm).not.toHaveBeenCalled();
    vi.mocked(ElMessageBox.confirm).mockRejectedValueOnce("cancel");
    await workspace.exportWord("en", ["W"]);
    expect(websiteService.confirm).not.toHaveBeenCalled();
    expect(generateWebsiteWordDocument).not.toHaveBeenCalled();
    expect(workspace.saving.value).toBe(false);
  });
  it("stops after a confirmation conflict and suppresses duplicate clicks while confirming", async () => {
    const workspace = await setup();
    let rejectConfirmation!: (reason: Error) => void;
    vi.mocked(websiteService.confirm).mockReturnValueOnce(new Promise((_, reject) => { rejectConfirmation = reject; }));
    const exporting = workspace.exportWord("en", []);
    await vi.waitFor(() => expect(websiteService.confirm).toHaveBeenCalledOnce());
    await workspace.exportWord("en", []);
    rejectConfirmation(new Error("conflict"));
    await exporting;
    expect(websiteService.confirm).toHaveBeenCalledOnce();
    expect(workspace.plan.value?.status).toBe("draft");
    expect(generateWebsiteWordDocument).not.toHaveBeenCalled();
    expect(websiteService.recordDownload).not.toHaveBeenCalled();
  });
});

describe("attraction price reference for drafts", () => {
  it("recomputes from the bound config and active days instead of the saved response", async () => {
    const bound = { version: 1, attractions: [{ id: "paid", chargeable: true, price: "12.30" }, { id: "free", chargeable: false, price: "0.00" }] } as WebsiteConfig;
    vi.mocked(websiteService.config).mockResolvedValue(bound);
    const first = { ...emptyDay(1), id: "d1", items: [{ id: "i1", attractionId: "paid", nameZh: "", nameEn: "", descriptionZh: "", descriptionEn: "", appears: false, feeState: "EXCLUDED" as const }] };
    const second = { ...emptyDay(2), id: "d2", items: [{ ...first.items[0]!, id: "i2" }, { ...first.items[0]!, id: "i3", attractionId: "free" }] };
    vi.mocked(websiteService.itineraries).mockResolvedValue([{ ...plan, days: [first, second],
      attractionPriceReference: { configVersion: 1, items: [], total: "999.00" } }]);
    const workspace = await setup();
    const total = () => workspace.attractionPriceReference.value?.total;
    expect(total()).toBe("24.60");
    await workspace.removeDay(1);
    expect(workspace.plan.value!.deletedDays).toHaveLength(1);
    expect(total()).toBe("12.30");
    workspace.plan.value!.days[0]!.items.push({ ...first.items[0]!, id: "i4" });
    expect(total()).toBe("24.60");
    workspace.plan.value!.days[0]!.items[0]!.attractionId = null;
    expect(total()).toBe("12.30");
    vi.mocked(websiteService.config).mockResolvedValueOnce({ version: 2, attractions: [{ id: "paid", chargeable: true, price: "1.00" }] } as WebsiteConfig);
    await workspace.useCurrentConfig();
    expect(workspace.attractionPriceReference.value).toMatchObject({ configVersion: 2, total: "1.00" });
    // 只读投影不进入保存白名单。
    expect(websiteItineraryInput(workspace.plan.value!)).not.toHaveProperty("attractionPriceReference");
  });
});

describe("website itinerary request payloads and dirty tracking", () => {
  const nightlyPrice: WebsiteVehiclePrice = {
    vehicleType: "7_seat",
    hotelTier: null,
    unitPrice: "600.00",
    includesDriver: true,
    includesGuide: false,
    priceComponents: PRICE_CATEGORIES.map((category, index) => ({
      category,
      unitPrice: index === 2 ? "600.00" : null,
      showInPdf: index === 2,
    })),
  };
  const sentBody = (fn: typeof request.post | typeof request.put) => {
    const raw = vi.mocked(fn).mock.lastCall?.[1];
    return { raw, json: JSON.parse(JSON.stringify(raw)) as Record<string, unknown> };
  };

  it("applies itinerary defaults in createItinerary while preserving caller-provided values", async () => {
    vi.mocked(request.post).mockResolvedValue({ ...plan });
    await websiteService.createItinerary("inquiry", {
      title: "New Trip",
      duration: 3,
      startDate: "2026-12-01",
      pax: 2,
      configVersion: 1,
      days: [],
      vehiclePrices: [],
      inquiryVersion: 2,
    });
    const { json: defaulted } = sentBody(request.post);
    expect(request.post).toHaveBeenCalledWith("/website/inquiries/inquiry/itineraries", expect.any(Object));
    expect(defaulted).toMatchObject({
      title: "New Trip",
      inquiryVersion: 2,
      reorderDraft: null,
      deletedDays: [],
      hotelPricingMode: "tiered",
      nightlyShowHotelPrice: false,
      nightlyVehiclePrices: [],
    });

    const explicitReorder = {
      dayIds: ["d1"],
      addedDayIds: [],
      deletedDays: [],
      placements: [],
      copies: [],
      overnight: [],
    };
    const deletedDay = { day: emptyDay(1), originalDate: "2026-12-01" };
    await websiteService.createItinerary("inquiry", {
      title: "Explicit Nightly Trip",
      duration: 3,
      startDate: "2026-12-01",
      pax: 2,
      configVersion: 1,
      days: [],
      vehiclePrices: [],
      reorderDraft: explicitReorder,
      deletedDays: [deletedDay],
      hotelPricingMode: "nightly",
      nightlyShowHotelPrice: true,
      nightlyVehiclePrices: [{ ...nightlyPrice }],
      inquiryVersion: 2,
    });
    const { json: explicit } = sentBody(request.post);
    expect(explicit).toMatchObject({
      title: "Explicit Nightly Trip",
      inquiryVersion: 2,
      reorderDraft: explicitReorder,
      deletedDays: [deletedDay],
      hotelPricingMode: "nightly",
      nightlyShowHotelPrice: true,
      nightlyVehiclePrices: [
        {
          vehicleType: "7_seat",
          hotelTier: null,
          unitPrice: "600.00",
          priceComponents: nightlyPrice.priceComponents,
        },
      ],
    });
  });

  it.each(["hotelPricingMode", "nightlyShowHotelPrice", "nightlyVehiclePrices"] as const)(
    "omits a single missing %s field in saveItinerary and validateItinerary while whitelist-mapping prices",
    async (missingField) => {
      vi.mocked(request.put).mockResolvedValue({ ...plan });
      vi.mocked(request.post).mockResolvedValue(preview);
      const record: WebsiteItinerary = {
        ...plan,
        businessUnit: "website",
        hotelPricingMode: "nightly",
        nightlyShowHotelPrice: true,
        nightlyVehiclePrices: [{ ...nightlyPrice }],
        vehiclePrices: [],
      };
      delete record[missingField];

      await websiteService.saveItinerary(record);
      const saved = sentBody(request.put);
      expect(saved.raw).not.toHaveProperty(missingField);
      expect(saved.json).not.toHaveProperty(missingField);

      await websiteService.validateItinerary(record);
      const validated = sentBody(request.post);
      expect(validated.raw).not.toHaveProperty(missingField);
      expect(validated.json).not.toHaveProperty(missingField);

      for (const body of [saved.json, validated.json]) {
        expect(body.version).toBe(3);
        if (missingField !== "hotelPricingMode") expect(body.hotelPricingMode).toBe("nightly");
        if (missingField !== "nightlyShowHotelPrice") expect(body.nightlyShowHotelPrice).toBe(true);
        if (missingField !== "nightlyVehiclePrices") {
          expect(body.nightlyVehiclePrices).toEqual([
            {
              vehicleType: "7_seat",
              hotelTier: null,
              unitPrice: "600.00",
              priceComponents: nightlyPrice.priceComponents,
            },
          ]);
        }
      }
    },
  );

  it("distinguishes omitted optional fields from explicit false, empty arrays, tiered mode, and cleared reorderDraft", async () => {
    vi.mocked(request.put).mockResolvedValue({ ...plan });
    vi.mocked(request.post).mockResolvedValue(preview);

    const omitted: WebsiteItinerary = { ...plan, businessUnit: "website" };
    await websiteService.saveItinerary(omitted);
    await websiteService.validateItinerary(omitted);
    for (const fn of [request.put, request.post] as const) {
      const { json } = sentBody(fn);
      expect(json).not.toHaveProperty("hotelPricingMode");
      expect(json).not.toHaveProperty("nightlyShowHotelPrice");
      expect(json).not.toHaveProperty("nightlyVehiclePrices");
      expect(json).not.toHaveProperty("deletedDays");
      expect(json).not.toHaveProperty("reorderDraft");
    }

    const explicit: WebsiteItinerary = {
      ...plan,
      businessUnit: "website",
      hotelPricingMode: "tiered",
      nightlyShowHotelPrice: false,
      nightlyVehiclePrices: [],
      deletedDays: [],
      reorderDraft: {
        dayIds: ["d1"],
        addedDayIds: [],
        deletedDays: [],
        placements: [],
        copies: [],
        overnight: [],
      },
    };
    explicit.reorderDraft = null;

    await websiteService.saveItinerary(explicit);
    await websiteService.validateItinerary(explicit);
    for (const fn of [request.put, request.post] as const) {
      expect(sentBody(fn).json).toMatchObject({
        hotelPricingMode: "tiered",
        nightlyShowHotelPrice: false,
        nightlyVehiclePrices: [],
        deletedDays: [],
        reorderDraft: null,
      });
    }
  });

  it("sends explicit day remark clears, keeps remarks on recycled days, and omits a missing remark", async () => {
    vi.mocked(request.put).mockResolvedValue({ ...plan });
    const cleared = { ...emptyDay(1), id: "d1", internalRemark: "" };
    const noted = { ...emptyDay(2), id: "d2", internalRemark: "接机后先去酒店" };
    const legacy: ReturnType<typeof emptyDay> = { ...emptyDay(3), id: "d3" };
    delete legacy.internalRemark;
    const recycled = { ...emptyDay(4), id: "d4", internalRemark: "客人想看日落" };
    await websiteService.saveItinerary({
      ...plan,
      businessUnit: "website",
      days: [cleared, noted, legacy],
      deletedDays: [{ day: recycled, originalDate: null }],
    });
    const json = sentBody(request.put).json as { days: { internalRemark?: string }[]; deletedDays: { day: { internalRemark?: string } }[] };
    expect(json.days.map(day => day.internalRemark)).toEqual(["", "接机后先去酒店", undefined]);
    expect(json.days[2]).not.toHaveProperty("internalRemark");
    expect(json.deletedDays[0]!.day.internalRemark).toBe("客人想看日落");
  });

  it("keeps dirty false on open, omits missing pricing fields on title-only edits, and saves explicit mode or clear changes", async () => {
    const workspace = await setup();
    expect(workspace.dirty.value).toBe(false);

    workspace.plan.value!.title = "Renamed Trip";
    expect(workspace.dirty.value).toBe(true);
    vi.mocked(request.put).mockImplementationOnce(async (_, body) => ({
      ...(body as WebsiteItinerary),
      id: "plan",
      businessUnit: "website",
      inquiryId: "inquiry",
      code: "WIT-1",
      status: "draft",
      version: 4,
      createdAt: "",
      updatedAt: "",
    }));
    expect(await workspace.save()).toBe(true);
    const titleEditJson = sentBody(request.put).json;
    expect(titleEditJson.title).toBe("Renamed Trip");
    expect(titleEditJson).not.toHaveProperty("hotelPricingMode");
    expect(titleEditJson).not.toHaveProperty("nightlyShowHotelPrice");
    expect(titleEditJson).not.toHaveProperty("nightlyVehiclePrices");
    expect(titleEditJson).not.toHaveProperty("deletedDays");
    expect(titleEditJson).not.toHaveProperty("reorderDraft");
    expect(workspace.dirty.value).toBe(false);

    vi.mocked(websiteService.itineraries).mockResolvedValueOnce([
      {
        ...plan,
        businessUnit: "website",
        hotelPricingMode: "nightly",
        nightlyShowHotelPrice: true,
        nightlyVehiclePrices: [{ ...nightlyPrice }],
        reorderDraft: {
          dayIds: [],
          addedDayIds: [],
          deletedDays: [],
          placements: [],
          copies: [],
          overnight: [],
        },
      },
    ]);
    scope.stop();
    scope = effectScope();
    const loaded = await setup();
    expect(loaded.dirty.value).toBe(false);

    loaded.plan.value!.hotelPricingMode = "tiered";
    loaded.plan.value!.nightlyShowHotelPrice = false;
    loaded.plan.value!.nightlyVehiclePrices = [];
    loaded.plan.value!.reorderDraft = null;
    expect(loaded.dirty.value).toBe(true);

    vi.mocked(request.put).mockImplementationOnce(async (_, body) => ({
      ...loaded.plan.value!,
      ...(body as Partial<WebsiteItinerary>),
      version: 5,
    }));
    expect(await loaded.save()).toBe(true);
    expect(sentBody(request.put).json).toMatchObject({
      hotelPricingMode: "tiered",
      nightlyShowHotelPrice: false,
      nightlyVehiclePrices: [],
      reorderDraft: null,
    });
    expect(loaded.dirty.value).toBe(false);
  });
});
