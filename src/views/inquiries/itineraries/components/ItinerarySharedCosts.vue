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
            <el-button
              size="small"
              @click.stop="openOtherCost(section)"
              @keydown.stop
            >
              {{ $t('itinerary.otherCosts') }}
            </el-button>
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
      </el-collapse-item>
      <el-collapse-item name="guide">
        <template #title>
          <div class="flex flex-wrap items-center gap-4 w-full pr-3">
            <strong>{{ $t('itinerary.guideServiceSection') }}</strong>
            <span
              v-for="price in sharedPaxPrices"
              :key="price.pax"
            >
              <template v-if="sharedPaxPrices.length > 1">PAX {{ price.pax }}：</template>{{ money(price.guideServiceUnitCost) }}
            </span>
            <span v-if="!sharedPaxPrices.length">—</span>
            <span class="ml-auto text-[var(--el-color-primary)]">{{ $t(expanded.includes('guide') ? 'itinerary.collapseCostDetails' : 'itinerary.expandCostDetails') }}</span>
          </div>
        </template>
        <div class="mb-4 text-[var(--el-text-color-regular)]">
          {{ $t('itinerary.guideCost') }}：{{ money(calculation?.guideCost) }}
        </div>
      </el-collapse-item>
      <el-collapse-item name="staffRooms">
        <template #title>
          <div class="flex flex-wrap items-center gap-4 w-full pr-3">
            <strong>{{ $t('itinerary.staffRoomSection') }}</strong>
            <span
              v-for="price in sharedPaxPrices"
              :key="price.pax"
            >
              <template v-if="sharedPaxPrices.length > 1">PAX {{ price.pax }}：</template>{{ money(price.staffRoomUnitCost) }}
            </span>
            <span v-if="!sharedPaxPrices.length">—</span>
            <span class="ml-auto text-[var(--el-color-primary)]">{{ $t(expanded.includes('staffRooms') ? 'itinerary.collapseCostDetails' : 'itinerary.expandCostDetails') }}</span>
          </div>
        </template>
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
      </el-collapse-item>
    </el-collapse>
    <el-dialog
      v-model="otherCostVisible"
      append-to-body
      width="min(520px, 92vw)"
      :title="activeSection ? `${$t(`itinerary.${activeSection.kind}Cost`)} · ${$t('itinerary.otherCosts')}` : ''"
    >
      <el-form
        label-position="top"
        :disabled="!editable"
        @submit.prevent="applyOtherCost"
      >
        <el-form-item :label="$t('itinerary.otherCost')">
          <el-input-number
            v-model="otherAmount"
            :min="0"
            :max="1e9"
            :precision="2"
            :controls="false"
          />
        </el-form-item>
        <el-form-item
          :label="$t('itinerary.otherCostReason')"
          :required="(otherAmount ?? 0) > 0"
          :error="otherReasonError ? $t('itinerary.otherCostReasonRequired') : ''"
        >
          <el-input
            v-model="otherReason"
            type="textarea"
            :rows="3"
            :maxlength="1000"
            @input="otherReasonError = false"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="otherCostVisible = false">
          {{ $t('common.cancel') }}
        </el-button>
        <el-button
          v-if="editable"
          :disabled="otherAmount == null || (otherAmount > 0 && !otherReason.trim())"
          type="primary"
          @click="applyOtherCost"
        >
          {{ $t('common.confirm') }}
        </el-button>
      </template>
    </el-dialog>
  </el-card>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
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
// Shared costs have the same PAX breakdown in every hotel/vehicle option.
const sharedPaxPrices = computed(() => props.calculation?.options[0]?.paxPrices ?? []);
const sections = [
  { kind: 'meal', totalKey: 'mealCost', detailsKey: 'mealDetails', amountKey: 'mealOtherCost', reasonKey: 'mealOtherReason' },
  { kind: 'attraction', totalKey: 'attractionCost', detailsKey: 'attractionDetails', amountKey: 'attractionOtherCost', reasonKey: 'attractionOtherReason' },
] as const;
type CostSection = typeof sections[number];
const activeSection = ref<CostSection>();
const otherCostVisible = ref(false);
const otherAmount = ref<number>();
const otherReason = ref('');
const otherReasonError = ref(false);
function openOtherCost(section: CostSection) {
  activeSection.value = section;
  otherAmount.value = props.quote[section.amountKey] ?? undefined;
  otherReason.value = props.quote[section.reasonKey] ?? '';
  otherReasonError.value = false;
  otherCostVisible.value = true;
}
function applyOtherCost() {
  if (!props.editable || !activeSection.value) return;
  otherReasonError.value = (otherAmount.value ?? 0) > 0 && !otherReason.value.trim();
  if (otherReasonError.value) return;
  emit('update-settings', {
    [activeSection.value.amountKey]: otherAmount.value ?? null,
    [activeSection.value.reasonKey]: otherReason.value.trim(),
  });
  otherCostVisible.value = false;
}

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
