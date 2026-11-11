import { computed, onBeforeUnmount, ref, watch, type ComputedRef, type Ref } from "vue";
import type { InquiryRecord } from "@/types/inquiry";
import type { CustomerExportLanguage, ItineraryRecord } from "@/types/itinerary";
import { inquiryService, type PdfData } from "@/services/inquiry.service";
import {
  printItineraryDocument,
  generateItineraryPrintDocument,
  type ItineraryPrintDocument,
} from "./pdf";
import { downloadWordDocument, generateItineraryWordDocument, loadQuoteImages } from "./docx";
import { getDayCountMismatch, getItineraryValidationIssues } from "./workflow";

interface ItineraryPdfOptions {
  inquiry: Readonly<Ref<InquiryRecord | undefined>>;
  selectedItinerary: ComputedRef<ItineraryRecord | undefined>;
  canGenerate: () => boolean;
  canDownload: () => boolean;
  onRefreshError: (error: unknown) => void;
}

export function useItineraryPdf(options: ItineraryPdfOptions) {
  const showChildPrice = ref(false);
  /** 客户文件语言，与界面语言无关；仅盛旭可选英文。 */
  const exportLanguage = ref<CustomerExportLanguage>("zh");
  const canChooseLanguage = computed(() => options.inquiry.value?.businessUnit === "shengxu");
  const language = () => (canChooseLanguage.value ? exportLanguage.value : "zh");
  let previewShowChildPrice = false;
  const isPdfPreviewVisible = ref(false);
  const isGeneratingPdf = ref(false);
  const isGeneratingWord = ref(false);
  const pdfPreviewFile = ref<ItineraryPrintDocument>();
  const pdfPreviewUrl = ref("");
  let previewSource = "";
  let previewData: PdfData | undefined;
  const isDownloadingPdf = ref(false);
  const canDownloadOriginal = computed(
    () => options.canDownload() && options.selectedItinerary.value?.status === "quoted",
  );

  function validatePdf() {
    const plan = options.selectedItinerary.value;
    const inquiry = options.inquiry.value;
    if (!plan || !inquiry || !options.canGenerate()) return null;
    const issues = getItineraryValidationIssues(plan);
    // 系列询盘没有计划天数，不比较行程天数。
    const plannedDays = inquiry.plannedDays;
    return {
      issues,
      dayCountMismatch:
        plannedDays === null ? null : getDayCountMismatch(plan.dailyPlans.length, plannedDays),
      actualDays: plan.dailyPlans.length,
      plannedDays: plannedDays ?? plan.dailyPlans.length,
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
      previewShowChildPrice = showChildPrice.value;
      const data = await inquiryService.pdfData(plan.id, language());
      if (data.itinerary.version !== plan.version) return false;
      const file = await generateItineraryPrintDocument(
        data.itinerary,
        data.inquiry,
        data,
        previewShowChildPrice,
      );
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

  async function refreshConfirmed(plan: ItineraryRecord, inquiry: InquiryRecord) {
    // 确认已落库；快照仍可能带确认前版本，不能据此恢复可编辑状态或猜测新版本。
    plan.status = "quoted";
    inquiry.status = "quoted";
    closePdfPreview();
    const results = await Promise.allSettled([
      inquiryService.itinerary(plan.id).then((record) => Object.assign(plan, record)),
      inquiryService.detail(inquiry.id).then((record) => Object.assign(inquiry, record)),
    ]);
    const failure = results.find((result) => result.status === "rejected");
    if (failure) options.onRefreshError(failure.reason);
  }

  async function confirmPdfDownload(): Promise<boolean> {
    const plan = options.selectedItinerary.value;
    const inquiry = options.inquiry.value;
    if (
      isDownloadingPdf.value ||
      !plan ||
      !inquiry ||
      !pdfPreviewFile.value ||
      !previewData ||
      !options.canGenerate() ||
      JSON.stringify(plan) !== previewSource
    )
      return false;
    isDownloadingPdf.value = true;
    try {
      const data = await inquiryService.confirmPdf(previewData);
      await refreshConfirmed(plan, inquiry);
      const file = await generateItineraryPrintDocument(
        data.itinerary,
        data.inquiry,
        data,
        previewShowChildPrice,
      );
      // 下载点击先于打印落库，打印被取消也算已点击。
      await inquiryService.recordDownload(plan.id);
      await printItineraryDocument(file);
      closePdfPreview();
      return true;
    } finally {
      isDownloadingPdf.value = false;
    }
  }
  async function downloadOriginal() {
    const id = options.selectedItinerary.value?.id;
    if (!id || !canDownloadOriginal.value || isGeneratingPdf.value) return;
    isGeneratingPdf.value = true;
    try {
      const data = await inquiryService.pdfData(id, language());
      await inquiryService.recordDownload(id);
      await printItineraryDocument(
        await generateItineraryPrintDocument(
          data.itinerary,
          data.inquiry,
          data,
          showChildPrice.value,
        ),
      );
    } finally {
      isGeneratingPdf.value = false;
    }
  }

  // Word and PDF share one frozen quote: a draft is confirmed and frozen on first export, a quoted itinerary reads the frozen data.
  async function exportWord(): Promise<boolean> {
    const plan = options.selectedItinerary.value;
    const inquiry = options.inquiry.value;
    if (!plan || !inquiry || isGeneratingWord.value) return false;
    isGeneratingWord.value = true;
    try {
      let data = await inquiryService.pdfData(plan.id, language());
      if (plan.status === "draft") {
        if (data.itinerary.version !== plan.version) return false;
        data = await inquiryService.confirmPdf(data);
        await refreshConfirmed(plan, inquiry);
      }
      const file = await generateItineraryWordDocument(
        data.itinerary,
        data,
        showChildPrice.value,
        await loadQuoteImages(),
      );
      await inquiryService.recordDownload(plan.id);
      downloadWordDocument(file);
      return true;
    } finally {
      isGeneratingWord.value = false;
    }
  }

  function closePdfPreview() {
    isPdfPreviewVisible.value = false;
    if (pdfPreviewUrl.value) URL.revokeObjectURL(pdfPreviewUrl.value);
    pdfPreviewUrl.value = "";
    pdfPreviewFile.value = undefined;
    previewSource = "";
    previewData = undefined;
  }

  watch(
    () => options.selectedItinerary.value?.id,
    () => {
      closePdfPreview();
      showChildPrice.value = false;
      exportLanguage.value = "zh";
    },
  );
  // 切换语言后旧预览不再对应所选语言，需要重新预览。
  watch(exportLanguage, closePdfPreview);
  onBeforeUnmount(closePdfPreview);

  return {
    showChildPrice,
    exportLanguage,
    canChooseLanguage,
    isDownloadingPdf,
    canDownloadOriginal,
    downloadOriginal,
    closePdfPreview,
    confirmPdfDownload,
    generatePreview,
    isGeneratingPdf,
    isGeneratingWord,
    exportWord,
    isPdfPreviewVisible,
    pdfPreviewUrl,
    validatePdf,
  };
}
