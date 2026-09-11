import { getCurrentScope, onScopeDispose, ref, watch, type Ref } from "vue";
import { inquiryService, itineraryInput } from "@/services/inquiry.service";
import type { ItineraryQuoteCalculation, ItineraryRecord } from "@/types/itinerary";

export function useItineraryQuote(selected: Readonly<Ref<ItineraryRecord | undefined>>, canPreview: () => boolean) {
  const calculation = ref<ItineraryQuoteCalculation | null>(null);
  const pending = ref(false);
  const error = ref(false);
  const current = ref(false);
  const retryCount = ref(0);
  let lastId: string | undefined;

  const stop = watch(
    [() => {
      const plan = selected.value;
      if (!plan) return "null";
      const preview = plan.status === "draft" && canPreview();
      return JSON.stringify({
        id: plan.id,
        status: plan.status,
        preview,
        // Draft preview depends on submitted content; GET reads a saved version.
        input: preview ? itineraryInput(plan) : undefined,
        version: preview ? undefined : plan.version,
      });
    }, () => retryCount.value] as const,
    ([serialized], _previous, onCleanup) => {
      const plan = selected.value;
      if (lastId !== plan?.id) calculation.value = null;
      lastId = plan?.id;
      current.value = false;
      error.value = false;
      pending.value = Boolean(plan);
      if (!plan) return;
      const request = JSON.parse(serialized) as { id: string; input?: ReturnType<typeof itineraryInput> };
      let cancelled = false;
      const timer = setTimeout(async () => {
        try {
          const result = request.input
            ? await inquiryService.previewQuote({ ...request.input, id: request.id })
            : await inquiryService.quoteCalculation(request.id);
          if (cancelled) return;
          calculation.value = result;
          current.value = true;
        } catch {
          if (!cancelled) error.value = true;
        } finally {
          if (!cancelled) pending.value = false;
        }
      }, 300);
      onCleanup(() => { cancelled = true; clearTimeout(timer); });
    },
    { immediate: true, flush: "sync" },
  );
  if (getCurrentScope()) onScopeDispose(stop);
  return { calculation, pending, error, current, retry: () => { retryCount.value++; } };
}
