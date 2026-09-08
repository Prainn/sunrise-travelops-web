import { computed, onBeforeUnmount, ref, shallowReactive, watch, type ComputedRef } from "vue";
import type { InquiryRecord } from "@/types/inquiry";
import type { ItineraryRecord } from "@/types/itinerary";
import { formatDateTime } from "@/utils";
import { transitionInquiry } from "../inquiry-workflow";
import { getEnabledHotelPlans, getIncompleteHotelPlanTiers } from "./hotel-plans";
import { transitionItinerary } from "./itinerary-workflow";
import { downloadGeneratedItineraryPdf, generateItineraryPdf, type GeneratedItineraryPdf } from "./pdf";
import { getEnabledVehiclePlans, getIncompleteVehiclePlanTiers } from "./vehicle-plans";
import { getDayCountMismatch, validateItineraryForPdf, type PdfValidationIssue } from "./workflow";

// Frontend phase: retain generated originals for the current application session.
const originalPdfs = shallowReactive(new Map<string, GeneratedItineraryPdf>());

interface ItineraryPdfOptions {
  inquiry: ComputedRef<InquiryRecord | undefined>;
  selectedItinerary: ComputedRef<ItineraryRecord | undefined>;
  canGenerate: () => boolean;
  canDownload: () => boolean;
}

export function useItineraryPdf(options: ItineraryPdfOptions) {
  const isPdfPreviewVisible = ref(false);
  const isGeneratingPdf = ref(false);
  const pdfPreviewFile = ref<GeneratedItineraryPdf>();
  const pdfPreviewUrl = ref("");
  let previewSource = "";
  const canDownloadOriginal = computed(() => options.canDownload() && originalPdfs.has(options.selectedItinerary.value?.id ?? ""));

  function validatePdf() {
    const plan = options.selectedItinerary.value;
    const inquiry = options.inquiry.value;
    if (!plan || !inquiry || !options.canGenerate()) return null;
    const issues: PdfValidationIssue[] = validateItineraryForPdf(plan.dailyPlans, plan.destinations);
    if (!getEnabledHotelPlans(plan).length) issues.push({ key: "itinerary.pdfHotelPlanRequired", target: "itinerary-plans" });
    if (getIncompleteHotelPlanTiers(plan).length) issues.push({ key: "itinerary.validation.hotels", target: "itinerary-plans" });
    if (!getEnabledVehiclePlans(plan).length || getIncompleteVehiclePlanTiers(plan).length) {
      issues.push({ key: "itinerary.validation.vehicles", target: "itinerary-plans" });
    }
    if (!plan.quote.options.length) issues.push({ key: "itinerary.configureQuotePlansFirst", target: "quote" });
    if (plan.guidePlans.some((guide) => !guide.dayIds.length || guide.dayIds.some((id) => !plan.dailyPlans.some((day) => day.id === id)))) issues.push({ key: "itinerary.guideDatesRequired", target: "itinerary-plans" });
    plan.quote.transportFees.forEach((fee, index) => {
      if ((!fee.departureCity.trim() || !fee.arrivalCity.trim() || fee.departureCity === fee.arrivalCity) || fee.unitPrice === null || !Number.isFinite(fee.unitPrice) || fee.unitPrice < 0) {
        issues.push({ key: "itinerary.validation.transportFee", target: "quote", params: { index: index + 1 } });
      }
    });
    return {
      issues,
      dayCountMismatch: getDayCountMismatch(plan.dailyPlans.length, inquiry.plannedDays),
      actualDays: plan.dailyPlans.length,
      plannedDays: inquiry.plannedDays,
    };
  }

  async function generatePreview(): Promise<boolean> {
    const plan = options.selectedItinerary.value;
    const inquiry = options.inquiry.value;
    if (!plan || !inquiry || !options.canGenerate()) return false;
    isGeneratingPdf.value = true;
    try {
      closePdfPreview();
      const source = JSON.stringify(plan);
      const file = await generateItineraryPdf(JSON.parse(source) as ItineraryRecord, { ...inquiry });
      if (options.selectedItinerary.value?.id !== plan.id || !options.canGenerate()) return false;
      previewSource = source;
      pdfPreviewFile.value = file;
      pdfPreviewUrl.value = URL.createObjectURL(pdfPreviewFile.value.blob);
      isPdfPreviewVisible.value = true;
      return true;
    } finally {
      isGeneratingPdf.value = false;
    }
  }

  function confirmPdfDownload(): boolean {
    const plan = options.selectedItinerary.value;
    const inquiry = options.inquiry.value;
    if (!plan || !inquiry || !pdfPreviewFile.value || !options.canGenerate() || JSON.stringify(plan) !== previewSource) return false;
    originalPdfs.set(plan.id, pdfPreviewFile.value);
    downloadGeneratedItineraryPdf(pdfPreviewFile.value);
    plan.status = transitionItinerary(plan.status, "generate_quote");
    plan.quoteGeneratedAt = pdfPreviewFile.value.generatedAt;
    plan.updatedAt = formatDateTime(new Date());
    inquiry.status = transitionInquiry(inquiry.status, "quote_generated");
    closePdfPreview();
    return true;
  }

  function downloadOriginal() {
    if (!canDownloadOriginal.value) return;
    const file = originalPdfs.get(options.selectedItinerary.value!.id);
    if (file) downloadGeneratedItineraryPdf(file);
  }

  function closePdfPreview() {
    isPdfPreviewVisible.value = false;
    if (pdfPreviewUrl.value) URL.revokeObjectURL(pdfPreviewUrl.value);
    pdfPreviewUrl.value = "";
    pdfPreviewFile.value = undefined;
    previewSource = "";
  }

  watch(() => options.selectedItinerary.value?.id, closePdfPreview);
  onBeforeUnmount(closePdfPreview);

  return {
    canDownloadOriginal, downloadOriginal, closePdfPreview, confirmPdfDownload, generatePreview, isGeneratingPdf,
    isPdfPreviewVisible, pdfPreviewUrl, validatePdf,
  };
}
