<template>
  <section class="mb-4">
    <div class="mb-2 flex flex-wrap items-baseline justify-between gap-2">
      <h4 class="m-0 text-[14px]">
        {{ $t("websiteItineraryUi.nightlyStays") }}
      </h4>
      <strong class="flex flex-wrap gap-x-2">
        <span>{{ $t("websiteItineraryUi.hotelGroupTotal") }}</span>
        <span>{{ summary.total === null ? $t("websiteReport.undetermined") : nightlyMoney(summary.total) }}</span>
      </strong>
    </div>
    <p v-if="!overnights.length" class="text-muted">
      {{ $t("itinerary.noOvernightStay") }}
    </p>
    <fieldset v-for="segment in segments" :key="segment.first.id" class="mb-3 min-w-0 border border-solid border-[var(--divider-color)] px-3 pb-2">
      <legend class="px-1 text-sm font-600">
        <span class="flex flex-wrap gap-x-2">
          <span>{{ stayLabel(segment.first, segment.days.length) }}</span>
          <span v-if="cityName(segment.first.overnightCityId)">{{ cityName(segment.first.overnightCityId) }}</span>
          <span>{{ $t("websitePrint.nights", { count: segment.days.length }) }}</span>
        </span>
      </legend>
      <div v-for="(hotel, index) in segment.first.hotels" :key="hotel.id" class="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
        <div class="min-w-45 flex-1">
          <el-checkbox
            class="max-w-full min-h-8 !h-auto"
            :model-value="hotel.nightlySelected"
            :disabled="!editable"
            @update:model-value="updateRooms(segment.days, index, { nightlySelected: Boolean($event) })"
          >
            <span class="inline-flex flex-wrap items-center gap-x-2 gap-y-1 whitespace-normal">
              <span class="[overflow-wrap:anywhere]">{{ localName(hotel) || $t("websiteItineraryUi.hotelNameMissing") }}</span>
              <el-tag size="small" effect="plain" :type="hotel.breakfastIncluded ? 'success' : 'info'">
                {{ $t(hotel.breakfastIncluded ? "websitePrint.breakfastIncluded" : "websitePrint.breakfastExcluded") }}
              </el-tag>
              <span>{{ $t(`websiteItineraryUi.hotelTier${hotel.tier}`) }}</span>
            </span>
          </el-checkbox>
          <p v-if="hotel.roomType" class="m-0 text-xs text-muted">
            {{ hotel.roomType }}
          </p>
        </div>
        <el-form-item class="!mb-0" :label="$t('websiteItineraryUi.roomCount')">
          <el-input-number
            :model-value="hotel.nightlyRooms ?? undefined"
            :disabled="!editable || !hotel.nightlySelected"
            :min="1"
            :max="10000"
            :precision="0"
            :controls="false"
            class="!w-18"
            @update:model-value="updateRooms(segment.days, index, { nightlyRooms: $event ?? null })"
          />
        </el-form-item>
        <el-form-item class="!mb-0" label-width="auto" :error="hotel.nightlyRate && !isValidVehiclePrice(hotel.nightlyRate) ? $t('websiteItineraryUi.invalidNightlyRate') : ''">
          <template #label>
            <span class="min-w-18 whitespace-nowrap">{{ $t("websiteItineraryUi.nightlyRate") }}</span>
          </template>
          <el-input
            :model-value="hotel.nightlyRate ?? ''"
            :disabled="!editable || !hotel.nightlySelected"
            inputmode="decimal"
            class="!w-26"
            @update:model-value="updateRooms(segment.days, index, { nightlyRate: $event.trim() || null })"
          />
        </el-form-item>
        <span class="min-w-24 flex flex-wrap gap-x-2 text-sm">
          <span>{{ $t("websiteItineraryUi.staySubtotal") }}</span>
          <span>{{ subtotal(hotel, segment.days.length) }}</span>
        </span>
        <el-button
          v-if="hotel.nightlyOnly && editable && segment.days.length === 1"
          link
          type="danger"
          @click="segment.first.hotels = segment.first.hotels.filter(h => h.id !== hotel.id)"
        >
          {{ $t("common.delete") }}
        </el-button>
      </div>
      <el-button
        v-if="editable && segment.days.length > 1"
        link
        type="primary"
        @click="segment.days.forEach(day => separateDays.add(day.id))"
      >
        {{ $t("websiteItineraryUi.editIndividualNights") }}
      </el-button>
      <el-button
        v-if="editable && config && segment.days.length === 1 && segment.first.hotels.length < 100"
        link
        type="primary"
        @click="extraDay = segment.first"
      >
        {{ $t("websiteItineraryUi.addNightlyStay") }}
      </el-button>
    </fieldset>
    <WebsiteHotelDialog
      v-if="extraDay && config"
      :model-value="true"
      :day="extraDay"
      :day-label="stayLabel(extraDay)"
      :config="config"
      :selectable-city-ids="new Set([extraDay.overnightCityId!])"
      nightly
      @submit="addStay"
      @update:model-value="extraDay = undefined"
    />
  </section>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import { useI18n } from "vue-i18n";
