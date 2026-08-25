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
      <div class="page-toolbar">
        <div class="page-toolbar__left">
          <el-button
            type="primary"
            @click="emit('create')"
          >
            {{ $t("common.create") }}
          </el-button>
        </div>
      </div>
      <div class="page-table-wrapper">
        <el-table
          :data="pagedRows"
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
                type="primary"
                link
                @click="editRow(scope.row)"
              >
                {{ $t("common.edit") }}
              </el-button>
              <el-button
                type="warning"
                link
                @click="toggleRowStatus(scope.row)"
              >
                {{ $t(scope.row.status === "enabled" ? "common.disabled" : "common.enabled") }}
              </el-button>
              <el-button
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
        v-if="filteredRows.length"
        v-model:page="pageNum"
        v-model:limit="pageSize"
        :total="total"
      />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import type { ResourceColumn, ResourceRow } from "../types";

const props = defineProps<{
  rows: ResourceRow[];
  columns: ResourceColumn[];
  searchFields: string[];
}>();

const emit = defineEmits<{
  create: [];
  edit: [row: ResourceRow];
  delete: [row: ResourceRow];
  "toggle-status": [row: ResourceRow];
}>();

const keywords = ref("");
const pageNum = ref(1);
const pageSize = ref(10);
const filteredRows = computed(() => {
  const value = keywords.value.toLowerCase();
  if (!value) return props.rows;
  return props.rows.filter((row) => props.searchFields.some((field) => String(row[field] ?? "").toLowerCase().includes(value)));
});
const total = computed(() => filteredRows.value.length);
const pagedRows = computed(() => filteredRows.value.slice((pageNum.value - 1) * pageSize.value, pageNum.value * pageSize.value));

function resetQuery() {
  keywords.value = "";
  pageNum.value = 1;
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
