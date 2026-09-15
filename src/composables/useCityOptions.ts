import { computed, onActivated, onMounted, toValue, type MaybeRefOrGetter } from "vue";
import { ElMessage } from "element-plus";
import { resourceService } from "@/services/resource.service";

import type { ResourceLibrary } from "@/types/auth";

export function useCityOptions(library?: MaybeRefOrGetter<ResourceLibrary | undefined>) {
  const load = () => resourceService.loadCityOptions().catch((error: unknown) => {
    ElMessage.error(error instanceof Error ? error.message : String(error));
  });
  onMounted(load);
  onActivated(load);
  return computed(() => [...new Set(resourceService.cityOptions.filter((city) => city.status === "enabled" && (!toValue(library) || city.library === toValue(library))).map((city) => city.name))]);
}
