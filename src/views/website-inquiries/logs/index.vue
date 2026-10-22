<template>
  <PageShell v-loading="isLoading" class="website-inquiry-log-page">
    <SectionCard>
      <el-page-header v-if="inquiryId" class="mb-[16px]" @back="router.push({ name: 'WebsiteInquiryList' })">
        <template #content>
          {{ inquiry ? `${inquiry.code} · ${inquiry.customerName}` : $t("inquiry.log.title") }}
        </template>
      </el-page-header>
      <div class="flex flex-wrap gap-[16px]">
        <span>
          {{ $t("inquiry.log.totalOperations") }}
          <strong class="ml-[8px] text-[14px]">{{ report.totalOperations }}</strong>
        </span>
        <span>
          {{ $t("inquiry.log.inquiryCount") }}
          <strong class="ml-[8px] text-[14px]">{{ report.inquiryCount }}</strong>
        </span>
        <span>
          {{ $t("inquiry.log.operatorCount") }}
          <strong class="ml-[8px] text-[14px]">{{ report.operatorCount }}</strong>
        </span>
        <span>
          {{ $t("inquiry.log.changedFields") }}
          <strong class="ml-[8px] text-[14px]">{{ report.changedFields }}</strong>
        </span>
      </div>
      <p v-if="report.logsWithoutChanges > 0" class="mt-[8px] text-[13px] text-[var(--el-text-color-secondary)]">
        {{ $t("websiteInquiry.log.withoutChangesNote", { count: report.logsWithoutChanges }) }}
      </p>
      <div class="mt-[12px] flex flex-wrap gap-[16px]">
        <el-tag v-for="item in report.byAction" :key="item.action" size="large">
          {{ actionName(item.action) }}：{{ item.count }}
        </el-tag>
      </div>
    </SectionCard>
    <FilterBar :resettable="false">
      <el-form-item v-if="isHeadquarters && !inquiryId" :label="$t('identity.businessUnit')">
        <el-select
          v-model="form.businessUnit"
          autocomplete="new-password"
          :placeholder="$t('identity.allBusinesses')"
          @change="search"
        >
          <el-option value="" :label="$t('identity.allBusinesses')" />
          <el-option
            v-for="unit in ['linxi', 'website']"
            :key="unit"
            :value="unit"
            :label="$t(`websiteInquiry.businessUnits.${unit}`)"
          />
        </el-select>
      </el-form-item>
      <el-form-item :label="$t('inquiry.code')" class="filter-bar__wide">
        <el-input
          v-model.trim="form.inquiryCode"
          clearable
          maxlength="100"
          :placeholder="$t('websiteInquiry.log.codePlaceholder')"
          @keyup.enter="search"
          @clear="search"
        />
      </el-form-item>
      <el-form-item :label="$t('inquiry.log.dateRange')" class="filter-bar__wide">
        <el-date-picker
          v-model="form.dates"
          type="daterange"
          value-format="YYYY-MM-DD"
          :start-placeholder="$t('common.startDate')"
          :end-placeholder="$t('common.endDate')"
        />
      </el-form-item>
      <el-form-item :label="$t('common.operator')">
        <el-select
          v-model="form.operatorId"
          autocomplete="new-password"
          clearable
          filterable
          :placeholder="$t('websiteInquiry.log.allOperators')"
        >
          <el-option
            v-for="person in operators"
            :key="person.id"
            :value="person.id"
            :label="operatorLabel({ operatorName: person.name, operatorUsername: person.username })"
          />
        </el-select>
      </el-form-item>
      <el-form-item :label="$t('inquiry.log.action')">
        <el-select
          v-model="form.action"
          autocomplete="new-password"
          clearable
          :placeholder="$t('websiteInquiry.log.allActions')"
        >
          <el-option
            v-for="kind in WEBSITE_LOG_ACTIONS"
            :key="kind"
            :value="kind"
            :label="actionName(kind)"
          />
        </el-select>
      </el-form-item>
      <template #actions>
        <el-button type="primary" @click="search">
          {{ $t("common.search") }}
        </el-button>
      </template>
    </FilterBar>
    <SectionCard fill>
      <el-alert
        v-if="error"
        :title="error"
        type="error"
        :closable="false"
      />
      <DataTable
        fill
        :data="logs"
        :row-expandable="canExpandLog"
        row-key="id"
      >
        <el-table-column type="expand">
          <template #default="{ row }">
            <div class="change-details p-[16px]">
              <p v-if="row.metadata?.creationMode === 'copy' && row.metadata.sourceCode">
                {{ $t("inquiry.log.copySource") }}：{{ row.metadata.sourceCode }}
              </p>
              <p v-if="row.metadata?.transferReason">
                {{ $t("websiteInquiry.log.transferReason") }}：{{ row.metadata.transferReason }}
              </p>
              <p v-if="row.metadata?.lostReason">
                {{ $t("inquiry.lostReason") }}：{{ row.metadata.lostReason }}
              </p>
              <p v-if="row.metadata?.quotationCode">
                {{ $t("websiteInquiry.log.quotationCode") }}：{{ row.metadata.quotationCode }}
              </p>
              <p v-if="row.detail">
                {{ $t("common.details") }}：{{ row.detail }}
              </p>
              <p v-if="row.changes === null" class="text-[var(--el-text-color-secondary)]">
                {{ $t("websiteInquiry.log.changesNotRecorded") }}
              </p>
              <DataTable
                v-else-if="row.changes.length"
                :data="row.changes"
                :row-class-name="
                  ({ row: change }: { row: WebsiteInquiryLogChange }) => `change-${changeTone(change)}`
                "
                :show-overflow-tooltip="false"
              >
                <el-table-column :label="$t('inquiry.log.field')" min-width="240">
                  <template #default="scope">
                    {{ changeLabel(scope.row as WebsiteInquiryLogChange, displayContext) }}
                  </template>
                </el-table-column>
                <el-table-column :label="$t('inquiry.log.before')" min-width="280">
                  <template #default="scope">
                    <pre class="m-0 max-h-[360px] overflow-auto whitespace-pre-wrap [overflow-wrap:anywhere] [font:inherit]">{{
                      formatLogValue(scope.row.before, scope.row.path, displayContext)
                    }}</pre>
                  </template>
                </el-table-column>
                <el-table-column :label="$t('inquiry.log.after')" min-width="280">
                  <template #default="scope">
                    <pre class="m-0 max-h-[360px] overflow-auto whitespace-pre-wrap [overflow-wrap:anywhere] [font:inherit]">{{
                      formatLogValue(scope.row.after, scope.row.path, displayContext)
                    }}</pre>
                  </template>
                </el-table-column>
              </DataTable>
              <p v-else class="text-[var(--el-text-color-secondary)]">
                {{ $t("websiteInquiry.log.noFieldDifference") }}
              </p>
            </div>
          </template>
        </el-table-column>
        <el-table-column :label="$t('inquiry.log.time')" min-width="175">
          <template #default="{ row }">
            {{ formatDateTime(row.occurredAt) }}
          </template>
        </el-table-column>
        <el-table-column :label="$t('inquiry.log.action')" min-width="150">
          <template #default="{ row }">
            {{ actionName(row.action) }}
          </template>
        </el-table-column>
        <el-table-column :label="$t('common.operator')" min-width="150">
          <template #default="{ row }">
            {{ operatorLabel(row as WebsiteInquiryLog) }}
          </template>
        </el-table-column>
        <el-table-column
          prop="inquiryCode"
          :label="$t('inquiry.code')"
          min-width="180"
          show-overflow-tooltip
        />
        <el-table-column
          :label="$t('inquiry.log.targetCode')"
          min-width="180"
          show-overflow-tooltip
        >
          <template #default="{ row }">
            {{ row.targetCode || "-" }}
          </template>
        </el-table-column>
        <el-table-column :label="$t('itinerary.title')" min-width="180" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row.summary || "-" }}
          </template>
        </el-table-column>
        <el-table-column
          :label="$t('common.actions')"
          width="100"
          fixed="right"
          :show-overflow-tooltip="false"
        >
          <template #default="{ row }">
            <el-button
              type="primary"
              link
              @click="openInNewTab({ name: 'WebsiteInquiryList', query: { inquiryId: row.inquiryId } })"
            >
              {{ $t("common.view") }}
            </el-button>
          </template>
        </el-table-column>
      </DataTable>
      <Pagination
        v-if="total"
        :page="page"
        :limit="pageSize"
        :total="total"
        @update:page="changePage"
        @update:limit="changePageSize"
      />
    </SectionCard>
  </PageShell>
