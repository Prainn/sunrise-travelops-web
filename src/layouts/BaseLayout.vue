<template>
  <div
    class="layout-root"
    :class="layoutClass"
  >
    <div
      v-if="showOverlay && isMobile && isSidebarOpen"
      class="layout-root__overlay"
      @click="closeSidebar"
    />

    <slot />
  </div>
</template>

<script setup lang="ts">
import { useLayout } from "./composables/useLayout";

withDefaults(
  defineProps<{
    /** 移动端展开侧边栏时是否显示遮罩层（LeftLayout 需要，MixLayout 不需要） */
    showOverlay?: boolean;
  }>(),
  {
    showOverlay: true,
  }
);

const { layoutClass, isSidebarOpen, isMobile, closeSidebar } = useLayout();
</script>

<style lang="scss" scoped>
.layout-root {
  @apply 'w-full h-full';

  &__overlay {
    @apply 'fixed top-0 left-0 z-[999] w-full h-full';
    background-color: rgba(0, 0, 0, 0.3);
  }
}
</style>
