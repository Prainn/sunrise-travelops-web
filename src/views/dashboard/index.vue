<template>
  <div class="dash">
    <section class="dash-header">
      <div class="card dash-header__card">
        <div class="dash-header__start">
          <div class="dash-avatar">
            <img
              v-if="userStore.userInfo.avatar"
              :src="userStore.userInfo.avatar"
              alt=""
            />
            <el-icon
              v-else
              :size="22"
            >
              <User />
            </el-icon>
          </div>
          <div class="dash-header__text">
            <h1 class="dash-header__greeting">
              {{ greetings }}
            </h1>
            <p class="dash-header__date">
              {{ currentDateStr }}
            </p>
          </div>
        </div>
      </div>
    </section>

    <section class="dash-stats">
      <div class="stat-card">
        <div class="stat-card__icon stat-card__icon--visitor">
          <el-icon :size="18">
            <User />
          </el-icon>
        </div>
        <div class="stat-card__body">
          <span class="stat-card__label">{{ $t("dashboard.todayVisitors") }}</span>
          <span class="stat-card__num">{{ displayTransitionUvCount }}</span>
        </div>
        <span
          v-if="uvGrowthText !== '--'"
          :class="['stat-card__trend', `stat-card__trend--${uvTrendTone}`]"
        >
          <el-icon :size="12">
            <ArrowUp v-if="uvIsUp" />
            <ArrowDown v-else />
          </el-icon>
          {{ uvGrowthText }}
        </span>
      </div>

      <div class="stat-card">
        <div class="stat-card__icon stat-card__icon--view">
          <el-icon :size="18">
            <View />
          </el-icon>
        </div>
        <div class="stat-card__body">
          <span class="stat-card__label">{{ $t("dashboard.todayViews") }}</span>
          <span class="stat-card__num">{{ displayTransitionPvCount }}</span>
        </div>
        <span
          v-if="pvGrowthText !== '--'"
          :class="['stat-card__trend', `stat-card__trend--${pvTrendTone}`]"
        >
          <el-icon :size="12">
            <ArrowUp v-if="pvIsUp" />
            <ArrowDown v-else />
          </el-icon>
          {{ pvGrowthText }}
        </span>
      </div>

      <div class="stat-card">
        <div class="stat-card__icon stat-card__icon--account">
          <span class="stat-card__svg i-svg:group" />
        </div>
        <div class="stat-card__body">
          <span class="stat-card__label">{{ $t("dashboard.systemUsers") }}</span>
          <span class="stat-card__num">6</span>
        </div>
        <span :class="['stat-card__trend', `stat-card__trend--${systemTrendTone}`]">
          <el-icon :size="12"><ArrowUp /></el-icon>
          12.5%
        </span>
      </div>
    </section>

    <section class="dash-chart">
      <div class="card dash-chart__trend">
        <div class="card__head">
          <h3 class="card__title">
            {{ $t("dashboard.visitTrend") }}
          </h3>
          <el-radio-group
            v-model="visitTrendDateRange"
            size="small"
          >
            <el-radio-button
              :label="$t('dashboard.lastDays', { days: 7 })"
              :value="7"
            />
            <el-radio-button
              :label="$t('dashboard.lastDays', { days: 30 })"
              :value="30"
            />
          </el-radio-group>
        </div>
        <div class="card__body card__body--chart">
          <ECharts
            :options="visitTrendChartOptions"
            height="260px"
          />
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: "Dashboard", inheritAttrs: false });

import { ref } from "vue";
import { dashboardService } from "@/services";
import type { VisitOverviewDetail, VisitTrendDetail } from "@/types/dashboard";
import { useUserStore } from "@/stores/user";
import { useSettingsStore } from "@/stores/settings";
import { formatGrowthRate } from "@/utils";
import { useTransition } from "@vueuse/core";
import {
  User,
  View,
  ArrowUp,
  ArrowDown,
} from "@element-plus/icons-vue";

const userStore = useUserStore();
const settingsStore = useSettingsStore();
const { t, locale } = useI18n();

