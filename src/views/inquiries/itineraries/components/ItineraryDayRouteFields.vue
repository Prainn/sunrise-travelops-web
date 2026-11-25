<template>
  <div :class="initialPlanning ? '' : 'col-span-2 grid grid-cols-2 gap-[14px_16px] max-[900px]:col-span-1 max-[900px]:grid-cols-1'">
    <el-form-item :label="$t('itinerary.departure')" :prop="initialPlanning ? 'departure' : undefined" :rules="cityRule">
      <el-input
        v-if="day.dayNumber === 1"
        :model-value="day.departure"
        :disabled="!editable"
        :placeholder="$t('itinerary.departure')"
        @update:model-value="emit('update-field', 'departure', $event)"
      />
      <el-select
        v-else
        autocomplete="new-password"
        :model-value="day.departure"
        :disabled="!editable"
        filterable
        clearable
        @update:model-value="emit('update-field', 'departure', $event ?? '')"
      >
        <el-option
          v-for="city in destinations"
          :key="city"
          :label="city"
          :value="city"
        />
      </el-select>
    </el-form-item>
    <el-form-item :label="$t('itinerary.destination')" :prop="initialPlanning ? 'destination' : undefined" :rules="cityRule">
      <el-select
        autocomplete="new-password"
        :model-value="day.destination"
        :disabled="!editable"
        :allow-create="isLast"
        filterable
        clearable
        @update:model-value="emit('update-field', 'destination', $event ?? '')"
      >
        <el-option
          v-for="city in destinations"
          :key="city"
          :label="city"
          :value="city"
        />
      </el-select>
    </el-form-item>
    <ItineraryViaCities
      :key="day.id"
      :model-value="day.viaDestinations"
      :options="viaOptions"
      :disabled="!editable"
      :compact="initialPlanning"
      @update:model-value="emit('update-via', $event)"
    />
  </div>
  <el-form-item :label="$t('websitePrint.overnightColumn')" :prop="initialPlanning ? 'overnightDestination' : undefined" :rules="stayRule">
    <el-select
      :aria-label="$t('websitePrint.overnightColumn')"
      autocomplete="new-password"
      :model-value="day.overnightDestination"
      :disabled="!editable || (!initialPlanning && !isLast) || day.overnightDestination === ''"
      :placeholder="day.overnightDestination === '' ? $t('itinerary.noOvernightStay') : $t('itinerary.overnightPending')"
      @update:model-value="emit('update-field', 'overnightDestination', $event)"
    >
      <el-option
        v-for="city in destinations"
        :key="city"
        :label="city"
        :value="city"
      />
    </el-select>
    <el-checkbox
      class="mt-2"
      :model-value="day.overnightDestination === ''"
      :disabled="!editable"
      @update:model-value="emit('update-field', 'overnightDestination', $event ? '' : defaultStay)"
    >
      {{ $t("itinerary.noOvernightStay") }}
    </el-checkbox>
  </el-form-item>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { FormItemRule } from "element-plus";
import { useI18n } from "vue-i18n";
import type { ItineraryDayRecord } from "@/types/itinerary";
import ItineraryViaCities from "./ItineraryViaCities.vue";

const props = defineProps<{
  day: ItineraryDayRecord;
  destinations: string[];
  editable: boolean;
  isLast: boolean;
  initialPlanning?: boolean;
}>();
const emit = defineEmits<{
  "update-field": [field: "departure" | "destination" | "overnightDestination", value: string | null];
  "update-via": [cities: string[]];
}>();
const { t } = useI18n();
const defaultStay = computed(() => {
  const arrival = props.day.destination;
  if (props.initialPlanning && !props.destinations.includes(arrival)) return null;
  return arrival || null;
});
const cityRule = computed<FormItemRule | undefined>(() => props.initialPlanning
  ? { required: true, whitespace: true, message: t("itineraryWorkspace.routeCityRequired"), trigger: "change" }
  : undefined);
const stayRule = computed<FormItemRule | undefined>(() => props.initialPlanning ? {
  required: true,
  trigger: "change",
  validator: (_rule, value: string | null, done) =>
    done(value === "" || (value && props.destinations.includes(value)) ? undefined : new Error(t("itinerary.overnightPending"))),
} : undefined);

const viaOptions = computed(() => props.destinations
  .filter(city => city !== props.day.departure && city !== props.day.destination)
  .map(city => ({ value: city, label: city })));
</script>
