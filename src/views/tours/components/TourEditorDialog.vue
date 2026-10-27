<template>
  <AppDialog
    v-model="visible"
    :title="$t(tour ? 'common.edit' : 'common.create')"
    size="lg"
    :busy="saving"
    destroy-on-close
  >
    <el-form
      :key="formSession"
      ref="formRef"
      :model="form"
      :rules="rules"
      :validate-on-rule-change="false"
      :disabled="saving"
      label-width="auto"
    >
      <template v-if="!tour">
        <el-form-item :label="$t('tour.createMode')">
          <el-radio-group v-model="createMode" @change="resetCreateForm">
            <el-radio-button value="manual">
              {{ $t("tour.createModes.manual") }}
            </el-radio-button>
            <el-radio-button value="linked">
              {{ $t("tour.createModes.linked") }}
            </el-radio-button>
          </el-radio-group>
        </el-form-item>
        <template v-if="createMode === 'linked'">
          <el-form-item v-if="isHeadquarters" :label="$t('tour.source')">
            <el-radio-group v-model="sourceModule" @change="resetCreateForm">
              <el-radio-button value="standard">
                {{ $t("tour.sourceModule.standard") }}
              </el-radio-button>
              <el-radio-button value="website">
                {{ $t("tour.sourceModule.website") }}
              </el-radio-button>
            </el-radio-group>
          </el-form-item>
          <el-form-item :label="$t('tour.inquiry')" prop="inquiryId">
            <el-select
              v-model="form.inquiryId"
              autocomplete="new-password"
              filterable
              remote
              :remote-method="loadSources"
              :loading="sourcesLoading"
              :placeholder="$t(`tour.inquirySearch.${sourceModule}`)"
              class="w-full"
            >
              <el-option
                v-for="item in sources"
                :key="item.inquiryId"
                :value="item.inquiryId"
                :label="`${item.inquiryCode} · ${item.agencyName}`"
              />
            </el-select>
          </el-form-item>
        </template>
      </template>
      <template v-if="!tour && source">
        <el-descriptions
          :column="2"
          border
          size="small"
          class="mb-[16px]"
        >
          <el-descriptions-item :label="$t('tour.quoteCode')">
            {{ source.quoteCode }}
          </el-descriptions-item>
          <el-descriptions-item :label="$t('tour.itineraryCode')">
            {{ source.itineraryCode ?? "-" }}
          </el-descriptions-item>
          <el-descriptions-item :label="$t('common.startDate')">
            {{ source.startDate ?? "-" }}
          </el-descriptions-item>
          <el-descriptions-item :label="$t('tour.days')">
            {{ source.days ?? "-" }}
          </el-descriptions-item>
          <el-descriptions-item :label="$t('common.countryOrRegion')">
            {{ source.countryName || "-" }}
          </el-descriptions-item>
          <el-descriptions-item :label="$t('tour.collectCoordinator')">
            {{ source.ownerName }}
          </el-descriptions-item>
        </el-descriptions>
        <el-alert
          v-if="!source.downloaded"
          type="warning"
          :closable="false"
          :title="$t('tour.notDownloaded')"
          class="mb-3!"
        />
        <el-alert
          v-if="!source.startDate"
          type="warning"
          :closable="false"
          :title="$t('tour.noStartDate')"
          class="mb-3!"
        />
        <el-alert
          v-if="!source.countryCode"
          type="warning"
          :closable="false"
          :title="$t('tour.noCountry')"
          class="mb-3!"
        />
      </template>

      <template v-if="isManual">
        <el-row :gutter="12">
          <el-col :xs="24" :sm="12">
            <el-form-item :label="$t('identity.businessUnit')" prop="businessUnit">
              <el-select
                v-model="form.businessUnit"
                autocomplete="new-password"
                :disabled="Boolean(tour) || !isHeadquarters"
                class="w-full"
              >
                <el-option
                  v-for="item in UNITS"
                  :key="item"
                  :value="item"
                  :label="businessUnitName(item)"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12">
            <el-form-item :label="$t('common.countryOrRegion')" prop="countryItemId">
              <BusinessItemSelect
                v-model="form.countryItemId"
                type-code="country-region"
                :disabled="Boolean(tour)"
                :selected-label="tour ? `${tour.countryName} (${tour.countryCode})` : undefined"
              />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item :label="$t('tour.itinerarySummary')" prop="itinerarySummary">
          <el-input
            v-model.trim="form.itinerarySummary"
            maxlength="500"
            :placeholder="$t('tour.itinerarySummaryPlaceholder')"
          />
        </el-form-item>
        <el-row :gutter="12">
          <el-col :xs="24" :sm="12">
            <el-form-item :label="$t('tour.agency')" prop="agencyId">
              <ResourceSelect
                v-if="unit === 'shengxu'"
                v-model="form.agencyId"
                kind="agencies"
                :filters="{ businessUnit: 'shengxu' }"
                :selected-label="tour?.agencyName"
                :placeholder="tour && !tour.agencyId ? tour.agencyName : $t('common.selectPlaceholder')"
              />
              <el-input v-else :model-value="fixedPlatform" readonly />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12">
            <el-form-item :label="$t('tour.contact')">
              <el-input v-model.trim="form.contactName" maxlength="200" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="12">
          <el-col :xs="24" :sm="12">
            <el-form-item :label="$t('common.startDate')" prop="startDate">
              <el-date-picker
                v-model="form.startDate"
                type="date"
                value-format="YYYY-MM-DD"
                class="w-full!"
                @change="handleScheduleDateChange"
              />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12">
            <el-form-item :label="$t('tour.days')" prop="days">
              <el-input-number
                v-model="form.days"
                :min="1"
                :max="365"
                :step="1"
                step-strictly
                controls-position="right"
                class="w-full"
              />
            </el-form-item>
          </el-col>
        </el-row>
      </template>

      <el-row :gutter="12">
        <el-col v-if="isManual" :xs="24" :sm="12">
          <el-form-item :label="$t('tour.collectCoordinator')" prop="collectCoordinatorId">
            <el-select
              v-model="form.collectCoordinatorId"
              autocomplete="new-password"
              filterable
              :disabled="collectOptions.length <= 1"
              class="w-full"
            >
              <el-option
                v-for="item in collectOptions"
                :key="item.id"
                :value="item.id"
                :label="item.name"
              />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :xs="24" :sm="isManual ? 12 : 24">
          <el-form-item :label="$t('tour.operator')" prop="operatorId">
            <el-select
              v-model="form.operatorId"
              autocomplete="new-password"
              filterable
              class="w-full"
            >
              <el-option
                v-for="item in operators"
                :key="item.id"
                :value="item.id"
                :label="item.name"
              />
            </el-select>
          </el-form-item>
        </el-col>
      </el-row>
      <el-row :gutter="12">
        <el-col :xs="24" :sm="8">
          <el-form-item :label="$t('tour.adults')" prop="adults">
            <el-input-number
              v-model="form.adults"
              :min="0"
              :max="10000"
              :step="1"
              step-strictly
              controls-position="right"
              class="w-full"
            />
          </el-form-item>
        </el-col>
        <el-col :xs="24" :sm="8">
          <el-form-item :label="$t('tour.children')" prop="children">
            <el-input-number
              v-model="form.children"
              :min="0"
              :max="10000"
              :step="1"
              step-strictly
              controls-position="right"
              class="w-full"
            />
          </el-form-item>
        </el-col>
        <el-col :xs="24" :sm="8">
          <el-form-item :label="$t('tour.leaders')" prop="leaders">
            <el-input-number
              v-model="form.leaders"
              :min="0"
              :max="10000"
              :step="1"
              step-strictly
              controls-position="right"
              class="w-full"
            />
          </el-form-item>
        </el-col>
      </el-row>
      <el-form-item :label="$t('tour.totalPeople')">
        {{ (form.adults ?? 0) + (form.children ?? 0) + (form.leaders ?? 0) }}
      </el-form-item>
      <el-row :gutter="12">
        <el-col :xs="24" :sm="12">
          <el-form-item :label="$t('common.language')">
            <RemoteSelect
              v-model="form.language"
              :load-options="loadLanguages"
              :placeholder="$t('common.selectPlaceholder')"
            />
          </el-form-item>
        </el-col>
        <el-col :xs="24" :sm="12">
          <el-form-item :label="$t('tour.shopping')">
            <el-switch v-model="form.shopping" />
          </el-form-item>
        </el-col>
      </el-row>
      <el-form-item v-if="isManual" :label="$t('tour.scheduleModeLabel')">
        <el-radio-group v-model="form.scheduleMode" @change="handleScheduleDateChange">
          <el-radio-button value="flight">
            {{ $t("tour.scheduleMode.flight") }}
          </el-radio-button>
          <el-radio-button value="manual">
            {{ $t("tour.scheduleMode.manual") }}
          </el-radio-button>
        </el-radio-group>
      </el-form-item>
      <template v-if="form.scheduleMode === 'flight'">
        <el-form-item :label="$t('tour.pickupFlight')" prop="pickupFlightId">
          <RemoteSelect
            v-if="visible"
            :key="flightQueryKey"
            v-model="form.pickupFlightId"
            :load-options="loadPickupFlights"
            :query-key="flightQueryKey"
            :selected-label="selectedFlightLabel('pickup')"
            :disabled="!unit"
            :placeholder="$t('common.selectPlaceholder')"
            autocomplete="new-password"
            class="w-full"
          />
        </el-form-item>
        <el-form-item :label="$t('tour.dropFlight')" prop="dropFlightId">
          <RemoteSelect
            v-if="visible"
            :key="flightQueryKey"
            v-model="form.dropFlightId"
            :load-options="loadDropFlights"
            :query-key="flightQueryKey"
            :selected-label="selectedFlightLabel('drop')"
            :disabled="!unit"
            :placeholder="$t('common.selectPlaceholder')"
            autocomplete="new-password"
            class="w-full"
          />
        </el-form-item>
      </template>
      <el-row v-else :gutter="12">
        <el-col :xs="24" :sm="12">
          <el-form-item :label="$t('tour.pickupAt')" prop="pickupAt">
            <el-date-picker
              v-model="form.pickupAt"
              type="datetime"
              format="YYYY-MM-DD HH:mm"
              value-format="YYYY-MM-DD HH:mm"
              :default-value="pickerDefault"
              class="w-full!"
            />
          </el-form-item>
        </el-col>
        <el-col :xs="24" :sm="12">
          <el-form-item :label="$t('tour.dropAt')" prop="dropAt">
            <el-date-picker
              v-model="form.dropAt"
              type="datetime"
              format="YYYY-MM-DD HH:mm"
              value-format="YYYY-MM-DD HH:mm"
              :default-value="pickerDefault"
              class="w-full!"
            />
          </el-form-item>
        </el-col>
      </el-row>
      <el-form-item :label="$t('tour.guideService.title')">
        <GuideServicesEditor
          ref="guideEditorRef"
          v-model="form.guideServices"
          :business-unit="unit"
          :exclude-tour-id="props.tour?.id"
          :team-window="teamWindow"
          :disabled="saving"
          :server-errors="guideServerErrors"
          :show-incomplete="showGuideIncomplete"
        />
      </el-form-item>
      <el-form-item :label="$t('common.remark')">
        <el-input
          v-model.trim="form.remark"
          type="textarea"
          :rows="3"
          maxlength="2000"
          show-word-limit
        />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button :disabled="saving" @click="visible = false">
        {{ $t("common.cancel") }}
      </el-button>
      <el-button
        type="primary"
        :loading="requesting"
        :disabled="saving"
        @click="save"
      >
        {{ $t("common.save") }}
      </el-button>
    </template>
  </AppDialog>
