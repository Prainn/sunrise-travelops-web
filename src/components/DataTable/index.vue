<template>
  <div class="data-table" :class="{ 'data-table--fill': fill }">
    <el-table
      ref="tableRef"
      v-loading="loading"
      class="data-table__table"
      :border="border"
      :height="fill ? '100%' : height"
      v-bind="$attrs"
    >
      <template v-for="(_, name) in $slots" #[name]="scope">
        <slot :name="name" v-bind="scope ?? {}" />
      </template>
      <template v-if="!$slots.empty" #empty>
        <FeedbackState
          :type="error ? 'error' : filtered ? 'no-match' : 'empty'"
          :title="error ? undefined : emptyText"
          :description="error || undefined"
          :retryable="Boolean(error)"
          @retry="emit('retry')"
        />
      </template>
    </el-table>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import type { TableInstance } from "element-plus";
import FeedbackState from "@/components/FeedbackState/index.vue";

/**
 * 通用表格：在 ElTable 上统一外框、表头、单元格换行、加载与空态反馈。
 *
 * 其余 ElTable 属性、事件与列插槽原样透传；需要实例方法时通过暴露的 table 访问。
 */
defineOptions({ inheritAttrs: false });

withDefaults(
  defineProps<{
    loading?: boolean;
    /** 占满父级剩余高度并在表格内部滚动；嵌入弹窗或面板的短表格保持 false */
    fill?: boolean;
    /** 非 fill 模式下的固定高度或最大高度由使用方按需传入 */
    height?: string | number;
    /** 保留列宽拖拽；正文不画竖线，只在表头保留分隔 */
    border?: boolean;
    /** 已翻译的空数据文案，不传时使用通用文案 */
    emptyText?: string;
    /** 当前存在生效的筛选条件，空结果按“无匹配”提示 */
    filtered?: boolean;
    /** 加载失败信息；有值时空态显示错误并提供重试 */
    error?: string;
  }>(),
  {
    loading: false,
    fill: false,
    height: undefined,
    border: true,
    emptyText: undefined,
    filtered: false,
    error: "",
  },
);
const emit = defineEmits<{ retry: [] }>();

const tableRef = ref<TableInstance>();

defineExpose({ table: tableRef });
</script>

<style lang="scss">
.data-table {
  min-width: 0;
  overflow: hidden;
  background: var(--content-bg);
  border: 1px solid var(--card-border);
  border-radius: 8px;

  &--fill {
    flex: 1 1 auto;
    min-height: 0;
  }

  .data-table__table {
    --el-table-border-color: var(--divider-color);
    --el-table-border: 1px solid var(--divider-color);
    --el-table-header-bg-color: var(--surface-muted);
    --el-table-header-text-color: var(--el-text-color-secondary);
    --el-table-row-hover-bg-color: var(--surface-hover);
    --el-table-current-row-bg-color: var(--el-color-primary-light-9);
    --el-table-tr-bg-color: var(--content-bg);
    --el-table-bg-color: var(--content-bg);
    --el-table-expanded-cell-bg-color: var(--surface-muted);

    width: 100%;
    font-size: 13px;
    color: var(--el-text-color-regular);

    // 外框由 .data-table 提供，去掉 ElTable 自带的四周边线，避免双层边框
    &.el-table--border {
      border: 0;

      &::before,
      &::after,
      .el-table__inner-wrapper::before,
      .el-table__inner-wrapper::after,
      .el-table__border-left-patch,
      .el-table__border-right-patch,
      .el-table__border-bottom-patch {
        display: none;
      }
    }

    &::before,
    .el-table__inner-wrapper::before {
      display: none;
    }

    .el-table__header th.el-table__cell {
      height: 40px;
      padding: 0;
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0.01em;
      background: var(--el-table-header-bg-color);
    }

    .el-table__body td.el-table__cell {
      height: 44px;
      padding: 6px 0;
    }

    &.el-table--border .el-table__body td.el-table__cell {
      border-right-color: transparent;
    }

    .el-table__header .el-table__cell > .cell,
    .el-table__body .el-table__cell > .cell {
      padding-inline: 12px;
      line-height: 20px;
      white-space: normal;
      overflow-wrap: anywhere;
    }

    // 开启溢出提示的列保持单行省略
    .el-table__body .el-table__cell > .cell.el-tooltip {
      white-space: nowrap;
    }

    .el-table__header .el-table__cell > .cell {
      word-break: keep-all;
    }

    // 编辑单元格中的控件占满单元格宽度
    .el-table__body .cell > .el-input,
    .el-table__body .cell > .el-select,
    .el-table__body .cell > .el-input-number,
    .el-table__body .cell > .el-date-editor {
      width: 100%;
    }

    // RowActions 自带 gap，排除它避免相邻按钮间距叠加
    .el-table__body .cell :not(.row-actions) > .el-button.is-link + .el-button.is-link {
      margin-left: 12px;
    }

    .el-table__empty-block {
      min-height: 160px;
    }

    .el-table__empty-text {
      width: 100%;
      line-height: normal;
    }

    // 固定列边界用 1px 分隔线代替阴影，与表头列分隔线重合，不叠出双线
    .el-table-fixed-column--left.is-last-column::before,
    .el-table-fixed-column--right.is-first-column::before {
      width: 1px;
      background: var(--el-table-border-color);
      box-shadow: none;
    }

    .el-table-fixed-column--left.is-last-column::before {
      right: -1px;
    }

    .el-table-fixed-column--right.is-first-column::before {
      left: -1px;
    }

    &.el-table--small .el-table__body td.el-table__cell {
      height: 36px;
      padding: 4px 0;
    }

    &.el-table--small .el-table__header th.el-table__cell {
      height: 34px;
    }
  }
}

// 紧凑密度：表格随全局尺寸进入 small，正文字号与单元格内边距同步收紧
html.is-compact .data-table .data-table__table {
  font-size: 12px;

  .el-table__header .el-table__cell > .cell,
  .el-table__body .el-table__cell > .cell {
    padding-inline: 10px;
  }
}
</style>
