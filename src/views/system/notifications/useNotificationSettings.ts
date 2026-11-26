import { readonly, ref } from "vue";
import { ApiError } from "@/api/request";
import { notificationService } from "@/services/notification.service";
import type {
  NotificationSendWindow,
  NotificationSetting,
  NotificationSettingForm,
  NotificationType,
} from "@/types/notification";

const SEND_WINDOW_TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

export type SendWindowValidationError = "incomplete" | "invalid" | "same";

export type NotificationSaveResult =
  | { kind: "saved"; setting: NotificationSetting }
  | { kind: "conflict"; message: string }
  | { kind: "validation"; message: string; reason?: SendWindowValidationError }
  | { kind: "failed"; message: string; status?: number }
  | { kind: "skipped" };

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

/**
 * 判断字符串是否为合法的 24 小时制 HH:mm（00:00 至 23:59）。
 *
 * @param value - 待校验时间字符串。
 * @returns 是否符合格式要求。
 */
export function isValidSendWindowTime(value: string): boolean {
  return SEND_WINDOW_TIME_PATTERN.test(value);
}

/**
 * 判断发送时段是否跨午夜（结束时刻早于开始时刻）。
 *
 * @param sendWindow - 合法的发送时段。
 * @returns 是否跨午夜。
 */
export function isOvernightSendWindow(sendWindow: NotificationSendWindow): boolean {
  return sendWindow.end < sendWindow.start;
}

/**
 * 校验自定义发送时段的起止时刻。
 *
 * @param draft - 起止时刻草稿。
 * @returns 错误原因，合法时返回 null。
 */
export function validateSendWindow(draft: { start?: string | null; end?: string | null }): SendWindowValidationError | null {
  const start = (draft.start ?? "").trim();
  const end = (draft.end ?? "").trim();
  if (!start || !end) return "incomplete";
  if (!isValidSendWindowTime(start) || !isValidSendWindowTime(end)) return "invalid";
  if (start === end) return "same";
  return null;
}

/**
 * 格式化发送时段显示文本。
 *
 * @param sendWindow - 服务端返回或预览的时段，null 表示全天。
 * @param translate - 本地化翻译函数。
 * @returns 展示文案（全天、09:00–18:00 或 21:00–次日 08:00）。
 */
export function formatSendWindow(
  sendWindow: NotificationSendWindow | null,
  translate: (key: string, params?: Record<string, unknown>) => string,
): string {
  if (!sendWindow) return translate("notificationSettings.allDay");
  if (isOvernightSendWindow(sendWindow)) {
    return translate("notificationSettings.sendWindowOvernight", {
      start: sendWindow.start,
      end: sendWindow.end,
    });
  }
  return `${sendWindow.start}–${sendWindow.end}`;
}

function isSameSendWindow(
  current: NotificationSendWindow | null,
  next: NotificationSendWindow | null,
): boolean {
  if (current === null && next === null) return true;
  if (!current || !next) return false;
  return current.start === next.start && current.end === next.end;
}

/**
 * 通知配置列表与逐行保存；仅在服务端成功返回后更新，409 冲突重新读取不自动覆盖。
 *
 * @returns 列表状态、逐行保存状态与读取、开关和时段保存方法。
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

  async function commitUpdate(
    type: NotificationType,
    payload: NotificationSettingForm,
  ): Promise<NotificationSaveResult> {
    setSaving(type, true);
    try {
      const saved = await notificationService.update(type, payload);
      settings.value = settings.value.map((item) => (item.type === saved.type ? saved : item));
      return { kind: "saved", setting: saved };
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        // 409 不自动覆盖或重试 PUT，重新拉取服务端最新配置供用户确认。
        await fetchSettings();
        return { kind: "conflict", message: error.message };
      }
      if (error instanceof ApiError && error.status === 400) {
        return { kind: "validation", message: error.message };
      }
      return {
        kind: "failed",
        message: errorMessage(error),
        status: error instanceof ApiError ? error.status : undefined,
      };
    } finally {
      setSaving(type, false);
    }
  }

  /**
   * 以当前版本保存单类开关；省略 sendWindow 以保留已配置时段。
   *
   * @param type - 通知类型。
   * @param enabled - 目标开关状态。
   * @returns 保存结果，同一类型保存中或无变化时返回 skipped。
   */
  async function saveEnabled(type: NotificationType, enabled: boolean): Promise<NotificationSaveResult> {
    const current = settings.value.find((item) => item.type === type);
    if (!current || isSaving(type) || current.enabled === enabled) return { kind: "skipped" };
    return commitUpdate(type, { enabled, version: current.version });
  }

  /**
   * 以当前开关和版本保存单类发送时段；传 null 恢复全天。
   *
   * @param type - 通知类型。
   * @param sendWindow - 目标时段对象或 null。
   * @returns 保存结果；客户端校验失败返回 validation，未改动或保存中返回 skipped。
   */
  async function saveSendWindow(
    type: NotificationType,
    sendWindow: NotificationSendWindow | null,
  ): Promise<NotificationSaveResult> {
    const current = settings.value.find((item) => item.type === type);
    if (!current || isSaving(type)) return { kind: "skipped" };
    let normalized: NotificationSendWindow | null = null;
    if (sendWindow !== null) {
      const reason = validateSendWindow(sendWindow);
      if (reason) return { kind: "validation", reason, message: "" };
      normalized = { start: sendWindow.start.trim(), end: sendWindow.end.trim() };
    }
    if (isSameSendWindow(current.sendWindow, normalized)) return { kind: "skipped" };
    return commitUpdate(type, {
      enabled: current.enabled,
      version: current.version,
      sendWindow: normalized,
    });
  }

  return {
    settings: readonly(settings),
    loading: readonly(loading),
    loadError: readonly(loadError),
    isSaving,
    fetchSettings,
    saveEnabled,
    saveSendWindow,
  };
}
