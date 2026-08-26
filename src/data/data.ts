import type { PrototypeUserRecord } from "@/types/auth";
import type { SystemDictionaryItem, SystemDictionaryType } from "@/types/dictionary";
import type { VisitOverviewDetail, VisitTrendDetail } from "@/types/dashboard";
import type { ItineraryRecord } from "@/types/itinerary";
import type { InquiryRecord } from "@/types/inquiry";
import type {
  AttractionRecord, BusinessCategoryTypeRecord, GuideRecord, HotelRecord, ResourceUnitRecord,
  RestaurantRecord, TourismResourceRecord, TourismResourceType, TransportMethodRecord,
} from "@/types/resource";
import { ROLE_ROOT } from "@/constants";

const adminPermissions = [
  "sys:user:list",
  "sys:user:create",
  "sys:user:update",
  "sys:user:delete",
  "sys:user:import",
  "sys:user:export",
  "sys:user:reset-password",
  "sys:role:list",
  "sys:role:create",
  "sys:role:update",
  "sys:role:delete",
  "sys:dict:list",
  "sys:dict:create",
  "sys:dict:update",
  "sys:dict:delete",
  "sys:dict-item:list",
  "sys:dict-item:create",
  "sys:dict-item:update",
  "sys:dict-item:delete",
  "sys:business-category:list",
  "sys:business-category:create",
  "sys:business-category:update",
  "sys:business-category:delete",
  "resource:agency:list",
  "resource:supplier:list",
  "resource:hotel:list",
  "resource:restaurant:list",
  "resource:attraction:list",
  "resource:transport:list",
  "resource:guide:list",
  "inquiry:list",
  "inquiry:create",
  "inquiry:update",
  "inquiry:archive",
  "itinerary:list",
  "itinerary:create",
  "itinerary:update",
  "itinerary:price",
  "itinerary:pdf",
];

const resourcePermissions = [
  "resource:agency:list",
  "resource:supplier:list",
  "resource:hotel:list",
  "resource:restaurant:list",
  "resource:attraction:list",
  "resource:transport:list",
  "resource:guide:list",
];

const inquiryPermissions = ["inquiry:list", "inquiry:create", "inquiry:update", "itinerary:list", "itinerary:price"];

const operationsPermissions = [
  "inquiry:list",
  "inquiry:update",
  "itinerary:list",
  "itinerary:create",
  "itinerary:update",
  "itinerary:pdf",
];

export const departmentDefinitions = [
  { value: 1, labelKey: "user.departments.systemManagement" },
  { value: 2, labelKey: "user.departments.resourceManagement" },
  { value: 3, labelKey: "user.departments.coordination" },
] as const;

export const roleDefinitions = [
  { value: 2, labelKey: "user.roles.systemAdministrator", roles: [ROLE_ROOT, "ADMIN"], perms: adminPermissions },
  { value: 4, labelKey: "user.roles.resourceManager", roles: ["RESOURCE_MANAGER"], perms: resourcePermissions },
  { value: 5, labelKey: "user.roles.inquiryCoordinator", roles: ["INQUIRY_COORDINATOR"], perms: inquiryPermissions },
  { value: 6, labelKey: "user.roles.operationsCoordinator", roles: ["OPERATIONS_COORDINATOR"], perms: operationsPermissions },
] as const;

/**
 * 本地原型账号。
 *
 * 这些账号只用于前端演示，不代表生产环境的真实认证数据。
 */
export const users: PrototypeUserRecord[] = [
  {
    id: "1",
    username: "admin",
    password: "123456",
    status: "enabled",
    nickname: "admin",
    nicknameKey: "user.seed.admin",
    avatar: "/favicon.ico",
    gender: 1,
    mobile: "17621210366",
    email: "",
    deptId: 1,
    roleIds: [2],
    roleNames: "",
    createTime: "2026-08-19 09:00:00",
    roles: [ROLE_ROOT, "ADMIN"],
    perms: adminPermissions,
  },
  {
    id: "2",
    username: "inquiry",
    password: "123456",
    status: "enabled",
    nickname: "王敏",
    avatar: "/favicon.ico",
    gender: 0,
    mobile: "",
    email: "inquiry@sunrise.local",
    deptId: 3,
    roleIds: [5],
    roleNames: "",
    createTime: "2026-08-19 09:10:00",
    roles: ["INQUIRY_COORDINATOR"],
    perms: inquiryPermissions,
  },
  {
    id: "3",
    username: "resource",
    password: "123456",
    status: "enabled",
    nickname: "resource",
    nicknameKey: "user.seed.resourceManager",
    avatar: "/favicon.ico",
    gender: 0,
    mobile: "",
    email: "resource@sunrise.local",
    deptId: 2,
    roleIds: [4],
    roleNames: "",
    createTime: "2026-08-19 09:20:00",
    roles: ["RESOURCE_MANAGER"],
    perms: resourcePermissions,
  },
  {
    id: "4",
    username: "operations",
    password: "123456",
    status: "enabled",
    nickname: "张伟",
    avatar: "/favicon.ico",
    gender: 0,
    mobile: "",
    email: "operations@sunrise.local",
    deptId: 3,
    roleIds: [6],
    roleNames: "",
    createTime: "2026-08-19 09:30:00",
    roles: ["OPERATIONS_COORDINATOR"],
    perms: operationsPermissions,
  },
  {
    id: "5",
    username: "inquiry_lina",
    password: "123456",
    status: "enabled",
    nickname: "李娜",
    avatar: "/favicon.ico",
    gender: 0,
    mobile: "",
    email: "inquiry.lina@sunrise.local",
    deptId: 3,
    roleIds: [5],
    roleNames: "",
    createTime: "2026-08-19 09:40:00",
    roles: ["INQUIRY_COORDINATOR"],
    perms: inquiryPermissions,
  },
  {
    id: "6",
    username: "inquiry_zhouyue",
    password: "123456",
    status: "enabled",
    nickname: "周悦",
    avatar: "/favicon.ico",
    gender: 0,
    mobile: "",
    email: "inquiry.zhouyue@sunrise.local",
    deptId: 3,
    roleIds: [5],
    roleNames: "",
    createTime: "2026-08-19 09:50:00",
    roles: ["INQUIRY_COORDINATOR"],
    perms: inquiryPermissions,
  },
  {
    id: "7",
    username: "operations_chenchen",
    password: "123456",
    status: "enabled",
    nickname: "陈晨",
    avatar: "/favicon.ico",
    gender: 0,
    mobile: "",
    email: "operations.chenchen@sunrise.local",
    deptId: 3,
    roleIds: [6],
    roleNames: "",
    createTime: "2026-08-19 10:00:00",
    roles: ["OPERATIONS_COORDINATOR"],
    perms: operationsPermissions,
  },
  {
    id: "8",
    username: "operations_zhaolei",
    password: "123456",
    status: "enabled",
    nickname: "赵磊",
    avatar: "/favicon.ico",
    gender: 0,
    mobile: "",
    email: "operations.zhaolei@sunrise.local",
    deptId: 3,
    roleIds: [6],
    roleNames: "",
    createTime: "2026-08-19 10:10:00",
    roles: ["OPERATIONS_COORDINATOR"],
    perms: operationsPermissions,
  },
];

export const systemDictionaryTypes: SystemDictionaryType[] = [
  {
    id: "1",
    name: "gender",
    nameKey: "dictionary.seed.gender.name",
    dictCode: "gender",
    status: 1,
    remarkKey: "dictionary.seed.gender.remark",
  },
  {
    id: "2",
    name: "common_status",
    nameKey: "dictionary.seed.commonStatus.name",
    dictCode: "common_status",
    status: 1,
    remarkKey: "dictionary.seed.commonStatus.remark",
  },
  {
    id: "3",
    name: "yes_no",
    nameKey: "dictionary.seed.yesNo.name",
    dictCode: "yes_no",
    status: 1,
    remarkKey: "dictionary.seed.yesNo.remark",
  },
];

export const systemDictionaryItems: SystemDictionaryItem[] = [
  {
    id: "1",
    dictCode: "gender",
    label: "male",
    labelKey: "dictionary.seed.gender.male",
    value: "1",
    status: 1,
    sort: 1,
    tagType: "primary",
  },
  {
    id: "2",
    dictCode: "gender",
    label: "female",
    labelKey: "dictionary.seed.gender.female",
    value: "2",
    status: 1,
    sort: 2,
    tagType: "danger",
  },
  {
    id: "3",
    dictCode: "gender",
    label: "unset",
    labelKey: "dictionary.seed.gender.unset",
    value: "0",
    status: 1,
    sort: 3,
    tagType: "info",
  },
  {
    id: "4",
    dictCode: "common_status",
    label: "enabled",
    labelKey: "common.enabled",
    value: "1",
    status: 1,
    sort: 1,
    tagType: "success",
  },
  {
    id: "5",
    dictCode: "common_status",
    label: "disabled",
    labelKey: "common.disabled",
    value: "0",
    status: 1,
    sort: 2,
    tagType: "info",
  },
  {
    id: "6",
    dictCode: "yes_no",
    label: "yes",
    labelKey: "common.yes",
    value: "1",
    status: 1,
    sort: 1,
    tagType: "success",
  },
  {
    id: "7",
    dictCode: "yes_no",
    label: "no",
    labelKey: "common.no",
    value: "0",
    status: 1,
    sort: 2,
    tagType: "info",
  },
];

