<template>
  <section>
    <div class="flex justify-between items-center mb-3">
      <strong>{{ $t("websiteItineraryUi.hotelPlans") }}</strong>
      <el-button v-if="editable" @click="addHotel">
        {{ $t("websiteItineraryUi.addHotel") }}
      </el-button>
    </div>
    <el-alert
      v-if="day.overnightCityId && !day.hotels.length"
      :title="$t('websiteItineraryUi.hotelRequiredHint')"
      type="info"
      :closable="false"
      class="mb-3"
    />
    <el-card
      v-for="(hotel, index) in day.hotels"
      :key="hotel.id"
      shadow="never"
      class="mb-3"
    >
      <div class="grid grid-cols-2 gap-x-4 max-[650px]:grid-cols-1">
        <el-form-item :label="$t('websiteItineraryUi.hotelTier')">
          <el-select v-model="hotel.tier" autocomplete="new-password">
            <el-option value="A" :label="$t('websiteItineraryUi.hotelTierA')" />
            <el-option value="B" :label="$t('websiteItineraryUi.hotelTierB')" />
          </el-select>
        </el-form-item>
        <el-form-item :label="$t('websiteItineraryUi.overnightCity')">
          <el-select v-model="hotel.cityId" autocomplete="new-password" filterable>
            <el-option
              v-for="city in config.cities"
              :key="city.id"
              :value="city.id"
              :label="city.nameZh"
            />
          </el-select>
        </el-form-item>
        <el-form-item :label="$t('websiteItineraryUi.selectConfigHotel')">
          <el-select
            autocomplete="new-password"
            :model-value="hotel.configHotelId"
            clearable
            filterable
            @update:model-value="(id: string | null) => pickConfigHotel(hotel, id)"
          >
            <el-option
              v-for="item in hotelsOf(hotel.cityId)"
              :key="item.id"
              :value="item.id"
              :label="item.nameZh"
            />
          </el-select>
          <div v-if="configHotel(hotel)" class="text-[12px] text-[var(--el-text-color-secondary)]">
            {{ $t("websiteItineraryUi.configHotelPrice", { price: formatMoney(configHotel(hotel)?.price) }) }}
          </div>
        </el-form-item>
        <el-form-item :label="$t('websiteItineraryUi.selectSharedHotel')">
          <WebsiteResourceSelect
            v-model="hotel.resourceId"
            kind="hotel"
            :selected-name="hotel.nameZh"
            @select="
              (resource) => {
                if (resource) hotel.nameZh = resource.name;
              }
            "
          />
        </el-form-item>
        <el-form-item :label="$t('websiteItineraryUi.hotelBreakfastIncluded')">
          <el-switch v-model="hotel.breakfastIncluded" />
        </el-form-item>
        <el-form-item :label="$t('websiteItineraryUi.hotelNameZh')">
          <el-input v-model="hotel.nameZh" maxlength="150" />
        </el-form-item>
        <el-form-item :label="$t('websiteItineraryUi.hotelNameEn')">
          <el-input v-model="hotel.nameEn" maxlength="150" />
        </el-form-item>
        <el-form-item :label="$t('websiteItineraryUi.roomType')">
          <el-input
            v-model="hotel.roomType"
            :placeholder="$t('websiteItineraryUi.roomTypePlaceholder')"
            maxlength="200"
          />
        </el-form-item>
      </div>
      <el-button
        v-if="editable"
        link
        type="danger"
        @click="day.hotels.splice(index, 1)"
      >
        {{ $t("websiteItineraryUi.removeHotel") }}
      </el-button>
    </el-card>
  </section>
</template>
<script setup lang="ts">
import { formatMoney } from "@/utils";
import type { WebsiteConfig, WebsiteDay, WebsiteHotelStay } from "@/types/website";
import WebsiteResourceSelect from "../../components/WebsiteResourceSelect.vue";
const props = defineProps<{ day: WebsiteDay; config: WebsiteConfig; editable: boolean }>();
function hotelsOf(cityId: string) {
  return props.config.hotels.filter((item) => item.status === "enabled" && item.cityId === cityId);
}
function configHotel(hotel: WebsiteHotelStay) {
  return props.config.hotels.find((item) => item.id === hotel.configHotelId);
}
function pickConfigHotel(hotel: WebsiteHotelStay, id: string | null) {
  const item = id ? props.config.hotels.find((row) => row.id === id) : undefined;
  hotel.configHotelId = item?.id ?? null;
  if (!item) return;
  hotel.nameZh = item.nameZh;
  hotel.nameEn = item.nameEn;
  hotel.resourceId = item.resourceId;
}
function addHotel() {
  props.day.hotels.push({
    id: crypto.randomUUID(),
    tier: "A",
    cityId: props.day.overnightCityId ?? props.day.endCityId,
    configHotelId: null,
    resourceId: null,
    nameZh: "",
    nameEn: "",
    roomType: "",
    breakfastIncluded: true,
  });
}
</script>
