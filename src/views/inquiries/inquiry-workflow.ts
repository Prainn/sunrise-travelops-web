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

export function isInquiryReadOnly(status: InquiryStatus, hasActiveTour = false): boolean {
  return hasActiveTour || status === "lost" || status === "archived";
}

export function canTransitionInquiry(status: InquiryStatus, action: InquiryAction): boolean {
  return Boolean(INQUIRY_TRANSITIONS[status][action]);
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
