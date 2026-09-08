import { computed, onMounted } from "vue";
import { ElMessage } from "element-plus";
import { resourceService } from "@/services/resource.service";

export function useCityOptions() {
  onMounted(() => resourceService.loadCityOptions().catch((error: unknown) => {
    ElMessage.error(error instanceof Error ? error.message : String(error));
  }));
  return computed(() => resourceService.cityOptions.filter((city) => city.status === "enabled").map((city) => city.name));
}
