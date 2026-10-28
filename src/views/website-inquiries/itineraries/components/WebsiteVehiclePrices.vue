<template>
  <AppDialog v-model="visible" size="xl" :title="$t('websiteItineraryUi.packagePriceTitle')">
    <p class="m-0 mb-4 text-sm text-muted">
      {{ $t("websiteReport.plansHelp") }}
    </p>
    <el-form label-position="top" :disabled="!editable">
      <div class="grid grid-cols-2 gap-4 max-[800px]:grid-cols-1">
        <SectionCard v-for="option in VEHICLE_OPTIONS" :key="option.value">
          <h4 class="m-0 mb-3 text-[14px] text-strong font-600">
            {{ $t(option.labelKey) }}
          </h4>
          <div class="grid grid-cols-2 gap-4 max-[550px]:grid-cols-1">
            <div v-for="price in prices.filter(item => item.vehicleType === option.value)" :key="price.plan">
              <strong>{{ $t("websiteReport.plan", { plan: price.plan }) }}</strong>
              <div class="flex flex-wrap gap-x-3">
                <el-checkbox v-model="price.includesDriver">
                  {{ $t("websiteReport.driver") }}
                </el-checkbox>
                <el-checkbox v-model="price.includesGuide">
                  {{ $t("websiteReport.guide") }}
                </el-checkbox>
              </div>
              <el-form-item :label="`${$t('websiteItineraryUi.pricePerPerson')} (${$t('websiteItineraryUi.pricePerPersonUnit')})`" :error="price.unitPrice !== null && !isValidVehiclePrice(price.unitPrice) ? $t('websiteWorkspace.vehiclePriceInvalid') : ''">
                <el-input
                  :model-value="price.unitPrice ?? ''"
                  :placeholder="$t('websiteItineraryUi.pricePlaceholder')"
                  :aria-label="`${$t(option.labelKey)} ${price.plan} · ${$t('websiteItineraryUi.pricePerPerson')}`"
                  @update:model-value="price.unitPrice = $event.trim() || null"
                >
                </el-input>
              </el-form-item>
              <p class="text-sm">
                {{ $t("websiteReport.pax") }}: {{ plan.pax ?? $t("websiteReport.undetermined") }}
              </p>
              <p class="text-sm">
                {{ $t("websiteReport.total") }}: {{ vehiclePriceTotal(price.unitPrice, plan.pax) ?? $t("websiteReport.undetermined") }}
              </p>
            </div>
          </div>
          <p class="text-xs m-0 text-muted">
            {{ $t("websiteItineraryUi.capacityHint", { comfortable: option.seats - 2, economy: option.seats - 1, luggage: option.seats - 4 }) }}
          </p>
        </SectionCard>
      </div>
    </el-form>
    <template #footer>
      <el-button @click="visible = false">
        {{ $t(editable ? "common.cancel" : "common.close") }}
      </el-button>
      <el-button
        v-if="editable"
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
import { computed, ref, watch } from "vue";
import AppDialog from "@/components/AppDialog/index.vue";
import SectionCard from "@/components/SectionCard/index.vue";
import { isValidVehiclePrice, vehiclePriceTotal } from "../vehicle-price";
import type { WebsiteItinerary, WebsiteVehiclePrice } from "@/types/website";
import { VEHICLE_OPTIONS } from "../../options";
const visible = defineModel<boolean>({ required: true });
const plan = defineModel<WebsiteItinerary>("plan", { required: true });
const props = defineProps<{ editable: boolean }>();
const prices = ref<WebsiteVehiclePrice[]>([]);
const hasInvalidPrice = computed(() => prices.value.some(price => price.unitPrice !== null && !isValidVehiclePrice(price.unitPrice)));
watch(visible, (value) => {
  if (!value) return;
  prices.value = VEHICLE_OPTIONS.flatMap(option => (["A", "B"] as const).map(key => {
    const existing = plan.value.vehiclePrices.find(price => price.vehicleType === option.value && price.plan === key);
    return existing ? { ...existing } : { vehicleType: option.value, plan: key, includesDriver: false, includesGuide: false, unitPrice: null };
  }));
});
function apply() {
  if (!props.editable || hasInvalidPrice.value) return;
  plan.value.vehiclePrices = prices.value.map(price => ({ ...price }));
  visible.value = false;
}
</script>
