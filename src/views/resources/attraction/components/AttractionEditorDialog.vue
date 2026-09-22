<template>
  <el-dialog
    v-model="isVisible"
    :title="$t(isEditing ? 'attraction.editAttraction' : 'attraction.createAttraction')"
    width="620px"
    destroy-on-close
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
            :label="$t(`identity.scopes.${unit}`)"
          />
        </el-select>
      </el-form-item>
      <el-form-item v-else :label="$t('identity.library')">
        <ResourceLibraryTag :library="form.library" />
      </el-form-item>
      <el-form-item v-if="isEditing" :label="$t('resource.code')">
        <el-input v-model="form.code" disabled />
      </el-form-item>
      <el-form-item :label="$t('resource.attractionName')" prop="name">
        <el-input v-model.trim="form.name" />
      </el-form-item>
      <el-form-item :label="$t('attraction.area')" prop="area">
        <CitySelect v-model="form.area" :library="form.library" />
      </el-form-item>
      <el-form-item :label="$t('attraction.category')" prop="category">
        <el-select v-model="form.category">
          <el-option
            v-for="option in attractionCategoryOptions"
            :key="option.value"
            :label="$t(option.labelKey)"
            :value="option.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item :label="$t('resource.priceUnit')" prop="unit">
        <el-select v-model="form.unit">
          <el-option
            v-for="option in unitOptions"
            :key="option.value"
            :label="option.label"
            :value="option.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item :label="$t('attraction.restroomLocation')">
        <el-input v-model.trim="form.restroomLocation" type="textarea" :rows="2" />
      </el-form-item>
      <el-form-item :label="$t('resource.isStandardPrice')">
        <el-switch v-model="form.isStandardPrice" />
      </el-form-item>
      <el-form-item :label="$t('resource.description')">
        <el-input v-model.trim="form.description" type="textarea" :rows="3" />
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
import ResourceLibraryTag from "@/components/ResourceLibraryTag.vue";
import { computed, reactive, ref, watch } from "vue";
import type { FormInstance, FormRules } from "element-plus";
import { useI18n } from "vue-i18n";
import { useUserStore } from "@/stores/user";
import type { LoginScope } from "@/types/auth";
import CitySelect from "@/components/CitySelect.vue";
import type { AttractionRecord } from "@/types/resource";
import { getResourceUnitOptions } from "@/utils/resource-unit";
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

const { t, locale } = useI18n();
const userStore = useUserStore();
const isHeadquarters = computed(() => userStore.userInfo.scope === "headquarters");
const selectedBusinessUnit = ref<Exclude<LoginScope, "headquarters"> | "">("");
const formRef = ref<FormInstance>();
const form = reactive<AttractionRecord>({ ...props.record });
const isVisible = computed({
  get: () => props.modelValue,
  set: (value) => emit("update:modelValue", value),
});
const unitOptions = computed(() => getResourceUnitOptions("attraction", locale.value));
const rules = computed<FormRules>(() => ({
  library: [
    { required: true, message: t("identity.selectBusinessUnitToCreate"), trigger: "change" },
  ],
  name: [{ required: true, message: t("attraction.nameRequired"), trigger: "blur" }],
  area: [{ required: true, message: t("attraction.areaRequired"), trigger: "change" }],
  category: [{ required: true, message: t("attraction.categoryRequired"), trigger: "change" }],
  unit: [{ required: true, message: t("resource.priceUnitRequired"), trigger: "change" }],
}));

watch(
  () => [props.modelValue, props.record] as const,
  ([visible, record]) => {
    if (!visible) return;
    Object.assign(form, record);
    if (isHeadquarters.value && !props.isEditing) {
      selectedBusinessUnit.value = "";
      form.library = undefined;
    }
  },
  { deep: true },
);

function setBusinessUnit(unit: Exclude<LoginScope, "headquarters">) {
  const library = unit === "shengxu" ? "shengxu" : "shared";
  if (form.library !== library) form.area = "";
  form.library = library;
  formRef.value?.validateField("library");
}

async function handleSubmit() {
  if (!(await formRef.value?.validate().catch(() => false))) return;
  emit("submit", { ...form, prices: props.record.prices });
}
</script>
