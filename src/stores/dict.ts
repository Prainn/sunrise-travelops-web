import { store } from "./store";
import { STORAGE_KEYS } from "@/constants";
import { dictionaryService } from "@/services";
import type { DictItemOption } from "@/types/dictionary";

/** 字典缓存有效期；超时后重新请求，避免其他用户修改后长期显示旧选项。 */
const DICT_CACHE_TTL_MS = 10 * 60 * 1000;

interface DictCacheEntry {
  items: DictItemOption[];
  cachedAt: number;
}

function isFresh(entry: DictCacheEntry | undefined): entry is DictCacheEntry {
  return (
    !!entry &&
    Array.isArray(entry.items) &&
    typeof entry.cachedAt === "number" &&
    Date.now() - entry.cachedAt < DICT_CACHE_TTL_MS
  );
}

export const useDictStore = defineStore("dict", () => {
  // 字典数据缓存
  const dictCache = useStorage<Record<string, DictCacheEntry>>(STORAGE_KEYS.DICT_CACHE, {});

  // 请求队列（防止重复请求）
  const requestQueue: Record<string, Promise<void>> = {};
  // 清空缓存（退出、切换账号、维护字典）时递增，丢弃此前发出请求的回包，避免写回旧数据。
  let cacheGeneration = 0;

  /**
   * 缓存字典数据
   * @param dictCode 字典编码
   * @param data 字典项列表
   */
  const cacheDictItems = (dictCode: string, data: DictItemOption[]) => {
    dictCache.value[dictCode] = { items: data, cachedAt: Date.now() };
  };

  /**
   * 加载字典数据（如果缓存中没有则请求）
   * @param dictCode 字典编码
   */
  const loadDictItems = async (dictCode: string) => {
    if (isFresh(dictCache.value[dictCode])) return;
    // 防止重复请求
    if (!requestQueue[dictCode]) {
      const generation = cacheGeneration;
      const pending = dictionaryService
        .getDictItems(dictCode)
        .then((data) => {
          if (generation === cacheGeneration) cacheDictItems(dictCode, data);
        })
        .finally(() => {
          // 完成或失败都移出队列，允许重试；清空后已被新请求替换的不误删。
          if (requestQueue[dictCode] === pending) Reflect.deleteProperty(requestQueue, dictCode);
        });
      requestQueue[dictCode] = pending;
    }
    await requestQueue[dictCode];
  };

  /**
   * 获取字典项列表
   * @param dictCode 字典编码
   * @returns 字典项列表
   */
  const getDictItems = (dictCode: string): DictItemOption[] => {
    const entry = dictCache.value[dictCode];
    return isFresh(entry) ? entry.items : [];
  };

  /**
   * 移除指定字典项
   * @param dictCode 字典编码
   */
  const removeDictItem = (dictCode: string) => {
    cacheGeneration++;
    Reflect.deleteProperty(requestQueue, dictCode);
    if (dictCache.value[dictCode]) {
      Reflect.deleteProperty(dictCache.value, dictCode);
    }
  };

  /**
   * 清空字典缓存
   */
  const clearDictCache = () => {
    cacheGeneration++;
    for (const dictCode of Object.keys(requestQueue)) Reflect.deleteProperty(requestQueue, dictCode);
    dictCache.value = {};
  };

  return {
    loadDictItems,
    getDictItems,
    removeDictItem,
    clearDictCache,
  };
});

export function useDictStoreHook() {
  return useDictStore(store);
}
