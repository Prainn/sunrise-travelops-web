import { reactive } from "vue";
import type { BusinessCategoryTypeRecord } from "@/types/resource";

export const businessCategoryTypeStore = reactive<BusinessCategoryTypeRecord[]>([]);

export function getBusinessCategoryTypeName(name: string, englishName: string, locale = "zh-CN") {
  return locale.toLowerCase().startsWith("en") ? englishName : name;
}
