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
        {{ $t("websiteConfig.skeletons.help") }}
      </span>
    </TableToolbar>
    <DataTable
      fill
      :data="rows"
      row-key="id"
      :empty-text="$t('websiteConfig.skeletons.empty')"
    >
      <el-table-column prop="nameZh" :label="$t('common.nameZh')" min-width="160" />
      <el-table-column prop="nameEn" :label="$t('common.nameEn')" min-width="180" />
      <el-table-column :label="$t('websiteConfig.days')" width="90" align="center">
        <template #default="{ row }">
          {{ row.days.length }}
        </template>
      </el-table-column>
      <!-- @vue-generic {WebsiteSkeleton} -->
      <el-table-column
        :label="$t('websiteConfig.skeletons.cityOrder')"
        min-width="280"
        show-overflow-tooltip
      >
        <template #default="{ row }">
          {{ citySequence(row) || $t("websiteConfig.skeletons.noDays") }}
        </template>
      </el-table-column>
      <el-table-column :label="$t('common.status')" width="100" align="center">
        <template #default="{ row }">
          <el-tag :type="row.status === 'enabled' ? 'success' : 'info'">
            {{ row.status === "enabled" ? $t("common.enabled") : $t("websiteConfig.disabled") }}
          </el-tag>
        </template>
      </el-table-column>
      <!-- @vue-generic {WebsiteSkeleton} -->
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
          ? $t('websiteConfig.skeletons.create')
          : editable
            ? $t('websiteConfig.skeletons.edit')
            : $t('websiteConfig.skeletons.detail')
      "
      size="xl"
      :busy="saving || isSubmitting"
      destroy-on-close
    >
      <el-form
        v-if="record"
        ref="formRef"
        :model="record"
        :rules="rules"
        :validate-on-rule-change="false"
        :disabled="!editable || saving || isSubmitting"
        label-width="auto"
      >
        <div class="grid grid-cols-2 gap-x-[20px] max-[650px]:grid-cols-1">
          <el-form-item :label="$t('common.nameZh')" prop="nameZh">
            <el-input v-model="record.nameZh" maxlength="150" />
          </el-form-item>
          <el-form-item :label="$t('common.nameEn')" prop="nameEn">
            <el-input v-model="record.nameEn" maxlength="150" />
          </el-form-item>
        </div>
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
        <el-form-item prop="days" label-width="0">
          <div class="w-full">
            <TableToolbar v-if="editable" :refreshable="false" class="mb-[8px]">
              <el-button
                v-if="editable"
                type="primary"
                plain
                @click="record.days.push({ cityId: '', patternId: null })"
              >
                {{ $t("websiteConfig.skeletons.addDay") }}
              </el-button>
            </TableToolbar>
            <DataTable :data="record.days" :empty-text="$t('websiteConfig.skeletons.daysEmpty')">
              <el-table-column :label="$t('websiteConfig.days')" width="70" align="center">
                <template #default="{ $index }">
                  D{{ $index + 1 }}
                </template>
              </el-table-column>
              <el-table-column :label="$t('websiteConfig.city')" min-width="160">
                <template #default="{ row, $index }">
                  <el-form-item
                    :prop="`days.${$index}.cityId`"
                    label-width="0"
                    inline-message
                    class="my-[8px]"
                  >
                    <WebsiteConfigSelect
                      v-model="row.cityId"
                      group="cities"
                      :version="version"
                      :business-unit="businessUnit"
                      :labels="labels"
                      @labels="Object.assign(labels, $event)"
                    />
                  </el-form-item>
                </template>
              </el-table-column>
              <el-table-column :label="$t('websiteConfig.tabs.patterns')" min-width="200">
                <template #default="{ row, $index }">
                  <el-form-item
                    :prop="`days.${$index}.patternId`"
                    label-width="0"
                    inline-message
                    class="my-[8px]"
                  >
                    <WebsiteConfigSelect
                      v-model="row.patternId"
                      group="patterns"
                      :version="version"
                      :business-unit="businessUnit"
                      :labels="labels"
                      :city-id="row.cityId"
                      :disabled="!row.cityId"
                      nullable
                      @labels="Object.assign(labels, $event)"
                    />
                  </el-form-item>
                </template>
              </el-table-column>
              <el-table-column
                v-if="editable"
                :label="$t('common.actions')"
                width="210"
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
                      :disabled="$index === record.days.length - 1"
                      type="primary"
                      link
                      @click="move($index, 1)"
                    >
                      {{ $t("common.moveDown") }}
                    </el-button>
                    <el-button type="danger" link @click="record.days.splice($index, 1)">
                      {{ $t("common.remove") }}
                    </el-button>
                  </RowActions>
                </template>
              </el-table-column>
            </DataTable>
          </div>
        </el-form-item>
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
import type { WebsiteConfigEditorProps, WebsiteSkeleton } from "@/types/website";
import { cloneWebsiteDraft } from "@/views/website-inquiries/options";
import { useWebsiteSkeletonRules } from "../useWebsiteConfigRules";
import WebsiteConfigSelect from "./WebsiteConfigSelect.vue";
import { useResourceFormSubmit } from "../../useResourceFormSubmit";

const props = defineProps<WebsiteConfigEditorProps & { rows: WebsiteSkeleton[] }>();
const labels = reactive<Record<string, string>>({});
watch(() => props.references, (value) => Object.assign(labels, value), { immediate: true });
const visible = ref(false);
const isNew = ref(false);
const record = ref<WebsiteSkeleton>();
const formRef = ref<FormInstance>();
const { isSubmitting, isSaving, submitForm } = useResourceFormSubmit(formRef);
const rules = useWebsiteSkeletonRules(record);

function openEditor(skeleton?: WebsiteSkeleton) {
  isNew.value = !skeleton;
  record.value = skeleton
    ? cloneWebsiteDraft(skeleton)
    : {
      id: crypto.randomUUID(),
      status: "enabled",
      nameZh: "",
      nameEn: "",
      days: [],
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

function citySequence(skeleton: WebsiteSkeleton) {
  return skeleton.days
    .map((day) => labels[day.cityId] ?? day.cityId)
    .join(" → ");
}

function move(index: number, direction: number) {
  if (!record.value) return;
  const day = record.value.days.splice(index, 1)[0];
  if (day) record.value.days.splice(index + direction, 0, day);
}
</script>
