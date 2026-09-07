import type { PrototypeUserRecord } from "@/types/user";
import type { VisitOverviewDetail, VisitTrendDetail } from "@/types/dashboard";
import type { InquiryLogRecord } from "@/types/inquiry-log";
import type { ItineraryRecord } from "@/types/itinerary";
import type { InquiryRecord } from "@/types/inquiry";

export const departmentDefinitions = [
  { value: 1, labelKey: "user.departments.systemManagement" },
  { value: 2, labelKey: "user.departments.resourceManagement" },
  { value: 3, labelKey: "user.departments.coordination" },
] as const;

/**
 * 本地原型用户目录。
 *
 * 这些记录仅供尚未接入后端的个人资料兜底和员工选择页面使用，不参与登录鉴权或权限判断。
 */
export const users: PrototypeUserRecord[] = [
  {
    id: "1",
    username: "admin",
    status: "enabled",
    nickname: "admin",
    nicknameKey: "user.seed.admin",
    avatar: "/favicon.ico",
    gender: 1,
    mobile: "17621210366",
    email: "",
    deptId: 1,
    createTime: "2026-08-19 09:00:00",
    roles: ["ADMIN"],
  },
  {
    id: "2",
    username: "inquiry",
    status: "enabled",
    nickname: "王敏",
    avatar: "/favicon.ico",
    gender: 0,
    mobile: "",
    email: "inquiry@sunrise.local",
    deptId: 3,
    createTime: "2026-08-19 09:10:00",
    roles: ["INQUIRY_COORDINATOR"],
  },
  {
    id: "3",
    username: "resource",
    status: "enabled",
    nickname: "resource",
    nicknameKey: "user.seed.resourceManager",
    avatar: "/favicon.ico",
    gender: 0,
    mobile: "",
    email: "resource@sunrise.local",
    deptId: 2,
    createTime: "2026-08-19 09:20:00",
    roles: ["RESOURCE_MANAGER"],
  },
  {
    id: "4",
    username: "operations",
    status: "enabled",
    nickname: "张伟",
    avatar: "/favicon.ico",
    gender: 0,
    mobile: "",
    email: "operations@sunrise.local",
    deptId: 3,
    createTime: "2026-08-19 09:30:00",
    roles: ["OPERATIONS_COORDINATOR"],
  },
  {
    id: "5",
    username: "inquiry_lina",
    status: "enabled",
    nickname: "李娜",
    avatar: "/favicon.ico",
    gender: 0,
    mobile: "",
    email: "inquiry.lina@sunrise.local",
    deptId: 3,
    createTime: "2026-08-19 09:40:00",
    roles: ["INQUIRY_COORDINATOR"],
  },
  {
    id: "6",
    username: "inquiry_zhouyue",
    status: "enabled",
    nickname: "周悦",
    avatar: "/favicon.ico",
    gender: 0,
    mobile: "",
    email: "inquiry.zhouyue@sunrise.local",
    deptId: 3,
    createTime: "2026-08-19 09:50:00",
    roles: ["INQUIRY_COORDINATOR"],
  },
  {
    id: "7",
    username: "operations_chenchen",
    status: "enabled",
    nickname: "陈晨",
    avatar: "/favicon.ico",
    gender: 0,
    mobile: "",
    email: "operations.chenchen@sunrise.local",
    deptId: 3,
    createTime: "2026-08-19 10:00:00",
    roles: ["OPERATIONS_COORDINATOR"],
  },
  {
    id: "8",
    username: "operations_zhaolei",
    status: "enabled",
    nickname: "赵磊",
    avatar: "/favicon.ico",
    gender: 0,
    mobile: "",
    email: "operations.zhaolei@sunrise.local",
    deptId: 3,
    createTime: "2026-08-19 10:10:00",
    roles: ["OPERATIONS_COORDINATOR"],
  },
];

