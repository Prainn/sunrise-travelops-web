<template>
  <section id="itinerary-plans">
    <h3 class="mb-[14px]">
      {{ $t('planning.vehiclePlans') }} <small class="text-[var(--el-text-color-secondary)]">{{ $t('planning.passengers') }} {{ passengerCount }}</small>
    </h3>
    <div class="grid gap-[16px] lg:grid-cols-2">
      <el-card
        v-for="plan in plans"
        :key="plan.tier"
        shadow="never"
      >
        <template #header>
          <div class="flex justify-between items-center">
            <strong>{{ $t(`itinerary.vehicleServiceLevels.${plan.tier}`) }}</strong>
            <el-button
              :disabled="!editable"
              @click="addArrangement(plan)"
            >
              {{ $t('planning.addArrangement') }}
            </el-button>
          </div>
        </template>

        <el-form label-position="top">
          <div
            v-for="(arrangement, index) in plan.arrangements"
            :key="arrangement.id"
            class="mb-[16px] p-[14px] border border-solid border-[var(--el-border-color-lighter)] rounded-[8px] [background:var(--el-fill-color-extra-light)]"
          >
            <div class="mb-[12px] flex items-center justify-between gap-[12px]">
              <strong>{{ $t('planning.vehicleArrangementNumber', { number: index + 1 }) }}</strong>
              <el-button
                :disabled="!editable"
                type="danger"
                link
                @click="removeArrangement(plan, arrangement.id)"
              >
                {{ $t('planning.delete') }}
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
              <div
                v-for="vehicle in arrangement.vehicles"
                :key="vehicle.vehicleId"
                class="mb-[8px] flex items-center gap-[8px]"
              >
                <span class="flex-1">{{ vehicle.vehicleName }} · {{ vehicle.seats }} {{ $t('planning.seats') }}</span>
                <el-input-number
                  :model-value="vehicle.quantity"
                  :min="1"
                  :precision="0"
                  :disabled="!editable"
                  class="!w-[100px]"
                  controls-position="right"
                  @change="changeQuantity(plan, arrangement.id, vehicle.vehicleId, Number($event ?? 1))"
                />
                <span>{{ $t('planning.vehicles') }}</span>
                <el-button
                  :disabled="!editable"
                  link
                  type="danger"
                  @click="removeVehicle(plan, arrangement.id, vehicle.vehicleId)"
                >
                  {{ $t('planning.delete') }}
                </el-button>
              </div>

              <el-form-item :label="$t('planning.arrangementVehicles')">
                <ResourceSelect
                  :key="`${arrangement.id}-${arrangement.vehicles.length}`"
                  kind="transports"
                  model-value=""
                  :filters="{ serviceLevel: plan.tier }"
                  :disabled="!editable"
                  :disabled-option-ids="arrangement.vehicles.map(vehicle => vehicle.vehicleId)"
                  :placeholder="$t('planning.addVehicle')"
                  @update:model-value="addVehicle(plan.tier, arrangement.id, $event)"
                />
              </el-form-item>

              <el-form-item :label="$t('planning.arrangementVehiclePrice')">
                <el-input-number
                  class="!w-full"
                  :model-value="arrangement.totalPrice"
                  :min="0"
                  :precision="2"
                  :disabled="!editable"
                  :placeholder="$t('planning.optionalPrice')"
                  controls-position="right"
                  @change="changeArrangementPrice(plan, arrangement.id, $event ?? null)"
                />
              </el-form-item>

              <el-text
                type="info"
                size="small"
              >
                {{ $t('planning.capacityHint', { seats: arrangement.vehicles.reduce((sum, vehicle) => sum + vehicle.seats * vehicle.quantity, 0), passengers: passengerCount }) }}
              </el-text>
            </template>
          </div>

          <el-form-item
            v-if="plan.arrangements.length"
            :label="$t('planning.totalVehiclePrice')"
          >
            <el-input-number
              class="!w-full"
              :model-value="plan.totalPrice ?? calculateVehiclePlanAutomaticTotal(plan)"
              :min="0"
              :precision="2"
              :disabled="!editable"
              controls-position="right"
              @change="changePlanTotal(plan, $event ?? null)"
            />
          </el-form-item>
          <el-alert
            v-if="isVehiclePlanTotalOverridden(plan)"
            type="info"
            show-icon
            :closable="false"
            :title="$t('planning.vehicleTotalOverrideHint', { total: formatMoney(calculateVehiclePlanAutomaticTotal(plan) ?? 0) })"
          />
        </el-form>
      </el-card>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import ResourceSelect from '@/components/ResourceSelect/index.vue';
import { resourceService } from '@/services/resource.service';
import type { ItineraryVehicleArrangement, ItineraryVehiclePlan, ItineraryVehicleTier } from '@/types/itinerary';
import { addDays, createId, formatDate, formatMoney } from '@/utils';
import { calculateVehiclePlanAutomaticTotal, isVehiclePlanTotalOverridden, withVehiclePlanArrangements } from '../vehicle-plans';

