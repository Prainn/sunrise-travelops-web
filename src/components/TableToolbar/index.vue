<template>
  <div class="page-toolbar">
    <div class="page-toolbar__left">
      <slot />
    </div>
    <div class="page-toolbar__right">
      <el-tooltip
        :content="$t('common.refresh')"
        placement="top"
      >
        <el-button
          class="page-icon-btn"
          @click="emit('refresh')"
        >
          <el-icon><Refresh /></el-icon>
        </el-button>
      </el-tooltip>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Refresh } from "@element-plus/icons-vue";

const emit = defineEmits<{ refresh: [] }>();
</script>
