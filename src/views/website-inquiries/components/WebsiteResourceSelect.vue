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
    @visible-change="
      (visible: boolean) => {
        if (visible) search('');
      }
    "
  >
    <el-option
      v-for="option in options"
      :key="option.id"
      :value="option.id"
      :label="option.name"
    >
      <div class="flex justify-between gap-4">
        <span>{{ option.name }}</span>
        <small v-if="option.city" class="text-muted">{{ option.city }}</small>
      </div>
    </el-option>
  </el-select>
</template>
<script setup lang="ts">
import { ref, watch } from "vue";
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
let generation = 0;

/** 关键词变化从第一页重新查询；下拉滚动到底部再按页追加，不把第一页当作完整集合。 */
async function search(value: string) {
  const current = ++generation;
  keyword.value = value.trim();
  page.value = 0;
  total.value = 0;
  options.value = [];
  await fetchPage(current);
}
async function loadNextPage(direction: string) {
  if (direction !== "bottom" || loading.value || page.value === 0 || options.value.length >= total.value)
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
    total.value = result.total;
    const loaded = new Map([...options.value, ...result.list].map((row) => [row.id, row]));
    options.value = [...loaded.values()];
    keepSelectedOption();
  } catch (error) {
    if (current === generation) ElMessage.error(websiteErrorMessage(error));
  } finally {
    if (current === generation) loading.value = false;
  }
}
function keepSelectedOption() {
  if (
    props.modelValue &&
    props.selectedName &&
    !options.value.some((option) => option.id === props.modelValue)
  )
    options.value.unshift({ id: props.modelValue, name: props.selectedName });
}
function select(id: string) {
  emit(
    "select",
    options.value.find((option) => option.id === id),
  );
}
watch(() => [props.modelValue, props.selectedName, props.kind], keepSelectedOption, { immediate: true });
</script>
