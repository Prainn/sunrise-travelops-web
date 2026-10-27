<template>
  <!-- 加载中保留旧内容并禁止交互，避免切换日期时高度跳动或误点旧结果。 -->
  <div :inert="isLoading" class="flex flex-col flex-1 gap-4 min-h-0">
    <div class="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-7">
      <component
        :is="stat.tab ? 'button' : 'div'"
        v-for="stat in stats"
        :key="stat.key"
        :type="stat.tab ? 'button' : undefined"
        class="ops-map__stat"
        :class="{ 'is-clickable': stat.tab, 'is-active': stat.tab && stat.tab === tab, [`is-${stat.tone}`]: stat.tone }"
        @click="stat.tab && (tab = stat.tab)"
      >
        <span class="ops-map__stat-label">{{ stat.label }}</span>
        <span class="ops-map__stat-value">{{ stat.value }}</span>
      </component>
    </div>

    <div class="grid grid-cols-1 gap-4 lg:flex-1 lg:min-h-0 lg:grid-cols-[minmax(0,1fr)_360px] lg:grid-rows-[minmax(0,1fr)]">
      <div v-loading="isLoading" class="ops-map__stage aspect-[16/10] lg:aspect-auto">
        <WorldFlightMap
          :network="network"
          :highlight-route-keys="selectedRouteKey ? [selectedRouteKey] : null"
          :selected-airport="selectedAirport"
          :animate="animate"
          @route-click="selectRoute"
          @airport-click="selectAirport"
        />

        <div v-if="stageMessage" class="ops-map__overlay">
          <div class="ops-map__overlay-card">
            <span class="text-[14px] text-strong">{{ stageMessage.title }}</span>
            <span v-if="stageMessage.detail" class="text-[12px] text-muted">
              {{ stageMessage.detail }}
            </span>
            <el-button v-if="stageMessage.canRetry" size="small" @click="reload">
              {{ $t("common.retry") }}
            </el-button>
          </div>
        </div>

        <div class="ops-map__legend">
          <span class="flex items-center gap-2">
            <i class="ops-map__legend-line is-pickup"></i>{{ $t("dashboard.flightMap.legKinds.pickup") }}
          </span>
          <span class="flex items-center gap-2">
            <i class="ops-map__legend-line is-drop"></i>{{ $t("dashboard.flightMap.legKinds.drop") }}
          </span>
          <span class="text-muted">{{ $t("dashboard.flightMap.demoNote") }}</span>
        </div>
      </div>

      <aside class="ops-map__panel">
        <el-segmented
          v-model="tab"
          :options="tabOptions"
          block
          size="small"
          class="mb-3"
        />

        <div v-if="tab === 'flights' && (selectedRouteKey || selectedAirport)" class="ops-map__filter">
          <span class="min-w-0 truncate">{{ selectionLabel }}</span>
          <el-button link type="primary" @click="clearSelection">
            {{ $t("dashboard.flightMap.showAll") }}
          </el-button>
        </div>

        <div class="ops-map__panel-body">
          <template v-if="tab === 'flights'">
            <el-empty
              v-if="!visibleGroups.length"
              :image-size="72"
              :description="$t('dashboard.flightMap.noLocatedFlights')"
            />
            <div
              v-for="group in visibleGroups"
              :key="group.key"
              role="button"
              tabindex="0"
              class="ops-map__row is-stacked"
              :class="{ 'is-active': group.routeKey === selectedRouteKey }"
              @click="selectRoute(group.routeKey)"
              @keydown.enter.self="selectRoute(group.routeKey)"
            >
              <div class="flex items-center justify-between gap-2">
                <span class="flex items-center gap-2 min-w-0">
                  <i class="ops-map__dot" :class="`is-${group.kind}`"></i>
                  <span class="text-[14px] font-semibold text-strong truncate">
                    {{ group.flightNumber ?? $t("dashboard.flightMap.noFlightNumber") }}
                  </span>
                  <span class="text-[12px] text-muted">{{ $t(`dashboard.flightMap.legKinds.${group.kind}`) }}</span>
                </span>
                <span class="shrink-0 text-[12px] text-muted">
                  {{ $t("dashboard.flightMap.tourPeople", { tours: group.legs.length, people: group.people }) }}
                </span>
              </div>
              <div class="text-[13px] text-strong">
                {{ airportText(group.departureAirport) }} → {{ airportText(group.arrivalAirport) }}
              </div>
              <div class="text-[12px] text-muted">
                {{ group.departureTime ?? "--:--" }} → {{ group.arrivalTime ?? "--:--" }}
                <template v-if="group.legs[0]">
                  ·
                  {{
                    $t("dashboard.flightMap.reference", {
                      event: $t(`dashboard.flightMap.referenceEvents.${group.legs[0].referenceEvent}`),
                      time: group.legs[0].scheduledAt,
                    })
                  }}
                </template>
              </div>
              <div class="flex flex-wrap gap-x-3 gap-y-1">
                <router-link
                  v-for="leg in group.legs"
                  :key="leg.id"
                  :to="tourLink(leg.tour.tourNo)"
                  class="ops-map__tour-link"
                  @click.stop
                >
                  {{ leg.tour.tourNo }} · {{ $t("dashboard.tourMap.peopleCount", { count: leg.tour.totalPeople }) }}
                </router-link>
              </div>
            </div>
          </template>

          <template v-else-if="tab === 'pending'">
            <el-empty
              v-if="!pendingLegs.length"
              :image-size="72"
              :description="$t('dashboard.flightMap.noPending')"
            />
            <div v-for="leg in pendingLegs" :key="leg.id" class="ops-map__row is-stacked is-static">
              <div class="flex items-center justify-between gap-2">
                <span class="flex items-center gap-2 min-w-0">
                  <i class="ops-map__dot" :class="`is-${leg.kind}`"></i>
                  <span class="text-[14px] font-semibold text-strong truncate">
                    {{ leg.flightNumber ?? $t("dashboard.flightMap.noFlightNumber") }}
                  </span>
                  <span class="text-[12px] text-muted">{{ $t(`dashboard.flightMap.legKinds.${leg.kind}`) }}</span>
                </span>
                <span class="shrink-0 text-[12px] text-muted">{{ leg.scheduledAt }}</span>
              </div>
              <div class="text-[13px] text-strong">
                {{ airportText(leg.departureAirport) }} → {{ airportText(leg.arrivalAirport) }}
              </div>
              <div class="flex flex-wrap items-center gap-1">
                <el-tag
                  v-for="issue in leg.issues"
                  :key="issue"
                  size="small"
                  type="warning"
                >
                  {{ $t(flightIssueLabelKey(issue)) }}
                </el-tag>
                <router-link :to="tourLink(leg.tour.tourNo)" class="ops-map__tour-link ml-1">
                  {{ leg.tour.tourNo }} · {{ $t("dashboard.tourMap.peopleCount", { count: leg.tour.totalPeople }) }}
                </router-link>
              </div>
            </div>
          </template>

          <template v-else>
            <p class="m-0 mb-2 text-[12px] text-muted">
              {{ $t("dashboard.flightMap.unscheduledHint") }}
            </p>
            <el-empty
              v-if="!unscheduledTours.length"
              :image-size="72"
              :description="$t('dashboard.flightMap.noUnscheduled')"
            />
            <div v-for="tour in unscheduledTours" :key="tour.id" class="ops-map__row is-stacked is-static">
              <div class="flex items-center justify-between gap-2">
                <router-link :to="tourLink(tour.tourNo)" class="ops-map__tour-link">
                  {{ tour.tourNo }}
                </router-link>
                <span class="shrink-0 text-[12px] text-muted">
                  {{ $t(`accountLink.businessOptions.${tour.businessUnit}`) }} ·
                  {{ $t("dashboard.tourMap.peopleCount", { count: tour.totalPeople }) }}
                </span>
              </div>
            </div>
          </template>
        </div>
      </aside>
    </div>

    <div class="flex flex-col gap-1 text-[12px] leading-[1.6] text-muted">
      <p class="m-0">
        {{ $t("dashboard.flightMap.timeNote") }}
      </p>
      <p class="m-0">
        {{ $t("dashboard.flightMap.baseMapSource") }}
        <a
          v-for="source in SOURCES"
          :key="source.url"
          :href="source.url"
          target="_blank"
          rel="noopener noreferrer"
          class="text-[var(--el-color-primary)]"
        >
          {{ source.label }}
        </a>
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { dashboardService } from "@/services";
import type { FlightMapAirport, FlightMapIssue, TourMapBusinessUnit } from "@/types/dashboard";
import { airportName, buildFlightNetwork } from "./flight-map";
import { useFlightMapData } from "./useFlightMapData";
import WorldFlightMap from "./WorldFlightMap.vue";

