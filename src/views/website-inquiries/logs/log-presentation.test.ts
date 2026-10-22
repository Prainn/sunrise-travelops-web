import { describe, expect, it } from "vitest";
import { canExpandLog, changeLabel, operatorLabel } from "./log-presentation";

const labels: Record<string, string> = {
  "websiteInquiry.log.fields.days": "每日行程",
  "websiteInquiry.log.fields.nameZh": "中文名称",
  "websiteInquiry.log.fields.unitPrice": "单价",
  "websiteInquiry.vehicleTypes.7_seat": "7座车",
  "websiteInquiry.log.record": "完整记录",
};
const context = {
  t: (key: string, params?: Record<string, string | number>) =>
    key === "websiteInquiry.log.day" ? `第 ${params?.day} 天` : (labels[key] ?? key),
  te: (key: string) => key in labels,
  locale: "zh-cn",
};

describe("独立站询盘汇总展示", () => {
  it("旧日志无账号时只显示姓名", () => {
    expect(operatorLabel({ operatorName: "张三", operatorUsername: null })).toBe("张三");
    expect(operatorLabel({ operatorName: "张三", operatorUsername: "zs" })).toBe("张三（zs）");
  });

  it("changes=null 与 [] 的展开规则不同", () => {
    expect(canExpandLog({ changes: null, detail: "", metadata: {} })).toBe(true);
    expect(canExpandLog({ changes: [], detail: "", metadata: {} })).toBe(false);
    expect(canExpandLog({ changes: [], detail: "x", metadata: {} })).toBe(true);
    expect(canExpandLog({ changes: [], detail: "", metadata: { lostReason: "价格" } })).toBe(true);
  });

  it("用 context 与车型编码生成可读路径", () => {
    expect(
      changeLabel(
        {
          path: "days[a].items[b].nameZh",
          kind: "changed",
          before: "a",
          after: "b",
          context: { dayNumber: 2, nameZh: "故宫" },
        },
        context,
      ),
    ).toBe("第 2 天 · 故宫 · 中文名称");
    expect(
      changeLabel(
        { path: "vehiclePrices.7_seat.unitPrice", kind: "changed", before: "1.00", after: "2.00" },
        context,
      ),
    ).toBe("vehiclePrices / 7座车 / 单价");
  });
});
