<template>
  <el-dialog
    :model-value="modelValue"
    :title="$t(isEditing ? 'guide.editPrice' : 'guide.createPrice')"
    width="460px"
    :show-close="!isSubmitting"
    :close-on-click-modal="!isSubmitting"
    :close-on-press-escape="!isSubmitting"
    @close="emit('update:modelValue', false)"
  >
    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      :disabled="isSubmitting"
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
            :label="businessUnitName(unit)"
          />
        </el-select>
      </el-form-item>
      <el-form-item v-else :label="$t('identity.library')">
        <ResourceLibraryTag :library="form.library" />
      </el-form-item>
      <el-form-item :label="$t('guide.referenceDailyPrice')" prop="dailyPrice">
        <el-input-number v-model="form.dailyPrice" :min="0" :precision="2" />
      </el-form-item>
      <el-form-item :label="$t('planning.secondLanguage')" prop="secondLanguage">
        <el-select v-model="form.secondLanguage">
          <el-option
            v-for="item in GUIDE_LANGUAGE_OPTIONS"
            :key="item.value"
            :value="item.value"
            :label="$t(`planning.languages.${item.value}`)"
          />
        </el-select>
      </el-form-item>
      <el-form-item :label="$t('planning.shopping')">
        <el-switch
          v-model="form.shopping"
          :active-text="$t('common.yes')"
          :inactive-text="$t('common.no')"
        />
      </el-form-item>
      <el-form-item :label="$t('common.status')">
        <el-select v-model="form.status" class="w-full">
          <el-option :label="$t('common.enabled')" value="enabled" />
          <el-option :label="$t('common.disabled')" value="disabled" />
        </el-select>
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
  </el-dialog>
</template>
<script setup lang="ts">
import ResourceLibraryTag from "@/components/ResourceLibraryTag.vue";
import { computed, reactive, ref, watch } from "vue";
import type { FormInstance, FormRules } from "element-plus";
import { useI18n } from "vue-i18n";
import { businessUnitName } from "@/constants/identity";
import { selectedResourceBusinessUnit } from "@/services/resource-library";
import { useUserStore } from "@/stores/user";
import type { LoginScope } from "@/types/auth";
import { GUIDE_LANGUAGE_OPTIONS, type GuideRecord } from "@/types/resource";
import { useResourceFormSubmit } from "../../useResourceFormSubmit";

const props = defineProps<{
  modelValue: boolean;
  record: GuideRecord;
  isEditing: boolean;
  submit: (record: GuideRecord) => Promise<void>;
}>();
const emit = defineEmits<{ "update:modelValue": [boolean] }>();
const { t } = useI18n();
const userStore = useUserStore();
const isHeadquarters = computed(() => userStore.userInfo.scope === "headquarters");
const selectedBusinessUnit = ref<Exclude<LoginScope, "headquarters"> | "">("");
const formRef = ref<FormInstance>();
const { isSubmitting, isSaving, submitForm } = useResourceFormSubmit(formRef);
const form = reactive({ ...props.record });
const rules = computed<FormRules>(() => ({
  library: [
    { required: true, message: t("identity.selectBusinessUnitToCreate"), trigger: "change" },
  ],
  dailyPrice: [
    {
      required: true,
      message: t("resource.fieldRequired", { field: t("guide.referenceDailyPrice") }),
      trigger: "change",
    },
  ],
  secondLanguage: [
    {
      required: true,
      message: t("resource.fieldRequired", { field: t("planning.secondLanguage") }),
      trigger: "change",
    },
  ],
}));
watch(
  () => [props.modelValue, props.record] as const,
  ([visible, record]) => {
    if (visible) {
      Object.assign(form, record);
      if (!props.isEditing) {
        if (isHeadquarters.value) {
          selectedBusinessUnit.value = selectedResourceBusinessUnit.value ?? "";
          if (selectedBusinessUnit.value) {
            form.library = selectedBusinessUnit.value === "shengxu" ? "shengxu" : "shared";
          } else {
            form.library = undefined;
          }
        } else {
          form.library = userStore.userInfo.resourceLibrary ?? undefined;
        }
      }
      formRef.value?.clearValidate();
    }
  },
);

function setBusinessUnit(unit: Exclude<LoginScope, "headquarters">) {
  form.library = unit === "shengxu" ? "shengxu" : "shared";
  formRef.value?.validateField("library");
}

async function handleSubmit() {
  await submitForm(() => props.submit({ ...form }));
}
</script>
