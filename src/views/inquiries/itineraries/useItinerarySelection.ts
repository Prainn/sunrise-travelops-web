import { computed, reactive, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { inquiries, itineraries } from "@/data/data";
import { getDefaultItineraryId } from "./workflow";

export function useItinerarySelection() {
  const route = useRoute();
  const router = useRouter();
  const inquiryStore = reactive(inquiries);
  const itineraryStore = reactive(itineraries);
  const inquiryId = computed(() => String(route.params.inquiryId ?? ""));
  const inquiry = computed(() => inquiryStore.find((item) => item.id === inquiryId.value));
  const rows = computed(() => itineraryStore
    .filter((item) => item.inquiryId === inquiryId.value)
    .sort((left, right) => (right.updatedAt || right.createdAt).localeCompare(left.updatedAt || left.createdAt)));
  const selectedItineraryId = ref(getInitialItineraryId());
  const selectedItinerary = computed(() => rows.value.find((item) => item.id === selectedItineraryId.value));

  function getInitialItineraryId() {
    return getDefaultItineraryId(rows.value, String(route.query.itineraryId ?? ""));
  }

  watch([inquiryId, () => route.query.itineraryId], () => {
    selectedItineraryId.value = getInitialItineraryId();
  });

  return {
    inquiry,
    inquiryId,
    itineraryStore,
    router,
    rows,
    selectedItinerary,
    selectedItineraryId,
  };
}
