<template>
  <el-dialog
    v-model="isVisible"
    :title="$t(isEditing ? 'restaurant.editRestaurant' : 'restaurant.createRestaurant')"
    width="680px"
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
      <el-form-item :label="$t('resource.restaurantName')" prop="name">
        <el-input v-model.trim="form.name" />
      </el-form-item>
      <el-form-item :label="$t('resource.city')" prop="city">
        <CitySelect v-model="form.city" :library="form.library" />
      </el-form-item>
      <el-form-item :label="$t('resource.cuisine')">
        <el-input v-model.trim="form.cuisine" />
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
      <el-form-item :label="$t('resource.contact')">
        <el-input v-model.trim="form.contact" />
      </el-form-item>
      <el-form-item :label="$t('resource.phone')">
        <el-input v-model.trim="form.phone" />
      </el-form-item>
      <el-form-item :label="$t('restaurant.address')">
        <el-input v-model.trim="form.address" />
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
import type { RestaurantRecord } from "@/types/resource";
import { getResourceUnitOptions } from "@/utils/resource-unit";

const props = defineProps<{ modelValue: boolean; record: RestaurantRecord; isEditing: boolean }>();
const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  submit: [record: RestaurantRecord];
}>();

const { t, locale } = useI18n();
const userStore = useUserStore();
const isHeadquarters = computed(() => userStore.userInfo.scope === "headquarters");
const selectedBusinessUnit = ref<Exclude<LoginScope, "headquarters"> | "">("");
const formRef = ref<FormInstance>();
const form = reactive<RestaurantRecord>({ ...props.record });
const isVisible = computed({
  get: () => props.modelValue,
  set: (value) => emit("update:modelValue", value),
});
const unitOptions = computed(() => getResourceUnitOptions("restaurant", locale.value));
const rules = computed<FormRules>(() => ({
  library: [
    { required: true, message: t("identity.selectBusinessUnitToCreate"), trigger: "change" },
  ],
  name: [{ required: true, message: t("restaurant.nameRequired"), trigger: "blur" }],
  city: [{ required: true, message: t("restaurant.cityRequired"), trigger: "change" }],
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
  if (form.library !== library) form.city = "";
  form.library = library;
  formRef.value?.validateField("library");
}

async function handleSubmit() {
  if (!(await formRef.value?.validate().catch(() => false))) return;
  emit("submit", { ...form, prices: props.record.prices });
}
</script>
