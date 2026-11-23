<template>
  <AppDialog v-model="visible" size="xl" :title="$t('websiteItineraryUi.packagePriceTitle')">
    <fieldset v-if="plan.businessUnit === 'website'" class="m-0 mb-3 border-0 p-0">
      <legend class="mb-1 text-sm font-600">
        {{ $t("websiteItineraryUi.hotelPricingMode") }}
      </legend>
      <el-radio-group v-model="mode" :disabled="!editable" :aria-label="$t('websiteItineraryUi.hotelPricingMode')">
        <el-radio-button value="tiered">
          {{ $t("websiteItineraryUi.tieredMode") }}
        </el-radio-button>
        <el-radio-button value="nightly">
          {{ $t("websiteItineraryUi.nightlyMode") }}
        </el-radio-button>
      </el-radio-group>
    </fieldset>
    <div class="mb-3 flex items-start gap-x-6 text-sm">
      <dl class="m-0 grid flex-1 grid-cols-[auto_auto_1fr] items-center gap-x-3 gap-y-1">
        <template v-for="item in serviceRows" :key="item.label">
          <dt class="text-strong">
            {{ item.label }}
          </dt>
          <dd class="m-0">
            <el-tag :type="item.included ? 'success' : 'info'" size="small">
              {{ $t(item.included ? "websiteItineraryUi.serviceIncluded" : "websiteItineraryUi.serviceExcluded") }}
            </el-tag>
          </dd>
          <dd class="m-0 text-muted">
            {{ item.reason }}
          </dd>
        </template>
      </dl>
      <span class="whitespace-nowrap">{{ $t("websiteReport.pax") }}: {{ plan.pax ?? $t("websiteReport.undetermined") }}</span>
    </div>
    <div class="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
      <span class="text-muted">{{ $t("websiteItineraryUi.pdfCategoriesLabel") }}</span>
      <el-checkbox
        v-for="category in PRICE_CATEGORIES"
        :key="category"
        :model-value="category === 'hotel' && !hasHotels ? false : pdfCategories[category]"
        :disabled="!editable || (category === 'hotel' && !hasHotels)"
        @update:model-value="setVisibility(category, Boolean($event))"
      >
        {{ $t(`websiteItineraryUi.priceCategories.${category}`) }}
      </el-checkbox>
    </div>
    <el-alert
      v-if="tooMany"
      class="mb-3!"
      type="error"
      :closable="false"
      show-icon
      :title="$t('websiteItineraryUi.combinationLimit', { count: rows.length, max: MAX_PRICE_COMBINATIONS })"
    />
    <el-alert
      v-if="staleCount"
      class="mb-3!"
      type="warning"
      :closable="false"
      show-icon
      :title="$t('websiteItineraryUi.staleCombinationsHint', { count: staleCount })"
    />
    <el-form :disabled="!editable" @submit.prevent>
      <WebsiteNightlyStays
        v-if="nightly"
        v-model:days="nightlyDays"
        :editable="editable"
        :config="config"
        :calendar="plan"
      />
      <section v-for="group in groups" :key="String(group.tier)" class="mb-4">
        <h4 class="m-0 mb-2 text-[14px] text-strong">
          {{ nightly ? $t("websiteItineraryUi.packageByVehicle") : tierLabel(group.tier) }}
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
                  <span v-if="nightly && category === 'hotel'">{{ nightlyAmounts(row).hotelPerPerson ?? "—" }}</span>
                  <el-form-item
                    v-else
                    class="!mb-0"
                    :show-message="false"
                    :error="isInvalidValue(row.prices[category]) ? 'invalid' : ''"
                  >
                    <el-input
                      :model-value="row.prices[category] ?? ''"
                      :placeholder="$t('websiteItineraryUi.pricePlaceholder')"
                      :disabled="isCategoryLocked(row, category)"
                      @update:model-value="setPrice(row, category, $event)"
                    />
                  </el-form-item>
                </td>
                <td class="whitespace-nowrap">
                  <span class="font-600" :class="isInvalidTotal(row) ? 'text-danger' : 'text-strong'">
                    {{ unitPrice(row) ?? $t("websiteReport.undetermined") }}
                  </span>
                </td>
                <td class="whitespace-nowrap text-muted">
                  {{ (nightly ? nightlyAmounts(row).totalPrice : vehiclePriceTotal(unitPrice(row), plan.pax)) ?? $t("websiteReport.undetermined") }}
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
            <tfoot>
              <tr class="price-table__reference">
                <td />
                <td v-for="category in PRICE_CATEGORIES" :key="category">
                  <span v-if="category === 'attraction' && attractionPriceTotal != null" class="whitespace-nowrap">
                    {{ $t("websiteItineraryUi.attractionPriceReference", { price: formatAttractionPrice(attractionPriceTotal) }) }}
                  </span>
                </td>
                <td />
                <td />
                <td v-if="editable" />
              </tr>
            </tfoot>
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
import { computed, reactive, ref, watch } from "vue";
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
import { formatAttractionPrice } from "../attraction-price";
import type {
  WebsiteHotelTier,
  WebsiteItinerary,
  WebsitePriceCategory,
  WebsitePriceComponent,
  WebsiteVehiclePriceInput,
} from "@/types/website";
import { VEHICLE_OPTIONS, cloneWebsiteDraft } from "../../options";
import type { WebsiteConfig, WebsiteDay, WebsiteHotelPricingMode } from "@/types/website";
import { nightlyAccommodation, nightlyPackage } from "../nightly-pricing";
import WebsiteNightlyStays from "./WebsiteNightlyStays.vue";
interface PriceRow {
  key: string;
  vehicleType: string | null;
  hotelTier: WebsiteHotelTier | null;
  prices: Record<WebsitePriceCategory, string | null>;
}
/**
 * 每个车型×酒店档次组合独立填写五类人均分项（整数分求和）；总价 = 人均 × 行程人数。
 * 候选组合只从当前有效日程派生；已不在候选内但有价格的组合保留金额并标记待调整，由操作人显式删除。
 */
