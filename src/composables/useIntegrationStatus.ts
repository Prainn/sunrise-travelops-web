import { ref, shallowRef } from "vue";
import { ElMessage } from "element-plus";
import { useI18n } from "vue-i18n";
import { websiteErrorMessage } from "@/services/website.service";
import type { IntegrationRuntime, IntegrationRuntimeInput } from "@/types/integration";
import { useRuntimeSwitches, type RuntimeSwitch } from "./useRuntimeSwitches";

export function useIntegrationStatus<T extends { runtime?: IntegrationRuntime }>(
  read: () => Promise<T>,
  update: (input: IntegrationRuntimeInput) => Promise<IntegrationRuntime>,
) {
  const { t } = useI18n();
  const status = shallowRef<T | null>(null);
  const loading = ref(false);
  const error = ref("");
  const switches = useRuntimeSwitches(load, update);

  async function load() {
    if (loading.value) return;
    loading.value = true;
    try {
      status.value = await read();
      error.value = "";
    } catch (cause) {
      status.value = null;
      error.value = websiteErrorMessage(cause);
    } finally {
      switches.sync(status.value?.runtime);
      loading.value = false;
    }
  }

  async function handleToggle(field: RuntimeSwitch, enabled: boolean) {
    if (loading.value) return;
    const result = await switches.toggle(field, enabled);
    if (result.kind === "saved") {
      ElMessage.success(t("integration.runtime.saved"));
      await load();
    } else if (result.kind === "conflict") {
      ElMessage.warning(t(error.value ? "integration.runtime.loadFailedHint" : "integration.runtime.conflict"));
    } else if (result.kind === "failed") ElMessage.error(result.message);
  }

  return { status, loading, error, switches, load, handleToggle };
}
