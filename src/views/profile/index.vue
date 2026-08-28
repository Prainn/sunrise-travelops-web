<template>
  <div class="profile-page">
    <section class="profile-hero">
      <div class="profile-hero__body">
        <div class="profile-avatar">
          <el-avatar
            :src="displayAvatar"
            :size="72"
          >
            <el-icon><UserFilled /></el-icon>
          </el-avatar>
          <el-button
            type="info"
            class="profile-avatar__action"
            circle
            :icon="Camera"
            size="small"
            :title="$t('profile.changeAvatar')"
            @click="triggerFileUpload"
          />
          <input
            ref="fileInput"
            class="profile-avatar__input"
            type="file"
            accept="image/*"
            @change="handleFileChange"
          />
        </div>

        <div class="profile-hero__info">
          <div class="profile-hero__title">
            <h2 class="profile-hero__name">
              {{ displayName }}
            </h2>
            <el-tag
              type="primary"
              effect="light"
              round
            >
              {{ primaryRole }}
            </el-tag>
          </div>
          <p class="profile-hero__desc">
            {{ userProfile.username || "-" }} /
            {{ userProfile.deptName || $t("profile.unassignedDepartment") }}
          </p>
          <div class="profile-hero__meta">
            <span class="profile-hero__meta-item">
              <el-icon><Calendar /></el-icon>
              {{ $t("profile.joinedAt", { time: formatValue(userProfile.createTime) }) }}
            </span>
            <span class="profile-hero__meta-item">
              <el-icon><Location /></el-icon>
              {{ $t("profile.lastLogin", { time: recentLoginRecords[0]?.time }) }}
            </span>
          </div>
        </div>
      </div>

      <div class="profile-hero__actions">
        <el-button
          :icon="Edit"
          @click="handleOpenDialog(DialogType.ACCOUNT)"
        >
          {{ $t("profile.editProfile") }}
        </el-button>
        <el-button
          type="primary"
          :icon="Lock"
          @click="handleOpenDialog(DialogType.PASSWORD)"
        >
          {{ $t("profile.changePassword") }}
        </el-button>
      </div>
    </section>

    <div class="profile-page__layout">
      <aside class="profile-page__side">
        <section class="profile-card">
          <header class="profile-card__header">
            <h3 class="profile-card__title">
              {{ $t("profile.personalInfo") }}
            </h3>
            <el-tag
              size="small"
              effect="plain"
            >
              {{ genderText }}
            </el-tag>
          </header>

          <dl class="profile-info">
            <div
              v-for="item in profileInfoItems"
              :key="item.label"
              class="profile-info__item"
            >
              <dt class="profile-info__label">
                <el-icon><component :is="item.icon" /></el-icon>
                {{ item.label }}
              </dt>
              <dd
                class="profile-info__value"
                :class="{ 'is-muted': item.muted }"
              >
                {{ item.value }}
              </dd>
            </div>
          </dl>
        </section>

        <section class="profile-card">
          <header class="profile-card__header">
            <h3 class="profile-card__title">
              {{ $t("profile.rolesAndPermissions") }}
            </h3>
            <span class="profile-card__extra">
              {{ $t("profile.permissionCount", { count: permissionCount }) }}
            </span>
          </header>

          <div class="profile-tags">
            <el-tag
              v-for="role in roleList"
              :key="role"
              class="m-0"
              size="small"
              effect="light"
            >
              {{ role }}
            </el-tag>
            <span
              v-if="!roleList.length"
              class="profile-empty"
            >{{ $t("profile.noRoles") }}</span>
          </div>
        </section>
      </aside>

      <main class="profile-page__main">
        <section class="profile-card">
          <header class="profile-card__header">
            <h3 class="profile-card__title">
              {{ $t("profile.recentLogins") }}
            </h3>
            <span class="profile-card__extra">
              {{ $t("profile.recentCount", { count: 3 }) }}
            </span>
          </header>

          <div class="profile-login">
            <div
              v-for="record in recentLoginRecords"
              :key="record.time"
              class="profile-login__item"
            >
              <span class="profile-icon">
                <el-icon><Monitor /></el-icon>
              </span>
              <div class="profile-login__body">
                <strong class="profile-login__device">{{ record.device }}</strong>
                <span class="profile-login__meta">{{ record.location }} / {{ record.ip }}</span>
              </div>
              <time class="profile-login__time">{{ record.time }}</time>
            </div>
          </div>
        </section>
      </main>
    </div>

    <el-dialog
      v-model="dialogState.visible"
      :title="t(dialogState.titleKey)"
      width="520px"
      destroy-on-close
    >
      <el-form
        v-if="dialogState.type === DialogType.ACCOUNT"
        ref="userProfileFormRef"
        :model="userProfileForm"
        :rules="userProfileRules"
        label-width="88px"
        class="pr-10px"
      >
        <el-form-item
          :label="$t('user.nickname')"
          prop="nickname"
        >
          <el-input
            v-model="userProfileForm.nickname"
            :placeholder="$t('profile.nicknamePlaceholder')"
          />
        </el-form-item>
        <el-form-item :label="$t('user.gender')">
          <DictSelect
            v-model="userProfileForm.gender"
            code="gender"
          />
        </el-form-item>
      </el-form>

      <el-form
        v-else-if="dialogState.type === DialogType.PASSWORD"
        ref="passwordChangeFormRef"
        :model="passwordChangeForm"
        :rules="passwordChangeRules"
        label-width="88px"
        class="pr-10px"
      >
        <el-form-item
          :label="$t('profile.oldPassword')"
          prop="oldPassword"
        >
          <el-input
            v-model="passwordChangeForm.oldPassword"
            type="password"
            show-password
          />
        </el-form-item>
        <el-form-item
          :label="$t('user.newPassword')"
          prop="newPassword"
        >
          <el-input
            v-model="passwordChangeForm.newPassword"
            type="password"
            show-password
          />
        </el-form-item>
        <el-form-item
          :label="$t('profile.confirmPassword')"
          prop="confirmPassword"
        >
          <el-input
            v-model="passwordChangeForm.confirmPassword"
            type="password"
            show-password
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <span class="inline-flex gap-2">
          <el-button @click="handleCancel">{{ $t("common.cancel") }}</el-button>
          <el-button
            type="primary"
            @click="handleSubmit"
          >{{ $t("common.confirm") }}</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script lang="ts" setup>
