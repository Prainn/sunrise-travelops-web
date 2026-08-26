<template>
  <el-card
    class="price-summary"
    shadow="never"
  >
    <template #header>
      <strong>{{ $t("itinerary.priceSummary") }}</strong>
    </template>
    <el-alert
      v-if="missingPriceCount"
      class="price-summary__warning"
      :title="$t('itinerary.missingCustomerPrices', { count: missingPriceCount })"
      type="warning"
      :closable="false"
      show-icon
    />
    <div class="price-summary__row">
      <span>{{ $t("itinerary.totalCost") }}</span><strong>¥{{ formatMoney(totalCost) }}</strong>
    </div>
    <div class="price-summary__row price-summary__row--primary">
      <span>{{ $t("itinerary.totalPrice") }}</span><strong>¥{{ formatMoney(totalPrice) }}</strong>
    </div>
    <el-divider />
    <div class="price-summary__row">
      <span>{{ $t("itinerary.profit") }}</span><strong>¥{{ formatMoney(profit) }}</strong>
    </div>
    <div class="price-summary__row">
      <span>{{ $t("itinerary.margin") }}</span><strong>{{ margin.toFixed(1) }}%</strong>
    </div>
    <div class="price-summary__row">
      <span>{{ $t("itinerary.perGuestPrice") }}</span><strong>¥{{ formatMoney(perGuestPrice) }}</strong>
    </div>
    <el-divider />
    <div class="price-summary__meta">
      <span>{{ $t("itinerary.resourceItemCount", { count: itemCount }) }}</span>
      <span>{{ $t("itinerary.dayCount", { count: dayCount }) }}</span>
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { formatMoney, roundMoney } from "@/utils";

const props = defineProps<{
  totalCost: number;
  totalPrice: number;
  guestCount: number;
  itemCount: number;
  dayCount: number;
  missingPriceCount: number;
}>();
const profit = computed(() => roundMoney(props.totalPrice - props.totalCost));
const margin = computed(() => props.totalPrice ? profit.value / props.totalPrice * 100 : 0);
const perGuestPrice = computed(() => props.guestCount ? roundMoney(props.totalPrice / props.guestCount) : 0);
</script>

<style scoped lang="scss">
.price-summary { position: sticky; top: 16px; }
.price-summary__warning { margin-bottom: 14px; }
.price-summary__row { display: flex; justify-content: space-between; margin: 12px 0; }
.price-summary__row--primary { padding: 14px 12px; border-radius: 8px; background: var(--el-color-primary-light-9); color: var(--el-color-primary); }
.price-summary__row--primary strong { font-size: 22px; }
.price-summary__meta { display: flex; justify-content: space-between; color: var(--el-text-color-secondary); font-size: 12px; }
</style>
