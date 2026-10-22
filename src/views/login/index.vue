<template>
  <div
    class="login-page relative isolate flex min-h-[100svh] flex-col overflow-hidden bg-[var(--login-sky)] text-[var(--login-ink)] transition-colors duration-500"
    :class="{ 'login-page--lynxtour': activeBrand.scope !== 'shengxu', 'login-page--website': activeBrand.scope === 'website' }"
  >
    <div class="pointer-events-none absolute inset-0 z-[-1] overflow-hidden" aria-hidden="true">
      <div class="login-sun absolute right-[-70px] top-[120px] h-[340px] w-[340px] rounded-full transition-all duration-500" />
      <div class="login-orbit absolute right-[-230px] top-[80px] h-[650px] w-[650px] rounded-full rotate-[-25deg] scale-x-75" />
      <div class="login-orbit absolute right-[-145px] top-[85px] h-[650px] w-[650px] rounded-full rotate-[28deg] scale-x-[0.63]" />
      <div class="login-ridge absolute bottom-0 left-[-5%] right-[-5%] top-[36%] bg-[var(--login-land)] opacity-12 transition-transform duration-500" />
      <div class="login-ridge login-ridge--near absolute bottom-0 left-[-5%] right-[-5%] top-[53%] scale-x-[-1] bg-[var(--login-land)] opacity-20 transition-transform duration-500" />
      <div class="login-mist absolute inset-x-0 bottom-0 h-[30%]" />
    </div>

    <header class="mx-auto flex h-[112px] w-full shrink-0 max-w-[1536px] items-center justify-between gap-[16px] px-[20px] py-[22px] sm:px-[38px]">
      <div class="flex min-w-0 items-center gap-[16px]">
        <img
          :src="activeBrand.logo"
          :alt="activeBrand.name"
          class="shrink-0 object-contain dark:rounded-[8px] dark:bg-[var(--login-haze)] dark:p-[6px]"
          :class="activeBrand.scope === 'shengxu' ? 'h-[68px] w-[84px]' : 'h-[54px] w-[160px] sm:w-[195px]'"
        />
        <div class="hidden border-l border-l-[var(--login-line)] border-l-solid pl-[16px] text-[14px] tracking-[2px] sm:block">
          {{ activeBrand.name }}
          <span class="mt-[7px] block text-[10px] tracking-[2.5px] text-[var(--login-muted)]">
            {{ activeBrand.scope === "website" ? $t("login.brandDesign.websiteDomain") : $t("login.brandDesign.product") }}
          </span>
        </div>
      </div>
      <div class="flex shrink-0 items-center gap-[12px]">
        <!-- 总部是独立登录范围，以轻量入口与底部品牌卡片区分。 -->
        <button
          type="button"
          class="login-hq-option flex cursor-pointer items-center gap-[6px] rounded-full border border-[var(--login-line)] border-solid bg-[var(--login-paper)] px-[14px] py-[10px] text-[12px] tracking-[1px] text-[var(--login-muted)] transition-colors duration-200 disabled:cursor-wait"
          :aria-pressed="loginFormData.scope === 'headquarters'"
          :disabled="loading"
          @click="loginFormData.scope = 'headquarters'"
        >
          <el-icon aria-hidden="true">
            <OfficeBuilding />
          </el-icon>
          {{ $t("login.brandDesign.headquarters") }}
        </button>
        <div class="login-toolbar flex shrink-0 items-center gap-[20px] rounded-full bg-[var(--login-paper)] px-[17px] py-[13px]">
          <ThemeSwitch />
          <LangSelect size="text-18px" />
        </div>
      </div>
    </header>

    <main class="mx-auto grid w-full max-w-[1536px] grid-cols-1 items-center gap-[28px] px-[20px] py-[20px] sm:px-[38px] lg:min-h-[520px] lg:flex-1 lg:grid-cols-[minmax(0,1fr)_380px_minmax(0,1fr)] lg:gap-[30px] lg:py-[30px]">
      <!-- 叠放的品牌文案共同撑起最大高度，切换可见项时不挤动表单。 -->
      <div class="grid min-w-0 lg:self-start lg:pt-[65px]">
        <section
          v-for="brand in brands"
          :key="brand.scope"
          class="col-start-1 row-start-1 min-w-0 text-center lg:text-left"
          :class="{ invisible: activeBrand.scope !== brand.scope }"
          :aria-hidden="activeBrand.scope !== brand.scope"
          :aria-label="brand.name"
        >
          <div class="flex items-center justify-center gap-[12px] text-[11px] font-semibold leading-[1.7] tracking-[2px] text-[var(--login-accent)] lg:justify-start">
            <span class="h-px w-[26px] shrink-0 bg-[var(--login-accent)]" aria-hidden="true" />
            <span>{{ brand.englishName }}</span>
          </div>
          <h1
            class="login-hero-title my-[20px] whitespace-pre-line font-normal text-[var(--login-heading)]"
            :class="brand.scope === 'shengxu' ? 'text-[38px] leading-[1.3] tracking-[3px] xl:text-[48px]' : 'text-[24px] leading-[1.5] tracking-[0.2px] xl:text-[30px]'"
          >
            {{ brand.scope === "shengxu" ? $t("login.brandDesign.sunriseTitle") : $t("login.brandDesign.slogan") }}
          </h1>
          <p
            v-if="brand.scope === 'shengxu'"
            class="mb-[12px] mt-0 text-[16px] leading-[1.8] tracking-[1px] text-[var(--login-heading)]"
          >
            {{ $t("login.brandDesign.sunriseSlogan") }}
          </p>
          <p class="m-0 text-[12px] leading-[1.8] tracking-[1px] text-[var(--login-muted)]">
            {{ brand.description }}
          </p>
          <a
            v-if="brand.scope === 'website'"
            href="https://lynxtour.cn/"
            target="_blank"
            rel="noopener noreferrer"
            class="mt-[20px] inline-flex items-center gap-[12px] border-b border-b-[var(--login-accent)] border-b-solid pb-[5px] text-[12px] text-[var(--login-accent)]"
          >
            {{ $t("login.brandDesign.websiteDomain") }}
            <el-icon aria-hidden="true"><TopRight /></el-icon>
          </a>
        </section>
      </div>

      <section class="login-card mx-auto w-full max-w-[380px] rounded-[22px] bg-[var(--login-paper)] px-[26px] pb-[28px] pt-[30px] sm:px-[34px]" :aria-label="$t('login.login')">
        <div class="mb-[14px] flex items-center gap-[8px] text-[11px] font-semibold tracking-[1.5px] text-[var(--login-accent)]" aria-live="polite">
          <span class="h-[5px] w-[5px] shrink-0 rounded-full bg-[var(--login-accent)]" aria-hidden="true" />
          {{ $t("login.brandDesign.workspace", { name: selectedScopeName }) }}
        </div>
        <h2 class="m-0 text-[28px] font-semibold leading-[1.4] tracking-[1px]">
          {{ $t("login.welcomeBack") }}
        </h2>
        <p class="mb-[24px] mt-[8px] text-[12px] leading-[1.7] text-[var(--login-muted)]">
          {{ $t("login.brandDesign.welcome") }}
        </p>
        <el-form
          ref="loginFormRef"
          :model="loginFormData"
          :rules="loginRules"
          size="large"
          label-position="top"
          :validate-on-rule-change="false"
          @submit.prevent="handleLoginSubmit"
        >
          <el-form-item prop="username">
            <el-input
              v-model.trim="loginFormData.username"
              :placeholder="$t('common.username')"
              :aria-label="$t('common.username')"
              :prefix-icon="UserIcon"
              autocomplete="username"
            />
          </el-form-item>
          <el-tooltip :visible="isCapsLock" :content="$t('login.capsLock')" placement="right">
            <el-form-item prop="password">
              <el-input
                v-model="loginFormData.password"
                :placeholder="$t('login.password')"
                :aria-label="$t('login.password')"
                type="password"
                show-password
                autocomplete="current-password"
                :prefix-icon="LockIcon"
                @keyup="checkCapsLock"
              />
            </el-form-item>
          </el-tooltip>
          <div class="mb-[20px] mt-[3px] flex items-center text-[var(--login-muted)]">
            <el-checkbox v-model="loginFormData.rememberMe">
              {{ $t("login.rememberMe") }}
            </el-checkbox>
          </div>
          <el-button
            :loading="loading"
            type="primary"
            native-type="submit"
            size="large"
            class="login-submit min-h-[44px] w-full whitespace-normal rounded-[7px] py-[11px]"
          >
            <span class="min-w-0 whitespace-normal leading-[1.4]">{{ $t("login.brandDesign.signIn", { name: selectedScopeName }) }}</span>
            <el-icon class="ml-[12px]" aria-hidden="true">
              <Right />
            </el-icon>
          </el-button>
        </el-form>
        <div class="mt-[22px] text-center text-[10px] leading-[1.6] tracking-[1.8px] text-[var(--login-muted)]">
          {{ activeBrand.workspaceLabel }}
        </div>
      </section>

      <div class="hidden justify-self-end text-[10px] tracking-[5px] text-[var(--login-muted)] [writing-mode:vertical-rl] lg:block" aria-hidden="true">
        {{ $t("login.brandDesign.journey") }}
      </div>
    </main>

    <nav class="mx-auto grid w-full max-w-[1536px] grid-cols-1 gap-[12px] px-[20px] pt-[16px] sm:grid-cols-3 sm:px-[38px]" :aria-label="$t('login.brandDesign.switchBrand')">
      <button
        v-for="(brand, index) in brands"
        :key="brand.scope"
        type="button"
        class="login-brand-option flex min-h-[80px] w-full cursor-pointer items-center gap-[15px] rounded-[11px] border border-[var(--login-line)] border-solid bg-[var(--login-paper)] px-[20px] py-[16px] text-left text-[var(--login-ink)] transition-transform duration-200 enabled:hover:translate-y-[-2px] disabled:cursor-wait"
        :aria-pressed="loginFormData.scope === brand.scope"
        :disabled="loading"
        @click="loginFormData.scope = brand.scope"
      >
        <span class="login-brand-number shrink-0 text-[23px] italic text-[var(--login-muted)]" aria-hidden="true">{{ String(index + 1).padStart(2, "0") }}</span>
        <span class="min-w-0">
          <span class="block text-[13px] font-medium leading-[1.6]">{{ brand.optionLabel }}</span>
          <span class="mt-[5px] block text-[10px] leading-[1.7] tracking-[1px] text-[var(--login-muted)]">{{ brand.englishName }}</span>
        </span>
        <el-icon class="ml-auto shrink-0 text-[var(--login-muted)]" aria-hidden="true">
          <TopRight />
        </el-icon>
      </button>
    </nav>
    <footer class="mx-auto flex w-full max-w-[1536px] flex-wrap items-center justify-between gap-[12px] px-[20px] py-[24px] text-[10px] leading-[1.6] tracking-[1px] text-[var(--login-muted)] sm:px-[38px]">
      <span>{{ $t("login.brandDesign.platform") }}</span>
      <span>{{ activeBrand.englishName }}</span>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { Lock, OfficeBuilding, Right, TopRight, User } from "@element-plus/icons-vue";
