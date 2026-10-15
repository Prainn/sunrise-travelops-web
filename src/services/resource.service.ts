import { clearResourceOptionsCache, loadResourceOptions } from "./resource-options-cache";
import { reactive } from "vue";
import { parseMoney } from "@/utils/format";
import { request } from "@/api/request";
import { businessDictionaryService } from "@/services/business-dictionary.service";
import type { PageResult } from "@/types/common";
import type {
  AgencyContactRecord,
  AgencyRecord,
  AttractionRecord,
  CityRecord,
  FlightRecord,
  GuidePersonRecord,
  GuideRecord,
  HotelRecord,
  ResourceListQuery,
  RestaurantRecord,
  TransportRecord,
} from "@/types/resource";

type ResourceQuery = ResourceListQuery & Record<string, string | number | boolean | undefined>;

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
  price?: string | null;
}

type ApiRecord<T> = {
  [K in keyof T]: K extends keyof ApiMoneyFields ? ApiMoneyFields[K] : T[K];
};

const RESOURCE_BASE_URL = "/resources";

function buildParams(query: ResourceQuery): ResourceQuery {
  return Object.fromEntries(
    Object.entries(query).map(([key, value]) => {
      const normalizedValue = typeof value === "string" ? value.trim() : value;
      return [key, normalizedValue === "" ? undefined : normalizedValue];
    }),
  ) as ResourceQuery;
}

function createCrud<T extends { id: string; code?: string }>(
  resourceName: string,
  toInput: (data: T) => Record<string, unknown>,
  fromResponse: (data: ApiRecord<T>) => T = (data) => data as T,
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
      return request
        .post<ApiRecord<T>>(baseUrl, {
          ...toInput(data),
          ...(["guides", "guide-people", "flights"].includes(resourceName)
            ? {}
            : { code: data.code?.trim() || undefined }),
        })
        .then((result) => {
          clearResourceOptionsCache();
          return fromResponse(result);
        });
    },
    update(id, data) {
      return request
        .put<ApiRecord<T>>(`${baseUrl}/${encodeURIComponent(id)}`, {
          ...toInput(data),
          id,
          version: (data as T & { version?: number }).version,
        })
        .then((result) => {
          clearResourceOptionsCache();
          return fromResponse(result);
        });
    },
    async deleteByIds(ids) {
      await request.delete<void>(baseUrl, { params: { ids } });
      clearResourceOptionsCache();
    },
  };
}

function agencyInput(data: AgencyRecord) {
  return {
    parentId: data.parentId,
    businessUnit: data.businessUnit || undefined,
    coordinatorId: data.coordinatorId,
    id: data.id || undefined,
    code: data.code.trim(),
    name: data.shortName.trim(),
    city: data.city.trim(),
    countryItemId: data.countryItemId,
    email: data.email.trim(),
    status: data.status,
    remark: data.remark.trim(),
  };
}

function hotelInput(data: HotelRecord) {
  return {
    id: data.id || undefined,
    code: data.code.trim(),
    name: data.name.trim(),
    englishName: data.englishName.trim(),
    province: data.province.trim(),
    city: data.city.trim(),
    rating: data.rating,
    facilities: data.facilities.trim(),
    breakfast: data.breakfast.trim(),
    address: data.address.trim(),
    phone: data.phone.trim(),
    nearby: data.nearby.trim(),
    individualPrice: data.individualPrice,
    groupPrice: data.groupPrice,
    minimumGroupSize: data.minimumGroupSize,
    unit: data.unit,
    status: data.status,
  };
}

function restaurantInput(data: RestaurantRecord) {
  return {
    id: data.id || undefined,
    code: data.code.trim(),
    name: data.name.trim(),
    englishName: data.englishName.trim(),
    city: data.city.trim(),
    cuisine: data.cuisine.trim(),
    contact: data.contact.trim(),
    phone: data.phone.trim(),
    address: data.address.trim(),
    description: data.description.trim(),
    englishDescription: data.englishDescription.trim(),
    isStandardPrice: data.isStandardPrice,
    remark: data.remark.trim(),
    unit: data.unit,
    price: data.price,
    dinerCount: data.unit === "table" ? data.dinerCount : null,
    status: data.status,
  };
}

function attractionInput(data: AttractionRecord) {
  return {
    id: data.id || undefined,
    code: data.code.trim(),
    name: data.name.trim(),
    englishName: data.englishName.trim(),
    area: data.area.trim(),
    category: data.category || null,
    restroomLocation: data.restroomLocation.trim(),
    description: data.description.trim(),
    englishDescription: data.englishDescription.trim(),
    isStandardPrice: data.isStandardPrice,
    remark: data.remark.trim(),
    unit: data.unit,
    price: data.price,
    status: data.status,
  };
}

