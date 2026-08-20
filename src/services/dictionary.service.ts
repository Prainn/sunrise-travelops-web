import type { OptionItem, PageResult } from "@/api/common";
import { systemDictionaryItems, systemDictionaryTypes } from "@/data/data";
import { translate } from "@/lang/utils";
import type {
  DictItem,
  DictItemForm,
  DictItemOption,
  DictItemQueryParams,
  DictTypeForm,
  DictTypeItem,
  DictTypeQueryParams,
} from "@/types/dictionary";

function paginate<T>(list: T[], pageNum: number, pageSize: number): PageResult<T> {
  const start = (pageNum - 1) * pageSize;
  return {
    list: list.slice(start, start + pageSize),
    total: list.length,
  };
}

function createId(records: Array<{ id: string }>): string {
  return String(Math.max(0, ...records.map((item) => Number(item.id) || 0)) + 1);
}

function localizeDictionaryType(item: (typeof systemDictionaryTypes)[number]): DictTypeItem {
  return {
    ...item,
    name: item.nameKey ? translate(item.nameKey) : item.name,
    remark: item.remarkKey ? translate(item.remarkKey) : item.remark,
  };
}

function localizeDictionaryItem(item: (typeof systemDictionaryItems)[number]): DictItem {
  return {
    ...item,
    label: item.labelKey ? translate(item.labelKey) : item.label,
  };
}

function requireDictionaryType(id: string): (typeof systemDictionaryTypes)[number] {
  const dictionaryType = systemDictionaryTypes.find((item) => item.id === id);
  if (!dictionaryType) throw new Error(translate("service.dictionary.notFound"));
  return dictionaryType;
}

function requireDictionaryItem(
  dictCode: string,
  id: string
): (typeof systemDictionaryItems)[number] {
  const dictionaryItem = systemDictionaryItems.find(
    (item) => item.dictCode === dictCode && item.id === id
  );
  if (!dictionaryItem) throw new Error(translate("service.dictionary.optionNotFound"));
  return dictionaryItem;
}

function ensureUniqueDictCode(dictCode: string, currentId?: string): void {
  const exists = systemDictionaryTypes.some(
    (item) => item.dictCode === dictCode && item.id !== currentId
  );
  if (exists) throw new Error(translate("service.dictionary.codeExists"));
}

function ensureUniqueItemValue(dictCode: string, value: string, currentId?: string): void {
  const exists = systemDictionaryItems.some(
    (item) => item.dictCode === dictCode && item.value === value && item.id !== currentId
  );
  if (exists) throw new Error(translate("service.dictionary.valueExists"));
}

