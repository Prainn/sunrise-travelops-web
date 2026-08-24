<template>
  <el-dialog
    v-model="isVisible"
    :title="$t(isEditing ? 'attraction.editAttraction' : 'attraction.createAttraction')"
    width="620px"
    destroy-on-close
  >
    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-width="auto"
    >
      <el-form-item :label="$t('resource.code')">
        <el-input
          v-model="form.code"
          disabled
        />
      </el-form-item>
      <el-form-item
        :label="$t('resource.attractionName')"
        prop="name"
      >
        <el-input v-model.trim="form.name" />
      </el-form-item>
      <el-form-item
        :label="$t('attraction.area')"
        prop="area"
      >
        <el-select
          v-model="form.area"
          filterable
        >
          <el-option
            v-for="area in YUNNAN_TOURISM_AREA_OPTIONS"
            :key="area"
            :label="area"
            :value="area"
          />
        </el-select>
      </el-form-item>
      <el-form-item
        :label="$t('attraction.category')"
        prop="category"
      >
        <el-select v-model="form.category">
          <el-option
            v-for="option in attractionCategoryOptions"
            :key="option.value"
            :label="$t(option.labelKey)"
            :value="option.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item :label="$t('attraction.restroomLocation')">
        <el-input
          v-model.trim="form.restroomLocation"
          type="textarea"
          :rows="2"
        />
      </el-form-item>
      <el-form-item :label="$t('common.remark')">
        <el-input
          v-model.trim="form.remark"
          type="textarea"
          :rows="3"
        />
      </el-form-item>
      <el-form-item :label="$t('common.status')">
        <el-radio-group v-model="form.status">
          <el-radio value="enabled">
            {{ $t("common.enabled") }}
          </el-radio>
          <el-radio value="disabled">
            {{ $t("common.disabled") }}
          </el-radio>
        </el-radio-group>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="isVisible = false">
        {{ $t("common.cancel") }}
      </el-button>
      <el-button
        type="primary"
        @click="handleSubmit"
      >
        {{ $t("common.confirm") }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";
import type { FormInstance, FormRules } from "element-plus";
import { useI18n } from "vue-i18n";
import { YUNNAN_TOURISM_AREA_OPTIONS } from "@/constants/yunnan-tourism-regions";
import type { AttractionRecord } from "@/data/data";
import { attractionCategoryOptions } from "../options";

const props = defineProps<{
  modelValue: boolean;
  record: AttractionRecord;
  isEditing: boolean;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  submit: [record: AttractionRecord];
}>();

const { t } = useI18n();
const formRef = ref<FormInstance>();
const form = reactive<AttractionRecord>({ ...props.record });
const isVisible = computed({ get: () => props.modelValue, set: (value) => emit("update:modelValue", value) });
const rules = computed<FormRules>(() => ({
  name: [{ required: true, message: t("attraction.nameRequired"), trigger: "blur" }],
  area: [{ required: true, message: t("attraction.areaRequired"), trigger: "change" }],
  category: [{ required: true, message: t("attraction.categoryRequired"), trigger: "change" }],
}));

watch(() => props.record, (record) => Object.assign(form, record), { deep: true });

async function handleSubmit() {
  if (!(await formRef.value?.validate().catch(() => false))) return;
  emit("submit", { ...form, prices: props.record.prices });
}
</script>
