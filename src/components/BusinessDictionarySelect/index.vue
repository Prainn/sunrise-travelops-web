<template>
  <el-select
    :model-value="modelValue"
    autocomplete="new-password"
    filterable
    allow-create
    default-first-option
    clearable
    :loading="loading"
    :maxlength="100"
    @visible-change="value => { if (value) loadItems(); }"
    @update:model-value="emit('update:modelValue', $event || '')"
  >
    <el-option
      v-for="item in options"
      :key="item.value"
      :value="item.value"
      :label="item.label"
    />
  </el-select>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { ElMessage } from "element-plus";
import { useI18n } from "vue-i18n";
import { businessDictionaryService } from "@/services/business-dictionary.service";
import type { BusinessCategoryOptionRecord } from "@/types/resource";

const props = withDefaults(defineProps<{
  modelValue: string | null | undefined;
  typeCode: "guide-language" | "vehicle-type";
  extraOptions?: { value: string; label: string }[];
}>(), { extraOptions: () => [] });
const emit = defineEmits<{ "update:modelValue": [value: string] }>();
const { locale, t } = useI18n();
const items = ref<BusinessCategoryOptionRecord[]>([]);
const loading = ref(false);
function matches(item: BusinessCategoryOptionRecord, value: string) {
  if ([item.code, item.name, item.englishName].includes(value)) return true;
  const fixedSeats = props.typeCode === "vehicle-type" ? /^(5|7|9|14|18)_seat$/.exec(value)?.[1] : undefined;
  return Boolean(fixedSeats && item.code === `seat${fixedSeats}`);
}
const options = computed(() => {
  const current = props.modelValue;
  const result = items.value.map(item => {
    // Route option values bind each vehicle to its configured duration.
    const routeOption = props.extraOptions.find(option => matches(item, option.value));
    const value = routeOption?.value ?? (current && matches(item, current) ? current : item.name);
    return { value, label: locale.value.toLowerCase().startsWith("en") ? item.englishName : item.name };
  });
  for (const item of props.extraOptions) {
    if (!result.some(option => option.value === item.value)) result.push(item);
  }
  if (current && !result.some(item => item.value === current)) {
    result.push({ value: current, label: current });
  }
  return result;
});
async function loadItems() {
  if (loading.value) return;
  loading.value = true;
  try {
    items.value = await businessDictionaryService.getItems(props.typeCode, { status: "enabled" });
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : t("request.failed"));
  } finally {
    loading.value = false;
  }
}
onMounted(loadItems);
</script>
