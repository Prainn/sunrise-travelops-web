<template>
  <div class="feedback-state" :class="`feedback-state--${type}`" :role="type === 'error' ? 'alert' : undefined">
    <el-icon class="feedback-state__icon" aria-hidden="true">
      <WarningFilled v-if="type === 'error'" />
      <Search v-else-if="type === 'no-match'" />
      <Box v-else />
    </el-icon>
    <p class="feedback-state__title">
      {{ title || defaultTitle }}
    </p>
    <p v-if="description" class="feedback-state__description">
      {{ description }}
    </p>
    <div v-if="$slots.default || retryable" class="feedback-state__actions">
      <slot />
      <el-button v-if="retryable" size="small" @click="emit('retry')">
        {{ $t("common.retry") }}
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Box, Search, WarningFilled } from "@element-plus/icons-vue";
import { computed } from "vue";
import { useI18n } from "vue-i18n";

/**
 * 空数据、筛选无结果与加载失败的统一反馈。
 */
const props = withDefaults(
  defineProps<{
    type?: "empty" | "no-match" | "error";
    /** 已翻译的标题；不传时按类型使用通用文案 */
    title?: string;
    /** 已翻译的补充说明，如服务端错误信息 */
    description?: string;
    /** 显示重试按钮并触发 retry */
    retryable?: boolean;
  }>(),
  { type: "empty", title: undefined, description: undefined, retryable: false },
);
const emit = defineEmits<{ retry: [] }>();
const { t } = useI18n();

const defaultTitle = computed(() => {
  if (props.type === "error") return t("common.loadFailed");
  if (props.type === "no-match") return t("common.noMatch");
  return t("common.noData");
});
</script>

<style lang="scss">
.feedback-state {
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: center;
  justify-content: center;
  padding: 32px 16px;
  line-height: 20px;
  text-align: center;

  &__icon {
    margin-bottom: 6px;
    font-size: 28px;
    color: var(--el-text-color-placeholder);
  }

  &__title {
    margin: 0;
    font-size: 14px;
    font-weight: 500;
    color: var(--el-text-color-regular);
  }

  &__description {
    max-width: 480px;
    margin: 0;
    font-size: 13px;
    color: var(--el-text-color-secondary);
    overflow-wrap: anywhere;
  }

  &__actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    justify-content: center;
    margin-top: 10px;

    .el-button + .el-button {
      margin-left: 0;
    }
  }

  &--error .feedback-state__icon {
    color: var(--el-color-danger);
  }
}
</style>
