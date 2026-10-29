<template>
  <AppDialog v-model="visible" size="xl" :title="$t('websiteItineraryUi.packagePriceTitle')">
    <el-steps
      :active="step"
      finish-status="success"
      simple
      class="mb-4"
    >
      <el-step v-for="key in STEP_KEYS" :key="key" :title="$t(`websiteItineraryUi.priceSteps.${key}`)" />
    </el-steps>
    <el-alert
      v-if="hadInconsistentShared"
      class="mb-3"
      type="warning"
      :closable="false"
      show-icon
      :title="$t('websiteItineraryUi.sharedPriceUnified')"
    />
    <el-form label-position="top" :disabled="!editable">
      <!-- 1. 非车型价格：按方案统一，适用于所有车型 -->
      <template v-if="step === 0">
        <p class="m-0 mb-3 text-xs text-muted">
          {{ $t("websiteItineraryUi.sharedPricesHint") }}
        </p>
        <div class="price-grid" :style="gridStyle">
          <span class="text-xs text-muted">{{ $t("websiteItineraryUi.priceItemUnit") }}</span>
          <div v-for="key in activePlans" :key="key" class="flex items-center">
            <strong class="text-[14px] text-strong">{{ $t("websiteReport.plan", { plan: key }) }}</strong>
            <el-checkbox v-model="shared[key].includesDriver" class="ml-4">
              {{ $t("websiteReport.driver") }}
            </el-checkbox>
            <el-checkbox v-model="shared[key].includesGuide">
              {{ $t("websiteReport.guide") }}
            </el-checkbox>
            <el-button
              v-if="key === 'A' && !planBEnabled"
              class="ml-auto"
              link
              type="primary"
              @click="planBEnabled = true"
            >
              {{ $t("websiteItineraryUi.addPlanB") }}
            </el-button>
            <el-button
              v-if="key === 'B'"
              class="ml-auto"
              link
              type="danger"
              @click="disablePlanB"
            >
              {{ $t("websiteItineraryUi.removePlanB") }}
            </el-button>
          </div>
          <template v-for="category in SHARED_CATEGORIES" :key="category">
            <span class="text-sm">{{ $t(`websiteItineraryUi.priceCategories.${category}`) }}</span>
            <el-form-item
              v-for="key in activePlans"
              :key="key"
              class="!mb-0"
              :show-message="false"
              :error="isInvalidValue(shared[key].prices[category]) ? 'invalid' : ''"
            >
              <el-input
                :model-value="shared[key].prices[category] ?? ''"
                :placeholder="$t('websiteItineraryUi.pricePlaceholder')"
                @update:model-value="shared[key].prices[category] = $event.trim() || null"
              />
            </el-form-item>
          </template>
        </div>
        <p v-if="hasInvalidShared" class="m-0 mt-2 text-xs text-danger">
          {{ $t("websiteWorkspace.vehiclePriceInvalid") }}
        </p>
      </template>

      <!-- 2. 车型价格：每车型一个价格，方案 A/B 通用 -->
      <template v-else-if="step === 1">
        <el-form-item :label="$t('websiteItineraryUi.quotationVehicles')" class="!mb-2">
          <el-checkbox-group v-model="selectedVehicles">
            <el-checkbox
              v-for="option in VEHICLE_OPTIONS"
              :key="option.value"
              :value="option.value"
              border
            >
              {{ $t(option.labelKey) }}
            </el-checkbox>
          </el-checkbox-group>
        </el-form-item>
        <p class="m-0 mb-3 text-xs text-muted">
          {{ $t("websiteItineraryUi.quotationVehiclesHint") }}
        </p>
        <p v-if="!selectedOptions.length" class="m-0 py-6 text-center text-sm text-muted">
          {{ $t("websiteItineraryUi.noQuotationVehicle") }}
        </p>
        <div v-else class="price-grid price-grid--vehicle">
          <template v-for="option in selectedOptions" :key="option.value">
            <span class="whitespace-nowrap text-sm">{{ $t(option.labelKey) }}</span>
            <el-form-item class="!mb-0" :show-message="false" :error="isInvalidValue(vehicleRates[option.value] ?? null) ? 'invalid' : ''">
              <el-input
                :model-value="vehicleRates[option.value] ?? ''"
                :placeholder="$t('websiteItineraryUi.pricePlaceholder')"
                @update:model-value="vehicleRates[option.value] = $event.trim() || null"
              >
                <template #append>
                  {{ $t("websiteItineraryUi.pricePerPersonUnit") }}
                </template>
              </el-input>
            </el-form-item>
            <span class="text-xs text-muted">
              {{ $t("websiteItineraryUi.capacityHint", { comfortable: option.seats - 2, economy: option.seats - 1, luggage: option.seats - 4 }) }}
            </span>
          </template>
        </div>
        <p v-if="hasInvalidVehicleRate" class="m-0 mt-2 text-xs text-danger">
          {{ $t("websiteWorkspace.vehiclePriceInvalid") }}
        </p>
      </template>

      <!-- 3. PDF 展示分项：未勾选的仍计入总价 -->
      <template v-else-if="step === 2">
        <p class="m-0 mb-3 text-xs text-muted">
          {{ $t("websiteItineraryUi.pdfItemsHint") }}
        </p>
        <div class="price-grid" :style="gridStyle">
          <span class="text-xs text-muted">{{ $t("websiteItineraryUi.priceItemUnit") }}</span>
          <strong v-for="key in activePlans" :key="key" class="text-[14px] text-strong">
            {{ $t("websiteReport.plan", { plan: key }) }}
          </strong>
          <template v-for="category in SHARED_CATEGORIES" :key="category">
            <span class="text-sm">{{ $t(`websiteItineraryUi.priceCategories.${category}`) }}</span>
            <el-checkbox
              v-for="key in activePlans"
              :key="key"
              v-model="shared[key].showInPdf[category]"
              :disabled="shared[key].prices[category] === null"
            >
              {{ shared[key].prices[category] ?? $t("websiteItineraryUi.notEntered") }}
            </el-checkbox>
          </template>
          <span class="text-sm">{{ $t("websiteItineraryUi.priceCategories.vehicle") }}</span>
          <el-checkbox
            v-model="vehicleInPdf"
            :disabled="!selectedOptions.some(option => vehicleRates[option.value] !== null)"
            :style="{ gridColumn: `span ${activePlans.length}` }"
          >
            {{ vehicleRateSummary || $t("websiteItineraryUi.notEntered") }}
          </el-checkbox>
        </div>
      </template>

      <!-- 4. 报价确认 -->
      <template v-else>
        <p v-if="!selectedOptions.length" class="m-0 py-6 text-center text-sm text-muted">
          {{ $t("websiteItineraryUi.noQuotationVehicle") }}
        </p>
        <div v-else class="price-grid" :style="gridStyle">
          <span class="text-xs text-muted">
            {{ $t("websiteItineraryUi.componentTotal") }}
            <br>
            {{ $t("websiteReport.total") }} · {{ $t("websiteReport.pax") }}: {{ plan.pax ?? $t("websiteReport.undetermined") }}
          </span>
          <div v-for="key in activePlans" :key="key">
            <strong class="text-[14px] text-strong">{{ $t("websiteReport.plan", { plan: key }) }}</strong>
            <span class="ml-2 text-xs text-muted">{{ planServices(key) }}</span>
          </div>
          <template v-for="option in selectedOptions" :key="option.value">
            <span class="whitespace-nowrap text-sm">{{ $t(option.labelKey) }}</span>
            <div v-for="key in activePlans" :key="key">
              <span class="text-[16px] font-600" :class="isInvalidTotal(built(option.value, key)) ? 'text-danger' : 'text-strong'">
                {{ built(option.value, key).unitPrice ?? $t("websiteReport.undetermined") }}
              </span>
              <span class="ml-3 text-sm text-muted">
                {{ vehiclePriceTotal(built(option.value, key).unitPrice, plan.pax) ?? $t("websiteReport.undetermined") }}
              </span>
              <p v-if="isInvalidTotal(built(option.value, key))" class="m-0 mt-1 text-xs text-danger">
                {{ $t("websiteItineraryUi.componentTotalInvalid") }}
              </p>
            </div>
          </template>
          <span class="price-grid__divider text-xs text-muted">{{ $t("websiteItineraryUi.pdfShownItems") }}</span>
          <span v-for="key in activePlans" :key="key" class="price-grid__divider text-xs text-muted">
            {{ pdfSummary(key) || $t("websiteItineraryUi.pdfTotalOnly") }}
          </span>
        </div>
      </template>
    </el-form>
    <template #footer>
      <el-button @click="visible = false">
        {{ $t(editable ? "common.cancel" : "common.close") }}
      </el-button>
      <el-button v-if="step > 0" @click="step--">
        {{ $t("common.prevStep") }}
      </el-button>
      <el-button
        v-if="step < STEP_KEYS.length - 1"
        type="primary"
        :disabled="editable && !canLeaveStep"
        @click="step++"
      >
        {{ $t("common.nextStep") }}
      </el-button>
      <el-button
        v-else-if="editable"
        type="primary"
        :disabled="hasInvalidPrice"
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
import { PRICE_CATEGORIES, componentUnitPrice, isValidVehiclePrice, vehiclePriceTotal } from "../vehicle-price";
import type { VehicleType, WebsiteItinerary, WebsitePriceCategory, WebsiteVehiclePrice } from "@/types/website";
import { VEHICLE_OPTIONS } from "../../options";
type PlanKey = WebsiteVehiclePrice["plan"];
type SharedCategory = Exclude<WebsitePriceCategory, "vehicle">;
interface SharedPlan {
  includesDriver: boolean;
  includesGuide: boolean;
  prices: Record<SharedCategory, string | null>;
  showInPdf: Record<SharedCategory, boolean>;
}
const PLANS: PlanKey[] = ["A", "B"];
const STEP_KEYS = ["shared", "vehicle", "pdf", "summary"] as const;
/**
 * Entered once per plan for every selected vehicle; the vehicle item is entered once per vehicle for both plans.
 * Saved data stays one row per vehicle × plan with all five components.
 */
