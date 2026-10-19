<template>
  <AppDialog
    v-model="visible"
    :title="$t(tour ? 'tour.edit' : 'tour.create')"
    size="lg"
    :busy="saving"
    destroy-on-close
    @open="onOpen"
  >
    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
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
          <el-descriptions-item :label="$t('inquiry.countryOrRegion')">
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
          class="mb-[16px]"
        />
        <el-alert
          v-if="!source.startDate"
          type="warning"
          :closable="false"
          :title="$t('tour.noStartDate')"
          class="mb-[16px]"
        />
        <el-alert
          v-if="!source.countryCode"
          type="warning"
          :closable="false"
          :title="$t('tour.noCountry')"
          class="mb-[16px]"
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
            <el-form-item :label="$t('inquiry.countryOrRegion')" prop="countryItemId">
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
            <el-form-item :label="$t('tour.agency')" prop="agencyName">
              <el-input v-model.trim="form.agencyName" maxlength="200" />
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
              />
            </el-form-item>
          </el-col>
        </el-row>
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
      </template>

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
      <el-row :gutter="12">
        <el-col :xs="24" :sm="8">
          <el-form-item :label="$t('tour.adults')" prop="adults">
            <el-input-number
              v-model="form.adults"
              :min="0"
              :max="10000"
              :step="1"
              step-strictly
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
            />
          </el-form-item>
        </el-col>
      </el-row>
      <el-form-item :label="$t('tour.totalPeople')">
        {{ (form.adults ?? 0) + (form.children ?? 0) + (form.leaders ?? 0) }}
      </el-form-item>
      <el-row :gutter="12">
        <el-col :xs="24" :sm="12">
          <el-form-item :label="$t('tour.language')">
            <el-input v-model.trim="form.language" maxlength="100" />
          </el-form-item>
        </el-col>
        <el-col :xs="24" :sm="12">
          <el-form-item :label="$t('tour.shopping')">
            <el-switch v-model="form.shopping" />
          </el-form-item>
        </el-col>
      </el-row>
      <el-form-item v-if="isManual" :label="$t('tour.scheduleModeLabel')">
        <el-radio-group v-model="form.scheduleMode">
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
          <el-select
            v-model="form.pickupFlightId"
            autocomplete="new-password"
            filterable
            class="w-full"
          >
            <el-option
              v-for="item in flights"
              :key="item.id"
              :value="item.id"
              :label="flightLabel(item)"
            />
          </el-select>
        </el-form-item>
        <el-form-item :label="$t('tour.dropFlight')" prop="dropFlightId">
          <el-select
            v-model="form.dropFlightId"
            autocomplete="new-password"
            filterable
            class="w-full"
          >
            <el-option
              v-for="item in flights"
              :key="item.id"
              :value="item.id"
              :label="flightLabel(item)"
            />
          </el-select>
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
      <el-form-item :label="$t('tour.guide')">
        <el-select
          v-model="form.guideId"
          autocomplete="new-password"
          clearable
          filterable
          :placeholder="$t('tour.unassigned')"
          class="w-full"
        >
          <el-option
            v-for="item in guides"
            :key="item.id"
            :value="item.id"
            :label="guideLabel(item)"
          />
          <el-option
            v-if="form.guideId && !guides.some((item) => item.id === form.guideId)"
            :value="form.guideId"
            :label="guideLabels[form.guideId] ?? form.guideId"
          />
        </el-select>
      </el-form-item>
      <el-alert
        v-if="guideUnavailable"
        type="warning"
        :closable="false"
        :title="$t('tour.guideUnavailable')"
        class="mb-[16px]"
      />
      <el-form-item :label="$t('common.remark')">
        <el-input
          v-model.trim="form.remark"
          type="textarea"
          :rows="3"
          maxlength="2000"
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
        {{ $t("common.confirm") }}
      </el-button>
    </template>
  </AppDialog>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";
import { ElMessage, type FormInstance, type FormRules } from "element-plus";
import { useI18n } from "vue-i18n";
import AppDialog from "@/components/AppDialog/index.vue";
import BusinessItemSelect from "@/components/BusinessItemSelect/index.vue";
import { ROLE_ROOT } from "@/constants";
import { businessUnitName } from "@/constants/identity";
import { tourService } from "@/services/tour.service";
import { useUserStore } from "@/stores/user";
import type {
  TourBusinessUnit,
  TourFlightOption,
  TourGuideOption,
  TourLinkedSourceModule,
  TourRecord,
  TourSource,
} from "@/types/tour";
import {
  createTourRequest,
  emptyTourForm,
  guideQuery,
  isGuideUnavailable,
  manualScheduleError,
  tourFormFromRecord,
  updateTourRequest,
  type TourCreateMode,
} from "../tour-form";

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
const validating = ref(false);
const requesting = ref(false);
const saving = computed(() => validating.value || requesting.value);
const createMode = ref<TourCreateMode>("manual");
const sourceModule = ref<TourLinkedSourceModule>("standard");
const sources = ref<TourSource[]>([]);
const operators = ref<Array<{ id: string; name: string }>>([]);
const flights = ref<TourFlightOption[]>([]);
const guides = ref<TourGuideOption[]>([]);
/** 候选或团快照中出现过的导游名称，供候选缺失时展示已选导游。 */
const guideLabels = ref<Record<string, string>>({});
const guidesReady = ref(false);
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
// 手工团使用表单内日期/天数；关联团沿用来源或原团日期。
const period = computed(() => {
  if (isManual.value) return { businessUnit: unit.value, startDate: form.startDate, days: form.days };
  const origin = props.tour ?? source.value;
  return { businessUnit: unit.value, startDate: origin?.startDate ?? null, days: origin?.days ?? null };
});
const currentGuideQuery = computed(() => guideQuery(period.value, form, props.tour?.id));
const guideUnavailable = computed(
  () => guidesReady.value && isGuideUnavailable(form, guides.value, props.tour),
);
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
  agencyName: [inputRule.value],
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
      validator: (_rule: unknown, _value: unknown, callback: (error?: Error) => void) =>
        manualScheduleError(form.startDate, form.pickupAt, "") === "pickupDate"
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

