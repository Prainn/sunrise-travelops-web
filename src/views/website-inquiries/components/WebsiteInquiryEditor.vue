<template>
  <AppDrawer
    v-if="readOnly"
    :model-value="modelValue"
    :title="$t('inquiry.inquiryDetail')"
    size="md"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <template v-if="record">
      <div class="flex items-start justify-between mb-[20px]">
        <div>
          <h3 class="m-[0_0_4px] text-[16px]">
            {{ record.customerName }}
          </h3>
          <span class="text-[var(--el-text-color-secondary)]">{{ record.code }}</span>
        </div>
        <el-tag :type="INQUIRY_STATUS_TAG_TYPES[record.status]">
          {{ $t(`inquiry.statuses.${record.status}`) }}
        </el-tag>
      </div>
      <el-descriptions :column="1" border>
        <el-descriptions-item :label="$t('identity.businessUnit')">
          {{ $t(`websiteInquiry.businessUnits.${record.businessUnit}`) }}
        </el-descriptions-item>
        <el-descriptions-item :label="$t('inquiry.owner')">
          {{ record.owner }}
        </el-descriptions-item>
        <el-descriptions-item :label="$t('inquiry.plannedDays')">
          {{ $t("websiteInquiry.dayCount", { days: record.plannedDays }, record.plannedDays) }}
        </el-descriptions-item>
        <el-descriptions-item v-if="record.serviceDates" :label="$t('websiteInquiry.serviceDates.label')">
          {{ serviceDateRanges(record.serviceDates).join($t("websiteInquiry.listSeparator")) }}
        </el-descriptions-item>
        <el-descriptions-item v-else :label="$t('common.startDate')">
          {{ record.startDate || $t("websiteInquiry.unconfirmed") }}
        </el-descriptions-item>
        <el-descriptions-item :label="$t('websiteInquiry.pax')">
          {{ record.pax ?? $t("websiteInquiry.unconfirmed") }}
        </el-descriptions-item>
        <el-descriptions-item :label="$t('websiteInquiry.contactInfo')">
          <div class="whitespace-pre-wrap break-all">
            {{ record.contactInfo || $t("common.notSet") }}
          </div>
        </el-descriptions-item>
        <el-descriptions-item :label="$t('websiteInquiry.receivedAt')">
          {{ record.receivedAt || $t("common.notSet") }}
        </el-descriptions-item>
        <el-descriptions-item :label="$t('websiteInquiry.contactChannel')">
          {{ record.contactChannel || $t("common.notSet") }}
        </el-descriptions-item>
        <el-descriptions-item :label="$t('websiteInquiry.acquisitionSource')">
          {{ record.acquisitionSource || $t("common.notSet") }}
        </el-descriptions-item>
        <el-descriptions-item :label="$t('websiteInquiry.whatsappSourceId')">
          {{ record.whatsappSourceId || $t("common.notSet") }}
        </el-descriptions-item>
        <el-descriptions-item :label="$t('websiteInquiry.websiteInquiryNo')">
          {{ record.websiteInquiryNo || $t("common.notSet") }}
        </el-descriptions-item>
        <el-descriptions-item :label="$t('websiteInquiry.landingPage')">
          <div class="break-all">
            {{ record.landingPage || $t("common.notSet") }}
          </div>
        </el-descriptions-item>
        <el-descriptions-item :label="$t('websiteInquiry.destinations')">
          {{
            record.destinations.map(cityName).join($t("websiteInquiry.listSeparator")) ||
              $t("common.notSet")
          }}
        </el-descriptions-item>
        <el-descriptions-item :label="$t('common.createdAt')">
          {{ formatDateTime(record.createdAt) }}
        </el-descriptions-item>
        <el-descriptions-item :label="$t('websiteInquiry.updatedAt')">
          {{ formatDateTime(record.updatedAt) }}
        </el-descriptions-item>
        <el-descriptions-item :label="$t('inquiry.originalMessage')">
          <div class="whitespace-pre-wrap">
            {{ record.requirements }}
          </div>
        </el-descriptions-item>
        <el-descriptions-item :label="$t('inquiry.internalRemark')">
          <div class="whitespace-pre-wrap">
            {{ record.internalRemark || $t("common.notSet") }}
          </div>
        </el-descriptions-item>
        <el-descriptions-item
          v-if="record.status === 'lost'"
          :label="$t('inquiry.lostReason')"
        >
          {{ record.lostReason }}
        </el-descriptions-item>
      </el-descriptions>
    </template>
  </AppDrawer>
  <AppDialog
    v-else
    :model-value="modelValue"
    :title="$t(record ? 'common.edit' : 'common.create')"
    size="lg"
    :busy="saving"
    destroy-on-close
    @update:model-value="emit('update:modelValue', $event)"
  >
    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      :validate-on-rule-change="false"
      label-width="auto"
      :disabled="saving"
    >
      <el-form-item v-if="showBusiness" :label="$t('identity.businessUnit')" prop="businessUnit">
        <el-select
          v-model="form.businessUnit"
          autocomplete="new-password"
          :disabled="Boolean(record)"
          @change="changeBusiness"
        >
          <el-option
            v-for="unit in ['linxi', 'website']"
            :key="unit"
            :value="unit"
            :label="$t(`websiteInquiry.businessUnits.${unit}`)"
          />
        </el-select>
      </el-form-item>
      <el-row :gutter="16">
        <el-col :xs="24" :sm="12">
          <el-form-item :label="$t('common.status')" prop="status">
            <el-select v-model="form.status" autocomplete="new-password" :disabled="!record">
              <el-option
                v-for="option in editableStatusOptions"
                :key="option.value"
                :value="option.value"
                :label="$t(option.labelKey)"
              />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col v-if="form.status === 'lost'" :xs="24" :sm="12">
          <el-form-item :label="$t('inquiry.lostReason')" prop="lostReason">
            <el-input v-model.trim="form.lostReason" maxlength="2000" />
          </el-form-item>
        </el-col>
      </el-row>
      <el-row :gutter="16">
        <el-col v-if="record" :xs="24" :sm="12">
          <el-form-item :label="$t('websiteInquiry.systemCode')">
            <el-input :model-value="record.code" disabled />
          </el-form-item>
        </el-col>
        <el-col :xs="24" :sm="12">
          <el-form-item :label="$t('common.countryOrRegion')" prop="countryItemId">
            <BusinessItemSelect
              v-model="form.countryItemId"
              type-code="country-region"
              :selected-label="record?.countryOrRegion"
            />
          </el-form-item>
        </el-col>
        <el-col :xs="24" :sm="12">
          <el-form-item :label="$t('websiteInquiry.customerName')" prop="customerName">
            <el-input v-model="form.customerName" maxlength="100" />
          </el-form-item>
        </el-col>
        <el-col v-if="record" :xs="24" :sm="12">
          <el-form-item :label="$t('inquiry.owner')">
            <el-input :model-value="record.owner" disabled />
          </el-form-item>
        </el-col>
        <el-col v-else-if="allowAssign" :xs="24" :sm="12">
          <el-form-item :label="$t('inquiry.owner')" prop="ownerId">
            <el-select v-model="form.ownerId" autocomplete="new-password" filterable>
              <el-option
                v-for="owner in owners"
                :key="owner.id"
                :value="owner.id"
                :label="owner.name"
              />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :xs="24" :sm="12">
          <el-form-item :label="$t('websiteInquiry.pax')" prop="pax">
            <el-input-number
              v-model="form.pax"
              :min="1"
              :max="10000"
              :precision="0"
              controls-position="right"
            />
          </el-form-item>
        </el-col>
        <el-col :xs="24" :sm="12">
          <el-form-item
            v-if="selectingDates"
            :label="$t('websiteInquiry.serviceDates.label')"
            :for="dateInputId"
            prop="serviceDates"
          >
            <div class="flex w-full items-center gap-3">
              <el-date-picker
                :id="dateInputId"
                :model-value="form.serviceDates ?? []"
                type="dates"
                value-format="YYYY-MM-DD"
                clearable
                class="min-w-0 flex-1 w-auto!"
                @update:model-value="setServiceDates(form, $event)"
              />
              <el-checkbox :model-value="true" @change="toggleServiceDates">
                {{ $t("websiteInquiry.serviceDates.toggle") }}
              </el-checkbox>
            </div>
          </el-form-item>
          <el-form-item v-else :label="$t('common.startDate')" :for="dateInputId">
            <div class="w-full">
              <div class="flex w-full items-center gap-3">
                <el-date-picker
                  :id="dateInputId"
                  v-model="form.startDate"
                  value-format="YYYY-MM-DD"
                  clearable
                  class="min-w-0 flex-1 w-auto!"
                />
                <el-checkbox v-if="isWebsite" :model-value="false" @change="toggleServiceDates">
                  {{ $t("websiteInquiry.serviceDates.toggle") }}
                </el-checkbox>
              </div>
              <p v-if="consecutiveRange" class="m-0 text-[12px] leading-[20px] text-muted">
                {{ $t("websiteInquiry.serviceDates.consecutiveRange", consecutiveRange) }}
              </p>
            </div>
          </el-form-item>
        </el-col>
        <el-col :xs="24" :sm="12">
          <el-form-item v-if="selectingDates" :label="$t('inquiry.plannedDays')" required>
            <el-input-number
              :model-value="selectedDayCount"
              :min="Math.min(1, selectedDayCount)"
              :max="Math.max(365, selectedDayCount)"
              :precision="0"
              controls-position="right"
              readonly
            />
          </el-form-item>
          <el-form-item v-else :label="$t('inquiry.plannedDays')" prop="plannedDays">
            <el-input-number
              v-model="form.plannedDays"
              :min="1"
              :max="365"
              :precision="0"
              controls-position="right"
            />
          </el-form-item>
        </el-col>
        <el-col :xs="24" :sm="12">
          <el-form-item :label="$t('websiteInquiry.contactInfo')">
            <el-input v-model="form.contactInfo" maxlength="500" />
          </el-form-item>
        </el-col>
        <el-col :xs="24" :sm="12">
          <el-form-item :label="$t('websiteInquiry.destinations')">
            <el-select
              v-model="form.destinations"
              autocomplete="new-password"
              multiple
              filterable
            >
              <el-option
                v-for="city in cities"
                :key="city.id"
                :value="city.id"
                :label="city.nameZh"
              />
            </el-select>
          </el-form-item>
        </el-col>
      </el-row>
      <el-row :gutter="16">
        <el-col :xs="24" :sm="12">
          <el-form-item :label="$t('websiteInquiry.receivedAt')">
            <el-input v-if="sourceReadOnly" :model-value="form.receivedAt ?? ''" readonly />
            <el-date-picker
              v-else
              v-model="form.receivedAt"
              type="datetime"
              format="YYYY-MM-DD HH:mm"
              value-format="YYYY-MM-DD HH:mm"
              :value-on-clear="null"
              clearable
              class="w-full"
            />
          </el-form-item>
        </el-col>
        <el-col :xs="24" :sm="12">
          <el-form-item :label="$t('websiteInquiry.contactChannel')">
            <el-input v-model="form.contactChannel" maxlength="100" :readonly="sourceReadOnly" />
          </el-form-item>
        </el-col>
        <el-col :xs="24" :sm="12">
          <el-form-item :label="$t('websiteInquiry.acquisitionSource')">
            <el-input v-model="form.acquisitionSource" maxlength="2048" :readonly="sourceReadOnly" />
          </el-form-item>
        </el-col>
        <el-col :xs="24" :sm="12">
          <el-form-item :label="$t('websiteInquiry.whatsappSourceId')">
            <el-input v-model="form.whatsappSourceId" maxlength="200" :readonly="sourceReadOnly" />
          </el-form-item>
        </el-col>
        <el-col :xs="24" :sm="12">
          <el-form-item :label="$t('websiteInquiry.websiteInquiryNo')">
            <el-input v-model="form.websiteInquiryNo" maxlength="200" :readonly="sourceReadOnly" />
          </el-form-item>
        </el-col>
        <el-col :span="24">
          <el-form-item :label="$t('websiteInquiry.landingPage')">
            <el-input v-model="form.landingPage" maxlength="2048" :readonly="sourceReadOnly" />
          </el-form-item>
        </el-col>
      </el-row>
      <el-row :gutter="16">
        <el-col :span="24">
          <el-form-item :label="$t('inquiry.originalMessage')" prop="requirements">
            <el-input
              v-model="form.requirements"
              type="textarea"
              :rows="5"
              maxlength="200000"
            />
          </el-form-item>
        </el-col>
        <el-col :span="24">
          <el-form-item :label="$t('inquiry.internalRemark')">
            <el-input
              v-model="form.internalRemark"
              type="textarea"
              :rows="2"
              maxlength="20000"
            />
          </el-form-item>
        </el-col>
      </el-row>
    </el-form>
    <template #footer>
      <el-button :disabled="saving" @click="emit('update:modelValue', false)">
        {{ $t("common.cancel") }}
      </el-button>
      <el-button type="primary" :loading="saving" @click="submit">
        {{ $t("common.confirm") }}
      </el-button>
    </template>
  </AppDialog>
