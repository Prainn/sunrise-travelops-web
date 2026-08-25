<template>
  <div class="page-container itinerary-page">
    <template v-if="inquiry">
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

      <template v-if="selectedItinerary">
        <el-card
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
                :label="`${row.code}｜${row.title}`"
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
              v-if="isDraft && canGeneratePdf"
              type="primary"
              :loading="isGeneratingPdf"
              @click="handleGeneratePdf"
            >
              {{ $t("itinerary.generatePdf") }}
            </el-button>
            <el-button
              v-if="!isDraft && canCreateItinerary"
              @click="copyItinerary"
            >
              {{ $t("itinerary.copyAsDraft") }}
            </el-button>
          </div>
        </el-card>

        <div class="itinerary-page__workspace">
          <main>
            <div class="itinerary-page__daily-toolbar">
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
              :price-editable="priceEditable"
              :is-first="index === 0"
              :is-last="index === selectedItinerary.dailyPlans.length - 1"
              @update-field="(field, value) => updateDayField(index, field, value)"
              @add-item="openResourceDialog(day.id)"
              @remove-item="removeItem(day.id, $event)"
              @update-item-quantity="(itemIndex, quantity) => updateItemQuantity(day.id, itemIndex, quantity)"
              @update-item-price="(itemIndex, price) => updateItemPrice(day.id, itemIndex, price)"
              @duplicate="duplicateDay(index)"
              @remove="removeDay(index)"
              @move="moveDay(index, $event)"
            />
          </main>
          <aside>
            <ItineraryPriceSummary
              :total-cost="totalCost"
              :total-price="totalPrice"
              :guest-count="guestCount"
              :item-count="itemCount"
              :day-count="selectedItinerary.dailyPlans.length"
              :missing-price-count="missingPriceCount"
            />
          </aside>
        </div>
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
        @submit="createItinerary"
      />
      <ItineraryResourceDialog
        v-model="isResourceDialogVisible"
        :guest-count="guestCount"
        @submit="addResourceItem"
      />
      <ItineraryPdfPreviewDialog
        v-model="isPdfPreviewVisible"
        :src="pdfPreviewUrl"
        @confirm="confirmPdfDownload"
        @closed="closePdfPreview"
      />
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
import ItineraryDayCard from "./components/ItineraryDayCard.vue";
import ItineraryPdfPreviewDialog from "./components/ItineraryPdfPreviewDialog.vue";
import ItineraryPlanDialog from "./components/ItineraryPlanDialog.vue";
import ItineraryPriceSummary from "./components/ItineraryPriceSummary.vue";
import ItineraryResourceDialog from "./components/ItineraryResourceDialog.vue";
import { ITINERARY_STATUS_TAG_TYPES } from "./options";
import { useItineraryWorkspace } from "./useItineraryWorkspace";

defineOptions({ name: "InquiryItineraries" });
const {
  addDay, addResourceItem, canCreateItinerary, canGeneratePdf, contentEditable, copyItinerary, createItinerary,
  closePdfPreview, confirmPdfDownload, duplicateDay, guestCount, handleGeneratePdf, inquiry, isGeneratingPdf,
  isPdfPreviewVisible, isPlanDialogVisible, isResourceDialogVisible,
  isDraft, itemCount, itineraryForm, missingPriceCount, moveDay, openCreateDialog, openResourceDialog, priceEditable,
  pdfPreviewUrl, removeDay, removeItem, router, rows, selectedItinerary, selectedItineraryId, totalCost, totalPrice,
  updateDayField, updateItemPrice, updateItemQuantity,
} = useItineraryWorkspace();
</script>

<style scoped lang="scss">
.itinerary-page { overflow: visible; }
.itinerary-page__context, .itinerary-page__plan-header { flex: none; }
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
.itinerary-page__plan-select { width: 280px; }
.itinerary-page__plan-controls { gap: 16px; }
.itinerary-page__workspace { display: grid; grid-template-columns: minmax(0, 1fr) 280px; align-items: start; gap: 16px; }
.itinerary-page__daily-toolbar { display: flex; justify-content: space-between; align-items: center; margin: 2px 0 14px; }
@media (width <= 1100px) { .itinerary-page__workspace { grid-template-columns: 1fr; } .itinerary-page__inquiry-summary { grid-template-columns: repeat(2, 1fr); } }
</style>
