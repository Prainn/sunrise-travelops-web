<template>
  <el-select
    :model-value="modelValue"
    :disabled="disabled"
    :placeholder="placeholder"
    filterable
    remote
    clearable
    :remote-method="search"
    :loading="loading"
    @visible-change="open"
    @update:model-value="emit('update:modelValue', $event || '')"
  >
    <el-option
      v-if="modelValue && !items.some(item => item.id === modelValue)"
      :value="modelValue"
      :label="selectedLabel || modelValue"
    />
    <el-option
      v-for="item in items"
      :key="item.id"
      :value="item.id"
      :label="label(item)"
    />
    <template #footer>
      <Pagination
        v-model:page="page"
        v-model:limit="pageSize"
        :total="total"
        layout="prev, pager, next"
        @pagination="load"
      />
    </template>
  </el-select>
</template>
<script setup lang="ts">
import { ref, watch, onScopeDispose } from "vue";
import { useI18n } from "vue-i18n";
import { ElMessage } from "element-plus";
import { DEFAULT_PAGE_SIZE } from "@/components/Pagination/config";
import Pagination from "@/components/Pagination/index.vue";
import { resourceService } from "@/services/resource.service";
import { formatMoney } from "@/utils";
const props = defineProps<{ modelValue: string; kind: "hotels" | "transports" | "guides" | "agencies"; filters?: Record<string, string | number>; selectedLabel?: string; disabled?: boolean; placeholder?: string }>();
const emit = defineEmits<{ 'update:modelValue': [value: string] }>();
const { t } = useI18n();
type Item = Awaited<ReturnType<typeof resourceService.getSelectionOptions>>["list"][number];
const items = ref<Item[]>([]);
const page = ref(1);
const pageSize = ref(DEFAULT_PAGE_SIZE);
const total = ref(0);
const loading = ref(false);
const keyword = ref("");
let version = 0;
let visible = false;
function label(item: Item) {
  if (props.kind === "agencies") return `${item.name} (${item.code})`;
  const extra = props.kind === "hotels" ? t(item.breakfastIncluded ? "itinerary.breakfastIncluded" : "itinerary.breakfastExcluded") : props.kind === "transports" ? `${item.seats}座｜${item.city}` : "";
  return `${item.name}${extra ? `｜${extra}` : ""}｜¥${formatMoney(Number(item.unitCost))}`;
}
async function load() {
  const current = ++version;
  loading.value = true;
  try {
    const result = await resourceService.getSelectionOptions(props.kind, { ...props.filters, keyword: keyword.value, page: page.value, pageSize: pageSize.value });
    if (current === version) { items.value = result.list; total.value = result.total; }
  } catch { if (current === version) { items.value = []; total.value = 0; ElMessage.error(t("request.failed")); } }
  finally { if (current === version) loading.value = false; }
}
function search(value: string) { keyword.value = value; page.value = 1; void load(); }
function open(value: boolean) { visible = value; if (value) search(""); }
watch(() => props.filters, () => { ++version; items.value = []; page.value = 1; if (visible) void load(); }, { deep: true });
onScopeDispose(() => { ++version; });
</script>
