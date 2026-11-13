/** 上传图片接受的 MIME 类型；不接受 SVG/HEIC，服务端仍校验实际内容。 */
export const IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
/** 文件选择框 accept，明确列出类型与扩展名。 */
export const IMAGE_ACCEPT = [...IMAGE_MIME_TYPES, ".jpg", ".jpeg", ".png", ".webp", ".gif"].join(",");
/** 单文件上限 5 MiB。 */
export const MAX_IMAGE_BYTES = 5_242_880;

const EXTENSIONS: Record<(typeof IMAGE_MIME_TYPES)[number], string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export type ImageFileError = "type" | "size";

/**
 * 前端预校验图片类型和大小。
 *
 * @param file - 用户选择或粘贴的文件。
 * @returns 不合格原因；合格时为 null。
 */
export function validateImageFile(file: File): ImageFileError | null {
  if (!(IMAGE_MIME_TYPES as readonly string[]).includes(file.type)) return "type";
  if (file.size > MAX_IMAGE_BYTES) return "size";
  return null;
}

/** WebP/GIF 作为普通图片发送时会转为静态 JPEG。 */
export function isAnimatableImage(mimeType: string | null | undefined): boolean {
  return mimeType === "image/webp" || mimeType === "image/gif";
}

/**
 * 剪贴板图片常无有效文件名，按类型补默认名称。
 *
 * @param file - 剪贴板文件。
 * @returns 带合理文件名的文件；原文件名可用时原样返回。
 */
export function namedClipboardImage(file: File): File {
  if (file.name && file.name !== "image.png" && /\.[a-z0-9]+$/i.test(file.name)) return file;
  const extension = EXTENSIONS[file.type as keyof typeof EXTENSIONS] ?? "png";
  return new File([file], `pasted-image-${Date.now()}.${extension}`, { type: file.type });
}
