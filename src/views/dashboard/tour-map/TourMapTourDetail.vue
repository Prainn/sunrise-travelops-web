<template>
  <div class="flex flex-col gap-4">
    <div class="flex flex-col gap-2">
      <div class="flex flex-wrap items-center gap-2">
        <span class="text-[16px] font-semibold text-strong">{{ tour.tourNo }}</span>
        <el-tag size="small" effect="plain">
          {{ $t(`accountLink.businessOptions.${tour.businessUnit}`) }}
        </el-tag>
        <el-tag
          v-if="tour.sourceModule === 'manual'"
          size="small"
          type="info"
          effect="plain"
        >
          {{ $t("tour.sourceModule.manual") }}
        </el-tag>
      </div>
      <div v-if="tour.issues.length" class="flex flex-wrap gap-1">
        <el-tag
          v-for="issue in tour.issues"
          :key="issue"
          size="small"
          type="warning"
        >
          {{ $t(issueLabelKey(issue)) }}
        </el-tag>
      </div>
    </div>

    <dl
      class="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-[6px] m-0 text-[13px] leading-[1.5]"
    >
      <dt class="text-muted">
        {{ $t("dashboard.tourMap.totals.people") }}
      </dt>
      <dd class="m-0 text-[var(--el-text-color-regular)]">
        {{
          $t("dashboard.tourMap.headcount", {
            adults: tour.adults,
            children: tour.children,
            leaders: tour.leaders,
            total: tour.totalPeople,
          })
        }}
      </dd>
      <dt class="text-muted">
        {{ $t("tour.guide") }}
      </dt>
      <dd class="m-0 text-[var(--el-text-color-regular)]">
        <template v-if="tour.todayGuideServices.length">
          {{ guideSummaryText(tour.todayGuideServices) }}
        </template>
        <template v-else>
          {{ $t("dashboard.tourMap.noGuideToday") }}
        </template>
        <el-popover
          v-if="tour.guideServices.length"
          placement="left"
          trigger="click"
          :width="340"
        >
          <template #reference>
            <el-button link type="primary" class="ml-1">
              {{ $t("dashboard.tourMap.allGuideServices", { n: tour.guideServices.length }) }}
            </el-button>
          </template>
          <GuideServiceList :services="tour.guideServices" />
        </el-popover>
      </dd>
      <dt class="text-muted">
        {{ $t("tour.collectCoordinator") }}
      </dt>
      <dd class="m-0 text-[var(--el-text-color-regular)]">
        {{ tour.collectCoordinatorName || "-" }}
      </dd>
      <dt class="text-muted">
        {{ $t("tour.operator") }}
      </dt>
      <dd class="m-0 text-[var(--el-text-color-regular)]">
        {{ tour.operatorName || "-" }}
      </dd>
      <dt class="text-muted">
        {{ $t("tour.pickupAt") }}
      </dt>
      <dd class="m-0 text-[var(--el-text-color-regular)]">
        {{ tour.pickupAt }} · {{ flightText("pickup") }}
      </dd>
      <dt class="text-muted">
        {{ $t("tour.dropAt") }}
      </dt>
      <dd class="m-0 text-[var(--el-text-color-regular)]">
        {{ tour.dropAt }} · {{ flightText("drop") }}
      </dd>
      <dt class="text-muted">
        {{ $t("tour.days") }}
      </dt>
      <dd class="m-0 text-[var(--el-text-color-regular)]">
        {{
          tour.dayNumber === null
            ? $t("dashboard.tourMap.totalDays", { days: tour.days })
            : $t("dashboard.tourMap.dayProgress", { days: tour.days, day: tour.dayNumber })
        }}
      </dd>
    </dl>

    <div class="flex flex-col gap-2">
      <el-radio-group v-model="routeMode" size="small">
        <el-radio-button :label="$t('dashboard.tourMap.routeToday')" value="today" />
        <el-radio-button :label="$t('dashboard.tourMap.routeFull')" value="full" />
      </el-radio-group>
      <p v-if="routeHint" class="m-0 text-[12px] text-muted">
        {{ routeHint }}
      </p>
    </div>

    <TourMapDayPlan
      :day="tour.today"
      :title="$t('dashboard.tourMap.todayPlan')"
      :empty-text="$t('dashboard.tourMap.todayEmpty')"
      :source-module="tour.sourceModule"
    />
    <TourMapDayPlan
      :day="tour.nextDay"
      :title="$t('dashboard.tourMap.nextDayPlan')"
      :empty-text="$t('dashboard.tourMap.nextDayEmpty')"
      :source-module="tour.sourceModule"
    />
  </div>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
import GuideServiceList from "@/components/GuideServiceList/index.vue";
import type { TourMapTour } from "@/types/dashboard";
import { guideSummaryText } from "@/utils/guide-services";
import TourMapDayPlan from "./TourMapDayPlan.vue";
import { issueLabelKey } from "./tour-map";

const props = defineProps<{
  tour: TourMapTour;
  routeHint: string;
}>();

const routeMode = defineModel<"today" | "full">("routeMode", { required: true });

const { t } = useI18n();

// 与成团列表一致：接团显示抵达机场，送团显示出发机场。
function flightText(kind: "pickup" | "drop") {
  const flight = kind === "pickup" ? props.tour.pickupFlight : props.tour.dropFlight;
  if (!flight) return t("tour.flightNotLinked");
  const airport = kind === "pickup" ? flight.arrivalAirport : flight.departureAirport;
  return `${flight.flightNumber} ${airport.code}`;
}
</script>
