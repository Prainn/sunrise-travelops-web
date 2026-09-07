import { describe, expect, it } from "vitest";
import type { PricingResources } from "./pricing";
import { calculateItem, getHotelUnitCost, getResourcePriceOptions, reconcileItineraryResourceReferences } from "./pricing";

const ids = {
  supplier: "00000000-0000-4000-8000-000000000001",
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
    suppliers: [{ id: ids.supplier, code: "SUP-001", name: "测试地接社" }],
    hotels: [{
      id: ids.hotel, code: "HTL-001", name: "测试酒店", province: "云南省", city: "昆明市", rating: "四星",
      facilities: "", breakfast: "", address: "", phone: "", nearby: "", basicRoomType: "标准间",
      individualPrice: 428, groupPrice: 200, minimumGroupSize: 10, unit: "roomNight", status: "enabled",
    }],
    restaurants: [{
      id: ids.restaurant, code: "RES-001", name: "测试餐厅", city: "昆明", cuisine: "云南菜", contact: "", phone: "",
      address: "", remark: "", unit: "table", status: "enabled", prices: [{
        id: ids.restaurantPrice, menuName: "团队餐", dishDetails: "", unit: "table", price: 600, dinerCount: 10,
        remark: "", isGroundOperatorProvided: true, groundOperatorId: ids.supplier,
      }],
    }],
    attractions: [{
      id: ids.attraction, code: "ATT-001", name: "测试景点", area: "昆明", category: "scenic", restroomLocation: "",
      remark: "", unit: "personVisit", status: "enabled", prices: [{
        id: ids.attractionPrice, itemType: "ticket", itemName: "门票", audience: "成人", periodName: "常规期",
        startDate: "", endDate: "", rackPrice: 100, settlementPrice: 80, unit: "personVisit", isFree: false,
        priceNote: "", isGroundOperatorProvided: false, groundOperatorId: "",
      }],
    }],
    transports: [{
      id: ids.transport, code: "VEH-001", name: "测试车辆", city: "昆明", countryOrRegion: "中国", plateNumber: "云A00001",
      serviceLevel: "standard", seats: 7, dailyPrice: 800, unit: "vehicleDay", contact: "赵师傅", email: "", phone: "", status: "enabled", remark: "",
    }],
    guides: [{
      id: ids.guide, code: "GDE-001", certificateNo: "CERT", name: "测试导游", gender: "female", age: 30,
      languages: ["中文"], employmentType: "full-time", identityNumber: "", phone: "", dailyPrice: 500,
      unit: "guideDay", hasLaborContract: true, groundOperatorId: ids.supplier,
      licensePhotoUrl: "", remark: "", status: "enabled",
    }],
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

  it("builds provider names and excludes disabled API records", () => {
    const resources = createResources();
    resources.hotels.push({ ...resources.hotels[0], id: "00000000-0000-4000-8000-000000000009", status: "disabled" });
    const options = getResourcePriceOptions(resources);

    expect(options.map((option) => option.providerName)).toContain("测试地接社");
    expect(options.some((option) => option.resourceId === "00000000-0000-4000-8000-000000000009")).toBe(false);
  });

  it("uses a manually entered vehicle fee instead of the reference resource cost", () => {
    const option = getResourcePriceOptions(createResources()).find((item) => item.type === "vehicle")!;
    const item = calculateItem(option, 2, 1250.5);

    expect(item.referenceUnitCost).toBe(800);
    expect(item.unitCost).toBe(1250.5);
    expect(item.totalCost).toBe(2501);
  });

  it("reconciles a unique legacy resource reference with API UUIDs", () => {
    const options = getResourcePriceOptions(createResources());
    const itineraries = [{
      id: "itinerary-1", inquiryId: "inquiry-1", code: "ITI-001", title: "Test", startDate: "2026-10-01",
      endDate: "2026-10-01", days: 1, adults: 2, childrenCount: 0, destinations: ["昆明市"],
      hotelPlans: [], vehiclePlans: [], operationsCoordinator: "", quote: {
        options: [{
          id: "quote-option-1", hotelTier: "preferred_non_five_star" as const, vehicleTier: "standard" as const,
          adultUnitPrice: null, leaderFocEnabled: false,
        }],
      },
      dailyPlans: [{
        id: "day-1", dayNumber: 1, date: "2026-10-01", departure: "", destination: "", overnightDestination: "",
        transport: "", items: [{
        id: "item-1", type: "hotel" as const, resourceId: "legacy-hotel", resourcePriceId: "legacy-price",
        resourceName: "测试酒店", priceName: "标准间", providerName: "直营报价", quantity: 1, unit: "roomNight",
        unitCost: 428, totalCost: 428, remark: "",
        }],
      }],
      status: "draft" as const, quoteGeneratedAt: "", creator: "", createdAt: "", updatedAt: "",
    }];

    expect(reconcileItineraryResourceReferences(itineraries, options)).toBe(0);
    expect(itineraries[0].dailyPlans[0].items[0]).toMatchObject({
      resourceId: ids.hotel,
      resourcePriceId: ids.hotel,
    });
  });
});
