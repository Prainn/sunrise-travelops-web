import { getCurrentScope, onScopeDispose, ref, watch, type Ref } from "vue";
import { inquiryService, itineraryInput } from "@/services/inquiry.service";
import { isApiError } from "@/api/request";
import { ApiErrorCode } from "@/api/error-code";
import type { ItineraryQuoteCalculation, ItineraryRecord } from "@/types/itinerary";

const MAX_RETRIES = 3;

export function useItineraryQuote(
  selected: Readonly<Ref<ItineraryRecord | undefined>>,
  canPreview: () => boolean,
) {
  const calculation = ref<ItineraryQuoteCalculation | null>(null);
  const pending = ref(false);
  const error = ref<null | "retriable" | "permanent">(null);
  const errorReason = ref("");
  const retryCount = ref(0);
  const maxRetriesReached = ref(false);
  let lastId: string | undefined;

  const stop = watch(
    [
      () => {
        const plan = selected.value;
        if (!plan || plan.version < 1) return "null";
        const preview = plan.status === "draft" && canPreview();
        const input = preview ? itineraryInput(plan) : undefined;
        if (input) {
          // Keep display-only edits out of the preview trigger.
          input.quote = {
            ...input.quote,
            chineseTip: null,
            englishTip: null,
            transportFees: [],
            options: input.quote.options.map((option) => ({
              ...option,
              paxPrices: option.paxPrices.map((price) => ({ ...price, adultUnitPrice: null })),
            })),
            mealOtherReason: "",
            attractionOtherReason: "",
            paxOtherCosts: input.quote.paxOtherCosts.map((cost) => ({
              ...cost,
              guideOtherReason: "",
              staffRoomOtherReason: "",
            })),
          };
        }
        return JSON.stringify({
          id: plan.id,
          status: plan.status,
          preview,
          // Draft preview depends on submitted content; GET reads a saved version.
          input,
          transportPrices: input
            ? plan.quote.transportFees
              .filter((fee) => fee.unitPrice !== null)
              .map(({ id, type, unitPrice }) => ({ id, type, unitPrice }))
            : undefined,
          version: preview ? undefined : plan.version,
        });
      },
      () => retryCount.value,
    ] as const,
    ([serialized], previous, onCleanup) => {
      if (serialized !== previous?.[0]) {
        maxRetriesReached.value = false;
        if (retryCount.value !== 0) {
          retryCount.value = 0;
          return;
        }
      }
      const plan = selected.value;
      if (lastId !== plan?.id) calculation.value = null;
      lastId = plan?.id;
      error.value = null;
      errorReason.value = "";
      const request = JSON.parse(serialized) as {
        id: string;
        input?: ReturnType<typeof itineraryInput>;
      } | null;
      pending.value = false;
      if (!request) return;
      let cancelled = false;
      const timer = setTimeout(
        async () => {
          pending.value = true;
          try {
            if (request.input && plan) {
              request.input.quote.transportFees = itineraryInput(plan).quote.transportFees;
            }
            const result = request.input
              ? await inquiryService.previewQuote({ ...request.input, id: request.id })
              : await inquiryService.quoteCalculation(request.id);
            if (cancelled) return;
            calculation.value = result;
          } catch (caught) {
            if (!cancelled) {
              const retriable = isApiError(caught) && (
                (caught.status === undefined && caught.code === ApiErrorCode.NETWORK_ERROR)
                || (caught.status !== undefined && caught.status >= 500 && caught.status < 600)
              );
              error.value = retriable ? "retriable" : "permanent";
              maxRetriesReached.value = retriable && retryCount.value >= MAX_RETRIES;
              errorReason.value = isApiError(caught) ? (caught.serverMessage ?? "") : "";
            }
          } finally {
            if (!cancelled) pending.value = false;
          }
        },
        // 等待用户停止连续编辑
        request.input ? 800 : 0,
      );
      onCleanup(() => {
        cancelled = true;
        clearTimeout(timer);
      });
    },
    { immediate: true, flush: "sync" },
  );
  if (getCurrentScope()) onScopeDispose(stop);
  return {
    calculation,
    pending,
    error,
    errorReason,
    maxRetriesReached,
    retry: () => {
      if (error.value !== "retriable" || pending.value || retryCount.value >= MAX_RETRIES) return;
      retryCount.value++;
    },
  };
}
