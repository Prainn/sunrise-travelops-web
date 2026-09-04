import type { ItineraryItemType, ItineraryPriceUnit, ItineraryRecord, ItineraryResourceItem } from "@/types/itinerary";
import type {
  AttractionRecord, GuideRecord, HotelRecord, RestaurantRecord, SupplierOptionRecord, TransportRecord,
} from "@/types/resource";
import { createId, multiplyMoney } from "@/utils";

export interface ResourcePriceOption {
  id: string;
  type: ItineraryItemType;
  resourceId: string;
  resourcePriceId: string;
  resourceName: string;
  priceName: string;
  providerName: string;
  city: string;
  unit: ItineraryPriceUnit;
  unitCost: number;
  details: ResourcePriceDetail[];
  searchText: string;
}

export interface ResourcePriceDetail {
  labelKey: string;
  value: string | number;
  format?: "money" | "translation" | "unit";
}

export interface PricingResources {
  suppliers: SupplierOptionRecord[];
  hotels: HotelRecord[];
  restaurants: RestaurantRecord[];
  attractions: AttractionRecord[];
  transports: TransportRecord[];
  guides: GuideRecord[];
}

const attractionCategoryLabelKeys = {
  scenic: "attraction.categoryScenic",
  performance: "attraction.categoryPerformance",
  experience: "attraction.categoryExperience",
  transport: "attraction.categoryTransport",
  package: "attraction.categoryPackage",
} as const;

const attractionItemTypeLabelKeys = {
  ticket: "attraction.itemTicket",
  transport: "attraction.itemTransport",
  guide: "attraction.itemGuide",
  activity: "attraction.itemActivity",
  package: "attraction.itemPackage",
} as const;

const DIRECT_PRICE_NAME = "直营报价";

export function getHotelUnitCost(
  hotel: Pick<HotelRecord, "individualPrice" | "groupPrice" | "minimumGroupSize">,
  guestCount: number
): number {
  const { groupPrice, minimumGroupSize } = hotel;
  const hasGroupPrice = groupPrice !== null && groupPrice > 0;
  const hasMinimumGroupSize = minimumGroupSize !== null && minimumGroupSize > 0;
  if (hasGroupPrice && hasMinimumGroupSize && guestCount >= minimumGroupSize) {
    return groupPrice;
  }
  return hotel.individualPrice;
}

