<template>
  <!-- 加载中保留旧内容占位，蒙版覆盖并禁止交互，避免切换筛选时页面高度跳动。 -->
  <div v-loading="isLoading" :inert="isLoading" class="flex flex-col flex-1 gap-4 min-h-[240px] lg:min-h-0">
    <el-empty v-if="loadError" :description="loadError">
      <el-button @click="reload">
        {{ $t("common.retry") }}
      </el-button>
    </el-empty>

    <template v-else-if="data">
      <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <component
          :is="stat.panel ? 'button' : 'div'"
          v-for="stat in stats"
          :key="stat.key"
          :type="stat.panel ? 'button' : undefined"
          class="ops-map__stat"
          :class="{ 'is-clickable': stat.panel, 'is-active': isStatActive(stat.panel) }"
          @click="stat.panel && openListPanel(stat.panel)"
        >
          <span class="ops-map__stat-label">{{ stat.label }}</span>
          <span class="ops-map__stat-value">{{ stat.value }}</span>
        </component>
      </div>

      <div class="grid grid-cols-1 gap-4 lg:flex-1 lg:min-h-0 lg:grid-cols-[minmax(0,1fr)_360px] lg:grid-rows-[minmax(0,1fr)]">
        <div class="ops-map__stage flex items-center justify-center p-3">
          <div class="w-full max-w-[640px] lg:max-w-none lg:h-full">
            <YunnanTourMap
              :points="mapPoints"
              :active-regions="activeRegions"
              :selected-region="panel.kind === 'region' ? panel.adcode : null"
              :selected-city-id="panel.kind === 'city' ? panel.cityId : null"
              :route-segments="routeSegments"
              :animate="animate"
              @city-click="openCityPanel"
              @region-click="openRegionPanel"
            />
          </div>
        </div>

        <div class="ops-map__panel">
          <div class="flex items-center justify-between gap-2 mb-3">
            <span class="min-w-0 text-[15px] font-medium text-strong truncate">
              {{ panelTitle }}
            </span>
            <el-button
              v-if="selectedTour"
              link
              type="primary"
              @click="selectedTourId = null"
            >
              {{ $t("common.goBack") }}
            </el-button>
            <el-button
              v-else-if="panel.kind !== 'cities'"
              link
              type="primary"
              @click="resetPanel"
            >
              {{ $t("dashboard.tourMap.destinations") }}
            </el-button>
          </div>

          <div class="ops-map__panel-body">
            <TourMapTourDetail
              v-if="selectedTour"
              v-model:route-mode="routeMode"
              :tour="selectedTour"
              :route-hint="routeHint"
            />

            <template v-else-if="panel.kind === 'cities'">
              <el-empty
                v-if="!activeCities.length"
                :image-size="80"
                :description="$t(data?.totals.tours ? 'dashboard.tourMap.noDestinations' : 'dashboard.tourMap.noTours')"
              />
              <button
                v-for="item in activeCities"
                :key="item.city.id"
                type="button"
                class="ops-map__row"
                @click="openCityPanel(item.city.id)"
              >
                <span class="flex flex-col min-w-0">
                  <span class="text-[14px] text-strong truncate">{{ item.city.name }}</span>
                  <span v-if="!item.point" class="text-[12px] text-[var(--el-color-warning)]">
                    {{ $t("dashboard.tourMap.uncalibrated") }}
                  </span>
                </span>
                <span class="shrink-0 text-[13px] text-muted">
                  {{ pointSummary(item.city.tourCount, item.city.peopleCount) }}
                </span>
              </button>
            </template>

            <template v-else>
              <template v-if="panel.kind === 'region'">
                <p v-if="!regionCities.length" class="m-0 mb-3 text-[13px] text-muted">
                  {{ $t("dashboard.tourMap.regionNoDestinations") }}
                </p>
                <div v-else class="flex flex-wrap gap-2 mb-3">
                  <el-button
                    v-for="city in regionCities"
                    :key="city.id"
                    size="small"
                    @click="openCityPanel(city.id)"
                  >
                    {{ city.name }} · {{ city.tourCount }}
                  </el-button>
                </div>
              </template>
              <p
                v-if="panel.kind === 'city' && panelCity && !pointByCityId.has(panelCity.id)"
                class="m-0 mb-3 text-[13px] text-[var(--el-color-warning)]"
              >
                {{ $t("dashboard.tourMap.uncalibrated") }}
              </p>
              <el-empty
                v-if="!panelTours.length"
                :image-size="80"
                :description="$t('dashboard.tourMap.noTours')"
              />
              <button
                v-for="tour in panelTours"
                :key="tour.id"
                type="button"
                class="ops-map__row"
                @click="selectTour(tour.id)"
              >
                <span class="flex flex-col gap-1 min-w-0">
                  <span class="flex flex-wrap items-center gap-x-2 text-[14px] text-strong">
                    {{ tour.tourNo }}
                    <span class="text-[12px] text-muted">
                      {{ $t(`accountLink.businessOptions.${tour.businessUnit}`) }}
                    </span>
                  </span>
                  <span class="text-[12px] text-muted">
                    {{ todayGuideText(tour.todayGuideServices) }}
                    <template v-if="panel.kind === 'pickup'"> · {{ tour.pickupAt }}</template>
                    <template v-if="panel.kind === 'drop'"> · {{ tour.dropAt }}</template>
                  </span>
                  <span v-if="tour.issues.length" class="flex flex-wrap gap-1">
                    <el-tag
                      v-for="issue in tour.issues"
                      :key="issue"
                      size="small"
                      type="warning"
                    >
                      {{ $t(issueLabelKey(issue)) }}
                    </el-tag>
                  </span>
                </span>
                <span class="shrink-0 text-[13px] text-muted">
                  {{ $t("dashboard.tourMap.peopleCount", { count: tour.totalPeople }) }}
                </span>
              </button>
            </template>
          </div>
        </div>
      </div>

      <div class="flex flex-col gap-1 text-[12px] leading-[1.6] text-muted">
        <p class="m-0">
          {{ $t("dashboard.tourMap.baseMapSource") }}
        </p>
        <p class="m-0">
          {{ $t("dashboard.tourMap.coordinateSource") }}
          <a
            v-for="source in COORDINATE_SOURCES"
            :key="source.url"
            :href="source.url"
            target="_blank"
            rel="noopener noreferrer"
            class="ml-2 text-[var(--el-color-primary)]"
          >
            {{ source.label }}
          </a>
        </p>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { dashboardService } from "@/services";
