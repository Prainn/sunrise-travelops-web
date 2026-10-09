<template>
  <el-select
    :model-value="modelValue"
    :disabled="disabled"
    :loading="loading"
    :placeholder="placeholder ?? $t('common.selectPlaceholder')"
    :clearable="clearable"
    filterable
    class="w-full"
    :filter-method="filter"
    @visible-change="filter('')"
    @update:model-value="emit('update:modelValue', $event ?? '')"
  >
    <el-option
      v-for="item in visible"
      :key="item.id"
      :value="item.id"
      :label="label(item)"
    />
    <el-option
      v-if="modelValue && !items.some((item) => item.id === modelValue)"
      :value="modelValue"
      :label="selectedLabel ?? modelValue"
    />
  </el-select>
</template>
<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { ElMessage } from "element-plus";
import { useI18n } from "vue-i18n";
import { businessDictionaryService } from "@/services/business-dictionary.service";
import type { BusinessCategoryOptionRecord } from "@/types/resource";

const props = defineProps<{
  modelValue: string;
  typeCode: "country-region" | "city-airport";
  selectedLabel?: string;
  disabled?: boolean;
  clearable?: boolean;
  placeholder?: string;
}>();
const emit = defineEmits<{ "update:modelValue": [value: string] }>();
const { locale } = useI18n();
const items = ref<BusinessCategoryOptionRecord[]>([]);
const loading = ref(false);
const keyword = ref("");

function label(item: BusinessCategoryOptionRecord) {
  const name = locale.value === "en" ? item.englishName : item.name;
  return `${name} (${item.code})`;
}
const visible = computed(() => {
  const word = keyword.value.trim().toLowerCase();
  if (!word) return items.value;
  return items.value.filter((item) =>
    [item.code, item.name, item.englishName].some((text) => text.toLowerCase().includes(word)),
  );
});
function filter(value: string) {
  keyword.value = value;
}
async function load() {
  loading.value = true;
  try {
    items.value = await businessDictionaryService.getItems(props.typeCode, { status: "enabled" });
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : String(error));
  } finally {
    loading.value = false;
  }
}
onMounted(load);
watch(() => props.typeCode, load);
</script>
