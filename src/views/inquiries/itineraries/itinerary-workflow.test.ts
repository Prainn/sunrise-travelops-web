import { describe, expect, it } from "vitest";
import { canPerformItineraryOperation, transitionItinerary } from "./itinerary-workflow";

describe("itinerary workflow", () => {
  it("allows editing only while an itinerary is a draft", () => {
    expect(canPerformItineraryOperation("draft", "edit_content")).toBe(true);
    expect(canPerformItineraryOperation("quoted", "edit_content")).toBe(false);
  });

  it("moves a generated quote to quoted status", () => {
    expect(transitionItinerary("draft", "generate_quote")).toBe("quoted");
  });

  it("rejects illegal transitions", () => {
    expect(() => transitionItinerary("archived", "generate_quote")).toThrow("Invalid itinerary transition");
  });
});
