<template>
  <el-dialog
    v-model="visible"
    :title="$t(tour ? 'tour.edit' : 'tour.create')"
    width="min(720px, 96vw)"
    :close-on-click-modal="!saving"
    :close-on-press-escape="!saving"
    :show-close="!saving"
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
        <el-form-item v-if="showModule" :label="$t('tour.source')">
          <el-radio-group v-model="sourceModule" @change="changeModule">
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
      <el-descriptions
        v-if="source"
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
        v-if="source && !source.downloaded"
        type="warning"
        :closable="false"
        :title="$t('tour.notDownloaded')"
        class="mb-[16px]"
      />
      <el-alert
        v-if="source && !source.startDate"
        type="warning"
        :closable="false"
        :title="$t('tour.noStartDate')"
        class="mb-[16px]"
      />
      <el-alert
        v-if="source && !source.countryCode"
        type="warning"
        :closable="false"
        :title="$t('tour.noCountry')"
        class="mb-[16px]"
      />

      <el-form-item :label="$t('tour.operator')" prop="operatorId">
        <el-select v-model="form.operatorId" filterable class="w-full">
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
        {{ form.adults + form.children + form.leaders }}
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
      <el-form-item :label="$t('tour.pickupFlight')" prop="pickupFlightId">
        <el-select
          v-model="form.pickupFlightId"
          filterable
          class="w-full"
          @change="loadGuides"
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
          filterable
          class="w-full"
          @change="loadGuides"
        >
          <el-option
            v-for="item in flights"
            :key="item.id"
            :value="item.id"
            :label="flightLabel(item)"
          />
        </el-select>
      </el-form-item>
      <el-form-item :label="$t('tour.guide')">
        <el-select
          v-model="form.guideId"
          clearable
          filterable
          :placeholder="$t('tour.unassigned')"
          class="w-full"
        >
          <el-option
            v-for="item in guides"
            :key="item.id"
            :value="item.id"
            :label="`${item.name} (${item.code})`"
          />
          <el-option
            v-if="form.guideId && !guides.some((item) => item.id === form.guideId)"
            :value="form.guideId"
            :label="tour?.guideName ?? form.guideId"
          />
        </el-select>
      </el-form-item>
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
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";
import { ElMessage, type FormInstance, type FormRules } from "element-plus";
import { useI18n } from "vue-i18n";
import { tourService } from "@/services/tour.service";
import { useUserStore } from "@/stores/user";
import type {
  TourBusinessUnit,
  TourFlightOption,
  TourGuideOption,
  TourInput,
  TourRecord,
  TourSource,
  TourSourceModule,
} from "@/types/tour";

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
const sourceModule = ref<TourSourceModule>("standard");
const sources = ref<TourSource[]>([]);
const operators = ref<Array<{ id: string; name: string }>>([]);
const flights = ref<TourFlightOption[]>([]);
const guides = ref<TourGuideOption[]>([]);
const form = reactive<TourInput & { inquiryId: string }>(emptyForm());

// 来源模块由当前身份限定，总部可以切换。
const showModule = computed(() => user.userInfo.scope === "headquarters");
const source = computed(() => sources.value.find((item) => item.inquiryId === form.inquiryId));
const unit = computed<TourBusinessUnit | null>(() => {
  if (props.tour) return props.tour.businessUnit;
  return source.value?.businessUnit ?? null;
});
const rules = computed<FormRules>(() => ({
  inquiryId: [{ required: !props.tour, message: t("common.selectPlaceholder"), trigger: "change" }],
  operatorId: [{ required: true, message: t("common.selectPlaceholder"), trigger: "change" }],
  pickupFlightId: [{ required: true, message: t("common.selectPlaceholder"), trigger: "change" }],
  dropFlightId: [{ required: true, message: t("common.selectPlaceholder"), trigger: "change" }],
}));

