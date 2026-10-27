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
        {{ $t("websiteConfig.attractions.help") }}
      </span>
    </TableToolbar>
    <DataTable
      fill
      :data="rows"
      row-key="id"
      :empty-text="$t('websiteConfig.attractions.empty')"
    >
      <el-table-column prop="nameZh" :label="$t('common.nameZh')" min-width="160" />
      <el-table-column prop="nameEn" :label="$t('common.nameEn')" min-width="180" />
      <el-table-column :label="$t('websiteConfig.city')" min-width="120">
        <template #default="{ row }">
          {{ labels[row.cityId] ?? row.cityId }}
        </template>
      </el-table-column>
      <el-table-column :label="$t('websiteConfig.attractions.kind')" width="110">
        <template #default="{ row }">
          {{
            row.kind === "attraction"
              ? $t("websiteConfig.attractions.attraction")
              : $t("websiteConfig.attractions.component")
          }}
        </template>
      </el-table-column>
      <el-table-column
        prop="copyKey"
        :label="$t('websiteConfig.attractions.copyKey')"
        min-width="180"
      />
      <el-table-column :label="$t('websiteConfig.attractions.recommendedMonths')" min-width="160">
        <template #default="{ row }">
          {{
            row.recommendedMonths.length
              ? $t("websiteConfig.attractions.months", {
                months: row.recommendedMonths.join($t("websiteConfig.listSeparator")),
              })
              : $t("websiteConfig.attractions.anyMonth")
          }}
        </template>
      </el-table-column>
      <el-table-column
        :label="$t('websiteConfig.attractions.chargeable')"
        width="80"
        align="center"
      >
        <template #default="{ row }">
          {{ row.chargeable ? $t("common.yes") : $t("common.no") }}
        </template>
      </el-table-column>
      <el-table-column :label="$t('common.status')" width="100" align="center">
        <template #default="{ row }">
          <el-tag :type="row.status === 'enabled' ? 'success' : 'info'">
            {{ row.status === "enabled" ? $t("common.enabled") : $t("websiteConfig.disabled") }}
          </el-tag>
        </template>
      </el-table-column>
      <!-- @vue-generic {WebsiteAttraction} -->
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
          ? $t('websiteConfig.attractions.create')
          : editable
            ? $t('websiteConfig.attractions.edit')
            : $t('websiteConfig.attractions.detail')
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
          <el-form-item :label="$t('websiteConfig.belongsToCity')" prop="cityId">
            <WebsiteConfigSelect
              v-model="record.cityId"
              group="cities"
              :version="version"
              :business-unit="businessUnit"
              :labels="labels"
              @labels="Object.assign(labels, $event)"
            />
          </el-form-item>
          <el-form-item :label="$t('websiteConfig.attractions.kind')">
            <el-select v-model="record.kind" autocomplete="new-password">
              <el-option value="attraction" :label="$t('websiteConfig.attractions.attraction')" />
              <el-option value="component" :label="$t('websiteConfig.attractions.component')" />
            </el-select>
          </el-form-item>
          <el-form-item :label="$t('common.nameZh')" prop="nameZh">
            <el-input v-model="record.nameZh" maxlength="150" />
          </el-form-item>
          <el-form-item :label="$t('common.nameEn')" prop="nameEn">
            <el-input v-model="record.nameEn" maxlength="150" />
          </el-form-item>
          <el-form-item :label="$t('websiteConfig.attractions.parent')" prop="parentId">
            <WebsiteConfigSelect
              v-model="record.parentId"
              group="attractions"
              :version="version"
              :business-unit="businessUnit"
              :labels="labels"
              :city-id="record.cityId"
              :disabled="!record.cityId"
              :exclude-id="record.id"
              nullable
              @labels="Object.assign(labels, $event)"
            />
          </el-form-item>
          <el-form-item :label="$t('websiteConfig.attractions.copyKey')" prop="copyKey">
            <WebsiteConfigSelect
              v-model="record.copyKey"
              group="templates"
              :version="version"
              :business-unit="businessUnit"
              :labels="labels"
              @labels="Object.assign(labels, $event)"
            />
          </el-form-item>
          <el-form-item :label="$t('websiteConfig.attractions.linkAttraction')">
            <WebsiteResourceSelect
              v-model="record.resourceId"
              kind="attraction"
              :selected-name="record.nameZh"
            />
          </el-form-item>
          <el-form-item :label="$t('websiteConfig.attractions.recommendedMonths')">
            <el-select v-model="record.recommendedMonths" autocomplete="new-password" multiple>
              <el-option
                v-for="month in 12"
                :key="month"
                :value="month"
                :label="$t('websiteConfig.attractions.month', { month })"
              />
            </el-select>
          </el-form-item>
          <el-form-item :label="$t('websiteConfig.attractions.chargeableAttraction')">
            <el-switch v-model="record.chargeable" />
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
    </AppDialog>
  </section>
</template>

<script setup lang="ts">
import AppDialog from "@/components/AppDialog/index.vue";
import DataTable from "@/components/DataTable/index.vue";
import RowActions from "@/components/RowActions/index.vue";
import TableToolbar from "@/components/TableToolbar/index.vue";
import { reactive, ref, watch } from "vue";
import type { FormInstance } from "element-plus";
import type { WebsiteAttraction, WebsiteConfigEditorProps } from "@/types/website";
import { cloneWebsiteDraft } from "@/views/website-inquiries/options";
import WebsiteResourceSelect from "@/views/website-inquiries/components/WebsiteResourceSelect.vue";
import { useWebsiteAttractionRules } from "../useWebsiteConfigRules";
import WebsiteConfigSelect from "./WebsiteConfigSelect.vue";
import { useResourceFormSubmit } from "../../useResourceFormSubmit";

const props = defineProps<WebsiteConfigEditorProps & { rows: WebsiteAttraction[] }>();
const labels = reactive<Record<string, string>>({});
watch(() => props.references, (value) => Object.assign(labels, value), { immediate: true });
const visible = ref(false);
const isNew = ref(false);
const record = ref<WebsiteAttraction>();
const formRef = ref<FormInstance>();
const { isSubmitting, isSaving, submitForm } = useResourceFormSubmit(formRef);
const rules = useWebsiteAttractionRules();

function openEditor(item?: WebsiteAttraction) {
  isNew.value = !item;
  record.value = item
    ? cloneWebsiteDraft(item)
    : {
      id: crypto.randomUUID(),
      status: "enabled",
      cityId: "",
      parentId: null,
      nameZh: "",
      nameEn: "",
      resourceId: null,
      kind: "attraction",
      chargeable: true,
      copyKey: "",
      recommendedMonths: [],
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
