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

it("uses the quote endpoints and normalizes server amounts without sending derived metadata", async () => {
  const plan = { ...itineraries[0], version: 7 };
  const response = { hotelRoomCount: 5, dailyResourceCost: "123.45", options: [{ adultUnitPrice: "1000.00", profit: "50.00" }] };
  mocks.post.mockResolvedValueOnce(response); mocks.get.mockResolvedValueOnce(response);
  const preview = await inquiryService.previewQuote(plan);
  expect(preview.dailyResourceCost).toBe(123.45);
  expect(preview.options[0].adultUnitPrice).toBe(1000);
  const call = mocks.post.mock.calls.find(([url]) => url === `/itineraries/${plan.id}/quote-calculation`)!;
  expect(call[1]).toMatchObject({ quote: plan.quote });
  expect(call[1]).not.toHaveProperty("version");
  expect(call[1]).not.toHaveProperty("status"); expect(call[1]).not.toHaveProperty("inquiryId");
  expect(await inquiryService.quoteCalculation(plan.id)).toEqual(preview);
});
