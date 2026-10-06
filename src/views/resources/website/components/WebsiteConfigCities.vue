<template>
  <section class="grid [grid-template-rows:auto_minmax(0,_1fr)] h-full min-h-0">
    <div class="page-toolbar">
      <div class="page-toolbar__left">
        <el-button v-if="editable" type="primary" @click="openEditor()">
          {{ $t("websiteConfig.cities.create") }}
        </el-button>
        <span class="text-[var(--el-text-color-secondary)] text-[13px]">
          {{ $t("websiteConfig.cities.help") }}
        </span>
      </div>
    </div>
    <div class="page-table-wrapper">
      <el-table
        :data="config.cities"
        border
        height="100%"
        :empty-text="$t('websiteConfig.cities.empty')"
      >
        <el-table-column prop="nameZh" :label="$t('websiteConfig.nameZh')" min-width="160" />
        <el-table-column prop="nameEn" :label="$t('websiteConfig.nameEn')" min-width="180" />
        <el-table-column :label="$t('websiteConfig.cities.sharedCity')" min-width="160">
          <template #default="{ row }">
            {{
              row.resourceId
                ? $t("websiteConfig.cities.linked")
                : $t("websiteConfig.cities.unlinked")
            }}
          </template>
        </el-table-column>
        <el-table-column :label="$t('common.status')" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === 'enabled' ? 'success' : 'info'">
              {{ row.status === "enabled" ? $t("common.enabled") : $t("websiteConfig.disabled") }}
            </el-tag>
          </template>
        </el-table-column>
        <!-- @vue-generic {WebsiteCity} -->
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
          ? $t('websiteConfig.cities.create')
          : editable
            ? $t('websiteConfig.cities.edit')
            : $t('websiteConfig.cities.detail')
      "
      width="560px"
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
        <el-form-item :label="$t('websiteConfig.nameZh')" prop="nameZh">
          <el-input v-model="record.nameZh" maxlength="150" />
        </el-form-item>
        <el-form-item :label="$t('websiteConfig.nameEn')" prop="nameEn">
          <el-input v-model="record.nameEn" maxlength="150" />
        </el-form-item>
        <el-form-item :label="$t('websiteConfig.cities.linkCity')">
          <WebsiteResourceSelect
            v-model="record.resourceId"
            kind="city"
            :selected-name="record.nameZh"
          />
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
import { ref } from "vue";
import type { FormInstance } from "element-plus";
import type { WebsiteCity, WebsiteConfig } from "@/types/website";
import { cloneWebsiteDraft } from "@/views/website-inquiries/options";
import WebsiteResourceSelect from "@/views/website-inquiries/components/WebsiteResourceSelect.vue";
import { useWebsiteCityRules } from "../useWebsiteConfigRules";

const props = defineProps<{
  config: WebsiteConfig;
  editable: boolean;
  saving: boolean;
  saveConfig: (next: WebsiteConfig) => Promise<boolean>;
  deleteConfig: (next: WebsiteConfig) => Promise<boolean>;
}>();
const visible = ref(false);
const isNew = ref(false);
const record = ref<WebsiteCity>();
const formRef = ref<FormInstance>();
const rules = useWebsiteCityRules();

function openEditor(city?: WebsiteCity) {
  isNew.value = !city;
  record.value = city
    ? cloneWebsiteDraft(city)
    : {
      id: crypto.randomUUID(),
      status: "enabled",
      nameZh: "",
      nameEn: "",
      resourceId: null,
    };
  visible.value = true;
}

async function applyEdit() {
  if (!record.value || !props.editable || props.saving) return;
  if (!(await formRef.value?.validate().catch(() => false))) return;
  const next = cloneWebsiteDraft(props.config);
  const result = cloneWebsiteDraft(record.value);
  const index = next.cities.findIndex((row) => row.id === result.id);
  if (index < 0) next.cities.push(result);
  else next.cities.splice(index, 1, result);
  if (await props.saveConfig(next)) visible.value = false;
}

async function deleteRecord(index: number) {
  if (!props.editable || props.saving) return;
  const next = cloneWebsiteDraft(props.config);
  next.cities.splice(index, 1);
  await props.deleteConfig(next);
}
</script>
