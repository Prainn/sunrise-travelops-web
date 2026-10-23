import type { PageResult } from "./common";

export type SummaryReport =
  | "shengxu-agency-summary"
  | "shengxu-coordinator-summary"
  | "linxi-quote-summary"
  | "linxi-platform-summary"
  | "website-quote-summary"
  | "website-platform-summary";

export interface SummaryNotes {
  firstFollowUp: string;
  tourNumbers: string;
  version: number;
}
export interface LedgerSummaryItem extends SummaryNotes {
  id: string;
  name: string;
  quotedCount: number;
  convertedCount: number;
  reasons: { ledgerId: string; date: string; text: string }[];
  canEdit: boolean;
}
export interface LedgerSummaryQuery {
  page: number;
  pageSize: number;
  keyword?: string;
  from?: string;
  to?: string;
}
export type LedgerSummaryPage = PageResult<LedgerSummaryItem>;
