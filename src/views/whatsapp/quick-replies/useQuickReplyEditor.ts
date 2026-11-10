import { onScopeDispose, ref, watch } from "vue";
import { ApiError } from "@/api/request";
import { whatsappService } from "@/services/whatsapp.service";
import { websiteErrorMessage } from "@/services/website.service";
import type { WhatsappQuickReply, WhatsappQuickReplyInput } from "@/types/whatsapp";

const emptyForm = (): WhatsappQuickReplyInput => ({ stage: "", scenario: "", content: "", enabled: true, sortOrder: 0 });
function toForm(row: WhatsappQuickReply): WhatsappQuickReplyInput {
  return { stage: row.stage, scenario: row.scenario, content: row.content, enabled: row.enabled, sortOrder: row.sortOrder, version: row.version };
}

export function useQuickReplyEditor() {
  const editing = ref(false);
  const editingId = ref<string>();
  const form = ref(emptyForm());
  const saving = ref(false);
  const hasConflict = ref(false);
  const latest = ref<WhatsappQuickReply | null>(null);
  const latestLoading = ref(false);
  const latestError = ref("");
  let generation = 0;

  function resetConflict() {
    hasConflict.value = false;
    latest.value = null;
    latestError.value = "";
    latestLoading.value = false;
  }
  function open(row?: WhatsappQuickReply) {
    generation++;
    resetConflict();
    editingId.value = row?.id;
    form.value = row ? toForm(row) : emptyForm();
    editing.value = true;
  }
  async function loadLatest() {
    const id = editingId.value;
    if (!id || latestLoading.value) return;
    const current = generation;
    latestLoading.value = true;
    latest.value = null;
    latestError.value = "";
    try {
      const row = await whatsappService.quickReply(id);
      if (current === generation) latest.value = row;
    } catch (cause) {
      if (current === generation) latestError.value = websiteErrorMessage(cause);
    } finally {
      if (current === generation) latestLoading.value = false;
    }
  }
  async function save() {
    if (saving.value || hasConflict.value) return;
    const current = generation;
    saving.value = true;
    try {
      await whatsappService.saveQuickReply({ ...form.value }, editingId.value);
      if (current !== generation) return;
      editing.value = false;
      return "saved" as const;
    } catch (cause) {
      if (current !== generation) return;
      if (editingId.value && cause instanceof ApiError && cause.code === "CONFLICT") {
        hasConflict.value = true;
        await loadLatest();
        return "conflict" as const;
      }
      throw cause;
    } finally {
      if (current === generation) saving.value = false;
    }
  }
  function resolveConflict(useLatest: boolean) {
    if (!latest.value || latestLoading.value) return;
    // A newer write after this explicit choice still fails the server version check.
    form.value = useLatest ? toForm(latest.value) : { ...form.value, version: latest.value.version };
    resetConflict();
  }
  watch(editing, (isOpen) => {
    if (!isOpen) {
      generation++;
      saving.value = false;
      resetConflict();
    }
  }, { flush: "sync" });
  onScopeDispose(() => { generation++; });

  return { editing, editingId, form, saving, hasConflict, latest, latestLoading, latestError, open, loadLatest, save, resolveConflict };
}
