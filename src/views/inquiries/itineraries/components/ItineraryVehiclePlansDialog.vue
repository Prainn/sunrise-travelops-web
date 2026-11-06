<template>
  <AppDialog
    :model-value="modelValue"
    :title="`${$t('planning.vehiclePlans')} · ${$t(mode === 'stage' ? 'planning.byStage' : 'planning.byItinerary')}`"
    size="xl"
    destroy-on-close
    :close-on-click-modal="false"
    :busy="saving"
    @close="emit('cancel')"
  >
    <section id="itinerary-vehicles">
      <div class="grid gap-[16px] lg:grid-cols-2">
        <SectionCard
          v-for="plan in plans"
          :key="plan.tier"
          class="max-h-60vh overflow-y-auto"
          :title="$t(`itinerary.vehicleServiceLevels.${plan.tier}`)"
          title-tag="h4"
        >
          <template #actions>
            <el-button :disabled="!editable" @click="addArrangement(plan)">
              {{ $t(mode === "stage" ? "planning.addStage" : "planning.addArrangement") }}
            </el-button>
          </template>

          <el-form label-position="left" label-width="auto">
            <div
              v-for="(arrangement, index) in plan.arrangements"
              :key="arrangement.id"
              class="mb-[16px] p-[14px] border border-solid border-[var(--divider-color)] surface-muted"
            >
              <div class="mb-[12px] flex items-center justify-between gap-[12px]">
                <strong>{{
                  $t("planning.vehicleArrangementNumber", { number: index + 1 })
                }}</strong>
                <el-button
                  :disabled="!editable"
                  type="danger"
                  link
                  @click="removeArrangement(plan, arrangement.id)"
                >
                  {{ $t("common.delete") }}
                </el-button>
              </div>

              <el-form-item :label="$t('planning.vehicleDateRange')">
                <el-date-picker
                  class="!w-full"
                  :model-value="arrangementDateRange(arrangement)"
                  type="daterange"
                  value-format="YYYY-MM-DD"
                  :disabled="!editable"
                  :disabled-date="disabledDateFor(plan, arrangement.id)"
                  :start-placeholder="$t('common.startDate')"
                  :end-placeholder="$t('common.endDate')"
                  range-separator="—"
                  @update:model-value="changeDateRange(plan, arrangement.id, $event)"
                />
              </el-form-item>

              <template v-if="arrangement.startDate && arrangement.endDate">
                <template v-if="mode === 'itinerary'">
                  <div
                    v-for="vehicle in arrangement.vehicles"
                    :key="vehicle.vehicleId"
                    class="mb-[8px] flex items-center gap-[8px]"
                  >
                    <span class="flex-1">{{ vehicle.vehicleName }} · {{ vehicle.seats }}
                      {{ $t("planning.seats") }}</span>
                    <el-input-number
                      :model-value="vehicle.quantity"
                      :min="1"
                      :precision="0"
                      :disabled="!editable"
                      class="!w-[100px]"
                      controls-position="right"
                      @change="
                        changeQuantity(plan, arrangement.id, vehicle.vehicleId, Number($event ?? 1))
                      "
                    />
                    <span>{{ $t("planning.vehicles") }}</span>
                    <el-button
                      :disabled="!editable"
                      link
                      type="danger"
                      @click="removeVehicle(plan, arrangement.id, vehicle.vehicleId)"
                    >
                      {{ $t("common.delete") }}
                    </el-button>
                  </div>

                  <div
                    v-if="addingVehicleId !== arrangement.id"
                    class="flex items-center justify-center w-full mb-4"
                  >
                    <el-button :disabled="!editable" @click="addingVehicleId = arrangement.id">
                      {{ $t("common.create") }}
                    </el-button>
                  </div>
                  <el-form-item
                    v-else
                    :label="$t('planning.arrangementVehicles')"
                    class="w-full items-center justify-center"
                  >
                    <ResourceSelect
                      :key="`${arrangement.id}-${arrangement.vehicles.length}`"
                      kind="transports"
                      model-value=""
                      :filters="{ serviceLevel: plan.tier }"
                      :disabled="!editable"
                      :disabled-option-ids="
                        arrangement.vehicles.map((vehicle) => vehicle.vehicleId)
                      "
                      :placeholder="$t('planning.addVehicle')"
                      class="w-300px!"
                      @update:model-value="addVehicle(plan.tier, arrangement.id, $event)"
                    />
                    <el-button class="ml-4" @click="addingVehicleId = ''">
                      {{ $t("common.cancel") }}
                    </el-button>
                  </el-form-item>
                </template>

                <el-form-item
                  v-for="price in arrangement.paxPrices ?? []"
                  :key="price.pax"
                  :label="
                    $t(mode === 'stage' ? 'planning.paxStagePrice' : 'planning.paxSegmentPrice', {
                      pax: price.pax,
                    })
                  "
                >
                  <el-input-number
                    class="!w-full"
                    :model-value="price.totalPrice"
                    :value-on-clear="null"
                    :min="0"
                    :precision="2"
                    :disabled="!editable"
                    :placeholder="$t('planning.priceNotEntered')"
                    controls-position="right"
                    @change="
                      emit(
                        'update-plan',
                        setVehicleSegmentPaxPrice(plan, arrangement.id, price.pax, $event ?? null),
                      )
                    "
                  />
                </el-form-item>
                <el-text
                  v-if="mode === 'itinerary'"
                  :type="arrangementSeats(arrangement) < passengerCount ? 'warning' : 'info'"
                  size="small"
                >
                  {{
                    $t("planning.capacityHint", {
                      seats: arrangementSeats(arrangement),
                      passengers: passengerCount,
                    })
                  }}
                </el-text>
              </template>
            </div>

            <template v-if="plan.arrangements.length">
              <el-alert
                v-for="difference in legacyStageTotalDifferences(plan, savedPlan(plan))"
                :key="difference.pax"
                class="mb-[12px]"
                type="warning"
                show-icon
                :closable="false"
                :title="
                  $t('planning.vehicleLegacyStageMismatch', {
                    pax: difference.pax,
                    original: formatMoney(difference.original),
                    total:
                      difference.total === null
                        ? $t('planning.priceNotEntered')
                        : `¥${formatMoney(difference.total)}`,
                  })
                "
              />
              <el-text class="mb-[8px] block" type="info" size="small">
                {{
                  $t(mode === "stage" ? "planning.vehicleStageTotalHint" : "planning.vehiclePaxTotalHint")
                }}
              </el-text>
              <div v-for="price in plan.paxPrices ?? []" :key="price.pax" class="mb-[12px]">
                <el-form-item
                  :label="$t('planning.paxTotalVehiclePrice', { pax: price.pax })"
                  class="!mb-[4px]"
                >
                  <div class="flex w-full items-center gap-[8px]">
                    <el-input-number
                      class="!flex-1"
                      :model-value="price.totalPrice"
                      :value-on-clear="null"
                      :min="0"
                      :precision="2"
                      :disabled="!editable || mode === 'stage'"
                      :placeholder="$t('planning.priceNotEntered')"
                      controls-position="right"
                      @change="changePaxTotal(plan, price.pax, $event ?? null)"
                    />
                    <el-tag :type="price.pricingMode === 'manual' ? 'warning' : 'info'" disable-transitions>
                      {{
                        $t(
                          price.pricingMode === "manual"
                            ? "planning.vehiclePricingManual"
                            : "planning.vehiclePricingAutomatic",
                        )
                      }}
                    </el-tag>
                  </div>
                </el-form-item>
                <el-text
                  v-if="isVehiclePaxTotalOverridden(plan, price.pax)"
                  type="info"
                  size="small"
                >
                  {{
                    $t("planning.vehiclePaxOverrideHint", {
                      pax: price.pax,
                      total: formatMoney(vehicleSegmentPaxTotal(plan, price.pax)),
                    })
                  }}
                </el-text>
                <el-form-item
                  v-if="vehiclePaxPriceNeedsReason(plan, price.pax, savedPlan(plan))"
                  :label="$t('planning.vehiclePaxReason', { pax: price.pax })"
                  required
                  class="!mt-[8px]"
                >
                  <el-input
                    :model-value="price.adjustmentReason ?? ''"
                    :disabled="!editable"
                    :placeholder="$t('identity.reasonPlaceholder')"
                    type="textarea"
                    :rows="2"
                    @update:model-value="changeReason(plan, price.pax, $event)"
                  />
                </el-form-item>
              </div>
            </template>
          </el-form>
        </SectionCard>
      </div>
      <el-text v-if="seatShortage" class="mt-[12px] block" type="warning">
        {{ $t("planning.vehicleSeatShortage", { passengers: passengerCount }) }}
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
        :disabled="seatShortage"
        @click="emit('save')"
      >
        {{ $t("common.save") }}
      </el-button>
    </template>
  </AppDialog>
