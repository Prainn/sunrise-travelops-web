<template>
  <el-card shadow="never">
    <template #header>
      <div class="flex flex-wrap items-center justify-between gap-3">
        <span
          >{{ $t(`itinerary.hotelTiers.${option.hotelTier}`) }} ·
          {{ $t(`itinerary.vehicleServiceLevels.${option.vehicleTier}`) }}</span
        >
        <el-popover trigger="click" :width="520" placement="bottom-end">
          <template #reference>
            <el-button size="small" :disabled="!current || !calculation?.hotelCityCosts">
              {{ $t("itinerary.hotelCostDetails") }}
            </el-button>
          </template>
          <h4 class="mt-0">
            {{ $t("itinerary.hotelCostDetails") }}
          </h4>
          <el-table :data="calculation?.hotelCityCosts ?? []" border>
            <el-table-column
              prop="destination"
              :label="$t('itinerary.hotelCostCity')"
              min-width="100"
            />
            <el-table-column prop="nights" :label="$t('itinerary.hotelCostNights')" width="65" />
            <el-table-column :label="$t('itinerary.hotelRoomNightPrice')" min-width="125">
              <template #default="{ row }">
                {{ money(row.unitCost) }}
              </template>
            </el-table-column>
            <el-table-column :label="$t('itinerary.hotelPerPerson')" min-width="125">
              <template #default="{ row }">
                {{ money(row.totalCost) }}
              </template>
            </el-table-column>
          </el-table>
          <div class="mt-3 text-right font-semibold">
            {{ $t("itinerary.hotelCostTotal") }}：{{ money(calculation?.hotelUnitCost) }}
          </div>
        </el-popover>
      </div>
    </template>
    <el-table :data="rows" border class="w-full mt-4">
      <el-table-column label="PAX" prop="pax" width="75" fixed />
      <el-table-column :label="$t('itinerary.vehiclePerPerson')" min-width="120">
        <template #default="{ row }">
          {{ money(row.vehicleUnitCost) }}
        </template>
      </el-table-column>
      <el-table-column :label="$t('itinerary.mealCost')" min-width="130">
        {{ money(mealCost) }}
      </el-table-column>
      <el-table-column :label="$t('itinerary.attractionCost')" min-width="130">
        {{ money(attractionCost) }}
      </el-table-column>
      <el-table-column :label="$t('itinerary.guideServicePerPerson')" min-width="130">
        <template #default="{ row }">
          {{ money(row.guideServiceUnitCost) }}
        </template>
      </el-table-column>
      <el-table-column :label="$t('itinerary.staffRoomPerPerson')" min-width="120">
        <template #default="{ row }">
          {{ money(row.staffRoomUnitCost) }}
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
      <el-table-column :label="$t('itinerary.baseCostPerPerson')" min-width="130" fixed="right">
        <template #default="{ row }">
          <el-tooltip :disabled="!current" placement="top">
            <template #content>
              <template v-if="calculation">
                {{ $t("itinerary.hotelPerPerson") }}: {{ formatMoney(calculation.hotelUnitCost)
                }}<br />
                {{ $t("itinerary.mealCost") }}: {{ mealCost == null ? "—" : formatMoney(mealCost)
                }}<br />
                {{ $t("itinerary.attractionCost") }}:
                {{ attractionCost == null ? "—" : formatMoney(attractionCost) }}<br />
                {{ $t("itinerary.vehiclePerPerson") }}: {{ formatMoney(row.vehicleUnitCost) }}<br />
                {{ $t("itinerary.guideServicePerPerson") }}:
                {{ formatMoney(row.guideServiceUnitCost) }}<br />
                {{ $t("itinerary.staffRoomPerPerson") }}: {{ formatMoney(row.staffRoomUnitCost) }}
              </template>
            </template>
            <span>{{ money(row.baseCostPerPerson) }}</span>
          </el-tooltip>
        </template>
      </el-table-column>
      <el-table-column
        :label="$t('itinerary.adultTourPricePerPerson')"
        min-width="175"
        fixed="right"
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
    </el-table>
  </el-card>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type {
  ItineraryPaxCalculation,
  ItineraryQuoteOption,
  ItineraryQuoteOptionCalculation,
} from "@/types/itinerary";
import { formatMoney } from "@/utils";

const props = defineProps<{
  option: ItineraryQuoteOption;
  calculation?: ItineraryQuoteOptionCalculation;
  mealCost?: number;
  attractionCost?: number;
  current: boolean;
  editable: boolean;
}>();
const emit = defineEmits<{
  "update-option": [changes: Partial<Omit<ItineraryQuoteOption, "id">>];
}>();
const rows = computed<Array<Partial<ItineraryPaxCalculation> & { pax: number }>>(() =>
  props.option.paxPrices.map(
    (price) =>
      props.calculation?.paxPrices.find((row) => row.pax === price.pax) ?? { pax: price.pax },
  ),
);
const metrics = [
  { field: "childUnitPrice", label: "itinerary.childTourPrice" },
  { field: "singleSupplementUnitCost", label: "itinerary.quoteLineTypes.single_supplement" },
] as const;
function money(value: number | undefined) {
  return props.current && value !== undefined ? `¥${formatMoney(value)}` : "0";
}
function priceFor(pax: number) {
  return props.option.paxPrices.find((price) => price.pax === pax)?.adultUnitPrice;
}
function updatePrice(pax: number, value: number | undefined) {
  emit("update-option", {
    paxPrices: props.option.paxPrices.map((row) => ({
      pax: row.pax,
      adultUnitPrice: row.pax === pax ? (value ?? null) : (priceFor(row.pax) ?? null),
    })),
  });
}
</script>
