<template>
  <!-- 单一根元素，保证 v-has-perm 等指令能作用于整个按钮 -->
  <span class="icon-button-wrap">
    <el-tooltip :content="label" :disabled="!tooltip" placement="top">
      <el-button
        class="icon-button"
        :aria-label="label"
        :icon="icon"
        v-bind="$attrs"
      >
        <slot />
      </el-button>
    </el-tooltip>
  </span>
</template>

<script setup lang="ts">
import type { Component } from "vue";

/**
 * 仅图标的按钮：可访问名称与悬停提示使用同一段响应式文案。
 */
defineOptions({ inheritAttrs: false });

withDefaults(
  defineProps<{
    /** 已翻译的操作名称，同时作为 aria-label 与提示文字 */
    label: string;
    icon?: Component;
    tooltip?: boolean;
  }>(),
  { icon: undefined, tooltip: true },
);
</script>

<style lang="scss">
.icon-button-wrap {
  display: inline-flex;
  vertical-align: middle;
}

.icon-button.el-button:not(.is-circle, .is-link, .is-text) {
  width: var(--el-component-size);
  padding: 0;
}

.icon-button.el-button--small:not(.is-circle, .is-link, .is-text) {
  width: var(--el-component-size-small);
}
</style>
