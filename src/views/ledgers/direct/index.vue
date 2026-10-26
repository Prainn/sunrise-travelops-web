<template>
  <PageShell>
    <FilterBar @reset="resetQuery">
      <el-form-item :label="$t('ledger.direct.orderStatus')">
        <el-select
          v-model="orderStatus"
          autocomplete="new-password"
          :placeholder="$t('common.allStatuses')"
          clearable
        >
          <el-option value="unconverted" :label="$t('ledger.direct.orderStatuses.unconverted')" />
          <el-option value="converted" :label="$t('ledger.direct.orderStatuses.converted')" />
        </el-select>
      </el-form-item>
      <el-form-item :label="$t('ledger.direct.workflowStatus')">
        <el-select
          v-model="workflowStatus"
          autocomplete="new-password"
          :placeholder="$t('common.all')"
          clearable
        >
          <el-option
            v-for="status in WORKFLOW_STATUSES"
            :key="status"
            :value="status"
            :label="$t(`ledger.direct.workflowStatuses.${status}`)"
          />
        </el-select>
      </el-form-item>
      <el-form-item :label="$t('ledger.direct.receivedDate')" class="filter-bar__wide">
        <el-date-picker
          v-model="dateRange"
          type="daterange"
          value-format="YYYY-MM-DD"
          :start-placeholder="$t('common.startDate')"
          :end-placeholder="$t('common.endDate')"
        />
      </el-form-item>
      <el-form-item :label="$t('ledger.direct.creator')">
        <RemoteSelect
          v-model="creatorId"
          :query-key="businessUnit"
          :load-options="(query) => loadFilterOptions('creator', query)"
          :placeholder="$t('common.all')"
        />
      </el-form-item>
      <el-form-item :label="$t('ledger.direct.operator')">
        <RemoteSelect
          v-model="operatorId"
          :query-key="businessUnit"
          :load-options="(query) => loadFilterOptions('operator', query)"
          :placeholder="$t('common.all')"
        />
      </el-form-item>
      <el-form-item :label="$t('common.keywords')" class="filter-bar__wide">
        <el-input
          v-model="keyword"
          :placeholder="$t('ledger.direct.searchPlaceholder')"
          maxlength="200"
          clearable
        />
      </el-form-item>
    </FilterBar>
    <SectionCard fill>
      <TableToolbar :refreshing="loading" @refresh="fetchList">
        <el-button v-if="canCreate" type="primary" @click="openCreate">
          {{ $t("common.create") }}
        </el-button>
      </TableToolbar>
      <DataTable
        fill
        :loading="loading"
        :data="rows"
        :error="loadError"
        :filtered="hasActiveFilters"
        row-key="id"
        @retry="fetchList"
      >
        <el-table-column
          prop="orderNo"
          :label="$t('ledger.direct.orderNo')"
          min-width="140"
          fixed="left"
          :show-overflow-tooltip="false"
        />
        <el-table-column prop="receivedDate" :label="$t('ledger.direct.receivedDate')" width="110" />
        <el-table-column
          prop="source"
          :label="$t('ledger.direct.source')"
          min-width="200"
          show-overflow-tooltip
        />
        <el-table-column prop="creatorName" :label="$t('ledger.direct.creator')" min-width="200" />
        <el-table-column
          prop="receivingAccountName"
          :label="$t('ledger.direct.receivingAccount')"
          :min-width="businessUnit === 'linxi' ? 200 : 100"
        />
        <el-table-column prop="operatorName" :label="$t('ledger.direct.operator')" min-width="200" />
        <el-table-column :label="$t('ledger.direct.orderStatus')" min-width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="row.orderStatus === 'converted' ? 'success' : 'info'">
              {{ $t(`ledger.direct.orderStatuses.${row.orderStatus}`) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column
          v-for="field in BOOLEAN_FIELDS"
          :key="field"
          :label="$t(`ledger.direct.${field}`)"
          :min-width="field === 'effectiveContact' ? 150 : 110"
          align="center"
        >
          <template #default="{ row }">
            {{ yesNo(row[field]) }}
          </template>
        </el-table-column>
        <el-table-column
          prop="itinerary"
          :label="$t('ledger.direct.itinerary')"
          min-width="160"
          show-overflow-tooltip
          :formatter="textOrDash"
        />
        <el-table-column
          prop="dealDate"
          :label="$t('ledger.direct.dealDate')"
          width="110"
          :formatter="textOrDash"
        />
        <el-table-column
          prop="departureDate"
          :label="$t('ledger.direct.departureDate')"
          width="110"
          :formatter="textOrDash"
        />
        <el-table-column
          v-for="field in TRI_STATE_FIELDS"
          :key="field"
          :label="$t(`ledger.direct.${field}`)"
          :min-width="field === 'satisfied' ? 170 : 120"
          align="center"
        >
          <template #default="{ row }">
            {{ triStateText(row[field]) }}
          </template>
        </el-table-column>
        <el-table-column
          v-for="field in TEXT_FIELDS"
          :key="field"
          :prop="field"
          :label="$t(`ledger.direct.${field}`)"
          min-width="150"
          show-overflow-tooltip
          :formatter="textOrDash"
        />
        <el-table-column :label="$t('ledger.direct.workflowStatus')" min-width="110" align="center">
          <template #default="{ row }">
            <el-tag :type="row.workflowStatus === 'operated' ? 'success' : row.workflowStatus === 'pending_confirmation' ? 'warning' : 'info'">
              {{ $t(`ledger.direct.workflowStatuses.${row.workflowStatus}`) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column
          :label="$t('common.actions')"
          width="220"
          fixed="right"
          :show-overflow-tooltip="false"
        >
          <template #default="{ row }">
            <RowActions>
              <el-button
                link
                type="primary"
                :loading="openingId === row.id"
                :disabled="isPending(row.id)"
                @click="handleOpenClick(row as DirectLedgerItem)"
              >
                {{ $t(canEditRow(row as DirectLedgerItem) ? "common.edit" : "common.view") }}
              </el-button>
              <el-button
                v-if="canReviewRow(row as DirectLedgerItem)"
                link
                type="primary"
                :disabled="isPending(row.id) || openingId === row.id"
                @click="handleReview(row as DirectLedgerItem)"
              >
                {{ $t("ledger.direct.review") }}
              </el-button>
              <el-button
                v-if="canOperateRow(row as DirectLedgerItem)"
                link
                type="primary"
                :disabled="isPending(row.id) || openingId === row.id"
                @click="handleOperation(row as DirectLedgerItem)"
              >
                {{ $t("ledger.direct.markOperated") }}
              </el-button>
              <el-button
                v-if="canDeleteRow(row as DirectLedgerItem)"
                link
                type="danger"
                :disabled="isPending(row.id) || openingId === row.id"
                @click="handleDelete(row as DirectLedgerItem)"
              >
                {{ $t("common.delete") }}
              </el-button>
            </RowActions>
          </template>
        </el-table-column>
      </DataTable>
      <Pagination
        v-if="total > 0"
        v-model:page="pageNum"
        v-model:limit="pageSize"
        :total="total"
        @pagination="fetchList"
      />
    </SectionCard>

    <DirectLedgerDialog
      v-model="dialogVisible"
      :ledger="editing"
      :business-unit="businessUnit"
      :readonly="isReadonly"
      @saved="handleSaved"
    />
  </PageShell>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useDebounceFn } from "@vueuse/core";
import { ElMessage, ElMessageBox } from "element-plus";
import { useI18n } from "vue-i18n";
import RemoteSelect from "@/components/RemoteSelect/index.vue";
import { usePendingActions } from "@/composables/usePendingActions";
import { useRefreshOnActivated } from "@/composables";
import type { RemoteOptionsQuery } from "@/composables/useRemoteOptions";
import DataTable from "@/components/DataTable/index.vue";
import FilterBar from "@/components/FilterBar/index.vue";
import PageShell from "@/components/PageShell/index.vue";
import Pagination from "@/components/Pagination/index.vue";
import RowActions from "@/components/RowActions/index.vue";
import SectionCard from "@/components/SectionCard/index.vue";
import TableToolbar from "@/components/TableToolbar/index.vue";
import { directLedgerService } from "@/services/direct-ledger.service";
import { useUserStore } from "@/stores/user";
import type {
  DirectLedgerBusinessUnit,
  DirectLedgerItem,
  DirectLedgerOrderStatus,
  DirectLedgerWorkflowStatus,
} from "@/types/direct-ledger";
import { useResourcePagination } from "@/views/resources/useResourcePagination";
import DirectLedgerDialog from "./components/DirectLedgerDialog.vue";

defineOptions({ name: "DirectLedger" });

const props = defineProps<{ businessUnit: DirectLedgerBusinessUnit }>();

const WORKFLOW_STATUSES: DirectLedgerWorkflowStatus[] = ["pending_confirmation", "pending_operation", "operated"];
const BOOLEAN_FIELDS = ["effectiveContact", "proposalSent", "loss", "priority"] as const;
const TRI_STATE_FIELDS = ["complaint", "satisfied"] as const;
const TEXT_FIELDS = [
  "notConvertedReason",
  "lossNote",
  "feedbackReason",
  "solution",
  "remark",
] as const;

const { t } = useI18n();
const user = useUserStore();
const businessUnit = computed(() => props.businessUnit);
const creatorId = ref("");
const operatorId = ref("");
const keyword = ref("");
const orderStatus = ref<DirectLedgerOrderStatus | "">("");
const workflowStatus = ref<DirectLedgerWorkflowStatus | "">("");
const dateRange = ref<[string, string] | null>(null);
const loading = ref(false);
const loadError = ref("");
const rows = ref<DirectLedgerItem[]>([]);
const total = ref(0);
const { pageNum, pageSize, paginationQuery } = useResourcePagination();
const dialogVisible = ref(false);
const editing = ref<DirectLedgerItem | null>(null);
const isReadonly = ref(false);
const openingId = ref("");
const { isPending, run } = usePendingActions();
let listGeneration = 0;

// 使用当前身份的有效动作权限；行级操作另结合后端 capabilities。
const canCreate = computed(
  () => hasPermission("ledger:direct:create"),
);
const hasActiveFilters = computed(() =>
  Boolean(keyword.value.trim() || orderStatus.value || workflowStatus.value || dateRange.value || creatorId.value || operatorId.value),
);

function hasPermission(permission: string) {
  return user.userInfo.perms.includes(permission);
}
function canEditRow(row: DirectLedgerItem) {
  return row.capabilities.canEdit && hasPermission("ledger:direct:update");
}
function canDeleteRow(row: DirectLedgerItem) {
  return row.capabilities.canDelete && hasPermission("ledger:direct:delete");
}
function canReviewRow(row: DirectLedgerItem) {
  return row.capabilities.canReview && hasPermission("ledger:direct:review");
}
function canOperateRow(row: DirectLedgerItem) {
  return row.capabilities.canOperate && hasPermission("ledger:direct:operate");
}
function yesNo(value: boolean) {
  return t(value === true ? "common.yes" : "common.no");
}
function triStateText(value: boolean | null) {
  if (value === null) return t("ledger.direct.unset");
  return yesNo(value);
}
function textOrDash(_row: unknown, _column: unknown, value: string | null) {
  return value || "-";
}

async function loadFilterOptions(kind: "creator" | "operator", query: RemoteOptionsQuery) {
  const result = await directLedgerService.filterOptions({ ...query, kind, businessUnit: businessUnit.value });
  return { ...result, list: result.list.map((item) => ({ id: item.id, label: item.name })) };
}

async function fetchList() {
  const generation = ++listGeneration;
  loading.value = true;
  try {
    const result = await directLedgerService.list({
      ...paginationQuery(),
      creatorId: creatorId.value || undefined,
      operatorId: operatorId.value || undefined,
      keyword: keyword.value.trim() || undefined,
      from: dateRange.value?.[0],
      to: dateRange.value?.[1],
      orderStatus: orderStatus.value || undefined,
      workflowStatus: workflowStatus.value || undefined,
      businessUnit: businessUnit.value,
    });
    // 筛选后丢弃旧响应，避免旧结果覆盖当前列表。
    if (generation !== listGeneration) return;
    rows.value = result.list;
    total.value = result.total;
    loadError.value = "";
  } catch (error) {
    if (generation !== listGeneration) return;
    loadError.value = error instanceof Error ? error.message : String(error);
    ElMessage.error(loadError.value);
  } finally {
    if (generation === listGeneration) loading.value = false;
  }
}
const reload = useDebounceFn(() => {
  pageNum.value = 1;
  void fetchList();
}, 300);
watch([keyword, orderStatus, workflowStatus, dateRange, creatorId, operatorId], reload);

function resetQuery() {
  creatorId.value = "";
  operatorId.value = "";
  keyword.value = "";
  orderStatus.value = "";
  workflowStatus.value = "";
  dateRange.value = null;
}
function openCreate() {
  editing.value = null;
  isReadonly.value = false;
  dialogVisible.value = true;
}
// 打开前取最新详情，保证编辑基于最新 version 与能力。
async function handleOpenClick(row: DirectLedgerItem) {
  if (openingId.value || isPending(row.id)) return;
  openingId.value = row.id;
  try {
    const detail = await directLedgerService.detail(row.id);
    editing.value = detail;
    isReadonly.value = !canEditRow(detail);
    dialogVisible.value = true;
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : String(error));
  } finally {
    openingId.value = "";
  }
}
function handleSaved(saved: DirectLedgerItem) {
  editing.value = saved;
  void fetchList();
}
async function confirmAction(message: string) {
  try {
    await ElMessageBox.confirm(message, t("common.warning"), { type: "warning" });
    return true;
  } catch {
    return false;
  }
}
async function runRowAction(row: DirectLedgerItem, message: string, action: () => Promise<unknown>, success: string) {
  if (openingId.value === row.id) return;
  await run(row.id, async () => {
    if (!(await confirmAction(message))) return;
    try {
      await action();
      ElMessage.success(success);
    } catch (error) {
      // 请求层已按错误码本地化精确原因。
      ElMessage.error(error instanceof Error ? error.message : String(error));
    } finally {
      await fetchList();
    }
  });
}
async function handleReview(row: DirectLedgerItem) {
  await runRowAction(
    row,
    t("ledger.direct.reviewConfirm", { orderNo: row.orderNo }),
    () => directLedgerService.review(row.id, row.version),
    t("ledger.direct.reviewSuccess"),
  );
}
async function handleOperation(row: DirectLedgerItem) {
  await runRowAction(
    row,
    t("ledger.direct.markOperatedConfirm", { orderNo: row.orderNo }),
    () => directLedgerService.updateOperation(row.id, { version: row.version }),
    t("common.updateSuccess"),
  );
}
async function handleDelete(row: DirectLedgerItem) {
  await runRowAction(
    row,
    t("ledger.direct.deleteConfirm", { orderNo: row.orderNo }),
    () => directLedgerService.delete(row.id, row.version),
    t("common.deleteSuccess"),
  );
}

onMounted(fetchList);
useRefreshOnActivated(fetchList);
</script>
