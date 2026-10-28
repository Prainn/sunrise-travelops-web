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
