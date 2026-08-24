<!-- 用户列表 -->
<template>
  <div class="page-container user-page">
    <div class="page-main">
      <el-card
        class="page-search"
        shadow="never"
      >
        <el-form
          ref="queryFormRef"
          :model="params"
          :inline="true"
          label-width="auto"
        >
          <el-form-item
            :label="$t('common.keywords')"
            prop="keywords"
          >
            <el-input
              v-model="params.keywords"
              :placeholder="$t('user.searchPlaceholder')"
              class="page-search__keywords"
              clearable
              style="width: 180px"
              @keyup.enter="handleQuery"
            />
          </el-form-item>

          <el-form-item
            :label="$t('common.status')"
            prop="status"
          >
            <el-select
              v-model="params.status"
              :placeholder="$t('common.all')"
              clearable
              style="width: 112px"
            >
              <el-option
                :label="$t('common.normal')"
                :value="CommonStatus.ENABLED"
              />
              <el-option
                :label="$t('common.disabled')"
                :value="CommonStatus.DISABLED"
              />
            </el-select>
          </el-form-item>

          <el-form-item
            :label="$t('common.createdAt')"
            prop="createTime"
          >
            <el-date-picker
              v-model="params.createTime"
              :editable="false"
              type="daterange"
              range-separator="~"
              :start-placeholder="$t('common.startDate')"
              :end-placeholder="$t('common.endDate')"
              value-format="YYYY-MM-DD"
              style="width: 240px"
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
              v-hasPerm="['sys:user:create']"
              type="primary"
              @click="handleCreateClick"
            >
              {{ $t("common.create") }}
            </el-button>
            <el-button
              v-hasPerm="'sys:user:delete'"
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
            class="page-table user-table"
            :data="list"
            height="100%"
            border
            highlight-current-row
            row-key="id"
            @selection-change="handleSelectionChange"
          >
            <el-table-column
              type="selection"
              width="42"
              fixed="left"
              align="center"
            />
            <el-table-column
              :label="$t('user.nickname')"
              min-width="140"
              fixed="left"
            >
              <template #default="scope">
                <div class="user-name-cell">
                  <el-avatar
                    v-if="scope.row.avatar"
                    :src="scope.row.avatar"
                    :size="24"
                  />
                  <span
                    v-else
                    class="user-name-cell__text"
                  >
                    {{ getAvatarText(scope.row as UserItem) }}
                  </span>
                  <span>{{ scope.row.nickname || "-" }}</span>
                </div>
              </template>
            </el-table-column>
            <el-table-column
              :label="$t('user.username')"
              min-width="120"
              prop="username"
              show-overflow-tooltip
            />
            <el-table-column
              :label="$t('common.status')"
              align="center"
              width="80"
            >
              <template #default="scope">
                <el-tag
                  :type="scope.row.status === CommonStatus.ENABLED ? 'success' : 'danger'"
                  size="small"
                >
                  {{
                    scope.row.status === CommonStatus.ENABLED
                      ? $t("common.normal")
                      : $t("common.disabled")
                  }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column
              :label="$t('user.gender')"
              align="center"
              width="70"
            >
              <template #default="scope">
                <el-tag
                  v-if="
                    scope.row.gender === UserGender.MALE || scope.row.gender === UserGender.FEMALE
                  "
                  :type="scope.row.gender === UserGender.MALE ? 'primary' : 'danger'"
                  size="small"
                >
                  <el-icon>
                    <Male v-if="scope.row.gender === UserGender.MALE" />
                    <Female v-else />
                  </el-icon>
                  <span>
                    {{
                      scope.row.gender === UserGender.MALE
                        ? $t("user.male")
                        : $t("user.female")
                    }}
                  </span>
                </el-tag>
                <span v-else>-</span>
              </template>
            </el-table-column>
            <el-table-column
              :label="$t('user.rolesLabel')"
              prop="roleNames"
              min-width="160"
              show-overflow-tooltip
            />
            <el-table-column
              :label="$t('user.mobile')"
              prop="mobile"
              width="130"
            />
            <el-table-column
              :label="$t('user.email')"
              prop="email"
              min-width="180"
              show-overflow-tooltip
            />
            <el-table-column
              :label="$t('common.createdAt')"
              prop="createTime"
              width="160"
              show-overflow-tooltip
            />
            <el-table-column
              :label="$t('common.actions')"
              fixed="right"
              width="200"
            >
              <template #default="scope">
                <div>
                  <el-button
                    v-hasPerm="'sys:user:update'"
                    type="primary"
                    size="small"
                    link
                    @click="handleEditClick(scope.row.id)"
                  >
                    {{ $t("common.edit") }}
                  </el-button>
                  <el-button
                    v-hasPerm="'sys:user:delete'"
                    type="danger"
                    size="small"
                    link
                    @click="handleDelete(scope.row.id)"
                  >
                    {{ $t("common.delete") }}
                  </el-button>
                  <el-button
                    v-hasPerm="'sys:user:reset-password'"
                    type="primary"
                    size="small"
                    link
                    @click="openResetPasswordDialog(scope.row as UserItem)"
                  >
                    {{ $t("user.resetPassword") }}
                  </el-button>
                </div>
              </template>
            </el-table-column>
          </el-table>
        </div>

        <pagination
          v-if="total > 0"
          v-model:page="params.pageNum"
          v-model:limit="params.pageSize"
          :total="total"
          class="page-pagination"
          @pagination="fetchData"
        />
      </el-card>
    </div>

    <!-- 用户表单 -->
    <el-drawer
      v-model="dialogState.visible"
      :title="t(dialogState.titleKey)"
      append-to-body
      :size="drawerSize"
      destroy-on-close
      @close="closeDialog"
    >
      <el-form
        ref="userFormRef"
        :model="formData"
        :rules="rules"
        label-width="80px"
      >
        <el-form-item
          :label="$t('user.username')"
          prop="username"
        >
          <el-input
            v-model="formData.username"
            :readonly="!!formData.id"
            :placeholder="$t('user.usernamePlaceholder')"
          />
        </el-form-item>

        <el-form-item
          :label="$t('user.nickname')"
          prop="nickname"
        >
          <el-input
            v-model="formData.nickname"
            :placeholder="$t('user.nicknamePlaceholder')"
          />
        </el-form-item>

        <el-form-item
          :label="$t('user.gender')"
          prop="gender"
        >
          <DictSelect
            v-model="formData.gender"
            code="gender"
          />
        </el-form-item>

        <el-form-item
          :label="$t('user.rolesLabel')"
          prop="roleIds"
        >
          <el-select
            v-model="formData.roleIds"
            multiple
            :placeholder="$t('common.selectPlaceholder')"
          >
            <el-option
              v-for="item in roleOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>

        <el-form-item
          :label="$t('user.mobile')"
          prop="mobile"
        >
          <el-input
            v-model="formData.mobile"
            :placeholder="$t('user.mobilePlaceholder')"
            maxlength="11"
          />
        </el-form-item>

        <el-form-item
          :label="$t('user.email')"
          prop="email"
        >
          <el-input
            v-model="formData.email"
            :placeholder="$t('user.emailPlaceholder')"
            maxlength="50"
          />
        </el-form-item>

        <el-form-item
          :label="$t('common.status')"
          prop="status"
        >
          <el-switch
            v-model="formData.status"
            inline-prompt
            :active-text="$t('common.normal')"
            :inactive-text="$t('common.disabled')"
            :active-value="CommonStatus.ENABLED"
            :inactive-value="CommonStatus.DISABLED"
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
    </el-drawer>

    <!-- 重置密码 -->
    <el-dialog
      v-model="resetPasswordDialog.visible"
      :title="$t('user.resetPassword')"
      :width="resetPasswordDialogWidth"
      append-to-body
      destroy-on-close
      @closed="resetResetPasswordForm"
    >
      <div class="mb-16px">
        {{ $t("user.userLabel") }}：{{
          resetPasswordDialog.nickname || resetPasswordDialog.username || "-"
        }}
        <span v-if="resetPasswordDialog.nickname && resetPasswordDialog.username">
          （{{ resetPasswordDialog.username }}）
        </span>
      </div>

      <el-form
        ref="resetPasswordFormRef"
        :model="resetPasswordForm"
        :rules="resetPasswordRules"
        label-width="84px"
      >
        <el-form-item
          :label="$t('user.newPassword')"
          prop="password"
        >
          <el-input
            v-model="resetPasswordForm.password"
            type="password"
            show-password
            autocomplete="new-password"
            :placeholder="$t('user.newPasswordPlaceholder')"
            @keyup.enter="handleResetPasswordSubmit"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <div class="dialog-footer">
          <el-button
            type="primary"
            :loading="resetPasswordSubmitting"
            @click="handleResetPasswordSubmit"
          >
            {{ $t("common.confirm") }}
          </el-button>
          <el-button @click="closeResetPasswordDialog">
            {{ $t("common.cancel") }}
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from "element-plus";

import type { UserForm, UserItem, UserQueryParams } from "@/types/user";
import type { OptionItem } from "@/types/common";
import { userService } from "@/services";
import { useAppStore } from "@/stores/app";
import { useUserStore } from "@/stores/user";
import { usePageTable, useTableSelection } from "@/composables";
import { CommonStatus, DeviceEnum, DialogMode, UserGender } from "@/enums";
import { Female, FullScreen, Male, Refresh } from "@element-plus/icons-vue";

defineOptions({
  name: "User",
  inheritAttrs: false,
});

const appStore = useAppStore();
const userStore = useUserStore();
const { t } = useI18n();

const tableWrapperRef = ref<HTMLElement | null>(null);
const { toggle: toggleFullscreen } = useFullscreen(tableWrapperRef);

const queryFormRef = ref<FormInstance>();
const userFormRef = ref<FormInstance>();
const resetPasswordFormRef = ref<FormInstance>();

/** 分页表格数据管理 */
const { loading, list, total, params, fetchData, handleQuery, handleResetQuery } = usePageTable<
  UserItem,
  UserQueryParams
>({
  initialParams: {
    pageNum: 1,
    pageSize: 10,
  },
  request: userService.getPage,
  onBeforeReset: () => queryFormRef.value?.resetFields(),
});

const { selectedIds, hasSelection, handleSelectionChange } = useTableSelection<UserItem>();

const dialogState = reactive({
  visible: false,
  titleKey: "user.createTitle",
  mode: DialogMode.CREATE,
});

const resetPasswordSubmitting = ref(false);

const initialFormData: UserForm = {
  status: CommonStatus.ENABLED,
};

const formData = reactive<UserForm>({ ...initialFormData });

type ResetPasswordForm = {
  password: string;
};

const resetPasswordDialog = reactive({
  visible: false,
  userId: "",
  username: "",
  nickname: "",
});

const resetPasswordForm = reactive<ResetPasswordForm>({
  password: "",
});

const roleOptions = ref<OptionItem[]>([]);

const drawerSize = computed(() => (appStore.device === DeviceEnum.DESKTOP ? "600px" : "90%"));

const resetPasswordDialogWidth = computed(() =>
  appStore.device === DeviceEnum.DESKTOP ? "420px" : "90%"
);

const rules = computed<FormRules<UserForm>>(() => ({
  username: [{ required: true, message: t("user.usernamePlaceholder"), trigger: "blur" }],
  nickname: [{ required: true, message: t("user.nicknamePlaceholder"), trigger: "blur" }],
  roleIds: [{ required: true, message: t("user.rolePlaceholder"), trigger: "change" }],
  email: [{ type: "email", message: t("user.emailInvalid"), trigger: "blur" }],
  mobile: [{ pattern: /^1[3-9]\d{9}$/, message: t("user.mobileInvalid"), trigger: "blur" }],
}));

const resetPasswordRules = computed<FormRules<ResetPasswordForm>>(() => ({
  password: [
    { required: true, message: t("user.newPasswordPlaceholder"), trigger: "blur" },
    { min: 6, message: t("service.user.passwordMin"), trigger: "blur" },
  ],
}));

/**
 * 取昵称/用户名首字母作为头像占位文本。
 *
 * @param row 用户行数据
 */
function getAvatarText(row: UserItem): string {
  const text = row.nickname || row.username || "?";
  return text.slice(0, 1).toUpperCase();
}

/**
 * 加载用户角色选项。
 */
async function loadFormOptions(): Promise<void> {
  roleOptions.value = await userService.getRoleOptions();
}

/**
 * 打开用户表单弹窗。
 */
function openDialog(): void {
  dialogState.visible = true;
}

/**
 * 关闭用户表单弹窗并清理临时状态。
 */
function closeDialog(): void {
  dialogState.visible = false;
  resetForm();
}

/**
 * 重置表单数据和验证状态。
 */
function resetForm(): void {
  userFormRef.value?.resetFields();
  userFormRef.value?.clearValidate();
  Object.keys(formData).forEach((key) => {
    delete (formData as Record<string, unknown>)[key];
  });
  Object.assign(formData, initialFormData);
}

/**
 * 打开新增弹窗。
 */
async function handleCreateClick(): Promise<void> {
  dialogState.titleKey = "user.createTitle";
  dialogState.mode = DialogMode.CREATE;
  await loadFormOptions();
  openDialog();
}

/**
 * 打开编辑弹窗并回填数据。
 */
async function handleEditClick(id: string): Promise<void> {
  dialogState.titleKey = "user.editTitle";
  dialogState.mode = DialogMode.EDIT;
  await loadFormOptions();
  const data = await userService.getFormData(id);
  Object.assign(formData, data);
  openDialog();
}

/**
 * 校验并提交用户表单。
 */
const handleSubmit = useDebounceFn(async () => {
  const valid = await userFormRef.value?.validate().then(
    () => true,
    () => false
  );
  if (!valid) return;

  loading.value = true;
  try {
    if (formData.id) {
      await userService.update(formData.id, formData);
      ElMessage.success(t("user.updateSuccess"));
    } else {
      await userService.create(formData);
      ElMessage.success(t("user.createSuccess"));
    }
    closeDialog();
    handleQuery();
  } finally {
    loading.value = false;
  }
}, 300);

/**
 * 删除单个或批量用户。
 *
 * 安全检查：禁止删除当前登录用户。
 *
 * @param id 指定时删除单个用户；不指定时删除表格勾选项
 */
async function handleDelete(id?: string): Promise<void> {
  const userIds = id ?? selectedIds.value.join(",");
  if (!userIds) {
    ElMessage.warning(t("common.selectDeleteItem"));
    return;
  }

  // 安全检查：防止删除当前登录用户
  const currentUserId = userStore.userInfo?.userId;
  if (currentUserId) {
    const isCurrentUserInList = id
      ? id === currentUserId
      : selectedIds.value.some((selectedId) => String(selectedId) === currentUserId);
    if (isCurrentUserInList) {
      ElMessage.error(t("user.cannotDeleteCurrent"));
      return;
    }
  }

  try {
    await ElMessageBox.confirm(t("user.deleteConfirm"), t("common.warning"), {
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
    await userService.deleteByIds(userIds);
    ElMessage.success(t("common.deleteSuccess"));
    handleQuery();
  } finally {
    loading.value = false;
  }
}

/**
 * 打开重置密码弹窗。
 *
 * @param row 用户行数据
 */
function openResetPasswordDialog(row: UserItem): void {
  resetPasswordDialog.userId = row.id;
  resetPasswordDialog.username = row.username ?? "";
  resetPasswordDialog.nickname = row.nickname ?? "";
  resetPasswordDialog.visible = true;

  nextTick(() => {
    resetPasswordFormRef.value?.clearValidate();
  });
}

/**
 * 关闭重置密码弹窗。
 */
function closeResetPasswordDialog(): void {
  resetPasswordDialog.visible = false;
}

/**
 * 重置密码表单状态。
 */
function resetResetPasswordForm(): void {
  resetPasswordFormRef.value?.resetFields();
  resetPasswordFormRef.value?.clearValidate();
  resetPasswordForm.password = "";
  resetPasswordDialog.userId = "";
  resetPasswordDialog.username = "";
  resetPasswordDialog.nickname = "";
}

/**
 * 提交重置密码。
 */
const handleResetPasswordSubmit = useDebounceFn(async () => {
  const valid = await resetPasswordFormRef.value?.validate().then(
    () => true,
    () => false
  );
  if (!valid || !resetPasswordDialog.userId) return;

  resetPasswordSubmitting.value = true;
  try {
    await userService.resetPassword(resetPasswordDialog.userId, resetPasswordForm.password);
    ElMessage.success(t("user.passwordResetSuccess"));
    closeResetPasswordDialog();
  } finally {
    resetPasswordSubmitting.value = false;
  }
}, 300);

onMounted(() => {
  handleQuery();
});
</script>

<style lang="scss" scoped>
.user-name-cell {
  display: inline-flex;
  gap: 8px;
  align-items: center;

  &__text {
    display: inline-flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    font-size: 12px;
    font-weight: 500;
    color: var(--el-color-primary);
    background: var(--el-color-primary-light-9);
    border-radius: 50%;
  }
}
</style>
