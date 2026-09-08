<template>
  <div
    id="itinerary-plans"
    class="itinerary-hotel-vehicle-plans"
  >
    <section>
      <div class="itinerary-hotel-vehicle-plans__toolbar h-12">
        <h3>{{ $t("itinerary.hotelPlans") }}</h3>
        <div class="itinerary-hotel-vehicle-plans__nights ml-4">
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
        <div class="itinerary-hotel-vehicle-plans__hotel-tiers">
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

            <div class="itinerary-hotel-vehicle-plans__hotel-list">
              <label
                v-for="destination in overnightDestinations"
                :key="destination"
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
              </label>
            </div>
          </article>
        </div>
      </el-card>
    </section>

    <section>
      <div class="itinerary-hotel-vehicle-plans__toolbar h-12">
        <h3>{{ $t("itinerary.vehiclePlans") }}</h3>
      </div>
      <el-card
        class="itinerary-hotel-vehicle-plans__card"
        shadow="never"
      >
        <div class="itinerary-hotel-vehicle-plans__vehicle-tiers">
          <article
            v-for="tier in VEHICLE_PLAN_TIERS"
            :key="tier"
            class="itinerary-hotel-vehicle-plans__vehicle-tier"
            :class="{ 'is-selected': Boolean(findVehiclePlan(tier)?.vehicle) }"
          >
            <header>
              <strong>{{ $t(`itinerary.vehicleServiceLevels.${tier}`) }}</strong>
              <el-button
                v-if="findVehiclePlan(tier)?.vehicle"
                link
                type="danger"
                :disabled="!editable"
                @click="emit('update-vehicle', tier, '')"
              >
                {{ $t("common.clear") }}
              </el-button>
            </header>

            <div class="itinerary-hotel-vehicle-plans__vehicle-body">
              <label class="itinerary-hotel-vehicle-plans__vehicle-select">
                <span>{{ $t("itinerary.vehicleModel") }}</span>
                <ResourceSelect
                  kind="transports"
                  :model-value="findVehiclePlan(tier)?.vehicle?.vehicleId ?? ''"
                  :selected-label="findVehiclePlan(tier)?.vehicle?.vehicleName"
                  :filters="{ serviceLevel: tier, guestCount }"
                  :disabled="!editable"
                  :placeholder="$t('itinerary.selectVehicle')"
                  @update:model-value="emit('update-vehicle', tier, $event)"
                />
              </label>

              <div
                v-if="findVehiclePlan(tier)?.vehicle"
                class="itinerary-hotel-vehicle-plans__vehicle-fields"
              >
                <label>
                  <span>{{ $t("itinerary.vehicleServiceDays") }}</span>
                  <el-input-number
                    :model-value="findVehiclePlan(tier)?.vehicle?.serviceDays ?? 1"
                    :disabled="!editable || !findVehiclePlan(tier)?.vehicle"
                    :min="1"
                    :precision="0"
                    controls-position="right"
                    @change="emit('update-vehicle-days', tier, Number($event ?? 1))"
                  />
                </label>
                <label>
                  <span>{{ $t("itinerary.vehicleReferenceCost") }}</span>
                  <strong>
                    {{ findVehiclePlan(tier)?.vehicle ? `¥${formatMoney(findVehiclePlan(tier)!.vehicle!.referenceUnitCost)}` : "-" }}
                  </strong>
                </label>
                <label>
                  <span>{{ $t("itinerary.vehicleDailyCost") }}</span>
                  <el-input-number
                    :model-value="findVehiclePlan(tier)?.vehicle?.unitCost ?? 0"
                    :disabled="!editable || !findVehiclePlan(tier)?.vehicle"
                    :min="0"
                    :precision="2"
                    controls-position="right"
                    @change="emit('update-vehicle-cost', tier, Number($event ?? 0))"
                  />
                </label>
                <label>
                  <span>{{ $t("itinerary.vehicleSubtotal") }}</span>
                  <strong>
                    ¥{{ formatMoney(findVehiclePlan(tier)?.vehicle ? calculateVehicleSubtotal(findVehiclePlan(tier)!.vehicle!) : 0) }}
                  </strong>
                </label>
              </div>
            </div>
          </article>
        </div>
      </el-card>
    </section>
  </div>
</template>

<script setup lang="ts">
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
import { formatMoney } from "@/utils";
import { getHotelPlan, HOTEL_PLAN_TIERS } from "../hotel-plans";
import {
  calculateVehicleSubtotal,
  getVehiclePlan,
  VEHICLE_PLAN_TIERS,
} from "../vehicle-plans";

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
  "update-vehicle": [tier: ItineraryVehicleTier, vehicleId: string];
  "update-vehicle-days": [tier: ItineraryVehicleTier, serviceDays: number];
  "update-vehicle-cost": [tier: ItineraryVehicleTier, unitCost: number];
}>();

