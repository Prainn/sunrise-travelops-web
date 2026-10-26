<template>
  <div class="relative w-full aspect-[1050/1100]">
    <div ref="chartRef" class="absolute inset-0"></div>
    <div
      v-if="mapLoadError"
      class="absolute inset-0 flex flex-col items-center justify-center gap-3 text-[14px] text-muted"
    >
      <span>{{ mapLoadError }}</span>
      <el-button size="small" @click="initChart">
        {{ $t("common.retry") }}
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import * as echarts from "echarts/core";
import { EffectScatterChart, LinesChart, ScatterChart } from "echarts/charts";
import { GeoComponent, TooltipComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import { useResizeObserver } from "@vueuse/core";
import { useI18n } from "vue-i18n";
import { useSettingsStore } from "@/stores/settings";
import { colorWithAlpha, getCssVar } from "@/utils/theme";
import {
  YUNNAN_MAP_NAME,
  YUNNAN_REGION_NAMES,
  type RoutePoint,
  type TourMapPoint,
} from "./tour-map";

interface PointDatum {
  name: string;
  value: [number, number];
  cityId: string;
  tourCount: number;
  peopleCount: number;
  itemStyle?: { borderColor: string; borderWidth: number };
}

echarts.use([
  CanvasRenderer,
  GeoComponent,
  TooltipComponent,
  ScatterChart,
  EffectScatterChart,
  LinesChart,
]);

const props = defineProps<{
  points: TourMapPoint[];
  /** 有团目的地所在州市 */
  activeRegions: string[];
  selectedRegion: string | null;
  selectedCityId: string | null;
  routeSegments: RoutePoint[][];
}>();

const emit = defineEmits<{
  "city-click": [cityId: string];
  "region-click": [adcode: string];
}>();

const { t, locale } = useI18n();
const settingsStore = useSettingsStore();
const chartRef = ref<HTMLDivElement | null>(null);
const mapLoadError = ref("");
let chart: echarts.ECharts | null = null;
let isUnmounted = false;

watch(
  () => [props, locale.value],
  () => render(),
  { deep: true },
);
// 主题变量在切换后的下一帧才写入根元素。
watch(
  () => [settingsStore.resolvedTheme, settingsStore.themeColors],
  () => requestAnimationFrame(render),
  { deep: true },
);

onMounted(initChart);
onBeforeUnmount(() => {
  isUnmounted = true;
  chart?.dispose();
  chart = null;
});
useResizeObserver(chartRef, () => chart?.resize());

async function initChart() {
  mapLoadError.value = "";
  try {
    // 底图约 300KB，按需加载，避免无地图权限的首页也下载。
    if (!echarts.getMap(YUNNAN_MAP_NAME)) {
      const { default: svg } = await import("@/assets/maps/yunnan/yunnan-regions.svg?raw");
      echarts.registerMap(YUNNAN_MAP_NAME, { svg });
    }
  } catch (error) {
    mapLoadError.value = error instanceof Error ? error.message : t("common.loadFailed");
    return;
  }
  if (isUnmounted || !chartRef.value) return;
  chart = echarts.init(chartRef.value);
  chart.on("click", handleChartClick);
  render();
}

function handleChartClick(params: echarts.ECElementEvent) {
  if (params.componentType === "geo") {
    emit("region-click", params.name);
    return;
  }
  const datum = params.data as Partial<PointDatum> | undefined;
  if (params.componentType === "series" && datum?.cityId) emit("city-click", datum.cityId);
}

function escapeText(value: string | number) {
  return echarts.format.encodeHTML(String(value));
}

function pointTooltip(datum: PointDatum) {
  const summary = datum.tourCount
    ? t("dashboard.tourMap.pointSummary", {
      tours: datum.tourCount,
      people: datum.peopleCount,
    })
    : t("dashboard.tourMap.noToursHere");
  return `${escapeText(datum.name)}<br/>${escapeText(summary)}`;
}

function toDatum(point: TourMapPoint, primary: string): PointDatum {
  const isSelected = point.cityId === props.selectedCityId;
  return {
    name: point.name,
    value: point.coord,
    cityId: point.cityId,
    tourCount: point.tourCount,
    peopleCount: point.peopleCount,
    ...(isSelected ? { itemStyle: { borderColor: primary, borderWidth: 3 } } : {}),
  };
}

function render() {
  if (!chart) return;
  const primary = getCssVar("--el-color-primary", "#409eff");
  const success = getCssVar("--el-color-success", "#67c23a");
  const surface = getCssVar("--el-bg-color", "#ffffff");
  const regionFill = getCssVar("--el-fill-color-light", "#f5f7fa");
  const regionBorder = getCssVar("--el-border-color", "#dcdfe6");
  const textRegular = getCssVar("--el-text-color-regular", "#606266");
  const textMuted = getCssVar("--el-text-color-placeholder", "#a8abb2");

  const activePoints = props.points.filter((point) => point.tourCount > 0);
  const idlePoints = props.points.filter((point) => point.tourCount === 0);
  const regions = props.activeRegions.map((adcode) => ({
    name: adcode,
    itemStyle: {
      areaColor: colorWithAlpha(primary, adcode === props.selectedRegion ? 0.34 : 0.16),
    },
  }));
  if (props.selectedRegion && !props.activeRegions.includes(props.selectedRegion)) {
    regions.push({
      name: props.selectedRegion,
      itemStyle: { areaColor: colorWithAlpha(primary, 0.24) },
    });
  }
  const routeLines = props.routeSegments.flatMap((segment) =>
    segment.slice(1).map((point, index) => ({
      coords: [(segment[index] ?? point).coord, point.coord],
    })),
  );
  const pointLabel = {
    show: true,
    position: "right" as const,
    distance: 6,
    fontSize: 12,
    color: textRegular,
    textBorderColor: surface,
    textBorderWidth: 2,
  };

  chart.setOption(
    {
      tooltip: {
        trigger: "item",
        borderWidth: 0,
        padding: [8, 12],
        extraCssText:
          "box-shadow: var(--el-box-shadow-light); border-radius: 6px; max-width: min(480px, calc(100vw - 24px)); white-space: normal; overflow-wrap: anywhere;",
      },
      geo: {
        map: YUNNAN_MAP_NAME,
        roam: false,
        layoutCenter: ["50%", "50%"],
        layoutSize: "100%",
        label: { show: false },
        itemStyle: { areaColor: regionFill, borderColor: regionBorder, borderWidth: 1 },
        emphasis: {
          label: { show: false },
          itemStyle: { areaColor: colorWithAlpha(primary, 0.24) },
        },
        select: { disabled: true },
        regions,
        tooltip: {
          show: true,
          formatter: (params: { name: string }) =>
            escapeText(YUNNAN_REGION_NAMES.get(params.name) ?? params.name),
        },
      },
      series: [
        {
          id: "idle-cities",
          type: "scatter",
          coordinateSystem: "geo",
          symbolSize: 7,
          itemStyle: { color: textMuted },
          label: { ...pointLabel, color: textMuted, formatter: "{b}" },
          labelLayout: { hideOverlap: true },
          tooltip: { formatter: (params: { data: PointDatum }) => pointTooltip(params.data) },
          data: idlePoints.map((point) => toDatum(point, primary)),
          zlevel: 1,
        },
        {
          id: "route",
          type: "lines",
          coordinateSystem: "geo",
          silent: true,
          tooltip: { show: false },
          lineStyle: { color: success, width: 2, opacity: 0.85, curveness: 0.12 },
          effect: { show: true, period: 4, symbol: "arrow", symbolSize: 7, color: success },
          data: routeLines,
          zlevel: 2,
        },
        {
          id: "active-cities",
          type: "effectScatter",
          coordinateSystem: "geo",
          rippleEffect: { brushType: "stroke", scale: 3 },
          symbolSize: (_value: unknown, params: { data: PointDatum }) =>
            12 + Math.min(params.data.tourCount, 10),
          itemStyle: { color: primary, shadowBlur: 10, shadowColor: colorWithAlpha(primary, 0.6) },
          label: {
            ...pointLabel,
            fontWeight: 600,
            formatter: (params: { data: PointDatum }) =>
              `${params.data.name} ${params.data.tourCount}`,
          },
          labelLayout: { hideOverlap: true },
          tooltip: { formatter: (params: { data: PointDatum }) => pointTooltip(params.data) },
          data: activePoints.map((point) => toDatum(point, primary)),
          zlevel: 3,
        },
      ],
    },
    { notMerge: true },
  );
}
</script>
