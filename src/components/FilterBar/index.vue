<template>
  <div class="filter-bar" :class="`filter-bar--${variant}`">
    <el-form
      ref="formRef"
      class="filter-bar__form"
      :model="model"
      :aria-label="$t('common.filters')"
      role="search"
      @submit.prevent
      @focusin="hasActiveControl = true"
      @change="(event: Event) => event.isTrusted && scheduleFilterLog()"
      @click="handleFormClick"
    >
      <div class="filter-bar__fields">
        <slot />
      </div>
      <div v-if="$slots.actions || resettable" class="filter-bar__actions">
        <slot name="actions" />
        <el-button v-if="resettable" @click="handleReset">
          {{ $t("common.reset") }}
        </el-button>
      </div>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import type { FormInstance } from "element-plus";
import { recordClientOperation, resolveClientPage } from "@/utils/client-operation-log";
import { isUserInput } from "@/utils/user-interaction";

/**
 * 列表筛选栏：统一字段排布、可见标签与查询/重置操作区。
 *
 * 每个筛选字段用带 label 的 el-form-item 放入默认插槽；关键词等长输入给 el-form-item 加 `filter-bar__wide`。
 * 查询时机（防抖、页码重置）由使用方决定，组件只发出 reset。
 */
const props = withDefaults(
  defineProps<{
    /** default：页面顶部独立面板；compact：侧栏或面板内的单行筛选 */
    variant?: "default" | "compact";
    /** 传给 el-form，需要 resetFields 时必须提供并给字段设置 prop */
    model?: object;
    /** 显示内置重置按钮 */
    resettable?: boolean;
  }>(),
  { variant: "default", model: undefined, resettable: true },
);
const emit = defineEmits<{ reset: [] }>();

const POPPER_CONTROL_SELECTOR =
  ".el-select-dropdown__item, .el-date-table-cell, .el-month-table .cell, .el-year-table .cell, .el-picker-panel__shortcut, .el-picker-panel__footer button";
const CLEAR_CONTROL_SELECTOR = ".el-input__clear, .el-select__clear, .el-range__close-icon";

const route = useRoute();
const formRef = ref<FormInstance>();
const hasActiveControl = ref(false);
let filterTimer: ReturnType<typeof setTimeout> | undefined;

function cancelPendingFilterLog() {
  if (filterTimer !== undefined) {
    clearTimeout(filterTimer);
    filterTimer = undefined;
  }
}

function scheduleFilterLog() {
  const page = resolveClientPage(route);
  cancelPendingFilterLog();
  filterTimer = setTimeout(() => {
    filterTimer = undefined;
    recordClientOperation({ page, action: "filter", result: "success" });
  }, 300);
}

function handleFormClick(event: MouseEvent) {
  if (!event.isTrusted) return;
  const target = event.target instanceof Element ? event.target : null;
  if (target?.closest(CLEAR_CONTROL_SELECTOR)) {
    scheduleFilterLog();
  }
}

function handleDocumentClick(event: MouseEvent) {
  if (!event.isTrusted) return;
  const target = event.target instanceof Element ? event.target : null;
  const formEl = formRef.value?.$el as Element | undefined;
  if (target && formEl?.contains(target)) {
    hasActiveControl.value = true;
    return;
  }
  // Element Plus 下拉与日期弹层挂载在 body 上，由本筛选栏激活后点击选项时补记筛选。
  if (hasActiveControl.value && target?.closest(POPPER_CONTROL_SELECTOR)) {
    scheduleFilterLog();
    return;
  }
  hasActiveControl.value = false;
}

watch(
  () => props.model,
  () => {
    if (isUserInput()) scheduleFilterLog();
  },
  { deep: true },
);

function handleReset() {
  cancelPendingFilterLog();
  recordClientOperation({ page: resolveClientPage(route), action: "filter", result: "success" });
  emit("reset");
}

onMounted(() => {
  document.addEventListener("click", handleDocumentClick, true);
});

onBeforeUnmount(() => {
  cancelPendingFilterLog();
  document.removeEventListener("click", handleDocumentClick, true);
});

defineExpose({ form: formRef });
</script>

<style lang="scss">
.filter-bar {
  flex-shrink: 0;
  min-width: 0;

  &--default {
    padding: 12px var(--section-padding);
    background: var(--content-bg);
    border: 1px solid var(--card-border);
    border-radius: var(--card-radius);
    box-shadow: var(--card-shadow);
  }

  &__form {
    display: flex;
    flex-wrap: wrap;
    gap: 12px 16px;
    align-items: flex-start;
  }

  &__fields {
    display: flex;
    flex: 1 1 480px;
    flex-wrap: wrap;
    gap: 12px 16px;
    min-width: 0;

    > .el-form-item {
      flex: 1 1 220px;
      min-width: min(100%, 220px);
      max-width: 340px;
      margin: 0;
    }

    > .el-form-item.filter-bar__wide {
      flex: 2 1 320px;
      min-width: min(100%, 320px);
      max-width: 520px;
    }

    .el-form-item__label {
      flex-shrink: 0;
      height: var(--el-component-size);
      max-width: none;
      padding: 0 10px 0 0;
      line-height: var(--el-component-size);
      white-space: nowrap;
    }

    .el-form-item__content {
      flex: 1 1 auto;
      min-width: 0;

      > .el-input,
      > .el-select,
      > .el-cascader,
      > .el-date-editor,
      > .el-input-number {
        width: 100%;
      }
    }
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

  &--compact {
    .filter-bar__form {
      flex-wrap: nowrap;
      gap: 8px;
    }

    .filter-bar__fields {
      flex: 1 1 auto;
      flex-wrap: nowrap;

      > .el-form-item,
      > .el-form-item.filter-bar__wide {
        flex: 1 1 auto;
        min-width: 0;
        max-width: none;
      }
    }

    .filter-bar__actions {
      flex-wrap: nowrap;
      margin-left: 0;
    }
  }
}

html.is-compact .filter-bar {
  &--default {
    padding-block: 8px;
  }

  .filter-bar__form,
  .filter-bar__fields {
    gap: 8px 12px;
  }

  .filter-bar__fields {
    > .el-form-item {
      flex-basis: 200px;
      min-width: min(100%, 200px);
    }

    .el-form-item__label {
      height: var(--el-component-size-small);
      line-height: var(--el-component-size-small);
    }
  }
}
</style>
