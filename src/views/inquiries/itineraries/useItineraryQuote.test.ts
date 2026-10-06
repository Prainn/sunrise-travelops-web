import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { effectScope, ref, type EffectScope } from "vue";
import { ApiError } from "@/api/request";
import { ApiErrorCode } from "@/api/error-code";
import { inquiryService } from "@/services/inquiry.service";
import type { ItineraryRecord } from "@/types/itinerary";
import { useItineraryQuote } from "./useItineraryQuote";
import { createDefaultQuoteSettings } from "./quote-pricing";

vi.mock("@/lang/utils", () => ({
  translate: (key: string) => key,
  translateIfExists: () => undefined,
}));

function itinerary() {
  const plan: Pick<ItineraryRecord, "id" | "version" | "status" | "dailyPlans" | "quote"> = {
    id: "plan-1",
    version: 1,
    status: "draft",
    dailyPlans: [],
    quote: createDefaultQuoteSettings(),
  };
  return ref(plan as ItineraryRecord);
}

describe("itinerary quote retries", () => {
  let scope: EffectScope;

  beforeEach(() => {
    vi.useFakeTimers();
    scope = effectScope();
  });

  afterEach(() => {
    scope.stop();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("sends one request after rapid cost edits stop", async () => {
    const preview = vi.spyOn(inquiryService, "previewQuote").mockResolvedValue({
      pricingVersion: 2,
      dailyResourceCost: 0,
      guideCost: 0,
      options: [],
    });
    const selected = itinerary();
    scope.run(() => useItineraryQuote(selected, () => true));

    selected.value.quote.mealOtherCost = 1;
    await vi.advanceTimersByTimeAsync(400);
    selected.value.quote.mealOtherCost = 2;
    await vi.advanceTimersByTimeAsync(799);
    expect(preview).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(preview).toHaveBeenCalledOnce();
    expect(preview.mock.calls[0][0].quote.mealOtherCost).toBe(2);
  });

  it("caps retries at three, blocks duplicate clicks and resets for changed costs", async () => {
    const preview = vi.spyOn(inquiryService, "previewQuote").mockRejectedValue(
      new ApiError("offline", { code: ApiErrorCode.NETWORK_ERROR }),
    );
    const selected = itinerary();
    const quote = scope.run(() => useItineraryQuote(selected, () => true))!;
    await vi.advanceTimersByTimeAsync(800);

    for (let attempt = 0; attempt < 3; attempt++) {
      quote.retry();
      quote.retry();
      await vi.advanceTimersByTimeAsync(800);
    }
    expect(preview).toHaveBeenCalledTimes(4);
    expect(quote.maxRetriesReached.value).toBe(true);
    quote.retry();
    await vi.advanceTimersByTimeAsync(800);
    expect(preview).toHaveBeenCalledTimes(4);

    selected.value.quote.mealOtherCost = 1;
    expect(quote.maxRetriesReached.value).toBe(false);
    await vi.advanceTimersByTimeAsync(800);
    expect(preview).toHaveBeenCalledTimes(5);
    quote.retry();
    await vi.advanceTimersByTimeAsync(800);
    expect(preview).toHaveBeenCalledTimes(6);
    expect(quote.maxRetriesReached.value).toBe(false);
  });

  it.each([
    [500, "HTTP_500", "retriable"],
    [503, "HTTP_503", "retriable"],
    [400, "VALIDATION_ERROR", "permanent"],
    [403, "FORBIDDEN", "permanent"],
    [400, ApiErrorCode.NETWORK_ERROR, "permanent"],
  ] as const)("classifies HTTP %s (%s) as %s", async (status, code, state) => {
    const preview = vi.spyOn(inquiryService, "previewQuote").mockRejectedValue(
      new ApiError("failure", { code, status, serverMessage: "server reason" }),
    );
    const quote = scope.run(() => useItineraryQuote(itinerary(), () => true))!;
    await vi.advanceTimersByTimeAsync(800);
    expect(quote.error.value).toBe(state);
    expect(quote.errorReason.value).toBe("server reason");
    quote.retry();
    await vi.advanceTimersByTimeAsync(800);
    expect(preview).toHaveBeenCalledTimes(state === "retriable" ? 2 : 1);
  });
});
