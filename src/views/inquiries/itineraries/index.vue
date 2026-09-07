<template>
  <div class="page-container itinerary-page">
    <template v-if="inquiry">
      <header class="itinerary-page__sticky-header">
        <el-card
          class="itinerary-page__overview rounded-0! border-0!"
          shadow="never"
        >
          <el-page-header @back="router.back()">
            <template #content>
              <span class="itinerary-page__title">{{ $t("inquiry.itineraryManagement") }}</span>
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
            class="itinerary-page__plan-bar"
          >
            <el-select
              v-model="selectedItineraryId"
              class="itinerary-page__plan-select"
            >
              <el-option
                v-for="row in rows"
                :key="row.id"
                :label="`${row.title} · ${row.updatedAt || row.createdAt}`"
                :value="row.id"
              />
            </el-select>
            <div class="itinerary-page__plan-summary">
              <h2>{{ selectedItinerary.title }}</h2>
              <p>
                {{ selectedItinerary.startDate }} — {{ selectedItinerary.endDate }} ·
                {{ $t("itinerary.guestCount") }} {{ guestCount }}
              </p>
            </div>

            <div class="itinerary-page__plan-controls">
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
                {{ $t("itinerary.copyAsDraft") }}
              </el-button>
            </div>
          </div>
          <div class="itinerary-page__inquiry-summary">
            <span><small>{{ $t("inquiry.code") }}</small>{{ inquiry.code }}</span>
            <span><small>{{ $t("inquiry.agencyName") }}</small>{{ inquiry.agencyName }}</span>
            <span><small>{{ $t("inquiry.contactName") }}</small>{{ inquiry.contactName }}</span>
            <span><small>{{ $t("inquiry.plannedDays") }}</small>{{ inquiry.plannedDays }}</span>
            <span class="itinerary-page__message"><small>{{ $t("inquiry.originalMessage") }}</small>{{ inquiry.originalMessage }}</span>
          </div>
        </el-card>
      </header>

      <template v-if="selectedItinerary">
        <main class="itinerary-page__workspace mx-4">
          <ItineraryHotelVehiclePlans
            :destinations="selectedItinerary.destinations"
            :hotel-plans="selectedItinerary.hotelPlans"
            :vehicle-plans="selectedItinerary.vehiclePlans"
            :hotels="hotelOptions"
            :vehicles="vehicleOptions"
            :guest-count="guestCount"
            :editable="contentEditable"
            @clear-hotel-plan="clearHotelPlan"
            @update-hotel-selection="updateHotelPlanSelection"
            @update-vehicle="updateVehiclePlanSelection"
            @update-vehicle-days="updateVehiclePlanServiceDays"
            @update-vehicle-cost="updateVehiclePlanUnitCost"
          />
          <div class="itinerary-page__daily-toolbar h-12">
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
            :destinations="selectedItinerary.destinations"
            :content-editable="contentEditable"
            :is-first="index === 0"
            :is-last="index === selectedItinerary.dailyPlans.length - 1"
            @update-field="(field, value) => updateDayField(index, field, value)"
            @add-item="openResourceDialog(day.id)"
            @remove-item="removeItem(day.id, $event)"
            @update-item-quantity="(itemIndex, quantity) => updateItemQuantity(day.id, itemIndex, quantity)"
            @duplicate="duplicateDay(index)"
            @remove="removeDay(index)"
            @move="moveDay(index, $event)"
          />
        </main>

        <footer class="itinerary-page__sticky-footer border-0! rounded-0!">
          <div class="itinerary-page__footer-summary">
            {{ $t("itinerary.dayCount", { count: selectedItinerary.dailyPlans.length }) }} ·
            {{ $t("itinerary.resourceItemCount", { count: itemCount }) }}
          </div>
          <div class="itinerary-page__footer-actions">
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
        :options="resourcePriceOptions"
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
        size="760px"
      >
        <ItineraryQuotePanel
          v-if="selectedItinerary && quoteCalculation"
          :quote="selectedItinerary.quote"
          :calculation="quoteCalculation"
          :item-count="itemCount"
          :day-count="selectedItinerary.dailyPlans.length"
          :guest-count="guestCount"
          :editable="priceEditable"
          @update-quote-option="updateQuoteOption"
        />
        <template #footer>
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
      v-else
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
import { onMounted, ref } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { useI18n } from "vue-i18n";
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
  addDay, addResourceItem, canCreateItinerary, canEditItineraryBasics, canGeneratePdf, canSaveItinerary, contentEditable, copyItinerary,
  closePdfPreview, confirmPdfDownload, destinationOptions, duplicateDay, guestCount, handleGeneratePdf, hotelOptions, inquiry, isGeneratingPdf,
  isEditingPlan, isPdfPreviewVisible, isPlanDialogVisible, isResourceDialogVisible,
  isDraft, itemCount, itineraryForm, loadDestinationResourceOptions, moveDay, openCreateDialog, openResourceDialog, priceEditable, quoteCalculation,
  openEditDialog, pdfPreviewUrl, removeDay, removeItem, router, rows, saveItinerary, selectedItinerary, selectedItineraryId,
  resourcePriceOptions, vehicleOptions,
  submitItineraryPlan,
  clearHotelPlan, updateDayField, updateHotelPlanSelection, updateItemQuantity, updateQuoteOption,
  updateVehiclePlanSelection, updateVehiclePlanServiceDays, updateVehiclePlanUnitCost,
} = useItineraryWorkspace({
  confirm: confirmAction,
  error: (key) => ElMessage.error(t(key)),
  success: (key) => ElMessage.success(t(key)),
  warning: (key, params) => ElMessage.warning(t(key, params)),
  translate: t,
});

