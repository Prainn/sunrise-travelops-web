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
        :title="$t('itinerary.plannedDaysMismatchHint', { inquiryDays: plannedDays })"
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
import { computed, reactive, ref, watch } from "vue";
import type { FormInstance, FormRules } from "element-plus";
import { useI18n } from "vue-i18n";
import type { ItineraryRecord } from "@/types/itinerary";
import { addDays } from "@/utils";

const props = defineProps<{
  modelValue: boolean;
  record: ItineraryRecord;
  plannedDays: number;
  isEditing?: boolean;
}>();
const emit = defineEmits<{ "update:modelValue": [value: boolean]; submit: [record: ItineraryRecord] }>();
const { t } = useI18n();
const formRef = ref<FormInstance>();
const form = reactive<ItineraryRecord>({ ...props.record, quote: { ...props.record.quote }, dailyPlans: [] });
const rules = computed<FormRules>(() => ({
  title: [{ required: true, message: t("itinerary.titleRequired"), trigger: "blur" }],
  startDate: [{ required: true, message: t("itinerary.startDateRequired"), trigger: "change" }],
  adults: [{ required: true, message: t("itinerary.adultsRequired"), trigger: "blur" }],
  operationsCoordinator: [{ required: true, message: t("itinerary.coordinatorRequired"), trigger: "change" }],
}));

const hasDayCountMismatch = computed(() => form.days !== props.plannedDays);

watch(() => [props.modelValue, props.record] as const, ([visible, record]) => {
  if (!visible) return;
  Object.assign(form, record, {
    days: props.isEditing ? record.dailyPlans.length || record.days : props.plannedDays,
    quote: { ...record.quote },
    dailyPlans: [],
  });
  syncEndDate();
}, { deep: true });

watch(() => [form.startDate, form.days], syncEndDate);

async function submitForm() {
  if (!await formRef.value?.validate().catch(() => false)) return;
  emit("submit", { ...form, quote: { ...form.quote }, dailyPlans: [] });
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
