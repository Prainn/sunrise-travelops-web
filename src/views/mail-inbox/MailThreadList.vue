<template>
  <ul class="m-0 list-none px-[12px] py-0" role="list" :aria-label="$t('mail.threadList')">
    <li v-for="thread in threads" :key="thread.id">
      <InboxThreadRow
        :selected="thread.id === selected"
        :title="thread.customerName || thread.customerEmail"
        :title-hint="thread.customerEmail"
        :time="thread.lastAt"
        shanghai-time
        :unread="thread.unreadCount"
        :owner="thread.ownerName"
        :unassigned="!thread.ownerId"
        :mailbox="showMailbox ? thread.mailbox : undefined"
        @click="emit('select', thread.id)"
      >
        {{ thread.subject || $t("mail.noSubject") }}
      </InboxThreadRow>
    </li>
  </ul>
</template>

<script setup lang="ts">
import InboxThreadRow from "@/views/website-inquiries/components/InboxThreadRow.vue";
import type { MailThread } from "@/types/mail";

defineProps<{ threads: MailThread[]; selected?: string; showMailbox: boolean }>();
const emit = defineEmits<{ select: [id: string] }>();
</script>
