<template>
  <AppDialog
    v-model="isVisible"
    :title="$t(isEditing ? 'resource.editAgencyTitle' : 'resource.createAgencyTitle')"
    size="md"
    destroy-on-close
    :busy="isSubmitting"
    @closed="resetForm"
  >
    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      :disabled="isSubmitting || loadingParent"
      label-width="auto"
      autocomplete="off"
    >
      <el-form-item :label="$t('resource.agencyBusinessUnit')" prop="businessUnit">
        <el-select
          v-model="selectedBusinessUnit"
          autocomplete="new-password"
          :placeholder="$t('identity.selectBusinessUnitToCreate')"
          @change="setBusinessUnit"
        >
          <el-option
            v-for="unit in BUSINESS_UNITS"
            :key="unit"
            :value="unit"
            :label="businessUnitName(unit)"
          />
        </el-select>
      </el-form-item>
      <el-form-item v-if="isEditing" :label="$t('resource.code')">
        <el-input v-model="form.code" disabled />
      </el-form-item>
      <el-form-item :label="$t('resource.agencyParent')">
        <ResourceSelect
          kind="agencies"
          :model-value="form.parentId || ''"
          :selected-label="form.parentName || ''"
          :filters="parentFilters"
          :disabled="isSubmitting || loadingParent"
          :placeholder="$t('resource.agencyParentPlaceholder')"
          @update:model-value="selectParent"
        />
      </el-form-item>
      <el-form-item :label="$t('resource.agencyCoordinator')" prop="coordinatorId">
        <el-select
          v-model="form.coordinatorId"
          autocomplete="new-password"
          filterable
          :loading="loadingCoordinators"
          :disabled="!form.businessUnit || loadingCoordinators"
          :placeholder="$t('common.selectPlaceholder')"
        >
          <el-option
            v-for="person in coordinators"
            :key="person.id"
            :label="`${person.name} (${person.username})`"
            :value="person.id"
          />
        </el-select>
      </el-form-item>
      <el-form-item :label="$t('resource.agencyName')" prop="shortName">
        <el-input v-model.trim="form.shortName">
          <template v-if="form.parentId" #prepend>
            {{ form.parentName }}-
          </template>
        </el-input>
      </el-form-item>
      <el-form-item :label="$t('resource.countryOrRegion')" prop="countryItemId">
        <BusinessItemSelect
          :model-value="form.countryItemId ?? ''"
          type-code="country-region"
          clearable
          :selected-label="form.countryOrRegion"
          @update:model-value="form.countryItemId = $event || null"
        />
      </el-form-item>
      <el-form-item :label="$t('resource.city')">
        <el-input v-model.trim="form.city" autocomplete="new-password" :maxlength="100" />
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
      <el-button :disabled="isSubmitting" @click="isVisible = false">
        {{ $t("common.cancel") }}
      </el-button>
      <el-button
        type="primary"
        :loading="isSaving"
        :disabled="isSubmitting || loadingParent"
        @click="handleSubmit"
      >
        {{ $t("common.confirm") }}
      </el-button>
    </template>
  </AppDialog>
</template>

<script setup lang="ts">
import AppDialog from "@/components/AppDialog/index.vue";
import { businessUnitName } from "@/constants/identity";
import BusinessItemSelect from "@/components/BusinessItemSelect/index.vue";
import ResourceSelect from "@/components/ResourceSelect/index.vue";
import { computed, reactive, ref, watch } from "vue";
import { ElMessage, type FormInstance, type FormRules } from "element-plus";
import { useI18n } from "vue-i18n";
import type { LoginScope } from "@/types/auth";
import type { AgencyRecord } from "@/types/resource";
import { resourceService } from "@/services/resource.service";
import { useResourceFormSubmit } from "../../useResourceFormSubmit";

const props = defineProps<{
  modelValue: boolean;
  record: AgencyRecord;
  submit: (record: AgencyRecord) => Promise<void>;
  isEditing: boolean;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
}>();

const { t } = useI18n();
const BUSINESS_UNITS = ["shengxu", "linxi", "website"] as const;
const selectedBusinessUnit = ref<Exclude<LoginScope, "headquarters"> | "">("");
const formRef = ref<FormInstance>();
const { isSubmitting, isSaving, submitForm } = useResourceFormSubmit(formRef);
const form = reactive<AgencyRecord>(cloneRecord(props.record));
const loadingParent = ref(false);
let parentRequestVersion = 0;
const parentFilters = computed<Record<string, string>>(() => ({
  parentOnly: "true",
  ...(form.id ? { excludeId: form.id } : {}),
}));
const coordinators = ref<{ id: string; name: string; username: string }[]>([]);
const loadingCoordinators = ref(false);
let coordinatorRequestVersion = 0;
const isVisible = computed({
  get: () => props.modelValue,
  set: (value) => emit("update:modelValue", value),
});
const rules = computed<FormRules>(() => ({
  businessUnit: [
    { required: true, message: t("identity.selectBusinessUnitToCreate"), trigger: "change" },
  ],
  coordinatorId: [
    { required: true, message: t("resource.agencyCoordinatorRequired"), trigger: "change" },
  ],
  shortName: [
    {
      required: true,
      message: t("resource.fieldRequired", { field: t("resource.agencyName") }),
      trigger: "blur",
    },
  ],
}));

watch(
  () => [props.modelValue, props.record] as const,
  ([visible, record]) => {
    ++parentRequestVersion;
    loadingParent.value = false;
    if (!visible) return;
    Object.assign(form, cloneRecord(record));
    selectedBusinessUnit.value = form.businessUnit || "";
    void loadCoordinators();
  },
  { deep: true },
);

function setBusinessUnit(unit: Exclude<LoginScope, "headquarters">) {
  form.businessUnit = unit;
  form.coordinatorId = null;
  void loadCoordinators();
  formRef.value?.validateField("businessUnit");
}

async function selectParent(parentId: string) {
  const version = ++parentRequestVersion;
  if (!parentId) {
    form.parentId = null;
    form.parentName = null;
    return;
  }
  loadingParent.value = true;
  try {
    const parent = await resourceService.agencyApi.getDetail(parentId);
    if (version === parentRequestVersion) {
      form.parentId = parent.id;
      form.parentName = parent.name;
    }
  } catch (error) {
    if (version === parentRequestVersion)
      ElMessage.error(error instanceof Error ? error.message : t("request.failed"));
  } finally {
    if (version === parentRequestVersion) loadingParent.value = false;
  }
}

async function loadCoordinators() {
  const version = ++coordinatorRequestVersion;
  coordinators.value = [];
  if (!form.businessUnit) return;
  loadingCoordinators.value = true;
  try {
    const records = await resourceService.agencyApi.getCoordinators(form.businessUnit);
    if (version === coordinatorRequestVersion) coordinators.value = records;
  } catch (error) {
    if (version === coordinatorRequestVersion)
      ElMessage.error(error instanceof Error ? error.message : t("request.failed"));
  } finally {
    if (version === coordinatorRequestVersion) loadingCoordinators.value = false;
  }
}

function cloneRecord(record: AgencyRecord): AgencyRecord {
  return { ...record, contacts: record.contacts.map((contact) => ({ ...contact })) };
}

function resetForm() {
  formRef.value?.clearValidate();
}

async function handleSubmit() {
  await submitForm(() => props.submit(cloneRecord(form)));
}
</script>
