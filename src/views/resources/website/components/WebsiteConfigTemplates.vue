<template>
  <section class="grid [grid-template-rows:auto_minmax(0,_1fr)] h-full min-h-0">
    <div class="page-toolbar">
      <div class="page-toolbar__left">
        <el-button v-if="editable" type="primary" @click="openEditor()">
          {{ $t("websiteConfig.templates.create") }}
        </el-button>
        <span class="text-[var(--el-text-color-secondary)] text-[13px]">
          {{ $t("websiteConfig.templates.help") }}
        </span>
      </div>
    </div>
    <div class="page-table-wrapper">
      <el-table
        :data="config.templates"
        border
        height="100%"
        :empty-text="$t('websiteConfig.templates.empty')"
      >
        <el-table-column
          prop="name"
          :label="$t('websiteConfig.templates.name')"
          min-width="180"
          show-overflow-tooltip
        />
        <el-table-column prop="code" :label="$t('websiteConfig.templates.code')" min-width="190" />
        <el-table-column :label="$t('websiteConfig.templates.purpose')" min-width="160">
          <template #default="{ row }">
            {{
              $t(
                SYSTEM_TEMPLATES.find((item) => item.code === row.code)?.labelKey ??
                  "websiteConfig.templates.customPurpose",
              )
            }}
          </template>
        </el-table-column>
        <el-table-column
          prop="zh"
          :label="$t('websiteConfig.templates.zh')"
          min-width="250"
          show-overflow-tooltip
        />
        <el-table-column
          prop="en"
          :label="$t('websiteConfig.templates.en')"
          min-width="250"
          show-overflow-tooltip
        />
        <el-table-column :label="$t('common.status')" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === 'enabled' ? 'success' : 'info'">
              {{ row.status === "enabled" ? $t("common.enabled") : $t("websiteConfig.disabled") }}
            </el-tag>
          </template>
        </el-table-column>
        <!-- @vue-generic {WebsiteTemplate} -->
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
          ? $t('websiteConfig.templates.create')
          : editable
            ? $t('websiteConfig.templates.edit')
            : $t('websiteConfig.templates.detail')
      "
      width="min(900px, 94vw)"
      destroy-on-close
      :show-close="!saving"
      :close-on-click-modal="!saving"
      :close-on-press-escape="!saving"
    >
      <el-form
        v-if="record"
        ref="formRef"
        :model="record"
        :rules="rules"
        :disabled="!editable || saving"
        label-width="auto"
      >
        <el-form-item :label="$t('websiteConfig.templates.name')" prop="name">
          <el-input
            v-model.trim="record.name"
            :placeholder="$t('websiteConfig.templates.namePlaceholder')"
            maxlength="150"
          />
        </el-form-item>
        <el-form-item :label="$t('websiteConfig.templates.code')" prop="code">
          <el-select
            v-model="record.code"
            filterable
            allow-create
            default-first-option
            :placeholder="$t('websiteConfig.templates.codePlaceholder')"
          >
            <el-option
              v-for="option in SYSTEM_TEMPLATES"
              :key="option.code"
              :value="option.code"
              :label="
                $t('websiteConfig.templates.purposeCode', {
                  purpose: $t(option.labelKey),
                  code: option.code,
                })
              "
            />
          </el-select>
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
        <el-alert
          :title="
            templateVariables.length
              ? $t('websiteConfig.templates.variablesHint', {
                variables: templateVariables.join($t('websiteConfig.listSeparator')),
              })
              : $t('websiteConfig.templates.noVariablesHint')
          "
          type="info"
          :closable="false"
          class="mb-[20px]"
        />
        <div class="grid grid-cols-2 gap-x-[20px] max-[650px]:grid-cols-1 mt-3">
          <el-form-item :label="$t('websiteConfig.templates.zh')" prop="zh">
            <el-input
              v-model="record.zh"
              type="textarea"
              :rows="8"
              maxlength="20000"
            />
          </el-form-item>
          <el-form-item :label="$t('websiteConfig.templates.en')" prop="en">
            <el-input
              v-model="record.en"
              type="textarea"
              :rows="8"
              maxlength="20000"
            />
          </el-form-item>
        </div>
      </el-form>
      <template #footer>
        <el-button :disabled="saving" @click="visible = false">
          {{ editable ? $t("common.cancel") : $t("common.close") }}
        </el-button>
        <el-button
          v-if="editable"
          type="primary"
          :loading="saving"
          @click="applyEdit"
        >
          {{ $t("common.confirm") }}
        </el-button>
      </template>
    </el-dialog>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import type { FormInstance } from "element-plus";
