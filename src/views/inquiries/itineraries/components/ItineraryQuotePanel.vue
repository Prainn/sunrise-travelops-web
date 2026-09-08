<template>
  <div class="quote-panel">
    <div class="quote-panel__summary">
      <span>{{ $t('itinerary.dailyMealAttractionCost') }} <strong>¥{{ formatMoney(calculation.dailyResourceCost) }}</strong></span>
      <span>{{ $t('itinerary.hotelRoomCount') }} <strong>{{ calculation.hotelRoomCount }}</strong></span>
      <span>{{ $t('itinerary.guideCost') }} <strong>¥{{ formatMoney(calculation.guideCost) }}</strong></span>
    </div>
    <el-empty
      v-if="!displayOptions.length"
      :description="$t('itinerary.configureQuotePlansFirst')"
      :image-size="64"
    />
    <div
      v-else
      class="quote-panel__comparison"
    >
      <table>
        <thead>
          <tr>
            <th>{{ $t('itinerary.quoteConfigurations') }}</th>
            <th
              v-for="item in displayOptions"
              :key="item.option.id"
            >
              {{ $t(`itinerary.hotelTiers.${item.option.hotelTier}`) }}<br>
              {{ $t(`itinerary.vehicleServiceLevels.${item.option.vehicleTier}`) }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="metric in costMetrics"
            :key="metric.field"
          >
            <th>{{ $t(metric.label) }}</th>
            <td
              v-for="item in displayOptions"
              :key="item.option.id"
            >
              ¥{{ formatMoney(item.calculation[metric.field]) }}
            </td>
          </tr>
          <tr>
            <th>{{ $t('itinerary.adultTourPricePerPerson') }}</th>
            <td
              v-for="item in displayOptions"
              :key="item.option.id"
            >
              <el-input-number
                :model-value="item.calculation.adultUnitPrice"
                :disabled="!editable"
                :min="0"
                :precision="2"
                :controls="false"
                @update:model-value="emit('update-quote-option', item.option.id, { adultUnitPrice: $event ?? null })"
              />
            </td>
          </tr>
          <tr v-if="displayOptions.some((item) => item.calculation.lines[1]?.quantity)">
            <th>{{ $t('itinerary.childTourPrice') }}</th>
            <td
              v-for="item in displayOptions"
              :key="item.option.id"
            >
              ¥{{ formatMoney(item.calculation.childUnitPrice) }}
            </td>
          </tr>
          <tr>
            <th>{{ $t('itinerary.leaderFoc') }}</th>
            <td
              v-for="item in displayOptions"
              :key="item.option.id"
            >
              <el-switch
                :model-value="item.option.leaderFocEnabled"
                :disabled="!editable"
                @update:model-value="emit('update-quote-option', item.option.id, { leaderFocEnabled: Boolean($event) })"
              />
              <div>{{ item.option.leaderFocEnabled ? $t('itinerary.leaderFocEnabledLabel', { count: guestCount }) : $t('itinerary.noFoc') }}</div>
            </td>
          </tr>
          <tr>
            <th>{{ $t('itinerary.profit') }}</th>
            <td
              v-for="item in displayOptions"
              :key="item.option.id"
            >
              ¥{{ formatMoney(item.calculation.profit) }}
            </td>
          </tr>
          <tr>
            <th>{{ $t('itinerary.actualMarginRate') }}</th>
            <td
              v-for="item in displayOptions"
              :key="item.option.id"
            >
              {{ item.calculation.actualMarginRate.toFixed(1) }}%
            </td>
          </tr>
          <tr class="quote-panel__total">
            <th>{{ $t('itinerary.totalPrice') }}</th>
            <td
              v-for="item in displayOptions"
              :key="item.option.id"
            >
              ¥{{ formatMoney(item.calculation.totalPrice) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <el-form
      class="quote-panel__settings"
      label-position="top"
      :disabled="!editable"
    >
      <h3>{{ $t('itinerary.extraFees') }}</h3>
      <el-card
        shadow="never"
        class="quote-panel__fee-card"
      >
        <template #header>
          {{ $t('itinerary.feeCards.tips') }}
        </template>
        <div class="quote-panel__two-columns">
          <el-form-item
            v-for="field in tipFields"
            :key="field"
            :label="$t(`itinerary.${field}`)"
          >
            <el-input-number
              :model-value="quote[field] ?? undefined"
              :min="0"
              :precision="2"
              :placeholder="$t('itinerary.noExtraQuote')"
              controls-position="right"
              @update:model-value="emit('update-settings', { [field]: $event ?? null })"
            />
          </el-form-item>
        </div>
      </el-card>
      <el-card
        v-for="type in transportTypes"
        :key="type"
        shadow="never"
        class="quote-panel__fee-card"
      >
        <template #header>
          {{ $t(`itinerary.feeCards.${type}`) }}
        </template>
        <div
          v-for="fee in quote.transportFees.filter((item) => item.type === type)"
          :key="fee.id"
          class="quote-panel__transport"
        >
          <div class="quote-panel__route">
            <el-form-item :label="$t('itinerary.feeDeparture')">
              <CitySelect
                :model-value="fee.departureCity"
                @update:model-value="updateFee(fee.id, { departureCity: $event, arrivalCity: $event === fee.arrivalCity ? '' : fee.arrivalCity })"
              />
            </el-form-item>
            <span class="quote-panel__route-arrow">→</span>
            <el-form-item :label="$t('itinerary.feeArrival')">
              <CitySelect
                :model-value="fee.arrivalCity"
                :disabled-city="fee.departureCity"
                @update:model-value="updateFee(fee.id, { arrivalCity: $event })"
              />
            </el-form-item>
          </div>
          <el-form-item :label="$t('itinerary.cabin')">
            <el-select
              :model-value="fee.cabin"
              @update:model-value="updateFee(fee.id, { cabin: $event })"
            >
              <el-option
                v-for="cabin in cabins[fee.type]"
                :key="cabin"
                :label="$t(`itinerary.cabins.${cabin}`)"
                :value="cabin"
              />
            </el-select>
          </el-form-item>
          <el-form-item :label="$t('itinerary.extraUnitPrice')">
            <el-input-number
              :model-value="fee.unitPrice ?? undefined"
              :min="0"
              :precision="2"
              :controls="false"
              @update:model-value="updateFee(fee.id, { unitPrice: $event ?? null })"
            />
          </el-form-item>
          <el-button
            type="danger"
            link
            @click="removeFee(fee.id)"
          >
            {{ $t('common.delete') }}
          </el-button>
        </div>
        <el-button @click="addFee(type)">
          {{ $t(type === 'flight' ? 'itinerary.addFlightFee' : 'itinerary.addTrainFee') }}
        </el-button>
      </el-card>
      <h3>{{ $t('itinerary.customerTerms') }}</h3>
      <el-form-item
        v-for="field in noteFields"
        :key="field"
        :label="$t(`itinerary.${field}`)"
      >
        <el-input
          :model-value="quote[field]"
          type="textarea"
          :rows="3"
          @update:model-value="emit('update-settings', { [field]: $event })"
        />
      </el-form-item>
    </el-form>
    <div class="quote-panel__summary">
      <span>{{ $t('itinerary.resourceItemCount', { count: itemCount }) }}</span>
      <span>{{ $t('itinerary.duration', duration) }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import CitySelect from "@/components/CitySelect.vue";
import { computed } from "vue";
import type { ItineraryQuoteCalculation, ItineraryQuoteOption, ItineraryQuoteSettings, ItineraryTransportFee } from "@/types/itinerary";
import { createId, formatMoney } from "@/utils";

const props = defineProps<{
  quote: ItineraryQuoteSettings;
  calculation: ItineraryQuoteCalculation;
  itemCount: number;
  duration: { days: number; nights: number };
  guestCount: number;
  editable: boolean;
}>();
const emit = defineEmits<{
  "update-quote-option": [optionId: string, changes: Partial<Omit<ItineraryQuoteOption, "id">>];
  "update-settings": [changes: Partial<Omit<ItineraryQuoteSettings, "options">>];
}>();
const displayOptions = computed(() => props.quote.options.flatMap((option) => {
  const calculation = props.calculation.options.find((record) => record.optionId === option.id);
  return calculation ? [{ option, calculation }] : [];
}));
const costMetrics = [
  { field: "hotelCost", label: "itinerary.hotelCost" },
  { field: "vehicleCost", label: "itinerary.destinationVehicleCost" },
  { field: "baseGroupCost", label: "itinerary.baseGroupCost" },
  { field: "baseCostPerPerson", label: "itinerary.baseCostPerPerson" },
  { field: "singleSupplementUnitCost", label: "itinerary.quoteLineTypes.single_supplement" },
] as const;
const transportTypes = ["flight", "train"] as const;
const tipFields = ["chineseTip", "englishTip"] as const;
const noteFields = ["customerNotes", "holidayRestrictions", "hotelReplacementTerms"] as const;
const cabins = { flight: ["economy", "business"], train: ["first", "second"] } as const;

function addFee(type: ItineraryTransportFee["type"]) {
  emit("update-settings", { transportFees: [...props.quote.transportFees, {
    id: createId("transport-fee"), type, departureCity: "", arrivalCity: "", cabin: type === "flight" ? "economy" : "second", unitPrice: null,
  }] });
}
function updateFee(id: string, changes: Partial<ItineraryTransportFee>) {
  emit("update-settings", { transportFees: props.quote.transportFees.map((fee) => fee.id === id ? { ...fee, ...changes } : { ...fee }) });
}
function removeFee(id: string) {
  emit("update-settings", { transportFees: props.quote.transportFees.filter((fee) => fee.id !== id) });
}
</script>

<style scoped lang="scss">
.quote-panel { display: grid; gap: 20px; font-size: 14px; }
.quote-panel__summary { display: flex; flex-wrap: wrap; gap: 20px; color: var(--el-text-color-regular); }
.quote-panel__comparison { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; }
th, td { min-width: 150px; padding: 12px; border: 1px solid var(--el-border-color); text-align: right; vertical-align: middle; }
th:first-child { text-align: left; min-width: 145px; }
thead th { background: var(--el-fill-color-light); font-weight: 600; }
.quote-panel__comparison :deep(.el-input-number) { width: 140px; }
.quote-panel__total { color: var(--el-color-primary); font-size: 16px; font-weight: 600; }
.quote-panel__fee-card { margin-bottom: 16px; border-radius: 10px; }
.quote-panel__fee-card :deep(.el-card__header) { font-weight: 600; background: var(--el-fill-color-extra-light); }
.quote-panel__settings { border-top: 1px solid var(--el-border-color); }
.quote-panel__settings h3 { font-size: 18px; margin: 20px 0 12px; }
.quote-panel__settings p { color: var(--el-text-color-secondary); }
.quote-panel__two-columns { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.quote-panel__transport { display: grid; grid-template-columns: minmax(280px, 2fr) minmax(140px, 1fr) minmax(160px, 1fr) auto; align-items: end; gap: 12px; }
.quote-panel__settings :deep(.el-input-number), .quote-panel__settings :deep(.el-select) { width: 100%; }
.quote-panel__buttons { display: flex; gap: 12px; }
@media (width <= 720px) {
  .quote-panel__two-columns, .quote-panel__transport { grid-template-columns: 1fr; }
}
</style>

<style scoped lang="scss">
.quote-panel__transport :deep(.el-form-item) { min-width: 0; }
.quote-panel__transport :deep(.el-form-item__label) { white-space: nowrap; }
.quote-panel__route { display: grid; grid-template-columns: minmax(0,1fr) auto minmax(0,1fr); gap: 8px; align-items: end; }
.quote-panel__route-title { grid-column: 1 / -1; color: var(--el-text-color-regular); }
.quote-panel__route-arrow { margin-bottom: 18px; line-height: 32px; }
.quote-panel__transport > .el-button { margin-bottom: 26px; }
.quote-panel__settings { container-type: inline-size; }
@container (max-width: 760px) { .quote-panel__transport { grid-template-columns: minmax(0,1fr) minmax(160px,1fr) auto; } .quote-panel__route { grid-column: 1 / -1; } }
</style>
