import type { HotelPricePlanRecord } from "@/types/resource";

export type RoomPriceRow = HotelPricePlanRecord & {
  roomId: string;
  pricePlanId: string;
  roomType: string;
  rackRate: number;
  effectivePeriod: string;
};