</template>

<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch } from "vue";
import { ElMessage, type FormInstance, type FormRules } from "element-plus";
import { useI18n } from "vue-i18n";
import AppDialog from "@/components/AppDialog/index.vue";
import RemoteSelect from "@/components/RemoteSelect/index.vue";
import ResourceSelect from "@/components/ResourceSelect/index.vue";
import type { RemoteOptionsQuery } from "@/composables/useRemoteOptions";
import BusinessItemSelect from "@/components/BusinessItemSelect/index.vue";
import { isApiError } from "@/api/request";
import { ROLE_ROOT } from "@/constants";
import { businessUnitName } from "@/constants/identity";
import { tourService } from "@/services/tour.service";
import { useUserStore } from "@/stores/user";
import type {
  TourBusinessUnit,
  TourFlightOption,
  TourLinkedSourceModule,
  TourRecord,
  TourSource,
} from "@/types/tour";
import {
  createTourRequest,
  emptyTourForm,
  guideServiceErrors,
  manualScheduleError,
  syncManualPickupDate,
  tourFormFromRecord,
  updateTourRequest,
  type TourCreateMode,
} from "../tour-form";
import GuideServicesEditor from "./GuideServicesEditor.vue";

const UNITS: TourBusinessUnit[] = ["shengxu", "linxi", "website"];
const props = defineProps<{ modelValue: boolean; tour: TourRecord | null }>();
const emit = defineEmits<{ "update:modelValue": [value: boolean]; saved: [] }>();
const { t, locale } = useI18n();
const user = useUserStore();
const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit("update:modelValue", value),
});
const formRef = ref<FormInstance>();
const formSession = ref(0);
const validating = ref(false);
const requesting = ref(false);
const saving = computed(() => validating.value || requesting.value);
const createMode = ref<TourCreateMode>("manual");
const sourceModule = ref<TourLinkedSourceModule>("standard");
const sources = ref<TourSource[]>([]);
const sourcesLoading = ref(false);
const operators = ref<Array<{ id: string; name: string }>>([]);
const flightSession = ref(0);
const flightOptions = {
  pickup: reactive(new Map<string, TourFlightOption>()),
  drop: reactive(new Map<string, TourFlightOption>()),
};
const guideEditorRef = ref<InstanceType<typeof GuideServicesEditor>>();
const guideServerErrors = ref<Record<string, string>>({});
const showGuideIncomplete = ref(false);
const form = reactive(emptyTourForm());

