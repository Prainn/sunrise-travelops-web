<!-- 文档文件卡片：图标、原文件名与可读大小；草稿、待发送和已发送气泡共用 -->
<template>
  <div class="flex items-center gap-[8px] min-w-0 max-w-[320px]">
    <svg
      class="shrink-0 text-[var(--el-color-primary)]"
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.5"
      stroke-linejoin="round"
      aria-hidden="true"
    ><path d="M14 3H6v18h12V7l-4-4Z" /><path d="M14 3v4h4M9 12h6M9 16h6" /></svg>
    <div class="flex-1 min-w-0">
      <div class="text-[13px] text-strong truncate" :title="fileName">
        {{ fileName }}
      </div>
      <div class="text-[11px] text-muted">
        {{ formatFileSize(sizeBytes) }}
      </div>
    </div>
    <slot />
  </div>
</template>

<script setup lang="ts">
import { formatFileSize } from "@/utils";

defineProps<{ fileName: string; sizeBytes: number }>();
</script>
