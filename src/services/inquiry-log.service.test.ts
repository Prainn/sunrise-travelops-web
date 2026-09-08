import { describe, expect, it, vi } from "vitest";
const { get } = vi.hoisted(() => ({ get: vi.fn().mockResolvedValue({}) }));
vi.mock("@/api/request", () => ({ request: { get } }));
import { inquiryLogService } from "./inquiry-log.service";
describe("inquiry log API", () => {
  it("sends the same time, operator and inquiry filters to details and full report", async () => {
    const query = { page: 3, pageSize: 10, inquiryId: "inquiry", inquiryCode: "INQ-20260908-01", operatorId: "operator", from: "2026-09-01", to: "2026-09-08", action: "itinerary_saved" as const };
    await inquiryLogService.list(query);
    await inquiryLogService.report(query);
    expect(get).toHaveBeenCalledWith("/inquiry-logs", { params: query });
    expect(get).toHaveBeenCalledWith("/inquiry-logs/report", { params: query });
  });
});
