import { computed, ref, watch, onScopeDispose } from "vue";
import type { ItineraryDailyItemType, ItineraryResourceItem, MealSlot } from "@/types/itinerary";
import type { RemoteOptionsQuery } from "@/composables/useRemoteOptions";
import { resourceService } from "@/services/resource.service";
import { createId, multiplyMoney } from "@/utils";
import { calculateItem, getResourcePriceOptions, getDefaultResourceQuantity, type ResourcePriceOption } from "./pricing";

export function useResourcePriceSelection(props: { readonly destination?: string; readonly modelValue: boolean; readonly guestCount: number; readonly mealSlot: MealSlot | null; readonly currentItem?: ItineraryResourceItem }, onError: () => void) {
  const type = computed<ItineraryDailyItemType>(() => props.mealSlot ? "restaurant" : "attraction");
  const city = ref("");
  const selectedId = ref("");
  const quantity = ref(1);
  const actualPrice = ref(0);
  const adjustmentReason = ref("");
  const selectedOption = ref<ResourcePriceOption>();
  const referencePrice = computed(() => props.currentItem && props.currentItem.resourcePriceId === selectedOption.value?.resourcePriceId ? props.currentItem.referencePrice ?? null : selectedOption.value?.unitCost ?? null);
  const source = ref<"library" | "custom">("library");
  const customName = ref("");
  const customPrice = ref<number>();
  const customUnit = ref<"personMeal" | "table">("personMeal");
  const customQuantity = ref(1);
  const canSubmit = computed(() => props.mealSlot && source.value === "custom"
    ? Boolean(customName.value.trim()) && customPrice.value != null && Number.isFinite(customPrice.value) && customPrice.value >= 0 && Number.isInteger(customQuantity.value) && customQuantity.value > 0
    : Boolean(selectedOption.value));
  let detailVersion = 0;
  let initializing = false;
  function loadOptions(query: RemoteOptionsQuery) {
    return resourceService.getPriceOptions(type.value, { ...query, city: city.value });
  }
  watch(selectedId, async id => {
    if (initializing) return;
    const version = ++detailVersion;
    selectedOption.value = undefined;
    if (!id) return;
    try {
      const resources = await resourceService.getPriceSelection(type.value, id);
      if (version === detailVersion) selectedOption.value = getResourcePriceOptions(resources, props.guestCount)[0];
    } catch { if (version === detailVersion) onError(); }
  }, { flush: "sync" });
  watch(city, () => {
    if (!initializing) selectedId.value = "";
  }, { flush: "sync" });
  watch(selectedOption, (option) => {
    quantity.value = getDefaultResourceQuantity(option, props.guestCount);
    actualPrice.value = option?.unitCost ?? 0;
    adjustmentReason.value = "";
  }, { flush: "sync" });
  watch(customUnit, unit => {
    customQuantity.value = unit === "table" ? 1 : Math.max(props.guestCount, 1);
  }, { flush: "sync" });
  watch(() => props.modelValue, visible => {
    ++detailVersion;
    initializing = true;
    selectedId.value = "";
    selectedOption.value = undefined;
    if (visible) {
      city.value = props.destination ?? "";
      const item = props.currentItem;
      adjustmentReason.value = item?.adjustmentReason ?? "";
      const custom = item?.type === "restaurant" && item.resourceId === null && item.resourcePriceId === null;
      source.value = custom ? "custom" : "library";
      customName.value = custom ? item.resourceName : "";
      customPrice.value = custom ? item.unitCost : undefined;
      customUnit.value = custom && item.unit === "table" ? "table" : "personMeal";
      customQuantity.value = custom ? item.quantity : Math.max(props.guestCount, 1);
      if (item && !custom && item.resourceId && item.resourcePriceId) {
        selectedId.value = item.resourcePriceId;
        selectedOption.value = {
          id: item.resourcePriceId, type: item.type, resourceId: item.resourceId,
          resourcePriceId: item.resourcePriceId, resourceName: item.resourceName, priceName: item.priceName,
          city: city.value, unit: item.unit, unitCost: item.unitCost, searchText: "",
          details: [
            { labelKey: "itinerary.customMealPrice", value: item.unitCost, format: "money" },
          ],
        };
        quantity.value = item.quantity;
        actualPrice.value = item.unitCost; adjustmentReason.value = item.adjustmentReason ?? "";
      }
    }
    initializing = false;
  }, { immediate: true });

  function createItem(): ItineraryResourceItem | undefined {
    if (!canSubmit.value) return;
    const current = props.currentItem;
    if (props.mealSlot && source.value === "custom" && customPrice.value != null) {
      return {
        referencePrice: null, referenceBasis: "unknown", adjustmentReason: adjustmentReason.value,
        id: current?.id ?? createId("item"), type: "restaurant", mealSlot: props.mealSlot,
        resourceId: null, resourcePriceId: null, resourceName: customName.value.trim(), priceName: "",
        unit: customUnit.value, unitCost: customPrice.value, quantity: customQuantity.value,
        totalCost: multiplyMoney(customPrice.value, customQuantity.value), remark: current?.remark ?? "",
      };
    }
    const option = selectedOption.value;
    if (!option) return;
    if (current && current.resourcePriceId === option.resourcePriceId) {
      return { ...current, unitCost: actualPrice.value, adjustmentReason: adjustmentReason.value, quantity: quantity.value, totalCost: multiplyMoney(actualPrice.value, quantity.value) };
    }
    const item = calculateItem(option, quantity.value, actualPrice.value);
    item.adjustmentReason = adjustmentReason.value;
    return { ...item, id: current?.id ?? item.id, remark: current?.remark ?? "",
      ...(props.mealSlot ? { mealSlot: props.mealSlot } : {}) };
  }

  onScopeDispose(() => { ++detailVersion; });
  return { actualPrice, referencePrice, adjustmentReason, city, selectedId, quantity, selectedOption, loadOptions, source, customName, customPrice, customUnit, customQuantity, canSubmit, createItem };
}
