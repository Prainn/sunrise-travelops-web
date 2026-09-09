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
        <div class="dash-header__end">
          <a
            href="https://github.com/youlaitech/vue3-element-admin"
            target="_blank"
            title="GitHub"
            class="quick-link"
          >
            <span class="i-svg:github" />
            <span>GitHub</span>
          </a>
          <a
            href="https://gitee.com/youlaiorg/vue3-element-admin"
            target="_blank"
            title="Gitee"
            class="quick-link"
          >
            <span class="i-svg:gitee" />
            <span>Gitee</span>
          </a>
          <a
            href="https://gitcode.com/youlai/vue3-element-admin"
            target="_blank"
            title="GitCode"
            class="quick-link"
          >
            <span class="i-svg:gitcode" />
            <span>GitCode</span>
          </a>
          <a
            href="https://juejin.cn/post/7228990409909108793"
            target="_blank"
            :title="$t('dashboard.documentation')"
            class="quick-link"
          >
            <el-icon><Document /></el-icon>
            <span>{{ $t("dashboard.documentation") }}</span>
          </a>
          <a
            href="https://www.bilibili.com/video/BV1eFUuYyEFj"
            target="_blank"
            :title="$t('dashboard.video')"
            class="quick-link"
          >
            <el-icon><VideoPlay /></el-icon>
            <span>{{ $t("dashboard.video") }}</span>
          </a>
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
              :label="$t('dashboard.lastDays', { count: 7 })"
              :value="7"
            />
            <el-radio-button
              :label="$t('dashboard.lastDays', { count: 30 })"
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

      <div class="card dash-chart__overview">
        <div class="card__head">
          <h3 class="card__title">
            {{ $t("dashboard.todoOverview") }}
          </h3>
          <el-tag
            type="primary"
            size="small"
            effect="plain"
          >
            {{ $t("dashboard.pendingCount", { count: 5 }) }}
          </el-tag>
        </div>
        <div class="card__body overview-card flex [flex:1] flex-col gap-[20px] min-h-0">
          <div class="overview-summary">
            <div
              v-for="item in todoSummaryItems"
              :key="item.label"
              class="overview-summary__item"
            >
              <span class="overview-summary__label">{{ item.label }}</span>
              <strong class="overview-summary__value">{{ item.value }}</strong>
            </div>
          </div>
          <div class="overview-bars">
            <div
              v-for="item in todoOverviewItems"
              :key="item.label"
              class="overview-bars__item"
              :style="{
                '--overview-percent': `${item.percent}%`,
              }"
            >
              <div class="overview-bars__meta">
                <span class="overview-bars__label">
                  <span class="overview-bars__dot" />
                  {{ item.label }}
                </span>
                <span class="overview-bars__value">
                  {{ $t("dashboard.itemCount", { count: item.value }) }}
                </span>
              </div>
              <span class="overview-bars__track">
                <span class="overview-bars__bar" />
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="dash-bottom">
      <div class="card">
        <div class="card__head">
          <h3 class="card__title">
            {{ $t("dashboard.todoItems") }}
          </h3>
          <el-tag
            size="small"
            round
          >
            {{ $t("dashboard.itemCount", { count: 5 }) }}
          </el-tag>
        </div>
        <div class="card__body">
          <div
            v-for="todo in todoItems"
            :key="todo.id"
            class="todo-row"
            :class="{ 'todo-row--done': todo.done }"
          >
            <el-icon
              :size="16"
              :class="todo.done ? 'todo-row__icon--done' : 'todo-row__icon--pending'"
            >
              <CircleCheck v-if="todo.done" />
              <Clock v-else />
            </el-icon>
            <span class="todo-row__title">{{ todo.title }}</span>
            <el-tag
              :type="todo.done ? 'success' : todo.tone"
              size="small"
              effect="plain"
              class="todo-row__tag"
            >
              {{ todo.tag }}
            </el-tag>
            <span class="todo-row__time">{{ todo.time }}</span>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card__head">
          <h3 class="card__title">
            {{ $t("dashboard.systemActivity") }}
          </h3>
        </div>
        <div class="card__body card__body--scroll">
          <div class="feed">
            <div
              v-for="item in activities"
              :key="item.id"
              class="feed__item"
            >
              <span class="feed__dot" />
              <span class="feed__text">{{ item.content }}</span>
              <span class="feed__time">{{ item.time }}</span>
            </div>
          </div>
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
  Clock,
  CircleCheck,
  Document,
  VideoPlay,
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

interface TodoItem {
  id: number;
  title: string;
  tag: string;
  time: string;
  done: boolean;
  tone: "warning" | "info";
}

