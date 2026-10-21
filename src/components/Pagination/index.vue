<template>
  <div
    v-show="!hidden"
    class="app-pagination"
    :class="{ 'app-pagination--compact': isCompact }"
  >
    <el-pagination
      v-model:current-page="currentPage"
      v-model:page-size="pageSize"
      :background="background"
      :layout="resolvedLayout"
      :page-sizes="pageSizes"
      :pager-count="isCompact ? 5 : 7"
      :size="isCompact ? 'small' : undefined"
      :total="total"
      @size-change="handleSizeChange"
      @current-change="requestChange"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick } from "vue";
import { useMediaQuery } from "@vueuse/core";
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from "./config";

interface Props {
  /** 数据总条数 */
  total: number;
  /** 每页条数选项，默认 [10, 20, 50] */
  pageSizes?: number[];
  /** 自定义分页布局；不传时按 variant 与可用宽度选择 */
  layout?: string;
  /** default：列表底部；compact：侧栏、弹窗或面板内的窄空间 */
  variant?: "default" | "compact";
  /** 是否为分页按钮添加背景色 */
  background?: boolean;
  /** 是否隐藏整个分页条 */
  hidden?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  pageSizes: () => [...PAGE_SIZE_OPTIONS],
  layout: undefined,
  variant: "default",
  background: true,
  hidden: false,
});

const emit = defineEmits<{
  /** 页码或每页条数变化时触发一次，回调当前页码与每页条数 */
  pagination: [query: { page: number; limit: number }];
}>();

// 当前页码，双向绑定到父组件的 page
const currentPage = defineModel<number>("page", { default: 1 });

// 每页条数，双向绑定到父组件的 limit
const pageSize = defineModel<number>("limit", { default: DEFAULT_PAGE_SIZE });

const isNarrow = useMediaQuery("(max-width: 768px)");
const isCompact = computed(() => props.variant === "compact" || isNarrow.value);
const resolvedLayout = computed(() => {
  if (props.layout) return props.layout;
  return isCompact.value ? "total, prev, pager, next" : "total, sizes, prev, pager, next, jumper";
});

let isChangeQueued = false;

/**
 * 合并同一轮内的页码与条数变化后只通知一次。
 *
 * ElPagination 在条数变化或总数减少时会自行把页码夹回最后一页并再次触发 current-change，
 * 逐个转发会让一次操作发出多次请求。
 */
function requestChange() {
  if (isChangeQueued) return;
  isChangeQueued = true;
  void nextTick(() => {
    isChangeQueued = false;
    emit("pagination", { page: currentPage.value, limit: pageSize.value });
  });
}

// 切换每页条数时回到第一页
function handleSizeChange() {
  currentPage.value = 1;
  requestChange();
}
</script>

<style lang="scss">
.app-pagination {
  display: flex;
  flex-shrink: 0;
  justify-content: flex-end;
  min-width: 0;
  overflow-x: auto;

  .el-pagination {
    flex-wrap: nowrap;
  }

  &--compact {
    justify-content: center;
  }
}
</style>
