<template>
  <el-drawer
    v-if="readOnly"
    :model-value="modelValue"
    :title="$t('websiteInquiry.detailTitle')"
    size="min(680px, 94vw)"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <template v-if="record">
      <div class="flex items-start justify-between mb-[20px]">
        <div>
          <h3 class="m-[0_0_4px] text-[18px]">
            {{ record.customerName }}
          </h3>
          <span class="text-[var(--el-text-color-secondary)]">{{ record.code }}</span>
        </div>
        <el-tag :type="INQUIRY_STATUS_TAG_TYPES[record.status]">
          {{ $t(INQUIRY_STATUS_LABEL_KEYS[record.status]) }}
        </el-tag>
      </div>
      <el-descriptions :column="1" border>
        <el-descriptions-item :label="$t('websiteInquiry.owner')">
          {{ record.owner }}
        </el-descriptions-item>
        <el-descriptions-item :label="$t('websiteInquiry.plannedDays')">
          {{ $t("websiteInquiry.dayCount", { days: record.plannedDays }, record.plannedDays) }}
        </el-descriptions-item>
        <el-descriptions-item :label="$t('common.startDate')">
          {{ record.startDate || $t("websiteInquiry.unconfirmed") }}
        </el-descriptions-item>
        <el-descriptions-item :label="$t('websiteInquiry.pax')">
          {{ record.pax ?? $t("websiteInquiry.unconfirmed") }}
        </el-descriptions-item>
        <el-descriptions-item :label="$t('websiteInquiry.phone')">
          {{ record.phone || $t("common.notSet") }}
        </el-descriptions-item>
        <el-descriptions-item :label="$t('websiteInquiry.email')">
          {{ record.email || $t("common.notSet") }}
        </el-descriptions-item>
        <el-descriptions-item :label="$t('websiteInquiry.arrivalTime')">
          {{ record.arrivalTime || $t("websiteInquiry.unconfirmed") }}
        </el-descriptions-item>
        <el-descriptions-item :label="$t('websiteInquiry.departureTime')">
          {{ record.departureTime || $t("websiteInquiry.unconfirmed") }}
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
        <el-descriptions-item :label="$t('websiteInquiry.originalRequirements')">
          <div class="whitespace-pre-wrap">
            {{ record.requirements }}
          </div>
        </el-descriptions-item>
        <el-descriptions-item :label="$t('websiteInquiry.internalRemark')">
          <div class="whitespace-pre-wrap">
            {{ record.internalRemark || $t("common.notSet") }}
          </div>
        </el-descriptions-item>
        <el-descriptions-item
          v-if="record.status === 'lost'"
          :label="$t('websiteInquiry.lostReason')"
        >
          {{ record.lostReason }}
        </el-descriptions-item>
      </el-descriptions>
    </template>
  </el-drawer>
  <el-dialog
    v-else
    :model-value="modelValue"
    :title="$t(record ? 'websiteInquiry.editTitle' : 'websiteInquiry.createTitle')"
    width="min(820px, 94vw)"
    :close-on-click-modal="false"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-width="auto"
      :disabled="saving"
    >
      <el-row :gutter="16">
        <el-col v-if="record" :xs="24" :sm="12">
          <el-form-item :label="$t('websiteInquiry.code')">
            <el-input :model-value="record.code" disabled />
          </el-form-item>
        </el-col>
        <el-col :xs="24" :sm="12">
          <el-form-item :label="$t('websiteInquiry.customerName')" prop="customerName">
            <el-input v-model="form.customerName" maxlength="100" />
          </el-form-item>
        </el-col>
        <el-col :xs="24" :sm="12">
          <el-form-item :label="$t('websiteInquiry.plannedDays')" prop="plannedDays">
            <el-input-number
              v-model="form.plannedDays"
              :min="1"
              :max="365"
              controls-position="right"
            />
          </el-form-item>
        </el-col>
        <el-col v-if="record" :xs="24" :sm="12">
          <el-form-item :label="$t('websiteInquiry.owner')">
            <el-input :model-value="record.owner" disabled />
          </el-form-item>
        </el-col>
        <el-col v-else-if="allowAssign" :xs="24" :sm="12">
          <el-form-item :label="$t('websiteInquiry.owner')" prop="ownerId">
            <el-select v-model="form.ownerId" filterable>
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
          <el-form-item :label="$t('common.startDate')">
            <el-date-picker
              v-model="form.startDate"
              value-format="YYYY-MM-DD"
              clearable
              class="w-full"
            />
          </el-form-item>
        </el-col>
        <el-col :xs="24" :sm="12">
          <el-form-item :label="$t('websiteInquiry.pax')">
            <el-input-number
              v-model="form.pax"
              :min="1"
              :max="10000"
              controls-position="right"
            />
          </el-form-item>
        </el-col>
        <el-col :xs="24" :sm="12">
          <el-form-item :label="$t('websiteInquiry.phone')">
            <el-input v-model="form.phone" maxlength="50" />
          </el-form-item>
        </el-col>
        <el-col :xs="24" :sm="12">
          <el-form-item :label="$t('websiteInquiry.email')" prop="email">
            <el-input v-model="form.email" maxlength="254" />
          </el-form-item>
        </el-col>
      </el-row>
      <el-row :gutter="16">
        <el-col :xs="24" :sm="12">
          <el-form-item :label="$t('websiteInquiry.arrivalTime')">
            <el-input
              v-model="form.arrivalTime"
              :placeholder="$t('websiteInquiry.timeExample', { time: '10:30' })"
              maxlength="100"
            />
          </el-form-item>
        </el-col>
        <el-col :xs="24" :sm="12">
          <el-form-item :label="$t('websiteInquiry.departureTime')">
            <el-input
              v-model="form.departureTime"
              :placeholder="$t('websiteInquiry.timeExample', { time: '18:00' })"
              maxlength="100"
            />
          </el-form-item>
        </el-col>
      </el-row>
      <el-row :gutter="16">
        <el-col :span="24">
          <el-form-item :label="$t('websiteInquiry.destinations')">
            <el-select v-model="form.destinations" multiple filterable>
              <el-option
                v-for="city in cities"
                :key="city.id"
                :value="city.id"
                :label="city.nameZh"
              />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="24">
          <el-form-item :label="$t('websiteInquiry.originalRequirements')" prop="requirements">
            <el-input
              v-model="form.requirements"
              type="textarea"
              :rows="5"
              maxlength="200000"
            />
          </el-form-item>
        </el-col>
        <el-col :span="24">
          <el-form-item :label="$t('websiteInquiry.internalRemark')">
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
        {{ $t("websiteInquiry.save") }}
      </el-button>
    </template>
  </el-dialog>
