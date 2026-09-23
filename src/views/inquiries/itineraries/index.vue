<template>
  <div
    v-loading.fullscreen="isLoading || isSaving"
    element-loading-background="rgba(0, 0, 0, 0.2)"
    :inert="isSaving"
    class="page-container itinerary-page h-auto min-h-full overflow-visible p-0"
  >
    <el-alert v-if="loadError" :title="loadError" type="error" :closable="false" />
    <template v-if="inquiry">
      <header
        class="itinerary-page__sticky-header sticky z-[10] top-0 [background:var(--page-bg)] [box-shadow:var(--el-box-shadow-light)]"
      >
        <el-card class="itinerary-page__overview rounded-0! border-0!" shadow="never">
          <el-page-header @back="router.push('/inquiries/list')">
            <template #content>
              <el-tag class="mr-[10px]">
                {{ $t(`identity.scopes.${inquiry.businessUnit}`) }}
              </el-tag>
              <el-select
                v-if="selectedItinerary"
                v-model="selectedItineraryId"
                class="itinerary-page__plan-select w-[min(360px,_45vw)]!"
              >
                <el-option v-for="row in rows" :key="row.id" :label="row.title" :value="row.id" />
              </el-select>
            </template>
            <template #extra>
              <el-button v-if="canCreateItinerary" type="primary" @click="openCreateDialog">
                {{ $t("itinerary.createTitle") }}
              </el-button>
            </template>
          </el-page-header>
          <div
            v-if="selectedItinerary"
            class="itinerary-page__plan-bar flex items-center justify-between mt-[12px] p-[12px_0] [border-top:1px_solid_var(--el-border-color-lighter)] [border-bottom:1px_solid_var(--el-border-color-lighter)] max-[1100px]:[grid-template-columns:minmax(260px,_1fr)_auto]"
          >
            <div class="itinerary-page__plan-summary w-1/2 flex items-center max-[1100px]:hidden">
              <h2 class="m-0 overflow-hidden whitespace-nowrap text-ellipsis text-[18px] mr-2">
                {{ selectedItinerary.title }}
              </h2>
              <p
                class="m-[3px_0_0] flex flex-wrap items-center gap-[6px] text-[14px] text-[var(--el-text-color-secondary)]"
              >
                <span>{{ selectedItinerary.startDate }} — {{ selectedItinerary.endDate }}</span>
                <el-tag
                  v-for="pax in selectedItinerary.paxTiers"
                  :key="pax"
                  size="small"
                  effect="plain"
                >
                  {{ pax }} PAX
                </el-tag>
              </p>
            </div>

            <div class="itinerary-page__plan-controls flex items-center gap-[10px]">
              <el-tag :type="ITINERARY_STATUS_TAG_TYPES[selectedItinerary.status]">
                {{ $t(`itinerary.statuses.${selectedItinerary.status}`) }}
              </el-tag>
              <el-button v-if="canEditItineraryBasics" @click="openEditDialog">
                {{ $t("itinerary.editItinerary") }}
              </el-button>
              <el-button v-if="!isDraft && canCreateItinerary" @click="copyItinerary">
                {{ $t("itinerary.copyForRevision") }}
              </el-button>
            </div>
          </div>
          <div
            class="itinerary-page__inquiry-summary grid [grid-template-columns:repeat(2,_minmax(0,_1fr))] items-center gap-[18px] mt-[10px] text-[14px]"
          >
            <span class="min-w-0 flex gap-[6px]"
              ><small class="shrink-0 text-[var(--el-text-color-secondary)]">{{
                $t("inquiry.code")
              }}</small
              >{{ inquiry.code }}</span
            >
            <span class="min-w-0 flex gap-[6px]"
              ><small class="shrink-0 text-[var(--el-text-color-secondary)]">{{
                $t("inquiry.agencyName")
              }}</small
              >{{ inquiry.agencyName }}</span
            >
            <span class="min-w-0 flex gap-[6px]"
              ><small class="shrink-0 text-[var(--el-text-color-secondary)]">{{
                $t("inquiry.contactName")
              }}</small
              >{{ inquiry.contactName }}</span
            >
            <span class="min-w-0 flex gap-[6px]"
              ><small class="shrink-0 text-[var(--el-text-color-secondary)]">{{
                $t("inquiry.plannedDays")
              }}</small
              >{{ $t("itinerary.duration", plannedDuration(inquiry.plannedDays)) }}</span
            >
          </div>
          <div v-if="selectedItinerary" class="flex flex-wrap gap-[10px] mt-[12px]">
            <el-dropdown trigger="click" @command="openVehiclePlans">
              <el-button :type="hasVehiclePlans ? 'primary' : ''">
                {{ $t("planning.vehiclePlans") }}
                <el-icon class="ml-[6px]"><ArrowDown /></el-icon>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="itinerary">{{ $t("planning.byItinerary") }}</el-dropdown-item>
                  <el-dropdown-item command="stage">{{ $t("planning.byStage") }}</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
            <el-button :type="hasGuidePlans ? 'primary' : ''" @click="openSectionDialog('guide')">
              {{ $t("planning.guideService") }}
            </el-button>
            <el-button :type="hasHotelPlans ? 'primary' : ''" @click="openSectionDialog('hotel')">
              {{ $t("itinerary.hotelPlans") }}
            </el-button>
            <el-button :type="hasPriceItems ? 'primary' : ''" @click="openSectionDialog('price')">
              {{ $t("identity.prices") }}
            </el-button>
          </div>
        </el-card>
      </header>

      <InquiryMessagePreview
        v-if="inquiry.originalMessage"
        :key="inquiry.id"
        :text="inquiry.originalMessage"
      />

      <template v-if="selectedItinerary">
        <main class="itinerary-page__workspace mx-4">
          <div
            id="itinerary-daily"
            class="itinerary-page__daily-toolbar h-12 flex items-center min-h-[48px] m-[24px_0_14px]"
          >
            <div>
              <h3 class="m-0">
                {{ $t("itinerary.dailySchedule") }}
              </h3>
            </div>
          </div>
          <template v-for="(day, index) in selectedItinerary.dailyPlans" :key="day.id">
            <ItineraryDayCard
              :ref="(card) => setDayCard(day.id, card)"
              :day="day"
              :breakfast-status="getDayBreakfastStatus(selectedItinerary, index)"
              :destinations="selectedItinerary.destinations"
              :content-editable="contentEditable"
              :planned-days="inquiry.plannedDays"
              :is-last="index === selectedItinerary.dailyPlans.length - 1"
              @update-field="(field, value) => updateDayField(index, field, value)"
              @add-item="openResourceDialog(day.id)"
              @update-meal="(slot, included) => updateMeal(index, slot, included)"
              @select-meal="openResourceDialog(day.id, $event)"
              @remove-item="removeItem(day.id, $event)"
            />
          </template>
        </main>

        <footer
          class="itinerary-page__sticky-footer border-0! rounded-0! sticky z-[10] bottom-0 flex justify-between items-center min-h-[64px] p-[12px_18px] [background:var(--el-bg-color)] [box-shadow:var(--el-box-shadow-light)]"
        >
          <div
            class="itinerary-page__footer-summary text-[var(--el-text-color-secondary)] text-[14px]"
          >
            {{ $t("itinerary.duration", itineraryDuration(selectedItinerary.dailyPlans)) }} ·
            {{ $t("itinerary.resourceItemCount", { count: itemCount }) }}
          </div>
          <div class="itinerary-page__footer-actions flex gap-[12px]">
            <el-button :disabled="!canSaveItinerary" @click="saveItinerary">
              {{ $t("itinerary.save") }}
            </el-button>
            <el-button type="primary" @click="isQuoteDrawerVisible = true">
              {{ $t("itinerary.viewQuote") }}
            </el-button>
          </div>
        </footer>
      </template>

      <el-card v-else class="page-content" shadow="never">
        <el-empty :description="$t('itinerary.noPlans')">
          <el-button v-if="canCreateItinerary" type="primary" @click="openCreateDialog">
            {{ $t("itinerary.createTitle") }}
          </el-button>
        </el-empty>
      </el-card>

      <ItineraryPlanDialog
        v-model="isPlanDialogVisible"
        :record="itineraryForm"
        :planned-days="inquiry.plannedDays"
        :destination-options="destinationOptions"
        :is-editing="isEditingPlan"
        @submit="submitItineraryPlan"
      />
      <ItineraryVehiclePlansDialog
        v-if="selectedItinerary"
        :model-value="isVehiclePlansDialogVisible"
        :plans="selectedItinerary.vehiclePlans"
        :saved-plans="savedItinerary?.vehiclePlans ?? []"
        :start-date="selectedItinerary.startDate"
        :planned-days="inquiry.plannedDays"
        :passenger-count="passengerCount"
        :editable="contentEditable"
        :saving="isSaving"
        :mode="vehicleMaintenanceMode"
        @update-plan="updateVehiclePlan"
        @save="saveSectionDialog('vehicle')"
        @cancel="cancelSectionDialog('vehicle')"
      />
      <ItineraryGuidePlansDialog
        v-if="selectedItinerary"
        :model-value="isGuidePlansDialogVisible"
        :plans="selectedItinerary.guidePlans"
        :second-language="guideLanguage"
        :shopping="guideShopping"
        :editable="contentEditable"
        :loading="isGuideLoading"
        :missing="isGuideMissing"
        :can-create="canCreateGuide"
        :saving="isSaving"
        @update-type="updateGuideType"
        @update-price="updateGuidePrice"
        @update-reason="updateGuideReason"
        @create-guide="openGuideCreateDialog"
        @save="saveSectionDialog('guide')"
        @cancel="cancelSectionDialog('guide')"
      />
      <ItineraryHotelPlansDialog
        v-if="selectedItinerary"
        :model-value="isHotelPlansDialogVisible"
        :destinations="selectedItinerary.destinations"
        :daily-plans="selectedItinerary.dailyPlans"
        :hotel-plans="selectedItinerary.hotelPlans"
        :editable="contentEditable"
        :saving="isSaving"
        @clear-plan="clearHotelPlan"
        @update-selection="updateHotelPlanSelection"
        @update-cost="updateHotelCost"
        @update-reason="updateHotelReason"
        @update-rate="updateHotelRate"
        @save="saveSectionDialog('hotel')"
        @cancel="cancelSectionDialog('hotel')"
      />
      <ItineraryPriceAdjustments
        v-if="selectedItinerary"
        :model-value="isPriceAdjustmentsDialogVisible"
        :plan="selectedItinerary"
        :saved-plan="savedItinerary"
        :editable="priceEditable"
        :saving="isSaving"
        @save="saveSectionDialog('price')"
        @cancel="cancelSectionDialog('price')"
      />
      <GuideEditorDialog
        v-model="isGuideDialogVisible"
        :record="guideForm"
        :is-editing="false"
        @submit="createGuide"
      />
      <ItineraryResourceDialog
        v-model="isResourceDialogVisible"
        :guest-count="guestCount"
        :destination="resourceDestination"
        :meal-slot="resourceMealSlot"
        :current-item="resourceCurrentItem"
        :itinerary-items="selectedItinerary?.dailyPlans.flatMap((day) => day.items) ?? []"
        @submit="addResourceItem"
      />
      <ItineraryPdfPreviewDialog
        v-model="isPdfPreviewVisible"
        :loading="isDownloadingPdf"
        :src="pdfPreviewUrl"
        @confirm="confirmPdfDownload"
        @closed="closePdfPreview"
      />
      <el-drawer
        v-model="isQuoteDrawerVisible"
        :title="$t('itinerary.quoteSettings')"
        size="min(1400px, 96vw)"
      >
        <section
          v-if="validationIssues.length"
          class="itinerary-page__validation p-[12px_16px] mb-[16px] [background:var(--el-color-danger-light-9)] rounded-[8px]"
          role="alert"
        >
          <h3 class="m-0 text-[18px]">
            {{ $t("itinerary.validation.title") }}
          </h3>
          <ul>
            <li v-for="(issue, index) in validationIssues" :key="index">
              <el-button link type="danger" @click="locateIssue(issue.target)">
                {{ $t(issue.key, issue.params ?? {}) }}
              </el-button>
            </li>
          </ul>
        </section>
        <div
          v-if="quotePending"
          v-loading="true"
          :element-loading-text="$t('itinerary.quoteCalculating')"
          class="absolute inset-0 z-[10]"
          role="status"
          :aria-label="$t('itinerary.quoteCalculating')"
        />
        <el-alert v-if="quoteError" type="error" :closable="false" class="mb-3">
          {{ $t("itinerary.quoteCalculationFailed") }}
          <el-button link type="primary" @click="retryQuote">
            {{ $t("itinerary.retryQuoteCalculation") }}
          </el-button>
        </el-alert>
        <el-switch
          v-model="showChildPrice"
          :active-text="$t('itinerary.showChildPriceInPdf')"
          class="mb-3"
        />
        <ItineraryQuotePanel
          v-if="selectedItinerary"
          :inert="isSaving || quotePending"
          :quote="selectedItinerary.quote"
          :guide-plans="selectedItinerary.guidePlans"
          :pax-tiers="selectedItinerary.paxTiers"
          :calculation="quoteCalculation"
          :destinations="quoteDestinations"
          :item-count="itemCount"
          :duration="itineraryDuration(selectedItinerary.dailyPlans)"
          :editable="priceEditable"
          @update-quote-option="updateQuoteOption"
          @update-settings="updateQuoteSettings"
        />
        <template #footer>
          <el-button
            v-if="canDownloadOriginal"
            :loading="isGeneratingPdf"
            @click="downloadOriginal"
          >
            {{ $t("itinerary.downloadOriginal") }}
          </el-button>
          <el-button v-if="!isDraft && canCreateItinerary" @click="copyItinerary">
            {{ $t("itinerary.copyForRevision") }}
          </el-button>
          <el-button v-if="canSaveItinerary" @click="saveItinerary">
            {{ $t("itinerary.save") }}
          </el-button>
          <el-button @click="isQuoteDrawerVisible = false">
            {{ $t("common.close") }}
          </el-button>
          <el-button
            v-if="isDraft && canGeneratePdf"
            type="primary"
            :loading="isGeneratingPdf"
            @click="handleGeneratePdf"
          >
            {{ $t("itinerary.generatePdf") }}
          </el-button>
        </template>
      </el-drawer>
    </template>

    <el-result
      v-else-if="!isLoading && !loadError"
      icon="warning"
      :title="$t('itinerary.inquiryNotFound')"
    >
      <template #extra>
        <el-button type="primary" @click="router.push({ name: 'InquiryList' })">
          {{ $t("common.goBack") }}
        </el-button>
      </template>
    </el-result>
  </div>
