import { reactive } from "vue";
import type { AttractionCategory, BusinessCategoryOptionRecord } from "@/types/resource";

export const attractionCategoryOptions: Array<{
  value: AttractionCategory;
  labelKey: string;
}> = [
  { value: "scenic", labelKey: "attraction.categoryScenic" },
  { value: "performance", labelKey: "attraction.categoryPerformance" },
  { value: "experience", labelKey: "attraction.categoryExperience" },
  { value: "transport", labelKey: "attraction.categoryTransport" },
  { value: "package", labelKey: "attraction.categoryPackage" },
];

export const attractionCategoryLabelKeys = Object.fromEntries(
  attractionCategoryOptions.map((option) => [option.value, option.labelKey]),
) as Record<AttractionCategory, string>;

export const attractionItemTypeStore = reactive<BusinessCategoryOptionRecord[]>([]);

export function getAttractionItemTypeName(code: string, locale: string) {
  const item = attractionItemTypeStore.find((option) => option.code === code);
  if (!item) return code;
  return locale.toLowerCase().startsWith("en") ? item.englishName : item.name;
}
