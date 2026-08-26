import { describe, expect, it } from "vitest";
import { multiplyMoney, roundMoney, sumMoney, toCents } from "./money";

describe("money helpers", () => {
  it("rounds decimal boundary values with integer cents", () => {
    expect(toCents(1.005)).toBe(101);
    expect(roundMoney(10.125)).toBe(10.13);
    expect(roundMoney(-1.005)).toBe(-1.01);
  });

  it("calculates line totals without accumulating fractions", () => {
    expect(multiplyMoney(0.1, 3)).toBe(0.3);
    expect(multiplyMoney(19.995, 2)).toBe(40);
  });

  it("sums money in cents", () => {
    expect(sumMoney([0.1, 0.2, 10.125])).toBe(10.43);
  });
});
