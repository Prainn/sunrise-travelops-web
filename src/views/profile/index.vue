<template>
  <PageShell :fill="false">
    <SectionCard>
      <div class="flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
        <div class="flex flex-col items-start gap-4 min-w-0 sm:flex-row sm:items-center">
          <div class="relative shrink-0">
            <el-avatar :src="displayAvatar" :size="72">
              <el-icon><UserFilled /></el-icon>
            </el-avatar>
            <el-button
              type="info"
              class="profile-avatar__action"
              circle
              :icon="Camera"
              size="small"
              :loading="uploadingAvatar"
              :title="$t('profile.changeAvatar')"
              :aria-label="$t('profile.changeAvatar')"
              @click="triggerFileUpload"
            />
            <input
              ref="fileInput"
              class="hidden"
              type="file"
              accept="image/*"
              @change="handleFileChange"
            />
          </div>

          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-[10px]">
              <h2 class="m-0 text-[22px] font-bold leading-[30px] text-strong">
                {{ displayName }}
              </h2>
              <el-tag type="primary" effect="light" round>
                {{ primaryRole }}
              </el-tag>
            </div>
            <p class="m-[4px_0_0] text-[14px] text-muted">
              {{ userProfile.username || "-" }} /
              {{ userProfile.deptName || $t("profile.unassignedDepartment") }}
            </p>
            <div class="flex flex-wrap items-center gap-3 mt-2 text-[14px] text-muted">
              <span class="flex items-center gap-1">
                <el-icon><Calendar /></el-icon>
                {{ $t("profile.joinedAt", { date: formatDateTime(userProfile.createTime) }) }}
              </span>
              <span class="flex items-center gap-1">
                <el-icon><Location /></el-icon>
                {{ $t("profile.lastLogin", { date: formatDateTime(recentLoginRecords[0]?.time) }) }}
              </span>
            </div>
          </div>
        </div>

        <div class="flex flex-wrap shrink-0 items-center gap-2">
          <el-button
            :icon="Edit"
            @click="handleOpenDialog(DialogType.ACCOUNT)"
          >
            {{ $t("profile.editProfile") }}
          </el-button>
          <el-button type="primary" :icon="Lock" @click="handleOpenDialog(DialogType.PASSWORD)">
            {{ $t("profile.changePassword") }}
          </el-button>
        </div>
      </div>
    </SectionCard>

    <div
      v-loading="isSecurityLoading"
      class="grid grid-cols-1 gap-[var(--page-gap)] items-stretch xl:grid-cols-[minmax(280px,340px)_minmax(0,1fr)]"
    >
      <SectionCard :title="$t('profile.personalInfo')">
        <template #actions>
          <el-tag size="small" effect="plain">
            {{ genderText }}
          </el-tag>
        </template>
        <dl class="grid gap-[10px] m-0">
          <div
            v-for="item in profileInfoItems"
            :key="item.label"
            class="grid grid-cols-1 gap-1 items-center min-h-[34px] pb-[10px] [border-bottom:1px_solid_var(--divider-color)] last:pb-0 last:[border-bottom:0] sm:grid-cols-[92px_minmax(0,1fr)] sm:gap-[10px]"
          >
            <dt class="flex items-center gap-[6px] text-[14px] text-muted">
              <el-icon><component :is="item.icon" /></el-icon>
              {{ item.label }}
            </dt>
            <dd
              class="min-w-0 m-0 overflow-hidden text-ellipsis whitespace-nowrap text-[14px]"
              :class="item.muted ? 'text-faint' : 'text-strong'"
            >
              {{ item.value }}
            </dd>
          </div>
        </dl>
      </SectionCard>

      <SectionCard :title="$t('profile.recentLogins')">
        <template v-if="!securityLoadFailed && !isSecurityLoading" #actions>
          <span class="text-[14px] text-faint">
            {{ $t("profile.recentCount", { count: recentLoginRecords.length }) }}
          </span>
        </template>
        <FeedbackState
          v-if="securityLoadFailed"
          type="error"
          retryable
          @retry="loadSecurity"
        />
        <div v-else-if="!isSecurityLoading" class="grid gap-3">
          <FeedbackState v-if="!recentLoginRecords.length" :title="$t('profile.noLogins')" />
          <div
            v-for="record in recentLoginRecords"
            :key="record.id"
            class="grid grid-cols-[36px_minmax(0,1fr)] gap-[10px] items-center min-h-[44px] md:grid-cols-[36px_minmax(0,1fr)_auto]"
          >
            <span
              class="flex items-center justify-center w-9 h-9 text-[18px] text-[var(--el-color-primary)] bg-[var(--el-color-primary-light-9)] rounded-[var(--custom-radius)]"
            >
              <el-icon><Monitor /></el-icon>
            </span>
            <div class="min-w-0">
              <strong class="block overflow-hidden text-ellipsis whitespace-nowrap break-all text-[14px] text-strong">{{
                record.userAgent || $t("profile.unknownClient")
              }}</strong>
              <span class="block overflow-hidden text-ellipsis whitespace-nowrap text-[14px] text-muted">{{
                record.ip || "-"
              }}</span>
            </div>
            <time
              class="block col-start-2 justify-self-start overflow-hidden text-ellipsis whitespace-nowrap text-[14px] text-muted md:col-start-auto md:justify-self-auto"
            >{{ formatDateTime(record.time) }}</time>
          </div>
        </div>
      </SectionCard>
    </div>

    <SectionCard :title="$t('profile.rolesAndPermissions')">
      <template v-if="!securityLoadFailed && !isSecurityLoading" #actions>
        <span class="text-[14px] text-faint">
          {{ $t("profile.permissionCount", { count: permissionCount }) }}
        </span>
      </template>
      <FeedbackState
        v-if="securityLoadFailed"
        type="error"
        retryable
        @retry="loadSecurity"
      />
      <template v-else-if="!isSecurityLoading">
        <div class="flex flex-wrap gap-2">
          <el-tag
            v-for="role in roleList"
            :key="role.code"
            class="m-0"
            size="small"
            effect="light"
          >
            {{ role.name }}
          </el-tag>
          <span v-if="!roleList.length" class="text-[14px] text-faint">{{ $t("profile.noRoles") }}</span>
        </div>
        <div class="grid gap-2 mt-4">
          <DataTable
            :data="pagedPermissions"
            row-key="code"
            :empty-text="$t('profile.noPermissions')"
          >
            <el-table-column prop="name" :label="$t('profile.permissionName')" min-width="180" />
            <el-table-column prop="code" :label="$t('profile.permissionCode')" min-width="240" />
          </DataTable>
          <Pagination
            v-if="permissionCount > 10"
            v-model:page="permissionPage"
            variant="compact"
            :limit="10"
            :total="permissionCount"
            layout="total, prev, pager, next"
          />
        </div>
      </template>
    </SectionCard>

    <AppDialog
      v-model="dialogState.visible"
      :title="t(dialogState.titleKey)"
      :size="dialogState.type === DialogType.PASSWORD ? 'md' : 'sm'"
      :busy="isSubmitting"
      destroy-on-close
    >
      <el-form
        v-if="dialogState.type === DialogType.ACCOUNT"
        ref="userProfileFormRef"
        :model="userProfileForm"
        :rules="userProfileRules"
        label-width="88px"
      >
        <el-form-item :label="$t('user.nickname')" prop="nickname">
          <el-input
            v-model="userProfileForm.nickname"
            :placeholder="$t('profile.nicknamePlaceholder')"
          />
        </el-form-item>
        <el-form-item :label="$t('common.gender')">
          <el-select v-model="userProfileForm.gender" autocomplete="new-password">
            <el-option :value="0" :label="$t('common.notSet')" />
            <el-option :value="1" :label="$t('user.male')" />
            <el-option :value="2" :label="$t('user.female')" />
          </el-select>
        </el-form-item>
      </el-form>

      <el-form
        v-else-if="dialogState.type === DialogType.PASSWORD"
        ref="passwordChangeFormRef"
        :model="passwordChangeForm"
        :rules="passwordChangeRules"
        label-width="108px"
      >
        <el-form-item :label="$t('profile.oldPassword')" prop="oldPassword">
          <el-input v-model="passwordChangeForm.oldPassword" type="password" show-password />
        </el-form-item>
        <el-form-item :label="$t('user.newPassword')" prop="newPassword">
          <el-input v-model="passwordChangeForm.newPassword" type="password" show-password />
        </el-form-item>
        <el-form-item :label="$t('profile.confirmPassword')" prop="confirmPassword">
          <el-input v-model="passwordChangeForm.confirmPassword" type="password" show-password />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button :disabled="isSubmitting" @click="handleCancel">
          {{ $t("common.cancel") }}
        </el-button>
        <el-button type="primary" :loading="isSubmitting" @click="handleSubmit">
          {{ $t("common.confirm") }}
        </el-button>
      </template>
    </AppDialog>
  </PageShell>
