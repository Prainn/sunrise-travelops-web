import { describe, expect, it } from "vitest";
import { getStatusAfterItineraryCreated, getStatusAfterQuoteGenerated, isInquiryReadOnly } from "./inquiry-workflow";

describe("inquiry workflow", () => {
  it("locks lost and archived inquiries", () => {
    expect(isInquiryReadOnly("lost")).toBe(true);
    expect(isInquiryReadOnly("archived")).toBe(true);
    expect(isInquiryReadOnly("quoted")).toBe(false);
  });

  it("moves active inquiries into itinerary design when a draft is created", () => {
    expect(getStatusAfterItineraryCreated("new")).toBe("planning");
    expect(getStatusAfterItineraryCreated("quoted")).toBe("planning");
    expect(getStatusAfterItineraryCreated("archived")).toBe("archived");
  });

  it("marks an active inquiry quoted after PDF generation", () => {
    expect(getStatusAfterQuoteGenerated("planning")).toBe("quoted");
    expect(getStatusAfterQuoteGenerated("lost")).toBe("lost");
  });
});
