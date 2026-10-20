<template>
  <AppDialog
    v-model="visible"
    size="xl"
    :title="$t('websiteItineraryUi.packagePriceTitle')"
  >
    <p class="m-0 mb-4 text-sm text-muted">
      {{ $t("websiteItineraryUi.packagePriceDescription") }}
    </p>
    <el-form label-position="top" :disabled="!editable">
      <div class="grid grid-cols-5 gap-4 max-[1200px]:grid-cols-3 max-[800px]:grid-cols-2 max-[550px]:grid-cols-1">
        <div
          v-for="option in VEHICLE_OPTIONS"
          :key="option.value"
          class="flex flex-col gap-2 p-3 rounded-[var(--custom-radius)] surface-muted [border:1px_solid_var(--divider-color)]"
        >
          <h4 class="m-0 text-[14px] text-strong font-600">
            {{ $t("websiteItineraryUi.vehiclePlanTitle", { vehicle: $t(option.labelKey) }) }}
          </h4>
          <el-form-item
            class="mb-0!"
            :label="$t('websiteItineraryUi.pricePerPerson')"
            :error="invalid(option.value) ? $t('websiteWorkspace.vehiclePriceInvalid') : ''"
          >
            <el-input
              :model-value="editable ? (price(option.value) ?? '') : displayPrice(option.value)"
              :placeholder="$t('websiteItineraryUi.pricePlaceholder')"
              :aria-label="`${$t('websiteItineraryUi.vehiclePlanTitle', { vehicle: $t(option.labelKey) })} · ${$t('websiteItineraryUi.pricePerPerson')}`"
              @update:model-value="setPrice(option.value, $event)"
            >
              <template #append>
                {{ $t("websiteItineraryUi.pricePerPersonUnit") }}
              </template>
            </el-input>
          </el-form-item>
          <p class="text-xs m-0 text-muted">
            {{
              $t("websiteItineraryUi.capacityHint", {
                comfortable: option.seats - 2,
                economy: option.seats - 1,
                luggage: option.seats - 4,
              })
            }}
          </p>
        </div>
      </div>
      <p class="m-0 mt-3 text-sm text-muted">
        {{ $t("websiteItineraryUi.finalPriceHint") }}
      </p>
    </el-form>
    <template #footer>
      <el-button type="primary" @click="visible = false">
        {{ $t(editable ? "common.confirm" : "common.close") }}
      </el-button>
    </template>
  </AppDialog>
</template>
<script setup lang="ts">
import AppDialog from "@/components/AppDialog/index.vue";
import { formatMoney } from "@/utils";
import { isValidVehiclePrice } from "../vehicle-price";
import type { VehicleType, WebsiteItinerary } from "@/types/website";
import { VEHICLE_OPTIONS } from "../../options";
/**
 * 整程套餐人均售价弹窗：按所用车型分别报价，不是单独车费；空值保持 null，0 是有效报价。
 * 直接编辑行程草稿，随“保存行程草稿”一并提交。
 */
const visible = defineModel<boolean>({ required: true });
const plan = defineModel<WebsiteItinerary>("plan", { required: true });
defineProps<{ editable: boolean }>();
function price(type: VehicleType) {
  return plan.value.vehiclePrices.find((item) => item.vehicleType === type)?.unitPrice;
}
function displayPrice(type: VehicleType) {
  const value = price(type);
  return value == null ? "" : formatMoney(value);
}
function invalid(type: VehicleType) {
  const value = price(type);
  return value != null && !isValidVehiclePrice(value);
}
function setPrice(type: VehicleType, value: string) {
  const existing = plan.value.vehiclePrices.find((item) => item.vehicleType === type);
  const unitPrice = value.trim() || null;
  if (existing) existing.unitPrice = unitPrice;
  else plan.value.vehiclePrices.push({ vehicleType: type, unitPrice });
}
</script>