const SHARED_CATEGORIES = PRICE_CATEGORIES.filter((category): category is SharedCategory => category !== "vehicle");
const visible = defineModel<boolean>({ required: true });
const plan = defineModel<WebsiteItinerary>("plan", { required: true });
const props = defineProps<{ editable: boolean }>();
const { t } = useI18n();
const step = ref(0);
const shared = reactive<Record<PlanKey, SharedPlan>>({ A: emptySharedPlan(), B: emptySharedPlan() });
const vehicleRates = reactive<Partial<Record<VehicleType, string | null>>>({});
const vehicleInPdf = ref(false);
const selectedVehicles = ref<VehicleType[]>([]);
const planBEnabled = ref(false);
const hadInconsistentShared = ref(false);
const activePlans = computed<PlanKey[]>(() => planBEnabled.value ? PLANS : ["A"]);
const gridStyle = computed(() => ({ gridTemplateColumns: `max-content repeat(${activePlans.value.length}, minmax(0, 1fr))` }));
const selectedOptions = computed(() => VEHICLE_OPTIONS.filter(option => selectedVehicles.value.includes(option.value)));
const hasInvalidShared = computed(() => activePlans.value.some(key => SHARED_CATEGORIES.some(category => isInvalidValue(shared[key].prices[category]))));
const hasInvalidVehicleRate = computed(() => selectedVehicles.value.some(vehicle => isInvalidValue(vehicleRates[vehicle] ?? null)));
const hasInvalidPrice = computed(() => hasInvalidShared.value || hasInvalidVehicleRate.value
  || selectedVehicles.value.some(vehicle => activePlans.value.some(key => isInvalidTotal(built(vehicle, key)))));
