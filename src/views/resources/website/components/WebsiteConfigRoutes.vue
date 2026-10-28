<template>
  <section class="flex flex-col gap-[12px] h-full min-h-0">
    <TableToolbar :refreshable="false">
      <el-button
        v-if="editable"
        type="primary"
        @click="openEditor()"
      >
        {{ $t("common.create") }}
      </el-button>
      <span class="text-muted text-[13px]">
        {{ $t("websiteConfig.routes.help") }}
      </span>
    </TableToolbar>
    <DataTable
      fill
      :data="rows"
      row-key="id"
      :empty-text="$t('websiteConfig.routes.empty')"
    >
      <el-table-column prop="nameZh" :label="$t('websiteConfig.routes.nameZh')" min-width="160" />
      <el-table-column prop="nameEn" :label="$t('websiteConfig.routes.nameEn')" min-width="180" />
      <el-table-column :label="$t('websiteConfig.routes.fromCity')" min-width="120">
        <template #default="{ row }">
          {{ labels[row.fromCityId] ?? row.fromCityId }}
        </template>
      </el-table-column>
      <el-table-column :label="$t('websiteConfig.routes.toCity')" min-width="120">
        <template #default="{ row }">
          {{ labels[row.toCityId] ?? row.toCityId }}
        </template>
      </el-table-column>
      <el-table-column :label="$t('websiteConfig.routes.transport')" min-width="120">
        <template #default="{ row }">
          {{ getOptionLabel(TRANSPORT_OPTIONS, row.mode) }}
        </template>
      </el-table-column>
      <el-table-column :label="$t('websiteReport.vehicleType')" min-width="110">
        <template #default="{ row }">
          {{ row.vehicleOptions.length ? row.vehicleOptions.map((option: WebsiteRouteVehicleOption) => `${getOptionLabel(VEHICLE_OPTIONS, option.vehicleType)} · ${option.durationMinutes == null ? $t('websiteReport.notSpecified') : $t('websiteReport.minutesValue', { value: option.durationMinutes })}`).join(' / ') : $t('websiteReport.notSpecified') }}
        </template>
      </el-table-column>
      <el-table-column prop="distanceKm" :label="$t('websiteReport.distanceKm')" min-width="110" />
      <el-table-column prop="durationMinutes" :label="$t('websiteReport.durationMinutes')" min-width="120" />
      <el-table-column :label="$t('websiteConfig.routes.feeState')" min-width="160">
        <template #default="{ row }">
          {{ getOptionLabel(FEE_OPTIONS, row.feeState) }}
        </template>
      </el-table-column>
      <el-table-column :label="$t('common.status')" width="100" align="center">
        <template #default="{ row }">
          <el-tag :type="row.status === 'enabled' ? 'success' : 'info'">
            {{ row.status === "enabled" ? $t("common.enabled") : $t("websiteConfig.disabled") }}
          </el-tag>
        </template>
      </el-table-column>
      <!-- @vue-generic {WebsiteRoute} -->
      <el-table-column
        :label="$t('common.actions')"
        width="150"
        align="center"
        fixed="right"
        :show-overflow-tooltip="false"
      >
        <template #default="{ row }">
          <RowActions>
            <el-button type="primary" link @click="openEditor(row)">
              {{ editable ? $t("common.edit") : $t("common.view") }}
            </el-button>
            <el-button
              v-if="editable"
              type="danger"
              link
              @click="props.deleteRecord(row.id)"
            >
              {{ $t("common.delete") }}
            </el-button>
          </RowActions>
        </template>
      </el-table-column>
    </DataTable>
    <AppDialog
      v-model="visible"
      :title="
        isNew
          ? $t('websiteConfig.routes.create')
          : editable
            ? $t('websiteConfig.routes.edit')
            : $t('websiteConfig.routes.detail')
      "
      size="lg"
      :busy="saving || isSubmitting"
      destroy-on-close
    >
      <el-form
        v-if="record"
        ref="formRef"
        :model="record"
        :rules="rules"
        :disabled="!editable || saving || isSubmitting"
        label-width="auto"
      >
        <div class="grid grid-cols-2 gap-x-[20px] max-[650px]:grid-cols-1">
          <el-form-item :label="$t('websiteConfig.routes.fromCity')" prop="fromCityId">
            <WebsiteConfigSelect
              v-model="record.fromCityId"
              group="cities"
              :version="version"
              :business-unit="businessUnit"
              :labels="labels"
              @labels="Object.assign(labels, $event)"
            />
          </el-form-item>
          <el-form-item :label="$t('websiteConfig.routes.toCity')" prop="toCityId">
            <WebsiteConfigSelect
              v-model="record.toCityId"
              group="cities"
              :version="version"
              :business-unit="businessUnit"
              :labels="labels"
              @labels="Object.assign(labels, $event)"
            />
          </el-form-item>
          <el-form-item :label="$t('websiteConfig.routes.nameZh')" prop="nameZh">
            <el-input v-model="record.nameZh" maxlength="150" />
          </el-form-item>
          <el-form-item :label="$t('websiteConfig.routes.nameEn')" prop="nameEn">
            <el-input v-model="record.nameEn" maxlength="150" />
          </el-form-item>
          <el-form-item :label="$t('websiteConfig.routes.transport')">
            <el-select v-model="record.mode" autocomplete="new-password">
              <el-option
                v-for="option in TRANSPORT_OPTIONS"
                :key="option.value"
                :value="option.value"
                :label="$t(option.labelKey)"
              />
            </el-select>
          </el-form-item>
          <el-form-item :label="$t('websiteConfig.routes.feeState')">
            <FeeStateSelect v-model="record.feeState" />
          </el-form-item>
          <template v-if="record.mode === 'private_vehicle'">
            <template v-for="(option, index) in record.vehicleOptions" :key="index">
              <el-form-item :label="$t('websiteReport.vehicleType')">
                <el-select
                  v-model="option.vehicleType"
                  filterable
                  allow-create
                  default-first-option
                  clearable
                  :value-on-clear="''"
                  autocomplete="new-password"
                  :maxlength="100"
                  :placeholder="$t('websiteReport.vehicleSelectOrEnter')"
                  :aria-label="$t('websiteReport.vehicleType')"
                  @change="formRef?.validateField('vehicleOptions').catch(() => undefined)"
                >
                  <el-option
                    v-for="vehicle in VEHICLE_OPTIONS"
                    :key="vehicle.value"
                    :value="vehicle.value"
                    :label="$t(vehicle.labelKey)"
                  />
                </el-select>
              </el-form-item>
              <el-form-item :label="$t('websiteReport.durationMinutes')">
                <div class="flex w-full min-w-0 items-center gap-[8px]">
                  <el-input-number
                    v-model="option.durationMinutes"
                    class="!w-full min-w-0"
                    :min="1"
                    :max="525600"
                    :precision="0"
                    :placeholder="$t('websiteReport.notSpecified')"
                    :aria-label="$t('websiteReport.durationMinutes')"
                    @update:model-value="option.durationMinutes = $event ?? null"
                    @change="formRef?.validateField('vehicleOptions').catch(() => undefined)"
                  />
                  <el-button type="danger" link @click="record.vehicleOptions.splice(index, 1)">
                    {{ $t('common.delete') }}
                  </el-button>
                </div>
              </el-form-item>
            </template>
            <el-form-item prop="vehicleOptions" class="col-span-2 max-[650px]:col-span-1">
              <template #label>
                <span :class="{ invisible: record.vehicleOptions.length > 0 }" :aria-hidden="record.vehicleOptions.length > 0">
                  {{ $t('websiteReport.vehicleType') }}
                </span>
              </template>
              <el-button :disabled="record.vehicleOptions.length >= 100" @click="record.vehicleOptions.push({ vehicleType: '', durationMinutes: null })">
                {{ $t('common.create') }}
              </el-button>
            </el-form-item>
          </template>
          <WebsiteTransportFields
            v-model="record"
            :mode="record.mode"
            :show-vehicle="false"
            :show-mileage="false"
            :show-duration="record.mode !== 'private_vehicle'"
          />
          <el-form-item :label="$t('common.status')">
            <el-radio-group v-model="record.status">
              <el-radio value="enabled">
                {{ $t("common.enabled") }}
              </el-radio>
              <el-radio value="disabled">
                {{ $t("websiteConfig.disabled") }}
              </el-radio>
            </el-radio-group>
          </el-form-item>
        </div>
      </el-form>
      <template #footer>
        <el-button :disabled="saving || isSubmitting" @click="visible = false">
          {{ editable ? $t("common.cancel") : $t("common.close") }}
        </el-button>
        <el-button
          v-if="editable"
          type="primary"
          :loading="saving || isSaving"
          :disabled="isSubmitting"
          @click="applyEdit"
        >
          {{ $t("common.confirm") }}
        </el-button>
      </template>
    </AppDialog>
  </section>
