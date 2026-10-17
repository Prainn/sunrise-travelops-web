<template>
  <div class="row-actions">
    <slot />
    <el-dropdown
      v-if="$slots.more"
      trigger="click"
      placement="bottom-end"
      @command="emit('command', $event)"
    >
      <el-button
        class="row-actions__more"
        link
        type="primary"
        :aria-label="$t('common.moreActions')"
      >
        {{ $t("common.more") }}
        <el-icon class="ml-[2px]" aria-hidden="true">
          <ArrowDown />
        </el-icon>
      </el-button>
      <template #dropdown>
        <el-dropdown-menu>
          <slot name="more" />
        </el-dropdown-menu>
      </template>
    </el-dropdown>
  </div>
</template>

<script setup lang="ts">
import { ArrowDown } from "@element-plus/icons-vue";

/**
 * 表格行操作区：常用操作直接展示为链接按钮，低频操作放入“更多”下拉。
 *
 * 默认插槽放 el-button（link），more 插槽放 el-dropdown-item；权限指令与显示条件由使用方保留在各操作上。
 */
const emit = defineEmits<{ command: [command: string | number | object] }>();
</script>

<style lang="scss">
.row-actions {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 4px 12px;
  align-items: center;

  > .el-button + .el-button {
    margin-left: 0;
  }

  .el-button.is-link {
    font-weight: 500;
  }
}
</style>
