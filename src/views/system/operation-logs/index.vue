<template>
  <PageShell>
    <FilterBar @reset="reset">
      <el-form-item :label="$t('operationLog.category')">
        <el-select
          v-model="category"
          autocomplete="new-password"
          clearable
          :placeholder="$t('operationLog.all')"
        >
          <el-option
            v-for="option in categories"
            :key="option.value"
            :label="$t(option.label)"
            :value="option.value"
          />
        </el-select>
      </el-form-item>
    </FilterBar>

    <SectionCard fill>
      <TableToolbar :refreshing="loading" @refresh="fetchData" />
      <DataTable
        fill
        :loading="loading"
        :data="list"
        :error="loadError"
        :filtered="Boolean(category)"
        row-key="id"
        @retry="fetchData"
      >
        <el-table-column :label="$t('operationLog.time')" min-width="190">
          <template #default="{ row }">
            {{ beijingTime(row.time) }}
          </template>
        </el-table-column>
        <el-table-column :label="$t('operationLog.category')" min-width="120">
          <template #default="{ row }">
            {{ categoryLabel(row.category) }}
          </template>
        </el-table-column>
        <el-table-column :label="$t('operationLog.actor')" prop="actorName" min-width="130" />
        <el-table-column :label="$t('operationLog.action')" prop="action" min-width="180" />
        <el-table-column :label="$t('operationLog.result')" min-width="90">
          <template #default="{ row }">
            <el-tag :type="row.success ? 'success' : 'danger'">
              {{ row.success ? $t("operationLog.success") : $t("operationLog.failed") }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column
          :label="$t('operationLog.detail')"
          prop="detail"
          min-width="300"
          show-overflow-tooltip
        />
      </DataTable>
      <Pagination
        v-if="total > 0"
        v-model:page="page"
        v-model:limit="pageSize"
        :total="total"
        @pagination="fetchData"
      />
    </SectionCard>
  </PageShell>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from "vue";
import { useDebounceFn } from "@vueuse/core";
import { useI18n } from "vue-i18n";
import DataTable from "@/components/DataTable/index.vue";
import FilterBar from "@/components/FilterBar/index.vue";
import PageShell from "@/components/PageShell/index.vue";
import Pagination from "@/components/Pagination/index.vue";
import SectionCard from "@/components/SectionCard/index.vue";
import TableToolbar from "@/components/TableToolbar/index.vue";
import { operationLogService } from "@/services/operation-log.service";
import type { OperationCategory, OperationLog } from "@/types/operation-log";

const { t } = useI18n();
const categories: { value: OperationCategory; label: string }[] = [
  { value: "login", label: "operationLog.login" },
  { value: "user", label: "operationLog.user" },
  { value: "system-category", label: "operationLog.systemCategory" },
  { value: "business-category", label: "operationLog.businessCategory" },
  { value: "resource", label: "operationLog.resource" },
  { value: "inquiry", label: "operationLog.inquiry" },
  { value: "itinerary", label: "operationLog.itinerary" },
  { value: "quotation", label: "operationLog.quotation" },
  { value: "tour", label: "operationLog.tour" },
  { value: "guide-leave", label: "operationLog.guideLeave" },
  { value: "guide-rating", label: "operationLog.guideRating" },
  { value: "website-config", label: "operationLog.websiteConfig" },
];
const category = ref<OperationCategory | "">("");
const page = ref(1);
const pageSize = ref(20);
const total = ref(0);
const loading = ref(false);
const loadError = ref("");
const list = ref<OperationLog[]>([]);
const requestRows = useDebounceFn(fetchData, 300);

watch(category, () => {
  page.value = 1;
  requestRows();
});

function categoryLabel(value: OperationCategory) {
  const option = categories.find((item) => item.value === value);
  return option ? t(option.label) : value;
}

function beijingTime(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

async function fetchData() {
  loading.value = true;
  try {
    const result = await operationLogService.getPage({
      page: page.value,
      pageSize: pageSize.value,
      category: category.value || undefined,
    });
    list.value = result.list;
    total.value = result.total;
    loadError.value = "";
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : String(error);
  } finally {
    loading.value = false;
  }
}
function reset() {
  category.value = "";
  page.value = 1;
  requestRows();
}
onMounted(() => {
  void fetchData();
});
</script>
