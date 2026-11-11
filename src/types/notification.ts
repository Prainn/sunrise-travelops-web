/** 飞书通知业务类型，与后端 feishu_notification_settings 一致。 */
export type NotificationType =
  | "whatsapp_unassigned"
  | "whatsapp_message"
  | "whatsapp_assignment"
  | "linxi_ledger_review"
  | "linxi_ledger_operate"
  | "website_ledger_review"
  | "website_ledger_operate"
  | "inquiry_follow_up";

/** 单类通知开关；enabled 仅表示允许发送，不代表凭证、绑定或实际投递成功。 */
export interface NotificationSetting {
  type: NotificationType;
  name: string;
  enabled: boolean;
  version: number;
  updatedAt: string;
}

export interface NotificationSettingForm {
  enabled: boolean;
  version: number;
}
