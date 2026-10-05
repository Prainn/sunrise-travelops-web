<template>
  <el-drawer
    :model-value="modelValue"
    :title="`${record?.code ?? ''} 询盘日志`"
    size="min(700px, 94vw)"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <el-alert v-if="error" :title="error" type="error" :closable="false" />
    <el-table v-loading="loading" :data="rows">
      <el-table-column prop="occurredAt" label="时间" width="180" />
      <el-table-column prop="actorName" label="操作人" width="100" />
      <el-table-column prop="action" label="操作" width="140" />
      <el-table-column prop="detail" label="详情" />
    </el-table>
    <el-pagination
      v-model:current-page="page"
      class="mt-4"
      :page-size="20"
      :total="total"
      layout="prev, pager, next, total"
      @current-change="load"
    />
  </el-drawer>
</template>
<script setup lang="ts">
import { ref, watch } from "vue";
import { websiteErrorMessage, websiteService } from "@/services/website.service";
import type { WebsiteInquiry, WebsiteLog } from "@/types/website";
const props = defineProps<{ modelValue: boolean; record?: WebsiteInquiry }>();
const emit = defineEmits<{ "update:modelValue": [value: boolean] }>();
const rows = ref<WebsiteLog[]>([]);
const total = ref(0);
const page = ref(1);
const loading = ref(false);
const error = ref("");
let generation = 0;
async function load() {
  if (!props.record) return;
  const current = ++generation;
  loading.value = true;
  error.value = "";
  try {
    const result = await websiteService.logs(props.record.id, page.value, 20);
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
