import { ApiRequestError, request } from "@/api/request";
import { translate } from "@/lang/utils";
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

interface ApiPageResult<T> extends PageResult<T> {
  page: number;
  pageSize: number;
}

const DICTIONARY_BASE_URL = "/system/dictionaries";

const ERROR_MESSAGE_KEYS: Record<string, string> = {
  DICTIONARY_TYPE_NOT_FOUND: "service.dictionary.notFound",
  DICTIONARY_TYPES_NOT_FOUND: "service.dictionary.notFound",
  DICTIONARY_ITEM_NOT_FOUND: "service.dictionary.optionNotFound",
  DICTIONARY_ITEMS_NOT_FOUND: "service.dictionary.optionNotFound",
  DICTIONARY_CODE_EXISTS: "service.dictionary.codeExists",
  DICTIONARY_ITEM_VALUE_EXISTS: "service.dictionary.valueExists",
  DICTIONARY_ID_MISMATCH: "service.dictionary.idMismatch",
  DICTIONARY_CODE_MISMATCH: "service.dictionary.codeMismatch",
  PERMISSION_DENIED: "request.permissionDenied",
};

function buildQuery(query: DictTypeQueryParams | DictItemQueryParams): string {
  const params = new URLSearchParams({
    pageNum: String(query.pageNum),
    pageSize: String(query.pageSize),
  });
  const keywords = query.keywords?.trim();
  if (keywords) params.set("keywords", keywords);
  if (query.status !== undefined) params.set("status", String(query.status));
  return params.toString();
}

function getDictionaryItemBaseUrl(dictCode: string): string {
  return `${DICTIONARY_BASE_URL}/${encodeURIComponent(dictCode)}/items`;
}

async function withDictionaryError<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof ApiRequestError) {
      const messageKey = ERROR_MESSAGE_KEYS[error.code];
      if (messageKey) throw new Error(translate(messageKey), { cause: error });
    }
    throw error;
  }
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
    return withDictionaryError(async () => {
      const data = await request<ApiPageResult<DictTypeItem>>(
        `${DICTIONARY_BASE_URL}?${buildQuery(query)}`
      );
      return { list: data.list, total: data.total };
    });
  },

  async getList(): Promise<OptionItem[]> {
    return withDictionaryError(() => request<OptionItem[]>(`${DICTIONARY_BASE_URL}/options`));
  },

  async getFormData(id: string): Promise<DictTypeForm> {
    return withDictionaryError(() =>
      request<DictTypeItem>(`${DICTIONARY_BASE_URL}/${encodeURIComponent(id)}`)
    );
  },

  async create(data: DictTypeForm): Promise<void> {
    await withDictionaryError(() =>
      request<DictTypeItem>(DICTIONARY_BASE_URL, {
        method: "POST",
        body: toDictionaryTypeInput(data),
      })
    );
  },

  async update(id: string, data: DictTypeForm): Promise<void> {
    await withDictionaryError(() =>
      request<DictTypeItem>(`${DICTIONARY_BASE_URL}/${encodeURIComponent(id)}`, {
        method: "PUT",
        body: toDictionaryTypeInput(data),
      })
    );
  },

  async deleteByIds(ids: string): Promise<void> {
    const params = new URLSearchParams({ ids });
    await withDictionaryError(() =>
      request<void>(`${DICTIONARY_BASE_URL}?${params.toString()}`, { method: "DELETE" })
    );
  },

  async getDictItemPage(
    dictCode: string,
    query: DictItemQueryParams
  ): Promise<PageResult<DictItem>> {
    return withDictionaryError(async () => {
      const data = await request<ApiPageResult<DictItem>>(
        `${getDictionaryItemBaseUrl(dictCode)}?${buildQuery(query)}`
      );
      return { list: data.list, total: data.total };
    });
  },

  async getDictItems(dictCode: string): Promise<DictItemOption[]> {
    return withDictionaryError(() =>
      request<DictItemOption[]>(`${getDictionaryItemBaseUrl(dictCode)}/options`)
    );
  },

  async createDictItem(dictCode: string, data: DictItemForm): Promise<void> {
    await withDictionaryError(() =>
      request<DictItem>(getDictionaryItemBaseUrl(dictCode), {
        method: "POST",
        body: toDictionaryItemInput(dictCode, data),
      })
    );
  },

  async getDictItemFormData(dictCode: string, id: string): Promise<DictItemForm> {
    return withDictionaryError(() =>
      request<DictItem>(`${getDictionaryItemBaseUrl(dictCode)}/${encodeURIComponent(id)}`)
    );
  },

  async updateDictItem(dictCode: string, id: string, data: DictItemForm): Promise<void> {
    await withDictionaryError(() =>
      request<DictItem>(`${getDictionaryItemBaseUrl(dictCode)}/${encodeURIComponent(id)}`, {
        method: "PUT",
        body: toDictionaryItemInput(dictCode, data),
      })
    );
  },

  async deleteDictItems(dictCode: string, ids: string): Promise<void> {
    const params = new URLSearchParams({ ids });
    await withDictionaryError(() =>
      request<void>(`${getDictionaryItemBaseUrl(dictCode)}?${params.toString()}`, {
        method: "DELETE",
      })
    );
  },
};
