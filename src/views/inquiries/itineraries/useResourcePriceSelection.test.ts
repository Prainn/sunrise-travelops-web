import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { effectScope, nextTick, reactive } from "vue";
import type { MealSlot } from "@/types/itinerary";
import { useResourcePriceSelection } from "./useResourcePriceSelection";

const api = vi.hoisted(() => ({ getPriceOptions: vi.fn(), getPriceSelection: vi.fn() }));
vi.mock("@/services/resource.service", () => ({ resourceService: api }));
vi.mock("./pricing", () => ({
  getResourcePriceOptions: (resources: { marker: string }) => [{ id: resources.marker, unit: "table", dinerCount: 10 }],
  getDefaultResourceQuantity: () => 1,
}));
const scopes: ReturnType<typeof effectScope>[] = [];
const pageResult = (id: string) => ({ list: [{ id }], total: 42, page: 1, pageSize: 10 });
const flush = async () => { await nextTick(); await Promise.resolve(); await nextTick(); };
function setup() {
  const props = reactive({ modelValue: false, guestCount: 10, mealSlot: "lunch" as MealSlot | null });
  const scope = effectScope(); scopes.push(scope);
  const error = vi.fn();
  const selection = scope.run(() => useResourcePriceSelection(props, error))!;
  return { props, selection, error };
}
beforeEach(() => { vi.clearAllMocks(); api.getPriceOptions.mockResolvedValue(pageResult("a")); api.getPriceSelection.mockResolvedValue({ marker: "a" }); });
afterEach(() => { scopes.splice(0).forEach(scope => scope.stop()); });
describe("resource price selection requests", () => {
  it("defers options to the shared dropdown and loads one detail on selection", async () => {
    const { props, selection } = setup();
    await flush(); expect(api.getPriceOptions).not.toHaveBeenCalled();
    props.modelValue = true; await flush();
    expect(api.getPriceOptions).not.toHaveBeenCalled();
    await selection.loadOptions({ page: 1, pageSize: 10, keyword: "" });
    expect(api.getPriceOptions).toHaveBeenCalledExactlyOnceWith("restaurant", { page: 1, pageSize: 10, city: "", keyword: "" });
    expect(api.getPriceSelection).not.toHaveBeenCalled();
    selection.selectedId.value = "a"; await flush();
    expect(api.getPriceSelection).toHaveBeenCalledExactlyOnceWith("restaurant", "a");
    expect(selection.selectedOption.value?.id).toBe("a");
    props.modelValue = false; await flush(); props.mealSlot = null; props.modelValue = true; await flush();
    await selection.loadOptions({ page: 1, pageSize: 10, keyword: "" });
    expect(api.getPriceOptions).toHaveBeenLastCalledWith("attraction", { page: 1, pageSize: 10, city: "", keyword: "" });
    expect(api.getPriceSelection).toHaveBeenCalledTimes(1);
  });
  it("uses server search, city filtering and requested page size without loading other pages", async () => {
    const { props, selection } = setup(); props.modelValue = true; await flush();
    selection.city.value = "大理"; await flush();
    await selection.loadOptions({ keyword: "门票", page: 2, pageSize: 10 });
    expect(api.getPriceOptions).toHaveBeenCalledTimes(1);
    expect(api.getPriceOptions).toHaveBeenLastCalledWith("restaurant", { page: 2, pageSize: 10, city: "大理", keyword: "门票" });
    expect(api.getPriceSelection).not.toHaveBeenCalled();
  });
  it("ignores stale details after another selection or closing", async () => {
    const { props, selection } = setup(); props.modelValue = true; await flush();
    let oldDetail!: (value: unknown) => void;
    api.getPriceSelection.mockImplementationOnce(() => new Promise(resolve => { oldDetail = resolve; }));
    selection.selectedId.value = "old"; await flush(); selection.selectedId.value = "new"; await flush();
    oldDetail({ marker: "old" }); await flush(); expect(selection.selectedOption.value?.id).toBe("a");
    props.modelValue = false; await flush(); expect(selection.selectedOption.value).toBeUndefined();
  });
  it("clears a failed detail so an earlier choice cannot be submitted", async () => {
    const { props, selection, error } = setup(); props.modelValue = true; await flush();
    selection.selectedId.value = "a"; await flush();
    api.getPriceSelection.mockRejectedValueOnce(new Error("deleted")); selection.selectedId.value = "deleted"; await flush();
    expect(selection.selectedOption.value).toBeUndefined(); expect(error).toHaveBeenCalledOnce();
  });
});
