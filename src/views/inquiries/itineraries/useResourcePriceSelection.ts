import { computed, ref, watch, onScopeDispose } from "vue";
import type { ItineraryDailyItemType, ItineraryResourceItem, MealSlot } from "@/types/itinerary";
import type { RemoteOptionsQuery } from "@/composables/useRemoteOptions";
import { resourceService } from "@/services/resource.service";
import { createId, multiplyMoney, roundMoney } from "@/utils";
import { calculateItem, recalculateItem, getResourcePriceOptions, getDefaultResourceQuantity, type ResourcePriceOption } from "./pricing";

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
  const dinerCount = ref<number>();
  const baseCanSubmit = computed(() => props.mealSlot && source.value === "custom"
    ? Boolean(customName.value.trim()) && customPrice.value != null && Number.isFinite(customPrice.value) && customPrice.value >= 0 && Number.isInteger(customQuantity.value) && customQuantity.value > 0
    : Boolean(selectedOption.value));
  const reasonRequired = computed(() => {
    if (props.mealSlot && source.value === "custom") return true;
    const option = selectedOption.value;
    if (!option) return false;
    const current = props.currentItem;
    const sameSource = current?.resourceId === option.resourceId && current.resourcePriceId === option.resourcePriceId;
    const comparison = sameSource ? current.unitCost : referencePrice.value;
    return comparison == null || roundMoney(actualPrice.value) !== roundMoney(comparison);
  });
  const canSubmitWithDiners = computed(() => baseCanSubmit.value &&
    ((source.value === 'custom' ? customUnit.value : selectedOption.value?.unit) !== 'table' ||
      (dinerCount.value != null && Number.isInteger(dinerCount.value) && dinerCount.value > 0)) &&
    (!reasonRequired.value || Boolean(adjustmentReason.value.trim())));
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
    quantity.value = getDefaultResourceQuantity();
    actualPrice.value = option?.unitCost ?? 0;
    dinerCount.value = option?.dinerCount;
    adjustmentReason.value = "";
  }, { flush: "sync" });
  watch(customUnit, unit => {
    customQuantity.value = 1;
    if (unit !== "table") dinerCount.value = undefined;
  }, { flush: "sync" });
  watch(() => props.modelValue, visible => {
    ++detailVersion;
    initializing = true;
    selectedId.value = "";
    selectedOption.value = undefined;
    if (visible) {
      city.value = props.destination ?? "";
      const item = props.currentItem;
      dinerCount.value = item?.dinerCount ?? undefined;
      adjustmentReason.value = item?.adjustmentReason ?? "";
      const custom = item?.type === "restaurant" && item.resourceId === null && item.resourcePriceId === null;
      source.value = custom ? "custom" : "library";
      customName.value = custom ? item.resourceName : "";
      customPrice.value = custom ? item.unitCost : undefined;
      customUnit.value = custom && item.unit === "table" ? "table" : "personMeal";
      customQuantity.value = custom ? item.quantity : 1;
      if (item && !custom && item.resourceId && item.resourcePriceId) {
        selectedId.value = item.resourcePriceId;
        selectedOption.value = {
          id: item.resourcePriceId, type: item.type, resourceId: item.resourceId,
          resourcePriceId: item.resourcePriceId, resourceName: item.resourceName, priceName: item.priceName,
          dinerCount: item.dinerCount ?? undefined,
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
    if (!canSubmitWithDiners.value) return;
    const current = props.currentItem;
    if (props.mealSlot && source.value === "custom" && customPrice.value != null) {
      return {
        referencePrice: null, referenceBasis: "unknown", adjustmentReason: adjustmentReason.value,
        id: current?.id ?? createId("item"), type: "restaurant", mealSlot: props.mealSlot,
        resourceId: null, resourcePriceId: null, resourceName: customName.value.trim(), priceName: "",
        unit: customUnit.value, unitCost: customPrice.value, quantity: customQuantity.value,
        dinerCount: customUnit.value === "table" ? dinerCount.value! : null,
        totalCost: multiplyMoney(customUnit.value === "table" ? roundMoney(customPrice.value / dinerCount.value!) : customPrice.value, customQuantity.value), remark: current?.remark ?? "",
      };
    }
    const option = selectedOption.value;
    if (!option) return;
    if (current && current.resourcePriceId === option.resourcePriceId) {
      const item = { ...current, unitCost: actualPrice.value, adjustmentReason: adjustmentReason.value, quantity: quantity.value, dinerCount: current.unit === 'table' ? dinerCount.value! : null };
      recalculateItem(item);
      return item;
    }
    const item = calculateItem({ ...option, dinerCount: dinerCount.value }, quantity.value, actualPrice.value);
    item.adjustmentReason = adjustmentReason.value;
    return { ...item, id: current?.id ?? item.id, remark: current?.remark ?? "",
      ...(props.mealSlot ? { mealSlot: props.mealSlot } : {}) };
  }

  onScopeDispose(() => { ++detailVersion; });
  return { actualPrice, referencePrice, adjustmentReason, reasonRequired, city, selectedId, quantity, selectedOption, loadOptions, source, customName, customPrice, customUnit, customQuantity, dinerCount, canSubmit: canSubmitWithDiners, createItem };
}
