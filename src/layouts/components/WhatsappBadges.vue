<template>
  <span v-if="notifications.canView" class="inline-flex shrink-0 items-center gap-1 ml-1" aria-live="polite">
    <el-badge
      v-if="notifications.counts?.unreadCount"
      :value="notifications.counts.unreadCount"
      :max="99"
      :title="t('whatsapp.notifications.unread', { count: notifications.counts.unreadCount })"
      :aria-label="t('whatsapp.notifications.unread', { count: notifications.counts.unreadCount })"
    />
    <el-badge
      v-if="notifications.counts?.unassignedCount"
      type="warning"
      :value="notifications.counts.unassignedCount"
      :max="99"
      :title="t('whatsapp.notifications.unassigned', { count: notifications.counts.unassignedCount })"
      :aria-label="t('whatsapp.notifications.unassigned', { count: notifications.counts.unassignedCount })"
    />
    <span
      v-if="notifications.hasError"
      :title="t('whatsapp.notifications.unavailable')"
      :aria-label="t('whatsapp.notifications.unavailable')"
      class="text-[var(--el-color-warning)]"
    >!</span>
  </span>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { useWhatsappNotificationsStore } from "@/stores/whatsapp-notifications";

const { t } = useI18n();
const notifications = useWhatsappNotificationsStore();
</script>
