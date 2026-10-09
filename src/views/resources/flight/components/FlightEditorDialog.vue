<template>
  <el-dialog
    v-model="isVisible"
    :title="$t(isEditing ? 'flight.editTitle' : 'flight.createTitle')"
    width="560px"
    :show-close="!isSubmitting"
    :close-on-click-modal="!isSubmitting"
    :close-on-press-escape="!isSubmitting"
    destroy-on-close
    @closed="formRef?.clearValidate()"
  >
    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      :disabled="isSubmitting"
      label-width="auto"
    >
      <el-form-item
        v-if="isHeadquarters && !isEditing"
        :label="$t('identity.businessUnit')"
        prop="library"
      >
        <el-select
          v-model="selectedBusinessUnit"
          :placeholder="$t('identity.selectBusinessUnitToCreate')"
          @change="setBusinessUnit"
        >
          <el-option
            v-for="unit in ['shengxu', 'linxi', 'website']"
            :key="unit"
            :value="unit"
            :label="businessUnitName(unit)"
          />
        </el-select>
      </el-form-item>
      <el-form-item v-else :label="$t('identity.library')">
        <ResourceLibraryTag :library="form.library" />
      </el-form-item>
      <el-form-item :label="$t('flight.departureAirport')" prop="departureAirportId">
        <BusinessItemSelect
          :model-value="form.departureAirportId ?? ''"
          type-code="city-airport"
          :selected-label="form.departureAirport?.name"
          @update:model-value="form.departureAirportId = $event"
        />
      </el-form-item>
      <el-form-item :label="$t('flight.arrivalAirport')" prop="arrivalAirportId">
        <BusinessItemSelect
          :model-value="form.arrivalAirportId ?? ''"
          type-code="city-airport"
          :selected-label="form.arrivalAirport?.name"
          @update:model-value="form.arrivalAirportId = $event"
        />
      </el-form-item>
      <el-form-item :label="$t('flight.flightNumber')" prop="flightNumber">
        <el-input v-model.trim="form.flightNumber" maxlength="20" />
      </el-form-item>
      <el-form-item :label="$t('flight.departureTime')" prop="departureTime">
        <el-time-picker
          v-model="form.departureTime"
          format="HH:mm"
          value-format="HH:mm"
          :placeholder="$t('flight.selectTime')"
          class="!w-full"
        />
      </el-form-item>
      <el-form-item :label="$t('flight.arrivalTime')" prop="arrivalTime">
        <el-time-picker
          v-model="form.arrivalTime"
          format="HH:mm"
          value-format="HH:mm"
          :placeholder="$t('flight.selectTime')"
          class="!w-full"
        />
      </el-form-item>
      <el-form-item :label="$t('common.status')">
        <el-radio-group v-model="form.status">
          <el-radio value="enabled">
            {{ $t("common.enabled") }}
          </el-radio>
          <el-radio value="disabled">
            {{ $t("common.disabled") }}
          </el-radio>
        </el-radio-group>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button :disabled="isSubmitting" @click="isVisible = false">
        {{ $t("common.cancel") }}
      </el-button>
      <el-button
        type="primary"
        :loading="isSaving"
        :disabled="isSubmitting"
        @click="handleSubmit"
      >
        {{ $t("common.confirm") }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";
import type { FormInstance, FormRules } from "element-plus";
import { useI18n } from "vue-i18n";
import BusinessItemSelect from "@/components/BusinessItemSelect/index.vue";
import ResourceLibraryTag from "@/components/ResourceLibraryTag.vue";
import { businessUnitName } from "@/constants/identity";
import { useUserStore } from "@/stores/user";
import type { LoginScope } from "@/types/auth";
import type { FlightRecord } from "@/types/resource";
import { useResourceFormSubmit } from "../../useResourceFormSubmit";

const props = defineProps<{
  modelValue: boolean;
  record: FlightRecord;
  isEditing: boolean;
  submit: (record: FlightRecord) => Promise<void>;
}>();
const emit = defineEmits<{ "update:modelValue": [value: boolean] }>();
const { t } = useI18n();
const userStore = useUserStore();
const isHeadquarters = computed(() => userStore.userInfo.scope === "headquarters");
const selectedBusinessUnit = ref<Exclude<LoginScope, "headquarters"> | "">("");
const formRef = ref<FormInstance>();
const form = reactive<FlightRecord>({ ...props.record });
const { isSubmitting, isSaving, submitForm } = useResourceFormSubmit(formRef);
const isVisible = computed({
  get: () => props.modelValue,
  set: (value) => emit("update:modelValue", value),
});
const rules = computed<FormRules<FlightRecord>>(() => ({
  library: [
    { required: true, message: t("identity.selectBusinessUnitToCreate"), trigger: "change" },
  ],
  departureAirportId: [
    { required: true, message: t("resource.fieldRequired", { field: t("flight.departureAirport") }), trigger: "change" },
  ],
  arrivalAirportId: [
    { required: true, message: t("resource.fieldRequired", { field: t("flight.arrivalAirport") }), trigger: "change" },
  ],
  flightNumber: [
    { required: true, message: t("resource.fieldRequired", { field: t("flight.flightNumber") }), trigger: "blur" },
    { pattern: /^[a-zA-Z0-9]{1,20}$/, message: t("flight.flightNumberInvalid"), trigger: "blur" },
  ],
  departureTime: [
    { required: true, message: t("resource.fieldRequired", { field: t("flight.departureTime") }), trigger: "change" },
    { pattern: /^([01][0-9]|2[0-3]):[0-5][0-9]$/, message: t("flight.timeInvalid"), trigger: "change" },
  ],
  arrivalTime: [
    { required: true, message: t("resource.fieldRequired", { field: t("flight.arrivalTime") }), trigger: "change" },
    { pattern: /^([01][0-9]|2[0-3]):[0-5][0-9]$/, message: t("flight.timeInvalid"), trigger: "change" },
  ],
}));

watch(
  () => props.modelValue,
  (visible) => {
    if (!visible) return;
    Object.assign(form, props.record);
    if (isHeadquarters.value && !props.isEditing) {
      selectedBusinessUnit.value = "";
      form.library = undefined;
    }
  },
);

function setBusinessUnit(unit: Exclude<LoginScope, "headquarters">) {
  form.library = unit === "shengxu" ? "shengxu" : "shared";
  formRef.value?.validateField("library");
}

async function handleSubmit() {
  await submitForm(() => props.submit({ ...form, flightNumber: form.flightNumber.toUpperCase() }));
}
</script>