</template>

<script setup lang="ts">
import { ElMessage } from "element-plus";
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import AppDialog from "@/components/AppDialog/index.vue";
import ResourceSelect from "@/components/ResourceSelect/index.vue";
import SectionCard from "@/components/SectionCard/index.vue";
import { resourceService } from "@/services/resource.service";
import type {
  ItineraryVehicleArrangement,
  ItineraryVehiclePlan,
  ItineraryVehicleTier,
} from "@/types/itinerary";
import { addDays, createId, formatDate, formatMoney, roundMoney } from "@/utils";
import { savedVehiclePaxTotal, vehiclePaxPriceNeedsReason } from "../price-adjustments";
import {
  arrangementSeats,
  hasVehicleSeatShortage,
  isVehiclePaxTotalOverridden,
  legacyStageTotalDifferences,
  setVehiclePaxTotal,
  setVehicleSegmentPaxPrice,
  vehicleSegmentPaxTotal,
  withVehicleArrangements,
} from "../vehicle-plans";
import type { VehicleMaintenanceMode } from "../vehicle-plans";

const props = defineProps<{
  /** Deep-copied draft owned by the workspace; never the saved record. */
  plans: ItineraryVehiclePlan[];
  savedPlans: ItineraryVehiclePlan[];
  startDate: string;
  plannedDays: number;
  paxTiers: number[];
  editable: boolean;
  modelValue: boolean;
  saving: boolean;
  mode: VehicleMaintenanceMode;
}>();
const emit = defineEmits<{
  "update-plan": [plan: ItineraryVehiclePlan];
  save: [];
  cancel: [];
}>();
const { t } = useI18n();
const tripEndDate = computed(() => addDays(props.startDate, props.plannedDays - 1));
const passengerCount = computed(() => Math.max(0, ...props.paxTiers));
// Unfinished prices stay saveable as Draft; dated itinerary ranges still need enough seats.
const seatShortage = computed(() => hasVehicleSeatShortage(props.plans, passengerCount.value));
const addingVehicleId = ref("");

