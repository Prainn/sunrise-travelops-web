import { beforeEach, describe, expect, it, vi } from "vitest";
import { isReactive } from "vue";

const { requestMock } = vi.hoisted(() => ({ requestMock: vi.fn() }));

vi.mock("@/api/request", () => {
  function withParams(path: string, params?: Record<string, unknown>): string {
    if (!params) return path;
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        searchParams.append(key, String(value));
      }
    });
    const query = searchParams.toString();
    return query ? `${path}?${query}` : path;
  }

  return {
    request: {
      get: (path: string, options?: { params?: Record<string, unknown> }) =>
        requestMock(withParams(path, options?.params)),
      post: (path: string, body?: unknown) => requestMock(path, { method: "POST", body }),
      put: (path: string, body?: unknown) => requestMock(path, { method: "PUT", body }),
      patch: (path: string, body?: unknown) => requestMock(path, { method: "PATCH", body }),
      delete: (path: string, options?: { params?: Record<string, unknown> }) =>
        requestMock(withParams(path, options?.params), { method: "DELETE" }),
      getBlob: vi.fn(),
    },
  };
});

import type {
  AgencyRecord, AttractionRecord, GuideRecord, HotelRecord, RestaurantRecord,
  SupplierRecord, TransportRecord,
} from "@/types/resource";
import { resourceService, type ResourceCrud } from "./resource.service";
const audit = { version: 3, createdAt: "2026-09-04T00:00:00.000Z", createdBy: null, updatedAt: "2026-09-04T00:00:00.000Z", updatedBy: null };
const agency: AgencyRecord = { ...audit, id: "agency-1", code: "AGY-001", name: "Agency", city: "Singapore", countryOrRegion: "Singapore", email: "a@example.com", status: "enabled", remark: "", contacts: [] };
const supplier: SupplierRecord = { ...audit, id: "supplier-1", code: "SUP-001", name: "Supplier", city: "昆明", countryOrRegion: "中国", contact: "李经理", email: "", phone: "13800000000", status: "enabled", remark: "" };
const hotel: HotelRecord = { ...audit, id: "hotel-1", code: "HTL-001", name: "Hotel", province: "云南省", city: "昆明市", rating: "五星", facilities: "", breakfast: "", address: "", phone: "", nearby: "", basicRoomType: "标准间", individualPrice: 300, groupPrice: 260, minimumGroupSize: 10, unit: "roomNight", status: "enabled" };
const restaurant: RestaurantRecord = { ...audit, id: "restaurant-1", code: "RES-001", name: "Restaurant", city: "昆明", cuisine: "云南菜", contact: "", phone: "", address: "", remark: "", unit: "personMeal", status: "enabled", prices: [] };
const attraction: AttractionRecord = { ...audit, id: "attraction-1", code: "ATT-001", name: "Attraction", area: "昆明", category: "scenic", restroomLocation: "", remark: "", unit: "personVisit", status: "enabled", prices: [] };
const transport: TransportRecord = { ...audit, id: "transport-1", code: "VEH-001", name: "Vehicle", plateNumber: "云A00001", seats: 7, dailyPrice: 800, unit: "vehicleDay", city: "昆明", countryOrRegion: "", contact: "赵师傅", email: "", phone: "13800000000", status: "enabled", remark: "" };
const guide: GuideRecord = { ...audit, id: "guide-1", code: "GDE-001", certificateNo: "CERT", name: "Guide", gender: "female", age: 30, languages: ["中文"], employmentType: "full-time", identityNumber: "", phone: "", dailyPrice: 500, unit: "guideDay", hasLaborContract: true, isGroundOperatorProvided: false, groundOperatorId: "", licensePhotoUrl: "", remark: "", status: "enabled" };

const topResources: Array<[string, ResourceCrud<never>]> = [
  ["agencies", resourceService.agencyApi as unknown as ResourceCrud<never>],
  ["suppliers", resourceService.supplierApi as unknown as ResourceCrud<never>],
  ["hotels", resourceService.hotelApi as unknown as ResourceCrud<never>],
  ["restaurants", resourceService.restaurantApi as unknown as ResourceCrud<never>],
  ["attractions", resourceService.attractionApi as unknown as ResourceCrud<never>],
  ["transports", resourceService.transportApi as unknown as ResourceCrud<never>],
  ["guides", resourceService.guideApi as unknown as ResourceCrud<never>],
];

beforeEach(() => {
  requestMock.mockReset();
  resourceService.agencies.splice(0);
  resourceService.suppliers.splice(0);
  resourceService.hotels.splice(0);
  resourceService.restaurants.splice(0);
  resourceService.attractions.splice(0);
  resourceService.transports.splice(0);
  resourceService.guides.splice(0);
  resourceService.supplierOptions.splice(0);
  requestMock.mockImplementation(async (path, options) => {
    if (!options?.method && path.includes("?")) return { list: [], total: 0, page: 1, pageSize: 20 };
    if (!options?.method && (path.endsWith("/contacts") || path.endsWith("/prices") || path.endsWith("/options"))) return [];
    return options?.body ?? {};
  });
});

