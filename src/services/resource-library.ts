import { ref } from "vue";
import type { LoginScope, ResourceLibrary } from "@/types/auth";
export const selectedResourceLibrary = ref<ResourceLibrary | undefined>(undefined);

export const selectedResourceBusinessUnit = ref<Exclude<LoginScope, "headquarters"> | undefined>(
  undefined,
);

export function resetResourceBusinessFilter() {
  if (!selectedResourceBusinessUnit.value) return;
  selectedResourceBusinessUnit.value = undefined;
  selectedResourceLibrary.value = undefined;
}
