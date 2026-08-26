import { describe, expect, it } from "vitest";
import { canTransitionInquiry, isInquiryReadOnly, transitionInquiry } from "./inquiry-workflow";

describe("inquiry workflow", () => {
  it("locks lost and archived inquiries", () => {
    expect(isInquiryReadOnly("lost")).toBe(true);
    expect(isInquiryReadOnly("archived")).toBe(true);
    expect(isInquiryReadOnly("quoted")).toBe(false);
  });

  it("moves active inquiries through allowed actions", () => {
    expect(transitionInquiry("new", "itinerary_created")).toBe("planning");
    expect(transitionInquiry("planning", "quote_generated")).toBe("quoted");
    expect(transitionInquiry("quoted", "reopen_for_planning")).toBe("planning");
    expect(transitionInquiry("quoted", "archive")).toBe("archived");
  });

  it("rejects illegal transitions", () => {
    expect(canTransitionInquiry("archived", "itinerary_created")).toBe(false);
    expect(() => transitionInquiry("lost", "quote_generated")).toThrow("Invalid inquiry transition");
  });
});
