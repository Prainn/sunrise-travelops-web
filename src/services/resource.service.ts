import { reactive } from "vue";
import { request } from "@/api/request";
import { businessDictionaryService } from "@/services/business-dictionary.service";
import type { PageResult } from "@/types/common";
import type {
  AgencyContactRecord, AgencyRecord, AttractionPriceRecord, AttractionRecord,
  CityRecord, GuideRecord, HotelRecord, ResourceListQuery,
  RestaurantPriceRecord, RestaurantRecord, SupplierOptionRecord, SupplierRecord,
  TransportRecord,
} from "@/types/resource";

type ResourceQuery = ResourceListQuery & Record<string, string | number | undefined>;

interface ResourceCrud<T> {
  getPage(query: ResourceQuery): Promise<PageResult<T>>;
  getDetail(id: string): Promise<T>;
  create(data: T): Promise<T>;
  update(id: string, data: T): Promise<T>;
  deleteByIds(ids: string): Promise<void>;
}

interface ApiMoneyFields {
  individualPrice?: string;
  groupPrice?: string | null;
  dailyPrice?: string;
  price?: string;
  rackPrice?: string;
  settlementPrice?: string;
}

type ApiRecord<T> = {
  [K in keyof T]: K extends keyof ApiMoneyFields ? ApiMoneyFields[K] : T[K];
};

const RESOURCE_BASE_URL = "/resources";

function buildParams(query: ResourceQuery): ResourceQuery {
  return Object.fromEntries(Object.entries(query).map(([key, value]) => {
    const normalizedValue = typeof value === "string" ? value.trim() : value;
    return [key, normalizedValue || normalizedValue === 0 ? normalizedValue : undefined];
  })) as ResourceQuery;
}

function normalizeMoney(value: string | number | null | undefined): number {
  return value === null || value === undefined ? 0 : Number(value);
}

function createCrud<T>(
  resourceName: string,
  toInput: (data: T) => Record<string, unknown>,
  fromResponse: (data: ApiRecord<T>) => T = (data) => data as T
): ResourceCrud<T> {
  const baseUrl = `${RESOURCE_BASE_URL}/${resourceName}`;
  return {
    async getPage(query) {
      const result = await request.get<PageResult<ApiRecord<T>>>(baseUrl, {
        params: buildParams(query),
      });
      return { ...result, list: result.list.map(fromResponse) };
    },
    async getDetail(id) {
      const result = await request.get<ApiRecord<T>>(`${baseUrl}/${encodeURIComponent(id)}`);
      return fromResponse(result);
    },
    create(data) {
      return request.post<ApiRecord<T>>(baseUrl, toInput(data)).then(fromResponse);
    },
    update(id, data) {
      return request.put<ApiRecord<T>>(
        `${baseUrl}/${encodeURIComponent(id)}`,
        { ...toInput(data), id, version: (data as T & { version?: number }).version }
      ).then(fromResponse);
    },
    async deleteByIds(ids) {
      await request.delete<void>(baseUrl, { params: { ids } });
    },
  };
}

function agencyInput(data: AgencyRecord) {
  return {
    id: data.id || undefined, code: data.code.trim(), name: data.name.trim(), city: data.city.trim(),
    countryOrRegion: data.countryOrRegion.trim(), email: data.email.trim(), status: data.status, remark: data.remark.trim(),
  };
}

function supplierInput(data: SupplierRecord) {
  return {
    id: data.id || undefined, code: data.code.trim(), name: data.name.trim(), city: data.city.trim(),
    countryOrRegion: data.countryOrRegion.trim(), contact: data.contact.trim(), email: data.email.trim(),
    phone: data.phone.trim(), status: data.status, remark: data.remark.trim(),
  };
}

function hotelInput(data: HotelRecord) {
  return {
    id: data.id || undefined, code: data.code.trim(), name: data.name.trim(), province: data.province.trim(),
    city: data.city.trim(), rating: data.rating.trim(), facilities: data.facilities.trim(), breakfastIncluded: data.breakfastIncluded, breakfast: data.breakfast.trim(),
    address: data.address.trim(), phone: data.phone.trim(), nearby: data.nearby.trim(),
    individualPrice: data.individualPrice, groupPrice: data.groupPrice, minimumGroupSize: data.minimumGroupSize,
    unit: data.unit, status: data.status,
  };
}

