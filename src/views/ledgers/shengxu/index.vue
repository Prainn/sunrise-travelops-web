<template>
  <PageShell>
    <FilterBar @reset="resetQuery">
      <el-form-item :label="$t('ledger.shengxu.recordDate')" class="filter-bar__wide">
        <el-date-picker
          v-model="dateRange"
          type="daterange"
          value-format="YYYY-MM-DD"
          :start-placeholder="$t('common.startDate')"
          :end-placeholder="$t('common.endDate')"
        />
      </el-form-item>
      <el-form-item :label="$t('ledger.shengxu.collectCoordinator')">
        <RemoteSelect
          v-model="creatorId"
          :load-options="(query) => loadFilterOptions('creator', query)"
          :placeholder="$t('common.all')"
        />
      </el-form-item>
      <el-form-item :label="$t('ledger.shengxu.agency')">
        <RemoteSelect
          v-model="agencyId"
          :load-options="(query) => loadFilterOptions('agency', query)"
          :placeholder="$t('common.all')"
        />
      </el-form-item>
      <el-form-item :label="$t('common.keywords')" class="filter-bar__wide">
        <el-input
          v-model="keyword"
          :placeholder="$t('ledger.shengxu.searchPlaceholder')"
          maxlength="200"
          clearable
        />
      </el-form-item>
    </FilterBar>
    <SectionCard fill>
      <TableToolbar :refreshing="loading" @refresh="fetchList">
        <el-button v-if="canCreate" type="primary" @click="openCreate">
          {{ $t("ledger.shengxu.create") }}
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
          prop="recordDate"
          :label="$t('ledger.shengxu.recordDate')"
          width="110"
          fixed="left"
        />
        <el-table-column
          prop="agencyName"
          :label="$t('ledger.shengxu.agency')"
          min-width="160"
          show-overflow-tooltip
        />
        <el-table-column :label="$t('ledger.shengxu.region')" min-width="130" show-overflow-tooltip>
          <template #default="{ row }">
            {{ regionText(row as ShengxuLedgerItem) }}
          </template>
        </el-table-column>
        <el-table-column prop="contactName" :label="$t('ledger.shengxu.contact')" min-width="110" />
        <el-table-column
          prop="creatorName"
          :label="$t('ledger.shengxu.collectCoordinator')"
          min-width="110"
        />
        <el-table-column :label="$t('ledger.shengxu.quoteSent')" min-width="110" align="center">
          <template #default="{ row }">
            {{ $t(row.quoteSent === true ? "common.yes" : "common.no") }}
          </template>
        </el-table-column>
        <el-table-column
          prop="quotedGroups"
          :label="$t('ledger.shengxu.quotedGroups')"
          min-width="100"
          align="right"
        />
        <el-table-column
          prop="convertedGroups"
          :label="$t('ledger.shengxu.convertedGroups')"
          min-width="90"
          align="right"
        />
        <el-table-column
          prop="itinerary"
          :label="$t('ledger.shengxu.itinerary')"
          min-width="180"
          show-overflow-tooltip
          :formatter="textOrDash"
        />
        <el-table-column
          prop="notConvertedReason"
          :label="$t('ledger.shengxu.notConvertedReason')"
          min-width="180"
          show-overflow-tooltip
          :formatter="textOrDash"
        />
        <el-table-column
          :label="$t('common.actions')"
          width="160"
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
                @click="handleOpenClick(row as ShengxuLedgerItem)"
              >
                {{ $t(canEditRow(row as ShengxuLedgerItem) ? "common.edit" : "common.view") }}
              </el-button>
              <el-button
                v-if="canDeleteRow(row as ShengxuLedgerItem)"
                link
                type="danger"
                :disabled="isPending(row.id) || openingId === row.id"
                @click="handleDelete(row as ShengxuLedgerItem)"
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

    <ShengxuLedgerDialog
      v-model="dialogVisible"
      :ledger="editing"
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
import type { RemoteOptionsQuery } from "@/composables/useRemoteOptions";
import DataTable from "@/components/DataTable/index.vue";
import FilterBar from "@/components/FilterBar/index.vue";
import PageShell from "@/components/PageShell/index.vue";
import Pagination from "@/components/Pagination/index.vue";
import RowActions from "@/components/RowActions/index.vue";
import SectionCard from "@/components/SectionCard/index.vue";
import TableToolbar from "@/components/TableToolbar/index.vue";
import { shengxuLedgerService } from "@/services/shengxu-ledger.service";
import { useUserStore } from "@/stores/user";
import type { ShengxuLedgerItem } from "@/types/shengxu-ledger";
import { useResourcePagination } from "@/views/resources/useResourcePagination";
import ShengxuLedgerDialog from "./components/ShengxuLedgerDialog.vue";

