import { reactive } from "vue";
import { configurationService } from "@/services/configuration.service";

export const businessCategoryTypeStore = reactive(configurationService.businessCategoryTypes);

export function getBusinessCategoryTypeName(name: string, englishName: string, locale = "zh-CN") {
  return locale.toLowerCase().startsWith("en") ? englishName : name;
}
