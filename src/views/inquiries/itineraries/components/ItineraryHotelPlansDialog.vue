<template>
  <el-dialog
    :model-value="modelValue"
    class="itinerary-hotel-plans"
    width="min(1280px, calc(100vw - 32px))"
    top="16px"
    :close-on-click-modal="false"
    @close="emit('cancel')"
  >
    <template #header>
      <h3 class="m-0 text-6 font-600">
        {{ $t("itinerary.hotelPlans") }}
      </h3>
      <div class="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-[var(--el-text-color-regular)]">
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
      <template v-if="overnightDestinations.length">
        <div class="flex flex-wrap items-center gap-x-6 gap-y-2">
          <el-tabs v-model="activeTier" class="itinerary-hotel-plans__tabs min-w-0 flex-1">
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
        <el-form class="itinerary-hotel-plans__form" @submit.prevent>
          <table class="itinerary-hotel-plans__table w-full table-fixed border-collapse text-left">
            <caption class="sr-only">
              {{ $t(`itinerary.hotelTiers.${activeTier}`) }}
            </caption>
            <colgroup>
              <col class="w-[12%]" />
              <col class="w-[8%]" />
              <col class="w-[38%]" />
              <col class="w-[24%]" />
              <col class="w-[18%]" />
            </colgroup>
            <thead class="bg-[var(--el-fill-color-extra-light)] text-[var(--el-text-color-secondary)]">
              <tr>
                <th scope="col">
                  {{ $t("itinerary.hotelCostCity") }}
                </th>
                <th scope="col">
                  {{ $t("itinerary.hotelCostNights") }}
                </th>
                <th scope="col">
                  {{ $t("resource.hotelName") }}
                </th>
                <th scope="col">
                  {{ $t("identity.reference") }}
                </th>
                <th scope="col">
                  {{ $t("itinerary.hotelUnitPrice") }}
                </th>
              </tr>
            </thead>
            <tbody :key="activeTier">
              <tr v-for="destination in overnightDestinations" :key="destination">
                <th scope="row" class="font-500 [overflow-wrap:anywhere]">
                  {{ destination }}
                </th>
                <td>
                  {{ $t("itinerary.nightCount", { count: destinationDuration(dailyPlans, destination).nights }) }}
                </td>
                <td>
                  <el-form-item :label="$t('resource.hotelName')">
                    <ResourceSelect
                      class="w-full"
                      kind="hotels"
                      :model-value="getHotelSelectionId(activeTier, destination)"
                      :selected-label="getPlan(activeTier)?.hotels.find((hotel) => hotel.destination === destination)?.hotelName"
                      :filters="{ city: destination, rating: activeTier }"
                      :disabled="!editable"
                      :placeholder="$t('itinerary.selectDestinationHotel')"
                      :aria-label="`${destination} · ${$t('resource.hotelName')}`"
                      popper-class="itinerary-hotel-plans__options"
                      :fit-input-width="true"
                      @update:model-value="emit('update-selection', activeTier, destination, $event)"
                    />
                  </el-form-item>
                </td>
                <td>
                  <el-form-item
                    v-if="getHotelSelectionId(activeTier, destination)"
                    :label="$t('identity.reference')"
                  >
                    <el-select
                      autocomplete="new-password"
                      class="w-full"
                      :disabled="!editable || !hotelResource(activeTier, destination)"
                      :model-value="getPlan(activeTier)?.hotels.find((hotel) => hotel.destination === destination)?.referenceBasis"
                      :aria-label="`${destination} · ${$t('identity.reference')}`"
                      popper-class="itinerary-hotel-plans__options"
                      :fit-input-width="true"
                      @update:model-value="emit('update-rate', activeTier, destination, $event)"
                    >
                      <el-option
                        value="hotel_individual"
                        :label="`${$t('hotel.individualPrice')} ¥${hotelResource(activeTier, destination)?.individualPrice ?? 0}`"
                      />
                      <el-option
                        v-if="hotelResource(activeTier, destination)?.groupPrice != null"
                        value="hotel_group"
                        :label="`${$t('hotel.groupPrice')} ¥${hotelResource(activeTier, destination)?.groupPrice}`"
                      />
                    </el-select>
                  </el-form-item>
                </td>
                <td>
                  <template v-if="getHotelSelectionId(activeTier, destination)">
                    <el-form-item :label="$t('itinerary.hotelUnitPrice')">
                      <el-input-number
                        class="!w-full"
                        :model-value="getPlan(activeTier)?.hotels.find((hotel) => hotel.destination === destination)?.unitCost"
                        :min="0"
                        :precision="2"
                        :disabled="!editable"
                        :controls="false"
                        :aria-label="`${destination} · ${$t('planning.hotelPrice')}`"
                        @update:model-value="emit('update-cost', activeTier, destination, $event ?? null)"
                      />
                      <small class="mt-1 w-full text-[var(--el-text-color-secondary)]">
                        {{ $t("itinerary.breakfastIncluded") }}
                      </small>
                    </el-form-item>
                    <el-form-item
                      v-if="hotelNeedsReason(activeTier, destination)"
                      class="mt-3"
                      :label="$t('identity.reason')"
                    >
                      <el-input
                        :model-value="getPlan(activeTier)?.hotels.find((hotel) => hotel.destination === destination)?.adjustmentReason ?? ''"
                        :disabled="!editable"
                        :aria-label="`${destination} · ${$t('identity.reason')}`"
                        :placeholder="$t('identity.reasonPlaceholder')"
                        type="textarea"
                        :autosize="{ minRows: 2 }"
                        @update:model-value="emit('update-reason', activeTier, destination, $event)"
                      />
                    </el-form-item>
                  </template>
                </td>
              </tr>
            </tbody>
          </table>
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
        {{ $t("itinerary.save") }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { selectionPriceNeedsReason } from "../price-adjustments";
import { resourceService } from "@/services/resource.service";
import ResourceSelect from "@/components/ResourceSelect/index.vue";
import type { ItineraryDayRecord, ItineraryHotelPlan, ItineraryHotelTier } from "@/types/itinerary";
import {
  calculateDestinationNights,
  getHotelPlan,
  getIncompleteHotelPlanTiers,
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
const emit = defineEmits<{
  "clear-plan": [tier: ItineraryHotelTier];
  "update-selection": [tier: ItineraryHotelTier, destination: string, hotelId: string];
  "update-rate": [
    tier: ItineraryHotelTier,
    destination: string,
    basis: "hotel_group" | "hotel_individual",
  ];
  "update-cost": [tier: ItineraryHotelTier, destination: string, price: number | null];
  "update-reason": [tier: ItineraryHotelTier, destination: string, reason: string];
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
function hotelResource(tier: ItineraryHotelTier, destination: string) {
  const id = getHotelSelectionId(tier, destination);
  return resourceService.hotels.find((hotel) => hotel.id === id);
}

const overnightDestinations = computed(() =>
  Object.keys(calculateDestinationNights({ dailyPlans: props.dailyPlans })).filter((destination) =>
    props.destinations.includes(destination),
  ),
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

function hotelNeedsReason(tier: ItineraryHotelTier, destination: string) {
  const hotel = getPlan(tier)?.hotels.find((item) => item.destination === destination);
  if (!hotel) return false;
  const saved = props.savedHotelPlans
    .find((plan) => plan.tier === tier)
    ?.hotels.find((item) => item.destination === destination);
  const sameSource =
    saved?.hotelId === hotel.hotelId && saved.referenceBasis === hotel.referenceBasis;
  return selectionPriceNeedsReason(hotel.unitCost, hotel, sameSource ? (saved.unitCost ?? undefined) : undefined);
}

function getPlan(tier: ItineraryHotelTier) {
  return getHotelPlan({ hotelPlans: props.hotelPlans }, tier);
}

function getHotelSelectionId(tier: ItineraryHotelTier, destination: string) {
  return getPlan(tier)?.hotels.find((hotel) => hotel.destination === destination)?.hotelId ?? "";
}
</script>

<style scoped lang="scss">
:global(.itinerary-hotel-plans) {
  display: flex;
  flex-direction: column;
  max-height: calc(100dvh - 32px);
}

:global(.itinerary-hotel-plans .el-dialog__header),
:global(.itinerary-hotel-plans .el-dialog__footer) {
  flex-shrink: 0;
}

:global(.itinerary-hotel-plans .el-dialog__body) {
  min-height: 0;
  overflow-y: auto;
}

:global(.itinerary-hotel-plans .el-dialog__footer) {
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid var(--el-border-color-lighter);
}

.itinerary-hotel-plans__tabs {
  :deep(.el-tabs__header) {
    margin-bottom: 0;
  }

  :deep(.el-tabs__item) {
    height: 52px;
    font-size: 16px;
  }
}

.itinerary-hotel-plans__table {
  th,
  td {
    padding: 24px 12px;
    vertical-align: top;
    overflow-wrap: anywhere;
  }

  thead th {
    padding-block: 16px;
    font-weight: 500;
  }

  tbody tr {
    border-bottom: 1px solid var(--el-border-color-lighter);
  }

  tbody th,
  tbody td:nth-child(2) {
    padding-top: 32px;
  }

  :deep(.el-form-item) {
    display: block;
    margin-bottom: 0;
  }

  :deep(.el-form-item__label) {
    display: none;
  }

  :deep(.el-form-item__content) {
    min-width: 0;
  }

  :deep(.el-select__wrapper),
  :deep(.el-input__wrapper),
  :deep(.el-input-number .el-input__wrapper) {
    min-height: 41px;
    padding: 8px 4px;
    line-height: 24px;
    background: transparent;
    border-radius: 0;
    box-shadow: none;
    border-bottom: 1px solid var(--el-border-color);

    &:hover {
      border-bottom-color: var(--el-border-color-hover);
    }

    &.is-focused,
    &.is-focus {
      border-bottom-color: var(--el-color-primary);
    }
  }

  :deep(.el-select__selection) {
    display: grid;
  }

  :deep(.el-select__input-wrapper) {
    grid-area: 1 / 1;
    align-self: center;
    min-width: 0;
  }

  :deep(.el-select__input),
  :deep(.el-input-number .el-input__inner) {
    height: 24px;
    line-height: 24px;
  }

  :deep(.el-input-number .el-input) {
    height: auto;
  }

  :deep(.el-select__placeholder) {
    position: static;
    z-index: auto;
    grid-area: 1 / 1;
    transform: none;
    white-space: normal;
    overflow: visible;
    overflow-wrap: anywhere;
    text-overflow: clip;
    line-height: 24px;
    pointer-events: none;
  }

  :deep(.el-input-number .el-input__inner) {
    text-align: left;
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

@media (max-width: 767px) {
  .itinerary-hotel-plans__tabs {
    flex: 0 0 100%;
  }

  .itinerary-hotel-plans__form .itinerary-hotel-plans__table {
    colgroup,
    thead {
      display: none;
    }

    &,
    tbody {
      display: block;
    }

    tbody tr {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 16px;
      padding: 20px 0;
    }

    tbody th,
    tbody td {
      display: block;
      min-width: 0;
      padding: 0;
    }

    td:nth-child(n + 3) {
      grid-column: 1 / -1;
    }

    td:empty {
      display: none;
    }

    :deep(.el-form-item > .el-form-item__label) {
      display: block;
      max-width: none;
      width: 100%;
      text-align: left;
      height: auto;
      padding: 0;
      white-space: normal;
      line-height: 1.5;
      color: var(--el-text-color-secondary);
    }
  }
}
</style>
