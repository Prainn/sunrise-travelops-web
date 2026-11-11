import { computed, reactive, ref, watch } from "vue";
import { ApiError } from "@/api/request";
import { websiteErrorMessage } from "@/services/website.service";
import { whatsappService } from "@/services/whatsapp.service";
import { useUserStore } from "@/stores/user";
import type { WhatsappCustomerNotes, WhatsappCustomerNotesForm } from "@/types/whatsapp";
import { pruneNotesDrafts, readNotesDraft, removeNotesDraft, writeNotesDraft } from "./notes-drafts";

interface NotesEntry {
  version: number;
  /** 最近一次读取或保存的服务端资料，用于判断是否有未保存修改。 */
  base: WhatsappCustomerNotesForm;
  form: WhatsappCustomerNotesForm;
  /** 保存遇到 409：保留输入，等待用户确认后刷新。 */
  conflict: boolean;
}

export type SaveNotesResult =
  | { kind: "saved"; notes: WhatsappCustomerNotes }
  | { kind: "conflict" | "failed"; message: string };

function notesForm(notes: WhatsappCustomerNotes): WhatsappCustomerNotesForm {
  return {
    customerName: notes.customerName,
    countryItemId: notes.countryItemId,
    plannedDays: notes.plannedDays,
    startDate: notes.startDate,
    pax: notes.pax,
    contactInfo: notes.contactInfo,
    destinations: [...notes.destinations],
    requirements: notes.requirements,
    internalRemark: notes.internalRemark,
  };
}

function isDirty(entry: NotesEntry) {
  return JSON.stringify(entry.form) !== JSON.stringify(entry.base);
}

/**
 * WhatsApp 客户需求与备注：按会话 ID 保存草稿和请求结果，切换会话不串用。
 *
 * 有未保存修改或冲突时不被后台读取覆盖；身份变化时丢弃内存状态和在途响应。
 * 未保存修改同步写入本地缓存，刷新浏览器后首次读取该会话时恢复；保存成功、改回原值、
 * 用户确认刷新、会话不存在或无权访问时清除，主动退出登录及超过 7 天也会清理。
 */
export function useCustomerNotes() {
  const user = useUserStore();
  const conversationId = ref("");
  const entries = reactive(new Map<string, NotesEntry>());
  const loadingIds = reactive(new Set<string>());
  const savingIds = reactive(new Set<string>());
  const errors = reactive(new Map<string, string>());
  /** 每个会话最新一次读取的序号，丢弃乱序返回的旧响应。 */
  const latestLoad = new Map<string, number>();
  let session = 0;
  let loadSeq = 0;

  const entry = computed(() => entries.get(conversationId.value));
  const loading = computed(() => !entry.value && loadingIds.has(conversationId.value));
  const saving = computed(() => savingIds.has(conversationId.value));
  const error = computed(() => errors.get(conversationId.value) ?? "");
  const dirty = computed(() => Boolean(entry.value && isDirty(entry.value)));
  const draftOwner = () => `${user.userInfo.userId ?? ""}:${user.userInfo.identityId ?? ""}`;

  function store(notes: WhatsappCustomerNotes) {
    entries.set(notes.conversationId, {
      version: notes.version,
      base: notesForm(notes),
      form: notesForm(notes),
      conflict: false,
    });
  }

  /**
   * 读取会话资料；未保存修改、冲突或保存中时保留本地输入，除非用户确认刷新。
   *
   * @param id - 会话 ID。
   * @param force - 用户确认放弃本地输入后为 true。
   */
  async function load(id: string, force = false) {
    const current = entries.get(id);
    if (!force && (savingIds.has(id) || (current && (current.conflict || isDirty(current))))) return;
    const currentSession = session;
    const seq = ++loadSeq;
    latestLoad.set(id, seq);
    loadingIds.add(id);
    try {
      const notes = await whatsappService.customerNotes(id);
      if (currentSession !== session || latestLoad.get(id) !== seq) return;
      const latest = entries.get(id);
      if (!force && (savingIds.has(id) || (latest && (latest.conflict || isDirty(latest))))) return;
      // 仅首次读取时恢复缓存草稿；版本已变化说明资料可能被他人更新，按冲突处理。
      const draft = force || latest ? null : readNotesDraft(draftOwner(), id);
      if (force) removeNotesDraft(draftOwner(), id);
      if (draft) entries.set(id, { version: draft.version, base: draft.base, form: draft.form, conflict: draft.version !== notes.version });
      else store(notes);
      errors.delete(id);
    } catch (cause) {
      if (currentSession !== session || latestLoad.get(id) !== seq) return;
      if (cause instanceof ApiError && (cause.status === 403 || cause.status === 404)) removeNotesDraft(draftOwner(), id);
      errors.set(id, websiteErrorMessage(cause));
    } finally {
      if (currentSession === session && latestLoad.get(id) === seq) loadingIds.delete(id);
    }
  }

  /**
   * 选择会话；尚未读取或会话版本已前进（建询盘、状态等操作）时重新读取，未保存输入仍保留。
   *
   * @param id - 会话 ID，空字符串表示未选择。
   * @param version - 会话详情当前版本。
   */
  function select(id: string, version = 0) {
    conversationId.value = id;
    const current = entries.get(id);
    if (id && (!current || current.version < version)) void load(id);
  }

  /** 全量保存当前会话资料；409 保留输入并标记冲突，不自动重试。 */
  async function save(): Promise<SaveNotesResult | undefined> {
    const id = conversationId.value;
    const current = entries.get(id);
    if (!current || current.conflict || savingIds.has(id)) return undefined;
    const currentSession = session;
    const submitted = JSON.stringify(current.form);
    savingIds.add(id);
    try {
      const notes = await whatsappService.saveCustomerNotes(id, {
        ...current.form,
        destinations: [...current.form.destinations],
        version: current.version,
      });
      if (currentSession !== session) return undefined;
      const latest = entries.get(id);
      store(notes);
      // 保存期间继续输入的内容保留为新草稿，版本按保存结果更新。
      if (latest && JSON.stringify(latest.form) !== submitted) entries.get(id)!.form = latest.form;
      return { kind: "saved", notes };
    } catch (cause) {
      if (currentSession !== session) return undefined;
      const message = websiteErrorMessage(cause);
      if (cause instanceof ApiError && cause.status === 409) {
        const latest = entries.get(id);
        if (latest) latest.conflict = true;
        return { kind: "conflict", message };
      }
      return { kind: "failed", message };
    } finally {
      if (currentSession === session) savingIds.delete(id);
    }
  }

  function reset() {
    session++;
    entries.clear();
    loadingIds.clear();
    savingIds.clear();
    errors.clear();
    latestLoad.clear();
  }

  /** 有未保存修改时写入缓存，否则清除；尚未读取的会话不动缓存。 */
  function persist(id: string) {
    const current = entries.get(id);
    if (!current) return;
    if (isDirty(current)) writeNotesDraft(draftOwner(), id, { version: current.version, base: current.base, form: current.form });
    else removeNotesDraft(draftOwner(), id);
  }

  pruneNotesDrafts();
  watch(entry, () => persist(conversationId.value), { deep: true });
  watch(
    () => [user.userInfo.userId, user.userInfo.identityId, user.userInfo.scope] as const,
    (next, previous) => {
      if (next.every((value, index) => value === previous[index])) return;
      reset();
    },
  );

  return { conversationId, entry, loading, saving, error, dirty, select, load, save, reset };
}
