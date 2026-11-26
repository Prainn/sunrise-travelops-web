<template>
  <ul class="mail-list m-0 list-none p-0" role="list" :aria-label="$t('mail.threadList')">
    <li v-for="thread in threads" :key="thread.id">
      <button
        type="button"
        class="mail-list__row"
        :aria-current="thread.id === selected ? 'true' : undefined"
        @click="emit('select', thread.id)"
      >
        <span class="mail-list__avatar" aria-hidden="true">
          {{ (thread.customerName || thread.customerEmail).trim().charAt(0).toUpperCase() }}
        </span>
        <span class="flex min-w-0 flex-1 flex-col gap-1">
          <span class="flex items-baseline justify-between gap-2">
            <span class="truncate font-600" :title="thread.customerEmail">
              {{ thread.customerName || thread.customerEmail }}
            </span>
            <time class="shrink-0 text-xs text-muted" :datetime="thread.lastAt">
              <span class="sr-only">{{ $t("mail.lastAt") }}</span>
              {{ formatShanghaiDateTime(thread.lastAt) }}
            </time>
          </span>
          <span class="truncate" :class="{ 'font-600': thread.unreadCount }">
            {{ thread.subject || $t("mail.noSubject") }}
          </span>
          <span class="flex items-center justify-between gap-2 text-xs text-muted">
            <span class="truncate">{{ thread.ownerName || $t("whatsapp.views.unassigned") }}</span>
            <span v-if="thread.unreadCount" class="shrink-0 text-[var(--el-color-primary)]">
              {{ $t("mail.unread", { count: thread.unreadCount }) }}
            </span>
          </span>
          <span v-if="showMailbox" class="truncate text-xs text-muted">{{ thread.mailbox }}</span>
        </span>
      </button>
    </li>
  </ul>
</template>

<script setup lang="ts">
import type { MailThread } from "@/types/mail";
import { formatShanghaiDateTime } from "@/utils/format";

defineProps<{ threads: MailThread[]; selected?: string; showMailbox: boolean }>();
const emit = defineEmits<{ select: [id: string] }>();
</script>

<style scoped lang="scss">
.mail-list__row {
  @apply flex w-full cursor-pointer items-start gap-3 border-0 bg-transparent text-left text-sm;
  padding: 12px var(--section-padding);
  font-family: inherit;
  color: var(--el-text-color-primary);
  border-block-end: 1px solid var(--divider-color);
  border-inline-start: 3px solid transparent;

  &:hover { background: var(--surface-hover); }
  &[aria-current="true"] {
    background: var(--el-color-primary-light-9);
    border-inline-start-color: var(--el-color-primary);
  }
  &:focus-visible {
    outline: 2px solid var(--el-color-primary);
    outline-offset: -3px;
  }
}

.mail-list__avatar {
  @apply grid h-8 w-8 shrink-0 place-items-center rounded-full font-600;
  color: var(--el-text-color-regular);
  background: var(--el-fill-color);
}
</style>
