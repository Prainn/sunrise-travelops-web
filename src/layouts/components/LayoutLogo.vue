<template>
  <div class="layout-logo">
    <transition enter-active-class="animate__animated animate__fadeInLeft">
      <router-link
        :key="+collapse"
        class="wh-full flex-center"
        to="/"
      >
        <img
          :src="logo"
          class="layout-logo__image"
          alt="Sunrise TravelOps"
        />
        <span
          v-if="!collapse"
          class="layout-logo__title"
        >
          {{ appConfig.title }}
        </span>
      </router-link>
    </transition>
  </div>
</template>

<script lang="ts" setup>
import { appConfig } from "@/settings";
import logo from "@/assets/images/logo-emblem.png";

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
    @apply 'hidden';
  }
}
</style>
