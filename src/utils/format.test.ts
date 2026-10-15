import { describe, expect, it } from "vitest";
import { formatMoney, parseMoney } from "./format";

describe("money display", () => {
  it.each([null, undefined, "", "  "])("keeps missing money %j distinct from zero", (value) => {
    expect(parseMoney(value)).toBeNull();
    expect(formatMoney(value)).toBe("—");
  });
  it.each([0, "0", "0.00"])("displays zero %j as a valid price", (value) => {
    expect(parseMoney(value)).toBe(0);
    expect(formatMoney(value)).toBe("0.00");
  });
  it.each([[12.3, "12.30"], ["1234.567", "1,234.57"], [-12.3, "-12.30"]] as const)(
    "formats %j with two decimal places", (value, expected) => {
      expect(formatMoney(value)).toBe(expected);
    },
  );
  it.each([NaN, Infinity, "invalid"])("does not display invalid money %j as a price", (value) => {
    expect(formatMoney(value)).toBe("—");
  });
});
