<template>
  <section class="grid [grid-template-rows:auto_minmax(0,_1fr)] h-full min-h-0">
    <div class="page-toolbar">
      <div class="page-toolbar__left">
        <el-button
          v-if="editable"
          type="primary"
          :disabled="config.cities.length < 2"
          @click="openEditor()"
        >
          {{ $t("websiteConfig.routes.create") }}
        </el-button>
        <span class="text-[var(--el-text-color-secondary)] text-[13px]">
          {{ $t("websiteConfig.routes.help") }}
        </span>
      </div>
    </div>
    <div class="page-table-wrapper">
      <el-table
        :data="config.routes"
        border
        height="100%"
        :empty-text="$t('websiteConfig.routes.empty')"
      >
        <el-table-column prop="nameZh" :label="$t('websiteConfig.routes.nameZh')" min-width="160" />
        <el-table-column prop="nameEn" :label="$t('websiteConfig.routes.nameEn')" min-width="180" />
        <el-table-column :label="$t('websiteConfig.routes.fromCity')" min-width="120">
          <template #default="{ row }">
            {{ config.cities.find((city) => city.id === row.fromCityId)?.nameZh ?? row.fromCityId }}
          </template>
        </el-table-column>
        <el-table-column :label="$t('websiteConfig.routes.toCity')" min-width="120">
          <template #default="{ row }">
            {{ config.cities.find((city) => city.id === row.toCityId)?.nameZh ?? row.toCityId }}
          </template>
        </el-table-column>
        <el-table-column :label="$t('websiteConfig.routes.transport')" min-width="120">
          <template #default="{ row }">
            {{ getOptionLabel(TRANSPORT_OPTIONS, row.mode) }}
          </template>
        </el-table-column>
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
        >
          <template #default="{ row, $index }">
            <el-button type="primary" link @click="openEditor(row)">
              {{ editable ? $t("common.edit") : $t("common.view") }}
            </el-button>
            <el-button
              v-if="editable"
              type="danger"
              link
              @click="deleteRecord($index)"
            >
              {{ $t("common.delete") }}
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>
    <el-dialog
      v-model="visible"
      :title="
        isNew
          ? $t('websiteConfig.routes.create')
          : editable
            ? $t('websiteConfig.routes.edit')
            : $t('websiteConfig.routes.detail')
      "
      width="min(800px, 94vw)"
      destroy-on-close
      :show-close="!saving && !isSubmitting"
      :close-on-click-modal="!saving && !isSubmitting"
      :close-on-press-escape="!saving && !isSubmitting"
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
            <el-select v-model="record.fromCityId" filterable>
              <el-option
                v-for="city in config.cities"
                :key="city.id"
                :value="city.id"
                :label="city.nameZh"
              />
            </el-select>
          </el-form-item>
          <el-form-item :label="$t('websiteConfig.routes.toCity')" prop="toCityId">
            <el-select v-model="record.toCityId" filterable>
              <el-option
                v-for="city in config.cities"
                :key="city.id"
                :value="city.id"
                :label="city.nameZh"
              />
            </el-select>
          </el-form-item>
          <el-form-item :label="$t('websiteConfig.routes.nameZh')" prop="nameZh">
            <el-input v-model="record.nameZh" maxlength="150" />
          </el-form-item>
          <el-form-item :label="$t('websiteConfig.routes.nameEn')" prop="nameEn">
            <el-input v-model="record.nameEn" maxlength="150" />
          </el-form-item>
          <el-form-item :label="$t('websiteConfig.routes.transport')">
            <el-select v-model="record.mode">
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
    </el-dialog>
  </section>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useI18n } from "vue-i18n";
import type { FormInstance } from "element-plus";
import type { WebsiteConfig, WebsiteRoute } from "@/types/website";
import {
  cloneWebsiteDraft,
  FEE_OPTIONS,
  TRANSPORT_OPTIONS,
} from "@/views/website-inquiries/options";
import FeeStateSelect from "@/views/website-inquiries/components/FeeStateSelect.vue";
import { useWebsiteRouteRules } from "../useWebsiteConfigRules";
import { useResourceFormSubmit } from "../../useResourceFormSubmit";

const props = defineProps<{
  config: WebsiteConfig;
  editable: boolean;
  saving: boolean;
  saveConfig: (next: WebsiteConfig) => Promise<boolean>;
  deleteConfig: (next: WebsiteConfig) => Promise<boolean>;
}>();
const visible = ref(false);
const isNew = ref(false);
const record = ref<WebsiteRoute>();
const formRef = ref<FormInstance>();
const { isSubmitting, isSaving, submitForm } = useResourceFormSubmit(formRef);
const rules = useWebsiteRouteRules(() => props.config, record);
const { t } = useI18n();

function getOptionLabel(options: Array<{ value: string; labelKey: string }>, value: string) {
  const labelKey = options.find((option) => option.value === value)?.labelKey;
  return labelKey ? t(labelKey) : "";
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
    };
  visible.value = true;
}

async function applyEdit() {
  if (!record.value || !props.editable || props.saving) return;
  await submitForm(async () => {
    if (!record.value || !props.editable || props.saving) return;
    const next = cloneWebsiteDraft(props.config);
    const result = cloneWebsiteDraft(record.value);
    const index = next.routes.findIndex((row) => row.id === result.id);
    if (index < 0) next.routes.push(result);
    else next.routes.splice(index, 1, result);
    if (await props.saveConfig(next)) visible.value = false;
  });
}

async function deleteRecord(index: number) {
  if (!props.editable || props.saving) return;
  const next = cloneWebsiteDraft(props.config);
  next.routes.splice(index, 1);
  await props.deleteConfig(next);
}
</script>
