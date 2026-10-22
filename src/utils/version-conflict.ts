import { ApiError } from "@/api/request";
import { translate } from "@/lang/utils";

/**
 * 通用 409 CONFLICT 带 currentVersion 时提示刷新；其他错误沿用请求层本地化文案。
 * 不据此自动升级 version 重试，避免覆盖他人修改。
 */
export function requestErrorMessage(error: unknown): string {
  if (error instanceof ApiError && error.code === "CONFLICT" && error.details?.currentVersion !== undefined)
    return translate("common.versionConflict");
  return error instanceof Error ? error.message : translate("request.failed");
}
