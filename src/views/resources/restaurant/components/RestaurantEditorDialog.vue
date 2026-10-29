<template>
  <AppDialog
    v-model="isVisible"
    :title="$t(isEditing ? 'restaurant.editRestaurant' : 'restaurant.createRestaurant')"
    size="md"
    :busy="isSubmitting"
    destroy-on-close
  >
    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      :disabled="isSubmitting"
      label-width="auto"
    >
      <el-form-item v-if="isEditing" :label="$t('resource.code')">
        <el-input v-model="form.code" disabled />
      </el-form-item>
      <el-form-item :label="$t('resource.restaurantName')" prop="name">
        <el-input v-model.trim="form.name" />
      </el-form-item>
      <el-form-item :label="$t('common.englishName')">
        <el-input v-model.trim="form.englishName" :maxlength="150" />
      </el-form-item>
      <el-form-item :label="$t('common.cityRegion')" prop="city">
        <CitySelect v-model="form.city" />
      </el-form-item>
      <el-form-item :label="$t('resource.description')" prop="description">
        <el-input v-model.trim="form.description" type="textarea" :rows="3" />
      </el-form-item>
      <el-form-item :label="$t('resource.englishDescription')">
        <el-input v-model.trim="form.englishDescription" type="textarea" :rows="3" />
      </el-form-item>
      <el-form-item :label="$t('itinerary.priceUnit')" prop="unit">
        <el-select v-model="form.unit" autocomplete="new-password">
          <el-option
            v-for="option in unitOptions"
            :key="option.value"
            :label="option.label"
            :value="option.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item :label="$t('common.price')" prop="price">
        <StrictInputNumber
          v-model="form.price"
          :min="0"
          :precision="2"
          :controls="false"
        />
      </el-form-item>
      <el-form-item
        v-if="form.unit === 'table'"
        :label="$t('restaurant.dinerCount')"
        prop="dinerCount"
      >
        <StrictInputNumber
          v-model="form.dinerCount"
          :min="1"
          :precision="0"
          :controls="false"
        />
      </el-form-item>
      <el-form-item :label="$t('resource.cuisine')">
        <el-input v-model.trim="form.cuisine" />
      </el-form-item>
      <el-form-item :label="$t('common.contact')">
        <el-input v-model.trim="form.contact" />
      </el-form-item>
      <el-form-item :label="$t('resource.phone')">
        <el-input v-model.trim="form.phone" />
      </el-form-item>
      <el-form-item :label="$t('common.address')">
        <el-input v-model.trim="form.address" />
      </el-form-item>
      <el-form-item :label="$t('resource.isStandardPrice')">
        <el-switch v-model="form.isStandardPrice" />
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
import AppDialog from "@/components/AppDialog/index.vue";
import { computed, reactive, watch } from "vue";
import type { FormInstance, FormRules } from "element-plus";
import { useI18n } from "vue-i18n";
import CitySelect from "@/components/CitySelect.vue";
import type { RestaurantRecord } from "@/types/resource";
import { getResourceUnitOptions } from "@/utils/resource-unit";
import { useResourceFormSubmit } from "../../useResourceFormSubmit";

const props = defineProps<{
  modelValue: boolean;
  record: RestaurantRecord;
  isEditing: boolean;
  submit: (record: RestaurantRecord) => Promise<void>;
}>();
const emit = defineEmits<{
  "update:modelValue": [value: boolean];
}>();

const { t, locale } = useI18n();
const formRef = ref<FormInstance>();
const { isSubmitting, isSaving, submitForm } = useResourceFormSubmit(formRef);
const form = reactive<RestaurantRecord>({ ...props.record });
const isVisible = computed({
  get: () => props.modelValue,
  set: (value) => emit("update:modelValue", value),
});
const unitOptions = computed(() => getResourceUnitOptions("restaurant", locale.value));
const rules = computed<FormRules>(() => ({
  name: [{ required: true, message: t("restaurant.nameRequired"), trigger: "blur" }],
  city: [{ required: true, message: t("common.selectCity"), trigger: "change" }],
  description: [{ required: true, message: t("resource.descriptionRequired"), trigger: "blur" }],
  price: [{ required: true, message: t("restaurant.priceRequired"), trigger: "blur" }],
  unit: [{ required: true, message: t("resource.priceUnitRequired"), trigger: "change" }],
  dinerCount: [
    {
      validator: (_rule, value: number | null, callback) =>
        callback(
          form.unit !== "table" || (Number.isInteger(value) && Number(value) > 0)
            ? undefined
            : new Error(t("restaurant.dinerCountRequired")),
        ),
      trigger: "blur",
    },
  ],
}));

watch(
  () => [props.modelValue, props.record] as const,
  ([visible, record]) => {
    if (!visible) return;
    Object.assign(form, record);
  },
  { deep: true },
);

async function handleSubmit() {
  await submitForm(() => props.submit({ ...form }));
}
</script>