</template>

<script setup lang="ts">
import AppDialog from "@/components/AppDialog/index.vue";
import DataTable from "@/components/DataTable/index.vue";
import RowActions from "@/components/RowActions/index.vue";
import TableToolbar from "@/components/TableToolbar/index.vue";
import { reactive, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import type { FormInstance } from "element-plus";
import type { WebsiteConfigEditorProps, WebsiteRoute, WebsiteRouteVehicleOption } from "@/types/website";
import {
  cloneWebsiteDraft,
  FEE_OPTIONS,
  TRANSPORT_OPTIONS,
  VEHICLE_OPTIONS,
} from "@/views/website-inquiries/options";
import WebsiteTransportFields from "@/views/website-inquiries/itineraries/components/WebsiteTransportFields.vue";
import FeeStateSelect from "@/views/website-inquiries/components/FeeStateSelect.vue";
import { useWebsiteRouteRules } from "../useWebsiteConfigRules";
import WebsiteConfigSelect from "./WebsiteConfigSelect.vue";
import { useResourceFormSubmit } from "../../useResourceFormSubmit";

const props = defineProps<WebsiteConfigEditorProps & { rows: WebsiteRoute[] }>();
const labels = reactive<Record<string, string>>({});
watch(() => props.references, (value) => Object.assign(labels, value), { immediate: true });
const visible = ref(false);
const isNew = ref(false);
const record = ref<WebsiteRoute>();
const formRef = ref<FormInstance>();
const { isSubmitting, isSaving, submitForm } = useResourceFormSubmit(formRef);
const rules = useWebsiteRouteRules();
watch(() => record.value?.mode, (mode) => {
  if (!record.value) return;
  if (mode !== "private_vehicle") record.value.vehicleOptions = [];
  else record.value.durationMinutes = null;
});
const { t } = useI18n();

function getOptionLabel(options: Array<{ value: string; labelKey: string }>, value: string) {
  const labelKey = options.find((option) => option.value === value)?.labelKey;
  return labelKey ? t(labelKey) : value;
}

function openEditor(route?: WebsiteRoute) {
  isNew.value = !route;
  record.value = route
    ? cloneWebsiteDraft(route)
    : {
      id: crypto.randomUUID(),
      status: "enabled",
      fromCityId: "",
      toCityId: "",
      mode: "private_vehicle",
      nameZh: "",
      nameEn: "",
      feeState: "INCLUDED",
      vehicleOptions: [], distanceKm: null, durationMinutes: null,
    };
  visible.value = true;
}

async function applyEdit() {
  if (!record.value || !props.editable || props.saving) return;
  await submitForm(async () => {
    if (!record.value || !props.editable || props.saving) return;
    const result = cloneWebsiteDraft(record.value);
    if (await props.saveRecord(result, isNew.value)) visible.value = false;
  });
}
</script>
