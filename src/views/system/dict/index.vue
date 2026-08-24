<template>
  <div class="page-container">
    <el-card
      class="page-search"
      shadow="never"
    >
      <el-form
        ref="queryFormRef"
        :model="params"
        :inline="true"
      >
        <el-form-item
          :label="$t('common.keywords')"
          prop="keywords"
        >
          <el-input
            v-model="params.keywords"
            :placeholder="$t('dictionary.searchPlaceholder')"
            clearable
            @keyup.enter="handleQuery"
          />
        </el-form-item>

        <el-form-item>
          <el-button
            type="primary"
            @click="handleQuery"
          >
            {{ $t("common.search") }}
          </el-button>
          <el-button @click="handleResetQuery">
            {{ $t("common.reset") }}
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card
      ref="tableWrapperRef"
      class="page-content"
      shadow="never"
    >
      <div class="page-toolbar">
        <div class="page-toolbar__left">
          <el-button
            v-has-perm="'sys:dict:create'"
            type="primary"
            @click="handleCreateClick()"
          >
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
        </div>
        <div class="page-toolbar__right">
          <el-tooltip
            :content="$t('common.refresh')"
            placement="top"
          >
            <el-button
              class="page-icon-btn"
              @click="fetchData"
            >
              <el-icon><Refresh /></el-icon>
            </el-button>
          </el-tooltip>
          <el-tooltip
            :content="$t('common.fullscreen')"
            placement="top"
          >
            <el-button
              class="page-icon-btn"
              @click="toggleFullscreen"
            >
              <el-icon><FullScreen /></el-icon>
            </el-button>
          </el-tooltip>
        </div>
      </div>

      <div class="page-table-wrapper">
        <el-table
          v-loading="loading"
          highlight-current-row
          :data="list"
          class="page-table"
          border
          height="100%"
          @selection-change="handleSelectionChange"
        >
          <el-table-column
            type="selection"
            width="55"
            align="center"
          />
          <el-table-column
            :label="$t('dictionary.name')"
            prop="name"
          />
          <el-table-column
            :label="$t('dictionary.code')"
            prop="dictCode"
          />
          <el-table-column
            :label="$t('common.status')"
            prop="status"
          >
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
            </template>
          </el-table-column>
        </el-table>
      </div>

      <pagination
        v-if="total > 0"
        v-model:total="total"
        v-model:page="params.pageNum"
        v-model:limit="params.pageSize"
        @pagination="fetchData"
      />
    </el-card>

    <el-dialog
      v-model="dialogState.visible"
      :title="t(dialogState.titleKey)"
      width="500px"
      destroy-on-close
      @close="closeDialog"
    >
      <el-form
        ref="dictFormRef"
        :model="formData"
        :rules="rules"
        label-width="80px"
      >
        <el-form-item
          :label="$t('dictionary.name')"
          prop="name"
        >
          <el-input
            v-model="formData.name"
            :placeholder="$t('dictionary.namePlaceholder')"
          />
        </el-form-item>

        <el-form-item
          :label="$t('dictionary.code')"
          prop="dictCode"
        >
          <el-input
            v-model="formData.dictCode"
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
        <div class="dialog-footer">
          <el-button
            type="primary"
            @click="handleSubmit"
          >
            {{ $t("common.confirm") }}
          </el-button>
          <el-button @click="closeDialog">
            {{ $t("common.cancel") }}
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { useFullscreen } from "@vueuse/core";
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from "element-plus";
import { Refresh } from "@element-plus/icons-vue";

import router from "@/router";
import { usePageTable, useTableSelection } from "@/composables";
import { CommonStatus } from "@/enums";
import { dictionaryService } from "@/services";
import { useDictStore } from "@/stores";
import type { DictTypeForm, DictTypeItem, DictTypeQueryParams } from "@/types/dictionary";

defineOptions({
  name: "Dict",
  inheritAttrs: false,
});

const tableWrapperRef = ref<HTMLElement | null>(null);
const { toggle: toggleFullscreen } = useFullscreen(tableWrapperRef);

const queryFormRef = ref<FormInstance>();
const dictFormRef = ref<FormInstance>();
const dictStore = useDictStore();
const { t } = useI18n();

/** 分页表格数据管理 */
const { loading, list, total, params, fetchData, handleQuery, handleResetQuery } = usePageTable<
  DictTypeItem,
  DictTypeQueryParams
>({
  initialParams: {
    pageNum: 1,
    pageSize: 10,
    keywords: "",
  },
  request: dictionaryService.getPage,
  onBeforeReset: () => queryFormRef.value?.resetFields(),
});

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
  dictCode: [{ required: true, message: t("dictionary.codePlaceholder"), trigger: "blur" }],
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
  const data = await dictionaryService.getFormData(id);
  Object.assign(formData, data);
  openDialog();
}

/**
 * 校验并提交字典表单
 */
async function handleSubmit(): Promise<void> {
  const valid = await dictFormRef.value?.validate().then(
    () => true,
    () => false
  );
  if (!valid) return;

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
  } finally {
    loading.value = false;
  }
}

/**
 * 跳转到字典项管理页面
 *
 * 检查路由是否已注册后再跳转
 *
 * @param row 当前字典行
 */
function openDictData(row: DictTypeItem): void {
  try {
    const route = router.resolve({
      name: "DictItem",
      query: { dictCode: row.dictCode },
    });
    if (route.matched.length === 0) {
      ElMessage.error(t("common.routeNotRegistered"));
      return;
    }
    router.push(route);
  } catch (error) {
    console.error("Route navigation failed:", error);
    ElMessage.error(t("common.navigationFailed"));
  }
}

onMounted(() => {
  handleQuery();
});
</script>
