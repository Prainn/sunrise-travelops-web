<template>
  <SectionCard>
    <template #header>
      <span class="font-600 text-strong">{{ $t(`itinerary.hotelTiers.${option.hotelTier}`) }} ·
        {{ $t(`itinerary.vehicleServiceLevels.${option.vehicleTier}`) }}</span>
    </template>
    <template #actions>
      <el-popover trigger="click" :width="520" placement="bottom-end">
        <template #reference>
          <el-button size="small" :disabled="!calculation?.hotelCityCosts">
            {{ $t("itinerary.hotelCostDetails") }}
          </el-button>
        </template>
        <h4 class="mt-0">
          {{ $t("itinerary.hotelCostDetails") }}
        </h4>
        <DataTable :data="calculation?.hotelCityCosts ?? []" border>
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
        </DataTable>
        <div class="mt-3 text-right font-semibold">
          {{ $t("itinerary.hotelCostTotal") }}：{{ money(calculation?.hotelUnitCost) }}
        </div>
      </el-popover>
    </template>
    <DataTable :data="rows" border>
      <el-table-column
        label="PAX"
        prop="pax"
        width="75"
        fixed
      />
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
      <el-table-column :label="$t('itinerary.tourCostPerPerson')" min-width="130" fixed="right">
        <template #default="{ row }">
          <el-tooltip :disabled="!calculation" placement="top">
            <template #content>
              <template v-if="calculation">
                {{ $t("itinerary.hotelPerPerson") }}: {{ formatMoney(calculation.hotelUnitCost)
                }}<br />
                {{ $t("itinerary.mealCost") }}: {{ formatMoney(mealCost) }}<br />
                {{ $t("itinerary.attractionCost") }}: {{ formatMoney(attractionCost) }}<br />
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
            :model-value="adultPrice(row.pax, row.adultUnitPrice)"
            :min="0"
            :max="1e9"
            :precision="2"
            :controls="false"
            :disabled="!editable"
            @update:model-value="updatePrice(row.pax, $event)"
          />
        </template>
      </el-table-column>
      <el-table-column :label="$t('itinerary.profitPerPerson')" min-width="130" fixed="right">
        <template #default="{ row }">
          {{ money(profitPerPerson(row.pax, row.adultUnitPrice, row.baseCostPerPerson)) }}
        </template>
      </el-table-column>
      <el-table-column :label="$t('itinerary.actualMarginRate')" min-width="130" fixed="right">
        <template #default="{ row }">
          {{ marginRate(row.pax, row.adultUnitPrice, row.baseCostPerPerson) }}
        </template>
      </el-table-column>
    </DataTable>
  </SectionCard>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type {
  ItineraryPaxCalculation,
  ItineraryQuoteOption,
  ItineraryQuoteOptionCalculation,
} from "@/types/itinerary";
import { formatMoney, sumMoney } from "@/utils";
import DataTable from "@/components/DataTable/index.vue";
import SectionCard from "@/components/SectionCard/index.vue";

const props = defineProps<{
  option: ItineraryQuoteOption;
  calculation?: ItineraryQuoteOptionCalculation;
  mealCost?: number;
  attractionCost?: number;
  tipUnitPrice: number;
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
const metrics = computed(
  () =>
    [
      {
        field: "childUnitPrice",
        label: props.calculation?.paxPrices.some((row) => row.childWithoutBedUnitPrice != null)
          ? "itinerary.childWithBedPrice"
          : "itinerary.childTourPrice",
      },
      ...(props.calculation?.paxPrices.some((row) => row.childWithoutBedUnitPrice != null)
        ? [{ field: "childWithoutBedUnitPrice", label: "itinerary.childWithoutBedPrice" } as const]
        : []),
      { field: "singleSupplementUnitCost", label: "itinerary.quoteLineTypes.single_supplement" },
    ] as const,
);
function money(value: number | null | undefined) {
  if (value === null) return "—";
  return `¥${formatMoney(value)}`;
}
function adultPrice(pax: number, calculatedPrice?: number) {
  return priceFor(pax) ?? calculatedPrice ?? 0;
}
function profitPerPerson(pax: number, calculatedPrice?: number, baseCost?: number) {
  return sumMoney([adultPrice(pax, calculatedPrice), props.tipUnitPrice, -(baseCost ?? 0)]);
}
function marginRate(pax: number, calculatedPrice?: number, baseCost?: number) {
  const revenue = sumMoney([adultPrice(pax, calculatedPrice), props.tipUnitPrice]);
  const profit = profitPerPerson(pax, calculatedPrice, baseCost);
  return revenue === 0 ? "0%" : `${formatMoney((profit / revenue) * 100)}%`;
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
