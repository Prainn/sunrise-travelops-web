<template>
  <div
    class="fullscreen-trigger"
    @click="toggle"
  >
    <div :class="`i-svg:` + (isFullscreen ? 'fullscreen-exit' : 'fullscreen')" />
  </div>
</template>

<script setup lang="ts">
const { isFullscreen, toggle } = useFullscreen();
</script>

<style lang="scss" scoped>
.fullscreen-trigger {
  @apply 'flex items-center justify-center w-full h-full';
}
</style>
