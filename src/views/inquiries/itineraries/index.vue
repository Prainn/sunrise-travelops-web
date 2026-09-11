<template>
  <div
    v-loading.fullscreen="isLoading || isSaving"
    element-loading-background="rgba(0, 0, 0, 0.2)"
    :inert="isSaving"
    class="page-container itinerary-page h-auto min-h-full overflow-visible p-0"
  >
    <el-alert
      v-if="loadError"
      :title="loadError"
      type="error"
      :closable="false"
    />
    <template v-if="inquiry">
      <header class="itinerary-page__sticky-header sticky z-[10] top-0 [background:var(--page-bg)] [box-shadow:var(--el-box-shadow-light)]">
        <el-card
          class="itinerary-page__overview rounded-0! border-0!"
          shadow="never"
        >
          <el-page-header @back="router.push('/inquiries/list')">
            <template #content>
              <el-select
                v-if="selectedItinerary"
                v-model="selectedItineraryId"
                class="itinerary-page__plan-select w-[min(360px,_45vw)]!"
              >
                <el-option
                  v-for="row in rows"
                  :key="row.id"
                  :label="row.title"
                  :value="row.id"
                />
              </el-select>
            </template>
            <template #extra>
              <el-button
                v-if="canCreateItinerary"
                type="primary"
                @click="openCreateDialog"
              >
                {{ $t("itinerary.createTitle") }}
              </el-button>
            </template>
          </el-page-header>
          <div
            v-if="selectedItinerary"
            class="itinerary-page__plan-bar grid [grid-template-columns:360px_minmax(0,_1fr)_auto] items-center gap-[18px] mt-[12px] p-[12px_0] [border-top:1px_solid_var(--el-border-color-lighter)] [border-bottom:1px_solid_var(--el-border-color-lighter)] max-[1100px]:[grid-template-columns:minmax(260px,_1fr)_auto]"
          >
            <div class="itinerary-page__plan-summary min-w-0 max-[1100px]:hidden">
              <h2 class="m-0 overflow-hidden whitespace-nowrap text-ellipsis text-[18px]">
                {{ selectedItinerary.title }}
              </h2>
              <p class="m-[3px_0_0] text-[14px] text-[var(--el-text-color-secondary)]">
                {{ selectedItinerary.startDate }} — {{ selectedItinerary.endDate }} ·
                {{ $t("itinerary.guestCount") }} {{ guestCount }}＋{{ selectedItinerary.leaderCount }}
              </p>
            </div>

            <div class="itinerary-page__plan-controls flex items-center gap-[10px]">
              <el-tag :type="ITINERARY_STATUS_TAG_TYPES[selectedItinerary.status]">
                {{ $t(`itinerary.statuses.${selectedItinerary.status}`) }}
              </el-tag>
              <el-button
                v-if="canEditItineraryBasics"
                @click="openEditDialog"
              >
                {{ $t("itinerary.editBasics") }}
              </el-button>
              <el-button
                v-if="!isDraft && canCreateItinerary"
                @click="copyItinerary"
              >
                {{ $t("itinerary.copyForRevision") }}
              </el-button>
            </div>
          </div>
          <div class="itinerary-page__inquiry-summary grid [grid-template-columns:repeat(2,_minmax(0,_1fr))] items-center gap-[18px] mt-[10px] text-[14px]">
            <span class="min-w-0 flex gap-[6px]"><small class="shrink-0 text-[var(--el-text-color-secondary)]">{{ $t("inquiry.code") }}</small>{{ inquiry.code }}</span>
            <span class="min-w-0 flex gap-[6px]"><small class="shrink-0 text-[var(--el-text-color-secondary)]">{{ $t("inquiry.agencyName") }}</small>{{ inquiry.agencyName }}</span>
            <span class="min-w-0 flex gap-[6px]"><small class="shrink-0 text-[var(--el-text-color-secondary)]">{{ $t("inquiry.contactName") }}</small>{{ inquiry.contactName }}</span>
            <span class="min-w-0 flex gap-[6px]"><small class="shrink-0 text-[var(--el-text-color-secondary)]">{{ $t("inquiry.plannedDays") }}</small>{{ $t("itinerary.duration", plannedDuration(inquiry.plannedDays)) }}</span>
            <span
              class="itinerary-page__message min-w-0 flex gap-[6px] [grid-column:1_/_-1] overflow-hidden whitespace-nowrap text-ellipsis"
              :title="inquiry.originalMessage"
            ><small class="shrink-0 text-[var(--el-text-color-secondary)]">{{ $t("inquiry.originalMessage") }}</small>{{ inquiry.originalMessage }}</span>
          </div>
        </el-card>
      </header>

      <template v-if="selectedItinerary">
        <main class="itinerary-page__workspace mx-4">
          <ItineraryVehiclePlans
            :plans="selectedItinerary.vehiclePlans"
            :start-date="selectedItinerary.startDate"
            :planned-days="inquiry.plannedDays"
            :passenger-count="passengerCount"
            :editable="contentEditable"
            @update-plan="updateVehiclePlan"
          />
          <ItineraryGuidePlans
            :plans="selectedItinerary.guidePlans"
            :second-language="guideLanguage"
            :shopping="guideShopping"
            :editable="contentEditable"
            :loading="isGuideLoading"
            :missing="isGuideMissing"
            :can-create="canCreateGuide"
            @update-type="updateGuideType"
            @update-price="updateGuidePrice"
            @create-guide="openGuideCreateDialog"
          />
          <div class="itinerary-page__daily-toolbar h-12 flex justify-between items-center min-h-[48px] m-[24px_0_14px]">
            <div>
              <h3 class="m-0">
                {{ $t("itinerary.dailySchedule") }}
              </h3>
            </div>
            <el-button
              v-if="contentEditable"
              type="primary"
              plain
              @click="handleAddDay()"
            >
              {{ $t("itinerary.addDay") }}
            </el-button>
          </div>
          <template
            v-for="(day, index) in selectedItinerary.dailyPlans"
            :key="day.id"
          >
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
              @update-item-quantity="(itemIndex, quantity) => updateItemQuantity(day.id, itemIndex, quantity)"
              @duplicate="duplicateDay(index)"
              @remove="removeDay(index)"
            />
            <div
              v-if="contentEditable"
              class="flex justify-center py-3"
            >
              <el-button
                plain
                type="primary"
                @click="handleAddDay(index)"
              >
                {{ $t('itinerary.addDayAfter') }}
              </el-button>
            </div>
          </template>
          <ItineraryHotelPlans
            :destinations="selectedItinerary.destinations"
            :daily-plans="selectedItinerary.dailyPlans"
            :hotel-plans="selectedItinerary.hotelPlans"
            :guest-count="passengerCount"
            :editable="contentEditable"
            @clear-plan="clearHotelPlan"
            @update-selection="updateHotelPlanSelection"
            @update-cost="updateHotelCost"
          />
        </main>

        <footer class="itinerary-page__sticky-footer border-0! rounded-0! sticky z-[10] bottom-0 flex justify-between items-center min-h-[64px] p-[12px_18px] [background:var(--el-bg-color)] [box-shadow:var(--el-box-shadow-light)]">
          <div class="itinerary-page__footer-summary text-[var(--el-text-color-secondary)] text-[14px]">
            {{ $t("itinerary.duration", itineraryDuration(selectedItinerary.dailyPlans)) }} ·
            {{ $t("itinerary.resourceItemCount", { count: itemCount }) }}
          </div>
          <div class="itinerary-page__footer-actions flex gap-[12px]">
            <el-button
              :disabled="!canSaveItinerary"
              @click="saveItinerary"
            >
              {{ $t("itinerary.save") }}
            </el-button>
            <el-button
              type="primary"
              @click="isQuoteDrawerVisible = true"
            >
              {{ $t("itinerary.viewQuote") }}
            </el-button>
          </div>
        </footer>
      </template>

      <el-card
        v-else
        class="page-content"
        shadow="never"
      >
        <el-empty :description="$t('itinerary.noPlans')">
          <el-button
            v-if="canCreateItinerary"
            type="primary"
            @click="openCreateDialog"
          >
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
        size="min(1200px, 96vw)"
      >
        <section
          v-if="validationIssues.length"
          class="itinerary-page__validation p-[12px_16px] mb-[16px] [background:var(--el-color-danger-light-9)] rounded-[8px]"
          role="alert"
        >
          <h3 class="m-0 text-[18px]">
            {{ $t('itinerary.validation.title') }}
          </h3>
          <ul>
            <li
              v-for="(issue, index) in validationIssues"
              :key="index"
            >
              <el-button
                link
                type="danger"
                @click="locateIssue(issue.target)"
              >
                {{ $t(issue.key, issue.params ?? {}) }}
              </el-button>
            </li>
          </ul>
        </section>
        <ItineraryQuotePanel
          v-if="selectedItinerary && quoteCalculation"
          :inert="isSaving"
          :quote="selectedItinerary.quote"
          :leader-count="selectedItinerary.leaderCount"
          :calculation="quoteCalculation"
          :item-count="itemCount"
          :duration="itineraryDuration(selectedItinerary.dailyPlans)"
          :guest-count="guestCount"
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
            {{ $t('itinerary.downloadOriginal') }}
          </el-button>
          <el-button
            v-if="!isDraft && canCreateItinerary"
            @click="copyItinerary"
          >
            {{ $t('itinerary.copyForRevision') }}
          </el-button>
          <el-button
            v-if="canSaveItinerary"
            @click="saveItinerary"
          >
            {{ $t('itinerary.save') }}
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
        <el-button
          type="primary"
          @click="router.push({ name: 'InquiryList' })"
        >
          {{ $t("common.goBack") }}
        </el-button>
      </template>
    </el-result>
  </div>
