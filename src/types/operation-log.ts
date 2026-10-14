export type OperationCategory =
  "login" | "user" | "system-category" | "business-category" | "resource"
  | "inquiry" | "itinerary" | "quotation" | "tour" | "guide-leave" | "guide-rating"
  | "website-config";

export interface OperationLog {
  id: string;
  time: string;
  category: OperationCategory;
  action: string;
  success: boolean;
  actorId: string | null;
  actorName: string;
  scope: string | null;
  detail: string;
  ip: string | null;
}
