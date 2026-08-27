import { inquiryLogs } from "@/data/data";
import type { InquiryLogCreate, InquiryLogRecord } from "@/types/inquiry-log";
import { createId, formatDateTime } from "@/utils";

export const inquiryLogService = {
  /** 按时间倒序返回指定询盘的操作日志。 */
  async listByInquiryId(inquiryId: string): Promise<InquiryLogRecord[]> {
    return inquiryLogs
      .filter((record) => record.inquiryId === inquiryId)
      .sort((left, right) => right.occurredAt.localeCompare(left.occurredAt))
      .map((record) => ({ ...record, metadata: record.metadata ? { ...record.metadata } : undefined }));
  },

  /** 将业务操作写入当前前端 mock 日志。 */
  async append(data: InquiryLogCreate): Promise<InquiryLogRecord> {
    const record: InquiryLogRecord = {
      ...data,
      id: createId("inquiry-log"),
      occurredAt: formatDateTime(new Date()),
    };
    inquiryLogs.unshift(record);
    return record;
  },
};