describe("resourceService", () => {
  it("starts every runtime resource collection without frontend mock records", () => {
    expect(isReactive(resourceService.suppliers)).toBe(true);
    expect(resourceService.agencies).toEqual([]);
    expect(resourceService.suppliers).toEqual([]);
    expect(resourceService.hotels).toEqual([]);
    expect(resourceService.restaurants).toEqual([]);
    expect(resourceService.attractions).toEqual([]);
    expect(resourceService.transports).toEqual([]);
    expect(resourceService.guides).toEqual([]);
  });

  it("loads top-level rows without eagerly requesting every child resource", async () => {
    requestMock.mockImplementation(async (path) => {
      if (path.startsWith("/resources/agencies?")) {
        return { list: [agency], total: 1, page: 1, pageSize: 100 };
      }
      if (path.startsWith("/resources/restaurants?")) {
        return { list: [restaurant], total: 1, page: 1, pageSize: 100 };
      }
      if (path.startsWith("/resources/attractions?")) {
        return { list: [attraction], total: 1, page: 1, pageSize: 100 };
      }
      return [];
    });

    await resourceService.loadAgencies();
    await resourceService.loadRestaurants();
    await resourceService.loadAttractions();

    expect(resourceService.agencies).toHaveLength(1);
    expect(resourceService.restaurants).toHaveLength(1);
    expect(resourceService.attractions).toHaveLength(1);
    expect(requestMock).not.toHaveBeenCalledWith(expect.stringMatching(/\/(contacts|prices)$/));
  });

  it("loads child resources only for the requested parent", async () => {
    resourceService.agencies.push(agency);
    resourceService.restaurants.push(restaurant);
    resourceService.attractions.push(attraction);
    requestMock.mockImplementation(async (path) => {
      if (path === `/resources/agencies/${agency.id}/contacts`) {
        return [{ id: "contact-1", name: "Emily", phone: "123" }];
      }
      if (path === `/resources/restaurants/${restaurant.id}/prices`) {
        return [{ id: "price-1", menuName: "套餐", price: "600.00", dinerCount: 10, groundOperatorId: null }];
      }
      if (path === `/resources/attractions/${attraction.id}/prices`) {
        return [{ id: "price-2", itemType: "ticket", itemName: "门票", rackPrice: "100.00", settlementPrice: "80.00", groundOperatorId: null }];
      }
      return [];
    });

    await resourceService.loadAgencyContacts(agency.id);
    await resourceService.loadRestaurantPrices(restaurant.id);
    await resourceService.loadAttractionPrices(attraction.id);

    expect(resourceService.agencies[0].contacts).toHaveLength(1);
    expect(resourceService.restaurants[0].prices[0].price).toBe(600);
    expect(resourceService.attractions[0].prices[0].settlementPrice).toBe(80);
    expect(requestMock).toHaveBeenCalledTimes(3);
  });

  it("uses every top-level list, detail, and batch-delete endpoint", async () => {
    for (const [name, api] of topResources) {
      await api.getPage({ page: 2, pageSize: 20, keywords: " 云南 " });
      await api.getDetail("resource/id");
      await api.deleteByIds("id-1,id-2");

      expect(requestMock).toHaveBeenCalledWith(`/resources/${name}?page=2&pageSize=20&keywords=%E4%BA%91%E5%8D%97`);
      expect(requestMock).toHaveBeenCalledWith(`/resources/${name}/resource%2Fid`);
      expect(requestMock).toHaveBeenCalledWith(`/resources/${name}?ids=id-1%2Cid-2`, { method: "DELETE" });
    }
  });

  it("uses all top-level create and versioned update endpoints", async () => {
    const cases = [
      ["agencies", resourceService.agencyApi, agency],
      ["suppliers", resourceService.supplierApi, supplier],
      ["hotels", resourceService.hotelApi, hotel],
      ["restaurants", resourceService.restaurantApi, restaurant],
      ["attractions", resourceService.attractionApi, attraction],
      ["transports", resourceService.transportApi, transport],
      ["guides", resourceService.guideApi, guide],
    ] as const;

    for (const [name, api, record] of cases) {
      await api.create(record as never);
      await api.update(record.id, record as never);
      expect(requestMock).toHaveBeenCalledWith(`/resources/${name}`, expect.objectContaining({ method: "POST" }));
      expect(requestMock).toHaveBeenCalledWith(`/resources/${name}/${record.id}`, {
        method: "PUT",
        body: expect.objectContaining({ id: record.id, version: 3 }),
      });
    }
  });

  it("uses contact, price, and supplier-option endpoints with backend null conventions", async () => {
    const contact = { ...audit, id: "contact-1", name: "Emily", phone: "123" };
    const restaurantPrice = { ...audit, id: "price-1", menuName: "套餐", dishDetails: "", unit: "table", price: 600, dinerCount: 0, remark: "", isGroundOperatorProvided: false, groundOperatorId: "" };
    const attractionPrice = { ...audit, id: "price-2", itemType: "ticket" as const, itemName: "门票", audience: "成人", periodName: "常规期", startDate: "", endDate: "", rackPrice: 100, settlementPrice: 80, unit: "personVisit", isFree: false, priceNote: "", isGroundOperatorProvided: false, groundOperatorId: "" };

    await resourceService.agencyApi.getContacts("agency-1");
    await resourceService.agencyApi.createContact("agency-1", { ...contact, id: "" });
    await resourceService.agencyApi.updateContact("agency-1", contact.id, contact);
    await resourceService.agencyApi.deleteContacts("agency-1", contact.id);
    await resourceService.restaurantApi.getPrices("restaurant-1");
    await resourceService.restaurantApi.createPrice("restaurant-1", { ...restaurantPrice, id: "" });
    await resourceService.restaurantApi.updatePrice("restaurant-1", restaurantPrice.id, restaurantPrice);
    await resourceService.restaurantApi.deletePrices("restaurant-1", restaurantPrice.id);
    await resourceService.attractionApi.getPrices("attraction-1");
    await resourceService.attractionApi.createPrice("attraction-1", { ...attractionPrice, id: "" });
    await resourceService.attractionApi.updatePrice("attraction-1", attractionPrice.id, attractionPrice);
    await resourceService.attractionApi.deletePrices("attraction-1", attractionPrice.id);
    await resourceService.supplierApi.getOptions();

    expect(requestMock).toHaveBeenCalledWith("/resources/agencies/agency-1/contacts/contact-1", expect.objectContaining({ method: "PUT", body: expect.objectContaining({ version: 3 }) }));
    expect(requestMock).toHaveBeenCalledWith("/resources/restaurants/restaurant-1/prices", expect.objectContaining({ method: "POST", body: expect.objectContaining({ dinerCount: null, groundOperatorId: null }) }));
    expect(requestMock).toHaveBeenCalledWith("/resources/attractions/attraction-1/prices", expect.objectContaining({ method: "POST", body: expect.objectContaining({ startDate: null, endDate: null, groundOperatorId: null }) }));
    expect(requestMock).toHaveBeenCalledWith("/resources/suppliers/options");
  });

  it("loads itinerary pricing resources and their child prices from APIs", async () => {
    const restaurantPrice = { id: "price-1", version: 1, menuName: "套餐", dishDetails: "", unit: "table", price: "600.00", dinerCount: 10, remark: "", isGroundOperatorProvided: false, groundOperatorId: null };
    const attractionPrice = { id: "price-2", version: 1, itemType: "ticket", itemName: "门票", audience: "成人", periodName: "常规期", startDate: null, endDate: null, rackPrice: "100.00", settlementPrice: "80.00", unit: "personVisit", isFree: false, priceNote: "", isGroundOperatorProvided: false, groundOperatorId: null };
    requestMock.mockImplementation(async (path) => {
      if (path === "/resources/suppliers/options") return [{ id: supplier.id, code: supplier.code, name: supplier.name }];
      if (path.startsWith("/resources/hotels?")) return { list: [{ ...hotel, individualPrice: "300.00", groupPrice: "260.00" }], total: 1, page: 1, pageSize: 100 };
      if (path.startsWith("/resources/restaurants?")) return { list: [{ ...restaurant, prices: undefined }], total: 1, page: 1, pageSize: 100 };
      if (path.startsWith("/resources/attractions?")) return { list: [{ ...attraction, prices: undefined }], total: 1, page: 1, pageSize: 100 };
      if (path.startsWith("/resources/transports?")) return { list: [{ ...transport, dailyPrice: "800.00" }], total: 1, page: 1, pageSize: 100 };
      if (path.startsWith("/resources/guides?")) return { list: [{ ...guide, dailyPrice: "500.00" }], total: 1, page: 1, pageSize: 100 };
      if (path === `/resources/restaurants/${restaurant.id}/prices`) return [restaurantPrice];
      if (path === `/resources/attractions/${attraction.id}/prices`) return [attractionPrice];
      return [];
    });

    const resources = await resourceService.loadPricingResources();

    expect(resources.hotels[0].individualPrice).toBe(300);
    expect(resources.restaurants[0].prices[0].price).toBe(600);
    expect(resources.attractions[0].prices[0].settlementPrice).toBe(80);
    expect(resources.transports[0].dailyPrice).toBe(800);
    expect(resources.guides[0].dailyPrice).toBe(500);
    expect(requestMock).toHaveBeenCalledWith(`/resources/restaurants/${restaurant.id}/prices`);
    expect(requestMock).toHaveBeenCalledWith(`/resources/attractions/${attraction.id}/prices`);
  });
});