export const inquiries: InquiryRecord[] = [
  {
    id: "inquiry-1", code: "INQ-202608-001", agencyId: "agency-1", agencyCode: "AGY-001", agencyName: "新加坡远景旅行社",
    contactName: "Emily Tan", email: "emily@example.com", phone: "+65 6123 4567", countryOrRegion: "新加坡",
    sourceChannel: "WhatsApp", originalMessage: "6 人计划 10 月到云南旅行 7 天，希望安排昆明、大理和丽江。",
    internalRemark: "首次合作，关注舒适型酒店和英文导游。", owner: "王敏", operationsCoordinator: "张伟", nextFollowUpAt: "2026-08-26 10:00", plannedDays: 7,
    lostReason: "", status: "quoted", creator: "admin", createdAt: "2026-08-21 09:30",
  },
  {
    id: "inquiry-2", code: "INQ-202608-002", agencyId: "agency-2", agencyCode: "AGY-002", agencyName: "Malaysia Star Holidays",
    contactName: "Jason Lee", email: "jason@example.com", phone: "+60 3-1234 5678", countryOrRegion: "马来西亚",
    sourceChannel: "Email", originalMessage: "咨询 12 人云南摄影团，预计 11 月出发。",
    internalRemark: "等待客户确认具体日期。", owner: "李娜", operationsCoordinator: "陈晨", nextFollowUpAt: "2026-08-25 15:00", plannedDays: 6,
    lostReason: "", status: "new", creator: "admin", createdAt: "2026-08-22 14:10",
  },
  {
    id: "inquiry-3", code: "INQ-202608-003", agencyId: "agency-3", agencyCode: "AGY-003", agencyName: "Bangkok Discovery Travel",
    contactName: "Narin Chai", email: "narin@example.com", phone: "+66 2-123-4567", countryOrRegion: "泰国",
    sourceChannel: "Website", originalMessage: "需要 4 人丽江和香格里拉 5 天游报价。",
    internalRemark: "", owner: "王敏", operationsCoordinator: "赵磊", nextFollowUpAt: "", plannedDays: 5,
    lostReason: "客户预算与旺季价格差距较大", status: "lost", creator: "admin", createdAt: "2026-08-18 11:20",
  },
  {
    id: "inquiry-4", code: "INQ-202608-004", agencyId: "agency-4", agencyCode: "AGY-004", agencyName: "Jakarta Nusantara Tours",
    contactName: "Ayu Pratama", email: "ayu@example.com", phone: "+62 21 555 0104", countryOrRegion: "印度尼西亚",
    sourceChannel: "WhatsApp", originalMessage: "8 人国庆后到云南，计划昆明、大理 4 天游，需要英文导游。",
    internalRemark: "已确认出行日期，操作计调正在制作行程。", owner: "周悦", operationsCoordinator: "陈晨", nextFollowUpAt: "2026-08-28 14:00", plannedDays: 4,
    lostReason: "", status: "planning", creator: "inquiry_zhouyue", createdAt: "2026-08-23 10:15",
  },
  {
    id: "inquiry-5", code: "INQ-202608-005", agencyId: "agency-5", agencyCode: "AGY-005", agencyName: "Seoul Hanul Travel",
    contactName: "Min-jun Park", email: "minjun@example.com", phone: "+82 2-555-0105", countryOrRegion: "韩国",
    sourceChannel: "Email", originalMessage: "15 人冬季云南团队，希望安排昆明、建水和元阳摄影线路。",
    internalRemark: "需要确认团队中是否有素食客人。", owner: "李娜", operationsCoordinator: "赵磊", nextFollowUpAt: "2026-08-29 11:00", plannedDays: 8,
    lostReason: "", status: "new", creator: "inquiry_lina", createdAt: "2026-08-24 09:05",
  },
  {
    id: "inquiry-6", code: "INQ-202608-006", agencyId: "agency-6", agencyCode: "AGY-006", agencyName: "Taipei Formosa Holidays",
    contactName: "林怡君", email: "yijun@example.com", phone: "+886 2 5550 1060", countryOrRegion: "中国台湾",
    sourceChannel: "Referral", originalMessage: "家庭团 6 人，春节期间走腾冲和芒市 6 天游。",
    internalRemark: "客户暂缓出行，历史沟通保留。", owner: "王敏", operationsCoordinator: "张伟", nextFollowUpAt: "", plannedDays: 6,
    lostReason: "", status: "archived", creator: "admin", createdAt: "2026-08-12 16:40",
  },
  {
    id: "inquiry-7", code: "INQ-202608-007", agencyId: "agency-7", agencyCode: "AGY-007", agencyName: "Hong Kong Evergreen Travel",
    contactName: "Kelly Wong", email: "kelly@example.com", phone: "+852 2555 0107", countryOrRegion: "中国香港",
    sourceChannel: "WeChat", originalMessage: "10 人亲子团，想要大理、丽江和香格里拉 7 天游。",
    internalRemark: "需要准备儿童友好酒店和轻松行程。", owner: "周悦", operationsCoordinator: "陈晨", nextFollowUpAt: "2026-08-27 16:30", plannedDays: 7,
    lostReason: "", status: "new", creator: "inquiry_zhouyue", createdAt: "2026-08-25 13:20",
  },
  {
    id: "inquiry-8", code: "INQ-202608-008", agencyId: "agency-8", agencyCode: "AGY-008", agencyName: "Manila Archipelago Travel",
    contactName: "Maria Santos", email: "maria@example.com", phone: "+63 2 8555 0108", countryOrRegion: "菲律宾",
    sourceChannel: "Website", originalMessage: "20 人公司奖励团，希望安排昆明和大理 5 天游。",
    internalRemark: "客户要求压缩预算。", owner: "李娜", operationsCoordinator: "赵磊", nextFollowUpAt: "", plannedDays: 5,
    lostReason: "客户选择了其他目的地", status: "lost", creator: "inquiry_lina", createdAt: "2026-08-20 17:10",
  },
  {
    id: "inquiry-9", code: "INQ-202608-009", agencyId: "agency-1", agencyCode: "AGY-001", agencyName: "新加坡远景旅行社",
    contactName: "Emily Tan", email: "emily@example.com", phone: "+65 6123 4567", countryOrRegion: "新加坡",
    sourceChannel: "Email", originalMessage: "4 人高端小团，想体验腾冲温泉和高黎贡山 5 天游。",
    internalRemark: "老客户新询盘，优先安排精品酒店。", owner: "王敏", operationsCoordinator: "张伟", nextFollowUpAt: "2026-08-30 10:00", plannedDays: 5,
    lostReason: "", status: "new", creator: "inquiry", createdAt: "2026-08-26 09:10",
  },
  {
    id: "inquiry-10", code: "INQ-202608-010", agencyId: "agency-2", agencyCode: "AGY-002", agencyName: "Malaysia Star Holidays",
    contactName: "Jason Lee", email: "jason@example.com", phone: "+60 3-1234 5678", countryOrRegion: "马来西亚",
    sourceChannel: "WhatsApp", originalMessage: "12 人普洱和西双版纳茶文化 6 天游。",
    internalRemark: "重复询价已合并到客户档案，记录归档。", owner: "李娜", operationsCoordinator: "陈晨", nextFollowUpAt: "", plannedDays: 6,
    lostReason: "", status: "archived", creator: "admin", createdAt: "2026-08-16 15:00",
  },
];