function flightLabel(item: TourFlightOption) {
  const name = (zh: string, en: string) => (locale.value === "en" ? en : zh);
  return `${item.flightNumber} ${name(item.departureName, item.departureEnglishName)} ${item.departureTime} → ${name(item.arrivalName, item.arrivalEnglishName)} ${item.arrivalTime}`;
}
function guideLabel(item: { name: string; code: string | null; language?: string | null }) {
  const base = item.code ? `${item.name} (${item.code})` : item.name;
  return item.language ? `${base} · ${item.language}` : base;
}
function fail(error: unknown) {
  ElMessage.error(error instanceof Error ? error.message : String(error));
}

let sourcesGeneration = 0;
let choicesGeneration = 0;
let choicesUnit: TourBusinessUnit | null | undefined;
let guidesGeneration = 0;
let guidesKey: string | undefined;

async function loadSources(keyword = "") {
  const generation = ++sourcesGeneration;
  try {
    const selected = source.value;
    const result = await tourService.sources(sourceModule.value, keyword);
    if (generation !== sourcesGeneration) return;
    sources.value = selected && !result.some((item) => item.inquiryId === selected.inquiryId)
      ? [selected, ...result] : result;
  } catch (error) {
    fail(error);
  }
}
async function loadChoices(businessUnit: TourBusinessUnit | null) {
  if (businessUnit === choicesUnit) return;
  choicesUnit = businessUnit;
  const generation = ++choicesGeneration;
  operators.value = [];
  flights.value = [];
  if (!businessUnit) return;
  try {
    const result = await Promise.all([
      tourService.operators(businessUnit),
      tourService.flights(businessUnit),
    ]);
    if (generation !== choicesGeneration) return;
    [operators.value, flights.value] = result;
    const current = props.tour;
    if (current) {
      // 只为实际存在的航班快照补选项；手填时间的团没有航班。
      for (const [id, snapshot] of [[current.pickupFlightId, current.pickupFlight], [current.dropFlightId, current.dropFlight]] as const) {
        if (!id || !snapshot) continue;
        const booked = { id, flightNumber: snapshot.flightNumber, departureTime: snapshot.departureTime,
          arrivalTime: snapshot.arrivalTime, departureCode: snapshot.departureAirport.code,
          departureName: snapshot.departureAirport.name, departureEnglishName: snapshot.departureAirport.englishName,
          arrivalCode: snapshot.arrivalAirport.code, arrivalName: snapshot.arrivalAirport.name,
          arrivalEnglishName: snapshot.arrivalAirport.englishName };
        const index = flights.value.findIndex((item) => item.id === id);
        if (index < 0) flights.value.push(booked); else flights.value.splice(index, 1, booked);
      }
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
/** 查询条件变化后刷新候选；失败或候选缺失都不清空已选导游。 */
async function loadGuides() {
  const query = currentGuideQuery.value;
  const key = JSON.stringify(query);
  if (key === guidesKey) return;
  guidesKey = key;
  const generation = ++guidesGeneration;
  guidesReady.value = false;
  guides.value = [];
  if (!query) return;
  try {
    const result = await tourService.availableGuides(query);
    if (generation !== guidesGeneration) return;
    guides.value = result;
    for (const item of result) guideLabels.value[item.id] = guideLabel(item);
    guidesReady.value = true;
  } catch (error) {
    if (generation !== guidesGeneration) return;
    guidesKey = undefined;
    fail(error);
  }
}

function resetCreateForm() {
  sourcesGeneration++;
  sources.value = [];
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
  choicesUnit = undefined;
  guidesKey = undefined;
  guideLabels.value = {};
  guides.value = [];
  guidesReady.value = false;
  const current = props.tour;
  if (current) {
    Object.assign(form, tourFormFromRecord(current));
    if (current.guideId && current.guideName)
      guideLabels.value[current.guideId] = guideLabel({ name: current.guideName, code: current.guideCode });
    void loadChoices(current.businessUnit);
    void loadGuides();
    return;
  }
  createMode.value = "manual";
  sourceModule.value = ["linxi", "website"].includes(user.userInfo.scope ?? "") ? "website" : "standard";
  resetCreateForm();
}

// 新建时业务随来源或手选业务确定；业务变化后计调、航班和导游都需重新选择。
watch(unit, (value, previous) => {
  if (props.tour || !visible.value || value === previous) return;
  form.operatorId = "";
  form.pickupFlightId = "";
  form.dropFlightId = "";
  form.guideId = null;
  if (canAssignCollector.value) form.collectCoordinatorId = "";
  void loadChoices(value);
});
// 日期、天数、接送方式或时间变化后按新值查询，旧响应由 generation 丢弃。
watch(
  () => JSON.stringify(currentGuideQuery.value),
  () => {
    if (visible.value) void loadGuides();
  },
);

async function save() {
  if (saving.value) return;
  validating.value = true;
  try {
    const valid = await formRef.value?.validate().then(
      () => true,
      () => false,
    );
    if (!valid) return;
    if (guideUnavailable.value) {
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
    fail(error);
  } finally {
    validating.value = false;
    requesting.value = false;
  }
}
</script>
