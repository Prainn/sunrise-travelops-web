<template>
  <PageShell
    v-loading.fullscreen="isLoading || isSaving"
    element-loading-background="rgba(0, 0, 0, 0.2)"
    :inert="isSaving"
    :fill="false"
    class="itinerary-page [overflow-anchor:none]"
  >
    <el-alert
      v-if="loadError"
      :title="loadError"
      type="error"
      :closable="false"
    />
    <template v-if="inquiry">
      <ItineraryWorkspaceLayout
        ref="workspaceLayout"
        :days="dayEntries"
        :can-add="contentEditable && !isSaving"
        :reset-key="selectedItinerary?.id"
        @add="addDay"
        @expand="(id) => dayCards.get(id)?.expand()"
        @reorder="isReorderDialogVisible = true"
      >
        <template #header="{ collapsed }">
          <SectionCard class="itinerary-page__header">
            <el-page-header @back="router.push({ name: 'InquiryList' })">
              <template #content>
                <div class="flex flex-wrap items-center gap-[10px]">
                  <el-tag>
                    {{ businessUnitName(inquiry.businessUnit) }}
                  </el-tag>
                  <el-select
                    v-if="selectedItinerary"
                    v-model="selectedItineraryId"
                    autocomplete="new-password"
                    class="itinerary-page__plan-select w-[min(360px,_60vw)]!"
                  >
                    <el-option
                      v-for="row in rows"
                      :key="row.id"
                      :label="row.title"
                      :value="row.id"
                    />
                  </el-select>
                </div>
              </template>
              <template #extra>
                <el-button v-if="canCreateItinerary" type="primary" @click="openCreateDialog">
                  {{ $t("common.create") }}
                </el-button>
              </template>
            </el-page-header>
            <el-collapse-transition>
              <div v-show="!collapsed" class="flow-root">
                <div
                  v-if="selectedItinerary"
                  class="itinerary-page__plan-bar flex flex-wrap items-center justify-between gap-3 mt-[12px] p-[12px_0] [border-top:1px_solid_var(--divider-color)] [border-bottom:1px_solid_var(--divider-color)]"
                >
                  <div class="itinerary-page__plan-summary min-w-0 flex flex-wrap items-center gap-2">
                    <h2 class="m-0 text-[18px] text-strong break-words">
                      {{ selectedItinerary.title }}
                    </h2>
                    <p class="m-0 flex flex-wrap items-center gap-[6px] text-[14px] text-muted">
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
                  <div class="itinerary-page__plan-controls flex flex-wrap items-center gap-[10px]">
                    <el-tag :type="ITINERARY_STATUS_TAG_TYPES[selectedItinerary.status]">
                      {{ $t(`itinerary.statuses.${selectedItinerary.status}`) }}
                    </el-tag>
                    <el-tag v-if="hasUnsavedChanges" type="warning">
                      {{ $t("websiteWorkspace.unsavedChanges") }}
                    </el-tag>
                    <el-button v-if="canEditItineraryBasics" class="ml-0!" @click="openEditDialog">
                      {{ $t("itinerary.editItinerary") }}
                    </el-button>
                    <el-button v-if="!isDraft && canCreateItinerary" class="ml-0!" @click="copyItinerary">
                      {{ $t("itinerary.copyForRevision") }}
                    </el-button>
                  </div>
                </div>
                <div
                  class="itinerary-page__inquiry-summary grid [grid-template-columns:repeat(4,_minmax(0,_1fr))] items-center gap-x-[18px] gap-y-2 mt-[10px] text-[14px] max-[1100px]:[grid-template-columns:repeat(2,_minmax(0,_1fr))] max-[650px]:grid-cols-1"
                >
                  <span class="min-w-0 flex gap-[6px]"><small class="shrink-0 text-[var(--el-text-color-secondary)]">{{
                    $t("inquiry.code")
                  }}</small>{{ inquiry.code }}</span>
                  <span class="min-w-0 flex gap-[6px]"><small class="shrink-0 text-[var(--el-text-color-secondary)]">{{
                    $t("inquiry.agencyName")
                  }}</small>{{ inquiry.agencyName }}</span>
                  <span class="min-w-0 flex gap-[6px]"><small class="shrink-0 text-[var(--el-text-color-secondary)]">{{
                    $t("common.contact")
                  }}</small>{{ inquiry.contactName }}</span>
                  <span class="min-w-0 flex gap-[6px]"><small class="shrink-0 text-[var(--el-text-color-secondary)]">{{
                    $t("inquiry.plannedDays")
                  }}</small>{{ $t("itinerary.duration", plannedDuration(inquiry.plannedDays)) }}</span>
                </div>
              </div>
            </el-collapse-transition>
            <div
              v-if="selectedItinerary"
              class="itinerary-page__section-actions flex flex-wrap items-center gap-[10px] mt-[12px]"
            >
              <span class="text-[13px] text-muted">{{ $t("itineraryWorkspace.wholeTripPlans") }}</span>
              <el-dropdown trigger="click" @command="openVehiclePlans">
                <el-button :type="hasVehiclePlans ? 'primary' : ''">
                  {{ $t("planning.vehiclePlans") }}
                  <el-icon class="ml-[6px]">
                    <ArrowDown />
                  </el-icon>
                </el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item command="itinerary">
                      {{
                        $t("planning.byItinerary")
                      }}
                    </el-dropdown-item>
                    <el-dropdown-item command="stage">
                      {{ $t("planning.byStage") }}
                    </el-dropdown-item>
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
          </SectionCard>
        </template>

        <template #notice>
          <el-alert
            v-if="reorderIssues.length"
            type="warning"
            :title="$t('itineraryWorkspace.issuesTitle')"
            @close="reorderIssues = []"
          >
            <ul class="m-0 pl-4">
              <li v-for="(issue, index) in reorderIssues" :key="index">
                {{ $t(issue.key, issue.params ?? {}) }}
                <el-button link type="primary" @click="locateReorderIssue(issue)">
                  {{ $t("itineraryWorkspace.locate") }}
                </el-button>
              </li>
            </ul>
          </el-alert>
        </template>

        <template #day="{ index }">
          <ItineraryDayCard
            v-if="selectedItinerary?.dailyPlans[index]"
            :ref="(card) => setDayCard(selectedItinerary!.dailyPlans[index]!.id, card)"
            :day="selectedItinerary.dailyPlans[index]"
            :breakfast-status="getDayBreakfastStatus(selectedItinerary, index)"
            :destinations="selectedItinerary.destinations"
            :content-editable="contentEditable"
            :planned-days="selectedItinerary?.dailyPlans.length || inquiry.plannedDays"
            :is-last="index === selectedItinerary.dailyPlans.length - 1"
            :plans="dayPlanSummaries[index] ?? EMPTY_DAY_PLANS"
            @update-field="(field, value) => updateDayField(index, field, value)"
            @add-item="openResourceDialog(selectedItinerary!.dailyPlans[index]!.id)"
            @edit-item="(item) => openResourceDialog(selectedItinerary!.dailyPlans[index]!.id, item.mealSlot ?? null, item.id)"
            @update-meal="(slot, included) => updateMeal(index, slot, included)"
            @select-meal="openResourceDialog(selectedItinerary!.dailyPlans[index]!.id, $event)"
            @remove-item="removeItem(selectedItinerary!.dailyPlans[index]!.id, $event)"
            @open-plan="openDayPlan"
          />
        </template>

        <template #empty>
          <SectionCard v-if="!selectedItinerary">
            <FeedbackState :title="$t('itinerary.noPlans')">
              <el-button v-if="canCreateItinerary" type="primary" @click="openCreateDialog">
                {{ $t("common.create") }}
              </el-button>
            </FeedbackState>
          </SectionCard>
        </template>

        <template #footer>
          <ItineraryWorkspaceFooter v-if="selectedItinerary">
            <template #summary>
              {{ $t("itinerary.duration", itineraryDuration(selectedItinerary.dailyPlans)) }} ·
              {{ $t("itinerary.resourceItemCount", { count: itemCount }) }}
            </template>
            <el-button :disabled="!canSaveItinerary" class="ml-0!" @click="saveItinerary">
              {{ $t("common.save") }}
            </el-button>
            <el-button type="primary" class="ml-0!" @click="isQuoteDrawerVisible = true">
              {{ $t("itinerary.viewQuote") }}
            </el-button>
          </ItineraryWorkspaceFooter>
        </template>
      </ItineraryWorkspaceLayout>

      <InquiryMessagePreview
        v-if="inquiry.originalMessage"
        :key="inquiry.id"
        :text="inquiry.originalMessage"
      />

      <ItineraryReorderDialog
        v-if="selectedItinerary"
        v-model="isReorderDialogVisible"
        :days="reorderBoardDays"
        :deleted-days="deletedBoardDays"
        :start-date="selectedItinerary.startDate"
        :readonly="!contentEditable"
        :validate="(change) => reorderItineraryDays(selectedItinerary!, change).issues"
        @apply="applyReorder"
      />
      <ItineraryPlanDialog
        v-model="isPlanDialogVisible"
        :record="itineraryForm"
        :planned-days="isEditingPlan ? (selectedItinerary?.dailyPlans.length || inquiry.plannedDays) : inquiry.plannedDays"
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
        :planned-days="selectedItinerary?.dailyPlans.length || inquiry.plannedDays"
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
        :saved-plans="savedItinerary?.guidePlans ?? []"
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
        :saved-hotel-plans="savedItinerary?.hotelPlans ?? []"
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
        :submit="createGuide"
      />
      <ItineraryResourceDialog
        v-model="isResourceDialogVisible"
        :day-label="resourceDay ? `D${resourceDay.dayNumber}` : ''"
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
      <AppDrawer
        v-model="isQuoteDrawerVisible"
        :title="$t('itinerary.quoteSettings')"
        size="xl"
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
        <el-alert
          v-if="quoteError"
          type="error"
          :closable="false"
          class="mb-3!"
        >
          {{ $t(quoteMaxRetriesReached ? "itinerary.quoteMaxRetriesReached" : "itinerary.quoteCalculationFailed") }}
          <el-button
            v-if="quoteError === 'retriable' && !quoteMaxRetriesReached"
            link
            type="primary"
            @click="retryQuote"
          >
            {{ $t("itinerary.retryQuoteCalculation") }}
          </el-button>
          <span v-if="quoteErrorReason" class="ml-2">[{{ quoteErrorReason }}]</span>
        </el-alert>
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
          <el-switch
            v-model="showChildPrice"
            class="mr-auto"
            :active-text="$t('itinerary.showChildPriceInPdf')"
          />
          <div>
            <el-button
              v-if="canDownloadOriginal || (isDraft && canGeneratePdf)"
              :loading="isGeneratingWord"
              @click="handleGenerateWord"
            >
              {{ $t("itinerary.exportWord") }}
            </el-button>
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
              {{ $t("common.save") }}
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
          </div>
        </template>
      </AppDrawer>
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
  </PageShell>
