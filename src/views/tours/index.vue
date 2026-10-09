<template>
  <div class="page-container">
    <el-form inline class="page-search">
      <el-form-item v-if="isHeadquarters" :label="$t('identity.businessUnit')">
        <el-select v-model="businessUnit" clearable class="!w-[160px]">
          <el-option
            v-for="unit in UNITS"
            :key="unit"
            :value="unit"
            :label="businessUnitName(unit)"
          />
        </el-select>
      </el-form-item>
      <el-form-item :label="$t('common.status')">
        <el-select v-model="status" clearable class="!w-[140px]">
          <el-option value="active" :label="$t('tour.status.active')" />
          <el-option value="cancelled" :label="$t('tour.status.cancelled')" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-input v-model="keyword" :placeholder="$t('tour.searchPlaceholder')" clearable />
      </el-form-item>
      <el-form-item>
        <el-button @click="resetQuery">
          {{ $t("common.reset") }}
        </el-button>
      </el-form-item>
    </el-form>
    <el-card class="page-content" shadow="never">
      <TableToolbar @refresh="load">
        <el-button v-has-perm="'tour:create'" type="primary" @click="openCreate">
          {{ $t("tour.create") }}
        </el-button>
      </TableToolbar>
      <div class="page-table-wrapper">
        <el-table
          v-loading="loading"
          :data="rows"
          border
          height="100%"
          row-key="id"
        >
          <el-table-column
            prop="tourNo"
            :label="$t('tour.tourNo')"
            min-width="210"
            fixed="left"
          />
          <el-table-column :label="$t('identity.businessUnit')" min-width="110">
            <template #default="{ row }">
              {{ businessUnitName(row.businessUnit) }}
            </template>
          </el-table-column>
          <el-table-column prop="countryName" :label="$t('inquiry.countryOrRegion')" min-width="120" />
          <el-table-column :label="$t('tour.source')" min-width="100">
            <template #default="{ row }">
              {{ $t(`tour.sourceModule.${row.sourceModule}`) }}
            </template>
          </el-table-column>
          <el-table-column prop="inquiryCode" :label="$t('tour.inquiryCode')" min-width="150" />
          <el-table-column prop="quoteCode" :label="$t('tour.quoteCode')" min-width="150" />
          <el-table-column prop="itineraryCode" :label="$t('tour.itineraryCode')" min-width="150" />
          <el-table-column prop="days" :label="$t('tour.days')" width="80" />
          <el-table-column prop="startDate" :label="$t('common.startDate')" min-width="110" />
          <el-table-column
            prop="agencyName"
            :label="$t('tour.agency')"
            min-width="150"
            show-overflow-tooltip
          />
          <el-table-column prop="contactName" :label="$t('inquiry.contactName')" min-width="110" />
          <el-table-column prop="collectCoordinatorName" :label="$t('tour.collectCoordinator')" min-width="110" />
          <el-table-column prop="operatorName" :label="$t('tour.operator')" min-width="110" />
          <el-table-column prop="adults" :label="$t('tour.adults')" width="80" />
          <el-table-column prop="children" :label="$t('tour.children')" width="80" />
          <el-table-column prop="leaders" :label="$t('tour.leaders')" width="80" />
          <el-table-column prop="totalPeople" :label="$t('tour.totalPeople')" width="90" />
          <el-table-column prop="language" :label="$t('tour.language')" min-width="90" />
          <el-table-column :label="$t('tour.shopping')" width="80">
            <template #default="{ row }">
              {{ $t(row.shopping ? "common.yes" : "common.no") }}
            </template>
          </el-table-column>
          <el-table-column :label="$t('tour.pickupFlight')" min-width="150">
            <template #default="{ row }">
              {{ row.pickupFlight.flightNumber }} {{ row.pickupFlight.arrivalAirport.code }}
            </template>
          </el-table-column>
          <el-table-column :label="$t('tour.dropFlight')" min-width="150">
            <template #default="{ row }">
              {{ row.dropFlight.flightNumber }} {{ row.dropFlight.departureAirport.code }}
            </template>
          </el-table-column>
          <el-table-column prop="pickupAt" :label="$t('tour.pickupAt')" min-width="150" />
          <el-table-column prop="dropAt" :label="$t('tour.dropAt')" min-width="150" />
          <el-table-column :label="$t('tour.guide')" min-width="110">
            <template #default="{ row }">
              {{ row.guideName ?? $t("tour.unassigned") }}
            </template>
          </el-table-column>
          <el-table-column
            prop="remark"
            :label="$t('common.remark')"
            min-width="160"
            show-overflow-tooltip
          />
          <el-table-column :label="$t('common.status')" width="100" align="center">
            <template #default="{ row }">
              <el-tag :type="row.status === 'active' ? 'success' : 'info'">
                {{ $t(`tour.status.${row.status}`) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column :label="$t('common.actions')" width="150" fixed="right">
            <template #default="{ row }">
              <template v-if="row.status === 'active'">
                <el-button
                  v-has-perm="'tour:update'"
                  link
                  type="primary"
                  @click="openEdit(row as TourRecord)"
                >
                  {{ $t("common.edit") }}
                </el-button>
                <el-button
                  v-has-perm="'tour:cancel'"
                  link
                  type="danger"
                  @click="cancelTour(row as TourRecord)"
                >
                  {{ $t("tour.cancel") }}
                </el-button>
              </template>
            </template>
          </el-table-column>
        </el-table>
      </div>
      <pagination
        v-if="total > 0"
        v-model:page="pageNum"
        v-model:limit="pageSize"
        :total="total"
        @pagination="load"
      />
    </el-card>

    <TourEditorDialog v-model="dialogVisible" :tour="editing" @saved="load" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useDebounceFn } from "@vueuse/core";
import { ElMessage, ElMessageBox } from "element-plus";
import { useI18n } from "vue-i18n";
import TableToolbar from "@/components/TableToolbar/index.vue";
import { businessUnitName } from "@/constants/identity";
import { tourService } from "@/services/tour.service";
import { useUserStore } from "@/stores/user";
import type { TourBusinessUnit, TourRecord } from "@/types/tour";
import { useResourcePagination } from "@/views/resources/useResourcePagination";
import TourEditorDialog from "./components/TourEditorDialog.vue";

defineOptions({ name: "TourList" });

const UNITS: TourBusinessUnit[] = ["shengxu", "linxi", "website"];
const { t } = useI18n();
const user = useUserStore();
const isHeadquarters = computed(() => user.userInfo.scope === "headquarters");
const keyword = ref("");
const status = ref<"active" | "cancelled" | "">("");
const businessUnit = ref<TourBusinessUnit | "">("");
const loading = ref(false);
const total = ref(0);
const rows = ref<TourRecord[]>([]);
const { pageNum, pageSize, paginationQuery } = useResourcePagination();
const dialogVisible = ref(false);
const editing = ref<TourRecord | null>(null);

async function load() {
  loading.value = true;
  try {
    const result = await tourService.list({
      ...paginationQuery(),
      keyword: keyword.value,
      status: status.value || undefined,
      businessUnit: businessUnit.value || undefined,
    });
    rows.value = result.list;
    total.value = result.total;
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : String(error));
  } finally {
    loading.value = false;
  }
}
const reload = useDebounceFn(() => {
  pageNum.value = 1;
  void load();
}, 300);
watch([keyword, status, businessUnit], reload);
function resetQuery() {
  keyword.value = "";
  status.value = "";
  businessUnit.value = "";
}
function openCreate() {
  editing.value = null;
  dialogVisible.value = true;
}
function openEdit(row: TourRecord) {
  editing.value = row;
  dialogVisible.value = true;
}
async function cancelTour(row: TourRecord) {
  let reason: string;
  try {
    const result = await ElMessageBox.prompt(t("tour.cancelConfirm"), t("tour.cancel"), {
      type: "warning",
      inputPlaceholder: t("tour.cancelReason"),
    });
    reason = result.value ?? "";
  } catch {
    return;
  }
  try {
    await tourService.cancel(row.id, row.version, reason);
    ElMessage.success(t("tour.cancelled"));
    await load();
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : String(error));
  }
}

onMounted(load);
</script>
