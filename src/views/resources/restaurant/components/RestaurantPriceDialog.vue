<template>
  <el-dialog
    v-model="isVisible"
    :title="$t(isEditing ? 'restaurant.editPrice' : 'restaurant.createPrice')"
    width="620px"
    destroy-on-close
  >
    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-width="auto"
    >
      <el-form-item
        :label="$t('restaurant.menuName')"
        prop="menuName"
      >
        <el-input v-model.trim="form.menuName" />
      </el-form-item>
      <el-form-item
        :label="$t('restaurant.priceUnit')"
        prop="unit"
      >
        <el-select
          v-model="form.unit"
          @change="changePriceUnit"
        >
          <el-option
            v-for="option in unitOptions"
            :key="option.value"
            :label="option.label"
            :value="option.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item
        :label="$t('restaurant.dishDetails')"
        prop="dishDetails"
      >
        <el-input
          v-model.trim="form.dishDetails"
          type="textarea"
          :rows="6"
          resize="vertical"
        />
      </el-form-item>
      <el-form-item
        :label="$t('restaurant.price')"
        prop="price"
      >
        <el-input-number
          v-model="form.price"
          :min="0"
          :precision="2"
          controls-position="right"
        />
      </el-form-item>
      <el-form-item
        v-if="form.unit === 'table'"
        :label="$t('restaurant.dinerCount')"
      >
        <el-input-number
          v-model="form.dinerCount"
          :min="1"
          :max="30"
          controls-position="right"
        />
      </el-form-item>
      <el-form-item :label="$t('resource.isGroundOperatorProvided')">
        <el-switch
          v-model="form.isGroundOperatorProvided"
          @change="changeProvider"
        />
      </el-form-item>
      <el-form-item
        v-if="form.isGroundOperatorProvided"
        :label="$t('resource.supplierName')"
        prop="groundOperatorId"
      >
        <el-select v-model="form.groundOperatorId">
          <el-option
            v-for="option in groundOperatorOptions"
            :key="option.id"
            :label="option.name"
            :value="option.id"
          />
        </el-select>
      </el-form-item>
      <el-form-item :label="$t('common.remark')">
        <el-input
          v-model.trim="form.remark"
          type="textarea"
          :rows="3"
        />
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
import { computed, reactive, ref, watch } from "vue";
import type { FormInstance, FormRules } from "element-plus";
import { useI18n } from "vue-i18n";
import { tourismResources, type RestaurantPriceRecord } from "@/data/data";
import { getResourceUnitOptions } from "@/utils/resource-unit";

const props = defineProps<{ modelValue: boolean; record: RestaurantPriceRecord; isEditing: boolean }>();
const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  submit: [record: RestaurantPriceRecord];
}>();

const { t, locale } = useI18n();
const formRef = ref<FormInstance>();
const form = reactive<RestaurantPriceRecord>({ ...props.record });
const isVisible = computed({ get: () => props.modelValue, set: (value) => emit("update:modelValue", value) });
const groundOperatorOptions = computed(() => tourismResources.supplier.filter((item) => item.status === "enabled"));
const unitOptions = computed(() => getResourceUnitOptions("restaurant", locale.value));
const rules = computed<FormRules>(() => ({
  menuName: [{ required: true, message: t("restaurant.menuNameRequired"), trigger: "blur" }],
  dishDetails: [{ required: true, message: t("restaurant.dishDetailsRequired"), trigger: "blur" }],
  unit: [{ required: true, message: t("restaurant.priceUnitRequired"), trigger: "change" }],
  price: [{ required: true, message: t("restaurant.priceRequired"), trigger: "change" }],
  groundOperatorId: [{ required: form.isGroundOperatorProvided, message: t("resource.groundOperatorRequired"), trigger: "change" }],
}));

watch(() => props.record, (record) => Object.assign(form, record), { deep: true });

function changeProvider(value: string | number | boolean) {
  if (!value) form.groundOperatorId = "";
}

function changePriceUnit(value: string | number | boolean | undefined) {
  form.dinerCount = value === "table" ? 10 : 0;
}

async function handleSubmit() {
  if (!(await formRef.value?.validate().catch(() => false))) return;
  emit("submit", { ...form });
}
</script>
