import { describe, expect, it } from "vitest";
import { canPerformItineraryOperation } from "./itinerary-workflow";

describe("itinerary workflow", () => {
  it("allows editing only while an itinerary is a draft", () => {
    expect(canPerformItineraryOperation("draft", "edit_content")).toBe(true);
    expect(canPerformItineraryOperation("quoted", "edit_content")).toBe(false);
  });
});
