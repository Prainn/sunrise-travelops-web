<template>
  <el-form
    class="day-form"
    label-position="top"
  >
    <el-form-item :label="$t('itinerary.departure')">
      <el-input
        :model-value="day.departure"
        :disabled="!editable"
        :placeholder="$t('itinerary.departure')"
        @update:model-value="updateField('departure', $event)"
      />
    </el-form-item>
    <el-form-item :label="$t('itinerary.destination')">
      <el-input
        :model-value="day.destination"
        :disabled="!editable"
        :placeholder="$t('itinerary.destination')"
        @update:model-value="updateField('destination', $event)"
      />
    </el-form-item>
    <el-form-item :label="$t('itinerary.transport')">
      <el-select
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
      class="day-form__full"
      :label="$t('itinerary.dayTitle')"
    >
      <el-input
        :model-value="day.title"
        :disabled="!editable"
        :placeholder="$t('itinerary.dayTitle')"
        @update:model-value="updateField('title', $event)"
      />
    </el-form-item>
    <el-form-item
      class="day-form__full"
      :label="$t('itinerary.dayDescription')"
    >
      <el-input
        :model-value="day.description"
        :disabled="!editable"
        type="textarea"
        :rows="3"
        :placeholder="$t('itinerary.dayDescription')"
        @update:model-value="updateField('description', $event)"
      />
    </el-form-item>
    <el-form-item :label="$t('itinerary.mealSummary')">
      <el-input
        :model-value="day.mealSummary"
        :disabled="!editable"
        :placeholder="$t('itinerary.mealSummary')"
        @update:model-value="updateField('mealSummary', $event)"
      />
    </el-form-item>
    <el-form-item :label="$t('itinerary.accommodationSummary')">
      <el-input
        :model-value="day.accommodationSummary"
        :disabled="!editable"
        :placeholder="$t('itinerary.accommodationSummary')"
        @update:model-value="updateField('accommodationSummary', $event)"
      />
    </el-form-item>
  </el-form>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import type { ItineraryDayRecord } from "@/types/itinerary";
import { getTransportMethodOptions } from "@/utils/transport-method";

type EditableDayField = "departure" | "destination" | "transport" | "title" | "description" | "mealSummary" | "accommodationSummary";

const props = defineProps<{ day: ItineraryDayRecord; editable: boolean }>();
const emit = defineEmits<{ "update-field": [field: EditableDayField, value: string] }>();
const { locale } = useI18n();
const transportCodes = computed(() => props.day.transport.split(",").filter(Boolean));
const transportOptions = computed(() => getTransportMethodOptions(locale.value));

function updateField(field: EditableDayField, value: string) {
  emit("update-field", field, value);
}
function updateTransport(values: string[]) {
  updateField("transport", values.join(","));
}
</script>

<style scoped lang="scss">
.day-form {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px 16px;
  padding: 16px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  background: var(--el-fill-color-extra-light);

  :deep(.el-form-item) { margin-bottom: 0; }
  :deep(.el-form-item__label) { padding-bottom: 6px; color: var(--el-text-color-regular); font-weight: 500; line-height: 20px; }
  :deep(.el-select) { width: 100%; }
  &__full { grid-column: 1 / -1; }
}

@media (width <= 900px) {
  .day-form {
    grid-template-columns: 1fr;
    &__full { grid-column: auto; }
  }
}
</style>
