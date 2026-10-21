import { readonly, ref, watch } from "vue";
import type { TourCodeSuggestion, TourCodeSuggestionInput, UserForm } from "@/types/user";

export function useTourCodeSuggestion(options: {
  form: UserForm;
  enabled: () => boolean;
  suggest: (input: TourCodeSuggestionInput) => Promise<TourCodeSuggestion>;
}) {
  const manual = ref(false);
  const status = ref<"idle" | "loading" | "unavailable" | "failed">("idle");

  watch(
    () => [options.enabled(), options.form.englishName, options.form.nickname, manual.value] as const,
    ([enabled, englishName, nickname, edited], _previous, onCleanup) => {
      status.value = "idle";
      if (!enabled || edited) return;
      options.form.tourCode = "";
      if (!englishName?.trim() || !nickname?.trim()) return;
      let current = true;
      status.value = "loading";
      const timer = setTimeout(async () => {
        try {
          const result = await options.suggest({
            englishName: englishName.trim(),
            nickname: nickname.trim(),
          });
          if (!current) return;
          options.form.tourCode = result.tourCode ?? "";
          status.value = result.tourCode ? "idle" : "unavailable";
        } catch {
          if (current) status.value = "failed";
        }
      }, 300);
      onCleanup(() => {
        current = false;
        clearTimeout(timer);
      });
    },
    { flush: "sync", immediate: true },
  );

  return {
    status: readonly(status),
    markManual: () => { manual.value = true; },
    reset: () => { manual.value = false; },
  };
}
