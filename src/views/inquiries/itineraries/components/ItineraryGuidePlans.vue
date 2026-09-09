<template>
  <section class="guide-plans">
    <h3>{{ $t('itinerary.cityGuides') }}</h3>
    <el-card shadow="never">
      <div
        v-for="destination in destinations"
        :key="destination"
        class="guide-plans__row grid [grid-template-columns:72px_minmax(180px,340px)_minmax(240px,_1fr)_110px] items-center gap-[16px]"
      >
        <span>{{ destination }}</span>
        <ResourceSelect
          kind="guides"
          :model-value="selection(destination)?.guideId ?? ''"
          :selected-label="selection(destination)?.guideName"
          :placeholder="$t('itinerary.noGuide')"
          :disabled="!editable"
          @update:model-value="emit('update-guide', destination, $event)"
        />
        <template v-if="selection(destination)">
          <el-form-item :label="$t('itinerary.guideServiceDates')">
            <el-select
              :model-value="selection(destination)!.dayIds"
              multiple
              :disabled="!editable"
              @update:model-value="emit('update-days', destination, $event)"
            >
              <el-option
                v-for="day in getAvailableGuideDays(dailyPlans, plans, destination)"
                :key="day.id"
                :value="day.id"
                :label="`D${day.dayNumber} · ${day.date} · ${day.departure} → ${day.destination}`"
              />
            </el-select>
          </el-form-item>
          <span>¥{{ formatMoney(selection(destination)!.dailyPrice * selection(destination)!.dayIds.length) }}</span>
        </template>
      </div>
    </el-card>
  </section>
</template>
<script setup lang="ts">
import { getAvailableGuideDays } from "../guide-plans";
import type { ItineraryGuidePlan, ItineraryDayRecord } from "@/types/itinerary";
import ResourceSelect from "@/components/ResourceSelect/index.vue";
import { formatMoney } from "@/utils";
const props = defineProps<{ destinations: string[]; dailyPlans: ItineraryDayRecord[]; plans: ItineraryGuidePlan[]; editable: boolean }>();
const emit = defineEmits<{ 'update-guide': [destination: string, guideId: string]; 'update-days': [destination: string, days: string[]] }>();
function selection(destination: string) { return props.plans.find((plan) => plan.destination === destination); }
</script>
<style scoped lang="scss">
.guide-plans { @apply 'mt-[24px]'; }
.guide-plans h3 { display: flex; align-items: center; min-height: 48px; margin: 0 0 14px; }

.guide-plans__row + .guide-plans__row { margin-top: 14px; }
.guide-plans__row :deep(.el-form-item) { margin-bottom: 0; }
.guide-plans__row :deep(.el-input-number) { width: 130px; }
@media (width <= 800px) { .guide-plans__row { @apply '[grid-template-columns:70px_minmax(0,1fr)]'; } }
</style>
