import { beforeEach, describe, expect, it, vi } from "vitest";

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
  AgencyRecord, AttractionRecord, RestaurantRecord,
} from "@/types/resource";
import { resourceService } from "./resource.service";
const audit = { version: 3, createdAt: "2026-09-04T00:00:00.000Z", createdBy: null, updatedAt: "2026-09-04T00:00:00.000Z", updatedBy: null };
const agency: AgencyRecord = { ...audit, id: "agency-1", code: "AGY-001", name: "Agency", city: "Singapore", countryOrRegion: "Singapore", email: "a@example.com", status: "enabled", remark: "", contacts: [] };
const restaurant: RestaurantRecord = { ...audit, id: "restaurant-1", code: "RES-001", name: "Restaurant", city: "昆明", cuisine: "云南菜", contact: "", phone: "", address: "", remark: "", unit: "personMeal", status: "enabled", prices: [] };
const attraction: AttractionRecord = { ...audit, id: "attraction-1", code: "ATT-001", name: "Attraction", area: "昆明", category: "scenic", restroomLocation: "", remark: "", unit: "personVisit", status: "enabled", prices: [] };

beforeEach(() => {
  requestMock.mockReset();
  resourceService.cities.splice(0);
  resourceService.cityOptions.splice(0);
  resourceService.agencies.splice(0);
  resourceService.hotels.splice(0);
  resourceService.restaurants.splice(0);
  resourceService.attractions.splice(0);
  resourceService.transports.splice(0);
  resourceService.guides.splice(0);
  requestMock.mockImplementation(async (path, options) => {
    if (!options?.method && path.includes("?")) return { list: [], total: 0, page: 1, pageSize: 20 };
    if (!options?.method && (path.endsWith("/contacts") || path.endsWith("/prices") || path.endsWith("/options"))) return [];
    return options?.body ?? {};
  });
});

