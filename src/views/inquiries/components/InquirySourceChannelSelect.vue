<template>
  <el-select v-model="channel" autocomplete="new-password" value-on-clear="">
    <el-option
      v-for="option in INQUIRY_SOURCE_CHANNEL_OPTIONS"
      :key="option.value"
      :label="$t(option.labelKey)"
      :value="option.value"
    />
  </el-select>
</template>

<script setup lang="ts">
import { INQUIRY_SOURCE_CHANNEL_OPTIONS } from "../options";

const channel = defineModel<string>({ required: true });
</script>