function transportInput(data: TransportRecord) {
  return {
    id: data.id || undefined,
    code: data.code.trim(),
    name: data.name.trim(),
    serviceLevel: data.serviceLevel,
    seats: data.seats,
    unit: data.unit,
    phone: data.phone.trim(),
    status: data.status,
    remark: data.remark.trim(),
  };
}

function guideInput(data: GuideRecord) {
  return {
    id: data.id || undefined,
    secondLanguage: data.secondLanguage,
    shopping: data.shopping,
    dailyPrice: data.dailyPrice,
    status: data.status,
  };
}

function guidePersonInput(data: GuidePersonRecord) {
  return {
    id: data.id || undefined,
    name: data.name.trim(),
    gender: data.gender,
    age: data.age,
    language: data.language === "" ? null : data.language,
    contact: data.contact === "" ? null : data.contact,
    employmentType: data.employmentType,
    hasLaborContract: data.hasLaborContract,
    remark: data.remark === "" ? null : data.remark,
    certificateNo: data.certificateNo === "" ? null : data.certificateNo,
    identityNumber: data.identityNumber === "" ? null : data.identityNumber,
    status: data.status,
  };
}

function normalizeHotel(data: ApiRecord<HotelRecord>): HotelRecord {
  return {
    ...data,
    individualPrice: parseMoney(data.individualPrice),
    groupPrice: parseMoney(data.groupPrice),
  };
}

function normalizeRestaurant(data: ApiRecord<RestaurantRecord>): RestaurantRecord {
  return { ...data, price: parseMoney(data.price) };
}

function normalizeAttraction(data: ApiRecord<AttractionRecord>): AttractionRecord {
  return { ...data, price: parseMoney(data.price) };
}

function normalizeTransport(data: ApiRecord<TransportRecord>): TransportRecord {
  return data;
}

function normalizeGuide(data: ApiRecord<GuideRecord>): GuideRecord {
  return { ...data, dailyPrice: parseMoney(data.dailyPrice) };
}

function contactInput(data: AgencyContactRecord) {
  return {
    id: data.id || undefined,
    name: data.name.trim(),
    phone: data.phone.trim(),
    version: data.version,
  };
}

const cityApi = createCrud<CityRecord>("cities", (data) => ({
  code: data.code.trim(),
  name: data.name.trim(),
  province: data.province.trim(),
  status: data.status,
}));
const cities = reactive<CityRecord[]>([]);
const cityOptions = reactive<CityRecord[]>([]);
let cityOptionsRequest: Promise<CityRecord[]> | null = null;
const agencyApi = createCrud<AgencyRecord>("agencies", agencyInput, (data) => ({
  ...data,
  contacts: data.contacts ?? [],
}));
const hotelApi = createCrud<HotelRecord>("hotels", hotelInput, normalizeHotel);
const restaurantApi = createCrud<RestaurantRecord>(
  "restaurants",
  restaurantInput,
  normalizeRestaurant,
);
const attractionApi = createCrud<AttractionRecord>(
  "attractions",
  attractionInput,
  normalizeAttraction,
);
const transportApi = createCrud<TransportRecord>("transports", transportInput, normalizeTransport);
const guideApi = createCrud<GuideRecord>("guides", guideInput, normalizeGuide);
const guidePersonApi = createCrud<GuidePersonRecord>("guide-people", guidePersonInput);
const flightApi = createCrud<FlightRecord>("flights", (data) => ({
  departureAirportId: data.departureAirportId,
  arrivalAirportId: data.arrivalAirportId,
  flightNumber: data.flightNumber.trim().toUpperCase(),
  departureTime: data.departureTime,
  arrivalTime: data.arrivalTime,
  status: data.status,
}));
const agencies = reactive<AgencyRecord[]>([]);
const hotels = reactive<HotelRecord[]>([]);
const restaurants = reactive<RestaurantRecord[]>([]);
const attractions = reactive<AttractionRecord[]>([]);
const transports = reactive<TransportRecord[]>([]);
const guides = reactive<GuideRecord[]>([]);
const guidePeople = reactive<GuidePersonRecord[]>([]);
const flights = reactive<FlightRecord[]>([]);

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

