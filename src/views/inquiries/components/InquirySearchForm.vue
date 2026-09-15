<template>
  <el-card
    class="page-search"
    shadow="never"
  >
    <el-form :inline="true">
      <el-form-item
        v-if="userStore.userInfo.scope === 'headquarters'"
        :label="$t('identity.businessUnit')"
      >
        <el-select
          v-model="businessUnit"
          class="!w-[180px]"
        >
          <el-option
            value=""
            :label="$t('identity.allBusinesses')"
          />
          <el-option
            v-for="unit in ['shengxu', 'linxi', 'website']"
            :key="unit"
            :value="unit"
            :label="$t(`identity.scopes.${unit}`)"
          />
        </el-select>
      </el-form-item>
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
            :key="option.id"
            :label="option.name"
            :value="option.id"
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
import { useUserStore } from "@/stores/user";
import type { InquiryRecord } from "@/types/inquiry";
const userStore = useUserStore();
import type { InquiryStatus } from "@/types/inquiry";
import { INQUIRY_STATUS_OPTIONS } from "../options";

const props = defineProps<{
  businessUnit: NonNullable<InquiryRecord["businessUnit"]> | "";
  keywords: string;
  status: InquiryStatus | "";
  owner: string;
  sourceChannel: string;
  ownerOptions: import("@/services/inquiry.service").PersonOption[];
  sourceOptions: string[];
}>();
const emit = defineEmits<{
  "update:businessUnit": [value: NonNullable<InquiryRecord["businessUnit"]> | ""];
  "update:keywords": [value: string];
  "update:status": [value: InquiryStatus | ""];
  "update:owner": [value: string];
  "update:sourceChannel": [value: string];
  reset: [];
}>();

const statusOptions = INQUIRY_STATUS_OPTIONS;
const businessUnit = computed({ get: () => props.businessUnit, set: (value) => emit("update:businessUnit", value) });
const keywords = computed({ get: () => props.keywords, set: (value) => emit("update:keywords", value) });
const status = computed({ get: () => props.status, set: (value) => emit("update:status", value) });
const owner = computed({ get: () => props.owner, set: (value) => emit("update:owner", value) });
const sourceChannel = computed({ get: () => props.sourceChannel, set: (value) => emit("update:sourceChannel", value) });
</script>
