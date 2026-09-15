<template>
  <el-tag
    v-if="library"
    :type="library === 'shengxu' ? 'primary' : 'success'"
    size="small"
  >
    {{ $t(`identity.libraries.${library}`) }}
  </el-tag>
</template>
<script setup lang="ts">
import type { ResourceLibrary } from "@/types/auth";
defineProps<{ library?: ResourceLibrary }>();
</script>
