import { reactive } from "vue";
import type { ItineraryItemType, ItineraryPriceUnit } from "@/types/itinerary";
import type { ResourceUnitRecord } from "@/types/resource";

export const resourceUnitStore = reactive<ResourceUnitRecord[]>([]);

export function getResourceUnitName(code: ItineraryPriceUnit, locale = "zh-CN") {
  const unit = resourceUnitStore.find((item) => item.code === code);
  if (!unit) return code || "-";
  return locale.toLowerCase().startsWith("en") ? unit.englishName : unit.name;
}

export function getResourceUnitOptions(resourceType: ItineraryItemType, locale = "zh-CN") {
  return resourceUnitStore
    .filter((item) => item.status === "enabled" && item.resourceTypes.includes(resourceType))
    .map((item) => ({ value: item.code, label: getResourceUnitName(item.code, locale) }));
}