const hours = new Date().getHours();
const greetings = computed(() => {
  const n = userStore.userInfo.nickname;
  if (hours >= 6 && hours < 8) return t("dashboard.greeting.early", { name: n });
  if (hours >= 8 && hours < 12) return t("dashboard.greeting.morning", { name: n });
  if (hours >= 12 && hours < 18) return t("dashboard.greeting.afternoon", { name: n });
  if (hours >= 18 && hours < 24) return t("dashboard.greeting.evening", { name: n });
  return t("dashboard.greeting.late", { name: n });
});

const currentDateStr = computed(() => {
  return new Intl.DateTimeFormat(locale.value === "en" ? "en-US" : "zh-CN", {
    dateStyle: "full",
  }).format(new Date());
});

const visitOverviewData = ref<VisitOverviewDetail>({
  todayUvCount: 0,
  uvGrowthRate: 0,
  totalUvCount: 0,
  todayPvCount: 0,
  pvGrowthRate: 0,
  totalPvCount: 0,
});

const uvGrowthText = computed(() => {
  const r = visitOverviewData.value.uvGrowthRate;
  return r == null ? "--" : formatGrowthRate(r);
});
const pvGrowthText = computed(() => {
  const r = visitOverviewData.value.pvGrowthRate;
  return r == null ? "--" : formatGrowthRate(r);
});
const uvIsUp = computed(() => (visitOverviewData.value.uvGrowthRate || 0) > 0);
const pvIsUp = computed(() => (visitOverviewData.value.pvGrowthRate || 0) > 0);
const uvTrendTone = computed(() => (uvIsUp.value ? "success" : "danger"));
const pvTrendTone = computed(() => (pvIsUp.value ? "success" : "danger"));
const systemTrendTone = "success";

const tUv = useTransition(
  computed(() => visitOverviewData.value.todayUvCount),
  {
    duration: 800,
    transition: [0.25, 0.1, 0.25, 1.0],
  }
);
const tPv = useTransition(
  computed(() => visitOverviewData.value.todayPvCount),
  {
    duration: 800,
    transition: [0.25, 0.1, 0.25, 1.0],
  }
);
const displayTransitionUvCount = computed(() => Math.round(Number(tUv.value)));
const displayTransitionPvCount = computed(() => Math.round(Number(tPv.value)));

const visitTrendDateRange = ref(7);
const visitTrendData = ref<VisitTrendDetail>();
const visitTrendChartOptions = ref({});

