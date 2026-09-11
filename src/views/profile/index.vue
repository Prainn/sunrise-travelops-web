<template>
  <div class="profile-page">
    <section class="profile-hero flex gap-[16px] items-center justify-between p-[20px_24px]">
      <div class="profile-hero__body gap-[16px] min-w-0">
        <div class="profile-avatar relative shrink-0">
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
            class="profile-avatar__input hidden"
            type="file"
            accept="image/*"
            @change="handleFileChange"
          />
        </div>

        <div class="profile-hero__info min-w-0">
          <div class="profile-hero__title flex-wrap gap-[10px]">
            <h2 class="profile-hero__name m-0 text-[22px] font-bold leading-[30px] text-[var(--el-text-color-primary)]">
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
          <p class="profile-hero__desc m-[4px_0_0] text-[14px] text-[var(--el-text-color-secondary)]">
            {{ userProfile.username || "-" }} /
            {{ userProfile.deptName || $t("profile.unassignedDepartment") }}
          </p>
          <div class="profile-hero__meta flex-wrap gap-[12px] mt-[8px] text-[14px] text-[var(--el-text-color-secondary)]">
            <span class="profile-hero__meta-item gap-[4px]">
              <el-icon><Calendar /></el-icon>
              {{ $t("profile.joinedAt", { time: formatDateTime(userProfile.createTime) }) }}
            </span>
            <span class="profile-hero__meta-item gap-[4px]">
              <el-icon><Location /></el-icon>
              {{ $t("profile.lastLogin", { time: formatDateTime(recentLoginRecords[0]?.time) }) }}
            </span>
          </div>
        </div>
      </div>

      <div class="profile-hero__actions shrink-0 gap-[8px]">
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

    <div class="profile-page__layout grid [grid-template-columns:minmax(280px,_340px)_minmax(0,_1fr)] gap-[16px] [align-items:start]">
      <aside class="profile-page__side">
        <section class="profile-card p-[18px_20px]">
          <header class="profile-card__header flex gap-[12px] items-start justify-between mb-[14px]">
            <h3 class="profile-card__title m-0 text-[16px] font-bold leading-[22px] text-[var(--el-text-color-primary)]">
              {{ $t("profile.personalInfo") }}
            </h3>
            <el-tag
              size="small"
              effect="plain"
            >
              {{ genderText }}
            </el-tag>
          </header>

          <dl class="profile-info grid gap-[10px] m-0">
            <div
              v-for="item in profileInfoItems"
              :key="item.label"
              class="profile-info__item grid [grid-template-columns:92px_minmax(0,_1fr)] gap-[10px] items-center min-h-[34px] pb-[10px] [border-bottom:1px_solid_var(--el-border-color-extra-light)]"
            >
              <dt class="profile-info__label flex gap-[6px] items-center text-[14px] text-[var(--el-text-color-secondary)]">
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

        <section class="profile-card p-[18px_20px]">
          <header class="profile-card__header flex gap-[12px] items-start justify-between mb-[14px]">
            <h3 class="profile-card__title m-0 text-[16px] font-bold leading-[22px] text-[var(--el-text-color-primary)]">
              {{ $t("profile.rolesAndPermissions") }}
            </h3>
            <span class="profile-card__extra">
              {{ $t("profile.permissionCount", { count: permissionCount }) }}
            </span>
          </header>

          <div class="profile-tags flex flex-wrap gap-[8px]">
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
        <section class="profile-card p-[18px_20px]">
          <header class="profile-card__header flex gap-[12px] items-start justify-between mb-[14px]">
            <h3 class="profile-card__title m-0 text-[16px] font-bold leading-[22px] text-[var(--el-text-color-primary)]">
              {{ $t("profile.recentLogins") }}
            </h3>
            <span class="profile-card__extra">
              {{ $t("profile.recentCount", { count: 3 }) }}
            </span>
          </header>

          <div class="profile-login grid gap-[12px]">
            <div
              v-for="record in recentLoginRecords"
              :key="record.time"
              class="profile-login__item grid [grid-template-columns:36px_minmax(0,_1fr)_auto] gap-[10px] items-center min-h-[44px]"
            >
              <span class="profile-icon flex [flex:0_0_36px] items-center justify-center w-[36px] h-[36px] text-[18px] text-[var(--el-color-primary)] [background:var(--el-color-primary-light-9)] rounded-[8px]">
                <el-icon><Monitor /></el-icon>
              </span>
              <div class="profile-login__body min-w-0">
                <strong class="profile-login__device text-[14px] text-[var(--el-text-color-primary)]">{{ record.device }}</strong>
                <span class="profile-login__meta">{{ record.location }} / {{ record.ip }}</span>
              </div>
              <time class="profile-login__time">{{ formatDateTime(record.time) }}</time>
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
import { readFileAsDataUrl, formatDateTime } from "@/utils";
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
  @apply 'flex flex-col gap-[16px] min-h-full p-[16px]';
}

.profile-hero,
.profile-card {
  @apply '[background:var(--content-bg)] [border:1px_solid_var(--card-border)] rounded-[var(--card-radius)] [box-shadow:var(--card-shadow)]';
}

.profile-hero__body,
.profile-hero__title,
.profile-hero__meta,
.profile-hero__actions,
.profile-hero__meta-item {
  @apply 'flex items-center';
}

.profile-avatar__action {
  @apply 'absolute right-[-2px] bottom-[-2px] [border:2px_solid_var(--content-bg)]';
}

.profile-page__side,
.profile-page__main {
  @apply 'grid gap-[16px] min-w-0';
}

.profile-card__extra,
.profile-empty {
  @apply 'text-[14px] text-[var(--el-text-color-placeholder)]';
}

.profile-info__item:last-child {
  @apply 'pb-0 [border-bottom:0]';
}

.profile-info__value {
  @apply 'min-w-0 m-0 overflow-hidden text-ellipsis text-[14px] text-[var(--el-text-color-primary)] whitespace-nowrap';
}

.profile-login__device,
.profile-login__meta,
.profile-login__time {
  @apply 'block overflow-hidden text-ellipsis whitespace-nowrap';
}

.profile-login__meta,
.profile-login__time {
  @apply 'text-[14px] text-[var(--el-text-color-secondary)]';
}

.is-muted {
  @apply 'text-[var(--el-text-color-placeholder)]';
}

@media (width <= 1200px) {
  .profile-page__layout {
    @apply '[grid-template-columns:1fr]';
  }
}

@media (width <= 768px) {
  .profile-page {
    @apply 'p-[12px]';
  }

  .profile-hero {
    @apply 'items-start';
  }

  .profile-hero,
  .profile-hero__body,
  .profile-hero__actions {
    @apply 'flex-col';
  }

  .profile-hero__actions {
    @apply 'items-stretch w-full';
  }

  .profile-hero__actions .el-button {
    width: 100%;
    margin-left: 0;
  }

  .profile-login__item {
    @apply '[grid-template-columns:40px_minmax(0,_1fr)]';
  }

  .profile-login__time {
    @apply '[grid-column:2] [justify-self:start]';
  }
}

@media (width <= 520px) {
  .profile-info__item {
    @apply '[grid-template-columns:1fr]';
  }

  .profile-info__item {
    @apply 'gap-[4px]';
  }
}
</style>
