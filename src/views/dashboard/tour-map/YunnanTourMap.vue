<template>
  <div class="relative w-full aspect-[1050/1100] lg:aspect-auto lg:h-full">
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

/** 运营地图区独立深色配色，不随全站主题切换。 */
const PALETTE = {
  landTop: "#264d7e",
  landBottom: "#193560",
  border: "rgba(150, 215, 255, 0.42)",
  underlay: "#0a1932",
  active: "#7ae6ff",
  // 区域填充用不透明色，避免透出底层错位投影的描边造成重线。
  activeRegion: "#22627f",
  activeRegionBorder: "rgba(122, 230, 255, 0.55)",
  activeRegionSelected: "#2b7898",
  hoverRegion: "#2c5c8e",
  hoverBorder: "rgba(160, 220, 255, 0.75)",
  idle: "#8aa2c0",
  route: "#4ef0c0",
  label: "#e6f1ff",
  labelMuted: "#8ea3bf",
  labelHalo: "#0f2140",
  selected: "#ffffff",
};

const props = defineProps<{
  points: TourMapPoint[];
  /** 有团目的地所在州市 */
  activeRegions: string[];
  selectedRegion: string | null;
  selectedCityId: string | null;
  routeSegments: RoutePoint[][];
  /** 关闭时停用涟漪与路线箭头动画，保留静态标记 */
  animate: boolean;
}>();

const emit = defineEmits<{
  "city-click": [cityId: string];
  "region-click": [adcode: string];
}>();

const { t, locale } = useI18n();
const chartRef = ref<HTMLDivElement | null>(null);
const mapLoadError = ref("");
let chart: echarts.ECharts | null = null;
let isUnmounted = false;

watch(
  () => [props, locale.value],
  () => render(),
  { deep: true },
);

onMounted(initChart);
onBeforeUnmount(() => {
  isUnmounted = true;
  chart?.dispose();
  chart = null;
});
// v-show 隐藏时容器为 0×0，此时 resize 会让 SVG geo 视图矩阵不可逆并使实例失效，切回后地图空白。
useResizeObserver(chartRef, (entries) => {
  const rect = entries[0]?.contentRect;
  if (rect?.width && rect.height) chart?.resize();
});

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

function toDatum(point: TourMapPoint): PointDatum {
  const isSelected = point.cityId === props.selectedCityId;
  return {
    name: point.name,
    value: point.coord,
    cityId: point.cityId,
    tourCount: point.tourCount,
    peopleCount: point.peopleCount,
    ...(isSelected ? { itemStyle: { borderColor: PALETTE.selected, borderWidth: 2 } } : {}),
  };
}

