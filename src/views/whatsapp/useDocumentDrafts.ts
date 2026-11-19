import { translate } from "@/lang/utils";
import { websiteErrorMessage } from "@/services/website.service";
import { whatsappService } from "@/services/whatsapp.service";
import { useUserStore } from "@/stores/user";
import type { WhatsappDocumentUpload } from "@/types/whatsapp";
import { clearDocumentDrafts, documentDraftState, type DocumentDraft } from "./document-draft";

let sequence = 0;

/**
 * 按员工、身份和会话隔离的单文档草稿；只上传不发送，发送由用户点击触发。
 *
 * @returns 草稿读取与操作。
 */
export function useDocumentDrafts() {
  const user = useUserStore();
  const { drafts } = documentDraftState;

  /** 身份变化后旧身份的草稿全部失效。 */
  function key(conversationId: string) {
    const owner = `${user.userInfo.userId}:${user.userInfo.identityId}`;
    if (owner !== documentDraftState.owner) {
      clearDocumentDrafts();
      documentDraftState.owner = owner;
    }
    return `${owner}:${conversationId}`;
  }

  function get(conversationId: string): DocumentDraft | undefined {
    return drafts.get(key(conversationId));
  }

  /** 只移除本地草稿；服务端文件未入队满 24 小时后自动清理。 */
  function remove(conversationId: string) {
    drafts.delete(key(conversationId));
  }

  /** 恢复被拒绝但服务端文件仍有效的草稿，例如会话状态变化后重新编辑。 */
  function restore(conversationId: string, upload: WhatsappDocumentUpload) {
    drafts.set(key(conversationId), {
      token: ++sequence, state: "ready", fileName: upload.fileName, sizeBytes: upload.sizeBytes, upload, error: "",
    });
  }

  /** 服务端已清理或本地到期：保留文件名提示重新上传，不再提交旧文件。 */
  function expire(conversationId: string, fileName: string, sizeBytes: number) {
    drafts.set(key(conversationId), {
      token: ++sequence, state: "expired", fileName, sizeBytes, error: translate("whatsapp.documentDraft.expired"),
    });
  }

  /**
   * 上传并替换该会话的文档草稿；结果只写回发起时的会话，期间被移除、替换或身份变化时丢弃。
   *
   * @param conversationId - 发起上传的会话 ID。
   * @param file - 已通过前端校验的文档。
   */
  async function upload(conversationId: string, file: File) {
    const draftKey = key(conversationId);
    const token = ++sequence;
    const generation = documentDraftState.generation;
    drafts.set(draftKey, { token, state: "uploading", fileName: file.name, sizeBytes: file.size, error: "" });
    const isCurrent = () => generation === documentDraftState.generation && drafts.get(draftKey)?.token === token;
    try {
      const result = await whatsappService.uploadDocument(conversationId, file);
      if (!isCurrent()) return;
      drafts.set(draftKey, { token, state: "ready", fileName: result.fileName, sizeBytes: result.sizeBytes, upload: result, error: "" });
    } catch (cause) {
      if (!isCurrent()) return;
      drafts.set(draftKey, { token, state: "failed", fileName: file.name, sizeBytes: file.size, error: uploadErrorMessage(cause) });
    }
  }

  return { get, remove, restore, expire, upload };
}

// 413 优先显示后端原因；网关直接返回时按 PAYLOAD_TOO_LARGE / HTTP_413 本地化兜底。
const uploadErrorMessage = websiteErrorMessage;