import type { WebsiteConfig, WebsiteDay, WebsiteHotelStay, WebsiteItineraryInput } from "@/types/website";
import { isConsecutiveServiceDay, serviceDayDate } from "@/utils/service-dates";
import { addDays } from "@/utils/format";
import { nightlyAccommodation, nightlyMoney, nightlyRoomTotal } from "../nightly-pricing";
import { isValidVehiclePrice } from "../vehicle-price";
import WebsiteHotelDialog from "./WebsiteHotelDialog.vue";

const days = defineModel<WebsiteDay[]>("days", { required: true });
const props = defineProps<{ config?: WebsiteConfig | null; editable: boolean; calendar: WebsiteItineraryInput }>();
const { locale } = useI18n();
const extraDay = ref<WebsiteDay>();
const overnights = computed(() => days.value.filter(day => day.overnightCityId));
const summary = computed(() => nightlyAccommodation(days.value));
const separateDays = reactive(new Set<string>());
const segments = computed(() => {
  const result: { first: WebsiteDay; days: WebsiteDay[]; key: string }[] = [];
  for (const day of overnights.value) {
    const key = JSON.stringify([day.overnightCityId, day.hotels.map(h => [h.tier, h.configHotelId, h.resourceId, h.nameZh, h.nameEn, h.roomType,
      h.breakfastIncluded, h.nightlySelected, h.nightlyRooms, h.nightlyRate, !!h.nightlyOnly])]);
    const last = result.at(-1);
    const previous = last?.days.at(-1);
    if (last && previous && day.hotels.length && last.key === key && previous.dayNumber + 1 === day.dayNumber
      && !separateDays.has(day.id) && !separateDays.has(previous.id) && isConsecutiveServiceDay(props.calendar.serviceDates, day.dayNumber)) {
      last.days.push(day);
    } else result.push({ first: day, days: [day], key });
  }
  return result;
});
function updateRooms(segment: WebsiteDay[], index: number, change: Pick<WebsiteHotelStay, "nightlyRooms" | "nightlyRate" | "nightlySelected">) {
  for (const day of segment) Object.assign(day.hotels[index]!, change);
}
function localName(record: { nameZh: string; nameEn: string }) {
  return (locale.value === "en" ? record.nameEn : record.nameZh) || record.nameZh || record.nameEn;
}
function cityName(id: string | null) {
  const city = props.config?.cities.find(c => c.id === id);
  return city ? localName(city) : "";
}
function stayLabel(day: WebsiteDay, nights = 1) {
  const date = serviceDayDate(props.calendar, day.dayNumber);
  return date ? `D${day.dayNumber} ${date} → ${addDays(date, nights)}` : `D${day.dayNumber} → D${day.dayNumber + nights}`;
}
function subtotal(hotel: WebsiteHotelStay, nights: number) {
  const amount = nightlyRoomTotal(hotel.nightlyRate, hotel.nightlyRooms);
  return hotel.nightlySelected && amount !== null ? nightlyMoney(amount * BigInt(nights)) : "—";
}
function addStay(hotel: WebsiteHotelStay) {
  extraDay.value?.hotels.push({
    ...hotel, nightlyOnly: true, nightlySelected: true, nightlyRooms: null,
    nightlyRate: props.config?.hotels.find(item => item.id === hotel.configHotelId)?.price ?? null,
  });
}
</script>
