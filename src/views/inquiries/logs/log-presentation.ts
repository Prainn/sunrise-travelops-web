import type { InquiryLogRecord } from "@/types/inquiry-log";
import { getTransportMethodNames } from "@/utils/transport-method";
import { getResourceUnitName } from "@/utils/resource-unit";

type Change = InquiryLogRecord["changes"][number];
interface DisplayContext {
  t: (key: string) => string;
  te: (key: string) => boolean;
  locale: string;
  targetType: InquiryLogRecord["targetType"];
}
const hiddenFields = new Set(["id", "resourceId", "resourcePriceId", "hotelId", "vehicleId", "guideId", "agencyId", "contactId", "ownerId"]);

function isEmpty(value: unknown): boolean {
  return value == null || value === "" ||
    (Array.isArray(value) && value.length === 0) ||
    (typeof value === "object" && value !== null && Object.keys(value).length === 0);
}

export function changeTone(change: Pick<Change, "before" | "after">): "added" | "removed" | "changed" {
  if (isEmpty(change.before) && !isEmpty(change.after)) return "added";
  if (!isEmpty(change.before) && isEmpty(change.after)) return "removed";
  return "changed";
}

/** Translate by field, including nested added/deleted records; never translate customer text as codes. */
export function formatLogValue(value: unknown, path: string, context: DisplayContext): string {
  const { t, te, locale, targetType } = context;
  if (value == null) return "";
  if (typeof value === "boolean") return t(value ? "common.yes" : "common.no");
  if (Array.isArray(value)) return value.map(item => formatLogValue(item, path, context)).join("\n");
  if (typeof value === "object") {
    return Object.entries(value).filter(([key]) => !hiddenFields.has(key)).map(([key, item]) => {
      const label = `inquiry.log.fields.${key}`;
      return `${te(label) ? t(label) : key}: ${formatLogValue(item, path ? `${path}.${key}` : key, context)}`;
    }).join("\n");
  }
  if (typeof value !== "string" || !value) return String(value);
  const field = path.replace(/\[[^\]]+\]/g, "").split(".").at(-1);
  if (field === "transport") return getTransportMethodNames(value, locale);
  if (field === "unit") return getResourceUnitName(value, locale);
  let key = "";
  switch (field) {
    case "status": key = `${targetType}.statuses.${value}`; break;
    case "tier": case "hotelTier": case "vehicleTier": key = `inquiry.log.tiers.${value}`; break;
    case "rating": key = `hotel.ratings.${value}`; break;
    case "mealSlot": key = `itinerary.meals.${value}`; break;
    case "cabin": key = `itinerary.cabins.${value}`; break;
    case "type": key = path.includes("transportFees") ? `itinerary.feeCards.${value}` : `itinerary.resourceTypes.${value}`; break;
  }
  return key && te(key) ? t(key) : value;
}
