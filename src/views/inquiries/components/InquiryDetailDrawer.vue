<template>
  <el-drawer
    :model-value="modelValue"
    :title="$t('inquiry.inquiryDetail')"
    size="680px"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <template v-if="record">
      <div class="inquiry-detail__header">
        <div>
          <h3>{{ record.agencyName }}</h3>
          <span>{{ record.code }}</span>
        </div>
        <el-tag :type="INQUIRY_STATUS_TAG_TYPES[record.status]">
          {{ $t(`inquiry.statuses.${record.status}`) }}
        </el-tag>
      </div>
      <el-descriptions
        :column="2"
        border
      >
        <el-descriptions-item :label="$t('inquiry.agencyCode')">
          {{ valueOrDash(record.agencyCode) }}
        </el-descriptions-item>
        <el-descriptions-item :label="$t('inquiry.owner')">
          {{ record.owner }}
        </el-descriptions-item>
        <el-descriptions-item :label="$t('inquiry.contactName')">
          {{ record.contactName }}
        </el-descriptions-item>
        <el-descriptions-item :label="$t('inquiry.contactPosition')">
          {{ valueOrDash(record.contactPosition) }}
        </el-descriptions-item>
        <el-descriptions-item :label="$t('inquiry.email')">
          {{ valueOrDash(record.email) }}
        </el-descriptions-item>
        <el-descriptions-item :label="$t('inquiry.phone')">
          {{ valueOrDash(record.phone) }}
        </el-descriptions-item>
        <el-descriptions-item :label="$t('inquiry.whatsapp')">
          {{ valueOrDash(record.whatsapp) }}
        </el-descriptions-item>
        <el-descriptions-item :label="$t('inquiry.countryOrRegion')">
          {{ valueOrDash(record.countryOrRegion) }}
        </el-descriptions-item>
        <el-descriptions-item :label="$t('inquiry.sourceChannel')">
          {{ record.sourceChannel }}
        </el-descriptions-item>
        <el-descriptions-item :label="$t('inquiry.nextFollowUpAt')">
          {{ valueOrDash(record.nextFollowUpAt) }}
        </el-descriptions-item>
        <el-descriptions-item :label="$t('common.createdAt')">
          {{ record.createdAt }}
        </el-descriptions-item>
        <el-descriptions-item :label="$t('inquiry.creator')">
          {{ record.creator }}
        </el-descriptions-item>
        <el-descriptions-item
          :label="$t('inquiry.originalMessage')"
          :span="2"
        >
          {{ record.originalMessage }}
        </el-descriptions-item>
        <el-descriptions-item
          :label="$t('inquiry.internalRemark')"
          :span="2"
        >
          {{ valueOrDash(record.internalRemark) }}
        </el-descriptions-item>
        <el-descriptions-item
          v-if="record.status === 'lost'"
          :label="$t('inquiry.lostReason')"
          :span="2"
        >
          {{ record.lostReason }}
        </el-descriptions-item>
      </el-descriptions>
    </template>
  </el-drawer>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
import type { InquiryRecord } from "@/data/data";
import { INQUIRY_STATUS_TAG_TYPES } from "../options";

defineProps<{ modelValue: boolean; record?: InquiryRecord }>();
const emit = defineEmits<{ "update:modelValue": [value: boolean] }>();
const { t } = useI18n();

function valueOrDash(value: string) {
  return value || t("common.notSet");
}
</script>

<style scoped lang="scss">
.inquiry-detail__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 20px;

  h3 {
    margin: 0 0 4px;
    font-size: 18px;
  }

  span {
    color: var(--el-text-color-secondary);
  }
}
</style>
