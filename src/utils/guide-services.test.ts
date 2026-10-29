import { describe, expect, it } from "vitest";
import type { TourGuideService } from "@/types/tour";
import { distinctGuides, guideSummaryText } from "./guide-services";

const svc = (id: string, guideId: string, guideName: string): TourGuideService =>
  ({ id, guideId, guideName, guideCode: guideId.toUpperCase() }) as TourGuideService;

describe("guide service summary", () => {
  it("dedupes by guide ID, not by name, and keeps order", () => {
    const list = [svc("1", "a", "张三"), svc("2", "b", "张三"), svc("3", "a", "张三")];
    expect(distinctGuides(list).map((item) => item.guideId)).toEqual(["a", "b"]);
    expect(guideSummaryText(list)).toBe("张三 (A)、张三 (B)");
  });

  it("is empty when no service is scheduled", () => {
    expect(guideSummaryText([])).toBe("");
  });
});
