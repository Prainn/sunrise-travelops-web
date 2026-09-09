<template>
  <section class="mt-[24px]">
    <h3 class="mb-[14px]">
      {{ $t('planning.guideService') }}
    </h3>
    <el-card shadow="never">
      <div
        v-for="destination in destinations"
        :key="destination"
        class="grid [grid-template-columns:70px_minmax(0,1fr)] lg:[grid-template-columns:70px_minmax(220px,1fr)_150px_150px_120px] gap-[12px] items-center mb-[12px]"
      >
        <span>{{ destination }}</span>
        <ResourceSelect
          kind="guides"
          :model-value="selection(destination)?.guideId ?? ''"
          :selected-label="selection(destination)?.guideName"
          :disabled="!editable"
          :placeholder="$t('planning.selectGuide')"
          @update:model-value="emit('update-guide', destination, $event)"
        />
        <template v-if="selection(destination)">
          <label>{{ $t('planning.dailyPrice') }}<el-input-number
            :model-value="selection(destination)!.dailyPrice"
            :min="0"
            :precision="2"
            :disabled="!editable"
            controls-position="right"
            @change="emit('update-price', destination, Number($event ?? 0))"
          /></label>
          <label>{{ $t('planning.serviceDays') }}<el-input-number
            :model-value="selection(destination)!.serviceDays"
            :min="1"
            :max="365"
            :precision="0"
            :disabled="!editable"
            controls-position="right"
            @change="emit('update-days', destination, Number($event ?? 1))"
          /></label>
          <strong>¥{{ formatMoney(selection(destination)!.dailyPrice * selection(destination)!.serviceDays) }}</strong>
        </template>
      </div>
    </el-card>
  </section>
</template>
<script setup lang="ts">
import type { ItineraryGuidePlan } from '@/types/itinerary';
import ResourceSelect from '@/components/ResourceSelect/index.vue';
import { formatMoney } from '@/utils';
const props = defineProps<{ destinations: string[]; plans: ItineraryGuidePlan[]; editable: boolean }>();
const emit = defineEmits<{ 'update-guide': [destination: string, guideId: string]; 'update-days': [destination: string, days: number]; 'update-price': [destination: string, price: number] }>();
function selection(destination: string) { return props.plans.find(p => p.destination === destination); }
</script>
