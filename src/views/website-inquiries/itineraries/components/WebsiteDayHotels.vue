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
        @click="emit('edit', -1)"
      >
        {{ $t("websiteItineraryUi.addHotel") }}
      </el-button>
    </div>
    <el-alert
      v-if="day.overnightCityId && !day.hotels.length"
      :title="$t('websiteItineraryUi.hotelRequiredHint')"
      type="info"
      :closable="false"
    />
    <p v-if="!day.overnightCityId && !day.hotels.length" class="m-0 text-[13px] text-muted">
      {{ $t("websiteItineraryUi.noOvernightStay") }}
    </p>
    <p v-if="day.hotels.length > 1" class="m-0 text-[12px] text-muted">
      {{ $t("websiteItineraryUi.hotelAlternativesHint") }}
    </p>
    <div
      v-for="(hotel, index) in day.hotels"
      :key="hotel.id"
      class="flex flex-wrap items-start justify-between gap-3 p-3 rounded-[var(--custom-radius)] bg-surface border border-solid border-[var(--divider-color)]"
    >
      <div class="min-w-0 flex flex-col gap-1 text-[13px]">
        <div class="flex flex-wrap items-center gap-2">
          <el-tag size="small">
            {{ $t(hotel.tier === "A" ? "websiteItineraryUi.hotelTierA" : "websiteItineraryUi.hotelTierB") }}
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
      <div v-if="editable" class="flex shrink-0 gap-1">
        <el-button link type="primary" @click="emit('edit', index)">
          {{ $t("common.edit") }}
        </el-button>
        <el-button link type="danger" @click="day.hotels.splice(index, 1)">
          {{ $t("websiteItineraryUi.removeHotel") }}
        </el-button>
      </div>
    </div>
  </section>
</template>
<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { formatMoney } from "@/utils";
import type { WebsiteConfig, WebsiteDay, WebsiteHotelStay } from "@/types/website";
const day = defineModel<WebsiteDay>("day", { required: true });
const props = defineProps<{ config: WebsiteConfig; editable: boolean }>();
/** index 为 -1 表示新增 */
const emit = defineEmits<{ edit: [index: number] }>();
const { locale } = useI18n();
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
