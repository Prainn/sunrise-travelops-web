<template>
  <el-form-item v-if="showVehicle && mode === 'private_vehicle'" :label="$t('websiteReport.vehicleType')" prop="vehicleType">
    <BusinessDictionarySelect
      :model-value="modelValue.vehicleType"
      type-code="vehicle-type"
      sort-by-seat-count
      :limit-to-extra-options="restrictVehicles"
      :extra-options="uniqueVehicleOptions.map(option => ({ value: option.vehicleType, label: vehicleLabel(option.vehicleType) }))"
      :placeholder="$t(restrictVehicles ? 'common.selectPlaceholder' : 'websiteReport.vehicleSelectOrEnter')"
      @update:model-value="selectVehicle"
    />
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
  <el-form-item v-if="airportTransfers">
    <el-checkbox v-if="airportTransfers.pickup" :model-value="modelValue.isAirportPickup ?? false" @update:model-value="update('isAirportPickup', Boolean($event))">
      {{ $t("websiteItineraryUi.airportPickup") }}
    </el-checkbox>
    <el-checkbox v-if="airportTransfers.dropoff" :model-value="modelValue.isAirportDropoff ?? false" @update:model-value="update('isAirportDropoff', Boolean($event))">
      {{ $t("websiteItineraryUi.airportDropoff") }}
    </el-checkbox>
  </el-form-item>
</template>

<script setup lang="ts" generic="T extends Pick<WebsiteLeg, 'vehicleType' | 'distanceKm' | 'durationMinutes' | 'showInMileage' | 'isAirportPickup' | 'isAirportDropoff'>">
import BusinessDictionarySelect from "@/components/BusinessDictionarySelect/index.vue";
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import type { TransportMode, WebsiteLeg, WebsiteRouteVehicleOption } from "@/types/website";
import type { AirportTransferOptions } from "../airport-transfers";
import { VEHICLE_OPTIONS } from "../../options";

const props = withDefaults(defineProps<{
  modelValue: T;
  mode: TransportMode;
  airportTransfers?: AirportTransferOptions;
  vehicleOptions?: WebsiteRouteVehicleOption[];
  configuredVehiclesOnly?: boolean;
  showVehicle?: boolean;
  showMileage?: boolean;
  showDuration?: boolean;
}>(), { vehicleOptions: () => [], showVehicle: true, showMileage: true, showDuration: true });
const emit = defineEmits<{ "update:modelValue": [value: T] }>();
const { t } = useI18n();

const uniqueVehicleOptions = computed(() => [...new Map(props.vehicleOptions.map(option => [option.vehicleType, option])).values()]);
const restrictVehicles = computed(() => props.configuredVehiclesOnly && uniqueVehicleOptions.value.length > 0);
function selectVehicle(value: string | undefined, aliases: string[] = []) {
  const vehicleType = value?.trim() || null;
  if (vehicleType === props.modelValue.vehicleType) return;
  const matches = props.vehicleOptions.filter(option => option.vehicleType === vehicleType || aliases.includes(option.vehicleType));
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
