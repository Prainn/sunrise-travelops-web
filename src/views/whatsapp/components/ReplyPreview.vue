<template>
  <div class="flex items-center gap-[8px] min-w-0 pl-[9px] py-[4px] border-l-solid border-l-[3px] border-l-[var(--el-color-primary)] text-[12px]">
    <div class="flex-1 min-w-0">
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
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import type { WhatsappReply } from "@/types/whatsapp";
import MessageText from "./MessageText.vue";

const props = defineProps<{ reply: WhatsappReply }>();
const failedUrl = ref<string>();
const thumbnailUrl = computed(() => {
  const url = props.reply.kind === "image" ? props.reply.thumbnailUrl : null;
  return url && url !== failedUrl.value ? url : undefined;
});
</script>
