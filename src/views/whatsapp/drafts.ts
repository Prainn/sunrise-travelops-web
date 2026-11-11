import { reactive } from "vue";
import { useUserStore } from "@/stores/user";

/** 未发送草稿只保存在内存中，按身份隔离；切换会话或页面后仍保留，刷新浏览器后清空。 */
const drafts = reactive(new Map<string, string>());

export function useWhatsappDrafts() {
  const user = useUserStore();
  const key = (conversationId: string) =>
    `${user.userInfo.userId}:${user.userInfo.identityId}:${conversationId}`;
  return {
    get: (conversationId: string) => drafts.get(key(conversationId)) ?? "",
    set(conversationId: string, text: string) {
      if (text) drafts.set(key(conversationId), text);
      else drafts.delete(key(conversationId));
    },
  };
}