function restaurantInput(data: RestaurantRecord) {
  return {
    id: data.id || undefined, code: data.code.trim(), name: data.name.trim(), city: data.city.trim(),
    cuisine: data.cuisine.trim(), contact: data.contact.trim(), phone: data.phone.trim(), address: data.address.trim(),
    remark: data.remark.trim(), unit: data.unit, status: data.status,
  };
}

function attractionInput(data: AttractionRecord) {
  return {
    id: data.id || undefined, code: data.code.trim(), name: data.name.trim(), area: data.area.trim(), category: data.category,
    restroomLocation: data.restroomLocation.trim(), remark: data.remark.trim(), unit: data.unit, status: data.status,
  };
}

function transportInput(data: TransportRecord) {
  return {
    id: data.id || undefined, code: data.code.trim(), name: data.name.trim(), serviceLevel: data.serviceLevel,
    seats: data.seats, dailyPrice: data.dailyPrice, unit: data.unit, city: data.city.trim(),
    phone: data.phone.trim(), status: data.status, remark: data.remark.trim(),
  };
}

function guideInput(data: GuideRecord) {
  return {
    id: data.id || undefined, code: data.code.trim(), name: data.name.trim(), certificateNo: data.certificateNo.trim(),
    gender: data.gender, age: data.age, languages: data.languages, employmentType: data.employmentType,
    identityNumber: data.identityNumber.trim(), phone: data.phone.trim(), dailyPrice: data.dailyPrice,
    unit: data.unit, hasLaborContract: data.hasLaborContract, groundOperatorId: data.groundOperatorId,
    licensePhotoUrl: data.licensePhotoUrl.trim(), remark: data.remark.trim(), status: data.status,
  };
}

function normalizeHotel(data: ApiRecord<HotelRecord>): HotelRecord {
  return { ...data, individualPrice: normalizeMoney(data.individualPrice), groupPrice: data.groupPrice === null ? null : normalizeMoney(data.groupPrice) };
}

function normalizeRestaurantPrice(data: ApiRecord<RestaurantPriceRecord>): RestaurantPriceRecord {
  return { ...data, price: normalizeMoney(data.price), dinerCount: data.dinerCount ?? 0 };
}

function normalizeRestaurant(data: RestaurantRecord): RestaurantRecord {
  return { ...data, prices: (data.prices ?? []).map((price) => normalizeRestaurantPrice(price as unknown as ApiRecord<RestaurantPriceRecord>)) };
}

function normalizeAttractionPrice(data: ApiRecord<AttractionPriceRecord>): AttractionPriceRecord {
  return {
    ...data,
    startDate: data.startDate ?? "",
    endDate: data.endDate ?? "",
    rackPrice: normalizeMoney(data.rackPrice),
    settlementPrice: normalizeMoney(data.settlementPrice),
  };
}

function normalizeAttraction(data: AttractionRecord): AttractionRecord {
  return { ...data, prices: (data.prices ?? []).map((price) => normalizeAttractionPrice(price as unknown as ApiRecord<AttractionPriceRecord>)) };
}

function normalizeTransport(data: ApiRecord<TransportRecord>): TransportRecord {
  return { ...data, dailyPrice: normalizeMoney(data.dailyPrice) };
}

function normalizeGuide(data: ApiRecord<GuideRecord>): GuideRecord {
  return { ...data, dailyPrice: normalizeMoney(data.dailyPrice), groundOperatorId: data.groundOperatorId ?? "" };
}

function contactInput(data: AgencyContactRecord) {
  return { id: data.id || undefined, name: data.name.trim(), phone: data.phone.trim(), version: data.version };
}

function restaurantPriceInput(data: RestaurantPriceRecord) {
  return {
    id: data.id || undefined, menuName: data.menuName.trim(), dishDetails: data.dishDetails?.trim() ?? "",
    unit: data.unit, price: data.price, dinerCount: data.dinerCount || null, remark: data.remark.trim(),
    version: data.version,
  };
}

