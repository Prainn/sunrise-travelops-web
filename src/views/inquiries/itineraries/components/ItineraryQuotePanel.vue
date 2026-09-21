<template>
  <div class="quote-panel grid gap-[20px] text-[14px]">
    <template v-if="!legacyCalculation">
      <div class="flex gap-5 flex-wrap">
        <span>{{ $t('itinerary.dailyMealAttractionCost') }}: {{ calculationVisible && paxCalculation ? formatMoney(paxCalculation.dailyResourceCost) : '—' }}</span>
        <span>{{ $t('itinerary.guideCost') }}: {{ calculationVisible && paxCalculation ? formatMoney(paxCalculation.guideCost) : '—' }}</span>
      </div>
      <el-empty
        v-if="!displayOptions.length"
        :description="$t('itinerary.noQuoteOptions')"
        :image-size="64"
      />
      <ItineraryPaxQuoteTable
        v-for="item in displayOptions"
        :key="item.option.id"
        :option="item.option"
        :calculation="item.calculation"
        :daily-resource-cost="paxCalculation?.dailyResourceCost ?? 0"
        :destinations="destinations"
        :current="calculationVisible && Boolean(item.calculation)"
        :editable="editable"
        @update-option="emit('update-quote-option', item.option.id, $event)"
      />
    </template>
    <template v-else-if="legacyCalculation">
      <el-alert
        :title="$t('itinerary.legacyQuote')"
        type="info"
        :closable="false"
      />
      <el-table
        :data="legacyCalculation.options"
        border
      >
        <el-table-column
          :label="$t('itinerary.quoteConfigurations')"
          min-width="180"
        >
          <template #default="{ row }">
            {{ $t(`itinerary.hotelTiers.${row.hotelTier}`) }} / {{ $t(`itinerary.vehicleServiceLevels.${row.vehicleTier}`) }}
          </template>
        </el-table-column>
        <el-table-column :label="$t('itinerary.adultTourPricePerPerson')">
          <template #default="{ row }">
            {{ formatMoney(row.adultUnitPrice) }}
          </template>
        </el-table-column>
        <el-table-column :label="$t('itinerary.childTourPrice')">
          <template #default="{ row }">
            {{ formatMoney(row.childUnitPrice) }}
          </template>
        </el-table-column>
      </el-table>
    </template>

    <el-form
      v-if="!legacyCalculation"
      class="quote-panel__settings [border-top:1px_solid_var(--el-border-color)] [container-type:inline-size]"
      label-position="top"
      :disabled="!editable"
    >
      <h3 class="m-[20px_0_12px] text-[18px]">
        {{ $t('itinerary.extraFees') }}
      </h3>
      <el-card
        shadow="never"
        class="quote-panel__fee-card mb-[16px] rounded-[10px]"
      >
        <template #header>
          {{ $t('itinerary.feeCards.tips') }}
        </template>
        <div class="quote-panel__two-columns p-[16px] [border:1px_solid_var(--el-border-color-lighter)] rounded-[8px] [background:var(--el-fill-color-extra-light)] grid [grid-template-columns:1fr_1fr] gap-[16px]">
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
              :disabled="quote[field] === null && quote[field === 'chineseTip' ? 'englishTip' : 'chineseTip'] !== null"
              @update:model-value="emit('update-settings', { [field]: $event ?? null })"
            />
          </el-form-item>
        </div>
      </el-card>
      <el-card
        v-for="type in transportTypes"
        :key="type"
        shadow="never"
        class="quote-panel__fee-card mb-[16px] rounded-[10px]"
      >
        <template #header>
          {{ $t(`itinerary.feeCards.${type}`) }}
        </template>
        <div
          v-for="fee in quote.transportFees.filter((item) => item.type === type)"
          :key="fee.id"
          class="quote-panel__transport p-[16px] mb-[12px] [border:1px_solid_var(--el-border-color-lighter)] rounded-[8px] [background:var(--el-fill-color-extra-light)] grid [grid-template-columns:minmax(280px,_2fr)_minmax(140px,_1fr)_minmax(160px,_1fr)_auto] [align-items:end] gap-[12px]"
        >
          <div class="quote-panel__route grid [grid-template-columns:minmax(0,1fr)_auto_minmax(0,1fr)] gap-[8px] [align-items:end]">
            <el-form-item :label="$t('itinerary.feeDeparture')">
              <CitySelect
                :model-value="fee.departureCity"
                @update:model-value="updateFee(fee.id, { departureCity: $event, arrivalCity: $event === fee.arrivalCity ? '' : fee.arrivalCity })"
              />
            </el-form-item>
            <span class="quote-panel__route-arrow mb-[18px] leading-[32px]">→</span>
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
            class="mb-[26px]"
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
      <h3 class="m-[20px_0_12px] text-[18px]">
        {{ $t('itinerary.customerTerms') }}
      </h3>
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
    <div class="quote-panel__summary flex flex-wrap gap-[20px] text-[var(--el-text-color-regular)]">
      <span>{{ $t('itinerary.resourceItemCount', { count: itemCount }) }}</span>
      <span>{{ $t('itinerary.duration', duration) }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import ItineraryPaxQuoteTable from "./ItineraryPaxQuoteTable.vue";
import CitySelect from "@/components/CitySelect.vue";
import { computed } from "vue";
import type { ItineraryQuoteCalculation, ItineraryQuoteOption, ItineraryQuoteSettings, ItineraryTransportFee } from "@/types/itinerary";
import { createId, formatMoney } from "@/utils";

const props = defineProps<{
  quote: ItineraryQuoteSettings;
  calculation: ItineraryQuoteCalculation | null;
  calculationCurrent: boolean;
  calculationPending: boolean;
  destinations: string[];
  itemCount: number;
  duration: { days: number; nights: number };
  editable: boolean;
}>();
const emit = defineEmits<{
  "update-quote-option": [optionId: string, changes: Partial<Omit<ItineraryQuoteOption, "id">>];
  "update-settings": [changes: Partial<Omit<ItineraryQuoteSettings, "options">>];
}>();
const paxCalculation = computed(() => props.calculation && 'pricingVersion' in props.calculation ? props.calculation : null);
const legacyCalculation = computed(() => props.calculation && !('pricingVersion' in props.calculation) ? props.calculation : null);
const calculationVisible = computed(() => props.calculationCurrent || props.calculationPending);
const displayOptions = computed(() => props.quote.options.flatMap(option => {
  const calculation = paxCalculation.value?.options.find(record => record.optionId === option.id);
  return [{ option, calculation }];
}));
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
th, td { @apply '[overflow-wrap:anywhere] p-[12px] [border:1px_solid_var(--el-border-color)] text-right [vertical-align:middle]'; }
th:first-child { @apply 'text-left'; }
.quote-panel__comparison :deep(.el-input-number) { width: 140px; }

.quote-panel__fee-card :deep(.el-card__header) { font-weight: 600; background: var(--el-fill-color-extra-light); }

.quote-panel__settings :deep(.el-input-number), .quote-panel__settings :deep(.el-select) { width: 100%; }
@media (width <= 720px) {
  .quote-panel__two-columns, .quote-panel__transport { @apply '[grid-template-columns:1fr]'; }
}
</style>

<style scoped lang="scss">
.quote-panel__transport :deep(.el-form-item) { min-width: 0; }
.quote-panel__transport :deep(.el-form-item__label) { white-space: nowrap; }

@container (max-width: 760px) { .quote-panel__transport { @apply '[grid-template-columns:minmax(0,1fr)_minmax(160px,1fr)_auto]'; } .quote-panel__route { @apply '[grid-column:1_/_-1]'; } }
</style>