export const inquiries: InquiryRecord[] = [
  {
    id: "inquiry-1", code: "INQ-202608-001", agencyId: "", agencyCode: "AGY-001", agencyName: "新加坡远景旅行社",
    contactName: "Emily Tan", email: "emily@example.com", phone: "+65 6123 4567", countryOrRegion: "新加坡",
    sourceChannel: "WhatsApp", originalMessage: "10 人计划 10 月到云南旅行 7 天，希望安排昆明、大理和丽江。",
    internalRemark: "报价 PDF 已发送，等待旅行社确认。", owner: "王敏", operationsCoordinator: "张伟", nextFollowUpAt: "2026-09-01 11:00", plannedDays: 7,
    lostReason: "", status: "quoted", creator: "admin", createdAt: "2026-08-21 09:30",
  },
  {
    id: "inquiry-10", code: "INQ-202608-010", agencyId: "", agencyCode: "AGY-002", agencyName: "Malaysia Star Holidays",
    contactName: "Jason Lee", email: "jason@example.com", phone: "+60 3-1234 5678", countryOrRegion: "马来西亚",
    sourceChannel: "WhatsApp", originalMessage: "10 人云南经典 7 天游，覆盖昆明、大理和丽江。",
    internalRemark: "历史方案已归档，仅供查询和行程参考。", owner: "李娜", operationsCoordinator: "陈晨", nextFollowUpAt: "", plannedDays: 7,
    lostReason: "", status: "archived", creator: "admin", createdAt: "2026-08-16 15:00",
  },
  {
    id: "inquiry-11", code: "INQ-202608-011", agencyId: "", agencyCode: "AGY-007", agencyName: "Hong Kong Evergreen Travel",
    contactName: "Kelly Wong", email: "kelly@example.com", phone: "+852 2555 0107", countryOrRegion: "中国香港",
    sourceChannel: "WeChat", originalMessage: "10 人亲友团计划 10 月赴云南，希望 7 天走昆明、大理和丽江，安排舒适酒店、特色餐和中文导游。",
    internalRemark: "日期和人数已确认，需控制每日车程并预留自由活动时间。", owner: "周悦", operationsCoordinator: "赵磊", nextFollowUpAt: "2026-09-01 10:30", plannedDays: 7,
    lostReason: "", status: "planning", creator: "inquiry_zhouyue", createdAt: "2026-08-30 09:20",
  },
  {
    id: "inquiry-14", code: "INQ-202608-014", agencyId: "", agencyCode: "AGY-003", agencyName: "Bangkok Discovery Travel",
    contactName: "Narin Chai", email: "narin@example.com", phone: "+66 2-123-4567", countryOrRegion: "泰国",
    sourceChannel: "Website", originalMessage: "10 人希望国庆后安排昆明、大理和丽江 7 天游，并入住景观酒店。",
    internalRemark: "完整方案已制作，但客户未接受最终价格。", owner: "王敏", operationsCoordinator: "赵磊", nextFollowUpAt: "", plannedDays: 7,
    lostReason: "客户预算不足，最终选择其他目的地", status: "lost", creator: "inquiry", createdAt: "2026-08-29 16:10",
  },
  {
    id: "inquiry-15", code: "INQ-202608-015", agencyId: "", agencyCode: "AGY-005", agencyName: "Seoul Hanul Travel",
    contactName: "Min-jun Park", email: "minjun@example.com", phone: "+82 2-555-0105", countryOrRegion: "韩国",
    sourceChannel: "Referral", originalMessage: "10 人企业团希望安排昆明、大理、丽江 7 天游，包含欢迎宴和特色文化体验。",
    internalRemark: "新询盘演示数据，待操作计调创建行程。", owner: "李娜", operationsCoordinator: "陈晨", nextFollowUpAt: "2026-09-01 16:00", plannedDays: 7,
    lostReason: "", status: "new", creator: "inquiry_lina", createdAt: "2026-08-31 08:45",
  },
];

