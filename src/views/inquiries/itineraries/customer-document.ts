import type {
  CustomerContent,
  CustomerExportLanguage,
  CustomerPresentation,
  ItineraryDayRecord,
  ItineraryQuoteOption,
  ItineraryQuoteSettings,
  ItineraryRecord,
} from "@/types/itinerary";
import { addDays, formatMoney } from "@/utils";
import { getTransportMethodNames } from "@/utils/transport-method";
import { getDayBreakfastStatus, isNoAccommodationItinerary } from "./hotel-plans";
import { getEnabledVehiclePlans } from "./vehicle-plans";

/** 客户文件固定文案按导出语言选择，与界面语言无关。 */
const CUSTOMER_TEXT = {
  zh: {
    htmlLang: "zh-CN",
    scheduleHeading: "一、行程安排",
    termsHeading: "二、团队标准",
    quoteHeading: "三、团队报价【人民币／人；机票、动车票及额外自费另付】",
    legacyQuoteHeading: "三、团队报价【团费不含任何段的机票、动车票、额外自费及司陪费】",
    notesHeading: "四、备注",
    included: "团费包含",
    excluded: "团费不含",
    paxTier: "人数档位",
    adult: "成人团费",
    child: "儿童团费",
    childRate: (rate: number) => `儿童团费（${rate}%）`,
    childWithBed: (rate: number) => `儿童占床（${rate}%）`,
    childWithoutBed: (rate: number) => `儿童不占床（${rate}%）`,
    singleSupplement: "单房差",
    otherExpenses: "司陪费及其他支出",
    wholeGroup: "（整团）",
    termHotel: "酒店",
    termMeals: "餐食",
    termTickets: "门票",
    termGuide: "导游",
    termTransport: "交通",
    hotelIncluded: "行程中所标注或同级酒店，双标间两人入住，含早餐。",
    hotelNone: "全程不含住宿。",
    mealsWithHotel: "行程中所列酒店提供早餐；包含标注的午餐 L、晚餐 D，未标注的正餐自理。",
    mealsHotelOnly: "行程中所列酒店提供早餐，团费不含正餐，请自理。",
    mealsNoHotel: "包含标注的午餐 L、晚餐 D，早餐及未标注的正餐自理。",
    mealsNone: "团费不含餐食，请自理。",
    tickets: "包含行程中所列门票及景区内区间费用。",
    guide: "行程安排的导游服务。",
    transport: "行程中所列巴士服务。",
    exclusions: ["任何段机票、机场税及燃油费、动车票；", "任何客人保险；"],
    flight: "机票",
    train: "动车票",
    cabins: { economy: "经济舱", business: "商务舱", first: "一等座", second: "二等座" },
    breakfastPending: "早餐待确认",
    vehicleLevel: { standard: "普通", vip: "VIP" },
    vehicle: (level: string) => `${level}用车`,
    coach: (seats: string, level: string) => `${seats}座${level}巴士`,
    hotelTiers: {
      3: "三钻",
      4: "四钻",
      5: "五钻",
      international_five_star: "国际五星",
      preferred_non_five_star: "携程优选",
    } as Record<string, string>,
    noAccommodation: "不含住宿",
  },
  en: {
    htmlLang: "en",
    scheduleHeading: "1. Itinerary",
    termsHeading: "2. Tour Standards",
    quoteHeading: "3. Tour Price [RMB per person; air tickets, train tickets and optional extras excluded]",
    legacyQuoteHeading:
      "3. Tour Price [Excludes air tickets, train tickets, optional extras and driver/guide fees for any sector]",
    notesHeading: "4. Remarks",
    included: "Included",
    excluded: "Excluded",
    paxTier: "Group Size",
    adult: "Adult",
    child: "Child",
    childRate: (rate: number) => `Child (${rate}%)`,
    childWithBed: (rate: number) => `Child with Bed (${rate}%)`,
    childWithoutBed: (rate: number) => `Child without Bed (${rate}%)`,
    singleSupplement: "Single Supplement",
    otherExpenses: "Driver/Guide Fees and Other Expenses",
    wholeGroup: " (whole group)",
    termHotel: "Hotel",
    termMeals: "Meals",
    termTickets: "Admission",
    termGuide: "Guide",
    termTransport: "Transport",
    hotelIncluded: "Hotels as listed or similar, twin-share rooms with breakfast.",
    hotelNone: "No accommodation is included.",
    mealsWithHotel:
      "Breakfast at the listed hotels; lunch (L) and dinner (D) as marked; other meals at own expense.",
    mealsHotelOnly: "Breakfast at the listed hotels; other meals are not included.",
    mealsNoHotel: "Lunch (L) and dinner (D) as marked; breakfast and other meals at own expense.",
    mealsNone: "Meals are not included.",
    tickets: "Admission tickets and in-park shuttles listed in the itinerary.",
    guide: "Guide service as arranged.",
    transport: "Coach service as listed in the itinerary.",
    exclusions: [
      "Air tickets, airport taxes, fuel surcharges and train tickets for any sector;",
      "Travel insurance;",
    ],
    flight: "Air Ticket",
    train: "Train Ticket",
    cabins: { economy: "Economy", business: "Business", first: "First Class", second: "Second Class" },
    breakfastPending: "Breakfast TBC",
    vehicleLevel: { standard: "Standard", vip: "VIP" },
    vehicle: (level: string) => `${level} Vehicle`,
    coach: (seats: string, level: string) => `${seats}-Seat ${level} Coach`,
    hotelTiers: {
      3: "3-Diamond",
      4: "4-Diamond",
      5: "5-Diamond",
      international_five_star: "International 5-Star",
      preferred_non_five_star: "Ctrip Preferred",
    } as Record<string, string>,
    noAccommodation: "No accommodation",
  },
};
export type CustomerText = (typeof CUSTOMER_TEXT)["zh"];

