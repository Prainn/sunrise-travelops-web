<template>
  <PageShell>
    <FilterBar @reset="reset">
      <el-form-item :label="$t('operationLog.category')">
        <el-select
          v-model="category"
          autocomplete="new-password"
          clearable
          :placeholder="$t('common.all')"
        >
          <el-option
            v-for="option in categories"
            :key="option.value"
            :label="$t(option.label)"
            :value="option.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item :label="$t('identity.businessUnit')">
        <el-select
          v-model="scope"
          autocomplete="new-password"
          clearable
          :placeholder="$t('identity.allBusinesses')"
        >
          <el-option
            v-for="option in scopes"
            :key="option.value"
            :label="$t(option.label)"
            :value="option.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item :label="$t('common.dateRange')" class="filter-bar__wide">
        <el-date-picker
          v-model="dateRange"
          type="daterange"
          value-format="YYYY-MM-DD"
          :start-placeholder="$t('common.startDate')"
          :end-placeholder="$t('common.endDate')"
        />
      </el-form-item>
      <el-form-item :label="$t('common.operator')">
        <el-input
          v-model="actorName"
          :placeholder="$t('operationLog.actorPlaceholder')"
          maxlength="80"
          clearable
        />
      </el-form-item>
    </FilterBar>

    <SectionCard fill>
      <TableToolbar :refreshing="loading" @refresh="handleRefresh" />
      <DataTable
        fill
        :loading="loading"
        :data="list"
        :error="loadError"
        :filtered="Boolean(category || scope || dateRange || actorName.trim())"
        row-key="id"
        @retry="handleRetry"
      >
        <el-table-column :label="$t('common.time')" min-width="190">
          <template #default="{ row }">
            {{ formatBeijingTime(row.time) }}
          </template>
        </el-table-column>
        <el-table-column
          :label="$t('identity.businessUnit')"
          min-width="120"
        >
          <template #default="{ row }">
            {{ formatOperationScope(row.scope, t) }}
          </template>
        </el-table-column>
        <el-table-column :label="$t('operationLog.category')" min-width="120">
          <template #default="{ row }">
            {{ categoryLabel(row.category) }}
          </template>
        </el-table-column>
        <el-table-column :label="$t('common.operator')" min-width="130">
          <template #default="{ row }">
            {{ formatOperationActor(row.actorName, t) }}
          </template>
        </el-table-column>
        <el-table-column :label="$t('operationLog.action')" min-width="180">
          <template #default="{ row }">
            {{ actionLabel(row.action) }}
          </template>
        </el-table-column>
        <el-table-column :label="$t('operationLog.result')" min-width="110">
          <template #default="{ row }">
            <el-tag :type="operationResultTagType(resolveOperationResult(row))">
              {{ $t(operationResultLabelKey(resolveOperationResult(row))) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column
          :label="$t('common.details')"
          min-width="320"
          show-overflow-tooltip
        >
          <template #default="{ row }">
            {{ formatOperationDetail(row.detail, t) }}
          </template>
        </el-table-column>
      </DataTable>
      <Pagination
        v-if="total > 0"
        v-model:page="page"
        v-model:limit="pageSize"
        :total="total"
        @pagination="handlePagination"
      />
    </SectionCard>
  </PageShell>
</template>

<script setup lang="ts">
import { onMounted } from "vue";
import { useI18n } from "vue-i18n";
import DataTable from "@/components/DataTable/index.vue";
import FilterBar from "@/components/FilterBar/index.vue";
import PageShell from "@/components/PageShell/index.vue";
import Pagination from "@/components/Pagination/index.vue";
import SectionCard from "@/components/SectionCard/index.vue";
import TableToolbar from "@/components/TableToolbar/index.vue";
import { useRefreshOnActivated } from "@/composables";
import type { OperationCategory, OperationScope } from "@/types/operation-log";
import {
  formatBeijingTime,
  formatOperationActor,
  formatOperationDetail,
  formatOperationScope,
  operationResultLabelKey,
  operationResultTagType,
  resolveOperationResult,
} from "@/utils/operation-log-format";
import { useOperationLogs } from "./useOperationLogs";

const { t } = useI18n();

const actionCodeLabels: Record<string, string> = {
  "website.initial-data.import": "operationLog.websiteInitialDataImport",
};

const actionLabel = (action: string) =>
  actionCodeLabels[action] ? t(actionCodeLabels[action]) : action;

const categories: { value: OperationCategory; label: string }[] = [
  { value: "login", label: "operationLog.login" },
  { value: "user", label: "operationLog.user" },
  { value: "system-category", label: "operationLog.systemCategory" },
  { value: "business-category", label: "operationLog.businessCategory" },
  { value: "resource", label: "operationLog.resource" },
  { value: "inquiry", label: "operationLog.inquiry" },
  { value: "itinerary", label: "operationLog.itinerary" },
  { value: "quotation", label: "operationLog.quotation" },
  { value: "tour", label: "tour.records" },
  { value: "guide-leave", label: "route.guideLeaves" },
  { value: "guide-rating", label: "operationLog.guideRating" },
  { value: "website-config", label: "route.websiteResources" },
  { value: "ledger", label: "route.dataLedgers" },
  { value: "website-visit", label: "route.websiteVisits" },
  { value: "whatsapp", label: "operationLog.whatsapp" },
  { value: "client", label: "operationLog.client" },
];

const scopes: { value: OperationScope; label: string }[] = [
  { value: "headquarters", label: "login.brandDesign.headquarters" },
  { value: "shengxu", label: "ledger.shengxu.businessUnitName" },
  { value: "linxi", label: "websiteInquiry.businessUnits.linxi" },
  { value: "website", label: "websiteInquiry.businessUnits.website" },
  { value: "unknown", label: "operationLog.scopeUnknown" },
];

const {
  scope,
  category,
  dateRange,
  actorName,
  page,
  pageSize,
  total,
  loading,
  loadError,
  list,
  handlePagination,
  handleRefresh,
  handleRetry,
  reset,
} = useOperationLogs();

function categoryLabel(value: string) {
  if (value === "system") return t("route.systemManagement");
  if (value === "dashboard") return t("route.dashboard");
  const option = categories.find((item) => item.value === value);
  return option ? t(option.label) : value;
}

onMounted(() => {
  handleRefresh();
});

useRefreshOnActivated(handleRefresh);
</script>
