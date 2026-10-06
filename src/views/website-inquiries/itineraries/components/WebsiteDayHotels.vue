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
          <el-select v-model="hotel.tier">
            <el-option value="A" :label="$t('websiteItineraryUi.hotelTierA')" />
            <el-option value="B" :label="$t('websiteItineraryUi.hotelTierB')" />
          </el-select>
        </el-form-item>
        <el-form-item :label="$t('websiteItineraryUi.overnightCity')">
          <el-select v-model="hotel.cityId" filterable>
            <el-option
              v-for="city in config.cities"
              :key="city.id"
              :value="city.id"
              :label="city.nameZh"
            />
          </el-select>
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
import type { WebsiteConfig, WebsiteDay } from "@/types/website";
import WebsiteResourceSelect from "../../components/WebsiteResourceSelect.vue";
const props = defineProps<{ day: WebsiteDay; config: WebsiteConfig; editable: boolean }>();
function addHotel() {
  props.day.hotels.push({
    id: crypto.randomUUID(),
    tier: "A",
    cityId: props.day.overnightCityId ?? props.day.endCityId,
    resourceId: null,
    nameZh: "",
    nameEn: "",
    roomType: "",
    breakfastIncluded: true,
  });
}
</script>