function attractionPriceInput(data: AttractionPriceRecord) {
  return {
    id: data.id || undefined, itemType: data.itemType, itemName: data.itemName.trim(), audience: data.audience.trim(),
    periodName: data.periodName.trim(), startDate: data.startDate || null, endDate: data.endDate || null,
    rackPrice: data.rackPrice, settlementPrice: data.settlementPrice, unit: data.unit, isFree: data.isFree,
    priceNote: data.priceNote.trim(),
    version: data.version,
  };
}

const cityApi = createCrud<CityRecord>("cities", (data) => ({ code: data.code.trim(), name: data.name.trim(), province: data.province.trim(), status: data.status }));
const cities = reactive<CityRecord[]>([]);
const cityOptions = reactive<CityRecord[]>([]);
let cityOptionsRequest: Promise<CityRecord[]> | null = null;
const agencyApi = createCrud<AgencyRecord>("agencies", agencyInput, (data) => ({ ...data, contacts: data.contacts ?? [] }));
const supplierApi = createCrud<SupplierRecord>("suppliers", supplierInput);
const hotelApi = createCrud<HotelRecord>("hotels", hotelInput, normalizeHotel);
const restaurantApi = createCrud<RestaurantRecord>("restaurants", restaurantInput, normalizeRestaurant);
const attractionApi = createCrud<AttractionRecord>("attractions", attractionInput, normalizeAttraction);
const transportApi = createCrud<TransportRecord>("transports", transportInput, normalizeTransport);
const guideApi = createCrud<GuideRecord>("guides", guideInput, normalizeGuide);
const agencies = reactive<AgencyRecord[]>([]);
const suppliers = reactive<SupplierRecord[]>([]);
const hotels = reactive<HotelRecord[]>([]);
const restaurants = reactive<RestaurantRecord[]>([]);
const attractions = reactive<AttractionRecord[]>([]);
const transports = reactive<TransportRecord[]>([]);
const guides = reactive<GuideRecord[]>([]);
const supplierOptions = reactive<SupplierOptionRecord[]>([]);

async function fetchAll<T>(api: ResourceCrud<T>, query: ResourceListQuery = {}): Promise<T[]> {
  const firstPage = await api.getPage({ ...query, page: 1, pageSize: 100 });
  const records = [...firstPage.list];
  const pageCount = Math.ceil(firstPage.total / firstPage.pageSize);
  for (let page = 2; page <= pageCount; page += 1) {
    const result = await api.getPage({ ...query, page, pageSize: 100 });
    records.push(...result.list);
  }
  return records;
}

function replaceRecords<T>(target: T[], records: T[]): T[] {
  target.splice(0, target.length, ...records);
  return target;
}

const loadVersions = new WeakMap<object, number>();
const resourceTotals = new WeakMap<object, number>();

async function loadResourceRecords<T>(target: T[], api: ResourceCrud<T>, query: ResourceListQuery = {}): Promise<T[]> {
  const version = (loadVersions.get(target) ?? 0) + 1;
  loadVersions.set(target, version);
  const result = query.page === undefined ? null : await api.getPage({ ...query });
  const records = result ? result.list : await fetchAll(api, query);
  if (loadVersions.get(target) === version) {
    resourceTotals.set(target, result?.total ?? records.length);
    return replaceRecords(target, records);
  }
  return target;
}

