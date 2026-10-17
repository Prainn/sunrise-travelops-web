<template>
  <PageShell>
    <FilterBar ref="filterBarRef" :model="params" @reset="handleResetQuery">
      <el-form-item :label="$t('common.keywords')" prop="keyword" class="filter-bar__wide">
        <el-input
          v-model="params.keyword"
          :placeholder="$t('dictionary.searchPlaceholder')"
          clearable
        />
      </el-form-item>
    </FilterBar>

    <SectionCard fill>
      <TableToolbar :refreshing="loading" @refresh="fetchData">
        <el-button v-has-perm="'sys:dict:create'" type="primary" @click="handleCreateClick()">
          {{ $t("common.create") }}
        </el-button>
        <el-button
          v-has-perm="'sys:dict:delete'"
          type="danger"
          :disabled="!hasSelection"
          @click="handleDelete()"
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
        :filtered="Boolean(params.keyword)"
        row-key="id"
        @selection-change="handleSelectionChange"
        @retry="fetchData"
      >
        <el-table-column type="selection" width="55" align="center" />
        <el-table-column :label="$t('dictionary.name')" prop="name" />
        <el-table-column :label="$t('dictionary.code')" prop="dictCode" />
        <el-table-column :label="$t('common.status')" prop="status">
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
          width="220"
        >
          <template #default="scope">
            <RowActions>
              <el-button
                v-has-perm="'sys:dict-item:list'"
                type="primary"
                link
                size="small"
                @click.stop="openDictData(scope.row as DictTypeItem)"
              >
                {{ $t("dictionary.manageOptions") }}
              </el-button>
              <el-button
                v-has-perm="'sys:dict:update'"
                type="primary"
                link
                size="small"
                @click.stop="handleEditClick(scope.row.id)"
              >
                {{ $t("common.edit") }}
              </el-button>
              <el-button
                v-has-perm="'sys:dict:delete'"
                type="danger"
                link
                size="small"
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
        ref="dictFormRef"
        :model="formData"
        :rules="rules"
        label-width="180px"
      >
        <el-form-item :label="$t('dictionary.name')" prop="name">
          <el-input v-model="formData.name" :placeholder="$t('dictionary.namePlaceholder')" />
        </el-form-item>

        <el-form-item :label="$t('dictionary.code')" prop="dictCode">
          <el-input
            v-model.trim="formData.dictCode"
            :placeholder="$t('dictionary.codePlaceholder')"
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

        <el-form-item :label="$t('common.remark')">
          <el-input
            v-model="formData.remark"
            type="textarea"
            :placeholder="$t('common.remarkPlaceholder')"
          />
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
import { useDebounceFn } from "@vueuse/core";
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from "element-plus";

import router from "@/router";
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
import type { DictTypeForm, DictTypeItem, DictTypeQueryParams } from "@/types/dictionary";
import { useResourceFormSubmit } from "@/views/resources/useResourceFormSubmit";

defineOptions({
  name: "Dict",
  inheritAttrs: false,
});

const filterBarRef = ref<InstanceType<typeof FilterBar>>();
const dictFormRef = ref<FormInstance>();
const { isSubmitting, submitForm } = useResourceFormSubmit(dictFormRef);
const dictStore = useDictStore();
const { t } = useI18n();

/** 分页表格数据管理 */
const { loading, list, total, error, params, fetchData, handleQuery, resetParams } = usePageTable<
  DictTypeItem,
  DictTypeQueryParams
>({
  initialParams: {
    page: 1,
    pageSize: 20,
    keyword: "",
  },
  request: dictionaryService.getPage,
});

// FilterBar 的 resetFields 需要与 params 同一个响应式对象
const requestRows = useDebounceFn(handleQuery, 300);

watch(() => params.keyword, () => {
  params.page = 1;
  requestRows();
});

function handleResetQuery(): void {
  filterBarRef.value?.form?.resetFields();
  resetParams();
  requestRows();
}

const { selectedIds, hasSelection, handleSelectionChange } = useTableSelection<DictTypeItem>();

const dialogState = reactive({
  titleKey: "dictionary.createTitle",
  visible: false,
});

const initialFormData: DictTypeForm = {
  status: CommonStatus.ENABLED,
};

const formData = reactive<DictTypeForm>({ ...initialFormData });

const rules = computed<FormRules<DictTypeForm>>(() => ({
  name: [{ required: true, message: t("dictionary.namePlaceholder"), trigger: "blur" }],
  dictCode: [
    { required: true, message: t("dictionary.codePlaceholder"), trigger: "blur" },
    {
      pattern: /^(?=.{1,100}$)[a-z][a-z0-9_]*$/,
      message: t("dictionary.codeFormat"),
      trigger: "blur",
    },
  ],
}));

/**
 * 重置表单数据和验证状态
 */
function resetForm(): void {
  dictFormRef.value?.resetFields();
  dictFormRef.value?.clearValidate();
  Object.keys(formData).forEach((key) => {
    delete (formData as Record<string, unknown>)[key];
  });
  Object.assign(formData, initialFormData);
}

function openDialog(): void {
  dialogState.visible = true;
}

/**
 * 关闭字典表单弹窗并清理临时状态
 */
function closeDialog(): void {
  dialogState.visible = false;
  resetForm();
}

/**
 * 打开新增字典弹窗
 */
function handleCreateClick(): void {
  resetForm();
  dialogState.titleKey = "dictionary.createTitle";
  openDialog();
}

/**
 * 打开编辑字典弹窗并回填数据
 *
 * @param id 字典 ID
 */
async function handleEditClick(id: string): Promise<void> {
  resetForm();
  dialogState.titleKey = "dictionary.editTitle";
  try {
    const data = await dictionaryService.getFormData(id);
    Object.assign(formData, data);
    openDialog();
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : t("request.failed"));
  }
}

/**
 * 校验并提交字典表单
 */
function handleSubmit(): Promise<void> {
  return submitForm(async () => {
    loading.value = true;
    try {
      const id = formData.id;
      if (id) {
        await dictionaryService.update(id, formData);
        ElMessage.success(t("common.updateSuccess"));
      } else {
        await dictionaryService.create(formData);
        ElMessage.success(t("common.createSuccess"));
      }
      dictStore.clearDictCache();
      closeDialog();
      handleQuery();
    } catch (error) {
      ElMessage.error(error instanceof Error ? error.message : t("common.saveFailed"));
    } finally {
      loading.value = false;
    }
  });
}

/**
 * 删除单个或批量字典
 *
 * @param id 指定时删除单个字典；不指定时删除表格勾选项
 */
async function handleDelete(id?: string): Promise<void> {
  const dictIds = id ?? selectedIds.value.join(",");
  if (!dictIds) {
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

  loading.value = true;
  try {
    await dictionaryService.deleteByIds(dictIds);
    dictStore.clearDictCache();
    ElMessage.success(t("common.deleteSuccess"));
    handleResetQuery();
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : t("common.deleteFailed"));
  } finally {
    loading.value = false;
  }
}

/**
 * 跳转到字典项管理页面
 *
 * @param row 当前字典行
 */
function openDictData(row: DictTypeItem): void {
  void router.push({
    name: "DictItem",
    query: { dictCode: row.dictCode },
  });
}

onMounted(() => {
  handleQuery();
});
</script>
