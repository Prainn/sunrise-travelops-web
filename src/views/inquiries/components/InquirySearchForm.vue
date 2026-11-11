<template>
  <FilterBar @reset="emit('reset')">
    <el-form-item :label="$t('common.keywords')" class="filter-bar__wide">
      <el-input
        v-model.trim="keywords"
        :placeholder="$t('inquiry.searchPlaceholder')"
        clearable
      />
    </el-form-item>
    <el-form-item :label="$t('common.status')">
      <el-select v-model="status" autocomplete="new-password" clearable>
        <el-option
          v-for="option in statusOptions"
          :key="option.value"
          :label="$t(option.labelKey)"
          :value="option.value"
        />
      </el-select>
    </el-form-item>
    <el-form-item :label="$t('inquiry.owner')">
      <el-select v-model="owner" autocomplete="new-password" clearable>
        <el-option
          v-for="option in ownerOptions"
          :key="option.id"
          :label="option.name"
          :value="option.id"
        />
      </el-select>
    </el-form-item>
    <el-form-item :label="$t('inquiry.sourceChannel')">
      <el-select v-model="sourceChannel" autocomplete="new-password" clearable>
        <el-option
          v-for="option in sourceOptions"
          :key="option"
          :label="option"
          :value="option"
        />
      </el-select>
    </el-form-item>
  </FilterBar>
</template>

<script setup lang="ts">
import FilterBar from "@/components/FilterBar/index.vue";
import { computed } from "vue";
import type { InquiryStatus } from "@/types/inquiry";
import { INQUIRY_STATUS_OPTIONS } from "../options";

const props = defineProps<{
  keywords: string;
  status: InquiryStatus | "";
  owner: string;
  sourceChannel: string;
  ownerOptions: import("@/services/inquiry.service").PersonOption[];
  sourceOptions: string[];
}>();
const emit = defineEmits<{
  "update:keywords": [value: string];
  "update:status": [value: InquiryStatus | ""];
  "update:owner": [value: string];
  "update:sourceChannel": [value: string];
  reset: [];
}>();

const statusOptions = INQUIRY_STATUS_OPTIONS;
const keywords = computed({
  get: () => props.keywords,
  set: (value) => emit("update:keywords", value),
});
const status = computed({ get: () => props.status, set: (value) => emit("update:status", value) });
const owner = computed({ get: () => props.owner, set: (value) => emit("update:owner", value) });
const sourceChannel = computed({
  get: () => props.sourceChannel,
  set: (value) => emit("update:sourceChannel", value),
});
</script>
