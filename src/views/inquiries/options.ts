import type { TagProps } from "element-plus";
import type { InquiryStatus } from "@/data/data";

export const INQUIRY_STATUS_OPTIONS: Array<{ value: InquiryStatus; labelKey: string }> = [
  { value: "new", labelKey: "inquiry.statuses.new" },
  { value: "qualified", labelKey: "inquiry.statuses.qualified" },
  { value: "planning", labelKey: "inquiry.statuses.planning" },
  { value: "quoted", labelKey: "inquiry.statuses.quoted" },
  { value: "negotiating", labelKey: "inquiry.statuses.negotiating" },
  { value: "lost", labelKey: "inquiry.statuses.lost" },
  { value: "archived", labelKey: "inquiry.statuses.archived" },
];

export const INQUIRY_STATUS_TAG_TYPES: Record<InquiryStatus, TagProps["type"]> = {
  new: "primary",
  qualified: "success",
  planning: "warning",
  quoted: "success",
  negotiating: "warning",
  lost: "danger",
  archived: "info",
};