</template>

<script setup lang="ts">
import { businessUnitName } from "@/constants/identity";
import { ArrowDown, Bowl, Location, OfficeBuilding, User, Van } from "@element-plus/icons-vue";
import { plannedDuration, itineraryDuration } from "@/views/inquiries/itineraries/duration";
import { computed, markRaw, nextTick, onMounted, ref, useTemplateRef, watch } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { useI18n } from "vue-i18n";
import type { ItineraryDayRecord, ItineraryHotelTier, ItineraryRecord } from "@/types/itinerary";
import { getDayBreakfastStatus, getEnabledHotelPlans } from "./hotel-plans";
import { reorderItineraryDays } from "./day-order";
import type { DayOrderChange, DayOrderIssue, ReorderBoardDay } from "./reorder-board";
import ItineraryWorkspaceFooter from "./components/ItineraryWorkspaceFooter.vue";
import ItineraryWorkspaceLayout from "./components/ItineraryWorkspaceLayout.vue";
import ItineraryReorderDialog from "./components/ItineraryReorderDialog.vue";
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
import AppDrawer from "@/components/AppDrawer/index.vue";
import FeedbackState from "@/components/FeedbackState/index.vue";
import PageShell from "@/components/PageShell/index.vue";
import SectionCard from "@/components/SectionCard/index.vue";
import { usePageTitle } from "@/composables/usePageTitle";
import { ITINERARY_STATUS_TAG_TYPES } from "./options";
import { calculateVehiclePlanAutomaticTotal } from "./vehicle-plans";
import type { VehicleMaintenanceMode } from "./vehicle-plans";
import { useItineraryWorkspace } from "./useItineraryWorkspace";

