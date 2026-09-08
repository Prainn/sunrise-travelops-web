import { describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn() }));
vi.mock("@/api/request", () => ({ request: mocks }));
import { inquiryService, normalizeInquiryMoney } from "./inquiry.service";
import { itineraries } from "@/test-fixtures/inquiries";
it("converts contract money strings while preserving null price and quantities", () => {
  expect(normalizeInquiryMoney({ unitCost: "50.00", quantity: 3, adultUnitPrice: null })).toEqual({ unitCost: 50, quantity: 3, adultUnitPrice: null });
});
describe("itinerary persistence", () => {
  it("sends only editable fields and the server version", async () => {
    const plan = { ...itineraries[0], version: 7 }; mocks.put.mockResolvedValue(plan);
    await inquiryService.saveItinerary(plan);
    expect(mocks.put).toHaveBeenCalledWith(`/itineraries/${plan.id}`,expect.objectContaining({ version: 7, dailyPlans: plan.dailyPlans }));
    const body = mocks.put.mock.calls[0][1];
    expect(body).not.toHaveProperty("status"); expect(body).not.toHaveProperty("creator"); expect(body).not.toHaveProperty("inquiryId");
  });
});

it("sends a new agency contact with its phone", async () => {
  await inquiryService.createContact("agency-1", "李明", "+86 13800138000");
  expect(mocks.post).toHaveBeenCalledWith("/inquiries/contacts/agency-1", {
    name: "李明", phone: "+86 13800138000",
  });
});