const props = defineProps<{ plans: ItineraryVehiclePlan[]; startDate: string; plannedDays: number; passengerCount: number; editable: boolean }>();
const emit = defineEmits<{ 'update-plan': [tier: ItineraryVehicleTier, plan: ItineraryVehiclePlan] }>();
const { t } = useI18n();
const tripEndDate = computed(() => addDays(props.startDate, props.plannedDays - 1));

function updateArrangements(plan: ItineraryVehiclePlan, arrangements: ItineraryVehiclePlan['arrangements']) {
  emit('update-plan', plan.tier, withVehiclePlanArrangements(plan, arrangements));
}

function addArrangement(plan: ItineraryVehiclePlan) {
  updateArrangements(plan, [...plan.arrangements, {
    id: createId('vehicle-arrangement'),
    startDate: '',
    endDate: '',
    vehicles: [],
    totalPrice: null,
  }]);
}

function removeArrangement(plan: ItineraryVehiclePlan, id: string) {
  updateArrangements(plan, plan.arrangements.filter(arrangement => arrangement.id !== id));
}

function arrangementDateRange(arrangement: ItineraryVehicleArrangement) {
  return arrangement.startDate && arrangement.endDate ? [arrangement.startDate, arrangement.endDate] : [];
}

function isDateDisabled(plan: ItineraryVehiclePlan, arrangementId: string, date: Date) {
  const value = formatDate(date);
  if (value < props.startDate || value > tripEndDate.value) return true;
  return plan.arrangements.some(arrangement => arrangement.id !== arrangementId
    && arrangement.startDate
    && arrangement.endDate
    && value >= arrangement.startDate
    && value <= arrangement.endDate);
}

function disabledDateFor(plan: ItineraryVehiclePlan, arrangementId: string) {
  return (date: Date) => isDateDisabled(plan, arrangementId, date);
}

function changeDateRange(plan: ItineraryVehiclePlan, id: string, value: unknown) {
  if (!Array.isArray(value) || value.length !== 2) {
    updateArrangements(plan, plan.arrangements.map(arrangement => arrangement.id === id ? { ...arrangement, startDate: '', endDate: '' } : arrangement));
    return;
  }
  const [startDate, endDate] = value.map(String);
  if (startDate < props.startDate || endDate > tripEndDate.value) {
    ElMessage.warning(t('planning.vehicleDateOutOfRange'));
    return;
  }
  const overlaps = plan.arrangements.some(arrangement => arrangement.id !== id
    && arrangement.startDate
    && arrangement.endDate
    && startDate <= arrangement.endDate
    && endDate >= arrangement.startDate);
  if (overlaps) {
    ElMessage.warning(t('planning.vehicleDateOverlap'));
    return;
  }
  updateArrangements(plan, plan.arrangements.map(arrangement => arrangement.id === id ? { ...arrangement, startDate, endDate } : arrangement));
}

function changeArrangementPrice(plan: ItineraryVehiclePlan, id: string, totalPrice: number | null) {
  updateArrangements(plan, plan.arrangements.map(arrangement => arrangement.id === id ? { ...arrangement, totalPrice } : arrangement));
}

function changePlanTotal(plan: ItineraryVehiclePlan, totalPrice: number | null) {
  emit('update-plan', plan.tier, { ...plan, totalPrice: totalPrice ?? calculateVehiclePlanAutomaticTotal(plan) });
}

function changeQuantity(plan: ItineraryVehiclePlan, id: string, vehicleId: string, quantity: number) {
  updateArrangements(plan, plan.arrangements.map(arrangement => arrangement.id === id
    ? { ...arrangement, vehicles: arrangement.vehicles.map(vehicle => vehicle.vehicleId === vehicleId ? { ...vehicle, quantity } : vehicle) }
    : arrangement));
}

function removeVehicle(plan: ItineraryVehiclePlan, id: string, vehicleId: string) {
  updateArrangements(plan, plan.arrangements.map(arrangement => arrangement.id === id
    ? { ...arrangement, vehicles: arrangement.vehicles.filter(vehicle => vehicle.vehicleId !== vehicleId) }
    : arrangement));
}

async function addVehicle(tier: ItineraryVehicleTier, id: string, vehicleId: string) {
  if (!vehicleId || !props.editable) return;
  try {
    const resource = await resourceService.transportApi.getDetail(vehicleId);
    const plan = props.plans.find(record => record.tier === tier);
    const target = plan?.arrangements.find(arrangement => arrangement.id === id);
    if (!props.editable || !plan || !target || resource.serviceLevel !== tier || target.vehicles.some(vehicle => vehicle.vehicleId === vehicleId)) return;
    updateArrangements(plan, plan.arrangements.map(arrangement => arrangement.id === id
      ? { ...arrangement, vehicles: [...arrangement.vehicles, { vehicleId, vehicleName: resource.name, seats: resource.seats, quantity: 1 }] }
      : arrangement));
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : String(error));
  }
}
</script>
