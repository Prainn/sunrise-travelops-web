<template>
  <el-select
    autocomplete="new-password"
    :model-value="modelValue"
    filterable
    remote
    clearable
    :remote-method="search"
    :loading="loading && !options.length"
    :disabled="disabled"
    :placeholder="placeholder || $t('websiteInquiry.searchSharedResources')"
    class="w-full"
    @update:model-value="emit('update:modelValue', $event || null)"
    @change="select"
    @end-reached="loadNextPage"
    @visible-change="handleVisibleChange"
  >
    <el-option
      v-for="option in displayedOptions"
      :key="option.id"
      :value="option.id"
      :label="option.name"
    >
      <div class="flex justify-between gap-4">
        <span>{{ option.name }}</span>
        <small v-if="option.city" class="text-muted">{{ option.city }}</small>
      </div>
    </el-option>
    <template #empty>
      <p class="el-select-dropdown__empty">
        {{ loading ? $t("remoteSelect.loading") : $t("remoteSelect.empty") }}
      </p>
    </template>
  </el-select>
</template>
<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from "vue";
import { ElMessage } from "element-plus";
import {
  websiteErrorMessage,
  websiteService,
  type WebsiteResourceKind,
  type WebsiteResourceOption,
} from "@/services/website.service";

const PAGE_SIZE = 20;
const props = defineProps<{
  modelValue: string | null;
  kind: WebsiteResourceKind;
  disabled?: boolean;
  selectedName?: string;
  placeholder?: string;
}>();
const emit = defineEmits<{
  "update:modelValue": [value: string | null];
  select: [value: WebsiteResourceOption | undefined];
}>();
const options = ref<WebsiteResourceOption[]>([]);
const loading = ref(false);
const keyword = ref("");
const page = ref(0);
const total = ref(0);
const visible = ref(false);
const failed = ref(false);
let requested = false;
let generation = 0;
const displayedOptions = computed(() => {
  if (
    props.modelValue &&
    props.selectedName &&
    !options.value.some((option) => option.id === props.modelValue)
  )
    return [{ id: props.modelValue, name: props.selectedName }, ...options.value];
  return options.value;
});

watch(() => props.kind, () => {
  ++generation;
  requested = false;
  options.value = [];
  loading.value = false;
  failed.value = false;
  keyword.value = "";
  page.value = 0;
  total.value = 0;
  if (visible.value) void search("");
});
onBeforeUnmount(() => { ++generation; });

function handleVisibleChange(value: boolean) {
  visible.value = value;
  if (!value) return;
  // empty 插槽使加载/空结果不会改变下拉可见性；失败仅在用户重新打开时重试。
  if (failed.value) requested = false;
  void search("");
}

async function search(value: string) {
  if (!visible.value) return;
  const normalized = value.trim();
  if (normalized === keyword.value && requested) return;
  requested = true;
  const current = ++generation;
  keyword.value = normalized;
  failed.value = false;
  page.value = 0;
  total.value = 0;
  options.value = [];
  await fetchPage(current);
}
async function loadNextPage(direction: string) {
  if (
    direction !== "bottom" || !visible.value || loading.value || failed.value ||
    page.value === 0 || options.value.length >= total.value
  )
    return;
  await fetchPage(generation);
}
async function fetchPage(current: number) {
  loading.value = true;
  try {
    const result = await websiteService.resources(props.kind, {
      page: page.value + 1,
      pageSize: PAGE_SIZE,
      keyword: keyword.value,
    });
    if (current !== generation) return;
    page.value += 1;
    const loaded = new Map([...options.value, ...result.list].map((row) => [row.id, row]));
    options.value = [...loaded.values()];
    total.value = result.list.length ? result.total : options.value.length;
  } catch (error) {
    if (current === generation) {
      failed.value = true;
      ElMessage.error(websiteErrorMessage(error));
    }
  } finally {
    if (current === generation) loading.value = false;
  }
}
function select(id: string) {
  emit(
    "select",
    displayedOptions.value.find((option) => option.id === id),
  );
}
</script>
