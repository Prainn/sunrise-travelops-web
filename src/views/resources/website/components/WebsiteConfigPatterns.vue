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
        {{ $t("websiteConfig.patterns.help") }}
      </span>
    </TableToolbar>
    <DataTable
      fill
      :data="rows"
      row-key="id"
      :empty-text="$t('websiteConfig.patterns.empty')"
    >
      <el-table-column prop="nameZh" :label="$t('common.nameZh')" min-width="160" />
      <el-table-column prop="nameEn" :label="$t('common.nameEn')" min-width="180" />
      <el-table-column :label="$t('websiteConfig.belongsToCity')" min-width="120">
        <template #default="{ row }">
          {{ labels[row.cityId] ?? row.cityId }}
        </template>
      </el-table-column>
      <!-- @vue-generic {WebsitePattern} -->
      <el-table-column
        :label="$t('websiteConfig.patterns.attractionOrder')"
        min-width="280"
        show-overflow-tooltip
      >
        <template #default="{ row }">
          {{ attractionNames(row) || $t("websiteConfig.patterns.noAttractions") }}
        </template>
      </el-table-column>
      <el-table-column :label="$t('common.status')" width="100" align="center">
        <template #default="{ row }">
          <el-tag :type="row.status === 'enabled' ? 'success' : 'info'">
            {{ row.status === "enabled" ? $t("common.enabled") : $t("websiteConfig.disabled") }}
          </el-tag>
        </template>
      </el-table-column>
      <!-- @vue-generic {WebsitePattern} -->
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
          ? $t('websiteConfig.patterns.create')
          : editable
            ? $t('websiteConfig.patterns.edit')
            : $t('websiteConfig.patterns.detail')
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
          <el-form-item :label="$t('common.nameZh')" prop="nameZh">
            <el-input v-model="record.nameZh" maxlength="150" />
          </el-form-item>
          <el-form-item :label="$t('common.nameEn')" prop="nameEn">
            <el-input v-model="record.nameEn" maxlength="150" />
          </el-form-item>
        </div>
        <el-form-item :label="$t('websiteConfig.patterns.attractions')" prop="attractionIds">
          <WebsiteConfigSelect
            v-model="record.attractionIds"
            group="attractions"
            :version="version"
            :business-unit="businessUnit"
            :labels="labels"
            :city-id="record.cityId"
            :disabled="!record.cityId"
            multiple
            @labels="Object.assign(labels, $event)"
          />
        </el-form-item>
        <DataTable
          :data="record.attractionIds.map((id) => ({ id }))"
          :empty-text="$t('websiteConfig.patterns.noAttractions')"
        >
          <el-table-column
            type="index"
            :label="$t('websiteConfig.patterns.order')"
            width="70"
            align="center"
          />
          <el-table-column :label="$t('websiteConfig.patterns.attractions')" min-width="180">
            <template #default="{ row }">
              {{ labels[row.id] ?? row.id }}
            </template>
          </el-table-column>
          <el-table-column
            v-if="editable"
            :label="$t('common.reorder')"
            width="150"
            align="center"
          >
            <template #default="{ $index }">
              <RowActions>
                <el-button
                  :disabled="$index === 0"
                  type="primary"
                  link
                  @click="move($index, -1)"
                >
                  {{ $t("common.moveUp") }}
                </el-button>
                <el-button
                  :disabled="$index === record.attractionIds.length - 1"
                  type="primary"
                  link
                  @click="move($index, 1)"
                >
                  {{ $t("common.moveDown") }}
                </el-button>
              </RowActions>
            </template>
          </el-table-column>
        </DataTable>
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
import type { WebsiteConfigEditorProps, WebsitePattern } from "@/types/website";
import { cloneWebsiteDraft } from "@/views/website-inquiries/options";
import { useWebsitePatternRules } from "../useWebsiteConfigRules";
import WebsiteConfigSelect from "./WebsiteConfigSelect.vue";
import { useResourceFormSubmit } from "../../useResourceFormSubmit";

const props = defineProps<WebsiteConfigEditorProps & { rows: WebsitePattern[] }>();
const labels = reactive<Record<string, string>>({});
watch(() => props.references, (value) => Object.assign(labels, value), { immediate: true });
const visible = ref(false);
const isNew = ref(false);
const record = ref<WebsitePattern>();
const formRef = ref<FormInstance>();
const { isSubmitting, isSaving, submitForm } = useResourceFormSubmit(formRef);
const rules = useWebsitePatternRules();

function openEditor(pattern?: WebsitePattern) {
  isNew.value = !pattern;
  record.value = pattern
    ? cloneWebsiteDraft(pattern)
    : {
      id: crypto.randomUUID(),
      status: "enabled",
      cityId: "",
      nameZh: "",
      nameEn: "",
      attractionIds: [],
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

function attractionNames(pattern: WebsitePattern) {
  return pattern.attractionIds
    .map((id) => labels[id] ?? id)
    .join(" → ");
}

function move(index: number, direction: number) {
  if (!record.value) return;
  const id = record.value.attractionIds.splice(index, 1)[0];
  if (id) record.value.attractionIds.splice(index + direction, 0, id);
}
</script>
