<template>
  <section class="flex flex-col gap-3" :class="{ 'surface-muted p-4': !legId }">
    <div v-if="!legId" class="flex flex-wrap justify-between items-center gap-3">
      <h4 class="m-0 text-[14px] text-strong font-600">
        {{ $t("websiteItineraryUi.transportLegs") }}
      </h4>
      <el-button
        v-if="editable"
        link
        type="primary"
        @click="emit('add')"
      >
        {{ $t("itineraryWorkspace.actions.transport") }}
      </el-button>
    </div>
    <div
      v-for="leg in visibleLegs"
      :key="leg.id"
      class="p-3 rounded-[var(--custom-radius)] bg-surface border border-solid border-[var(--divider-color)]"
    >
      <div class="flex items-start gap-3">
        <div class="min-w-0 flex-1 flex flex-col gap-1 text-[14px] [overflow-wrap:anywhere]">
          <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
            <strong class="text-strong">{{ cityName(leg.fromCityId) }} → {{ cityName(leg.toCityId) }}</strong>
            <el-tag
              v-if="leg.routeId"
              size="small"
              type="info"
              effect="plain"
            >
              {{ $t("websiteItineraryUi.sourceRoute") }}
            </el-tag>
            <el-tag v-if="leg.isAirportPickup" size="small">
              {{ $t("websiteItineraryUi.airportPickup") }}
            </el-tag>
            <el-tag v-if="leg.isAirportDropoff" size="small">
              {{ $t("websiteItineraryUi.airportDropoff") }}
            </el-tag>
          </div>
          <span class="text-muted">{{ $t(TRANSPORT_OPTIONS.find(option => option.value === leg.mode)!.labelKey) }}<span class="ml-2">{{ $t(`websiteInquiry.feeStates.${leg.feeState}`) }}</span></span>
          <span v-if="leg.vehicleType">{{ vehicleLabel(leg.vehicleType) }}</span>
          <span v-if="leg.distanceKm != null || leg.durationMinutes != null">{{ leg.distanceKm == null ? $t('websiteReport.notSpecified') : `${leg.distanceKm} km` }}<span class="ml-2">{{ leg.durationMinutes == null ? $t('websiteReport.notSpecified') : $t('websiteReport.minutesValue', { value: leg.durationMinutes }) }}</span></span>
          <span v-if="leg.nameZh || leg.nameEn">{{ (locale === 'en' ? leg.nameEn : leg.nameZh) || leg.nameZh || leg.nameEn }}</span>
        </div>
        <div v-if="editable" class="flex shrink-0 self-start">
          <el-button link type="primary" @click="openEdit(leg)">
            {{ $t("common.edit") }}
          </el-button>
          <el-button link type="danger" @click="emit('remove', leg.id, cityName(leg.fromCityId) + ' → ' + cityName(leg.toCityId))">
            {{ $t("common.delete") }}
          </el-button>
        </div>
      </div>
    </div>
  </section>
  <AppDialog
    :model-value="Boolean(draft)"
    :title="$t('websiteItineraryUi.transportLegs')"
    size="lg"
    append-to-body
    @close="draft = null"
  >
    <template #header="{ titleId, titleClass }">
      <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
        <h2 :id="titleId" :class="titleClass" class="m-0">
          {{ $t("websiteItineraryUi.transportLegs") }}
        </h2>
        <el-tag
          v-if="draft?.routeId"
          size="small"
          type="info"
          effect="plain"
        >
          {{ $t("websiteItineraryUi.sourceRoute") }}
        </el-tag>
      </div>
    </template>
    <el-form
      v-if="draft"
      ref="formRef"
      :model="draft"
      :rules="rules"
      label-position="top"
      scroll-to-error
      :disabled="!editable"
      @submit.prevent
    >
      <div class="grid grid-cols-3 gap-x-4 max-[650px]:grid-cols-1">
        <el-form-item :label="$t('websiteItineraryUi.resourceSource')">
          <el-radio-group v-model="source">
            <el-radio-button value="route">
              {{ $t("websiteItineraryUi.sourceRoute") }}
            </el-radio-button>
            <el-radio-button value="manual">
              {{ $t("websiteItineraryUi.sourceManual") }}
            </el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item
          v-if="source === 'route'"
          class="col-span-2 max-[650px]:col-span-1"
          :label="$t('websiteItineraryUi.sourceRoute')"
          prop="routeId"
        >
          <el-select
            :model-value="selectedRoute?.id"
            autocomplete="new-password"
            filterable
            @update:model-value="selectRoute"
          >
            <el-option
              v-for="route in routeOptions"
              :key="route.id"
              :value="route.id"
              :label="routeLabel(route)"
              :disabled="route.status !== 'enabled'"
            />
          </el-select>
        </el-form-item>
      </div>
      <div class="grid grid-cols-3 gap-x-4 max-[650px]:grid-cols-1">
        <el-form-item :label="$t('websiteItineraryUi.departureCity')" :prop="source === 'manual' ? 'fromCityId' : undefined">
          <el-select
            v-model="draft.fromCityId"
            :disabled="source === 'route'"
            autocomplete="new-password"
            filterable
          >
            <el-option
              v-for="city in cityOptions"
              :key="city.id"
              :value="city.id"
              :label="locale === 'en' ? city.nameEn : city.nameZh"
            />
          </el-select>
        </el-form-item>
        <el-form-item :label="$t('websiteItineraryUi.arrivalCity')" :prop="source === 'manual' ? 'toCityId' : undefined">
          <el-select
            v-model="draft.toCityId"
            :disabled="source === 'route'"
            autocomplete="new-password"
            filterable
          >
            <el-option
              v-for="city in cityOptions"
              :key="city.id"
              :value="city.id"
              :label="locale === 'en' ? city.nameEn : city.nameZh"
            />
          </el-select>
        </el-form-item>
        <el-form-item :label="$t('websiteItineraryUi.transportMode')">
          <el-select v-model="draft.mode" autocomplete="new-password">
            <el-option
              v-for="option in TRANSPORT_OPTIONS"
              :key="option.value"
              :value="option.value"
              :label="$t(option.labelKey)"
            />
          </el-select>
        </el-form-item>
        <el-form-item :label="$t('websiteItineraryUi.transportNameZh')">
          <el-input v-model="draft.nameZh" :placeholder="airportTransferPlaceholder(draft, 'zh-cn', t)" maxlength="150" />
        </el-form-item>
        <el-form-item :label="$t('websiteItineraryUi.transportNameEn')">
          <el-input v-model="draft.nameEn" :placeholder="airportTransferPlaceholder(draft, 'en', t)" maxlength="150" />
        </el-form-item>
        <el-form-item :label="$t('websiteItineraryUi.feeState')">
          <FeeStateSelect v-model="draft.feeState" />
        </el-form-item>
        <WebsiteTransportFields
          v-model="draft"
          :mode="draft.mode"
          :vehicle-options="vehicleOptions"
          :configured-vehicles-only="source === 'route'"
          :airport-transfers="airportTransfers"
        />
      </div>
    </el-form>
    <template #footer>
      <el-button @click="draft = null">
        {{ $t("common.cancel") }}
      </el-button>
      <el-button type="primary" :disabled="!editable" @click="handleSaveEdit">
        {{ $t("common.confirm") }}
      </el-button>
    </template>
  </AppDialog>
