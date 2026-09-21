<template>
  <el-card shadow="never">
    <template #header>
      {{ $t('itinerary.sharedTripCosts') }}
    </template>
    <el-descriptions
      :column="3"
      border
      class="mb-5"
    >
      <el-descriptions-item :label="$t('itinerary.mealCost')">
        {{ money(calculation?.mealCost) }}
      </el-descriptions-item>
      <el-descriptions-item :label="$t('itinerary.attractionCost')">
        {{ money(calculation?.attractionCost) }}
      </el-descriptions-item>
      <el-descriptions-item :label="$t('itinerary.guideCost')">
        {{ money(calculation?.guideCost) }}
      </el-descriptions-item>
    </el-descriptions>
    <el-form
      inline
      label-position="top"
      :disabled="!editable"
    >
      <el-form-item :label="$t('itinerary.guideServiceTotal')">
        <el-input-number
          :model-value="quote.guideServiceTotal ?? undefined"
          :min="0"
          :max="1e9"
          :precision="2"
          :controls="false"
          @update:model-value="emit('update-settings', { guideServiceTotal: $event ?? null })"
        />
      </el-form-item>
      <el-form-item
        v-for="destination in destinations"
        :key="destination"
        :label="$t('itinerary.staffRoomDestinationTotal', { destination })"
      >
        <el-input-number
          :model-value="staffRoomTotalFor(destination) ?? undefined"
          :min="0"
          :max="1e9"
          :precision="2"
          :controls="false"
          @update:model-value="updateStaffRoomTotal(destination, $event)"
        />
      </el-form-item>
    </el-form>
  </el-card>
</template>

<script setup lang="ts">
import type { ItineraryQuoteSettings, PaxQuoteCalculation } from '@/types/itinerary';
import { formatMoney } from '@/utils';

const props = defineProps<{
  quote: ItineraryQuoteSettings;
  calculation: PaxQuoteCalculation | null;
  destinations: string[];
  current: boolean;
  editable: boolean;
}>();
const emit = defineEmits<{
  'update-settings': [changes: Partial<Omit<ItineraryQuoteSettings, 'options'>>];
}>();
function money(value: number | undefined) {
  return props.current && value != null ? `¥${formatMoney(value)}` : '—';
}
function staffRoomTotalFor(destination: string) {
  return props.quote.staffRoomCosts.find(cost => cost.destination === destination)?.total ?? null;
}
function updateStaffRoomTotal(destination: string, value: number | undefined) {
  emit('update-settings', {
    staffRoomCosts: props.destinations.map(city => ({
      destination: city,
      total: city === destination ? value ?? null : staffRoomTotalFor(city),
    })),
  });
}
</script>