function savedPlan(plan: ItineraryVehiclePlan) {
  return props.savedPlans.find((saved) => saved.tier === plan.tier);
}

function updateArrangements(plan: ItineraryVehiclePlan, arrangements: ItineraryVehicleArrangement[]) {
  emit("update-plan", withVehicleArrangements(plan, arrangements));
}

function changePaxTotal(plan: ItineraryVehiclePlan, pax: number, totalPrice: number | null) {
  const saved = savedPlan(plan);
  const savedTotal = savedVehiclePaxTotal(saved, pax);
  // 回到已保存金额时沿用原因；其余改价须填写本次原因。
  const unchanged =
    totalPrice !== null && savedTotal !== null && roundMoney(savedTotal) === roundMoney(totalPrice);
  const savedReason = saved?.quotationMode
    ? (saved.paxPrices?.find((price) => price.pax === pax)?.adjustmentReason ?? "")
    : "";
  emit("update-plan", setVehiclePaxTotal(plan, pax, totalPrice, unchanged ? savedReason : ""));
}

function changeReason(plan: ItineraryVehiclePlan, pax: number, reason: string) {
  emit("update-plan", {
    ...plan,
    paxPrices: plan.paxPrices?.map((price) =>
      price.pax === pax ? { ...price, adjustmentReason: reason } : price,
    ),
  });
}

function addArrangement(plan: ItineraryVehiclePlan) {
  const defaultDate =
    Array.from({ length: props.plannedDays }, (_, index) => addDays(props.startDate, index)).find(
      (date) =>
        !plan.arrangements.some(
          (arrangement) =>
            arrangement.startDate &&
            arrangement.endDate &&
            date >= arrangement.startDate &&
            date <= arrangement.endDate,
        ),
    ) ?? "";
  updateArrangements(plan, [
    ...plan.arrangements,
    {
      id: createId("vehicle-arrangement"),
      startDate: defaultDate,
      endDate: defaultDate,
      vehicles: [],
      totalPrice: null,
      paxPrices: props.paxTiers.map((pax) => ({ pax, totalPrice: null })),
    },
  ]);
}