</template>

<script setup lang="ts">
import { ArrowDown } from "@element-plus/icons-vue";
import { plannedDuration, itineraryDuration } from "@/views/inquiries/itineraries/duration";
import { computed, nextTick, onMounted, ref, watch } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { useI18n } from "vue-i18n";
import type { ItineraryHotelTier, ItineraryRecord } from "@/types/itinerary";
import { getDayBreakfastStatus } from "./hotel-plans";
import InquiryMessagePreview from "./components/InquiryMessagePreview.vue";
import ItineraryGuidePlansDialog from "./components/ItineraryGuidePlansDialog.vue";
import GuideEditorDialog from "@/views/resources/guide/components/GuideEditorDialog.vue";
import ItineraryDayCard from "./components/ItineraryDayCard.vue";
import ItineraryHotelPlansDialog from "./components/ItineraryHotelPlansDialog.vue";
import ItineraryVehiclePlansDialog from "./components/ItineraryVehiclePlansDialog.vue";
import ItineraryPdfPreviewDialog from "./components/ItineraryPdfPreviewDialog.vue";
import ItineraryPlanDialog from "./components/ItineraryPlanDialog.vue";
import ItineraryPriceAdjustments from "./components/ItineraryPriceAdjustments.vue";
import ItineraryQuotePanel from "./components/ItineraryQuotePanel.vue";
import ItineraryResourceDialog from "./components/ItineraryResourceDialog.vue";
import { ITINERARY_STATUS_TAG_TYPES } from "./options";
import { calculateVehiclePlanAutomaticTotal } from "./vehicle-plans";
import type { VehicleMaintenanceMode } from "./vehicle-plans";
import { useItineraryWorkspace } from "./useItineraryWorkspace";

