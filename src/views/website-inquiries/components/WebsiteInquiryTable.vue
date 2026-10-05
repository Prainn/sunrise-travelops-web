<template>
  <el-card class="page-content" shadow="never">
    <TableToolbar @refresh="emit('refresh')">
      <el-button v-if="can('website:inquiry:create')" type="primary" @click="emit('create')"
        >新增独立站询盘</el-button
      >
    </TableToolbar>
    <div class="page-table-wrapper">
      <el-table :data="rows" border height="100%" row-key="id">
        <el-table-column prop="code" label="编号" width="180" />
        <el-table-column prop="customerName" label="客户" min-width="190" show-overflow-tooltip />
        <el-table-column prop="owner" label="负责计调" width="110" />
        <el-table-column label="计划天数" width="100" align="center">
          <template #default="{ row }">{{ row.plannedDays }} 天</template>
        </el-table-column>
        <el-table-column label="开始日期" width="120">
          <template #default="{ row }">{{ row.startDate || "未确认" }}</template>
        </el-table-column>
        <el-table-column label="人数" width="100" align="center">
          <template #default="{ row }">{{ row.pax ?? "未确认" }}</template>
        </el-table-column>
        <el-table-column
          prop="requirements"
          label="需求说明"
          min-width="220"
          show-overflow-tooltip
        />
        <el-table-column label="创建时间" width="210">
          <template #default="{ row }">{{ formatDateTime(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="INQUIRY_STATUS_TAG_TYPES[row.status as WebsiteInquiry['status']]">{{
              INQUIRY_STATUS_LABELS[row.status as WebsiteInquiry["status"]]
            }}</el-tag>
          </template>
        </el-table-column>
        <!-- @vue-generic {WebsiteInquiry} -->
        <el-table-column label="操作" fixed="right" width="300" align="center">
          <template #default="{ row }">
            <el-button type="primary" link @click="emit('view', row)">详情</el-button>
            <el-button
              v-if="can('website:inquiry:transfer') && !ended(row)"
              type="primary"
              link
              @click="emit('transfer', row)"
              >转交</el-button
            >
            <el-button
              v-if="can('website:inquiry:update') && !ended(row)"
              type="primary"
              link
              @click="emit('edit', row)"
              >编辑</el-button
            >
            <el-button
              v-if="can('website:inquiry:archive') && !ended(row)"
              type="warning"
              link
              @click="emit('archive', row)"
              >归档</el-button
            >
            <el-button
              v-if="can('website:inquiry:update') && !ended(row)"
              type="danger"
              link
              @click="emit('lost', row)"
              >流失</el-button
            >
          </template>
        </el-table-column>
        <!-- @vue-generic {WebsiteInquiry} -->
        <el-table-column label="行程" fixed="right" width="240" align="center">
          <template #default="{ row }">
            <el-button
              v-if="can('website:itinerary:list')"
              type="primary"
              link
              @click="emit('itineraries', row)"
              >行程与报价</el-button
            >
            <el-button type="primary" link @click="emit('history', row)">询盘日志</el-button>
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
import { INQUIRY_STATUS_LABELS } from "../options";
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
