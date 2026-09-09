import { beforeEach, describe, expect, it } from "vitest";
import { createI18n } from "vue-i18n";
import zh from "@/lang/package/zh-cn.json";
import en from "@/lang/package/en.json";
import { transportMethodStore } from "@/utils/transport-method";
import { resourceUnitStore } from "@/utils/resource-unit";
import { canExpandLog, changeTone, formatLogValue } from "./log-presentation";

const i18n = createI18n({ legacy: false, locale: "zh", messages: { zh, en } });
function format(
  value: unknown,
  path: string,
  locale = "zh",
  targetType: "itinerary" | "inquiry" = "itinerary",
  days?: Record<string, { dayNumber: number; date: string }>
) {
  i18n.global.locale.value = locale as "zh" | "en";
  return formatLogValue(value, path, {
    t: i18n.global.t,
    te: i18n.global.te,
    locale,
    targetType,
    days,
  });
}
beforeEach(() => {
  transportMethodStore.splice(0, transportMethodStore.length,
    { id: "f", code: "flight", name: "飞机", englishName: "Flight", status: "enabled", remark: "" },
    { id: "t", code: "train", name: "火车", englishName: "Train", status: "enabled", remark: "" });
  resourceUnitStore.splice(0, resourceUnitStore.length,
    { id: "u", code: "person_time", name: "人次", englishName: "person/visit", status: "enabled", remark: "", resourceTypes: ["attraction"] });
});
describe("log value presentation", () => {
  it("translates dictionary values, multiple transport codes and locale changes", () => {
    expect(format("flight,train", "dailyPlans[d1].transport")).toBe("飞机 / 火车");
    expect(format("flight", "dailyPlans[d1].transport", "en")).toBe("Flight");
    expect(format("person_time", "dailyPlans[d1].items[i1].unit")).toBe("人次");
  });
  it("translates nested records and controlled enum fields without changing free text", () => {
    const text = format({ transport: "flight", items: [{ type: "restaurant", mealSlot: "lunch", unit: "person_time" }], description: "flight" }, "dailyPlans[d1]");
    expect(text).toContain("交通方式: 飞机");
    expect(text).toContain("类型: 餐食");
    expect(text).toContain("餐次: 午餐");
    expect(text).toContain("行程说明: flight");
    expect(format("draft", "status")).toBe("草稿");
    expect(format("new", "status", "zh", "inquiry")).toBe("新询盘");
    expect(format("business", "quote.transportFees[f].cabin")).toBe("商务舱");
    expect(format("flight", "quote.transportFees[f].type")).toBe("机票");
    expect(format("preferred_non_five_star", "hotelPlans[t].tier")).toBe("携程优选");
    expect(format("ctrip_preferred", "hotelPlans[t].hotels[h].rating")).toBe("携程优选");
    expect(format("vip", "vehiclePlans[v].tier")).toBe("VIP车型");
    expect(format("unknown", "dailyPlans[d].transport")).toBe("unknown");
  });
  it.each([null, undefined, "", [], {}])("colors changes from and to empty values: %s", empty => {
    expect(changeTone({ before: empty, after: "昆明" })).toBe("added");
    expect(changeTone({ before: "昆明", after: empty })).toBe("removed");
    expect(format(empty, "destination")).toBe("");
  });
  it("treats zero and false as values and colors edits orange", () => {
    expect(changeTone({ before: "昆明", after: "大理" })).toBe("changed");
    expect(changeTone({ before: null, after: 0 })).toBe("added");
    expect(changeTone({ before: false, after: null })).toBe("removed");
    expect(changeTone({ before: false, after: true })).toBe("changed");
    expect(format(false, "breakfastIncluded")).toBe("否");
  });
  it("formats guide service day IDs with itinerary day numbers and dates", () => {
    expect(format(
      ["day-1", "day-3"],
      "guidePlans[昆明].dayIds",
      "zh",
      "itinerary",
      {
        "day-1": { dayNumber: 1, date: "2026-09-09" },
        "day-3": { dayNumber: 3, date: "2026-09-11" },
      }
    )).toBe("第 1 天 · 2026-09-09\n第 3 天 · 2026-09-11");
  });
  it("disables expansion for PDF generation logs", () => {
    expect(canExpandLog({ action: "itinerary_pdf_generated" })).toBe(false);
    expect(canExpandLog({ action: "itinerary_saved" })).toBe(true);
  });
});
