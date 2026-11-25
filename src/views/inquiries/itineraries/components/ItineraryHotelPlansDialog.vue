<template>
  <AppDialog
    :model-value="modelValue"
    class="itinerary-hotel-plans"
    size="xl"
    top="16px"
    :close-on-click-modal="false"
    :busy="saving"
    @close="emit('cancel')"
  >
    <template #header>
      <h3 class="m-0 text-[16px] font-600 text-strong">
        {{ $t("itinerary.hotelPlans") }}
      </h3>
      <div class="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-[var(--el-text-color-regular)] text-[14px]">
        <template v-for="(destination, index) in overnightDestinations" :key="destination">
          <span v-if="index" aria-hidden="true">/</span>
          <span class="[overflow-wrap:anywhere]">
            {{ destination }}
            {{
              $t("itinerary.nightCount", {
                count: destinationDuration(dailyPlans, destination).nights,
              })
            }}
          </span>
        </template>
        <strong>{{
          $t("itinerary.totalNights", { count: itineraryDuration(dailyPlans).nights })
        }}</strong>
        <span v-if="pendingNights" class="text-[var(--el-color-warning)]">
          {{ $t("itinerary.pendingNights", { count: pendingNights }) }}
        </span>
      </div>
    </template>
    <section id="itinerary-hotels">
      <template v-if="hotelRows.length">
        <div class="flex flex-wrap items-center gap-x-6 gap-y-2">
          <el-tabs v-model="activeTier" class="itinerary-hotel-plans__tabs min-w-0 flex-1" @tab-click="handleTierTabChange">
            <el-tab-pane
              v-for="tier in HOTEL_PLAN_TIERS"
              :key="tier"
              :name="tier"
              :label="$t(`itinerary.hotelTiers.${tier}`)"
            />
          </el-tabs>
          <el-button
            v-if="getPlan(activeTier)?.hotels.length"
            link
            type="danger"
            :disabled="!editable"
            @click="emit('clear-plan', activeTier)"
          >
            {{ $t("itinerary.clearCurrentHotelTier") }}
          </el-button>
        </div>
        <el-form class="itinerary-hotel-plans__form mt-3" @submit.prevent>
          <DataTable
            :key="activeTier"
            :data="hotelRows"
            row-key="dayId"
            :aria-label="$t(`itinerary.hotelTiers.${activeTier}`)"
          >
            <el-table-column :label="$t('websitePrint.dayColumn')" width="80">
              <template #default="{ row }">
                <span class="font-500">D{{ row.dayNumber }}</span>
              </template>
            </el-table-column>
            <el-table-column :label="$t('itinerary.hotelCostCity')" min-width="100">
              <template #default="{ row }">
                {{ row.destination }}
              </template>
            </el-table-column>
            <el-table-column :label="$t('resource.hotelName')" min-width="320">
              <template #default="{ row }">
                <el-form-item>
                  <ResourceSelect
                    class="w-full"
                    kind="hotels"
                    :model-value="getHotel(activeTier, row.dayId)?.hotelId ?? ''"
                    :selected-label="getHotel(activeTier, row.dayId)?.hotelName"
                    :filters="{ city: row.destination, rating: activeTier }"
                    :disabled="!editable"
                    :placeholder="$t('itinerary.selectDestinationHotel')"
                    :aria-label="`D${row.dayNumber} ${row.destination} ${$t('resource.hotelName')}`"
                    popper-class="itinerary-hotel-plans__options"
                    :fit-input-width="true"
                    @update:model-value="emit('update-selection', activeTier, row.dayId, $event)"
                  />
                </el-form-item>
              </template>
            </el-table-column>
            <el-table-column :label="$t('identity.reference')" min-width="200">
              <template #default="{ row }">
                <el-form-item v-if="getHotel(activeTier, row.dayId)">
                  <el-select
                    autocomplete="new-password"
                    class="w-full"
                    :disabled="!editable || !hotelResource(activeTier, row.dayId)"
                    :model-value="getHotel(activeTier, row.dayId)?.referenceBasis"
                    :aria-label="`D${row.dayNumber} ${$t('identity.reference')}`"
                    popper-class="itinerary-hotel-plans__options"
                    :fit-input-width="true"
                    @update:model-value="emit('update-rate', activeTier, row.dayId, $event)"
                  >
                    <el-option
                      value="hotel_individual"
                      :label="`${$t('hotel.individualPrice')} ¥${hotelResource(activeTier, row.dayId)?.individualPrice ?? 0}`"
                    />
                    <el-option
                      v-if="hotelResource(activeTier, row.dayId)?.groupPrice != null"
                      value="hotel_group"
                      :label="`${$t('hotel.groupPrice')} ¥${hotelResource(activeTier, row.dayId)?.groupPrice}`"
                    />
                  </el-select>
                </el-form-item>
              </template>
            </el-table-column>
            <el-table-column :label="$t('itinerary.hotelUnitPrice')" min-width="180">
              <template #default="{ row }">
                <el-form-item v-if="getHotel(activeTier, row.dayId)">
                  <el-input-number
                    :model-value="getHotel(activeTier, row.dayId)?.unitCost"
                    :min="0"
                    :precision="2"
                    :disabled="!editable"
                    :controls="false"
                    :aria-label="`D${row.dayNumber} ${$t('planning.hotelPrice')}`"
                    @update:model-value="emit('update-cost', activeTier, row.dayId, $event ?? null)"
                  />
                </el-form-item>
              </template>
            </el-table-column>
            <!-- 原因单独成列并用单行输入，避免个别行变高导致表格高低不平 -->
            <el-table-column
              v-if="hasReasonRows"
              :label="$t('identity.reason')"
              min-width="200"
            >
              <template #default="{ row }">
                <el-form-item v-if="hotelNeedsReason(activeTier, row.dayId)">
                  <el-input
                    :model-value="getHotel(activeTier, row.dayId)?.adjustmentReason ?? ''"
                    :disabled="!editable"
                    :aria-label="`D${row.dayNumber} ${$t('identity.reason')}`"
                    :placeholder="$t('identity.reasonPlaceholder')"
                    @update:model-value="emit('update-reason', activeTier, row.dayId, $event)"
                  />
                </el-form-item>
              </template>
            </el-table-column>
          </DataTable>
        </el-form>
      </template>
      <el-alert
        v-else-if="pendingNights"
        type="info"
        show-icon
        :closable="false"
        :title="$t('itinerary.hotelPlansPending')"
      />
      <el-text v-else type="info">
        {{ $t("itinerary.hotelPlansNotNeeded") }}
      </el-text>
    </section>
    <template #footer>
      <el-button @click="emit('cancel')">
        {{ $t(editable ? "common.cancel" : "common.close") }}
      </el-button>
      <el-button
        v-if="editable"
        type="primary"
        :loading="saving"
        :disabled="!canSave"
        @click="emit('save')"
      >
        {{ $t("common.save") }}
      </el-button>
    </template>
  </AppDialog>
