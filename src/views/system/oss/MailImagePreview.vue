<template>
  <OssMediaPreview
    :resource="{ ...attachment, kind: 'image' }"
    :load-image="loadImage"
    :max-size="compact ? 64 : 360"
    :compact="compact"
  />
</template>

<script setup lang="ts">
import OssMediaPreview from "@/components/OssMediaPreview/index.vue";
import { mailService } from "@/services/mail.service";
import type { OssMailAttachment } from "@/types/oss";

const props = defineProps<{ attachment: OssMailAttachment; compact?: boolean }>();

function loadImage(size: "thumbnail" | "large", signal: AbortSignal) {
  return mailService.imagePreview(props.attachment.mailThreadId, props.attachment.id, size, signal);
}
</script>
