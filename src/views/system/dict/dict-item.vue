<template>
  <PageShell>
    <FilterBar ref="filterBarRef" :model="params" @reset="handleResetQuery">
      <el-form-item :label="$t('common.keywords')" prop="keyword" class="filter-bar__wide">
        <el-input
          v-model="params.keyword"
          :placeholder="$t('dictionary.optionSearchPlaceholder')"
          clearable
          @keyup.enter="handleQuery"
        />
      </el-form-item>
      <template #actions>
        <el-button type="primary" @click="handleQuery">
          {{ $t("common.search") }}
        </el-button>
      </template>
    </FilterBar>

    <SectionCard fill>
      <TableToolbar :refreshing="loading" @refresh="fetchData">
        <el-button v-has-perm="'sys:dict-item:create'" type="primary" @click="handleCreateClick()">
          {{ $t("common.create") }}
        </el-button>
        <el-button
          v-has-perm="'sys:dict-item:delete'"
          type="danger"
          :disabled="!hasSelection || deleting"
          @click="handleBatchDelete()"
        >
          {{ $t("common.delete") }}
        </el-button>
      </TableToolbar>

      <DataTable
        fill
        :error="error"
        :loading="loading"
        highlight-current-row
        :data="list"
        row-key="id"
        @selection-change="handleSelectionChange"
        @retry="fetchData"
      >
        <el-table-column type="selection" width="55" align="center" />
        <el-table-column :label="$t('businessCategory.optionName')" prop="label" />
        <el-table-column :label="$t('dictionary.optionValue')" prop="value" />
        <el-table-column :label="$t('common.sort')" prop="sort" />
        <el-table-column :label="$t('common.status')">
          <template #default="scope">
            <el-tag :type="scope.row.status === CommonStatus.ENABLED ? 'success' : 'info'">
              {{
                scope.row.status === CommonStatus.ENABLED
                  ? $t("common.enabled")
                  : $t("common.disabled")
              }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column
          fixed="right"
          :label="$t('common.actions')"
          align="center"
          width="160"
          :show-overflow-tooltip="false"
        >
          <template #default="scope">
            <RowActions>
              <el-button
                v-has-perm="'sys:dict-item:update'"
                type="primary"
                link
                size="small"
                @click.stop="handleEditClick(scope.row as DictItem)"
              >
                {{ $t("common.edit") }}
              </el-button>
              <el-button
                v-has-perm="'sys:dict-item:delete'"
                type="danger"
                link
                size="small"
                :disabled="deleting"
                @click.stop="handleDelete(scope.row.id)"
              >
                {{ $t("common.delete") }}
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
      v-model="dialogState.visible"
      :title="t(dialogState.titleKey)"
      size="md"
      :busy="isSubmitting"
      destroy-on-close
      @close="closeDialog"
    >
      <el-form
        ref="dictItemFormRef"
        :model="formData"
        :rules="rules"
        label-width="100px"
      >
        <el-form-item :label="$t('businessCategory.optionName')" prop="label">
          <el-input
            v-model="formData.label"
            :placeholder="$t('businessCategory.optionNameRequired')"
          />
        </el-form-item>
        <el-form-item :label="$t('dictionary.optionValue')" prop="value">
          <el-input
            v-model="formData.value"
            :placeholder="$t('dictionary.optionValuePlaceholder')"
          />
        </el-form-item>
        <el-form-item :label="$t('common.status')">
          <el-radio-group v-model="formData.status">
            <el-radio :value="CommonStatus.ENABLED">
              {{ $t("common.enabled") }}
            </el-radio>
            <el-radio :value="CommonStatus.DISABLED">
              {{ $t("common.disabled") }}
            </el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item :label="$t('common.sort')">
          <el-input-number v-model="formData.sort" controls-position="right" />
        </el-form-item>
        <el-form-item>
          <template #label>
            {{ $t("dictionary.displayStyle") }}
          </template>
          <el-select
            v-model="formData.tagType"
            autocomplete="new-password"
            :placeholder="$t('dictionary.tagTypePlaceholder')"
            clearable
            @clear="formData.tagType = ''"
          >
            <template #label="{ value }">
              <el-tag v-if="value" :type="value">
                {{ formData.label ? formData.label : $t("businessCategory.optionName") }}
              </el-tag>
            </template>
            <el-option
              v-for="type in tagTypeOptions"
              :key="type"
              :label="type"
              :value="type"
            >
              <div flex-y-center gap-10px>
                <el-tag :type="type as any">
                  {{ formData.label ?? $t("businessCategory.optionName") }}
                </el-tag>
                <span>{{ type }}</span>
              </div>
            </el-option>
          </el-select>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button :disabled="isSubmitting" @click="closeDialog">
          {{ $t("common.cancel") }}
        </el-button>
        <el-button type="primary" :loading="isSubmitting" @click="handleSubmit">
          {{ $t("common.confirm") }}
        </el-button>
      </template>
    </AppDialog>
  </PageShell>
</template>

<script setup lang="ts">
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from "element-plus";

import AppDialog from "@/components/AppDialog/index.vue";
import DataTable from "@/components/DataTable/index.vue";
import FilterBar from "@/components/FilterBar/index.vue";
import PageShell from "@/components/PageShell/index.vue";
import Pagination from "@/components/Pagination/index.vue";
import RowActions from "@/components/RowActions/index.vue";
import SectionCard from "@/components/SectionCard/index.vue";
import TableToolbar from "@/components/TableToolbar/index.vue";
import { usePageTable, useTableSelection } from "@/composables";
import { CommonStatus } from "@/enums";
import { dictionaryService } from "@/services";
import { useDictStore } from "@/stores/dict";
import type { DictItem, DictItemForm, DictItemQueryParams } from "@/types/dictionary";
import { useResourceFormSubmit } from "@/views/resources/useResourceFormSubmit";

defineOptions({
  name: "DictItem",
  inheritAttrs: false,
});

const route = useRoute();

// 当前字典编码，由路由 query 传入。
const dictCode = ref(String(route.query.dictCode ?? ""));

const filterBarRef = ref<InstanceType<typeof FilterBar>>();
const dictItemFormRef = ref<FormInstance>();
const { isSubmitting, submitForm } = useResourceFormSubmit(dictItemFormRef);
const dictStore = useDictStore();
const { t } = useI18n();

// 标签类型可选项。
const tagTypeOptions: NonNullable<DictItemForm["tagType"]>[] = [
  "primary",
  "success",
  "info",
  "warning",
  "danger",
];

/** 分页表格数据管理 */
const { loading, list, total, error, params, fetchData, handleQuery, handleResetQuery } = usePageTable<
  DictItem,
  DictItemQueryParams
>({
  initialParams: {
    page: 1,
    pageSize: 10,
    dictCode: dictCode.value,
    keyword: "",
  },
  request: (query) => dictionaryService.getDictItemPage(dictCode.value, query),
  onBeforeReset: () => filterBarRef.value?.form?.resetFields(),
});

// FilterBar 的 resetFields 需要与 params 同一个响应式对象
const { selectedIds, hasSelection, handleSelectionChange } = useTableSelection<DictItem>();

const dialogState = reactive({
  titleKey: "businessCategory.createOptionTitle",
  visible: false,
});

const initialFormData: DictItemForm = {
  dictCode: dictCode.value,
  sort: 1,
  status: CommonStatus.ENABLED,
  tagType: "",
};

const formData = reactive<DictItemForm>({ ...initialFormData });

const rules = computed<FormRules<DictItemForm>>(() => ({
  value: [{ required: true, message: t("dictionary.optionValuePlaceholder"), trigger: "blur" }],
  label: [{ required: true, message: t("businessCategory.optionNameRequired"), trigger: "blur" }],
}));

/**
 * 重置表单数据和验证状态
 */
function resetForm(): void {
  dictItemFormRef.value?.resetFields();
  dictItemFormRef.value?.clearValidate();
  Object.keys(formData).forEach((key) => {
    delete (formData as Record<string, unknown>)[key];
  });
  Object.assign(formData, initialFormData);
}

/**
 * 打开表单弹窗。
 */
function openDialog(): void {
  dialogState.visible = true;
}

/**
 * 关闭表单弹窗并清理临时状态
 */
function closeDialog(): void {
  dialogState.visible = false;
  resetForm();
}

/**
 * 打开新增字典项弹窗
 */
function handleCreateClick(): void {
  dialogState.titleKey = "businessCategory.createOptionTitle";
  openDialog();
}

/**
 * 打开编辑字典项弹窗并回填数据
 *
 * @param row 当前字典项行
 */
async function handleEditClick(row: DictItem): Promise<void> {
  if (!row.id) return;
  dialogState.titleKey = "businessCategory.editOptionTitle";
  try {
    const data = await dictionaryService.getDictItemFormData(dictCode.value, row.id);
    Object.assign(formData, data);
    openDialog();
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : t("request.failed"));
  }
}