export const itineraries: ItineraryRecord[] = [
  {
    id: "itinerary-1",
    inquiryId: "inquiry-1",
    code: "ITI-202608-001",
    title: "云南经典 7 日方案",
    destinations: "昆明、大理、丽江",
    startDate: "2026-10-12",
    endDate: "2026-10-18",
    days: 7,
    adults: 6,
    childrenCount: 0,
    otherGuests: 0,
    hotelLevel: "舒适型",
    roomPreference: "双床房",
    transportPreference: "全程商务车",
    guideRequired: true,
    guideLanguage: "English",
    pace: "适中",
    mealRequirements: "含早，正餐以云南特色餐为主",
    budget: 72000,
    specialRequirements: "丽江安排一晚古城内住宿",
    inquiryCoordinatorNotes: "首次合作，优先保证酒店位置和英文服务。",
    operationsCoordinator: "张伟",
    dailyPlans: [
      {
        id: "itinerary-1-day-1", dayNumber: 1, date: "2026-10-12", departure: "新加坡", destination: "昆明", transport: "flight,businessCar",
        title: "抵达昆明", description: "接机后享用晚餐，随后送至酒店办理入住。", mealSummary: "晚餐", accommodationSummary: "昆明",
        items: [
          { id: "item-1", type: "vehicle", resourceId: "transport-1", resourcePriceId: "transport-1-daily", resourceName: "别克 GL8", priceName: "车辆日成本", providerName: "直营报价", quantity: 1, unit: "vehicleDay", unitCost: 1200, unitPrice: null, totalCost: 1200, totalPrice: 0, remark: "接机及市内用车" },
          { id: "item-2", type: "hotel", resourceId: "hotel-1", resourcePriceId: "price-1", resourceName: "盘龙温德姆花园", priceName: "城景大床/双床房 · 常规期", providerName: "直营报价", quantity: 3, unit: "roomNight", unitCost: 400, unitPrice: null, totalCost: 1200, totalPrice: 0, remark: "3 间双床房" },
        ],
      },
      {
        id: "itinerary-1-day-2", dayNumber: 2, date: "2026-10-13", departure: "昆明", destination: "大理", transport: "businessCar",
        title: "昆明前往大理", description: "早餐后前往大理，游览崇圣寺三塔，晚餐后入住大理酒店。", mealSummary: "早、中、晚", accommodationSummary: "大理",
        items: [
          { id: "item-3", type: "attraction", resourceId: "attraction-2", resourcePriceId: "attraction-price-5", resourceName: "崇圣寺三塔", priceName: "景区门票 · 成人 · 常规期", providerName: "直营报价", quantity: 6, unit: "personVisit", unitCost: 60, unitPrice: null, totalCost: 360, totalPrice: 0, remark: "成人票" },
          { id: "item-4", type: "restaurant", resourceId: "restaurant-5", resourcePriceId: "restaurant-price-20", resourceName: "大理六合云燕酒店", priceName: "中式合菜/清新养生宴", providerName: "直营报价", quantity: 1, unit: "table", unitCost: 500, unitPrice: null, totalCost: 500, totalPrice: 0, remark: "晚餐" },
        ],
      },
      { id: "itinerary-1-day-3", dayNumber: 3, date: "2026-10-14", departure: "大理", destination: "大理", transport: "businessCar", title: "洱海人文体验", description: "龙龛码头、生态廊道 S 湾、文笔村。", mealSummary: "早、中、晚", accommodationSummary: "大理", items: [] },
      { id: "itinerary-1-day-4", dayNumber: 4, date: "2026-10-15", departure: "大理", destination: "丽江", transport: "businessCar", title: "大理前往丽江", description: "沿途观景，抵达丽江后游览丽江古城。", mealSummary: "早、中、晚", accommodationSummary: "丽江", items: [] },
      { id: "itinerary-1-day-5", dayNumber: 5, date: "2026-10-16", departure: "丽江", destination: "丽江", transport: "businessCar", title: "玉龙雪山", description: "玉龙雪山、蓝月谷及周边景区。", mealSummary: "早、中", accommodationSummary: "丽江", items: [] },
      { id: "itinerary-1-day-6", dayNumber: 6, date: "2026-10-17", departure: "丽江", destination: "昆明", transport: "highSpeedRail,businessCar", title: "返回昆明", description: "上午自由活动，下午乘动车返回昆明。", mealSummary: "早餐", accommodationSummary: "昆明", items: [] },
      { id: "itinerary-1-day-7", dayNumber: 7, date: "2026-10-18", departure: "昆明", destination: "新加坡", transport: "flight,businessCar", title: "昆明送机", description: "根据航班时间安排市区活动并送往机场。", mealSummary: "早餐", accommodationSummary: "无", items: [] },
    ],
    status: "draft",
    creator: "operations",
    createdAt: "2026-08-24 10:20",
    updatedAt: "2026-08-26 09:45",
  },
  {
    id: "itinerary-2",
    inquiryId: "inquiry-1",
    code: "ITI-202608-002",
    title: "云南经典 7 日舒适方案",
    destinations: "昆明、大理、丽江",
    startDate: "2026-10-12",
    endDate: "2026-10-18",
    days: 7,
    adults: 6,
    childrenCount: 0,
    otherGuests: 0,
    hotelLevel: "高档型",
    roomPreference: "双床房",
    transportPreference: "全程商务车",
    guideRequired: true,
    guideLanguage: "English",
    pace: "舒缓",
    mealRequirements: "含早，正餐安排云南特色餐",
    budget: 78000,
    specialRequirements: "升级核心城市住宿标准",
    inquiryCoordinatorNotes: "已向客户提供的舒适版报价。",
    operationsCoordinator: "张伟",
    dailyPlans: [
      { id: "itinerary-2-day-1", dayNumber: 1, date: "2026-10-12", departure: "新加坡", destination: "昆明", transport: "flight,businessCar", title: "抵达昆明", description: "接机后入住酒店。", mealSummary: "晚餐", accommodationSummary: "昆明", items: [] },
      { id: "itinerary-2-day-2", dayNumber: 2, date: "2026-10-13", departure: "昆明", destination: "大理", transport: "businessCar", title: "昆明前往大理", description: "前往大理并游览崇圣寺三塔。", mealSummary: "早、中、晚", accommodationSummary: "大理", items: [] },
      { id: "itinerary-2-day-3", dayNumber: 3, date: "2026-10-14", departure: "大理", destination: "大理", transport: "businessCar", title: "洱海慢游", description: "游览洱海生态廊道及周边村落。", mealSummary: "早、中、晚", accommodationSummary: "大理", items: [] },
      { id: "itinerary-2-day-4", dayNumber: 4, date: "2026-10-15", departure: "大理", destination: "丽江", transport: "businessCar", title: "大理前往丽江", description: "抵达丽江后游览古城。", mealSummary: "早、中、晚", accommodationSummary: "丽江", items: [] },
      { id: "itinerary-2-day-5", dayNumber: 5, date: "2026-10-16", departure: "丽江", destination: "丽江", transport: "businessCar", title: "玉龙雪山", description: "游览玉龙雪山和蓝月谷。", mealSummary: "早、中", accommodationSummary: "丽江", items: [] },
      { id: "itinerary-2-day-6", dayNumber: 6, date: "2026-10-17", departure: "丽江", destination: "昆明", transport: "highSpeedRail,businessCar", title: "返回昆明", description: "动车返回昆明并自由活动。", mealSummary: "早餐", accommodationSummary: "昆明", items: [] },
      { id: "itinerary-2-day-7", dayNumber: 7, date: "2026-10-18", departure: "昆明", destination: "新加坡", transport: "flight,businessCar", title: "昆明送机", description: "根据航班时间安排送机。", mealSummary: "早餐", accommodationSummary: "无", items: [] },
    ],
    status: "quoted",
    creator: "operations",
    createdAt: "2026-08-24 15:30",
    updatedAt: "2026-08-25 17:40",
  },
  {
    id: "itinerary-3",
    inquiryId: "inquiry-4",
    code: "ITI-202608-003",
    title: "昆明大理轻松 4 日方案",
    destinations: "昆明、大理",
    startDate: "2026-10-09",
    endDate: "2026-10-12",
    days: 4,
    adults: 8,
    childrenCount: 0,
    otherGuests: 0,
    hotelLevel: "高档型",
    roomPreference: "双床房",
    transportPreference: "全程商务车",
    guideRequired: true,
    guideLanguage: "English",
    pace: "舒缓",
    mealRequirements: "不吃辣，安排一餐白族风味餐",
    budget: 56000,
    specialRequirements: "避免连续安排长距离步行",
    inquiryCoordinatorNotes: "首次合作，报价需在本周内完成。",
    operationsCoordinator: "陈晨",
    dailyPlans: [
      { id: "itinerary-3-day-1", dayNumber: 1, date: "2026-10-09", departure: "雅加达", destination: "昆明", transport: "flight,businessCar", title: "抵达昆明", description: "接机后入住酒店，自由活动。", mealSummary: "晚餐", accommodationSummary: "昆明", items: [] },
      { id: "itinerary-3-day-2", dayNumber: 2, date: "2026-10-10", departure: "昆明", destination: "大理", transport: "highSpeedRail,businessCar", title: "昆明前往大理", description: "动车前往大理，下午游览大理古城。", mealSummary: "早、中、晚", accommodationSummary: "大理", items: [] },
      { id: "itinerary-3-day-3", dayNumber: 3, date: "2026-10-11", departure: "大理", destination: "大理", transport: "businessCar", title: "洱海环线", description: "游览喜洲古镇和洱海生态廊道。", mealSummary: "早、中、晚", accommodationSummary: "大理", items: [] },
      { id: "itinerary-3-day-4", dayNumber: 4, date: "2026-10-12", departure: "大理", destination: "雅加达", transport: "businessCar,flight", title: "返程", description: "根据航班时间安排送机。", mealSummary: "早餐", accommodationSummary: "无", items: [] },
    ],
    status: "draft",
    creator: "operations_chenchen",
    createdAt: "2026-08-25 10:30",
    updatedAt: "2026-08-26 11:15",
  },
];

/** 业务分类中的资源计价单位；旅游资源和行程仅保存单位编码。 */
export const resourceUnits: ResourceUnitRecord[] = [
  { id: "resource-unit-room-night", code: "roomNight", name: "间夜", englishName: "Room night", resourceTypes: ["hotel"], status: "enabled", remark: "酒店房型按间夜计价" },
  { id: "resource-unit-person-visit", code: "personVisit", name: "人次", englishName: "Person visit", resourceTypes: ["attraction"], status: "enabled", remark: "景点门票及景区项目按使用人次计价" },
  { id: "resource-unit-person-meal", code: "personMeal", name: "人/餐", englishName: "Person/meal", resourceTypes: ["restaurant"], status: "enabled", remark: "餐厅按每人每餐计价" },
  { id: "resource-unit-table", code: "table", name: "桌", englishName: "Table", resourceTypes: ["restaurant"], status: "enabled", remark: "餐厅整桌报价" },
  { id: "resource-unit-vehicle-day", code: "vehicleDay", name: "辆/天", englishName: "Vehicle/day", resourceTypes: ["vehicle"], status: "enabled", remark: "车辆按每辆每天计价" },
  { id: "resource-unit-guide-day", code: "guideDay", name: "人/天", englishName: "Person/day", resourceTypes: ["guide"], status: "enabled", remark: "导游按每人每天计价" },
];

/** 业务分类中的交通方式；每日行程仅保存交通方式编码。 */
export const transportMethods: TransportMethodRecord[] = [
  { id: "transport-method-flight", code: "flight", name: "飞机", englishName: "Flight", status: "enabled", remark: "航空交通" },
  { id: "transport-method-business-car", code: "businessCar", name: "商务车", englishName: "Business car", status: "enabled", remark: "小型团队包车" },
  { id: "transport-method-high-speed-rail", code: "highSpeedRail", name: "动车", englishName: "High-speed rail", status: "enabled", remark: "动车或高铁" },
  { id: "transport-method-coach", code: "coach", name: "旅游大巴", englishName: "Coach", status: "enabled", remark: "大型团队包车" },
  { id: "transport-method-ship", code: "ship", name: "船", englishName: "Ship", status: "enabled", remark: "水路交通" },
  { id: "transport-method-walking", code: "walking", name: "步行", englishName: "Walking", status: "enabled", remark: "徒步或步行游览" },
];

/** 业务分类类型；内置类型由专用面板维护，其余类型使用通用分类选项。 */
export const businessCategoryTypes: BusinessCategoryTypeRecord[] = [
  { id: "business-category-resource-unit", code: "resource-unit", name: "资源计价单位", englishName: "Resource Price Units", builtIn: true, items: [] },
  { id: "business-category-transport-method", code: "transport-method", name: "交通方式", englishName: "Transport Methods", builtIn: true, items: [] },
];

