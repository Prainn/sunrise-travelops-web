import type { ItineraryStatus } from "@/types/itinerary";

export type ItineraryOperation = "edit_content" | "edit_price" | "generate_pdf";

const ITINERARY_OPERATIONS: Record<ItineraryStatus, ItineraryOperation[]> = {
  draft: ["edit_content", "edit_price", "generate_pdf"],
  quoted: [],
};

export function canPerformItineraryOperation(
  status: ItineraryStatus,
  operation: ItineraryOperation,
): boolean {
  return ITINERARY_OPERATIONS[status].includes(operation);
}
