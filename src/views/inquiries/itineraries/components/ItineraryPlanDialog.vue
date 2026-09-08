<template>
  <el-dialog
    :model-value="modelValue"
    :title="$t(isEditing ? 'itinerary.editTitle' : 'itinerary.createTitle')"
    width="680px"
    destroy-on-close
    @close="emit('update:modelValue', false)"
  >
    <el-form
      ref="formRef"
      class="itinerary-plan-dialog__form"
      :model="form"
      :rules="rules"
      label-position="top"
    >
      <el-form-item :label="$t('itinerary.code')">
        <el-input
          v-model="form.code"
          disabled
        />
      </el-form-item>
      <el-form-item
        :label="$t('itinerary.title')"
        prop="title"
      >
        <el-input v-model.trim="form.title" />
      </el-form-item>
      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item
            :label="$t('itinerary.adults')"
            prop="adults"
          >
            <el-input-number
              v-model="form.adults"
              :min="1"
            />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item :label="$t('itinerary.children')">
            <el-input-number
              v-model="form.childrenCount"
              :min="0"
            />
          </el-form-item>
        </el-col>
      </el-row>
      <el-row
        class="itinerary-plan-dialog__date-row"
        :gutter="16"
      >
        <el-col :span="8">
          <el-form-item :label="$t('inquiry.plannedDays')">
            <el-input-number
              v-model="form.days"
              :min="1"
              controls-position="right"
            />
            <span style="width: 100%; margin-top: 4px; color: var(--el-text-color-secondary)">{{ $t('itinerary.duration', plannedDuration(form.days)) }}</span>
          </el-form-item>
        </el-col>
        <el-col :span="8">
          <el-form-item
            :label="$t('common.startDate')"
            prop="startDate"
          >
            <el-date-picker
              v-model="form.startDate"
              type="date"
              value-format="YYYY-MM-DD"
              style="width: 100%"
            />
          </el-form-item>
        </el-col>
        <el-col :span="8">
          <el-form-item :label="$t('common.endDate')">
            <el-input
              :model-value="form.endDate"
              disabled
            />
          </el-form-item>
        </el-col>
      </el-row>
      <el-alert
        v-if="hasDayCountMismatch"
        class="itinerary-plan-dialog__day-hint"
        :title="$t('itinerary.plannedDaysMismatchHint', { plannedDuration: $t('itinerary.duration', plannedDuration(plannedDays)) })"
        type="warning"
        show-icon
        :closable="false"
      />
      <el-form-item
        :label="$t('itinerary.operationsCoordinator')"
        prop="operationsCoordinator"
      >
        <el-input
          v-model="form.operationsCoordinator"
          disabled
          style="width: 100%"
        />
      </el-form-item>
      <el-form-item
        :label="$t('itinerary.destinations')"
        prop="destinations"
      >
        <el-select
          v-model="form.destinations"
          multiple
          filterable
          :placeholder="$t('itinerary.destinationsPlaceholder')"
          style="width: 100%"
        >
          <el-option
            v-for="destination in destinationOptions"
            :key="destination"
            :label="destination"
            :value="destination"
          />
        </el-select>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="emit('update:modelValue', false)">
        {{ $t("common.cancel") }}
      </el-button>
      <el-button
        type="primary"
        @click="submitForm"
      >
        {{ $t(isEditing ? "common.confirm" : "itinerary.createAndManage") }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { plannedDuration } from "@/views/inquiries/itineraries/duration";
import { computed, reactive, ref, watch } from "vue";
import type { FormInstance, FormRules } from "element-plus";
import { useI18n } from "vue-i18n";
import type { ItineraryRecord } from "@/types/itinerary";
import { addDays } from "@/utils";

const props = defineProps<{
  modelValue: boolean;
  record: ItineraryRecord;
  plannedDays: number;
  destinationOptions: string[];
  isEditing?: boolean;
}>();
const emit = defineEmits<{ "update:modelValue": [value: boolean]; submit: [record: ItineraryRecord] }>();
const { t } = useI18n();
const formRef = ref<FormInstance>();
const form = reactive<ItineraryRecord>({
  ...props.record,
  destinations: [...props.record.destinations],
  hotelPlans: props.record.hotelPlans.map((plan) => ({ ...plan, hotels: plan.hotels.map((hotel) => ({ ...hotel })) })),
  guidePlans: props.record.guidePlans.map((plan) => ({ ...plan, dayIds: [...plan.dayIds] })),
  vehiclePlans: props.record.vehiclePlans.map((plan) => ({
    ...plan,
    vehicle: plan.vehicle ? { ...plan.vehicle } : null,
  })),
  quote: { ...props.record.quote, transportFees: props.record.quote.transportFees.map((fee) => ({ ...fee })), options: props.record.quote.options.map((option) => ({ ...option })) },
  dailyPlans: [],
});
const rules = computed<FormRules>(() => ({
  title: [{ required: true, message: t("itinerary.titleRequired"), trigger: "blur" }],
  startDate: [{ required: true, message: t("itinerary.startDateRequired"), trigger: "change" }],
  adults: [{ required: true, message: t("itinerary.adultsRequired"), trigger: "blur" }],
  operationsCoordinator: [{ required: true, message: t("itinerary.coordinatorRequired"), trigger: "change" }],
  destinations: [{ type: "array", required: true, min: 1, message: t("itinerary.destinationsRequired"), trigger: "change" }],
}));

const hasDayCountMismatch = computed(() => form.days !== props.plannedDays);

watch(() => [props.modelValue, props.record] as const, ([visible, record]) => {
  if (!visible) return;
  Object.assign(form, record, {
    days: props.isEditing ? record.dailyPlans.length || record.days : props.plannedDays,
    destinations: [...record.destinations],
    hotelPlans: record.hotelPlans.map((plan) => ({ ...plan, hotels: plan.hotels.map((hotel) => ({ ...hotel })) })),
    guidePlans: record.guidePlans.map((plan) => ({ ...plan, dayIds: [...plan.dayIds] })),
    vehiclePlans: record.vehiclePlans.map((plan) => ({
      ...plan,
      vehicle: plan.vehicle ? { ...plan.vehicle } : null,
    })),
    quote: { ...record.quote, transportFees: record.quote.transportFees.map((fee) => ({ ...fee })), options: record.quote.options.map((option) => ({ ...option })) },
    dailyPlans: [],
  });
  syncEndDate();
}, { deep: true });

watch(() => [form.startDate, form.days], syncEndDate);

async function submitForm() {
  if (!await formRef.value?.validate().catch(() => false)) return;
  emit("submit", {
    ...form,
    destinations: [...form.destinations],
    hotelPlans: form.hotelPlans.map((plan) => ({ ...plan, hotels: plan.hotels.map((hotel) => ({ ...hotel })) })),
    guidePlans: form.guidePlans.map((plan) => ({ ...plan, dayIds: [...plan.dayIds] })),
    vehiclePlans: form.vehiclePlans.map((plan) => ({
      ...plan,
      vehicle: plan.vehicle ? { ...plan.vehicle } : null,
    })),
    quote: { ...form.quote, transportFees: form.quote.transportFees.map((fee) => ({ ...fee })), options: form.quote.options.map((option) => ({ ...option })) },
    dailyPlans: [],
  });
}

function syncEndDate() {
  form.endDate = form.startDate && form.days ? addDays(form.startDate, form.days - 1) : "";
}
</script>

<style scoped lang="scss">
.itinerary-plan-dialog__form :deep(.el-form-item__label) { white-space: nowrap; }

.itinerary-plan-dialog__form :deep(.el-input-number) { width: 100%; }

.itinerary-plan-dialog__day-hint { margin-bottom: 18px; }
</style>
