import { reactive } from "vue";
import type { WhatsappDocumentUpload } from "@/types/whatsapp";

/** 文档上传上限 20 MiB，与服务端一致。 */
export const MAX_DOCUMENT_BYTES = 20 * 1024 * 1024;
const DOCUMENT_EXTENSIONS = [".pdf", ".doc", ".docx"] as const;
/** 文件选择框 accept；扩展名校验不区分大小写，服务端仍检查实际内容。 */
export const DOCUMENT_ACCEPT = [
  ...DOCUMENT_EXTENSIONS,
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
].join(",");

export type DocumentFileError = "type" | "size";

/**
 * 前端预校验文档扩展名和大小。
 *
 * @param file - 用户选择的文件。
 * @returns 不合格原因；合格时为 null。
 */
export function validateDocumentFile(file: Pick<File, "name" | "size">): DocumentFileError | null {
  const name = file.name.toLowerCase();
  if (!DOCUMENT_EXTENSIONS.some((extension) => name.endsWith(extension))) return "type";
  if (file.size > MAX_DOCUMENT_BYTES) return "size";
  return null;
}

/** 本地草稿已到服务端清理时间，发送前须重新上传。 */
export function isDocumentDraftExpired(upload: Pick<WhatsappDocumentUpload, "expiresAt">, now = Date.now()) {
  const expiresAt = Date.parse(upload.expiresAt);
  return !Number.isFinite(expiresAt) || expiresAt <= now;
}

/**
 * 会话文档草稿。uploading：上传中；ready：可发送；failed：上传失败；
 * expired：服务端已清理或本地到期，须重新上传，不再提交旧文件。
 */
export interface DocumentDraft {
  token: number;
  state: "uploading" | "ready" | "failed" | "expired";
  fileName: string;
  sizeBytes: number;
  upload?: WhatsappDocumentUpload;
  error: string;
}

/** 草稿只保存在内存中，切换会话后保留，刷新浏览器、退出或切换身份后清空。 */
export const documentDraftState = {
  drafts: reactive(new Map<string, DocumentDraft>()),
  owner: "",
  /** 清空时递增，丢弃在途上传结果。 */
  generation: 0,
};

/** 清空全部文档草稿；不删除服务端文件，由服务端到期清理。 */
export function clearDocumentDrafts() {
  documentDraftState.generation++;
  documentDraftState.drafts.clear();
}
