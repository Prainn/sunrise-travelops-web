import { request } from "@/api/request";
import type { LedgerSummaryPage, LedgerSummaryQuery, SummaryReport } from "@/types/ledger-summary";

export const ledgerSummaryService = {
  list(report: SummaryReport, query: LedgerSummaryQuery) {
    return request.get<LedgerSummaryPage>(`/ledgers/summaries/${report}`, { params: { ...query } });
  },
};