const canLeaveStep = computed(() => [!hasInvalidShared.value, !hasInvalidVehicleRate.value, true][step.value] ?? true);
const vehicleRateSummary = computed(() => selectedOptions.value
  .filter(option => vehicleRates[option.value] !== null && vehicleRates[option.value] !== undefined)
  .map(option => `${t(option.labelKey)} ${vehicleRates[option.value]}`)
  .join(" / "));

watch(visible, (value) => {
  if (!value) return;
  const saved = plan.value.vehiclePrices;
  const savedRow = (vehicle: VehicleType, key: PlanKey) => saved.find(price => price.vehicleType === vehicle && price.plan === key);
  selectedVehicles.value = VEHICLE_OPTIONS.filter(option => PLANS.some(key => hasPlanData(savedRow(option.value, key)))).map(option => option.value);
  if (selectedVehicles.value.length === 0) {
    const legVehicles = new Set(plan.value.days.flatMap(day => day.legs
      .filter(leg => leg.mode === "private_vehicle")
      .map(leg => leg.vehicleType)));
    selectedVehicles.value = VEHICLE_OPTIONS.filter(option => legVehicles.has(option.value)).map(option => option.value);
  }
  const rows = (key: PlanKey) => selectedVehicles.value.map(vehicle => savedRow(vehicle, key)).filter((row): row is WebsiteVehiclePrice => Boolean(row));
  planBEnabled.value = rows("B").some(hasPlanData);
  for (const key of PLANS) {
    // The first vehicle with a breakdown defines the plan's shared items.
    const source = rows(key).find(row => row.priceComponents?.length) ?? rows(key)[0];
    const next = emptySharedPlan();
    next.includesDriver = source?.includesDriver ?? false;
    next.includesGuide = source?.includesGuide ?? false;
    for (const category of SHARED_CATEGORIES) {
      next.prices[category] = source ? componentPrice(source, category) : null;
      next.showInPdf[category] = source ? componentVisible(source, category) : false;
    }
    shared[key] = next;
  }
  for (const option of VEHICLE_OPTIONS) {
    const rowA = savedRow(option.value, "A");
    vehicleRates[option.value] = (rowA?.priceComponents?.length ? componentPrice(rowA, "vehicle") : null)
      ?? (savedRow(option.value, "B") ? componentPrice(savedRow(option.value, "B")!, "vehicle") : null);
  }
  vehicleInPdf.value = selectedVehicles.value.some(vehicle => PLANS.some(key => {
    const row = savedRow(vehicle, key);
    return row ? componentVisible(row, "vehicle") : false;
  }));
  // Saved quotes may predate shared entry; tell the operator before the aligned values are confirmed.
  hadInconsistentShared.value = selectedVehicles.value.some(vehicle => activePlans.value.some(key => !samePrice(savedRow(vehicle, key), built(vehicle, key))));
  step.value = props.editable ? 0 : STEP_KEYS.length - 1;
});

