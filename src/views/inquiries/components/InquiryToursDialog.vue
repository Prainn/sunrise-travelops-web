<template>
  <AppDialog
    :model-value="modelValue"
    :title="`${$t('tour.relatedTours')} · ${inquiry.code}`"
    size="lg"
    destroy-on-close
    @update:model-value="emit('update:modelValue', $event)"
  >
    <DataTable
      :loading="loading"
      :data="tours"
      :error="error"
      row-key="id"
      @retry="fetchTours"
    >
      <el-table-column prop="tourNo" :label="$t('tour.tourNo')" min-width="190" />
      <el-table-column prop="startDate" :label="$t('common.startDate')" width="120" />
      <el-table-column
        prop="days"
        :label="$t('tour.days')"
        width="80"
        align="center"
      />
      <el-table-column
        prop="totalPeople"
        :label="$t('tour.totalPeople')"
        width="90"
        align="center"
      />
      <el-table-column :label="$t('tour.guide')" min-width="160" show-overflow-tooltip>
        <template #default="{ row }">
          {{ guideSummaryText(row.guideServices) || $t("common.notSet") }}
        </template>
      </el-table-column>
      <el-table-column prop="quoteCode" :label="$t('tour.quoteCode')" min-width="150" />
      <el-table-column :label="$t('common.status')" width="100" align="center">
        <template #default="{ row }">
          <el-tag :type="row.status === 'active' ? 'success' : 'info'">
            {{ $t(`tour.status.${row.status}`) }}
          </el-tag>
        </template>
      </el-table-column>
    </DataTable>
    <Pagination
      v-if="total > pageSize"
      :page="page"
      :limit="pageSize"
      :total="total"
      @update:page="changePage"
      @update:limit="changePageSize"
    />
  </AppDialog>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import AppDialog from "@/components/AppDialog/index.vue";
import DataTable from "@/components/DataTable/index.vue";
import Pagination from "@/components/Pagination/index.vue";
import { tourService } from "@/services/tour.service";
import type { InquiryRecord } from "@/types/inquiry";
import type { TourRecord } from "@/types/tour";
import { guideSummaryText } from "@/utils/guide-services";
import { requestErrorMessage } from "@/utils/version-conflict";

const props = defineProps<{ modelValue: boolean; inquiry: InquiryRecord }>();
const emit = defineEmits<{ "update:modelValue": [value: boolean] }>();

const tours = ref<TourRecord[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(20);
const loading = ref(false);
const error = ref("");
let generation = 0;

watch(
  () => props.modelValue,
  (opened) => {
    if (!opened) return;
    page.value = 1;
    void fetchTours();
  },
  { immediate: true },
);

/** 按询盘读取关联团，仍受成团列表权限与访问范围约束。 */
async function fetchTours() {
  const current = ++generation;
  loading.value = true;
  error.value = "";
  try {
    const result = await tourService.list({
      inquiryId: props.inquiry.id,
      page: page.value,
      pageSize: pageSize.value,
    });
    if (current !== generation) return;
    tours.value = result.list;
    total.value = result.total;
  } catch (loadError) {
    if (current === generation) error.value = requestErrorMessage(loadError);
  } finally {
    if (current === generation) loading.value = false;
  }
}
function changePage(value: number) {
  page.value = value;
  void fetchTours();
}
function changePageSize(value: number) {
  pageSize.value = value;
  page.value = 1;
  void fetchTours();
}
</script>
