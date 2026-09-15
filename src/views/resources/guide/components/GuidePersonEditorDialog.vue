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
      <el-form-item
        v-if="isHeadquarters && !isEditing"
        :label="$t('identity.businessUnit')"
        prop="library"
      >
        <el-select
          v-model="selectedBusinessUnit"
          class="w-full"
          :placeholder="$t('identity.selectBusinessUnitToCreate')"
          @change="setBusinessUnit"
        >
          <el-option
            v-for="unit in ['shengxu', 'linxi', 'website']"
            :key="unit"
            :value="unit"
            :label="$t(`identity.scopes.${unit}`)"
          />
        </el-select>
      </el-form-item>
      <el-form-item
        v-else
        :label="$t('identity.library')"
      >
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
      <el-form-item :label="$t('guide.age')">
        <el-input-number
          v-model="form.age"
          :min="0"
          :precision="0"
          controls-position="right"
          class="w-full"
        />
      </el-form-item>
      <el-form-item :label="$t('guide.contact')">
        <el-input v-model="form.contact" />
      </el-form-item>
      <el-form-item :label="$t('guide.employmentType')">
        <el-select
          v-model="form.employmentType"
          clearable
          class="w-full"
        >
          <el-option
            :label="$t('guide.fullTime')"
            value="full_time"
          />
          <el-option
            :label="$t('guide.partTime')"
            value="part_time"
          />
        </el-select>
      </el-form-item>
      <el-form-item :label="$t('guide.hasLaborContract')">
        <el-select
          v-model="form.hasLaborContract"
          :empty-values="[null, undefined]"
          clearable
          class="w-full"
        >
          <el-option
            :label="$t('guide.contractYes')"
            :value="true"
          />
          <el-option
            :label="$t('guide.contractNo')"
            :value="false"
          />
        </el-select>
      </el-form-item>
      <el-form-item :label="$t('guide.remark')">
        <el-input
          v-model="form.remark"
          type="textarea"
          :rows="3"
        />
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
import { computed, reactive, ref, watch } from "vue";
import type { FormInstance, FormRules } from "element-plus";
import { useI18n } from "vue-i18n";
import ResourceLibraryTag from "@/components/ResourceLibraryTag.vue";
import { useUserStore } from "@/stores/user";
import type { LoginScope } from "@/types/auth";
import type { GuidePersonRecord } from "@/types/resource";

const props = defineProps<{ modelValue: boolean; record: GuidePersonRecord; isEditing: boolean }>();
const emit = defineEmits<{ 'update:modelValue': [boolean]; submit: [GuidePersonRecord] }>();
const { t } = useI18n();
const userStore = useUserStore();
const isHeadquarters = computed(() => userStore.userInfo.scope === 'headquarters');
const selectedBusinessUnit = ref<Exclude<LoginScope, 'headquarters'> | ''>('');
const formRef = ref<FormInstance>();
const form = reactive<GuidePersonRecord>({ ...props.record });
const rules: FormRules = {
  name: [{ required: true, whitespace: true, message: t('guide.nameRequired'), trigger: 'blur' }],
  library: [{ required: true, message: t('identity.selectBusinessUnitToCreate'), trigger: 'change' }],
};
watch(() => [props.modelValue, props.record] as const, ([visible, record]) => {
  if (!visible) return;
  Object.assign(form, record, {
    contact: record.contact ?? "",
    remark: record.remark ?? "",
    certificateNo: record.certificateNo ?? "",
    identityNumber: record.identityNumber ?? "",
  });
  if (isHeadquarters.value && !props.isEditing) {
    selectedBusinessUnit.value = '';
    form.library = undefined;
  }
  formRef.value?.clearValidate();
});
function setBusinessUnit(unit: Exclude<LoginScope, 'headquarters'>) {
  form.library = unit === 'shengxu' ? 'shengxu' : 'shared';
  formRef.value?.validateField('library');
}
async function handleSubmit() {
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid) return;
  emit('submit', {
    ...form,
    name: form.name.trim(),
    contact: form.contact === "" ? null : form.contact,
    remark: form.remark === "" ? null : form.remark,
    certificateNo: form.certificateNo === "" ? null : form.certificateNo,
    identityNumber: form.identityNumber === "" ? null : form.identityNumber,
  });
}
</script>
