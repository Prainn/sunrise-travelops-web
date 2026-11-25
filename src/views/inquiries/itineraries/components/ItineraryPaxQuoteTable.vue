<template>
  <SectionCard>
    <template #header>
      <span class="font-600 text-strong">{{ option.hotelTier === null ? $t("itinerary.noAccommodation") : $t(`itinerary.hotelTiers.${option.hotelTier}`) }} /
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
          <!-- 按住宿日逐晚列出；旧冻结快照无日序，仍按城市和晚数展示 -->
          <el-table-column :label="$t('websitePrint.dayColumn')" width="70">
            <template #default="{ row }">
              {{ row.dayNumber ? `D${row.dayNumber}` : $t("itinerary.nightCount", { count: row.nights }) }}
            </template>
          </el-table-column>
          <el-table-column
            prop="destination"
            :label="$t('itinerary.hotelCostCity')"
            min-width="80"
          />
          <el-table-column :label="$t('resource.hotelName')" min-width="140">
            <template #default="{ row }">
              {{ row.hotelName ?? "—" }}
            </template>
          </el-table-column>
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
        :show-overflow-tooltip="false"
      />
      <el-table-column :label="$t('itinerary.vehiclePerPerson')" min-width="120">
        <template #default="{ row }">
          {{ money(row.vehicleUnitCost) }}
        </template>
      </el-table-column>
      <el-table-column :label="$t('itinerary.mealCost')" min-width="130">
        <template #default="{ row }">
          {{ money(row.mealCost ?? mealCost) }}
        </template>
      </el-table-column>
      <el-table-column :label="$t('itinerary.attractionCost')" min-width="130">
        <template #default="{ row }">
          {{ money(row.attractionCost ?? attractionCost) }}
        </template>
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
        :min-width="metric.width"
      >
        <template #default="{ row }">
          {{ money(row[metric.field]) }}
        </template>
      </el-table-column>
      <el-table-column
        :label="$t('itinerary.quoteLineTypes.single_supplement')"
        min-width="120"
        fixed="right"
        :show-overflow-tooltip="false"
      >
        <template #default="{ row }">
          {{ money(row.singleSupplementUnitCost) }}
        </template>
      </el-table-column>
      <el-table-column
        :label="$t('itinerary.singleSupplementQuote')"
        min-width="160"
        fixed="right"
        :show-overflow-tooltip="false"
      >
        <template #default="{ row }">
          <el-input-number
            :model-value="singleSupplementQuote(row) ?? undefined"
            :min="0"
            :max="1e9"
            :precision="2"
            :controls="false"
            :disabled="!editable"
            :aria-label="$t('itinerary.singleSupplementQuote')"
            @update:model-value="updateSingleSupplementQuote(row.pax, $event)"
          />
        </template>
      </el-table-column>
      <el-table-column
        :label="$t('itinerary.tourCostPerPerson')"
        min-width="130"
        fixed="right"
        :show-overflow-tooltip="false"
      >
        <template #default="{ row }">
          <el-tooltip :disabled="!calculation" placement="top">
            <template #content>
              <template v-if="calculation">
                {{ $t("itinerary.hotelPerPerson") }}: {{ money(calculation.hotelUnitCost) }}<br />
                {{ $t("itinerary.mealCost") }}: {{ money(row.mealCost ?? mealCost) }}<br />
                {{ $t("itinerary.attractionCost") }}: {{ money(row.attractionCost ?? attractionCost) }}<br />
                {{ $t("itinerary.vehiclePerPerson") }}: {{ money(row.vehicleUnitCost) }}<br />
                {{ $t("itinerary.guideServicePerPerson") }}: {{ money(row.guideServiceUnitCost) }}<br />
                {{ $t("itinerary.staffRoomPerPerson") }}: {{ money(row.staffRoomUnitCost) }}
                <template v-for="field in sharedCostFields" :key="field.field">
                  <template v-if="row[field.field] !== undefined">
                    <br />{{ $t(field.label) }}: {{ money(row[field.field]) }}
                  </template>
                </template>
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
        :show-overflow-tooltip="false"
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
      <el-table-column
        :label="$t('itinerary.profitPerPerson')"
        min-width="130"
        fixed="right"
        :show-overflow-tooltip="false"
      >
        <template #default="{ row }">
          {{ money(profitPerPerson(row.pax, row.adultUnitPrice, row.baseCostPerPerson)) }}
        </template>
      </el-table-column>
      <el-table-column
        :label="$t('itinerary.actualMarginRate')"
        min-width="130"
        fixed="right"
        :show-overflow-tooltip="false"
      >
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
  ItineraryPaxPrice,
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
        width: 150,
      },
      ...(props.calculation?.paxPrices.some((row) => row.childWithoutBedUnitPrice != null)
        ? [{ field: "childWithoutBedUnitPrice", label: "itinerary.childWithoutBedPrice", width: 150 } as const]
        : []),
    ] as const,
);
/** Older snapshots omit these per-person shares; they are part of the base cost when present. */
const sharedCostFields = [
  { field: "leaderRoomUnitCost", label: "itinerary.leaderRoomPerPerson" },
  { field: "driverTipUnitCost", label: "itinerary.driverTipPerPerson" },
  { field: "guideLeaderTransportUnitCost", label: "itinerary.guideLeaderTransportPerPerson" },
  { field: "groundHandlingUnitCost", label: "itinerary.groundHandlingPerPerson" },
] as const;
/** Missing amounts read as ¥0.00; unpriced resources are flagged by the pricing warning. */
function money(value: number | null | undefined) {
  return `¥${formatMoney(value ?? 0)}`;
}
/**
 * Draft overrides win; without one the field shows the cost while the saved value stays null.
 * Read-only quotes show the server's final value, keeping an explicit 0.
 */
function singleSupplementQuote(row: Partial<ItineraryPaxCalculation>) {
  const override = row.pax === undefined ? null : paxPriceFor(row.pax)?.singleSupplementQuote;
  if (override != null) return override;
  if (!props.editable && row.singleSupplementQuote != null) return row.singleSupplementQuote;
  return row.singleSupplementUnitCost ?? null;
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
function paxPriceFor(pax: number) {
  return props.option.paxPrices.find((price) => price.pax === pax);
}
function priceFor(pax: number) {
  return paxPriceFor(pax)?.adultUnitPrice;
}
function updatePaxPrice(pax: number, changes: Partial<Omit<ItineraryPaxPrice, "pax">>) {
  emit("update-option", {
    paxPrices: props.option.paxPrices.map((row) => (row.pax === pax ? { ...row, ...changes } : { ...row })),
  });
}
function updatePrice(pax: number, value: number | null | undefined) {
  updatePaxPrice(pax, { adultUnitPrice: value ?? null });
}
/** Clearing restores the follow-cost null; an explicit 0 stays a zero quote. */
function updateSingleSupplementQuote(pax: number, value: number | null | undefined) {
  updatePaxPrice(pax, { singleSupplementQuote: value ?? null });
}
</script>