defineOptions({ name: "InquiryItineraries" });
const { t } = useI18n();
const isQuoteDrawerVisible = ref(false);
const isVehiclePlansDialogVisible = ref(false);
const isGuidePlansDialogVisible = ref(false);
const isHotelPlansDialogVisible = ref(false);
const isPriceAdjustmentsDialogVisible = ref(false);
type SectionDialog = "vehicle" | "guide" | "hotel" | "price";
const activeSectionDialog = ref<SectionDialog>();
const vehicleMaintenanceMode = ref<VehicleMaintenanceMode>("itinerary");

async function confirmAction(key: string, params: Record<string, unknown> = {}) {
  try {
    const isDayCountMismatch = key === "itinerary.dayCountMismatch";
    await ElMessageBox.confirm(
      t(key, params),
      t(isDayCountMismatch ? "common.warning" : "common.tip"),
      {
        type: "warning",
        confirmButtonText: isDayCountMismatch
          ? t("itinerary.generateDespiteMismatch")
          : t("common.confirm"),
        cancelButtonText: t("common.cancel"),
      },
    );
    return true;
  } catch {
    return false;
  }
}

const {
  isSaving,
  isLoading,
  loadError,
  addResourceItem,
  canCreateItinerary,
  canEditItineraryBasics,
  canGeneratePdf,
  canSaveItinerary,
  contentEditable,
  copyItinerary,
  closePdfPreview,
  confirmPdfDownload,
  destinationOptions,
  guestCount,
  handleGeneratePdf,
  inquiry,
  isGeneratingPdf,
  isEditingPlan,
  isPdfPreviewVisible,
  isPlanDialogVisible,
  isResourceDialogVisible,
  isGuideDialogVisible,
  isGuideLoading,
  isGuideMissing,
  isDraft,
  itemCount,
  itineraryForm,
  loadDestinationResourceOptions,
  openCreateDialog,
  openResourceDialog,
  priceEditable,
  quoteCalculation,
  quotePending,
  quoteError,
  retryQuote,
  openEditDialog,
  pdfPreviewUrl,
  removeItem,
  router,
  rows,
  saveItinerary,
  selectedItinerary,
  selectedItineraryId,
  resourceMealSlot,
  resourceCurrentItem,
  updateMeal,
  updateQuoteSettings,
  canCreateGuide,
  createGuide,
  guideForm,
  guideLanguage,
  guideShopping,
  openGuideCreateDialog,
  updateGuideType,
  validationIssues,
  isDownloadingPdf,
  canDownloadOriginal,
  downloadOriginal,
  submitItineraryPlan,
  clearHotelPlan,
  updateDayField,
  updateHotelPlanSelection,
  updateQuoteOption,
  updateVehiclePlan,
  updateHotelCost,
  updateHotelRate,
  updateGuidePrice,
  passengerCount,
  resourceDestination,
  sectionDialogSnapshot,
  savedItinerary,
  showChildPrice,
} = useItineraryWorkspace({
  confirm: confirmAction,
  error: (key) => ElMessage.error(t(key)),
  success: (key) => ElMessage.success(t(key)),
  warning: (key, params) => ElMessage.warning(t(key, params)),
  translate: t,
});