export const dictionaryService = {
  async getPage(query: DictTypeQueryParams): Promise<PageResult<DictTypeItem>> {
    const keywords = query.keywords?.trim().toLowerCase();
    const filtered = systemDictionaryTypes.filter((item) => {
      const localized = localizeDictionaryType(item);
      const matchesKeywords =
        !keywords ||
        localized.name.toLowerCase().includes(keywords) ||
        item.dictCode.toLowerCase().includes(keywords);
      const matchesStatus = query.status === undefined || item.status === query.status;
      return matchesKeywords && matchesStatus;
    });

    return paginate(
      filtered.map(localizeDictionaryType),
      query.pageNum,
      query.pageSize
    );
  },

  async getList(): Promise<OptionItem[]> {
    return systemDictionaryTypes
      .filter((item) => item.status === 1)
      .map((item) => ({ value: item.dictCode, label: localizeDictionaryType(item).name }));
  },

  async getFormData(id: string): Promise<DictTypeForm> {
    return localizeDictionaryType(requireDictionaryType(id));
  },

  async create(data: DictTypeForm): Promise<void> {
    const name = data.name?.trim();
    const dictCode = data.dictCode?.trim();
    if (!name || !dictCode) throw new Error(translate("service.dictionary.requiredFields"));
    ensureUniqueDictCode(dictCode);

    systemDictionaryTypes.push({
      id: createId(systemDictionaryTypes),
      name,
      dictCode,
      status: data.status ?? 1,
      remark: data.remark?.trim(),
    });
  },

  async update(id: string, data: DictTypeForm): Promise<void> {
    const dictionaryType = requireDictionaryType(id);
    const name = data.name?.trim();
    const dictCode = data.dictCode?.trim();
    if (!name || !dictCode) throw new Error(translate("service.dictionary.requiredFields"));
    ensureUniqueDictCode(dictCode, id);

    const previousCode = dictionaryType.dictCode;
    Object.assign(dictionaryType, {
      name,
      dictCode,
      status: data.status ?? 1,
      remark: data.remark?.trim(),
    });
    delete dictionaryType.nameKey;
    delete dictionaryType.remarkKey;

    if (previousCode !== dictCode) {
      systemDictionaryItems.forEach((item) => {
        if (item.dictCode === previousCode) item.dictCode = dictCode;
      });
    }
  },

  async deleteByIds(ids: string): Promise<void> {
    const idSet = new Set(ids.split(",").filter(Boolean));
    const codes = new Set(
      systemDictionaryTypes.filter((item) => idSet.has(item.id)).map((item) => item.dictCode)
    );

    for (let index = systemDictionaryTypes.length - 1; index >= 0; index -= 1) {
      if (idSet.has(systemDictionaryTypes[index].id)) systemDictionaryTypes.splice(index, 1);
    }
    for (let index = systemDictionaryItems.length - 1; index >= 0; index -= 1) {
      if (codes.has(systemDictionaryItems[index].dictCode)) systemDictionaryItems.splice(index, 1);
    }
  },

  async getDictItemPage(
    dictCode: string,
    query: DictItemQueryParams
  ): Promise<PageResult<DictItem>> {
    const keywords = query.keywords?.trim().toLowerCase();
    const filtered = systemDictionaryItems
      .filter(
        (item) => {
          const localized = localizeDictionaryItem(item);
          return (
            item.dictCode === dictCode &&
            (!keywords ||
              localized.label.toLowerCase().includes(keywords) ||
              item.value.toLowerCase().includes(keywords))
          );
        }
      )
      .sort((first, second) => (first.sort ?? 0) - (second.sort ?? 0));

    return paginate(
      filtered.map(localizeDictionaryItem),
      query.pageNum,
      query.pageSize
    );
  },

  async getDictItems(dictCode: string): Promise<DictItemOption[]> {
    return systemDictionaryItems
      .filter((item) => item.dictCode === dictCode && item.status === 1)
      .sort((first, second) => (first.sort ?? 0) - (second.sort ?? 0))
      .map((item) => ({
        value: item.value,
        label: localizeDictionaryItem(item).label,
        tagType: item.tagType,
      }));
  },

  async createDictItem(dictCode: string, data: DictItemForm): Promise<void> {
    const label = data.label?.trim();
    const value = data.value?.trim();
    if (!label || !value) throw new Error(translate("service.dictionary.optionRequiredFields"));
    ensureUniqueItemValue(dictCode, value);

    systemDictionaryItems.push({
      id: createId(systemDictionaryItems),
      dictCode,
      label,
      value,
      status: data.status ?? 1,
      sort: data.sort ?? 1,
      tagType: data.tagType ?? "",
    });
  },

  async getDictItemFormData(dictCode: string, id: string): Promise<DictItemForm> {
    return localizeDictionaryItem(requireDictionaryItem(dictCode, id));
  },

  async updateDictItem(dictCode: string, id: string, data: DictItemForm): Promise<void> {
    const dictionaryItem = requireDictionaryItem(dictCode, id);
    const label = data.label?.trim();
    const value = data.value?.trim();
    if (!label || !value) throw new Error(translate("service.dictionary.optionRequiredFields"));
    ensureUniqueItemValue(dictCode, value, id);

    Object.assign(dictionaryItem, {
      label,
      value,
      status: data.status ?? 1,
      sort: data.sort ?? 1,
      tagType: data.tagType ?? "",
    });
    delete dictionaryItem.labelKey;
  },

  async deleteDictItems(dictCode: string, ids: string): Promise<void> {
    const idSet = new Set(ids.split(",").filter(Boolean));
    for (let index = systemDictionaryItems.length - 1; index >= 0; index -= 1) {
      const item = systemDictionaryItems[index];
      if (item.dictCode === dictCode && idSet.has(item.id)) systemDictionaryItems.splice(index, 1);
    }
  },
};