</template>
<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import AppDialog from "@/components/AppDialog/index.vue";
import type { WebsiteConfig, WebsiteDay, WebsiteLeg, WebsiteRoute } from "@/types/website";
import type { FormInstance, FormRules } from "element-plus";
import WebsiteTransportFields from "./WebsiteTransportFields.vue";
import { transportRules } from "@/views/resources/website/useWebsiteConfigRules";
import { TRANSPORT_OPTIONS, VEHICLE_OPTIONS } from "../../options";
import FeeStateSelect from "../../components/FeeStateSelect.vue";
import { websiteCityOptions, websiteDayRouteCityIds } from "../city-options";
import { airportTransferPlaceholder, setTransportLeg, type AirportTransferOptions } from "../airport-transfers";
import { websiteRouteTransportDetails } from "../transport-route";
const day = defineModel<WebsiteDay>("day", { required: true });
const props = defineProps<{
  config: WebsiteConfig;
  selectableCityIds: ReadonlySet<string>;
  editable: boolean;
  legId?: string;
  airportTransfers?: AirportTransferOptions;
}>();
const emit = defineEmits<{ add: []; remove: [id: string, name: string] }>();
const { t, locale } = useI18n();
const draft = ref<WebsiteLeg | null>(null);
const source = ref<"route" | "manual">("manual");
const formRef = ref<FormInstance>();
const cityOptions = computed(() => websiteCityOptions(
  props.config.cities,
  props.selectableCityIds,
  ...websiteDayRouteCityIds(day.value),
));
const selectedRoute = computed(() => {
  const leg = draft.value;
  if (!leg?.routeId) return;
  return props.config.routes.find(route =>
    route.id === leg.routeId && route.fromCityId === leg.fromCityId && route.toCityId === leg.toCityId,
  );
});
const routeOptions = computed(() => {
  const cityIds = new Set(cityOptions.value.map(city => city.id));
  return props.config.routes.filter(route => route.id === selectedRoute.value?.id ||
    (route.status === "enabled" && cityIds.has(route.fromCityId) && cityIds.has(route.toCityId)));
});
const vehicleOptions = computed(() => {
  if (source.value === "route") return selectedRoute.value?.vehicleOptions ?? [];
  return props.config.routes.filter(route => route.status === "enabled" && route.mode === "private_vehicle"
    && route.fromCityId === draft.value?.fromCityId && route.toCityId === draft.value?.toCityId).flatMap(route => route.vehicleOptions ?? []);
});
const rules = computed<FormRules<WebsiteLeg>>(() => ({
  ...transportRules(t),
  routeId: [{
    required: true,
    validator: (_rule, _value, callback) => {
      callback(selectedRoute.value ? undefined : new Error(t("websiteItineraryUi.selectTransportRoute")));
    },
    trigger: "change",
  }],
  fromCityId: [{ required: true, message: t("common.selectCity"), trigger: "change" }],
  toCityId: [{ required: true, message: t("common.selectCity"), trigger: "change" }],
}));
const visibleLegs = computed(() => day.value.legs.filter(leg => !props.legId || leg.id === props.legId));
watch(source, (value) => {
  if (value === "manual" && draft.value) draft.value.routeId = null;
});
watch(() => draft.value?.mode, mode => { if (draft.value && mode !== "private_vehicle") draft.value.vehicleType = null; });