</template>

<script setup lang="ts">
import { recordClientOperation } from "@/utils/client-operation-log";

function handleTierTabChange() {
  recordClientOperation({ page: "InquiryItineraries", action: "tab", result: "success" });
}
import { computed, ref, watch } from "vue";
import { selectionPriceNeedsReason } from "../price-adjustments";
import { resourceService } from "@/services/resource.service";
import AppDialog from "@/components/AppDialog/index.vue";
import DataTable from "@/components/DataTable/index.vue";
import ResourceSelect from "@/components/ResourceSelect/index.vue";
import type { ItineraryDayRecord, ItineraryHotelPlan, ItineraryHotelTier } from "@/types/itinerary";
import {
  getHotelPlan,
  getIncompleteHotelPlanTiers,
  getOvernightDays,
  HOTEL_PLAN_TIERS,
} from "../hotel-plans";
import { destinationDuration, itineraryDuration } from "../duration";

const props = defineProps<{
  destinations: string[];
  dailyPlans: ItineraryDayRecord[];
  hotelPlans: ItineraryHotelPlan[];
  savedHotelPlans: ItineraryHotelPlan[];
  editable: boolean;
  modelValue: boolean;
  saving: boolean;
}>();
/** 酒店按档次和住宿日维护；同城多晚可以分别选择不同酒店。 */
const emit = defineEmits<{
  "clear-plan": [tier: ItineraryHotelTier];
  "update-selection": [tier: ItineraryHotelTier, dayId: string, hotelId: string];
  "update-rate": [
    tier: ItineraryHotelTier,
    dayId: string,
    basis: "hotel_group" | "hotel_individual",
  ];
  "update-cost": [tier: ItineraryHotelTier, dayId: string, price: number | null];
  "update-reason": [tier: ItineraryHotelTier, dayId: string, reason: string];
  save: [];
  cancel: [];
}>();

