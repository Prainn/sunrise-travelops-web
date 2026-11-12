import type { BaseQueryParams, PageResult } from "@/types/common";

export type OssEnvironment = "dev" | "prod";
export type OssResourceKind = "image" | "sticker";
export type OssResourceSource = "whatsapp" | "upload" | "management";
export type OssResourceState = "pending" | "processing" | "ready" | "failed" | "deleting";

/** 归档失败码；未知失败码按通用失败显示，不展示底层错误。 */
export const OSS_ERROR_CODES = [
  "MEDIA_SOURCE_EXPIRED",
  "MEDIA_URL_INVALID",
  "MEDIA_TOO_LARGE",
  "MEDIA_TYPE_INVALID",
  "MEDIA_DOWNLOAD_FAILED",
  "MEDIA_PROCESS_FAILED",
  "MEDIA_UPLOAD_FAILED",
  "MEDIA_INTERRUPTED",
] as const;

/** 失败码对应的 i18n 键；未知码归为通用失败。 */
export function ossErrorKey(code: string | null | undefined): string {
  return code && (OSS_ERROR_CODES as readonly string[]).includes(code) ? `oss.errors.${code}` : "oss.errors.UNKNOWN";
}

/** 当前环境已登记的原始资源；缩略图与发送副本随原资源管理，不单独出现。 */
export interface OssResource {
  id: string;
  environment: OssEnvironment;
  name: string;
  remark: string;
  kind: OssResourceKind;
  source: OssResourceSource;
  state: OssResourceState;
  mimeType: string | null;
  /** 原文件字节数。 */
  size: number | null;
  width: number | null;
  height: number | null;
  version: number;
  errorCode: string | null;
  /** 永久 CDN 地址，无签名；请求图片时不附加业务 JWT。 */
  originalUrl: string | null;
  /** 贴纸等于 originalUrl。 */
  thumbnailUrl: string | null;
  /** ready 且 CDN 已配置。 */
  previewable: boolean;
  /** 仅图片可点击查看原图，贴纸为 false。 */
  clickable: boolean;
  objectKey: string | null;
  referenceCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface OssResourceQueryParams extends BaseQueryParams {
  keyword?: string;
  kind?: OssResourceKind;
  state?: OssResourceState;
}

/** 列表附带服务端决定的当前环境，前端不提供切换。 */
export interface OssResourcePage extends PageResult<OssResource> {
  environment: OssEnvironment;
}

export interface OssResourceForm {
  version: number;
  name: string;
  remark: string;
}