/** 菜单汇总原型数据；100 元及以下按单人餐标，更高价格按整桌报价归类。 */
export const restaurants: RestaurantRecord[] = [
  {
    id: "restaurant-1", code: "RES-001", name: "昆明云天水乡野菌园", city: "昆明", cuisine: "野生菌火锅",
    contact: "", phone: "", address: "", remark: "", unit: "personMeal", status: "enabled", prices: [
      { id: "restaurant-price-1", menuName: "地道野生菌火锅 40", unit: "personMeal", price: 40, dinerCount: 10, remark: "另有 8 人桌菜单", isGroundOperatorProvided: false, groundOperatorId: "" },
      { id: "restaurant-price-2", menuName: "地道野生菌火锅 50", unit: "personMeal", price: 50, dinerCount: 10, remark: "另有 8 人桌菜单", isGroundOperatorProvided: false, groundOperatorId: "" },
      { id: "restaurant-price-3", menuName: "地道野生菌火锅 60", unit: "personMeal", price: 60, dinerCount: 10, remark: "另有 8 人桌菜单", isGroundOperatorProvided: false, groundOperatorId: "" },
      { id: "restaurant-price-4", menuName: "地道野生菌火锅 70", unit: "personMeal", price: 70, dinerCount: 10, remark: "另有 8 人桌菜单", isGroundOperatorProvided: false, groundOperatorId: "" },
      { id: "restaurant-price-5", menuName: "地道野生菌火锅 80", unit: "personMeal", price: 80, dinerCount: 10, remark: "另有 8 人桌菜单", isGroundOperatorProvided: false, groundOperatorId: "" },
    ],
  },
  {
    id: "restaurant-2", code: "RES-002", name: "云南人家", city: "昆明", cuisine: "云南特色风味宴",
    contact: "", phone: "", address: "", remark: "", unit: "personMeal", status: "enabled", prices: [
      { id: "restaurant-price-6", menuName: "昆明特色风味宴", unit: "table", price: 400, dinerCount: 10, remark: "", isGroundOperatorProvided: false, groundOperatorId: "" },
      { id: "restaurant-price-7", menuName: "昆明特色风味宴", unit: "table", price: 500, dinerCount: 10, remark: "", isGroundOperatorProvided: false, groundOperatorId: "" },
      { id: "restaurant-price-8", menuName: "九歌寨风味宴", unit: "table", price: 650, dinerCount: 10, remark: "", isGroundOperatorProvided: false, groundOperatorId: "" },
      { id: "restaurant-price-9", menuName: "昆明特色风味宴", unit: "table", price: 800, dinerCount: 10, remark: "", isGroundOperatorProvided: false, groundOperatorId: "" },
      { id: "restaurant-price-10", menuName: "昆明特色风味宴", unit: "table", price: 1000, dinerCount: 10, remark: "", isGroundOperatorProvided: false, groundOperatorId: "" },
    ],
  },
  {
    id: "restaurant-3", code: "RES-003", name: "昆明芳呈酒楼", city: "昆明", cuisine: "粤式风味合菜",
    contact: "", phone: "", address: "", remark: "", unit: "personMeal", status: "enabled", prices: [
      { id: "restaurant-price-11", menuName: "粤式风味合菜", unit: "personMeal", price: 50, dinerCount: 10, remark: "", isGroundOperatorProvided: false, groundOperatorId: "" },
      { id: "restaurant-price-12", menuName: "粤式风味合菜", unit: "table", price: 600, dinerCount: 12, remark: "", isGroundOperatorProvided: false, groundOperatorId: "" },
      { id: "restaurant-price-13", menuName: "粤式风味合菜", unit: "table", price: 800, dinerCount: 10, remark: "", isGroundOperatorProvided: false, groundOperatorId: "" },
      { id: "restaurant-price-14", menuName: "粤式风味合菜", unit: "table", price: 1000, dinerCount: 10, remark: "", isGroundOperatorProvided: false, groundOperatorId: "" },
    ],
  },
  {
    id: "restaurant-4", code: "RES-004", name: "昆明万兴建新园", city: "昆明", cuisine: "过桥米线、野生菌火锅",
    contact: "", phone: "", address: "", remark: "", unit: "personMeal", status: "enabled", prices: [
      { id: "restaurant-price-15", menuName: "过桥米线", unit: "personMeal", price: 40, dinerCount: 10, remark: "", isGroundOperatorProvided: false, groundOperatorId: "" },
      { id: "restaurant-price-16", menuName: "过桥米线+汽锅鸡", unit: "personMeal", price: 50, dinerCount: 10, remark: "", isGroundOperatorProvided: false, groundOperatorId: "" },
      { id: "restaurant-price-17", menuName: "过桥米线（汽锅鸡）+野生菌火锅", unit: "personMeal", price: 60, dinerCount: 10, remark: "", isGroundOperatorProvided: false, groundOperatorId: "" },
      { id: "restaurant-price-18", menuName: "野生菌火锅", unit: "table", price: 600, dinerCount: 10, remark: "", isGroundOperatorProvided: false, groundOperatorId: "" },
    ],
  },
  {
    id: "restaurant-5", code: "RES-005", name: "大理六合云燕酒店", city: "大理", cuisine: "中式合菜、白族风味",
    contact: "", phone: "", address: "", remark: "", unit: "personMeal", status: "enabled", prices: [
      { id: "restaurant-price-19", menuName: "中式合菜", unit: "table", price: 400, dinerCount: 10, remark: "", isGroundOperatorProvided: false, groundOperatorId: "" },
      { id: "restaurant-price-20", menuName: "中式合菜/清新养生宴", unit: "table", price: 500, dinerCount: 10, remark: "", isGroundOperatorProvided: false, groundOperatorId: "" },
      { id: "restaurant-price-21", menuName: "中式合菜", unit: "table", price: 800, dinerCount: 10, remark: "", isGroundOperatorProvided: false, groundOperatorId: "" },
    ],
  },
  {
    id: "restaurant-6", code: "RES-006", name: "四方宏源", city: "大理", cuisine: "白族砂锅鱼",
    contact: "", phone: "", address: "", remark: "", unit: "personMeal", status: "enabled", prices: [
      { id: "restaurant-price-22", menuName: "白族风味合菜", unit: "personMeal", price: 50, dinerCount: 10, remark: "另有 13 人桌菜单", isGroundOperatorProvided: false, groundOperatorId: "" },
      { id: "restaurant-price-23", menuName: "白族砂锅鱼风味", unit: "table", price: 400, dinerCount: 10, remark: "", isGroundOperatorProvided: false, groundOperatorId: "" },
      { id: "restaurant-price-24", menuName: "白族砂锅鱼风味", unit: "table", price: 500, dinerCount: 10, remark: "", isGroundOperatorProvided: false, groundOperatorId: "" },
    ],
  },
  {
    id: "restaurant-7", code: "RES-007", name: "丽江小南国", city: "丽江", cuisine: "中式精品合菜",
    contact: "", phone: "", address: "", remark: "", unit: "personMeal", status: "enabled", prices: [
      { id: "restaurant-price-25", menuName: "精品合菜", unit: "table", price: 400, dinerCount: 10, remark: "", isGroundOperatorProvided: false, groundOperatorId: "" },
      { id: "restaurant-price-26", menuName: "精品合菜", unit: "table", price: 500, dinerCount: 10, remark: "", isGroundOperatorProvided: false, groundOperatorId: "" },
      { id: "restaurant-price-27", menuName: "精品合菜", unit: "table", price: 550, dinerCount: 10, remark: "", isGroundOperatorProvided: false, groundOperatorId: "" },
      { id: "restaurant-price-28", menuName: "精品合菜", unit: "table", price: 700, dinerCount: 10, remark: "", isGroundOperatorProvided: false, groundOperatorId: "" },
      { id: "restaurant-price-29", menuName: "精品合菜", unit: "table", price: 800, dinerCount: 10, remark: "4 桌可安排包间", isGroundOperatorProvided: false, groundOperatorId: "" },
      { id: "restaurant-price-30", menuName: "精品合菜", unit: "table", price: 950, dinerCount: 10, remark: "4 桌可安排包间", isGroundOperatorProvided: false, groundOperatorId: "" },
    ],
  },
  {
    id: "restaurant-8", code: "RES-008", name: "桑堆藏宴", city: "香格里拉", cuisine: "土司宴、藏餐",
    contact: "", phone: "", address: "", remark: "含歌舞表演", unit: "personMeal", status: "enabled", prices: [
      { id: "restaurant-price-31", menuName: "土司宴+歌舞表演", unit: "personMeal", price: 50, dinerCount: 10, remark: "", isGroundOperatorProvided: false, groundOperatorId: "" },
      { id: "restaurant-price-32", menuName: "土司宴+歌舞表演", unit: "personMeal", price: 60, dinerCount: 10, remark: "", isGroundOperatorProvided: false, groundOperatorId: "" },
      { id: "restaurant-price-33", menuName: "土司宴+歌舞表演", unit: "personMeal", price: 80, dinerCount: 10, remark: "", isGroundOperatorProvided: false, groundOperatorId: "" },
      { id: "restaurant-price-34", menuName: "土司宴+歌舞表演", unit: "personMeal", price: 100, dinerCount: 10, remark: "", isGroundOperatorProvided: false, groundOperatorId: "" },
    ],
  },
  {
    id: "restaurant-9", code: "RES-009", name: "弥勒食府", city: "弥勒", cuisine: "本地农家菜、卤鸡风味",
    contact: "", phone: "", address: "", remark: "", unit: "personMeal", status: "enabled", prices: [
      { id: "restaurant-price-35", menuName: "本地农家菜卤鸡风味", unit: "personMeal", price: 60, dinerCount: 10, remark: "", isGroundOperatorProvided: false, groundOperatorId: "" },
      { id: "restaurant-price-36", menuName: "本地农家菜卤鸡风味", unit: "personMeal", price: 80, dinerCount: 10, remark: "", isGroundOperatorProvided: false, groundOperatorId: "" },
      { id: "restaurant-price-37", menuName: "本地农家菜卤鸡风味", unit: "table", price: 700, dinerCount: 10, remark: "", isGroundOperatorProvided: false, groundOperatorId: "" },
    ],
  },
  {
    id: "restaurant-10", code: "RES-010", name: "丽江云雪丽餐厅", city: "丽江", cuisine: "纳西风味",
    contact: "和经理", phone: "13800000110", address: "丽江市古城区香格里大道", remark: "团队用餐需提前一天确认", unit: "personMeal", status: "enabled", prices: [
      { id: "restaurant-price-38", menuName: "纳西风味餐", unit: "personMeal", price: 80, dinerCount: 10, remark: "十人起订", isGroundOperatorProvided: true, groundOperatorId: "supplier-2" },
      { id: "restaurant-price-39", menuName: "纳西精品合菜", unit: "table", price: 880, dinerCount: 10, remark: "含一份特色腊排骨", isGroundOperatorProvided: true, groundOperatorId: "supplier-2" },
    ],
  },
  {
    id: "restaurant-11", code: "RES-011", name: "腾冲和顺人家", city: "腾冲", cuisine: "腾冲土锅子",
    contact: "寸经理", phone: "13800000111", address: "腾冲市和顺古镇", remark: "可安排素食菜单", unit: "personMeal", status: "enabled", prices: [
      { id: "restaurant-price-40", menuName: "腾冲土锅子风味餐", unit: "table", price: 680, dinerCount: 10, remark: "标准十人桌", isGroundOperatorProvided: false, groundOperatorId: "" },
      { id: "restaurant-price-41", menuName: "腾冲精品风味餐", unit: "table", price: 980, dinerCount: 10, remark: "含大救驾和铜瓢牛肉", isGroundOperatorProvided: false, groundOperatorId: "" },
    ],
  },
  {
    id: "restaurant-12", code: "RES-012", name: "版纳傣味园", city: "景洪", cuisine: "傣族风味",
    contact: "玉经理", phone: "13800000112", address: "景洪市勐泐大道", remark: "户外区域雨天不开放", unit: "personMeal", status: "disabled", prices: [
      { id: "restaurant-price-42", menuName: "傣味孔雀宴", unit: "table", price: 780, dinerCount: 10, remark: "含香茅草烤鱼", isGroundOperatorProvided: true, groundOperatorId: "supplier-3" },
    ],
  },
];

