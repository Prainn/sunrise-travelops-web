<template>
  <el-card
    class="page-search"
    shadow="never"
  >
    <el-form :inline="true">
      <el-form-item :label="$t('common.keywords')">
        <el-input
          v-model="keyword"
          class="page-search__keywords"
          clearable
          :placeholder="placeholder"
        />
      </el-form-item>
      <el-form-item :label="$t('common.status')">
        <el-select
          v-model="status"
          clearable
          :placeholder="$t('common.all')"
        >
          <el-option
            :label="$t('common.normal')"
            value="enabled"
          />
          <el-option
            :label="$t('common.disabled')"
            value="disabled"
          />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button @click="$emit('reset')">
          {{ $t("common.reset") }}
        </el-button>
      </el-form-item>
    </el-form>
  </el-card>
</template>

<script setup lang="ts">
defineProps<{ placeholder: string }>();
defineEmits<{ reset: [] }>();
const keyword = defineModel<string>("keyword", { default: "" });
const status = defineModel<string>("status", { default: "" });
</script>
