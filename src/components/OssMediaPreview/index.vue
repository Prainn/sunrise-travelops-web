<!-- OSS 归档图片/贴纸：图片先显示缩略图，点击才加载原图；贴纸直接显示原图（保留透明与动画），不可点击 -->
<template>
  <span ref="previewFrame" class="oss-media" :class="{ 'is-sticker': mediaKind === 'sticker' }">
    <template v-if="displayUrl">
      <button
        v-if="canOpen"
        type="button"
        class="oss-media__frame oss-media__open"
        :style="frameStyle"
        :aria-label="viewLabel"
        :title="viewLabel"
        :aria-busy="!!viewerRequest"
        @click="openViewer"
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
      :class="{ 'is-failed': status === 'failed', 'is-compact': compact }"
      :style="placeholderStyle"
      :title="compact && status === 'failed' ? placeholderText : undefined"
      :aria-label="compact && status === 'failed' ? placeholderText : undefined"
      :role="compact && status === 'failed' ? 'img' : undefined"
    >
      <el-icon v-if="compact && status === 'failed'" :size="20" aria-hidden="true">
        <CircleCloseFilled />
      </el-icon>
      <template v-else>{{ placeholderText }}</template>
    </span>
    <el-image-viewer
      v-if="viewerUrl"
      :url-list="[viewerUrl]"
      teleported
      hide-on-click-modal
      @close="closeViewer"
    />
  </span>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from "vue";
import { useIntersectionObserver } from "@vueuse/core";
import { ElMessage } from "element-plus";
import { CircleCloseFilled } from "@element-plus/icons-vue";
import { useI18n } from "vue-i18n";
import { ossErrorKey, type OssResource, type OssResourceKind } from "@/types/oss";
import { recordClientOperation } from "@/utils/client-operation-log";

const props = withDefaults(defineProps<{
  /** 尚未发现归档记录时为空，按处理中显示。 */
  resource?: Pick<OssResource, "id" | "kind" | "name" | "state" | "previewable" | "clickable" | "width" | "height" | "errorCode" | "originalUrl" | "thumbnailUrl">;
  loadImage?: (size: "thumbnail" | "large", signal: AbortSignal) => Promise<Blob>;
  /** 资源为空时的类型。 */
  kind?: OssResourceKind;
  /** 最长边显示上限（px）。 */
  maxSize?: number;
  /** 紧凑模式（如表格缩略图列）：失败占位仅显示错误图标，完整原因通过 title 提示。 */
  compact?: boolean;
}>(), { resource: undefined, loadImage: undefined, kind: "image", maxSize: 240, compact: false });

const { t } = useI18n();
const failedUrl = ref<string>();
const previewFrame = ref<HTMLElement>();
const hasEnteredViewport = ref(false);
const privateThumbnail = ref<string>();
const loadingThumbnail = ref(false);
const viewerUrl = ref<string>();
const viewerRequest = ref<AbortController>();

useIntersectionObserver(
  () => props.loadImage && !hasEnteredViewport.value ? previewFrame.value : undefined,
  ([entry]) => {
    if (entry?.isIntersecting) hasEnteredViewport.value = true;
  },
);

