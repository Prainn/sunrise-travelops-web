import { ApiErrorCode } from "@/api/error-code";
import { isApiError } from "@/api/request";
import type { InquiryStatus } from "@/types/inquiry";

export type InquiryAction = "itinerary_created" | "quote_generated" | "archive" | "mark_lost";

const INQUIRY_TRANSITIONS: Record<InquiryStatus, Partial<Record<InquiryAction, InquiryStatus>>> = {
  new: { itinerary_created: "planning", archive: "archived", mark_lost: "lost" },
  planning: {
    itinerary_created: "planning",
    quote_generated: "quoted",
    archive: "archived",
    mark_lost: "lost",
  },
  quoted: {
    itinerary_created: "planning",
    quote_generated: "quoted",
    archive: "archived",
    mark_lost: "lost",
  },
  lost: {},
  archived: {},
};

/**
 * 询盘业务写操作是否只读。系列询盘可多次成团，已有有效团不锁定编辑、报价、跟进和新成团；
 * 删除/归档仍受有效团限制，调用方不传 isSeries 即按有效团锁定。
 *
 * @param status - 询盘状态。
 * @param hasActiveTour - 是否已有有效团。
 * @param isSeries - 是否盛旭系列询盘。
 * @returns 只读时为 true。
 */
export function isInquiryReadOnly(status: InquiryStatus, hasActiveTour = false, isSeries = false): boolean {
  return (hasActiveTour && !isSeries) || status === "lost" || status === "archived";
}

export function transitionInquiry(status: InquiryStatus, action: InquiryAction): InquiryStatus {
  const nextStatus = INQUIRY_TRANSITIONS[status][action];
  if (!nextStatus) throw new Error(`Invalid inquiry transition: ${status} -> ${action}`);
  return nextStatus;
}

/**
 * 删除因列表行过期而失败的原因：询盘已被并发修改（changed）或已被删除（removed）。
 *
 * @param error - 删除请求抛出的错误。
 * @returns 过期原因；其他错误返回 undefined，按原有方式提示。
 */
export function staleDeleteReason(error: unknown): "changed" | "removed" | undefined {
  if (!isApiError(error)) return undefined;
  if (error.code === ApiErrorCode.INQUIRY_VERSION_CONFLICT) return "changed";
  if (error.code === ApiErrorCode.INQUIRY_NOT_FOUND) return "removed";
  return undefined;
}
