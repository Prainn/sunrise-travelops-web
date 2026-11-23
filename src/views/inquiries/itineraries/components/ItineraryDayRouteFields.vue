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
    <div :class="initialPlanning ? 'mb-3 flex min-w-0 flex-col items-stretch gap-1' : 'min-w-0 flex items-start gap-3'">
      <el-checkbox v-model="hasVia" :disabled="!editable" @change="toggleVia">
        {{ $t('itinerary.viaDestinations') }}
      </el-checkbox>
      <div v-if="hasVia" class="min-w-0 flex-1">
        <el-select
          :aria-label="$t('itinerary.viaDestinations')"
          autocomplete="new-password"
          :model-value="day.viaDestinations"
          :disabled="!editable"
          multiple
          :collapse-tags="initialPlanning"
          :collapse-tags-tooltip="initialPlanning"
          filterable
          :placeholder="$t('itinerary.viaDestinationsPlaceholder')"
          @update:model-value="emit('update-via', $event)"
        >
          <el-option
            v-for="city in viaOptions"
            :key="city"
            :label="city"
            :value="city"
          />
        </el-select>
        <div v-if="day.viaDestinations.length > 1" class="mt-2 flex flex-wrap items-center gap-1">
          <el-tag
            v-for="(city, index) in day.viaDestinations"
            :key="city"
            size="small"
            type="info"
            class="via-tag"
          >
            <el-button
              link
              size="small"
              :icon="ArrowLeft"
              :disabled="!editable || index === 0"
              :aria-label="$t('itinerary.moveViaEarlier', { city })"
              @click="moveVia(index, -1)"
            />
            {{ index + 1 }}. {{ city }}
            <el-button
              link
              size="small"
              :icon="ArrowRight"
              :disabled="!editable || index === day.viaDestinations.length - 1"
              :aria-label="$t('itinerary.moveViaLater', { city })"
              @click="moveVia(index, 1)"
            />
          </el-tag>
        </div>
      </div>
    </div>
  </div>
  <el-form-item :label="$t('itinerary.overnightDestination')" :prop="initialPlanning ? 'overnightDestination' : undefined" :rules="stayRule">
    <el-select
      :aria-label="$t('itinerary.overnightDestination')"
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
import { computed, ref, watch } from "vue";
import { ArrowLeft, ArrowRight } from "@element-plus/icons-vue";
import type { FormItemRule } from "element-plus";
import { useI18n } from "vue-i18n";
import type { ItineraryDayRecord } from "@/types/itinerary";

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

const hasVia = ref(props.day.viaDestinations.length > 0);
const viaOptions = computed(() => props.destinations.filter(city => city !== props.day.departure && city !== props.day.destination));
watch(() => props.day.id, () => { hasVia.value = props.day.viaDestinations.length > 0; });
watch(() => props.day.viaDestinations.length, count => { if (count) hasVia.value = true; });
function toggleVia(value: string | number | boolean) {
  if (!value) emit("update-via", []);
}

/** 途经地按数组顺序输出到客户路线，相邻交换即可调整先后。 */
function moveVia(index: number, offset: -1 | 1) {
  const cities = [...props.day.viaDestinations];
  const target = index + offset;
  if (target < 0 || target >= cities.length) return;
  [cities[index], cities[target]] = [cities[target]!, cities[index]!];
  emit("update-via", cities);
}
</script>
