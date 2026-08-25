import type { InquiryStatus } from "@/data/data";

export function isInquiryReadOnly(status: InquiryStatus) {
  return status === "lost" || status === "archived";
}

export function getStatusAfterItineraryCreated(status: InquiryStatus): InquiryStatus {
  return isInquiryReadOnly(status) ? status : "planning";
}

export function getStatusAfterQuoteGenerated(status: InquiryStatus): InquiryStatus {
  return isInquiryReadOnly(status) ? status : "quoted";
}
