<template>
  <el-dialog
    :model-value="modelValue"
    :title="$t('itinerary.editItinerary')"
    width="min(680px, calc(100vw - 32px))"
    class="max-[550px]:mt-[16px]!"
    destroy-on-close
    @open="resetForm"
    @close="emit('update:modelValue', false)"
  >
    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-position="top"
    >
      <div class="grid grid-cols-2 gap-x-5 max-[550px]:grid-cols-1">
        <el-form-item :label="$t('websiteItineraryUi.title')" prop="title" class="col-span-full">
          <el-input v-model.trim="form.title" maxlength="150" />
        </el-form-item>
        <el-form-item :label="$t('websiteItineraryUi.plannedDays')" prop="duration">
          <el-input-number
            v-model="form.duration"
            :min="1"
            :max="365"
            :precision="0"
            class="w-full!"
          />
        </el-form-item>
        <el-form-item :label="$t('common.startDate')">
          <el-date-picker
            v-model="form.startDate"
            value-format="YYYY-MM-DD"
            clearable
            class="w-full!"
          />
        </el-form-item>
        <el-form-item :label="$t('websiteItineraryUi.pax')">
          <el-input-number
            v-model="form.pax"
            :min="1"
            :max="10000"
            :precision="0"
            class="w-full!"
          />
        </el-form-item>
        <el-form-item :label="$t('websiteItineraryUi.arrivalTime')">
          <el-input v-model="form.arrivalTime" maxlength="100" />
        </el-form-item>
        <el-form-item :label="$t('websiteItineraryUi.departureTime')">
          <el-input v-model="form.departureTime" maxlength="100" />
        </el-form-item>
      </div>
    </el-form>
    <template #footer>
      <el-button @click="emit('update:modelValue', false)">
        {{ $t("common.cancel") }}
      </el-button>
      <el-button type="primary" @click="submitForm">
        {{ $t("common.confirm") }}
      </el-button>
    </template>
  </el-dialog>
</template>
<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import type { FormInstance, FormRules } from "element-plus";
import { useI18n } from "vue-i18n";
import type { WebsiteItinerary } from "@/types/website";

type Basics = Pick<WebsiteItinerary, "title" | "duration" | "startDate" | "pax" | "arrivalTime" | "departureTime">;
const props = defineProps<{ modelValue: boolean; plan: WebsiteItinerary }>();
const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  submit: [value: Basics];
}>();
const { t } = useI18n();
const formRef = ref<FormInstance>();
const form = reactive<Basics>(pickBasics());
const rules = computed<FormRules>(() => ({
  title: [{ required: true, whitespace: true, message: t("itinerary.titleRequired"), trigger: "blur" }],
  duration: [{ required: true, type: "integer", min: 1, max: 365, message: t("websiteInquiry.plannedDaysRange"), trigger: "change" }],
}));

function pickBasics(): Basics {
  const { title, duration, startDate, pax, arrivalTime, departureTime } = props.plan;
  return { title, duration, startDate, pax, arrivalTime, departureTime };
}
function resetForm() {
  Object.assign(form, pickBasics());
  formRef.value?.clearValidate();
}
async function submitForm() {
  if (!(await formRef.value?.validate().catch(() => false))) return;
  emit("submit", { ...form });
  emit("update:modelValue", false);
}
</script>