const visible = defineModel<boolean>({ required: true });
const plan = defineModel<WebsiteItinerary>("plan", { required: true });
/** 参考景点价格仅展示，不写入景点分项、人均总价或 PDF。 */
const props = defineProps<{ editable: boolean; dirty?: boolean; config?: WebsiteConfig | null; attractionPriceTotal?: string | null }>();
/** 确认写入报价后通知父级保存草稿。 */
const emit = defineEmits<{ applied: [] }>();
const { t } = useI18n();
const mode = ref<WebsiteHotelPricingMode>("tiered");
const nightly = computed(() => mode.value === "nightly");
const nightlyDays = ref<WebsiteDay[]>([]);
const nightlyVisited = ref(false);
const tierEdited = ref(false);
const accommodation = computed(() => nightlyAccommodation(nightlyDays.value));
const tierEntries = reactive(new Map<string, PriceRow>());
const nightEntries = reactive(new Map<string, PriceRow>());
const entries = computed(() => nightly.value ? nightEntries : tierEntries);
/** 按类别统一控制 PDF 是否显示该类分项，对所有组合生效；隐藏项仍计入人均总价。 */
const tierPdf = reactive(emptyPdfCategories());
const nightPdf = reactive(emptyPdfCategories());
const pdfCategories = computed(() => nightly.value ? nightPdf : tierPdf);

const candidates = computed(() => quotationCandidates(plan.value.days));
const hasHotels = computed(() => nightly.value ? accommodation.value.hasHotels : candidates.value.hotelTiers.some(tier => tier !== null));
const candidateKeys = computed(() => (nightly.value ? [null] : candidates.value.hotelTiers).flatMap(tier =>
  candidates.value.vehicleTypes.map(vehicle => ({ key: priceKey(vehicle, tier), vehicleType: vehicle, hotelTier: tier }))));
