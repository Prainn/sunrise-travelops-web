<template>
  <el-card shadow="never">
    <template #header>
      {{ $t('itinerary.sharedTripCosts') }}
    </template>
    <el-collapse
      v-model="expanded"
      class="mb-5"
    >
      <el-collapse-item
        v-for="section in sections"
        :key="section.kind"
        :name="section.kind"
      >
        <template #title>
          <div class="flex flex-wrap items-center gap-4 w-full pr-3">
            <strong>{{ $t(`itinerary.${section.kind}Cost`) }}</strong>
            <span>{{ money(calculation?.[section.totalKey]) }}</span>
            <span class="ml-auto text-[var(--el-color-primary)]">{{ $t(expanded.includes(section.kind) ? 'itinerary.collapseCostDetails' : 'itinerary.expandCostDetails') }}</span>
          </div>
        </template>
        <el-table
          :data="current ? calculation?.[section.detailsKey] ?? [] : []"
          border
          class="mb-4"
        >
          <el-table-column
            :label="$t('itinerary.costDay')"
            prop="dayNumber"
            width="80"
          />
          <el-table-column
            :label="$t('itinerary.costItem')"
            prop="resourceName"
            min-width="180"
          />
          <el-table-column
            :label="$t('itinerary.costUnitPerPerson')"
            min-width="130"
          >
            <template #default="{ row }">
              {{ money(row.unitCost) }}
            </template>
          </el-table-column>
          <el-table-column
            :label="$t('itinerary.costQuantity')"
            prop="quantity"
            width="90"
          />
          <el-table-column
            :label="$t('itinerary.costSubtotal')"
            min-width="120"
          >
            <template #default="{ row }">
              {{ money(row.totalCost) }}
            </template>
          </el-table-column>
        </el-table>
        <el-form
          label-position="top"
          :disabled="!editable"
          class="flex flex-wrap gap-4"
        >
          <el-form-item :label="$t('itinerary.otherCostPerPerson')">
            <el-input-number
              :model-value="quote[section.amountKey] ?? undefined"
              :min="0"
              :max="1e9"
              :precision="2"
              :controls="false"
              @update:model-value="emit('update-settings', { [section.amountKey]: $event ?? null, [section.reasonKey]: '' })"
            />
          </el-form-item>
          <el-form-item
            :label="$t('itinerary.otherCostReason')"
            class="flex-1 min-w-[220px]"
            :required="(quote[section.amountKey] ?? 0) > 0"
            :error="(quote[section.amountKey] ?? 0) > 0 && !quote[section.reasonKey]?.trim() ? $t('itinerary.otherCostReasonRequired') : ''"
          >
            <el-input
              :model-value="quote[section.reasonKey]"
              :maxlength="1000"
              :placeholder="$t('itinerary.otherCostReasonRequired')"
              @update:model-value="emit('update-settings', { [section.reasonKey]: $event })"
            />
          </el-form-item>
        </el-form>
      </el-collapse-item>
    </el-collapse>
    <div class="mb-4 text-[var(--el-text-color-regular)]">
      {{ $t('itinerary.guideCost') }}：{{ money(calculation?.guideCost) }}
    </div>
    <el-form
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
    </el-form>
    <section class="mt-4 p-4 rounded [border:1px_solid_var(--el-border-color-lighter)] bg-[var(--el-fill-color-extra-light)]">
      <h4 class="mt-0 mb-4">
        {{ $t('itinerary.staffRoomSection') }}
      </h4>
      <el-form
        inline
        label-position="top"
        :disabled="!editable"
      >
        <el-form-item
          v-for="destination in destinations"
          :key="destination"
          :label="destination"
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
    </section>
  </el-card>
</template>

<script setup lang="ts">
import { ref } from 'vue';
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
const expanded = ref<string[]>([]);
const sections = [
  { kind: 'meal', totalKey: 'mealCost', detailsKey: 'mealDetails', amountKey: 'mealOtherCost', reasonKey: 'mealOtherReason' },
  { kind: 'attraction', totalKey: 'attractionCost', detailsKey: 'attractionDetails', amountKey: 'attractionOtherCost', reasonKey: 'attractionOtherReason' },
] as const;
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
