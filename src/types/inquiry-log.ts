export type InquiryLogAction =
  | "inquiry_created"
  | "inquiry_updated"
  | "itinerary_created"
  | "itinerary_saved"
  | "itinerary_pdf_generated"
  | "inquiry_archived"
  | "inquiry_lost";

export type InquiryLogTargetType = "inquiry" | "itinerary";

export interface InquiryLogRecord {
  id: string;
  inquiryId: string;
  action: InquiryLogAction;
  occurredAt: string;
  operatorId: string;
  operatorUsername: string;
  operatorName: string;
  targetType: InquiryLogTargetType;
  targetId: string;
  targetCode: string;
  summary?: string;
  metadata?: Record<string, unknown>;
}

export type InquiryLogCreate = Omit<InquiryLogRecord, "id" | "occurredAt">;
