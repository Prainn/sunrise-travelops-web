import { inquiryLogService } from "@/services/inquiry-log.service";
import { useUserStore } from "@/stores/user";
import type { InquiryLogAction, InquiryLogTargetType } from "@/types/inquiry-log";

interface RecordInquiryLogOptions {
  inquiryId: string;
  action: InquiryLogAction;
  targetType: InquiryLogTargetType;
  targetId: string;
  targetCode: string;
  summary?: string;
  metadata?: Record<string, unknown>;
}

export function useInquiryLog() {
  const userStore = useUserStore();

  function recordInquiryLog(options: RecordInquiryLogOptions) {
    const user = userStore.userInfo;
    return inquiryLogService.append({
      ...options,
      operatorId: user.userId ?? "",
      operatorUsername: user.username ?? "",
      operatorName: user.nickname || user.username || "",
    });
  }

  return { recordInquiryLog };
}
