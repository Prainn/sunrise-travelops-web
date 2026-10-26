<template>
  <SectionCard
    :title="$t('dashboard.tourMap.title')"
    :description="$t('dashboard.tourMap.subtitle')"
  >
    <template #actions>
      <el-radio-group
        v-if="canSelectBusinessUnit"
        v-model="businessUnit"
        size="small"
        :aria-label="$t('identity.businessUnit')"
      >
        <el-radio-button :label="$t('common.all')" value="" />
        <el-radio-button
          v-for="unit in BUSINESS_UNITS"
          :key="unit"
          :label="$t(`accountLink.businessOptions.${unit}`)"
          :value="unit"
        />
      </el-radio-group>
      <el-date-picker
        v-model="date"
        type="date"
        value-format="YYYY-MM-DD"
        size="small"
        :clearable="false"
        :aria-label="$t('dashboard.tourMap.date')"
        class="!w-[150px]"
      />
    </template>

    <div v-loading="isLoading" class="flex flex-col gap-4 min-h-[240px]">
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
            class="tour-map__stat"
            :class="{ 'is-clickable': stat.panel, 'is-active': isStatActive(stat.panel) }"
            @click="stat.panel && openListPanel(stat.panel)"
          >
            <span class="text-[13px] text-muted">{{ stat.label }}</span>
            <span class="text-[22px] font-semibold leading-[1.2] text-strong">{{ stat.value }}</span>
          </component>
        </div>

        <div class="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div class="w-full max-w-[640px] mx-auto">
            <YunnanTourMap
              :points="mapPoints"
              :active-regions="activeRegions"
              :selected-region="panel.kind === 'region' ? panel.adcode : null"
              :selected-city-id="panel.kind === 'city' ? panel.cityId : null"
              :route-segments="routeSegments"
              @city-click="openCityPanel"
              @region-click="openRegionPanel"
            />
          </div>

          <div class="tour-map__panel">
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

            <div class="tour-map__panel-body">
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
                  :description="$t('dashboard.tourMap.noTours')"
                />
                <button
                  v-for="item in activeCities"
                  :key="item.city.id"
                  type="button"
                  class="tour-map__row"
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
                  class="tour-map__row"
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
                      {{ tour.guideName || $t("dashboard.tourMap.guidePending") }}
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

        <p class="m-0 text-[12px] leading-[1.6] text-muted">
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
      </template>
    </div>
  </SectionCard>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import SectionCard from "@/components/SectionCard/index.vue";
import { dashboardService } from "@/services";
import { businessDictionaryService } from "@/services/business-dictionary.service";
import type { TourMapBusinessUnit, TourMapCity, TourMapTour } from "@/types/dashboard";
import TourMapTourDetail from "./TourMapTourDetail.vue";
import YunnanTourMap from "./YunnanTourMap.vue";
import {
  buildRouteSegments,
  issueLabelKey,
  resolveDisplayPoint,
  shanghaiToday,
  YUNNAN_REGION_NAMES,
  type TourMapPoint,
  type YunnanDisplayPoint,
} from "./tour-map";
import { useTourMapData } from "./useTourMapData";

type ListPanelKind = "pickup" | "drop" | "pending";
type TourMapPanel =
  | { kind: "cities" }
  | { kind: "city"; cityId: string }
  | { kind: "region"; adcode: string }
  | { kind: ListPanelKind };

const BUSINESS_UNITS: TourMapBusinessUnit[] = ["shengxu", "linxi", "website"];
const COORDINATE_SOURCES = [
  { label: "© OpenStreetMap contributors (ODbL)", url: "https://www.openstreetmap.org/copyright" },
  { label: "GeoNames (CC BY)", url: "https://www.geonames.org/" },
  { label: "Wikidata (CC0)", url: "https://www.wikidata.org/" },
];

const { t } = useI18n();
const { data, isLoading, loadError, load } = useTourMapData({
  fetchMap: (query) => dashboardService.getTourMap(query),
});
const date = ref(shanghaiToday());
const businessUnit = ref<TourMapBusinessUnit | "">("");
/** 沿用最近一次响应，加载中不让业务筛选闪烁消失。 */
const canSelectBusinessUnit = ref(false);
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

// 切换筛选时清空旧选择，旧业务的列表不会在新结果到达前继续可点。
watch(
  [date, businessUnit],
  () => {
    resetPanel();
    reload();
  },
  { immediate: true },
);
watch(data, (value) => {
  if (value) canSelectBusinessUnit.value = value.canSelectBusinessUnit;
});

// 普通行程交通方式按字典显示；字典读取失败时保留原始编码，不阻塞地图。
void businessDictionaryService.ensureBuiltInTypesLoaded().catch(() => undefined);

function reload() {
  void load({ date: date.value, businessUnit: businessUnit.value || undefined });
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

<style scoped lang="scss">
.tour-map__stat {
  @apply flex flex-col gap-[2px] min-w-0 px-3 py-[10px] text-left rounded-[6px] border border-solid border-[var(--el-border-color-lighter)] bg-[var(--el-fill-color-blank)];

  &.is-clickable {
    @apply cursor-pointer transition-colors;

    &:hover,
    &.is-active {
      @apply border-[var(--el-color-primary)];
    }
  }
}

.tour-map__panel {
  @apply flex flex-col min-w-0 p-3 rounded-[6px] border border-solid border-[var(--el-border-color-lighter)];
}

.tour-map__panel-body {
  @apply min-h-0 max-h-[640px] overflow-y-auto;
}

.tour-map__row {
  @apply flex w-full items-center justify-between gap-3 px-2 py-[10px] text-left bg-transparent border-0 border-b border-solid border-[var(--el-border-color-extra-light)] cursor-pointer;

  &:hover {
    @apply bg-[var(--el-fill-color-light)];
  }

  &:last-child {
    @apply border-b-0;
  }
}
</style>
