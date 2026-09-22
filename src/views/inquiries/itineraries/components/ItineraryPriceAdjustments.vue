<template>
  <el-dialog
    :model-value="modelValue"
    :title="$t('identity.prices')"
    width="min(1200px, 96vw)"
    :close-on-click-modal="false"
    @close="emit('cancel')"
  >
    <el-card shadow="never" class="max-h-60vh overflow-y-auto">
      <el-form v-if="adjustedRows.length || activeVehiclePlans.length" label-position="top">
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
              @change="changePrice(row, Number($event))"
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
          v-for="vehicle in activeVehiclePlans"
          :key="vehicle.tier"
          class="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr] gap-4 mb-4"
        >
          <el-form-item
            :label="$t(`inquiry.log.tiers.${vehicle.tier}`) + ' · ' + $t('identity.actual')"
          >
            <el-input-number
              :model-value="vehicle.totalPrice"
              :min="0"
              :precision="2"
              :disabled="!editable"
              @change="
                vehicle.totalPrice = Number($event);
                vehicle.pricingMode = 'manual';
                vehicle.adjustmentReason = '';
              "
            />
          </el-form-item>
          <el-form-item :label="$t('identity.reference')">
            <el-button
              :disabled="!editable || calculateVehiclePlanAutomaticTotal(vehicle) == null"
              @click="
                vehicle.pricingMode = 'automatic';
                vehicle.totalPrice = calculateVehiclePlanAutomaticTotal(vehicle);
                vehicle.adjustmentReason = '';
              "
            >
              {{ $t("identity.automatic") }} ·
              {{ calculateVehiclePlanAutomaticTotal(vehicle) ?? 0 }}
            </el-button>
          </el-form-item>
          <el-form-item :label="$t('identity.reason')" :required="vehicleNeedsReason(vehicle)">
            <el-input
              v-if="vehicleNeedsReason(vehicle)"
              :model-value="vehicle.adjustmentReason ?? ''"
              :disabled="!editable"
              :placeholder="$t('identity.reasonPlaceholder')"
              @update:model-value="vehicle.adjustmentReason = $event"
            />
            <el-text v-else type="info">
              {{ $t("identity.reasonNotNeeded") }}
            </el-text>
          </el-form-item>
        </div>
      </el-form>
      <el-empty v-else :description="$t('identity.noPriceItems')" />
      <el-collapse @change="loadHistory">
        <el-collapse-item :title="$t('identity.history')" name="history">
          <el-table v-loading="isHistoryLoading" :data="history" size="small">
            <el-table-column prop="itemName" :label="$t('identity.actual')" />
            <el-table-column :label="$t('identity.actual')">
              <template #default="{ row }">
                {{ row.beforePrice ?? "0" }} → {{ row.afterPrice }}
              </template>
            </el-table-column>
            <el-table-column prop="reason" :label="$t('identity.reason')" />
            <el-table-column prop="operatorName" :label="$t('identity.operator')" />
            <el-table-column :label="$t('identity.time')">
              <template #default="{ row }">
                {{ formatDateTime(row.occurredAt) }}
              </template>
            </el-table-column>
          </el-table>
        </el-collapse-item>
      </el-collapse>
    </el-card>
    <template #footer>
      <el-button @click="emit('cancel')">
        {{ $t(editable ? "common.cancel" : "common.close") }}
      </el-button>
      <el-button v-if="editable" type="primary" :loading="saving" @click="emit('save')">
        {{ $t("itinerary.save") }}
      </el-button>
    </template>
  </el-dialog>
</template>
<script setup lang="ts">
import { ElMessage } from "element-plus";
import type { ItineraryRecord, ItineraryVehiclePlan, PriceAdjustment } from "@/types/itinerary";
import {
  itineraryPriceRows,
  resourcePriceNeedsReason,
  vehiclePriceNeedsReason,
} from "../price-adjustments";
import { calculateVehiclePlanAutomaticTotal } from "../vehicle-plans";
import { inquiryService } from "@/services/inquiry.service";
import { formatMoney, formatDateTime } from "@/utils";
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
const activeVehiclePlans = computed(() =>
  props.plan.vehiclePlans.filter(
    (vehicle) => vehicle.arrangements.length && vehicleNeedsReason(vehicle),
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
function changePrice(row: ReturnType<typeof itineraryPriceRows>[number], value: number) {
  row.set(value);
  row.fields.adjustmentReason = "";
}
function needsReason(row: ReturnType<typeof itineraryPriceRows>[number]) {
  return resourcePriceNeedsReason(row, savedRows.value.get(row.key));
}
function vehicleNeedsReason(vehicle: ItineraryVehiclePlan) {
  return vehiclePriceNeedsReason(
    vehicle,
    props.savedPlan?.vehiclePlans.find((saved) => saved.tier === vehicle.tier),
  );
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
:deep(.el-form:not(.el-form--inline) .el-form-item > .el-form-item__label) {
  max-width: 100%;
}
</style>