type FlightPanelTab = "flights" | "pending" | "unscheduled";

const KNOWN_ISSUES: readonly FlightMapIssue[] = ["flight_missing", "airport_missing", "coordinates_missing"];
const SOURCES = [
  {
    label: "JayMuShui/chinese-global-compliant-geodata (MIT)",
    url: "https://github.com/JayMuShui/chinese-global-compliant-geodata",
  },
  { label: "Surbowl/world-geo-json-zh (Unlicense)", url: "https://github.com/Surbowl/world-geo-json-zh" },
  { label: "OurAirports (Public Domain)", url: "https://ourairports.com/data/" },
];

const props = defineProps<{
  date: string;
  businessUnit: TourMapBusinessUnit | "";
  /** 视图未激活时不发请求、不播放动画 */
  active: boolean;
  animate: boolean;
}>();

const emit = defineEmits<{
  scope: [canSelectBusinessUnit: boolean];
}>();

const { t, locale } = useI18n();
const { data, isLoading, loadError, isForbidden, load } = useFlightMapData({
  fetchMap: (query) => dashboardService.getFlightMap(query),
});
const tab = ref<FlightPanelTab>("flights");
const selectedRouteKey = ref<string | null>(null);
const selectedAirport = ref<string | null>(null);
/** 已发出请求的筛选条件；切回视图时条件未变不重复请求 */
let loadedQueryKey = "";