const isHeadquarters = computed(() => user.userInfo.scope === "headquarters");
// 与后端一致：ROOT/业务负责人可指定本业务收客计调，其他计调只能是本人。最终由服务端授权。
const canAssignCollector = computed(() =>
  user.userInfo.roles.some((role) => role === ROLE_ROOT || role === "BUSINESS_MANAGER"),
);
const isManual = computed(() =>
  props.tour ? props.tour.sourceModule === "manual" : createMode.value === "manual",
);
const source = computed(() =>
  !props.tour && createMode.value === "linked"
    ? sources.value.find((item) => item.inquiryId === form.inquiryId)
    : undefined,
);
const unit = computed<TourBusinessUnit | null>(() => {
  if (props.tour) return props.tour.businessUnit;
  if (isManual.value) return form.businessUnit || null;
  return source.value?.businessUnit ?? null;
});
const flightQueryKey = computed(() => JSON.stringify([
  unit.value, props.tour?.id ?? "new", flightSession.value, locale.value, form.scheduleMode,
]));
const fixedPlatform = computed(() =>
  unit.value === "linxi" || unit.value === "website"
    ? t(`tour.fixedPlatforms.${unit.value}`)
    : "",
);
// 团队接送窗口仅用于“沿用团队接送时间”和越界提示；航班模式编辑沿用已保存的接送时间。
const teamWindow = computed(() => {
  if (form.scheduleMode === "manual")
    return form.pickupAt && form.dropAt ? { from: form.pickupAt, to: form.dropAt } : null;
  const current = props.tour;
  return current?.pickupAt && current.dropAt ? { from: current.pickupAt, to: current.dropAt } : null;
});
const collectOptions = computed(() => {
  const self = { id: user.userInfo.userId ?? "", name: user.userInfo.nickname || user.userInfo.username || "" };
  const options = canAssignCollector.value ? [...operators.value] : self.id ? [self] : [];
  const current = props.tour;
  if (current && !options.some((item) => item.id === current.collectCoordinatorId))
    options.push({ id: current.collectCoordinatorId, name: current.collectCoordinatorName });
  return options;
});
const pickerDefault = computed(() =>
  form.startDate ? new Date(`${form.startDate}T00:00:00`) : undefined,
);

