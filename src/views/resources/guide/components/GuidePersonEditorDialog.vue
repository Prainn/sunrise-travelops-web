<template>
  <AppDialog
    :model-value="modelValue"
    :title="$t(isEditing ? 'guide.editGuide' : 'guide.createGuide')"
    size="md"
    :busy="isSubmitting"
    @close="emit('update:modelValue', false)"
  >
    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      :disabled="isSubmitting"
      label-position="left"
      label-width="100px"
    >
      <el-form-item :label="$t('guide.name')" prop="name">
        <el-input v-model="form.name" />
      </el-form-item>
      <el-form-item :label="$t('common.gender')">
        <el-select v-model="form.gender" autocomplete="new-password" class="w-full">
          <el-option
            v-for="item in [0, 1, 2]"
            :key="item"
            :label="$t(`guide.genderOptions.${item}`)"
            :value="item"
          />
        </el-select>
      </el-form-item>
      <el-form-item :label="$t('guide.age')">
        <StrictInputNumber
          v-model="form.age"
          :min="0"
          :precision="0"
          controls-position="right"
          class="w-full"
        />
      </el-form-item>
      <el-form-item :label="$t('common.language')">
        <el-input v-model="form.language" />
      </el-form-item>
      <el-form-item :label="$t('guide.contact')">
        <el-input v-model="form.contact" />
      </el-form-item>
      <el-form-item :label="$t('guide.employmentType')">
        <el-select
          v-model="form.employmentType"
          autocomplete="new-password"
          clearable
          class="w-full"
        >
          <el-option :label="$t('guide.fullTime')" value="full_time" />
          <el-option :label="$t('guide.partTime')" value="part_time" />
        </el-select>
      </el-form-item>
      <el-form-item :label="$t('guide.hasLaborContract')">
        <el-select
          v-model="form.hasLaborContract"
          autocomplete="new-password"
          :empty-values="[null, undefined]"
          clearable
          class="w-full"
        >
          <el-option :label="$t('guide.contractYes')" :value="true" />
          <el-option :label="$t('guide.contractNo')" :value="false" />
        </el-select>
      </el-form-item>

      <el-form-item :label="$t('guide.certificateNo')">
        <el-input v-model="form.certificateNo" />
      </el-form-item>
      <el-form-item :label="$t('guide.identityNumber')">
        <el-input v-model="form.identityNumber" />
      </el-form-item>
      <el-form-item :label="$t('common.status')">
        <el-select v-model="form.status" autocomplete="new-password" class="w-full">
          <el-option :label="$t('common.enabled')" value="enabled" />
          <el-option :label="$t('common.disabled')" value="disabled" />
        </el-select>
      </el-form-item>
      <el-form-item :label="$t('common.remark')">
        <el-input v-model="form.remark" type="textarea" :rows="3" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button :disabled="isSubmitting" @click="emit('update:modelValue', false)">
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
  </AppDialog>
</template>

<script setup lang="ts">
import StrictInputNumber from "@/components/StrictInputNumber/index.vue";
import { computed, reactive, watch } from "vue";
import type { FormInstance, FormRules } from "element-plus";
import { useI18n } from "vue-i18n";
import AppDialog from "@/components/AppDialog/index.vue";
import type { GuidePersonRecord } from "@/types/resource";
import { useResourceFormSubmit } from "../../useResourceFormSubmit";

const props = defineProps<{
  modelValue: boolean;
  record: GuidePersonRecord;
  isEditing: boolean;
  submit: (record: GuidePersonRecord) => Promise<void>;
}>();
const emit = defineEmits<{ "update:modelValue": [boolean] }>();
const { t } = useI18n();
const formRef = ref<FormInstance>();
const { isSubmitting, isSaving, submitForm } = useResourceFormSubmit(formRef);
const form = reactive<GuidePersonRecord>({ ...props.record });
const rules = computed<FormRules>(() => ({
  name: [{ required: true, whitespace: true, message: t("guide.nameRequired"), trigger: "blur" }],
}));
watch(
  () => [props.modelValue, props.record] as const,
  ([visible, record]) => {
    if (!visible) return;
    Object.assign(form, record, {
      language: record.language ?? "",
      contact: record.contact ?? "",
      remark: record.remark ?? "",
      certificateNo: record.certificateNo ?? "",
      identityNumber: record.identityNumber ?? "",
    });
    formRef.value?.clearValidate();
  },
);
async function handleSubmit() {
  await submitForm(async () => {
    await props.submit({
      ...form,
      name: form.name.trim(),
      language: form.language === "" ? null : form.language,
      contact: form.contact === "" ? null : form.contact,
      remark: form.remark === "" ? null : form.remark,
      certificateNo: form.certificateNo === "" ? null : form.certificateNo,
      identityNumber: form.identityNumber === "" ? null : form.identityNumber,
    });
  });
}
</script>
