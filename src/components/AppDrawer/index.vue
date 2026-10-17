<template>
  <el-drawer
    v-bind="$attrs"
    :class="['app-drawer', `app-drawer--${preset ?? 'custom'}`]"
    :size="preset ? DRAWER_SIZES[preset] : size"
    :show-close="showClose && !busy"
    :close-on-click-modal="closeOnClickModal && !busy"
    :close-on-press-escape="closeOnPressEscape && !busy"
  >
    <template v-for="(_, name) in $slots" #[name]="scope">
      <slot :name="name" v-bind="scope ?? {}" />
    </template>
  </el-drawer>
</template>

<script setup lang="ts">
import { computed } from "vue";

/**
 * 抽屉外壳：统一宽度档位、标题、正文滚动与底部操作区。
 *
 * 其余 ElDrawer 属性、事件与插槽原样透传；busy 期间禁止用户关闭。
 */
defineOptions({ inheritAttrs: false });

type DrawerSize = "sm" | "md" | "lg" | "xl";

const DRAWER_SIZES: Record<DrawerSize, string> = {
  sm: "min(480px, 100vw)",
  md: "min(680px, 100vw)",
  lg: "min(960px, 100vw)",
  xl: "min(1400px, 96vw)",
};

const props = withDefaults(
  defineProps<{
    /** 宽度档位，也可传任意 CSS 长度 */
    size?: DrawerSize | string;
    busy?: boolean;
    showClose?: boolean;
    closeOnClickModal?: boolean;
    closeOnPressEscape?: boolean;
  }>(),
  {
    size: "md",
    busy: false,
    showClose: true,
    closeOnClickModal: true,
    closeOnPressEscape: true,
  },
);

const preset = computed(() =>
  props.size in DRAWER_SIZES ? (props.size as DrawerSize) : undefined,
);
</script>

<style lang="scss">
.el-drawer.app-drawer {
  --el-drawer-padding-primary: 20px;

  background: var(--content-bg);
  box-shadow: var(--overlay-shadow);

  > .el-drawer__header {
    min-height: 56px;
    margin: 0;
    padding: 14px 16px 14px 20px;
    color: var(--el-text-color-primary);
    border-bottom: 1px solid var(--divider-color);

    .el-drawer__title {
      font-size: 16px;
      font-weight: 600;
      line-height: 24px;
    }

    .el-drawer__close-btn {
      width: 32px;
      height: 32px;
      border-radius: var(--control-radius);

      &:hover {
        background: var(--surface-hover);
      }
    }
  }

  > .el-drawer__body {
    position: relative;
    padding: 20px;
    color: var(--el-text-color-regular);
  }

  > .el-drawer__footer {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
    justify-content: flex-end;
    padding: 12px 20px;
    background: var(--surface-muted);
    border-top: 1px solid var(--divider-color);

    .el-button + .el-button {
      margin-left: 0;
    }
  }
}
</style>