const selectRule = computed(() => ({
  required: true,
  message: t("common.selectPlaceholder"),
  trigger: "change",
}));
const inputRule = computed(() => ({
  required: true,
  whitespace: true,
  message: t("tour.inputRequired"),
  trigger: "blur",
}));
const headcountRule = computed(() => ({
  validator: (_rule: unknown, value: unknown, callback: (error?: Error) => void) =>
    typeof value === "number" && Number.isInteger(value) && value >= 0
      ? callback()
      : callback(new Error(t("tour.headcountRequired"))),
  trigger: "change",
}));
const rules = computed<FormRules>(() => ({
  adults: [headcountRule.value],
  children: [headcountRule.value],
  leaders: [headcountRule.value],
  inquiryId: [selectRule.value],
  businessUnit: [selectRule.value],
  countryItemId: [selectRule.value],
  collectCoordinatorId: [selectRule.value],
  agencyId: unit.value === "shengxu" && (!props.tour || props.tour.agencyId) ? [selectRule.value] : [],
  itinerarySummary: [inputRule.value],
  startDate: [selectRule.value],
  days: [
    {
      validator: (_rule: unknown, value: unknown, callback: (error?: Error) => void) =>
        typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 365
          ? callback()
          : callback(new Error(t("tour.daysRequired"))),
      trigger: "change",
    },
  ],
  operatorId: [selectRule.value],
  pickupFlightId: [selectRule.value],
  dropFlightId: [selectRule.value],
  pickupAt: [
    selectRule.value,
    {
      validator: (_rule: unknown, value: string, callback: (error?: Error) => void) =>
        manualScheduleError(form.startDate, value, "") === "pickupDate"
          ? callback(new Error(t("tour.pickupDateMismatch")))
          : callback(),
      trigger: "change",
    },
  ],
  dropAt: [
    selectRule.value,
    {
      validator: (_rule: unknown, _value: unknown, callback: (error?: Error) => void) =>
        form.pickupAt && form.dropAt && form.dropAt < form.pickupAt
          ? callback(new Error(t("tour.dropBeforePickup")))
          : callback(),
      trigger: "change",
    },
  ],
}));

