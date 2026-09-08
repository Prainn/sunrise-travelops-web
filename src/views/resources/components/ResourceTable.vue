<template>
  <div class="page-container">
    <el-card
      class="page-search"
      shadow="never"
    >
      <el-form :inline="true">
        <el-form-item :label="$t('common.keywords')">
          <el-input
            v-model.trim="keywords"
            :placeholder="$t('resource.searchPlaceholder')"
            class="page-search__keywords"
            clearable
          />
        </el-form-item>
        <el-form-item>
          <el-button @click="resetQuery">
            {{ $t("common.reset") }}
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card
      class="page-content"
      shadow="never"
    >
      <TableToolbar @refresh="refreshRows">
        <el-button
          v-has-perm="permissions.create"
          type="primary"
          @click="emit('create')"
        >
          {{ $t("common.create") }}
        </el-button>
      </TableToolbar>
      <div class="page-table-wrapper">
        <el-table
          :data="rows"
          border
          height="100%"
        >
          <el-table-column
            v-for="column in columns"
            :key="column.prop"
            :prop="column.prop"
            :label="$t(column.labelKey)"
            :min-width="column.minWidth ?? 120"
          />
          <el-table-column
            :label="$t('common.status')"
            width="100"
            align="center"
          >
            <template #default="scope">
              <el-tag :type="scope.row.status === 'enabled' ? 'success' : 'info'">
                {{ $t(`common.${scope.row.status}`) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column
            :label="$t('common.actions')"
            width="220"
            align="center"
            fixed="right"
          >
            <template #default="scope">
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
import TableToolbar from "@/components/TableToolbar/index.vue";
import type { ResourcePermissionSet } from "@/constants";
import type { ResourceListQuery } from "@/types/resource";
import type { ResourceColumn, ResourceRow } from "../types";

defineProps<{
  rows: ResourceRow[];
  total: number;
  columns: ResourceColumn[];
  permissions: ResourcePermissionSet;
}>();

const emit = defineEmits<{
  refresh: [query: ResourceListQuery];
  "query-change": [query: ResourceListQuery];
  create: [];
  edit: [row: ResourceRow];
  delete: [row: ResourceRow];
  "toggle-status": [row: ResourceRow];
}>();

const keywords = ref("");
const { pageNum, pageSize, paginationQuery } = useResourcePagination();
const requestRows = useDebounceFn(() => emit("query-change", currentQuery()), 300);

watch(keywords, () => {
  pageNum.value = 1;
  requestRows();
});

function currentQuery(): ResourceListQuery {
  return { ...paginationQuery(), keyword: keywords.value };
}

function resetQuery() {
  keywords.value = "";
  pageNum.value = 1;
}

function refreshRows() {
  emit("refresh", currentQuery());
}

function editRow(row: unknown) {
  emit("edit", row as ResourceRow);
}

function toggleRowStatus(row: unknown) {
  emit("toggle-status", row as ResourceRow);
}

function deleteRow(row: unknown) {
  emit("delete", row as ResourceRow);
}
</script>