const RESTAURANT_DISH_DETAILS: Record<string, string> = {
  "restaurant-price-1": "锅底：土鸡野菌汤；菌类：乳牛肝菌、铜绿菌、海鲜菇、虫草花、木耳、鸡油菌、美人菇（视实际情况而定）；荤菜：土鸡肉、土猪肉两份、鸭脯肉、肉皮；蔬菜：土豆、豆芽、小白菜、小苦菜、莲花白、金白菜（视实际情况而定）；主食/面点：官渡粑粑、米饭、面条；酒水：2瓶啤酒1瓶饮料",
  "restaurant-price-2": "锅底：土鸡野菌汤；菌类：竹荪、牛肝菌、鸡松茸、鸡油菌、海鲜菇、虫草花、木耳、美人菇（视实际情况而定）；荤菜：土鸡肉、鸭脯肉、土猪肉两份、肉皮、蛋饺；熟食配菜：现炸小酥肉、煎蛋饼；蔬菜：土豆、豆芽、莲花白、小白菜、小苦菜、金白菜（视实际情况而定）；主食/面点：翡翠小笼包、米饭、面条；甜品/水果：果盘；酒水：2瓶啤酒1瓶饮料",
  "restaurant-price-3": "锅底：土鸡野菌汤；菌类：牛肝菌、鸡松茸、铜绿菌、竹荪、鸡油黄、虫草花、海鲜菇、木耳、美人菇（视实际情况而定）；荤菜：土鸡肉、土猪肉两份、肉皮、蛋饺；熟食配菜：小炸酥肉、茶树菇煸肉丝、风味凉白肉、凉拌黄瓜拌木耳；蔬菜：土豆、豆芽、莲花白、小白菜、小苦菜、金白菜（视实际情况而定）；主食/面点：翡翠小笼包、米饭、面条；甜品/水果：果盘；酒水：2瓶啤酒1瓶饮料",
  "restaurant-price-4": "锅底：土鸡野菌汤；菌类：鸡松茸、牛肝菌、竹荪、铜绿菌、鸡油黄、虫草花、海鲜菇、乳牛肝菌、美人菇、茶树菇（视实际情况而定）；荤菜：鸡肉、五花肉两份、鸭脯肉、蛋饺；熟食配菜：小炸酥肉、文武双全、赛鸡枞煸肉丝、小木耳拌黄瓜；蔬菜：土豆、豆芽、莲花白、小白菜、小苦菜（视实际情况而定）；主食/面点：翡翠小笼包、牛肝菌炒饭、面条；甜品/水果：果盘；酒水：2瓶啤酒1瓶饮料",
  "restaurant-price-5": "锅底：土鸡野菌汤；菌类：松茸、牛肝菌、竹荪、铜绿菌、鸡油黄、虫草花、茶树菇、海鲜菇、包谷菌、美人菇（视实际情况而定）；荤菜：土鸡肉、宣威火腿、土猪肉片两份、蛋饺；蔬菜：土豆、豆芽、莲花白、小白菜、小苦菜、金白菜（视实际情况而定）；主食/面点：翡翠小笼包、米饭、面条；配菜：文武双全、清真鲈鱼、赛鸡枞煸肉丝、黄瓜拌木耳；甜品/水果：果盘；酒水：2瓶啤酒1瓶饮料",
  "restaurant-price-6": "正荤：宣威小炒肉、千张肉；串荤：洋芋黄焖鸡、榨菜肉丝、白参炒蛋、油豆腐焖鸭；素菜：干椒洋芋片、素炒时蔬、鸡枞凉米线、凉拌木耳、蜜汁南瓜；高汤：紫菜汤；主食/面点：米饭；酒水：2瓶啤酒1瓶饮料",
  "restaurant-price-7": "正荤：孔雀开屏鱼、彝乡烤肉、飘香鸡、千张肉；串荤：土司茶香鸭、清笋炒肉片；素菜：干椒洋芋片、白灼菜心；高汤：三鲜汤；主食/面点：蒸小馒头；酒水：2瓶啤酒1瓶饮料+果盘",
  "restaurant-price-8": "正荤：沐王椒香鸡、红烧鱼块、汽锅蒸肉饼；串荤：土司茶香鸭、小炒肉；素菜：菊花香碗、风花雪月、云南汉堡、田园时蔬、蜜汁扣南瓜、素炒时蔬；高汤：紫菜蛋花汤；主食/面点：米饭、小馒头；甜品/水果：果盘；酒水：2瓶啤酒1瓶饮料",
  "restaurant-price-9": "正荤：孔雀开屏鱼、彝乡烤肉、千张肉；串荤：土司茶香鸭；素菜：番茄炒蛋、田园时蔬、云岭马帮菜、白灼菜心、鸡油菌拌螺旋藻、白族乳扇；高汤：云南汽锅鸡；主食/面点：鸡枞凉米线、米饭、蒸小馒头；甜品/水果：果盘；酒水：2瓶啤酒1瓶饮料",
  "restaurant-price-10": "正荤：红烧全鱼、香脆叉烧骨、彝乡烤肉；串荤：土司茶香鸭、花菜炒腊肉、土司香芋煲、宣威小炒肉；素菜：藕香糯米丸、爆炒笋尖、青椒炒鸡油菌、白灼菜心、云岭马帮菜；高汤：虫草花汽锅鸡；主食/面点：米饭；甜品/水果：果盘；酒水：2瓶啤酒1瓶饮料",
  "restaurant-price-11": "正荤：椒盐围虾、烤鸡、秘制叉烧、红烧黄花鱼；串荤：五柳炸蛋、梅菜扣肉；素菜：咸鱼茄子煲、锅仔煮山珍、时令蔬菜、素炒娃娃菜；高汤：海贝冬瓜汤；主食/面点：米饭；酒水：2瓶啤酒1瓶饮料",
  "restaurant-price-12": "正荤：烤鸡、秘制叉烧、红烧黄花鱼、茶香虾；串荤：菠萝咕噜肉、铁板鲜鱿、五柳炸蛋、农家小炒肉；素菜：锅仔煮山珍、咸鱼茄子、健康素小炒、蒜蓉炒时蔬；汤：三鲜汤；主食/面点：米饭；饮料：2瓶啤酒1瓶饮料",
  "restaurant-price-13": "正荤：白灼围虾、卤水拼盘、蜜汁叉烧、烤鸡、清蒸鲈鱼、广式咕噜肉；串荤：芙蓉蒸东海小鲜、蒜蓉粉丝蒸扇贝、梅菜扣肉；素菜：健康素小炒、锅仔杂菌、素炒时蔬、蒜蓉炒时蔬；汤：味菜海贝汤；主食/面点：米饭；饮料：2瓶啤酒1瓶饮料",
  "restaurant-price-14": "正荤：金牌烧鹅或盐焗鸡、蜜汁叉烧、清蒸多宝鱼、白灼海虾、广式咕噜肉；串荤：红腰豆烩鲍鱼、铁板大鲜鱿、芙蓉蒸东海小鲜、梅菜扣肉；素菜：锅仔煮杂菌、健康素小炒、蒜蓉炒时蔬；汤：老火例汤；主食/面点：流沙包、米饭；饮料：2瓶啤酒1瓶饮料",
  "restaurant-price-15": "特菜：过桥米线、汽锅鸡汤；正荤：清真鲈鱼、糖醋里脊；素菜：白灼菜心；主食/面点：黄金大饼、鸡蛋饼、米饭；饮料：2瓶啤酒1瓶饮料",
  "restaurant-price-16": "特菜：过桥米线每人一份、汽锅鸡每人一份；正荤：梅菜扣肉、哈尼肉末、香辣扇子骨；蔬菜：黄瓜拌木耳、鸡蛋饼；酒水：2瓶啤酒1瓶饮料",
  "restaurant-price-17": "特菜：过桥米线一套（带汽锅鸡）；锅底：土鸡汤；主菜：扫把菌、鸡油菌、奶浆菌、茶树菇、牛肝菌、鹿茸菇、老人头菌菇；热菜：手撕扇子骨、梅菜扣肉、鸡蛋饼、素炒菜心；蔬菜：小白菜、包浆豆腐、生菜、金针菇；主食/面点：黄金大饼、黄金馒头、米饭；饮料：2瓶啤酒、酸梅汤一壶",
  "restaurant-price-18": "锅底：土鸡汤；主菜：扫把菌、鸡油菌、奶浆菌、茶树菇、牛肝菌、鹿茸菇、老人头菌菇；热菜：手撕扇子骨、梅菜扣肉、鸡蛋饼、素炒菜心；蔬菜：小白菜、包浆豆腐、生菜、金针菇；主食/面点：黄金大饼、黄金馒头、米饭；饮料：酸梅汤一壶",
  "restaurant-price-19": "正荤：酱油鸡、香菠咕噜肉、红烧洱海鱼；串荤：石榴花炒肉、白参芙蓉蛋、云腿西兰花、潮式卤水拼；素菜：蘸酱黄瓜、清炒菜心、火丝茉莉花；高汤：白菜豆腐汤；主食/面点：面点一份；甜品/水果：果盘；酒水：2瓶啤酒1瓶饮料",
  "restaurant-price-20": "正荤：白族砂锅鱼、椒盐鹅脯肉、北京烤鸭；串荤：柠檬手撕鸡、韭香洱海虾、玫瑰花煎蛋饼、诺邓火腿炒双花；素菜：桃仁拌野生黑木耳、养生乳扇卷、白灼凤尾；高汤：海菜芋头汤；主食/面点：米饭、奶油小馒头；甜品/水果：果盘；酒水：2瓶啤酒1瓶饮料",
  "restaurant-price-21": "正荤：黄贡椒酱蒸昌鱼、蜜汁叉烧、白家药卤小麻鸭、双味雁鹅脯；串荤：诺邓火腿蒸乳饼、XO酱炒三丝；素菜：风味手剥笋、大丰收、金蒜灼芥兰、香煎松茸、上汤海菜；高汤：滇重楼炖土鸡；主食/面点：米饭、奶油小馒头；甜品/水果：果盘；酒水：2瓶啤酒1瓶饮料",
  "restaurant-price-22": "正荤：红烧鱼、香烹鸡、普洱茶虾、糖醋排骨、酱香肉；串荤：红烧肉圆子、杏鲍菇炒肉；素菜：鲜花煎蛋、香菇京白菜；高汤：海菜芋头汤；主食/面点：鸡丝米线、米饭；饮料：2瓶啤酒1瓶饮料",
  "restaurant-price-23": "正荤：大理砂锅鱼、农家小炒肉、酱香肉；串荤：韭菜炒虾、糖醋茄盒、鲜花蛋饼；素菜：麻婆豆腐、蘸酱黄瓜、白家拼盘、水晶南瓜；汤菜：青菜豆米汤；主食/面点：米饭；饮料：2瓶啤酒1瓶饮料",
  "restaurant-price-24": "特菜：大理风味砂锅鱼；正荤：药膳汽锅鸡、铁板里脊肉、蒜香排骨、雕梅扣肉、白灼大虾；串荤：鱼香肉丝、云腿炒芥兰；素菜：炸双拼、香菇扒菜心、蒜泥菠菜、茉莉花煎蛋饼；高汤：海菜汤；主食/面点：小花卷、米饭；甜品/水果：果盘；饮料：2瓶啤酒1瓶饮料",
  "restaurant-price-25": "正荤：外婆猪肘、椒香豉油鸡、秘制烤鸭；串荤：回锅肉、小炒肉；素菜：香芋煲、茄角之恋、白灼菜心；汤品：绿叶青菜汤；主食/面点：米饭；甜品/水果：水果；饮料：2瓶啤酒1瓶饮料",
  "restaurant-price-26": "正荤：秘制烤鸭、清蒸鲈鱼、纳西烤肉；串荤：木耳小炒肉、腊味炒土豆；素菜：菌香豆腐、手撕包菜、白灼菜心、炒绿叶蔬菜；汤品：老火靓汤；主食/面点：米饭；甜品/水果：水果拼盘；酒水：2瓶啤酒1瓶饮料",
  "restaurant-price-27": "正荤：纳西烤肉、豉汁蒸鲈鱼、椒香豉油鸡、外婆红烧肉；串荤：水煮肉片、菌香蒸水蛋、鱼香肉丝；素菜：木耳拌黄瓜、茄角之恋、芋儿娃娃菜；汤品：养生肉丸汤；主食/面点：丽江水焖粑粑、米饭；甜品/水果：水果；饮料：2瓶啤酒1瓶饮料",
  "restaurant-price-28": "正荤：清蒸鲈鱼、蜜汁叉烧、宜良松毛烤鸭、红烧蹄膀、纳西脆皮烤肉；串荤：菌香豉油鸡、蒜蓉粉丝开边虾；素菜：羊肚菌炒山药、丽江五彩洋芋、腊肉炒有机花菜、蚝油西兰花；汤品：老火靓汤；主食/面点：银丝卷、米饭；甜品/水果：水果；饮料：2瓶啤酒1瓶饮料",
  "restaurant-price-29": "正荤：卤水三拼、白切鸡、清蒸雪山鱼、盐水虾；串荤：红油顺风、椒香腊排骨、蒜苗炒肉、外婆红烧肉；素菜：蔬菜沙拉、什锦海蜇、野生青刺果尖、茄角之恋、炒绿叶蔬菜；高汤：藕炖排骨汤；主食/面点：丽江水焖粑粑、米饭；甜品/水果：水果拼盘；饮料：2瓶啤酒1扎海棠果汁",
  "restaurant-price-30": "正荤：清蒸桂鱼、飘香鸡、鲍汁红豆鲍鱼、避风塘松板肉、椒香扇子骨、红烧狮子头；串荤：卤水三拼、蒜蓉粉丝开边虾、腊味炒黄笋；素菜：七彩蔬菜沙拉、白灼菜心；高汤：老火靓汤；主食/面点：米饭、红糖枣糕；甜品/水果：水果拼盘；饮料：2瓶啤酒1扎海棠果汁",
  "restaurant-price-31": "锅底：每人一份高汤小火锅；荤菜配菜：新鲜现切藏香猪肉、藏香猪坨坨肉、藏香猪肉卷、小酥肉、烤藏香鸡；蔬菜配菜：青稞粉条、西红柿、豆腐皮、高原青菜、高原白菜、高原土豆、粉丝；主食/面点：青稞粑粑、火锅面；酒水：酥油茶、青稞酒、矿泉水",
  "restaurant-price-32": "锅底：每人一份高汤小火锅；荤菜配菜：新鲜现切藏香猪肉、藏香猪坨坨肉、藏香猪肉卷、小酥肉、烤藏香鸡；蔬菜配菜：青稞粉条、西红柿、豆腐皮、高原青菜、高原白菜、高原土豆、粉丝；主食/面点：青稞粑粑、火锅面；甜品/水果：果盘；酒水：酥油茶、青稞酒、矿泉水",
  "restaurant-price-33": "锅底：每人一份高汤小火锅；荤菜配菜：新鲜现切藏香猪肉、藏香猪坨坨肉、烤藏香猪、藏香猪肉卷、小酥肉、烤藏香鸡；蔬菜配菜：青稞粉条、西红柿、豆腐皮、高原青菜、高原白菜、高原土豆、粉丝；主食/面点：青稞粑粑、火锅面；甜品/水果：果盘；酒水：酥油茶、青稞酒、矿泉水",
  "restaurant-price-34": "锅底：每人一份高汤小火锅；荤菜配菜：新鲜现切藏香猪肉、藏香猪坨坨肉、烤藏香猪、藏香猪肉卷、小酥肉、烤藏香鸡；蔬菜配菜：青稞粉条、西红柿、豆腐皮、高原青菜、高原白菜、高原土豆、粉丝；主食/面点：青稞粑粑、火锅面；甜品/水果：果盘；酒水：酥油茶、青稞酒、矿泉水",
  "restaurant-price-35": "正荤：弥勒卤鸡、金汤鱼片、炸排骨、红酒烤肉；串荤：蒜蓉粉丝开边虾、板栗红烧肉、百合蒸肉饼；素菜：紫金花老奶洋芋、白灼菜心、铁板豆腐、凉卷粉、花生炒南瓜尖；汤：鸡汤萝卜；主食/面点：蒸银丝卷；甜品/水果：水果盘；饮料：1瓶可乐、2瓶风花雪月啤酒",
  "restaurant-price-36": "正荤：弥勒卤鸡、清蒸鲈鱼、红酒烤肉、东坡全肘；串荤：板栗红烧肉、蒜蓉粉丝开边虾、羊肚菌炖排骨、鲜百合蒸肉饼；素菜：尖椒炒小鸡枞、铁板豆腐、凉卷粉、花生炒南瓜尖、草芽炒绿笋；汤：时蔬汤；主食/面点：蒸银丝卷；甜品/水果：水果盘；饮料：1瓶可乐、2瓶风花雪月啤酒",
  "restaurant-price-37": "正荤：弥勒卤鸡、清蒸鲈鱼、红酒烤肉、东坡全肘；串荤：板栗红烧肉、蒜蓉粉丝开边虾、羊肚菌炖排骨、鲜百合蒸肉饼；素菜：尖椒炒小鸡枞、铁板豆腐、凉卷粉、花生炒南瓜尖、草芽炒绿笋；汤：时蔬汤；主食/面点：蒸银丝卷；甜品/水果：水果盘；饮料：1瓶可乐、2瓶风花雪月啤酒",
};

