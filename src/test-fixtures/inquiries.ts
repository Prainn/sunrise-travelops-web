import { createDefaultQuoteSettings } from "@/views/inquiries/itineraries/quote-pricing";
import type { ItineraryRecord } from "@/types/itinerary";
import type { InquiryRecord } from "@/types/inquiry";

export const inquiries: InquiryRecord[] = [
  {
    version: 1, ownerId: "user-2", contactId: "contact-1", id: "inquiry-1", code: "INQ-202608-001", agencyId: "", agencyCode: "AGY-001", agencyName: "新加坡远景旅行社",
    contactName: "Emily Tan", email: "emily@example.com", phone: "+65 6123 4567", countryOrRegion: "新加坡",
    sourceChannel: "WhatsApp", originalMessage: "10 人计划 10 月到云南旅行 7 天，希望安排昆明、大理和丽江。",
    internalRemark: "报价 PDF 已发送，等待旅行社确认。", owner: "王敏", nextFollowUpAt: "2026-09-01 11:00", plannedDays: 7,
    lostReason: "", status: "quoted", creator: "admin", createdAt: "2026-08-21 09:30",
  },
];

const completeItineraryTemplate: ItineraryRecord = {
    version: 1,
    id: "itinerary-4",
    inquiryId: "inquiry-11",
    code: "ITI-202608-004",
    title: "昆明大理丽江经典 7 日亲友团",
    startDate: "2026-10-19",
    endDate: "2026-10-25",
    days: 7,
    adults: 10,
    childrenCount: 0, leaderCount: 0,
    destinations: ["昆明", "大理", "丽江"],
    hotelPlans: [
      { tier: "international_five_star", hotels: [] },
      { tier: "preferred_non_five_star", hotels: [] },
    ],
    guidePlans: [],
    vehiclePlans: [
      { tier: "standard", arrangements: [], totalPrice: null },
      { tier: "vip", arrangements: [], totalPrice: null },
    ],

    quote: createDefaultQuoteSettings(),
    dailyPlans: [
      {
        id: "itinerary-4-day-1",
        dayNumber: 1,
        date: "2026-10-19",
        departure: "中国香港",
        destination: "昆明",
        meals: { breakfast: false, lunch: false, dinner: false },
        overnightDestination: "昆明",
        transport: "flight,coach",
        description: "团队乘航班抵达昆明长水机场，导游在到达层举牌迎接并协助清点行李。乘旅游车前往市区酒店办理入住，途中介绍云南气候、时差与后续行程。傍晚安排云南特色欢迎宴，餐后返回酒店休息；如航班延误则取消自由活动并保留晚餐。",
        items: [
          { id: "itinerary-4-day-1-dinner", type: "restaurant", mealSlot: "dinner", resourceId: "", resourcePriceId: "", resourceName: "云南人家", priceName: "昆明特色风味宴", quantity: 1, unit: "table", unitCost: 500, totalCost: 500, remark: "十人桌欢迎宴，安排清淡菜" },
        ],
      },
      {
        id: "itinerary-4-day-2",
        dayNumber: 2,
        date: "2026-10-20",
        departure: "昆明",
        destination: "大理",
        meals: { breakfast: true, lunch: false, dinner: false },
        overnightDestination: "大理",
        transport: "highSpeedRail,coach",
        description: "早餐后退房，乘车前往昆明动车站，导游协助进站并安排大件行李。抵达大理后由旅游车接站，午餐后游览崇圣寺三塔文化旅游区，乘电瓶车减少步行距离，参观三塔倒影公园和崇圣寺主要建筑。傍晚入住洱海边酒店，晚餐后可在酒店湖景露台自由活动。",
        items: [
          { id: "itinerary-4-day-2-ticket", type: "attraction", resourceId: "", resourcePriceId: "", resourceName: "崇圣寺三塔", priceName: "景区门票 · 成人 · 常规期", quantity: 10, unit: "personVisit", unitCost: 60, totalCost: 600, remark: "成人团队票" },
          { id: "itinerary-4-day-2-cart", type: "attraction", resourceId: "", resourcePriceId: "", resourceName: "崇圣寺三塔", priceName: "电瓶车 · 成人 · 常规期", quantity: 10, unit: "personVisit", unitCost: 20, totalCost: 200, remark: "往返电瓶车，减少步行" },
          { id: "itinerary-4-day-2-dinner", type: "restaurant", mealSlot: "dinner", resourceId: "", resourcePriceId: "", resourceName: "大理六合云燕酒店", priceName: "中式合菜/清新养生宴", quantity: 1, unit: "table", unitCost: 500, totalCost: 500, remark: "十人桌，少辣" },
        ],
      },
      {
        id: "itinerary-4-day-3",
        dayNumber: 3,
        date: "2026-10-21",
        departure: "大理",
        destination: "大理",
        meals: { breakfast: true, lunch: false, dinner: false },
        overnightDestination: "大理",
        transport: "coach,walking",
        description: "早餐后前往苍山洗马潭索道，视天气和景区运营情况乘索道登山，在高山观景平台停留并控制活动强度。下山后享用白族风味午餐，下午前往喜洲古镇参观传统白族民居和稻田景观，再到洱海生态廊道轻松散步、拍摄日落。晚餐后返回酒店休息。",
        items: [
          { id: "itinerary-4-day-3-cableway", type: "attraction", resourceId: "", resourcePriceId: "", resourceName: "洗马潭索道", priceName: "洗马潭索道 · 成人 · 旺季", quantity: 10, unit: "personVisit", unitCost: 320, totalCost: 3200, remark: "根据天气及景区通知调整，无法运营时更换低海拔项目" },
          { id: "itinerary-4-day-3-lunch", type: "restaurant", mealSlot: "lunch", resourceId: "", resourcePriceId: "", resourceName: "四方宏源", priceName: "白族砂锅鱼风味", quantity: 1, unit: "table", unitCost: 500, totalCost: 500, remark: "十人桌，提前确认鱼类做法" },
        ],
      },
      {
        id: "itinerary-4-day-4",
        dayNumber: 4,
        date: "2026-10-22",
        departure: "大理",
        destination: "丽江",
        meals: { breakfast: true, lunch: false, dinner: false },
        overnightDestination: "丽江",
        transport: "coach,walking",
        description: "早餐后退房，经大丽高速前往丽江，途中在服务区休息一次。抵达后享用午餐并办理酒店入住，下午游览束河古镇，沿青龙桥、四方听音广场和古巷水系慢行，安排咖啡休息时间。傍晚前往丽江古城外围用餐，餐后客人可选择自行游览古城或乘车返回酒店。",
        items: [
          { id: "itinerary-4-day-4-dinner", type: "restaurant", mealSlot: "dinner", resourceId: "", resourcePriceId: "", resourceName: "丽江小南国", priceName: "精品合菜", quantity: 1, unit: "table", unitCost: 700, totalCost: 700, remark: "十人桌，包含纳西风味菜" },
        ],
      },
      {
        id: "itinerary-4-day-5",
        dayNumber: 5,
        date: "2026-10-23",
        departure: "丽江",
        destination: "丽江",
        meals: { breakfast: true, lunch: false, dinner: false },
        overnightDestination: "丽江",
        transport: "coach,walking",
        description: "早餐后按预约时段前往玉龙雪山，途中领取防寒服和氧气瓶。进入景区后乘景区车及冰川公园大索道，视身体情况在观景栈道分段活动；下山后前往蓝月谷游览。午餐采用景区简餐，下午返回市区休息，晚餐安排纳西精品合菜。高海拔项目以安全为先，如索道停运则改为云杉坪及白沙古镇。",
        items: [
          { id: "itinerary-4-day-5-entrance", type: "attraction", resourceId: "", resourcePriceId: "", resourceName: "玉龙雪山景区", priceName: "进山费及景区车 · 成人 · 常规期", quantity: 10, unit: "personVisit", unitCost: 130, totalCost: 1300, remark: "含进山费及景区车，不含索道" },
          { id: "itinerary-4-day-5-cableway", type: "attraction", resourceId: "", resourcePriceId: "", resourceName: "玉龙雪山景区", priceName: "冰川公园大索道 · 成人 · 常规期", quantity: 10, unit: "personVisit", unitCost: 135, totalCost: 1350, remark: "实名预约，以景区最终放票为准" },
          { id: "itinerary-4-day-5-dinner", type: "restaurant", mealSlot: "dinner", resourceId: "", resourcePriceId: "", resourceName: "丽江云雪丽餐厅", priceName: "纳西精品合菜", quantity: 1, unit: "table", unitCost: 880, totalCost: 880, remark: "十人桌，含特色腊排骨" },
        ],
      },
      {
        id: "itinerary-4-day-6",
        dayNumber: 6,
        date: "2026-10-24",
        departure: "丽江",
        destination: "昆明",
        meals: { breakfast: true, lunch: false, dinner: false },
        overnightDestination: "昆明",
        transport: "highSpeedRail,coach",
        description: "早餐后退房，根据动车班次前往丽江站。抵达昆明后由旅游车接站，午餐安排过桥米线和汽锅鸡，随后入住酒店休息。下午视到达时间游览翠湖公园、云南陆军讲武堂外景和钱王街，晚间自由活动，导游提供周边餐饮和购物建议。",
        items: [
          { id: "itinerary-4-day-6-lunch", type: "restaurant", mealSlot: "lunch", resourceId: "", resourcePriceId: "", resourceName: "昆明万兴建新园", priceName: "过桥米线（汽锅鸡）+野生菌火锅", quantity: 10, unit: "personMeal", unitCost: 60, totalCost: 600, remark: "抵达昆明后的午餐，每人一份" },
        ],
      },
      {
        id: "itinerary-4-day-7",
        dayNumber: 7,
        date: "2026-10-25",
        departure: "昆明",
        destination: "中国香港",
        meals: { breakfast: true, lunch: false, dinner: false },
        overnightDestination: "",
        transport: "coach,flight",
        description: "早餐后退房并寄存行李，前往云南民族村参观代表性少数民族村寨、建筑和民俗展示，乘园区观光火车减少步行。午餐安排云南特色风味宴，随后根据航班时间返回酒店取行李并前往昆明长水机场。导游协助办理登机手续，确认全员进入安检后结束服务。",
        items: [
          { id: "itinerary-4-day-7-ticket", type: "attraction", resourceId: "", resourcePriceId: "", resourceName: "云南民族村", priceName: "景区门票 · 成人 · 常规期", quantity: 10, unit: "personVisit", unitCost: 60, totalCost: 600, remark: "成人团队票" },
          { id: "itinerary-4-day-7-train", type: "attraction", resourceId: "", resourcePriceId: "", resourceName: "云南民族村", priceName: "观光火车 · 通用 · 常规期", quantity: 10, unit: "personVisit", unitCost: 30, totalCost: 300, remark: "园区观光火车" },
          { id: "itinerary-4-day-7-lunch", type: "restaurant", mealSlot: "lunch", resourceId: "", resourcePriceId: "", resourceName: "云南人家", priceName: "九歌寨风味宴", quantity: 1, unit: "table", unitCost: 650, totalCost: 650, remark: "离境前午餐，十人桌" },
        ],
      },
    ],
    status: "draft",
    quoteGeneratedAt: "",
    creator: "operations_zhaolei",
    createdAt: "2026-08-30 10:40",
    updatedAt: "2026-08-31 09:15",
  };