</template>
<script setup lang="ts">
import { computed, ref, useId, watch } from "vue";
import { useI18n } from "vue-i18n";
import type { FormInstance, FormRules } from "element-plus";
import AppDrawer from "@/components/AppDrawer/index.vue";
import AppDialog from "@/components/AppDialog/index.vue";
import BusinessItemSelect from "@/components/BusinessItemSelect/index.vue";
import { websiteInquiryInput, type WebsiteOwnerOption } from "@/services/website.service";
import type { WebsiteBusinessUnit, WebsiteCity, WebsiteInquiry, WebsiteInquiryInput } from "@/types/website";
import { cloneWebsiteDraft, emptyInquiry } from "../options";
import {
  inquiryDatesInput,
  selectServiceDates,
  setServiceDates,
  switchToConsecutiveDates,
} from "../inquiry-dates";
import { INQUIRY_STATUS_OPTIONS, INQUIRY_STATUS_TAG_TYPES } from "@/views/inquiries/options";
import { addDays, formatDateTime } from "@/utils";
import { serviceDateRanges } from "@/utils/service-dates";
const props = defineProps<{
  modelValue: boolean;
  businessUnit?: WebsiteBusinessUnit;
  showBusiness: boolean;
  record?: WebsiteInquiry;
  initialValues?: Partial<WebsiteInquiryInput>;
  sourceReadOnly?: boolean;
  owners: WebsiteOwnerOption[];
  cities: WebsiteCity[];
  allowAssign: boolean;
  saving: boolean;
  readOnly: boolean;
}>();
const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  save: [input: WebsiteInquiryInput];
  "business-change": [businessUnit?: WebsiteBusinessUnit];
}>();
const { t } = useI18n();
const dateInputId = useId();
const formRef = ref<FormInstance>();
const form = ref<WebsiteInquiryInput>(emptyInquiry());
/** 本次编辑从自选切回连续：展示将要保存的起止范围供计调核对。 */
const switchedToConsecutive = ref(false);
/** 编辑按目标询盘业务，新建（含总部代建）按当前选择的业务。 */
const isWebsite = computed(
  () => (props.record?.businessUnit ?? form.value.businessUnit ?? props.businessUnit) === "website",
);
const selectingDates = computed(() => isWebsite.value && Array.isArray(form.value.serviceDates));
const selectedDayCount = computed(() => form.value.serviceDates?.length ?? 0);
const consecutiveRange = computed(() => {
  const { startDate, plannedDays } = form.value;
  if (!switchedToConsecutive.value || selectingDates.value || !startDate || !plannedDays) return null;
  return { start: startDate, end: addDays(startDate, plannedDays - 1), days: plannedDays };
});
const editableStatusOptions = computed(() => {
  const allowedStatuses = props.record ? [props.record.status, "lost"] : ["new"];
  return INQUIRY_STATUS_OPTIONS.filter((option) => allowedStatuses.includes(option.value));
});
const rules = computed<FormRules>(() => ({
  businessUnit: [
    {
      required: props.showBusiness,
      message: t("common.selectRequired", { field: t("identity.businessUnit") }),
      trigger: "change",
    },
  ],
  countryItemId: [
    {
      required: true,
      message: t("common.selectRequired", { field: t("common.countryOrRegion") }),
      trigger: "change",
    },
  ],
  customerName: [
    {
      required: true,
      whitespace: true,
      message: t("websiteInquiry.customerNameRequired"),
      trigger: "blur",
    },
  ],
  plannedDays: [
    {
      required: true,
      type: "integer",
      min: 1,
      max: 365,
      message: t("websiteInquiry.plannedDaysRange"),
      trigger: "change",
    },
  ],
  serviceDates: [
    {
      required: true,
      type: "array",
      min: 1,
      max: 365,
      message: t("websiteInquiry.serviceDates.range"),
      trigger: "change",
    },
  ],
  // 人数可留空（未确认）；填写时须为 1–10000 的整数，与后端 DTO 一致。
  pax: [
    {
      type: "integer",
      min: 1,
      max: 10000,
      message: t("websiteInquiry.paxRange"),
      trigger: "change",
    },
  ],
  requirements: [
    {
      required: true,
      whitespace: true,
      message: t("inquiry.originalMessageRequired"),
      trigger: "blur",
    },
  ],
  ownerId: [
    {
      required: props.allowAssign && !props.record,
      message: t("websiteInquiry.ownerRequired"),
      trigger: "change",
    },
  ],
  lostReason: [
    {
      required: form.value.status === "lost",
      whitespace: true,
      message: t("inquiry.lostReasonRequired"),
      trigger: "blur",
    },
  ],
}));
watch(
  () => props.modelValue,
  (visible) => {
    if (visible) {
      form.value = props.record
        ? cloneWebsiteDraft(websiteInquiryInput(props.record))
        : { ...emptyInquiry(), ...props.initialValues, businessUnit: props.businessUnit };
      switchedToConsecutive.value = false;
      formRef.value?.clearValidate();
    }
  },
);
function changeBusiness() {
  form.value.ownerId = undefined;
  form.value.destinations = [];
  // 霖熹与独立站共用表单：离开独立站时丢弃未保存的自选日期，开始日期与天数保持勾选前的值。
  if (form.value.businessUnit !== "website") form.value.serviceDates = null;
  switchedToConsecutive.value = false;
  emit("business-change", form.value.businessUnit);
}
function toggleServiceDates(selected: unknown) {
  if (selected) selectServiceDates(form.value);
  else {
    switchToConsecutiveDates(form.value);
    switchedToConsecutive.value = true;
  }
  formRef.value?.clearValidate(["serviceDates", "plannedDays"]);
}
function cityName(id: string) {
  return props.cities.find((city) => city.id === id)?.nameZh ?? id;
}
async function submit() {
  if (await formRef.value?.validate().catch(() => false))
    emit("save", {
      ...cloneWebsiteDraft(form.value),
      ...inquiryDatesInput(form.value, isWebsite.value),
      lostReason: form.value.status === "lost" ? form.value.lostReason : "",
    });
}
</script>
