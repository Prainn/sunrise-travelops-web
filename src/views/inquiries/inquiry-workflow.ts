import type { InquiryStatus } from "@/types/inquiry";

export type InquiryAction = "itinerary_created" | "quote_generated" | "archive" | "mark_lost" | "reopen_for_planning";

const INQUIRY_TRANSITIONS: Record<InquiryStatus, Partial<Record<InquiryAction, InquiryStatus>>> = {
  new: { itinerary_created: "planning", archive: "archived", mark_lost: "lost" },
  planning: { itinerary_created: "planning", quote_generated: "quoted", archive: "archived", mark_lost: "lost" },
  quoted: { itinerary_created: "planning", quote_generated: "quoted", archive: "archived", mark_lost: "lost", reopen_for_planning: "planning" },
  lost: {},
  archived: {},
};

export function isInquiryReadOnly(status: InquiryStatus): boolean {
  return status === "lost" || status === "archived";
}

export function canTransitionInquiry(status: InquiryStatus, action: InquiryAction): boolean {
  return Boolean(INQUIRY_TRANSITIONS[status][action]);
}

export function transitionInquiry(status: InquiryStatus, action: InquiryAction): InquiryStatus {
  const nextStatus = INQUIRY_TRANSITIONS[status][action];
  if (!nextStatus) throw new Error(`Invalid inquiry transition: ${status} -> ${action}`);
  return nextStatus;
}