</template>

<script setup lang="ts">
import { plannedDuration, itineraryDuration } from "@/views/inquiries/itineraries/duration";
import { nextTick, onMounted, ref, watch } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { useI18n } from "vue-i18n";
import { getDayBreakfastStatus } from "./hotel-plans";
import ItineraryGuidePlans from "./components/ItineraryGuidePlans.vue";
import GuideEditorDialog from "@/views/resources/guide/components/GuideEditorDialog.vue";
import ItineraryDayCard from "./components/ItineraryDayCard.vue";
import ItineraryHotelPlans from "./components/ItineraryHotelPlans.vue";
import ItineraryVehiclePlans from "./components/ItineraryVehiclePlans.vue";
import ItineraryPdfPreviewDialog from "./components/ItineraryPdfPreviewDialog.vue";
import ItineraryPlanDialog from "./components/ItineraryPlanDialog.vue";
import ItineraryQuotePanel from "./components/ItineraryQuotePanel.vue";
import ItineraryResourceDialog from "./components/ItineraryResourceDialog.vue";
import { ITINERARY_STATUS_TAG_TYPES } from "./options";
import { useItineraryWorkspace } from "./useItineraryWorkspace";

defineOptions({ name: "InquiryItineraries" });
const { t } = useI18n();
const isQuoteDrawerVisible = ref(false);