const mediaKind = computed(() => props.resource?.kind ?? props.kind);
const status = computed(() => {
  const state = props.resource?.state;
  if (props.loadImage && props.resource?.previewable && (!hasEnteredViewport.value || loadingThumbnail.value)) return "processing";
  if (!state || state === "pending" || state === "processing") return "processing";
  if (state === "failed") return "failed";
  if (state === "deleting") return "deleting";
  return "ready";
});
/** 图片只取缩略图，原图在打开大图时才请求；贴纸直接用原图。 */
const displayUrl = computed(() => {
  const resource = props.resource;
  if (!resource || resource.state !== "ready" || !resource.previewable) return undefined;
  const url = props.loadImage ? privateThumbnail.value : resource.kind === "sticker" ? resource.originalUrl : resource.thumbnailUrl;
  return url && url !== failedUrl.value ? url : undefined;
});
const canOpen = computed(() => !!props.resource?.clickable && props.resource.kind === "image" && !!(props.loadImage || props.resource.originalUrl));
const viewLabel = computed(() => t(props.loadImage ? "oss.preview" : "oss.media.viewOriginal"));
const alt = computed(() => props.resource?.name || t(`oss.kinds.${mediaKind.value}`));
/** 按原始宽高比例占位，同时将宽高限制在最小可点击尺寸与 maxSize 之间，避免极端长图撑高行或窄成细线。 */
const frameStyle = computed(() => {
  const limit = mediaKind.value === "sticker" ? Math.min(props.maxSize, 140) : props.maxSize;
  const width = props.resource?.width;
  const height = props.resource?.height;
  if (!width || !height) return { width: `${limit}px`, height: `${limit}px` };
  const scale = Math.min(1, limit / Math.max(width, height));
  const clampedWidth = Math.max(24, Math.round(width * scale));
  const clampedHeight = Math.max(24, Math.round(height * scale));
  return {
    width: `${clampedWidth}px`,
    maxHeight: `${limit}px`,
    aspectRatio: `${clampedWidth} / ${clampedHeight}`,
  };
});
const placeholderStyle = computed(() => (
  props.compact && status.value === "failed"
    ? { width: `${props.maxSize}px`, height: `${props.maxSize}px` }
    : { minWidth: `${Math.min(props.maxSize, 140)}px` }
));
const placeholderText = computed(() => {
  const kind = t(`oss.kinds.${mediaKind.value}`);
  if (status.value === "processing") return t("oss.media.processing", { kind });
  if (status.value === "deleting") return t("oss.media.deleting", { kind });
  if (status.value === "failed") return t("oss.media.failed", { kind, reason: t(ossErrorKey(props.resource?.errorCode)) });
  return t("oss.media.unavailable", { kind });
});

watch([hasEnteredViewport, () => props.resource?.id, () => props.resource?.previewable], ([visible, , previewable], _, onCleanup) => {
  const load = props.loadImage;
  if (!visible || !previewable || !load) return;
  const controller = new AbortController();
  loadingThumbnail.value = true;
  onCleanup(() => {
    controller.abort();
    if (privateThumbnail.value) URL.revokeObjectURL(privateThumbnail.value);
    privateThumbnail.value = undefined;
    loadingThumbnail.value = false;
  });
  void load("thumbnail", controller.signal).then((image) => {
    if (!controller.signal.aborted) privateThumbnail.value = URL.createObjectURL(image);
  }).catch(() => {
    // The preview cell falls back to its existing unavailable state.
  }).finally(() => {
    if (!controller.signal.aborted) loadingThumbnail.value = false;
  });
}, { immediate: true });

function clearViewer() {
  viewerRequest.value?.abort();
  viewerRequest.value = undefined;
  if (viewerUrl.value?.startsWith("blob:")) URL.revokeObjectURL(viewerUrl.value);
  viewerUrl.value = undefined;
}

watch(() => props.resource?.id, clearViewer);
onBeforeUnmount(clearViewer);

async function openViewer() {
  if (viewerRequest.value) return;
  if (props.loadImage) {
    const controller = new AbortController();
    viewerRequest.value = controller;
    try {
      const image = await props.loadImage("large", controller.signal);
      if (controller.signal.aborted) return;
      viewerUrl.value = URL.createObjectURL(image);
    } catch {
      if (!controller.signal.aborted) ElMessage.error(t("oss.media.unavailable", { kind: t("oss.kinds.image") }));
      return;
    } finally {
      if (viewerRequest.value === controller) viewerRequest.value = undefined;
    }
  } else {
    viewerUrl.value = props.resource?.originalUrl ?? undefined;
  }
  recordClientOperation({
    action: "preview",
    result: "success",
    recordId: props.resource?.id,
  });
}

function closeViewer() {
  clearViewer();
  recordClientOperation({
    action: "close",
    result: "success",
    recordId: props.resource?.id,
  });
}
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
    @apply box-border inline-flex items-center justify-center max-w-full min-h-[64px] px-[10px] py-[8px] rounded-[8px] border-dashed border-[1px] border-[var(--el-border-color)] text-[12px] text-muted text-center;

    &.is-failed {
      color: var(--el-color-danger);
    }

    &.is-compact.is-failed {
      @apply p-0;
    }
  }
}
</style>
