<template>
  <section
    class="section-card"
    :class="{
      'section-card--fill': fill,
      'section-card--flush': padding === 'none',
      'section-card--compact': padding === 'compact',
    }"
  >
    <header v-if="hasHeader" class="section-card__header">
      <slot name="header">
        <div class="section-card__heading">
          <component :is="titleTag" v-if="title" class="section-card__title">
            {{ title }}
          </component>
          <p v-if="description" class="section-card__description">
            {{ description }}
          </p>
        </div>
      </slot>
      <div v-if="$slots.actions" class="section-card__actions">
        <slot name="actions" />
      </div>
    </header>
    <div class="section-card__body" :class="bodyClass">
      <slot />
    </div>
    <footer v-if="$slots.footer" class="section-card__footer">
      <slot name="footer" />
    </footer>
  </section>
</template>

<script setup lang="ts">
import { computed, useSlots } from "vue";

/**
 * 内容面板：页面内所有卡片、分区和工作台面板的统一外观。
 *
 * 只负责外观与布局；字段、数据加载和权限由使用方处理。
 */
const props = withDefaults(
  defineProps<{
    title?: string;
    description?: string;
    /** 标题标签，按页面标题层级选择 */
    titleTag?: "h2" | "h3" | "h4";
    /** 在父级弹性布局中占满剩余高度，正文成为纵向弹性容器 */
    fill?: boolean;
    padding?: "default" | "compact" | "none";
    bodyClass?: string;
  }>(),
  {
    title: undefined,
    description: undefined,
    titleTag: "h3",
    fill: false,
    padding: "default",
    bodyClass: undefined,
  },
);

const slots = useSlots();
const hasHeader = computed(() =>
  Boolean(props.title || props.description || slots.header || slots.actions),
);
</script>

<style lang="scss">
.section-card {
  display: flex;
  flex-direction: column;
  min-width: 0;
  color: var(--el-text-color-primary);
  background: var(--content-bg);
  border: 1px solid var(--card-border);
  border-radius: var(--card-radius);
  box-shadow: var(--card-shadow);

  &__header {
    display: flex;
    flex-wrap: wrap;
    gap: 8px 16px;
    align-items: center;
    justify-content: space-between;
    min-height: 52px;
    padding: 12px var(--section-padding);
    border-bottom: 1px solid var(--divider-color);
  }

  &__heading {
    min-width: 0;
  }

  &__title {
    margin: 0;
    font-size: 15px;
    font-weight: 600;
    line-height: 22px;
    color: var(--el-text-color-primary);
  }

  &__description {
    margin: 2px 0 0;
    font-size: 13px;
    line-height: 20px;
    color: var(--el-text-color-secondary);
  }

  &__actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
    margin-left: auto;

    .el-button + .el-button {
      margin-left: 0;
    }
  }

  &__body {
    min-width: 0;
    padding: var(--section-padding);
  }

  &__footer {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
    justify-content: flex-end;
    padding: 12px var(--section-padding);
    border-top: 1px solid var(--divider-color);

    .el-button + .el-button {
      margin-left: 0;
    }
  }

  &--compact {
    .section-card__header {
      min-height: 44px;
      padding-block: 8px;
    }

    .section-card__body {
      padding: 12px;
    }
  }

  &--flush > .section-card__body {
    padding: 0;
  }

  &--fill {
    flex: 1 1 auto;
    min-height: 0;

    > .section-card__body {
      display: flex;
      flex: 1 1 auto;
      flex-direction: column;
      gap: 12px;
      min-height: 0;
    }
  }
}

html.is-compact .section-card {
  .section-card__header {
    min-height: 44px;
    padding-block: 8px;
  }

  .section-card__title {
    font-size: 14px;
  }

  &--compact .section-card__body {
    padding: 8px;
  }

  &--fill > .section-card__body {
    gap: 8px;
  }
}
</style>
