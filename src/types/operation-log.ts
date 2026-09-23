export type OperationCategory =
  "login" | "user" | "system-category" | "business-category" | "resource";

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
