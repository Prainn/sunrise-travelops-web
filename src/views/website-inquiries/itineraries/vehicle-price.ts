import type { WebsiteDay, WebsiteHotelTier, WebsitePriceComponent } from "@/types/website";
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

export const HOTEL_TIERS: WebsiteHotelTier[] = ["A", "B", "C", "D"];
/** 合同上限：车型×酒店档次组合数超过即提示，不静默截断。 */
export const MAX_PRICE_COMBINATIONS = 2000;

/** 报价组合唯一键 [vehicleType, hotelTier]。 */
export function priceKey(vehicleType: string | null, hotelTier: WebsiteHotelTier | null) {
  return JSON.stringify([vehicleType, hotelTier]);
}

/**
 * 候选维度只取当前有效日程（不含 deletedDays 与未应用的 reorderDraft）：
 * 专车段的非空车型按原文去重；住宿日酒店档次按 A–D 排序；维度为空时为 [null]（无专车/不住宿）。
 */
export function quotationCandidates(days: WebsiteDay[]) {
  const vehicles = [...new Set(days.flatMap(day => day.legs
    .filter(leg => leg.mode === "private_vehicle" && leg.vehicleType?.trim())
    .map(leg => leg.vehicleType!)))]
    .sort((a, b) => a.localeCompare(b, "en", { numeric: true }));
  const used = new Set(days.filter(day => day.overnightCityId).flatMap(day => day.hotels.map(hotel => hotel.tier)));
  const tiers = HOTEL_TIERS.filter(tier => used.has(tier));
  return {
    vehicleTypes: vehicles.length ? vehicles : [null],
    hotelTiers: tiers.length ? tiers : [null],
  } as { vehicleTypes: (string | null)[]; hotelTiers: (WebsiteHotelTier | null)[] };
}

/** 本地草稿派生的司机/导游：任一有效日有专车段即含司机，有导游语种即含导游。 */
export function quotationServices(days: WebsiteDay[]) {
  const driverDays = days.filter(day => day.legs.some(leg => leg.mode === "private_vehicle")).map(day => day.dayNumber);
  const guideServices = days.filter(day => day.guideLanguage.trim()).map(day => ({ dayNumber: day.dayNumber, language: day.guideLanguage }));
  return { includesDriver: driverDays.length > 0, includesGuide: guideServices.length > 0, driverDays, guideServices };
}
