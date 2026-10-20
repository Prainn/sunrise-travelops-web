<template>
  <PageShell>
    <FilterBar @reset="resetQuery">
      <el-form-item v-if="isHeadquarters" :label="$t('identity.businessUnit')">
        <el-radio-group v-model="headquartersUnit">
          <el-radio-button v-for="unit in UNITS" :key="unit" :value="unit">
            {{ businessUnitName(unit) }}
          </el-radio-button>
        </el-radio-group>
      </el-form-item>
      <el-form-item :label="$t('ledger.direct.orderStatus')">
        <el-select
          v-model="orderStatus"
          autocomplete="new-password"
          :placeholder="$t('ledger.direct.allOrderStatuses')"
          clearable
        >
          <el-option value="unconverted" :label="$t('ledger.direct.orderStatuses.unconverted')" />
          <el-option value="converted" :label="$t('ledger.direct.orderStatuses.converted')" />
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
          {{ $t("ledger.direct.create") }}
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
        <el-table-column prop="receivedMonth" :label="$t('ledger.direct.receivedMonth')" width="100" />
        <el-table-column
          prop="source"
          :label="$t('ledger.direct.source')"
          min-width="140"
          show-overflow-tooltip
        />
        <el-table-column prop="creatorName" :label="$t('ledger.direct.creator')" min-width="100" />
        <el-table-column
          prop="receivingAccountName"
          :label="$t('ledger.direct.receivingAccount')"
          min-width="100"
        />
        <el-table-column prop="operatorName" :label="$t('ledger.direct.operator')" min-width="100" />
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
          min-width="110"
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
          min-width="120"
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
        <el-table-column :label="$t('ledger.direct.reviewStatus')" min-width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="row.reviewedAt ? 'success' : 'info'">
              {{ $t(row.reviewedAt ? "ledger.direct.reviewed" : "ledger.direct.unreviewed") }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column :label="$t('ledger.direct.operated')" min-width="100" align="center">
          <template #default="{ row }">
            {{ yesNo(row.operated) }}
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
                @click="handleOpenClick(row as DirectLedgerItem)"
              >
                {{ $t(canEditRow(row as DirectLedgerItem) ? "common.edit" : "common.view") }}
              </el-button>
              <el-button
                v-if="canReviewRow(row as DirectLedgerItem)"
                link
                type="primary"
                :disabled="actingId === row.id"
                @click="handleReview(row as DirectLedgerItem)"
              >
                {{ $t("ledger.direct.review") }}
              </el-button>
              <el-button
                v-if="canOperateRow(row as DirectLedgerItem)"
                link
                type="primary"
                :disabled="actingId === row.id"
                @click="handleOperation(row as DirectLedgerItem)"
              >
                {{ $t(row.operated ? "ledger.direct.unmarkOperated" : "ledger.direct.markOperated") }}
              </el-button>
              <el-button
                v-if="canDeleteRow(row as DirectLedgerItem)"
                link
                type="danger"
                :disabled="actingId === row.id"
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
import DataTable from "@/components/DataTable/index.vue";
import FilterBar from "@/components/FilterBar/index.vue";
import PageShell from "@/components/PageShell/index.vue";
import Pagination from "@/components/Pagination/index.vue";
import RowActions from "@/components/RowActions/index.vue";
import SectionCard from "@/components/SectionCard/index.vue";
import TableToolbar from "@/components/TableToolbar/index.vue";
import { businessUnitName } from "@/constants/identity";
import { directLedgerService } from "@/services/direct-ledger.service";
import { useUserStore } from "@/stores/user";
import type {
  DirectLedgerBusinessUnit,
  DirectLedgerItem,
  DirectLedgerOrderStatus,
} from "@/types/direct-ledger";
import { useResourcePagination } from "@/views/resources/useResourcePagination";
import DirectLedgerDialog from "./components/DirectLedgerDialog.vue";

defineOptions({ name: "DirectLedger" });

const UNITS: DirectLedgerBusinessUnit[] = ["linxi", "website"];
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
const isHeadquarters = computed(() => user.userInfo.scope === "headquarters");
/** 总部须显式选择业务，列表不混合两个业务的分页。 */
const headquartersUnit = ref<DirectLedgerBusinessUnit>("linxi");
const businessUnit = computed<DirectLedgerBusinessUnit>(() =>
  isHeadquarters.value ? headquartersUnit.value : (user.userInfo.scope as DirectLedgerBusinessUnit),
);
const keyword = ref("");
const orderStatus = ref<DirectLedgerOrderStatus | "">("");
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
const actingId = ref("");
let listGeneration = 0;

// 直接读取有效权限，不走 ROOT 通用放行；总部所有写操作均隐藏。
const canCreate = computed(
  () => !isHeadquarters.value && hasPermission("ledger:direct:create"),
);
const hasActiveFilters = computed(() =>
  Boolean(keyword.value.trim() || orderStatus.value || dateRange.value),
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

async function fetchList() {
  const generation = ++listGeneration;
  loading.value = true;
  try {
    const result = await directLedgerService.list({
      ...paginationQuery(),
      keyword: keyword.value.trim() || undefined,
      from: dateRange.value?.[0],
      to: dateRange.value?.[1],
      orderStatus: orderStatus.value || undefined,
      businessUnit: isHeadquarters.value ? headquartersUnit.value : undefined,
    });
    // 切换业务或筛选后丢弃旧响应，避免两个业务的数据混入同一列表。
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
watch([keyword, orderStatus, dateRange], reload);
watch(headquartersUnit, () => {
  dialogVisible.value = false;
  editing.value = null;
  rows.value = [];
  total.value = 0;
  pageNum.value = 1;
  void fetchList();
});

function resetQuery() {
  keyword.value = "";
  orderStatus.value = "";
  dateRange.value = null;
}
function openCreate() {
  editing.value = null;
  isReadonly.value = false;
  dialogVisible.value = true;
}
// 打开前取最新详情，保证编辑基于最新 version 与能力。
async function handleOpenClick(row: DirectLedgerItem) {
  if (openingId.value) return;
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
async function runRowAction(row: DirectLedgerItem, action: () => Promise<unknown>, success: string) {
  if (actingId.value) return;
  actingId.value = row.id;
  try {
    await action();
    ElMessage.success(success);
  } catch (error) {
    // 请求层已按错误码本地化精确原因（版本、审核、操作或删除限制）。
    ElMessage.error(error instanceof Error ? error.message : String(error));
  } finally {
    actingId.value = "";
    void fetchList();
  }
}
async function handleReview(row: DirectLedgerItem) {
  if (!(await confirmAction(t("ledger.direct.reviewConfirm", { orderNo: row.orderNo })))) return;
  await runRowAction(
    row,
    () => directLedgerService.review(row.id, row.version),
    t("ledger.direct.reviewSuccess"),
  );
}
async function handleOperation(row: DirectLedgerItem) {
  const operated = !row.operated;
  const message = t(
    operated ? "ledger.direct.markOperatedConfirm" : "ledger.direct.unmarkOperatedConfirm",
    { orderNo: row.orderNo },
  );
  if (!(await confirmAction(message))) return;
  await runRowAction(
    row,
    () => directLedgerService.updateOperation(row.id, { version: row.version, operated }),
    t("common.updateSuccess"),
  );
}
async function handleDelete(row: DirectLedgerItem) {
  if (!(await confirmAction(t("ledger.direct.deleteConfirm", { orderNo: row.orderNo })))) return;
  await runRowAction(
    row,
    () => directLedgerService.delete(row.id, row.version),
    t("common.deleteSuccess"),
  );
}

onMounted(fetchList);
</script>
