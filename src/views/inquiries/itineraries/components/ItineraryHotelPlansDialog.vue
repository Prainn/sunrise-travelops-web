<template>
  <el-dialog
    :model-value="modelValue"
    width="min(1400px, 96vw)"
    :close-on-click-modal="false"
    @close="emit('cancel')"
  >
    <template #header>
      <div class="itinerary-hotel-plans__toolbar min-h-[48px] flex items-center">
        <h3 class="m-0">
          {{ $t("itinerary.hotelPlans") }}
        </h3>
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
    </template>
    <section
      id="itinerary-hotels"
      class="itinerary-hotel-plans max-h-60vh overflow-y-auto"
    >
      <el-card
        class="itinerary-hotel-plans__card rounded-[10px]"
        shadow="never"
      >
        <div
          v-if="overnightDestinations.length"
          class="itinerary-hotel-plans__tiers grid grid-cols-2 gap-[12px] max-[1100px]:grid-cols-1"
        >
          <article
            v-for="tier in HOTEL_PLAN_TIERS"
            :key="tier"
            class="itinerary-hotel-plans__tier overflow-hidden rounded-[8px] bg-[var(--el-bg-color)] [border:1px_solid_var(--el-border-color-lighter)] [transition:border-color_0.2s,_box-shadow_0.2s]"
            :class="{ 'is-selected [border-color:var(--el-color-primary-light-5)] [box-shadow:0_0_0_1px_var(--el-color-primary-light-8)]': Boolean(getPlan(tier)?.hotels.length) }"
          >
            <header
              class="min-h-[48px] flex items-center justify-between gap-[16px] px-[14px] bg-[var(--el-fill-color-lighter)]"
              :class="{ 'bg-[var(--el-color-primary-light-9)]': Boolean(getPlan(tier)?.hotels.length) }"
            >
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
                <span class="min-w-100px">{{ destination }}</span>
                <div class="w-1/2">
                  <ResourceSelect
                    class="w-full"
                    kind="hotels"
                    :model-value="getHotelSelectionId(tier, destination)"
                    :selected-label="getPlan(tier)?.hotels.find(hotel => hotel.destination === destination)?.hotelName"
                    :filters="{ city: destination, rating: tier === 'international_five_star' ? tier : 'ctrip_preferred' }"
                    :disabled="!editable"
                    :placeholder="$t('itinerary.selectDestinationHotel')"
                    @update:model-value="emit('update-selection', tier, destination, $event)"
                  />
                </div>
                <div
                  v-if="getPlan(tier)?.hotels.some(hotel => hotel.destination === destination)"
                  class="col-start-2 flex items-center flex-wrap gap-[8px]"
                >
                  <el-select
                    class="!w-[210px]"
                    :disabled="!editable || !hotelResource(tier, destination)"
                    :model-value="getPlan(tier)?.hotels.find(hotel => hotel.destination === destination)?.referenceBasis"
                    @update:model-value="emit('update-rate', tier, destination, $event)"
                  >
                    <el-option
                      value="hotel_individual"
                      :label="`${$t('hotel.individualPrice')} ¥${hotelResource(tier, destination)?.individualPrice ?? '—'}`"
                    />
                    <el-option
                      v-if="hotelResource(tier, destination)?.groupPrice != null"
                      value="hotel_group"
                      :label="`${$t('hotel.groupPrice')} ¥${hotelResource(tier, destination)?.groupPrice}`"
                    />
                  </el-select>
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
    <template #footer>
      <el-button @click="emit('cancel')">
        {{ $t(editable ? 'common.cancel' : 'common.close') }}
      </el-button>
      <el-button
        v-if="editable"
        type="primary"
        :loading="saving"
        :disabled="!canSave"
        @click="emit('save')"
      >
        {{ $t('itinerary.save') }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, watch } from "vue";
import { resourceService } from "@/services/resource.service";
import ResourceSelect from "@/components/ResourceSelect/index.vue";
import type { ItineraryDayRecord, ItineraryHotelPlan, ItineraryHotelTier } from "@/types/itinerary";
import { getHotelPlan, getIncompleteHotelPlanTiers, HOTEL_PLAN_TIERS } from "../hotel-plans";
import { destinationDuration, itineraryDuration } from "../duration";

const props = defineProps<{
  destinations: string[];
  dailyPlans: ItineraryDayRecord[];
  hotelPlans: ItineraryHotelPlan[];
  editable: boolean;
  modelValue: boolean;
  saving: boolean;
}>();
const emit = defineEmits<{
  "clear-plan": [tier: ItineraryHotelTier];
  "update-selection": [tier: ItineraryHotelTier, destination: string, hotelId: string];
  "update-rate": [tier: ItineraryHotelTier, destination: string, basis: "hotel_group" | "hotel_individual"];
  "update-cost": [tier: ItineraryHotelTier, destination: string, price: number];
  save: [];
  cancel: [];
}>();

watch(() => props.modelValue, async visible => {
  if (!visible) return;
  const ids = [...new Set(props.hotelPlans.flatMap(plan => plan.hotels.map(hotel => hotel.hotelId)))];
  await Promise.allSettled(ids.map(async id => {
    const record = await resourceService.hotelApi.getDetail(id);
    const index = resourceService.hotels.findIndex(hotel => hotel.id === id);
    if (index < 0) resourceService.hotels.push(record);
    else resourceService.hotels[index] = record;
  }));
});
function hotelResource(tier: ItineraryHotelTier, destination: string) {
  const id = getHotelSelectionId(tier, destination);
  return resourceService.hotels.find(hotel => hotel.id === id);
}

const overnightDestinations = computed(() => props.destinations.filter(destination => props.dailyPlans.some(day => day.overnightDestination === destination)));
const pendingNights = computed(() => props.dailyPlans.filter(day => day.overnightDestination === null).length);
const canSave = computed(() => !getIncompleteHotelPlanTiers({
  dailyPlans: props.dailyPlans,
  hotelPlans: props.hotelPlans,
}).length);

function getPlan(tier: ItineraryHotelTier) {
  return getHotelPlan({ hotelPlans: props.hotelPlans }, tier);
}

function getHotelSelectionId(tier: ItineraryHotelTier, destination: string) {
  return getPlan(tier)?.hotels.find(hotel => hotel.destination === destination)?.hotelId ?? "";
}

</script>

<style scoped>
.itinerary-hotel-plans__card :deep(.el-card__body) { padding: 16px 18px; }
</style>
