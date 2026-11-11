import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { effectScope } from "vue";
import { LEDGER_HIGHLIGHT_MS, parseLedgerLink, useRowHighlight } from "./ledger-link";

const LEDGER_ID = "7c0c8b8e-0f51-4a3f-9d2a-1b2c3d4e5f60";

describe("parseLedgerLink", () => {
  it("parses an exact Feishu ledger target without treating action as an instruction", () => {
    expect(parseLedgerLink({ keyword: "LX-1", ledgerId: LEDGER_ID, highlight: "1", from: "feishu", action: "review" }))
      .toEqual({ ledgerId: LEDGER_ID, highlight: true, action: "review" });
    expect(parseLedgerLink({ ledgerId: LEDGER_ID, action: "approve" }))
      .toEqual({ ledgerId: LEDGER_ID, highlight: false, action: undefined });
  });

  it("keeps keyword-only legacy links and rejects malformed ids", () => {
    expect(parseLedgerLink({ keyword: "LX-1" })).toBeNull();
    expect(parseLedgerLink({ ledgerId: "../1", highlight: "1" })).toBeNull();
    expect(parseLedgerLink({ ledgerId: [LEDGER_ID] })).toBeNull();
  });
});

describe("useRowHighlight", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("highlights one row for 3 seconds and a new link restarts on the new target", () => {
    const scope = effectScope();
    const highlight = scope.run(useRowHighlight)!;
    highlight.start("a");
    vi.advanceTimersByTime(LEDGER_HIGHLIGHT_MS - 1);
    highlight.start("b");
    expect(highlight.highlightedId.value).toBe("b");
    vi.advanceTimersByTime(LEDGER_HIGHLIGHT_MS - 1);
    expect(highlight.highlightedId.value).toBe("b");
    vi.advanceTimersByTime(1);
    expect(highlight.highlightedId.value).toBe("");
    scope.stop();
  });

  it("clears the timer when the page scope is disposed", () => {
    const scope = effectScope();
    const highlight = scope.run(useRowHighlight)!;
    highlight.start("a");
    scope.stop();
    expect(highlight.highlightedId.value).toBe("");
    expect(vi.getTimerCount()).toBe(0);
  });
});
