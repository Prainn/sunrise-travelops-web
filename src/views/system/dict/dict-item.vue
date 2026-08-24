<template>
  <div class="page-container">
    <el-card
      ref="tableWrapperRef"
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
            :placeholder="$t('dictionary.optionSearchPlaceholder')"
            class="page-search__keywords"
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
      class="page-content"
      shadow="never"
    >
      <div class="page-toolbar">
        <div class="page-toolbar__left">
          <el-button
            v-has-perm="'sys:dict-item:create'"
            type="primary"
            @click="handleCreateClick()"
          >
            {{ $t("common.create") }}
          </el-button>
          <el-button
            v-has-perm="'sys:dict-item:delete'"
            type="danger"
            :disabled="!hasSelection"
            @click="handleBatchDelete()"
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
            :label="$t('dictionary.optionName')"
            prop="label"
          />
          <el-table-column
            :label="$t('dictionary.optionValue')"
            prop="value"
          />
          <el-table-column
            :label="$t('common.sort')"
            prop="sort"
          />
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
            width="220"
          >
            <template #default="scope">
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
      width="600px"
      destroy-on-close
      @close="closeDialog"
    >
      <el-form
        ref="dictItemFormRef"
        :model="formData"
        :rules="rules"
        label-width="100px"
      >
        <el-form-item
          :label="$t('dictionary.optionName')"
          prop="label"
        >
          <el-input
            v-model="formData.label"
            :placeholder="$t('dictionary.optionNamePlaceholder')"
          />
        </el-form-item>
        <el-form-item
          :label="$t('dictionary.optionValue')"
          prop="value"
        >
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
          <el-input-number
            v-model="formData.sort"
            controls-position="right"
          />
        </el-form-item>
        <el-form-item>
          <template #label>
            <div class="flex-y-center">
              {{ $t("dictionary.displayStyle") }}
              <el-tooltip>
                <template #content>
                  {{ $t("dictionary.displayStyleTip") }}
                </template>
                <el-icon class="ml-1 cursor-pointer">
                  <QuestionFilled />
                </el-icon>
              </el-tooltip>
            </div>
          </template>
          <el-select
            v-model="formData.tagType"
            :placeholder="$t('dictionary.tagTypePlaceholder')"
            clearable
            @clear="formData.tagType = ''"
          >
            <template #label="{ value }">
              <el-tag
                v-if="value"
                :type="value"
              >
                {{ formData.label ? formData.label : $t("dictionary.optionName") }}
              </el-tag>
            </template>
            <el-option
              v-for="type in tagTypeOptions"
              :key="type"
              :label="type"
              :value="type"
            >
              <div
                flex-y-center
                gap-10px
              >
                <el-tag :type="type as any">
                  {{ formData.label ?? $t("dictionary.optionName") }}
                </el-tag>
                <span>{{ type }}</span>
              </div>
            </el-option>
          </el-select>
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
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from "element-plus";
import { FullScreen, QuestionFilled, Refresh } from "@element-plus/icons-vue";

import { usePageTable, useTableSelection } from "@/composables";
import { CommonStatus } from "@/enums";
import { dictionaryService } from "@/services";
import { useDictStore } from "@/stores";
import type { DictItem, DictItemForm, DictItemQueryParams } from "@/types/dictionary";

defineOptions({
  name: "DictItem",
  inheritAttrs: false,
});

const route = useRoute();

// 当前字典编码，由路由 query 传入。
const dictCode = ref(String(route.query.dictCode ?? ""));

const tableWrapperRef = ref<HTMLElement | null>(null);
const { toggle: toggleFullscreen } = useFullscreen(tableWrapperRef);

const queryFormRef = ref<FormInstance>();
const dictItemFormRef = ref<FormInstance>();
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
const { loading, list, total, params, fetchData, handleQuery, handleResetQuery } = usePageTable<
  DictItem,
  DictItemQueryParams
>({
  initialParams: {
    pageNum: 1,
    pageSize: 10,
    dictCode: dictCode.value,
    keywords: "",
  },
  request: (query) => dictionaryService.getDictItemPage(dictCode.value, query),
  onBeforeReset: () => queryFormRef.value?.resetFields(),
});

const { selectedIds, hasSelection, handleSelectionChange } = useTableSelection<DictItem>();

const dialogState = reactive({
  titleKey: "dictionary.createOptionTitle",
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
  label: [{ required: true, message: t("dictionary.optionNamePlaceholder"), trigger: "blur" }],
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
  dialogState.titleKey = "dictionary.createOptionTitle";
  openDialog();
}

/**
 * 打开编辑字典项弹窗并回填数据
 *
 * @param row 当前字典项行
 */
async function handleEditClick(row: DictItem): Promise<void> {
  if (!row.id) return;
  dialogState.titleKey = "dictionary.editOptionTitle";
  const data = await dictionaryService.getDictItemFormData(dictCode.value, row.id);
  Object.assign(formData, data);
  openDialog();
}

/**
 * 校验并提交字典项表单。
 */
async function handleSubmit(): Promise<void> {
  const valid = await dictItemFormRef.value?.validate().then(
    () => true,
    () => false
  );
  if (!valid) return;

  formData.dictCode = dictCode.value;
  const id = formData.id;

  loading.value = true;
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
  } finally {
    loading.value = false;
  }
}

/**
 * 删除单个或批量字典项。
 *
 * @param id 指定时删除单个字典项；不指定时删除表格勾选项
 */
async function handleDelete(id?: string): Promise<void> {
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

  loading.value = true;
  try {
    await dictionaryService.deleteDictItems(dictCode.value, itemIds);
    dictStore.removeDictItem(dictCode.value);
    ElMessage.success(t("common.deleteSuccess"));
    handleResetQuery();
  } finally {
    loading.value = false;
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
