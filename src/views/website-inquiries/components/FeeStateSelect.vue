<template>
  <el-select
    :model-value="modelValue"
    class="w-full"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <el-option
      v-for="option in FEE_OPTIONS"
      :key="option.value"
      :value="option.value"
      :label="option.label"
    />
  </el-select>
</template>
<script setup lang="ts">
import type { FeeState } from "@/types/website";
import { FEE_OPTIONS } from "../options";
defineProps<{ modelValue: FeeState }>();
const emit = defineEmits<{ "update:modelValue": [value: FeeState] }>();
</script>