/**
 * 校验并提交字典项表单。
 */
function handleSubmit(): Promise<void> {
  return submitForm(async () => {
    formData.dictCode = dictCode.value;
    const id = formData.id;

    try {
      if (id) {
        await dictionaryService.updateDictItem(dictCode.value, id, formData);
        ElMessage.success(t("common.updateSuccess"));
      } else {
        await dictionaryService.createDictItem(dictCode.value, formData);
        ElMessage.success(t("common.createSuccess"));
      }
      dictStore.removeDictItem(dictCode.value);
      closeDialog();
      handleQuery();
    } catch (error) {
      ElMessage.error(error instanceof Error ? error.message : t("common.saveFailed"));
    }
  });
}

/**
 * 删除单个或批量字典项。
 *
 * @param id 指定时删除单个字典项；不指定时删除表格勾选项
 */
// 影响检查与确认前即占用，删除结束前工具栏与行内删除都不可再次触发。
const deleting = ref(false);
async function handleDelete(id?: string): Promise<void> {
  if (deleting.value) return;
  deleting.value = true;
  try {
    await confirmAndDelete(id);
  } finally {
    deleting.value = false;
  }
}
async function confirmAndDelete(id?: string): Promise<void> {
  const itemIds = id ?? selectedIds.value.join(",");
  if (!itemIds) {
    ElMessage.warning(t("common.selectDeleteItem"));
    return;
  }

  try {
    await ElMessageBox.confirm(t("common.deleteSelectedConfirm"), t("common.warning"), {
      confirmButtonText: t("common.confirm"),
      cancelButtonText: t("common.cancel"),
      type: "warning",
    });
  } catch {
    ElMessage.info(t("common.deleteCancelled"));
    return;
  }

  try {
    await dictionaryService.deleteDictItems(dictCode.value, itemIds);
    dictStore.removeDictItem(dictCode.value);
    ElMessage.success(t("common.deleteSuccess"));
    // 保留筛选与页码；删空末页时 Pagination 会把页码夹回有效范围。
    void fetchData();
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : t("common.deleteFailed"));
  }
}

/**
 * 批量删除当前勾选字典项
 */
function handleBatchDelete(): void {
  handleDelete();
}

onMounted(() => {
  handleQuery();
});
</script>
