import { describe, expect, it } from "vitest";
import { itineraries } from "@/test-fixtures/inquiries";
import { destinationDuration, itineraryDuration, plannedDuration, plannedEndDate } from "./duration";

describe("travel duration", () => {
  it("uses zero nights for day trips and days minus one for planned trips", () => {
    expect(plannedDuration(1)).toEqual({ days: 1, nights: 0 });
    expect(plannedDuration(7)).toEqual({ days: 7, nights: 6 });
    expect(plannedEndDate("2026-09-10", 15)).toBe("2026-09-24");
  });
  it("counts actual stays separately from travel days and excludes unfilled nights", () => {
    const days = structuredClone(itineraries[0].dailyPlans.slice(0, 3));
    days[0].departure = "新加坡"; days[0].destination = "昆明"; days[0].overnightDestination = "昆明";
    days[1].departure = "昆明"; days[1].destination = "大理"; days[1].overnightDestination = null;
    days[2].departure = "大理"; days[2].destination = "昆明"; days[2].overnightDestination = "";
    expect(itineraryDuration(days)).toEqual({ days: 3, nights: 1 });
    expect(destinationDuration(days, "昆明")).toEqual({ days: 3, nights: 1 });
    expect(destinationDuration(days, "大理")).toEqual({ days: 2, nights: 0 });
    expect(itineraryDuration([])).toEqual({ days: 0, nights: 0 });
  });
});
