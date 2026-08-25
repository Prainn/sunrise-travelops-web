import { computed, onBeforeUnmount, reactive, ref } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter } from "vue-router";
import { ROLE_ROOT } from "@/constants";
import { inquiries, itineraries } from "@/data/data";
import { useUserStore } from "@/stores/user";
import type { ItineraryDayRecord, ItineraryRecord, ItineraryResourceItem } from "@/types/itinerary";
import { getStatusAfterItineraryCreated, getStatusAfterQuoteGenerated, isInquiryReadOnly } from "../inquiry-workflow";
import {
  downloadGeneratedItineraryPdf,
  generateItineraryPdf,
  type GeneratedItineraryPdf,
} from "./pdf";
import { recalculateItem } from "./pricing";
import { getDayCountMismatch, validateItineraryForPdf } from "./workflow";

type EditableDayField = "departure" | "destination" | "transport" | "title" | "description" | "mealSummary" | "accommodationSummary";

export function useItineraryWorkspace() {
  const route = useRoute();
  const router = useRouter();
  const userStore = useUserStore();
  const { t } = useI18n();
  const inquiryStore = reactive(inquiries);
  const itineraryStore = reactive(itineraries);
  const isPlanDialogVisible = ref(false);
  const isResourceDialogVisible = ref(false);
  const isPdfPreviewVisible = ref(false);
  const isGeneratingPdf = ref(false);
  const pdfPreviewFile = ref<GeneratedItineraryPdf>();
  const pdfPreviewUrl = ref("");
  const resourceTargetDayId = ref("");
  const inquiryId = computed(() => String(route.params.inquiryId ?? ""));
  const inquiry = computed(() => inquiryStore.find((item) => item.id === inquiryId.value));
  const rows = computed(() => itineraryStore.filter((item) => item.inquiryId === inquiryId.value));
  const selectedItineraryId = ref(rows.value[0]?.id ?? "");
  const selectedItinerary = computed(() => rows.value.find((item) => item.id === selectedItineraryId.value));
  const isRoot = computed(() => userStore.userInfo.roles?.includes(ROLE_ROOT));
  const isDraft = computed(() => selectedItinerary.value?.status === "draft");
  const inquiryReadOnly = computed(() => inquiry.value ? isInquiryReadOnly(inquiry.value.status) : true);
  const canCreateItinerary = computed(() => !inquiryReadOnly.value && hasPermission("itinerary:create"));
  const contentEditable = computed(() => !inquiryReadOnly.value && isDraft.value && hasPermission("itinerary:update"));
  const priceEditable = computed(() => !inquiryReadOnly.value && isDraft.value && hasPermission("itinerary:price"));
  const canGeneratePdf = computed(() => !inquiryReadOnly.value && hasPermission("itinerary:pdf"));
  const guestCount = computed(() => selectedItinerary.value
    ? selectedItinerary.value.adults + selectedItinerary.value.childrenCount + selectedItinerary.value.otherGuests : 0);
  const allItems = computed(() => selectedItinerary.value?.dailyPlans.flatMap((day) => day.items) ?? []);
  const totalCost = computed(() => allItems.value.reduce((total, item) => total + item.totalCost, 0));
  const totalPrice = computed(() => allItems.value.reduce((total, item) => total + item.totalPrice, 0));
  const itemCount = computed(() => allItems.value.length);
  const missingPriceCount = computed(() => allItems.value.filter((item) => item.unitPrice === null).length);
  const itineraryForm = ref<ItineraryRecord>(createEmptyItinerary());

  function createEmptyItinerary(): ItineraryRecord {
    return {
      id: "", inquiryId: inquiryId.value, code: "", title: "", destinations: "", startDate: "", endDate: "", days: 0,
      adults: 1, childrenCount: 0, otherGuests: 0, hotelLevel: "", roomPreference: "", transportPreference: "",
      guideRequired: false, guideLanguage: "", pace: "", mealRequirements: "", budget: 0, specialRequirements: "",
      inquiryCoordinatorNotes: "", operationsCoordinator: inquiry.value?.operationsCoordinator ?? "", dailyPlans: [], status: "draft", creator: "", createdAt: "",
    };
  }

  function openCreateDialog() {
    if (!canCreateItinerary.value) return;
    itineraryForm.value = { ...createEmptyItinerary(), code: generateItineraryCode() };
    isPlanDialogVisible.value = true;
  }

  function createItinerary(record: ItineraryRecord) {
    if (!canCreateItinerary.value || !inquiry.value) return;
    const created = {
      ...record,
      id: `itinerary-${Date.now()}`,
      inquiryId: inquiryId.value,
      creator: userStore.userInfo.username ?? "",
      operationsCoordinator: inquiry.value.operationsCoordinator,
      createdAt: formatDateTime(new Date()),
      dailyPlans: createDailyPlans(record.startDate, record.days),
    };
    itineraryStore.unshift(created);
    inquiry.value.status = getStatusAfterItineraryCreated(inquiry.value.status);
    selectedItineraryId.value = created.id;
    isPlanDialogVisible.value = false;
    ElMessage.success(t("common.createSuccess"));
  }

  function createDailyPlans(startDate: string, dayCount: number): ItineraryDayRecord[] {
    return Array.from({ length: dayCount }, (_, index) => ({
      id: `day-${Date.now()}-${index}`, dayNumber: index + 1, date: addDate(startDate, index), departure: "", destination: "",
      transport: "", title: "", description: "", mealSummary: "", accommodationSummary: "", items: [],
    }));
  }

  function updateDayField(index: number, field: EditableDayField, value: string) {
    if (!contentEditable.value) return;
    const day = selectedItinerary.value?.dailyPlans[index];
    if (day) day[field] = value;
  }

  function openResourceDialog(dayId: string) {
    if (!contentEditable.value) return;
    resourceTargetDayId.value = dayId;
    isResourceDialogVisible.value = true;
  }

  function addResourceItem(item: ItineraryResourceItem) {
    if (!contentEditable.value) return;
    const day = selectedItinerary.value?.dailyPlans.find((record) => record.id === resourceTargetDayId.value);
    if (!day) return;
    day.items.push(item);
    ElMessage.success(t("itinerary.resourceAdded"));
  }

  function removeItem(dayId: string, itemIndex: number) {
    if (!contentEditable.value) return;
    selectedItinerary.value?.dailyPlans.find((day) => day.id === dayId)?.items.splice(itemIndex, 1);
  }

  function updateItemQuantity(dayId: string, itemIndex: number, quantity: number) {
    if (!contentEditable.value) return;
    const item = selectedItinerary.value?.dailyPlans.find((day) => day.id === dayId)?.items[itemIndex];
    if (!item) return;
    item.quantity = quantity;
    recalculateItem(item);
  }

  function updateItemPrice(dayId: string, itemIndex: number, price: number | null) {
    if (!priceEditable.value) return;
    const item = selectedItinerary.value?.dailyPlans.find((day) => day.id === dayId)?.items[itemIndex];
    if (!item) return;
    item.unitPrice = price;
    recalculateItem(item);
  }

  async function handleGeneratePdf() {
    const plan = selectedItinerary.value;
    if (!plan || !inquiry.value || !isDraft.value || !canGeneratePdf.value) return;
    const validation = validateItineraryForPdf(plan.dailyPlans);
    if (validation.emptyDayNumbers.length) {
      ElMessage.warning(t("itinerary.pdfEmptyDays", { days: validation.emptyDayNumbers.map((day) => `D${day}`).join("、") }));
      return;
    }
    if (validation.missingPriceItems.length) {
      const items = validation.missingPriceItems.map((item) => `D${item.dayNumber} ${item.resourceName}`).join("、");
      ElMessage.warning(t("itinerary.pdfMissingPrices", { items }));
      return;
    }
    const actualDays = plan.dailyPlans.length;
    if (getDayCountMismatch(actualDays, inquiry.value.plannedDays)) {
      try {
        await ElMessageBox.confirm(
          t("itinerary.dayCountMismatch", { planned: inquiry.value.plannedDays, actual: actualDays }),
          t("common.warning"),
          { type: "warning", confirmButtonText: t("itinerary.generateDespiteMismatch"), cancelButtonText: t("common.cancel") }
        );
      } catch { return; }
    }
    isGeneratingPdf.value = true;
    try {
      closePdfPreview();
      pdfPreviewFile.value = await generateItineraryPdf(plan, inquiry.value);
      pdfPreviewUrl.value = URL.createObjectURL(pdfPreviewFile.value.blob);
      isPdfPreviewVisible.value = true;
    } catch {
      ElMessage.error(t("itinerary.pdfGenerationFailed"));
    } finally {
      isGeneratingPdf.value = false;
    }
  }

  function confirmPdfDownload() {
    const plan = selectedItinerary.value;
    if (!plan || !inquiry.value || !pdfPreviewFile.value) return;
    downloadGeneratedItineraryPdf(pdfPreviewFile.value);
    plan.status = "quoted";
    inquiry.value.status = getStatusAfterQuoteGenerated(inquiry.value.status);
    closePdfPreview();
    ElMessage.success(t("itinerary.pdfGenerated"));
  }

  function closePdfPreview() {
    isPdfPreviewVisible.value = false;
    if (pdfPreviewUrl.value) URL.revokeObjectURL(pdfPreviewUrl.value);
    pdfPreviewUrl.value = "";
    pdfPreviewFile.value = undefined;
  }

  function copyItinerary() {
    const source = selectedItinerary.value;
    if (!source || !canCreateItinerary.value || !inquiry.value) return;
    const timestamp = Date.now();
    const copied: ItineraryRecord = {
      ...source,
      id: `itinerary-${timestamp}`,
      code: generateItineraryCode(),
      title: `${source.title} ${t("itinerary.copySuffix")}`,
      status: "draft",
      creator: userStore.userInfo.username ?? "",
      createdAt: formatDateTime(new Date()),
      dailyPlans: source.dailyPlans.map((day, dayIndex) => ({
        ...day,
        id: `day-${timestamp}-${dayIndex}`,
        items: day.items.map((item, itemIndex) => ({ ...item, id: `item-${timestamp}-${dayIndex}-${itemIndex}` })),
      })),
    };
    itineraryStore.unshift(copied);
    inquiry.value.status = getStatusAfterItineraryCreated(inquiry.value.status);
    selectedItineraryId.value = copied.id;
    ElMessage.success(t("itinerary.copySuccess"));
  }

  function hasPermission(permission: string) {
    return Boolean(isRoot.value || userStore.userInfo.perms?.includes(permission));
  }

  function addDay() {
    if (!contentEditable.value) return;
    const plan = selectedItinerary.value;
    if (!plan) return;
    plan.dailyPlans.push({
      id: `day-${Date.now()}`, dayNumber: plan.dailyPlans.length + 1, date: addDate(plan.startDate, plan.dailyPlans.length),
      departure: "", destination: "", transport: "", title: "", description: "", mealSummary: "", accommodationSummary: "", items: [],
    });
    syncPlanDates(plan);
  }

  function duplicateDay(index: number) {
    if (!contentEditable.value) return;
    const plan = selectedItinerary.value;
    const source = plan?.dailyPlans[index];
    if (!plan || !source) return;
    plan.dailyPlans.splice(index + 1, 0, {
      ...source,
      id: `day-${Date.now()}`,
      items: source.items.map((item, itemIndex) => ({ ...item, id: `item-${Date.now()}-${itemIndex}` })),
    });
    syncPlanDates(plan);
  }

  async function removeDay(index: number) {
    if (!contentEditable.value) return;
    const plan = selectedItinerary.value;
    if (!plan) return;
    try {
      await ElMessageBox.confirm(t("itinerary.deleteDayConfirm"), t("common.tip"), { type: "warning" });
    } catch { return; }
    plan.dailyPlans.splice(index, 1);
    syncPlanDates(plan);
  }

  function moveDay(index: number, offset: number) {
    if (!contentEditable.value) return;
    const plan = selectedItinerary.value;
    if (!plan) return;
    const target = index + offset;
    if (target < 0 || target >= plan.dailyPlans.length) return;
    [plan.dailyPlans[index], plan.dailyPlans[target]] = [plan.dailyPlans[target], plan.dailyPlans[index]];
    syncPlanDates(plan);
  }

  function syncPlanDates(plan: ItineraryRecord) {
    plan.dailyPlans.forEach((day, index) => { day.dayNumber = index + 1; day.date = addDate(plan.startDate, index); });
    plan.days = plan.dailyPlans.length;
    plan.endDate = plan.days ? addDate(plan.startDate, plan.days - 1) : plan.startDate;
  }

  function generateItineraryCode() {
    const month = formatDate(new Date()).slice(0, 7).replace("-", "");
    const max = itineraryStore.reduce((value, record) => Math.max(value, Number(record.code.match(new RegExp(`^ITI-${month}-(\\d+)$`))?.[1] ?? 0)), 0);
    return `ITI-${month}-${String(max + 1).padStart(3, "0")}`;
  }

  onBeforeUnmount(closePdfPreview);

  return {
    addDay, addResourceItem, canCreateItinerary, canGeneratePdf, contentEditable, copyItinerary, createItinerary,
    closePdfPreview, confirmPdfDownload, duplicateDay, guestCount, handleGeneratePdf, inquiry, isGeneratingPdf,
    isPdfPreviewVisible, isPlanDialogVisible, isResourceDialogVisible,
    isDraft, itemCount, itineraryForm, missingPriceCount, moveDay, openCreateDialog, openResourceDialog, priceEditable,
    pdfPreviewUrl, removeDay, removeItem, router, rows, selectedItinerary, selectedItineraryId, totalCost, totalPrice,
    updateDayField, updateItemPrice, updateItemQuantity,
  };
}

function addDate(date: string, offset: number) { const value = new Date(`${date}T00:00:00`); value.setDate(value.getDate() + offset); return formatDate(value); }
function formatDate(value: Date) { return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`; }
function formatDateTime(value: Date) { return `${formatDate(value)} ${String(value.getHours()).padStart(2, "0")}:${String(value.getMinutes()).padStart(2, "0")}`; }
