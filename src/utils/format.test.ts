import { describe, expect, it } from "vitest";
import { addDays, formatDate, formatDateTime, formatMoney } from "./format";
import { roundMoney } from "./money";

describe("format utilities", () => {
  it("formats local dates and date times", () => {
    const value = new Date(2026, 7, 6, 9, 5);

    expect(formatDate(value)).toBe("2026-08-06");
    expect(formatDateTime(value)).toBe("2026-08-06 09:05");
    expect(addDays("2026-08-31", 1)).toBe("2026-09-01");
  });

  it("formats and rounds money", () => {
    expect(formatMoney(1234.5)).toBe("1,234.50");
    expect(roundMoney(10.125)).toBe(10.13);
  });

});
