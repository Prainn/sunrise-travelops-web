<template>
  <FilterBar @reset="$emit('reset')">
    <el-form-item :label="$t('common.keywords')" class="filter-bar__wide">
      <el-input
        v-model="keyword"
        clearable
        :placeholder="placeholder"
      />
    </el-form-item>
    <el-form-item :label="$t('common.status')">
      <el-select
        v-model="status"
        autocomplete="new-password"
        clearable
        :placeholder="$t('common.all')"
      >
        <el-option :label="$t('common.normal')" value="enabled" />
        <el-option :label="$t('common.disabled')" value="disabled" />
      </el-select>
    </el-form-item>
  </FilterBar>
</template>

<script setup lang="ts">
import FilterBar from "@/components/FilterBar/index.vue";

defineProps<{ placeholder: string }>();
defineEmits<{ reset: [] }>();
const keyword = defineModel<string>("keyword", { default: "" });
const status = defineModel<string>("status", { default: "" });
</script>
