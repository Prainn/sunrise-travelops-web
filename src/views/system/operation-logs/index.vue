<template>
  <div class="page-container">
    <el-card class="page-search" shadow="never">
      <el-form :inline="true">
        <el-form-item :label="$t('operationLog.category')">
          <el-select
            v-model="category"
            clearable
            :placeholder="$t('operationLog.all')"
            style="width: 180px"
          >
            <el-option
              v-for="option in categories"
              :key="option.value"
              :label="$t(option.label)"
              :value="option.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="search">{{ $t("common.search") }}</el-button>
          <el-button @click="reset">{{ $t("common.reset") }}</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card class="page-content" shadow="never">
      <div class="page-table-wrapper">
        <el-table v-loading="loading" :data="list" class="page-table" border height="100%">
          <el-table-column :label="$t('operationLog.time')" min-width="190">
            <template #default="{ row }">{{ beijingTime(row.time) }}</template>
          </el-table-column>
          <el-table-column :label="$t('operationLog.category')" min-width="120">
            <template #default="{ row }">{{ categoryLabel(row.category) }}</template>
          </el-table-column>
          <el-table-column :label="$t('operationLog.actor')" prop="actorName" min-width="130" />
          <el-table-column :label="$t('operationLog.action')" prop="action" min-width="180" />
          <el-table-column :label="$t('operationLog.result')" min-width="90">
            <template #default="{ row }">{{
              row.success ? $t("operationLog.success") : $t("operationLog.failed")
            }}</template>
          </el-table-column>
          <el-table-column
            :label="$t('operationLog.detail')"
            prop="detail"
            min-width="300"
            show-overflow-tooltip
          />
        </el-table>
      </div>
      <pagination
        v-if="total > 0"
        v-model:page="page"
        v-model:limit="pageSize"
        :total="total"
        @pagination="fetchData"
      />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { operationLogService } from "@/services/operation-log.service";
import type { OperationCategory, OperationLog } from "@/types/operation-log";

const { t } = useI18n();
const categories: { value: OperationCategory; label: string }[] = [
  { value: "login", label: "operationLog.login" },
  { value: "user", label: "operationLog.user" },
  { value: "system-category", label: "operationLog.systemCategory" },
  { value: "business-category", label: "operationLog.businessCategory" },
  { value: "resource", label: "operationLog.resource" },
];
const category = ref<OperationCategory | "">("");
const page = ref(1);
const pageSize = ref(20);
const total = ref(0);
const loading = ref(false);
const list = ref<OperationLog[]>([]);

function categoryLabel(value: OperationCategory) {
  const option = categories.find((item) => item.value === value);
  return option ? t(option.label) : value;
}

function beijingTime(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

async function fetchData() {
  loading.value = true;
  try {
    const result = await operationLogService.getPage({
      page: page.value,
      pageSize: pageSize.value,
      category: category.value || undefined,
    });
    list.value = result.list;
    total.value = result.total;
  } finally {
    loading.value = false;
  }
}
function search() {
  page.value = 1;
  void fetchData();
}
function reset() {
  category.value = "";
  search();
}
onMounted(() => {
  void fetchData();
});
</script>