const activeTier = ref<ItineraryHotelTier>(4);

watch(
  () => props.modelValue,
  async (visible) => {
    if (!visible) return;
    activeTier.value = HOTEL_PLAN_TIERS.find((tier) => getPlan(tier)?.hotels.length) ?? 4;
    const ids = [
      ...new Set(props.hotelPlans.flatMap((plan) => plan.hotels.map((hotel) => hotel.hotelId))),
    ];
    await Promise.allSettled(
      ids.map(async (id) => {
        const record = await resourceService.hotelApi.getDetail(id);
        const index = resourceService.hotels.findIndex((hotel) => hotel.id === id);
        if (index < 0) resourceService.hotels.push(record);
        else resourceService.hotels[index] = record;
      }),
    );
  },
);
function hotelResource(tier: ItineraryHotelTier, dayId: string) {
  const id = getHotel(tier, dayId)?.hotelId;
  return resourceService.hotels.find((hotel) => hotel.id === id);
}

const hotelRows = computed(() =>
  getOvernightDays({ dailyPlans: props.dailyPlans })
    .filter((day) => props.destinations.includes(day.overnightDestination!))
    .map((day) => ({
      dayId: day.id,
      dayNumber: day.dayNumber,
      destination: day.overnightDestination!,
    })),
);
const overnightDestinations = computed(() => [
  ...new Set(hotelRows.value.map((row) => row.destination)),
]);
const hasReasonRows = computed(() =>
  hotelRows.value.some((row) => hotelNeedsReason(activeTier.value, row.dayId)),
);
const pendingNights = computed(
  () => props.dailyPlans.filter((day) => day.overnightDestination === null).length,
);
const canSave = computed(
  () =>
    !getIncompleteHotelPlanTiers({
      dailyPlans: props.dailyPlans,
      hotelPlans: props.hotelPlans,
    }).length,
);

function hotelNeedsReason(tier: ItineraryHotelTier, dayId: string) {
  const hotel = getHotel(tier, dayId);
  if (!hotel) return false;
  const saved = props.savedHotelPlans
    .find((plan) => plan.tier === tier)
    ?.hotels.find((item) => item.dayId === dayId);
  const sameSource =
    saved?.hotelId === hotel.hotelId && saved.referenceBasis === hotel.referenceBasis;
  return selectionPriceNeedsReason(hotel.unitCost, hotel, sameSource ? (saved.unitCost ?? undefined) : undefined);
}

function getPlan(tier: ItineraryHotelTier) {
  return getHotelPlan({ hotelPlans: props.hotelPlans }, tier);
}

function getHotel(tier: ItineraryHotelTier, dayId: string) {
  return getPlan(tier)?.hotels.find((hotel) => hotel.dayId === dayId);
}
</script>

<style scoped lang="scss">
.itinerary-hotel-plans__tabs {
  :deep(.el-tabs__header) {
    margin-bottom: 0;
  }

  :deep(.el-tabs__item) {
    height: 52px;
    font-size: 16px;
  }
}

.itinerary-hotel-plans__form {
  :deep(.el-form-item) {
    margin-bottom: 0;
  }

  :deep(.el-input-number) {
    width: 100%;
  }
}

:global(.itinerary-hotel-plans__options .el-select-dropdown__item) {
  height: auto;
  min-height: 34px;
  padding-block: 10px;
  white-space: normal;
  overflow: visible;
  overflow-wrap: anywhere;
  text-overflow: clip;
  line-height: 1.5;
}

:global(.itinerary-hotel-plans__options .remote-select-option) {
  min-width: 0;
  white-space: normal;
  overflow-wrap: anywhere;
}
</style>
