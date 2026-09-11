<template>
  <section
    id="itinerary-hotels"
    class="itinerary-hotel-plans mt-[24px]"
  >
    <div class="itinerary-hotel-plans__toolbar min-h-[48px] mb-[14px] flex items-center">
      <h3>{{ $t("itinerary.hotelPlans") }}</h3>
      <div class="ml-4 flex items-center flex-wrap gap-[12px]">
        <el-tag
          v-for="destination in overnightDestinations"
          :key="destination"
        >
          {{ destination }} · {{ $t('itinerary.nightCount', { count: destinationDuration(dailyPlans, destination).nights }) }}
        </el-tag>
        <strong>{{ $t('itinerary.totalNights', { count: itineraryDuration(dailyPlans).nights }) }}</strong>
        <el-tag
          v-if="pendingNights"
          type="warning"
        >
          {{ $t('itinerary.pendingNights', { count: pendingNights }) }}
        </el-tag>
      </div>
    </div>
    <el-card
      class="itinerary-hotel-plans__card"
      shadow="never"
    >
      <div
        v-if="overnightDestinations.length"
        class="itinerary-hotel-plans__tiers"
      >
        <article
          v-for="tier in HOTEL_PLAN_TIERS"
          :key="tier"
          class="itinerary-hotel-plans__tier"
          :class="{ 'is-selected': Boolean(getPlan(tier)?.hotels.length) }"
        >
          <header>
            <strong>{{ $t(`itinerary.hotelTiers.${tier}`) }}</strong>
            <el-button
              v-if="getPlan(tier)?.hotels.length"
              link
              type="danger"
              :disabled="!editable"
              @click="emit('clear-plan', tier)"
            >
              {{ $t("common.clear") }}
            </el-button>
          </header>

          <div class="grid gap-[10px] p-[12px]">
            <div
              v-for="destination in overnightDestinations"
              :key="destination"
              class="itinerary-hotel-plans__selection flex items-start gap-4 p-[16px] [border:1px_solid_var(--el-border-color-lighter)] rounded-[8px] [background:var(--el-fill-color-extra-light)]"
            >
              <span>{{ destination }}</span>
              <div class="w-1/2">
                <ResourceSelect
                  kind="hotels"
                  :model-value="getHotelSelectionId(tier, destination)"
                  :selected-label="getPlan(tier)?.hotels.find(hotel => hotel.destination === destination)?.hotelName"
                  :filters="{ city: destination, rating: tier === 'international_five_star' ? tier : 'ctrip_preferred', guestCount }"
                  :disabled="!editable"
                  :placeholder="$t('itinerary.selectDestinationHotel')"
                  @update:model-value="emit('update-selection', tier, destination, $event)"
                />
              </div>
              <div
                v-if="getPlan(tier)?.hotels.some(hotel => hotel.destination === destination)"
                class="col-start-2 flex items-center flex-wrap gap-[8px]"
              >
                <el-input-number
                  class="!w-[160px]"
                  :model-value="getPlan(tier)?.hotels.find(hotel => hotel.destination === destination)?.unitCost"
                  :min="0"
                  :precision="2"
                  :disabled="!editable"
                  controls-position="right"
                  :aria-label="$t('planning.hotelPrice')"
                  @change="emit('update-cost', tier, destination, Number($event ?? 0))"
                />
                <small>{{ $t('planning.hotelPriceUnit') }}</small>
              </div>
            </div>
          </div>
        </article>
      </div>
      <el-alert
        v-else-if="pendingNights"
        type="info"
        show-icon
        :closable="false"
        :title="$t('itinerary.hotelPlansPending')"
      />
      <el-text
        v-else
        type="info"
      >
        {{ $t('itinerary.hotelPlansNotNeeded') }}
      </el-text>
    </el-card>
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";
import ResourceSelect from "@/components/ResourceSelect/index.vue";
import type { ItineraryDayRecord, ItineraryHotelPlan, ItineraryHotelTier } from "@/types/itinerary";
import { destinationDuration, itineraryDuration } from "@/views/inquiries/itineraries/duration";
import { getHotelPlan, HOTEL_PLAN_TIERS } from "../hotel-plans";

const props = defineProps<{
  destinations: string[];
  dailyPlans: ItineraryDayRecord[];
  hotelPlans: ItineraryHotelPlan[];
  guestCount: number;
  editable: boolean;
}>();
const emit = defineEmits<{
  "clear-plan": [tier: ItineraryHotelTier];
  "update-selection": [tier: ItineraryHotelTier, destination: string, hotelId: string];
  "update-cost": [tier: ItineraryHotelTier, destination: string, price: number];
}>();

const overnightDestinations = computed(() => props.destinations.filter(destination => props.dailyPlans.some(day => day.overnightDestination === destination)));
const pendingNights = computed(() => props.dailyPlans.filter(day => day.overnightDestination === null).length);

function getPlan(tier: ItineraryHotelTier) {
  return getHotelPlan({ hotelPlans: props.hotelPlans }, tier);
}

function getHotelSelectionId(tier: ItineraryHotelTier, destination: string) {
  return getPlan(tier)?.hotels.find(hotel => hotel.destination === destination)?.hotelId ?? "";
}
</script>

<style scoped lang="scss">
.itinerary-hotel-plans { scroll-margin-top: 270px; }
.itinerary-hotel-plans__toolbar h3 { margin: 0; }
.itinerary-hotel-plans__card { border-radius: 10px; }
.itinerary-hotel-plans__card :deep(.el-card__body) { padding: 16px 18px; }
.itinerary-hotel-plans__tiers { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.itinerary-hotel-plans__tier { overflow: hidden; border: 1px solid var(--el-border-color-lighter); border-radius: 8px; background: var(--el-bg-color); transition: border-color 0.2s, box-shadow 0.2s; }
.itinerary-hotel-plans__tier > header { display: flex; align-items: center; justify-content: space-between; gap: 16px; min-height: 48px; padding: 0 14px; background: var(--el-fill-color-lighter); }
.itinerary-hotel-plans__tier.is-selected { border-color: var(--el-color-primary-light-5); box-shadow: 0 0 0 1px var(--el-color-primary-light-8); }
.itinerary-hotel-plans__tier.is-selected > header { background: var(--el-color-primary-light-9); }
.itinerary-hotel-plans__selection :deep(.el-select) { width: 100%; }
@media (width <= 1100px) {
  .itinerary-hotel-plans__tiers { grid-template-columns: 1fr; }
}
</style>
