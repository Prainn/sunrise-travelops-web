<template>
  <el-form label-position="top" @submit.prevent>
    <ItineraryDayPanel :columns="4">
      <el-form-item :label="$t('itinerary.departure')">
        <el-input
          v-if="day.dayNumber === 1"
          :model-value="day.departure"
          :disabled="!editable"
          :placeholder="$t('itinerary.departure')"
          @update:model-value="updateField('departure', $event)"
        />
        <el-select
          v-else
          autocomplete="new-password"
          :model-value="day.departure"
          :disabled="!editable"
          filterable
          clearable
          @update:model-value="updateField('departure', $event)"
        >
          <el-option
            v-for="city in destinations"
            :key="city"
            :label="city"
            :value="city"
          />
        </el-select>
      </el-form-item>
      <el-form-item :label="$t('itinerary.viaDestinations')">
        <el-select
          autocomplete="new-password"
          :model-value="day.viaDestinations"
          :disabled="!editable"
          multiple
          filterable
          :placeholder="$t('itinerary.viaDestinationsPlaceholder')"
          @update:model-value="emit('update-via', $event)"
        >
          <el-option
            v-for="city in destinations"
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
      </el-form-item>
      <el-form-item :label="$t('itinerary.destination')">
        <el-select
          autocomplete="new-password"
          :allow-create="allowCustomDestination"
          :model-value="day.destination"
          :disabled="!editable"
          filterable
          clearable
          @update:model-value="updateField('destination', $event)"
        >
          <el-option
            v-for="city in destinations"
            :key="city"
            :label="city"
            :value="city"
          />
        </el-select>
      </el-form-item>
      <el-form-item :label="$t('itinerary.overnightDestination')">
        <el-select
          autocomplete="new-password"
          :model-value="day.overnightDestination"
          :disabled="!editable || !isLast || day.overnightDestination === ''"
          :placeholder="day.overnightDestination === '' ? $t('itinerary.noOvernightStay') : $t('itinerary.overnightPending')"
          @update:model-value="updateField('overnightDestination', $event)"
        >
          <el-option
            v-for="destination in destinations"
            :key="destination"
            :label="destination"
            :value="destination"
          />
        </el-select>
        <el-checkbox
          v-if="isLast"
          class="mt-2"
          :model-value="day.overnightDestination === ''"
          :disabled="!editable"
          @update:model-value="toggleNoStay"
        >
          {{ $t("itinerary.noOvernightStay") }}
        </el-checkbox>
      </el-form-item>
      <el-form-item :label="$t('itinerary.transport')">
        <el-select
          autocomplete="new-password"
          :model-value="transportCodes"
          :disabled="!editable"
          multiple
          collapse-tags
          collapse-tags-tooltip
          :max-collapse-tags="2"
          :placeholder="$t('itinerary.transportPlaceholder')"
          @update:model-value="updateTransport"
        >
          <el-option
            v-for="option in transportOptions"
            :key="option.value"
            :label="option.label"
            :value="option.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item
        class="day-form__description [grid-column:1_/_-1]"
        :label="$t('itinerary.dayDescription')"
      >
        <el-input
          :model-value="day.description"
          :disabled="!editable"
          type="textarea"
          :rows="4"
          resize="vertical"
          :placeholder="$t('itinerary.dayDescriptionPlaceholder')"
          @update:model-value="updateField('description', $event)"
        />
      </el-form-item>
      <template v-if="english">
        <el-form-item :label="$t('itinerary.english.departure')">
          <el-input
            :model-value="day.departureEn"
            :disabled="!editable"
            maxlength="300"
            :placeholder="$t('itinerary.english.cityHint')"
            @update:model-value="updateField('departureEn', $event)"
          />
        </el-form-item>
        <el-form-item :label="$t('itinerary.english.destination')">
          <el-input
            :model-value="day.destinationEn"
            :disabled="!editable"
            maxlength="300"
            :placeholder="$t('itinerary.english.cityHint')"
            @update:model-value="updateField('destinationEn', $event)"
          />
        </el-form-item>
        <el-form-item :label="$t('itinerary.english.transport')" class="[grid-column:span_2]">
          <el-input
            :model-value="day.transportEn"
            :disabled="!editable"
            maxlength="100"
            :placeholder="$t('itinerary.english.transportHint')"
            @update:model-value="updateField('transportEn', $event)"
          />
        </el-form-item>
        <el-form-item class="[grid-column:1_/_-1]" :label="$t('itinerary.english.description')">
          <el-input
            :model-value="day.descriptionEn"
            :disabled="!editable"
            type="textarea"
            :rows="4"
            resize="vertical"
            maxlength="20000"
            @update:model-value="updateField('descriptionEn', $event)"
          />
        </el-form-item>
      </template>
    </ItineraryDayPanel>
  </el-form>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { ArrowLeft, ArrowRight } from "@element-plus/icons-vue";
import type { ItineraryDayRecord, ItineraryEditableDayField } from "@/types/itinerary";
import { getTransportMethodOptions } from "@/utils/transport-method";
import ItineraryDayPanel from "./ItineraryDayPanel.vue";

type EditableDayField = ItineraryEditableDayField;

const props = defineProps<{
  day: ItineraryDayRecord;
  isLast: boolean;
  allowCustomDestination: boolean;
  destinations: string[];
  editable: boolean;
  /** 盛旭行程显示对客英文字段。 */
  english: boolean;
}>();
const emit = defineEmits<{
  "update-field": [field: EditableDayField, value: string | null];
  "update-via": [cities: string[]];
}>();
const { locale } = useI18n();

const transportCodes = computed(() => props.day.transport.split(",").filter(Boolean));
const transportOptions = computed(() => getTransportMethodOptions(locale.value));

function updateField(field: EditableDayField, value: string | null) {
  emit("update-field", field, value);
}
function updateTransport(values: string[]) {
  updateField("transport", values.join(","));
}
/** 途经地按数组顺序输出到客户路线，相邻交换即可调整先后。 */
function moveVia(index: number, offset: -1 | 1) {
  const cities = [...props.day.viaDestinations];
  const target = index + offset;
  if (target < 0 || target >= cities.length) return;
  [cities[index], cities[target]] = [cities[target]!, cities[index]!];
  emit("update-via", cities);
}
function toggleNoStay(checked: string | number | boolean) {
  updateField("overnightDestination", checked ? "" : props.day.destination || null);
}
</script>
