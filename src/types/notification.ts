/** 飞书通知业务类型，与后端 feishu_notification_settings 一致。 */
export const FEISHU_NOTIFICATION_TYPES = [
  "whatsapp_unassigned",
  "whatsapp_message",
  "whatsapp_assignment",
  "linxi_ledger_review",
  "linxi_ledger_operate",
  "website_ledger_review",
  "website_ledger_operate",
  "inquiry_follow_up",
] as const;

export type NotificationType = (typeof FEISHU_NOTIFICATION_TYPES)[number];

/** 通知每日发送时段（北京时间 HH:mm，含 start 不含 end，start > end 表示跨午夜）。 */
export interface NotificationSendWindow {
  start: string;
  end: string;
}

/** 单类通知配置；enabled 仅表示允许发送，不代表凭证、绑定或实际投递成功。 */
export interface NotificationSetting {
  type: NotificationType;
  name: string;
  enabled: boolean;
  sendWindow: NotificationSendWindow | null;
  version: number;
  updatedAt: string;
}

export interface NotificationSettingForm {
  enabled: boolean;
  version: number;
  /** 省略时保留原时段；传 null 恢复全天；传完整对象整体替换。 */
  sendWindow?: NotificationSendWindow | null;
}
