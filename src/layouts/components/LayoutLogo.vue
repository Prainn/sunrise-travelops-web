<template>
  <div class="layout-logo">
    <transition enter-active-class="animate__animated animate__fadeInLeft">
      <router-link
        :key="+collapse"
        class="wh-full flex-center"
        to="/"
      >
        <img
          v-if="userStore.userInfo.scope === 'shengxu'"
          :src="logo"
          class="layout-logo__image"
          alt="Sunrise"
        />
        <span
          v-if="!collapse || userStore.userInfo.scope !== 'shengxu'"
          class="layout-logo__title"
        >
          {{ brandTitle }}
        </span>
      </router-link>
    </transition>
  </div>
</template>

<script lang="ts" setup>
import { computed } from "vue";
import { useUserStore } from "@/stores/user";
import logo from "@/assets/images/logo-emblem.png";
const userStore = useUserStore();
const brandTitle = computed(() => {
  switch (userStore.userInfo.scope) {
    case "shengxu": return "Sunrise";
    case "linxi": return "Ttrip";
    case "website": return "Lynx";
    default: return "总部";
  }
});

defineProps({
  collapse: {
    type: Boolean,
    required: true,
  },
});
</script>

<style lang="scss" scoped>
.layout-logo {
  @apply 'w-full';
  height: $navbar-height;
  background-color: $sidebar-logo-background;

  &__image {
    @apply 'w-[38px] h-[38px] object-contain';
  }

  &__title {
    @apply 'shrink-0 ml-[10px] text-[14px] [font-weight:bold]';
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

  .layout-logo__title {
    @apply 'ml-0';
  }
}
</style>
