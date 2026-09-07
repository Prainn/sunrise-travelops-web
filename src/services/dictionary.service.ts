import { request } from "@/api/request";
import type { OptionItem, PageResult } from "@/types/common";
import type {
  DictItem,
  DictItemForm,
  DictItemOption,
  DictItemQueryParams,
  DictTypeForm,
  DictTypeItem,
  DictTypeQueryParams,
} from "@/types/dictionary";

const DICTIONARY_BASE_URL = "/system/dictionaries";

function buildParams(query: DictTypeQueryParams | DictItemQueryParams) {
  const keyword = query.keyword?.trim();
  return {
    page: query.page,
    pageSize: query.pageSize,
    keyword,
    status: query.status,
  };
}

function getDictionaryItemBaseUrl(dictCode: string): string {
  return `${DICTIONARY_BASE_URL}/${encodeURIComponent(dictCode)}/items`;
}

function toDictionaryTypeInput(data: DictTypeForm) {
  return {
    id: data.id,
    name: data.name?.trim() ?? "",
    dictCode: data.dictCode?.trim() ?? "",
    status: data.status ?? 1,
    remark: data.remark?.trim(),
  };
}

function toDictionaryItemInput(dictCode: string, data: DictItemForm) {
  return {
    id: data.id,
    dictCode,
    label: data.label?.trim() ?? "",
    value: data.value?.trim() ?? "",
    status: data.status ?? 1,
    sort: data.sort ?? 1,
    tagType: data.tagType ?? "",
  };
}

export const dictionaryService = {
  async getPage(query: DictTypeQueryParams): Promise<PageResult<DictTypeItem>> {
    return request.get<PageResult<DictTypeItem>>(DICTIONARY_BASE_URL, {
      params: buildParams(query),
    });
  },

  async getList(): Promise<OptionItem[]> {
    return request.get<OptionItem[]>(`${DICTIONARY_BASE_URL}/options`);
  },

  async getFormData(id: string): Promise<DictTypeForm> {
    return request.get<DictTypeItem>(`${DICTIONARY_BASE_URL}/${encodeURIComponent(id)}`);
  },

  async create(data: DictTypeForm): Promise<void> {
    await request.post<DictTypeItem>(DICTIONARY_BASE_URL, toDictionaryTypeInput(data));
  },

  async update(id: string, data: DictTypeForm): Promise<void> {
    await request.put<DictTypeItem>(
      `${DICTIONARY_BASE_URL}/${encodeURIComponent(id)}`,
      toDictionaryTypeInput(data)
    );
  },

  async deleteByIds(ids: string): Promise<void> {
    await request.delete<void>(DICTIONARY_BASE_URL, { params: { ids } });
  },

  async getDictItemPage(
    dictCode: string,
    query: DictItemQueryParams
  ): Promise<PageResult<DictItem>> {
    return request.get<PageResult<DictItem>>(getDictionaryItemBaseUrl(dictCode), {
      params: buildParams(query),
    });
  },

  async getDictItems(dictCode: string): Promise<DictItemOption[]> {
    return request.get<DictItemOption[]>(`${getDictionaryItemBaseUrl(dictCode)}/options`);
  },

  async createDictItem(dictCode: string, data: DictItemForm): Promise<void> {
    await request.post<DictItem>(
      getDictionaryItemBaseUrl(dictCode),
      toDictionaryItemInput(dictCode, data)
    );
  },

  async getDictItemFormData(dictCode: string, id: string): Promise<DictItemForm> {
    return request.get<DictItem>(
      `${getDictionaryItemBaseUrl(dictCode)}/${encodeURIComponent(id)}`
    );
  },

  async updateDictItem(dictCode: string, id: string, data: DictItemForm): Promise<void> {
    await request.put<DictItem>(
      `${getDictionaryItemBaseUrl(dictCode)}/${encodeURIComponent(id)}`,
      toDictionaryItemInput(dictCode, data)
    );
  },

  async deleteDictItems(dictCode: string, ids: string): Promise<void> {
    await request.delete<void>(getDictionaryItemBaseUrl(dictCode), { params: { ids } });
  },
};
