<template>
  <el-dialog
    v-model="isVisible"
    :title="$t(isEditing ? 'resource.editAgencyTitle' : 'resource.createAgencyTitle')"
    width="600px"
    destroy-on-close
    @closed="resetForm"
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-width="auto">
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
            :label="businessUnitName(unit)"
          />
        </el-select>
      </el-form-item>
      <el-form-item v-else :label="$t('identity.library')">
        <ResourceLibraryTag :library="form.library" />
      </el-form-item>
      <el-form-item v-if="isEditing" :label="$t('resource.code')">
        <el-input v-model="form.code" disabled />
      </el-form-item>
      <el-form-item :label="$t('resource.agencyName')" prop="name">
        <el-input v-model.trim="form.name" />
      </el-form-item>
      <el-form-item :label="$t('resource.countryOrRegion')" prop="countryOrRegion">
        <el-input v-model.trim="form.countryOrRegion" />
      </el-form-item>
      <el-form-item :label="$t('resource.city')">
        <CitySelect v-model="form.city" :library="form.library" />
      </el-form-item>
      <el-form-item :label="$t('resource.agencyEmail')" prop="email">
        <el-input v-model.trim="form.email" />
      </el-form-item>
      <el-form-item :label="$t('common.remark')">
        <el-input v-model.trim="form.remark" type="textarea" :rows="3" />
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
      <el-button type="primary" @click="handleSubmit">
        {{ $t("common.confirm") }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { businessUnitName } from "@/constants/identity";
import ResourceLibraryTag from "@/components/ResourceLibraryTag.vue";
import CitySelect from "@/components/CitySelect.vue";
import { computed, reactive, ref, watch } from "vue";
import type { FormInstance, FormRules } from "element-plus";
import { useI18n } from "vue-i18n";
import { useUserStore } from "@/stores/user";
import type { LoginScope } from "@/types/auth";
import type { AgencyRecord } from "@/types/resource";

const props = defineProps<{
  modelValue: boolean;
  record: AgencyRecord;
  isEditing: boolean;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  submit: [record: AgencyRecord];
}>();

const { t } = useI18n();
const userStore = useUserStore();
const isHeadquarters = computed(() => userStore.userInfo.scope === "headquarters");
const selectedBusinessUnit = ref<Exclude<LoginScope, "headquarters"> | "">("");
const formRef = ref<FormInstance>();
const form = reactive<AgencyRecord>(cloneRecord(props.record));
const isVisible = computed({
  get: () => props.modelValue,
  set: (value) => emit("update:modelValue", value),
});
const rules = computed<FormRules>(() => ({
  library: [
    { required: true, message: t("identity.selectBusinessUnitToCreate"), trigger: "change" },
  ],
  name: [
    {
      required: true,
      message: t("resource.fieldRequired", { field: t("resource.agencyName") }),
      trigger: "blur",
    },
  ],
  countryOrRegion: [
    {
      required: true,
      message: t("resource.fieldRequired", { field: t("resource.countryOrRegion") }),
      trigger: "blur",
    },
  ],
  email: [
    {
      required: true,
      message: t("resource.fieldRequired", { field: t("resource.agencyEmail") }),
      trigger: "blur",
    },
  ],
}));

watch(
  () => [props.modelValue, props.record] as const,
  ([visible, record]) => {
    if (!visible) return;
    Object.assign(form, cloneRecord(record));
    if (isHeadquarters.value && !props.isEditing) {
      selectedBusinessUnit.value = "";
      form.library = undefined;
    }
  },
  { deep: true },
);

function setBusinessUnit(unit: Exclude<LoginScope, "headquarters">) {
  const library = unit === "shengxu" ? "shengxu" : "shared";
  if (form.library !== library) form.city = "";
  form.library = library;
  formRef.value?.validateField("library");
}

function cloneRecord(record: AgencyRecord): AgencyRecord {
  return { ...record, contacts: record.contacts.map((contact) => ({ ...contact })) };
}

function resetForm() {
  formRef.value?.clearValidate();
}

async function handleSubmit() {
  if (!(await formRef.value?.validate().catch(() => false))) return;
  emit("submit", cloneRecord(form));
}
</script>
