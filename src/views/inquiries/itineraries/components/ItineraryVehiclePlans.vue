<template>
  <section>
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
            <strong>{{ $t(`itinerary.vehicleServiceLevels.${plan.tier}`) }}</strong><el-button
              :disabled="!editable"
              @click="addArrangement(plan)"
            >
              {{ $t('planning.addArrangement') }}
            </el-button>
          </div>
        </template>
        <div
          v-for="arrangement in plan.arrangements"
          :key="arrangement.id"
          class="mb-[16px] p-[12px] border border-solid border-[var(--el-border-color)] rounded"
        >
          <div class="flex gap-[8px] mb-[12px]">
            <el-select
              :model-value="arrangement.dayIds"
              multiple
              :disabled="!editable"
              :placeholder="$t('planning.selectDates')"
              @update:model-value="changeDates(plan, arrangement.id, $event)"
            >
              <el-option
                v-for="day in dailyPlans"
                :key="day.id"
                :value="day.id"
                :label="`D${day.dayNumber} · ${day.date}`"
              />
            </el-select>
            <el-button
              :disabled="!editable"
              type="danger"
              link
              @click="removeArrangement(plan, arrangement.id)"
            >
              {{ $t('planning.delete') }}
            </el-button>
          </div>
          <div
            v-for="vehicle in arrangement.vehicles"
            :key="vehicle.vehicleId"
            class="flex items-center gap-[8px] mb-[8px]"
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
            /><span>{{ $t('planning.vehicles') }}</span>
            <el-button
              :disabled="!editable"
              link
              type="danger"
              @click="removeVehicle(plan, arrangement.id, vehicle.vehicleId)"
            >
              {{ $t('planning.delete') }}
            </el-button>
          </div>
          <ResourceSelect
            :key="`${arrangement.id}-${arrangement.vehicles.length}`"
            kind="transports"
            model-value=""
            :filters="{ serviceLevel: plan.tier }"
            :disabled="!editable"
            :placeholder="$t('planning.addVehicle')"
            @update:model-value="addVehicle(plan.tier, arrangement.id, $event)"
          />
          <small class="block mt-[8px]">{{ $t('planning.capacityHint', { seats: arrangement.vehicles.reduce((sum, v) => sum + v.seats * v.quantity, 0), passengers: passengerCount }) }}</small>
        </div>
        <label
          v-if="plan.arrangements.length"
          class="grid gap-[8px]"
        >{{ $t('planning.totalVehiclePrice') }}<el-input-number
          :model-value="plan.totalPrice"
          :min="0"
          :precision="2"
          :disabled="!editable"
          controls-position="right"
          @change="emit('update-plan', plan.tier, { ...plan, totalPrice: $event ?? null })"
        /></label>
      </el-card>
    </div>
  </section>
</template>
<script setup lang="ts">
import type { ItineraryDayRecord, ItineraryVehiclePlan, ItineraryVehicleTier } from '@/types/itinerary';
import ResourceSelect from '@/components/ResourceSelect/index.vue';
import { resourceService } from '@/services/resource.service';
import { createId } from '@/utils';
import { ElMessage } from 'element-plus';
const props = defineProps<{ plans: ItineraryVehiclePlan[]; dailyPlans: ItineraryDayRecord[]; passengerCount: number; editable: boolean }>();
const emit = defineEmits<{ 'update-plan': [tier: ItineraryVehicleTier, plan: ItineraryVehiclePlan] }>();
function addArrangement(plan: ItineraryVehiclePlan) { emit('update-plan', plan.tier, { ...plan, arrangements: [...plan.arrangements, { id: createId('vehicle-arrangement'), dayIds: [], vehicles: [] }] }); }
function removeArrangement(plan: ItineraryVehiclePlan, id: string) { const arrangements = plan.arrangements.filter(a => a.id !== id); emit('update-plan', plan.tier, { ...plan, arrangements, totalPrice: arrangements.length ? plan.totalPrice : null }); }
function changeDates(plan: ItineraryVehiclePlan, id: string, dayIds: string[]) { emit('update-plan', plan.tier, { ...plan, arrangements: plan.arrangements.map(a => a.id === id ? { ...a, dayIds } : a) }); }
function changeQuantity(plan: ItineraryVehiclePlan, id: string, vehicleId: string, quantity: number) { emit('update-plan', plan.tier, { ...plan, arrangements: plan.arrangements.map(a => a.id === id ? { ...a, vehicles: a.vehicles.map(v => v.vehicleId === vehicleId ? { ...v, quantity } : v) } : a) }); }
function removeVehicle(plan: ItineraryVehiclePlan, id: string, vehicleId: string) { emit('update-plan', plan.tier, { ...plan, arrangements: plan.arrangements.map(a => a.id === id ? { ...a, vehicles: a.vehicles.filter(v => v.vehicleId !== vehicleId) } : a) }); }
async function addVehicle(tier: ItineraryVehicleTier, id: string, vehicleId: string) {
  if (!vehicleId || !props.editable) return;
  try {
    const resource = await resourceService.transportApi.getDetail(vehicleId);
    const plan = props.plans.find(p => p.tier === tier);
    const target = plan?.arrangements.find(a => a.id === id);
    if (!props.editable || !plan || !target || resource.serviceLevel !== tier || target.vehicles.some(v => v.vehicleId === vehicleId)) return;
    emit('update-plan', tier, { ...plan, arrangements: plan.arrangements.map(a => a.id === id ? { ...a, vehicles: [...a.vehicles, { vehicleId, vehicleName: resource.name, seats: resource.seats, quantity: 1 }] } : a) });
  } catch (error) { ElMessage.error(error instanceof Error ? error.message : String(error)); }
}
</script>
