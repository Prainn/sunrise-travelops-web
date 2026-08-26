import type { TagProps } from "element-plus";
import type { InquiryStatus } from "@/types/inquiry";

export const INQUIRY_STATUS_OPTIONS: Array<{ value: InquiryStatus; labelKey: string }> = [
  { value: "new", labelKey: "inquiry.statuses.new" },
  { value: "planning", labelKey: "inquiry.statuses.planning" },
  { value: "quoted", labelKey: "inquiry.statuses.quoted" },
  { value: "lost", labelKey: "inquiry.statuses.lost" },
  { value: "archived", labelKey: "inquiry.statuses.archived" },
];

export const INQUIRY_STATUS_TAG_TYPES: Record<InquiryStatus, TagProps["type"]> = {
  new: "primary",
  planning: "warning",
  quoted: "success",
  lost: "danger",
  archived: "info",
};