</template>
<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import type { FormInstance, FormRules } from "element-plus";
import { websiteInquiryInput, type WebsiteOwnerOption } from "@/services/website.service";
import type { WebsiteCity, WebsiteInquiry, WebsiteInquiryInput } from "@/types/website";
import { cloneWebsiteDraft, emptyInquiry, INQUIRY_STATUS_LABEL_KEYS } from "../options";
import { INQUIRY_STATUS_TAG_TYPES } from "@/views/inquiries/options";
import { formatDateTime } from "@/utils";
const props = defineProps<{
  modelValue: boolean;
  record?: WebsiteInquiry;
  owners: WebsiteOwnerOption[];
  cities: WebsiteCity[];
  allowAssign: boolean;
  saving: boolean;
  readOnly: boolean;
}>();
const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  save: [input: WebsiteInquiryInput];
}>();
const { t } = useI18n();
const formRef = ref<FormInstance>();
const form = ref<WebsiteInquiryInput>(emptyInquiry());
const rules = computed<FormRules>(() => ({
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
      type: "number",
      min: 1,
      max: 365,
      message: t("websiteInquiry.plannedDaysRange"),
      trigger: "change",
    },
  ],
  requirements: [
    {
      required: true,
      whitespace: true,
      message: t("websiteInquiry.requirementsRequired"),
      trigger: "blur",
    },
  ],
  email: [{ type: "email", message: t("websiteInquiry.validEmailRequired"), trigger: "blur" }],
  ownerId: [
    {
      required: props.allowAssign && !props.record,
      message: t("websiteInquiry.ownerRequired"),
      trigger: "change",
    },
  ],
}));
watch(
  () => props.modelValue,
  (visible) => {
    if (visible) {
      form.value = props.record
        ? cloneWebsiteDraft(websiteInquiryInput(props.record))
        : emptyInquiry();
      formRef.value?.clearValidate();
    }
  },
);
function cityName(id: string) {
  return props.cities.find((city) => city.id === id)?.nameZh ?? id;
}
async function submit() {
  if (await formRef.value?.validate().catch(() => false))
    emit("save", cloneWebsiteDraft(form.value));
}
</script>