interface CompleteItineraryVariant {
  id: string;
  inquiryId: string;
  code: string;
  title: string;
  origin: string;
  status: ItineraryRecord["status"];
  quoteGeneratedAt: string;
  creator: string;
  createdAt: string;
  updatedAt: string;
}

function createCompleteItineraryVariant(options: CompleteItineraryVariant): ItineraryRecord {
  return {
    ...completeItineraryTemplate,
    id: options.id,
    version: 1, inquiryId: options.inquiryId,
    code: options.code,
    title: options.title,
    status: options.status,
    quoteGeneratedAt: options.quoteGeneratedAt,
    quote: createDefaultQuoteSettings(),
    destinations: [...completeItineraryTemplate.destinations],
    hotelPlans: completeItineraryTemplate.hotelPlans.map((plan) => ({ ...plan, hotels: [] })),
    guidePlans: [],
    vehiclePlans: completeItineraryTemplate.vehiclePlans.map((plan) => ({
      ...plan,
      arrangements: plan.arrangements.map(a => ({ ...a, vehicles: a.vehicles.map(v => ({ ...v })) })),
    })),
    creator: options.creator,
    createdAt: options.createdAt,
    updatedAt: options.updatedAt,
    dailyPlans: completeItineraryTemplate.dailyPlans.map((day) => ({
      ...day,
      meals: { ...day.meals, lunch: day.items.some((item) => item.mealSlot === "lunch"), dinner: day.items.some((item) => item.mealSlot === "dinner") },
      id: `${options.id}-day-${day.dayNumber}`,
      departure: day.dayNumber === 1 ? options.origin : day.departure,
      destination: day.dayNumber === completeItineraryTemplate.days ? options.origin : day.destination,
      items: day.items.map((item, index) => ({
        ...item,
        id: `${options.id}-day-${day.dayNumber}-item-${index + 1}`,
      })),
    })),
  };
}

export const itineraries: ItineraryRecord[] = [
  createCompleteItineraryVariant({
    id: "itinerary-planning",
    inquiryId: "inquiry-11",
    code: "ITI-202608-011",
    title: "昆明大理丽江经典 7 日亲友团",
    origin: "中国香港",
    status: "draft",
    quoteGeneratedAt: "",

    creator: "operations_zhaolei",
    createdAt: "2026-08-30 10:40",
    updatedAt: "2026-08-31 09:15",
  }),
];