/** 保存前按本地草稿派生；无未保存修改时使用服务端返回。 */
const services = computed(() => (!props.dirty && plan.value.quotationOptions) || quotationServices(plan.value.days));
const currentKeys = computed(() => new Set(candidateKeys.value.map(item => item.key)));
const rows = computed<PriceRow[]>(() => [
  ...candidateKeys.value.map(item => entries.value.get(item.key)).filter((row): row is PriceRow => Boolean(row)),
  ...[...entries.value.values()].filter(row => isStale(row) && hasComponents(row)),
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
const hasInvalidPrice = computed(() =>
  (nightlyVisited.value && nightlyDays.value.some(day => day.hotels.some(h => h.nightlyRate != null && !isValidVehiclePrice(h.nightlyRate)))) ||
  [tierEntries, nightEntries].some(map => [...map.values()].some(row => PRICE_CATEGORIES.some(c => isInvalidValue(row.prices[c])) || isInvalidTotal(row))) ||
  (nightly.value && rows.value.some(row => nightlyAmounts(row).overflow)));
const hasAnyPrice = computed(() => rows.value.some(row => unitPrice(row) !== null));
/** 司机/导游是否包含及其来源：由各日专车段、导游语种派生，页面只读展示。 */
const serviceRows = computed(() => {
  const value = services.value;
  return [
    {
      label: t("websiteReport.driver"),
      included: value.includesDriver,
      reason: value.includesDriver
        ? t("websiteItineraryUi.driverReason", { days: value.driverDays.map(day => `D${day}`).join("、") })
        : t("websiteItineraryUi.noDriverReason"),
    },
    {
      label: t("websiteReport.guide"),
      included: value.includesGuide,
      reason: value.includesGuide
        ? t("websiteItineraryUi.guideReason", { items: value.guideServices.map(item => `D${item.dayNumber} ${item.language}`).join("、") })
        : t("websiteItineraryUi.noGuideReason"),
    },
  ];
});

watch(visible, (value) => {
  if (!value) return;
  mode.value = plan.value.hotelPricingMode ?? "tiered";
  nightlyVisited.value = false;
  tierEdited.value = false;
  nightlyDays.value = [];
  loadRows(tierEntries, tierPdf, plan.value.vehiclePrices);
  loadRows(nightEntries, nightPdf, plan.value.nightlyVehiclePrices ?? []);
  nightPdf.hotel = plan.value.nightlyShowHotelPrice ?? false;
});

function loadRows(target: Map<string, PriceRow>, visibility: ReturnType<typeof emptyPdfCategories>, prices: WebsiteVehiclePriceInput[]) {
  target.clear();
  Object.assign(visibility, emptyPdfCategories());
  for (const price of prices) {
    const row = emptyRow(price.vehicleType, price.hotelTier);
    for (const component of price.priceComponents ?? []) {
      row.prices[component.category] = component.unitPrice;
      if (component.unitPrice !== null && component.showInPdf) visibility[component.category] = true;
    }
    target.set(row.key, row);
  }
}
watch([visible, nightly], () => {
  if (!visible.value || !nightly.value || nightlyVisited.value) return;
  nightlyDays.value = cloneWebsiteDraft(plan.value.days);
  for (const day of nightlyDays.value) {
    for (const hotel of day.hotels) {
      if (hotel.nightlySelected !== undefined) continue;
      hotel.nightlySelected = day.hotels.length === 1;
      hotel.nightlyRooms = null;
      hotel.nightlyRate = props.config?.hotels.find(h => h.id === hotel.configHotelId)?.price ?? null;
    }
  }
  nightlyVisited.value = true;
});
// 候选随有效日程响应式更新：只补空行，从不删除或迁移已有价格。
watch([visible, candidateKeys], () => {
  if (!visible.value) return;
  for (const item of candidateKeys.value)
    if (!entries.value.has(item.key)) entries.value.set(item.key, emptyRow(item.vehicleType, item.hotelTier));
}, { immediate: true });

function emptyRow(vehicleType: string | null, hotelTier: WebsiteHotelTier | null): PriceRow {
  const nulls = Object.fromEntries(PRICE_CATEGORIES.map(category => [category, null])) as PriceRow["prices"];
  return { key: priceKey(vehicleType, hotelTier), vehicleType, hotelTier, prices: nulls };
}
function emptyPdfCategories() {
  return Object.fromEntries(PRICE_CATEGORIES.map(category => [category, false])) as Record<WebsitePriceCategory, boolean>;
}
function components(row: PriceRow, visibility = pdfCategories.value): WebsitePriceComponent[] {
  return PRICE_CATEGORIES.map(category => ({
    category,
    unitPrice: row.prices[category],
    showInPdf: row.prices[category] !== null && visibility[category] && (category !== "hotel" || candidates.value.hotelTiers.some(tier => tier !== null)),
  }));
}
/** 无酒店档次的组合禁用酒店录价；未选导游时沿用可清空旧金额的规则。 */
function isCategoryLocked(row: PriceRow, category: WebsitePriceCategory) {
  if (category === "hotel") return row.hotelTier === null;
  return category === "guide" && !services.value.includesGuide && row.prices.guide === null;
}
function isStale(row: PriceRow) {
  return !currentKeys.value.has(row.key);
}
function hasComponents(row: PriceRow) {
  return PRICE_CATEGORIES.some(category => row.prices[category] !== null);
}
function nightlyAmounts(row: PriceRow) {
  return nightlyPackage(accommodation.value, storedUnitPrice(row), plan.value.pax);
}
function unitPrice(row: PriceRow) {
  return nightly.value ? nightlyAmounts(row).unitPrice : storedUnitPrice(row);
}
function storedUnitPrice(row: PriceRow) {
  if (!hasComponents(row)) return null;
  if (PRICE_CATEGORIES.some(category => isInvalidValue(row.prices[category]))) return null;
  return componentUnitPrice(components(row));
}
function isInvalidValue(value: string | null) {
  return value !== null && !isValidVehiclePrice(value);
}
function isInvalidTotal(row: PriceRow) {
  return hasComponents(row) && storedUnitPrice(row) === null;
}
function setPrice(row: PriceRow, category: WebsitePriceCategory, value: string) {
  // 空值保持 null（不计入），0 为有效金额。
  if (!nightly.value) tierEdited.value = true;
  row.prices[category] = value.trim() || null;
}
function setVisibility(category: WebsitePriceCategory, show: boolean) {
  if (!nightly.value) tierEdited.value = true;
  pdfCategories.value[category] = show;
}
function removeRow(key: string) {
  if (!nightly.value) tierEdited.value = true;
  entries.value.delete(key);
}
function tierLabel(tier: WebsiteHotelTier | null) {
  return tier ? t(`websiteItineraryUi.hotelTier${tier}`) : t("websiteItineraryUi.noAccommodation");
}
function vehicleLabel(vehicleType: string | null) {
  if (vehicleType === null) return t("websiteItineraryUi.noPrivateVehicle");
  const option = VEHICLE_OPTIONS.find(item => item.value === vehicleType);
  return option ? t(option.labelKey) : vehicleType;
}
function apply() {
  if (!props.editable || hasInvalidPrice.value || tooMany.value) return;
  // 只保存有价格的组合；待调整组合保留原金额，直至操作人删除。
  const serialize = (map: Map<string, PriceRow>, visibility: ReturnType<typeof emptyPdfCategories>) =>
    [...map.values()].filter(hasComponents).map((row): WebsiteVehiclePriceInput => ({
      vehicleType: row.vehicleType, hotelTier: row.hotelTier, unitPrice: storedUnitPrice(row), priceComponents: components(row, visibility),
    }));
  if (!nightly.value || tierEdited.value) plan.value.vehiclePrices = serialize(tierEntries, tierPdf);
  if (plan.value.businessUnit === "website") {
    plan.value.hotelPricingMode = mode.value;
    if (nightlyVisited.value) {
      plan.value.nightlyVehiclePrices = serialize(nightEntries, nightPdf);
      plan.value.nightlyShowHotelPrice = nightPdf.hotel;
      plan.value.days = nightlyDays.value;
    }
  }
  visible.value = false;
  emit("applied");
}
</script>
<style scoped lang="scss">
.price-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;

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

  &__reference td {
    border-bottom: 0;
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }

  &__stale td {
    background: var(--el-color-warning-light-9);
  }
}
</style>
