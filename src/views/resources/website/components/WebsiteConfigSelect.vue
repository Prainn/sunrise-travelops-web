<template>
  <el-select
    :model-value="modelValue"
    autocomplete="new-password"
    :multiple="multiple"
    :disabled="disabled"
    :clearable="clearable"
    :value-on-clear="null"
    :empty-values="[null, undefined]"
    filterable
    remote
    remote-show-suffix
    :debounce="300"
    :remote-method="searchOptions"
    :loading="loading && !items.length"
    :loading-text="$t('remoteSelect.loading')"
    :no-match-text="$t('remoteSelect.empty')"
    @visible-change="handleVisibleChange"
    @end-reached="loadNextPage"
    @update:model-value="updateValue"
  >
    <el-option
      v-for="option in selectedOptions"
      :key="option.id"
      :value="option.value"
      :label="option.label"
    />
    <el-option
      v-for="option in items"
      :key="option.id"
      :value="option.value"
      :label="option.label"
    />
  </el-select>
</template>

<script setup lang="ts" generic="T extends string | string[] | null">
import { computed, onScopeDispose, ref, watch } from "vue";
import { ElMessage } from "element-plus";
import { useRemoteOptions } from "@/composables/useRemoteOptions";
import { websiteErrorMessage, websiteService } from "@/services/website.service";
import type { WebsiteBusinessUnit, WebsiteConfigGroup, WebsiteConfigOption } from "@/types/website";

const props = withDefaults(defineProps<{
  modelValue: T;
  group: WebsiteConfigGroup;
  version: number;
  businessUnit: WebsiteBusinessUnit;
  labels: Record<string, string>;
  cityId?: string;
  status?: "enabled" | "disabled";
  excludeId?: string;
  multiple?: boolean;
  clearable?: boolean;
  nullable?: boolean;
  disabled?: boolean;
}>(), { clearable: true });
const emit = defineEmits<{
  "update:modelValue": [value: T];
  labels: [labels: Record<string, string>];
}>();
const visible = ref(false);
const cachedLabels = ref<Record<string, string>>({});
const contextKey = computed(() => JSON.stringify([
  props.group, props.businessUnit, props.version, props.cityId, props.excludeId, props.status,
]));
let disposed = false;
onScopeDispose(() => { disposed = true; });
const { items, loading, hasMore, search: searchOptions, loadMore, reset } = useRemoteOptions<WebsiteConfigOption>(
  async (query) => {
    const context = contextKey.value;
    try {
      const result = await websiteService.configOptions(props.group, {
        ...query, version: props.version, businessUnit: props.businessUnit,
        cityId: props.cityId || undefined, excludeId: props.excludeId, status: props.status,
      });
      if (!disposed && context === contextKey.value) {
        const labels = Object.fromEntries(result.list.map((option) => [option.value, option.label]));
        Object.assign(cachedLabels.value, labels);
        emit("labels", labels);
      }
      return result;
    } catch (cause) {
      if (!disposed && context === contextKey.value) ElMessage.error(websiteErrorMessage(cause));
      throw cause;
    }
  },
  () => {},
);
const selectedOptions = computed(() => {
  const values = Array.isArray(props.modelValue) ? props.modelValue : props.modelValue ? [props.modelValue] : [];
  return values.filter((value) => !items.value.some((option) => option.value === value))
    .map((value) => ({ id: value, value, label: cachedLabels.value[value] ?? props.labels[value] ?? value }));
});
function updateValue(value: string | string[] | null | undefined) {
  emit("update:modelValue", (props.multiple ? value ?? [] : value ?? (props.nullable ? null : "")) as T);
}
function handleVisibleChange(value: boolean) {
  visible.value = value;
  if (value && !items.value.length) void searchOptions("");
}
function loadNextPage(direction: string) {
  if (direction === "bottom" && hasMore.value && !loading.value) void loadMore();
}
watch(contextKey, () => {
  cachedLabels.value = {};
  reset();
  if (visible.value) void searchOptions("");
});
</script>
