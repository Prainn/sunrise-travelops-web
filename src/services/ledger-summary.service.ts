import { request } from "@/api/request";
import type { LedgerSummaryPage, LedgerSummaryQuery, SummaryNotes, SummaryReport } from "@/types/ledger-summary";

export const ledgerSummaryService = {
  list(report: SummaryReport, query: LedgerSummaryQuery) {
    return request.get<LedgerSummaryPage>(`/ledgers/summaries/${report}`, { params: { ...query } });
  },
  saveNotes(report: SummaryReport, id: string, input: Omit<SummaryNotes, "firstFollowUp"> & { firstFollowUp?: string }) {
    return request.put<SummaryNotes>(`/ledgers/summaries/${report}/${encodeURIComponent(id)}`, input);
  },
};
