import { describe, expect, it } from "vitest";
import type { PricingResources } from "./pricing";
import { getHotelUnitCost, getResourcePriceOptions } from "./pricing";

const ids = {
  hotel: "00000000-0000-4000-8000-000000000002",
  restaurant: "00000000-0000-4000-8000-000000000003",
  restaurantPrice: "00000000-0000-4000-8000-000000000004",
  attraction: "00000000-0000-4000-8000-000000000005",
  attractionPrice: "00000000-0000-4000-8000-000000000006",
  transport: "00000000-0000-4000-8000-000000000007",
  guide: "00000000-0000-4000-8000-000000000008",
};

function createResources(): PricingResources {
  return {
    hotels: [{
      id: ids.hotel, code: "HTL-001", name: "测试酒店", province: "云南省", city: "昆明", rating: "ctrip_preferred",
      facilities: "", breakfast: "", address: "", phone: "", nearby: "",
      individualPrice: 428, groupPrice: 200, minimumGroupSize: 10, unit: "roomNight", status: "enabled",
    }],
    restaurants: [{
      id: ids.restaurant, code: "RES-001", name: "测试餐厅", city: "昆明", cuisine: "云南菜", contact: "", phone: "",
      address: "", remark: "", unit: "table", status: "enabled", prices: [{
        id: ids.restaurantPrice, menuName: "团队餐", dishDetails: "", unit: "table", price: 600, dinerCount: 10,
        remark: "",
      }],
    }],
    attractions: [{
      id: ids.attraction, code: "ATT-001", name: "测试景点", area: "昆明", category: "scenic", restroomLocation: "",
      remark: "", unit: "personVisit", status: "enabled", prices: [{
        id: ids.attractionPrice, itemType: "ticket", itemName: "门票", audience: "成人", periodName: "常规期",
        startDate: "", endDate: "", rackPrice: 100, settlementPrice: 80, unit: "personVisit", isFree: false,
        priceNote: "",
      }],
    }],
    transports: [{
      id: ids.transport, code: "VEH-001", name: "测试车型", city: "昆明", serviceLevel: "standard",
      seats: 7, dailyPrice: 800, unit: "vehicleDay", phone: "", status: "enabled", remark: "",
    }],
    guides: [],
  };
}

describe("resource pricing", () => {
  it("uses the group price only when the guest count reaches the configured minimum", () => {
    const resources = createResources();
    const hotel = resources.hotels[0];

    expect(getHotelUnitCost(hotel, 9)).toBe(428);
    expect(getHotelUnitCost(hotel, 10)).toBe(200);
    expect(getResourcePriceOptions(resources, 10).find((option) => option.resourceId === hotel.id)?.unitCost).toBe(200);
  });

  it("falls back to the individual price when group pricing is incomplete", () => {
    const hotel = createResources().hotels[0];
    expect(getHotelUnitCost({ ...hotel, groupPrice: null }, 100)).toBe(428);
    expect(getHotelUnitCost({ ...hotel, minimumGroupSize: null }, 100)).toBe(428);
  });

  it("builds unified prices and excludes disabled API records", () => {
    const resources = createResources();
    resources.hotels.push({ ...resources.hotels[0], id: "00000000-0000-4000-8000-000000000009", status: "disabled" });
    const options = getResourcePriceOptions(resources);

    expect(options.some((option) => option.resourceId === "00000000-0000-4000-8000-000000000009")).toBe(false);
  });

});

it("defaults table meals to enough tables while leaving per-person quantities unchanged", () => {
  const table = { unit: "table", dinerCount: 10 } as ResourcePriceOption;
  expect(getDefaultResourceQuantity(table, 20)).toBe(2);
  expect(getDefaultResourceQuantity(table, 21)).toBe(3);
  expect(getDefaultResourceQuantity({ ...table, dinerCount: 0 }, 20)).toBe(1);
  expect(getDefaultResourceQuantity({ ...table, unit: "personMeal" }, 20)).toBe(20);
});
import type { ResourcePriceOption } from "./pricing";
import { getDefaultResourceQuantity } from "./pricing";
