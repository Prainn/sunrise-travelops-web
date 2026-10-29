import type { WebsitePriceComponent } from "@/types/website";
import { toCents } from "@/utils/money";

/** 合同：非负金额字符串，最多 10 位整数及 2 位小数。 */
export function isValidVehiclePrice(value: string) {
  return /^(0|[1-9]\d{0,9})(\.\d{1,2})?$/.test(value);
}

/** The allowed unit price × guest count can exceed safe integer cents; multiply as bigint. */
export function vehiclePriceTotal(unitPrice: string | null, pax: number | null): string | null {
  if (unitPrice === null || !isValidVehiclePrice(unitPrice) || pax === null || !Number.isInteger(pax) || pax < 1) return null;
  const cents = BigInt(toCents(Number(unitPrice))) * BigInt(pax);
  return `${cents / 100n}.${String(cents % 100n).padStart(2, "0")}`;
}

export const PRICE_CATEGORIES = ["hotel", "guide", "vehicle", "attraction", "meal"] as const;

/** Null means no price offered; hidden components still contribute. */
export function componentUnitPrice(components: WebsitePriceComponent[]): string | null {
  const amounts = components.filter(row => row.unitPrice !== null);
  if (!amounts.length || amounts.some(row => !isValidVehiclePrice(row.unitPrice!))) return null;
  const cents = amounts.reduce((total, row) => {
    const [whole, fraction = ""] = row.unitPrice!.split(".");
    return total + BigInt(whole!) * 100n + BigInt(fraction.padEnd(2, "0"));
  }, 0n);
  if (cents > 999999999999n) return null;
  return `${cents / 100n}.${String(cents % 100n).padStart(2, "0")}`;
}
