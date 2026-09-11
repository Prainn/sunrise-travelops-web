import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { effectScope, nextTick, reactive } from "vue";
import type { ItineraryResourceItem, MealSlot } from "@/types/itinerary";
import type * as Pricing from "./pricing";
import { useResourcePriceSelection } from "./useResourcePriceSelection";

const api = vi.hoisted(() => ({ getPriceOptions: vi.fn(), getPriceSelection: vi.fn() }));
vi.mock("@/services/resource.service", () => ({ resourceService: api }));
vi.mock("./pricing", async importOriginal => ({
  ...await importOriginal<typeof Pricing>(),
  getResourcePriceOptions: (resources: { marker: string }) => [{ id: resources.marker, unit: "table", dinerCount: 10 }],
  getDefaultResourceQuantity: () => 1,
}));
const scopes: ReturnType<typeof effectScope>[] = [];
const pageResult = (id: string) => ({ list: [{ id }], total: 42, page: 1, pageSize: 10 });
const flush = async () => { await nextTick(); await Promise.resolve(); await nextTick(); };
function setup() {
  const props = reactive({ modelValue: false, guestCount: 10, destination: "昆明", mealSlot: "lunch" as MealSlot | null, currentItem: undefined as ItineraryResourceItem | undefined });
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
    expect(api.getPriceOptions).toHaveBeenCalledExactlyOnceWith("restaurant", { page: 1, pageSize: 10, city: "昆明", keyword: "" });
    expect(api.getPriceSelection).not.toHaveBeenCalled();
    selection.selectedId.value = "a"; await flush();
    expect(api.getPriceSelection).toHaveBeenCalledExactlyOnceWith("restaurant", "a");
    expect(selection.selectedOption.value?.id).toBe("a");
    props.modelValue = false; await flush(); props.mealSlot = null; props.destination = "大理"; props.modelValue = true; await flush();
    await selection.loadOptions({ page: 1, pageSize: 10, keyword: "" });
    expect(api.getPriceOptions).toHaveBeenLastCalledWith("attraction", { page: 1, pageSize: 10, city: "大理", keyword: "" });
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

const customMeal: ItineraryResourceItem = {
  id: "dinner-1", type: "restaurant", mealSlot: "dinner", resourceId: null, resourcePriceId: null,
  resourceName: "大理餐厅2", priceName: "", unit: "table", unitCost: 600, quantity: 3,
  totalCost: 1800, remark: "少辣",
};

describe("editing meal arrangements", () => {
  it("restores custom values, preserves table quantity, and leaves a cancelled edit untouched", async () => {
    const { props, selection } = setup();
    props.currentItem = { ...customMeal }; props.mealSlot = "dinner"; props.modelValue = true; await flush();
    expect(selection.source.value).toBe("custom");
    expect(selection.customQuantity.value).toBe(3);
    expect(selection.createItem()).toEqual(customMeal);
    selection.customName.value = "未确认名称"; selection.customPrice.value = 900;
    selection.customQuantity.value = 5;
    expect(props.currentItem).toEqual(customMeal);
    props.modelValue = false; await flush(); props.modelValue = true; await flush();
    expect(selection.createItem()).toEqual(customMeal);
    expect(api.getPriceSelection).not.toHaveBeenCalled();
  });
  it("reopens locally confirmed edits and resets to defaults only for an empty meal slot", async () => {
    const { props, selection } = setup();
    props.currentItem = { ...customMeal }; props.mealSlot = "dinner"; props.modelValue = true; await flush();
    selection.customName.value = "新餐厅"; selection.customUnit.value = "personMeal";
    expect(selection.customQuantity.value).toBe(10);
    selection.customQuantity.value = 12; selection.customPrice.value = 0;
    props.currentItem = selection.createItem();
    expect(props.currentItem).toMatchObject({ id: customMeal.id, resourceName: "新餐厅", quantity: 12, unitCost: 0, totalCost: 0, remark: "少辣" });
    props.modelValue = false; await flush(); props.modelValue = true; await flush();
    expect(selection.customQuantity.value).toBe(12);
    expect(selection.customPrice.value).toBe(0);
    props.modelValue = false; await flush(); props.currentItem = undefined; props.mealSlot = "lunch"; props.modelValue = true; await flush();
    expect(selection.source.value).toBe("library");
    selection.source.value = "custom";
    expect(selection.customName.value).toBe(""); expect(selection.customPrice.value).toBeUndefined();
    expect(selection.customUnit.value).toBe("personMeal"); expect(selection.customQuantity.value).toBe(10);
    expect(selection.createItem()).toBeUndefined();
  });
  it("preserves the library snapshot on reopen and keeps identity when switching sources", async () => {
    const { props, selection } = setup();
    const libraryMeal: ItineraryResourceItem = { ...customMeal, resourceId: "restaurant-1", resourcePriceId: "price-1", priceName: "团餐" };
    props.currentItem = libraryMeal; props.mealSlot = "dinner"; props.modelValue = true; await flush();
    expect(selection.source.value).toBe("library"); expect(selection.selectedId.value).toBe("price-1");
    expect(selection.quantity.value).toBe(3); expect(selection.createItem()).toEqual(libraryMeal);
    expect(api.getPriceSelection).not.toHaveBeenCalled();
    selection.source.value = "custom"; selection.customName.value = "自定义";
    selection.customPrice.value = 50; selection.customQuantity.value = 10;
    const custom = selection.createItem()!;
    expect(custom).toMatchObject({ id: libraryMeal.id, resourceId: null, resourcePriceId: null, totalCost: 500, remark: "少辣" });
    props.modelValue = false; await flush(); props.currentItem = custom; props.modelValue = true; await flush();
    selection.source.value = "library";
    selection.selectedOption.value = { id: "price-2", type: "restaurant", resourceId: "restaurant-2", resourcePriceId: "price-2", resourceName: "新资源餐厅", priceName: "包桌", city: "大理", unit: "table", unitCost: 700, details: [], searchText: "" };
    selection.quantity.value = 2;
    expect(selection.createItem()).toMatchObject({ id: libraryMeal.id, resourceId: "restaurant-2", resourcePriceId: "price-2", unitCost: 700, quantity: 2, totalCost: 1400, remark: "少辣", mealSlot: "dinner" });
  });
});
