<template>
  <div class="quote-panel">
    <el-card
      class="quote-panel__card"
      shadow="never"
    >
      <template #header>
        <h3 class="quote-panel__section-title">
          {{ $t("itinerary.costBreakdown") }}
        </h3>
      </template>
      <div class="quote-panel__summary-row">
        <span>{{ $t("itinerary.baseGroupCost") }}</span>
        <strong>¥{{ formatMoney(calculation.baseGroupCost) }}</strong>
      </div>
      <div class="quote-panel__summary-row">
        <span>{{ $t("itinerary.baseCostPerPerson") }}</span>
        <strong>¥{{ formatMoney(calculation.baseCostPerPerson) }}</strong>
      </div>
      <div class="quote-panel__line">
        <span>{{ $t("itinerary.quoteLineTypes.single_supplement") }}</span>
        <strong>¥{{ formatMoney(calculation.singleSupplementUnitCost) }}</strong>
      </div>
      <div class="quote-panel__summary-row quote-panel__summary-row--subtotal">
        <span>{{ $t("itinerary.totalCost") }}</span>
        <strong>¥{{ formatMoney(totalCost) }}</strong>
      </div>
    </el-card>

    <el-card
      class="quote-panel__card"
      shadow="never"
    >
      <template #header>
        <h3 class="quote-panel__section-title">
          {{ $t("itinerary.customerQuoteLines") }}
        </h3>
      </template>
      <div class="quote-panel__adult-price">
        <span>{{ $t("itinerary.adultTourPricePerPerson") }}</span>
        <div class="quote-panel__price-editor">
          <span>¥</span>
          <el-input-number
            :model-value="calculation.adultUnitPrice"
            :disabled="!editable"
            :min="0"
            :precision="2"
            controls-position="right"
            @update:model-value="updateQuote('adultUnitPrice', $event)"
          />
        </div>
      </div>
      <div
        v-if="calculation.lines[1]?.quantity"
        class="quote-panel__child-cost"
      >
        <span>{{ $t("itinerary.childTourPrice") }}</span>
        <strong>¥{{ formatMoney(calculation.childUnitPrice) }}</strong>
      </div>
    </el-card>

    <el-card
      class="quote-panel__card"
      shadow="never"
    >
      <template #header>
        <h3 class="quote-panel__section-title">
          {{ $t("itinerary.quoteResult") }}
        </h3>
      </template>
      <div class="quote-panel__summary-row">
        <span>{{ $t("itinerary.profit") }}</span>
        <strong>¥{{ formatMoney(calculation.profit) }}</strong>
      </div>
      <div class="quote-panel__summary-row">
        <span>{{ $t("itinerary.actualMarginRate") }}</span>
        <strong>{{ calculation.actualMarginRate.toFixed(1) }}%</strong>
      </div>
      <div class="quote-panel__summary-row quote-panel__summary-row--total">
        <span>{{ $t("itinerary.totalPrice") }}</span>
        <strong>¥{{ formatMoney(calculation.totalPrice) }}</strong>
      </div>
    </el-card>

    <div class="quote-panel__meta">
      <span>{{ $t("itinerary.resourceItemCount", { count: itemCount }) }}</span>
      <span>{{ $t("itinerary.dayCount", { count: dayCount }) }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ItineraryQuoteCalculation, ItineraryQuoteSettings } from "@/types/itinerary";
import { formatMoney } from "@/utils";

type QuoteField = keyof ItineraryQuoteSettings;
defineProps<{
  quote: ItineraryQuoteSettings;
  calculation: ItineraryQuoteCalculation;
  totalCost: number;
  itemCount: number;
  dayCount: number;
  editable: boolean;
}>();
const emit = defineEmits<{ "update-quote": [field: QuoteField, value: number] }>();

function updateQuote(field: QuoteField, value: number | undefined) {
  emit("update-quote", field, Number(value ?? 0));
}
</script>

<style scoped lang="scss">
.quote-panel { display: grid; gap: 16px; }
.quote-panel__card { border-color: var(--el-border-color-lighter); }
.quote-panel__card :deep(.el-card__header) { padding: 13px 16px; }
.quote-panel__card :deep(.el-card__body) { padding: 12px 16px; }
.quote-panel__section-title { margin: 0; color: var(--el-text-color-primary); font-size: 15px; font-weight: 600; }
.quote-panel__summary-row { display: flex; align-items: center; justify-content: space-between; min-height: 36px; font-size: 14px; }
.quote-panel__summary-row strong { font-variant-numeric: tabular-nums; }
.quote-panel__child-cost { display: flex; align-items: center; justify-content: space-between; min-height: 36px; font-size: 14px; }
.quote-panel__child-cost strong { font-variant-numeric: tabular-nums; }
.quote-panel__summary-row--subtotal { min-height: 44px; margin-top: 8px; padding-top: 8px; border-top: 1px solid var(--el-border-color); font-size: 15px; }
.quote-panel__adult-price { display: grid; grid-template-columns: minmax(0, 1fr) 220px; align-items: center; gap: 20px; min-height: 52px; padding: 4px 0 12px; border-bottom: 1px solid var(--el-border-color-lighter); font-size: 14px; }
.quote-panel__price-editor { display: flex; align-items: center; gap: 8px; color: var(--el-text-color-regular); }
.quote-panel__price-editor :deep(.el-input-number) { width: 100%; }
.quote-panel__price-editor :deep(.el-input__inner) { font-weight: 600; }
.quote-panel__line { display: grid; grid-template-columns: minmax(0, 1fr) 130px; align-items: center; gap: 12px; min-height: 38px; padding: 6px 0; color: var(--el-text-color-regular); font-size: 13px; text-align: right; }
.quote-panel__line span:first-child { overflow: hidden; text-align: left; text-overflow: ellipsis; white-space: nowrap; }
.quote-panel__line strong { color: var(--el-text-color-primary); font-variant-numeric: tabular-nums; }
.quote-panel__summary-row--total { min-height: 50px; margin-top: 10px; padding-top: 10px; border-top: 2px solid var(--el-border-color); font-size: 16px; }
.quote-panel__summary-row--total strong { color: var(--el-color-primary); font-size: 21px; }
.quote-panel__meta { display: flex; justify-content: flex-end; gap: 24px; color: var(--el-text-color-secondary); font-size: 12px; }
</style>
