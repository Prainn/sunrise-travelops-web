import { computed, onScopeDispose, shallowRef, watch } from "vue";
import { ApiError } from "@/api/request";
import { translate } from "@/lang/utils";
import { websiteErrorMessage } from "@/services/website.service";
import { whatsappService } from "@/services/whatsapp.service";
import type { OssResource } from "@/types/oss";
import { validateImageFile, type ImageFileError } from "@/utils/image-file";

/** 单次草稿最多图片数，与批量发送接口一致。 */
export const MAX_DRAFT_IMAGES = 10;

/** 发送图片只需要的上传结果字段；不提交 URL、objectKey 或环境。 */
export type DraftImageAsset = Pick<OssResource, "id" | "name" | "mimeType" | "thumbnailUrl" | "previewable">;

export interface DraftImage {
  key: string;
  /** 本地文件；没有文件的条目无法重新上传。 */
  file?: File;
  objectUrl?: string;
  asset?: DraftImageAsset;
  /** waiting：排队等待上传；failed：需手动重试。 */
  state: "waiting" | "uploading" | "ready" | "failed";
  error: string;
}

/** 恢复草稿的条目；expired 表示服务端资源已清理，需要用本地文件重新上传。 */
export interface RestoredImage {
  file?: File;
  asset: DraftImageAsset;
  expired: boolean;
}

export interface AddImagesResult {
  added: number;
  /** 超出张数上限未加入的数量。 */
  overflow: number;
  invalid: ImageFileError[];
}

/**
 * 会话多图草稿：按选择或粘贴顺序追加，逐张串行上传，只有用户点击发送才创建消息。
 * 上传没有幂等键，失败保留预览并由用户手动重试，不自动循环上传；
 * 切换会话、移除或卸载时释放本地预览地址并丢弃过期的上传回调。
 *
 * @param conversationId - 当前会话 ID。
 * @returns 草稿状态与操作。
 */
export function useImageDraft(conversationId: () => string) {
  const images = shallowRef<DraftImage[]>([]);
  let generation = 0;
  let sequence = 0;
  let running = false;

  const isFull = computed(() => images.value.length >= MAX_DRAFT_IMAGES);
  const isReady = computed(() => images.value.length > 0 && images.value.every((image) => image.state === "ready"));

  function patch(key: string, change: Partial<DraftImage>) {
    images.value = images.value.map((image) => (image.key === key ? { ...image, ...change } : image));
  }

  function release(image: DraftImage) {
    if (image.objectUrl) URL.revokeObjectURL(image.objectUrl);
  }

  function clear() {
    generation++;
    running = false;
    images.value.forEach(release);
    images.value = [];
  }

  function remove(key: string) {
    const image = images.value.find((item) => item.key === key);
    if (!image) return;
    release(image);
    images.value = images.value.filter((item) => item.key !== key);
  }

  function createImage(change: Omit<DraftImage, "key">): DraftImage {
    return { key: `draft-image-${++sequence}`, ...change };
  }

  /**
   * 追加图片并排队上传；不合格的文件跳过，超过上限的部分不加入。
   *
   * @param files - 按用户选择或粘贴顺序排列的图片。
   * @returns 加入、超限与不合格情况，由调用方提示。
   */
  function add(files: File[]): AddImagesResult {
    const result: AddImagesResult = { added: 0, overflow: 0, invalid: [] };
    const next = [...images.value];
    for (const file of files) {
      const error = validateImageFile(file);
      if (error) {
        result.invalid.push(error);
        continue;
      }
      if (next.length >= MAX_DRAFT_IMAGES) {
        result.overflow++;
        continue;
      }
      next.push(createImage({ file, objectUrl: URL.createObjectURL(file), state: "waiting", error: "" }));
      result.added++;
    }
    images.value = next;
    void drain();
    return result;
  }

  /** 恢复被拒绝的发送；已过期的资源保留本地文件并标记失败，由用户重新上传。 */
  function restore(items: RestoredImage[]) {
    clear();
    images.value = items.slice(0, MAX_DRAFT_IMAGES).map((item) => {
      const objectUrl = item.file ? URL.createObjectURL(item.file) : undefined;
      if (!item.expired) return createImage({ file: item.file, objectUrl, asset: item.asset, state: "ready", error: "" });
      return createImage({
        file: item.file,
        objectUrl,
        state: "failed",
        error: translate(item.file ? "whatsapp.imageDraft.expired" : "whatsapp.imageDraft.expiredNoFile"),
      });
    });
  }

  /** 手动重试一张失败的图片。 */
  function retry(key: string) {
    const image = images.value.find((item) => item.key === key);
    if (!image?.file || image.state !== "failed") return;
    patch(key, { state: "waiting", error: "" });
    void drain();
  }

  /** 逐张上传，避免并行占满服务端单图处理能力；身份或会话变化后丢弃回调。 */
  async function drain() {
    if (running) return;
    running = true;
    const currentGeneration = generation;
    const id = conversationId();
    try {
      for (;;) {
        const next = images.value.find((image) => image.state === "waiting");
        if (!next?.file) break;
        patch(next.key, { state: "uploading", error: "" });
        try {
          const asset = await whatsappService.uploadImage(id, next.file);
          if (currentGeneration !== generation) return;
          patch(next.key, { state: "ready", asset });
        } catch (cause) {
          if (currentGeneration !== generation) return;
          patch(next.key, { state: "failed", error: uploadErrorMessage(cause) });
        }
      }
    } finally {
      if (currentGeneration === generation) running = false;
    }
  }

  watch(conversationId, clear);
  onScopeDispose(clear);

  return { images, isFull, isReady, add, restore, retry, remove, clear };
}

function uploadErrorMessage(cause: unknown) {
  if (cause instanceof ApiError && cause.status === 413) return translate("whatsapp.imageDraft.tooLarge");
  return websiteErrorMessage(cause);
}
