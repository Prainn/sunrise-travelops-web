import { describe, expect, it } from "vitest";
import { safeRedirectTarget } from "./redirect-target";

describe("safeRedirectTarget", () => {
  it("keeps internal path, query and hash from Feishu links", () => {
    const ledger = "/data-ledgers/direct?keyword=LX%2F001&ledgerId=7c0c8b8e-0f51-4a3f-9d2a-1b2c3d4e5f60&highlight=1&from=feishu&action=review";
    expect(safeRedirectTarget(ledger)).toBe(ledger);
    expect(safeRedirectTarget("/whatsapp/inbox?conversationId=abc&from=feishu#latest"))
      .toBe("/whatsapp/inbox?conversationId=abc&from=feishu#latest");
  });

  it.each([
    undefined,
    ["/dashboard"],
    "",
    "https://evil.example/x",
    "//evil.example/x",
    "/\\evil.example",
    "/%2F%2Fevil.example",
    "/%5Cevil.example",
    "/%E0%A4%A",
    "/a\nb",
    "javascript:alert(1)",
    "/login",
    "/LOGIN?redirect=/x",
    "/%6Cogin",
    "/x/../login",
  ])("rejects unsafe target %s", (value) => {
    expect(safeRedirectTarget(value)).toBe("/");
  });
});
