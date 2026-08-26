export type InquiryStatus = "new" | "planning" | "quoted" | "lost" | "archived";

export interface InquiryRecord {
  id: string;
  code: string;
  agencyId: string;
  agencyCode: string;
  agencyName: string;
  contactName: string;
  email: string;
  phone: string;
  countryOrRegion: string;
  sourceChannel: string;
  originalMessage: string;
  internalRemark: string;
  owner: string;
  operationsCoordinator: string;
  nextFollowUpAt: string;
  plannedDays: number;
  lostReason: string;
  status: InquiryStatus;
  creator: string;
  createdAt: string;
}
