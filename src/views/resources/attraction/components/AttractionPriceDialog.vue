<template>
  <el-dialog
    v-model="isVisible"
    :title="$t(isEditing ? 'attraction.editPrice' : 'attraction.createPrice')"
    width="640px"
    destroy-on-close
  >
    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-width="auto"
    >
      <el-form-item
        :label="$t('attraction.itemType')"
        prop="itemType"
      >
        <el-select v-model="form.itemType">
          <el-option
            v-for="option in itemTypeOptions"
            :key="option.value"
            :label="$t(option.labelKey)"
            :value="option.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item
        :label="$t('attraction.itemName')"
        prop="itemName"
      >
        <el-input v-model.trim="form.itemName" />
      </el-form-item>
      <el-form-item
        :label="$t('attraction.audience')"
        prop="audience"
      >
        <el-input
          v-model.trim="form.audience"
          :placeholder="$t('attraction.audiencePlaceholder')"
        />
      </el-form-item>
      <el-form-item
        :label="$t('hotel.pricePeriod')"
        prop="periodName"
      >
        <el-input v-model.trim="form.periodName" />
      </el-form-item>
      <el-form-item :label="$t('hotel.effectivePeriod')">
        <el-date-picker
          v-model="form.dates"
          type="daterange"
          value-format="YYYY-MM-DD"
          clearable
        />
      </el-form-item>
      <el-form-item :label="$t('attraction.freeTicket')">
        <el-switch v-model="form.isFree" />
      </el-form-item>
      <el-form-item :label="$t('attraction.rackPrice')">
        <el-input-number
          v-model="form.rackPrice"
          :disabled="form.isFree"
          :min="0"
          :precision="2"
        />
      </el-form-item>
      <el-form-item :label="$t('attraction.settlementPrice')">
        <el-input-number
          v-model="form.settlementPrice"
          :disabled="form.isFree"
          :min="0"
          :precision="2"
        />
      </el-form-item>
      <el-form-item
        :label="$t('resource.priceUnit')"
        prop="unit"
      >
        <el-select v-model="form.unit">
          <el-option
            v-for="option in unitOptions"
            :key="option.value"
            :label="option.label"
            :value="option.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item :label="$t('resource.isGroundOperatorProvided')">
        <el-switch
          v-model="form.isGroundOperatorProvided"
          @change="changePriceProvider"
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
      <el-form-item :label="$t('attraction.priceNote')">
        <el-input
          v-model.trim="form.priceNote"
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
import { tourismResources, type AttractionPriceItemType, type AttractionPriceRecord } from "@/data/data";
import { getResourceUnitOptions } from "@/utils/resource-unit";

type AttractionPriceForm = AttractionPriceRecord & { dates: string[] };

const props = defineProps<{
  modelValue: boolean;
  record: AttractionPriceRecord;
  isEditing: boolean;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  submit: [record: AttractionPriceRecord];
}>();

const { t, locale } = useI18n();
const formRef = ref<FormInstance>();
const form = reactive<AttractionPriceForm>({ ...props.record, dates: [] });
const isVisible = computed({ get: () => props.modelValue, set: (value) => emit("update:modelValue", value) });
const itemTypeOptions: Array<{ value: AttractionPriceItemType; labelKey: string }> = [
  { value: "ticket", labelKey: "attraction.itemTicket" },
  { value: "transport", labelKey: "attraction.itemTransport" },
  { value: "guide", labelKey: "attraction.itemGuide" },
  { value: "activity", labelKey: "attraction.itemActivity" },
  { value: "package", labelKey: "attraction.itemPackage" },
];
const groundOperatorOptions = computed(() => tourismResources.supplier.filter((item) => item.status === "enabled"));
const unitOptions = computed(() => getResourceUnitOptions("attraction", locale.value));
const rules = computed<FormRules>(() => ({
  itemType: [{ required: true, message: t("attraction.itemTypeRequired"), trigger: "change" }],
  itemName: [{ required: true, message: t("attraction.itemNameRequired"), trigger: "blur" }],
  audience: [{ required: true, message: t("attraction.audienceRequired"), trigger: "blur" }],
  periodName: [{ required: true, message: t("hotel.periodRequired"), trigger: "blur" }],
  unit: [{ required: true, message: t("resource.priceUnitRequired"), trigger: "change" }],
  groundOperatorId: [{ required: form.isGroundOperatorProvided, message: t("resource.groundOperatorRequired"), trigger: "change" }],
}));

watch(() => props.record, (record) => Object.assign(form, record, {
  dates: record.startDate && record.endDate ? [record.startDate, record.endDate] : [],
}), { deep: true });

function changePriceProvider(value: string | number | boolean) {
  if (!value) form.groundOperatorId = "";
}

async function handleSubmit() {
  if (!(await formRef.value?.validate().catch(() => false))) return;
  const { dates, ...record } = form;
  record.startDate = dates[0] ?? "";
  record.endDate = dates[1] ?? "";
  if (record.isFree) {
    record.rackPrice = 0;
    record.settlementPrice = 0;
  }
  emit("submit", { ...record });
}
</script>