export const resourceService = {
  getTotal(records: object) { return resourceTotals.get(records) ?? 0; },
  cities,
  cityOptions,
  cityApi,
  async loadCities(query: ResourceListQuery = {}) { return loadResourceRecords(cities, cityApi, query); },
  loadCityOptions(): Promise<CityRecord[]> {
    if (!cityOptionsRequest) cityOptionsRequest = request.get<CityRecord[]>(`${RESOURCE_BASE_URL}/cities/options`)
      .then((records) => replaceRecords(cityOptions, records)).finally(() => { cityOptionsRequest = null; });
    return cityOptionsRequest;
  },
  agencies,
  suppliers,
  transports,
  hotels,
  restaurants,
  attractions,
  guides,
  supplierOptions,
  agencyApi: {
    ...agencyApi,
    getContacts(agencyId: string) {
      return request.get<AgencyContactRecord[]>(`${RESOURCE_BASE_URL}/agencies/${encodeURIComponent(agencyId)}/contacts`);
    },
    createContact(agencyId: string, data: AgencyContactRecord) {
      return request.post<AgencyContactRecord>(`${RESOURCE_BASE_URL}/agencies/${encodeURIComponent(agencyId)}/contacts`, contactInput(data));
    },
    updateContact(agencyId: string, contactId: string, data: AgencyContactRecord) {
      return request.put<AgencyContactRecord>(`${RESOURCE_BASE_URL}/agencies/${encodeURIComponent(agencyId)}/contacts/${encodeURIComponent(contactId)}`, { ...contactInput(data), id: contactId });
    },
    async deleteContacts(agencyId: string, ids: string) {
      const baseUrl = `${RESOURCE_BASE_URL}/agencies/${encodeURIComponent(agencyId)}/contacts`;
      await request.delete<void>(baseUrl, { params: { ids } });
    },
  },
  supplierApi: {
    ...supplierApi,
    getOptions() {
      return request.get<SupplierOptionRecord[]>(`${RESOURCE_BASE_URL}/suppliers/options`);
    },
  },
  async loadSupplierOptions() {
    const options = await request.get<SupplierOptionRecord[]>(`${RESOURCE_BASE_URL}/suppliers/options`);
    supplierOptions.splice(0, supplierOptions.length, ...options);
    return options;
  },
  async loadAgencies(query: ResourceListQuery = {}) {
    return loadResourceRecords(agencies, agencyApi, query);
  },
  async loadAgencyContacts(agencyId: string) {
    const contacts = await this.agencyApi.getContacts(agencyId);
    const agency = agencies.find((item) => item.id === agencyId);
    if (agency) {
      agency.contacts = contacts;
      agency.contactCount = contacts.length;
    }
    return contacts;
  },
  async loadSuppliers(query: ResourceListQuery = {}) {
    return loadResourceRecords(suppliers, supplierApi, query);
  },
  async loadHotels(query: ResourceListQuery = {}) {
    await businessDictionaryService.ensureBuiltInTypesLoaded();
    return loadResourceRecords(hotels, hotelApi, query);
  },
  async loadRestaurants(query: ResourceListQuery = {}) {
    await businessDictionaryService.ensureBuiltInTypesLoaded();
    return loadResourceRecords(restaurants, restaurantApi, query);
  },
  async loadRestaurantPrices(restaurantId: string) {
    const prices = await this.restaurantApi.getPrices(restaurantId);
    const restaurant = restaurants.find((item) => item.id === restaurantId);
    if (restaurant) {
      restaurant.prices = prices;
      restaurant.priceCount = prices.length;
    }
    return prices;
  },
  async loadAttractions(query: ResourceListQuery = {}) {
    await businessDictionaryService.ensureBuiltInTypesLoaded();
    return loadResourceRecords(attractions, attractionApi, query);
  },
  async loadAttractionPrices(attractionId: string) {
    const prices = await this.attractionApi.getPrices(attractionId);
    const attraction = attractions.find((item) => item.id === attractionId);
    if (attraction) {
      attraction.prices = prices;
      attraction.priceCount = prices.length;
    }
    return prices;
  },
  async loadTransports(query: ResourceListQuery = {}) {
    await businessDictionaryService.ensureBuiltInTypesLoaded();
    return loadResourceRecords(transports, transportApi, query);
  },
  async loadGuides(query: ResourceListQuery = {}) {
    await businessDictionaryService.ensureBuiltInTypesLoaded();
    return loadResourceRecords(guides, guideApi, query);
  },
  async getSelectionOptions(kind: "hotels" | "transports" | "guides" | "agencies", query: ResourceQuery) {
    return request.get<PageResult<{ id: string; name: string; code?: string; unitCost?: string; breakfastIncluded?: boolean; seats?: number; city?: string }>>(
      `/resources/selections/${kind}`, { params: buildParams(query) }
    );
  },
  async getPriceOptions(type: "restaurant" | "attraction", query: ResourceListQuery) {
    const result = await request.get<PageResult<Omit<PriceSelectionItem, "unitCost"> & { unitCost: string }>>(
      `/resources/selections/${type}-prices`, { params: buildParams({ ...query }) }
    );
    return { ...result, list: result.list.map(item => ({ ...item, unitCost: Number(item.unitCost) })) };
  },
  async getPriceSelection(type: "restaurant" | "attraction", id: string) {
    const path = `/resources/selections/${type}-prices/${encodeURIComponent(id)}`;
    if (type === "restaurant") {
      const data = await request.get<{ resource: Omit<RestaurantRecord, "prices" | "priceCount">; price: ApiRecord<RestaurantPriceRecord> }>(path);
      return { restaurants: [normalizeRestaurant({ ...data.resource, priceCount: 1, prices: [normalizeRestaurantPrice(data.price)] })], attractions: [], hotels: [], transports: [], guides: [] };
    }
    const data = await request.get<{ resource: Omit<AttractionRecord, "prices" | "priceCount">; price: ApiRecord<AttractionPriceRecord> }>(path);
    return { attractions: [normalizeAttraction({ ...data.resource, priceCount: 1, prices: [normalizeAttractionPrice(data.price)] })], restaurants: [], hotels: [], transports: [], guides: [] };
  },
  hotelApi,
  restaurantApi: {
    ...restaurantApi,
    async getPrices(restaurantId: string) {
      const data = await request.get<ApiRecord<RestaurantPriceRecord>[]>(`${RESOURCE_BASE_URL}/restaurants/${encodeURIComponent(restaurantId)}/prices`);
      return data.map(normalizeRestaurantPrice);
    },
    createPrice(restaurantId: string, data: RestaurantPriceRecord) {
      return request.post<ApiRecord<RestaurantPriceRecord>>(
        `${RESOURCE_BASE_URL}/restaurants/${encodeURIComponent(restaurantId)}/prices`,
        restaurantPriceInput(data)
      ).then(normalizeRestaurantPrice);
    },
    updatePrice(restaurantId: string, priceId: string, data: RestaurantPriceRecord) {
      return request.put<ApiRecord<RestaurantPriceRecord>>(
        `${RESOURCE_BASE_URL}/restaurants/${encodeURIComponent(restaurantId)}/prices/${encodeURIComponent(priceId)}`,
        { ...restaurantPriceInput(data), id: priceId }
      ).then(normalizeRestaurantPrice);
    },
    async deletePrices(restaurantId: string, ids: string) {
      const baseUrl = `${RESOURCE_BASE_URL}/restaurants/${encodeURIComponent(restaurantId)}/prices`;
      await request.delete<void>(baseUrl, { params: { ids } });
    },
  },
  attractionApi: {
    ...attractionApi,
    async getPrices(attractionId: string) {
      const data = await request.get<ApiRecord<AttractionPriceRecord>[]>(`${RESOURCE_BASE_URL}/attractions/${encodeURIComponent(attractionId)}/prices`);
      return data.map(normalizeAttractionPrice);
    },
    createPrice(attractionId: string, data: AttractionPriceRecord) {
      return request.post<ApiRecord<AttractionPriceRecord>>(
        `${RESOURCE_BASE_URL}/attractions/${encodeURIComponent(attractionId)}/prices`,
        attractionPriceInput(data)
      ).then(normalizeAttractionPrice);
    },
    updatePrice(attractionId: string, priceId: string, data: AttractionPriceRecord) {
      return request.put<ApiRecord<AttractionPriceRecord>>(
        `${RESOURCE_BASE_URL}/attractions/${encodeURIComponent(attractionId)}/prices/${encodeURIComponent(priceId)}`,
        { ...attractionPriceInput(data), id: priceId }
      ).then(normalizeAttractionPrice);
    },
    async deletePrices(attractionId: string, ids: string) {
      const baseUrl = `${RESOURCE_BASE_URL}/attractions/${encodeURIComponent(attractionId)}/prices`;
      await request.delete<void>(baseUrl, { params: { ids } });
    },
  },
  transportApi,
  guideApi,
};

export type { ResourceCrud };

export interface PriceSelectionItem {
  id: string;
  resourceId: string;
  resourceName: string;
  priceName: string;
  city: string;
  unit: string;
  unitCost: number;
}
