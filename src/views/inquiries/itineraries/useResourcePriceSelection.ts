import { computed, ref, watch, onScopeDispose } from "vue";
import type { ItineraryDailyItemType, MealSlot } from "@/types/itinerary";
import { DEFAULT_PAGE_SIZE } from "@/components/Pagination/config";
import { resourceService, type PriceSelectionItem } from "@/services/resource.service";
import { getResourcePriceOptions, getDefaultResourceQuantity, type ResourcePriceOption } from "./pricing";

export function useResourcePriceSelection(props: { readonly modelValue: boolean; readonly guestCount: number; readonly mealSlot: MealSlot | null }, onError: () => void) {
  const type = computed<ItineraryDailyItemType>(() => props.mealSlot ? "restaurant" : "attraction");
  const city = ref("");
  const selectedId = ref("");
  const keyword = ref("");
  const quantity = ref(1);
  const visibleOptions = ref<PriceSelectionItem[]>([]);
  const selectedOption = ref<ResourcePriceOption>();
  const page = ref(1);
  const pageSize = ref(DEFAULT_PAGE_SIZE);
  const total = ref(0);
  const loading = ref(false);
  let listVersion = 0;
  let detailVersion = 0;
  async function loadOptions() {
    const version = ++listVersion;
    loading.value = true;
    try {
      const result = await resourceService.getPriceOptions(type.value, { page: page.value, pageSize: pageSize.value, city: city.value, keyword: keyword.value });
      if (version !== listVersion) return;
      visibleOptions.value = result.list;
      total.value = result.total;
    } catch {
      if (version === listVersion) { visibleOptions.value = []; total.value = 0; onError(); }
    } finally { if (version === listVersion) loading.value = false; }
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
    keyword.value = "";
    page.value = 1;
    if (props.modelValue) void loadOptions();
  });
  watch(() => props.modelValue, visible => {
    ++listVersion;
    ++detailVersion;
    selectedId.value = "";
    selectedOption.value = undefined;
    visibleOptions.value = [];
    if (!visible) return;
    keyword.value = "";
    page.value = 1;
    if (city.value) city.value = "";
    else void loadOptions();
  });

  watch(selectedOption, (option) => {
    quantity.value = getDefaultResourceQuantity(option, props.guestCount);
  });

  function filterOptions(value: string) { keyword.value = value; page.value = 1; void loadOptions(); }

  onScopeDispose(() => { ++listVersion; ++detailVersion; });
  return { city, selectedId, quantity, visibleOptions, selectedOption, page, pageSize, total, loading, loadOptions, filterOptions };
}