restaurants.forEach((restaurant) => restaurant.prices.forEach((price) => {
  price.dishDetails = RESTAURANT_DISH_DETAILS[price.id] ?? "";
}));

/** 导游信息原型数据；证件照片仅保存前端本地预览地址。 */
export const guides: GuideRecord[] = [
  {
    id: "guide-1", code: "GDE-001", certificateNo: "ND04499G", name: "刘晓燕", gender: "male", age: 44,
    languages: ["中文"], employmentType: "full-time", identityNumber: "530103198206021515", phone: "13078771077",
    dailyPrice: 600, unit: "guideDay", hasLaborContract: true, isGroundOperatorProvided: false, groundOperatorId: "", licensePhotoUrl: "", remark: "", status: "enabled",
  },
  {
    id: "guide-2", code: "GDE-002", certificateNo: "YH45374S", name: "陈其霞", gender: "female", age: 39,
    languages: ["英文"], employmentType: "full-time", identityNumber: "500225198610231926", phone: "13211601119",
    dailyPrice: 800, unit: "guideDay", hasLaborContract: true, isGroundOperatorProvided: false, groundOperatorId: "", licensePhotoUrl: "", remark: "", status: "enabled",
  },
  {
    id: "guide-3", code: "GDE-003", certificateNo: "KOA2050L", name: "黄雪璇", gender: "male", age: 34,
    languages: ["中文"], employmentType: "full-time", identityNumber: "530102199201130016", phone: "18669119205",
    dailyPrice: 600, unit: "guideDay", hasLaborContract: true, isGroundOperatorProvided: false, groundOperatorId: "", licensePhotoUrl: "", remark: "", status: "enabled",
  },
  {
    id: "guide-4", code: "GDE-004", certificateNo: "YJJ3539H", name: "郑淑君", gender: "female", age: 45,
    languages: ["中文"], employmentType: "full-time", identityNumber: "130702198107170621", phone: "13619699003",
    dailyPrice: 650, unit: "guideDay", hasLaborContract: false, isGroundOperatorProvided: true, groundOperatorId: "supplier-1", licensePhotoUrl: "", remark: "", status: "enabled",
  },
  {
    id: "guide-5", code: "GDE-005", certificateNo: "YN202605", name: "杨晨", gender: "male", age: 31,
    languages: ["中文", "英文"], employmentType: "part-time", identityNumber: "530100199500000005", phone: "13800000205",
    dailyPrice: 900, unit: "guideDay", hasLaborContract: false, isGroundOperatorProvided: true, groundOperatorId: "supplier-2", licensePhotoUrl: "", remark: "擅长丽江、香格里拉线路", status: "enabled",
  },
  {
    id: "guide-6", code: "GDE-006", certificateNo: "YN202606", name: "李思雨", gender: "female", age: 29,
    languages: ["中文", "韩文"], employmentType: "full-time", identityNumber: "530100199700000006", phone: "13800000206",
    dailyPrice: 1000, unit: "guideDay", hasLaborContract: true, isGroundOperatorProvided: false, groundOperatorId: "", licensePhotoUrl: "", remark: "擅长摄影团和亲子团", status: "enabled",
  },
  {
    id: "guide-7", code: "GDE-007", certificateNo: "YN202607", name: "赵文博", gender: "male", age: 38,
    languages: ["中文"], employmentType: "part-time", identityNumber: "530100198800000007", phone: "13800000207",
    dailyPrice: 700, unit: "guideDay", hasLaborContract: false, isGroundOperatorProvided: true, groundOperatorId: "supplier-3", licensePhotoUrl: "", remark: "暂时停止接团", status: "disabled",
  },
];

