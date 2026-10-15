import { describe, expect, it, vi } from "vitest";
vi.mock("@/api/request", () => ({ request: {} }));
import { normalizeInquiryMoney } from "./inquiry.service";

describe("inquiry money normalization", () => {
  it("preserves missing prices and zeros in nested response data", () => {
    expect(normalizeInquiryMoney({
      title: "", items: [
        { unitCost: "", referencePrice: null, totalCost: "0.00" },
        { unitCost: "  ", referencePrice: undefined, totalCost: "12.30" },
      ],
    })).toEqual({
      title: "", items: [
        { unitCost: null, referencePrice: null, totalCost: 0 },
        { unitCost: null, referencePrice: undefined, totalCost: 12.3 },
      ],
    });
  });
});
