<template>
  <span class="strict-input-number inline-flex flex-col min-w-0 w-full">
    <el-input
      v-bind="$attrs"
      :model-value="raw"
      :disabled="disabled"
      :aria-invalid="Boolean(error)"
      inputmode="decimal"
      @input="input"
    >
      <template v-if="controls && !disabled" #prepend><el-button :disabled="Boolean(error)" @click="stepBy(-1)">−</el-button></template>
      <template v-if="controls && !disabled" #append><el-button :disabled="Boolean(error)" @click="stepBy(1)">+</el-button></template>
    </el-input>
    <span v-if="error" role="alert" class="text-[12px] text-[var(--el-color-danger)]">{{ error }}</span>
  </span>
</template>
<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useFormItem, type FormItemContext } from "element-plus";
import { useI18n } from "vue-i18n";
defineOptions({ inheritAttrs: false });
const props = withDefaults(defineProps<{
  modelValue?: number | null;
  min?: number;
  max?: number;
  precision?: number;
  step?: number;
  controls?: boolean;
  controlsPosition?: string;
  disabled?: boolean;
}>(), { min: -Infinity, max: Infinity, precision: 0, step: 1, controls: true, controlsPosition: "", disabled: false, modelValue: undefined });
const emit = defineEmits<{ "update:modelValue": [value: number | undefined] }>();
const { t } = useI18n();
const { form, formItem } = useFormItem();
const raw = ref(props.modelValue == null ? "" : String(props.modelValue));
watch(() => props.modelValue, value => {
  if (value == null) { if (raw.value !== "") raw.value = ""; }
  else if (!Object.is(Number(raw.value), value)) raw.value = String(value);
});
const error = computed(() => {
  if (!raw.value.trim()) return "";
  const n = Number(raw.value);
  const valid = /^-?\d+(?:\.\d*)?$/.test(raw.value) && Number.isFinite(n) && n >= props.min && n <= props.max && (raw.value.split(".")[1]?.length ?? 0) <= props.precision;
  return valid ? "" : t("common.invalidNumber", { min: props.min === -Infinity ? "−∞" : props.min, max: props.max === Infinity ? "∞" : props.max, precision: props.precision });
});
function input(value: string) {
  raw.value = value;
  emit("update:modelValue", value.trim() === "" ? undefined : Number(value));
}
function stepBy(direction: number) {
  const current = props.modelValue ?? (Number.isFinite(props.min) ? props.min : 0);
  const next = Number((current + direction * props.step).toFixed(props.precision));
  if (next >= props.min && next <= props.max) input(String(next));
}
// Register the raw-value validator with the enclosing form, including fields without a prop.
const prop = `strict-number-${crypto.randomUUID()}`;
const field = {
  ...formItem,
  prop,
  propString: prop,
  validate: async () => {
    if (error.value) return Promise.reject({ [prop]: [{ message: error.value, field: prop }] });
    return true;
  },
  clearValidate: () => {},
  resetField: () => { raw.value = props.modelValue == null ? "" : String(props.modelValue); },
} as FormItemContext;
onMounted(() => form?.addField(field));
onBeforeUnmount(() => form?.removeField(field));
</script>