async function handleScheduleDateChange() {
  if (!isManual.value || form.scheduleMode !== "manual") return;
  syncManualPickupDate(form);
  await nextTick();
  const fields = ["pickupAt", "dropAt"] as const;
  const filledFields = fields.filter((field) => form[field]);
  if (filledFields.length) await formRef.value?.validateField(filledFields).catch(() => false);
}

async function loadLanguages(query: RemoteOptionsQuery) {
  const result = await tourService.guideLanguages(query);
  return { ...result, list: result.list.map((item) => ({ id: item.id, label: item.name })) };
}

function flightLabel(item: TourFlightOption) {
  const name = (zh: string, en: string) => (locale.value === "en" ? en : zh);
  return `${item.flightNumber} ${name(item.departureName, item.departureEnglishName)} ${item.departureTime} → ${name(item.arrivalName, item.arrivalEnglishName)} ${item.arrivalTime}`;
}

function originalFlight(kind: "pickup" | "drop"): TourFlightOption | undefined {
  const current = props.tour;
  const id = current?.[`${kind}FlightId`];
  const snapshot = current?.[`${kind}Flight`];
  if (!id || !snapshot) return;
  return {
    id,
    flightNumber: snapshot.flightNumber,
    departureTime: snapshot.departureTime,
    arrivalTime: snapshot.arrivalTime,
    departureCode: snapshot.departureAirport.code,
    departureName: snapshot.departureAirport.name,
    departureEnglishName: snapshot.departureAirport.englishName,
    arrivalCode: snapshot.arrivalAirport.code,
    arrivalName: snapshot.arrivalAirport.name,
    arrivalEnglishName: snapshot.arrivalAirport.englishName,
  };
}