function emptyForm(): TourInput & { inquiryId: string } {
  return {
    inquiryId: "",
    operatorId: "",
    adults: 0,
    children: 0,
    leaders: 0,
    language: "",
    shopping: false,
    pickupFlightId: "",
    dropFlightId: "",
    guideId: null,
    remark: "",
  };
}
function flightLabel(item: TourFlightOption) {
  const name = (zh: string, en: string) => (locale.value === "en" ? en : zh);
  return `${item.flightNumber} ${name(item.departureName, item.departureEnglishName)} ${item.departureTime} → ${name(item.arrivalName, item.arrivalEnglishName)} ${item.arrivalTime}`;
}
function fail(error: unknown) {
  ElMessage.error(error instanceof Error ? error.message : String(error));
}
let sourcesGeneration = 0;
let choicesGeneration = 0;
let guidesGeneration = 0;
async function changeModule() {
  Object.assign(form, emptyForm());
  sources.value = [];
  operators.value = [];
  flights.value = [];
  guides.value = [];
  choicesGeneration++;
  guidesGeneration++;
  await loadSources();
}
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
async function loadChoices(businessUnit: TourBusinessUnit) {
  const generation = ++choicesGeneration;
  try {
    const result = await Promise.all([
      tourService.operators(businessUnit),
      tourService.flights(businessUnit),
    ]);
    if (generation !== choicesGeneration) return;
    [operators.value, flights.value] = result;
    const current = props.tour;
    if (current) {
      for (const [id, snapshot] of [[current.pickupFlightId, current.pickupFlight], [current.dropFlightId, current.dropFlight]] as const) {
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
    }
  } catch (error) {
    fail(error);
  }
}
async function loadGuides() {
  const generation = ++guidesGeneration;
  guides.value = [];
  const businessUnit = unit.value;
  const startDate = props.tour?.startDate ?? source.value?.startDate;
  const days = props.tour?.days ?? source.value?.days;
  if (!businessUnit || !startDate || !days || !form.pickupFlightId || !form.dropFlightId) return;
  try {
    const result = await tourService.availableGuides({
      businessUnit,
      startDate,
      days,
      pickupFlightId: form.pickupFlightId,
      dropFlightId: form.dropFlightId,
      excludeTourId: props.tour?.id,
    });
    if (generation === guidesGeneration) guides.value = result;
  } catch (error) {
    fail(error);
  }
}
async function onOpen() {
  Object.assign(form, emptyForm());
  operators.value = [];
  flights.value = [];
  guides.value = [];
  const current = props.tour;
  if (current) {
    Object.assign(form, {
      operatorId: current.operatorId,
      adults: current.adults,
      children: current.children,
      leaders: current.leaders,
      language: current.language,
      shopping: current.shopping,
      pickupFlightId: current.pickupFlightId,
      dropFlightId: current.dropFlightId,
      guideId: current.guideId,
      remark: current.remark,
    });
    await loadChoices(current.businessUnit);
    await loadGuides();
    return;
  }
  sourceModule.value = user.userInfo.scope === "website" ? "website" : "standard";
  await loadSources();
}

// 选择询盘后才能确定业务范围，再加载计调、航班选项。
watch(
  () => form.inquiryId,
  async () => {
    if (props.tour || !unit.value) return;
    form.operatorId = "";
    form.pickupFlightId = "";
    form.dropFlightId = "";
    form.guideId = null;
    await loadChoices(unit.value);
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
    if (!props.tour && !source.value) return;
    const { inquiryId, ...input } = form;
    requesting.value = true;
    validating.value = false;
    if (props.tour) await tourService.update(props.tour.id, props.tour.version, input);
    else if (source.value)
      await tourService.create(
        { sourceModule: sourceModule.value, inquiryId, quoteId: source.value.quoteId },
        input,
      );
    ElMessage.success(t(props.tour ? "common.updateSuccess" : "common.createSuccess"));
    visible.value = false;
    emit("saved");
  } catch (error) {
    fail(error);
  } finally {
    validating.value = false;
    requesting.value = false;
  }
}
</script>