/** PDF 与 Word 共用的 pdf-data 片段；旧冻结和非盛旭响应没有 customerPresentation。 */
export interface CustomerSnapshot {
  customerPresentation?: CustomerPresentation | null;
  exportLanguage?: CustomerExportLanguage;
}

export interface CustomerScheduleRow {
  key: string;
  date: string;
  route: string;
  transport: string;
  description: string;
  hotel: string;
  meals: string;
}

export interface CustomerDocument {
  language: CustomerExportLanguage;
  text: CustomerText;
  title: string;
  schedule: CustomerScheduleRow[];
  termRows: Array<[string, string]>;
  extraFees: Array<[string, string]>;
  notes: string[];
  hotelTierLabel: (tier: ItineraryQuoteOption["hotelTier"] | string) => string;
  vehicleLabel: (tier: ItineraryQuoteOption["vehicleTier"]) => string;
}

/**
 * 组装客户 PDF/Word 的展示内容：盛旭新冻结使用服务端 customerPresentation 的所选语言版本，
 * 旧冻结及其他业务沿用行程原字段（中文）；金额始终取同一份 calculation，不按语言重算。
 */
export function buildCustomerDocument(
  itinerary: ItineraryRecord,
  snapshot: CustomerSnapshot = {},
): CustomerDocument {
  const language = snapshot.exportLanguage ?? "zh";
  const text = CUSTOMER_TEXT[language];
  const presentation = snapshot.customerPresentation ?? undefined;
  const content = presentation?.[language];
  const noAccommodation = presentation?.noAccommodation ?? isNoAccommodationItinerary(itinerary);
  return {
    language,
    text,
    title: content?.title ?? itinerary.title,
    schedule: content ? presentationSchedule(content, text) : itinerarySchedule(itinerary, text),
    termRows: termRows(itinerary, text, noAccommodation),
    extraFees: extraFeeLines(itinerary.quote, text, content),
    notes: content ? content.notes.filter((note) => note.trim()) : itineraryNotes(itinerary.quote),
    hotelTierLabel: (tier) =>
      tier === null ? text.noAccommodation : (text.hotelTiers[String(tier)] ?? String(tier)),
    vehicleLabel: (tier) => vehicleLabel(itinerary, tier, text),
  };
}

function presentationSchedule(content: CustomerContent, text: CustomerText): CustomerScheduleRow[] {
  const rows = content.days.map((day) => ({
    key: day.id,
    date: formatScheduleDate(day.date),
    route: day.route.join(" / ") || "-",
    transport: day.transport || "-",
    description: day.description.trim() || "-",
    hotel: day.overnightDestination || "-",
    meals: mealCodes(day.meals, day.meals.breakfast ? "included" : "excluded", text) || "-",
  }));
  if (content.returnArrival) rows.push(returnArrivalRow(content.returnArrival.date, content.returnArrival.text));
  return rows;
}

