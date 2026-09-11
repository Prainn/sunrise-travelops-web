import { businessDictionaryService } from "@/services/business-dictionary.service";
import { itineraryDuration } from "./duration";
import { computed, ref, watch } from "vue";
import { inquiryService } from "@/services/inquiry.service";
import { resourceService } from "@/services/resource.service";
import { useUserStore } from "@/stores/user";
import type { ItineraryDailyItemType, ItineraryRecord, ItineraryResourceItem, MealSlot } from "@/types/itinerary";
import type { GuideRecord } from "@/types/resource";
import { hasUserPermission, sumMoney } from "@/utils";
import { isInquiryReadOnly } from "../inquiry-workflow";
import { canPerformItineraryOperation } from "./itinerary-workflow";
import { calculateItineraryQuote } from "./quote-pricing";
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
  const isSaving = ref(false);
  const selection = useItinerarySelection();
  const { inquiry, inquiryId, itineraryStore, selectedItinerary, selectedItineraryId } = selection;
  const isPlanDialogVisible = ref(false);
  const isEditingPlan = ref(false);
  const isResourceDialogVisible = ref(false);
  const isGuideDialogVisible = ref(false);
  const isGuideLoading = ref(false);
  const isGuideMissing = ref(false);
  const isGuideSaving = ref(false);
  const guideLanguage = ref("");
  const guideShopping = ref(false);
  const guideForm = ref<GuideRecord>({ id: "", code: "", name: "", secondLanguage: "none", shopping: false, dailyPrice: 0, status: "enabled" });
  const resourceTargetDayId = ref("");
  const resourceMealSlot = ref<MealSlot | null>(null);
  const resourceCurrentItem = computed(() => selectedItinerary.value?.dailyPlans
    .find(day => day.id === resourceTargetDayId.value)?.items
    .find(item => item.type === "restaurant" && item.mealSlot === resourceMealSlot.value));
  const validationIssues = ref<PdfValidationIssue[]>([]);
  const inquiryReadOnly = computed(() => inquiry.value ? isInquiryReadOnly(inquiry.value.status) : true);
  const isDraft = computed(() => selectedItinerary.value?.status === "draft");
  const canCreateItinerary = computed(() => !isSaving.value && !inquiryReadOnly.value && hasUserPermission(userStore.userInfo, "itinerary:create"));
  const contentFormVisible = computed(() => Boolean(
    selectedItinerary.value
    && !inquiryReadOnly.value
    && canPerformItineraryOperation(selectedItinerary.value.status, "edit_content")
    && hasUserPermission(userStore.userInfo, "itinerary:update")
  ));
  const priceFormVisible = computed(() => Boolean(
    selectedItinerary.value
    && !inquiryReadOnly.value
    && canPerformItineraryOperation(selectedItinerary.value.status, "edit_price")
    && hasUserPermission(userStore.userInfo, "itinerary:price")
  ));
  const contentEditable = computed(() => contentFormVisible.value && !isSaving.value);
  const priceEditable = computed(() => priceFormVisible.value && !isSaving.value);
  const canGeneratePdf = computed(() => Boolean(
    selectedItinerary.value
    && !isSaving.value && !inquiryReadOnly.value
    && canPerformItineraryOperation(selectedItinerary.value.status, "generate_pdf")
    && hasUserPermission(userStore.userInfo, "itinerary:pdf")
  ));
  const canSaveItinerary = computed(() => contentEditable.value || priceEditable.value);
  const canEditItineraryBasics = computed(() => contentEditable.value);
  const canCreateGuide = computed(() => contentEditable.value && hasUserPermission(userStore.userInfo, "resource:guide:create"));
  const guestCount = computed(() => selectedItinerary.value
    ? selectedItinerary.value.adults + selectedItinerary.value.childrenCount : 0);
  const allItems = computed(() => selectedItinerary.value?.dailyPlans.flatMap((day) => day.items) ?? []);
  const dailyItems = computed(() => allItems.value.filter((item) => dailyItemTypes.has(item.type as ItineraryDailyItemType)));
  const dailyResourceCost = computed(() => sumMoney(dailyItems.value.map((item) => item.totalCost)));
  const itemCount = computed(() => dailyItems.value.length);
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
    findHotel: (id) => resourceService.hotels.find((hotel) => hotel.id === id),
    findVehicle: (id) => resourceService.transports.find((vehicle) => vehicle.id === id),
  });
  const selectionVersions = new Map<string, number>();
  let guideSelectionVersion = 0;
  const itineraryForm = ref<ItineraryRecord>(editor.createEmptyItinerary());
  const pdf = useItineraryPdf({
    inquiry,
    selectedItinerary,
    canGenerate: () => canGeneratePdf.value,
    canDownload: () => hasUserPermission(userStore.userInfo, "itinerary:pdf"),
  });

  async function loadDestinationResourceOptions() {
    try {
      await Promise.all([
        resourceService.loadCityOptions(),
        businessDictionaryService.ensureBuiltInTypesLoaded(),
      ]);
      return true;
    } catch {
      messages.error("request.failed");
      return false;
    }
  }

  watch(() => selectedItinerary.value?.id, () => {
    const guide = selectedItinerary.value?.guidePlans?.[0];
    guideLanguage.value = guide?.secondLanguage ?? "";
    guideShopping.value = guide?.shopping ?? false;
    isGuideMissing.value = false;
  }, { immediate: true });

  watch(
    () => [selectedItinerary.value?.id, inquiry.value?.plannedDays, selectedItinerary.value?.guidePlans[0]] as const,
    () => {
      const plan = selectedItinerary.value;
      const days = inquiry.value?.plannedDays;
      if (plan?.status === "draft" && days && plan.guidePlans[0]) plan.guidePlans[0].serviceDays = days;
    },
    { immediate: true, flush: "sync" },
  );

  async function updateGuideType(secondLanguage: string, shopping: boolean) {
    const token = ++guideSelectionVersion;
    guideLanguage.value = secondLanguage;
    guideShopping.value = shopping;
    isGuideMissing.value = false;
    if (!contentEditable.value || !secondLanguage) {
      if (!secondLanguage) editor.updateGuideSelection(null);
      isGuideLoading.value = false;
      return;
    }
    const plan = selectedItinerary.value;
    isGuideLoading.value = true;
    try {
      const result = await resourceService.getSelectionOptions("guides", {
        page: 1,
        pageSize: 1,
        secondLanguage,
        shopping: String(shopping),
      });
      if (token !== guideSelectionVersion || selectedItinerary.value !== plan) return;
      const match = result.list[0];
      if (!match) {
        editor.updateGuideSelection(null);
        isGuideMissing.value = true;
        return;
      }
      const record = await resourceService.guideApi.getDetail(match.id);
      if (token !== guideSelectionVersion || selectedItinerary.value !== plan) return;
      const index = resourceService.guides.findIndex(item => item.id === record.id);
      if (index >= 0) resourceService.guides.splice(index, 1, record);
      else resourceService.guides.push(record);
      editor.updateGuideSelection(record);
    } catch (error) {
      reportError(error);
    } finally {
      if (token === guideSelectionVersion) isGuideLoading.value = false;
    }
  }

  function openGuideCreateDialog() {
    if (!canCreateGuide.value || !guideLanguage.value) return;
    guideForm.value = {
      id: "", code: "", name: "", status: "enabled", dailyPrice: 0,
      secondLanguage: guideLanguage.value, shopping: guideShopping.value,
    };
    isGuideDialogVisible.value = true;
  }

  async function createGuide(record: GuideRecord) {
    if (!canCreateGuide.value || isGuideSaving.value) return;
    isGuideSaving.value = true;
    try {
      const saved = await resourceService.guideApi.create(record);
      resourceService.guides.push(saved);
      guideLanguage.value = saved.secondLanguage;
      guideShopping.value = saved.shopping;
      isGuideMissing.value = false;
      editor.updateGuideSelection(saved);
      isGuideDialogVisible.value = false;
      messages.success("common.createSuccess");
    } catch (error) {
      reportError(error);
    } finally {
      isGuideSaving.value = false;
    }
  }

  async function selectHotelPlanSelection(...args: Parameters<typeof editor.updateHotelPlanSelection>) {
    const id = args[args.length - 1] as string;
    const key = 'HotelPlanSelection:' + args.slice(0, -1).join(':');
    const token = (selectionVersions.get(key) ?? 0) + 1;
    selectionVersions.set(key, token);
    const plan = selectedItinerary.value;
    try {
      if (id) {
        const record = await resourceService.hotelApi.getDetail(id);
        if (selectionVersions.get(key) !== token || selectedItinerary.value !== plan) return;
        const index = resourceService.hotels.findIndex(item => item.id === id);
        if (index >= 0) resourceService.hotels.splice(index, 1, record);
        else resourceService.hotels.push(record);
      }
      editor.updateHotelPlanSelection(...args);
    } catch { messages.error("request.failed"); }
  }

  async function openCreateDialog() {
    if (!canCreateItinerary.value) return;
    if (!await loadDestinationResourceOptions()) return;
    isEditingPlan.value = false;
    itineraryForm.value = { ...editor.createEmptyItinerary(), code: "" };
    isPlanDialogVisible.value = true;
  }

  async function openEditDialog() {
    const plan = selectedItinerary.value;
    if (!plan || !canEditItineraryBasics.value) return;
    isEditingPlan.value = true;
    itineraryForm.value = { ...plan, dailyPlans: [...plan.dailyPlans] };
    isPlanDialogVisible.value = true;
  }

  async function createItinerary(record: ItineraryRecord) {
    if (isSaving.value) return;
    const previousId = selectedItineraryId.value;
    const previousStatus = inquiry.value?.status;
    const created = editor.createItinerary(record);
    if (!created) return;
    isSaving.value = true;
    try {
      const saved = await inquiryService.createItinerary(created);
      const index = itineraryStore.findIndex(p => p.id === created.id);
      if (index >= 0) itineraryStore.splice(index,1,saved);
      selectedItineraryId.value = saved.id;
      isPlanDialogVisible.value = false;
      await refreshInquiry();
      messages.success("common.createSuccess");
    } catch (error) {
      const index = itineraryStore.findIndex(p => p.id === created.id);
      if (index >= 0) itineraryStore.splice(index,1);
      selectedItineraryId.value = previousId;
      if (inquiry.value && previousStatus) inquiry.value.status = previousStatus;
      reportError(error);
    } finally { isSaving.value = false; }
  }
  function reportError(error: unknown) {
    const code = error && typeof error === "object" && "code" in error ? String(error.code) : "";
    messages.error(code ? `apiErrors.${code}` : "request.failed");
  }
  async function refreshInquiry() {
    try { if (inquiry.value) Object.assign(inquiry.value, await inquiryService.detail(inquiryId.value)); }
    catch (error) { reportError(error); }
  }
  async function submitItineraryPlan(record: ItineraryRecord) {
    if (!isEditingPlan.value) { await createItinerary(record); return; }
    const updated = editor.updateItineraryBasics(record);
    if (!updated) return;
    if (await saveItinerary()) isPlanDialogVisible.value = false;
  }

  async function openResourceDialog(dayId: string, mealSlot: MealSlot | null = null) {
    if (!contentEditable.value) return;
    resourceMealSlot.value = mealSlot;
    resourceTargetDayId.value = dayId;
    isResourceDialogVisible.value = true;
  }

  function addResourceItem(item: ItineraryResourceItem) {
    const editing = Boolean(resourceCurrentItem.value);
    if (editor.addResourceItem(resourceTargetDayId.value, item)) messages.success(editing ? "itinerary.resourceUpdated" : "itinerary.resourceAdded");
  }

  async function copyItinerary() {
    const source = selectedItinerary.value;
    if (!source || !canCreateItinerary.value || isSaving.value) return;
    isSaving.value = true;
    try {
      const saved = await inquiryService.copyItinerary(source,`${source.title} ${messages.translate("itinerary.copySuffix")}`);
      itineraryStore.unshift(saved); selectedItineraryId.value = saved.id;
      await refreshInquiry(); messages.success("itinerary.copySuccess");
    } catch (error) { reportError(error); } finally { isSaving.value = false; }
  }
  async function saveItinerary(): Promise<boolean> {
    const plan = selectedItinerary.value;
    if (!plan || !canSaveItinerary.value || isSaving.value) return false;
    isSaving.value = true;
    try {
      const saved = await inquiryService.saveItinerary(plan);
      Object.assign(plan,saved);
      messages.success("itinerary.saveSuccess");
      return true;
    } catch (error) { reportError(error); return false; }
    finally { isSaving.value = false; }
  }

  async function removeDay(index: number) {
    if (!contentEditable.value || !await messages.confirm("itinerary.deleteDayConfirm")) return;
    editor.removeDay(index);
  }

  const isPreparingPdf = ref(false);
  async function handleGeneratePdf() {
    if (isPreparingPdf.value || pdf.isGeneratingPdf.value) return;
    isPreparingPdf.value = true;
    try {
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
      if (!await saveItinerary()) return;
      await pdf.generatePreview();
    } catch {
      messages.error("itinerary.pdfGenerationFailed");
    }
    } finally { isPreparingPdf.value = false; }
  }

  async function confirmPdfDownload() {
    if (pdf.isDownloadingPdf.value) return;
    try {
      if (!await pdf.confirmPdfDownload()) { messages.error("itinerary.previewChanged"); return; }
      await refreshInquiry();
      messages.success("itinerary.pdfGenerated");
    } catch (error) { reportError(error); }
  }

  return {
    isSaving,
    isLoading: selection.isLoading,
    loadError: selection.loadError,
    validationIssues,
    resourceMealSlot,
    resourceCurrentItem,
    canDownloadOriginal: pdf.canDownloadOriginal,
    downloadOriginal: async () => { try { await pdf.downloadOriginal(); } catch (error) { reportError(error); } },
    updateGuideType,
    updateMeal: editor.updateMeal,
    updateQuoteSettings: editor.updateQuoteSettings,
    addDay: editor.addDay,
    addResourceItem,
    canCreateItinerary,
    canCreateGuide,
    canEditItineraryBasics,
    canGeneratePdf,
    canSaveItinerary,
    closePdfPreview: pdf.closePdfPreview,
    confirmPdfDownload,
    contentEditable: contentFormVisible,
    copyItinerary,
    createItinerary,
    destinationOptions,
    duplicateDay: editor.duplicateDay,
    guestCount,
    passengerCount: computed(() => guestCount.value + (selectedItinerary.value?.leaderCount ?? 0)),
    resourceDestination: computed(() => selectedItinerary.value?.dailyPlans.find(day => day.id === resourceTargetDayId.value)?.destination ?? ""),
    handleGeneratePdf,
    inquiry,
    isEditingPlan,
    isDraft,
    isGeneratingPdf: computed(() => isPreparingPdf.value || pdf.isGeneratingPdf.value),
    isDownloadingPdf: pdf.isDownloadingPdf,
    isPdfPreviewVisible: pdf.isPdfPreviewVisible,
    isPlanDialogVisible,
    isGuideDialogVisible,
    isGuideLoading,
    isGuideMissing,
    isGuideSaving,
    isResourceDialogVisible,
    itemCount,
    itineraryForm,
    guideForm,
    guideLanguage,
    guideShopping,
    loadDestinationResourceOptions,
    moveDay: editor.moveDay,
    openCreateDialog,
    openGuideCreateDialog,
    openEditDialog,
    openResourceDialog,
    pdfPreviewUrl: pdf.pdfPreviewUrl,
    priceEditable: priceFormVisible,
    quoteCalculation,
    removeDay,
    removeItem: editor.removeItem,
    router: selection.router,
    rows: selection.rows,
    selectedItinerary,
    selectedItineraryId,
    saveItinerary,
    submitItineraryPlan,
    createGuide,
    updateDayField: editor.updateDayField,
    clearHotelPlan: editor.clearHotelPlan,
    updateHotelPlanSelection: selectHotelPlanSelection,
    updateItemQuantity: editor.updateItemQuantity,
    updateQuoteOption: editor.updateQuoteOption,
    updateVehiclePlan: editor.updateVehiclePlan,
    updateHotelCost: editor.updateHotelCost,
    updateGuidePrice: editor.updateGuidePrice,
  };
}