function render() {
  if (!chart) return;
  const activePoints = props.points.filter((point) => point.tourCount > 0);
  const idlePoints = props.points.filter((point) => point.tourCount === 0);
  const regions = props.activeRegions.map((adcode) => ({
    name: adcode,
    itemStyle: {
      areaColor:
        adcode === props.selectedRegion ? PALETTE.activeRegionSelected : PALETTE.activeRegion,
      borderColor: PALETTE.activeRegionBorder,
    },
  }));
  if (props.selectedRegion && !props.activeRegions.includes(props.selectedRegion)) {
    regions.push({
      name: props.selectedRegion,
      itemStyle: { areaColor: PALETTE.hoverRegion, borderColor: PALETTE.hoverBorder },
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
    color: PALETTE.label,
    textBorderColor: PALETTE.labelHalo,
    textBorderWidth: 3,
  };
  // 两层 geo 共用同一 SVG 配准：底层略微错位形成立体投影，业务点线只落在上层。
  const geoLayout = { layoutCenter: ["50%", "50%"], layoutSize: "100%" };

  chart.setOption(
    {
      tooltip: {
        trigger: "item",
        confine: true,
        backgroundColor: "rgba(7, 15, 28, 0.94)",
        borderColor: "rgba(56, 217, 255, 0.35)",
        borderWidth: 1,
        padding: [8, 12],
        textStyle: { color: "#dbe7f5", fontSize: 12 },
        extraCssText:
          "box-shadow: 0 8px 28px rgba(0,0,0,0.45); border-radius: 8px; max-width: min(480px, calc(100vw - 24px)); white-space: normal; overflow-wrap: anywhere;",
      },
      geo: [
        {
          map: YUNNAN_MAP_NAME,
          roam: false,
          silent: true,
          layoutCenter: ["50.8%", "51.6%"],
          layoutSize: "100%",
          label: { show: false },
          itemStyle: {
            areaColor: PALETTE.underlay,
            borderWidth: 0,
            shadowColor: "rgba(0, 0, 0, 0.45)",
            shadowBlur: 28,
          },
          tooltip: { show: false },
          z: 0,
        },
        {
          map: YUNNAN_MAP_NAME,
          roam: false,
          ...geoLayout,
          label: { show: false },
          itemStyle: {
            areaColor: {
              type: "linear",
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: PALETTE.landTop },
                { offset: 1, color: PALETTE.landBottom },
              ],
            },
            borderColor: PALETTE.border,
            borderWidth: 0.8,
          },
          emphasis: {
            label: { show: false },
            itemStyle: { areaColor: PALETTE.hoverRegion, borderColor: PALETTE.hoverBorder },
          },
          select: { disabled: true },
          regions,
          tooltip: {
            show: true,
            formatter: (params: { name: string }) =>
              escapeText(YUNNAN_REGION_NAMES.get(params.name) ?? params.name),
          },
          z: 1,
        },
      ],
      series: [
        {
          id: "idle-cities",
          type: "scatter",
          coordinateSystem: "geo",
          geoIndex: 1,
          symbolSize: 5,
          itemStyle: { color: PALETTE.idle },
          label: { ...pointLabel, color: PALETTE.labelMuted, formatter: "{b}" },
          labelLayout: { hideOverlap: true },
          tooltip: { formatter: (params: { data: PointDatum }) => pointTooltip(params.data) },
          data: idlePoints.map(toDatum),
          zlevel: 1,
        },
        {
          id: "route",
          type: "lines",
          coordinateSystem: "geo",
          geoIndex: 1,
          silent: true,
          tooltip: { show: false },
          lineStyle: {
            color: PALETTE.route,
            width: 1.4,
            opacity: 0.85,
            curveness: 0.12,
            shadowColor: PALETTE.route,
            shadowBlur: 4,
          },
          effect: {
            show: props.animate,
            period: 4,
            symbol: "arrow",
            symbolSize: 6,
            color: "#ffffff",
            trailLength: 0.25,
          },
          symbol: props.animate ? ["none", "none"] : ["none", "arrow"],
          symbolSize: 6,
          data: routeLines,
          zlevel: 2,
        },
        {
          id: "active-cities",
          // 减少动态效果或视图未激活时退回静态散点，停掉涟漪重绘。
          type: props.animate ? "effectScatter" : "scatter",
          coordinateSystem: "geo",
          geoIndex: 1,
          rippleEffect: { brushType: "stroke", scale: 2.4, color: PALETTE.active },
          symbolSize: (_value: unknown, params: { data: PointDatum }) =>
            7 + Math.min(params.data.tourCount, 10) * 0.5,
          itemStyle: { color: PALETTE.active, shadowBlur: 8, shadowColor: PALETTE.active },
          label: {
            ...pointLabel,
            fontWeight: 600,
            formatter: (params: { data: PointDatum }) =>
              `${params.data.name} ${params.data.tourCount}`,
          },
          labelLayout: { hideOverlap: true },
          tooltip: { formatter: (params: { data: PointDatum }) => pointTooltip(params.data) },
          data: activePoints.map(toDatum),
          zlevel: 3,
        },
      ],
    },
    { notMerge: true },
  );
}
</script>