import type { FormInstance } from "element-plus";
import type { LoginRequest } from "@/types/auth";
import router from "@/router";
import { useUserStore } from "@/stores/user";
import { AuthStorage } from "@/utils/auth-storage";
import ThemeSwitch from "@/components/ThemeSwitch/index.vue";
import sunriseLogo from "@/assets/images/login/sunrise-logo.png";
import lynxtourLogo from "@/assets/images/login/lynxtour-logo.svg";

defineOptions({ name: "LoginPage", inheritAttrs: false });

const userStore = useUserStore();
const { t } = useI18n();
const loginFormRef = ref<FormInstance>();
const loading = ref(false);
const isCapsLock = ref(false);
const UserIcon = markRaw(User);
const LockIcon = markRaw(Lock);
const loginFormData = ref<LoginRequest>({
  scope: "headquarters",
  username: "",
  password: "",
  rememberMe: AuthStorage.getRememberMe(),
});

const brands = computed(() => [
  {
    scope: "shengxu" as const,
    logo: sunriseLogo,
    name: t("login.brandDesign.sunriseName"),
    optionLabel: t("login.brandDesign.sunriseOption"),
    englishName: t("login.brandDesign.sunriseEnglish"),
    description: t("login.brandDesign.sunriseDescription"),
    workspaceLabel: t("login.brandDesign.sunriseWorkspace"),
  },
  {
    scope: "linxi" as const,
    logo: lynxtourLogo,
    name: t("login.brandDesign.linxiName"),
    optionLabel: t("login.brandDesign.linxiOption"),
    englishName: t("login.brandDesign.linxiEnglish"),
    description: t("login.brandDesign.linxiDescription"),
    workspaceLabel: t("login.brandDesign.linxiWorkspace"),
  },
  {
    scope: "website" as const,
    logo: lynxtourLogo,
    name: t("login.brandDesign.websiteName"),
    optionLabel: t("login.brandDesign.websiteOption"),
    englishName: t("login.brandDesign.websiteEnglish"),
    description: t("login.brandDesign.websiteDescription"),
    workspaceLabel: t("login.brandDesign.websiteWorkspace"),
  },
]);
// 总部是独立登录范围，仅复用盛旭视觉，不改变实际提交的 scope。
const activeBrand = computed(() => brands.value.find(brand => brand.scope === loginFormData.value.scope) ?? brands.value[0]!);
const selectedScopeName = computed(() => loginFormData.value.scope === "headquarters"
  ? t("login.brandDesign.headquarters")
  : activeBrand.value.name);
