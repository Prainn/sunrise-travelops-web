import { reactive } from "vue";
import { transportMethods } from "@/data/data";

export const transportMethodStore = reactive(transportMethods);

export function getTransportMethodName(code: string, locale = "zh-CN") {
  const method = transportMethodStore.find((item) => item.code === code);
  if (!method) return code;
  return locale.toLowerCase().startsWith("en") ? method.englishName : method.name;
}

export function getTransportMethodNames(value: string, locale = "zh-CN") {
  return value.split(",").filter(Boolean).map((code) => getTransportMethodName(code, locale)).join(" / ");
}

export function getTransportMethodOptions(locale = "zh-CN") {
  return transportMethodStore
    .filter((item) => item.status === "enabled")
    .map((item) => ({ value: item.code, label: getTransportMethodName(item.code, locale) }));
}
