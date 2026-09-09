<template>
  <div
    v-loading="isLoading || isSaving"
    class="page-container itinerary-page"
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
                class="itinerary-page__plan-select"
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
            class="itinerary-page__plan-bar grid [grid-template-columns:360px_minmax(0,_1fr)_auto] items-center gap-[18px] mt-[12px] p-[12px_0] [border-top:1px_solid_var(--el-border-color-lighter)] [border-bottom:1px_solid_var(--el-border-color-lighter)]"
          >
            <div class="itinerary-page__plan-summary min-w-0">
              <h2>{{ selectedItinerary.title }}</h2>
              <p>
                {{ selectedItinerary.startDate }} — {{ selectedItinerary.endDate }} ·
                {{ $t("itinerary.guestCount") }} {{ guestCount }}
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
            <span><small>{{ $t("inquiry.code") }}</small>{{ inquiry.code }}</span>
            <span><small>{{ $t("inquiry.agencyName") }}</small>{{ inquiry.agencyName }}</span>
            <span><small>{{ $t("inquiry.contactName") }}</small>{{ inquiry.contactName }}</span>
            <span><small>{{ $t("inquiry.plannedDays") }}</small>{{ $t("itinerary.duration", plannedDuration(inquiry.plannedDays)) }}</span>
            <span
              class="itinerary-page__message [grid-column:1_/_-1] overflow-hidden whitespace-nowrap text-ellipsis"
              :title="inquiry.originalMessage"
            ><small>{{ $t("inquiry.originalMessage") }}</small>{{ inquiry.originalMessage }}</span>
          </div>
        </el-card>
      </header>

      <template v-if="selectedItinerary">
        <main class="itinerary-page__workspace mx-4">
          <ItineraryHotelVehiclePlans
            :destinations="selectedItinerary.destinations"
            :daily-plans="selectedItinerary.dailyPlans"
            :hotel-plans="selectedItinerary.hotelPlans"
            :vehicle-plans="selectedItinerary.vehiclePlans"
            :guest-count="guestCount"
            :editable="contentEditable"
            @clear-hotel-plan="clearHotelPlan"
            @update-hotel-selection="updateHotelPlanSelection"
            @update-vehicle="updateVehiclePlanSelection"
            @update-vehicle-days="updateVehiclePlanServiceDays"
            @update-vehicle-cost="updateVehiclePlanUnitCost"
          />
          <ItineraryGuidePlans
            :destinations="selectedItinerary.destinations"
            :plans="selectedItinerary.guidePlans"
            :daily-plans="selectedItinerary.dailyPlans"
            :editable="contentEditable"
            @update-guide="updateGuideSelection"
            @update-days="updateGuideDays"
          />
          <div class="itinerary-page__daily-toolbar h-12 flex justify-between items-center min-h-[48px] m-[24px_0_14px]">
            <div>
              <h3>{{ $t("itinerary.dailySchedule") }}</h3>
            </div>
            <el-button
              v-if="contentEditable"
              type="primary"
              plain
              @click="addDay"
            >
              {{ $t("itinerary.addDay") }}
            </el-button>
          </div>
          <ItineraryDayCard
            v-for="(day, index) in selectedItinerary.dailyPlans"
            :key="day.id"
            :day="day"
            :breakfast-status="getDayBreakfastStatus(selectedItinerary, index)"
            :destinations="selectedItinerary.destinations"
            :content-editable="contentEditable"
            :is-first="index === 0"
            :is-last="index === selectedItinerary.dailyPlans.length - 1"
            @update-field="(field, value) => updateDayField(index, field, value)"
            @add-item="openResourceDialog(day.id)"
            @update-meal="(slot, included) => updateMeal(index, slot, included)"
            @select-meal="openResourceDialog(day.id, $event)"
            @remove-item="removeItem(day.id, $event)"
            @update-item-quantity="(itemIndex, quantity) => updateItemQuantity(day.id, itemIndex, quantity)"
            @duplicate="duplicateDay(index)"
            @remove="removeDay(index)"
            @move="moveDay(index, $event)"
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
      <ItineraryResourceDialog
        v-model="isResourceDialogVisible"
        :guest-count="guestCount"
        :meal-slot="resourceMealSlot"
        @submit="addResourceItem"
      />
      <ItineraryPdfPreviewDialog
        v-model="isPdfPreviewVisible"
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
          <h3>{{ $t('itinerary.validation.title') }}</h3>
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
          :quote="selectedItinerary.quote"
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
import ItineraryDayCard from "./components/ItineraryDayCard.vue";
import ItineraryHotelVehiclePlans from "./components/ItineraryHotelVehiclePlans.vue";
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
  isDraft, itemCount, itineraryForm, loadDestinationResourceOptions, moveDay, openCreateDialog, openResourceDialog, priceEditable, quoteCalculation,
  openEditDialog, pdfPreviewUrl, removeDay, removeItem, router, rows, saveItinerary, selectedItinerary, selectedItineraryId,
  resourceMealSlot, updateMeal, updateQuoteSettings,
  validationIssues, canDownloadOriginal, downloadOriginal,
  submitItineraryPlan,
  updateGuideSelection, updateGuideDays, clearHotelPlan, updateDayField, updateHotelPlanSelection, updateItemQuantity, updateQuoteOption,
  updateVehiclePlanSelection, updateVehiclePlanServiceDays, updateVehiclePlanUnitCost,
} = useItineraryWorkspace({
  confirm: confirmAction,
  error: (key) => ElMessage.error(t(key)),
  success: (key) => ElMessage.success(t(key)),
  warning: (key, params) => ElMessage.warning(t(key, params)),
  translate: t,
});

watch(selectedItineraryId, () => { validationIssues.value = []; });
async function locateIssue(target: string) {
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

<style scoped lang="scss">
.itinerary-page__validation h3 { margin: 0; font-size: 18px; }
.itinerary-page { @apply 'h-auto min-h-full overflow-visible p-0'; }

.itinerary-page__overview :deep(.el-card__body) { padding: 14px 18px 12px; }
.itinerary-page__title { @apply 'text-[var(--el-text-color-primary)] text-[18px] font-semibold'; }

.itinerary-page__plan-summary h2 { overflow: hidden; margin: 0; font-size: 18px; text-overflow: ellipsis; white-space: nowrap; }
.itinerary-page__plan-summary p { margin: 3px 0 0; color: var(--el-text-color-secondary); font-size: 14px; }

.itinerary-page__inquiry-summary span { display: flex; min-width: 0; gap: 6px; }
.itinerary-page__inquiry-summary small { flex: none; color: var(--el-text-color-secondary); }

.itinerary-page__plan-select { @apply 'w-[min(420px,_55vw)]'; }

.itinerary-page__daily-toolbar h3 { margin: 0; }

@media (width <= 1100px) {
  .itinerary-page__plan-bar { @apply '[grid-template-columns:minmax(260px,_1fr)_auto]'; }
  .itinerary-page__plan-summary { @apply 'hidden'; }
}
</style>
