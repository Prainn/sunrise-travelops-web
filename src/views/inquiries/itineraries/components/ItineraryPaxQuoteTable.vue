<template>
  <el-card shadow="never">
    <template #header>
      {{ $t(`itinerary.hotelTiers.${option.hotelTier}`) }} · {{ $t(`itinerary.vehicleServiceLevels.${option.vehicleTier}`) }}
    </template>
    <el-form
      inline
      label-position="top"
      :disabled="!editable"
    >
      <el-form-item :label="$t('itinerary.guideServiceTotal')">
        <el-input-number
          :model-value="option.guideServiceTotal ?? (current ? calculation?.guideServiceTotal : undefined)"
          :min="0"
          :max="1e9"
          :precision="2"
          :controls="false"
          @update:model-value="emit('update-option', { guideServiceTotal: $event ?? null })"
        />
        <el-button
          link
          class="ml-2"
          @click="emit('update-option', { guideServiceTotal: null })"
        >
          {{ $t('itinerary.followGuideCost') }}
        </el-button>
      </el-form-item>
      <el-form-item :label="$t('itinerary.staffRoomTotal')">
        <el-input-number
          :model-value="option.staffRoomTotal ?? undefined"
          :min="0"
          :max="1e9"
          :precision="2"
          :controls="false"
          @update:model-value="emit('update-option', { staffRoomTotal: $event ?? null })"
        />
      </el-form-item>
    </el-form>
    <el-table
      :data="rows"
      border
      class="w-full"
    >
      <el-table-column
        label="PAX"
        prop="pax"
        width="75"
        fixed
      />
      <el-table-column
        :label="$t('itinerary.baseCostPerPerson')"
        min-width="130"
      >
        <template #default="{ row }">
          <el-tooltip
            :disabled="!current"
            placement="top"
          >
            <template #content>
              <template v-if="calculation">
                {{ $t('itinerary.hotelPerPerson') }}: {{ formatMoney(calculation.hotelUnitCost) }}<br>
                {{ $t('itinerary.dailyMealAttractionCost') }}: {{ formatMoney(dailyResourceCost) }}<br>
                {{ $t('itinerary.vehiclePerPerson') }}: {{ formatMoney(row.vehicleUnitCost) }}<br>
                {{ $t('itinerary.guideServicePerPerson') }}: {{ formatMoney(row.guideServiceUnitCost) }}<br>
                {{ $t('itinerary.staffRoomPerPerson') }}: {{ formatMoney(row.staffRoomUnitCost) }}
              </template>
            </template>
            <span>{{ money(row.baseCostPerPerson) }}</span>
          </el-tooltip>
        </template>
      </el-table-column>
      <el-table-column
        :label="$t('itinerary.adultTourPricePerPerson')"
        min-width="175"
      >
        <template #default="{ row }">
          <el-input-number
            class="!w-[145px]"
            :model-value="priceFor(row.pax) ?? (current ? row.adultUnitPrice : undefined)"
            :min="0"
            :max="1e9"
            :precision="2"
            :controls="false"
            :disabled="!editable"
            @update:model-value="updatePrice(row.pax, $event)"
          />
        </template>
      </el-table-column>
      <el-table-column
        v-for="metric in metrics"
        :key="metric.field"
        :label="$t(metric.label)"
        min-width="120"
      >
        <template #default="{ row }">
          {{ money(row[metric.field]) }}
        </template>
      </el-table-column>
      <el-table-column
        :label="$t('itinerary.actualMarginRate')"
        min-width="110"
      >
        <template #default="{ row }">
          {{ current && row.actualMarginRate != null ? `${row.actualMarginRate.toFixed(2)}%` : '—' }}
        </template>
      </el-table-column>
    </el-table>
  </el-card>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { ItineraryPaxCalculation, ItineraryQuoteOption, ItineraryQuoteOptionCalculation } from '@/types/itinerary';
import { formatMoney } from '@/utils';

const props = defineProps<{
  option: ItineraryQuoteOption;
  calculation?: ItineraryQuoteOptionCalculation;
  dailyResourceCost: number;
  current: boolean;
  editable: boolean;
}>();
const emit = defineEmits<{ 'update-option': [changes: Partial<Omit<ItineraryQuoteOption, 'id'>>] }>();
const rows = computed<Array<Partial<ItineraryPaxCalculation> & { pax: number }>>(() => props.option.paxPrices.map(price =>
  props.calculation?.paxPrices.find(row => row.pax === price.pax) ?? { pax: price.pax }));
const metrics = [
  { field: 'childUnitPrice', label: 'itinerary.childTourPrice' },
  { field: 'leaderUnitPrice', label: 'itinerary.leaderTourPrice' },
  { field: 'singleSupplementUnitCost', label: 'itinerary.quoteLineTypes.single_supplement' },
  { field: 'tipUnitPrice', label: 'itinerary.tipPerPerson' },
  { field: 'profitPerPerson', label: 'itinerary.profitPerPerson' },
] as const;
function money(value: number | undefined) { return props.current && value !== undefined ? `¥${formatMoney(value)}` : '—'; }
function priceFor(pax: number) { return props.option.paxPrices.find(price => price.pax === pax)?.adultUnitPrice; }
function updatePrice(pax: number, value: number | undefined) {
  emit('update-option', { paxPrices: props.option.paxPrices.map(row => ({ pax: row.pax, adultUnitPrice: row.pax === pax ? value ?? null : priceFor(row.pax) ?? null })) });
}
</script>
