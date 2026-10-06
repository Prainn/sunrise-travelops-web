<template>
  <el-card shadow="never" class="mb-4">
    <template #header>
      <strong>{{ $t("websiteItineraryUi.finalPrice") }}</strong>
    </template>
    <el-form label-position="top" :disabled="!editable">
      <div class="grid grid-cols-5 gap-4 max-[1000px]:grid-cols-2 max-[550px]:grid-cols-1">
        <el-form-item
          v-for="option in VEHICLE_OPTIONS"
          :key="option.value"
          :label="$t(option.labelKey)"
        >
          <el-input
            :model-value="price(option.value) ?? ''"
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
          <p class="text-xs m-0 mt-2 [color:var(--el-text-color-secondary)]">
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
  </el-card>
</template>
<script setup lang="ts">
import type { VehicleType, WebsiteItinerary } from "@/types/website";
import { VEHICLE_OPTIONS } from "../../options";
const props = defineProps<{ plan: WebsiteItinerary; editable: boolean }>();
function price(type: VehicleType) {
  return props.plan.vehiclePrices.find((item) => item.vehicleType === type)?.unitPrice;
}
function setPrice(type: VehicleType, value: string) {
  const existing = props.plan.vehiclePrices.find((item) => item.vehicleType === type);
  const unitPrice = value.trim() || null;
  if (existing) existing.unitPrice = unitPrice;
  else props.plan.vehiclePrices.push({ vehicleType: type, unitPrice });
}
</script>
