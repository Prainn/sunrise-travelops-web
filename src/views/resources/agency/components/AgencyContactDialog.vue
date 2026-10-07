<template>
  <el-dialog
    v-model="isVisible"
    :title="$t(isEditing ? 'resource.editContactTitle' : 'resource.createContactTitle')"
    width="480px"
    :show-close="!isSubmitting"
    :close-on-click-modal="!isSubmitting"
    :close-on-press-escape="!isSubmitting"
    destroy-on-close
    @closed="resetForm"
  >
    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      :disabled="isSubmitting"
      label-width="auto"
    >
      <el-form-item :label="$t('resource.personName')" prop="name">
        <el-input v-model.trim="form.name" />
      </el-form-item>
      <el-form-item :label="$t('resource.phone')">
        <el-input v-model.trim="form.phone" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button :disabled="isSubmitting" @click="isVisible = false">
        {{ $t("common.cancel") }}
      </el-button>
      <el-button
        type="primary"
        :loading="isSaving"
        :disabled="isSubmitting"
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
import type { AgencyContactRecord } from "@/types/resource";
import { useResourceFormSubmit } from "../../useResourceFormSubmit";

const props = defineProps<{
  modelValue: boolean;
  record: AgencyContactRecord;
  submit: (record: AgencyContactRecord) => Promise<void>;
  isEditing: boolean;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
}>();

const { t } = useI18n();
const formRef = ref<FormInstance>();
const { isSubmitting, isSaving, submitForm } = useResourceFormSubmit(formRef);
const form = reactive<AgencyContactRecord>({ ...props.record });
const isVisible = computed({
  get: () => props.modelValue,
  set: (value) => emit("update:modelValue", value),
});
const rules = computed<FormRules>(() => ({
  name: [
    {
      required: true,
      message: t("resource.fieldRequired", { field: t("resource.personName") }),
      trigger: "blur",
    },
  ],
}));

watch(
  () => props.record,
  (record) => Object.assign(form, record),
);

function resetForm() {
  formRef.value?.clearValidate();
}

async function handleSubmit() {
  await submitForm(() => props.submit({ ...form }));
}
</script>
