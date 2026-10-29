<template>
  <AppDialog v-model="visible" size="xl" :title="$t('websiteItineraryUi.packagePriceTitle')">
    <p class="m-0 mb-3 text-xs text-muted">
      {{ $t("websiteItineraryUi.combinationPricesHint") }}
    </p>
    <div class="mb-3 flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
      <el-checkbox :model-value="services.includesDriver" disabled>
        {{ $t("websiteReport.driver") }}
      </el-checkbox>
      <el-checkbox :model-value="services.includesGuide" disabled>
        {{ $t("websiteReport.guide") }}
      </el-checkbox>
      <span class="text-xs text-muted">{{ servicesSummary }}</span>
      <span class="ml-auto">{{ $t("websiteReport.pax") }}: {{ plan.pax ?? $t("websiteReport.undetermined") }}</span>
    </div>
    <el-alert
      v-if="tooMany"
      class="mb-3"
      type="error"
      :closable="false"
      show-icon
      :title="$t('websiteItineraryUi.combinationLimit', { count: rows.length, max: MAX_PRICE_COMBINATIONS })"
    />
    <el-alert
      v-if="staleCount"
      class="mb-3"
      type="warning"
      :closable="false"
      show-icon
      :title="$t('websiteItineraryUi.staleCombinationsHint', { count: staleCount })"
    />
    <el-form :disabled="!editable" @submit.prevent>
      <section v-for="group in groups" :key="String(group.tier)" class="mb-4">
        <h4 class="m-0 mb-2 text-[14px] text-strong">
          {{ tierLabel(group.tier) }}
        </h4>
        <div class="overflow-x-auto">
          <table class="price-table">
            <thead>
              <tr>
                <th>{{ $t("websiteReport.vehicleType") }}</th>
                <th v-for="category in PRICE_CATEGORIES" :key="category">
                  {{ $t(`websiteItineraryUi.priceCategories.${category}`) }}
                </th>
                <th>{{ $t("websiteItineraryUi.componentTotal") }}</th>
                <th>{{ $t("websiteReport.total") }}</th>
                <th v-if="editable" />
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in group.rows" :key="row.key" :class="{ 'price-table__stale': isStale(row) }">
                <td class="whitespace-nowrap">
                  {{ vehicleLabel(row.vehicleType) }}
                  <el-tag
                    v-if="isStale(row)"
                    class="ml-1"
                    type="warning"
                    size="small"
                  >
                    {{ $t("websiteItineraryUi.staleCombination") }}
                  </el-tag>
                </td>
                <td v-for="category in PRICE_CATEGORIES" :key="category">
                  <el-form-item class="!mb-0" :show-message="false" :error="isInvalidValue(row.prices[category]) ? 'invalid' : ''">
                    <el-input
                      :model-value="row.prices[category] ?? ''"
                      :placeholder="$t('websiteItineraryUi.pricePlaceholder')"
                      @update:model-value="setPrice(row, category, $event)"
                    />
                  </el-form-item>
                  <el-checkbox
                    v-model="row.showInPdf[category]"
                    size="small"
                    :disabled="row.prices[category] === null"
                  >
                    {{ $t("websiteItineraryUi.showInPdfShort") }}
                  </el-checkbox>
                </td>
                <td class="whitespace-nowrap">
                  <span class="font-600" :class="isInvalidTotal(row) ? 'text-danger' : 'text-strong'">
                    {{ unitPrice(row) ?? $t("websiteReport.undetermined") }}
                  </span>
                </td>
                <td class="whitespace-nowrap text-muted">
                  {{ vehiclePriceTotal(unitPrice(row), plan.pax) ?? $t("websiteReport.undetermined") }}
                </td>
                <td v-if="editable">
                  <el-button
                    v-if="isStale(row)"
                    link
                    type="danger"
                    @click="removeRow(row.key)"
                  >
                    {{ $t("common.delete") }}
                  </el-button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </el-form>
    <p v-if="hasInvalidPrice" class="m-0 mt-2 text-xs text-danger">
      {{ $t("websiteItineraryUi.componentTotalInvalid") }}
    </p>
    <p v-else-if="editable && !hasAnyPrice" class="m-0 mt-2 text-xs text-muted">
      {{ $t("websiteItineraryUi.finalPriceHint") }}
    </p>

    <section v-if="plan.previousPlanPrices?.length" class="mt-4">
      <h4 class="m-0 mb-1 text-[14px] text-strong">
        {{ $t("websiteItineraryUi.previousPlanPrices") }}
      </h4>
      <p class="m-0 mb-2 text-xs text-muted">
        {{ $t("websiteItineraryUi.previousPlanPricesHint") }}
      </p>
      <table class="price-table">
        <thead>
          <tr>
            <th>{{ $t("websiteReport.vehicleType") }}</th>
            <th>{{ $t("websiteItineraryUi.previousPlan") }}</th>
            <th>{{ $t("websiteItineraryUi.previousServices") }}</th>
            <th>{{ $t("websiteItineraryUi.componentTotal") }}</th>
            <th>{{ $t("websiteItineraryUi.priceItemUnit") }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="price in plan.previousPlanPrices" :key="`${price.vehicleType}-${price.plan}`">
            <td>{{ vehicleLabel(price.vehicleType) }}</td>
            <td>{{ $t("websiteReport.plan", { plan: price.plan }) }}</td>
            <td>{{ servicesText(price.includesDriver, price.includesGuide) }}</td>
            <td>{{ price.unitPrice ?? $t("websiteReport.undetermined") }}</td>
            <td class="text-xs text-muted">
              {{ componentsText(price.priceComponents) }}
            </td>
          </tr>
        </tbody>
      </table>
    </section>
    <template #footer>
      <el-button @click="visible = false">
        {{ $t(editable ? "common.cancel" : "common.close") }}
      </el-button>
      <el-button
        v-if="editable"
        type="primary"
        :disabled="hasInvalidPrice || tooMany"
        @click="apply"
      >
        {{ $t("common.confirm") }}
      </el-button>
    </template>
  </AppDialog>
</template>
<script setup lang="ts">
import { computed, reactive, watch } from "vue";
import { useI18n } from "vue-i18n";
import AppDialog from "@/components/AppDialog/index.vue";
import {
  MAX_PRICE_COMBINATIONS,
  PRICE_CATEGORIES,
  componentUnitPrice,
  isValidVehiclePrice,
  priceKey,
  quotationCandidates,
  quotationServices,
  vehiclePriceTotal,
} from "../vehicle-price";
import type {
  WebsiteHotelTier,
  WebsiteItinerary,
  WebsitePriceCategory,
  WebsitePriceComponent,
  WebsiteVehiclePriceInput,
} from "@/types/website";
import { VEHICLE_OPTIONS } from "../../options";
interface PriceRow {
  key: string;
  vehicleType: string | null;
  hotelTier: WebsiteHotelTier | null;
  prices: Record<WebsitePriceCategory, string | null>;
  showInPdf: Record<WebsitePriceCategory, boolean>;
  /** 历史仅有总价、无分项的行；录入分项前保留原价。 */
  legacyUnitPrice: string | null;
}
/**
 * 每个车型×酒店档次组合独立填写五类人均分项（整数分求和）；总价 = 人均 × 行程人数。
 * 候选组合只从当前有效日程派生；已不在候选内但有价格的组合保留金额并标记待调整，由操作人显式删除。
 */
const visible = defineModel<boolean>({ required: true });
const plan = defineModel<WebsiteItinerary>("plan", { required: true });
const props = defineProps<{ editable: boolean; dirty?: boolean }>();
const { t } = useI18n();
const entries = reactive(new Map<string, PriceRow>());

const candidates = computed(() => quotationCandidates(plan.value.days));
const candidateKeys = computed(() => candidates.value.hotelTiers.flatMap(tier =>
  candidates.value.vehicleTypes.map(vehicle => ({ key: priceKey(vehicle, tier), vehicleType: vehicle, hotelTier: tier }))));
/** 保存前按本地草稿派生；无未保存修改时使用服务端返回。 */
const services = computed(() => (!props.dirty && plan.value.quotationOptions) || quotationServices(plan.value.days));
const currentKeys = computed(() => new Set(candidateKeys.value.map(item => item.key)));
const rows = computed<PriceRow[]>(() => [
  ...candidateKeys.value.map(item => entries.get(item.key)).filter((row): row is PriceRow => Boolean(row)),
  ...[...entries.values()].filter(row => isStale(row) && hasPrice(row)),
]);
const groups = computed(() => {
  const tiers = [...new Set(rows.value.map(row => row.hotelTier))]
    .sort((a, b) => (a ?? "").localeCompare(b ?? ""));
  return tiers.map(tier => ({
    tier,
    rows: rows.value.filter(row => row.hotelTier === tier)
      .sort((a, b) => Number(isStale(a)) - Number(isStale(b)) || (a.vehicleType ?? "").localeCompare(b.vehicleType ?? "", "en", { numeric: true })),
  }));
});
const staleCount = computed(() => rows.value.filter(isStale).length);
const tooMany = computed(() => rows.value.length > MAX_PRICE_COMBINATIONS);
const hasInvalidPrice = computed(() => rows.value.some(row => PRICE_CATEGORIES.some(category => isInvalidValue(row.prices[category])) || isInvalidTotal(row)));
const hasAnyPrice = computed(() => rows.value.some(hasPrice));
const servicesSummary = computed(() => {
  const value = services.value;
  return [
    value.driverDays.length ? t("websiteItineraryUi.driverDays", { days: value.driverDays.map(day => `D${day}`).join(", ") }) : "",
    ...value.guideServices.map(item => t("websiteItineraryUi.guideDay", { day: item.dayNumber, language: item.language })),
  ].filter(Boolean).join("；");
});

watch(visible, (value) => {
  if (!value) return;
  entries.clear();
  for (const price of plan.value.vehiclePrices) {
    const row = emptyRow(price.vehicleType, price.hotelTier);
    for (const component of price.priceComponents ?? []) {
      row.prices[component.category] = component.unitPrice;
      row.showInPdf[component.category] = component.unitPrice !== null && component.showInPdf;
    }
    if (!price.priceComponents?.length) row.legacyUnitPrice = price.unitPrice;
    entries.set(row.key, row);
  }
});
// 候选随有效日程响应式更新：只补空行，从不删除或迁移已有价格。
watch([visible, candidateKeys], () => {
  if (!visible.value) return;
  for (const item of candidateKeys.value)
    if (!entries.has(item.key)) entries.set(item.key, emptyRow(item.vehicleType, item.hotelTier));
}, { immediate: true });

function emptyRow(vehicleType: string | null, hotelTier: WebsiteHotelTier | null): PriceRow {
  const nulls = Object.fromEntries(PRICE_CATEGORIES.map(category => [category, null])) as PriceRow["prices"];
  const hidden = Object.fromEntries(PRICE_CATEGORIES.map(category => [category, false])) as PriceRow["showInPdf"];
  return { key: priceKey(vehicleType, hotelTier), vehicleType, hotelTier, prices: nulls, showInPdf: hidden, legacyUnitPrice: null };
}
function components(row: PriceRow): WebsitePriceComponent[] {
  return PRICE_CATEGORIES.map(category => ({
    category,
    unitPrice: row.prices[category],
    showInPdf: row.prices[category] !== null && row.showInPdf[category],
  }));
}
function isStale(row: PriceRow) {
  return !currentKeys.value.has(row.key);
}
function hasComponents(row: PriceRow) {
  return PRICE_CATEGORIES.some(category => row.prices[category] !== null);
}
function hasPrice(row: PriceRow) {
  return hasComponents(row) || row.legacyUnitPrice !== null;
}
function unitPrice(row: PriceRow) {
  if (!hasComponents(row)) return row.legacyUnitPrice;
  if (PRICE_CATEGORIES.some(category => isInvalidValue(row.prices[category]))) return null;
  return componentUnitPrice(components(row));
}
function isInvalidValue(value: string | null) {
  return value !== null && !isValidVehiclePrice(value);
}
function isInvalidTotal(row: PriceRow) {
  return hasComponents(row) && unitPrice(row) === null;
}
function setPrice(row: PriceRow, category: WebsitePriceCategory, value: string) {
  // 空值保持 null（不计入），0 为有效金额。
  row.prices[category] = value.trim() || null;
  if (row.prices[category] === null) row.showInPdf[category] = false;
}
function removeRow(key: string) {
  entries.delete(key);
}
function tierLabel(tier: WebsiteHotelTier | null) {
  return tier ? t(`websiteItineraryUi.hotelTier${tier}`) : t("websiteItineraryUi.noAccommodation");
}
function vehicleLabel(vehicleType: string | null) {
  if (vehicleType === null) return t("websiteItineraryUi.noPrivateVehicle");
  const option = VEHICLE_OPTIONS.find(item => item.value === vehicleType);
  return option ? t(option.labelKey) : vehicleType;
}
function servicesText(driver: boolean, guide: boolean) {
  return [driver && t("websiteReport.driver"), guide && t("websiteReport.guide")].filter(Boolean).join(" + ") || "-";
}
function componentsText(items: WebsitePriceComponent[]) {
  return items.filter(item => item.unitPrice !== null)
    .map(item => `${t(`websiteItineraryUi.priceCategories.${item.category}`)} ${item.unitPrice}`)
    .join("；") || "-";
}
function apply() {
  if (!props.editable || hasInvalidPrice.value || tooMany.value) return;
  // 只保存有价格的组合；待调整组合保留原金额，直至操作人删除。
  plan.value.vehiclePrices = rows.value.filter(hasPrice).map((row): WebsiteVehiclePriceInput => hasComponents(row)
    ? { vehicleType: row.vehicleType, hotelTier: row.hotelTier, unitPrice: unitPrice(row), priceComponents: components(row) }
    : { vehicleType: row.vehicleType, hotelTier: row.hotelTier, unitPrice: row.legacyUnitPrice, priceComponents: [] });
  visible.value = false;
}
</script>
<style scoped lang="scss">
.price-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;

  th,
  td {
    padding: 6px 8px;
    border-bottom: 1px solid var(--el-border-color-lighter);
    text-align: left;
    vertical-align: top;
  }

  th {
    font-weight: 500;
    color: var(--el-text-color-secondary);
    white-space: nowrap;
  }

  td :deep(.el-input) {
    min-width: 88px;
  }

  &__stale td {
    background: var(--el-color-warning-light-9);
  }
}
</style>