function selectedFlightLabel(kind: "pickup" | "drop") {
  const id = form[`${kind}FlightId`];
  const original = originalFlight(kind);
  const selected = original?.id === id ? original : flightOptions[kind].get(id);
  return selected ? flightLabel(selected) : "";
}

async function loadFlights(query: RemoteOptionsQuery, kind: "pickup" | "drop") {
  const businessUnit = unit.value;
  if (!visible.value || form.scheduleMode !== "flight" || !businessUnit) return { list: [], total: 0 };
  const key = flightQueryKey.value;
  const result = await tourService.flights({ ...query, businessUnit });
  if (!visible.value || key !== flightQueryKey.value) return { list: [], total: 0 };
  const original = originalFlight(kind);
  return {
    ...result,
    list: result.list.map((item) => {
      flightOptions[kind].set(item.id, item);
      // 同一 ID 保存时继续沿用原团快照，候选页也显示这份快照。
      return { id: item.id, label: flightLabel(original?.id === item.id ? original : item) };
    }),
  };
}

function loadPickupFlights(query: RemoteOptionsQuery) {
  return loadFlights(query, "pickup");
}
function loadDropFlights(query: RemoteOptionsQuery) {
  return loadFlights(query, "drop");
}
function fail(error: unknown) {
  ElMessage.error(error instanceof Error ? error.message : String(error));
}

let sourcesGeneration = 0;
let choicesGeneration = 0;
let choicesUnit: TourBusinessUnit | null | undefined;

async function loadSources(keyword = "") {
  const generation = ++sourcesGeneration;
  sourcesLoading.value = true;
  try {
    const selected = source.value;
    const result = await tourService.sources(sourceModule.value, keyword);
    if (generation !== sourcesGeneration) return;
    sources.value = selected && !result.some((item) => item.inquiryId === selected.inquiryId)
      ? [selected, ...result] : result;
  } catch (error) {
    if (generation === sourcesGeneration) fail(error);
  } finally {
    if (generation === sourcesGeneration) sourcesLoading.value = false;
  }
}
async function loadChoices(businessUnit: TourBusinessUnit | null) {
  if (businessUnit === choicesUnit) return;
  choicesUnit = businessUnit;
  const generation = ++choicesGeneration;
  operators.value = [];
  if (!businessUnit) return;
  try {
    const result = await tourService.operators(businessUnit);
    if (generation !== choicesGeneration) return;
    operators.value = result;
    const current = props.tour;
    if (current) {
      if (!operators.value.some((item) => item.id === current.operatorId))
        operators.value.push({ id: current.operatorId, name: current.operatorName });
    } else if (
      isManual.value &&
      !form.collectCoordinatorId &&
      operators.value.some((item) => item.id === user.userInfo.userId)
    ) {
      form.collectCoordinatorId = user.userInfo.userId ?? "";
    }
  } catch (error) {
    if (generation !== choicesGeneration) return;
    choicesUnit = undefined;
    fail(error);
  }
}
function resetCreateForm() {
  sourcesGeneration++;
  sources.value = [];
  sourcesLoading.value = false;
  const manual = createMode.value === "manual";
  Object.assign(form, emptyTourForm(), { scheduleMode: manual ? "manual" : "flight" });
  if (manual) {
    const scope = user.userInfo.scope;
    if (scope && scope !== "headquarters") form.businessUnit = scope;
    if (!canAssignCollector.value) form.collectCoordinatorId = user.userInfo.userId ?? "";
    void loadChoices(unit.value);
  } else {
    void loadChoices(null);
    void loadSources();
  }
}
function onOpen() {
  flightSession.value++;
  flightOptions.pickup.clear();
  flightOptions.drop.clear();
  choicesUnit = undefined;
  guideServerErrors.value = {};
  showGuideIncomplete.value = false;
  const current = props.tour;
  if (current) {
    Object.assign(form, tourFormFromRecord(current));
    void loadChoices(current.businessUnit);
    return;
  }
  createMode.value = "manual";
  sourceModule.value = ["linxi", "website"].includes(user.userInfo.scope ?? "") ? "website" : "standard";
  resetCreateForm();
}

