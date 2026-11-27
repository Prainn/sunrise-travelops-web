<template>
  <div class="flex flex-col gap-1">
    <el-tag class="self-start" :type="tagType">
      {{ $t(`integration.activity.${activity.state}`, { seconds: staleAfterSeconds }) }}
    </el-tag>
    <span class="text-muted text-[12px]">{{ $t('integration.lastSuccess') }}：{{ formatDateTime(activity.lastCompletedAt) }}</span>
    <span v-if="activity.lastErrorAt" class="text-muted text-[12px]">{{ $t('integration.lastError') }}：{{ formatDateTime(activity.lastErrorAt) }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { IntegrationActivity } from "@/types/integration";
import { formatDateTime } from "@/utils";

const props = defineProps<{ activity: IntegrationActivity; staleAfterSeconds: number }>();
const tagType = computed(() => {
  const { state } = props.activity;
  if (state === "running") return "success";
  if (state === "error" || state === "stalled") return "danger";
  if (state === "starting" || state === "paused") return "warning";
  return "info";
});
</script>