export function getResourcePriceOptions(resources: PricingResources, guestCount = 0): ResourcePriceOption[] {
  const supplierNames = new Map(resources.suppliers.map((item) => [item.id, item.name]));
  function providerName(isGroundOperatorProvided: boolean, groundOperatorId: string) {
    return isGroundOperatorProvided
      ? supplierNames.get(groundOperatorId) ?? "地接社报价"
      : DIRECT_PRICE_NAME;
  }

  return [
    ...resources.hotels.filter((hotel) => hotel.status === "enabled").map((hotel) => ({
      id: `hotel:${hotel.id}`,
      type: "hotel" as const,
      resourceId: hotel.id,
      resourcePriceId: hotel.id,
      resourceName: hotel.name,
      priceName: hotel.basicRoomType,
      providerName: DIRECT_PRICE_NAME,
      city: hotel.city,
      unit: hotel.unit,
      unitCost: getHotelUnitCost(hotel, guestCount),
      details: [
        { labelKey: "resource.code", value: hotel.code },
        { labelKey: "resource.hotelName", value: hotel.name },
        { labelKey: "resource.city", value: `${hotel.province} / ${hotel.city}` },
        { labelKey: "resource.starRating", value: hotel.rating },
        { labelKey: "hotel.address", value: hotel.address },
        { labelKey: "resource.phone", value: hotel.phone },
        { labelKey: "hotel.facilities", value: hotel.facilities },
        { labelKey: "hotel.breakfast", value: hotel.breakfast },
        { labelKey: "hotel.nearby", value: hotel.nearby },
        { labelKey: "hotel.basicRoomType", value: hotel.basicRoomType },
        { labelKey: "hotel.individualPrice", value: hotel.individualPrice, format: "money" as const },
        {
          labelKey: "hotel.groupPrice",
          value: hotel.groupPrice ?? "",
          format: hotel.groupPrice === null ? undefined : "money" as const,
        },
        { labelKey: "hotel.minimumGroupSize", value: hotel.minimumGroupSize ?? "" },
        { labelKey: "itinerary.priceUnit", value: hotel.unit, format: "unit" as const },
      ],
      searchText: `${hotel.name} ${hotel.city} ${hotel.basicRoomType}`,
    })),
    ...resources.attractions.filter((attraction) => attraction.status === "enabled").flatMap((attraction) => attraction.prices.map((price) => ({
      id: `attraction:${price.id}`,
      type: "attraction" as const,
      resourceId: attraction.id,
      resourcePriceId: price.id,
      resourceName: attraction.name,
      priceName: `${price.itemName} · ${price.audience} · ${price.periodName}`,
      providerName: providerName(price.isGroundOperatorProvided, price.groundOperatorId),
      city: attraction.area,
      unit: price.unit,
      unitCost: price.settlementPrice,
      details: [
        { labelKey: "resource.code", value: attraction.code },
        { labelKey: "resource.attractionName", value: attraction.name },
        { labelKey: "attraction.area", value: attraction.area },
        { labelKey: "attraction.category", value: attractionCategoryLabelKeys[attraction.category], format: "translation" as const },
        { labelKey: "attraction.restroomLocation", value: attraction.restroomLocation },
        { labelKey: "itinerary.resourceRemark", value: attraction.remark },
        { labelKey: "attraction.itemType", value: attractionItemTypeLabelKeys[price.itemType], format: "translation" as const },
        { labelKey: "attraction.itemName", value: price.itemName },
        { labelKey: "attraction.audience", value: price.audience },
        { labelKey: "attraction.pricePeriod", value: price.periodName },
        { labelKey: "attraction.effectivePeriod", value: price.startDate && price.endDate ? `${price.startDate} — ${price.endDate}` : "" },
        { labelKey: "attraction.rackPrice", value: price.rackPrice, format: "money" as const },
        { labelKey: "attraction.settlementPrice", value: price.settlementPrice, format: "money" as const },
        { labelKey: "attraction.freeTicket", value: price.isFree ? "common.yes" : "common.no", format: "translation" as const },
        { labelKey: "attraction.priceNote", value: price.priceNote },
        { labelKey: "itinerary.priceUnit", value: price.unit, format: "unit" as const },
        { labelKey: "itinerary.provider", value: providerName(price.isGroundOperatorProvided, price.groundOperatorId) },
      ],
      searchText: `${attraction.name} ${attraction.area} ${price.itemName} ${price.audience}`,
    }))),
    ...resources.restaurants.filter((restaurant) => restaurant.status === "enabled").flatMap((restaurant) => restaurant.prices.map((price) => ({
      id: `restaurant:${price.id}`,
      type: "restaurant" as const,
      resourceId: restaurant.id,
      resourcePriceId: price.id,
      resourceName: restaurant.name,
      priceName: price.menuName,
      providerName: providerName(price.isGroundOperatorProvided, price.groundOperatorId),
      city: restaurant.city,
      unit: price.unit,
      unitCost: price.price,
      details: [
        { labelKey: "resource.code", value: restaurant.code },
        { labelKey: "resource.restaurantName", value: restaurant.name },
        { labelKey: "resource.city", value: restaurant.city },
        { labelKey: "resource.cuisine", value: restaurant.cuisine },
        { labelKey: "restaurant.address", value: restaurant.address },
        { labelKey: "resource.contact", value: restaurant.contact },
        { labelKey: "resource.phone", value: restaurant.phone },
        { labelKey: "itinerary.resourceRemark", value: restaurant.remark },
        { labelKey: "restaurant.menuName", value: price.menuName },
        { labelKey: "restaurant.dishDetails", value: price.dishDetails ?? "" },
        { labelKey: "restaurant.priceUnit", value: price.unit, format: "unit" as const },
        { labelKey: "restaurant.dinerCount", value: price.dinerCount },
        { labelKey: "restaurant.price", value: price.price, format: "money" as const },
        { labelKey: "itinerary.priceRemark", value: price.remark },
        { labelKey: "itinerary.provider", value: providerName(price.isGroundOperatorProvided, price.groundOperatorId) },
      ],
      searchText: `${restaurant.name} ${restaurant.city} ${restaurant.cuisine} ${price.menuName}`,
    }))),
    ...resources.transports.filter((resource) => resource.status === "enabled").map((resource) => ({
      id: `vehicle:${resource.id}`,
      type: "vehicle" as const,
      resourceId: resource.id,
      resourcePriceId: resource.id,
      resourceName: resource.name,
      priceName: "车辆日成本",
      providerName: DIRECT_PRICE_NAME,
      city: resource.city,
      unit: String(resource.unit),
      unitCost: Number(resource.dailyPrice ?? 0),
      details: [
        { labelKey: "resource.code", value: resource.code },
        { labelKey: "resource.vehicleModel", value: resource.name },
        { labelKey: "resource.city", value: resource.city },
        { labelKey: "resource.countryOrRegion", value: resource.countryOrRegion },
        { labelKey: "resource.plateNumber", value: resource.plateNumber ?? "" },
        { labelKey: "resource.seats", value: resource.seats ?? "" },
        { labelKey: "resource.dailyPrice", value: Number(resource.dailyPrice ?? 0), format: "money" as const },
        { labelKey: "resource.driver", value: resource.contact },
        { labelKey: "resource.phone", value: resource.phone },
        { labelKey: "resource.email", value: resource.email },
        { labelKey: "common.remark", value: resource.remark },
        { labelKey: "itinerary.priceUnit", value: String(resource.unit), format: "unit" as const },
        { labelKey: "itinerary.provider", value: DIRECT_PRICE_NAME },
      ],
      searchText: `${resource.name} ${resource.city} ${resource.plateNumber ?? ""}`,
    })),
    ...resources.guides.filter((guide) => guide.status === "enabled").map((guide) => ({
      id: `guide:${guide.id}`,
      type: "guide" as const,
      resourceId: guide.id,
      resourcePriceId: guide.id,
      resourceName: guide.name,
      priceName: `${guide.languages.join("/")} · 导游日成本`,
      providerName: providerName(guide.isGroundOperatorProvided, guide.groundOperatorId),
      city: "",
      unit: guide.unit,
      unitCost: Number(guide.dailyPrice ?? 0),
      details: [
        { labelKey: "resource.code", value: guide.code },
        { labelKey: "guide.certificateNo", value: guide.certificateNo },
        { labelKey: "resource.guideName", value: guide.name },
        { labelKey: "guide.gender", value: guide.gender === "male" ? "guide.male" : "guide.female", format: "translation" as const },
        { labelKey: "guide.age", value: guide.age },
        { labelKey: "guide.languages", value: guide.languages.join(" / ") },
        { labelKey: "guide.employmentType", value: guide.employmentType === "full-time" ? "guide.fullTime" : "guide.partTime", format: "translation" as const },
        { labelKey: "guide.identityNumber", value: guide.identityNumber },
        { labelKey: "resource.phone", value: guide.phone },
        { labelKey: "resource.dailyPrice", value: Number(guide.dailyPrice ?? 0), format: "money" as const },
        { labelKey: "guide.hasLaborContract", value: guide.hasLaborContract ? "common.yes" : "common.no", format: "translation" as const },
        { labelKey: "guide.licensePhoto", value: guide.licensePhotoUrl ? "common.yes" : "common.no", format: "translation" as const },
        { labelKey: "common.remark", value: guide.remark },
        { labelKey: "itinerary.priceUnit", value: guide.unit, format: "unit" as const },
        { labelKey: "itinerary.provider", value: providerName(guide.isGroundOperatorProvided, guide.groundOperatorId) },
      ],
      searchText: `${guide.name} ${guide.languages.join(" ")}`,
    })),
  ];
}

