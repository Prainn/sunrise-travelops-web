<template>
  <div
    id="itinerary-plans"
    class="itinerary-hotel-vehicle-plans"
  >
    <section>
      <div class="itinerary-hotel-vehicle-plans__toolbar h-12 flex items-center min-h-[48px] m-[0_0_14px]">
        <h3>{{ $t("itinerary.hotelPlans") }}</h3>
        <div class="itinerary-hotel-vehicle-plans__nights ml-4 flex items-center flex-wrap gap-[12px]">
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
        class="itinerary-hotel-vehicle-plans__card"
        shadow="never"
      >
        <div
          v-if="overnightDestinations.length"
          class="itinerary-hotel-vehicle-plans__hotel-tiers"
        >
          <article
            v-for="tier in HOTEL_PLAN_TIERS"
            :key="tier"
            class="itinerary-hotel-vehicle-plans__hotel-tier"
            :class="{ 'is-selected': Boolean(getPlan(tier)?.hotels.length) }"
          >
            <header>
              <strong>{{ $t(`itinerary.hotelTiers.${tier}`) }}</strong>
              <el-button
                v-if="getPlan(tier)?.hotels.length"
                link
                type="danger"
                :disabled="!editable"
                @click="emit('clear-hotel-plan', tier)"
              >
                {{ $t("common.clear") }}
              </el-button>
            </header>

            <div class="itinerary-hotel-vehicle-plans__hotel-list grid gap-[10px] p-[12px]">
              <div
                v-for="destination in overnightDestinations"
                :key="destination"
                class="itinerary-hotel-vehicle-plans__hotel-selection"
              >
                <span>{{ destination }}</span>
                <ResourceSelect
                  kind="hotels"
                  :model-value="getHotelSelectionId(tier, destination)"
                  :selected-label="getPlan(tier)?.hotels.find(hotel => hotel.destination === destination)?.hotelName"
                  :filters="{ city: destination, rating: tier === 'international_five_star' ? tier : 'ctrip_preferred', guestCount }"
                  :disabled="!editable"
                  :placeholder="$t('itinerary.selectDestinationHotel')"
                  @update:model-value="emit('update-hotel-selection', tier, destination, $event)"
                />
                <div
                  v-if="getPlan(tier)?.hotels.some(h => h.destination === destination)"
                  class="col-start-2 flex items-center flex-wrap gap-[8px]"
                >
                  <el-input-number
                    class="!w-[160px]"
                    :model-value="getPlan(tier)?.hotels.find(h => h.destination === destination)?.unitCost"
                    :min="0"
                    :precision="2"
                    :disabled="!editable"
                    controls-position="right"
                    :aria-label="$t('planning.hotelPrice')"
                    @change="emit('update-hotel-cost', tier, destination, Number($event ?? 0))"
                  />
                  <small>{{ $t('planning.hotelPriceUnit') }}</small>
                </div>
              </div>
            </div>
          </article>
        </div>
        <el-text
          v-else
          type="info"
        >
          {{ $t(pendingNights ? 'itinerary.hotelPlansPending' : 'itinerary.hotelPlansNotNeeded') }}
        </el-text>
      </el-card>
    </section>

    <ItineraryVehiclePlans
      :plans="vehiclePlans"
      :daily-plans="dailyPlans"
      :passenger-count="guestCount"
      :editable="editable"
      @update-plan="(tier, plan) => emit('update-vehicle-plan', tier, plan)"
    />
  </div>
</template>

<script setup lang="ts">
import ItineraryVehiclePlans from "./ItineraryVehiclePlans.vue";
import ResourceSelect from "@/components/ResourceSelect/index.vue";
import { destinationDuration, itineraryDuration } from "@/views/inquiries/itineraries/duration";
import type {
  ItineraryHotelPlan,
  ItineraryDayRecord,
  ItineraryHotelTier,
  ItineraryVehiclePlan,
  ItineraryVehicleTier,
} from "@/types/itinerary";
import { computed } from "vue";
import { getHotelPlan, HOTEL_PLAN_TIERS } from "../hotel-plans";

