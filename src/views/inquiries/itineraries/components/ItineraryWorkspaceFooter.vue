<template>
  <SectionCard
    padding="compact"
    class="[box-shadow:var(--el-box-shadow-light)]"
    body-class="flex flex-wrap justify-between items-center gap-3 min-h-[40px]"
  >
    <span class="text-sm text-muted">
      <slot name="summary" />
    </span>
    <div class="flex flex-wrap gap-3">
      <slot />
    </div>
  </SectionCard>
</template>

<script setup lang="ts">
import SectionCard from "@/components/SectionCard/index.vue";

/**
 * 行程工作区底部操作条：普通询盘与独立站共用，左侧摘要、右侧整程操作按钮。
 */
</script>
