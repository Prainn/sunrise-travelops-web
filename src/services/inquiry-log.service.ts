import { request } from "@/api/request";
import type { PageResult } from "@/types/common";
import type { InquiryLogAction, InquiryLogRecord } from "@/types/inquiry-log";
import type { PersonOption } from "./inquiry.service";
export interface LogQuery { page: number; pageSize: number; inquiryId?: string; inquiryCode?: string; operatorId?: string; action?: InquiryLogAction | ""; from?: string; to?: string }
export interface LogReport { totalOperations: number; inquiryCount: number; operatorCount: number; changedFields: number; byAction: { action: InquiryLogAction; count: number }[] }
export const inquiryLogService = {
  list(query: LogQuery) { return request.get<PageResult<InquiryLogRecord>>("/inquiry-logs", { params: { ...query } }); },
  report(query: LogQuery) { return request.get<LogReport>("/inquiry-logs/report", { params: { ...query } }); },
  operators() { return request.get<PersonOption[]>("/inquiry-logs/operators"); },
};
