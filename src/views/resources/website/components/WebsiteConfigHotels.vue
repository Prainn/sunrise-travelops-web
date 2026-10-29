<template>
  <section class="flex flex-col gap-[12px] h-full min-h-0">
    <TableToolbar :refreshable="false">
      <el-button v-if="editable" type="primary" @click="openEditor()">
        {{ $t("common.create") }}
      </el-button>
      <span class="text-muted text-[13px]">
        {{ $t("websiteConfig.hotels.help") }}
      </span>
    </TableToolbar>
    <DataTable
      fill
      :data="rows"
      row-key="id"
      :empty-text="$t('websiteConfig.hotels.empty')"
    >
      <el-table-column :label="$t('common.cityRegion')" min-width="120">
        <template #default="{ row }">
          {{ labels[row.cityId] ?? row.cityId }}
        </template>
      </el-table-column>
      <el-table-column prop="nameZh" :label="$t('common.nameZh')" min-width="160" />
      <el-table-column prop="nameEn" :label="$t('common.nameEn')" min-width="180" />
      <el-table-column
        prop="price"
        :label="$t('websiteConfig.hotels.price')"
        width="190"
        align="right"
      >
        <template #default="{ row }">
          {{ formatMoney(row.price) }}
        </template>
      </el-table-column>
      <el-table-column :label="$t('websiteConfig.hotels.publicHotel')" width="120">
        <template #default="{ row }">
          {{ row.resourceId ? $t("websiteConfig.cities.linked") : $t("common.notLinked") }}
        </template>
      </el-table-column>
      <el-table-column :label="$t('common.status')" width="100" align="center">
        <template #default="{ row }">
          <el-tag :type="row.status === 'enabled' ? 'success' : 'info'">
            {{ row.status === "enabled" ? $t("common.enabled") : $t("websiteConfig.disabled") }}
          </el-tag>
        </template>
      </el-table-column>
      <!-- @vue-generic {WebsiteConfigHotel} -->
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
          ? $t('websiteConfig.hotels.create')
          : editable
            ? $t('websiteConfig.hotels.edit')
            : $t('websiteConfig.hotels.detail')
      "
      size="md"
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
        <el-form-item :label="$t('common.cityRegion')" prop="cityId">
          <WebsiteConfigSelect
            v-model="record.cityId"
            group="cities"
            :version="version"
            :business-unit="businessUnit"
            :labels="labels"
            @labels="Object.assign(labels, $event)"
          />
        </el-form-item>
        <el-form-item :label="$t('common.nameZh')" prop="nameZh">
          <el-input v-model="record.nameZh" maxlength="150" />
        </el-form-item>
        <el-form-item :label="$t('common.nameEn')" prop="nameEn">
          <el-input v-model="record.nameEn" maxlength="150" />
        </el-form-item>
        <el-form-item :label="$t('websiteConfig.hotels.linkHotel')">
          <WebsiteResourceSelect v-model="record.resourceId" kind="hotel" />
        </el-form-item>
        <el-form-item :label="$t('websiteConfig.hotels.price')" prop="price">
          <el-input v-model="record.price" inputmode="decimal" maxlength="13" />
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
import { formatMoney } from "@/utils";
import { reactive, ref, watch } from "vue";
import type { FormInstance } from "element-plus";
import type { WebsiteConfigEditorProps, WebsiteConfigHotel } from "@/types/website";
import { cloneWebsiteDraft } from "@/views/website-inquiries/options";
import WebsiteResourceSelect from "@/views/website-inquiries/components/WebsiteResourceSelect.vue";
import { useWebsiteHotelRules } from "../useWebsiteConfigRules";
import WebsiteConfigSelect from "./WebsiteConfigSelect.vue";
import { useResourceFormSubmit } from "../../useResourceFormSubmit";

const props = defineProps<WebsiteConfigEditorProps & { rows: WebsiteConfigHotel[] }>();
const labels = reactive<Record<string, string>>({});
watch(() => props.references, (value) => Object.assign(labels, value), { immediate: true });
const visible = ref(false);
const isNew = ref(false);
const record = ref<WebsiteConfigHotel>();
const formRef = ref<FormInstance>();
const { isSubmitting, isSaving, submitForm } = useResourceFormSubmit(formRef);
const rules = useWebsiteHotelRules();

function openEditor(hotel?: WebsiteConfigHotel) {
  isNew.value = !hotel;
  record.value = hotel
    ? cloneWebsiteDraft(hotel)
    : {
      id: crypto.randomUUID(),
      status: "enabled",
      cityId: "",
      nameZh: "",
      nameEn: "",
      resourceId: null,
      price: "",
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