defineOptions({ name: "InquiryItineraries" });
const { t } = useI18n();
const EMPTY_DAY_PLANS = { hotel: "", vehicle: "", guide: "" };
const workspaceLayout = useTemplateRef<InstanceType<typeof ItineraryWorkspaceLayout>>("workspaceLayout");
const isReorderDialogVisible = ref(false);
const reorderIssues = ref<DayOrderIssue[]>([]);
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
  applyDayOrder,
  addDay,
  hasUnsavedChanges,
  resourceDay,
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
  handleGenerateWord,
  isGeneratingWord,
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
  quoteErrorReason,
  quoteMaxRetriesReached,
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
  error: (key, params) => ElMessage.error(t(key, params ?? {})),
  success: (key) => ElMessage.success(t(key)),
  warning: (key, params) => ElMessage.warning(t(key, params)),
  translate: t,
});
usePageTitle(() => {
  const name = inquiry.value?.contactName || inquiry.value?.agencyName;
  return name ? t("itineraryWorkspace.pageTitles.inquiry", { name }) : "";
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

const dayEntries = computed(() =>
  (selectedItinerary.value?.dailyPlans ?? []).map((day) => ({
    id: day.id,
    label: `D${day.dayNumber}`,
    summary: dayRoute(day),
  })),
);
const dayPlanSummaries = computed(() =>
  (selectedItinerary.value?.dailyPlans ?? []).map((day) => ({
    hotel: dayHotelSummary(day),
    vehicle: dayVehicleSummary(day),
    guide: guideSummary.value,
  })),
);
const guideSummary = computed(() => {
  const guide = selectedItinerary.value?.guidePlans[0];
  return guide ? `${guide.guideName} · ${t("itineraryWorkspace.scopes.wholeTrip")}` : "";
});
/** 顺序看板分组图标，与日卡资源按钮一致 */
const BOARD_ICONS = {
  attractions: markRaw(Location),
  meals: markRaw(Bowl),
  hotel: markRaw(OfficeBuilding),
  vehicle: markRaw(Van),
  guide: markRaw(User),
};
const allReorderBoardDays = computed<ReorderBoardDay[]>(() => {
  const plan = selectedItinerary.value;
  if (!plan) return [];
  return [...plan.dailyPlans, ...(plan.deletedDays ?? []).map((entry) => entry.day)].map((day, index) => {
    const summaries = { hotel: dayHotelSummary(day), vehicle: dayVehicleSummary(day), guide: guideSummary.value };
    const breakfast = index < plan.dailyPlans.length ? getDayBreakfastStatus(plan, index) : day.meals.breakfast ? "included" : "excluded";
    return {
      id: day.id,
      title: dayRoute(day) || t("itineraryWorkspace.notArranged"),
      dayNumber: day.dayNumber,
      date: plan.deletedDays?.find((entry) => entry.day.id === day.id)?.originalDate ?? day.date,
      groups: [
        {
          key: "attractions",
          label: t("itineraryWorkspace.actions.attraction"),
          icon: BOARD_ICONS.attractions,
          sortable: true,
          items: day.items
            .filter((item) => item.type === "attraction")
            .map((item) => ({ id: item.id, label: item.resourceName, detail: item.priceName })),
        },
        {
          key: "meals",
          label: t("itineraryWorkspace.groups.meals"),
          icon: BOARD_ICONS.meals,
          items: [
            {
              id: `${day.id}-breakfast`,
              label: t(
                breakfast === "pending"
                  ? "itinerary.breakfastPending"
                  : breakfast === "included"
                    ? "itinerary.breakfastIncluded"
                    : "itinerary.breakfastExcluded",
              ),
            },
            ...day.items
              .filter((item) => item.type === "restaurant")
              .map((item) => ({
                id: item.id,
                label: `${item.mealSlot ? t(`itinerary.meals.${item.mealSlot}`) : ""} ${item.resourceName}`.trim(),
              })),
          ],
        },
        ...(["hotel", "vehicle", "guide"] as const).map((key) => ({
          key,
          label: t(`itineraryWorkspace.actions.${key}`),
          icon: BOARD_ICONS[key],
          scope: t(
            key === "hotel"
              ? "itineraryWorkspace.scopes.byCity"
              : key === "vehicle"
                ? "itineraryWorkspace.scopes.byDateRange"
                : "itineraryWorkspace.scopes.wholeTrip",
          ),
          items: summaries[key] ? [{ id: `${day.id}-${key}`, label: summaries[key] }] : [],
        })),
      ],
    };
  });
});

const reorderBoardDays = computed(() => allReorderBoardDays.value.slice(0, selectedItinerary.value?.dailyPlans.length ?? 0));
const deletedBoardDays = computed(() => allReorderBoardDays.value.slice(selectedItinerary.value?.dailyPlans.length ?? 0));

function dayRoute(day: ItineraryDayRecord) {
  if (day.departure || day.destination) return `${day.departure || "-"} → ${day.destination || "-"}`;
  return day.items.map((item) => item.resourceName).join("、");
}

/** 酒店按住宿城市搭配；多个档次是备选方案，不是同晚连住多家。 */
function dayHotelSummary(day: ItineraryDayRecord) {
  const plan = selectedItinerary.value;
  const city = day.overnightDestination;
  if (!plan || !city) return "";
  const hotels = getEnabledHotelPlans(plan).flatMap((hotelPlan) => {
    const hotel = hotelPlan.hotels.find((item) => item.destination === city);
    return hotel ? [`${t(`itinerary.hotelTiers.${hotelPlan.tier}`)} ${hotel.hotelName}`] : [];
  });
  if (!hotels.length) return "";
  const text = `${city}：${hotels.join(" / ")}`;
  return hotels.length > 1 ? t("itineraryWorkspace.alternativePlans", { plans: text }) : text;
}

/** 用车按全程或绝对日期段保存，只展示覆盖当天的安排。 */
function dayVehicleSummary(day: ItineraryDayRecord) {
  const plan = selectedItinerary.value;
  if (!plan) return "";
  const lines = plan.vehiclePlans.flatMap((vehicle) =>
    vehicle.arrangements
      .filter((arrangement) => !day.date || !arrangement.startDate || (arrangement.startDate <= day.date && day.date <= arrangement.endDate))
      .map((arrangement) => {
        const vehicles = arrangement.vehicles.map((item) => `${item.vehicleName}×${item.quantity}`).join("、");
        const range = arrangement.startDate ? `${arrangement.startDate}~${arrangement.endDate}` : "";
        return `${t(`itinerary.vehicleServiceLevels.${vehicle.tier}`)} ${vehicles || range}`.trim();
      }),
  );
  if (!lines.length) return "";
  return lines.length > 1 ? t("itineraryWorkspace.alternativePlans", { plans: lines.join(" / ") }) : lines[0]!;
}

function openDayPlan(section: "hotel" | "vehicle" | "guide") {
  openSectionDialog(section);
}

function applyReorder(change: DayOrderChange) {
  const issues = applyDayOrder(change);
  if (!issues) return;
  reorderIssues.value = issues;
  ElMessage.success(t("itineraryWorkspace.orderApplied"));
}

function locateReorderIssue(issue: DayOrderIssue) {
  if (issue.dayId) void workspaceLayout.value?.scrollToDay(issue.dayId);
  else openSectionDialog("vehicle");
}

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
  // 已是按段形态时只切换模式，不重置已维护的日期段和手填价格。
  const hasArrangements = plan.vehiclePlans.some((vehicle) => vehicle.arrangements.length);
  const hasVehicles = plan.vehiclePlans.some((vehicle) =>
    vehicle.arrangements.some((arrangement) => arrangement.vehicles.length),
  );
  if (hasArrangements && !hasVehicles) return;
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
  reorderIssues.value = [];
  isReorderDialogVisible.value = false;
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
  if (target.startsWith("day-")) {
    isQuoteDrawerVisible.value = false;
    await nextTick();
    await workspaceLayout.value?.scrollToDay(target.slice(4));
    return;
  }
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
.itinerary-page__section-actions > :deep(.el-button) {
  margin-left: 0;
}
</style>
