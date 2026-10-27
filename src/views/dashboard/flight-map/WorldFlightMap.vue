<template>
  <div ref="containerRef" class="world-flight-map">
    <div ref="chartRef" class="absolute inset-0"></div>
    <canvas ref="canvasRef" class="world-flight-map__motion" aria-hidden="true"></canvas>
    <button
      v-if="isReady"
      type="button"
      class="world-flight-map__reset"
      :aria-label="$t('dashboard.flightMap.resetView')"
      @click="resetView"
    >
      {{ $t("dashboard.flightMap.resetView") }}
    </button>
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
import { computed, onActivated, onBeforeUnmount, onDeactivated, onMounted, ref, watch } from "vue";
import * as echarts from "echarts/core";
import { LinesChart, ScatterChart } from "echarts/charts";
import { GeoComponent, TooltipComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import { useDocumentVisibility, useIntersectionObserver, useResizeObserver } from "@vueuse/core";
import { useI18n } from "vue-i18n";
import {
  airportName,
  buildGraticule,
  computeRouteFocus,
  NATURAL_EARTH_PROJECTION,
  projectedBounds,
  projectNaturalEarth,
  WORLD_MAP_NAME,
  type FlightAirportNode,
  type FlightGroup,
  type FlightKind,
  type FlightNetwork,
  type FlightRoute,
  type LonLat,
  type ProjectedRect,
} from "./flight-map";
import { FlightRouteAnimator } from "./flight-route-animator";

interface RouteLineDatum {
  routeKey: string;
  coords: LonLat[];
  lineStyle: { color: string; width: number; opacity: number };
}

interface AirportDatum {
  name: string;
  value: LonLat;
  code: string;
}

echarts.use([CanvasRenderer, GeoComponent, TooltipComponent, LinesChart, ScatterChart]);

/** 航线配色只在地图区域内使用，接团暖色、送团冷色，双向机场用中间色。 */
const KIND_COLORS: Record<FlightKind | "mixed", string> = {
  pickup: "#6ee7b7",
  drop: "#38d9ff",
  mixed: "#c3a6ff",
};
const GRATICULE = buildGraticule().map((coords) => ({ coords }));
const TOOLTIP_GROUP_LIMIT = 4;
const TOOLTIP_TOUR_LIMIT = 3;
/** 窄屏或低核数设备减少同时运动的光点 */
const MAX_MOVERS = 40;
const MAX_MOVERS_LITE = 16;

/** 世界底图投影包围盒，随底图只计算一次。 */
let worldBounds: ProjectedRect | null = null;

const props = defineProps<{
  network: FlightNetwork;
  /** 选中路线集合；null 表示不高亮 */
  highlightRouteKeys: string[] | null;
  selectedAirport: string | null;
  /** 调用方已合并视图激活、播放开关与减少动态效果偏好 */
  animate: boolean;
}>();

const emit = defineEmits<{
  "route-click": [routeKey: string];
  "airport-click": [code: string];
}>();

const { t, locale } = useI18n();
const containerRef = ref<HTMLDivElement | null>(null);
const chartRef = ref<HTMLDivElement | null>(null);
const canvasRef = ref<HTMLCanvasElement | null>(null);
const mapLoadError = ref("");
const isReady = ref(false);
const isActivated = ref(true);
const isIntersecting = ref(true);
const visibility = useDocumentVisibility();
let chart: echarts.ECharts | null = null;
let animator: FlightRouteAnimator | null = null;
let isUnmounted = false;

const groupsByKey = computed(() => new Map(props.network.groups.map((group) => [group.key, group])));
const shouldAnimate = computed(
  () =>
    isReady.value &&
    props.animate &&
    isActivated.value &&
    isIntersecting.value &&
    visibility.value === "visible" &&
    props.network.routes.length > 0,
);

// 恢复时动画层按当前时间计算相位，不补跑暂停期间的帧。
watch(shouldAnimate, (value) => (value ? animator?.start() : animator?.stop()));
watch(
  () => [props.network, locale.value],
  () => render(true),
);
watch(
  () => [props.highlightRouteKeys, props.selectedAirport],
  () => render(false),
);

useIntersectionObserver(containerRef, (entries) => {
  isIntersecting.value = entries.some((entry) => entry.isIntersecting);
});
useResizeObserver(containerRef, (entries) => {
  const rect = entries[0]?.contentRect;
  // v-show 隐藏时容器为 0×0，跳过以免 geo 视图矩阵不可逆导致实例失效。
  if (!rect?.width || !rect.height) return;
  chart?.resize();
  animator?.resize(rect.width, rect.height);
});

onMounted(initChart);
onActivated(() => {
  isActivated.value = true;
});
onDeactivated(() => {
  isActivated.value = false;
});
onBeforeUnmount(() => {
  isUnmounted = true;
  animator?.destroy();
  animator = null;
  chart?.dispose();
  chart = null;
});

async function initChart() {
  mapLoadError.value = "";
  try {
    // 底图约 300KB，按需加载并只注册一次；名称避开 ECharts 对 "china" 的内置修补。
    if (!echarts.getMap(WORLD_MAP_NAME) || !worldBounds) {
      const { default: raw } = await import("@/assets/maps/world/world.geo.json?raw");
      const geoJson = JSON.parse(raw) as { features: Array<{ geometry: { coordinates: unknown } }> };
      worldBounds = projectedBounds(geoJson.features);
      echarts.registerMap(WORLD_MAP_NAME, geoJson as unknown as Parameters<typeof echarts.registerMap>[1]);
    }
  } catch (error) {
    mapLoadError.value = error instanceof Error ? error.message : t("common.loadFailed");
    return;
  }
  if (isUnmounted || !chartRef.value || !canvasRef.value || !containerRef.value) return;

  chart = echarts.init(chartRef.value);
  chart.on("click", handleChartClick);
  chart.on("georoam", () => animator?.invalidate());

  const isLite = window.innerWidth < 768 || (navigator.hardwareConcurrency ?? 8) <= 4;
  animator = new FlightRouteAnimator(canvasRef.value, {
    project: projectToPixel,
    colors: KIND_COLORS,
    maxMovers: isLite ? MAX_MOVERS_LITE : MAX_MOVERS,
  });
  const { clientWidth, clientHeight } = containerRef.value;
  animator.resize(clientWidth, clientHeight);
  isReady.value = true;
  render(true);
  if (shouldAnimate.value) animator.start();
}

function projectToPixel(coord: LonLat): [number, number] | null {
  const pixel = chart?.convertToPixel({ geoIndex: 0 }, coord) as number[] | undefined;
  const [x, y] = pixel ?? [];
  return x !== undefined && y !== undefined && Number.isFinite(x) && Number.isFinite(y)
    ? [x, y]
    : null;
}

function handleChartClick(params: echarts.ECElementEvent) {
  if (params.componentType !== "series") return;
  const datum = params.data as Partial<RouteLineDatum & AirportDatum> | undefined;
  if (datum?.routeKey) emit("route-click", datum.routeKey);
  else if (datum?.code) emit("airport-click", datum.code);
}

function resetView() {
  if (!chart) return;
  const focus = worldBounds ? computeRouteFocus(props.network.routes, worldBounds) : null;
  chart.setOption({ geo: { center: focus?.center ?? null, zoom: focus?.zoom ?? 1 } });
  animator?.invalidate();
}

/**
 * 数据或语言变化时整图重建并重新聚焦；仅选中变化时只合并系列，保留用户缩放平移。
 */
function render(isFull: boolean) {
  if (!chart || !animator) return;
  const highlight = activeRouteKeys();
  if (isFull) {
    const focus = worldBounds ? computeRouteFocus(props.network.routes, worldBounds) : null;
    chart.setOption(
      {
        tooltip: {
          trigger: "item",
          confine: true,
          backgroundColor: "rgba(7, 15, 28, 0.94)",
          borderColor: "rgba(56, 217, 255, 0.35)",
          borderWidth: 1,
          padding: [10, 12],
          textStyle: { color: "#dbe7f5", fontSize: 12 },
          extraCssText:
            "border-radius: 8px; box-shadow: 0 8px 28px rgba(0,0,0,0.45); max-width: min(420px, calc(100vw - 24px)); white-space: normal; overflow-wrap: anywhere;",
        },
        geo: {
          map: WORLD_MAP_NAME,
          projection: NATURAL_EARTH_PROJECTION,
          roam: true,
          scaleLimit: { min: 1, max: 8 },
          left: 8,
          right: 8,
          top: 8,
          bottom: 8,
          ...(focus ? { center: focus.center, zoom: focus.zoom } : {}),
          // 国家面不响应悬停/点击；中国 23 个部分作为同一区域统一着色，不拆分。
          silent: true,
          label: { show: false },
          itemStyle: {
            areaColor: "#1e3a5e",
            borderColor: "rgba(140, 195, 250, 0.34)",
            borderWidth: 0.5,
          },
          emphasis: { disabled: true },
          select: { disabled: true },
          regions: [
            {
              name: "中国",
              itemStyle: { areaColor: "#2a4f7c", borderColor: "rgba(160, 215, 255, 0.5)" },
            },
          ],
          tooltip: { show: false },
        },
        series: buildSeries(highlight),
      },
      { notMerge: true },
    );
    animator.setData(
      props.network.routes,
      props.network.airports.map((airport) => ({
        code: airport.code,
        coord: airport.coord,
        kind: airportKind(airport),
      })),
    );
  } else {
    chart.setOption({ series: buildSeries(highlight) });
  }
  animator.setHighlight(highlight);
}

/** 选中路线或机场时的高亮路线集合；未选择返回 null。 */
function activeRouteKeys(): string[] | null {
  if (props.highlightRouteKeys) return props.highlightRouteKeys;
  if (!props.selectedAirport) return null;
  return props.network.airports.find((airport) => airport.code === props.selectedAirport)?.routeKeys ?? [];
}

function buildSeries(highlight: string[] | null) {
  const highlightSet = highlight ? new Set(highlight) : null;
  const isDimmed = (key: string) => highlightSet !== null && !highlightSet.has(key);
  const routes = props.network.routes;

  const lineData = (glow: boolean) =>
    routes.flatMap((route) =>
      route.segments.map<RouteLineDatum>((coords) => ({
        routeKey: route.key,
        coords,
        lineStyle: {
          color: KIND_COLORS[route.kind],
          width: (glow ? 4 : 0.8) + Math.min(route.legCount, 6) * (glow ? 0.5 : 0.2),
          opacity: (glow ? 0.16 : 0.85) * (isDimmed(route.key) ? 0.25 : 1),
        },
      })),
    );

  return [
    {
      id: "graticule",
      type: "lines",
      coordinateSystem: "geo",
      polyline: true,
      silent: true,
      lineStyle: { color: "rgba(140, 190, 240, 0.12)", width: 0.6 },
      data: GRATICULE,
      zlevel: 0,
    },
    {
      // 宽而淡的光晕同时作为悬停/点击命中区，细线本身不响应。
      id: "route-glow",
      type: "lines",
      coordinateSystem: "geo",
      polyline: true,
      emphasis: { disabled: true },
      tooltip: { formatter: (params: { data: RouteLineDatum }) => routeTooltip(params.data.routeKey) },
      data: lineData(true),
      zlevel: 1,
    },
    {
      id: "route-core",
      type: "lines",
      coordinateSystem: "geo",
      polyline: true,
      silent: true,
      data: lineData(false),
      zlevel: 1,
    },
    {
      // 静态方向箭头：动画暂停或减少动态效果时仍能看出出发→到达。
      id: "route-arrow",
      type: "scatter",
      coordinateSystem: "geo",
      silent: true,
      symbol: "arrow",
      symbolSize: 6,
      data: routes.flatMap((route) => {
        const arrow = routeArrow(route);
        if (!arrow) return [];
        return [
          {
            value: arrow.coord,
            symbolRotate: arrow.rotate,
            itemStyle: {
              color: KIND_COLORS[route.kind],
              opacity: isDimmed(route.key) ? 0.25 : 0.95,
            },
          },
        ];
      }),
      zlevel: 2,
    },
    {
      id: "airports",
      type: "scatter",
      coordinateSystem: "geo",
      symbolSize: (_value: unknown, params: { data: AirportDatum }) => airportSize(params.data.code),
      itemStyle: { borderColor: "#10233d", borderWidth: 1.5 },
      emphasis: { scale: 1.4 },
      label: {
        show: true,
        position: "right",
        distance: 5,
        fontSize: 11,
        fontWeight: 600,
        color: "#d7e8ff",
        textBorderColor: "#0f2140",
        textBorderWidth: 2,
        formatter: "{b}",
      },
      labelLayout: { hideOverlap: true },
      tooltip: { formatter: (params: { data: AirportDatum }) => airportTooltip(params.data.code) },
      data: props.network.airports.map((airport) => {
        const isSelected = airport.code === props.selectedAirport;
        const isMuted = highlightSet !== null && !airport.routeKeys.some((key) => highlightSet.has(key));
        return {
          name: airport.code,
          value: airport.coord,
          code: airport.code,
          itemStyle: {
            color: KIND_COLORS[airportKind(airport)],
            opacity: isMuted ? 0.35 : 1,
            ...(isSelected ? { borderColor: "#ffffff", borderWidth: 2 } : {}),
          },
        };
      }),
      zlevel: 3,
    },
  ];
}

function airportKind(airport: FlightAirportNode): FlightKind | "mixed" {
  if (airport.pickupLegs && airport.dropLegs) return "mixed";
  return airport.pickupLegs ? "pickup" : "drop";
}

function airportSize(code: string) {
  const airport = props.network.airports.find((item) => item.code === code);
  const legs = airport ? airport.pickupLegs + airport.dropLegs : 0;
  return 5 + Math.min(legs, 12) * 0.4;
}

/** 箭头放在最长切段中点，旋转角按投影平面切线方向计算。 */
function routeArrow(route: FlightRoute) {
  const segment = route.segments.reduce<LonLat[]>(
    (longest, item) => (item.length > longest.length ? item : longest),
    [],
  );
  const middle = Math.floor(segment.length / 2);
  const before = segment[middle - 1];
  const coord = segment[middle];
  const after = segment[middle + 1];
  if (!before || !coord || !after) return null;
  const [x0, y0] = projectNaturalEarth(before);
  const [x1, y1] = projectNaturalEarth(after);
  // ECharts 箭头默认朝上，symbolRotate 逆时针为正；投影平面 y 轴向下。
  return { coord, rotate: (Math.atan2(-(x1 - x0), -(y1 - y0)) * 180) / Math.PI };
}

function escapeText(value: string | number) {
  return echarts.format.encodeHTML(String(value));
}

function routeTooltip(routeKey: string) {
  const route = props.network.routes.find((item) => item.key === routeKey);
  if (!route) return "";
  const groups = route.groupKeys.flatMap((key) => groupsByKey.value.get(key) ?? []);
  const lines = groups.slice(0, TOOLTIP_GROUP_LIMIT).map(groupTooltipLine);
  if (groups.length > TOOLTIP_GROUP_LIMIT) {
    lines.push(escapeText(t("dashboard.flightMap.tooltip.moreGroups", { count: groups.length - TOOLTIP_GROUP_LIMIT })));
  }
  const header = [
    `<b>${escapeText(`${route.from.code} → ${route.to.code}`)}</b>`,
    escapeText(t(`dashboard.flightMap.legKinds.${route.kind}`)),
    escapeText(t("dashboard.flightMap.legCount", { count: route.legCount })),
  ].join(" · ");
  const airports = escapeText(
    `${airportName(route.from, locale.value)} → ${airportName(route.to, locale.value)}`,
  );
  return [header, `<span style="opacity:.75">${airports}</span>`, ...lines].join("<br/>");
}

function groupTooltipLine(group: FlightGroup) {
  const leg = group.legs[0];
  const tours = group.legs.map((item) => item.tour.tourNo);
  const tourText =
    tours.slice(0, TOOLTIP_TOUR_LIMIT).join(", ") +
    (tours.length > TOOLTIP_TOUR_LIMIT
      ? ` ${t("dashboard.flightMap.tooltip.moreTours", { count: tours.length - TOOLTIP_TOUR_LIMIT })}`
      : "");
  const parts = [
    `<b>${escapeText(group.flightNumber ?? t("dashboard.flightMap.noFlightNumber"))}</b>`,
    escapeText(`${group.departureTime ?? "--:--"} → ${group.arrivalTime ?? "--:--"}`),
    leg
      ? escapeText(
        t("dashboard.flightMap.reference", {
          event: t(`dashboard.flightMap.referenceEvents.${leg.referenceEvent}`),
          time: leg.scheduledAt,
        }),
      )
      : "",
    escapeText(t("dashboard.flightMap.tourPeople", { tours: group.legs.length, people: group.people })),
  ].filter(Boolean);
  return `${parts.join(" · ")}<br/><span style="opacity:.75">${escapeText(tourText)}</span>`;
}

function airportTooltip(code: string) {
  const airport = props.network.airports.find((item) => item.code === code);
  if (!airport) return "";
  return [
    `<b>${escapeText(airport.code)}</b> ${escapeText(airportName(airport, locale.value))}`,
    escapeText(
      t("dashboard.flightMap.airportLegs", { pickup: airport.pickupLegs, drop: airport.dropLegs }),
    ),
  ].join("<br/>");
}
</script>

<style scoped lang="scss">
.world-flight-map {
  @apply relative w-full h-full overflow-hidden;
}

.world-flight-map__motion {
  @apply absolute inset-0 w-full h-full pointer-events-none;
}

.world-flight-map__reset {
  @apply absolute top-3 right-3 px-[10px] py-1 text-[12px] text-[#cfe3ff] rounded-full border border-solid border-[rgba(120,180,240,0.35)] bg-[rgba(16,34,60,0.78)] cursor-pointer backdrop-blur-sm transition-colors;

  &:hover {
    @apply border-[#38d9ff] text-white;
  }
}
</style>