import type {
  UserProfileDetail,
  PasswordChangeForm,
  UserProfileForm,
} from "@/types/user";

import type { Component } from "vue";
import { computed, onMounted, reactive, ref } from "vue";
import { userService } from "@/services";
import { useUserStoreHook } from "@/stores/user";
import { readFileAsDataUrl } from "@/utils";
import { redirectToLogin } from "@/utils/auth";

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
const passwordChangeForm = reactive<PasswordChangeForm>({});

const recentLoginRecords = computed(() => [
  {
    device: "Chrome / Windows",
    location: t("profile.locations.shanghai"),
    ip: "192.168.1.26",
    time: "2026-06-20 09:32",
  },
  {
    device: "Edge / Windows",
    location: t("profile.locations.hangzhou"),
    ip: "192.168.1.18",
    time: "2026-06-19 18:46",
  },
  {
    device: "Safari / iOS",
    location: t("profile.locations.shenzhen"),
    ip: "192.168.1.12",
    time: "2026-06-18 14:08",
  },
]);

const userProfileRules = computed(() => ({
  nickname: [{ required: true, message: t("profile.nicknamePlaceholder"), trigger: "blur" }],
}));

const passwordChangeRules = computed(() => ({
  oldPassword: [{ required: true, message: t("profile.oldPasswordPlaceholder"), trigger: "blur" }],
  newPassword: [{ required: true, message: t("user.newPasswordPlaceholder"), trigger: "blur" }],
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

const roleList = computed(() => {
  return (userProfile.value.roleNames || "")
    .split(/[,，]/)
    .map((role) => role.trim())
    .filter(Boolean);
});

const primaryRole = computed(() => roleList.value[0] || t("profile.defaultRole"));

const permissionCount = computed(() => userStore.userInfo.perms?.length || 0);

const genderText = computed(() => {
  if (userProfile.value.gender === 1) return t("user.male");
  if (userProfile.value.gender === 2) return t("user.female");
  return t("common.notSet");
});

const profileInfoItems = computed<ProfileInfoItem[]>(() => [
  {
    label: t("user.username"),
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
    label: t("user.email"),
    value: userProfile.value.email || t("profile.unbound"),
    icon: Message,
    muted: !userProfile.value.email,
  },
  {
    label: t("profile.department"),
    value: userProfile.value.deptName || "-",
    icon: OfficeBuilding,
    muted: !userProfile.value.deptName,
  },
  {
    label: t("common.createdAt"),
    value: formatValue(userProfile.value.createTime),
    icon: Timer,
    muted: !userProfile.value.createTime,
  },
]);

function formatValue(value?: Date | string) {
  return value ? String(value) : "-";
}

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
      dialogState.titleKey = "profile.changePassword";
      break;
  }
};

const handleSubmit = async () => {
  if (dialogState.type === DialogType.ACCOUNT) {
    if (!(await userProfileFormRef.value?.validate())) return;
    await userService.updateProfile(userProfileForm);
    ElMessage.success(t("profile.updateSuccess"));
    if (userProfileForm.nickname) userStore.userInfo.nickname = userProfileForm.nickname;
  } else if (dialogState.type === DialogType.PASSWORD) {
    if (!(await passwordChangeFormRef.value?.validate())) return;
    await userService.changePassword(passwordChangeForm);
    dialogState.visible = false;
    await redirectToLogin(t("profile.passwordChangedRelogin"));
    return;
  }

  dialogState.visible = false;
  await loadUserProfile();
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

const triggerFileUpload = () => {
  fileInput.value?.click();
};

const handleFileChange = async (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files ? target.files[0] : null;
  if (file) {
    const avatar = await readFileAsDataUrl(file);
    await userService.updateProfile({ avatar });
    userProfile.value.avatar = avatar;
    userStore.userInfo.avatar = avatar;
    ElMessage.success(t("profile.avatarUpdatedSuccess"));
  }
  target.value = "";
};

const loadUserProfile = async () => {
  const data = await userService.getProfile();
  userProfile.value = data;
};

onMounted(loadUserProfile);
</script>

<style lang="scss" scoped>
.profile-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: 100%;
  padding: 16px;
}

.profile-hero,
.profile-card {
  background: var(--content-bg);
  border: 1px solid var(--card-border);
  border-radius: var(--card-radius);
  box-shadow: var(--card-shadow);
}

.profile-hero {
  display: flex;
  gap: 16px;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
}

.profile-hero__body,
.profile-hero__title,
.profile-hero__meta,
.profile-hero__actions,
.profile-hero__meta-item {
  display: flex;
  align-items: center;
}

.profile-hero__body {
  gap: 16px;
  min-width: 0;
}

.profile-hero__info {
  min-width: 0;
}

.profile-hero__title {
  flex-wrap: wrap;
  gap: 10px;
}

.profile-hero__name {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  line-height: 30px;
  color: var(--el-text-color-primary);
}

.profile-hero__desc {
  margin: 4px 0 0;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.profile-hero__meta {
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 8px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.profile-hero__meta-item {
  gap: 4px;
}

.profile-hero__actions {
  flex-shrink: 0;
  gap: 8px;
}

.profile-avatar {
  position: relative;
  flex-shrink: 0;
}

.profile-avatar__action {
  position: absolute;
  right: -2px;
  bottom: -2px;
  border: 2px solid var(--content-bg);
}

.profile-avatar__input {
  display: none;
}

.profile-page__layout {
  display: grid;
  grid-template-columns: minmax(280px, 340px) minmax(0, 1fr);
  gap: 16px;
  align-items: start;
}

.profile-page__side,
.profile-page__main {
  display: grid;
  gap: 16px;
  min-width: 0;
}

.profile-card {
  padding: 18px 20px;
}

.profile-card__header {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 14px;
}

.profile-card__title {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  line-height: 22px;
  color: var(--el-text-color-primary);
}

.profile-card__extra,
.profile-empty {
  font-size: 12px;
  color: var(--el-text-color-placeholder);
}

.profile-info {
  display: grid;
  gap: 10px;
  margin: 0;
}

.profile-info__item {
  display: grid;
  grid-template-columns: 92px minmax(0, 1fr);
  gap: 10px;
  align-items: center;
  min-height: 34px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--el-border-color-extra-light);
}

.profile-info__item:last-child {
  padding-bottom: 0;
  border-bottom: 0;
}

.profile-info__label {
  display: flex;
  gap: 6px;
  align-items: center;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.profile-info__value {
  min-width: 0;
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 13px;
  color: var(--el-text-color-primary);
  white-space: nowrap;
}

.profile-icon {
  display: flex;
  flex: 0 0 36px;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  font-size: 18px;
  color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
  border-radius: 8px;
}

.profile-login {
  display: grid;
  gap: 12px;
}

.profile-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.profile-login__body {
  min-width: 0;
}

.profile-login__item {
  display: grid;
  grid-template-columns: 36px minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
  min-height: 44px;
}

.profile-login__device,
.profile-login__meta,
.profile-login__time {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.profile-login__device {
  font-size: 13px;
  color: var(--el-text-color-primary);
}

.profile-login__meta,
.profile-login__time {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.is-muted {
  color: var(--el-text-color-placeholder);
}

@media (width <= 1200px) {
  .profile-page__layout {
    grid-template-columns: 1fr;
  }
}

@media (width <= 768px) {
  .profile-page {
    padding: 12px;
  }

  .profile-hero {
    align-items: flex-start;
  }

  .profile-hero,
  .profile-hero__body,
  .profile-hero__actions {
    flex-direction: column;
  }

  .profile-hero__actions {
    align-items: stretch;
    width: 100%;
  }

  .profile-hero__actions .el-button {
    width: 100%;
    margin-left: 0;
  }

  .profile-login__item {
    grid-template-columns: 40px minmax(0, 1fr);
  }

  .profile-login__time {
    grid-column: 2;
    justify-self: start;
  }
}

@media (width <= 520px) {
  .profile-info__item {
    grid-template-columns: 1fr;
  }

  .profile-info__item {
    gap: 4px;
  }
}
</style>
