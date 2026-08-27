import { afterEach, describe, expect, it } from "vitest";
import { inquiryLogs } from "@/data/data";
import { inquiryLogService } from "./inquiry-log.service";

const initialLogCount = inquiryLogs.length;

afterEach(() => {
  inquiryLogs.splice(0, inquiryLogs.length - initialLogCount);
});

describe("inquiry log service", () => {
  it("returns only the requested inquiry logs in descending time order", async () => {
    const records = await inquiryLogService.listByInquiryId("inquiry-1");

    expect(records.length).toBeGreaterThan(0);
    expect(records.every((record) => record.inquiryId === "inquiry-1")).toBe(true);
    expect(records.map((record) => record.occurredAt)).toEqual(
      [...records].map((record) => record.occurredAt).sort().reverse()
    );
  });

  it("appends the current operation to the mock log store", async () => {
    const record = await inquiryLogService.append({
      inquiryId: "inquiry-1",
      action: "itinerary_saved",
      operatorId: "4",
      operatorUsername: "operations",
      operatorName: "张伟",
      targetType: "itinerary",
      targetId: "itinerary-1",
      targetCode: "ITI-202608-001",
      summary: "云南经典 7 日方案",
    });

    expect(record.id).toMatch(/^inquiry-log-/);
    expect(record.occurredAt).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
    expect(inquiryLogs[0]).toEqual(record);
  });
});