const completeItineraryTemplate: ItineraryRecord = {
    id: "itinerary-4",
    inquiryId: "inquiry-11",
    code: "ITI-202608-004",
    title: "昆明大理丽江经典 7 日亲友团",
    startDate: "2026-10-19",
    endDate: "2026-10-25",
    days: 7,
    adults: 10,
    childrenCount: 0,
    operationsCoordinator: "赵磊",
    quote: { adultUnitPrice: null },
    dailyPlans: [
      {
        id: "itinerary-4-day-1",
        dayNumber: 1,
        date: "2026-10-19",
        departure: "中国香港",
        destination: "昆明",
        transport: "flight,coach",
        description: "团队乘航班抵达昆明长水机场，导游在到达层举牌迎接并协助清点行李。乘旅游车前往市区酒店办理入住，途中介绍云南气候、时差与后续行程。傍晚安排云南特色欢迎宴，餐后返回酒店休息；如航班延误则取消自由活动并保留晚餐。",
        items: [
          { id: "itinerary-4-day-1-vehicle", type: "vehicle", resourceId: "", resourcePriceId: "", resourceName: "丰田考斯特", priceName: "车辆日成本", providerName: "直营报价", quantity: 1, unit: "vehicleDay", unitCost: 2200, totalCost: 2200, remark: "机场接机、市区晚餐接送，含司机服务" },
          { id: "itinerary-4-day-1-guide", type: "guide", resourceId: "", resourcePriceId: "", resourceName: "刘晓燕", priceName: "中文 · 导游日成本", providerName: "直营报价", quantity: 1, unit: "guideDay", unitCost: 600, totalCost: 600, remark: "接机、入住协助和行程说明" },
          { id: "itinerary-4-day-1-hotel", type: "hotel", resourceId: "", resourcePriceId: "", resourceName: "盘龙温德姆花园", priceName: "城景大床/双床房", providerName: "直营报价", quantity: 6, unit: "roomNight", unitCost: 400, totalCost: 2400, remark: "4 间双床房、2 间单人大床房，含早餐" },
          { id: "itinerary-4-day-1-dinner", type: "restaurant", resourceId: "", resourcePriceId: "", resourceName: "云南人家", priceName: "昆明特色风味宴", providerName: "直营报价", quantity: 1, unit: "table", unitCost: 500, totalCost: 500, remark: "十人桌欢迎宴，安排清淡菜" },
        ],
      },
      {
        id: "itinerary-4-day-2",
        dayNumber: 2,
        date: "2026-10-20",
        departure: "昆明",
        destination: "大理",
        transport: "highSpeedRail,coach",
        description: "早餐后退房，乘车前往昆明动车站，导游协助进站并安排大件行李。抵达大理后由旅游车接站，午餐后游览崇圣寺三塔文化旅游区，乘电瓶车减少步行距离，参观三塔倒影公园和崇圣寺主要建筑。傍晚入住洱海边酒店，晚餐后可在酒店湖景露台自由活动。",
        items: [
          { id: "itinerary-4-day-2-vehicle", type: "vehicle", resourceId: "", resourcePriceId: "", resourceName: "丰田考斯特", priceName: "车辆日成本", providerName: "直营报价", quantity: 1, unit: "vehicleDay", unitCost: 2200, totalCost: 2200, remark: "昆明送站、大理接站及景区用车" },
          { id: "itinerary-4-day-2-guide", type: "guide", resourceId: "", resourcePriceId: "", resourceName: "刘晓燕", priceName: "中文 · 导游日成本", providerName: "直营报价", quantity: 1, unit: "guideDay", unitCost: 600, totalCost: 600, remark: "全程陪同、动车衔接和三塔讲解" },
          { id: "itinerary-4-day-2-ticket", type: "attraction", resourceId: "", resourcePriceId: "", resourceName: "崇圣寺三塔", priceName: "景区门票 · 成人 · 常规期", providerName: "直营报价", quantity: 10, unit: "personVisit", unitCost: 60, totalCost: 600, remark: "成人团队票" },
          { id: "itinerary-4-day-2-cart", type: "attraction", resourceId: "", resourcePriceId: "", resourceName: "崇圣寺三塔", priceName: "电瓶车 · 成人 · 常规期", providerName: "直营报价", quantity: 10, unit: "personVisit", unitCost: 20, totalCost: 200, remark: "往返电瓶车，减少步行" },
          { id: "itinerary-4-day-2-dinner", type: "restaurant", resourceId: "", resourcePriceId: "", resourceName: "大理六合云燕酒店", priceName: "中式合菜/清新养生宴", providerName: "直营报价", quantity: 1, unit: "table", unitCost: 500, totalCost: 500, remark: "十人桌，少辣" },
          { id: "itinerary-4-day-2-hotel", type: "hotel", resourceId: "", resourcePriceId: "", resourceName: "大理洱海天域英迪格", priceName: "洱海景观房", providerName: "直营报价", quantity: 6, unit: "roomNight", unitCost: 760, totalCost: 4560, remark: "连住两晚，含早餐" },
        ],
      },
      {
        id: "itinerary-4-day-3",
        dayNumber: 3,
        date: "2026-10-21",
        departure: "大理",
        destination: "大理",
        transport: "coach,walking",
        description: "早餐后前往苍山洗马潭索道，视天气和景区运营情况乘索道登山，在高山观景平台停留并控制活动强度。下山后享用白族风味午餐，下午前往喜洲古镇参观传统白族民居和稻田景观，再到洱海生态廊道轻松散步、拍摄日落。晚餐后返回酒店休息。",
        items: [
          { id: "itinerary-4-day-3-vehicle", type: "vehicle", resourceId: "", resourcePriceId: "", resourceName: "丰田考斯特", priceName: "车辆日成本", providerName: "直营报价", quantity: 1, unit: "vehicleDay", unitCost: 2200, totalCost: 2200, remark: "苍山、喜洲及洱海环线用车" },
          { id: "itinerary-4-day-3-guide", type: "guide", resourceId: "", resourcePriceId: "", resourceName: "刘晓燕", priceName: "中文 · 导游日成本", providerName: "直营报价", quantity: 1, unit: "guideDay", unitCost: 600, totalCost: 600, remark: "苍山安全提示、喜洲文化讲解" },
          { id: "itinerary-4-day-3-cableway", type: "attraction", resourceId: "", resourcePriceId: "", resourceName: "洗马潭索道", priceName: "洗马潭索道 · 成人 · 旺季", providerName: "云南云途地接社", quantity: 10, unit: "personVisit", unitCost: 320, totalCost: 3200, remark: "根据天气及景区通知调整，无法运营时更换低海拔项目" },
          { id: "itinerary-4-day-3-lunch", type: "restaurant", resourceId: "", resourcePriceId: "", resourceName: "四方宏源", priceName: "白族砂锅鱼风味", providerName: "直营报价", quantity: 1, unit: "table", unitCost: 500, totalCost: 500, remark: "十人桌，提前确认鱼类做法" },
          { id: "itinerary-4-day-3-hotel", type: "hotel", resourceId: "", resourcePriceId: "", resourceName: "大理洱海天域英迪格", priceName: "洱海景观房", providerName: "直营报价", quantity: 6, unit: "roomNight", unitCost: 760, totalCost: 4560, remark: "第二晚连住，含早餐" },
        ],
      },
      {
        id: "itinerary-4-day-4",
        dayNumber: 4,
        date: "2026-10-22",
        departure: "大理",
        destination: "丽江",
        transport: "coach,walking",
        description: "早餐后退房，经大丽高速前往丽江，途中在服务区休息一次。抵达后享用午餐并办理酒店入住，下午游览束河古镇，沿青龙桥、四方听音广场和古巷水系慢行，安排咖啡休息时间。傍晚前往丽江古城外围用餐，餐后客人可选择自行游览古城或乘车返回酒店。",
        items: [
          { id: "itinerary-4-day-4-vehicle", type: "vehicle", resourceId: "", resourcePriceId: "", resourceName: "丰田考斯特", priceName: "车辆日成本", providerName: "直营报价", quantity: 1, unit: "vehicleDay", unitCost: 2200, totalCost: 2200, remark: "大理至丽江、束河古镇及晚餐接送" },
          { id: "itinerary-4-day-4-guide", type: "guide", resourceId: "", resourcePriceId: "", resourceName: "刘晓燕", priceName: "中文 · 导游日成本", providerName: "直营报价", quantity: 1, unit: "guideDay", unitCost: 600, totalCost: 600, remark: "途中讲解、入住协助及束河古镇导览" },
          { id: "itinerary-4-day-4-dinner", type: "restaurant", resourceId: "", resourcePriceId: "", resourceName: "丽江小南国", priceName: "精品合菜", providerName: "直营报价", quantity: 1, unit: "table", unitCost: 700, totalCost: 700, remark: "十人桌，包含纳西风味菜" },
          { id: "itinerary-4-day-4-hotel", type: "hotel", resourceId: "", resourcePriceId: "", resourceName: "丽江金茂璞修雪山酒店", priceName: "豪华雪山房", providerName: "直营报价", quantity: 6, unit: "roomNight", unitCost: 980, totalCost: 5880, remark: "连住两晚，含早餐，尽量安排同楼层" },
        ],
      },
      {
        id: "itinerary-4-day-5",
        dayNumber: 5,
        date: "2026-10-23",
        departure: "丽江",
        destination: "丽江",
        transport: "coach,walking",
        description: "早餐后按预约时段前往玉龙雪山，途中领取防寒服和氧气瓶。进入景区后乘景区车及冰川公园大索道，视身体情况在观景栈道分段活动；下山后前往蓝月谷游览。午餐采用景区简餐，下午返回市区休息，晚餐安排纳西精品合菜。高海拔项目以安全为先，如索道停运则改为云杉坪及白沙古镇。",
        items: [
          { id: "itinerary-4-day-5-vehicle", type: "vehicle", resourceId: "", resourcePriceId: "", resourceName: "丰田考斯特", priceName: "车辆日成本", providerName: "直营报价", quantity: 1, unit: "vehicleDay", unitCost: 2200, totalCost: 2200, remark: "丽江市区往返玉龙雪山及晚餐接送" },
          { id: "itinerary-4-day-5-guide", type: "guide", resourceId: "", resourcePriceId: "", resourceName: "刘晓燕", priceName: "中文 · 导游日成本", providerName: "直营报价", quantity: 1, unit: "guideDay", unitCost: 600, totalCost: 600, remark: "实名票核对、高海拔安全照顾和景区导览" },
          { id: "itinerary-4-day-5-entrance", type: "attraction", resourceId: "", resourcePriceId: "", resourceName: "玉龙雪山景区", priceName: "进山费及景区车 · 成人 · 常规期", providerName: "直营报价", quantity: 10, unit: "personVisit", unitCost: 130, totalCost: 1300, remark: "含进山费及景区车，不含索道" },
          { id: "itinerary-4-day-5-cableway", type: "attraction", resourceId: "", resourcePriceId: "", resourceName: "玉龙雪山景区", priceName: "冰川公园大索道 · 成人 · 常规期", providerName: "滇西北假日地接社", quantity: 10, unit: "personVisit", unitCost: 135, totalCost: 1350, remark: "实名预约，以景区最终放票为准" },
          { id: "itinerary-4-day-5-dinner", type: "restaurant", resourceId: "", resourcePriceId: "", resourceName: "丽江云雪丽餐厅", priceName: "纳西精品合菜", providerName: "滇西北假日地接社", quantity: 1, unit: "table", unitCost: 880, totalCost: 880, remark: "十人桌，含特色腊排骨" },
          { id: "itinerary-4-day-5-hotel", type: "hotel", resourceId: "", resourcePriceId: "", resourceName: "丽江金茂璞修雪山酒店", priceName: "豪华雪山房", providerName: "直营报价", quantity: 6, unit: "roomNight", unitCost: 980, totalCost: 5880, remark: "第二晚连住，含早餐" },
        ],
      },
      {
        id: "itinerary-4-day-6",
        dayNumber: 6,
        date: "2026-10-24",
        departure: "丽江",
        destination: "昆明",
        transport: "highSpeedRail,coach",
        description: "早餐后退房，根据动车班次前往丽江站。抵达昆明后由旅游车接站，午餐安排过桥米线和汽锅鸡，随后入住酒店休息。下午视到达时间游览翠湖公园、云南陆军讲武堂外景和钱王街，晚间自由活动，导游提供周边餐饮和购物建议。",
        items: [
          { id: "itinerary-4-day-6-vehicle", type: "vehicle", resourceId: "", resourcePriceId: "", resourceName: "丰田考斯特", priceName: "车辆日成本", providerName: "直营报价", quantity: 1, unit: "vehicleDay", unitCost: 2200, totalCost: 2200, remark: "丽江送站、昆明接站和市区用车" },
          { id: "itinerary-4-day-6-guide", type: "guide", resourceId: "", resourcePriceId: "", resourceName: "刘晓燕", priceName: "中文 · 导游日成本", providerName: "直营报价", quantity: 1, unit: "guideDay", unitCost: 600, totalCost: 600, remark: "动车衔接、市区步行导览及自由活动建议" },
          { id: "itinerary-4-day-6-lunch", type: "restaurant", resourceId: "", resourcePriceId: "", resourceName: "昆明万兴建新园", priceName: "过桥米线（汽锅鸡）+野生菌火锅", providerName: "直营报价", quantity: 10, unit: "personMeal", unitCost: 60, totalCost: 600, remark: "抵达昆明后的午餐，每人一份" },
          { id: "itinerary-4-day-6-hotel", type: "hotel", resourceId: "", resourcePriceId: "", resourceName: "盘龙温德姆花园", priceName: "城景大床/双床房", providerName: "直营报价", quantity: 6, unit: "roomNight", unitCost: 400, totalCost: 2400, remark: "返程前一晚，含早餐" },
        ],
      },
      {
        id: "itinerary-4-day-7",
        dayNumber: 7,
        date: "2026-10-25",
        departure: "昆明",
        destination: "中国香港",
        transport: "coach,flight",
        description: "早餐后退房并寄存行李，前往云南民族村参观代表性少数民族村寨、建筑和民俗展示，乘园区观光火车减少步行。午餐安排云南特色风味宴，随后根据航班时间返回酒店取行李并前往昆明长水机场。导游协助办理登机手续，确认全员进入安检后结束服务。",
        items: [
          { id: "itinerary-4-day-7-vehicle", type: "vehicle", resourceId: "", resourcePriceId: "", resourceName: "丰田考斯特", priceName: "车辆日成本", providerName: "直营报价", quantity: 1, unit: "vehicleDay", unitCost: 2200, totalCost: 2200, remark: "酒店、民族村、午餐及机场送机" },
          { id: "itinerary-4-day-7-guide", type: "guide", resourceId: "", resourcePriceId: "", resourceName: "刘晓燕", priceName: "中文 · 导游日成本", providerName: "直营报价", quantity: 1, unit: "guideDay", unitCost: 600, totalCost: 600, remark: "民族村讲解和机场离境协助" },
          { id: "itinerary-4-day-7-ticket", type: "attraction", resourceId: "", resourcePriceId: "", resourceName: "云南民族村", priceName: "景区门票 · 成人 · 常规期", providerName: "直营报价", quantity: 10, unit: "personVisit", unitCost: 60, totalCost: 600, remark: "成人团队票" },
          { id: "itinerary-4-day-7-train", type: "attraction", resourceId: "", resourcePriceId: "", resourceName: "云南民族村", priceName: "观光火车 · 通用 · 常规期", providerName: "直营报价", quantity: 10, unit: "personVisit", unitCost: 30, totalCost: 300, remark: "园区观光火车" },
          { id: "itinerary-4-day-7-lunch", type: "restaurant", resourceId: "", resourcePriceId: "", resourceName: "云南人家", priceName: "九歌寨风味宴", providerName: "直营报价", quantity: 1, unit: "table", unitCost: 650, totalCost: 650, remark: "离境前午餐，十人桌" },
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
  adultUnitPrice: number | null;
  operationsCoordinator: string;
  creator: string;
  createdAt: string;
  updatedAt: string;
}

function createCompleteItineraryVariant(options: CompleteItineraryVariant): ItineraryRecord {
  return {
    ...completeItineraryTemplate,
    id: options.id,
    inquiryId: options.inquiryId,
    code: options.code,
    title: options.title,
    operationsCoordinator: options.operationsCoordinator,
    status: options.status,
    quoteGeneratedAt: options.quoteGeneratedAt,
    quote: { adultUnitPrice: options.adultUnitPrice },
    creator: options.creator,
    createdAt: options.createdAt,
    updatedAt: options.updatedAt,
    dailyPlans: completeItineraryTemplate.dailyPlans.map((day) => ({
      ...day,
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
    adultUnitPrice: null,
    operationsCoordinator: "赵磊",
    creator: "operations_zhaolei",
    createdAt: "2026-08-30 10:40",
    updatedAt: "2026-08-31 09:15",
  }),
  createCompleteItineraryVariant({
    id: "itinerary-quoted",
    inquiryId: "inquiry-1",
    code: "ITI-202608-001",
    title: "昆明大理丽江经典 7 日报价方案",
    origin: "新加坡",
    status: "quoted",
    quoteGeneratedAt: "2026-08-26 17:40",
    adultUnitPrice: 5923.11,
    operationsCoordinator: "张伟",
    creator: "operations",
    createdAt: "2026-08-24 10:20",
    updatedAt: "2026-08-26 17:40",
  }),
  createCompleteItineraryVariant({
    id: "itinerary-lost",
    inquiryId: "inquiry-14",
    code: "ITI-202608-014",
    title: "昆明大理丽江经典 7 日预算方案",
    origin: "曼谷",
    status: "draft",
    quoteGeneratedAt: "",
    adultUnitPrice: null,
    operationsCoordinator: "赵磊",
    creator: "operations_zhaolei",
    createdAt: "2026-08-29 17:00",
    updatedAt: "2026-08-30 09:40",
  }),
  createCompleteItineraryVariant({
    id: "itinerary-archived",
    inquiryId: "inquiry-10",
    code: "ITI-202608-010",
    title: "昆明大理丽江经典 7 日历史方案",
    origin: "吉隆坡",
    status: "archived",
    quoteGeneratedAt: "",
    adultUnitPrice: 5923.11,
    operationsCoordinator: "陈晨",
    creator: "operations_chenchen",
    createdAt: "2026-08-16 16:00",
    updatedAt: "2026-08-17 09:00",
  }),
];

function getSeedOperator(username: string) {
  const user = users.find((record) => record.username === username);
  return {
    operatorId: user?.id ?? "",
    operatorUsername: username,
    operatorName: user?.nickname ?? username,
  };
}

export const inquiryLogs: InquiryLogRecord[] = [
  ...inquiries.map((inquiry) => ({
    id: `inquiry-log-created-${inquiry.id}`,
    inquiryId: inquiry.id,
    action: "inquiry_created" as const,
    occurredAt: inquiry.createdAt,
    ...getSeedOperator(inquiry.creator),
    targetType: "inquiry" as const,
    targetId: inquiry.id,
    targetCode: inquiry.code,
  })),
  ...itineraries.map((itinerary) => ({
    id: `inquiry-log-created-${itinerary.id}`,
    inquiryId: itinerary.inquiryId,
    action: "itinerary_created" as const,
    occurredAt: itinerary.createdAt,
    ...getSeedOperator(itinerary.creator),
    targetType: "itinerary" as const,
    targetId: itinerary.id,
    targetCode: itinerary.code,
    summary: itinerary.title,
    metadata: { creationMode: "new" },
  })),
  ...itineraries
    .filter((itinerary) => itinerary.status === "draft" && itinerary.updatedAt !== itinerary.createdAt)
    .map((itinerary) => ({
      id: `inquiry-log-saved-${itinerary.id}`,
      inquiryId: itinerary.inquiryId,
      action: "itinerary_saved" as const,
      occurredAt: itinerary.updatedAt,
      ...getSeedOperator(itinerary.creator),
      targetType: "itinerary" as const,
      targetId: itinerary.id,
      targetCode: itinerary.code,
      summary: itinerary.title,
    })),
  ...itineraries
    .filter((itinerary) => itinerary.status === "quoted")
    .map((itinerary) => ({
      id: `inquiry-log-pdf-${itinerary.id}`,
      inquiryId: itinerary.inquiryId,
      action: "itinerary_pdf_generated" as const,
      occurredAt: itinerary.updatedAt,
      ...getSeedOperator(itinerary.creator),
      targetType: "itinerary" as const,
      targetId: itinerary.id,
      targetCode: itinerary.code,
      summary: itinerary.title,
    })),
  {
    id: "inquiry-log-lost-inquiry-14", inquiryId: "inquiry-14", action: "inquiry_lost", occurredAt: "2026-08-30 10:10",
    ...getSeedOperator("inquiry"), targetType: "inquiry", targetId: "inquiry-14", targetCode: "INQ-202608-014",
    metadata: { lostReason: "客户预算不足，最终选择其他目的地" },
  },
  {
    id: "inquiry-log-archived-inquiry-10", inquiryId: "inquiry-10", action: "inquiry_archived", occurredAt: "2026-08-17 09:00",
    ...getSeedOperator("inquiry_lina"), targetType: "inquiry", targetId: "inquiry-10", targetCode: "INQ-202608-010",
  },
];

export const visitOverview: VisitOverviewDetail = {
  todayUvCount: 169,
  totalUvCount: 19985,
  uvGrowthRate: -0.57,
  todayPvCount: 1629,
  totalPvCount: 286086,
  pvGrowthRate: -0.65,
};

export const visitTrend: VisitTrendDetail = {
  dates: ["2024-06-30", "2024-07-01", "2024-07-02", "2024-07-03", "2024-07-04", "2024-07-05", "2024-07-06", "2024-07-07"],
  pvList: [1751, 5168, 4882, 5301, 4721, 4885, 1901, 1003],
  uvList: [207, 566, 565, 631, 579, 496, 222, 152],
};
