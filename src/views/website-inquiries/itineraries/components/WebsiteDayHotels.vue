<template>
  <section class="surface-muted p-4 flex flex-col gap-3">
    <div class="flex flex-wrap justify-between items-center gap-3">
      <h4 class="m-0 text-[14px] text-strong font-600">
        {{ $t("websiteItineraryUi.hotelPlans") }}
      </h4>
      <el-button
        v-if="editable && day.overnightCityId"
        link
        type="primary"
        :disabled="tiersFull"
        @click="emit('edit', -1)"
      >
        {{ $t("common.create") }}
      </el-button>
    </div>
    <p v-if="editable && day.overnightCityId && tiersFull" class="m-0 text-[12px] text-muted">
      {{ $t("websiteItineraryUi.hotelTiersFull") }}
    </p>
    <el-alert
      v-if="day.overnightCityId && !day.hotels.length"
      :title="$t('websiteItineraryUi.hotelRequiredHint')"
      type="info"
      :closable="false"
    />
    <p v-if="!day.overnightCityId && !day.hotels.length" class="m-0 text-[13px] text-muted">
      {{ $t("itinerary.noOvernightStay") }}
    </p>
    <p v-if="day.hotels.length > 1" class="m-0 text-[12px] text-muted">
      {{ $t("websiteItineraryUi.hotelAlternativesHint") }}
    </p>
    <div
      v-for="(hotel, index) in day.hotels"
      :key="hotel.id"
      class="flex items-start gap-3 p-3 rounded-[var(--custom-radius)] bg-surface border border-solid border-[var(--divider-color)]"
    >
      <div class="min-w-0 flex-1 flex flex-col gap-1 text-[13px]">
        <div class="flex flex-wrap items-center gap-2">
          <el-tag size="small">
            {{ $t(`websiteItineraryUi.hotelTier${hotel.tier}`) }}
          </el-tag>
          <strong class="text-[14px] text-strong [overflow-wrap:anywhere]">
            {{ hotelName(hotel) || $t("websiteItineraryUi.hotelNameMissing") }}
          </strong>
          <el-tag size="small" effect="plain" type="info">
            {{ $t(`websiteItineraryUi.hotelSources.${hotelSource(hotel)}`) }}
          </el-tag>
        </div>
        <span class="text-muted">
          {{ cityName(hotel.cityId) }}
          <template v-if="hotel.roomType"> · {{ hotel.roomType }}</template>
          · {{ $t(hotel.breakfastIncluded ? "websiteItineraryUi.breakfastIncludedShort" : "websiteItineraryUi.breakfastExcludedShort") }}
        </span>
        <span v-if="configHotel(hotel)" class="text-muted">
          {{ $t("websiteItineraryUi.configHotelPrice", { price: formatMoney(configHotel(hotel)?.price) }) }}
        </span>
      </div>
      <div v-if="editable" class="flex shrink-0 self-start">
        <el-button link type="primary" @click="emit('edit', index)">
          {{ $t("common.edit") }}
        </el-button>
      </div>
    </div>
  </section>
</template>
<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { HOTEL_TIERS } from "../vehicle-price";
import { formatMoney } from "@/utils";
import type { WebsiteConfig, WebsiteDay, WebsiteHotelStay } from "@/types/website";
const day = defineModel<WebsiteDay>("day", { required: true });
const props = defineProps<{ config: WebsiteConfig; editable: boolean }>();
/** index 为 -1 表示新增 */
const emit = defineEmits<{ edit: [index: number] }>();
const { locale } = useI18n();
/** 同日每档最多一家酒店，四档用完后不可新增。 */
const tiersFull = computed(() => HOTEL_TIERS.every((tier) => day.value.hotels.some((hotel) => hotel.tier === tier)));
function hotelName(hotel: WebsiteHotelStay) {
  return (locale.value === "en" ? hotel.nameEn : hotel.nameZh) || hotel.nameZh || hotel.nameEn;
}
function hotelSource(hotel: WebsiteHotelStay) {
  return hotel.configHotelId ? "config" : hotel.resourceId ? "public" : "manual";
}
function cityName(id: string) {
  const city = props.config.cities.find((item) => item.id === id);
  return city ? (locale.value === "en" ? city.nameEn : city.nameZh) : "-";
}
function configHotel(hotel: WebsiteHotelStay) {
  return props.config.hotels.find((item) => item.id === hotel.configHotelId);
}
</script>
