<template>
  <div class="min-w-0 pl-[9px] py-[4px] border-l-solid border-l-[3px] border-l-[var(--el-color-primary)] text-[12px]">
    <div class="font-medium text-[var(--el-color-primary)]">
      {{ $t(`whatsapp.sources.${reply.source}`) }}
    </div>
    <div class="line-clamp-2 text-[var(--el-text-color-regular)]" :title="reply.text">
      <MessageText v-if="reply.text" :text="reply.text" />
      <span v-else>{{ $t('whatsapp.attachment') }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { WhatsappReply } from "@/types/whatsapp";
import MessageText from "./MessageText.vue";

defineProps<{ reply: WhatsappReply }>();
</script>