const overnightDestinations = computed(() => props.destinations.filter((destination) => props.dailyPlans.some((day) => day.overnightDestination === destination)));
const pendingNights = computed(() => props.dailyPlans.filter((day) => day.overnightDestination === null).length);

function getPlan(tier: ItineraryHotelTier) {
  return getHotelPlan({ hotelPlans: props.hotelPlans }, tier);
}

function getHotelSelectionId(tier: ItineraryHotelTier, destination: string) {
  return getPlan(tier)?.hotels.find((hotel) => hotel.destination === destination)?.hotelId ?? "";
}

function findVehiclePlan(tier: ItineraryVehicleTier) {
  return getVehiclePlan({ vehiclePlans: props.vehiclePlans }, tier);
}

</script>

<style scoped lang="scss">
.itinerary-hotel-vehicle-plans { scroll-margin-top: 270px; display: grid; gap: 24px; margin-bottom: 0; }
.itinerary-hotel-vehicle-plans__toolbar { display: flex; align-items: center; min-height: 48px; margin: 0 0 14px; }
.itinerary-hotel-vehicle-plans__toolbar h3 { margin: 0; }
.itinerary-hotel-vehicle-plans__card { border-radius: 10px; }
.itinerary-hotel-vehicle-plans__card :deep(.el-card__body) { padding: 16px 18px; }
.itinerary-hotel-vehicle-plans__hotel-tier > header, .itinerary-hotel-vehicle-plans__vehicle-tier > header { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.itinerary-hotel-vehicle-plans__hotel-tiers, .itinerary-hotel-vehicle-plans__vehicle-tiers { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.itinerary-hotel-vehicle-plans__hotel-tier, .itinerary-hotel-vehicle-plans__vehicle-tier { overflow: hidden; border: 1px solid var(--el-border-color-lighter); border-radius: 8px; background: var(--el-bg-color); transition: border-color 0.2s, box-shadow 0.2s; }
.itinerary-hotel-vehicle-plans__hotel-tier.is-selected, .itinerary-hotel-vehicle-plans__vehicle-tier.is-selected { border-color: var(--el-color-primary-light-5); box-shadow: 0 0 0 1px var(--el-color-primary-light-8); }
.itinerary-hotel-vehicle-plans__hotel-tier.is-selected > header, .itinerary-hotel-vehicle-plans__vehicle-tier.is-selected > header { background: var(--el-color-primary-light-9); }
.itinerary-hotel-vehicle-plans__hotel-tier > header, .itinerary-hotel-vehicle-plans__vehicle-tier > header { min-height: 48px; padding: 0 14px; background: var(--el-fill-color-lighter); }
.itinerary-hotel-vehicle-plans__hotel-list { display: grid; gap: 10px; padding: 12px; }
.itinerary-hotel-vehicle-plans__hotel-list label, .itinerary-hotel-vehicle-plans__vehicle-select { display: grid; grid-template-columns: 72px minmax(0, 1fr); align-items: center; gap: 8px; font-size: 14px; }
.itinerary-hotel-vehicle-plans__hotel-list :deep(.el-select), .itinerary-hotel-vehicle-plans__vehicle-select :deep(.el-select) { width: 100%; }
.itinerary-hotel-vehicle-plans__option { display: flex; justify-content: space-between; gap: 16px; }
.itinerary-hotel-vehicle-plans__option strong { color: var(--el-color-primary); font-weight: 500; }
.itinerary-hotel-vehicle-plans__vehicle-select { grid-template-columns: 72px minmax(0, 340px); }
.itinerary-hotel-vehicle-plans__vehicle-body { display: grid; gap: 12px; padding: 12px; }
.itinerary-hotel-vehicle-plans__vehicle-fields { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; padding-top: 12px; border-top: 1px solid var(--el-border-color-lighter); }
.itinerary-hotel-vehicle-plans__vehicle-fields label { display: grid; gap: 6px; color: var(--el-text-color-secondary); font-size: 14px; }
.itinerary-hotel-vehicle-plans__vehicle-fields label > strong { display: flex; align-items: center; min-height: 32px; color: var(--el-text-color-primary); font-size: 14px; font-variant-numeric: tabular-nums; }
.itinerary-hotel-vehicle-plans :deep(.el-input-number) { width: 100%; }
@media (width <= 1100px) {
  .itinerary-hotel-vehicle-plans__hotel-tiers, .itinerary-hotel-vehicle-plans__vehicle-tiers { grid-template-columns: 1fr; }
}
</style>

<style scoped>
.itinerary-hotel-vehicle-plans__nights { display: flex; align-items: center; flex-wrap: wrap; gap: 12px; }
</style>