function vehicleLabel(value: string) {
  const option = VEHICLE_OPTIONS.find(option => option.value === value);
  return option ? t(option.labelKey) : value;
}
function routeLabel(route: WebsiteRoute) {
  const name = locale.value === "en" ? route.nameEn : route.nameZh;
  const mode = TRANSPORT_OPTIONS.find(option => option.value === route.mode);
  return mode ? `${name} (${t(mode.labelKey)})` : name;
}
function cityName(id: string) {
  const city = props.config.cities.find(item => item.id === id);
  return city ? (locale.value === "en" ? city.nameEn : city.nameZh) : "-";
}
function openEdit(item: WebsiteLeg) {
  if (!props.editable) return;
  draft.value = { ...item };
  source.value = item.routeId ? "route" : "manual";
}
function selectRoute(id: string) {
  const route = routeOptions.value.find(option => option.id === id && option.status === "enabled");
  if (!draft.value || !route) return;
  draft.value = {
    ...draft.value,
    routeId: route.id,
    fromCityId: route.fromCityId,
    toCityId: route.toCityId,
    mode: route.mode,
    nameZh: route.nameZh,
    nameEn: route.nameEn,
    feeState: route.feeState,
    ...websiteRouteTransportDetails(route),
  };
}
async function handleSaveEdit() {
  if (!props.editable || !draft.value || !(await formRef.value?.validate().catch(() => false))) return;
  const selected = draft.value;
  if (day.value.legs.some(leg => leg.id === selected.id)) setTransportLeg(day.value, selected);
  draft.value = null;
}
defineExpose({ openEdit });
</script>
