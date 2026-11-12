<!-- 输入框内的多图草稿：按顺序排列，逐张显示上传状态，可移除或手动重试 -->
<template>
  <div class="flex flex-wrap gap-[8px]">
    <div
      v-for="image in images"
      :key="image.key"
      class="image-draft"
      :class="{ 'is-failed': image.state === 'failed' }"
      :title="image.error || image.file?.name || image.asset?.name"
    >
      <img
        v-if="previewUrl(image)"
        :src="previewUrl(image)"
        :alt="image.file?.name ?? image.asset?.name ?? ''"
        referrerpolicy="no-referrer"
        class="block w-full h-full object-cover"
      />
      <span v-else class="grid place-items-center w-full h-full px-[4px] text-[11px] text-muted text-center break-all">
        {{ image.file?.name ?? image.asset?.name }}
      </span>
      <span v-if="image.state === 'waiting' || image.state === 'uploading'" class="image-draft__overlay">
        {{ $t(image.state === 'uploading' ? 'whatsapp.imageDraft.uploading' : 'whatsapp.imageDraft.waiting') }}
      </span>
      <span v-else-if="image.state === 'failed'" class="image-draft__overlay is-failed">
        <span class="line-clamp-2">{{ image.error }}</span>
        <button
          v-if="image.file"
          type="button"
          class="image-draft__retry"
          @click="emit('retry', image.key)"
        >
          {{ $t('whatsapp.imageDraft.reupload') }}
        </button>
      </span>
      <span
        v-if="isAnimatableImage(image.file?.type ?? image.asset?.mimeType)"
        class="image-draft__badge"
        :title="$t('whatsapp.imageDraft.animatedHint')"
      >
        {{ $t('whatsapp.imageDraft.staticBadge') }}
      </span>
      <button
        type="button"
        class="image-draft__remove"
        :aria-label="$t('whatsapp.imageDraft.remove')"
        :title="$t('whatsapp.imageDraft.remove')"
        @click="emit('remove', image.key)"
      >
        ×
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { isAnimatableImage } from "@/utils/image-file";
import type { DraftImage } from "../useImageDraft";

defineProps<{ images: DraftImage[] }>();
const emit = defineEmits<{ remove: [key: string]; retry: [key: string] }>();

/** 优先本地预览；恢复的草稿没有本地文件时使用已归档缩略图。 */
function previewUrl(image: DraftImage) {
  return image.objectUrl ?? (image.asset?.previewable ? image.asset.thumbnailUrl ?? undefined : undefined);
}
</script>

<style scoped lang="scss">
.image-draft {
  @apply relative box-border w-[104px] h-[78px] overflow-hidden rounded-[8px] border-solid border-[1px] border-[var(--el-border-color)] bg-[var(--el-fill-color-light)];

  &.is-failed {
    border-color: var(--el-color-danger);
  }

  &__overlay {
    @apply absolute inset-0 flex flex-col items-center justify-center gap-[2px] px-[6px] bg-[rgba(0,0,0,0.45)] text-[11px] leading-[14px] text-white text-center;

    &.is-failed {
      background: rgba(0, 0, 0, 0.62);
    }
  }

  &__retry {
    @apply p-0 border-0 bg-transparent text-[11px] text-white underline cursor-pointer;
  }

  &__badge {
    @apply absolute left-[4px] bottom-[4px] px-[4px] rounded-[3px] bg-[var(--el-color-warning)] text-[10px] leading-[16px] text-white;
  }

  &__remove {
    @apply absolute top-[3px] right-[3px] grid place-items-center w-[20px] h-[20px] p-0 border-0 rounded-full bg-[rgba(0,0,0,0.55)] text-[14px] leading-none text-white cursor-pointer;
    opacity: 0;

    &:focus-visible {
      opacity: 1;
      outline: 2px solid var(--el-color-primary);
    }
  }

  &:hover &__remove {
    opacity: 1;
  }

  @media (hover: none) {
    &__remove {
      opacity: 1;
    }
  }
}
</style>