function itinerarySchedule(itinerary: ItineraryRecord, text: CustomerText): CustomerScheduleRow[] {
  const rows = itinerary.dailyPlans.map((day, index) => ({
    key: day.id,
    date: formatScheduleDate(day.date),
    route: formatScheduleRoute(day),
    transport: getTransportMethodNames(day.transport) || "-",
    description: day.description?.trim() || "-",
    hotel: day.overnightDestination || "-",
    meals: mealCodes(day.meals, getDayBreakfastStatus(itinerary, index), text) || "-",
  }));
  const last = itinerary.dailyPlans[itinerary.dailyPlans.length - 1];
  // 返程展示日只用于客户文件，日期为最后服务日次日，不进入 dailyPlans。
  if (itinerary.customerDisplayMode === "returnArrival" && last?.date)
    rows.push(returnArrivalRow(addDays(last.date, 1), itinerary.returnArrivalText));
  return rows;
}

function returnArrivalRow(date: string, description: string): CustomerScheduleRow {
  return {
    key: "return-arrival",
    date: formatScheduleDate(date),
    route: "-",
    transport: "-",
    description: description.trim() || "-",
    hotel: "-",
    meals: "-",
  };
}

export function formatScheduleDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return match ? `${match[3]}/${match[2]}` : value;
}

/** 出发 → 途经 → 到达，只压缩相邻相同城市，保留 A→B→A。 */
export function formatScheduleRoute(
  day: Pick<ItineraryDayRecord, "departure" | "destination"> & { viaDestinations?: string[] },
) {
  const route = [day.departure, ...(day.viaDestinations ?? []), day.destination]
    .map((city) => city?.trim() ?? "")
    .filter(Boolean)
    .filter((city, index, cities) => index === 0 || city !== cities[index - 1]);
  return route.join(" / ") || "-";
}

function mealCodes(
  meals: ItineraryDayRecord["meals"],
  breakfastStatus: "included" | "excluded" | "pending",
  text: CustomerText,
) {
  return [
    breakfastStatus === "pending" ? text.breakfastPending : breakfastStatus === "included" ? "B" : "",
    meals.lunch ? "L" : "",
    meals.dinner ? "D" : "",
  ]
    .filter(Boolean)
    .join(", ");
}

function termRows(
  itinerary: ItineraryRecord,
  text: CustomerText,
  noAccommodation: boolean,
): Array<[string, string]> {
  const hasMeals = itinerary.dailyPlans.some((day) => day.meals.lunch || day.meals.dinner);
  const meals = noAccommodation
    ? hasMeals
      ? text.mealsNoHotel
      : text.mealsNone
    : hasMeals
      ? text.mealsWithHotel
      : text.mealsHotelOnly;
  return [
    [text.termHotel, noAccommodation ? text.hotelNone : text.hotelIncluded],
    [text.termMeals, meals],
    [text.termTickets, text.tickets],
    ...(itinerary.guidePlans.length ? [[text.termGuide, text.guide] as [string, string]] : []),
    [text.termTransport, text.transport],
  ];
}

function extraFeeLines(
  quote: Pick<ItineraryQuoteSettings, "transportFees">,
  text: CustomerText,
  content: CustomerContent | undefined,
): Array<[string, string]> {
  return quote.transportFees.map((fee) => {
    const cities = content?.transportFees.find((record) => record.id === fee.id) ?? fee;
    return [
      fee.type === "flight" ? text.flight : text.train,
      `${cities.departureCity} → ${cities.arrivalCity} · ${text.cabins[fee.cabin]} · RMB ${formatMoney(fee.unitPrice)} PP`,
    ];
  });
}

function itineraryNotes(quote: ItineraryQuoteSettings) {
  return [quote.holidayRestrictions, quote.hotelReplacementTerms, quote.customerNotes].filter(
    (value) => value.trim(),
  );
}

function vehicleLabel(
  itinerary: Pick<ItineraryRecord, "vehiclePlans">,
  tier: ItineraryQuoteOption["vehicleTier"],
  text: CustomerText,
) {
  const plan = getEnabledVehiclePlans(itinerary).find((record) => record.tier === tier);
  const seats = [
    ...new Set(plan?.arrangements.flatMap((arrangement) => arrangement.vehicles.map((v) => v.seats)) ?? []),
  ];
  const level = text.vehicleLevel[tier === "vip" ? "vip" : "standard"];
  return seats.length ? text.coach(seats.join("/"), level) : text.vehicle(level);
}
