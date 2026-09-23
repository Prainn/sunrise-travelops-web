import { request } from "@/api/request";
import type { PageResult } from "@/types/common";
import type { OperationCategory, OperationLog } from "@/types/operation-log";

export const operationLogService = {
  getPage(params: { page: number; pageSize: number; category?: OperationCategory }) {
    return request.get<PageResult<OperationLog>>("/system/operation-logs", { params });
  },
};
