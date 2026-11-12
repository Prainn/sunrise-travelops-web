<!-- OSS 归档图片/贴纸：图片先显示缩略图，点击才加载原图；贴纸直接显示原图（保留透明与动画），不可点击 -->
<template>
  <span class="oss-media" :class="{ 'is-sticker': mediaKind === 'sticker' }">
    <template v-if="displayUrl">
      <button
        v-if="canOpen"
        type="button"
        class="oss-media__frame oss-media__open"
        :style="frameStyle"
        :aria-label="$t('oss.media.viewOriginal')"
        :title="$t('oss.media.viewOriginal')"
        @click="viewerOpen = true"
      >
        <img
          :key="displayUrl"
          :src="displayUrl"
          :alt="alt"
          loading="lazy"
          decoding="async"
          referrerpolicy="no-referrer"
          class="oss-media__img"
          @error="failedUrl = displayUrl"
        />
      </button>
      <span v-else class="oss-media__frame" :style="frameStyle">
        <img
          :key="displayUrl"
          :src="displayUrl"
          :alt="alt"
          loading="lazy"
          decoding="async"
          referrerpolicy="no-referrer"
          class="oss-media__img"
          @error="failedUrl = displayUrl"
        />
      </span>
    </template>
    <span
      v-else
      class="oss-media__placeholder"
      :class="{ 'is-failed': status === 'failed' }"
      :style="placeholderStyle"
    >
      {{ placeholderText }}
    </span>
    <el-image-viewer
      v-if="viewerOpen && resource?.originalUrl"
      :url-list="[resource.originalUrl]"
      teleported
      hide-on-click-modal
      @close="viewerOpen = false"
    />
  </span>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { ossErrorKey, type OssResource, type OssResourceKind } from "@/types/oss";

const props = withDefaults(defineProps<{
  /** 尚未发现归档记录时为空，按处理中显示。 */
  resource?: OssResource;
  /** 资源为空时的类型。 */
  kind?: OssResourceKind;
  /** 最长边显示上限（px）。 */
  maxSize?: number;
}>(), { resource: undefined, kind: "image", maxSize: 240 });

const { t } = useI18n();
const failedUrl = ref<string>();
const viewerOpen = ref(false);

const mediaKind = computed(() => props.resource?.kind ?? props.kind);
const status = computed(() => {
  const state = props.resource?.state;
  if (!state || state === "pending" || state === "processing") return "processing";
  if (state === "failed") return "failed";
  if (state === "deleting") return "deleting";
  return "ready";
});
/** 图片只取缩略图，原图在打开大图时才请求；贴纸直接用原图。 */
const displayUrl = computed(() => {
  const resource = props.resource;
  if (!resource || resource.state !== "ready" || !resource.previewable) return undefined;
  const url = resource.kind === "sticker" ? resource.originalUrl : resource.thumbnailUrl;
  return url && url !== failedUrl.value ? url : undefined;
});
const canOpen = computed(() => !!props.resource?.clickable && props.resource.kind === "image" && !!props.resource.originalUrl);
const alt = computed(() => props.resource?.name || t(`oss.kinds.${mediaKind.value}`));
/** 按原始宽高比例占位，图片加载前后布局不跳动。 */
const frameStyle = computed(() => {
  const limit = mediaKind.value === "sticker" ? Math.min(props.maxSize, 140) : props.maxSize;
  const width = props.resource?.width;
  const height = props.resource?.height;
  if (!width || !height) return { width: `${limit}px`, height: `${limit}px` };
  const scale = Math.min(1, limit / Math.max(width, height));
  return { width: `${Math.max(24, Math.round(width * scale))}px`, aspectRatio: `${width} / ${height}` };
});
const placeholderStyle = computed(() => ({ minWidth: `${Math.min(props.maxSize, 140)}px` }));
const placeholderText = computed(() => {
  const kind = t(`oss.kinds.${mediaKind.value}`);
  if (status.value === "processing") return t("oss.media.processing", { kind });
  if (status.value === "deleting") return t("oss.media.deleting", { kind });
  if (status.value === "failed") return t("oss.media.failed", { kind, reason: t(ossErrorKey(props.resource?.errorCode)) });
  return t("oss.media.unavailable", { kind });
});

watch(() => props.resource?.id, () => {
  viewerOpen.value = false;
});
</script>

<style scoped lang="scss">
.oss-media {
  @apply inline-flex max-w-full align-top;

  &__frame {
    @apply block max-w-full overflow-hidden rounded-[8px] bg-[var(--el-fill-color)];
  }

  &.is-sticker &__frame {
    background: transparent;
  }

  &__open {
    @apply p-0 border-0 cursor-zoom-in focus-visible:outline-2 focus-visible:outline-[var(--el-color-primary)];
  }

  &__img {
    @apply block w-full h-full object-contain;
  }

  &__placeholder {
    @apply box-border inline-flex items-center justify-center min-h-[64px] px-[10px] py-[8px] rounded-[8px] border-dashed border-[1px] border-[var(--el-border-color)] text-[12px] text-muted text-center;

    &.is-failed {
      color: var(--el-color-danger);
    }
  }
}
</style>
