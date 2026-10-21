import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { computed, effectScope, ref } from "vue";
import type * as Vue from "vue";
import type { InquiryRecord } from "@/types/inquiry";
import type { ItineraryRecord } from "@/types/itinerary";
import { inquiryService, type PdfData } from "@/services/inquiry.service";
import { useItineraryPdf } from "./useItineraryPdf";
import { generateItineraryPrintDocument, printItineraryDocument } from "./pdf";
import { downloadWordDocument } from "./docx";

vi.mock("vue", async (original) => ({ ...await original<typeof Vue>(), onBeforeUnmount: vi.fn() }));
vi.mock("@/services/inquiry.service", () => ({ inquiryService: {
  pdfData: vi.fn(), confirmPdf: vi.fn(), itinerary: vi.fn(), detail: vi.fn(), recordDownload: vi.fn(),
} }));
vi.mock("./pdf", () => ({ generateItineraryPrintDocument: vi.fn(), printItineraryDocument: vi.fn() }));
vi.mock("./docx", () => ({ generateItineraryWordDocument: vi.fn(), downloadWordDocument: vi.fn(), loadQuoteImages: vi.fn() }));

const scopes: ReturnType<typeof effectScope>[] = [];
function setup() {
  const plan = ref({ id: "plan", version: 3, status: "draft", dailyPlans: [] } as unknown as ItineraryRecord);
  const inquiry = ref({ id: "inquiry", version: 5, status: "new" } as InquiryRecord);
  const frozen = { itinerary: { ...plan.value }, inquiry: { ...inquiry.value }, quoteCode: "Q1" } as PdfData;
  vi.mocked(inquiryService.pdfData).mockResolvedValue(frozen);
  vi.mocked(inquiryService.confirmPdf).mockResolvedValue(frozen);
  vi.mocked(inquiryService.itinerary).mockRejectedValue(new Error("refresh failed"));
  vi.mocked(inquiryService.detail).mockRejectedValue(new Error("refresh failed"));
  const warning = vi.fn();
  const scope = effectScope();
  scopes.push(scope);
  const pdf = scope.run(() => useItineraryPdf({
    inquiry, selectedItinerary: computed(() => plan.value),
    canGenerate: () => plan.value.status === "draft", canDownload: () => true,
    onRefreshError: warning,
  }))!;
  return { plan, inquiry, frozen, warning, pdf };
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(generateItineraryPrintDocument).mockResolvedValue({ blob: new Blob(["pdf"]) } as Awaited<ReturnType<typeof generateItineraryPrintDocument>>);
});
afterEach(() => scopes.splice(0).forEach((scope) => scope.stop()));

describe("confirmed export recovery", () => {
  it("prints frozen PDF despite both refresh failures and prevents a second confirmation", async () => {
    const { plan, inquiry, frozen, warning, pdf } = setup();
    await pdf.generatePreview();
    expect(await pdf.confirmPdfDownload()).toBe(true);
    expect(plan.value.status).toBe("quoted");
    expect(inquiry.value.status).toBe("quoted");
    expect(plan.value.version).toBe(3);
    expect(warning).toHaveBeenCalledOnce();
    expect(generateItineraryPrintDocument).toHaveBeenLastCalledWith(frozen.itinerary, frozen.inquiry, frozen, false);
    expect(printItineraryDocument).toHaveBeenCalledOnce();
    expect(pdf.isPdfPreviewVisible.value).toBe(false);
    expect(await pdf.confirmPdfDownload()).toBe(false);
    expect(inquiryService.confirmPdf).toHaveBeenCalledOnce();
  });

  it("downloads Word and merges the successful refresh independently", async () => {
    const { plan, inquiry, pdf, warning } = setup();
    vi.mocked(inquiryService.detail).mockResolvedValue({ ...inquiry.value, status: "quoted", version: 6 });
    expect(await pdf.exportWord()).toBe(true);
    expect(plan.value.status).toBe("quoted");
    expect(inquiry.value.version).toBe(6);
    expect(warning).toHaveBeenCalledOnce();
    expect(downloadWordDocument).toHaveBeenCalledOnce();
    await pdf.exportWord();
    expect(inquiryService.confirmPdf).toHaveBeenCalledOnce();
  });

  it("keeps the quote locked if printing fails and allows frozen re-export", async () => {
    const { plan, pdf } = setup();
    await pdf.generatePreview();
    vi.mocked(printItineraryDocument).mockRejectedValueOnce(new Error("print failed"));
    await expect(pdf.confirmPdfDownload()).rejects.toThrow("print failed");
    expect(plan.value.status).toBe("quoted");
    expect(pdf.isDownloadingPdf.value).toBe(false);
    expect(pdf.isPdfPreviewVisible.value).toBe(false);
    await pdf.downloadOriginal();
    expect(inquiryService.confirmPdf).toHaveBeenCalledOnce();
    expect(printItineraryDocument).toHaveBeenCalledTimes(2);
  });

  it("does not lock a draft or download if confirmation fails", async () => {
    const { plan, inquiry, pdf } = setup();
    vi.mocked(inquiryService.confirmPdf).mockRejectedValueOnce(new Error("conflict"));
    await expect(pdf.exportWord()).rejects.toThrow("conflict");
    expect(plan.value.status).toBe("draft");
    expect(inquiry.value.status).toBe("new");
    expect(inquiryService.recordDownload).not.toHaveBeenCalled();
    expect(pdf.isGeneratingWord.value).toBe(false);
  });
});
