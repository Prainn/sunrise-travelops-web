<template>
  <AppDialog
    :model-value="modelValue"
    :title="$t('identity.prices')"
    size="xl"
    :close-on-click-modal="false"
    :busy="saving"
    @close="emit('cancel')"
  >
    <div class="price-adjustments">
      <el-form v-if="adjustedRows.length || vehicleRows.length" label-position="top">
        <div
          v-for="row in adjustedRows"
          :key="row.key"
          class="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr] gap-4 mb-4"
        >
          <el-form-item :label="row.name + ' · ' + $t('identity.actual')">
            <el-input-number
              :model-value="row.get()"
              :min="0"
              :precision="2"
              :disabled="!editable"
              @change="changePrice(row, $event ?? null)"
            />
          </el-form-item>
          <el-form-item :label="$t('identity.reference')">
            <el-text>
              {{
                row.fields.referencePrice == null
                  ? $t(row.custom ? "identity.noReference" : "identity.unknown")
                  : `¥${formatMoney(row.fields.referencePrice)}`
              }}
            </el-text>
          </el-form-item>
          <el-form-item :label="$t('identity.reason')" :required="needsReason(row)">
            <el-input
              v-if="needsReason(row)"
              :model-value="row.fields.adjustmentReason ?? ''"
              :disabled="!editable"
              :placeholder="$t('identity.reasonPlaceholder')"
              @update:model-value="row.fields.adjustmentReason = $event"
            />
            <el-text v-else type="info">
              {{ row.fields.adjustmentReason?.trim() || $t("common.notSet") }}
            </el-text>
          </el-form-item>
        </div>
        <div
          v-for="row in vehicleRows"
          :key="row.key"
          class="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr] gap-4 mb-4"
        >
          <el-form-item
            :label="
              $t('planning.vehiclePaxItem', {
                tier: $t(`inquiry.log.tiers.${row.vehicle.tier}`),
                pax: row.price.pax,
              }) +
                ' · ' +
                $t('identity.actual')
            "
          >
            <el-input-number
              :model-value="row.price.totalPrice"
              :value-on-clear="null"
              :min="0"
              :precision="2"
              :disabled="!editable"
              @change="changeVehiclePrice(row.vehicle, row.price.pax, $event ?? null)"
            />
          </el-form-item>
          <el-form-item :label="$t('identity.reference')">
            <el-button
              :disabled="!editable || vehicleSegmentPaxTotal(row.vehicle, row.price.pax) == null"
              @click="changeVehiclePrice(row.vehicle, row.price.pax, null)"
            >
              {{ $t("identity.automatic") }} ·
              {{
                vehicleSegmentPaxTotal(row.vehicle, row.price.pax) == null
                  ? $t("planning.priceNotEntered")
                  : `¥${formatMoney(vehicleSegmentPaxTotal(row.vehicle, row.price.pax))}`
              }}
            </el-button>
          </el-form-item>
          <el-form-item :label="$t('identity.reason')" required>
            <el-input
              :model-value="row.price.adjustmentReason ?? ''"
              :disabled="!editable"
              :placeholder="$t('identity.reasonPlaceholder')"
              @update:model-value="row.price.adjustmentReason = $event"
            />
          </el-form-item>
        </div>
      </el-form>
      <FeedbackState v-else :title="$t('identity.noPriceItems')" />
      <el-collapse @change="loadHistory">
        <el-collapse-item :title="$t('identity.history')" name="history">
          <DataTable :loading="isHistoryLoading" :data="history" size="small">
            <el-table-column prop="itemName" :label="$t('identity.actual')" />
            <el-table-column :label="$t('identity.actual')">
              <template #default="{ row }">
                {{ formatMoney(row.beforePrice) }} → {{ formatMoney(row.afterPrice) }}
              </template>
            </el-table-column>
            <el-table-column prop="reason" :label="$t('identity.reason')" />
            <el-table-column prop="operatorName" :label="$t('common.operator')" />
            <el-table-column :label="$t('identity.time')">
              <template #default="{ row }">
                {{ formatDateTime(row.occurredAt) }}
              </template>
            </el-table-column>
          </DataTable>
        </el-collapse-item>
      </el-collapse>
    </div>
    <template #footer>
      <el-button @click="emit('cancel')">
        {{ $t(editable ? "common.cancel" : "common.close") }}
      </el-button>
      <el-button
        v-if="editable"
        type="primary"
        :loading="saving"
        @click="emit('save')"
      >
        {{ $t("common.save") }}
      </el-button>
    </template>
  </AppDialog>
