<template>
  <div class="layout-logo">
    <transition enter-active-class="animate__animated animate__fadeInLeft">
      <router-link
        :key="+collapse"
        class="wh-full flex-center gap-[10px] px-[8px]"
        to="/"
        :aria-label="brandTitle"
        :title="brandTitle"
      >
        <img
          :src="brandLogo"
          class="h-[38px] shrink-0 object-contain"
          :class="!collapse && isLynxtour ? 'w-[72px]' : 'w-[38px]'"
          :alt="brandTitle"
        />
        <span v-if="!collapse" class="layout-logo__title min-w-0 truncate text-[14px] font-bold">
          {{ brandTitle }}
        </span>
      </router-link>
    </transition>
  </div>
</template>

<script lang="ts" setup>
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { useUserStore } from "@/stores/user";
import sunriseLogo from "@/assets/images/login/sunrise-logo.png";
import lynxtourLogo from "@/assets/images/login/lynxtour-logo.svg";

defineProps<{ collapse: boolean }>();

const { t } = useI18n();
const userStore = useUserStore();
const isLynxtour = computed(
  () => userStore.userInfo.scope === "linxi" || userStore.userInfo.scope === "website"
);
const brandLogo = computed(() => (isLynxtour.value ? lynxtourLogo : sunriseLogo));
const brandTitle = computed(() =>
  t(isLynxtour.value ? "login.brandDesign.linxiName" : "login.brandDesign.sunriseName")
);
</script>

<style lang="scss" scoped>
.layout-logo {
  @apply 'w-full';
  height: $navbar-height;
  background-color: $sidebar-logo-background;

  &__title {
    color: $sidebar-logo-text-color;
  }
}
</style>

<style lang="scss">
.layout-root.layout--top,
.layout-root.layout--mix {
  .layout-logo {
    @apply '!bg-[transparent]';

    &__title {
      color: var(--menu-text);
    }
  }
}

.layout-root.is-sidebar-open {
  &.layout--top .layout-header__left .layout-logo,
  &.layout--mix .layout-header__logo .layout-logo {
    width: $sidebar-width;
  }
}

.layout-root.is-sidebar-collapsed {
  &.layout--top .layout-header__left .layout-logo,
  &.layout--mix .layout-header__logo .layout-logo {
    width: $sidebar-width-collapsed;
  }
}
</style>
