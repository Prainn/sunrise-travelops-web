import { computed, onBeforeUnmount, ref, watch, type ComputedRef, type Ref } from "vue";
import type { InquiryRecord } from "@/types/inquiry";
import type { ItineraryRecord } from "@/types/itinerary";
import { inquiryService, type PdfData } from "@/services/inquiry.service";
import { calculateItineraryQuote } from "./quote-pricing";
import { getEnabledHotelPlans, getIncompleteHotelPlanTiers } from "./hotel-plans";
import { downloadGeneratedItineraryPdf, generateItineraryPdf, type GeneratedItineraryPdf } from "./pdf";
import { getEnabledVehiclePlans, getIncompleteVehiclePlanTiers } from "./vehicle-plans";
import { getDayCountMismatch, validateItineraryForPdf, type PdfValidationIssue } from "./workflow";

interface ItineraryPdfOptions {
  inquiry: Readonly<Ref<InquiryRecord | undefined>>;
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
  let previewData: PdfData | undefined;
  const isDownloadingPdf = ref(false);
  const canDownloadOriginal = computed(() => options.canDownload() && options.selectedItinerary.value?.status === "quoted");

  function validatePdf() {
    const plan = options.selectedItinerary.value;
    const inquiry = options.inquiry.value;
    if (!plan || !inquiry || !options.canGenerate()) return null;
    const issues: PdfValidationIssue[] = validateItineraryForPdf(plan.dailyPlans);
    const costs = plan.dailyPlans.flatMap(d => d.items).reduce((sum, item) => sum + item.totalCost, 0);
    if (calculateItineraryQuote(plan, costs).options.some(o => (plan.quote.otherExpenses ?? 0) > o.totalPrice)) issues.push({ key: "itinerary.otherExpensesExceedTotal", target: "quote" });
    if (!getEnabledHotelPlans(plan).length) issues.push({ key: "itinerary.pdfHotelPlanRequired", target: "itinerary-plans" });
    if (getIncompleteHotelPlanTiers(plan).length) issues.push({ key: "itinerary.validation.hotels", target: "itinerary-plans" });
    if (!getEnabledVehiclePlans(plan).length || getIncompleteVehiclePlanTiers(plan).length) {
      issues.push({ key: "itinerary.validation.vehicles", target: "itinerary-plans" });
    }
    if (!plan.quote.options.length) issues.push({ key: "itinerary.configureQuotePlansFirst", target: "quote" });
    if (plan.guidePlans.some((guide) => !guide.serviceDays)) issues.push({ key: "itinerary.guideDatesRequired", target: "itinerary-plans" });
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
      const data = await inquiryService.pdfData(plan.id);
      if (data.itinerary.version !== plan.version) return false;
      const file = await generateItineraryPdf(data.itinerary, data.inquiry, data);
      previewData = data;
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

  async function confirmPdfDownload(): Promise<boolean> {
    const plan = options.selectedItinerary.value;
    const inquiry = options.inquiry.value;
    if (isDownloadingPdf.value || !plan || !inquiry || !pdfPreviewFile.value || !previewData || !options.canGenerate() || JSON.stringify(plan) !== previewSource) return false;
    isDownloadingPdf.value = true;
    try {
      const data = await inquiryService.confirmPdf(previewData);
      Object.assign(plan, await inquiryService.itinerary(plan.id));
      Object.assign(inquiry, await inquiryService.detail(inquiry.id));
      const file = await generateItineraryPdf(data.itinerary,data.inquiry,data);
      downloadGeneratedItineraryPdf(file);
      closePdfPreview();
      return true;
    } finally { isDownloadingPdf.value = false; }
  }
  async function downloadOriginal() {
    const id = options.selectedItinerary.value?.id;
    if (!id || !canDownloadOriginal.value || isGeneratingPdf.value) return;
    isGeneratingPdf.value = true;
    try {
      const data = await inquiryService.pdfData(id);
      downloadGeneratedItineraryPdf(await generateItineraryPdf(data.itinerary,data.inquiry,data));
    } finally { isGeneratingPdf.value = false; }
  }

  function closePdfPreview() {
    isPdfPreviewVisible.value = false;
    if (pdfPreviewUrl.value) URL.revokeObjectURL(pdfPreviewUrl.value);
    pdfPreviewUrl.value = "";
    pdfPreviewFile.value = undefined;
    previewSource = "";
    previewData = undefined;
  }

  watch(() => options.selectedItinerary.value?.id, closePdfPreview);
  onBeforeUnmount(closePdfPreview);

  return {
    isDownloadingPdf, canDownloadOriginal, downloadOriginal, closePdfPreview, confirmPdfDownload, generatePreview, isGeneratingPdf,
    isPdfPreviewVisible, pdfPreviewUrl, validatePdf,
  };
}
