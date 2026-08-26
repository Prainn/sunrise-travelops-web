import { onBeforeUnmount, ref, type ComputedRef } from "vue";
import type { InquiryRecord } from "@/types/inquiry";
import type { ItineraryRecord } from "@/types/itinerary";
import { formatDateTime } from "@/utils";
import { transitionInquiry } from "../inquiry-workflow";
import { transitionItinerary } from "./itinerary-workflow";
import { downloadGeneratedItineraryPdf, generateItineraryPdf, type GeneratedItineraryPdf } from "./pdf";
import { getDayCountMismatch, validateItineraryForPdf } from "./workflow";

interface ItineraryPdfOptions {
  inquiry: ComputedRef<InquiryRecord | undefined>;
  selectedItinerary: ComputedRef<ItineraryRecord | undefined>;
  canGenerate: () => boolean;
}

export function useItineraryPdf(options: ItineraryPdfOptions) {
  const isPdfPreviewVisible = ref(false);
  const isGeneratingPdf = ref(false);
  const pdfPreviewFile = ref<GeneratedItineraryPdf>();
  const pdfPreviewUrl = ref("");

  function validatePdf() {
    const plan = options.selectedItinerary.value;
    const inquiry = options.inquiry.value;
    if (!plan || !inquiry || !options.canGenerate()) return null;
    const validation = validateItineraryForPdf(plan.dailyPlans);
    return {
      ...validation,
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
      pdfPreviewFile.value = await generateItineraryPdf(plan, inquiry);
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
    if (!plan || !inquiry || !pdfPreviewFile.value) return false;
    downloadGeneratedItineraryPdf(pdfPreviewFile.value);
    plan.status = transitionItinerary(plan.status, "generate_quote");
    plan.updatedAt = formatDateTime(new Date());
    inquiry.status = transitionInquiry(inquiry.status, "quote_generated");
    closePdfPreview();
    return true;
  }

  function closePdfPreview() {
    isPdfPreviewVisible.value = false;
    if (pdfPreviewUrl.value) URL.revokeObjectURL(pdfPreviewUrl.value);
    pdfPreviewUrl.value = "";
    pdfPreviewFile.value = undefined;
  }

  onBeforeUnmount(closePdfPreview);

  return {
    closePdfPreview, confirmPdfDownload, generatePreview, isGeneratingPdf,
    isPdfPreviewVisible, pdfPreviewUrl, validatePdf,
  };
}
