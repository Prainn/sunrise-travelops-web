import { describe, expect, it } from "vitest";
import { phoneRegion } from "./phone-region";

describe("WhatsApp号码归属地", () => {
  it.each([
    ["+60000000000", "60", "MY"],
    ["85200000000", "852", "HK"],
    ["41000000000", "41", "CH"],
    ["910000000000", "91", "IN"],
    ["8600000000000", "86", "CN"],
  ])("按国际区号识别 %s", (phone, code, region) => {
    expect(phoneRegion(phone)).toEqual({ callingCode: `+${code}`, regions: [region] });
  });

  it("共享区号不直接认定为美国或俄罗斯", () => {
    expect(phoneRegion("10000000000")?.regions).toEqual(expect.arrayContaining(["US", "CA"]));
    expect(phoneRegion("70000000000")?.regions).toEqual(expect.arrayContaining(["RU", "KZ"]));
    expect(phoneRegion("10000000000")?.regions.length).toBeGreaterThan(2);
  });

  it("非地理号码与缺失/无效号码不伪造国家", () => {
    expect(phoneRegion("80000000000")?.regions).toEqual(["001"]);
    for (const input of [null, "", "CN.synthetic", "0123456789", "999000000000", "6012345678901234"]) {
      expect(phoneRegion(input)).toBeNull();
    }
  });
});
