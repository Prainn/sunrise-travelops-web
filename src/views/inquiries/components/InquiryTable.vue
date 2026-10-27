<template>
  <SectionCard fill>
    <TableToolbar :refreshing="loading" @refresh="emit('refresh')">
      <el-button v-hasPerm="'inquiry:create'" type="primary" @click="emit('create')">
        {{ $t("common.create") }}
      </el-button>
    </TableToolbar>
    <DataTable
      fill
      :loading="loading"
      :data="rows"
      :error="error"
      :filtered="filtered"
      row-key="id"
      @retry="emit('refresh')"
    >
      <el-table-column
        v-if="userStore.userInfo.scope === 'headquarters'"
        :label="$t('identity.businessUnit')"
        width="120"
      >
        <template #default="{ row }">
          <el-tag>{{ businessUnitName(row.businessUnit) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="code" :label="$t('inquiry.code')" width="180" />
      <el-table-column
        prop="agencyName"
        :label="$t('inquiry.agencyName')"
        min-width="190"
        show-overflow-tooltip
      />
      <el-table-column prop="contactName" :label="$t('common.contact')" width="120" />
      <el-table-column
        prop="countryOrRegion"
        :label="$t('common.countryOrRegion')"
        width="110"
      />
      <el-table-column prop="sourceChannel" :label="$t('inquiry.sourceChannel')" width="110" />
      <el-table-column prop="owner" :label="$t('inquiry.owner')" width="100" />
      <el-table-column
        prop="plannedDays"
        :label="$t('inquiry.plannedDays')"
        min-width="100"
        align="center"
      >
        <template #default="scope">
          {{ $t("itinerary.duration", plannedDuration(scope.row.plannedDays)) }}
        </template>
      </el-table-column>
      <el-table-column :label="$t('inquiry.nextFollowUpAt')" width="210">
        <template #default="scope">
          <span
            :class="{
              'text-[var(--el-color-danger)] font-semibold': isOverdue(scope.row as InquiryRecord),
            }"
          >
            {{
              formatDateTime(scope.row.nextFollowUpAt) === "-"
                ? $t("common.notSet")
                : formatDateTime(scope.row.nextFollowUpAt)
            }}
          </span>
        </template>
      </el-table-column>
      <el-table-column
        prop="createdAt"
        :formatter="(row: InquiryRecord) => formatDateTime(row.createdAt)"
        :label="$t('common.createdAt')"
        width="210"
      />
      <el-table-column :label="$t('common.status')" min-width="100" align="center">
        <template #default="scope">
          <el-tag :type="INQUIRY_STATUS_TAG_TYPES[scope.row.status as InquiryStatus]">
            {{ $t(`inquiry.statuses.${scope.row.status}`) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        :label="$t('common.actions')"
        :width="locale === 'en' ? 500 : 340"
        fixed="right"
        :show-overflow-tooltip="false"
      >
        <template #default="scope">
          <RowActions class="flex-nowrap!">
            <el-button type="primary" link @click="emit('view', scope.row as InquiryRecord)">
              {{ $t("common.view") }}
            </el-button>
            <el-button
              v-hasPerm="'itinerary:list'"
              type="primary"
              link
              @click="emit('manage-itineraries', scope.row as InquiryRecord)"
            >
              {{ $t("inquiry.itineraryManagement") }}
            </el-button>
            <el-button
              v-if="!isInquiryReadOnly(scope.row.status as InquiryStatus, scope.row.hasActiveTour)"
              v-hasPerm="'inquiry:update'"
              type="primary"
              link
              :disabled="isPending?.(scope.row.id)"
              @click="emit('edit', scope.row as InquiryRecord)"
            >
              {{ $t("common.edit") }}
            </el-button>
            <InquiryTransferButton
              v-if="!scope.row.hasActiveTour"
              :inquiry="scope.row as InquiryRecord"
              @transferred="emit('refresh')"
            />
            <template #more>
              <el-dropdown-item @click="emit('view-logs', scope.row as InquiryRecord)">
                {{ $t("inquiry.log.title") }}
              </el-dropdown-item>
              <el-dropdown-item
                v-if="
                  hasPerm('inquiry:archive')
                    && !isInquiryReadOnly(scope.row.status as InquiryStatus, scope.row.hasActiveTour)
                "
                :disabled="isPending?.(scope.row.id)"
                @click="emit('archive', scope.row as InquiryRecord)"
              >
                {{ $t("inquiry.archive") }}
              </el-dropdown-item>
              <el-dropdown-item
                v-if="hasPerm('inquiry:delete') && scope.row.canDelete"
                :disabled="isPending?.(scope.row.id)"
                @click="emit('delete', scope.row as InquiryRecord)"
              >
                <span class="text-[var(--el-color-danger)]">{{ $t("common.delete") }}</span>
              </el-dropdown-item>
            </template>
          </RowActions>
        </template>
      </el-table-column>
    </DataTable>
    <!-- 页码与条数由父级 watch 统一触发一次加载，这里不再监听 pagination 事件 -->
    <Pagination
      v-if="total > 0"
      :page="pageNum"
      :limit="pageSize"
      :total="total"
      @update:page="emit('update:pageNum', $event)"
      @update:limit="emit('update:pageSize', $event)"
    />
  </SectionCard>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
import DataTable from "@/components/DataTable/index.vue";
import Pagination from "@/components/Pagination/index.vue";
import RowActions from "@/components/RowActions/index.vue";
import SectionCard from "@/components/SectionCard/index.vue";
import TableToolbar from "@/components/TableToolbar/index.vue";
import { businessUnitName } from "@/constants/identity";
import { useUserStore } from "@/stores/user";
import InquiryTransferButton from "./InquiryTransferButton.vue";
import { formatDateTime } from "@/utils";
import { hasPerm } from "@/utils/auth";
import { plannedDuration } from "@/views/inquiries/itineraries/duration";
import type { InquiryRecord, InquiryStatus } from "@/types/inquiry";
import { INQUIRY_STATUS_TAG_TYPES } from "../options";
import { isInquiryReadOnly } from "../inquiry-workflow";

const userStore = useUserStore();
// 常用操作需在一行内展示，英文按钮文案更长
const { locale } = useI18n();

defineProps<{
  rows: InquiryRecord[];
  total: number;
  pageNum: number;
  pageSize: number;
  loading?: boolean;
  /** 列表加载失败信息 */
  error?: string;
  /** 存在生效的筛选条件 */
  filtered?: boolean;
  /** 行写操作处理中时禁用该行的编辑与归档 */
  isPending?: (id: string) => boolean;
}>();
const emit = defineEmits<{
  refresh: [];
  create: [];
  view: [record: InquiryRecord];
  edit: [record: InquiryRecord];
  archive: [record: InquiryRecord];
  delete: [record: InquiryRecord];
  "manage-itineraries": [record: InquiryRecord];
  "view-logs": [record: InquiryRecord];
  "update:pageNum": [value: number];
  "update:pageSize": [value: number];
}>();

function isOverdue(record: InquiryRecord) {
  if (!record.nextFollowUpAt || ["lost", "archived"].includes(record.status)) return false;
  return new Date(record.nextFollowUpAt.replace(" ", "T")).getTime() < Date.now();
}
</script>