</template>

<script lang="ts" setup>
import type {
  ProfileSecurity,
  UserProfileDetail,
  PasswordChangeForm,
  UserProfileForm,
} from "@/types/user";

import type { Component } from "vue";
import { computed, onMounted, reactive, ref } from "vue";
import { userService } from "@/services";
import { useUserStoreHook } from "@/stores/user";
import { readFileAsDataUrl, formatDateTime } from "@/utils";
import { redirectToLogin } from "@/utils/auth";
import PageShell from "@/components/PageShell/index.vue";
import SectionCard from "@/components/SectionCard/index.vue";
import DataTable from "@/components/DataTable/index.vue";
import Pagination from "@/components/Pagination/index.vue";
import AppDialog from "@/components/AppDialog/index.vue";
import FeedbackState from "@/components/FeedbackState/index.vue";

import {
  Calendar,
  Camera,
  Edit,
  Female,
  Iphone,
  Location,
  Lock,
  Male,
  Message,
  Monitor,
  OfficeBuilding,
  Timer,
  User,
  UserFilled,
} from "@element-plus/icons-vue";

interface ProfileInfoItem {
  label: string;
  value: string;
  icon: Component;
  muted?: boolean;
}

const userStore = useUserStoreHook();
const { t } = useI18n();

const userProfile = ref<UserProfileDetail>({});

