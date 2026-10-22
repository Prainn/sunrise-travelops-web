import type { FormItemRule } from "element-plus";
import { translate } from "@/lang/utils";
import type { AccountTourCodeOverride, LinkedAccount } from "@/types/account-link";

const TOUR_CODE_PATTERN = /^[A-Z0-9]{1,10}$/;

export function normalizeTourCode(value: string): string {
  return value.trim().toUpperCase();
}

/** 统一标识必填；调整标识留空表示不调整。 */
export function tourCodeRules(required: boolean): FormItemRule[] {
  return [
    {
      trigger: "blur",
      validator: (_rule, value: string | undefined, callback) => {
        const code = normalizeTourCode(value ?? "");
        if (!code && !required) return callback();
        callback(TOUR_CODE_PATTERN.test(code) ? undefined : new Error(translate("accountLink.tourCodeInvalid")));
      },
    },
  ];
}

/** 仅提交可调整账号中已填写的新标识。 */
export function collectTourCodes(
  values: Record<string, string>,
  accounts: LinkedAccount[],
): AccountTourCodeOverride[] {
  return accounts.flatMap(({ userId }) => {
    const tourCode = normalizeTourCode(values[userId] ?? "");
    return tourCode ? [{ userId, tourCode }] : [];
  });
}

/** 标识与给定范围内其他账号相同（不区分大小写）。 */
export function sharesTourCode(account: LinkedAccount, accounts: LinkedAccount[]): boolean {
  const code = account.tourCode?.trim().toUpperCase();
  return Boolean(
    code &&
      accounts.some(
        (other) => other.userId !== account.userId && other.tourCode?.trim().toUpperCase() === code,
      ),
  );
}
