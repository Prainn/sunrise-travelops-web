import { computed, readonly, ref, type Ref } from "vue";
import type { FormInstance } from "element-plus";

/**
 * 锁定资源表单的校验与保存流程，校验通过后才开始请求和 loading。
 */
export function useResourceFormSubmit(
  formRef: Ref<Pick<FormInstance, "validate"> | undefined>,
) {
  const isValidating = ref(false);
  const isSaving = ref(false);
  const isSubmitting = computed(() => isValidating.value || isSaving.value);

  async function submitForm(save: () => Promise<unknown>) {
    if (isSubmitting.value) return;
    isValidating.value = true;
    try {
      if (!(await formRef.value?.validate().catch(() => false))) return;
      isSaving.value = true;
      isValidating.value = false;
      await save();
    } finally {
      isValidating.value = false;
      isSaving.value = false;
    }
  }

  return { isSubmitting, isSaving: readonly(isSaving), submitForm };
}
