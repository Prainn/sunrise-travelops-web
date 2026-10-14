<template>
  <el-drawer
    :model-value="modelValue"
    :title="$t('websiteInquiry.historyTitle', { code: record?.code ?? '' })"
    size="min(700px, 94vw)"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <el-alert
      v-if="error"
      :title="error"
      type="error"
      :closable="false"
    />
    <el-table
      v-loading="loading"
      :data="rows"
      border
      row-key="id"
    >
      <el-table-column :label="$t('websiteInquiry.time')" width="210">
        <template #default="{ row }">
          {{ formatDateTime(row.occurredAt) }}
        </template>
      </el-table-column>
      <el-table-column prop="actorName" :label="$t('websiteInquiry.actor')" width="100" />
      <el-table-column prop="action" :label="$t('common.actions')" width="140" />
      <el-table-column prop="detail" :label="$t('websiteInquiry.details')" />
    </el-table>
    <Pagination
      v-if="total"
      v-model:page="page"
      v-model:limit="pageSize"
      :total="total"
      @pagination="load"
    />
  </el-drawer>
</template>
<script setup lang="ts">
import { ref, watch } from "vue";
import Pagination from "@/components/Pagination/index.vue";
import { formatDateTime } from "@/utils";
import { websiteErrorMessage, websiteService } from "@/services/website.service";
import type { WebsiteInquiry, WebsiteLog } from "@/types/website";
const props = defineProps<{ modelValue: boolean; record?: WebsiteInquiry }>();
const emit = defineEmits<{ "update:modelValue": [value: boolean] }>();
const rows = ref<WebsiteLog[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(20);
const loading = ref(false);
const error = ref("");
let generation = 0;
async function load() {
  if (!props.record) return;
  const current = ++generation;
  loading.value = true;
  error.value = "";
  try {
    const result = await websiteService.logs(props.record.id, page.value, pageSize.value);
    if (current === generation) {
      rows.value = result.list;
      total.value = result.total;
    }
  } catch (cause) {
    if (current === generation) error.value = websiteErrorMessage(cause);
  } finally {
    if (current === generation) loading.value = false;
  }
}
watch(
  () => props.modelValue,
  (visible) => {
    if (visible) {
      rows.value = [];
      page.value = 1;
      void load();
    } else generation++;
  },
);
</script>