const hasVehiclePlans = computed(
  () => selectedItinerary.value?.vehiclePlans.some((plan) => plan.arrangements.length) ?? false,
);
const hasGuidePlans = computed(() => Boolean(selectedItinerary.value?.guidePlans.length));
const hasHotelPlans = computed(
  () => selectedItinerary.value?.hotelPlans.some((plan) => plan.hotels.length) ?? false,
);
const quoteDestinations = computed(() => {
  const plan = selectedItinerary.value;
  if (!plan) return [];
  const destinations = new Set(plan.destinations);
  const dailyOrder = plan.dailyPlans
    .map((day) => day.destination)
    .filter((destination) => destinations.has(destination));
  return [...new Set([...dailyOrder, ...plan.destinations])];
});
const hasPriceItems = computed(() =>
  Boolean(
    selectedItinerary.value &&
    (selectedItinerary.value.dailyPlans.some((day) => day.items.length) ||
      hasHotelPlans.value ||
      hasGuidePlans.value ||
      hasVehiclePlans.value),
  ),
);

function setSectionDialogVisible(section: SectionDialog, visible: boolean) {
  if (section === "vehicle") isVehiclePlansDialogVisible.value = visible;
  if (section === "guide") isGuidePlansDialogVisible.value = visible;
  if (section === "hotel") isHotelPlansDialogVisible.value = visible;
  if (section === "price") isPriceAdjustmentsDialogVisible.value = visible;
}

