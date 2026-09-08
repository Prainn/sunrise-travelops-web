import { computed, ref, watch, onScopeDispose } from "vue";
import type { ItineraryDailyItemType, MealSlot } from "@/types/itinerary";
import type { RemoteOptionsQuery } from "@/composables/useRemoteOptions";
import { resourceService } from "@/services/resource.service";
import { getResourcePriceOptions, getDefaultResourceQuantity, type ResourcePriceOption } from "./pricing";

export function useResourcePriceSelection(props: { readonly modelValue: boolean; readonly guestCount: number; readonly mealSlot: MealSlot | null }, onError: () => void) {
  const type = computed<ItineraryDailyItemType>(() => props.mealSlot ? "restaurant" : "attraction");
  const city = ref("");
  const selectedId = ref("");
  const quantity = ref(1);
  const selectedOption = ref<ResourcePriceOption>();
  let detailVersion = 0;
  function loadOptions(query: RemoteOptionsQuery) {
    return resourceService.getPriceOptions(type.value, { ...query, city: city.value });
  }
  watch(selectedId, async id => {
    const version = ++detailVersion;
    selectedOption.value = undefined;
    if (!id) return;
    try {
      const resources = await resourceService.getPriceSelection(type.value, id);
      if (version === detailVersion) selectedOption.value = getResourcePriceOptions(resources, props.guestCount)[0];
    } catch { if (version === detailVersion) onError(); }
  });
  watch(city, () => {
    selectedId.value = "";
  });
  watch(() => props.modelValue, visible => {
    ++detailVersion;
    selectedId.value = "";
    selectedOption.value = undefined;
    if (!visible) return;
    if (city.value) city.value = "";
  });

  watch(selectedOption, (option) => {
    quantity.value = getDefaultResourceQuantity(option, props.guestCount);
  });

  onScopeDispose(() => { ++detailVersion; });
  return { city, selectedId, quantity, selectedOption, loadOptions };
}
