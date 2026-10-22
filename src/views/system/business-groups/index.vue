<!-- 霖熹业务组 -->
<template>
  <PageShell>
    <FilterBar ref="filterBarRef" :model="params" @reset="handleResetQuery">
      <el-form-item :label="$t('common.keywords')" prop="keyword" class="filter-bar__wide">
        <el-input
          v-model="params.keyword"
          :placeholder="$t('businessGroup.searchPlaceholder')"
          maxlength="100"
          clearable
        />
      </el-form-item>
      <el-form-item :label="$t('common.status')" prop="status">
        <el-select
          v-model="params.status"
          autocomplete="new-password"
          :placeholder="$t('common.allStatuses')"
          clearable
        >
          <el-option value="enabled" :label="$t('common.enabled')" />
          <el-option value="disabled" :label="$t('common.disabled')" />
        </el-select>
      </el-form-item>
    </FilterBar>

    <SectionCard fill>
      <TableToolbar :refreshing="loading" @refresh="fetchData">
        <el-button v-hasPerm="'sys:business-group:create'" type="primary" @click="openCreate">
          {{ $t("common.create") }}
        </el-button>
      </TableToolbar>

      <DataTable
        fill
        :error="error"
        :loading="loading"
        :data="list"
        :filtered="Boolean(params.keyword || params.status)"
        row-key="id"
        @retry="fetchData"
      >
        <el-table-column prop="name" :label="$t('businessGroup.name')" min-width="200" />
        <el-table-column :label="$t('common.status')" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === 'enabled' ? 'success' : 'info'">
              {{ $t(row.status === "enabled" ? "common.enabled" : "common.disabled") }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column
          prop="memberCount"
          :label="$t('businessGroup.memberCount')"
          width="110"
          align="center"
        />
        <el-table-column
          :label="$t('common.updatedAt')"
          width="170"
          :formatter="(row) => formatDateTime(row.updatedAt)"
        />
        <el-table-column
          :label="$t('common.actions')"
          fixed="right"
          width="200"
          :show-overflow-tooltip="false"
        >
          <template #default="{ row }">
            <RowActions>
              <el-button
                v-hasPerm="'sys:user:list'"
                type="primary"
                size="small"
                link
                @click="openMembers(row as BusinessGroupItem)"
              >
                {{ $t("businessGroup.members") }}
              </el-button>
              <el-button
                v-hasPerm="'sys:business-group:update'"
                type="primary"
                size="small"
                link
                :disabled="isPending(row.id)"
                @click="openEdit(row as BusinessGroupItem)"
              >
                {{ $t("common.edit") }}
              </el-button>
              <el-button
                v-hasPerm="'sys:business-group:update'"
                :type="row.status === 'enabled' ? 'danger' : 'primary'"
                size="small"
                link
                :disabled="isPending(row.id)"
                @click="toggleStatus(row as BusinessGroupItem)"
              >
                {{ $t(row.status === "enabled" ? "businessGroup.disable" : "businessGroup.enable") }}
              </el-button>
            </RowActions>
          </template>
        </el-table-column>
      </DataTable>

      <Pagination
        v-if="total > 0"
        v-model:page="params.page"
        v-model:limit="params.pageSize"
        :total="total"
        @pagination="fetchData"
      />
    </SectionCard>

    <AppDialog
      v-model="dialog.visible"
      :title="$t(editing ? 'common.edit' : 'common.create')"
      size="sm"
      :busy="isSubmitting"
      destroy-on-close
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="auto"
        @submit.prevent
      >
        <el-form-item :label="$t('businessGroup.name')" prop="name">
          <el-input
            v-model="form.name"
            maxlength="100"
            show-word-limit
            :placeholder="$t('businessGroup.namePlaceholder')"
          />
        </el-form-item>
        <el-form-item v-if="editing" :label="$t('common.status')">
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
        <el-button :disabled="isSubmitting" @click="dialog.visible = false">
          {{ $t("common.cancel") }}
        </el-button>
        <el-button type="primary" :loading="isSubmitting" @click="handleSubmit">
          {{ $t("common.save") }}
        </el-button>
      </template>
    </AppDialog>

    <AppDrawer
      v-model="membersVisible"
      :title="membersGroup ? $t('businessGroup.membersTitle', { name: membersGroup.name }) : ''"
      size="lg"
      append-to-body
      destroy-on-close
    >
      <BusinessGroupMembers v-if="membersGroup" :group="membersGroup" @changed="fetchData" />
    </AppDrawer>
  </PageShell>
</template>

<script setup lang="ts">
import { useDebounceFn } from "@vueuse/core";
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from "element-plus";

import AppDialog from "@/components/AppDialog/index.vue";
import AppDrawer from "@/components/AppDrawer/index.vue";
import DataTable from "@/components/DataTable/index.vue";
import FilterBar from "@/components/FilterBar/index.vue";
import PageShell from "@/components/PageShell/index.vue";
import Pagination from "@/components/Pagination/index.vue";
import RowActions from "@/components/RowActions/index.vue";
import SectionCard from "@/components/SectionCard/index.vue";
import TableToolbar from "@/components/TableToolbar/index.vue";
import { usePageTable, useRefreshOnActivated } from "@/composables";
import { usePendingActions } from "@/composables/usePendingActions";
import { businessGroupService } from "@/services/business-group.service";
import type {
  BusinessGroupItem,
  BusinessGroupQueryParams,
  BusinessGroupStatus,
} from "@/types/business-group";
import { formatDateTime } from "@/utils";
import { requestErrorMessage } from "@/utils/version-conflict";
import { useResourceFormSubmit } from "@/views/resources/useResourceFormSubmit";
import BusinessGroupMembers from "./components/BusinessGroupMembers.vue";

defineOptions({ name: "BusinessGroups", inheritAttrs: false });

const { t } = useI18n();
const filterBarRef = ref<InstanceType<typeof FilterBar>>();
const formRef = ref<FormInstance>();
const { isSubmitting, submitForm } = useResourceFormSubmit(formRef);
const { isPending, run } = usePendingActions();

const { loading, list, total, error, params, fetchData, handleQuery, resetParams } = usePageTable<
  BusinessGroupItem,
  BusinessGroupQueryParams
>({
  initialParams: { page: 1, pageSize: 20, keyword: "", status: undefined },
  request: businessGroupService.getPage,
});

const requestRows = useDebounceFn(handleQuery, 300);
watch([() => params.keyword, () => params.status], () => {
  params.page = 1;
  requestRows();
});

function handleResetQuery(): void {
  filterBarRef.value?.form?.resetFields();
  resetParams();
  requestRows();
}

const dialog = reactive({ visible: false });
const editing = ref<BusinessGroupItem | null>(null);
const form = reactive<{ name: string; status: BusinessGroupStatus }>({ name: "", status: "enabled" });
const rules = computed<FormRules>(() => ({
  name: [
    { required: true, whitespace: true, message: t("businessGroup.namePlaceholder"), trigger: "blur" },
  ],
}));

function openCreate(): void {
  editing.value = null;
  Object.assign(form, { name: "", status: "enabled" });
  dialog.visible = true;
}

function openEdit(row: BusinessGroupItem): void {
  editing.value = row;
  Object.assign(form, { name: row.name, status: row.status });
  dialog.visible = true;
}

/** 名称按管理员输入完整保存，不追加前后缀；409 不自动重试。 */
function handleSubmit(): Promise<void> {
  return submitForm(async () => {
    try {
      const name = form.name.trim();
      if (editing.value) {
        await businessGroupService.update(editing.value.id, {
          name,
          status: form.status,
          version: editing.value.version,
        });
        ElMessage.success(t("common.updateSuccess"));
      } else {
        await businessGroupService.create({ name });
        ElMessage.success(t("common.createSuccess"));
      }
      dialog.visible = false;
      void fetchData();
    } catch (cause) {
      ElMessage.error(requestErrorMessage(cause));
    }
  });
}

/** 停用组保留已有成员与历史台账引用，仅禁止新加入和新台账选择。 */
async function toggleStatus(row: BusinessGroupItem): Promise<void> {
  const status: BusinessGroupStatus = row.status === "enabled" ? "disabled" : "enabled";
  await run(row.id, async () => {
    try {
      await ElMessageBox.confirm(
        t(status === "disabled" ? "businessGroup.disableConfirm" : "businessGroup.enableConfirm", {
          name: row.name,
        }),
        t("common.warning"),
        { type: "warning" },
      );
    } catch {
      return;
    }
    try {
      await businessGroupService.update(row.id, { name: row.name, status, version: row.version });
      ElMessage.success(t("common.updateSuccess"));
    } catch (cause) {
      ElMessage.error(requestErrorMessage(cause));
    } finally {
      await fetchData();
    }
  });
}

const membersVisible = ref(false);
const membersGroup = ref<BusinessGroupItem | null>(null);
function openMembers(row: BusinessGroupItem): void {
  membersGroup.value = row;
  membersVisible.value = true;
}

onMounted(handleQuery);
useRefreshOnActivated(fetchData);
</script>