function updateGuideReason(reason: string) {
  if (!contentEditable.value) return;
  const guide = selectedItinerary.value?.guidePlans[0];
  if (guide) guide.adjustmentReason = reason;
}

function updateHotelReason(tier: ItineraryHotelTier, destination: string, reason: string) {
  if (!contentEditable.value) return;
  const hotel = selectedItinerary.value?.hotelPlans
    .find((plan) => plan.tier === tier)
    ?.hotels.find((item) => item.destination === destination);
  if (hotel) hotel.adjustmentReason = reason;
}

function openSectionDialog(section: SectionDialog) {
  const plan = selectedItinerary.value;
  if (!plan) return;
  activeSectionDialog.value = section;
  sectionDialogSnapshot.value = cloneItinerary(plan);
  if (section === "vehicle") {
    vehicleMaintenanceMode.value = plan.vehiclePlans.some((vehicle) =>
      vehicle.arrangements.some((arrangement) => arrangement.vehicles.length),
    )
      ? "itinerary"
      : plan.vehiclePlans.some((vehicle) => vehicle.arrangements.length)
        ? "stage"
        : "itinerary";
  }
  setSectionDialogVisible(section, true);
}

function openVehiclePlans(command: string | number | object) {
  if (command !== "itinerary" && command !== "stage") return;
  openSectionDialog("vehicle");
  vehicleMaintenanceMode.value = command;
  if (command !== "stage") return;
  const plan = selectedItinerary.value;
  if (!plan) return;
  for (const vehicle of plan.vehiclePlans) {
    const arrangements = vehicle.arrangements.map((arrangement) => ({
      ...arrangement,
      vehicles: [],
    }));
    const stagePlan = { ...vehicle, arrangements };
    updateVehiclePlan(vehicle.tier, {
      ...stagePlan,
      totalPrice: calculateVehiclePlanAutomaticTotal(stagePlan),
      pricingMode: "automatic",
      adjustmentReason: "",
    });
  }
}