/** 酒店价格表原型数据；早餐与设施属于酒店资料，不作为报价维度。 */
export const hotels: HotelRecord[] = [
  {
    id: "hotel-1", code: "HTL-001", name: "盘龙温德姆花园", province: "云南省", city: "昆明市", rating: "五星", unit: "roomNight", status: "enabled",
    facilities: "洗衣房、健身房、儿童游乐园（酒店 4 楼）", breakfast: "单标间双早，三人间三早", address: "云南省昆明市北京路1110号",
    phone: "0871-68057777", nearby: "欣都龙城、北辰财富中心、霖雨桥地铁站", roomTypes: [
      { id: "room-1", name: "城景大床/双床房", rackRate: 880, pricePlans: [
        { id: "price-1", periodName: "常规期", startDate: "", endDate: "", individualPrice: 400, groupPrice: 400, unit: "roomNight", minimumRooms: 5, isGroundOperatorProvided: false, groundOperatorId: "" },
        { id: "price-1-ground-operator", periodName: "常规期", startDate: "", endDate: "", individualPrice: 380, groupPrice: 380, unit: "roomNight", minimumRooms: 5, isGroundOperatorProvided: true, groundOperatorId: "supplier-1" },
      ] },
      { id: "room-2", name: "三人间", rackRate: 1080, pricePlans: [{ id: "price-2", periodName: "常规期", startDate: "", endDate: "", individualPrice: 600, groupPrice: 600, unit: "roomNight", minimumRooms: 5, isGroundOperatorProvided: false, groundOperatorId: "" }] },
    ],
  },
  {
    id: "hotel-2", code: "HTL-002", name: "华美达安可", province: "云南省", city: "昆明市", rating: "四星", unit: "roomNight", status: "enabled",
    facilities: "酒店一楼洗衣房", breakfast: "中西式自助早餐", address: "昆明市五华区中铁云时代广场5幢",
    phone: "0871-68127333", nearby: "吾悦广场、宜家、耍街", roomTypes: [
      { id: "room-3", name: "豪华大床/双床房", rackRate: 568, pricePlans: [{ id: "price-3", periodName: "常规期", startDate: "", endDate: "", individualPrice: 428, groupPrice: 200, unit: "roomNight", minimumRooms: 5, isGroundOperatorProvided: false, groundOperatorId: "" }] },
      { id: "room-4", name: "精英大床/双床房", rackRate: 668, pricePlans: [{ id: "price-4", periodName: "常规期", startDate: "", endDate: "", individualPrice: 488, groupPrice: 260, unit: "roomNight", minimumRooms: 5, isGroundOperatorProvided: false, groundOperatorId: "" }] },
    ],
  },
  {
    id: "hotel-3", code: "HTL-003", name: "昆明香格里拉 JEN", province: "云南省", city: "昆明市", rating: "五星", unit: "roomNight", status: "enabled",
    facilities: "二楼水疗健身区、三楼宴会厅", breakfast: "一楼 OpenHouse", address: "云南省昆明市盘龙区东风东路88号",
    phone: "0871-63639999", nearby: "万象城、恒隆广场、钱王街", roomTypes: [
      { id: "room-5", name: "高级大床/双床房", rackRate: 892, pricePlans: [{ id: "price-5", periodName: "常规期", startDate: "", endDate: "", individualPrice: 750, groupPrice: 600, unit: "roomNight", minimumRooms: 5, isGroundOperatorProvided: false, groundOperatorId: "" }] },
    ],
  },
  {
    id: "hotel-4", code: "HTL-004", name: "大理洱海天域英迪格", province: "云南省", city: "大理市", rating: "五星", unit: "roomNight", status: "enabled",
    facilities: "恒温泳池、健身房、湖景露台", breakfast: "双人自助早餐", address: "大理市下关滨海大道015号",
    phone: "0872-2222222", nearby: "洱海公园、大理港", roomTypes: [
      { id: "room-6", name: "洱海景观房", rackRate: 1288, pricePlans: [
        { id: "price-6", periodName: "常规期", startDate: "2026-09-01", endDate: "2026-12-20", individualPrice: 880, groupPrice: 760, unit: "roomNight", minimumRooms: 5, isGroundOperatorProvided: false, groundOperatorId: "" },
        { id: "price-7", periodName: "国庆旺季", startDate: "2026-10-01", endDate: "2026-10-07", individualPrice: 1280, groupPrice: 1180, unit: "roomNight", minimumRooms: 8, isGroundOperatorProvided: true, groundOperatorId: "supplier-1" },
      ] },
    ],
  },
  {
    id: "hotel-5", code: "HTL-005", name: "丽江金茂璞修雪山酒店", province: "云南省", city: "丽江市", rating: "五星", unit: "roomNight", status: "enabled",
    facilities: "雪山观景台、健身房、接驳车", breakfast: "双人早餐", address: "丽江市古城区香江路8号",
    phone: "0888-5311234", nearby: "束河古镇、玉龙雪山景区", roomTypes: [
      { id: "room-7", name: "豪华雪山房", rackRate: 1588, pricePlans: [
        { id: "price-8", periodName: "秋季", startDate: "2026-09-01", endDate: "2026-11-30", individualPrice: 1180, groupPrice: 980, unit: "roomNight", minimumRooms: 5, isGroundOperatorProvided: true, groundOperatorId: "supplier-2" },
      ] },
      { id: "room-8", name: "庭院套房", rackRate: 2188, pricePlans: [
        { id: "price-9", periodName: "秋季", startDate: "2026-09-01", endDate: "2026-11-30", individualPrice: 1680, groupPrice: 1480, unit: "roomNight", minimumRooms: 3, isGroundOperatorProvided: true, groundOperatorId: "supplier-2" },
      ] },
    ],
  },
  {
    id: "hotel-6", code: "HTL-006", name: "腾冲和顺柏联酒店", province: "云南省", city: "腾冲市", rating: "精品", unit: "roomNight", status: "disabled",
    facilities: "温泉、庭院、茶室", breakfast: "双人早餐", address: "腾冲市和顺镇张家坡",
    phone: "0875-5155555", nearby: "和顺古镇、热海景区", roomTypes: [
      { id: "room-9", name: "温泉庭院房", rackRate: 1888, pricePlans: [
        { id: "price-10", periodName: "常规期", startDate: "", endDate: "", individualPrice: 1380, groupPrice: 1200, unit: "roomNight", minimumRooms: 3, isGroundOperatorProvided: false, groundOperatorId: "" },
      ] },
    ],
  },
];

