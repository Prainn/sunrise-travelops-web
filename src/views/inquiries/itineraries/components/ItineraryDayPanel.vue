<template>
  <div
    class="itinerary-day-panel grid gap-[14px_16px] p-4 rounded-[var(--custom-radius)] surface-muted max-[900px]:[grid-template-columns:1fr]!"
    :style="{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }"
  >
    <slot />
  </div>
</template>

<script setup lang="ts">
/**
 * 每日基础信息面板：普通询盘与独立站共用的无边框浅底字段区，统一栅格、间距与标签样式。
 */
withDefaults(defineProps<{ columns?: number }>(), { columns: 3 });
</script>

<style scoped lang="scss">
.itinerary-day-panel {
  :deep(.el-form-item) {
    margin-bottom: 0;
  }

  :deep(.el-form-item__label) {
    padding-bottom: 6px;
    color: var(--el-text-color-regular);
    font-weight: 500;
    line-height: 20px;
  }

  :deep(.el-select) {
    width: 100%;
  }
}
</style>