describe("resourceService", () => {
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

  it.each([10, 20, 50])("requests only the selected city page with pageSize %i and keeps the API total", async (pageSize) => {
    const city = { id: "city-1", code: "CITY-001", name: "昆明", province: "云南省", status: "enabled" };
    requestMock.mockResolvedValue({ list: [city], total: 123, page: 2, pageSize });
    await resourceService.loadCities({ page: 2, pageSize, keyword: "昆明" });
    expect(requestMock).toHaveBeenCalledTimes(1);
    expect(requestMock).toHaveBeenCalledWith(`/resources/cities?page=2&pageSize=${pageSize}&keyword=${encodeURIComponent("昆明")}`);
    expect(resourceService.cities).toEqual([city]);
    expect(resourceService.getTotal(resourceService.cities)).toBe(123);
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
        return [{ id: "price-1", menuName: "套餐", price: "600.00", dinerCount: 10 }];
      }
      if (path === `/resources/attractions/${attraction.id}/prices`) {
        return [{ id: "price-2", itemType: "ticket", itemName: "门票", rackPrice: "100.00", settlementPrice: "80.00" }];
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

  it("sends resource-specific filters to the list endpoint", async () => {
    await resourceService.restaurantApi.getPage({
      page: 1,
      pageSize: 100,
      keyword: " 云南菜 ",
      city: " 昆明 ",
      unit: "personMeal",
    });

    expect(requestMock).toHaveBeenCalledWith(
      "/resources/restaurants?page=1&pageSize=100&keyword=%E4%BA%91%E5%8D%97%E8%8F%9C&city=%E6%98%86%E6%98%8E&unit=personMeal"
    );

    await resourceService.hotelApi.getPage({
      page: 1,
      pageSize: 20,
      rating: "international_five_star",
    });
    await resourceService.transportApi.getPage({
      page: 1,
      pageSize: 20,
      serviceLevel: "vip",
    });

    expect(requestMock).toHaveBeenCalledWith(
      "/resources/hotels?page=1&pageSize=20&rating=international_five_star"
    );
    expect(requestMock).toHaveBeenCalledWith(
      "/resources/transports?page=1&pageSize=20&serviceLevel=vip"
    );
  });

  it("uses contact and price endpoints with backend null conventions", async () => {
    const contact = { ...audit, id: "contact-1", name: "Emily", phone: "123" };
    const restaurantPrice = { ...audit, id: "price-1", menuName: "套餐", dishDetails: "", unit: "table", price: 600, dinerCount: 0, remark: "" };
    const attractionPrice = { ...audit, id: "price-2", itemType: "ticket" as const, itemName: "门票", audience: "成人", periodName: "常规期", startDate: "", endDate: "", rackPrice: 100, settlementPrice: 80, unit: "personVisit", isFree: false, priceNote: "" };

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
    expect(requestMock).toHaveBeenCalledWith("/resources/agencies/agency-1/contacts/contact-1", expect.objectContaining({ method: "PUT", body: expect.objectContaining({ version: 3 }) }));
    expect(requestMock).toHaveBeenCalledWith("/resources/restaurants/restaurant-1/prices", expect.objectContaining({ method: "POST", body: expect.objectContaining({ dinerCount: null }) }));
    expect(requestMock).toHaveBeenCalledWith("/resources/attractions/attraction-1/prices", expect.objectContaining({ method: "POST", body: expect.objectContaining({ startDate: null, endDate: null }) }));
  });

  it("loads only one page of price options and the selected detail", async () => {
    const price = { id: "price-1", version: 1, menuName: "套餐", dishDetails: "", unit: "table", price: "600.00", dinerCount: 10, remark: "" };
    requestMock.mockResolvedValueOnce({ list: [{ id: price.id, resourceId: restaurant.id, resourceName: restaurant.name, priceName: price.menuName, city: restaurant.city, unit: "table", unitCost: "600.00" }], total: 44, page: 1, pageSize: 10 });
    const result = await resourceService.getPriceOptions("restaurant", { page: 1, pageSize: 10 });
    expect(result.list[0].unitCost).toBe(600);
    expect(requestMock).toHaveBeenCalledTimes(1);
    expect(requestMock).toHaveBeenLastCalledWith("/resources/selections/restaurant-prices?page=1&pageSize=10");
    requestMock.mockResolvedValueOnce({ resource: restaurant, price });
    const selected = await resourceService.getPriceSelection("restaurant", price.id);
    expect(selected.restaurants[0].prices[0].price).toBe(600);
    expect(requestMock).toHaveBeenCalledTimes(2);
    expect(requestMock).toHaveBeenLastCalledWith("/resources/selections/restaurant-prices/price-1");
  });
});

describe("city options and hotel breakfast", () => {
  it("loads the shared city options once for concurrent consumers and refreshes on next load", async () => {
    const city = { id: "city-1", code: "CITY-001", name: "昆明", province: "云南省", status: "enabled" };
    requestMock.mockResolvedValue([city]);
    await Promise.all([resourceService.loadCityOptions(), resourceService.loadCityOptions()]);
    expect(requestMock).toHaveBeenCalledTimes(1);
    expect(requestMock).toHaveBeenCalledWith("/resources/cities/options");
    expect(resourceService.cityOptions[0]).toEqual(city);
    requestMock.mockResolvedValue([{ ...city, name: "大理" }]);
    await resourceService.loadCityOptions();
    expect(resourceService.cityOptions.map((record) => record.name)).toEqual(["大理"]);
  });
  it("keeps filtered city management rows separate from enabled city options", async () => {
    const enabled = { id: "city-1", code: "CITY-001", name: "昆明", province: "云南省", status: "enabled" as const };
    const disabled = { ...enabled, id: "city-2", code: "CITY-002", name: "大理", status: "disabled" as const };
    requestMock.mockImplementation(async (path) => path.endsWith("/options")
      ? [enabled]
      : { list: [disabled], total: 1, page: 1, pageSize: 100 });
    await resourceService.loadCities({ keyword: "大理" });
    await resourceService.loadCityOptions();
    expect(resourceService.cities).toEqual([disabled]);
    expect(resourceService.cityOptions).toEqual([enabled]);
    await resourceService.loadCities({ keyword: "大理" });
    expect(resourceService.cityOptions).toEqual([enabled]);
  });

});

it("reuses selector pages and refreshes them after a resource is deleted", async () => {
  requestMock.mockResolvedValue({ list: [{ id: "bus", name: "Bus", seats: 19 }], total: 1 });
  const query = { page: 1, pageSize: 20, serviceLevel: "standard" as const, keyword: " cache-test " };
  await resourceService.getSelectionOptions("transports", query);
  await resourceService.getSelectionOptions("transports", { ...query, keyword: "cache-test" });
  expect(requestMock).toHaveBeenCalledTimes(1);
  await resourceService.transportApi.deleteByIds("bus");
  await resourceService.getSelectionOptions("transports", query);
  expect(requestMock).toHaveBeenCalledTimes(3);
});
