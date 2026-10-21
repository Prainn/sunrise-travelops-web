<template>
  <SectionCard fill>
    <TableToolbar @refresh="emit('refresh')">
      <el-button v-if="can('website:inquiry:create')" type="primary" @click="emit('create')">
        {{ $t("common.create") }}
      </el-button>
    </TableToolbar>
    <DataTable
      fill
      :data="rows"
      row-key="id"
    >
      <el-table-column v-if="showBusiness" :label="$t('websiteInquiry.businessUnit')" min-width="100">
        <template #default="{ row }">
          {{ $t(`websiteInquiry.businessUnits.${row.businessUnit}`) }}
        </template>
      </el-table-column>
      <el-table-column prop="code" :label="$t('inquiry.code')" min-width="150" />
      <el-table-column
        prop="customerName"
        :label="$t('websiteInquiry.customer')"
        width="180"
        show-overflow-tooltip
      />
      <el-table-column prop="owner" :label="$t('inquiry.owner')" min-width="100" />
      <el-table-column :label="$t('inquiry.plannedDays')" min-width="100" align="center">
        <template #default="{ row }">
          {{ $t("websiteInquiry.dayCount", { days: row.plannedDays }, row.plannedDays) }}
        </template>
      </el-table-column>
      <el-table-column :label="$t('common.startDate')" min-width="120">
        <template #default="{ row }">
          {{ row.startDate || $t("websiteInquiry.unconfirmed") }}
        </template>
      </el-table-column>
      <el-table-column :label="$t('websiteInquiry.pax')" min-width="100" align="center">
        <template #default="{ row }">
          {{ row.pax ?? $t("websiteInquiry.unconfirmed") }}
        </template>
      </el-table-column>
      <el-table-column :label="$t('common.createdAt')" min-width="160">
        <template #default="{ row }">
          {{ formatDateTime(row.createdAt) }}
        </template>
      </el-table-column>
      <el-table-column :label="$t('websiteInquiry.updatedAt')" min-width="160">
        <template #default="{ row }">
          {{ formatDateTime(row.updatedAt) }}
        </template>
      </el-table-column>
      <el-table-column :label="$t('common.status')" min-width="140" align="center">
        <template #default="{ row }">
          <el-tag :type="INQUIRY_STATUS_TAG_TYPES[row.status as WebsiteInquiry['status']]">
            {{ $t(`inquiry.statuses.${row.status}`) }}
          </el-tag>
        </template>
      </el-table-column>
      <!-- @vue-generic {WebsiteInquiry} -->
      <el-table-column
        :label="$t('common.actions')"
        :width="locale === 'en' ? 410 : 300"
        fixed="right"
        :show-overflow-tooltip="false"
      >
        <template #default="{ row }">
          <RowActions class="flex-nowrap!">
            <el-button type="primary" link @click="emit('view', row)">
              {{ $t("common.view") }}
            </el-button>
            <el-button
              v-if="can('website:itinerary:list')"
              type="primary"
              link
              @click="emit('itineraries', row)"
            >
              {{ $t("inquiry.itineraryManagement") }}
            </el-button>
            <el-button
              v-if="can('website:inquiry:update') && !ended(row)"
              type="primary"
              link
              @click="emit('edit', row)"
            >
              {{ $t("common.edit") }}
            </el-button>
            <template
              v-if="!ended(row) && (can('website:inquiry:transfer') || can('website:inquiry:archive'))"
              #more
            >
              <el-dropdown-item v-if="can('website:inquiry:transfer')" @click="emit('transfer', row)">
                {{ $t("identity.transfer") }}
              </el-dropdown-item>
              <el-dropdown-item v-if="can('website:inquiry:archive')" @click="emit('archive', row)">
                {{ $t("inquiry.archive") }}
              </el-dropdown-item>
            </template>
          </RowActions>
        </template>
      </el-table-column>
    </DataTable>
    <Pagination
      v-if="total"
      :page="page"
      :limit="pageSize"
      :total="total"
      @update:page="emit('update:page', $event)"
      @update:limit="emit('update:pageSize', $event)"
      @pagination="emit('refresh')"
    />
  </SectionCard>
</template>
<script setup lang="ts">
import { useI18n } from "vue-i18n";
import DataTable from "@/components/DataTable/index.vue";
import RowActions from "@/components/RowActions/index.vue";
import SectionCard from "@/components/SectionCard/index.vue";
import TableToolbar from "@/components/TableToolbar/index.vue";
import Pagination from "@/components/Pagination/index.vue";
import { formatDateTime } from "@/utils";
import type { WebsiteInquiry } from "@/types/website";
import { INQUIRY_STATUS_TAG_TYPES } from "@/views/inquiries/options";
// 常用操作需在一行内展示，英文按钮文案更长
const { locale } = useI18n();
defineProps<{
  rows: WebsiteInquiry[];
  showBusiness: boolean;
  total: number;
  page: number;
  pageSize: number;
  can: (permission: string) => boolean;
}>();
const emit = defineEmits<{
  refresh: [];
  create: [];
  view: [record: WebsiteInquiry];
  edit: [record: WebsiteInquiry];
  transfer: [record: WebsiteInquiry];
  archive: [record: WebsiteInquiry];
  lost: [record: WebsiteInquiry];
  itineraries: [record: WebsiteInquiry];
  "update:page": [value: number];
  "update:pageSize": [value: number];
}>();
function ended(record: WebsiteInquiry) {
  return record.hasActiveTour || record.status === "lost" || record.status === "archived";
}
</script>
