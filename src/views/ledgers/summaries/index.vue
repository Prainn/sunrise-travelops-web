<template>
  <PageShell>
    <FilterBar @reset="resetQuery">
      <el-form-item :label="$t(isShengxu ? 'ledger.shengxu.recordDate' : 'ledger.direct.receivedDate')" class="filter-bar__wide">
        <el-date-picker
          v-model="dateRange"
          type="daterange"
          value-format="YYYY-MM-DD"
          :start-placeholder="$t('common.startDate')"
          :end-placeholder="$t('common.endDate')"
        />
      </el-form-item>
      <el-form-item :label="$t('common.keywords')" class="filter-bar__wide">
        <el-input
          v-model="keyword"
          :placeholder="$t(searchKey)"
          maxlength="200"
          clearable
        />
      </el-form-item>
    </FilterBar>
    <SectionCard fill>
      <TableToolbar :title="$t(titleKey)" :refreshing="loading" @refresh="fetchList" />
      <DataTable
        fill
        :fit="false"
        :loading="loading"
        :data="rows"
        :error="loadError"
        :filtered="Boolean(keyword.trim() || dateRange)"
        row-key="id"
        @retry="fetchList"
      >
        <el-table-column
          type="index"
          :label="$t('ledgerSummary.sequence')"
          width="70"
          :index="(index: number) => (pageNum - 1) * pageSize + index + 1"
        />
        <el-table-column prop="name" :label="$t(nameKey)" width="240" />
        <el-table-column
          prop="quotedCount"
          :label="$t('ledgerSummary.quotedCount')"
          width="140"
          align="right"
        />
        <el-table-column
          prop="convertedCount"
          :label="$t('ledgerSummary.convertedCount')"
          width="140"
          align="right"
        />
      </DataTable>
      <Pagination
        v-model:page="pageNum"
        v-model:limit="pageSize"
        :total="total"
        @pagination="fetchList"
      />
    </SectionCard>
  </PageShell>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useDebounceFn } from "@vueuse/core";
import { ElMessage } from "element-plus";
import type { LedgerSummaryItem, SummaryReport } from "@/types/ledger-summary";
import DataTable from "@/components/DataTable/index.vue";
import FilterBar from "@/components/FilterBar/index.vue";
import PageShell from "@/components/PageShell/index.vue";
import Pagination from "@/components/Pagination/index.vue";
import SectionCard from "@/components/SectionCard/index.vue";
import TableToolbar from "@/components/TableToolbar/index.vue";
import { useRefreshOnActivated } from "@/composables";
import { ledgerSummaryService } from "@/services/ledger-summary.service";
import { useResourcePagination } from "@/views/resources/useResourcePagination";

const props = defineProps<{ report: SummaryReport }>();
const keyword = ref("");
const dateRange = ref<[string, string] | null>(null);
const rows = ref<LedgerSummaryItem[]>([]);
const total = ref(0);
const loading = ref(false);
const loadError = ref("");
const { pageNum, pageSize, paginationQuery } = useResourcePagination();
let generation = 0;

const isAgency = computed(() => props.report === "shengxu-agency-summary");
const isShengxu = computed(() => props.report.startsWith("shengxu-"));
const isPlatform = computed(() => props.report.endsWith("-platform-summary"));
const nameKey = computed(() => isAgency.value ? "ledger.shengxu.agency" : isPlatform.value ? "ledgerSummary.platformAccount" : "ledger.direct.creator");
const searchKey = computed(() => isAgency.value ? "ledgerSummary.agencySearch" : isPlatform.value ? "ledgerSummary.platformSearch" : "ledgerSummary.coordinatorSearch");
const titleKey = computed(() => `route.${{
  "shengxu-agency-summary": "shengxuAgencySummary",
  "shengxu-coordinator-summary": "shengxuCoordinatorSummary",
  "linxi-quote-summary": "linxiQuoteSummary",
  "linxi-platform-summary": "linxiPlatformSummary",
  "website-quote-summary": "websiteQuoteSummary",
  "website-platform-summary": "websitePlatformSummary",
}[props.report]}`);
async function fetchList() {
  const current = ++generation;
  loading.value = true;
  try {
    const result = await ledgerSummaryService.list(props.report, {
      ...paginationQuery(), keyword: keyword.value.trim() || undefined,
      from: dateRange.value?.[0], to: dateRange.value?.[1],
    });
    if (current !== generation) return;
    rows.value = result.list;
    total.value = result.total;
    loadError.value = "";
  } catch (error) {
    if (current !== generation) return;
    rows.value = [];
    total.value = 0;
    loadError.value = error instanceof Error ? error.message : String(error);
    ElMessage.error(loadError.value);
  } finally {
    if (current === generation) loading.value = false;
  }
}
const reload = useDebounceFn(() => { pageNum.value = 1; void fetchList(); }, 300);
watch([keyword, dateRange], reload);

function resetQuery() {
  keyword.value = "";
  dateRange.value = null;
}
onMounted(fetchList);
useRefreshOnActivated(fetchList);
</script>