const network = computed(() => buildFlightNetwork(data.value?.flights ?? []));
const routeByKey = computed(() => new Map(network.value.routes.map((route) => [route.key, route])));
const pendingLegs = computed(() => {
  const value = data.value;
  if (!value) return [];
  const ids = new Set(value.unlocatedFlightIds);
  return value.flights.filter((leg) => ids.has(leg.id));
});
const unscheduledTours = computed(() => data.value?.unscheduledTours ?? []);
const visibleGroups = computed(() => {
  const groups = network.value.groups;
  if (selectedRouteKey.value) return groups.filter((group) => group.routeKey === selectedRouteKey.value);
  if (selectedAirport.value) {
    const code = selectedAirport.value;
    return groups.filter(
      (group) => group.departureAirport.code === code || group.arrivalAirport.code === code,
    );
  }
  return groups;
});
const stats = computed(() => {
  const totals = data.value?.totals;
  const value = (count: number | undefined) => (totals ? count ?? 0 : "—");
  return [
    { key: "legs", label: t("dashboard.flightMap.totals.flightLegs"), value: value(totals?.flightLegs) },
    {
      key: "pickup",
      label: t("dashboard.flightMap.totals.pickupLegs"),
      value: value(totals?.pickupLegs),
      tone: "pickup",
    },
    {
      key: "drop",
      label: t("dashboard.flightMap.totals.dropLegs"),
      value: value(totals?.dropLegs),
      tone: "drop",
    },
    { key: "tours", label: t("dashboard.flightMap.totals.tours"), value: value(totals?.tours) },
    { key: "people", label: t("dashboard.flightMap.totals.people"), value: value(totals?.people) },
    {
      key: "unlocated",
      label: t("dashboard.flightMap.totals.unlocatedLegs"),
      value: value(totals?.unlocatedLegs),
      tab: "pending" as const,
      tone: totals?.unlocatedLegs ? "warning" : undefined,
    },
    {
      key: "unscheduled",
      label: t("dashboard.flightMap.totals.unscheduledTours"),
      value: value(totals?.unscheduledTours),
      tab: "unscheduled" as const,
    },
  ];
});
const tabOptions = computed(() => [
  { value: "flights", label: t("dashboard.flightMap.tabs.flights", { count: network.value.groups.length }) },
  { value: "pending", label: t("dashboard.flightMap.tabs.pending", { count: pendingLegs.value.length }) },
  {
    value: "unscheduled",
    label: t("dashboard.flightMap.tabs.unscheduled", { count: unscheduledTours.value.length }),
  },
]);
const selectionLabel = computed(() => {
  const route = selectedRouteKey.value ? routeByKey.value.get(selectedRouteKey.value) : undefined;
  if (route) return `${route.from.code} → ${route.to.code} · ${t(`dashboard.flightMap.legKinds.${route.kind}`)}`;
  const airport = network.value.airports.find((item) => item.code === selectedAirport.value);
  return airport ? `${airport.code} ${airportName(airport, locale.value)}` : "";
});
/** 地图区状态提示；未知数据不用动画掩盖，全部待定位时明确说明未绘制。 */
const stageMessage = computed(() => {
  if (isForbidden.value) return { title: t("dashboard.flightMap.forbidden"), detail: "", canRetry: false };
  if (loadError.value) return { title: loadError.value, detail: "", canRetry: true };
  const value = data.value;
  if (!value || isLoading.value) return null;
  if (!value.flights.length) {
    return {
      title: t("dashboard.flightMap.noFlights"),
      detail: value.unscheduledTours.length ? t("dashboard.flightMap.onlyUnscheduled") : "",
      canRetry: false,
    };
  }
  if (!network.value.routes.length) {
    return { title: t("dashboard.flightMap.allPending"), detail: "", canRetry: false };
  }
  return null;
});

