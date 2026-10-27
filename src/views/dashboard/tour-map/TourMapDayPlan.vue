<template>
  <div class="flex flex-col gap-2">
    <div class="flex items-center justify-between gap-2">
      <span class="text-[14px] font-medium text-strong">{{ title }}</span>
      <span v-if="day" class="text-[12px] text-muted">
        {{ $t("dashboard.tourMap.dayLabel", { day: day.dayNumber }) }} · {{ day.date }}
      </span>
    </div>
    <p v-if="!day" class="m-0 text-[13px] text-muted">
      {{ emptyText }}
    </p>
    <dl
      v-else
      class="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-[6px] m-0 text-[13px] leading-[1.5]"
    >
      <dt class="text-muted">
        {{ $t("dashboard.tourMap.plannedStops") }}
      </dt>
      <dd class="m-0 text-[var(--el-text-color-regular)]">
        <span v-if="!day.stops.length">-</span>
        <template v-for="(stop, index) in day.stops" :key="index">
          <span v-if="index > 0" class="text-muted"> → </span>
          <span :class="stop.issue ? 'text-[var(--el-color-warning)]' : ''">
            {{ stop.name || "-" }}
            <span class="text-muted">({{ $t(`dashboard.tourMap.roles.${stop.role}`) }})</span>
            <template v-if="stop.issue">· {{ $t(issueLabelKey(stop.issue)) }}</template>
          </span>
        </template>
      </dd>
      <dt class="text-muted">
        {{ $t("dashboard.tourMap.stay") }}
      </dt>
      <dd class="m-0 text-[var(--el-text-color-regular)]">
        {{ $t(`dashboard.tourMap.overnightStatus.${day.overnightStatus}`) }}
      </dd>
      <template v-if="day.hotelPlans.length">
        <dt class="text-muted">
          {{ $t("dashboard.tourMap.hotelPlans") }}
        </dt>
        <dd class="m-0 text-[var(--el-text-color-regular)]">
          <div v-for="(plan, index) in day.hotelPlans" :key="index">
            {{ plan }}
          </div>
        </dd>
      </template>
      <template v-if="day.description">
        <dt class="text-muted">
          {{ $t("dashboard.tourMap.dayDescription") }}
        </dt>
        <dd class="m-0 text-[var(--el-text-color-regular)] whitespace-pre-line break-words">
          {{ day.description }}
        </dd>
      </template>
      <template v-if="day.attractions.length">
        <dt class="text-muted">
          {{ $t("dashboard.tourMap.attractions") }}
        </dt>
        <dd class="m-0 text-[var(--el-text-color-regular)]">
          {{ day.attractions.join("、") }}
        </dd>
      </template>
      <template v-if="day.meals.length">
        <dt class="text-muted">
          {{ $t("dashboard.tourMap.meals") }}
        </dt>
        <dd class="m-0 text-[var(--el-text-color-regular)]">
          <div v-for="(meal, index) in day.meals" :key="index">
            {{ mealText(meal) }}
          </div>
        </dd>
      </template>
      <template v-if="day.transport.length">
        <dt class="text-muted">
          {{ $t("dashboard.tourMap.transport") }}
        </dt>
        <dd class="m-0 text-[var(--el-text-color-regular)]">
          <div v-for="(item, index) in day.transport" :key="index">
            {{ transportText(item) }}
          </div>
        </dd>
      </template>
    </dl>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
import type { TourMapDay } from "@/types/dashboard";
import type { TourSourceModule } from "@/types/tour";
import { getTransportMethodNames } from "@/utils/transport-method";
import { issueLabelKey } from "./tour-map";

const props = defineProps<{
  day: TourMapDay | null;
  title: string;
  emptyText: string;
  sourceModule: TourSourceModule;
}>();

const MEAL_SLOTS = ["breakfast", "lunch", "dinner"];
const WEBSITE_TRANSPORT_MODES = ["hsr", "private_vehicle", "flight", "other"];

const { t, te, locale } = useI18n();

// 普通行程餐饮为枚举，独立站为服务端拼好的摘要，原样展示。
function mealText(meal: string) {
  return MEAL_SLOTS.includes(meal) ? t(`itinerary.meals.${meal}`) : meal;
}

function transportText(value: string) {
  if (props.sourceModule === "standard") return getTransportMethodNames(value, locale.value);
  const key = `websiteInquiry.transportModes.${value}`;
  return WEBSITE_TRANSPORT_MODES.includes(value) && te(key) ? t(key) : value;
}
</script>
