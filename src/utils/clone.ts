import { toRaw } from "vue";

// 展开 reactive 对象（如 { ...props.modelValue }）会把嵌套 Proxy 带进普通对象，需逐层 toRaw 才能 structuredClone
function toDeepRaw(value: unknown): unknown {
  const raw = toRaw(value);
  if (Array.isArray(raw)) return raw.map(toDeepRaw);
  if (raw && typeof raw === "object" && Object.getPrototypeOf(raw) === Object.prototype) {
    return Object.fromEntries(Object.entries(raw).map(([key, item]) => [key, toDeepRaw(item)]));
  }
  return raw;
}

/** 深拷贝响应式状态中的纯数据，结果不再与原状态共享引用。 */
export function clonePlainData<T>(value: T): T {
  return structuredClone(toDeepRaw(value)) as T;
}
