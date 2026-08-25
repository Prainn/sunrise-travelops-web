<template>
  <el-card
    class="page-content"
    shadow="never"
  >
    <div class="page-toolbar">
      <div class="page-toolbar__left">
        <el-button
          type="primary"
          @click="emit('create')"
        >
          {{ $t("inquiry.createInquiry") }}
        </el-button>
      </div>
    </div>
    <div class="page-table-wrapper">
      <el-table
        :data="rows"
        border
        height="100%"
        row-key="id"
      >
        <el-table-column
          prop="code"
          :label="$t('inquiry.code')"
          width="155"
        />
        <el-table-column
          prop="agencyName"
          :label="$t('inquiry.agencyName')"
          min-width="190"
          show-overflow-tooltip
        />
        <el-table-column
          prop="contactName"
          :label="$t('inquiry.contactName')"
          min-width="130"
        />
        <el-table-column
          prop="countryOrRegion"
          :label="$t('inquiry.countryOrRegion')"
          width="110"
        />
        <el-table-column
          prop="sourceChannel"
          :label="$t('inquiry.sourceChannel')"
          width="110"
        />
        <el-table-column
          prop="owner"
          :label="$t('inquiry.owner')"
          width="100"
        />
        <el-table-column
          :label="$t('inquiry.nextFollowUpAt')"
          width="165"
        >
          <template #default="scope">
            <span :class="{ 'inquiry-table__overdue': isOverdue(scope.row as InquiryRecord) }">
              {{ scope.row.nextFollowUpAt || $t("common.notSet") }}
            </span>
          </template>
        </el-table-column>
        <el-table-column
          :label="$t('common.status')"
          width="110"
          align="center"
        >
          <template #default="scope">
            <el-tag :type="INQUIRY_STATUS_TAG_TYPES[scope.row.status as InquiryStatus]">
              {{ $t(`inquiry.statuses.${scope.row.status}`) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column
          prop="createdAt"
          :label="$t('common.createdAt')"
          width="165"
        />
        <el-table-column
          :label="$t('common.actions')"
          width="190"
          fixed="right"
          align="center"
        >
          <template #default="scope">
            <el-button
              type="primary"
              link
              @click="emit('view', scope.row as InquiryRecord)"
            >
              {{ $t("common.view") }}
            </el-button>
            <el-button
              type="primary"
              link
              @click="emit('edit', scope.row as InquiryRecord)"
            >
              {{ $t("common.edit") }}
            </el-button>
            <el-button
              v-if="scope.row.status !== 'archived'"
              type="warning"
              link
              @click="emit('archive', scope.row as InquiryRecord)"
            >
              {{ $t("inquiry.archive") }}
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>
    <pagination
      v-if="total"
      :page="pageNum"
      :limit="pageSize"
      :total="total"
      @update:page="emit('update:pageNum', $event)"
      @update:limit="emit('update:pageSize', $event)"
    />
  </el-card>
</template>

<script setup lang="ts">
import type { InquiryRecord, InquiryStatus } from "@/data/data";
import { INQUIRY_STATUS_TAG_TYPES } from "../options";

defineProps<{ rows: InquiryRecord[]; total: number; pageNum: number; pageSize: number }>();
const emit = defineEmits<{
  create: [];
  view: [record: InquiryRecord];
  edit: [record: InquiryRecord];
  archive: [record: InquiryRecord];
  "update:pageNum": [value: number];
  "update:pageSize": [value: number];
}>();

function isOverdue(record: InquiryRecord) {
  if (!record.nextFollowUpAt || ["lost", "archived"].includes(record.status)) return false;
  return new Date(record.nextFollowUpAt.replace(" ", "T")).getTime() < Date.now();
}
</script>

<style scoped lang="scss">
.inquiry-table__overdue {
  color: var(--el-color-danger);
  font-weight: 600;
}
</style>
