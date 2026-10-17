<template>
  <PageShell :fill="false">
    <SectionCard>
      <div class="flex items-center gap-3 min-w-0">
        <div
          class="flex shrink-0 items-center justify-center w-10 h-10 overflow-hidden rounded-full text-[var(--el-color-primary)] bg-[var(--el-color-primary-light-9)]"
        >
          <img
            v-if="userStore.userInfo.avatar"
            :src="userStore.userInfo.avatar"
            alt=""
            class="w-full h-full object-cover"
          />
          <el-icon v-else :size="22">
            <User />
          </el-icon>
        </div>
        <div class="flex flex-col gap-[3px] min-w-0">
          <h1 class="m-0 text-[18px] font-medium leading-[1.3] text-strong">
            {{ greetings }}
          </h1>
          <p class="m-0 text-[14px] text-muted">
            {{ currentDateStr }}
          </p>
        </div>
      </div>
    </SectionCard>

    <div class="grid grid-cols-1 gap-[var(--page-gap)] md:grid-cols-2">
      <SectionCard>
        <div class="flex items-center gap-[14px]">
          <div
            class="flex shrink-0 items-center justify-center w-11 h-11 rounded-[var(--card-radius)] text-[var(--el-color-primary)] bg-[var(--el-color-primary-light-9)]"
          >
            <el-icon :size="18">
              <User />
            </el-icon>
          </div>
          <div class="flex flex-1 flex-col min-w-0">
            <span class="mb-[3px] text-[14px] text-muted">{{ $t("dashboard.todayVisitors") }}</span>
            <span class="text-[24px] font-semibold leading-[1.15] text-strong">
              {{ displayTransitionUvCount }}
            </span>
          </div>
          <span
            v-if="uvGrowthText !== '--'"
            class="inline-flex shrink-0 gap-[3px] items-center text-[14px] font-bold"
            :class="uvIsUp ? 'text-[var(--el-color-success)]' : 'text-[var(--el-color-danger)]'"
          >
            <el-icon :size="12">
              <ArrowUp v-if="uvIsUp" />
              <ArrowDown v-else />
            </el-icon>
            {{ uvGrowthText }}
          </span>
        </div>
      </SectionCard>

      <SectionCard>
        <div class="flex items-center gap-[14px]">
          <div
            class="flex shrink-0 items-center justify-center w-11 h-11 rounded-[var(--card-radius)] text-[var(--el-color-primary)] bg-[var(--el-color-primary-light-9)]"
          >
            <el-icon :size="18">
              <View />
            </el-icon>
          </div>
          <div class="flex flex-1 flex-col min-w-0">
            <span class="mb-[3px] text-[14px] text-muted">{{ $t("dashboard.todayViews") }}</span>
            <span class="text-[24px] font-semibold leading-[1.15] text-strong">
              {{ displayTransitionPvCount }}
            </span>
          </div>
          <span
            v-if="pvGrowthText !== '--'"
            class="inline-flex shrink-0 gap-[3px] items-center text-[14px] font-bold"
            :class="pvIsUp ? 'text-[var(--el-color-success)]' : 'text-[var(--el-color-danger)]'"
          >
            <el-icon :size="12">
              <ArrowUp v-if="pvIsUp" />
              <ArrowDown v-else />
            </el-icon>
            {{ pvGrowthText }}
          </span>
        </div>
      </SectionCard>
    </div>

    <SectionCard :title="$t('dashboard.visitTrend')">
      <template #actions>
        <el-radio-group v-model="visitTrendDateRange" size="small">
          <el-radio-button :label="$t('dashboard.lastDays', { days: 7 })" :value="7" />
          <el-radio-button :label="$t('dashboard.lastDays', { days: 30 })" :value="30" />
        </el-radio-group>
      </template>
      <ECharts :options="visitTrendChartOptions" height="260px" />
    </SectionCard>
  </PageShell>
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
import { User, View, ArrowUp, ArrowDown } from "@element-plus/icons-vue";
import PageShell from "@/components/PageShell/index.vue";
import SectionCard from "@/components/SectionCard/index.vue";

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

const tUv = useTransition(
  computed(() => visitOverviewData.value.todayUvCount),
  {
    duration: 800,
    transition: [0.25, 0.1, 0.25, 1.0],
  },
);
const tPv = useTransition(
  computed(() => visitOverviewData.value.todayPvCount),
  {
    duration: 800,
    transition: [0.25, 0.1, 0.25, 1.0],
  },
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
  { immediate: true },
);
watch(
  () => [settingsStore.resolvedTheme, settingsStore.themeColors, locale.value],
  () => {
    if (!visitTrendData.value) return;

    requestAnimationFrame(() => {
      if (visitTrendData.value) updateVisitTrendChartOptions(visitTrendData.value);
    });
  },
  { deep: true },
);
onMounted(() => {
  fetchVisitOverviewData();
});
</script>
