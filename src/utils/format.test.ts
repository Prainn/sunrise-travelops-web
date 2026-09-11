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

it("converts ISO timestamps and offsets to local time, including date rollover", () => {
  const local = new Date(2026, 8, 18, 0, 0);
  expect(formatDateTime(local.toISOString())).toBe("2026-09-18 00:00");
  expect(formatDateTime("2026-09-17T16:00:00.000Z")).toBe(
    formatDateTime(new Date(Date.UTC(2026, 8, 17, 16)))
  );
  expect(formatDateTime("2026-09-18T00:00:00+08:00")).toBe(
    formatDateTime("2026-09-17T16:00:00Z")
  );
  expect(formatDateTime("2026-09-18 09:30:00")).toBe("2026-09-18 09:30");
  expect(formatDateTime(null)).toBe("-");
  expect(formatDateTime("invalid")).toBe("-");
});
