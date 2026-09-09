import { describe, expect, it } from 'vitest';
import { itineraries } from '@/test-fixtures/inquiries';
import { calculateItineraryQuote, createDefaultQuoteOption, createDefaultQuoteSettings } from './quote-pricing';
function plan() {
  const p = structuredClone(itineraries[0]);
  p.adults = 19; p.childrenCount = 0; p.leaderCount = 1;
  p.dailyPlans = [{ ...p.dailyPlans[0], overnightDestination: '昆明', items: [] }];
  p.hotelPlans = [{ tier: 'international_five_star', hotels: [{ destination: '昆明', hotelId: 'h', hotelName: 'Hotel', rating: 'international_five_star', breakfast: '', unit: 'roomNight', unitCost: 100 }] }];
  p.vehiclePlans = [{ tier: 'standard', totalPrice: 0, arrangements: [] }];
  p.guidePlans = [];
  p.quote = { ...createDefaultQuoteSettings(), options: [{ ...createDefaultQuoteOption('international_five_star', 'standard'), adultUnitPrice: 1000 }] };
  return p;
}
describe('quote business rules', () => {
  it('charges eleven rooms for nineteen tourists and one separately housed leader, regardless of FOC', () => {
    const p = plan();
    for (const foc of [false, true]) {
      p.quote.options[0].leaderFocEnabled = foc;
      const q = calculateItineraryQuote(p, 0);
      expect(q.hotelRoomCount).toBe(11);
      expect(q.options[0]).toMatchObject({ hotelCost: 1100, totalPrice: 19000, profit: 17900, singleSupplementUnitCost: 50 });
    }
  });
  it('charges the supplier vehicle total once and guides at edited daily price times service days', () => {
    const p = plan();
    p.vehiclePlans[0].totalPrice = 8000;
    p.guidePlans = [{ destination: '昆明', guideId: 'g', guideName: '中文+英文 · 不进店', secondLanguage: 'en', shopping: false, dailyPrice: 450, serviceDays: 7 }];
    const q = calculateItineraryQuote(p, 1200);
    expect(q.guideCost).toBe(3150);
    expect(q.options[0]).toMatchObject({ vehicleCost: 8000, baseGroupCost: 13450 });
  });
  it('discloses included expenses without adding them again or changing per-person calculations', () => {
    const p = plan(); p.adults = 60;
    const before = calculateItineraryQuote(p, 0);
    p.quote.otherExpenses = 500;
    const after = calculateItineraryQuote(p, 0);
    expect(after).toEqual(before);
    expect(after.options[0].totalPrice).toBe(60000);
  });
  it('uses actual hotel prices for each city night and keeps child pricing at seventy percent', () => {
    const p = plan(); p.adults = 2; p.childrenCount = 1;
    p.dailyPlans.push({ ...p.dailyPlans[0], id: 'second', overnightDestination: '大理' });
    p.hotelPlans[0].hotels.push({ ...p.hotelPlans[0].hotels[0], destination: '大理', hotelId: 'h2', unitCost: 300 });
    expect(calculateItineraryQuote(p, 0).options[0]).toMatchObject({ hotelCost: 1200, singleSupplementUnitCost: 200, childUnitPrice: 700, totalPrice: 2700 });
  });
});