function removeArrangement(plan: ItineraryVehiclePlan, id: string) {
  updateArrangements(
    plan,
    plan.arrangements.filter((arrangement) => arrangement.id !== id),
  );
}

function arrangementDateRange(arrangement: ItineraryVehicleArrangement) {
  return arrangement.startDate && arrangement.endDate
    ? [arrangement.startDate, arrangement.endDate]
    : [];
}

function isDateDisabled(plan: ItineraryVehiclePlan, arrangementId: string, date: Date) {
  const value = formatDate(date);
  if (value < props.startDate || value > tripEndDate.value) return true;
  return plan.arrangements.some(
    (arrangement) =>
      arrangement.id !== arrangementId &&
      arrangement.startDate &&
      arrangement.endDate &&
      value >= arrangement.startDate &&
      value <= arrangement.endDate,
  );
}

function disabledDateFor(plan: ItineraryVehiclePlan, arrangementId: string) {
  return (date: Date) => isDateDisabled(plan, arrangementId, date);
}

function changeDateRange(plan: ItineraryVehiclePlan, id: string, value: unknown) {
  if (!Array.isArray(value) || value.length !== 2) {
    updateArrangements(
      plan,
      plan.arrangements.map((arrangement) =>
        arrangement.id === id ? { ...arrangement, startDate: "", endDate: "" } : arrangement,
      ),
    );
    return;
  }
  const [startDate, endDate] = value.map(String);
  if (startDate === undefined || endDate === undefined) return;
  if (startDate < props.startDate || endDate > tripEndDate.value) {
    ElMessage.warning(t("planning.vehicleDateOutOfRange"));
    return;
  }
  const overlaps = plan.arrangements.some(
    (arrangement) =>
      arrangement.id !== id &&
      arrangement.startDate &&
      arrangement.endDate &&
      startDate <= arrangement.endDate &&
      endDate >= arrangement.startDate,
  );
  if (overlaps) {
    ElMessage.warning(t("planning.vehicleDateOverlap"));
    return;
  }
  updateArrangements(
    plan,
    plan.arrangements.map((arrangement) =>
      arrangement.id === id ? { ...arrangement, startDate, endDate } : arrangement,
    ),
  );
}

function changeQuantity(
  plan: ItineraryVehiclePlan,
  id: string,
  vehicleId: string,
  quantity: number,
) {
  updateArrangements(
    plan,
    plan.arrangements.map((arrangement) =>
      arrangement.id === id
        ? {
          ...arrangement,
          vehicles: arrangement.vehicles.map((vehicle) =>
            vehicle.vehicleId === vehicleId ? { ...vehicle, quantity } : vehicle,
          ),
        }
        : arrangement,
    ),
  );
}

function removeVehicle(plan: ItineraryVehiclePlan, id: string, vehicleId: string) {
  updateArrangements(
    plan,
    plan.arrangements.map((arrangement) =>
      arrangement.id === id
        ? {
          ...arrangement,
          vehicles: arrangement.vehicles.filter((vehicle) => vehicle.vehicleId !== vehicleId),
        }
        : arrangement,
    ),
  );
}

async function addVehicle(tier: ItineraryVehicleTier, id: string, vehicleId: string) {
  if (!vehicleId || !props.editable) return;
  try {
    const resource = await resourceService.transportApi.getDetail(vehicleId);
    const plan = props.plans.find((record) => record.tier === tier);
    const target = plan?.arrangements.find((arrangement) => arrangement.id === id);
    if (
      !props.editable ||
      !plan ||
      !target ||
      resource.serviceLevel !== tier ||
      target.vehicles.some((vehicle) => vehicle.vehicleId === vehicleId)
    )
      return;
    addingVehicleId.value = "";
    updateArrangements(
      plan,
      plan.arrangements.map((arrangement) =>
        arrangement.id === id
          ? {
            ...arrangement,
            vehicles: [
              ...arrangement.vehicles,
              { vehicleId, vehicleName: resource.name, seats: resource.seats, quantity: 1 },
            ],
          }
          : arrangement,
      ),
    );
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : String(error));
  }
}
</script>
