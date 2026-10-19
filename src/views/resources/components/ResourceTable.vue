<template>
  <PageShell>
    <FilterBar @reset="resetQuery">
      <el-form-item :label="$t('common.keywords')" class="filter-bar__wide">
        <el-input
          v-model.trim="keywords"
          :placeholder="$t(searchPlaceholderKey ?? 'resource.searchPlaceholder')"
          clearable
        />
      </el-form-item>
      <slot name="filters" />
    </FilterBar>

    <SectionCard fill>
      <TableToolbar :refreshing="loading" @refresh="refreshRows">
        <el-button v-has-perm="permissions.create" type="primary" @click="emit('create')">
          {{ $t("common.create") }}
        </el-button>
      </TableToolbar>
      <DataTable
        fill
        :loading="loading"
        :data="rows"
        :error="error"
        :filtered="hasActiveFilters"
        row-key="id"
        @retry="refreshRows"
      >
        <el-table-column
          v-for="column in columns"
          :key="column.prop"
          :prop="column.prop"
          :label="$t(column.labelKey)"
          :min-width="column.minWidth ?? 120"
        >
          <template #default="{ row }">
            <slot :name="`column-${column.prop}`" :row="row">
              {{ row[column.prop] }}
            </slot>
          </template>
        </el-table-column>
        <el-table-column :label="$t('common.status')" width="100" align="center">
          <template #default="scope">
            <el-tag :type="scope.row.status === 'enabled' ? 'success' : 'info'">
              {{ $t(`common.${scope.row.status}`) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column :label="$t('common.actions')" width="190" fixed="right">
          <template #default="scope">
            <RowActions>
              <el-button
                v-has-perm="permissions.update"
                type="primary"
                link
                @click="editRow(scope.row)"
              >
                {{ $t("common.edit") }}
              </el-button>
              <el-button
                v-has-perm="permissions.update"
                type="warning"
                link
                @click="toggleRowStatus(scope.row)"
              >
                {{ $t(scope.row.status === "enabled" ? "common.disabled" : "common.enabled") }}
              </el-button>
              <el-button
                v-has-perm="permissions.delete"
                type="danger"
                link
                @click="deleteRow(scope.row)"
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
        @pagination="refreshRows"
      />
    </SectionCard>
  </PageShell>
</template>

<script setup lang="ts" generic="T extends ResourceTableRecord">
import { useResourcePagination } from "@/views/resources/useResourcePagination";
import { computed, ref, watch } from "vue";
import { useDebounceFn } from "@vueuse/core";
import DataTable from "@/components/DataTable/index.vue";
import FilterBar from "@/components/FilterBar/index.vue";
import PageShell from "@/components/PageShell/index.vue";
import Pagination from "@/components/Pagination/index.vue";
import RowActions from "@/components/RowActions/index.vue";
import SectionCard from "@/components/SectionCard/index.vue";
import TableToolbar from "@/components/TableToolbar/index.vue";
import type { ResourcePermissionSet } from "@/constants";
import type { ResourceListQuery } from "@/types/resource";
import type { ResourceColumn, ResourceTableRecord } from "../types";

const props = defineProps<{
  loading?: boolean;
  rows: T[];
  total: number;
  columns: ResourceColumn[];
  permissions: ResourcePermissionSet;
  filters?: ResourceListQuery;
  searchPlaceholderKey?: string;
  /** 列表加载失败信息 */
  error?: string;
}>();

const emit = defineEmits<{
  refresh: [query: ResourceListQuery];
  "query-change": [query: ResourceListQuery];
  create: [];
  edit: [row: T];
  delete: [row: T];
  "toggle-status": [row: T];
  "reset-query": [];
}>();

const keywords = ref("");
const { pageNum, pageSize, paginationQuery } = useResourcePagination();
const requestRows = useDebounceFn(() => emit("query-change", currentQuery()), 300);
const hasActiveFilters = computed(
  () =>
    Boolean(keywords.value) ||
    Object.values(props.filters ?? {}).some((value) => value !== undefined && value !== ""),
);

watch(keywords, () => {
  pageNum.value = 1;
  requestRows();
});

watch(
  () => props.filters,
  () => {
    pageNum.value = 1;
    requestRows();
  },
  { deep: true },
);

function currentQuery(): ResourceListQuery {
  return { ...paginationQuery(), keyword: keywords.value, ...props.filters };
}

function resetQuery() {
  keywords.value = "";
  pageNum.value = 1;
  emit("reset-query");
  requestRows();
}

function refreshRows() {
  emit("refresh", currentQuery());
}

function editRow(row: T) {
  emit("edit", row);
}

function toggleRowStatus(row: T) {
  emit("toggle-status", row);
}

function deleteRow(row: T) {
  emit("delete", row);
}
</script>