import type { WebsiteConfig, WebsiteTemplate } from "@/types/website";
import { cloneWebsiteDraft } from "@/views/website-inquiries/options";
import { getWebsiteTemplateVariables, useWebsiteTemplateRules } from "../useWebsiteConfigRules";

const props = defineProps<{
  config: WebsiteConfig;
  editable: boolean;
  saving: boolean;
  saveConfig: (next: WebsiteConfig) => Promise<boolean>;
  deleteConfig: (next: WebsiteConfig) => Promise<boolean>;
}>();
const visible = ref(false);
const isNew = ref(false);
const record = ref<WebsiteTemplate>();
const formRef = ref<FormInstance>();
const rules = useWebsiteTemplateRules(() => props.config, record);
const templateVariables = computed(() =>
  getWebsiteTemplateVariables(record.value?.code ?? "").map((variable) => `{${variable}}`),
);
const SYSTEM_TEMPLATES = [
  { code: "arrival-basic", labelKey: "websiteConfig.templates.purposes.arrival" },
  { code: "departure-basic", labelKey: "websiteConfig.templates.purposes.departure" },
  { code: "overnight", labelKey: "websiteConfig.templates.purposes.overnight" },
  { code: "guide", labelKey: "websiteConfig.templates.purposes.guide" },
  { code: "private-driver", labelKey: "websiteConfig.templates.purposes.privateDriver" },
  { code: "hsr-second-class", labelKey: "websiteConfig.templates.purposes.hsr" },
  { code: "hotel-breakfast", labelKey: "websiteConfig.templates.purposes.hotelBreakfast" },
  { code: "first-entry-ticket", labelKey: "websiteConfig.templates.purposes.firstEntryTicket" },
  { code: "included-service", labelKey: "websiteConfig.templates.purposes.includedService" },
  {
    code: "restaurant-recommendation",
    labelKey: "websiteConfig.templates.purposes.restaurantRecommendation",
  },
  {
    code: "optional-not-included",
    labelKey: "websiteConfig.templates.purposes.optionalNotIncluded",
  },
  { code: "hotel-substitution", labelKey: "websiteConfig.templates.purposes.hotelSubstitution" },
  { code: "peak-season", labelKey: "websiteConfig.templates.purposes.peakSeason" },
  { code: "no-shopping", labelKey: "websiteConfig.templates.purposes.noShopping" },
];

function openEditor(template?: WebsiteTemplate) {
  isNew.value = !template;
  record.value = template
    ? cloneWebsiteDraft(template)
    : {
      id: crypto.randomUUID(),
      status: "enabled",
      name: "",
      code: "",
      zh: "",
      en: "",
    };
  visible.value = true;
}

async function applyEdit() {
  if (!record.value || !props.editable || props.saving) return;
  if (!(await formRef.value?.validate().catch(() => false))) return;
  const next = cloneWebsiteDraft(props.config);
  const result = cloneWebsiteDraft(record.value);
  result.name = result.name.trim();
  const index = next.templates.findIndex((row) => row.id === result.id);
  if (index < 0) next.templates.push(result);
  else next.templates.splice(index, 1, result);
  if (await props.saveConfig(next)) visible.value = false;
}

async function deleteRecord(index: number) {
  if (!props.editable || props.saving) return;
  const next = cloneWebsiteDraft(props.config);
  next.templates.splice(index, 1);
  await props.deleteConfig(next);
}
</script>
