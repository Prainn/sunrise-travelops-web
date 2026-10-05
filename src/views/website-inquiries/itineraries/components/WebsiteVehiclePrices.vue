<template>
  <el-card shadow="never" class="mb-4">
    <template #header>
      <strong>最终人民币人均报价</strong>
    </template>
    <el-form label-position="top" :disabled="!editable">
      <div class="grid grid-cols-5 gap-4 max-[1000px]:grid-cols-2 max-[550px]:grid-cols-1">
        <el-form-item v-for="option in VEHICLE_OPTIONS" :key="option.value" :label="option.label">
          <el-input
            :model-value="price(option.value) ?? ''"
            placeholder="不报价则留空"
            @update:model-value="setPrice(option.value, $event)"
          >
            <template #prepend>RMB</template>
            <template #append>PP</template>
          </el-input>
          <p class="text-xs m-0 mt-2 [color:var(--el-text-color-secondary)]">
            建议人数：舒适 {{ option.seats - 2 }}／经济 {{ option.seats - 1 }}／行李多
            {{ option.seats - 4 }}
          </p>
        </el-form-item>
      </div>
      <p class="m-0 text-sm">至少填写一项最终人均售价，报价包含车辆与司机服务。</p>
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
