import { readonly, ref } from "vue";
import { ApiError } from "@/api/request";
import { notificationService } from "@/services/notification.service";
import type { NotificationSetting, NotificationType } from "@/types/notification";

export type NotificationSaveResult =
  | { kind: "saved"; setting: NotificationSetting }
  | { kind: "conflict"; message: string }
  | { kind: "failed"; message: string }
  | { kind: "skipped" };

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

/**
 * 通知开关列表与逐行保存；开关只在服务端成功返回后更新，失败保持原状态。
 *
 * @returns 列表状态、逐行保存状态与读取、保存方法。
 */
export function useNotificationSettings() {
  const settings = ref<NotificationSetting[]>([]);
  const loading = ref(false);
  const loadError = ref("");
  const savingTypes = ref(new Set<NotificationType>());
  let loadGeneration = 0;

  async function fetchSettings() {
    const generation = ++loadGeneration;
    loading.value = true;
    try {
      const list = await notificationService.list();
      if (generation !== loadGeneration) return;
      settings.value = list;
      loadError.value = "";
    } catch (error) {
      if (generation !== loadGeneration) return;
      loadError.value = errorMessage(error);
    } finally {
      if (generation === loadGeneration) loading.value = false;
    }
  }

  function isSaving(type: NotificationType) {
    return savingTypes.value.has(type);
  }
  function setSaving(type: NotificationType, saving: boolean) {
    const next = new Set(savingTypes.value);
    if (saving) next.add(type);
    else next.delete(type);
    savingTypes.value = next;
  }

  /**
   * 以当前版本保存单类开关；409 不自动覆盖或重试，由用户刷新后重新决定。
   *
   * @param type - 通知类型。
   * @param enabled - 目标开关状态。
   * @returns 保存结果，同一类型保存中重复提交时返回 skipped。
   */
  async function saveEnabled(type: NotificationType, enabled: boolean): Promise<NotificationSaveResult> {
    const current = settings.value.find((item) => item.type === type);
    if (!current || isSaving(type) || current.enabled === enabled) return { kind: "skipped" };
    setSaving(type, true);
    try {
      const saved = await notificationService.update(type, { enabled, version: current.version });
      settings.value = settings.value.map((item) => (item.type === saved.type ? saved : item));
      return { kind: "saved", setting: saved };
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) return { kind: "conflict", message: error.message };
      return { kind: "failed", message: errorMessage(error) };
    } finally {
      setSaving(type, false);
    }
  }

  return {
    settings: readonly(settings),
    loading: readonly(loading),
    loadError: readonly(loadError),
    isSaving,
    fetchSettings,
    saveEnabled,
  };
}
