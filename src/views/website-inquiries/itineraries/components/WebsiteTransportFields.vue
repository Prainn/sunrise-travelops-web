<template>
  <el-form-item v-if="showVehicle && mode === 'private_vehicle'" :label="$t('websiteReport.vehicleType')" prop="vehicleType">
    <el-select
      :model-value="modelValue.vehicleType"
      clearable
      filterable
      allow-create
      default-first-option
      :maxlength="100"
      autocomplete="new-password"
      :placeholder="$t('websiteReport.vehicleSelectOrEnter')"
      @update:model-value="selectVehicle($event)"
    >
      <el-option
        v-for="option in uniqueVehicleOptions"
        :key="option.vehicleType"
        :value="option.vehicleType"
        :label="vehicleLabel(option.vehicleType)"
      />
    </el-select>
  </el-form-item>
  <el-form-item :label="$t('websiteReport.distanceKm')" prop="distanceKm">
    <el-input :model-value="modelValue.distanceKm ?? ''" :placeholder="$t('websiteReport.notSpecified')" @update:model-value="update('distanceKm', $event.trim() || null)" />
  </el-form-item>
  <el-form-item v-if="showDuration" :label="$t('websiteReport.durationMinutes')" prop="durationMinutes">
    <el-input-number
      :model-value="modelValue.durationMinutes"
      :min="1"
      :max="525600"
      :precision="0"
      :placeholder="$t('websiteReport.notSpecified')"
      @update:model-value="update('durationMinutes', $event ?? null)"
    />
  </el-form-item>
  <el-form-item v-if="showMileage" :label="$t('websiteReport.showInMileage')" prop="showInMileage">
    <el-switch :model-value="modelValue.showInMileage ?? false" @update:model-value="update('showInMileage', Boolean($event))" />
  </el-form-item>
</template>

<script setup lang="ts" generic="T extends Pick<WebsiteLeg, 'vehicleType' | 'distanceKm' | 'durationMinutes' | 'showInMileage'>">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import type { TransportMode, WebsiteLeg, WebsiteRouteVehicleOption } from "@/types/website";
import { VEHICLE_OPTIONS } from "../../options";

const props = withDefaults(defineProps<{ modelValue: T; mode: TransportMode; vehicleOptions?: WebsiteRouteVehicleOption[]; showVehicle?: boolean; showMileage?: boolean; showDuration?: boolean }>(), { vehicleOptions: () => [], showVehicle: true, showMileage: true, showDuration: true });
const emit = defineEmits<{ "update:modelValue": [value: T] }>();
const { t } = useI18n();

const uniqueVehicleOptions = computed(() => [...new Map(props.vehicleOptions.map(option => [option.vehicleType, option])).values()]);
function selectVehicle(value: string | undefined) {
  const vehicleType = value?.trim() || null;
  if (vehicleType === props.modelValue.vehicleType) return;
  const matches = props.vehicleOptions.filter(option => option.vehicleType === vehicleType);
  // Manual candidates can come from different resources; only use an unambiguous duration.
  const durations = new Set(matches.map(option => option.durationMinutes));
  const durationMinutes = durations.size === 1 ? matches[0]!.durationMinutes : null;
  emit("update:modelValue", { ...props.modelValue, vehicleType, durationMinutes });
}
function vehicleLabel(value: string) {
  const option = VEHICLE_OPTIONS.find(option => option.value === value);
  return option ? t(option.labelKey) : value;
}
function update<K extends keyof T>(key: K, value: T[K]) {
  emit("update:modelValue", { ...props.modelValue, [key]: value });
}
</script>
