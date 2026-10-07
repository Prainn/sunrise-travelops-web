<template>
  <section class="grid [grid-template-rows:auto_minmax(0,_1fr)] h-full min-h-0">
    <div class="page-toolbar">
      <div class="page-toolbar__left">
        <el-button
          v-if="editable"
          type="primary"
          :disabled="!config.cities.length"
          @click="openEditor()"
        >
          {{ $t("websiteConfig.skeletons.create") }}
        </el-button>
        <span class="text-[var(--el-text-color-secondary)] text-[13px]">
          {{ $t("websiteConfig.skeletons.help") }}
        </span>
      </div>
    </div>
    <div class="page-table-wrapper">
      <el-table
        :data="config.skeletons"
        border
        height="100%"
        :empty-text="$t('websiteConfig.skeletons.empty')"
      >
        <el-table-column prop="nameZh" :label="$t('websiteConfig.nameZh')" min-width="160" />
        <el-table-column prop="nameEn" :label="$t('websiteConfig.nameEn')" min-width="180" />
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
          ? $t('websiteConfig.skeletons.create')
          : editable
            ? $t('websiteConfig.skeletons.edit')
            : $t('websiteConfig.skeletons.detail')
      "
      width="min(960px, 94vw)"
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
          <el-form-item :label="$t('websiteConfig.nameZh')" prop="nameZh">
            <el-input v-model="record.nameZh" maxlength="150" />
          </el-form-item>
          <el-form-item :label="$t('websiteConfig.nameEn')" prop="nameEn">
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
        <el-form-item prop="days">
          <div class="w-full">
            <div class="page-toolbar">
              <el-button
                v-if="editable"
                type="primary"
                plain
                @click="record.days.push({ cityId: '', patternId: null })"
              >
                {{ $t("websiteConfig.skeletons.addDay") }}
              </el-button>
            </div>
            <el-table :data="record.days" border :empty-text="$t('websiteConfig.skeletons.daysEmpty')">
              <el-table-column :label="$t('websiteConfig.days')" width="70" align="center">
                <template #default="{ $index }">
                  D{{ $index + 1 }}
                </template>
              </el-table-column>
              <el-table-column :label="$t('websiteConfig.city')" min-width="160">
                <template #default="{ row, $index }">
                  <el-form-item :prop="`days.${$index}.cityId`" inline-message class="my-[8px]">
                    <el-select v-model="row.cityId" filterable>
                      <el-option
                        v-for="city in config.cities"
                        :key="city.id"
                        :value="city.id"
                        :label="city.nameZh"
                      />
                    </el-select>
                  </el-form-item>
                </template>
              </el-table-column>
              <el-table-column :label="$t('websiteConfig.tabs.patterns')" min-width="200">
                <template #default="{ row, $index }">
                  <el-form-item :prop="`days.${$index}.patternId`" inline-message class="my-[8px]">
                    <el-select
                      v-model="row.patternId"
                      filterable
                      clearable
                      :value-on-clear="null"
                      :empty-values="[null, undefined]"
                    >
                      <el-option
                        v-for="pattern in config.patterns.filter((item) => item.cityId === row.cityId)"
                        :key="pattern.id"
                        :value="pattern.id"
                        :label="pattern.nameZh"
                      />
                    </el-select>
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
                  <el-button
                    :disabled="$index === 0"
                    type="primary"
                    link
                    @click="move($index, -1)"
                  >
                    {{ $t("websiteConfig.moveUp") }}
                  </el-button>
                  <el-button
                    :disabled="$index === record.days.length - 1"
                    type="primary"
                    link
                    @click="move($index, 1)"
                  >
                    {{ $t("websiteConfig.moveDown") }}
                  </el-button>
                  <el-button type="danger" link @click="record.days.splice($index, 1)">
                    {{ $t("websiteConfig.remove") }}
                  </el-button>
                </template>
              </el-table-column>
            </el-table>
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
    </el-dialog>
  </section>
</template>

<script setup lang="ts">
import { ref } from "vue";
import type { FormInstance } from "element-plus";
import type { WebsiteConfig, WebsiteSkeleton } from "@/types/website";
import { cloneWebsiteDraft } from "@/views/website-inquiries/options";
import { useWebsiteSkeletonRules } from "../useWebsiteConfigRules";
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
const record = ref<WebsiteSkeleton>();
const formRef = ref<FormInstance>();
const { isSubmitting, isSaving, submitForm } = useResourceFormSubmit(formRef);
const rules = useWebsiteSkeletonRules(() => props.config, record);

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
    const next = cloneWebsiteDraft(props.config);
    const result = cloneWebsiteDraft(record.value);
    const index = next.skeletons.findIndex((row) => row.id === result.id);
    if (index < 0) next.skeletons.push(result);
    else next.skeletons.splice(index, 1, result);
    if (await props.saveConfig(next)) visible.value = false;
  });
}

async function deleteRecord(index: number) {
  if (!props.editable || props.saving) return;
  const next = cloneWebsiteDraft(props.config);
  next.skeletons.splice(index, 1);
  await props.deleteConfig(next);
}

function citySequence(skeleton: WebsiteSkeleton) {
  return skeleton.days
    .map((day) => props.config.cities.find((city) => city.id === day.cityId)?.nameZh ?? day.cityId)
    .join(" → ");
}

function move(index: number, direction: number) {
  if (!record.value) return;
  const day = record.value.days.splice(index, 1)[0];
  if (day) record.value.days.splice(index + direction, 0, day);
}
</script>
