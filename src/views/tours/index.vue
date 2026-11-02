<template>
  <PageShell>
    <FilterBar @reset="resetQuery">
      <el-form-item v-if="isHeadquarters" :label="$t('identity.businessUnit')">
        <el-select
          v-model="businessUnit"
          autocomplete="new-password"
          :placeholder="$t('identity.allBusinesses')"
          clearable
        >
          <el-option
            v-for="unit in UNITS"
            :key="unit"
            :value="unit"
            :label="businessUnitName(unit)"
          />
        </el-select>
      </el-form-item>
      <el-form-item :label="$t('common.status')">
        <el-select
          v-model="status"
          autocomplete="new-password"
          :placeholder="$t('common.all')"
          clearable
        >
          <el-option value="active" :label="$t('tour.status.active')" />
          <el-option value="cancelled" :label="$t('tour.status.cancelled')" />
        </el-select>
      </el-form-item>
      <el-form-item :label="$t('common.startDate')" class="filter-bar__wide">
        <el-date-picker
          v-model="dateRange"
          type="daterange"
          value-format="YYYY-MM-DD"
          :start-placeholder="$t('common.startDate')"
          :end-placeholder="$t('common.endDate')"
        />
      </el-form-item>
      <el-form-item :label="$t('tour.collectCoordinator')">
        <RemoteSelect
          v-model="collectCoordinatorId"
          :query-key="businessUnit"
          :load-options="(query) => loadFilterOptions('collectCoordinator', query)"
          :placeholder="$t('common.all')"
        />
      </el-form-item>
      <el-form-item :label="$t('tour.operator')">
        <RemoteSelect
          v-model="operatorId"
          :query-key="businessUnit"
          :load-options="(query) => loadFilterOptions('operator', query)"
          :placeholder="$t('common.all')"
        />
      </el-form-item>
      <el-form-item :label="$t('tour.agency')">
        <RemoteSelect
          v-model="agencyName"
          :query-key="businessUnit"
          :load-options="(query) => loadFilterOptions('agency', query)"
          :placeholder="$t('common.all')"
        />
      </el-form-item>
      <el-form-item :label="$t('common.keywords')" class="filter-bar__wide">
        <el-input
          v-model="keyword"
          :placeholder="$t('tour.searchPlaceholder')"
          maxlength="200"
          clearable
        />
      </el-form-item>
    </FilterBar>
    <SectionCard fill>
      <TableToolbar :refreshing="loading" @refresh="load">
        <el-button v-if="canCreate" type="primary" @click="openCreate">
          {{ $t("common.create") }}
        </el-button>
      </TableToolbar>
      <!-- 行数据的 children 是儿童人数，改用不存在的字段作树形子行，避免 el-table 当作子行遍历 -->
      <DataTable
        fill
        :loading="loading"
        :data="rows"
        :error="loadError"
        :filtered="hasActiveFilters"
        row-key="id"
        :tree-props="{ children: '__treeChildren' }"
        @retry="load"
      >
        <el-table-column
          prop="tourNo"
          :label="$t('tour.tourNo')"
          min-width="210"
          fixed="left"
          :show-overflow-tooltip="false"
        />
        <el-table-column :label="$t('common.status')" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === 'active' ? 'success' : 'info'">
              {{ $t(`tour.status.${row.status}`) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column :label="$t('identity.businessUnit')" min-width="110">
          <template #default="{ row }">
            {{ businessUnitName(row.businessUnit) }}
          </template>
        </el-table-column>
        <el-table-column prop="countryName" :label="$t('common.countryOrRegion')" min-width="120" />
        <el-table-column :label="$t('tour.source')" min-width="100">
          <template #default="{ row }">
            {{ $t(`tour.sourceModule.${row.sourceModule}`) }}
          </template>
        </el-table-column>
        <el-table-column
          prop="itinerarySummary"
          :label="$t('tour.itinerarySummary')"
          min-width="150"
          show-overflow-tooltip
          :formatter="textOrDash"
        />
        <el-table-column
          prop="inquiryCode"
          :label="$t('tour.inquiryCode')"
          min-width="150"
          :formatter="sourceCode"
        />
        <el-table-column
          prop="quoteCode"
          :label="$t('tour.quoteCode')"
          min-width="150"
          :formatter="sourceCode"
        />
        <el-table-column
          prop="itineraryCode"
          :label="$t('tour.itineraryCode')"
          min-width="150"
          :formatter="sourceCode"
        />
        <el-table-column prop="days" :label="$t('tour.days')" width="80" />
        <el-table-column prop="startDate" :label="$t('common.startDate')" min-width="110" />
        <el-table-column
          prop="agencyName"
          :label="$t('tour.agency')"
          min-width="150"
          show-overflow-tooltip
        />
        <el-table-column prop="contactName" :label="$t('common.contact')" min-width="110" />
        <el-table-column prop="collectCoordinatorName" :label="$t('tour.collectCoordinator')" min-width="110" />
        <el-table-column prop="operatorName" :label="$t('tour.operator')" min-width="110" />
        <el-table-column prop="adults" :label="$t('tour.adults')" width="80" />
        <el-table-column prop="children" :label="$t('tour.children')" width="80" />
        <el-table-column prop="leaders" :label="$t('tour.leaders')" width="80" />
        <el-table-column prop="totalPeople" :label="$t('tour.totalPeople')" width="90" />
        <el-table-column prop="language" :label="$t('common.language')" min-width="90" />
        <el-table-column :label="$t('tour.shopping')" width="80">
          <template #default="{ row }">
            {{ $t(row.shopping ? "common.yes" : "common.no") }}
          </template>
        </el-table-column>
        <el-table-column :label="$t('tour.pickupFlight')" min-width="150">
          <template #default="{ row }">
            {{ flightText(row as TourRecord, "pickup") }}
          </template>
        </el-table-column>
        <el-table-column :label="$t('tour.dropFlight')" min-width="150">
          <template #default="{ row }">
            {{ flightText(row as TourRecord, "drop") }}
          </template>
        </el-table-column>
        <el-table-column prop="pickupAt" :label="$t('tour.pickupAt')" min-width="150" />
        <el-table-column prop="dropAt" :label="$t('tour.dropAt')" min-width="150" />
        <el-table-column :label="$t('tour.guide')" min-width="160" :show-overflow-tooltip="false">
          <template #default="{ row }">
            <el-popover
              v-if="(row as TourRecord).guideServices.length"
              placement="left"
              trigger="click"
              :width="360"
            >
              <template #reference>
                <el-button link type="primary">
                  {{ guideSummaryText((row as TourRecord).guideServices) }}
                </el-button>
              </template>
              <GuideServiceList :services="(row as TourRecord).guideServices" />
            </el-popover>
            <template v-else>
              {{ $t("tour.unassigned") }}
            </template>
          </template>
        </el-table-column>
        <el-table-column
          prop="remark"
          :label="$t('common.remark')"
          min-width="160"
          show-overflow-tooltip
        />
        <el-table-column
          :label="$t('common.actions')"
          width="260"
          fixed="right"
          :show-overflow-tooltip="false"
        >
          <template #default="{ row }">
            <RowActions v-if="row.status === 'active'">
              <el-button
                v-if="canUpdate"
                link
                type="primary"
                :disabled="isPending(row.id)"
                @click="openEdit(row as TourRecord)"
              >
                {{ $t("common.edit") }}
              </el-button>
              <el-button
                v-if="canUpdate"
                link
                type="primary"
                :disabled="isPending(row.id)"
                @click="openGuideAssignment(row as TourRecord)"
              >
                {{ $t("tour.assignGuide") }}
              </el-button>
              <el-button
                v-if="canCancel"
                link
                type="danger"
                :disabled="isPending(row.id)"
                @click="cancelTour(row as TourRecord)"
              >
                {{ $t("tour.cancel") }}
              </el-button>
            </RowActions>
          </template>
        </el-table-column>
        <el-table-column
          prop="updatedAt"
          :label="$t('ledger.lastUpdatedAt')"
          width="170"
          :formatter="(_row: unknown, _column: unknown, value: string) => formatDateTime(value)"
        />
      </DataTable>
      <Pagination
        v-if="total > 0"
        v-model:page="pageNum"
        v-model:limit="pageSize"
        :total="total"
        @pagination="load"
      />
    </SectionCard>

    <TourEditorDialog
      v-if="canCreate || canUpdate"
      v-model="dialogVisible"
      :tour="editing"
      @saved="load"
    />
    <TourGuideAssignmentDialog
      v-if="canUpdate && assigningTour"
      v-model="guideDialogVisible"
      :tour="assigningTour"
      @saved="load"
    />
  </PageShell>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useDebounceFn } from "@vueuse/core";
import { ElMessage, ElMessageBox } from "element-plus";
import { useI18n } from "vue-i18n";
import { useRoute } from "vue-router";
import RemoteSelect from "@/components/RemoteSelect/index.vue";
import { usePendingActions } from "@/composables/usePendingActions";
import { useRefreshOnActivated } from "@/composables";
import type { RemoteOptionsQuery } from "@/composables/useRemoteOptions";
import DataTable from "@/components/DataTable/index.vue";
import GuideServiceList from "@/components/GuideServiceList/index.vue";
import FilterBar from "@/components/FilterBar/index.vue";
import PageShell from "@/components/PageShell/index.vue";
import Pagination from "@/components/Pagination/index.vue";
import RowActions from "@/components/RowActions/index.vue";
import SectionCard from "@/components/SectionCard/index.vue";
import TableToolbar from "@/components/TableToolbar/index.vue";
import { businessUnitName } from "@/constants/identity";
import { tourService } from "@/services/tour.service";
import { useUserStore } from "@/stores/user";
import type { TourBusinessUnit, TourRecord } from "@/types/tour";
import { guideSummaryText } from "@/utils/guide-services";
import { hasUserPermission } from "@/utils/permission";
import { useResourcePagination } from "@/views/resources/useResourcePagination";
import TourEditorDialog from "./components/TourEditorDialog.vue";
import TourGuideAssignmentDialog from "./components/TourGuideAssignmentDialog.vue";
import { formatDateTime } from "@/utils/format.js";

defineOptions({ name: "TourList" });

const UNITS: TourBusinessUnit[] = ["shengxu", "linxi", "website"];
const CANCEL_REASON_MAX_LENGTH = 500;
const { t } = useI18n();
const user = useUserStore();
const canCreate = computed(() => hasUserPermission(user.userInfo, "tour:create"));
const canUpdate = computed(() => hasUserPermission(user.userInfo, "tour:update"));
const canCancel = computed(() => hasUserPermission(user.userInfo, "tour:cancel"));
const isHeadquarters = computed(() => user.userInfo.scope === "headquarters");
const collectCoordinatorId = ref("");
const operatorId = ref("");
const agencyName = ref("");
const dateRange = ref<[string, string] | null>(null);
const route = useRoute();
/** 首页地图等入口以 ?keyword=团号 跳转，预填关键词；不读取单团详情接口。 */
const keyword = ref(routeKeyword() ?? "");
const status = ref<"active" | "cancelled" | "">("");
const businessUnit = ref<TourBusinessUnit | "">("");
const loading = ref(false);
const loadError = ref("");
const hasActiveFilters = computed(() =>
  Boolean(keyword.value.trim() || status.value || businessUnit.value || dateRange.value || collectCoordinatorId.value || operatorId.value || agencyName.value),
);
const total = ref(0);
const rows = ref<TourRecord[]>([]);
const { pageNum, pageSize, paginationQuery } = useResourcePagination();
const dialogVisible = ref(false);
const editing = ref<TourRecord | null>(null);
const guideDialogVisible = ref(false);
const assigningTour = ref<TourRecord | null>(null);
const { isPending, run } = usePendingActions();

function routeKeyword() {
  const value = route.query.keyword;
  return typeof value === "string" ? value : undefined;
}

async function loadFilterOptions(kind: "collectCoordinator" | "operator" | "agency", query: RemoteOptionsQuery) {
  const result = await tourService.filterOptions({ ...query, kind, businessUnit: businessUnit.value || undefined });
  return { ...result, list: result.list.map((item) => ({ id: item.id, label: item.name })) };
}

let listGeneration = 0;
async function load() {
  const generation = ++listGeneration;
  loading.value = true;
  try {
    const result = await tourService.list({
      ...paginationQuery(),
      collectCoordinatorId: collectCoordinatorId.value || undefined,
      operatorId: operatorId.value || undefined,
      agencyName: agencyName.value || undefined,
      from: dateRange.value?.[0],
      to: dateRange.value?.[1],
      keyword: keyword.value.trim() || undefined,
      status: status.value || undefined,
      businessUnit: businessUnit.value || undefined,
    });
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
  void load();
}, 300);
watch([keyword, status, businessUnit, dateRange, collectCoordinatorId, operatorId, agencyName], reload);
// 缓存页面再次从入口带入团号时更新关键词；离开本页时 query 不含 keyword，保留当前输入。
watch(routeKeyword, (value) => {
  if (value !== undefined) keyword.value = value;
});
watch(businessUnit, () => {
  collectCoordinatorId.value = "";
  operatorId.value = "";
  agencyName.value = "";
});
function resetQuery() {
  collectCoordinatorId.value = "";
  operatorId.value = "";
  agencyName.value = "";
  dateRange.value = null;
  keyword.value = "";
  status.value = "";
  businessUnit.value = "";
}
function textOrDash(_row: unknown, _column: unknown, value: string | null) {
  return value || "-";
}
// 手工团没有来源关系；关联团缺编号时显示横线，不生成空链接。
function sourceCode(row: TourRecord, _column: unknown, value: string | null) {
  return value || (row.sourceModule === "manual" ? t("common.notLinked") : "-");
}
function flightText(row: TourRecord, kind: "pickup" | "drop") {
  const flight = kind === "pickup" ? row.pickupFlight : row.dropFlight;
  if (!flight) return t("tour.flightNotLinked");
  const airport = kind === "pickup" ? flight.arrivalAirport : flight.departureAirport;
  return `${flight.flightNumber} ${airport.code}`;
}
function openCreate() {
  if (!canCreate.value) return;
  editing.value = null;
  dialogVisible.value = true;
}
function openEdit(row: TourRecord) {
  if (!canUpdate.value || isPending(row.id)) return;
  editing.value = row;
  dialogVisible.value = true;
}
function openGuideAssignment(row: TourRecord) {
  if (!canUpdate.value || row.status !== "active" || isPending(row.id)) return;
  assigningTour.value = row;
  guideDialogVisible.value = true;
}
async function cancelTour(row: TourRecord) {
  if (!canCancel.value) return;
  await run(row.id, async () => {
    let reason: string;
    try {
      const result = await ElMessageBox.prompt(t("tour.cancelConfirm"), t("tour.cancel"), {
        type: "warning",
        inputPlaceholder: t("tour.cancelReason"),
        // 与后端 DTO 一致：去除首尾空白后最多 500 字。
        inputValidator: (value) => (value ?? "").trim().length <= CANCEL_REASON_MAX_LENGTH,
        inputErrorMessage: t("websiteConfig.validation.maxLength", {
          field: t("tour.cancelReason"),
          max: CANCEL_REASON_MAX_LENGTH,
        }),
      });
      reason = (result.value ?? "").trim();
    } catch {
      return;
    }
    try {
      await tourService.cancel(row.id, row.version, reason);
      ElMessage.success(t("tour.cancelled"));
    } catch (error) {
      ElMessage.error(error instanceof Error ? error.message : String(error));
    } finally {
      await load();
    }
  });
}

onMounted(load);
useRefreshOnActivated(load);
</script>
