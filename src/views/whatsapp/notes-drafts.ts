import { APP_PREFIX } from "@/constants";
import { Storage } from "@/utils/storage";
import type { WhatsappCustomerNotesForm } from "@/types/whatsapp";

const DRAFT_PREFIX = `${APP_PREFIX}:whatsapp:notes_draft:`;
/** 草稿含客户资料，超过 7 天未修改即清理。 */
const DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export interface NotesDraft {
  /** 编辑起点的会话版本；与服务端不一致时须由用户刷新后再保存。 */
  version: number;
  base: WhatsappCustomerNotesForm;
  form: WhatsappCustomerNotesForm;
  savedAt: number;
}

/** 按员工、身份和会话隔离，避免共用电脑时串读他人草稿。 */
function draftKey(owner: string, conversationId: string) {
  return `${DRAFT_PREFIX}${owner}:${conversationId}`;
}

function isExpired(draft: NotesDraft | null) {
  return !draft || typeof draft.savedAt !== "number" || Date.now() - draft.savedAt > DRAFT_TTL_MS;
}

export function readNotesDraft(owner: string, conversationId: string) {
  const key = draftKey(owner, conversationId);
  const draft = Storage.get<NotesDraft | null>(key, null);
  if (!isExpired(draft)) return draft;
  Storage.remove(key);
  return null;
}

export function writeNotesDraft(owner: string, conversationId: string, draft: Omit<NotesDraft, "savedAt">) {
  try {
    Storage.set(draftKey(owner, conversationId), { ...draft, savedAt: Date.now() });
  } catch {
    // 存储空间不足时只保留内存草稿，不影响编辑。
  }
}

export function removeNotesDraft(owner: string, conversationId: string) {
  Storage.remove(draftKey(owner, conversationId));
}

/** 清理所有过期草稿；进入工作台时调用。 */
export function pruneNotesDrafts() {
  const keys: string[] = [];
  for (let index = 0; index < localStorage.length; index++) {
    const key = localStorage.key(index);
    if (key?.startsWith(DRAFT_PREFIX)) keys.push(key);
  }
  for (const key of keys) {
    if (isExpired(Storage.get<NotesDraft | null>(key, null))) Storage.remove(key);
  }
}

/** 主动退出登录时清空全部客户资料草稿。 */
export function clearNotesDrafts() {
  Storage.clearByPrefix(DRAFT_PREFIX);
}
