<template>
  <el-select
    :model-value="modelValue"
    :disabled="disabled"
    :placeholder="placeholder"
    :clearable="clearable"
    filterable
    remote
    remote-show-suffix
    :debounce="300"
    :remote-method="search"
    :loading="loading && !items.length"
    @visible-change="open"
    @end-reached="loadNextPage"
    @update:model-value="select($event || '')"
  >
    <el-option
      v-if="modelValue && !items.some(item => item.id === modelValue)"
      :value="modelValue"
      :label="selected?.id === modelValue ? selected.label : selectedLabel || modelValue"
    />
    <el-option
      v-for="item in items"
      :key="item.id"
      :value="item.id"
      :label="item.label"
    >
      <div class="remote-select-option flex justify-between gap-[16px]">
        <span>{{ item.label }}</span>
        <strong v-if="item.description">{{ item.description }}</strong>
      </div>
    </el-option>
    <template #empty>
      <p class="el-select-dropdown__empty">
        {{ loading ? '\u00a0' : $t('remoteSelect.empty') }}
      </p>
    </template>
  </el-select>
</template>
<script setup lang="ts">
import { ref, watch } from "vue";
import { ElMessage } from "element-plus";
import { useI18n } from "vue-i18n";
import { useRemoteOptions, type RemoteOptionsPage, type RemoteOptionsQuery } from "@/composables/useRemoteOptions";
import type { RemoteSelectOption } from "./types";
const props = withDefaults(defineProps<{
  modelValue: string;
  loadOptions: (query: RemoteOptionsQuery) => Promise<RemoteOptionsPage<RemoteSelectOption>>;
  queryKey?: string;
  selectedLabel?: string;
  disabled?: boolean;
  placeholder?: string;
  clearable?: boolean;
}>(), { clearable: true, queryKey: "" });
const emit = defineEmits<{ 'update:modelValue': [value: string] }>();
const { t } = useI18n();
const visible = ref(false);
const selected = ref<RemoteSelectOption>();
const { items, loading, hasMore, search: searchOptions, loadMore, reset } = useRemoteOptions(
  query => props.loadOptions(query), () => ElMessage.error(t("request.failed")),
);
function select(value: string) {
  selected.value = items.value.find(item => item.id === value) ?? (selected.value?.id === value ? selected.value : undefined);
  emit('update:modelValue', value);
}
function search(value: string) { if (visible.value) void searchOptions(value); }
function open(value: boolean) {
  visible.value = value;
  if (value && !loading.value && !items.value.length) void searchOptions("");
  else if (!value) reset();
}
watch(() => props.queryKey, () => { reset(); if (visible.value) void searchOptions(""); });
function loadNextPage(direction: string) {
  if (direction === 'bottom' && visible.value && hasMore.value) void loadMore();
}
</script>
<style scoped>
.remote-select-option strong { color: var(--el-color-primary); font-weight: 500; }
</style>
