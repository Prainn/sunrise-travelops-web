import { ApiError } from "@/api/request";
import { translate } from "@/lang/utils";

/**
 * 优先显示后端明确原因；无 message 的版本冲突才使用本地刷新提示。
 * 不据此自动升级 version 重试，避免覆盖他人修改。
 */
export function requestErrorMessage(error: unknown): string {
  if (error instanceof ApiError && error.serverMessage) return error.serverMessage;
  if (error instanceof ApiError && error.code === "CONFLICT" && error.details?.currentVersion !== undefined)
    return translate("common.versionConflict");
  return error instanceof Error ? error.message : translate("request.failed");
}
