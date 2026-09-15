<template>
  <el-select
    :model-value="modelValue"
    filterable
    clearable
    @update:model-value="emit('update:modelValue', $event)"
  >
    <el-option
      v-for="city in cityOptions"
      :key="city"
      :label="city"
      :value="city"
      :disabled="city === disabledCity"
    />
  </el-select>
</template>
<script setup lang="ts">
import { useCityOptions } from "@/composables/useCityOptions";
import type { ResourceLibrary } from "@/types/auth";
const props = defineProps<{ modelValue: string; disabledCity?: string; library?: ResourceLibrary }>();
const emit = defineEmits<{ "update:modelValue": [value: string] }>();
const cityOptions = useCityOptions(() => props.library);
</script>