defineOptions({ name: "ShengxuLedger" });

const { t } = useI18n();
const user = useUserStore();
const creatorId = ref("");
const agencyId = ref("");
const keyword = ref("");
const dateRange = ref<[string, string] | null>(null);
const loading = ref(false);
const loadError = ref("");
const rows = ref<ShengxuLedgerItem[]>([]);
const total = ref(0);
const { pageNum, pageSize, paginationQuery } = useResourcePagination();
const dialogVisible = ref(false);
const editing = ref<ShengxuLedgerItem | null>(null);
const isReadonly = ref(false);
const openingId = ref("");
const { isPending, run } = usePendingActions();
let listGeneration = 0;

// 使用当前身份的有效动作权限；行级操作另结合后端 capabilities。
const canCreate = computed(
  () => user.userInfo.perms.includes("ledger:shengxu:create"),
);
const hasActiveFilters = computed(() => Boolean(keyword.value.trim() || dateRange.value || creatorId.value || agencyId.value));

function canEditRow(row: ShengxuLedgerItem) {
  return row.capabilities.canEdit && user.userInfo.perms.includes("ledger:shengxu:update");
}
function canDeleteRow(row: ShengxuLedgerItem) {
  return row.capabilities.canDelete && user.userInfo.perms.includes("ledger:shengxu:delete");
}
function regionText(row: ShengxuLedgerItem) {
  return [row.countryOrRegion, row.city].filter(Boolean).join(" / ") || "-";
}
function textOrDash(_row: unknown, _column: unknown, value: string) {
  return value || "-";
}
function errorText(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

async function loadFilterOptions(kind: "creator" | "agency", query: RemoteOptionsQuery) {
  const result = await shengxuLedgerService.filterOptions({ ...query, kind });
  return { ...result, list: result.list.map((item) => ({ id: item.id, label: item.name })) };
}

async function fetchList() {
  const generation = ++listGeneration;
  loading.value = true;
  try {
    const result = await shengxuLedgerService.list({
      ...paginationQuery(),
      creatorId: creatorId.value || undefined,
      agencyId: agencyId.value || undefined,
      keyword: keyword.value.trim() || undefined,
      from: dateRange.value?.[0],
      to: dateRange.value?.[1],
    });
    if (generation !== listGeneration) return;
    rows.value = result.list;
    total.value = result.total;
    loadError.value = "";
  } catch (error) {
    if (generation !== listGeneration) return;
    loadError.value = errorText(error);
    ElMessage.error(loadError.value);
  } finally {
    if (generation === listGeneration) loading.value = false;
  }
}
const reload = useDebounceFn(() => {
  pageNum.value = 1;
  void fetchList();
}, 300);
watch([keyword, dateRange, creatorId, agencyId], reload);

function resetQuery() {
  creatorId.value = "";
  agencyId.value = "";
  keyword.value = "";
  dateRange.value = null;
}
function openCreate() {
  editing.value = null;
  isReadonly.value = false;
  dialogVisible.value = true;
}
// 打开前取最新详情，保证编辑基于最新 version 与能力。
async function handleOpenClick(row: ShengxuLedgerItem) {
  if (openingId.value || isPending(row.id)) return;
  openingId.value = row.id;
  try {
    const detail = await shengxuLedgerService.detail(row.id);
    editing.value = detail;
    isReadonly.value = !canEditRow(detail);
    dialogVisible.value = true;
  } catch (error) {
    ElMessage.error(errorText(error));
  } finally {
    openingId.value = "";
  }
}
function handleSaved(saved: ShengxuLedgerItem) {
  editing.value = saved;
  void fetchList();
}
async function handleDelete(row: ShengxuLedgerItem) {
  if (openingId.value === row.id) return;
  await run(row.id, async () => {
    try {
      await ElMessageBox.confirm(
        t("ledger.shengxu.deleteConfirm", { date: row.recordDate, agency: row.agencyName }),
        t("common.warning"),
        { type: "warning" },
      );
    } catch {
      return;
    }
    try {
      await shengxuLedgerService.delete(row.id, row.version);
      ElMessage.success(t("common.deleteSuccess"));
    } catch (error) {
      ElMessage.error(errorText(error));
    } finally {
      await fetchList();
    }
  });
}

onMounted(fetchList);
</script>