async function confirmAction(key: string, params: Record<string, unknown> = {}) {
  try {
    const isDayCountMismatch = key === "itinerary.dayCountMismatch";
    await ElMessageBox.confirm(
      t(key, params),
      t(isDayCountMismatch ? "common.warning" : "common.tip"),
      {
        type: "warning",
        confirmButtonText: isDayCountMismatch ? t("itinerary.generateDespiteMismatch") : t("common.confirm"),
        cancelButtonText: t("common.cancel"),
      }
    );
    return true;
  } catch {
    return false;
  }
}

const {
  isSaving, isLoading, loadError, addDay, addResourceItem, canCreateItinerary, canEditItineraryBasics, canGeneratePdf, canSaveItinerary, contentEditable, copyItinerary,
  closePdfPreview, confirmPdfDownload, destinationOptions, duplicateDay, guestCount, handleGeneratePdf, inquiry, isGeneratingPdf,
  isEditingPlan, isPdfPreviewVisible, isPlanDialogVisible, isResourceDialogVisible,
  isGuideDialogVisible, isGuideLoading, isGuideMissing,
  isDraft, itemCount, itineraryForm, loadDestinationResourceOptions, openCreateDialog, openResourceDialog, priceEditable, quoteCalculation,
  openEditDialog, pdfPreviewUrl, removeDay, removeItem, router, rows, saveItinerary, selectedItinerary, selectedItineraryId,
  resourceMealSlot, updateMeal, updateQuoteSettings,
  canCreateGuide, createGuide, guideForm, guideLanguage, guideShopping, openGuideCreateDialog, updateGuideType,
  validationIssues, isDownloadingPdf, canDownloadOriginal, downloadOriginal,
  submitItineraryPlan,
  clearHotelPlan, updateDayField, updateHotelPlanSelection, updateItemQuantity, updateQuoteOption,
  updateVehiclePlan, updateHotelCost, updateGuidePrice, passengerCount, resourceDestination,
} = useItineraryWorkspace({
  confirm: confirmAction,
  error: (key) => ElMessage.error(t(key)),
  success: (key) => ElMessage.success(t(key)),
  warning: (key, params) => ElMessage.warning(t(key, params)),
  translate: t,
});

watch(selectedItineraryId, () => { validationIssues.value = []; });
const dayCards = new Map<string, { expand: () => void }>();
function setDayCard(id: string, card: unknown) {
  if (card) dayCards.set(id, card as { expand: () => void });
  else dayCards.delete(id);
}
const isConfirmingAddDay = ref(false);
async function handleAddDay(afterIndex?: number) {
  const plan = selectedItinerary.value;
  if (!plan || !inquiry.value || !contentEditable.value || isSaving.value || isConfirmingAddDay.value) return;
  isConfirmingAddDay.value = true;
  try {
    if (plan.dailyPlans.length === inquiry.value.plannedDays
      && !await confirmAction("itinerary.confirmAddBeyondPlannedDays", { days: inquiry.value.plannedDays })) return;
    if (selectedItinerary.value !== plan || !contentEditable.value || isSaving.value) return;
    const position = afterIndex === undefined ? plan.dailyPlans.length : afterIndex + 1;
    addDay(afterIndex);
    await nextTick();
    const day = plan.dailyPlans[position];
    if (day) document.getElementById(`day-${day.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  } finally {
    isConfirmingAddDay.value = false;
  }
}
async function locateIssue(target: string) {
  if (target.startsWith("day-")) dayCards.get(target.slice(4))?.expand();
  if (target === "quote") {
    document.querySelector(".quote-panel__settings")?.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }
  isQuoteDrawerVisible.value = false;
  await nextTick();
  document.getElementById(target)?.scrollIntoView({ behavior: "smooth", block: "start" });
}
onMounted(loadDestinationResourceOptions);
</script>

<style scoped>
.itinerary-page__overview :deep(.el-card__body) { padding: 14px 18px 12px; }
</style>
