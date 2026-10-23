import type { PageResult } from "./common";

export type SummaryReport =
  | "shengxu-agency-summary"
  | "shengxu-coordinator-summary"
  | "linxi-quote-summary"
  | "linxi-platform-summary"
  | "website-quote-summary"
  | "website-platform-summary";

export interface LedgerSummaryItem {
  firstFollowUp: string;
  id: string;
  name: string;
  quotedCount: number;
  convertedCount: number;
}
export interface LedgerSummaryQuery {
  page: number;
  pageSize: number;
  keyword?: string;
  from?: string;
  to?: string;
}
export type LedgerSummaryPage = PageResult<LedgerSummaryItem>;
