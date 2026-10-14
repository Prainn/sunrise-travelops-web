import type { AttractionCategory } from "@/types/resource";

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