const loginRules = computed(() => ({
  username: [{ required: true, trigger: "blur", message: t("login.message.username.required") }],
  password: [
    { required: true, trigger: "blur", message: t("login.message.password.required") },
    { min: 6, message: t("login.message.password.min"), trigger: "blur" },
  ],
}));
/** 只接受站内路径，防止开放重定向。 */
function loginRedirectTarget(): string {
  const redirect = router.currentRoute.value.query.redirect;
  return typeof redirect === "string" &&
    redirect.startsWith("/") &&
    !redirect.startsWith("//") &&
    !redirect.startsWith("/\\") &&
    !/^\/login(?:[/?#]|$)/.test(redirect)
    ? redirect
    : "/";
}
async function handleLoginSubmit() {
  if (loading.value) return;
  const valid = await loginFormRef.value?.validate().then(
    () => true,
    () => false,
  );
  if (!valid) return;

  loading.value = true;
  let loggedIn = false;
  try {
    await userStore.login(loginFormData.value);
    loggedIn = true;
    await userStore.getUserInfo();
    await router.push(loginRedirectTarget());
  } catch (error) {
    if (!loggedIn) userStore.resetAllState();
    ElMessage.error(error instanceof Error ? error.message : t("login.failed"));
    if (loggedIn && userStore.isLoggedIn()) {
      await router.replace({ path: "/unavailable", query: { redirect: "/" } });
    }
  } finally {
    loading.value = false;
  }
}

function checkCapsLock(event: KeyboardEvent) {
  if (event instanceof KeyboardEvent) {
    isCapsLock.value = event.getModifierState("CapsLock");
  }
}
</script>

<style lang="scss" scoped>
.login-page {
  --login-accent: #086eaa;
  --login-heading: #17445c;
  --login-land: #538782;
  --login-haze: #dfeccf;
  --login-sky: #eef5f5;
  --login-paper: #fff;
  --login-ink: #223944;
  --login-muted: #657a82;
  --login-line: #dce5e8;
  --login-field: #fbfcfc;
  --el-color-primary: var(--login-accent);
  --el-color-primary-light-3: color-mix(in srgb, var(--login-accent) 75%, var(--login-paper));
  --el-color-primary-light-5: color-mix(in srgb, var(--login-accent) 55%, var(--login-paper));
  --el-color-primary-light-7: color-mix(in srgb, var(--login-accent) 30%, var(--login-paper));
  --el-color-primary-light-9: color-mix(in srgb, var(--login-accent) 10%, var(--login-paper));
  --el-color-primary-dark-2: color-mix(in srgb, var(--login-accent) 85%, #000);

  &--lynxtour {
    --login-accent: #811e21;
    --login-heading: #622f2d;
    --login-land: #9e7063;
    --login-haze: #ecd2a9;
    --login-sky: #f5eee4;
    --login-paper: #fffdf9;
    --login-ink: #492f2c;
    --login-muted: #896e65;
    --login-line: #e9ddd0;
    --login-field: #fdfbf7;
  }
}

.dark .login-page {
  --login-accent: #78c8ec;
  --login-heading: #d4e9ec;
  --login-sky: #162b34;
  --login-paper: #20343c;
  --login-ink: #ecf3f4;
  --login-muted: #b2c3c9;
  --login-line: #496068;
  --login-field: #293f49;

  &--lynxtour {
    --login-accent: #e9b090;
    --login-heading: #f0d0ba;
    --login-sky: #302423;
    --login-paper: #3a2c2a;
    --login-ink: #f6eae0;
    --login-muted: #ceb5a6;
    --login-line: #67504a;
    --login-field: #45332f;
  }

  .login-sun { opacity: 0.18; }
  .login-submit { --el-color-white: var(--login-sky); }
}

.login-sun {
  background: radial-gradient(circle at 40% 30%, #fdf6d3 0%, var(--login-haze) 60%, transparent 71%);
}

.login-page--website .login-sun {
  @apply 'right-[15px] top-[130px] h-[295px] w-[295px]';
  background: radial-gradient(circle, #f9e6be 0%, #dcb176 68%, transparent 69%);
  opacity: 0.45;
}

.login-orbit { border: 1px solid color-mix(in srgb, var(--login-accent) 14%, transparent); }
.login-ridge { clip-path: polygon(0 48%, 9% 40%, 15% 45%, 28% 14%, 33% 22%, 42% 0, 49% 20%, 56% 13%, 70% 44%, 79% 23%, 88% 35%, 100% 10%, 100% 100%, 0 100%); }
.login-ridge--near { clip-path: polygon(0 42%, 10% 27%, 23% 53%, 34% 19%, 47% 36%, 60% 12%, 76% 48%, 89% 25%, 100% 40%, 100% 100%, 0 100%); }
.login-page--website .login-ridge { translate: 0 36px; }
.login-page--website .login-ridge--near { translate: 0 -30px; }
.login-mist { background: linear-gradient(transparent, var(--login-sky) 75%); }
.login-hero-title, .login-brand-number { font-family: Georgia, "Songti SC", serif; }
.login-card {
  border-top: 3px solid var(--login-accent);
  box-shadow: 0 20px 70px rgb(36 56 50 / 7%);

  :deep(.el-form-item) { margin-bottom: 18px; }
  :deep(.el-form-item__label) {
    height: auto;
    margin-bottom: 8px;
    font-size: 12px;
    color: var(--login-muted);
    line-height: 1.5;
  }
  :deep(.el-input__wrapper), :deep(.el-select__wrapper) {
    min-height: 44px;
    background: var(--login-field);
    --el-fill-color-blank: var(--login-field);
    --el-border-color: var(--login-line);
    --el-text-color-regular: var(--login-ink);
    --el-text-color-placeholder: var(--login-muted);
  }
  :deep(.el-checkbox) {
    --el-checkbox-text-color: var(--login-muted);
    --el-checkbox-input-border: 1px solid var(--login-line);
    --el-checkbox-bg-color: var(--login-field);
  }
}
.login-submit.el-button {
  height: auto;
  :deep(> span) { min-width: 0; }
  box-shadow: 0 6px 15px color-mix(in srgb, var(--login-accent) 12%, transparent);
}
.login-brand-option[aria-pressed="true"] {
  border-color: var(--login-accent);
  box-shadow: inset 0 -3px var(--login-accent);
  .login-brand-number, .el-icon { color: var(--login-accent); }
}
.login-hq-option:enabled:hover, .login-hq-option[aria-pressed="true"] {
  border-color: var(--login-accent);
  color: var(--login-accent);
}
.login-toolbar :deep(.el-dropdown) { color: var(--login-ink); }
@media (prefers-reduced-motion: reduce) {
  .login-page, .login-page * { transition: none !important; }
}
</style>