onMounted(loadDestinationResourceOptions);
</script>

<style scoped lang="scss">
.itinerary-page { height: auto; min-height: 100%; overflow: visible; padding: 0; }
.itinerary-page__sticky-header { position: sticky; z-index: 10; top: 0; background: var(--page-bg); box-shadow: var(--el-box-shadow-light); }
.itinerary-page__overview :deep(.el-card__body) { padding: 14px 18px 12px; }
.itinerary-page__title { color: var(--el-text-color-primary); font-size: 18px; font-weight: 600; }
.itinerary-page__plan-bar { display: grid; grid-template-columns: 360px minmax(0, 1fr) auto; align-items: center; gap: 18px; margin-top: 12px; padding: 12px 0; border-top: 1px solid var(--el-border-color-lighter); border-bottom: 1px solid var(--el-border-color-lighter); }
.itinerary-page__plan-summary { min-width: 0; }
.itinerary-page__plan-summary h2 { overflow: hidden; margin: 0; font-size: 18px; text-overflow: ellipsis; white-space: nowrap; }
.itinerary-page__plan-summary p { margin: 3px 0 0; color: var(--el-text-color-secondary); font-size: 14px; }
.itinerary-page__inquiry-summary { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); align-items: center; gap: 18px; margin-top: 10px; font-size: 14px; }
.itinerary-page__inquiry-summary span { display: flex; min-width: 0; gap: 6px; }
.itinerary-page__inquiry-summary small { flex: none; color: var(--el-text-color-secondary); }
.itinerary-page__message { grid-column: 1 / -1; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.itinerary-page__plan-select { width: 100%; }
.itinerary-page__plan-controls { display: flex; align-items: center; gap: 10px; }
.itinerary-page__daily-toolbar h3 { margin: 0; }
.itinerary-page__daily-toolbar { display: flex; justify-content: space-between; align-items: center; margin: 2px 0 14px; }
.itinerary-page__sticky-footer { position: sticky; z-index: 10; bottom: 0; display: flex; justify-content: space-between; align-items: center; min-height: 64px; padding: 12px 18px; background: var(--el-bg-color); box-shadow: var(--el-box-shadow-light); }
.itinerary-page__footer-summary { color: var(--el-text-color-secondary); font-size: 14px; }
.itinerary-page__footer-actions { display: flex; gap: 12px; }
@media (width <= 1100px) {
  .itinerary-page__plan-bar { grid-template-columns: minmax(260px, 1fr) auto; }
  .itinerary-page__plan-summary { display: none; }
}
</style>
