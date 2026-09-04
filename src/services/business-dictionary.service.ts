import { request } from "@/api/request";
import type {
  BusinessCategoryOptionRecord,
  BusinessCategoryTypeRecord,
  ResourceUnitRecord,
  TransportMethodRecord,
} from "@/types/resource";
import { resourceUnitStore } from "@/utils/resource-unit";
import { transportMethodStore } from "@/utils/transport-method";

type BusinessDictionaryItemForm = Omit<BusinessCategoryOptionRecord, "id"> & {
  id?: string;
  resourceTypes?: ResourceUnitRecord["resourceTypes"];
};

type BusinessDictionaryTypeForm = Pick<BusinessCategoryTypeRecord, "code" | "name" | "englishName"> & {
  id?: string;
};

interface BusinessDictionaryItemQuery {
  keyword?: string;
  status?: string;
}

const BUSINESS_DICTIONARY_BASE_URL = "/system/business-dictionaries";

function getItemBaseUrl(typeCode: string): string {
  return `${BUSINESS_DICTIONARY_BASE_URL}/${encodeURIComponent(typeCode)}/items`;
}

function buildItemParams(query: BusinessDictionaryItemQuery) {
  const keyword = query.keyword?.trim();
  return { keyword, status: query.status };
}

function syncBuiltInStores(types: BusinessCategoryTypeRecord[]): void {
  const resourceUnitType = types.find((type) => type.code === "resource-unit");
  const transportMethodType = types.find((type) => type.code === "transport-method");

  if (resourceUnitType) {
    resourceUnitStore.splice(0, resourceUnitStore.length, ...resourceUnitType.items.map((item) => ({
      ...item,
      code: item.code as ResourceUnitRecord["code"],
      resourceTypes: "resourceTypes" in item ? item.resourceTypes : [],
    } as ResourceUnitRecord)));
  }

  if (transportMethodType) {
    transportMethodStore.splice(0, transportMethodStore.length, ...transportMethodType.items.map((item) => ({
      ...item,
      code: item.code,
    } as TransportMethodRecord)));
  }
}

function toTypeInput(data: BusinessDictionaryTypeForm) {
  return {
    id: data.id,
    code: data.code.trim(),
    name: data.name.trim(),
    englishName: data.englishName.trim(),
  };
}

function toItemInput(typeCode: string, data: BusinessDictionaryItemForm) {
  return {
    id: data.id,
    code: data.code.trim(),
    name: data.name.trim(),
    englishName: data.englishName.trim(),
    resourceTypes: typeCode === "resource-unit" ? data.resourceTypes ?? [] : [],
    status: data.status,
    remark: data.remark?.trim() ?? "",
  };
}

export const businessDictionaryService = {
  async getTypes(): Promise<BusinessCategoryTypeRecord[]> {
    const types = await request.get<BusinessCategoryTypeRecord[]>(BUSINESS_DICTIONARY_BASE_URL);
    syncBuiltInStores(types);
    return types;
  },

  async createType(data: BusinessDictionaryTypeForm): Promise<BusinessCategoryTypeRecord> {
    return request.post<BusinessCategoryTypeRecord>(
      BUSINESS_DICTIONARY_BASE_URL,
      toTypeInput(data)
    );
  },

  async updateType(id: string, data: BusinessDictionaryTypeForm): Promise<BusinessCategoryTypeRecord> {
    return request.put<BusinessCategoryTypeRecord>(
      `${BUSINESS_DICTIONARY_BASE_URL}/${encodeURIComponent(id)}`,
      toTypeInput({ ...data, id })
    );
  },

  async deleteTypes(ids: string): Promise<void> {
    await request.delete<void>(BUSINESS_DICTIONARY_BASE_URL, { params: { ids } });
  },

  async getItems(typeCode: string, query: BusinessDictionaryItemQuery = {}): Promise<BusinessCategoryOptionRecord[]> {
    return request.get<BusinessCategoryOptionRecord[]>(getItemBaseUrl(typeCode), {
      params: buildItemParams(query),
    });
  },

  async createItem(typeCode: string, data: BusinessDictionaryItemForm): Promise<BusinessCategoryOptionRecord> {
    return request.post<BusinessCategoryOptionRecord>(
      getItemBaseUrl(typeCode),
      toItemInput(typeCode, data)
    );
  },

  async updateItem(typeCode: string, id: string, data: BusinessDictionaryItemForm): Promise<BusinessCategoryOptionRecord> {
    return request.put<BusinessCategoryOptionRecord>(
      `${getItemBaseUrl(typeCode)}/${encodeURIComponent(id)}`,
      toItemInput(typeCode, { ...data, id })
    );
  },

  async deleteItems(typeCode: string, ids: string): Promise<void> {
    await request.delete<void>(getItemBaseUrl(typeCode), { params: { ids } });
  },
};
