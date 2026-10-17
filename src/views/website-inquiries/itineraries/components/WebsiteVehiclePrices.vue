<template>
  <SectionCard :title="$t('websiteItineraryUi.finalPrice')">
    <el-form label-position="top" :disabled="!editable">
      <div class="grid grid-cols-5 gap-4 max-[1000px]:grid-cols-2 max-[550px]:grid-cols-1">
        <el-form-item
          v-for="option in VEHICLE_OPTIONS"
          :key="option.value"
          :label="$t(option.labelKey)"
          :error="invalid(option.value) ? $t('websiteWorkspace.vehiclePriceInvalid') : ''"
        >
          <el-input
            :model-value="editable ? (price(option.value) ?? '') : formatMoney(price(option.value))"
            :placeholder="$t('websiteItineraryUi.pricePlaceholder')"
            @update:model-value="setPrice(option.value, $event)"
          >
            <template #prepend>
              RMB
            </template>
            <template #append>
              PP
            </template>
          </el-input>
          <p class="text-xs m-0 mt-2 text-muted">
            {{
              $t("websiteItineraryUi.capacityHint", {
                comfortable: option.seats - 2,
                economy: option.seats - 1,
                luggage: option.seats - 4,
              })
            }}
          </p>
        </el-form-item>
      </div>
      <p class="m-0 text-sm">
        {{ $t("websiteItineraryUi.finalPriceHint") }}
      </p>
    </el-form>
  </SectionCard>
</template>
<script setup lang="ts">
import SectionCard from "@/components/SectionCard/index.vue";
import { formatMoney } from "@/utils";
import { isValidVehiclePrice } from "../vehicle-price";
import type { VehicleType, WebsiteItinerary } from "@/types/website";
import { VEHICLE_OPTIONS } from "../../options";
const plan = defineModel<WebsiteItinerary>("plan", { required: true });
defineProps<{ editable: boolean }>();
function price(type: VehicleType) {
  return plan.value.vehiclePrices.find((item) => item.vehicleType === type)?.unitPrice;
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