import { businessDictionaryService } from "@/services/business-dictionary.service";
import type { TourMapBusinessUnit, TourMapCity, TourMapTour } from "@/types/dashboard";
import type { TourGuideService } from "@/types/tour";
import { guideSummaryText } from "@/utils/guide-services";
import TourMapTourDetail from "./TourMapTourDetail.vue";
import YunnanTourMap from "./YunnanTourMap.vue";
import {
  buildRouteSegments,
  issueLabelKey,
  resolveDisplayPoint,
  YUNNAN_REGION_NAMES,
  type TourMapPoint,
  type YunnanDisplayPoint,
} from "./tour-map";
import { useTourMapData } from "./useTourMapData";

/** 当日服务导游按 ID 去重；当日无服务不回退其它日期。 */
function todayGuideText(services: TourGuideService[]) {
  return services.length ? guideSummaryText(services) : t("dashboard.tourMap.noGuideToday");
}

type ListPanelKind = "pickup" | "drop" | "pending";
type TourMapPanel =
  | { kind: "cities" }
  | { kind: "city"; cityId: string }
  | { kind: "region"; adcode: string }
  | { kind: ListPanelKind };

const COORDINATE_SOURCES = [
  { label: "© OpenStreetMap contributors (ODbL)", url: "https://www.openstreetmap.org/copyright" },
  { label: "GeoNames (CC BY)", url: "https://www.geonames.org/" },
  { label: "Wikidata (CC0)", url: "https://www.wikidata.org/" },
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

const { t } = useI18n();
const { data, isLoading, loadError, load } = useTourMapData({
  fetchMap: (query) => dashboardService.getTourMap(query),
});
/** 已发出请求的筛选条件；切回视图时条件未变不重复请求 */
let loadedQueryKey = "";
const panel = ref<TourMapPanel>({ kind: "cities" });
const selectedTourId = ref<string | null>(null);
const routeMode = ref<"today" | "full">("today");

const toursById = computed(() => new Map(data.value?.tours.map((tour) => [tour.id, tour]) ?? []));
const citiesById = computed(() => new Map(data.value?.cities.map((city) => [city.id, city]) ?? []));
const pointByCityId = computed(() => {
  const points = new Map<string, YunnanDisplayPoint>();
  for (const city of data.value?.cities ?? []) {
    const point = resolveDisplayPoint(city);
    if (point) points.set(city.id, point);
  }
  return points;
});
const mapPoints = computed<TourMapPoint[]>(() =>
  (data.value?.cities ?? []).flatMap((city) => {
    const point = pointByCityId.value.get(city.id);
    if (!point) return [];
    return [
      {
        cityId: city.id,
        name: city.name,
        coord: point.svg,
        tourCount: city.tourCount,
        peopleCount: city.peopleCount,
      },
    ];
  }),
);
const activeCities = computed(() =>
  (data.value?.cities ?? [])
    .filter((city) => city.tourCount > 0)
    .sort((a, b) => b.tourCount - a.tourCount)
    .map((city) => ({ city, point: pointByCityId.value.get(city.id) ?? null })),
);
const activeRegions = computed(() => [
  ...new Set(
    activeCities.value.flatMap((item) => (item.point ? [item.point.regionAdcode] : [])),
  ),
]);
const stats = computed(() => {
  const value = data.value;
  if (!value) return [];
  return [
    { key: "tours", label: t("dashboard.tourMap.totals.tours"), value: value.totals.tours },
    { key: "people", label: t("dashboard.tourMap.totals.people"), value: value.totals.people },
    { key: "located", label: t("dashboard.tourMap.totals.located"), value: value.totals.located },
    {
      key: "unlocated",
      label: t("dashboard.tourMap.totals.unlocated"),
      value: value.totals.unlocated,
      panel: "pending" as const,
    },
    {
      key: "pickups",
      label: t("dashboard.tourMap.totals.pickups"),
      value: value.pickupTourIds.length,
      panel: "pickup" as const,
    },
    {
      key: "drops",
      label: t("dashboard.tourMap.totals.drops"),
      value: value.dropTourIds.length,
      panel: "drop" as const,
    },
  ];
});
const panelCity = computed(() =>
  panel.value.kind === "city" ? citiesById.value.get(panel.value.cityId) : undefined,
);
/** 区域只列出已校准点位落在该州市的目的地，行政代码不当作城市 ID。 */
const regionCities = computed<TourMapCity[]>(() => {
  const current = panel.value;
  if (current.kind !== "region") return [];
  return (data.value?.cities ?? []).filter(
    (city) =>
      city.tourCount > 0 && pointByCityId.value.get(city.id)?.regionAdcode === current.adcode,
  );
});
const panelTours = computed<TourMapTour[]>(() => {
  const value = data.value;
  const current = panel.value;
  if (!value) return [];
  let ids: string[] = [];
  if (current.kind === "city") ids = panelCity.value?.tourIds ?? [];
  if (current.kind === "region") ids = [...new Set(regionCities.value.flatMap((c) => c.tourIds))];
  if (current.kind === "pickup") ids = value.pickupTourIds;
  if (current.kind === "drop") ids = value.dropTourIds;
  if (current.kind === "pending") ids = value.unlocatedTourIds;
  return ids.flatMap((id) => toursById.value.get(id) ?? []);
});
const panelTitle = computed(() => {
  if (selectedTour.value) return selectedTour.value.tourNo;
  const current = panel.value;
  if (current.kind === "city") return panelCity.value?.name ?? "";
  if (current.kind === "region") return regionName(current.adcode);
  if (current.kind === "pickup") return t("dashboard.tourMap.totals.pickups");
  if (current.kind === "drop") return t("dashboard.tourMap.totals.drops");
  if (current.kind === "pending") return t("dashboard.tourMap.totals.unlocated");
  return t("dashboard.tourMap.destinations");
});
const selectedTour = computed(() =>
  selectedTourId.value ? toursById.value.get(selectedTourId.value) : undefined,
);
const routeDays = computed(() => {
  const tour = selectedTour.value;
  if (!tour) return [];
  if (routeMode.value === "full") return tour.route;
  return tour.today ? [tour.today] : [];
});
const routeSegments = computed(() =>
  buildRouteSegments(routeDays.value, (cityId) => pointByCityId.value.get(cityId)?.svg ?? null),
);
const routeHint = computed(() => {
  const tour = selectedTour.value;
  if (!tour) return "";
  if (tour.sourceModule === "manual") return t("dashboard.tourMap.routeManual");
  const stops = routeDays.value.flatMap((day) => day.stops);
  if (!routeSegments.value.length) return t("dashboard.tourMap.routeEmpty");
  const hasGap =
    routeSegments.value.length > 1 ||
    stops.some((stop) => stop.issue !== null || !stop.cityId || !pointByCityId.value.has(stop.cityId));
  return hasGap ? t("dashboard.tourMap.routeGap") : "";
});

// 切换筛选时清空旧选择，旧业务的列表不会在新结果到达前继续可点；未激活时等切回再请求。
watch(
  () => [props.active, props.date, props.businessUnit] as const,
  ([active, date, businessUnit]) => {
    const key = `${date}|${businessUnit}`;
    if (!active || key === loadedQueryKey) return;
    loadedQueryKey = key;
    resetPanel();
    reload();
  },
  { immediate: true },
);
watch(data, (value) => {
  if (value) emit("scope", value.canSelectBusinessUnit);
});

// 普通行程交通方式按字典显示；字典读取失败时保留原始编码，不阻塞地图。
void businessDictionaryService.ensureBuiltInTypesLoaded().catch(() => undefined);

function reload() {
  void load({ date: props.date, businessUnit: props.businessUnit || undefined });
}

function resetPanel() {
  panel.value = { kind: "cities" };
  selectedTourId.value = null;
  routeMode.value = "today";
}

function openCityPanel(cityId: string) {
  panel.value = { kind: "city", cityId };
  selectedTourId.value = null;
}

function openRegionPanel(adcode: string) {
  panel.value = { kind: "region", adcode };
  selectedTourId.value = null;
}

function openListPanel(kind: ListPanelKind) {
  panel.value = { kind };
  selectedTourId.value = null;
}

function selectTour(id: string) {
  selectedTourId.value = id;
  routeMode.value = "today";
}

function isStatActive(kind: ListPanelKind | undefined) {
  return Boolean(kind) && panel.value.kind === kind;
}

function regionName(adcode: string) {
  return YUNNAN_REGION_NAMES.get(adcode) ?? adcode;
}

function pointSummary(tours: number, people: number) {
  return t("dashboard.tourMap.pointSummary", { tours, people });
}
</script>
