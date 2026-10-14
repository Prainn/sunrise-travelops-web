<template>
  <div class="page-container">
    <AttractionSearchForm
      v-model:keywords="keywords"
      v-model:area="area"
      v-model:category="category"
      @reset="resetQuery"
    />

    <el-card class="page-content" shadow="never">
      <TableToolbar @refresh="refreshRows">
        <el-button
          v-has-perm="RESOURCE_PERMISSIONS.attraction.create"
          type="primary"
          @click="emit('create')"
        >
          {{ $t("attraction.createAttraction") }}
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
          <el-table-column prop="name" :label="$t('resource.attractionName')" min-width="200" />
          <el-table-column prop="area" :label="$t('attraction.area')" width="100" />
          <el-table-column
            prop="description"
            :label="$t('resource.description')"
            min-width="240"
            show-overflow-tooltip
          />
          <el-table-column :label="$t('attraction.price')" width="110" align="right">
            <template #default="scope">
              {{ scope.row.price === null ? $t('resource.priceMissing') : formatMoney(scope.row.price) }}
            </template>
          </el-table-column>
          <el-table-column :label="$t('resource.isStandardPrice')" width="110" align="center">
            <template #default="{ row }">
              <el-tag :type="row.isStandardPrice ? 'success' : 'info'">
                {{ $t(row.isStandardPrice ? "common.yes" : "common.no") }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="code" :label="$t('resource.code')" width="170" />
          <el-table-column :label="$t('common.status')" width="90" align="center">
            <template #default="scope">
              <el-tag :type="scope.row.status === 'enabled' ? 'success' : 'info'">
                {{ $t(`common.${scope.row.status}`) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column
            :label="$t('common.actions')"
            width="220"
            fixed="right"
            align="center"
          >
            <template #default="scope">
              <el-button
                v-has-perm="RESOURCE_PERMISSIONS.attraction.update"
                type="primary"
                link
                @click="emit('edit', scope.row as AttractionRecord)"
              >
                {{ $t("common.edit") }}
              </el-button>
              <el-button
                v-has-perm="RESOURCE_PERMISSIONS.attraction.update"
                type="warning"
                link
                @click="emit('toggle-status', scope.row as AttractionRecord)"
              >
                {{ $t(scope.row.status === "enabled" ? "common.disabled" : "common.enabled") }}
              </el-button>
              <el-button
                v-has-perm="RESOURCE_PERMISSIONS.attraction.delete"
                type="danger"
                link
                @click="emit('delete', scope.row as AttractionRecord)"
              >
                {{ $t("common.delete") }}
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
      <pagination
        v-if="total > 0"
        v-model:page="pageNum"
        v-model:limit="pageSize"
        :total="total"
        @pagination="refreshRows"
      />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { useResourcePagination } from "@/views/resources/useResourcePagination";
import { ref, watch } from "vue";
import { useDebounceFn } from "@vueuse/core";
import { RESOURCE_PERMISSIONS } from "@/constants";
import type {
  AttractionCategory,
  AttractionRecord,
  ResourceListQuery,
} from "@/types/resource";
import { formatMoney } from "@/utils";
import TableToolbar from "@/components/TableToolbar/index.vue";
import AttractionSearchForm from "./AttractionSearchForm.vue";

defineProps<{
  loading?: boolean;
  rows: AttractionRecord[];
  total: number;
}>();
const emit = defineEmits<{
  refresh: [query: ResourceListQuery];
  "query-change": [query: ResourceListQuery];
  create: [];
  edit: [record: AttractionRecord];
  delete: [record: AttractionRecord];
  "toggle-status": [record: AttractionRecord];
}>();

const keywords = ref("");
const area = ref("");
const category = ref<AttractionCategory | "">("");
const { pageNum, pageSize, paginationQuery } = useResourcePagination();
const requestRows = useDebounceFn(() => emit("query-change", currentQuery()), 300);

watch([keywords, area, category], () => {
  pageNum.value = 1;
  requestRows();
});

function currentQuery(): ResourceListQuery {
  return {
    ...paginationQuery(),
    keyword: keywords.value,
    area: area.value,
    category: category.value || undefined,
  };
}

function resetQuery() {
  keywords.value = "";
  area.value = "";
  category.value = "";
  pageNum.value = 1;
  requestRows();
}
function refreshRows() {
  emit("refresh", currentQuery());
}
</script>
