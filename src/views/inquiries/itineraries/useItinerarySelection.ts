import { computed, reactive, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { inquiryService } from "@/services/inquiry.service";
import type { InquiryRecord } from "@/types/inquiry";
import type { ItineraryRecord } from "@/types/itinerary";
import { getDefaultItineraryId } from "./workflow";
export function useItinerarySelection() {
  const route = useRoute();
  const router = useRouter();
  const inquiry = ref<InquiryRecord>();
  const itineraryStore = reactive<ItineraryRecord[]>([]);
  const inquiryId = computed(() => String(route.params.inquiryId ?? ""));
  const rows = computed(() => [...itineraryStore].sort((a,b) => b.updatedAt.localeCompare(a.updatedAt)));
  const selectedItineraryId = ref("");
  const selectedItinerary = computed(() => itineraryStore.find(item => item.id === selectedItineraryId.value));
  const isLoading = ref(false);
  const loadError = ref("");
  let requestVersion = 0;
  async function reload() {
    const version = ++requestVersion; isLoading.value = true; loadError.value = "";
    try {
      const [record,plans] = await Promise.all([inquiryService.detail(inquiryId.value),inquiryService.listItineraries(inquiryId.value)]);
      if (version !== requestVersion) return;
      inquiry.value = record; itineraryStore.splice(0,itineraryStore.length,...plans);
      selectedItineraryId.value = getDefaultItineraryId(plans,String(route.query.itineraryId ?? selectedItineraryId.value));
    } catch (error) { if (version === requestVersion) loadError.value = error instanceof Error ? error.message : ""; }
    finally { if (version === requestVersion) isLoading.value = false; }
  }
  watch(inquiryId, () => { inquiry.value = undefined; itineraryStore.splice(0); selectedItineraryId.value = ""; void reload(); }, { immediate: true });
  watch(() => route.query.itineraryId, () => { selectedItineraryId.value = getDefaultItineraryId(rows.value,String(route.query.itineraryId ?? "")); });
  return { inquiry, inquiryId, itineraryStore, router, rows, selectedItinerary, selectedItineraryId, isLoading, loadError, reload };
}
