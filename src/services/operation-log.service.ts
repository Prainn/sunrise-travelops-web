import { request } from "@/api/request";
import type {
  OperationLogPageResult,
  OperationLogQueryParams,
} from "@/types/operation-log";
import { sendClientOperationEvent } from "@/utils/client-operation-log";

export const operationLogService = {
  getPage(params: OperationLogQueryParams) {
    return request.get<OperationLogPageResult>("/system/operation-logs", { params });
  },

  reportClientEvent: sendClientOperationEvent,
};