const props = defineProps<{
  destinations: string[];
  dailyPlans: ItineraryDayRecord[];
  hotelPlans: ItineraryHotelPlan[];
  vehiclePlans: ItineraryVehiclePlan[];
  guestCount: number;
  editable: boolean;
}>();
const emit = defineEmits<{
  "clear-hotel-plan": [tier: ItineraryHotelTier];
  "update-hotel-selection": [tier: ItineraryHotelTier, destination: string, hotelId: string];
  "update-hotel-cost": [tier: ItineraryHotelTier, destination: string, price: number];
  "update-vehicle-plan": [tier: ItineraryVehicleTier, plan: ItineraryVehiclePlan];
}>();

const overnightDestinations = computed(() => props.destinations.filter((destination) => props.dailyPlans.some((day) => day.overnightDestination === destination)));
const pendingNights = computed(() => props.dailyPlans.filter((day) => day.overnightDestination === null).length);

function getPlan(tier: ItineraryHotelTier) {
  return getHotelPlan({ hotelPlans: props.hotelPlans }, tier);
}

function getHotelSelectionId(tier: ItineraryHotelTier, destination: string) {
  return getPlan(tier)?.hotels.find((hotel) => hotel.destination === destination)?.hotelId ?? "";
}

</script>

<style scoped lang="scss">
.itinerary-hotel-vehicle-plans { @apply '[scroll-margin-top:270px] grid gap-[24px] mb-0'; }

.itinerary-hotel-vehicle-plans__toolbar h3 { margin: 0; }
.itinerary-hotel-vehicle-plans__card { @apply 'rounded-[10px]'; }
.itinerary-hotel-vehicle-plans__card :deep(.el-card__body) { padding: 16px 18px; }
.itinerary-hotel-vehicle-plans__hotel-tier > header, .itinerary-hotel-vehicle-plans__vehicle-tier > header { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.itinerary-hotel-vehicle-plans__hotel-tiers, .itinerary-hotel-vehicle-plans__vehicle-tiers { @apply 'grid [grid-template-columns:repeat(2,_minmax(0,_1fr))] gap-[12px]'; }
.itinerary-hotel-vehicle-plans__hotel-tier, .itinerary-hotel-vehicle-plans__vehicle-tier { @apply 'overflow-hidden [border:1px_solid_var(--el-border-color-lighter)] rounded-[8px] [background:var(--el-bg-color)] [transition:border-color_0.2s,_box-shadow_0.2s]'; }
.itinerary-hotel-vehicle-plans__hotel-tier.is-selected, .itinerary-hotel-vehicle-plans__vehicle-tier.is-selected { border-color: var(--el-color-primary-light-5); box-shadow: 0 0 0 1px var(--el-color-primary-light-8); }
.itinerary-hotel-vehicle-plans__hotel-tier.is-selected > header, .itinerary-hotel-vehicle-plans__vehicle-tier.is-selected > header { background: var(--el-color-primary-light-9); }
.itinerary-hotel-vehicle-plans__hotel-tier > header, .itinerary-hotel-vehicle-plans__vehicle-tier > header { min-height: 48px; padding: 0 14px; background: var(--el-fill-color-lighter); }

.itinerary-hotel-vehicle-plans__hotel-selection, .itinerary-hotel-vehicle-plans__vehicle-select { display: grid; grid-template-columns: 72px minmax(0, 1fr); align-items: center; gap: 8px; font-size: 14px; }
.itinerary-hotel-vehicle-plans__hotel-list :deep(.el-select), .itinerary-hotel-vehicle-plans__vehicle-select :deep(.el-select) { width: 100%; }
.itinerary-hotel-vehicle-plans__option { @apply 'flex justify-between gap-[16px]'; }
.itinerary-hotel-vehicle-plans__option strong { color: var(--el-color-primary); font-weight: 500; }

.itinerary-hotel-vehicle-plans__vehicle-select { @apply '[grid-template-columns:72px_minmax(0,_340px)]'; }
.itinerary-hotel-vehicle-plans__vehicle-fields label { display: grid; gap: 6px; color: var(--el-text-color-secondary); font-size: 14px; }
.itinerary-hotel-vehicle-plans__vehicle-fields label > strong { display: flex; align-items: center; min-height: 32px; color: var(--el-text-color-primary); font-size: 14px; font-variant-numeric: tabular-nums; }
.itinerary-hotel-vehicle-plans :deep(.el-input-number) { width: 100%; }
@media (width <= 1100px) {
  .itinerary-hotel-vehicle-plans__hotel-tiers, .itinerary-hotel-vehicle-plans__vehicle-tiers { @apply '[grid-template-columns:1fr]'; }
}
</style>
