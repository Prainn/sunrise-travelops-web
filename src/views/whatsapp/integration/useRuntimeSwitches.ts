import { ref, shallowRef } from "vue";
import { ApiError } from "@/api/request";
import { websiteErrorMessage } from "@/services/website.service";
import { whatsappService } from "@/services/whatsapp.service";
import type { WhatsappRuntime } from "@/types/whatsapp";

export type RuntimeSwitch = "inbound" | "outbound";

export type RuntimeSaveResult =
  | { kind: "saved" | "skipped" }
  | { kind: "conflict" }
  | { kind: "failed"; message: string };

/**
 * 接入状态页的入站/出站开关：每次只提交一个开关和当前版本，保存中不允许并发操作。
 * 不做乐观更新，失败时界面保持上次已知状态；409 由调用方重新读取接入状态。
 *
 * @param reload - 重新读取接入状态并回填 runtime。
 * @returns 开关状态与操作。
 */
export function useRuntimeSwitches(reload: () => Promise<unknown>) {
  const runtime = shallowRef<WhatsappRuntime | null>(null);
  const saving = ref<RuntimeSwitch | null>(null);

  /** 以服务端最新返回回填；缺少 runtime 或读取失败时为 null，开关全部禁用。 */
  function sync(next: WhatsappRuntime | null | undefined) {
    runtime.value = next ?? null;
  }

  function isAvailable(field: RuntimeSwitch) {
    const current = runtime.value;
    if (!current) return false;
    return field === "inbound" ? current.inboundAvailable : current.outboundAvailable;
  }

  async function toggle(field: RuntimeSwitch, enabled: boolean): Promise<RuntimeSaveResult> {
    const current = runtime.value;
    if (!current || saving.value || !isAvailable(field)) return { kind: "skipped" };
    saving.value = field;
    try {
      const input = field === "inbound"
        ? { version: current.version, inboundEnabled: enabled }
        : { version: current.version, outboundEnabled: enabled };
      runtime.value = await whatsappService.updateRuntime(input);
      return { kind: "saved" };
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 409) {
        await reload().catch(() => undefined);
        return { kind: "conflict" };
      }
      return { kind: "failed", message: websiteErrorMessage(cause) };
    } finally {
      saving.value = null;
    }
  }

  return { runtime, saving, sync, isAvailable, toggle };
}