const todoItems = computed<TodoItem[]>(() => [
  {
    id: 1,
    title: t("dashboard.todos.leaveRequest"),
    tag: t("dashboard.todoTypes.approval"),
    time: t("dashboard.time.minutesAgo", { count: 10 }),
    done: false,
    tone: "info",
  },
  {
    id: 2,
    title: t("dashboard.todos.verifyUser"),
    tag: t("dashboard.todoTypes.review"),
    time: t("dashboard.time.minutesAgo", { count: 30 }),
    done: false,
    tone: "info",
  },
  {
    id: 3,
    title: t("dashboard.todos.publishNotice"),
    tag: t("dashboard.todoTypes.notice"),
    time: t("dashboard.time.hoursAgo", { count: 1 }),
    done: false,
    tone: "info",
  },
  {
    id: 4,
    title: t("dashboard.todos.processTicket"),
    tag: t("dashboard.todoTypes.ticket"),
    time: t("dashboard.time.hoursAgo", { count: 2 }),
    done: false,
    tone: "warning",
  },
  {
    id: 5,
    title: t("dashboard.todos.updatePermissions"),
    tag: t("dashboard.todoTypes.configuration"),
    time: t("dashboard.time.yesterdayAt", { time: "15:30" }),
    done: true,
    tone: "info",
  },
]);

interface Activity {
  id: number;
  content: string;
  time: string;
}

const activities = computed<Activity[]>(() => [
  {
    id: 1,
    content: t("dashboard.activities.adminLogin"),
    time: t("dashboard.time.minutesAgo", { count: 3 }),
  },
  {
    id: 2,
    content: t("dashboard.activities.userCreated"),
    time: t("dashboard.time.minutesAgo", { count: 25 }),
  },
  {
    id: 3,
    content: t("dashboard.activities.loginPolicyUpdated"),
    time: t("dashboard.time.hoursAgo", { count: 1 }),
  },
  {
    id: 4,
    content: t("dashboard.activities.backupCompleted"),
    time: t("dashboard.time.hoursAgo", { count: 3 }),
  },
  {
    id: 5,
    content: t("dashboard.activities.permissionsUpdated"),
    time: t("dashboard.time.yesterdayAt", { time: "16:42" }),
  },
  {
    id: 6,
    content: t("dashboard.activities.certificateRenewed"),
    time: t("dashboard.time.yesterdayAt", { time: "09:15" }),
  },
]);

const todoOverviewItems = computed(() => [
  { label: t("dashboard.todoTypes.approval"), value: "2", percent: 40, tone: "primary" },
  { label: t("dashboard.todoTypes.review"), value: "1", percent: 20, tone: "primary" },
  { label: t("dashboard.todoTypes.notice"), value: "1", percent: 20, tone: "primary" },
  { label: t("dashboard.todoTypes.ticket"), value: "1", percent: 20, tone: "primary" },
]);

const todoSummaryItems = computed(() => [
  { label: t("dashboard.summary.createdToday"), value: "3", tone: "primary" },
  { label: t("dashboard.summary.dueSoon"), value: "1", tone: "primary" },
  { label: t("dashboard.summary.completedToday"), value: "1", tone: "success" },
]);

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

    &--scroll {
      @apply '[flex:1] p-0 overflow-y-auto';
    }
  }
}

.dash-header__card {
  @apply 'flex-row';
}

// Chart & bottom grids
.dash-chart {
  @apply 'grid [grid-template-columns:minmax(0,_3fr)_minmax(280px,_1fr)]';
  gap: $gap;
}

.dash-chart__trend,
.dash-chart__overview {
  @apply 'min-w-0';
}

.overview-bars {
  @apply 'flex [flex:1] flex-col justify-between min-h-[142px] p-0';

  &__item {
    @apply 'flex flex-col gap-[7px]';
  }

  &__meta {
    @apply 'flex gap-[10px] items-center justify-between min-w-0';
  }

  &__label,
  &__value {
    font-size: 14px;
    color: var(--el-text-color-secondary);
  }

  &__value {
    @apply 'shrink-0 text-right';
  }

  &__label {
    @apply 'inline-flex gap-[6px] items-center min-w-0';
  }

  &__dot {
    @apply 'w-[6px] h-[6px] [background:var(--el-color-primary)] rounded-[50%]';
  }

  &__track {
    @apply 'h-[5px] overflow-hidden [background:color-mix(in_srgb,_var(--el-color-primary)_10%,_var(--el-fill-color-light))] rounded-[999px]';
  }

  &__bar {
    @apply 'block w-[var(--overview-percent)] h-full';
    background: linear-gradient(90deg, var(--el-color-primary), var(--el-color-primary-light-3));
    @apply 'rounded-[inherit]';
  }
}

