import { computed, ref } from "vue";
import { useInquiryLog } from "@/composables/useInquiryLog";
import { useUserStore } from "@/stores/user";
import type { ItineraryRecord, ItineraryResourceItem } from "@/types/itinerary";
import { formatDateTime, hasUserPermission, sumMoney } from "@/utils";
import { isInquiryReadOnly } from "../inquiry-workflow";
import { canPerformItineraryOperation } from "./itinerary-workflow";
import { calculateItineraryQuote } from "./quote-pricing";
import { useItineraryEditor } from "./useItineraryEditor";
import { useItineraryPdf } from "./useItineraryPdf";
import { useItinerarySelection } from "./useItinerarySelection";

interface WorkspaceMessages {
  confirm: (key: string, params?: Record<string, unknown>) => Promise<boolean>;
  error: (key: string) => void;
  success: (key: string) => void;
  warning: (key: string, params: Record<string, unknown>) => void;
  translate: (key: string) => string;
}

export function useItineraryWorkspace(messages: WorkspaceMessages) {
  const userStore = useUserStore();
  const { recordInquiryLog } = useInquiryLog();
  const selection = useItinerarySelection();
  const { inquiry, inquiryId, itineraryStore, selectedItinerary, selectedItineraryId } = selection;
  const isPlanDialogVisible = ref(false);
  const isEditingPlan = ref(false);
  const isResourceDialogVisible = ref(false);
  const resourceTargetDayId = ref("");
  const inquiryReadOnly = computed(() => inquiry.value ? isInquiryReadOnly(inquiry.value.status) : true);
  const isDraft = computed(() => selectedItinerary.value?.status === "draft");
  const canCreateItinerary = computed(() => !inquiryReadOnly.value && hasUserPermission(userStore.userInfo, "itinerary:create"));
  const contentEditable = computed(() => Boolean(
    selectedItinerary.value
    && !inquiryReadOnly.value
    && canPerformItineraryOperation(selectedItinerary.value.status, "edit_content")
    && hasUserPermission(userStore.userInfo, "itinerary:update")
  ));
  const priceEditable = computed(() => Boolean(
    selectedItinerary.value
    && !inquiryReadOnly.value
    && canPerformItineraryOperation(selectedItinerary.value.status, "edit_price")
    && hasUserPermission(userStore.userInfo, "itinerary:price")
  ));
  const canGeneratePdf = computed(() => Boolean(
    selectedItinerary.value
    && !inquiryReadOnly.value
    && canPerformItineraryOperation(selectedItinerary.value.status, "generate_pdf")
    && hasUserPermission(userStore.userInfo, "itinerary:pdf")
  ));
  const canSaveItinerary = computed(() => contentEditable.value || priceEditable.value);
  const canEditItineraryBasics = computed(() => contentEditable.value);
  const guestCount = computed(() => selectedItinerary.value
    ? selectedItinerary.value.adults + selectedItinerary.value.childrenCount : 0);
  const allItems = computed(() => selectedItinerary.value?.dailyPlans.flatMap((day) => day.items) ?? []);
  const totalCost = computed(() => sumMoney(allItems.value.map((item) => item.totalCost)));
  const itemCount = computed(() => allItems.value.length);
  const quoteCalculation = computed(() => selectedItinerary.value
    ? calculateItineraryQuote(selectedItinerary.value, totalCost.value)
    : null);
  const hotelRoomCount = computed(() => quoteCalculation.value?.hotelRoomCount ?? 0);

  const editor = useItineraryEditor({
    inquiry,
    inquiryId,
    itineraryStore,
    selectedItinerary,
    selectedItineraryId,
    canCreate: () => canCreateItinerary.value,
    canEditContent: () => contentEditable.value,
    canEditPrice: () => priceEditable.value,
    getCreator: () => userStore.userInfo.username ?? "",
  });
  const itineraryForm = ref<ItineraryRecord>(editor.createEmptyItinerary());
  const pdf = useItineraryPdf({
    inquiry,
    selectedItinerary,
    canGenerate: () => canGeneratePdf.value,
  });

  function openCreateDialog() {
    if (!canCreateItinerary.value) return;
    isEditingPlan.value = false;
    itineraryForm.value = { ...editor.createEmptyItinerary(), code: editor.generateItineraryCode() };
    isPlanDialogVisible.value = true;
  }

  function openEditDialog() {
    const plan = selectedItinerary.value;
    if (!plan || !canEditItineraryBasics.value) return;
    isEditingPlan.value = true;
    itineraryForm.value = { ...plan, dailyPlans: [...plan.dailyPlans] };
    isPlanDialogVisible.value = true;
  }

  async function createItinerary(record: ItineraryRecord) {
    const created = editor.createItinerary(record);
    if (!created) return;
    isPlanDialogVisible.value = false;
    await recordInquiryLog({
      inquiryId: created.inquiryId,
      action: "itinerary_created",
      targetType: "itinerary",
      targetId: created.id,
      targetCode: created.code,
      summary: created.title,
      metadata: { creationMode: "new" },
    });
    messages.success("common.createSuccess");
  }

  async function submitItineraryPlan(record: ItineraryRecord) {
    if (!isEditingPlan.value) {
      await createItinerary(record);
      return;
    }
    const updated = editor.updateItineraryBasics(record);
    if (!updated) return;
    isPlanDialogVisible.value = false;
    await recordInquiryLog({
      inquiryId: updated.inquiryId,
      action: "itinerary_saved",
      targetType: "itinerary",
      targetId: updated.id,
      targetCode: updated.code,
      summary: updated.title,
      metadata: { editScope: "basic" },
    });
    messages.success("common.updateSuccess");
  }

  function openResourceDialog(dayId: string) {
    if (!contentEditable.value) return;
    resourceTargetDayId.value = dayId;
    isResourceDialogVisible.value = true;
  }

  function addResourceItem(item: ItineraryResourceItem) {
    if (editor.addResourceItem(resourceTargetDayId.value, item)) messages.success("itinerary.resourceAdded");
  }

  async function copyItinerary() {
    const copied = editor.copyItinerary(messages.translate("itinerary.copySuffix"));
    if (!copied) return;
    await recordInquiryLog({
      inquiryId: copied.inquiryId,
      action: "itinerary_created",
      targetType: "itinerary",
      targetId: copied.id,
      targetCode: copied.code,
      summary: copied.title,
      metadata: { creationMode: "copy" },
    });
    messages.success("itinerary.copySuccess");
  }

  async function saveItinerary() {
    const plan = selectedItinerary.value;
    if (!plan || !canSaveItinerary.value) return;
    plan.updatedAt = formatDateTime(new Date());
    await recordInquiryLog({
      inquiryId: plan.inquiryId,
      action: "itinerary_saved",
      targetType: "itinerary",
      targetId: plan.id,
      targetCode: plan.code,
      summary: plan.title,
    });
    messages.success("itinerary.saveSuccess");
  }

  async function removeDay(index: number) {
    if (!contentEditable.value || !await messages.confirm("itinerary.deleteDayConfirm")) return;
    editor.removeDay(index);
  }

  async function handleGeneratePdf() {
    const validation = pdf.validatePdf();
    if (!validation) return;
    if (validation.emptyDayNumbers.length) {
      messages.warning("itinerary.pdfEmptyDays", { days: validation.emptyDayNumbers.map((day) => `D${day}`).join("、") });
      return;
    }
    if (validation.dayCountMismatch) {
      const confirmed = await messages.confirm("itinerary.dayCountMismatch", {
        planned: validation.plannedDays,
        actual: validation.actualDays,
      });
      if (!confirmed) return;
    }
    try {
      await pdf.generatePreview();
    } catch {
      messages.error("itinerary.pdfGenerationFailed");
    }
  }

  async function confirmPdfDownload() {
    const plan = selectedItinerary.value;
    if (!plan || !pdf.confirmPdfDownload()) return;
    await recordInquiryLog({
      inquiryId: plan.inquiryId,
      action: "itinerary_pdf_generated",
      targetType: "itinerary",
      targetId: plan.id,
      targetCode: plan.code,
      summary: plan.title,
    });
    messages.success("itinerary.pdfGenerated");
  }

  return {
    addDay: editor.addDay,
    addResourceItem,
    canCreateItinerary,
    canEditItineraryBasics,
    canGeneratePdf,
    canSaveItinerary,
    closePdfPreview: pdf.closePdfPreview,
    confirmPdfDownload,
    contentEditable,
    copyItinerary,
    createItinerary,
    duplicateDay: editor.duplicateDay,
    guestCount,
    hotelRoomCount,
    handleGeneratePdf,
    inquiry,
    isEditingPlan,
    isDraft,
    isGeneratingPdf: pdf.isGeneratingPdf,
    isPdfPreviewVisible: pdf.isPdfPreviewVisible,
    isPlanDialogVisible,
    isResourceDialogVisible,
    itemCount,
    itineraryForm,
    moveDay: editor.moveDay,
    openCreateDialog,
    openEditDialog,
    openResourceDialog,
    pdfPreviewUrl: pdf.pdfPreviewUrl,
    priceEditable,
    quoteCalculation,
    removeDay,
    removeItem: editor.removeItem,
    router: selection.router,
    rows: selection.rows,
    selectedItinerary,
    selectedItineraryId,
    saveItinerary,
    submitItineraryPlan,
    totalCost,
    updateDayField: editor.updateDayField,
    updateItemQuantity: editor.updateItemQuantity,
    updateQuote: editor.updateQuote,
  };
}
