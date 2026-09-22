<template>
  <Teleport to="body">
    <section
      ref="panel"
      :aria-label="$t('inquiry.originalMessage')"
      class="fixed flex flex-col overflow-hidden rounded-lg border border-solid border-[var(--el-border-color)] bg-[var(--el-bg-color)] shadow-lg text-[var(--el-text-color-primary)]"
      :style="{
        left: `${x}px`,
        top: `${y}px`,
        width: `${width}px`,
        height: `${height}px`,
        zIndex: 'var(--el-index-popper)',
      }"
    >
      <div
        ref="handle"
        class="flex shrink-0 touch-none cursor-move select-none items-center justify-between gap-2 border-0 border-b border-solid border-[var(--el-border-color-lighter)] px-3 py-2"
      >
        <span class="text-xs">{{ $t("inquiry.originalMessage") }}</span>
        <el-button size="small" :aria-expanded="isExpanded" @click="isExpanded = !isExpanded">
          {{ $t(isExpanded ? "inquiry.collapseDocument" : "inquiry.expandDocument") }}
        </el-button>
      </div>
      <div
        v-if="isExpanded"
        class="min-h-0 flex-1 overflow-auto whitespace-pre-wrap break-words p-4 text-sm leading-relaxed"
        tabindex="0"
      >
        {{ text }}
      </div>
      <button
        v-else
        type="button"
        :aria-label="$t('inquiry.expandDocument')"
        class="min-h-0 flex-1 cursor-zoom-in overflow-hidden border-0 bg-[var(--el-fill-color-light)] p-3 text-left text-inherit"
        @click="isExpanded = true"
      >
        <div
          class="h-full overflow-hidden whitespace-pre-wrap break-words rounded bg-[var(--el-bg-color)] p-2 text-[7px] leading-[10px]"
          aria-hidden="true"
        >
          {{ text.slice(0, 1800) }}
        </div>
      </button>
    </section>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useDraggable, useWindowSize } from "@vueuse/core";

defineProps<{ text: string }>();
const panel = ref<HTMLElement>();
const handle = ref<HTMLElement>();
const isExpanded = ref(false);
const { width: viewportWidth, height: viewportHeight } = useWindowSize();
const width = computed(() => Math.min(isExpanded.value ? 520 : 210, viewportWidth.value - 16));
const height = computed(() => Math.min(isExpanded.value ? 600 : 240, viewportHeight.value - 32));
const { x, y } = useDraggable(panel, {
  handle,
  initialValue: { x: Math.max(8, window.innerWidth - 234), y: 160 },
  preventDefault: true,
  onStart(_position, event) {
    if ((event.target as HTMLElement).closest("button")) return false;
  },
  onMove(position) {
    position.x = Math.max(8, Math.min(position.x, viewportWidth.value - width.value - 8));
    position.y = Math.max(8, Math.min(position.y, viewportHeight.value - height.value - 8));
  },
});
watch(
  [width, height],
  () => {
    x.value = Math.max(8, Math.min(x.value, viewportWidth.value - width.value - 8));
    y.value = Math.max(8, Math.min(y.value, viewportHeight.value - height.value - 8));
  },
  { immediate: true },
);
</script>
