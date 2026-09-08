import { describe, expect, it, vi } from "vitest";

vi.mock("@/lang/utils", () => ({ translate: (key: string) => key }));

import { inquiries, inquiryLogs, itineraries } from "@/test-fixtures/inquiries";

describe("local data services", () => {
  it("keeps itinerary mock records linked to existing inquiries", () => {
    expect(inquiries).toHaveLength(5);
    expect(inquiries.map((inquiry) => inquiry.status).sort()).toEqual(["archived", "lost", "new", "planning", "quoted"]);
    expect(itineraries.map((itinerary) => itinerary.status)).toEqual(["draft", "quoted", "draft", "archived"]);
    expect(itineraries.every((itinerary) => itinerary.days > 0)).toBe(true);
    expect(itineraries.every((itinerary) => inquiries.some((inquiry) => inquiry.id === itinerary.inquiryId))).toBe(true);
    expect(itineraries.every((itinerary) => itinerary.updatedAt.length > 0)).toBe(true);
    expect(itineraries.some((itinerary) => itinerary.inquiryId === "inquiry-15")).toBe(false);
    expect(inquiries.filter((inquiry) => inquiry.id !== "inquiry-15").every((inquiry) =>
      itineraries.some((itinerary) => itinerary.inquiryId === inquiry.id))).toBe(true);
    expect(inquiries.every((inquiry) => inquiry.plannedDays > 0)).toBe(true);
    expect(inquiries.every((inquiry) => inquiry.ownerId.length > 0)).toBe(true);
    expect(inquiries.every((inquiry) => ["new", "planning", "quoted", "lost", "archived"].includes(inquiry.status))).toBe(true);
    expect(itineraries.every((itinerary) => itinerary.days === inquiries.find((inquiry) => inquiry.id === itinerary.inquiryId)?.plannedDays)).toBe(true);
    expect(inquiryLogs.every((log) => inquiries.some((inquiry) => inquiry.id === log.inquiryId))).toBe(true);
    expect(inquiries.every((inquiry) => inquiryLogs.some((log) => log.inquiryId === inquiry.id))).toBe(true);
  });

  it("provides a complete seven-day itinerary for every inquiry except the new inquiry", () => {
    const itineraryIds = itineraries.flatMap((itinerary) => [
      itinerary.id,
      ...itinerary.dailyPlans.flatMap((day) => [day.id, ...day.items.map((item) => item.id)]),
    ]);

    expect(itineraries).toHaveLength(4);
    expect(new Set(itineraryIds).size).toBe(itineraryIds.length);
    expect(itineraries.every((itinerary) => itinerary.days === 7)).toBe(true);
    expect(itineraries.every((itinerary) => itinerary.dailyPlans.length === 7)).toBe(true);
    expect(itineraries.every((itinerary) => itinerary.dailyPlans.map((day) => day.dayNumber).join(",") === "1,2,3,4,5,6,7")).toBe(true);
    expect(itineraries.every((itinerary) => itinerary.dailyPlans.every((day) => (
      Boolean(day.description?.length)
      && day.items.length > 0
    )))).toBe(true);
    expect(itineraries.every((itinerary) => itinerary.dailyPlans.flatMap((day) => day.items).every((item) =>
      item.totalCost === item.unitCost * item.quantity))).toBe(true);
  });

});
