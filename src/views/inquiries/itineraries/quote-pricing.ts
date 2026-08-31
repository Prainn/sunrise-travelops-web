import type { ItineraryQuoteCalculation, ItineraryQuoteLine, ItineraryQuoteSettings, ItineraryRecord } from "@/types/itinerary";
import { DEFAULT_QUOTE_PROFIT_MARGIN_RATE } from "@/constants";
import { multiplyMoney, roundMoney, sumMoney } from "@/utils";

export const CHILD_RATE = 70;

export const DEFAULT_QUOTE_SETTINGS: ItineraryQuoteSettings = {
  adultUnitPrice: null,
};

export function createDefaultQuoteSettings(): ItineraryQuoteSettings {
  return { ...DEFAULT_QUOTE_SETTINGS };
}

export function calculateHotelRoomCount(itinerary: Pick<ItineraryRecord, "adults" | "childrenCount">) {
  const hotelGuestCount = itinerary.adults + itinerary.childrenCount;
  return Math.ceil(hotelGuestCount / 2);
}

export function calculateItineraryQuote(
  itinerary: Pick<ItineraryRecord, "adults" | "childrenCount" | "quote" | "dailyPlans">,
  totalCost: number
): ItineraryQuoteCalculation {
  const hotelGuestCount = itinerary.adults + itinerary.childrenCount;
  const singleSupplementUnitCost = calculateSingleSupplementUnitCost(itinerary);
  const baseGroupCost = roundMoney(totalCost);
  const adultEquivalentCount = itinerary.adults + itinerary.childrenCount * CHILD_RATE / 100;
  const baseCostPerPerson = adultEquivalentCount ? roundMoney(baseGroupCost / adultEquivalentCount) : 0;
  const suggestedAdultUnitPrice = calculateSuggestedAdultUnitPrice(totalCost, adultEquivalentCount);
  const adultUnitPrice = itinerary.quote.adultUnitPrice === null
    ? suggestedAdultUnitPrice
    : Math.max(roundMoney(itinerary.quote.adultUnitPrice), 0);
  const childUnitPrice = roundMoney(adultUnitPrice * CHILD_RATE / 100);
  const lines: ItineraryQuoteLine[] = [
    createQuoteLine("adult", itinerary.adults, adultUnitPrice),
    createQuoteLine("child", itinerary.childrenCount, childUnitPrice),
  ];
  const totalPrice = sumMoney(lines.map((line) => line.totalPrice));
  const profit = roundMoney(totalPrice - totalCost);

  return {
    hotelGuestCount,
    hotelRoomCount: calculateHotelRoomCount(itinerary),
    baseGroupCost,
    baseCostPerPerson,
    adultUnitPrice,
    childUnitPrice,
    singleSupplementUnitCost,
    totalPrice,
    profit,
    actualMarginRate: totalPrice ? profit / totalPrice * 100 : 0,
    lines,
  };
}

function calculateSuggestedAdultUnitPrice(
  totalCost: number,
  adultEquivalentCount: number
) {
  if (!adultEquivalentCount) return 0;
  const targetTotalPrice = totalCost / (1 - DEFAULT_QUOTE_PROFIT_MARGIN_RATE / 100);
  return Math.max(roundMoney(targetTotalPrice / adultEquivalentCount), 0);
}

export function calculateSingleSupplementUnitCost(
  itinerary: Pick<ItineraryRecord, "dailyPlans">
) {
  const hotelRoomNightCost = sumMoney(itinerary.dailyPlans
    .flatMap((day) => day.items)
    .filter((item) => item.type === "hotel")
    .map((item) => item.unitCost));
  return roundMoney(hotelRoomNightCost / 2);
}

function createQuoteLine(type: ItineraryQuoteLine["type"], quantity: number, unitPrice: number): ItineraryQuoteLine {
  return { type, quantity, unitPrice, totalPrice: multiplyMoney(unitPrice, quantity) };
}