async function loadResourceRecords<T>(
  target: T[],
  api: ResourceCrud<T>,
  query: ResourceListQuery = {},
): Promise<T[]> {
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
  getTotal(records: object) {
    return resourceTotals.get(records) ?? 0;
  },
  cities,
  cityOptions,
  cityApi,
  async loadCities(query: ResourceListQuery = {}) {
    return loadResourceRecords(cities, cityApi, query);
  },
  loadCityOptions(): Promise<CityRecord[]> {
    if (!cityOptionsRequest)
      cityOptionsRequest = request
        .get<CityRecord[]>(`${RESOURCE_BASE_URL}/cities/options`)
        .then((records) => replaceRecords(cityOptions, records))
        .finally(() => {
          cityOptionsRequest = null;
        });
    return cityOptionsRequest;
  },
  agencies,
  transports,
  hotels,
  restaurants,
  attractions,
  guides,
  guidePeople,
  flights,
  flightApi,
  agencyApi: {
    ...agencyApi,
    getCoordinators(businessUnit: "shengxu" | "linxi" | "website") {
      return request.get<{ id: string; name: string; username: string }[]>(
        `${RESOURCE_BASE_URL}/agencies/coordinators`,
        { params: { businessUnit } },
      );
    },
    getContacts(agencyId: string) {
      return request.get<AgencyContactRecord[]>(
        `${RESOURCE_BASE_URL}/agencies/${encodeURIComponent(agencyId)}/contacts`,
      );
    },
    createContact(agencyId: string, data: AgencyContactRecord) {
      return request.post<AgencyContactRecord>(
        `${RESOURCE_BASE_URL}/agencies/${encodeURIComponent(agencyId)}/contacts`,
        contactInput(data),
      );
    },
    updateContact(agencyId: string, contactId: string, data: AgencyContactRecord) {
      return request.put<AgencyContactRecord>(
        `${RESOURCE_BASE_URL}/agencies/${encodeURIComponent(agencyId)}/contacts/${encodeURIComponent(contactId)}`,
        { ...contactInput(data), id: contactId },
      );
    },
    async deleteContacts(agencyId: string, ids: string) {
      const baseUrl = `${RESOURCE_BASE_URL}/agencies/${encodeURIComponent(agencyId)}/contacts`;
      await request.delete<void>(baseUrl, { params: { ids } });
      clearResourceOptionsCache();
    },
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
  async loadHotels(query: ResourceListQuery = {}) {
    await businessDictionaryService.ensureBuiltInTypesLoaded();
    return loadResourceRecords(hotels, hotelApi, query);
  },
  async loadRestaurants(query: ResourceListQuery = {}) {
    await businessDictionaryService.ensureBuiltInTypesLoaded();
    return loadResourceRecords(restaurants, restaurantApi, query);
  },
  async loadAttractions(query: ResourceListQuery = {}) {
    await businessDictionaryService.ensureBuiltInTypesLoaded();
    return loadResourceRecords(attractions, attractionApi, query);
  },
  async loadTransports(query: ResourceListQuery = {}) {
    await businessDictionaryService.ensureBuiltInTypesLoaded();
    return loadResourceRecords(transports, transportApi, query);
  },
  async loadGuides(query: ResourceListQuery = {}) {
    await businessDictionaryService.ensureBuiltInTypesLoaded();
    return loadResourceRecords(guides, guideApi, query);
  },
  async loadGuidePeople(query: ResourceListQuery = {}) {
    return loadResourceRecords(guidePeople, guidePersonApi, query);
  },
  async loadFlights(query: ResourceListQuery = {}) {
    return loadResourceRecords(flights, flightApi, query);
  },
  async getSelectionOptions(
    kind: "hotels" | "transports" | "guides" | "agencies",
    query: ResourceQuery,
  ) {
    const path = `/resources/selections/${kind}`;
    const params = buildParams(query);
    return loadResourceOptions(path, params, () =>
      request.get<
        PageResult<{
          id: string;
          name: string;
          code?: string;
          unitCost?: string;
          secondLanguage?: string;
          shopping?: boolean;
          seats?: number;
          city?: string;
        }>
      >(path, { params }),
    );
  },
  async getPriceOptions(type: "restaurant" | "attraction", query: ResourceListQuery) {
    const path = `/resources/selections/${type === "restaurant" ? "restaurants" : "attractions"}`;
    const params = buildParams({ ...query });
    const result = await loadResourceOptions(path, params, () =>
      request.get<PageResult<Omit<PriceSelectionItem, "unitCost"> & { unitCost: string }>>(path, {
        params,
      }),
    );
    return {
      ...result,
      list: result.list.map((item) => ({ ...item, unitCost: parseMoney(item.unitCost) })),
    };
  },
  async getPriceSelection(type: "restaurant" | "attraction", id: string) {
    const path = `/resources/selections/${type === "restaurant" ? "restaurants" : "attractions"}/${encodeURIComponent(id)}`;
    const empty = { hotels: [], transports: [], guides: [] };
    if (type === "restaurant") {
      const data = await request.get<ApiRecord<RestaurantRecord>>(path);
      return { ...empty, restaurants: [normalizeRestaurant(data)], attractions: [] };
    }
    const data = await request.get<ApiRecord<AttractionRecord>>(path);
    return { ...empty, attractions: [normalizeAttraction(data)], restaurants: [] };
  },
  hotelApi,
  restaurantApi,
  attractionApi,
  transportApi,
  guideApi,
  guidePersonApi,
};

export type { ResourceCrud };

export interface PriceSelectionItem {
  isStandardPrice: boolean;
  id: string;
  resourceId: string;
  resourceName: string;
  city: string;
  unit: string;
  unitCost: number | null;
  dinerCount: number | null;
}
