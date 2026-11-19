import type { FormInstance } from "element-plus";
import { ApiError } from "@/api/request";
import { ApiErrorCode } from "@/api/error-code";

/** VALIDATION_ERROR 的 details 为“字段路径 → 原因数组”；按响应顺序返回字段路径。 */
export function validationErrorPaths(error: unknown): string[] {
  if (!(error instanceof ApiError) || error.code !== ApiErrorCode.VALIDATION_ERROR || !error.details)
    return [];
  return Object.keys(error.details);
}

/**
 * 把首个服务端字段错误对应到表单 prop：`items[0].name`、`items.0.name` 逐级去掉末段，
 * 直到命中已知 prop；无匹配返回 undefined。
 */
export function firstValidationProp(error: unknown, props: readonly string[]): string | undefined {
  for (const path of validationErrorPaths(error)) {
    let candidate = path;
    while (candidate) {
      if (props.includes(candidate)) return candidate;
      const parent = candidate.replace(/(\.[^.[\]]+|\[\d+\])$/, "");
      if (parent === candidate) break;
      candidate = parent;
    }
  }
  return undefined;
}

/** 后端校验失败时滚动到首个出错字段；提示仍由调用方按统一规则只弹一次。 */
export function locateValidationError(
  form: Pick<FormInstance, "scrollToField"> | undefined,
  error: unknown,
  props: readonly string[],
) {
  const prop = firstValidationProp(error, props);
  if (form && prop) form.scrollToField(prop);
  return prop;
}
