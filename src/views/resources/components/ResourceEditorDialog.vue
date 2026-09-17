<template>
  <el-dialog
    v-model="isVisible"
    :title="$t(titleKey)"
    width="560px"
    destroy-on-close
    @closed="resetForm"
  >
    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-width="auto"
    >
      <el-form-item
        v-if="isHeadquarters && !isEditing"
        :label="$t('identity.businessUnit')"
        prop="library"
      >
        <el-select
          v-model="selectedBusinessUnit"
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
        v-if="isEditing"
        :label="$t('resource.code')"
      >
        <el-input
          v-model="form.code"
          disabled
        />
      </el-form-item>
      <el-form-item
        v-for="field in fields"
        :key="field.prop"
        :label="$t(field.labelKey)"
        :prop="field.prop"
      >
        <CitySelect
          v-if="field.prop === 'city'"
          :library="form.library"
          :model-value="String(form[field.prop] ?? '')"
          @update:model-value="form[field.prop] = $event"
        />
        <el-input-number
          v-else-if="field.type === 'number'"
          :model-value="Number(form[field.prop] ?? 0)"
          :min="0"
          controls-position="right"
          @update:model-value="form[field.prop] = $event ?? 0"
        />
        <el-select
          v-else-if="field.type === 'select'"
          v-model="form[field.prop]"
        >
          <el-option
            v-for="option in field.options"
            :key="option.value"
            :label="option.label"
            :value="option.value"
          />
        </el-select>
        <el-input
          v-else
          v-model.trim="form[field.prop]"
          :disabled="field.disabled"
          :type="field.type === 'textarea' ? 'textarea' : 'text'"
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
import ResourceLibraryTag from "@/components/ResourceLibraryTag.vue";
import CitySelect from "@/components/CitySelect.vue";
import { computed, reactive, ref, watch } from "vue";
import type { FormInstance, FormRules } from "element-plus";
import { useI18n } from "vue-i18n";
import { useUserStore } from "@/stores/user";
import type { LoginScope } from "@/types/auth";
import type { ResourceFormField, ResourceRow } from "../types";

const props = defineProps<{
  modelValue: boolean;
  record: ResourceRow;
  fields: ResourceFormField[];
  titleKey: string;
  isEditing: boolean;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  submit: [record: ResourceRow];
}>();

const { t } = useI18n();
const userStore = useUserStore();
const isHeadquarters = computed(() => userStore.userInfo.scope === "headquarters");
const selectedBusinessUnit = ref<Exclude<LoginScope, "headquarters"> | "">("");
const formRef = ref<FormInstance>();
const form = reactive<ResourceRow>({ ...props.record });
const isVisible = computed({ get: () => props.modelValue, set: (value) => emit("update:modelValue", value) });
const rules = computed<FormRules>(() => ({
  ...Object.fromEntries(props.fields.filter((field) => field.required).map((field) => [field.prop, [{
    required: true,
    message: t("resource.fieldRequired", { field: t(field.labelKey) }),
    trigger: field.type === "select" ? "change" : "blur",
  }]])),
  library: [{ required: true, message: t("identity.selectBusinessUnitToCreate"), trigger: "change" }],
}));

watch(() => [props.modelValue, props.record] as const, ([visible, record]) => {
  if (!visible) return;
  Object.assign(form, record);
  if (isHeadquarters.value && !props.isEditing) {
    selectedBusinessUnit.value = "";
    form.library = undefined;
  }
}, { deep: true });

function setBusinessUnit(unit: Exclude<LoginScope, "headquarters">) {
  form.library = unit === "shengxu" ? "shengxu" : "shared";
  formRef.value?.validateField("library");
}

function resetForm() {
  formRef.value?.clearValidate();
}

async function handleSubmit() {
  if (!(await formRef.value?.validate().catch(() => false))) return;
  emit("submit", { ...form });
}
</script>
