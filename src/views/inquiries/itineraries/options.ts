import type { TagProps } from "element-plus";
import type { ItineraryStatus } from "@/types/itinerary";

export const ITINERARY_STATUS_TAG_TYPES: Record<ItineraryStatus, TagProps["type"]> = {
  draft: "info",
  ready_for_costing: "primary",
  quoted: "success",
  archived: "info",
};