const enum DialogType {
  ACCOUNT = "account",
  PASSWORD = "password",
}

const dialogState = reactive({
  visible: false,
  titleKey: "profile.editProfile",
  type: "" as DialogType,
});

const userProfileFormRef = ref();
const passwordChangeFormRef = ref();

const userProfileForm = reactive<UserProfileForm>({});
const isSubmitting = ref(false);
const passwordChangeForm = reactive<PasswordChangeForm>({});

const security = ref<ProfileSecurity>({ roles: [], permissions: [], recentLogins: [] });
const isSecurityLoading = ref(true);
const securityLoadFailed = ref(false);
const recentLoginRecords = computed(() => security.value.recentLogins);

async function loadSecurity() {
  isSecurityLoading.value = true;
  securityLoadFailed.value = false;
  try {
    security.value = await userService.getProfileSecurity();
    permissionPage.value = 1;
  } catch {
    securityLoadFailed.value = true;
  } finally {
    isSecurityLoading.value = false;
  }
}

const userProfileRules = computed(() => ({
  nickname: [{ required: true, message: t("profile.nicknamePlaceholder"), trigger: "blur" }],
}));

const passwordChangeRules = computed(() => ({
  oldPassword: [{ required: true, message: t("profile.oldPasswordPlaceholder"), trigger: "blur" }],
  newPassword: [
    { required: true, message: t("user.newPasswordPlaceholder"), trigger: "blur" },
    { min: 6, max: 128, message: t("profile.passwordLength"), trigger: "blur" },
  ],
  confirmPassword: [
    { required: true, message: t("profile.confirmPasswordPlaceholder"), trigger: "blur" },
    {
      validator: (_rule: unknown, value: string, callback: (error?: Error) => void) => {
        if (value !== passwordChangeForm.newPassword) {
          callback(new Error(t("profile.passwordMismatch")));
          return;
        }
        callback();
      },
      trigger: "blur",
    },
  ],
}));

const displayAvatar = computed(() => userProfile.value.avatar || userStore.userInfo.avatar || "");

const displayName = computed(() => {
  return (
    userProfile.value.nickname ||
    userStore.userInfo.nickname ||
    userProfile.value.username ||
    userStore.userInfo.username ||
    t("profile.unnamedUser")
  );
});

const roleList = computed(() => security.value.roles);
const primaryRole = computed(() => roleList.value[0]?.name || "-");
const permissionPage = ref(1);
const pagedPermissions = computed(() =>
  security.value.permissions.slice((permissionPage.value - 1) * 10, permissionPage.value * 10),
);
const permissionCount = computed(() => security.value.permissions.length);

const genderText = computed(() => {
  if (userProfile.value.gender === 1) return t("user.male");
  if (userProfile.value.gender === 2) return t("user.female");
  return t("common.notSet");
});

