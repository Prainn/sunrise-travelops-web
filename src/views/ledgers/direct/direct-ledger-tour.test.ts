import { describe, expect, it, vi } from "vitest";
import type { DirectLedgerLinkedTour } from "@/types/direct-ledger";
import { directLedgerTourMode, ledgerTourContactName, ledgerTourDraft } from "./direct-ledger-tour";

const tour = (status: DirectLedgerLinkedTour["status"]): DirectLedgerLinkedTour => ({
  id: status,
  tourNo: `T-${status}`,
  status,
  version: 1,
  cancelReason: status === "cancelled" ? "客人取消" : null,
  cancelledAt: status === "cancelled" ? "2026-11-02T00:00:00.000Z" : null,
  createdAt: "2026-11-01T00:00:00.000Z",
});

describe("directLedgerTourMode", () => {
  it("offers convert, backfill or rebuild by order status and history", () => {
    expect(directLedgerTourMode({ orderStatus: "unconverted", tours: [] }, true)).toBe("convert");
    expect(directLedgerTourMode({ orderStatus: "converted", tours: [] }, true)).toBe("backfill");
    expect(directLedgerTourMode({ orderStatus: "converted", tours: [tour("cancelled")] }, true)).toBe("rebuild");
  });

  it("never offers a second active tour", () => {
    expect(directLedgerTourMode({ orderStatus: "converted", tours: [tour("cancelled"), tour("active")] }, true)).toBeNull();
  });

  it("hides every entry without the server capability", () => {
    expect(directLedgerTourMode({ orderStatus: "unconverted", tours: [] }, false)).toBeNull();
  });
});

describe("ledger tour draft", () => {
  it("only uses a website customer name as the contact", () => {
    expect(ledgerTourContactName("website", " 张三 ")).toBe("张三");
    expect(ledgerTourContactName("website", "1234567")).toBe("");
    expect(ledgerTourContactName("linxi", "张三")).toBe("");
    expect(ledgerTourContactName("linxi", "1234567")).toBe("");
  });

  it("keeps the ledger collector and operator instead of the current user", () => {
    const draft = ledgerTourDraft(
      {
        businessUnit: "website",
        creatorId: "collector-1",
        creatorName: "收客",
        operatorId: "operator-1",
        operatorName: "操作",
        countryItemId: null,
        departureDate: null,
        itinerary: " 昆明 ",
        source: "张三",
      },
      "backfill",
      vi.fn(),
    );

    expect(draft).toMatchObject({
      mode: "backfill",
      businessUnit: "website",
      collectCoordinatorId: "collector-1",
      operatorId: "operator-1",
      countryItemId: "",
      startDate: "",
      itinerarySummary: "昆明",
      contactName: "张三",
    });
  });
});
