import { reactive } from "vue";
import { businessCategoryTypes } from "@/data/data";

export const businessCategoryTypeStore = reactive(businessCategoryTypes);

export function getBusinessCategoryTypeName(name: string, englishName: string, locale = "zh-CN") {
  return locale.toLowerCase().startsWith("en") ? englishName : name;
}