function cancelSectionDialog(section: SectionDialog) {
  const plan = selectedItinerary.value;
  const snapshot = sectionDialogSnapshot.value;
  if (activeSectionDialog.value === section && plan && snapshot?.id === plan.id) {
    Object.assign(plan, cloneItinerary(snapshot));
    if (section === "guide") {
      guideLanguage.value = plan.guidePlans[0]?.secondLanguage ?? "";
      guideShopping.value = plan.guidePlans[0]?.shopping ?? false;
    }
  }
  activeSectionDialog.value = undefined;
  sectionDialogSnapshot.value = undefined;
  setSectionDialogVisible(section, false);
}

function cloneItinerary(plan: ItineraryRecord) {
  return JSON.parse(JSON.stringify(plan)) as ItineraryRecord;
}

async function saveSectionDialog(section: SectionDialog) {
  if (activeSectionDialog.value !== section || !(await saveItinerary())) return;
  activeSectionDialog.value = undefined;
  sectionDialogSnapshot.value = undefined;
  setSectionDialogVisible(section, false);
}

watch(selectedItineraryId, () => {
  validationIssues.value = [];
  isVehiclePlansDialogVisible.value = false;
  isGuidePlansDialogVisible.value = false;
  isHotelPlansDialogVisible.value = false;
  isPriceAdjustmentsDialogVisible.value = false;
  activeSectionDialog.value = undefined;
  sectionDialogSnapshot.value = undefined;
});
const dayCards = new Map<string, { expand: () => void }>();
function setDayCard(id: string, card: unknown) {
  if (card) dayCards.set(id, card as { expand: () => void });
  else dayCards.delete(id);
}
async function locateIssue(target: string) {
  if (target.startsWith("day-")) dayCards.get(target.slice(4))?.expand();
  if (target === "quote") {
    document
      .querySelector(".quote-panel__settings")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }
  isQuoteDrawerVisible.value = false;
  if (target === "itinerary-vehicles") openSectionDialog("vehicle");
  if (target === "itinerary-guides") openSectionDialog("guide");
  if (target === "itinerary-hotels") openSectionDialog("hotel");
  await nextTick();
  document.getElementById(target)?.scrollIntoView({ behavior: "smooth", block: "start" });
}
onMounted(loadDestinationResourceOptions);
</script>

<style scoped>
.itinerary-page__overview :deep(.el-card__body) {
  padding: 14px 18px 12px;
}
</style>
