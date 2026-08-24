import type { HotelPricePlanRecord } from "@/data/data";

export type RoomPriceRow = HotelPricePlanRecord & {
  roomId: string;
  pricePlanId: string;
  roomType: string;
  rackRate: number;
  effectivePeriod: string;
};
