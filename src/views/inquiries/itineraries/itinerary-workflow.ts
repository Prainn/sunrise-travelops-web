import type { ItineraryStatus } from "@/types/itinerary";

export type ItineraryAction = "submit_for_costing" | "generate_quote" | "archive";
export type ItineraryOperation = "edit_content" | "edit_price" | "generate_pdf";

const ITINERARY_TRANSITIONS: Record<ItineraryStatus, Partial<Record<ItineraryAction, ItineraryStatus>>> = {
  draft: { submit_for_costing: "ready_for_costing", generate_quote: "quoted" },
  ready_for_costing: { generate_quote: "quoted" },
  quoted: { archive: "archived" },
  archived: {},
};

const ITINERARY_OPERATIONS: Record<ItineraryStatus, ItineraryOperation[]> = {
  draft: ["edit_content", "edit_price", "generate_pdf"],
  ready_for_costing: ["generate_pdf"],
  quoted: [],
  archived: [],
};

export function canPerformItineraryOperation(status: ItineraryStatus, operation: ItineraryOperation): boolean {
  return ITINERARY_OPERATIONS[status].includes(operation);
}

export function transitionItinerary(status: ItineraryStatus, action: ItineraryAction): ItineraryStatus {
  const nextStatus = ITINERARY_TRANSITIONS[status][action];
  if (!nextStatus) throw new Error(`Invalid itinerary transition: ${status} -> ${action}`);
  return nextStatus;
}
