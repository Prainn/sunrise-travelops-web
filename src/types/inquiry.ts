export type InquiryStatus = "new" | "planning" | "quoted" | "lost" | "archived";

export interface InquiryRecord {
  canDelete?: boolean;
  hasActiveTour: boolean;
  businessUnit?: "shengxu" | "linxi" | "website";
  version: number;
  id: string;
  code: string;
  /** 盛旭系列询盘；创建后不可切换。系列询盘组团社、联系人与计划天数为 null。 */
  isSeries: boolean;
  agencyId: string | null;
  agencyCode: string;
  agencyName: string;
  contactName: string;
  email: string;
  phone: string;
  countryItemId: string;
  countryOrRegion: string;
  sourceChannel: string;
  originalMessage: string;
  internalRemark: string;
  owner: string;
  ownerId: string;
  contactId: string | null;
  nextFollowUpAt: string;
  plannedDays: number | null;
  lostReason: string;
  status: InquiryStatus;
  creator: string;
  createdAt: string;
}

export type FollowUpReminderDays = 1 | 3 | 5 | 15;
export type FollowUpReminderStatus = "pending" | "sending" | "sent" | "failed" | "cancelled";

/** 当前提醒投递条件；available 不代表已发送。 */
export interface FollowUpDelivery {
  available: boolean;
  reason: "FEISHU_NOT_CONFIGURED" | "FOLLOW_UP_RECIPIENT_UNAVAILABLE" | null;
  recipientId: string | null;
}

/** 跟进记录只追加；legacy 历史记录的跟进人/时间未知时为 null。 */
export interface InquiryFollowUpRecord {
  id: string;
  inquiryId: string;
  remark: string;
  nextFollowUpAt: string | null;
  reminderDays: FollowUpReminderDays | null;
  followedAt: string | null;
  followedBy: string | null;
  followedByName: string | null;
  legacy: boolean;
  reminderId: string | null;
  reminderAt: string | null;
  reminderStatus: FollowUpReminderStatus | null;
  recipientId: string | null;
  sentAt: string | null;
  reminderError: string | null;
  /** 发送结果不明，需人工确认，不自动重试。 */
  deliveryUnknown: boolean | null;
}

export interface InquiryFollowUpPage {
  list: InquiryFollowUpRecord[];
  total: number;
  page: number;
  pageSize: number;
  delivery: FollowUpDelivery;
}

export interface InquiryFollowUpInput {
  version: number;
  /** 每次新提交生成；网络重试沿用同一 ID 与内容。 */
  requestId: string;
  remark: string;
  /** 带时区 ISO 8601；null 表示不安排下次跟进。 */
  nextFollowUpAt: string | null;
  reminderDays: FollowUpReminderDays | null;
}
