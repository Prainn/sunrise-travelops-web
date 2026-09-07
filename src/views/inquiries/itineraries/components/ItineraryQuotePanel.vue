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
        <span>{{ $t("itinerary.dailyMealAttractionCost") }}</span>
        <strong>¥{{ formatMoney(calculation.dailyResourceCost) }}</strong>
      </div>
      <div class="quote-panel__summary-row">
        <span>{{ $t("itinerary.hotelRoomCount") }}</span>
        <strong>{{ calculation.hotelRoomCount }}</strong>
      </div>
    </el-card>

    <el-card
      class="quote-panel__card"
      shadow="never"
    >
      <template #header>
        <h3 class="quote-panel__section-title">
          {{ $t("itinerary.quoteConfigurations") }}
        </h3>
      </template>

      <el-empty
        v-if="!displayOptions.length"
        :description="$t('itinerary.configureQuotePlansFirst')"
        :image-size="64"
      />
      <el-collapse
        v-else
        v-model="expandedHotelTiers"
        class="quote-panel__options"
      >
        <el-collapse-item
          v-for="group in displayGroups"
          :key="group.hotelTier"
          :name="group.hotelTier"
        >
          <template #title>
            <strong class="quote-panel__tier-title">
              {{ $t(`itinerary.hotelTiers.${group.hotelTier}`) }}
            </strong>
          </template>

          <div class="quote-panel__tier-options">
            <section
              v-for="item in group.items"
              :key="item.option.id"
              class="quote-panel__option"
            >
              <header class="quote-panel__option-header">
                <el-tag effect="plain">
                  {{ $t(`itinerary.vehicleServiceLevels.${item.option.vehicleTier}`) }}
                </el-tag>
              </header>

              <div class="quote-panel__cost-grid">
                <div>
                  <span>{{ $t("itinerary.hotelCost") }}</span>
                  <strong>¥{{ formatMoney(item.calculation.hotelCost) }}</strong>
                </div>
                <div>
                  <span>{{ $t("itinerary.destinationVehicleCost") }}</span>
                  <strong>¥{{ formatMoney(item.calculation.vehicleCost) }}</strong>
                </div>
                <div>
                  <span>{{ $t("itinerary.baseGroupCost") }}</span>
                  <strong>¥{{ formatMoney(item.calculation.baseGroupCost) }}</strong>
                </div>
                <div>
                  <span>{{ $t("itinerary.baseCostPerPerson") }}</span>
                  <strong>¥{{ formatMoney(item.calculation.baseCostPerPerson) }}</strong>
                </div>
                <div>
                  <span>{{ $t("itinerary.quoteLineTypes.single_supplement") }}</span>
                  <strong>¥{{ formatMoney(item.calculation.singleSupplementUnitCost) }}</strong>
                </div>
              </div>

              <div class="quote-panel__adult-price">
                <span>{{ $t("itinerary.adultTourPricePerPerson") }}</span>
                <div class="quote-panel__price-editor">
                  <span>¥</span>
                  <el-input-number
                    :model-value="item.calculation.adultUnitPrice"
                    :disabled="!editable"
                    :min="0"
                    :precision="2"
                    controls-position="right"
                    @update:model-value="updateAdultPrice(item.option.id, $event)"
                  />
                </div>
              </div>
              <div
                v-if="item.calculation.lines[1]?.quantity"
                class="quote-panel__line"
              >
                <span>{{ $t("itinerary.childTourPrice") }}</span>
                <strong>¥{{ formatMoney(item.calculation.childUnitPrice) }}</strong>
              </div>

              <div class="quote-panel__foc-row">
                <span>{{ $t("itinerary.leaderFoc") }}</span>
                <el-switch
                  :model-value="item.option.leaderFocEnabled"
                  :disabled="!editable"
                  @update:model-value="updateLeaderFoc(item.option.id, $event)"
                />
              </div>
              <el-tag
                class="quote-panel__foc-tag"
                :type="item.option.leaderFocEnabled ? 'success' : 'info'"
                effect="plain"
              >
                {{ getFocLabel(item.option.leaderFocEnabled) }}
              </el-tag>

              <div class="quote-panel__option-result">
                <div>
                  <span>{{ $t("itinerary.profit") }}</span>
                  <strong>¥{{ formatMoney(item.calculation.profit) }}</strong>
                </div>
                <div>
                  <span>{{ $t("itinerary.actualMarginRate") }}</span>
                  <strong>{{ item.calculation.actualMarginRate.toFixed(1) }}%</strong>
                </div>
                <div class="quote-panel__option-total">
                  <span>{{ $t("itinerary.totalPrice") }}</span>
                  <strong>¥{{ formatMoney(item.calculation.totalPrice) }}</strong>
                </div>
              </div>
            </section>
          </div>
        </el-collapse-item>
      </el-collapse>
    </el-card>

    <div class="quote-panel__meta">
      <span>{{ $t("itinerary.resourceItemCount", { count: itemCount }) }}</span>
      <span>{{ $t("itinerary.dayCount", { count: dayCount }) }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import type { ItineraryHotelTier, ItineraryQuoteCalculation, ItineraryQuoteOption, ItineraryQuoteSettings } from "@/types/itinerary";
import { formatMoney } from "@/utils";
import { HOTEL_PLAN_TIERS } from "../hotel-plans";

const props = defineProps<{
  quote: ItineraryQuoteSettings;
  calculation: ItineraryQuoteCalculation;
  itemCount: number;
  dayCount: number;
  guestCount: number;
  editable: boolean;
}>();
const emit = defineEmits<{
  "update-quote-option": [optionId: string, changes: Partial<Omit<ItineraryQuoteOption, "id">>];
}>();
const { t } = useI18n();
const expandedHotelTiers = ref<ItineraryHotelTier[]>([...HOTEL_PLAN_TIERS]);
const displayOptions = computed(() => props.quote.options.flatMap((option) => {
  const calculation = props.calculation.options.find((record) => record.optionId === option.id);
  return calculation ? [{ option, calculation }] : [];
}));
const displayGroups = computed(() => HOTEL_PLAN_TIERS.map((hotelTier) => ({
  hotelTier,
  items: displayOptions.value.filter((item) => item.option.hotelTier === hotelTier),
})).filter((group) => group.items.length));

function getFocLabel(enabled: boolean) {
  return enabled
    ? t("itinerary.leaderFocEnabledLabel", { count: props.guestCount })
    : t("itinerary.noFoc");
}

function updateAdultPrice(optionId: string, value: number | undefined) {
  emit("update-quote-option", optionId, { adultUnitPrice: Number(value ?? 0) });
}

function updateLeaderFoc(optionId: string, value: string | number | boolean) {
  emit("update-quote-option", optionId, { leaderFocEnabled: Boolean(value) });
}
</script>

<style scoped lang="scss">
.quote-panel { display: grid; gap: 16px; }
.quote-panel__card { border-color: var(--el-border-color-lighter); }
.quote-panel__card :deep(.el-card__header) { padding: 13px 16px; }
.quote-panel__card :deep(.el-card__body) { padding: 12px 16px; }
.quote-panel__section-title { margin: 0; color: var(--el-text-color-primary); font-size: 16px; font-weight: 600; }
.quote-panel__summary-row { display: flex; align-items: center; justify-content: space-between; min-height: 36px; font-size: 14px; }
.quote-panel__summary-row strong { font-variant-numeric: tabular-nums; }
.quote-panel__options { border-block: 0; }
.quote-panel__options :deep(.el-collapse-item__header) { font-size: 16px; }
.quote-panel__options :deep(.el-collapse-item__content) { padding-bottom: 16px; }
.quote-panel__tier-title { color: var(--el-text-color-primary); }
.quote-panel__tier-options { display: grid; gap: 16px; }
.quote-panel__option { padding: 16px; border: 1px solid var(--el-border-color-light); border-radius: 8px; }
.quote-panel__option-header { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; }
.quote-panel__cost-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; padding: 12px; border-radius: 6px; background: var(--el-fill-color-light); }
.quote-panel__cost-grid div { display: grid; gap: 4px; }
.quote-panel__cost-grid span { color: var(--el-text-color-secondary); font-size: 14px; }
.quote-panel__cost-grid strong { font-variant-numeric: tabular-nums; }
.quote-panel__adult-price { display: grid; grid-template-columns: minmax(0, 1fr) 220px; align-items: center; gap: 20px; min-height: 52px; padding: 12px 0; border-bottom: 1px solid var(--el-border-color-lighter); font-size: 14px; }
.quote-panel__price-editor { display: flex; align-items: center; gap: 8px; color: var(--el-text-color-regular); }
.quote-panel__price-editor :deep(.el-input-number) { width: 100%; }
.quote-panel__price-editor :deep(.el-input__inner) { font-weight: 600; }
.quote-panel__line { display: grid; grid-template-columns: minmax(0, 1fr) 130px; align-items: center; gap: 12px; min-height: 38px; padding: 6px 0; color: var(--el-text-color-regular); font-size: 14px; text-align: right; }
.quote-panel__line span:first-child { overflow: hidden; text-align: left; text-overflow: ellipsis; white-space: nowrap; }
.quote-panel__line strong { color: var(--el-text-color-primary); font-variant-numeric: tabular-nums; }
.quote-panel__foc-row { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding-top: 12px; }
.quote-panel__foc-tag { margin-top: 10px; }
.quote-panel__option-result { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-top: 14px; padding-top: 14px; border-top: 1px solid var(--el-border-color-lighter); }
.quote-panel__option-result div { display: grid; gap: 5px; }
.quote-panel__option-result span { color: var(--el-text-color-secondary); font-size: 14px; }
.quote-panel__option-result strong { font-variant-numeric: tabular-nums; }
.quote-panel__option-total strong { color: var(--el-color-primary); font-size: 18px; }
.quote-panel__meta { display: flex; justify-content: flex-end; gap: 24px; color: var(--el-text-color-secondary); font-size: 14px; }
@media (width <= 720px) {
  .quote-panel__adult-price, .quote-panel__option-result, .quote-panel__cost-grid { grid-template-columns: 1fr; }
}
</style>