watch(
  () => [props.active, props.date, props.businessUnit] as const,
  ([active, date, businessUnit]) => {
    const key = `${date}|${businessUnit}`;
    if (!active || key === loadedQueryKey) return;
    loadedQueryKey = key;
    clearSelection();
    reload();
  },
  { immediate: true },
);
watch(data, (value) => {
  if (!value) return;
  emit("scope", value.canSelectBusinessUnit);
  if (!network.value.groups.length) {
    tab.value = pendingLegs.value.length ? "pending" : unscheduledTours.value.length ? "unscheduled" : "flights";
  } else {
    tab.value = "flights";
  }
});

function reload() {
  void load({ date: props.date, businessUnit: props.businessUnit || undefined });
}

function selectRoute(routeKey: string) {
  selectedAirport.value = null;
  selectedRouteKey.value = selectedRouteKey.value === routeKey ? null : routeKey;
  tab.value = "flights";
}

function selectAirport(code: string) {
  selectedRouteKey.value = null;
  selectedAirport.value = selectedAirport.value === code ? null : code;
  tab.value = "flights";
}

function clearSelection() {
  selectedRouteKey.value = null;
  selectedAirport.value = null;
}

function airportText(airport: FlightMapAirport) {
  if (!airport.code && !airport.name && !airport.englishName) return t("dashboard.flightMap.airportMissing");
  const name = airportName(airport, locale.value);
  return airport.code && name !== airport.code ? `${airport.code} ${name}` : name;
}

function flightIssueLabelKey(issue: string) {
  return KNOWN_ISSUES.includes(issue as FlightMapIssue)
    ? `dashboard.flightMap.issues.${issue}`
    : "dashboard.flightMap.issues.unknown";
}

/** 无单团查看页，沿用成团列表及其权限，按团号预填关键词。 */
function tourLink(tourNo: string) {
  return { name: "TourList", query: { keyword: tourNo } };
}
</script>
