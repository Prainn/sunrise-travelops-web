<template>
  <section class="error-page">
    <div class="error-page__inner grid [grid-template-columns:minmax(0,_0.88fr)_minmax(360px,_1fr)] gap-[56px] items-center w-[min(1040px,_100%)]">
      <div class="error-page__content min-w-0">
        <div class="error-page__label inline-flex items-center h-[28px] p-[0_10px] mb-[18px] text-[14px] font-medium text-[var(--el-color-primary)] [background:var(--el-color-primary-light-9)] [border:1px_solid_var(--el-color-primary-light-8)] rounded-[6px]">
          {{ label }}
        </div>
        <h1 class="error-page__code m-0 text-[112px] font-bold leading-[0.9] text-[var(--el-color-primary)] [letter-spacing:0]">
          {{ statusCode }}
        </h1>
        <h2 class="error-page__title m-[28px_0_0] text-[26px] font-semibold leading-[1.35] text-[var(--el-text-color-primary)] [letter-spacing:0]">
          {{ title }}
        </h2>
        <p class="error-page__description max-w-[440px] m-[12px_0_0] text-[16px] leading-[1.8] text-[var(--el-text-color-secondary)]">
          {{ description }}
        </p>
        <div class="error-page__actions">
          <slot name="actions" />
        </div>
      </div>

      <div
        class="error-page__visual flex justify-center min-w-0"
        aria-hidden="true"
      >
        <div class="error-visual">
          <div class="error-visual__header">
            <span />
            <span />
            <span />
          </div>

          <div class="error-visual__body p-[28px]">
            <div class="error-visual__summary flex gap-[16px] items-center">
              <div class="error-visual__icon grid place-items-center w-[68px] h-[68px] text-[var(--el-color-primary)] [background:var(--el-color-primary-light-9)] [border:1px_solid_var(--el-color-primary-light-8)] rounded-[8px]">
                <el-icon :size="34">
                  <component :is="visualIcon" />
                </el-icon>
              </div>
              <div>
                <div class="error-visual__status text-[34px] font-bold leading-[1] text-[var(--el-text-color-primary)] [letter-spacing:0]">
                  {{ statusCode }}
                </div>
                <div class="error-visual__name mt-[8px] text-[14px] font-medium text-[var(--el-text-color-secondary)] [letter-spacing:0]">
                  {{ visualName }}
                </div>
              </div>
            </div>

            <svg
              class="error-visual__route block w-full h-auto mt-[28px]"
              viewBox="0 0 360 136"
            >
              <path
                class="error-visual__route-line [fill:none] [stroke:var(--el-color-primary-light-5)] [stroke-width:4] [stroke-linecap:round] [stroke-dasharray:8_10]"
                d="M56 48 H148 C174 48 174 88 200 88 H302"
              />
              <rect
                class="error-visual__node"
                x="24"
                y="30"
                width="64"
                height="36"
                rx="6"
              />
              <rect
                class="error-visual__node"
                x="136"
                y="30"
                width="64"
                height="36"
                rx="6"
              />
              <rect
                class="error-visual__node error-visual__node--muted"
                x="272"
                y="70"
                width="64"
                height="36"
                rx="6"
              />
              <path
                class="error-visual__break [fill:none] [stroke:var(--el-color-primary)] [stroke-width:4] [stroke-linecap:round]"
                d="M224 76 L246 98 M246 76 L224 98"
              />
            </svg>

            <div class="error-visual__meta">
              <span>{{ visualMeta }}</span>
              <strong>{{ statusCode }}</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, type Component } from "vue";
import { Lock, Search } from "@element-plus/icons-vue";

interface ErrorPageProps {
  statusCode: string;
  label: string;
  title: string;
  description: string;
  variant: "locked" | "missing";
}

const props = defineProps<ErrorPageProps>();
const { t } = useI18n();

// 使用系统色生成异常页视觉，避免固定插画破坏主题一致性
const visualIcon = computed<Component>(() => (props.variant === "locked" ? Lock : Search));
const visualName = computed(() => (props.variant === "locked" ? "ACCESS CONTROL" : "ROUTE TRACE"));
const visualMeta = computed(() =>
  props.variant === "locked" ? t("error.unauthorized.signal") : t("error.notFound.signal")
);
</script>

<style lang="scss" scoped>
.error-page {
  @apply 'grid place-items-center min-h-full p-[56px_32px] text-[var(--el-text-color-primary)] [background:var(--page-bg)]';
}

.error-page__actions {
  @apply 'flex flex-wrap gap-[10px] items-center mt-[28px]';

  :deep(.el-button) {
    margin-left: 0;
  }
}

.error-visual {
  @apply 'w-[min(420px,_100%)] overflow-hidden [background:var(--el-bg-color-overlay)] [border:1px_solid_var(--el-border-color-light)] rounded-[8px]';
  box-shadow: var(--card-shadow, 0 16px 40px rgb(0 0 0 / 8%));
}

.error-visual__header {
  @apply 'flex gap-[6px] items-center h-[42px] p-[0_16px] [background:var(--el-fill-color-lighter)] [border-bottom:1px_solid_var(--el-border-color-lighter)]';

  span {
    @apply 'w-[18px] h-[6px] [background:var(--el-fill-color-dark)] rounded-[3px]';
  }
}

.error-visual__node {
  @apply '[fill:var(--el-color-primary-light-9)] [stroke:var(--el-color-primary-light-7)] [stroke-width:2]';
}

.error-visual__node--muted {
  @apply '[fill:var(--el-fill-color-lighter)] [stroke:var(--el-border-color)]';
}

.error-visual__meta {
  @apply 'flex items-center justify-between h-[40px] p-[0_12px] mt-[18px] text-[14px] text-[var(--el-text-color-secondary)] [background:var(--el-fill-color-lighter)] [border:1px_solid_var(--el-border-color-lighter)] rounded-[6px]';

  strong {
    @apply 'text-[14px] font-bold text-[var(--el-color-primary)]';
  }
}

@media (width <= 900px) {
  .error-page {
    @apply 'p-[40px_20px]';
  }

  .error-page__inner {
    @apply '[grid-template-columns:1fr] gap-[36px]';
  }

  .error-page__code {
    @apply 'text-[84px]';
  }

  .error-page__title {
    @apply 'text-[22px]';
  }
}

@media (width <= 520px) {
  .error-page {
    @apply 'p-[28px_16px]';
  }

  .error-page__code {
    @apply 'text-[68px]';
  }

  .error-page__visual {
    @apply 'hidden';
  }
}
</style>