</template>
<script setup lang="ts">
import { ElMessage } from "element-plus";
import AppDialog from "@/components/AppDialog/index.vue";
import DataTable from "@/components/DataTable/index.vue";
import FeedbackState from "@/components/FeedbackState/index.vue";
import type { ItineraryRecord, ItineraryVehiclePlan, PriceAdjustment } from "@/types/itinerary";
import {
  itineraryPriceRows,
  resourcePriceNeedsReason,
  vehiclePaxPriceNeedsReason,
} from "../price-adjustments";
import { setVehiclePaxTotal, vehicleSegmentPaxTotal } from "../vehicle-plans";
import { inquiryService } from "@/services/inquiry.service";
import { formatMoney, formatDateTime, roundMoney } from "@/utils";
const props = defineProps<{
  plan: ItineraryRecord;
  savedPlan?: ItineraryRecord;
  editable: boolean;
  modelValue: boolean;
  saving: boolean;
}>();
const emit = defineEmits<{ save: []; cancel: [] }>();
const rows = computed(() => itineraryPriceRows(props.plan));
const adjustedRows = computed(() => rows.value.filter((row) => row.custom || needsReason(row)));
// 只列出需要本次原因的车型×人数档；已保存行程的其他档保持不变。
const vehicleRows = computed(() =>
  props.plan.vehiclePlans.flatMap((vehicle) =>
    (vehicle.paxPrices ?? [])
      .filter((price) => vehiclePaxPriceNeedsReason(vehicle, price.pax, savedVehicle(vehicle)))
      .map((price) => ({ key: `vehicle:${vehicle.tier}:${price.pax}`, vehicle, price })),
  ),
);
const history = ref<PriceAdjustment[]>([]);
const isHistoryLoading = ref(false);
const savedRows = computed(
  () =>
    new Map(
      props.savedPlan ? itineraryPriceRows(props.savedPlan).map((row) => [row.key, row]) : [],
    ),
);
function changePrice(row: ReturnType<typeof itineraryPriceRows>[number], value: number | null) {
  row.set(value);
  const saved = savedRows.value.get(row.key);
  const savedPrice = saved?.get() ?? null;
  const unchanged =
    saved?.source === row.source &&
    (savedPrice === null || value === null
      ? savedPrice === value
      : roundMoney(savedPrice) === roundMoney(value));
  // Returning to the saved price keeps the existing reason; any other change needs a new one.
  row.fields.adjustmentReason = unchanged ? (saved.fields.adjustmentReason ?? "") : "";
}
function needsReason(row: ReturnType<typeof itineraryPriceRows>[number]) {
  return resourcePriceNeedsReason(row, savedRows.value.get(row.key));
}
function savedVehicle(vehicle: ItineraryVehiclePlan) {
  return props.savedPlan?.vehiclePlans.find((saved) => saved.tier === vehicle.tier);
}
function changeVehiclePrice(vehicle: ItineraryVehiclePlan, pax: number, value: number | null) {
  Object.assign(vehicle, setVehiclePaxTotal(vehicle, pax, value));
}
async function loadHistory() {
  try {
    isHistoryLoading.value = true;
    history.value = await inquiryService.priceAdjustments(props.plan.id);
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : String(error));
  } finally {
    isHistoryLoading.value = false;
  }
}
watch(
  () => props.plan.id,
  () => {
    history.value = [];
  },
);
</script>

<style scoped lang="scss">
.price-adjustments :deep(.el-form:not(.el-form--inline) .el-form-item > .el-form-item__label) {
  max-width: 100%;
}
</style>
