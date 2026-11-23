<template>
  <el-select
    :model-value="modelValue"
    autocomplete="new-password"
    filterable
    :allow-create="!limitToExtraOptions"
    default-first-option
    clearable
    :loading="loading"
    :maxlength="100"
    @visible-change="value => { if (value) loadItems(); }"
    @update:model-value="select"
  >
    <el-option
      v-for="item in options"
      :key="item.value"
      :value="item.value"
      :label="item.label"
      :disabled="item.disabled"
    />
  </el-select>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { ElMessage } from "element-plus";
import { useI18n } from "vue-i18n";
import { businessDictionaryService } from "@/services/business-dictionary.service";
import type { BusinessCategoryOptionRecord } from "@/types/resource";

type SelectOption = { value: string; label: string; code?: string; disabled?: boolean };

const props = withDefaults(defineProps<{
  modelValue: string | null | undefined;
  typeCode: "guide-language" | "vehicle-type";
  extraOptions?: { value: string; label: string }[];
  limitToExtraOptions?: boolean;
  disabledValues?: string[];
  sortBySeatCount?: boolean;
}>(), { extraOptions: () => [], disabledValues: () => [] });
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
  const result: SelectOption[] = items.value.flatMap(item => {
    // Route option values bind each vehicle to its configured duration.
    const routeOption = props.extraOptions.find(option => matches(item, option.value));
    if (props.limitToExtraOptions && !routeOption) return [];
    const value = routeOption?.value ?? (current && matches(item, current) ? current : item.name);
    const label = locale.value.toLowerCase().startsWith("en") ? item.englishName : item.name;
    return [{ value, label, code: item.code, disabled: isDisabled(value, item) }];
  });
  for (const item of props.extraOptions) {
    if (!result.some(option => option.value === item.value)) {
      result.push({ ...item, disabled: isDisabled(item.value) });
    }
  }
  if (!props.limitToExtraOptions) {
    if (current && !result.some(item => item.value === current)) {
      result.push({ value: current, label: current, disabled: isDisabled(current) });
    }
    for (const value of props.disabledValues) {
      if (!items.value.some(item => matches(item, value)) && !result.some(item => item.value === value)) {
        result.push({ value, label: value, disabled: true });
      }
    }
  }
  if (props.sortBySeatCount) {
    result.sort((a, b) => {
      const seatsA = getSeatCount(a);
      const seatsB = getSeatCount(b);
      return seatsA === seatsB ? 0 : seatsA - seatsB;
    });
  }
  return result;
});
function isDisabled(value: string, item?: BusinessCategoryOptionRecord) {
  if (!props.disabledValues.length) return false;
  const entry = item ?? items.value.find(option => matches(option, value));
  return props.disabledValues.some(disabled => disabled === value || (entry && matches(entry, disabled)));
}
function select(value: string | undefined) {
  if (value && props.limitToExtraOptions && !props.extraOptions.some(option => option.value === value)) return;
  if (value && isDisabled(value.trim())) return;
  emit("update:modelValue", value || "");
}
function getSeatCount(option: SelectOption) {
  const seatLabel = /(\d+)[\s_-]*(?:座|seat(?:er)?s?\b)/i;
  const count = seatLabel.exec(option.label)?.[1]
    ?? seatLabel.exec(option.value)?.[1]
    ?? /^seat(\d+)$/i.exec(option.code ?? option.value)?.[1];
  return count === undefined ? Number.POSITIVE_INFINITY : Number(count);
}
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