function emptySharedPlan(): SharedPlan {
  return {
    includesDriver: false,
    includesGuide: false,
    prices: { hotel: null, guide: null, attraction: null, meal: null },
    showInPdf: { hotel: false, guide: false, attraction: false, meal: false },
  };
}
function hasPlanData(price: WebsiteVehiclePrice | undefined) {
  return Boolean(price && (price.unitPrice !== null || price.includesDriver || price.includesGuide || price.priceComponents?.some(component => component.unitPrice !== null)));
}
function componentPrice(price: WebsiteVehiclePrice, category: WebsitePriceCategory) {
  return price.priceComponents?.find(item => item.category === category)?.unitPrice ?? null;
}
function componentVisible(price: WebsiteVehiclePrice, category: WebsitePriceCategory) {
  return price.priceComponents?.find(item => item.category === category)?.showInPdf ?? false;
}
function isInvalidValue(value: string | null) {
  return value !== null && !isValidVehiclePrice(value);
}
function isInvalidTotal(price: WebsiteVehiclePrice) {
  return Boolean(price.priceComponents?.some(component => component.unitPrice !== null)) && price.unitPrice === null;
}
/** Row to save for a vehicle × plan; a historical single price is kept until a breakdown is entered. */
function built(vehicle: VehicleType, key: PlanKey): WebsiteVehiclePrice {
  const entry = shared[key];
  const vehicleRate = vehicleRates[vehicle] ?? null;
  const components = PRICE_CATEGORIES.map((category) => {
    const unitPrice = category === "vehicle" ? vehicleRate : entry.prices[category];
    const showInPdf = category === "vehicle" ? vehicleInPdf.value : entry.showInPdf[category];
    return { category, unitPrice, showInPdf: unitPrice !== null && showInPdf };
  });
  const base = { vehicleType: vehicle, plan: key, includesDriver: entry.includesDriver, includesGuide: entry.includesGuide };
  if (components.every(component => component.unitPrice === null)) {
    const legacy = plan.value.vehiclePrices.find(price => price.vehicleType === vehicle && price.plan === key && !price.priceComponents?.length);
    return { ...base, unitPrice: legacy?.unitPrice ?? null, priceComponents: [] };
  }
  const valid = components.every(component => component.unitPrice === null || isValidVehiclePrice(component.unitPrice));
  return { ...base, unitPrice: valid ? componentUnitPrice(components) : null, priceComponents: components };
}
function samePrice(saved: WebsiteVehiclePrice | undefined, next: WebsiteVehiclePrice) {
  const normalize = (price: WebsiteVehiclePrice | undefined) => JSON.stringify(price && hasPlanData(price)
    ? [price.unitPrice, price.includesDriver, price.includesGuide, PRICE_CATEGORIES.map(category => [componentPrice(price, category), componentPrice(price, category) !== null && componentVisible(price, category)])]
    : null);
  return normalize(saved) === normalize(next);
}
function disablePlanB() {
  planBEnabled.value = false;
  shared.B = emptySharedPlan();
}
function planServices(key: PlanKey) {
  return [shared[key].includesDriver && t("websiteReport.driver"), shared[key].includesGuide && t("websiteReport.guide")].filter(Boolean).join(" + ");
}
function pdfSummary(key: PlanKey) {
  const items = SHARED_CATEGORIES.filter(category => shared[key].showInPdf[category] && shared[key].prices[category] !== null)
    .map(category => `${t(`websiteItineraryUi.priceCategories.${category}`)} ${shared[key].prices[category]}`);
  if (vehicleInPdf.value && vehicleRateSummary.value) items.push(`${t("websiteItineraryUi.priceCategories.vehicle")}（${vehicleRateSummary.value}）`);
  return items.join("；");
}
function apply() {
  if (!props.editable || hasInvalidPrice.value) return;
  plan.value.vehiclePrices = VEHICLE_OPTIONS.flatMap(option => PLANS.map(key => selectedVehicles.value.includes(option.value) && activePlans.value.includes(key)
    ? built(option.value, key)
    : { vehicleType: option.value, plan: key, includesDriver: false, includesGuide: false, unitPrice: null, priceComponents: [] }));
  visible.value = false;
}
</script>
<style scoped lang="scss">
.price-grid {
  display: grid;
  gap: 10px 24px;
  align-items: center;

  &--vehicle {
    grid-template-columns: max-content minmax(0, 320px) minmax(0, 1fr);
  }

  &__divider {
    padding-top: 10px;
    border-top: 1px solid var(--el-border-color-lighter);
  }
}
</style>
