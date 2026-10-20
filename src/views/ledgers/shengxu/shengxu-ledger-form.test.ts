import { describe, expect, it } from "vitest";
import { emptyShengxuLedgerForm, shengxuLedgerInput } from "./shengxu-ledger-form";

describe("shengxu ledger form", () => {
  it("keeps zero counts and omits display snapshots", () => {
    const body = shengxuLedgerInput({
      ...emptyShengxuLedgerForm(),
      recordDate: "2026-10-19",
      agencyId: "agency-1",
      contactId: "contact-1",
      quotedGroups: 0,
      convertedGroups: 0,
      agencyName: "旧组团社",
      countryOrRegion: "泰国",
      city: "曼谷",
    });

    expect(body).toEqual({
      recordDate: "2026-10-19",
      agencyId: "agency-1",
      contactId: "contact-1",
      quotedGroups: 0,
      convertedGroups: 0,
      quoteSent: false,
      itinerary: "",
      notConvertedReason: "",
    });
  });

  it("does not turn a cleared count into zero", () => {
    expect(() => shengxuLedgerInput(emptyShengxuLedgerForm())).toThrow();
  });
});
