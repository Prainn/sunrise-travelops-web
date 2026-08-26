<template>
  <el-card
    class="page-search"
    shadow="never"
  >
    <el-form :inline="true">
      <el-form-item :label="$t('common.keywords')">
        <el-input
          v-model.trim="keywords"
          :placeholder="$t('inquiry.searchPlaceholder')"
          class="page-search__keywords"
          clearable
        />
      </el-form-item>
      <el-form-item :label="$t('common.status')">
        <el-select
          v-model="status"
          clearable
        >
          <el-option
            v-for="option in statusOptions"
            :key="option.value"
            :label="$t(option.labelKey)"
            :value="option.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item :label="$t('inquiry.owner')">
        <el-select
          v-model="owner"
          clearable
        >
          <el-option
            v-for="option in ownerOptions"
            :key="option"
            :label="option"
            :value="option"
          />
        </el-select>
      </el-form-item>
      <el-form-item :label="$t('inquiry.sourceChannel')">
        <el-select
          v-model="sourceChannel"
          clearable
        >
          <el-option
            v-for="option in sourceOptions"
            :key="option"
            :label="option"
            :value="option"
          />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button @click="emit('reset')">
          {{ $t("common.reset") }}
        </el-button>
      </el-form-item>
    </el-form>
  </el-card>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { InquiryStatus } from "@/types/inquiry";
import { INQUIRY_STATUS_OPTIONS } from "../options";

const props = defineProps<{
  keywords: string;
  status: InquiryStatus | "";
  owner: string;
  sourceChannel: string;
  ownerOptions: string[];
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
const keywords = computed({ get: () => props.keywords, set: (value) => emit("update:keywords", value) });
const status = computed({ get: () => props.status, set: (value) => emit("update:status", value) });
const owner = computed({ get: () => props.owner, set: (value) => emit("update:owner", value) });
const sourceChannel = computed({ get: () => props.sourceChannel, set: (value) => emit("update:sourceChannel", value) });
</script>