.overview-summary {
  @apply 'grid [grid-template-columns:repeat(3,_minmax(0,_1fr))] gap-[8px]';

  &__item {
    @apply 'relative flex flex-col justify-center min-w-0 min-h-[64px] p-[12px] overflow-hidden [background:color-mix(in_srgb,_var(--el-color-primary)_4%,_var(--el-bg-color-overlay))] [border:1px_solid_color-mix(in_srgb,_var(--el-color-primary)_10%,_var(--el-border-color-lighter))] rounded-[6px]';

    &:nth-child(2) {
      background: color-mix(in srgb, var(--el-color-primary) 6%, var(--el-bg-color-overlay));
      border-color: color-mix(in srgb, var(--el-color-primary) 14%, var(--el-border-color-lighter));

      &::before {
        background: color-mix(in srgb, var(--el-color-primary) 48%, transparent);
      }

      .overview-summary__value {
        @apply 'text-[var(--el-color-warning)]';
      }
    }

    &:nth-child(3) {
      background: color-mix(in srgb, var(--el-color-primary) 3%, var(--el-bg-color-overlay));
      border-color: color-mix(in srgb, var(--el-color-primary) 8%, var(--el-border-color-lighter));

      &::before {
        background: color-mix(in srgb, var(--el-color-primary) 36%, transparent);
      }

      .overview-summary__value {
        @apply 'text-[var(--el-color-success)]';
      }
    }

    &::before {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 2px;
      content: "";
      background: color-mix(in srgb, var(--el-color-primary) 62%, transparent);
    }
  }

  &__label {
    @apply 'overflow-hidden text-ellipsis text-[14px] text-[var(--el-text-color-secondary)] whitespace-nowrap';
  }

  &__value {
    @apply 'shrink-0 mt-[5px] text-[18px] font-semibold leading-[1.1] text-[var(--el-color-primary)]';
  }
}

.dash-bottom {
  @apply 'grid [grid-template-columns:1fr_1fr]';
  gap: $gap;
}

// Todo rows
.todo-row {
  @apply 'flex gap-[10px] items-center p-[11px_0]';

  & + & {
    border-top: 1px solid var(--el-border-color-lighter);
  }

  &--done {
    .todo-row__title {
      @apply 'text-[var(--el-text-color-placeholder)] [text-decoration:line-through]';
    }
  }

  &__icon--pending {
    @apply 'shrink-0 text-[var(--el-color-primary)]';
  }
  &__icon--done {
    @apply 'shrink-0 text-[var(--el-color-success)]';
  }

  &__title {
    @apply '[flex:1] min-w-0 overflow-hidden text-ellipsis text-[14px] text-[var(--el-text-color-regular)] whitespace-nowrap';
  }

  &__tag {
    @apply 'shrink-0 text-[var(--el-text-color-secondary)] [background:var(--el-fill-color-light)]';

    &.el-tag--warning {
      color: color-mix(in srgb, var(--el-color-warning) 78%, var(--el-text-color-primary));
      background: color-mix(in srgb, var(--el-color-warning) 9%, var(--el-bg-color-overlay));
    }

    &.el-tag--success {
      color: var(--el-color-success);
      background: color-mix(in srgb, var(--el-color-success) 8%, var(--el-bg-color-overlay));
    }
  }

  &__time {
    @apply 'shrink-0 text-[14px] text-[var(--el-text-color-secondary)]';
  }
}

// Activity feed
.feed {
  @apply 'flex flex-col p-[10px_20px_16px]';

  &__item {
    @apply 'relative flex flex-wrap gap-[8px] items-baseline p-[10px_0_10px_16px]';

    &::before {
      position: absolute;
      top: 22px;
      bottom: -4px;
      left: 3px;
      width: 1px;
      content: "";
      background: var(--el-border-color-lighter);
    }

    &:last-child::before {
      display: none;
    }
  }

  &__dot {
    @apply 'absolute top-[12px] left-0 w-[7px] h-[7px] [background:var(--el-color-primary)] [border:2px_solid_var(--el-color-primary-light-8)] rounded-[50%]';
  }

  &__text {
    @apply '[flex:1] min-w-0 text-[14px] leading-[1.4] text-[var(--el-text-color-regular)]';
  }

  &__time {
    @apply 'shrink-0 text-[14px] text-[var(--el-text-color-secondary)]';
  }
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

@media (max-width: 992px) {
  .dash-chart {
    @apply '[grid-template-columns:1fr]';
  }

  .dash-bottom {
    @apply '[grid-template-columns:1fr]';
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
