<template>
  <div class="page-container itinerary-page">
    <template v-if="inquiry">
      <header class="itinerary-page__sticky-header">
        <el-card
          class="itinerary-page__context"
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
          <div class="itinerary-page__inquiry-summary">
            <span><small>{{ $t("inquiry.code") }}</small>{{ inquiry.code }}</span>
            <span><small>{{ $t("inquiry.agencyName") }}</small>{{ inquiry.agencyName }}</span>
            <span><small>{{ $t("inquiry.contactName") }}</small>{{ inquiry.contactName }}</span>
            <span><small>{{ $t("inquiry.plannedDays") }}</small>{{ inquiry.plannedDays }}</span>
            <span class="itinerary-page__message"><small>{{ $t("inquiry.originalMessage") }}</small>{{ inquiry.originalMessage }}</span>
          </div>
        </el-card>

        <el-card
          v-if="selectedItinerary"
          class="itinerary-page__plan-header"
          shadow="never"
        >
          <div class="itinerary-page__plan-main">
            <el-select
              v-model="selectedItineraryId"
              class="itinerary-page__plan-select"
            >
              <el-option
                v-for="row in rows"
                :key="row.id"
                :label="`${row.title} · ${$t(`itinerary.statuses.${row.status}`)} · ${row.updatedAt || row.createdAt}`"
                :value="row.id"
              />
            </el-select>
            <div>
              <h2>{{ selectedItinerary.title }}</h2>
              <p>
                {{ selectedItinerary.startDate }} — {{ selectedItinerary.endDate }} ·
                {{ $t("itinerary.guestCount") }} {{ guestCount }}
              </p>
            </div>
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
        </el-card>
      </header>

      <template v-if="selectedItinerary">
        <main class="itinerary-page__workspace">
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
            :content-editable="contentEditable"
            :is-first="index === 0"
            :is-last="index === selectedItinerary.dailyPlans.length - 1"
            @update-field="(field, value) => updateDayField(index, field, value)"
            @add-item="openResourceDialog(day.id)"
            @remove-item="removeItem(day.id, $event)"
            @update-item-quantity="(itemIndex, quantity) => updateItemQuantity(day.id, itemIndex, quantity)"
            @update-item-unit-cost="(itemIndex, unitCost) => updateItemUnitCost(day.id, itemIndex, unitCost)"
            @duplicate="duplicateDay(index)"
            @remove="removeDay(index)"
            @move="moveDay(index, $event)"
          />
        </main>

        <footer class="itinerary-page__sticky-footer">
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
        :is-editing="isEditingPlan"
        @submit="submitItineraryPlan"
      />
      <ItineraryResourceDialog
        v-model="isResourceDialogVisible"
        :guest-count="guestCount"
        :hotel-room-count="hotelRoomCount"
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
          :total-cost="totalCost"
          :item-count="itemCount"
          :day-count="selectedItinerary.dailyPlans.length"
          :editable="priceEditable"
          @update-quote="updateQuote"
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
import { ref } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { useI18n } from "vue-i18n";
import ItineraryDayCard from "./components/ItineraryDayCard.vue";
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
  closePdfPreview, confirmPdfDownload, duplicateDay, guestCount, handleGeneratePdf, hotelRoomCount, inquiry, isGeneratingPdf,
  isEditingPlan, isPdfPreviewVisible, isPlanDialogVisible, isResourceDialogVisible,
  isDraft, itemCount, itineraryForm, moveDay, openCreateDialog, openResourceDialog, priceEditable, quoteCalculation,
  openEditDialog, pdfPreviewUrl, removeDay, removeItem, router, rows, saveItinerary, selectedItinerary, selectedItineraryId,
  submitItineraryPlan, totalCost,
  updateDayField, updateItemQuantity, updateItemUnitCost, updateQuote,
} = useItineraryWorkspace({
  confirm: confirmAction,
  error: (key) => ElMessage.error(t(key)),
  success: (key) => ElMessage.success(t(key)),
  warning: (key, params) => ElMessage.warning(t(key, params)),
  translate: t,
});
</script>

<style scoped lang="scss">
.itinerary-page { height: auto; min-height: 100%; overflow: visible; }
.itinerary-page__sticky-header { position: sticky; z-index: 10; top: 0; display: grid; gap: var(--page-gap); padding-bottom: var(--page-gap); background: var(--page-bg); }
.itinerary-page__title { color: var(--el-text-color-primary); font-size: 18px; font-weight: 600; }
.itinerary-page__inquiry-summary { display: grid; grid-template-columns: 150px 200px 130px 90px 1fr; gap: 20px; margin-top: 18px; }
.itinerary-page__inquiry-summary span { display: flex; flex-direction: column; min-width: 0; }
.itinerary-page__inquiry-summary small { margin-bottom: 4px; color: var(--el-text-color-secondary); }
.itinerary-page__message { overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.itinerary-page__plan-header :deep(.el-card__body), .itinerary-page__plan-main, .itinerary-page__plan-controls { display: flex; align-items: center; }
.itinerary-page__plan-header :deep(.el-card__body) { justify-content: space-between; gap: 20px; }
.itinerary-page__plan-main { gap: 18px; min-width: 0; }
.itinerary-page__plan-main h2, .itinerary-page__daily-toolbar h3 { margin: 0; }
.itinerary-page__plan-main p { margin: 5px 0 0; color: var(--el-text-color-secondary); }
.itinerary-page__plan-select { width: 420px; }
.itinerary-page__plan-controls { gap: 16px; }
.itinerary-page__daily-toolbar { display: flex; justify-content: space-between; align-items: center; margin: 2px 0 14px; }
.itinerary-page__sticky-footer { position: sticky; z-index: 10; bottom: 0; display: flex; justify-content: space-between; align-items: center; min-height: 64px; padding: 12px 18px; border: 1px solid var(--el-border-color-light); border-radius: 8px 8px 0 0; background: var(--el-bg-color); box-shadow: var(--el-box-shadow-light); }
.itinerary-page__footer-summary { color: var(--el-text-color-secondary); font-size: 13px; }
.itinerary-page__footer-actions { display: flex; gap: 12px; }
@media (width <= 1100px) { .itinerary-page__inquiry-summary { grid-template-columns: repeat(2, 1fr); } }
</style>
