import { request } from "@/api/request";
import type { LoginScope } from "@/types/auth";
import type { PageResult } from "@/types/common";
import type { OperationCategory, OperationLog } from "@/types/operation-log";

export const operationLogService = {
  getPage(params: {
    page: number;
    pageSize: number;
    category?: OperationCategory;
    scope?: LoginScope;
    start?: string;
    end?: string;
    actorName?: string;
  }) {
    return request.get<PageResult<OperationLog>>("/system/operation-logs", { params });
  },
};