export function reconcileItineraryResourceReferences(
  itineraries: ItineraryRecord[],
  options: ResourcePriceOption[]
): number {
  let unresolvedCount = 0;
  itineraries.flatMap((itinerary) => itinerary.dailyPlans.flatMap((day) => day.items)).forEach((item) => {
    const exact = options.find((option) => (
      option.type === item.type
      && option.resourceId === item.resourceId
      && option.resourcePriceId === item.resourcePriceId
    ));
    if (exact) return;

    let matches = options.filter((option) => option.type === item.type && option.resourceName === item.resourceName);
    if (matches.length > 1) matches = matches.filter((option) => option.priceName === item.priceName);
    if (matches.length > 1) matches = matches.filter((option) => option.unitCost === item.unitCost);
    if (matches.length !== 1) {
      unresolvedCount += 1;
      return;
    }

    const match = matches[0];
    item.resourceId = match.resourceId;
    item.resourcePriceId = match.resourcePriceId;
    item.providerName = match.providerName;
    if (item.type === "vehicle") item.referenceUnitCost = match.unitCost;
  });
  return unresolvedCount;
}

export function calculateItem(
  option: ResourcePriceOption,
  quantity: number,
  unitCost = option.unitCost
): ItineraryResourceItem {
  return {
    id: createId("item"),
    type: option.type,
    resourceId: option.resourceId,
    resourcePriceId: option.resourcePriceId,
    resourceName: option.resourceName,
    priceName: option.priceName,
    providerName: option.providerName,
    quantity,
    unit: option.unit,
    referenceUnitCost: option.type === "vehicle" ? option.unitCost : undefined,
    unitCost,
    totalCost: multiplyMoney(unitCost, quantity),
    remark: "",
  };
}

export function recalculateItem(item: ItineraryResourceItem) {
  item.totalCost = multiplyMoney(item.unitCost, item.quantity);
}