/** 景区门票原型数据；每条价格记录代表一个可售票价项目。 */
export const attractions: AttractionRecord[] = [
  {
    id: "attraction-1", code: "ATT-001", name: "云南民族村", area: "昆明", category: "scenic", unit: "personVisit", status: "enabled",
    restroomLocation: "民族村广场右侧旁", remark: "70周岁以上老人、6周岁以下或1.2米以下儿童免票", prices: [
      { id: "attraction-price-1", itemType: "ticket", itemName: "景区门票", audience: "成人", periodName: "常规期", startDate: "", endDate: "", rackPrice: 80, settlementPrice: 60, unit: "personVisit", isFree: false, priceNote: "", isGroundOperatorProvided: false, groundOperatorId: "" },
      { id: "attraction-price-2", itemType: "ticket", itemName: "景区门票", audience: "老人", periodName: "常规期", startDate: "", endDate: "", rackPrice: 45, settlementPrice: 45, unit: "personVisit", isFree: false, priceNote: "", isGroundOperatorProvided: false, groundOperatorId: "" },
      { id: "attraction-price-3", itemType: "ticket", itemName: "景区门票", audience: "儿童", periodName: "常规期", startDate: "", endDate: "", rackPrice: 45, settlementPrice: 45, unit: "personVisit", isFree: false, priceNote: "", isGroundOperatorProvided: false, groundOperatorId: "" },
      { id: "attraction-price-4", itemType: "transport", itemName: "观光火车", audience: "通用", periodName: "常规期", startDate: "", endDate: "", rackPrice: 0, settlementPrice: 30, unit: "personVisit", isFree: false, priceNote: "原表仅提供结算价", isGroundOperatorProvided: false, groundOperatorId: "" },
    ],
  },
  {
    id: "attraction-2", code: "ATT-002", name: "崇圣寺三塔", area: "大理", category: "scenic", unit: "personVisit", status: "enabled",
    restroomLocation: "景区大门电瓶车乘车处、三塔博物馆旁、崇圣寺正门左侧", remark: "", prices: [
      { id: "attraction-price-5", itemType: "ticket", itemName: "景区门票", audience: "成人", periodName: "常规期", startDate: "", endDate: "", rackPrice: 75, settlementPrice: 60, unit: "personVisit", isFree: false, priceNote: "", isGroundOperatorProvided: false, groundOperatorId: "" },
      { id: "attraction-price-6", itemType: "transport", itemName: "电瓶车", audience: "成人", periodName: "常规期", startDate: "", endDate: "", rackPrice: 35, settlementPrice: 20, unit: "personVisit", isFree: false, priceNote: "", isGroundOperatorProvided: false, groundOperatorId: "" },
      { id: "attraction-price-7", itemType: "ticket", itemName: "景区门票", audience: "老人", periodName: "常规期", startDate: "", endDate: "", rackPrice: 0, settlementPrice: 0, unit: "personVisit", isFree: true, priceNote: "70周岁以上免票", isGroundOperatorProvided: false, groundOperatorId: "" },
      { id: "attraction-price-8", itemType: "ticket", itemName: "景区门票", audience: "儿童", periodName: "常规期", startDate: "", endDate: "", rackPrice: 0, settlementPrice: 0, unit: "personVisit", isFree: true, priceNote: "1.2米以下免票", isGroundOperatorProvided: false, groundOperatorId: "" },
    ],
  },
  {
    id: "attraction-3", code: "ATT-003", name: "洗马潭索道", area: "大理", category: "transport", unit: "personVisit", status: "enabled",
    restroomLocation: "进站口、出站口及观景平台", remark: "原表淡旺季月份存在重叠，暂保留时段名称，待业务确认具体有效日期", prices: [
      { id: "attraction-price-9", itemType: "transport", itemName: "洗马潭索道", audience: "成人", periodName: "旺季", startDate: "", endDate: "", rackPrice: 335, settlementPrice: 320, unit: "personVisit", isFree: false, priceNote: "原表：1-2月、4-10月为旺季", isGroundOperatorProvided: true, groundOperatorId: "supplier-1" },
      { id: "attraction-price-10", itemType: "transport", itemName: "洗马潭索道", audience: "成人", periodName: "淡季", startDate: "", endDate: "", rackPrice: 335, settlementPrice: 260, unit: "personVisit", isFree: false, priceNote: "原表：3月、10月、12月为淡季", isGroundOperatorProvided: false, groundOperatorId: "" },
    ],
  },
  {
    id: "attraction-4", code: "ATT-004", name: "石林风景区", area: "石林", category: "scenic", unit: "personVisit", status: "enabled",
    restroomLocation: "售票处", remark: "", prices: [
      { id: "attraction-price-11", itemType: "ticket", itemName: "景区门票", audience: "成人", periodName: "常规期", startDate: "", endDate: "", rackPrice: 130, settlementPrice: 130, unit: "personVisit", isFree: false, priceNote: "", isGroundOperatorProvided: false, groundOperatorId: "" },
      { id: "attraction-price-12", itemType: "transport", itemName: "观光车", audience: "通用", periodName: "常规期", startDate: "", endDate: "", rackPrice: 25, settlementPrice: 25, unit: "personVisit", isFree: false, priceNote: "", isGroundOperatorProvided: false, groundOperatorId: "" },
    ],
  },
  {
    id: "attraction-5", code: "ATT-005", name: "玉龙雪山景区", area: "丽江", category: "package", unit: "personVisit", status: "enabled",
    restroomLocation: "游客中心、索道站及蓝月谷停车场", remark: "旺季需提前实名预约", prices: [
      { id: "attraction-price-13", itemType: "package", itemName: "进山费及景区车", audience: "成人", periodName: "常规期", startDate: "", endDate: "", rackPrice: 140, settlementPrice: 130, unit: "personVisit", isFree: false, priceNote: "不含索道", isGroundOperatorProvided: false, groundOperatorId: "" },
      { id: "attraction-price-14", itemType: "transport", itemName: "冰川公园大索道", audience: "成人", periodName: "常规期", startDate: "", endDate: "", rackPrice: 140, settlementPrice: 135, unit: "personVisit", isFree: false, priceNote: "实名预约", isGroundOperatorProvided: true, groundOperatorId: "supplier-2" },
    ],
  },
  {
    id: "attraction-6", code: "ATT-006", name: "普达措国家公园", area: "香格里拉", category: "scenic", unit: "personVisit", status: "enabled",
    restroomLocation: "游客中心及各主要停靠站", remark: "高海拔地区，建议准备保暖衣物", prices: [
      { id: "attraction-price-15", itemType: "package", itemName: "门票及观光车", audience: "成人", periodName: "常规期", startDate: "", endDate: "", rackPrice: 168, settlementPrice: 150, unit: "personVisit", isFree: false, priceNote: "", isGroundOperatorProvided: true, groundOperatorId: "supplier-1" },
      { id: "attraction-price-16", itemType: "ticket", itemName: "景区门票", audience: "儿童", periodName: "常规期", startDate: "", endDate: "", rackPrice: 84, settlementPrice: 84, unit: "personVisit", isFree: false, priceNote: "按景区当日政策执行", isGroundOperatorProvided: false, groundOperatorId: "" },
    ],
  },
  {
    id: "attraction-7", code: "ATT-007", name: "腾冲热海景区", area: "腾冲", category: "experience", unit: "personVisit", status: "enabled",
    restroomLocation: "游客中心、大滚锅停车场", remark: "景区内台阶较多", prices: [
      { id: "attraction-price-17", itemType: "ticket", itemName: "景区门票", audience: "成人", periodName: "常规期", startDate: "", endDate: "", rackPrice: 50, settlementPrice: 45, unit: "personVisit", isFree: false, priceNote: "", isGroundOperatorProvided: false, groundOperatorId: "" },
      { id: "attraction-price-18", itemType: "transport", itemName: "景区电瓶车", audience: "通用", periodName: "常规期", startDate: "", endDate: "", rackPrice: 15, settlementPrice: 15, unit: "personVisit", isFree: false, priceNote: "单程", isGroundOperatorProvided: false, groundOperatorId: "" },
    ],
  },
  {
    id: "attraction-8", code: "ATT-008", name: "西双版纳原始森林公园", area: "景洪", category: "scenic", unit: "personVisit", status: "disabled",
    restroomLocation: "游客中心和孔雀放飞区", remark: "价格待重新确认", prices: [
      { id: "attraction-price-19", itemType: "ticket", itemName: "景区门票", audience: "成人", periodName: "常规期", startDate: "", endDate: "", rackPrice: 45, settlementPrice: 40, unit: "personVisit", isFree: false, priceNote: "暂停使用", isGroundOperatorProvided: true, groundOperatorId: "supplier-3" },
    ],
  },
];

/** 旅游资源前端原型数据，按业务实体分开维护。 */
export const tourismResources: Record<TourismResourceType, TourismResourceRecord[]> = {
  agency: [
    { id: "agency-1", code: "AGY-001", name: "新加坡远景旅行社", city: "新加坡", countryOrRegion: "新加坡", contact: "Emily Tan", email: "emily@example.com", phone: "+65 6123 4567", status: "enabled", remark: "东南亚团队客户" },
    { id: "agency-2", code: "AGY-002", name: "Malaysia Star Holidays", city: "吉隆坡", countryOrRegion: "马来西亚", contact: "Jason Lee", email: "jason@example.com", phone: "+60 3-1234 5678", status: "enabled", remark: "摄影团客户" },
    { id: "agency-3", code: "AGY-003", name: "Bangkok Discovery Travel", city: "曼谷", countryOrRegion: "泰国", contact: "Narin Chai", email: "narin@example.com", phone: "+66 2-123-4567", status: "enabled", remark: "小团定制客户" },
    { id: "agency-4", code: "AGY-004", name: "Jakarta Nusantara Tours", city: "雅加达", countryOrRegion: "印度尼西亚", contact: "Ayu Pratama", email: "ayu@example.com", phone: "+62 21 555 0104", status: "enabled", remark: "英文团队客户" },
    { id: "agency-5", code: "AGY-005", name: "Seoul Hanul Travel", city: "首尔", countryOrRegion: "韩国", contact: "Min-jun Park", email: "minjun@example.com", phone: "+82 2-555-0105", status: "enabled", remark: "摄影和文化团队" },
    { id: "agency-6", code: "AGY-006", name: "Taipei Formosa Holidays", city: "台北", countryOrRegion: "中国台湾", contact: "林怡君", email: "yijun@example.com", phone: "+886 2 5550 1060", status: "enabled", remark: "家庭定制团" },
    { id: "agency-7", code: "AGY-007", name: "Hong Kong Evergreen Travel", city: "香港", countryOrRegion: "中国香港", contact: "Kelly Wong", email: "kelly@example.com", phone: "+852 2555 0107", status: "enabled", remark: "亲子和银发团队" },
    { id: "agency-8", code: "AGY-008", name: "Manila Archipelago Travel", city: "马尼拉", countryOrRegion: "菲律宾", contact: "Maria Santos", email: "maria@example.com", phone: "+63 2 8555 0108", status: "disabled", remark: "暂停合作" },
  ],
  supplier: [
    { id: "supplier-1", code: "SUP-001", name: "云南云途地接社", city: "昆明", countryOrRegion: "中国", contact: "李经理", email: "", phone: "13800000001", status: "enabled", remark: "云南线路综合地接社" },
    { id: "supplier-2", code: "SUP-002", name: "滇西北假日地接社", city: "丽江", countryOrRegion: "中国", contact: "和经理", email: "northwest@example.com", phone: "13800000002", status: "enabled", remark: "大理、丽江和香格里拉线路" },
    { id: "supplier-3", code: "SUP-003", name: "版纳风情地接社", city: "景洪", countryOrRegion: "中国", contact: "玉经理", email: "banna@example.com", phone: "13800000003", status: "enabled", remark: "普洱和西双版纳线路" },
  ],
  transport: [
    { id: "transport-1", code: "VEH-001", name: "别克 GL8", city: "昆明", countryOrRegion: "中国", plateNumber: "云A00001", seats: 7, dailyPrice: 1200, unit: "vehicleDay", contact: "赵师傅", email: "", phone: "13800000005", status: "enabled", remark: "商务车" },
    { id: "transport-2", code: "VEH-002", name: "奔驰威霆", city: "昆明", countryOrRegion: "中国", plateNumber: "云A00002", seats: 9, dailyPrice: 1500, unit: "vehicleDay", contact: "周师傅", email: "", phone: "13800000006", status: "enabled", remark: "高端小团用车" },
    { id: "transport-3", code: "VEH-003", name: "丰田考斯特", city: "大理", countryOrRegion: "中国", plateNumber: "云L00003", seats: 19, dailyPrice: 2200, unit: "vehicleDay", contact: "杨师傅", email: "", phone: "13800000007", status: "enabled", remark: "中型团队用车" },
    { id: "transport-4", code: "VEH-004", name: "金龙旅游大巴", city: "丽江", countryOrRegion: "中国", plateNumber: "云P00004", seats: 39, dailyPrice: 3200, unit: "vehicleDay", contact: "木师傅", email: "", phone: "13800000008", status: "enabled", remark: "大型团队用车" },
    { id: "transport-5", code: "VEH-005", name: "江淮瑞风", city: "景洪", countryOrRegion: "中国", plateNumber: "云K00005", seats: 7, dailyPrice: 1000, unit: "vehicleDay", contact: "岩师傅", email: "", phone: "13800000009", status: "disabled", remark: "车辆维护中" },
  ],
};

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
