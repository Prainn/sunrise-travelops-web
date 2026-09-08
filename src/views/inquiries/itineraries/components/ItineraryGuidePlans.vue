<template>
  <section class="guide-plans">
    <h3>{{ $t('itinerary.cityGuides') }}</h3>
    <el-card shadow="never">
      <div
        v-for="destination in destinations"
        :key="destination"
        class="guide-plans__row"
      >
        <span>{{ destination }}</span>
        <el-select
          :model-value="selection(destination)?.guideId ?? ''"
          :placeholder="$t('itinerary.noGuide')"
          :disabled="!editable"
          filterable
          @update:model-value="emit('update-guide', destination, $event)"
        >
          <el-option
            value=""
            :label="$t('itinerary.noGuide')"
          />
          <el-option
            v-for="guide in guides"
            :key="guide.id"
            :value="guide.id"
            :label="`${guide.name} · ¥${formatMoney(guide.dailyPrice)}/${$t('itinerary.perDay')}`"
          />
        </el-select>
        <template v-if="selection(destination)">
          <el-form-item :label="$t('itinerary.guideServiceDates')">
            <el-select
              :model-value="selection(destination)!.dayIds"
              multiple
              :disabled="!editable"
              @update:model-value="emit('update-days', destination, $event)"
            >
              <el-option
                v-for="day in dailyPlans"
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
import type { ItineraryGuidePlan, ItineraryDayRecord } from "@/types/itinerary";
import type { GuideRecord } from "@/types/resource";
import { formatMoney } from "@/utils";
const props = defineProps<{ destinations: string[]; dailyPlans: ItineraryDayRecord[]; plans: ItineraryGuidePlan[]; guides: GuideRecord[]; editable: boolean }>();
const emit = defineEmits<{ 'update-guide': [destination: string, guideId: string]; 'update-days': [destination: string, days: string[]] }>();
function selection(destination: string) { return props.plans.find((plan) => plan.destination === destination); }
</script>
<style scoped lang="scss">
.guide-plans { margin-top: 24px; }
.guide-plans h3 { display: flex; align-items: center; min-height: 48px; margin: 0 0 14px; }
.guide-plans__row { display: grid; grid-template-columns: 72px minmax(180px,340px) minmax(240px, 1fr) 110px; align-items: center; gap: 16px; }
.guide-plans__row + .guide-plans__row { margin-top: 14px; }
.guide-plans__row :deep(.el-form-item) { margin-bottom: 0; }
.guide-plans__row :deep(.el-input-number) { width: 130px; }
@media (width <= 800px) { .guide-plans__row { grid-template-columns: 70px minmax(0,1fr); } }
</style>
