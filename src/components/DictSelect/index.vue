<template>
  <el-select
    v-if="type === 'select'"
    v-model="selectedValue"
    autocomplete="new-password"
    :placeholder="resolvedPlaceholder"
    :disabled="disabled"
    clearable
    :style="style"
    @change="handleChange"
  >
    <el-option
      v-for="option in options"
      :key="option.value"
      :label="option.label"
      :value="option.value"
    />
  </el-select>

  <el-radio-group
    v-else-if="type === 'radio'"
    v-model="selectedValue"
    :disabled="disabled"
    :style="style"
    @change="handleChange"
  >
    <el-radio v-for="option in options" :key="option.value" :value="option.value">
      {{ option.label }}
    </el-radio>
  </el-radio-group>

  <el-checkbox-group
    v-else-if="type === 'checkbox'"
    v-model="selectedValue"
    :disabled="disabled"
    :style="style"
    @change="handleChange"
  >
    <el-checkbox v-for="option in options" :key="option.value" :value="option.value">
      {{ option.label }}
    </el-checkbox>
  </el-checkbox-group>
</template>

<script setup lang="ts">
import { ElMessage } from "element-plus";
import { useDictStore } from "@/stores/dict";
import { requestErrorMessage } from "@/utils/version-conflict";

const dictStore = useDictStore();

const props = defineProps({
  code: {
    type: String,
    required: true,
  },
  modelValue: {
    type: [String, Number, Array],
    required: false,
  },
  type: {
    type: String,
    default: "select",
    validator: (value: string) => ["select", "radio", "checkbox"].includes(value),
  },
  placeholder: {
    type: String,
    default: "",
  },
  disabled: {
    type: Boolean,
    default: false,
  },
  style: {
    type: Object,
    default: () => {
      return {
        width: "300px",
      };
    },
  },
});

const emit = defineEmits(["update:modelValue"]);
const { t } = useI18n();
const resolvedPlaceholder = computed(() => props.placeholder || t("common.selectPlaceholder"));

const options = ref<Array<{ label: string; value: string | number }>>([]);

// Element Plus 的 select/radio/checkbox 值类型各不相同，此处统一承接。
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const selectedValue = ref<any>(
  typeof props.modelValue === "string" || typeof props.modelValue === "number"
    ? props.modelValue
    : Array.isArray(props.modelValue)
      ? props.modelValue
      : undefined,
);

// 监听 modelValue 和 options 的变化
watch(
  [() => props.modelValue, () => options.value],
  ([newValue, newOptions]) => {
    if (newOptions.length > 0 && newValue !== undefined) {
      if (props.type === "checkbox") {
        selectedValue.value = Array.isArray(newValue) ? newValue : [];
      } else {
        const matchedOption = newOptions.find(
          (option) => String(option.value) === String(newValue),
        );
        selectedValue.value = matchedOption?.value;
      }
    } else {
      selectedValue.value = undefined;
    }
  },
  { immediate: true },
);

// 监听 selectedValue 的变化并触发 update:modelValue
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function handleChange(val: any) {
  emit("update:modelValue", val);
}

// 获取字典数据
onMounted(async () => {
  try {
    await dictStore.loadDictItems(props.code);
    options.value = dictStore.getDictItems(props.code);
  } catch (error) {
    ElMessage.error(requestErrorMessage(error));
  }
});
</script>
