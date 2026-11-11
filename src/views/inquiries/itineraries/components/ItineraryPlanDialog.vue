<template>
  <AppDialog
    :model-value="modelValue"
    :title="$t(isEditing ? 'itinerary.editTitle' : 'itinerary.createTitle')"
    size="lg"
    destroy-on-close
    @close="emit('update:modelValue', false)"
  >
    <el-form
      ref="formRef"
      class="itinerary-plan-dialog__form"
      :model="form"
      :rules="rules"
      label-position="top"
    >
      <el-form-item v-if="isEditing" :label="$t('itinerary.code')">
        <el-input v-model="form.code" disabled />
      </el-form-item>
      <el-form-item :label="$t('itinerary.title')" prop="title">
        <el-input v-model.trim="form.title" />
      </el-form-item>
      <el-form-item v-if="english" :label="$t('itinerary.english.title')" prop="titleEn">
        <el-input v-model.trim="form.titleEn" maxlength="300" />
      </el-form-item>
      <el-form-item :label="$t('itinerary.paxTiers')" prop="paxTiers">
        <el-select
          autocomplete="new-password"
          :model-value="form.paxTiers"
          multiple
          filterable
          allow-create
          default-first-option
          :multiple-limit="20"
          class="w-full"
          :placeholder="$t('itinerary.paxPlaceholder')"
          @change="updatePaxTiers"
        >
          <el-option
            v-for="pax in paxOptions"
            :key="pax"
            :label="`${pax} PAX`"
            :value="pax"
          />
        </el-select>
      </el-form-item>
      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item :label="$t('itinerary.childRate')" prop="childRate">
            <el-input-number
              v-model="form.childRate"
              :min="0"
              :max="100"
              :precision="2"
            >
              <template #suffix>
                <span class="text-muted">%</span>
              </template>
            </el-input-number>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item :label="$t('itinerary.childWithoutBedRate')" prop="childWithoutBedRate">
            <el-input-number
              v-model="form.childWithoutBedRate"
              :min="0"
              :max="100"
              :precision="2"
            >
              <template #suffix>
                <span class="text-muted">%</span>
              </template>
            </el-input-number>
          </el-form-item>
        </el-col>
      </el-row>
      <el-row :gutter="16">
        <el-col :span="isSeries ? 12 : 8">
          <el-form-item
            :label="$t(isEditing ? 'itineraryWorkspace.dayCount' : 'inquiry.plannedDays')"
            prop="days"
          >
            <!-- 系列询盘没有计划天数，新建时每份行程独立填写 1–365 个实际服务日。 -->
            <el-input-number
              v-model="form.days"
              :disabled="!daysEditable"
              :min="1"
              :max="365"
              :precision="0"
              controls-position="right"
            />
            <span class="w-full mt-[4px] text-muted">{{ durationText }}</span>
          </el-form-item>
        </el-col>
        <el-col v-if="!isSeries" :span="8">
          <el-form-item :label="$t('common.startDate')" prop="startDate">
            <el-date-picker
              v-model="form.startDate"
              type="date"
              value-format="YYYY-MM-DD"
              class="w-full"
            />
          </el-form-item>
        </el-col>
        <el-col v-if="!isSeries" :span="8">
          <el-form-item :label="$t('common.endDate')">
            <el-input :model-value="form.endDate" disabled />
          </el-form-item>
        </el-col>
      </el-row>
      <el-form-item :label="$t('itinerary.destinations')" prop="destinations">
        <el-select
          v-model="form.destinations"
          autocomplete="new-password"
          multiple
          filterable
          :placeholder="$t('itinerary.destinationsPlaceholder')"
          class="w-full"
        >
          <el-option
            v-for="destination in destinationOptions"
            :key="destination"
            :label="destination"
            :value="destination"
          />
        </el-select>
      </el-form-item>
      <el-form-item :label="$t('itinerary.customerDisplayMode')">
        <el-radio-group v-model="form.customerDisplayMode">
          <el-radio value="same">
            {{ $t("itinerary.customerDisplayModes.same") }}
          </el-radio>
          <el-radio value="returnArrival">
            {{ $t("itinerary.customerDisplayModes.returnArrival") }}
          </el-radio>
        </el-radio-group>
      </el-form-item>
      <el-row v-if="form.customerDisplayMode === 'returnArrival'" :gutter="16">
        <el-col :span="english ? 12 : 24">
          <el-form-item :label="$t('itinerary.returnArrivalText')" prop="returnArrivalText">
            <el-input v-model="form.returnArrivalText" maxlength="2000" />
          </el-form-item>
        </el-col>
        <el-col v-if="english" :span="12">
          <el-form-item :label="$t('itinerary.english.returnArrivalText')" prop="returnArrivalTextEn">
            <el-input v-model="form.returnArrivalTextEn" maxlength="2000" />
          </el-form-item>
        </el-col>
      </el-row>
    </el-form>
    <template #footer>
      <el-button @click="emit('update:modelValue', false)">
        {{ $t("common.cancel") }}
      </el-button>
      <el-button type="primary" @click="submitForm">
        {{ $t(isEditing ? "common.confirm" : "itinerary.createAndManage") }}
      </el-button>
    </template>
  </AppDialog>
</template>

<script setup lang="ts">
import { plannedEndDate } from "@/views/inquiries/itineraries/duration";
import { computed, reactive, ref, watch } from "vue";
import type { FormInstance, FormRules } from "element-plus";
import { useI18n } from "vue-i18n";
import type { ItineraryRecord } from "@/types/itinerary";
import AppDialog from "@/components/AppDialog/index.vue";

