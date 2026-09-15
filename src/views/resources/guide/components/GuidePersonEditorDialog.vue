<template>
  <el-dialog
    :model-value="modelValue"
    :title="$t(isEditing ? 'guide.editGuide' : 'guide.createGuide')"
    width="520px"
    @close="emit('update:modelValue', false)"
  >
    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-position="top"
    >
      <el-form-item :label="$t('identity.library')">
        <ResourceLibraryTag :library="form.library" />
      </el-form-item>
      <el-form-item
        :label="$t('guide.name')"
        prop="name"
      >
        <el-input v-model="form.name" />
      </el-form-item>
      <el-form-item :label="$t('guide.gender')">
        <el-select
          v-model="form.gender"
          class="w-full"
        >
          <el-option
            v-for="item in [0, 1, 2]"
            :key="item"
            :label="$t(`guide.genderOptions.${item}`)"
            :value="item"
          />
        </el-select>
      </el-form-item>
      <el-form-item :label="$t('guide.certificateNo')">
        <el-input v-model="form.certificateNo" />
      </el-form-item>
      <el-form-item :label="$t('guide.identityNumber')">
        <el-input v-model="form.identityNumber" />
      </el-form-item>
      <el-form-item :label="$t('common.status')">
        <el-select
          v-model="form.status"
          class="w-full"
        >
          <el-option
            :label="$t('common.enabled')"
            value="enabled"
          />
          <el-option
            :label="$t('common.disabled')"
            value="disabled"
          />
        </el-select>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="emit('update:modelValue', false)">
        {{ $t('common.cancel') }}
      </el-button>
      <el-button
        type="primary"
        @click="handleSubmit"
      >
        {{ $t('common.confirm') }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from "vue";
import type { FormInstance, FormRules } from "element-plus";
import { useI18n } from "vue-i18n";
import ResourceLibraryTag from "@/components/ResourceLibraryTag.vue";
import type { GuidePersonRecord } from "@/types/resource";

const props = defineProps<{ modelValue: boolean; record: GuidePersonRecord; isEditing: boolean }>();
const emit = defineEmits<{ 'update:modelValue': [boolean]; submit: [GuidePersonRecord] }>();
const { t } = useI18n();
const formRef = ref<FormInstance>();
const form = reactive<GuidePersonRecord>({ ...props.record });
const rules: FormRules = {
  name: [{ required: true, whitespace: true, message: t('guide.nameRequired'), trigger: 'blur' }],
};
watch(() => [props.modelValue, props.record] as const, ([visible, record]) => {
  if (!visible) return;
  Object.assign(form, record, {
    certificateNo: record.certificateNo ?? "",
    identityNumber: record.identityNumber ?? "",
  });
  formRef.value?.clearValidate();
});
async function handleSubmit() {
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid) return;
  emit('submit', {
    ...form,
    name: form.name.trim(),
    certificateNo: form.certificateNo === "" ? null : form.certificateNo,
    identityNumber: form.identityNumber === "" ? null : form.identityNumber,
  });
}
</script>