// 新建时业务随来源或手选业务确定；业务变化后计调、航班和导游都需重新选择。
watch(unit, (value, previous) => {
  flightOptions.pickup.clear();
  flightOptions.drop.clear();
  if (props.tour || !visible.value || value === previous) return;
  form.agencyId = "";
  form.operatorId = "";
  form.pickupFlightId = "";
  form.dropFlightId = "";
  form.guideServices = [];
  if (canAssignCollector.value) form.collectCoordinatorId = "";
  void loadChoices(value);
});
async function save() {
  if (saving.value) return;
  validating.value = true;
  try {
    const valid = await formRef.value?.validate().then(
      () => true,
      () => false,
    );
    if (!valid) return;
    guideServerErrors.value = {};
    if (guideServiceErrors(form.guideServices).some(Boolean)) {
      showGuideIncomplete.value = true;
      ElMessage.warning(t("tour.guideService.fixBeforeSave"));
      return;
    }
    if (guideEditorRef.value?.hasUnavailable()) {
      ElMessage.warning(t("tour.guideUnavailable"));
      return;
    }
    const current = props.tour;
    const body = current
      ? null
      : isManual.value
        ? createTourRequest(form, { sourceModule: "manual" })
        : source.value
          ? createTourRequest(form, {
            sourceModule: sourceModule.value,
            inquiryId: source.value.inquiryId,
            quoteId: source.value.quoteId,
          })
          : null;
    if (!current && !body) return;
    requesting.value = true;
    validating.value = false;
    if (current) await tourService.update(current.id, updateTourRequest(current, form));
    else if (body) await tourService.create(body);
    ElMessage.success(t(current ? "common.updateSuccess" : "common.createSuccess"));
    visible.value = false;
    emit("saved");
  } catch (error) {
    // 冲突（如已评分换导游、版本变化）保留表单内容，由用户调整后重试。
    markGuideServiceError(error);
    fail(error);
  } finally {
    validating.value = false;
    requesting.value = false;
  }
}
/** 服务端按 serviceIndex 定位到具体段（索引对应提交数组顺序，即当前表单行顺序）。 */
function markGuideServiceError(error: unknown) {
  if (!isApiError(error)) return;
  const index = error.details?.serviceIndex;
  if (typeof index !== "number") return;
  const row = form.guideServices[index];
  if (row) guideServerErrors.value = { [row.key]: error.message };
}
// 在控件挂载前回填；重建表单以隔离旧校验状态及关闭动画期间残留的控件。
watch(visible, (opened) => {
  if (!opened) return;
  onOpen();
  formSession.value++;
}, { immediate: true });
</script>
