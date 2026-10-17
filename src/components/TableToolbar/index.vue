<template>
  <div class="table-toolbar">
    <div class="table-toolbar__left">
      <h3 v-if="title" class="table-toolbar__title">
        {{ title }}
      </h3>
      <slot />
    </div>
    <div v-if="$slots.right || refreshable" class="table-toolbar__right">
      <slot name="right" />
      <IconButton
        v-if="refreshable"
        :label="$t('common.refresh')"
        :icon="Refresh"
        :loading="refreshing"
        @click="emit('refresh')"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { Refresh } from "@element-plus/icons-vue";
import IconButton from "@/components/IconButton/index.vue";

/**
 * 列表工具栏：左侧放标题、新增与批量操作，右侧放视图级操作与刷新。
 */
withDefaults(
  defineProps<{
    /** 已翻译的区块标题，用于面板内的嵌入式列表 */
    title?: string;
    refreshable?: boolean;
    /** 刷新进行中时显示加载态 */
    refreshing?: boolean;
  }>(),
  { title: undefined, refreshable: true, refreshing: false },
);
const emit = defineEmits<{ refresh: [] }>();
</script>

<style lang="scss">
.table-toolbar {
  display: flex;
  flex-shrink: 0;
  flex-wrap: wrap;
  gap: 8px 12px;
  align-items: center;
  justify-content: space-between;
  min-width: 0;

  &__left,
  &__right {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
    min-width: 0;

    .el-button + .el-button {
      margin-left: 0;
    }
  }

  &__left {
    flex: 1 1 auto;
  }

  &__right {
    justify-content: flex-end;
    margin-left: auto;
  }

  &__title {
    margin: 0 4px 0 0;
    font-size: 15px;
    font-weight: 600;
    line-height: 22px;
    color: var(--el-text-color-primary);
  }
}
</style>
