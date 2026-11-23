<template>
  <div class="relative flex items-center gap-[8px] min-w-0 pl-[9px] py-[4px] border-l-solid border-l-[3px] border-l-[var(--el-color-primary)] text-[12px]">
    <div :id="jumpable ? previewId : undefined" class="flex-1 min-w-0">
      <div class="font-medium text-[var(--el-color-primary)]">
        {{ $t(`whatsapp.sources.${reply.source}`) }}
      </div>
      <div class="line-clamp-2 text-[var(--el-text-color-regular)]" :title="reply.text">
        <MessageText v-if="reply.text" :text="reply.text" />
        <span v-else>{{ $t(reply.kind === 'image' ? 'oss.kinds.image' : 'whatsapp.attachment') }}</span>
      </div>
    </div>
    <!-- 只显示服务端缩略图；缺失或加载失败保留正文，不请求原图或供应商旧链接 -->
    <img
      v-if="thumbnailUrl"
      :key="thumbnailUrl"
      :src="thumbnailUrl"
      alt=""
      loading="lazy"
      referrerpolicy="no-referrer"
      class="block shrink-0 w-[40px] h-[40px] rounded-[4px] object-cover bg-[var(--el-fill-color)]"
      @error="failedUrl = thumbnailUrl"
    />
    <button
      v-if="jumpable"
      type="button"
      class="absolute inset-0 p-0 border-0 bg-transparent rounded-[4px] hover:shadow-[inset_0_0_0_1px_var(--el-color-primary-light-5)] focus-visible:outline-2 focus-visible:outline-[var(--el-color-primary)]"
      :class="isLocating ? 'cursor-progress' : 'cursor-pointer'"
      :aria-label="$t('whatsapp.jumpToQuotedMessage')"
      :aria-describedby="previewId"
      :aria-busy="isLocating"
      :title="$t('whatsapp.jumpToQuotedMessage')"
      @click="emit('jump', reply.id)"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, useId } from "vue";
import type { WhatsappReply } from "@/types/whatsapp";
import MessageText from "./MessageText.vue";

const props = defineProps<{ reply: WhatsappReply; jumpable?: boolean; isLocating?: boolean }>();
const emit = defineEmits<{ jump: [messageId: string] }>();
const previewId = useId();
const failedUrl = ref<string>();
const thumbnailUrl = computed(() => {
  const url = props.reply.kind === "image" ? props.reply.thumbnailUrl : null;
  return url && url !== failedUrl.value ? url : undefined;
});
</script>
