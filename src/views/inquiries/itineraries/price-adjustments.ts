import type { ItineraryRecord, PriceReference } from '@/types/itinerary';
import { roundMoney, multiplyMoney } from '@/utils';
import { calculateVehiclePlanAutomaticTotal } from './vehicle-plans';
export function itineraryPriceRows(plan: ItineraryRecord) {
  const row = (key: string, name: string, fields: PriceReference, get: () => number | null, set: (price: number) => void, custom = false, source = "") => ({key,name,fields,get,set,custom,source});
  return [
    ...plan.dailyPlans.flatMap(d => d.items.map(i => row(`item:${i.id}`,`D${d.dayNumber} · ${i.resourceName}`,i,()=>i.unitCost,v=>{i.unitCost=v;i.totalCost=multiplyMoney(v,i.quantity);},i.resourceId===null,`${i.resourceId}:${i.resourcePriceId}`))),
    ...plan.hotelPlans.flatMap(p=>p.hotels.map(h=>row(`hotel:${p.tier}:${h.destination}`,h.hotelName,h,()=>h.unitCost,v=>{h.unitCost=v;},false,h.hotelId))),
    ...plan.guidePlans.map(g=>row(`guide:${g.destination}`,g.guideName,g,()=>g.dailyPrice,v=>{g.dailyPrice=v;},false,g.guideId)),
  ];
}
export function missingPriceReasons(plan: ItineraryRecord, previous?: ItineraryRecord): string[] {
  const old = new Map(previous ? itineraryPriceRows(previous).map(r=>[r.key,r]) : []);
  const missing: string[]=[];
  for (const item of itineraryPriceRows(plan)) {
    const saved=old.get(item.key); const before=saved?.source===item.source ? saved : undefined; const actual=item.get(); const ref=item.fields.referencePrice;
    if (actual == null || (before && roundMoney(before.get() ?? 0) === roundMoney(actual))) continue;
    if (ref != null && roundMoney(ref)===roundMoney(actual)) continue;
    if (!before && item.custom) continue;
    if (!item.fields.adjustmentReason?.trim()) missing.push(item.name);
  }
  for (const vehicle of plan.vehiclePlans) {
    const before=previous?.vehiclePlans.find(v=>v.tier===vehicle.tier);
    const total=calculateVehiclePlanAutomaticTotal(vehicle);
    if (vehicle.totalPrice==null || vehicle.pricingMode==='automatic' || (total!=null && roundMoney(total)===roundMoney(vehicle.totalPrice))) continue;
    if (before?.totalPrice===vehicle.totalPrice && before.pricingMode===vehicle.pricingMode && calculateVehiclePlanAutomaticTotal(before)===total) continue;
    if (!vehicle.adjustmentReason?.trim()) missing.push(vehicle.tier);
  }
  return missing;
}
