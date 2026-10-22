import { afterEach, describe, expect, it, vi } from "vitest";
import { effectScope, reactive, ref } from "vue";
import type { TourCodeSuggestion, UserForm } from "@/types/user";
import { useTourCodeSuggestion } from "./useTourCodeSuggestion";

const scopes: ReturnType<typeof effectScope>[] = [];
function setup() {
  vi.useFakeTimers();
  const form = reactive<UserForm>({
    identities: [{ scope: "website", roleIds: [] }], englishName: "Andrew", nickname: "Andrew朱相龙",
  });
  const visible = ref(true);
  const editing = ref(false);
  const suggest = vi.fn<(input: unknown) => Promise<TourCodeSuggestion>>().mockResolvedValue({ tourCode: "ANZ" });
  const scope = effectScope();
  scopes.push(scope);
  const suggestion = scope.run(() => useTourCodeSuggestion({
    form,
    enabled: () => visible.value && !editing.value && form.identities[0]?.scope !== "headquarters",
    suggest,
  }))!;
  return { form, visible, editing, suggest, suggestion };
}
afterEach(() => {
  scopes.splice(0).forEach((scope) => scope.stop());
  vi.useRealTimers();
});

describe("new-user tour code suggestion", () => {
  it("debounces names and fills the current suggestion", async () => {
    const { form, suggest } = setup();
    form.englishName = "Arthur";
    form.nickname = "Arthur郑赫";
    suggest.mockResolvedValue({ tourCode: "ARZ" });
    await vi.advanceTimersByTimeAsync(300);
    expect(suggest).toHaveBeenCalledExactlyOnceWith({ englishName: "Arthur", nickname: "Arthur郑赫" });
    expect(form.tourCode).toBe("ARZ");
  });
  it("does not overwrite manual input with an in-flight result or later name changes", async () => {
    const { form, suggest, suggestion } = setup();
    let resolve!: (result: TourCodeSuggestion) => void;
    suggest.mockReturnValue(new Promise((done) => { resolve = done; }));
    await vi.advanceTimersByTimeAsync(300);
    suggestion.markManual();
    form.tourCode = "CUSTOM";
    resolve({ tourCode: "ANZ" });
    form.englishName = "Allen";
    await vi.advanceTimersByTimeAsync(300);
    expect(form.tourCode).toBe("CUSTOM");
    expect(suggest).toHaveBeenCalledOnce();
  });
  it("discards stale responses and clears old suggestions when names change", async () => {
    const { form, suggest } = setup();
    let first!: (result: TourCodeSuggestion) => void;
    suggest.mockReturnValueOnce(new Promise((resolve) => { first = resolve; }));
    await vi.advanceTimersByTimeAsync(300);
    form.englishName = "Allen";
    suggest.mockResolvedValue({ tourCode: "ALZ" });
    await vi.advanceTimersByTimeAsync(300);
    first({ tourCode: "ANZ" });
    await Promise.resolve();
    expect(form.tourCode).toBe("ALZ");
    form.nickname = "";
    expect(form.tourCode).toBe("");
  });
  it("leaves editing and headquarters values unchanged and cancels closed dialogs", async () => {
    const { form, editing, visible, suggest } = setup();
    editing.value = true;
    form.tourCode = "OLD";
    await vi.advanceTimersByTimeAsync(300);
    expect(suggest).not.toHaveBeenCalled();
    expect(form.tourCode).toBe("OLD");
    form.identities[0]!.scope = "headquarters";
    editing.value = false;
    await vi.advanceTimersByTimeAsync(300);
    expect(suggest).not.toHaveBeenCalled();
    form.identities[0]!.scope = "website";
    visible.value = false;
    await vi.advanceTimersByTimeAsync(300);
    expect(suggest).not.toHaveBeenCalled();
  });
  it("shows failure or no-candidate state without reusing the old code", async () => {
    const { form, suggest, suggestion } = setup();
    await vi.advanceTimersByTimeAsync(300);
    expect(form.tourCode).toBe("ANZ");
    suggest.mockRejectedValue(new Error("offline"));
    form.englishName = "Arthur";
    expect(form.tourCode).toBe("");
    await vi.advanceTimersByTimeAsync(300);
    expect(suggestion.status.value).toBe("failed");
    suggest.mockResolvedValue({ tourCode: null });
    form.englishName = "A";
    await vi.advanceTimersByTimeAsync(300);
    expect(suggestion.status.value).toBe("unavailable");
  });
});