</template>
<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter } from "vue-router";
import DataTable from "@/components/DataTable/index.vue";
import FilterBar from "@/components/FilterBar/index.vue";
import PageShell from "@/components/PageShell/index.vue";
import Pagination from "@/components/Pagination/index.vue";
import SectionCard from "@/components/SectionCard/index.vue";
import { useOpenInNewTab, useRefreshOnActivated } from "@/composables";
import {
  websiteErrorMessage,
  websiteService,
  type WebsiteInquiryLogQuery,
} from "@/services/website.service";
import { useUserStore } from "@/stores/user";
import type {
  WebsiteBusinessUnit,
  WebsiteInquiry,
  WebsiteInquiryLog,
  WebsiteInquiryLogChange,
  WebsiteInquiryLogOperator,
  WebsiteInquiryLogReport,
} from "@/types/website";
import { formatDateTime } from "@/utils";
import {
  WEBSITE_LOG_ACTIONS,
  actionLabel,
  canExpandLog,
  changeLabel,
  changeTone,
  formatLogValue,
  operatorLabel,
} from "./log-presentation";
defineOptions({ name: "WebsiteInquiryLogReport" });
const { t, te, locale } = useI18n();
const userStore = useUserStore();
const openInNewTab = useOpenInNewTab();
const route = useRoute();
const router = useRouter();
// 从询盘列表进入时限定单个询盘，汇总菜单进入时为空；页面按 fullPath 缓存，不随路由变化
const inquiryId = String(route.params.inquiryId ?? "");
const inquiry = ref<WebsiteInquiry>();
const isHeadquarters = computed(() => userStore.userInfo.scope === "headquarters");
const displayContext = computed(() => ({ t, te, locale: locale.value }));
function actionName(action: string) {
  return actionLabel(action, displayContext.value);
}
const emptyReport = (): WebsiteInquiryLogReport => ({
  totalOperations: 0,
  inquiryCount: 0,
  operatorCount: 0,
  changedFields: 0,
  logsWithoutChanges: 0,
  byAction: [],
});
const form = reactive({
  businessUnit: "" as "" | WebsiteBusinessUnit,
  inquiryCode: "",
  dates: [] as string[] | null,
  operatorId: "",
  action: "",
});
const logs = ref<WebsiteInquiryLog[]>([]);
const report = ref<WebsiteInquiryLogReport>(emptyReport());
const operators = ref<WebsiteInquiryLogOperator[]>([]);
const page = ref(1);
const pageSize = ref(10);
const total = ref(0);
const isLoading = ref(false);
const error = ref("");
// 翻页沿用最近一次“搜索”提交的筛选，避免编辑中的表单影响统计口径。
let applied: Omit<WebsiteInquiryLogQuery, "page" | "pageSize"> = {};
let requestVersion = 0;
function snapshot(): typeof applied {
  return {
    businessUnit:
      isHeadquarters.value && !inquiryId ? form.businessUnit || undefined : undefined,
    inquiryId: inquiryId || undefined,
    inquiryCode: form.inquiryCode || undefined,
    operatorId: form.operatorId || undefined,
    action: form.action || undefined,
    from: form.dates?.[0] || undefined,
    to: form.dates?.[1] || undefined,
  };
}
async function fetchLogs(withSummary: boolean) {
  const version = ++requestVersion;
  isLoading.value = true;
  error.value = "";
  const query = { ...applied, page: page.value, pageSize: pageSize.value };
  try {
    const [details, summary, people, record] = await Promise.all([
      websiteService.inquiryLogs(query),
      withSummary ? websiteService.inquiryLogReport(query) : undefined,
      withSummary ? websiteService.inquiryLogOperators(query) : undefined,
      withSummary && inquiryId ? websiteService.inquiry(inquiryId) : undefined,
    ]);
    if (version !== requestVersion) return;
    if (record) inquiry.value = record;
    logs.value = details.list;
    total.value = details.total;
    if (summary) report.value = summary;
    if (people) operators.value = people;
  } catch (reason) {
    if (version !== requestVersion) return;
    error.value = websiteErrorMessage(reason) || t("request.failed");
    logs.value = [];
    total.value = 0;
    if (withSummary) {
      report.value = emptyReport();
      operators.value = [];
    }
  } finally {
    if (version === requestVersion) isLoading.value = false;
  }
}
function search() {
  applied = snapshot();
  page.value = 1;
  void fetchLogs(true);
}
function changePage(value: number) {
  page.value = value;
  void fetchLogs(false);
}
function changePageSize(value: number) {
  pageSize.value = value;
  page.value = 1;
  void fetchLogs(false);
}
onMounted(search);
// 切回时按最近一次提交的筛选与当前页重新加载明细、统计和操作人。
useRefreshOnActivated(() => fetchLogs(true));
</script>
<style scoped>
.website-inquiry-log-page :deep(.el-table__expand-icon.is-disabled) {
  visibility: hidden;
}

.change-details :deep(.change-added) {
  color: var(--el-color-success);
}
.change-details :deep(.change-removed) {
  color: var(--el-color-danger);
}
.change-details :deep(.change-changed) {
  color: var(--el-color-warning);
}
</style>