function getCssVar(name: string, fallback: string) {
  if (typeof window === "undefined") return fallback;

  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

function colorWithAlpha(color: string, alpha: number) {
  const value = color.trim();

  if (value.startsWith("#")) {
    const hex =
      value.length === 4
        ? `#${value[1]}${value[1]}${value[2]}${value[2]}${value[3]}${value[3]}`
        : value;
    const rgb = Number.parseInt(hex.slice(1), 16);
    const r = (rgb >> 16) & 255;
    const g = (rgb >> 8) & 255;
    const b = rgb & 255;

    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  const parts = value.match(/\d+(\.\d+)?/g);
  if (parts && parts.length >= 3) {
    return `rgba(${parts[0]}, ${parts[1]}, ${parts[2]}, ${alpha})`;
  }

  return value;
}

function fetchVisitOverviewData() {
  dashboardService.getVisitOverview().then((d) => {
    visitOverviewData.value = d;
  });
}

function fetchVisitTrendData() {
  dashboardService.getVisitTrend().then((d) => {
    visitTrendData.value = d;
    updateVisitTrendChartOptions(d);
  });
}

function updateVisitTrendChartOptions(d: VisitTrendDetail) {
  const primary = getCssVar("--el-color-primary", "#409eff");
  const success = getCssVar("--el-color-success", "#67c23a");
  const textSecondary = getCssVar("--el-text-color-secondary", "#909399");
  const borderLighter = getCssVar("--el-border-color-lighter", "#ebeef5");
  const gridLine = colorWithAlpha(borderLighter, 0.72);

  visitTrendChartOptions.value = {
    tooltip: {
      trigger: "axis",
      borderWidth: 0,
      padding: [8, 12],
      extraCssText: "box-shadow: var(--el-box-shadow-light); border-radius: 6px;",
    },
    legend: {
      data: [t("dashboard.views"), t("dashboard.visitors")],
      bottom: 0,
      textStyle: { fontSize: 14, color: textSecondary },
      itemWidth: 10,
      itemHeight: 8,
      itemGap: 24,
    },
    grid: { left: "0%", right: "3%", bottom: "14%", top: "5%", containLabel: true },
    xAxis: {
      type: "category",
      data: d.dates,
      axisTick: { show: false },
      axisLine: { lineStyle: { color: colorWithAlpha(borderLighter, 0.82) } },
      axisLabel: { fontSize: 14, color: textSecondary },
      splitLine: { show: false },
    },
    yAxis: {
      type: "value",
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { type: "dashed", color: gridLine, width: 1 } },
      axisLabel: { fontSize: 14, color: textSecondary },
    },
    series: [
      {
        name: t("dashboard.views"),
        type: "line",
        data: d.pvList,
        smooth: true,
        symbol: "circle",
        symbolSize: 5,
        showSymbol: false,
        lineStyle: { color: primary, width: 2.2 },
        itemStyle: { color: primary },
        areaStyle: {
          opacity: 1,
          color: {
            type: "linear",
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: colorWithAlpha(primary, 0.18) },
              { offset: 0.52, color: colorWithAlpha(primary, 0.08) },
              { offset: 1, color: colorWithAlpha(primary, 0.01) },
            ],
          },
        },
      },
      {
        name: t("dashboard.visitors"),
        type: "line",
        data: d.uvList,
        smooth: true,
        symbol: "circle",
        symbolSize: 5,
        showSymbol: false,
        lineStyle: { color: colorWithAlpha(success, 0.9), width: 1.8, opacity: 0.86 },
        itemStyle: { color: success },
        areaStyle: {
          color: {
            type: "linear",
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: colorWithAlpha(success, 0.08) },
              { offset: 1, color: colorWithAlpha(success, 0) },
            ],
          },
        },
      },
    ],
  };
}

watch(
  () => visitTrendDateRange.value,
  () => fetchVisitTrendData(),
  { immediate: true }
);
watch(
  () => [settingsStore.resolvedTheme, settingsStore.themeColors, locale.value],
  () => {
    if (!visitTrendData.value) return;

    requestAnimationFrame(() => {
      if (visitTrendData.value) updateVisitTrendChartOptions(visitTrendData.value);
    });
  },
  { deep: true }
);
onMounted(() => {
  fetchVisitOverviewData();
});
</script>

<style lang="scss" scoped>
// Tokens
$gap: 12px;
$pad: 10px;
%card {
  overflow: hidden;
  background: var(--el-bg-color-overlay);
  border: 1px solid var(--card-border);
  border-radius: var(--card-radius);
  box-shadow: var(--card-shadow);
}

// Page
.dash {
  @apply 'flex flex-col';
  gap: $gap;
  padding: $pad;
  @apply '[background:var(--page-bg)]';
}

// Header
.dash-header {
  &__card {
    @apply 'flex flex-wrap gap-[18px] items-center justify-between min-h-[78px] p-[16px_18px]';
  }

  &__start {
    @apply 'flex [flex:1] gap-[12px] items-center min-w-[260px]';
  }

  &__text {
    @apply 'flex flex-col gap-[3px]';
  }

  &__greeting {
    @apply 'm-0 text-[18px] font-medium leading-[1.3] text-[var(--el-text-color-primary)]';
  }

  &__date {
    @apply 'm-0 text-[14px] text-[var(--el-text-color-secondary)]';
  }

  &__end {
    @apply 'flex flex-wrap gap-[8px] items-center justify-end';
  }
}

