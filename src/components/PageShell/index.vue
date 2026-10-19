<template>
  <div
    class="page-shell"
    :class="{
      'page-shell--flow': !fill,
      'page-shell--split': $slots.aside,
    }"
  >
    <aside
      v-if="$slots.aside"
      class="page-shell__aside"
      :style="{ '--page-shell-aside-width': asideWidth }"
    >
      <slot name="aside" />
    </aside>
    <div class="page-shell__main">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * 页面外壳：统一页面内边距、区块间距和滚动归属。
 *
 * fill 模式占满内容区高度，内部区块（通常是表格）自行滚动；flow 模式按内容自然增高，由布局内容区滚动。
 */
withDefaults(
  defineProps<{
    /** 占满可视高度，适用于筛选 + 表格页面；详情、工作台等长页面传 false */
    fill?: boolean;
    /** 侧栏宽度，任意 CSS 长度 */
    asideWidth?: string;
  }>(),
  { fill: true, asideWidth: "260px" },
);
</script>

<style lang="scss">
.page-shell {
  display: flex;
  gap: var(--page-gap);
  height: 100%;
  min-height: 0;
  padding: var(--page-padding);
  background: var(--page-bg);

  &__main {
    display: flex;
    flex: 1 1 0;
    flex-direction: column;
    gap: var(--page-gap);
    min-width: 0;
    min-height: 0;
  }

  &--flow {
    height: auto;
    min-height: 100%;
  }

  &__aside {
    display: flex;
    flex: 0 0 var(--page-shell-aside-width);
    flex-direction: column;
    width: var(--page-shell-aside-width);
    min-width: 0;
    min-height: 0;
  }
}

@media (width <= 900px) {
  .page-shell--split {
    flex-direction: column;
    height: auto;
    min-height: 100%;

    .page-shell__aside {
      flex-basis: auto;
      width: 100%;
      max-height: 50vh;
    }

    .page-shell__main {
      min-height: 70vh;
    }
  }
}
</style>
