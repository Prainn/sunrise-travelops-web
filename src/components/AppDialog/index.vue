<template>
  <el-dialog
    v-bind="$attrs"
    :class="['app-dialog', `app-dialog--${size}`]"
    :width="width ?? DIALOG_WIDTHS[size]"
    :top="top ?? (size === 'full' ? '16px' : '8vh')"
    :show-close="showClose && !busy"
    :close-on-click-modal="closeOnClickModal && !busy"
    :close-on-press-escape="closeOnPressEscape && !busy"
  >
    <template v-for="(_, name) in $slots" #[name]="scope">
      <slot :name="name" v-bind="scope ?? {}" />
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
/**
 * 弹窗外壳：统一尺寸档位、正文内部滚动以及标题与底部操作区。
 *
 * 其余 ElDialog 属性（v-model、title、destroy-on-close、append-to-body、before-close 等）与事件、插槽原样透传；
 * busy 期间禁止通过关闭按钮、遮罩和 Esc 关闭，提交保护仍由使用方的提交逻辑负责。
 */
defineOptions({ inheritAttrs: false });

type DialogSize = "sm" | "md" | "lg" | "xl" | "full";

const DIALOG_WIDTHS: Record<DialogSize, string> = {
  sm: "min(420px, calc(100vw - 24px))",
  md: "min(560px, calc(100vw - 24px))",
  lg: "min(800px, calc(100vw - 24px))",
  xl: "min(1120px, calc(100vw - 24px))",
  full: "min(1440px, calc(100vw - 32px))",
};

withDefaults(
  defineProps<{
    /** sm：确认/短表单；md：常规表单；lg：多分组表单；xl/full：复杂编辑器与预览 */
    size?: DialogSize;
    /** 特殊宽度，优先于 size */
    width?: string;
    top?: string;
    /** 保存或提交进行中，暂时禁止用户关闭 */
    busy?: boolean;
    showClose?: boolean;
    /** 表单弹窗默认不因误点遮罩丢失编辑内容 */
    closeOnClickModal?: boolean;
    closeOnPressEscape?: boolean;
  }>(),
  {
    size: "md",
    width: undefined,
    top: undefined,
    busy: false,
    showClose: true,
    closeOnClickModal: false,
    closeOnPressEscape: true,
  },
);
</script>

<style lang="scss">
.el-dialog.app-dialog {
  --el-dialog-padding-primary: 0;
  --el-dialog-border-radius: var(--card-radius);

  display: flex;
  flex-direction: column;
  max-height: calc(100dvh - var(--el-dialog-margin-top, 8vh) - 24px);
  margin-bottom: 24px;
  padding: 0;
  overflow: hidden;
  background: var(--content-bg);
  border: 1px solid var(--card-border);
  box-shadow: var(--overlay-shadow);

  > .el-dialog__header {
    flex-shrink: 0;
    min-height: 56px;
    padding: 16px 52px 14px 20px;
    border-bottom: 1px solid var(--divider-color);

    .el-dialog__title {
      font-size: 16px;
      font-weight: 600;
      line-height: 24px;
      color: var(--el-text-color-primary);
    }

    .el-dialog__headerbtn {
      top: 10px;
      right: 10px;
      width: 36px;
      height: 36px;
      border-radius: var(--control-radius);

      &:hover {
        background: var(--surface-hover);
      }
    }
  }

  > .el-dialog__body {
    flex: 1 1 auto;
    min-height: 0;
    padding: 20px;
    overflow: auto;
    color: var(--el-text-color-regular);
  }

  > .el-dialog__footer {
    display: flex;
    flex-shrink: 0;
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

  &.is-fullscreen {
    max-height: none;
    margin: 0;
    border-radius: 0;
  }
}
</style>
