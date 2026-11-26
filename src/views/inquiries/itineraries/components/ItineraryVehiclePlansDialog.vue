<template>
  <AppDialog
    :model-value="modelValue"
    :title="`${$t('planning.vehiclePlans')} (${$t(mode === 'stage' ? 'planning.byStage' : 'planning.byItinerary')})`"
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

              <el-form-item v-if="isSeries" :label="$t('planning.vehicleDayRange')">
                <div class="flex w-full items-center gap-2">
                  <el-select
                    class="flex-1"
                    autocomplete="new-password"
                    :model-value="itineraryDayNumber(startDate, arrangement.startDate)"
                    :aria-label="$t('planning.vehicleStartDay')"
                    :placeholder="$t('planning.vehicleStartDay')"
                    :disabled="!editable"
                    filterable
                    @update:model-value="changeStartDay(plan, arrangement, $event)"
                  >
                    <el-option
                      v-for="day in plannedDays"
                      :key="day"
                      :value="day"
                      :label="`D${day}`"
                    />
                  </el-select>
                  <span aria-hidden="true">—</span>
                  <el-select
                    class="flex-1"
                    autocomplete="new-password"
                    :model-value="itineraryDayNumber(startDate, arrangement.endDate)"
                    :aria-label="$t('planning.vehicleEndDay')"
                    :placeholder="$t('planning.vehicleEndDay')"
                    :disabled="!editable || !arrangement.startDate"
                    filterable
                    @update:model-value="changeEndDay(plan, arrangement, $event)"
                  >
                    <el-option
                      v-for="day in plannedDays"
                      :key="day"
                      :value="day"
                      :label="`D${day}`"
                      :disabled="day < (itineraryDayNumber(startDate, arrangement.startDate) ?? 1)"
                    />
                  </el-select>
                </div>
              </el-form-item>
              <el-form-item v-else :label="$t('planning.vehicleDateRange')">
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

              <component
                :is="mode === 'itinerary' ? 'fieldset' : 'div'"
                v-for="price in arrangement.paxPrices"
                :key="price.pax"
                class="min-w-0 m-0 p-0 border-0"
                :class="{ 'mb-3 border-t! border-solid! border-[var(--divider-color)]!': mode === 'itinerary' }"
              >
                <legend v-if="mode === 'itinerary'" class="mb-2 pr-2 font-semibold">
                  {{ $t("planning.vehiclePaxTier", { pax: price.pax }) }}
                </legend>
                <ItineraryPaxVehicles
                  v-if="mode === 'itinerary'"
                  :tier="plan.tier"
                  :vehicles="price.vehicles ?? []"
                  :editable="editable"
                  @change="emit('update-plan', updateVehicleSegmentPax(plan, arrangement.id, price.pax, { vehicles: $event }))"
                />
                <template v-if="arrangement.startDate && arrangement.endDate">
                  <el-form-item :label="mode === 'stage' ? $t('planning.paxStagePrice', { pax: price.pax }) : $t('planning.vehicleSegmentGroupPrice')">
                    <el-input-number
                      class="!w-full"
                      :model-value="price.totalPrice"
                      :value-on-clear="null"
                      :min="0"
                      :precision="2"
                      :disabled="!editable"
                      :placeholder="$t('planning.priceNotEntered')"
                      controls-position="right"
                      @change="emit('update-plan', updateVehicleSegmentPax(plan, arrangement.id, price.pax, { totalPrice: $event ?? null }))"
                    />
                  </el-form-item>
                  <el-text
                    v-if="mode === 'itinerary'"
                    :type="vehicleSeats(price.vehicles ?? []) < price.pax ? 'warning' : 'info'"
                    size="small"
                  >
                    {{ $t("planning.capacityHint", { seats: vehicleSeats(price.vehicles ?? []), passengers: price.pax }) }}
                  </el-text>
                </template>
              </component>
            </div>

            <template v-if="plan.arrangements.length">
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
        {{ $t("planning.vehicleSeatShortage") }}
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
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import AppDialog from "@/components/AppDialog/index.vue";
import ItineraryPaxVehicles from "./ItineraryPaxVehicles.vue";
import SectionCard from "@/components/SectionCard/index.vue";
import type {
  ItineraryVehicleArrangement,
  ItineraryVehiclePlan,
} from "@/types/itinerary";
import { addDays, createId, formatDate, formatMoney, roundMoney } from "@/utils";
import { itineraryDayNumber } from "../duration";
import { savedVehiclePaxTotal, vehiclePaxPriceNeedsReason } from "../price-adjustments";
import {
  vehicleSeats,
  hasVehicleSeatShortage,
  isVehiclePaxTotalOverridden,
  setVehiclePaxTotal,
  updateVehicleSegmentPax,
  vehicleSegmentPaxTotal,
  withVehicleArrangements,
} from "../vehicle-plans";
import type { VehicleMaintenanceMode } from "../vehicle-plans";

const props = defineProps<{
  /** Deep-copied draft owned by the workspace; never the saved record. */
  plans: ItineraryVehiclePlan[];
  savedPlans: ItineraryVehiclePlan[];
  startDate: string;
  isSeries?: boolean;
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
const seatShortage = computed(() => hasVehicleSeatShortage(props.plans, props.paxTiers));

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
  const savedReason = saved?.paxPrices?.find((price) => price.pax === pax)?.adjustmentReason ?? "";
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
  // 用车段按具体日期保存，普通行程须先填写开始日期。
  if (!props.startDate) {
    ElMessage.warning(t("planning.vehicleStartDateRequired"));
    return;
  }
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
  const id = createId("vehicle-arrangement");
  updateArrangements(plan, [
    ...plan.arrangements,
    {
      id,
      startDate: defaultDate,
      endDate: defaultDate,
      vehicles: [],
      totalPrice: null,
      paxPrices: props.paxTiers.map((pax) => ({ pax, totalPrice: null, ...(props.mode === "itinerary" && { vehicles: [] }) })),
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

function changeStartDay(plan: ItineraryVehiclePlan, arrangement: ItineraryVehicleArrangement, day: number) {
  const startDate = addDays(props.startDate, day - 1);
  const endDate = arrangement.endDate >= startDate ? arrangement.endDate : startDate;
  changeDateRange(plan, arrangement.id, [startDate, endDate]);
}

function changeEndDay(plan: ItineraryVehiclePlan, arrangement: ItineraryVehicleArrangement, day: number) {
  changeDateRange(plan, arrangement.id, [arrangement.startDate, addDays(props.startDate, day - 1)]);
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
  if (startDate < props.startDate || endDate > tripEndDate.value || startDate > endDate) {
    ElMessage.warning(t(props.isSeries ? "planning.vehicleDayOutOfRange" : "planning.vehicleDateOutOfRange"));
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
    ElMessage.warning(t(props.isSeries ? "planning.vehicleDayOverlap" : "planning.vehicleDateOverlap"));
    return;
  }
  updateArrangements(
    plan,
    plan.arrangements.map((arrangement) =>
      arrangement.id === id ? { ...arrangement, startDate, endDate } : arrangement,
    ),
  );
}

</script>
