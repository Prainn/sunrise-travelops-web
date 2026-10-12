import { computed, onActivated, onMounted } from "vue";
import { ElMessage } from "element-plus";
import { resourceService } from "@/services/resource.service";

export function useCityOptions() {
  const load = () =>
    resourceService.loadCityOptions().catch((error: unknown) => {
      ElMessage.error(error instanceof Error ? error.message : String(error));
    });
  onMounted(load);
  onActivated(load);
  return computed(() => [
    ...new Set(
      resourceService.cityOptions
        .filter((city) => city.status === "enabled")
        .map((city) => city.name),
    ),
  ]);
}
