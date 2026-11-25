import { describe, expect, it } from "vitest";
import { createI18n } from "vue-i18n";
import enMessages from "@/lang/package/en.json";
import zhMessages from "@/lang/package/zh-cn.json";
import {
  buildLogExpansionView,
  canExpandLog,
  changeLabel,
  changeTone,
  formatLogValue,
  operatorLabel,
  type LogDisplayContext,
} from "./log-presentation";

function createContext(locale: "zh-cn" | "en"): LogDisplayContext {
  const { global } = createI18n({ legacy: false, locale, messages: { "zh-cn": zhMessages, en: enMessages } });
  return { locale, te: key => global.te(key), t: (key, params) => params ? global.t(key, params) : global.t(key) };
}

const zh = createContext("zh-cn");
const en = createContext("en");

describe("独立站询盘汇总展示", () => {
  it("旧日志无账号时只显示姓名", () => {
    expect(operatorLabel({ operatorName: "张三", operatorUsername: null })).toBe("张三");
    expect(operatorLabel({ operatorName: "张三", operatorUsername: "zs" })).toBe("张三（zs）");
  });

  it("区分历史 null、空数组与版本错开缺失 displayChanges 的展开状态", () => {
    expect(canExpandLog({ changes: null, displayChanges: null, detail: "", metadata: {} })).toBe(true);
    expect(buildLogExpansionView({ displayChanges: null, detail: "", metadata: {} }).changesState).toBe(
      "not_recorded",
    );

    expect(canExpandLog({ changes: [], displayChanges: [], detail: "", metadata: {} })).toBe(false);
    expect(canExpandLog({ changes: [], displayChanges: [], detail: "补充说明", metadata: {} })).toBe(true);
    expect(buildLogExpansionView({ displayChanges: [], detail: "补充说明", metadata: {} }).changesState).toBe(
      "empty",
    );

    // 版本错开时服务端尚未返回 displayChanges，展开后显示提示而不回退打印原始编号
    const skewed = {
      changes: [{ path: "days[uuid-1].departCityId", kind: "changed" as const, before: "uuid-a", after: "uuid-b" }],
      displayChanges: undefined,
      detail: "",
      metadata: {},
    };
    expect(canExpandLog(skewed)).toBe(true);
    const skewedView = buildLogExpansionView(skewed);
    expect(skewedView.changesState).toBe("unavailable");
    expect(skewedView.changes).toEqual([]);
  });

  it("区分当天日内项目顺序与独立分类顺序，并展示含导游的排列及中英文切换", () => {
    const eventOrderRow = {
      fields: ["days", "eventOrder"],
      kind: "changed" as const,
      context: { dayNumber: 5 },
      before: [
        { ref: "item", nameZh: "故宫", nameEn: "Forbidden City" },
        { ref: "guide", nameZh: "英语" },
        { ref: "meal", mealSlot: "lunch", nameZh: "全聚德", nameEn: "Quanjude" },
      ],
      after: [
        { ref: "meal", mealSlot: "lunch", nameZh: "全聚德", nameEn: "Quanjude" },
        { ref: "guide", nameZh: "英语" },
        { ref: "item", nameZh: "故宫", nameEn: "Forbidden City" },
      ],
    };
    const itemOrderRow = {
      fields: ["days", "items", "order"],
      kind: "changed" as const,
      context: { dayNumber: 5 },
      before: [{ ref: "item", nameZh: "故宫", nameEn: "Forbidden City" }],
      after: [{ ref: "item", nameZh: "天坛", nameEn: "Temple of Heaven" }],
    };

    expect(changeLabel(eventOrderRow, zh)).toBe("第 5 天 / 日内项目顺序");
    expect(changeLabel(eventOrderRow, en)).toBe("Day 5 / Daily item order");
    expect(changeLabel(itemOrderRow, zh)).toBe("第 5 天 / 景点顺序");
    expect(changeLabel(itemOrderRow, en)).toBe("Day 5 / Attraction order");

    expect(formatLogValue(eventOrderRow.before, eventOrderRow.fields, zh)).toBe(
      "故宫（景点项目）\n英语（导游）\n全聚德（餐食，午餐）",
    );
    expect(formatLogValue(eventOrderRow.before, eventOrderRow.fields, en)).toBe(
      "Forbidden City (Attraction)\n英语 (Guide)\nQuanjude (Meal, Lunch)",
    );
  });

  it("仅换酒店时保留移除与新增酒店明细及档位、城市与配置酒店引用", () => {
    const removedHotel = {
      fields: ["days", "hotels"],
      kind: "removed" as const,
      context: { dayNumber: 1, nameZh: "旧酒店", hotelTier: "B" as const },
      before: {
        tier: "B",
        cityId: { ref: "city", nameZh: "北京", nameEn: "Beijing" },
        configHotelId: { ref: "configHotel", nameZh: "旧酒店", nameEn: "Old Hotel" },
        nameZh: "旧酒店",
        breakfastIncluded: true,
      },
      after: null,
    };
    const addedHotel = {
      fields: ["days", "hotels"],
      kind: "added" as const,
      context: { dayNumber: 1, nameZh: "新酒店", hotelTier: "B" as const },
      before: null,
      after: {
        tier: "B",
        cityId: { ref: "city", nameZh: "北京", nameEn: "Beijing" },
        resourceId: { ref: "sharedHotel", nameZh: "新酒店", nameEn: "New Hotel" },
        nameZh: "新酒店",
        breakfastIncluded: false,
      },
    };

    expect(changeTone(removedHotel)).toBe("removed");
    expect(changeTone(addedHotel)).toBe("added");
    expect(changeLabel(removedHotel, zh)).toBe("第 1 天 / 旧酒店 / B 舒适四星 / 酒店");
    expect(changeLabel(addedHotel, en)).toBe("Day 1 / 新酒店 / B Comfort 4-star / Hotels");

    const beforeText = formatLogValue(removedHotel.before, removedHotel.fields, zh, {
      kind: "removed",
      side: "before",
    });
    expect(beforeText).toContain("酒店档次: B 舒适四星");
    expect(beforeText).toContain("城市: 北京");
    expect(beforeText).toContain("独立站酒店: 旧酒店（独立站酒店）");
    expect(beforeText).toContain("含早: 是");

    const afterText = formatLogValue(addedHotel.after, addedHotel.fields, en, {
      kind: "added",
      side: "after",
    });
    expect(afterText).toContain("City: Beijing");
    expect(afterText).toContain("Shared resource: New Hotel (Shared hotel)");
    expect(afterText).toContain("Breakfast included: No");
  });

  it("渲染城市、餐厅历史明细来源、负责人、国家代码及历史名称缺失，不递归打印引用属性", () => {
    const restaurantRef = {
      ref: "restaurant",
      nameZh: "原餐标",
      nameEn: "Original Meal",
      source: "entry",
    };
    expect(formatLogValue(restaurantRef, ["days", "meals", "resourceId"], zh)).toBe(
      "原餐标（公共餐厅，历史明细名称）",
    );
    expect(formatLogValue(restaurantRef, ["days", "meals", "resourceId"], en)).toBe(
      "Original Meal (Shared restaurant, Historical entry name)",
    );
    expect(formatLogValue(restaurantRef, ["days", "meals", "resourceId"], zh)).not.toContain("ref:");

    expect(formatLogValue({ ref: "city" }, ["days", "departCityId"], zh)).toBe("城市（当时名称未记录）");
    expect(formatLogValue({ ref: "city" }, ["days", "departCityId"], en)).toBe(
      "City (Name not recorded at the time)",
    );
    expect(formatLogValue({ ref: "owner", nameZh: "李四" }, ["ownerId"], zh)).toBe("李四");
    expect(formatLogValue({ ref: "owner" }, ["ownerId"], en)).toBe(
      "Coordinator (Name not recorded at the time)",
    );
    expect(
      formatLogValue({ ref: "country", nameZh: "马来西亚", code: "MYS" }, ["countryItemId"], zh),
    ).toBe("马来西亚（MYS）");
    expect(formatLogValue({ ref: "country", code: "MYS" }, ["countryItemId"], en)).toBe("MYS");
  });

  it("整条匿名交通段新增/移除显示交通段及接送机字段", () => {
    const legRow = {
      fields: ["days", "legs"],
      kind: "added" as const,
      context: { dayNumber: 2 },
      before: null,
      after: {
        mode: "private_vehicle",
        fromCityId: { ref: "city", nameZh: "北京", nameEn: "Beijing" },
        toCityId: { ref: "city", nameZh: "天津", nameEn: "Tianjin" },
        isAirportPickup: true,
        isAirportDropoff: false,
      },
    };
    expect(changeLabel(legRow, zh)).toBe("第 2 天 / 交通段");
    expect(changeLabel(legRow, en)).toBe("Day 2 / Transport leg");

    const legTextZh = formatLogValue(legRow.after, legRow.fields, zh, {
      kind: "added",
      side: "after",
    });
    expect(legTextZh).toContain("交通方式: 专车");
    expect(legTextZh).toContain("接机: 是");
    expect(legTextZh).toContain("送机: 否");

    expect(formatLogValue({ ref: "leg", mode: "hsr" }, ["days", "eventOrder"], zh)).toBe("交通段（高铁）");
    expect(formatLogValue({ ref: "leg", mode: "hsr" }, ["days", "eventOrder"], en)).toBe(
      "Transport leg (High-speed rail)",
    );
    expect(formatLogValue({ ref: "leg" }, ["days", "eventOrder"], zh)).toBe("交通段（当时名称未记录）");
  });

  it("支持复制来源、回收日与暂存编排草稿中的引用与中英文翻译", () => {
    const recycleLeg = {
      fields: ["deletedDays", "day", "legs"],
      kind: "removed" as const,
      context: { dayNumber: 3 },
      before: { mode: "flight" },
      after: null,
    };
    expect(changeLabel(recycleLeg, zh)).toBe("第 3 天 / 已移除的行程日 / 交通段");
    expect(changeLabel(recycleLeg, en)).toBe("Day 3 / Removed itinerary days / Transport leg");

    const draftRow = {
      fields: ["reorderDraft"],
      kind: "changed" as const,
      before: null,
      after: {
        dayIds: [{ ref: "day", dayNumber: 1 }],
        addedDayIds: [{ ref: "day", dayNumber: 2 }],
        placements: [
          {
            dayId: { ref: "day", dayNumber: 1 },
            itemIds: [{ ref: "meal", mealSlot: "dinner" }, { ref: "event" }],
          },
        ],
        copies: [
          {
            sourceId: { ref: "item", nameZh: "颐和园", nameEn: "Summer Palace" },
            parentId: { ref: "item", nameZh: "颐和园", nameEn: "Summer Palace" },
            dayId: { ref: "day", dayNumber: 2 },
            placed: true,
          },
        ],
        removedItemIds: [{ ref: "service", nameZh: "接站服务", nameEn: "Station pickup" }],
        overnight: [
          {
            dayId: { ref: "day", dayNumber: 1 },
            cityId: { ref: "city", nameZh: "北京", nameEn: "Beijing" },
          },
        ],
      },
    };
    expect(changeLabel(draftRow, zh)).toBe("暂存编排");
    expect(changeLabel(draftRow, en)).toBe("Arrangement draft");

    const draftZh = formatLogValue(draftRow.after, draftRow.fields, zh);
    expect(draftZh).toContain("编排位置:");
    expect(draftZh).toContain("餐食（晚餐）");
    expect(draftZh).toContain("项目（当时名称未记录）");
    expect(draftZh).toContain("复制来源: 颐和园（景点项目）");
    expect(draftZh).toContain("移除项目: 接站服务（服务）");
    expect(draftZh).toContain("住宿城市安排:");

    const draftEn = formatLogValue(draftRow.after, draftRow.fields, en);
    expect(draftEn).toContain("Placements:");
    expect(draftEn).toContain("Meal (Dinner)");
    expect(draftEn).toContain("Item (Name not recorded at the time)");
    expect(draftEn).toContain("Copy source: Summer Palace (Attraction)");
    expect(draftEn).toContain("Removed items: Station pickup (Service)");
  });

  it("按目标类型翻译行程草稿状态，支持全程分档/逐晚车型/自定义车型/五类分项与历史方案 A/B", () => {
    expect(formatLogValue("draft", ["status"], zh, { targetType: "itinerary" })).toBe("草稿");
    expect(formatLogValue("draft", ["status"], en, { targetType: "itinerary" })).toBe("Draft");
    expect(formatLogValue("planning", ["status"], zh, { targetType: "inquiry" })).toBe("行程设计中");
    expect(formatLogValue("planning", ["status"], en, { targetType: "inquiry" })).toBe(
      "Designing Itinerary",
    );

    expect(formatLogValue("tiered", ["hotelPricingMode"], zh)).toBe("全程分档报价");
    expect(formatLogValue("nightly", ["hotelPricingMode"], en)).toBe("Nightly accommodation pricing");
    expect(formatLogValue("A", ["plan"], zh)).toBe("A");
    expect(formatLogValue("A", ["hotelTier"], zh)).toBe("A 高端五星");

    const customPriceRow = {
      fields: ["vehiclePrices", "priceComponents", "hotel", "unitPrice"],
      kind: "changed" as const,
      context: { vehicleType: "定制.车]", hotelTier: "A" as const },
      before: "100.00",
      after: "120.00",
    };
    expect(changeLabel(customPriceRow, zh)).toBe("A 高端五星 / 定制.车] / 车型报价 / 价格分项 / 酒店 / 单价");
    expect(changeLabel(customPriceRow, en)).toBe(
      "A Luxury 5-star / 定制.车] / Vehicle prices / Price items / Hotel / Unit price",
    );

    const nightlyGroup = [
      {
        vehicleType: "7_seat",
        priceComponents: [
          { category: "guide", unitPrice: "300.00", showInPdf: true },
          { category: "vehicle", unitPrice: "500.00", showInPdf: false },
          { category: "attraction", unitPrice: "150.00", showInPdf: true },
          { category: "meal", unitPrice: "80.00", showInPdf: false },
        ],
      },
    ];
    const nightlyZh = formatLogValue(nightlyGroup, ["nightlyVehiclePrices"], zh);
    expect(nightlyZh).toContain("车型: 7座");
    expect(nightlyZh).toContain("分项: 导游");
    expect(nightlyZh).toContain("分项: 用车");
    expect(nightlyZh).toContain("分项: 景点");
    expect(nightlyZh).toContain("分项: 餐食");
    expect(formatLogValue("INQ-20261124-01", ["websiteInquiryNo"], en)).toBe("INQ-20261124-01");
  });

  it("区分新增前/移除后空值与已有记录的 serviceDates=null 连续服务日", () => {
    expect(
      formatLogValue(null, ["serviceDates"], zh, { kind: "added", side: "before" }),
    ).toBe("空");
    expect(
      formatLogValue(null, ["serviceDates"], en, { kind: "removed", side: "after" }),
    ).toBe("Empty");
    expect(
      formatLogValue(null, ["serviceDates"], zh, { kind: "changed", side: "after" }),
    ).toBe("连续服务日");
    expect(
      formatLogValue(null, ["serviceDates"], en, { kind: "changed", side: "before" }),
    ).toBe("Consecutive days");
    expect(
      formatLogValue({ serviceDates: null }, ["days"], zh, { kind: "added", side: "after" }),
    ).toContain("服务日期: 连续服务日");
  });

  it("报价编号、转交原因和流失原因只呈现一次，保留独立历史说明与实质前后变化", () => {
    // 确认报价：detail 与 quotationCode 相同时只呈现一次
    const quoteView = buildLogExpansionView({
      displayChanges: [{ fields: ["status"], kind: "changed", before: "draft", after: "quoted" }],
      detail: "WQT-20261124-01",
      metadata: { quotationCode: "WQT-20261124-01" },
    });
    expect(quoteView.quotationCode).toBe("WQT-20261124-01");
    expect(quoteView.detail).toBe("");

    // 独立历史说明保留
    const quoteWithNote = buildLogExpansionView({
      displayChanges: [],
      detail: "客户电话确认",
      metadata: { quotationCode: "WQT-20261124-01" },
    });
    expect(quoteWithNote.quotationCode).toBe("WQT-20261124-01");
    expect(quoteWithNote.detail).toBe("客户电话确认");

    // 转交：已有 ownerId 变化时隐藏标准 detail，只展示一次转交原因
    const transferView = buildLogExpansionView({
      displayChanges: [
        {
          fields: ["ownerId"],
          kind: "changed",
          before: { ref: "owner", nameZh: "张三" },
          after: { ref: "owner", nameZh: "李四" },
        },
      ],
      detail: "张三 → 李四：调整分工",
      metadata: { transferReason: "调整分工" },
    });
    expect(transferView.transferReason).toBe("调整分工");
    expect(transferView.detail).toBe("");

    // 历史转交无字段差异：保留带负责人姓名的 detail，隐藏重复 transferReason
    const legacyTransfer = buildLogExpansionView({
      displayChanges: null,
      detail: "张三 → 李四：调整分工",
      metadata: { transferReason: "调整分工" },
    });
    expect(legacyTransfer.transferReason).toBe("");
    expect(legacyTransfer.detail).toBe("张三 → 李四：调整分工");

    // 普通流失：before 为空时只在顶部呈现一次流失原因
    const lostView = buildLogExpansionView({
      displayChanges: [
        { fields: ["status"], kind: "changed", before: "planning", after: "lost" },
        { fields: ["lostReason"], kind: "changed", before: "", after: "价格过高" },
      ],
      detail: "价格过高",
      metadata: { lostReason: "价格过高" },
    });
    expect(lostView.lostReason).toBe("价格过高");
    expect(lostView.detail).toBe("");
    expect(lostView.changes.map((c) => c.fields[0])).toEqual(["status"]);

    // 流失原因有实质前后变化时保留两侧，隐藏重复顶部与 detail
    const lostEdited = buildLogExpansionView({
      displayChanges: [
        { fields: ["lostReason"], kind: "changed", before: "预算不足", after: "改期明年" },
      ],
      detail: "改期明年",
      metadata: { lostReason: "改期明年" },
    });
    expect(lostEdited.lostReason).toBe("");
    expect(lostEdited.detail).toBe("");
    expect(lostEdited.changes).toEqual([
      { fields: ["lostReason"], kind: "changed", before: "预算不足", after: "改期明年" },
    ]);
  });
});
