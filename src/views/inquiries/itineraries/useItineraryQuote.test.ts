import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { computed, effectScope, ref } from "vue";
import type { ItineraryQuoteCalculation, ItineraryRecord } from "@/types/itinerary";
import { itineraries } from "@/test-fixtures/inquiries";
import { useItineraryQuote } from "./useItineraryQuote";
import { useItineraryEditor } from "./useItineraryEditor";
const api = vi.hoisted(() => ({ previewQuote: vi.fn(), quoteCalculation: vi.fn() }));
vi.mock("@/api/request", () => ({ request: {} }));
vi.mock("@/services/inquiry.service", async (original) => ({
  ...await original<object>(), inquiryService: api,
}));

const result = (cost: number): ItineraryQuoteCalculation => ({ hotelGuestCount: 10, hotelRoomCount: 5, dailyResourceCost: cost, guideCost: 0, options: [] });
const scopes: ReturnType<typeof effectScope>[] = [];
function setup() {
  const selected = ref<ItineraryRecord | undefined>({ ...structuredClone(itineraries[0]), status: "draft" });
  const scope = effectScope(); scopes.push(scope);
  const quote = scope.run(() => useItineraryQuote(selected, () => true))!;
  return { selected, quote, scope };
}
beforeEach(() => { vi.useFakeTimers(); vi.resetAllMocks(); });
afterEach(() => { scopes.splice(0).forEach(scope => scope.stop()); vi.useRealTimers(); });

describe("server quote preview", () => {
  it("calculates once through the actual vehicle editor and ignores unchanged save responses", async () => {
    api.previewQuote.mockResolvedValue(result(123));
    const { selected, quote } = setup();
    const editor = useItineraryEditor({
      inquiry: ref(undefined), inquiryId: computed(() => "inquiry"), itineraryStore: [],
      selectedItinerary: computed(() => selected.value), selectedItineraryId: ref(selected.value!.id),
      canCreate: () => false, canEditContent: () => true, canEditPrice: () => true,
      getCreator: () => "test", findHotel: () => undefined, findVehicle: () => undefined,
    });
    await vi.advanceTimersByTimeAsync(300);
    api.previewQuote.mockClear();
    const vehicle = selected.value!.vehiclePlans[0];
    editor.updateVehiclePlan(vehicle.tier, { ...vehicle, totalPrice: 9000 });
    await vi.advanceTimersByTimeAsync(600);
    expect(api.previewQuote).toHaveBeenCalledOnce();
    expect(api.previewQuote.mock.calls[0][0].vehiclePlans[0].totalPrice).toBe(9000);
    selected.value = { ...selected.value!, version: selected.value!.version + 1 };
    expect(quote.current.value).toBe(true);
    await vi.advanceTimersByTimeAsync(600);
    expect(api.previewQuote).toHaveBeenCalledOnce();
  });

  it("lets an in-flight preview finish when only the saved version changes", async () => {
    let finish!: (value: ItineraryQuoteCalculation) => void;
    api.previewQuote.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    const { selected, quote } = setup();
    await vi.advanceTimersByTimeAsync(300);
    selected.value!.version++;
    await vi.advanceTimersByTimeAsync(600);
    finish(result(123));
    await vi.advanceTimersByTimeAsync(1);
    expect(api.previewQuote).toHaveBeenCalledOnce();
    expect(quote.calculation.value).toEqual(result(123));
    expect(quote.current.value).toBe(true);
  });

  it("recalculates when a save response changes pricing input", async () => {
    api.previewQuote.mockResolvedValueOnce(result(10)).mockResolvedValueOnce(result(20));
    const { selected, quote } = setup();
    await vi.advanceTimersByTimeAsync(300);
    selected.value!.vehiclePlans[0].totalPrice = 9000;
    selected.value!.version++;
    await vi.advanceTimersByTimeAsync(300);
    expect(api.previewQuote).toHaveBeenCalledTimes(2);
    expect(quote.calculation.value).toEqual(result(20));
  });

  it("reloads frozen results on a status change of the same itinerary", async () => {
    api.previewQuote.mockResolvedValue(result(10));
    api.quoteCalculation.mockResolvedValue(result(20));
    const { selected, quote } = setup();
    await vi.advanceTimersByTimeAsync(300);
    selected.value!.status = "quoted";
    await vi.advanceTimersByTimeAsync(300);
    expect(api.quoteCalculation).toHaveBeenCalledWith(selected.value!.id);
    expect(quote.calculation.value).toEqual(result(20));
  });

  it("merges edits and sends the latest unsaved input without saving it", async () => {
    api.previewQuote.mockResolvedValue(result(123));
    const { selected, quote } = setup();
    selected.value!.adults = 11;
    await vi.advanceTimersByTimeAsync(200);
    selected.value!.adults = 12;
    await vi.advanceTimersByTimeAsync(299);
    expect(api.previewQuote).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(api.previewQuote).toHaveBeenCalledOnce();
    expect(api.previewQuote).toHaveBeenCalledWith(expect.objectContaining({ adults: 12 }));
    expect(quote.calculation.value).toEqual(result(123));
    expect(quote.current.value).toBe(true);
  });

  it("invalidates visible amounts immediately and ignores out-of-order replies", async () => {
    let resolveOld!: (value: ItineraryQuoteCalculation) => void;
    api.previewQuote.mockResolvedValueOnce(result(10)).mockImplementationOnce(() => new Promise(resolve => { resolveOld = resolve; })).mockResolvedValueOnce(result(30));
    const { selected, quote } = setup();
    await vi.advanceTimersByTimeAsync(300);
    selected.value!.adults++;
    expect(quote.current.value).toBe(false);
    await vi.advanceTimersByTimeAsync(300);
    selected.value!.adults++;
    await vi.advanceTimersByTimeAsync(300);
    resolveOld(result(20));
    await Promise.resolve();
    expect(quote.calculation.value).toEqual(result(30));
    expect(quote.current.value).toBe(true);
  });

  it("clears another itinerary's amounts and reads frozen quoted results", async () => {
    let finish!: (value: ItineraryQuoteCalculation) => void;
    api.previewQuote.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    api.quoteCalculation.mockResolvedValue(result(99));
    const { selected, quote } = setup();
    await vi.advanceTimersByTimeAsync(300);
    selected.value = { ...selected.value!, id: "quoted-plan", status: "quoted" };
    expect(quote.calculation.value).toBeNull();
    await vi.advanceTimersByTimeAsync(300);
    finish(result(1)); await Promise.resolve();
    expect(api.quoteCalculation).toHaveBeenCalledWith("quoted-plan");
    expect(quote.calculation.value).toEqual(result(99));
  });

  it("does not show a previous result as current after failure and can retry", async () => {
    api.previewQuote.mockResolvedValueOnce(result(1)).mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce(result(2));
    const { selected, quote } = setup();
    await vi.advanceTimersByTimeAsync(300);
    selected.value!.adults++;
    await vi.advanceTimersByTimeAsync(300);
    expect(quote.error.value).toBe(true); expect(quote.current.value).toBe(false);
    quote.retry(); await vi.advanceTimersByTimeAsync(300);
    expect(quote.calculation.value).toEqual(result(2)); expect(quote.error.value).toBe(false);
  });

  it("cancels work when its scope is disposed", async () => {
    const { scope } = setup(); scope.stop();
    await vi.advanceTimersByTimeAsync(300);
    expect(api.previewQuote).not.toHaveBeenCalled();
  });
});
