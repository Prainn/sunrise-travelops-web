import { request } from "@/api/request";
import type { NotificationSetting, NotificationSettingForm, NotificationType } from "@/types/notification";

export const notificationService = {
  list() {
    return request.get<NotificationSetting[]>("/system/notifications");
  },
  update(type: NotificationType, form: NotificationSettingForm) {
    return request.put<NotificationSetting>(`/system/notifications/${encodeURIComponent(type)}`, form);
  },
};