const props = defineProps<{
  modelValue: boolean;
  record: ItineraryRecord;
  /** null：系列询盘新建，天数由用户填写。 */
  plannedDays: number | null;
  destinationOptions: string[];
  isEditing?: boolean;
  isSeries?: boolean;
  /** 盛旭行程显示对客英文字段。 */
  english?: boolean;
}>();
const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  submit: [record: ItineraryRecord];
}>();
const { t } = useI18n();
const formRef = ref<FormInstance>();
const DEFAULT_PAX_TIERS = [10, 12, 15, 18, 20, 25, 30];

function updatePaxTiers(values: Array<number | string>) {
  form.paxTiers = [
    ...new Set(
      values.map(Number).filter((value) => Number.isInteger(value) && value >= 1 && value <= 10000),
    ),
  ]
    .sort((left, right) => left - right)
    .slice(0, 20);
  formRef.value?.clearValidate("paxTiers");
}
const form = reactive<ItineraryRecord>({
  ...props.record,
  paxTiers: [...props.record.paxTiers],
  destinations: [...props.record.destinations],
  hotelPlans: props.record.hotelPlans.map((plan) => ({
    ...plan,
    hotels: plan.hotels.map((hotel) => ({ ...hotel })),
  })),
  guidePlans: props.record.guidePlans.map((plan) => ({ ...plan })),
  vehiclePlans: JSON.parse(JSON.stringify(props.record.vehiclePlans)),
  quote: {
    ...props.record.quote,
    transportFees: props.record.quote.transportFees.map((fee) => ({ ...fee })),
    options: props.record.quote.options.map((option) => ({ ...option })),
  },
  dailyPlans: [],
});
const daysEditable = computed(() => !props.isEditing && props.plannedDays === null);
const DAYS_PATTERN = { min: 1, max: 365 };
/** 晚数取后端按实际住宿统计的 accommodationNights，不再按天数减一推算；新建时尚无住宿只显示天数。 */
const durationText = computed(() => {
  const days = form.days || 0;
  const nights = props.isEditing ? props.record.accommodationNights : undefined;
  const displayDays = days + (form.customerDisplayMode === "returnArrival" ? 1 : 0);
  if (nights === undefined)
    return t("itinerary.serviceDaysOnly", { days, displayDays });
  return t("itinerary.serviceDisplay", { days, displayDays, nights });
});
const paxOptions = computed(() =>
  [...new Set([...DEFAULT_PAX_TIERS, ...form.paxTiers])].sort((left, right) => left - right),
);
const rules = computed<FormRules>(() => ({
  title: [{ required: true, message: t("itinerary.titleRequired"), trigger: "blur" }],
  days: [
    {
      type: "integer",
      required: true,
      ...DAYS_PATTERN,
      message: t("itinerary.serviceDaysRequired"),
      trigger: "change",
    },
  ],
  startDate: props.isSeries
    ? []
    : [{ required: true, message: t("itinerary.startDateRequired"), trigger: "change" }],
  paxTiers: [
    {
      type: "array",
      required: true,
      min: 1,
      max: 20,
      message: t("itinerary.paxRequired"),
      trigger: "change",
    },
  ],
  childWithoutBedRate: [
    {
      type: "number",
      required: true,
      min: 0,
      max: 100,
      message: t("itinerary.childRateRequired"),
      trigger: "change",
    },
  ],
  childRate: [
    {
      type: "number",
      required: true,
      min: 0,
      max: 100,
      message: t("itinerary.childRateRequired"),
      trigger: "change",
    },
  ],
  destinations: [
    {
      type: "array",
      required: true,
      min: 1,
      message: t("itinerary.destinationsRequired"),
      trigger: "change",
    },
  ],
}));

watch(
  () => [props.modelValue, props.record] as const,
  ([visible, record]) => {
    if (!visible) return;
    Object.assign(form, record, {
      paxTiers: [...record.paxTiers],
      days: props.plannedDays ?? (record.days || 1),
      destinations: [...record.destinations],
      hotelPlans: record.hotelPlans.map((plan) => ({
        ...plan,
        hotels: plan.hotels.map((hotel) => ({ ...hotel })),
      })),
      guidePlans: record.guidePlans.map((plan) => ({ ...plan })),
      vehiclePlans: JSON.parse(JSON.stringify(record.vehiclePlans)),
      quote: {
        ...record.quote,
        transportFees: record.quote.transportFees.map((fee) => ({ ...fee })),
        options: record.quote.options.map((option) => ({ ...option })),
      },
      dailyPlans: [],
    });
    syncEndDate();
  },
  { deep: true },
);

watch(() => [form.startDate, form.days], syncEndDate);

async function submitForm() {
  if (!(await formRef.value?.validate().catch(() => false))) return;
  emit("submit", {
    ...form,
    paxTiers: [...form.paxTiers],
    destinations: [...form.destinations],
    hotelPlans: form.hotelPlans.map((plan) => ({
      ...plan,
      hotels: plan.hotels.map((hotel) => ({ ...hotel })),
    })),
    guidePlans: form.guidePlans.map((plan) => ({ ...plan })),
    vehiclePlans: JSON.parse(JSON.stringify(form.vehiclePlans)),
    quote: {
      ...form.quote,
      transportFees: form.quote.transportFees.map((fee) => ({ ...fee })),
      options: form.quote.options.map((option) => ({ ...option })),
    },
    dailyPlans: [],
  });
}

function syncEndDate() {
  form.endDate = plannedEndDate(form.startDate, form.days);
}
</script>

<style scoped lang="scss">
.itinerary-plan-dialog__form :deep(.el-form-item__label) {
  white-space: nowrap;
}

.itinerary-plan-dialog__form :deep(.el-input-number) {
  width: 100%;
}
</style>
