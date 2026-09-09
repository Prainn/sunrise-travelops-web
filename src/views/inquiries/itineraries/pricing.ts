import type { ItineraryItemType, ItineraryPriceUnit, ItineraryResourceItem } from "@/types/itinerary";
import type {
  AttractionRecord, GuideRecord, HotelRecord, RestaurantRecord, TransportRecord,
} from "@/types/resource";
import { createId, multiplyMoney } from "@/utils";

export interface ResourcePriceOption {
  id: string;
  type: ItineraryItemType;
  resourceId: string;
  resourcePriceId: string;
  resourceName: string;
  priceName: string;
  city: string;
  unit: ItineraryPriceUnit;
  unitCost: number;
  dinerCount?: number;
  details: ResourcePriceDetail[];
  searchText: string;
}

export interface ResourcePriceDetail {
  labelKey: string;
  value: string | number;
  format?: "money" | "translation" | "unit";
}

export interface PricingResources {
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
  return [
    ...resources.hotels.filter((hotel) => hotel.status === "enabled").map((hotel) => ({
      id: `hotel:${hotel.id}`,
      type: "hotel" as const,
      resourceId: hotel.id,
      resourcePriceId: hotel.id,
      resourceName: hotel.name,
      priceName: hotel.name,
      city: hotel.city,
      unit: hotel.unit,
      unitCost: getHotelUnitCost(hotel, guestCount),
      details: [
        { labelKey: "resource.code", value: hotel.code },
        { labelKey: "resource.hotelName", value: hotel.name },
        { labelKey: "resource.city", value: `${hotel.province} / ${hotel.city}` },
        { labelKey: "resource.starRating", value: `hotel.ratings.${hotel.rating}`, format: "translation" as const },
        { labelKey: "hotel.address", value: hotel.address },
        { labelKey: "resource.phone", value: hotel.phone },
        { labelKey: "hotel.facilities", value: hotel.facilities },
        { labelKey: "hotel.breakfastIncluded", value: "含早餐" },
        { labelKey: "hotel.breakfast", value: hotel.breakfast },
        { labelKey: "hotel.nearby", value: hotel.nearby },
        { labelKey: "hotel.individualPrice", value: hotel.individualPrice, format: "money" as const },
        {
          labelKey: "hotel.groupPrice",
          value: hotel.groupPrice ?? "",
          format: hotel.groupPrice === null ? undefined : "money" as const,
        },
        { labelKey: "hotel.minimumGroupSize", value: hotel.minimumGroupSize ?? "" },
        { labelKey: "itinerary.priceUnit", value: hotel.unit, format: "unit" as const },
      ],
      searchText: `${hotel.name} ${hotel.city}`,
    })),
    ...resources.attractions.filter((attraction) => attraction.status === "enabled").flatMap((attraction) => attraction.prices.map((price) => ({
      id: `attraction:${price.id}`,
      type: "attraction" as const,
      resourceId: attraction.id,
      resourcePriceId: price.id,
      resourceName: attraction.name,
      priceName: `${price.itemName} · ${price.audience} · ${price.periodName}`,
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
      city: restaurant.city,
      unit: price.unit,
      unitCost: price.price,
      dinerCount: price.dinerCount,
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
      ],
      searchText: `${restaurant.name} ${restaurant.city} ${restaurant.cuisine} ${price.menuName}`,
    }))),

  ];
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

export function getDefaultResourceQuantity(option: ResourcePriceOption | undefined, guestCount: number) {
  if (option?.unit === "table") return option.dinerCount && option.dinerCount > 0 ? Math.max(Math.ceil(guestCount / option.dinerCount), 1) : 1;
  return Math.max(guestCount, 1);
}
