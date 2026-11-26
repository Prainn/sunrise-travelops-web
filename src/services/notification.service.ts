import { request } from "@/api/request";
import type { NotificationSetting, NotificationSettingForm, NotificationType } from "@/types/notification";

export const notificationService = {
  list() {
    return request.get<NotificationSetting[]>("/system/notifications");
  },
  update(type: NotificationType, form: NotificationSettingForm) {
    const payload: NotificationSettingForm = {
      enabled: form.enabled,
      version: form.version,
      ...(form.sendWindow !== undefined ? { sendWindow: form.sendWindow } : {}),
    };
    return request.put<NotificationSetting>(`/system/notifications/${encodeURIComponent(type)}`, payload, { userAction: true });
  },
};
