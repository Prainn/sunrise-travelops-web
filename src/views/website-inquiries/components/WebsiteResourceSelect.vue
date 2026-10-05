<template>
  <el-select
    :model-value="modelValue"
    filterable
    remote
    clearable
    :remote-method="search"
    :loading="loading"
    :disabled="disabled"
    placeholder="搜索共用基础资料（可不选）"
    class="w-full"
    @update:model-value="emit('update:modelValue', $event || null)"
    @change="select"
    @visible-change="
      (visible: boolean) => {
        if (visible) search('');
      }
    "
  >
    <el-option v-for="option in options" :key="option.id" :value="option.id" :label="option.name" />
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
const props = defineProps<{
  modelValue: string | null;
  kind: WebsiteResourceKind;
  disabled?: boolean;
  selectedName?: string;
}>();
const emit = defineEmits<{
  "update:modelValue": [value: string | null];
  select: [value: WebsiteResourceOption | undefined];
}>();
const options = ref<WebsiteResourceOption[]>([]);
const loading = ref(false);
let generation = 0;
async function search(keyword: string) {
  const current = ++generation;
  loading.value = true;
  try {
    const result = await websiteService.resources(props.kind, keyword);
    if (current !== generation) return;
    options.value = result.list;
    if (
      props.modelValue &&
      props.selectedName &&
      !options.value.some((row) => row.id === props.modelValue)
    )
      options.value.unshift({ id: props.modelValue, name: props.selectedName });
  } catch (error) {
    if (current === generation) ElMessage.error(websiteErrorMessage(error));
  } finally {
    if (current === generation) loading.value = false;
  }
}
function select(id: string) {
  emit(
    "select",
    options.value.find((option) => option.id === id),
  );
}
watch(
  () => [props.modelValue, props.selectedName, props.kind],
  () => {
    if (
      props.modelValue &&
      props.selectedName &&
      !options.value.some((option) => option.id === props.modelValue)
    )
      options.value.unshift({ id: props.modelValue, name: props.selectedName });
  },
  { immediate: true },
);
</script>