const profileInfoItems = computed<ProfileInfoItem[]>(() => [
  {
    label: t("common.username"),
    value: userProfile.value.username || "-",
    icon: userProfile.value.gender === 2 ? Female : userProfile.value.gender === 1 ? Male : User,
  },
  {
    label: t("user.mobile"),
    value: userProfile.value.mobile || t("profile.unbound"),
    icon: Iphone,
    muted: !userProfile.value.mobile,
  },
  {
    label: t("common.email"),
    value: userProfile.value.email || t("profile.unbound"),
    icon: Message,
    muted: !userProfile.value.email,
  },
  {
    label: t("common.department"),
    value: userProfile.value.deptName || "-",
    icon: OfficeBuilding,
    muted: !userProfile.value.deptName,
  },
  {
    label: t("common.createdAt"),
    value: formatDateTime(userProfile.value.createTime),
    icon: Timer,
    muted: !userProfile.value.createTime,
  },
]);

const handleOpenDialog = (type: DialogType) => {
  dialogState.type = type;
  dialogState.visible = true;
  switch (type) {
    case DialogType.ACCOUNT:
      dialogState.titleKey = "profile.editProfile";
      userProfileForm.nickname = userProfile.value.nickname;
      userProfileForm.avatar = userProfile.value.avatar;
      userProfileForm.gender = userProfile.value.gender;
      break;
    case DialogType.PASSWORD:
      passwordChangeForm.oldPassword = "";
      passwordChangeForm.newPassword = "";
      passwordChangeForm.confirmPassword = "";
      dialogState.titleKey = "profile.changePassword";
      break;
  }
};

const handleSubmit = async () => {
  if (isSubmitting.value) return;
  isSubmitting.value = true;
  try {
    if (dialogState.type === DialogType.ACCOUNT) {
      if (!(await userProfileFormRef.value?.validate().catch(() => false))) return;
      await userService.updateProfile(userProfileForm);
      ElMessage.success(t("profile.updateSuccess"));
      if (userProfileForm.nickname) userStore.userInfo.nickname = userProfileForm.nickname;
    } else if (dialogState.type === DialogType.PASSWORD) {
      if (!(await passwordChangeFormRef.value?.validate().catch(() => false))) return;
      await userService.changePassword(passwordChangeForm);
      dialogState.visible = false;
      await redirectToLogin(t("profile.passwordChangedRelogin"));
      return;
    }

    dialogState.visible = false;
    await loadUserProfile();
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : t("apiErrors.REQUEST_FAILED"));
  } finally {
    isSubmitting.value = false;
  }
};

const handleCancel = () => {
  dialogState.visible = false;
  if (dialogState.type === DialogType.ACCOUNT) {
    userProfileFormRef.value?.resetFields();
  } else if (dialogState.type === DialogType.PASSWORD) {
    passwordChangeFormRef.value?.resetFields();
  }
};

const fileInput = ref<HTMLInputElement | null>(null);

// 上传期间不能再选新头像，避免两次请求乱序导致页面与服务器头像不一致。
const uploadingAvatar = ref(false);
const triggerFileUpload = () => {
  if (uploadingAvatar.value) return;
  fileInput.value?.click();
};

const handleFileChange = async (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files ? target.files[0] : null;
  if (uploadingAvatar.value) {
    target.value = "";
    return;
  }
  uploadingAvatar.value = true;
  try {
    if (file) {
      const avatar = await readFileAsDataUrl(file);
      await userService.updateProfile({ avatar });
      userProfile.value.avatar = avatar;
      userStore.userInfo.avatar = avatar;
      ElMessage.success(t("profile.avatarUpdatedSuccess"));
    }
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : t("apiErrors.REQUEST_FAILED"));
  } finally {
    uploadingAvatar.value = false;
    target.value = "";
  }
};

const loadUserProfile = async () => {
  try {
    userProfile.value = await userService.getProfile();
  } catch (error) {
    // 加载失败不当作空资料展示，保留已有内容并提示
    ElMessage.error(error instanceof Error ? error.message : t("apiErrors.REQUEST_FAILED"));
  }
};

onMounted(loadUserProfile);
onMounted(loadSecurity);
</script>

<style lang="scss" scoped>
// 头像角标按钮覆盖 ElButton 自带边框，用内容底色描边与头像分隔
.profile-avatar__action {
  position: absolute;
  right: -2px;
  bottom: -2px;
  border: 2px solid var(--content-bg);
}
</style>
