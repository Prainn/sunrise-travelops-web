<template>
  <el-card class="page-content" shadow="never">
    <TableToolbar @refresh="emit('refresh')">
      <el-button v-if="can('website:inquiry:create')" type="primary" @click="emit('create')">
        {{ $t("websiteInquiry.createTitle") }}
      </el-button>
    </TableToolbar>
    <div class="page-table-wrapper">
      <el-table
        :data="rows"
        border
        height="100%"
        row-key="id"
      >
        <el-table-column prop="code" :label="$t('websiteInquiry.code')" width="180" />
        <el-table-column
          prop="customerName"
          :label="$t('websiteInquiry.customer')"
          min-width="190"
          show-overflow-tooltip
        />
        <el-table-column prop="owner" :label="$t('websiteInquiry.owner')" width="110" />
        <el-table-column :label="$t('websiteInquiry.plannedDays')" width="100" align="center">
          <template #default="{ row }">
            {{ $t("websiteInquiry.dayCount", { days: row.plannedDays }, row.plannedDays) }}
          </template>
        </el-table-column>
        <el-table-column :label="$t('common.startDate')" width="120">
          <template #default="{ row }">
            {{ row.startDate || $t("websiteInquiry.unconfirmed") }}
          </template>
        </el-table-column>
        <el-table-column :label="$t('websiteInquiry.pax')" width="100" align="center">
          <template #default="{ row }">
            {{ row.pax ?? $t("websiteInquiry.unconfirmed") }}
          </template>
        </el-table-column>
        <el-table-column
          prop="requirements"
          :label="$t('websiteInquiry.requirements')"
          min-width="220"
          show-overflow-tooltip
        />
        <el-table-column :label="$t('common.createdAt')" width="210">
          <template #default="{ row }">
            {{ formatDateTime(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column :label="$t('common.status')" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="INQUIRY_STATUS_TAG_TYPES[row.status as WebsiteInquiry['status']]">
              {{ $t(INQUIRY_STATUS_LABEL_KEYS[row.status as WebsiteInquiry["status"]]) }}
            </el-tag>
          </template>
        </el-table-column>
        <!-- @vue-generic {WebsiteInquiry} -->
        <el-table-column
          :label="$t('common.actions')"
          fixed="right"
          width="300"
          align="center"
        >
          <template #default="{ row }">
            <el-button type="primary" link @click="emit('view', row)">
              {{ $t("websiteInquiry.details") }}
            </el-button>
            <el-button
              v-if="can('website:inquiry:transfer') && !ended(row)"
              type="primary"
              link
              @click="emit('transfer', row)"
            >
              {{ $t("websiteInquiry.transfer") }}
            </el-button>
            <el-button
              v-if="can('website:inquiry:update') && !ended(row)"
              type="primary"
              link
              @click="emit('edit', row)"
            >
              {{ $t("common.edit") }}
            </el-button>
            <el-button
              v-if="can('website:inquiry:archive') && !ended(row)"
              type="warning"
              link
              @click="emit('archive', row)"
            >
              {{ $t("websiteInquiry.archive") }}
            </el-button>
            <el-button
              v-if="can('website:inquiry:update') && !ended(row)"
              type="danger"
              link
              @click="emit('lost', row)"
            >
              {{ $t("websiteInquiry.lost") }}
            </el-button>
          </template>
        </el-table-column>
        <!-- @vue-generic {WebsiteInquiry} -->
        <el-table-column
          :label="$t('websiteInquiry.itinerary')"
          fixed="right"
          width="240"
          align="center"
        >
          <template #default="{ row }">
            <el-button
              v-if="can('website:itinerary:list')"
              type="primary"
              link
              @click="emit('itineraries', row)"
            >
              {{ $t("websiteInquiry.itineraryAndQuote") }}
            </el-button>
            <el-button type="primary" link @click="emit('history', row)">
              {{ $t("websiteInquiry.history") }}
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>
    <Pagination
      v-if="total"
      :page="page"
      :limit="pageSize"
      :total="total"
      @update:page="emit('update:page', $event)"
      @update:limit="emit('update:pageSize', $event)"
      @pagination="emit('refresh')"
    />
  </el-card>
</template>
<script setup lang="ts">
import TableToolbar from "@/components/TableToolbar/index.vue";
import Pagination from "@/components/Pagination/index.vue";
import { formatDateTime } from "@/utils";
import type { WebsiteInquiry } from "@/types/website";
import { INQUIRY_STATUS_TAG_TYPES } from "@/views/inquiries/options";
import { INQUIRY_STATUS_LABEL_KEYS } from "../options";
defineProps<{
  rows: WebsiteInquiry[];
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
  history: [record: WebsiteInquiry];
  "update:page": [value: number];
  "update:pageSize": [value: number];
}>();
function ended(record: WebsiteInquiry) {
  return record.status === "lost" || record.status === "archived";
}
</script>