.dash-avatar {
  @apply 'flex shrink-0 items-center justify-center w-[40px] h-[40px] overflow-hidden text-[var(--el-color-primary)] [background:color-mix(in_srgb,_var(--el-color-primary)_14%,_var(--el-bg-color-overlay))] [border:1px_solid_color-mix(in_srgb,_var(--el-color-primary)_18%,_transparent)] rounded-[50%]';

  img {
    @apply 'w-full h-full object-cover';
  }
}

// Quick links
.quick-link {
  @apply 'inline-flex gap-[6px] items-center justify-center h-[30px] p-[0_10px] text-[14px] text-[var(--el-text-color-secondary)] [text-decoration:none] [background:var(--el-fill-color-extra-light)] [border:1px_solid_var(--el-border-color-lighter)] rounded-[6px] [transition:color_0.15s,_background-color_0.15s,_border-color_0.15s]';

  .el-icon,
  [class^="i-svg:"] {
    width: 15px;
    height: 15px;
    font-size: 16px;
    color: currentcolor;
  }

  &:hover {
    color: var(--el-color-primary);
    background: color-mix(in srgb, var(--el-color-primary) 7%, var(--el-bg-color-overlay));
    border-color: color-mix(in srgb, var(--el-color-primary) 20%, var(--el-border-color-lighter));
  }
}

// Stat cards
.dash-stats {
  @apply 'grid [grid-template-columns:repeat(3,_1fr)]';
  gap: $gap;
}

.stat-card {
  @apply 'flex gap-[14px] items-center min-h-[84px] p-[18px]';
  @extend %card;

  &__icon {
    @apply 'flex shrink-0 items-center justify-center w-[44px] h-[44px] rounded-[10px]';

    &--visitor {
      @apply 'text-[var(--el-color-primary)] [background:color-mix(in_srgb,_var(--el-color-primary)_8%,_var(--el-bg-color-overlay))]';
    }
    &--view {
      @apply 'text-[var(--el-color-primary)] [background:color-mix(in_srgb,_var(--el-color-primary)_8%,_var(--el-bg-color-overlay))]';
    }
    &--account {
      @apply 'text-[var(--el-color-primary)] [background:color-mix(in_srgb,_var(--el-color-primary)_8%,_var(--el-bg-color-overlay))]';
    }
  }

  &__svg {
    @apply 'w-[20px] h-[20px] text-[20px] text-[currentcolor]';
  }

  &__body {
    @apply 'flex [flex:1] flex-col min-w-0';
  }

  &__num {
    @apply 'text-[24px] font-semibold leading-[1.15] text-[var(--el-text-color-primary)]';
  }

  &__label {
    @apply 'mb-[3px] text-[14px] text-[var(--el-text-color-secondary)]';
  }

  &__trend {
    @apply 'inline-flex shrink-0 gap-[3px] items-center text-[14px] font-bold text-[var(--el-text-color-secondary)]';

    &--success {
      @apply 'text-[var(--el-color-success)]';
    }

    &--danger {
      @apply 'text-[var(--el-color-danger)]';
    }
  }
}

// Generic card
.card {
  @apply 'flex flex-col';
  @extend %card;

  &__head {
    @apply 'flex items-center justify-between min-h-[48px] p-[13px_18px] [border-bottom:1px_solid_var(--card-border)]';
  }

  &__title {
    @apply 'm-0 text-[14px] font-semibold text-[var(--el-text-color-primary)]';
  }

  &__body {
    @apply 'p-[16px_18px_18px]';

    &--chart {
      @apply 'p-[14px_18px_16px]';
    }

  }
}

.dash-header__card {
  @apply 'flex-row';
}

.dash-chart,
.dash-chart__trend {
  @apply 'min-w-0';
}

// Responsive
@media (max-width: 1200px) {
  .dash-stats {
    @apply '[grid-template-columns:repeat(2,_1fr)]';
  }
  .dash-header__card {
    @apply 'flex-col items-start';
  }

  .dash-header__end {
    @apply 'justify-start';
  }
}

@media (max-width: 768px) {
  .dash {
    @apply 'gap-[10px] p-[10px]';
  }

  .dash-stats {
    @apply '[grid-template-columns:1fr]';
  }
}
</style>
