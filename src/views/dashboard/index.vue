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

    <div
      v-if="summary && hasSummaryItems"
      class="grid grid-cols-1 gap-[var(--page-gap)] md:grid-cols-2 xl:grid-cols-4"
    >
      <SectionCard v-for="card in summaryCards" :key="card.key" :title="card.title">
        <div class="flex flex-wrap gap-x-6 gap-y-3">
          <div v-for="item in card.items" :key="item.label" class="flex flex-col min-w-0">
            <span class="mb-[3px] text-[14px] text-muted">{{ item.label }}</span>
            <span class="text-[24px] font-semibold leading-[1.15] text-strong">
              {{ item.value }}
            </span>
          </div>
        </div>
      </SectionCard>
    </div>
    <SectionCard v-else-if="summary">
      <el-empty :description="$t('dashboard.noAccessibleStats')" />
    </SectionCard>

    <SectionCard :title="$t('dashboard.businessTrend')">
      <template #actions>
        <el-radio-group v-model="trendDays" size="small">
          <el-radio-button :label="$t('dashboard.lastDays', { days: 7 })" :value="7" />
          <el-radio-button :label="$t('dashboard.lastDays', { days: 30 })" :value="30" />
        </el-radio-group>
      </template>
      <div v-loading="trendLoading">
        <ECharts v-if="hasTrendSeries" :options="trendChartOptions" height="260px" />
        <el-empty
          v-else
          :description="trend ? $t('dashboard.noAccessibleStats') : $t('common.noData')"
        />
      </div>
    </SectionCard>
  </PageShell>
</template>

<script setup lang="ts">
defineOptions({ name: "Dashboard", inheritAttrs: false });

import { ref } from "vue";
import { dashboardService } from "@/services";
import type {
  DashboardInquiryCounts,
  DashboardSummary,
  DashboardTrend,
  DashboardTrendDays,
} from "@/types/dashboard";
import { useUserStore } from "@/stores/user";
import { useSettingsStore } from "@/stores/settings";
import { ElMessage } from "element-plus";
import { User } from "@element-plus/icons-vue";
import PageShell from "@/components/PageShell/index.vue";
import SectionCard from "@/components/SectionCard/index.vue";
import { useRefreshOnActivated } from "@/composables";

interface SummaryCard {
  key: string;
  title: string;
  items: Array<{ label: string; value: number }>;
}

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

function showError(error: unknown) {
  ElMessage.error(error instanceof Error ? error.message : t("request.failed"));
}

const summary = ref<DashboardSummary>();

function inquiryItems(counts: DashboardInquiryCounts) {
  return [
    { label: t("inquiry.statuses.new"), value: counts.new },
    { label: t("inquiry.statuses.planning"), value: counts.planning },
    { label: t("inquiry.statuses.quoted"), value: counts.quoted },
  ];
}

// null 为无权读取，整张卡片不显示；0 照常展示。
const summaryCards = computed<SummaryCard[]>(() => {
  const data = summary.value;
  if (!data) return [];
  const cards: SummaryCard[] = [];
  if (data.inquiries) {
    cards.push({
      key: "inquiries",
      title: t("route.inquiries"),
      items: inquiryItems(data.inquiries),
    });
  }
  if (data.websiteInquiries) {
    cards.push({
      key: "websiteInquiries",
      title: t("route.websiteInquiries"),
      items: inquiryItems(data.websiteInquiries),
    });
  }
  if (data.tours) {
    cards.push({
      key: "tours",
      title: t("route.tours"),
      items: [
        { label: t("dashboard.activeTours"), value: data.tours.active },
        { label: t("dashboard.departingThisWeek"), value: data.tours.departingThisWeek },
      ],
    });
  }
  if (data.guideLeavesToday !== null) {
    cards.push({
      key: "guideLeavesToday",
      title: t("dashboard.guideLeaves"),
      items: [{ label: t("dashboard.guideLeaveRecordsToday"), value: data.guideLeavesToday }],
    });
  }
  return cards;
});
const hasSummaryItems = computed(() => summaryCards.value.length > 0);

async function fetchSummary() {
  try {
    summary.value = await dashboardService.getSummary();
  } catch (error) {
    showError(error);
  }
}

const trendDays = ref<DashboardTrendDays>(7);
const trend = ref<DashboardTrend>();
const trendLoading = ref(false);
const trendChartOptions = ref({});
const hasTrendSeries = computed(
  () => !!trend.value && (trend.value.newInquiries !== null || trend.value.departingTours !== null),
);
let trendVersion = 0;

async function fetchTrend() {
  const version = ++trendVersion;
  trendLoading.value = true;
  trend.value = undefined;
  try {
    const result = await dashboardService.getTrend(trendDays.value);
    if (version !== trendVersion) return;
    trend.value = result;
    updateTrendChartOptions(result);
  } catch (error) {
    if (version === trendVersion) showError(error);
  } finally {
    if (version === trendVersion) trendLoading.value = false;
  }
}

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

function lineSeries(name: string, data: number[], color: string, areaAlpha: number) {
  return {
    name,
    type: "line",
    data,
    smooth: true,
    symbol: "circle",
    symbolSize: 5,
    showSymbol: false,
    lineStyle: { color, width: 2 },
    itemStyle: { color },
    areaStyle: {
      color: {
        type: "linear",
        x: 0,
        y: 0,
        x2: 0,
        y2: 1,
        colorStops: [
          { offset: 0, color: colorWithAlpha(color, areaAlpha) },
          { offset: 1, color: colorWithAlpha(color, 0) },
        ],
      },
    },
  };
}

function updateTrendChartOptions(d: DashboardTrend) {
  const primary = getCssVar("--el-color-primary", "#409eff");
  const success = getCssVar("--el-color-success", "#67c23a");
  const textSecondary = getCssVar("--el-text-color-secondary", "#909399");
  const borderLighter = getCssVar("--el-border-color-lighter", "#ebeef5");
  const gridLine = colorWithAlpha(borderLighter, 0.72);

  // 只绘制有权读取的序列；null 序列不画成全 0。
  const series = [];
  if (d.newInquiries) {
    series.push(lineSeries(t("dashboard.newInquiries"), d.newInquiries, primary, 0.16));
  }
  if (d.departingTours) {
    series.push(lineSeries(t("dashboard.departingTours"), d.departingTours, success, 0.1));
  }

  trendChartOptions.value = {
    tooltip: {
      trigger: "axis",
      borderWidth: 0,
      padding: [8, 12],
      extraCssText: "box-shadow: var(--el-box-shadow-light); border-radius: 6px;",
    },
    legend: {
      data: series.map((item) => item.name),
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
      minInterval: 1,
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { type: "dashed", color: gridLine, width: 1 } },
      axisLabel: { fontSize: 14, color: textSecondary },
    },
    series,
  };
}

watch(trendDays, () => fetchTrend(), { immediate: true });
watch(
  () => [settingsStore.resolvedTheme, settingsStore.themeColors, locale.value],
  () => {
    if (!trend.value) return;

    requestAnimationFrame(() => {
      if (trend.value) updateTrendChartOptions(trend.value);
    });
  },
  { deep: true },
);
onMounted(() => {
  fetchSummary();
});
// 趋势按天汇总且刷新会重绘图表，切回时只刷新概览数字。
useRefreshOnActivated(fetchSummary);
</script>
