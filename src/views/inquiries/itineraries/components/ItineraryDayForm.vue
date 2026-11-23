<template>
  <el-form label-position="top" @submit.prevent>
    <ItineraryDayPanel :columns="3">
      <ItineraryDayRouteFields
        :day="day"
        :destinations="destinations"
        :editable="editable"
        :is-last="isLast"
        @update-field="updateField"
        @update-via="emit('update-via', $event)"
      />
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
    </ItineraryDayPanel>
  </el-form>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import type { ItineraryDayRecord, ItineraryEditableDayField } from "@/types/itinerary";
import { getTransportMethodOptions } from "@/utils/transport-method";
import ItineraryDayRouteFields from "./ItineraryDayRouteFields.vue";
import ItineraryDayPanel from "./ItineraryDayPanel.vue";

type EditableDayField = ItineraryEditableDayField;

const props = defineProps<{
  day: ItineraryDayRecord;
  isLast: boolean;
  destinations: string[];
  editable: boolean;
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
</script>
