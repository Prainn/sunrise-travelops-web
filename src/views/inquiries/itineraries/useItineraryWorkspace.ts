import { itineraryDuration } from "./duration";
import { computed, ref } from "vue";
import { useInquiryLog } from "@/composables/useInquiryLog";
import { resourceService } from "@/services/resource.service";
import { useUserStore } from "@/stores/user";
import type { ItineraryDailyItemType, ItineraryRecord, ItineraryResourceItem, MealSlot } from "@/types/itinerary";
import { formatDateTime, hasUserPermission, sumMoney } from "@/utils";
import { isInquiryReadOnly } from "../inquiry-workflow";
import { canPerformItineraryOperation } from "./itinerary-workflow";
import { calculateItineraryQuote } from "./quote-pricing";
import { getResourcePriceOptions, reconcileItineraryResourceReferences, type ResourcePriceOption } from "./pricing";
import { useItineraryEditor } from "./useItineraryEditor";
import { useItineraryPdf } from "./useItineraryPdf";
import type { PdfValidationIssue } from "./workflow";
import { useItinerarySelection } from "./useItinerarySelection";

interface WorkspaceMessages {
  confirm: (key: string, params?: Record<string, unknown>) => Promise<boolean>;
  error: (key: string) => void;
  success: (key: string) => void;
  warning: (key: string, params: Record<string, unknown>) => void;
  translate: (key: string) => string;
}

export function useItineraryWorkspace(messages: WorkspaceMessages) {
  const dailyItemTypes = new Set<ItineraryDailyItemType>(["restaurant", "attraction"]);
  const userStore = useUserStore();
  const { recordInquiryLog } = useInquiryLog();
  const selection = useItinerarySelection();
  const { inquiry, inquiryId, itineraryStore, selectedItinerary, selectedItineraryId } = selection;
  const isPlanDialogVisible = ref(false);
  const isEditingPlan = ref(false);
  const isResourceDialogVisible = ref(false);
  const resourceTargetDayId = ref("");
  const resourceMealSlot = ref<MealSlot | null>(null);
  const validationIssues = ref<PdfValidationIssue[]>([]);
  const resourcePriceOptions = ref<ResourcePriceOption[]>([]);
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
  const dailyItems = computed(() => allItems.value.filter((item) => dailyItemTypes.has(item.type as ItineraryDailyItemType)));
  const dailyResourceCost = computed(() => sumMoney(dailyItems.value.map((item) => item.totalCost)));
  const itemCount = computed(() => dailyItems.value.length);
  const hotelOptions = computed(() => resourceService.hotels.filter((hotel) => hotel.status === "enabled"));
  const guideOptions = computed(() => resourceService.guides.filter((guide) => guide.status === "enabled"));
  const vehicleOptions = computed(() => resourceService.transports.filter((vehicle) => vehicle.status === "enabled"));
  const destinationOptions = computed(() => resourceService.cityOptions.filter((city) => city.status === "enabled").map((city) => city.name));
  const quoteCalculation = computed(() => selectedItinerary.value
    ? calculateItineraryQuote(selectedItinerary.value, dailyResourceCost.value)
    : null);
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
    findGuide: (id) => resourceService.guides.find((guide) => guide.id === id),
    findHotel: (id) => resourceService.hotels.find((hotel) => hotel.id === id),
    findVehicle: (id) => resourceService.transports.find((vehicle) => vehicle.id === id),
  });
  const itineraryForm = ref<ItineraryRecord>(editor.createEmptyItinerary());
  const pdf = useItineraryPdf({
    inquiry,
    selectedItinerary,
    canGenerate: () => canGeneratePdf.value,
    canDownload: () => hasUserPermission(userStore.userInfo, "itinerary:pdf"),
  });

  async function loadDestinationResourceOptions() {
    try {
      await Promise.all([resourceService.loadCityOptions(), resourceService.loadHotels(), resourceService.loadTransports(), resourceService.loadGuides()]);
      return true;
    } catch {
      messages.error("request.failed");
      return false;
    }
  }

  async function openCreateDialog() {
    if (!canCreateItinerary.value) return;
    if (!await loadDestinationResourceOptions()) return;
    isEditingPlan.value = false;
    itineraryForm.value = { ...editor.createEmptyItinerary(), code: editor.generateItineraryCode() };
    isPlanDialogVisible.value = true;
  }

  async function loadResourcePriceOptions() {
    const resources = await resourceService.loadPricingResources();
    resourcePriceOptions.value = getResourcePriceOptions(resources, guestCount.value)
      .filter((option) => dailyItemTypes.has(option.type as ItineraryDailyItemType));
    reconcileItineraryResourceReferences(itineraryStore, resourcePriceOptions.value);
  }

  async function openEditDialog() {
    const plan = selectedItinerary.value;
    if (!plan || !canEditItineraryBasics.value) return;
    try {
      await loadResourcePriceOptions();
    } catch {
      messages.error("request.failed");
      return;
    }
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

  async function openResourceDialog(dayId: string, mealSlot: MealSlot | null = null) {
    if (!contentEditable.value) return;
    try {
      await loadResourcePriceOptions();
    } catch {
      messages.error("request.failed");
      return;
    }
    resourceMealSlot.value = mealSlot;
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
    validationIssues.value = validation.issues;
    if (validation.issues.length) return;
    if (validation.dayCountMismatch) {
      const confirmed = await messages.confirm("itinerary.dayCountMismatch", {
        planned: validation.plannedDays,
        plannedNights: Math.max(validation.plannedDays - 1, 0),
        actualNights: itineraryDuration(selectedItinerary.value!.dailyPlans).nights,
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
    if (!plan) return;
    if (!pdf.confirmPdfDownload()) {
      messages.error("itinerary.previewChanged");
      return;
    }
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
    validationIssues,
    resourceMealSlot,
    canDownloadOriginal: pdf.canDownloadOriginal,
    downloadOriginal: pdf.downloadOriginal,
    updateGuideSelection: editor.updateGuideSelection,
    updateGuideDays: editor.updateGuideDays,
    updateMeal: editor.updateMeal,
    updateQuoteSettings: editor.updateQuoteSettings,
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
    guideOptions,
    destinationOptions,
    duplicateDay: editor.duplicateDay,
    guestCount,
    hotelOptions,
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
    loadDestinationResourceOptions,
    moveDay: editor.moveDay,
    openCreateDialog,
    openEditDialog,
    openResourceDialog,
    pdfPreviewUrl: pdf.pdfPreviewUrl,
    priceEditable,
    resourcePriceOptions,
    quoteCalculation,
    removeDay,
    removeItem: editor.removeItem,
    router: selection.router,
    rows: selection.rows,
    selectedItinerary,
    selectedItineraryId,
    saveItinerary,
    submitItineraryPlan,
    updateDayField: editor.updateDayField,
    clearHotelPlan: editor.clearHotelPlan,
    updateHotelPlanSelection: editor.updateHotelPlanSelection,
    updateItemQuantity: editor.updateItemQuantity,
    updateQuoteOption: editor.updateQuoteOption,
    updateVehiclePlanSelection: editor.updateVehiclePlanSelection,
    updateVehiclePlanServiceDays: editor.updateVehiclePlanServiceDays,
    updateVehiclePlanUnitCost: editor.updateVehiclePlanUnitCost,
    vehicleOptions,
  };
}
