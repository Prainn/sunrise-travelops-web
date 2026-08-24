import type { AuthUserRecord } from "@/types/auth";
import type { DictItem, DictTypeItem } from "@/types/dictionary";
import { ROLE_ROOT } from "@/constants";

export interface PrototypeUserRecord extends AuthUserRecord {
  nickname: string;
  nicknameKey?: string;
  avatar: string;
  gender: number;
  mobile: string;
  email: string;
  roleIds: number[];
  roleNames: string;
  createTime: string;
  roles: string[];
  perms: string[];
}

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
  "resource:supplier:list",
  "resource:hotel:list",
  "resource:restaurant:list",
  "resource:attraction:list",
  "resource:transport:list",
  "resource:guide:list",
  "inquiry:list",
];

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
    roleIds: [2],
    roleNames: "",
    createTime: "2026-08-19 09:00:00",
    roles: [ROLE_ROOT, "ADMIN"],
    perms: adminPermissions,
  },
  {
    id: "2",
    username: "user",
    password: "123456",
    status: "enabled",
    nickname: "user",
    nicknameKey: "user.seed.demo",
    avatar: "/favicon.ico",
    gender: 0,
    mobile: "",
    email: "demo@sunrise.local",
    roleIds: [3],
    roleNames: "",
    createTime: "2026-08-19 09:10:00",
    roles: ["USER"],
    perms: ["sys:dict:list", "sys:dict-item:list"],
  },
];

/** 仅包含系统运行与界面展示所需的基础分类。 */
export type SystemDictionaryType = DictTypeItem & {
  nameKey?: string;
  remarkKey?: string;
};

export type SystemDictionaryItem = DictItem & {
  labelKey?: string;
};

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

export type TourismResourceType =
  | "supplier"
  | "hotel"
  | "restaurant"
  | "attraction"
  | "transport"
  | "guide";

export interface TourismResourceRecord {
  [key: string]: string | number;
  id: string;
  code: string;
  name: string;
  city: string;
  contact: string;
  phone: string;
  status: "enabled" | "disabled";
  remark: string;
}

export interface HotelPricePlanRecord {
  id: string;
  periodName: string;
  startDate: string;
  endDate: string;
  individualPrice: number;
  groupPrice: number;
  minimumRooms: number;
  isGroundOperatorProvided: boolean;
  groundOperatorId: string;
}

export interface HotelRoomTypeRecord {
  id: string;
  name: string;
  rackRate: number;
  pricePlans: HotelPricePlanRecord[];
}

export interface HotelRecord {
  id: string;
  code: string;
  name: string;
  province: string;
  city: string;
  rating: string;
  facilities: string;
  breakfast: string;
  address: string;
  phone: string;
  nearby: string;
  status: "enabled" | "disabled";
  roomTypes: HotelRoomTypeRecord[];
}

export type AttractionCategory = "scenic" | "performance" | "experience" | "transport" | "package";
export type AttractionPriceItemType = "ticket" | "transport" | "guide" | "activity" | "package";

export interface AttractionPriceRecord {
  id: string;
  itemType: AttractionPriceItemType;
  itemName: string;
  audience: string;
  periodName: string;
  startDate: string;
  endDate: string;
  rackPrice: number;
  settlementPrice: number;
  isFree: boolean;
  priceNote: string;
  isGroundOperatorProvided: boolean;
  groundOperatorId: string;
}

export interface AttractionRecord {
  id: string;
  code: string;
  name: string;
  area: string;
  category: AttractionCategory;
  restroomLocation: string;
  remark: string;
  status: "enabled" | "disabled";
  prices: AttractionPriceRecord[];
}

export type GuideGender = "male" | "female";
export type GuideEmploymentType = "full-time" | "part-time";

export interface GuideRecord {
  id: string;
  code: string;
  certificateNo: string;
  name: string;
  gender: GuideGender;
  age: number;
  languages: string[];
  employmentType: GuideEmploymentType;
  identityNumber: string;
  phone: string;
  hasLaborContract: boolean;
  isGroundOperatorProvided: boolean;
  groundOperatorId: string;
  licensePhotoUrl: string;
  remark: string;
  status: "enabled" | "disabled";
}

export type RestaurantPriceUnit = "per-person" | "per-table";

export interface RestaurantPriceRecord {
  id: string;
  menuName: string;
  dishDetails?: string;
  unit: RestaurantPriceUnit;
  price: number;
  dinerCount: number;
  remark: string;
  isGroundOperatorProvided: boolean;
  groundOperatorId: string;
}

export interface RestaurantRecord {
  id: string;
  code: string;
  name: string;
  city: string;
  cuisine: string;
  contact: string;
  phone: string;
  address: string;
  remark: string;
  status: "enabled" | "disabled";
  prices: RestaurantPriceRecord[];
}

/** 菜单汇总原型数据；100 元及以下按单人餐标，更高价格按整桌报价归类。 */
export const restaurants: RestaurantRecord[] = [
  {
    id: "restaurant-1", code: "RES-001", name: "昆明云天水乡野菌园", city: "昆明", cuisine: "野生菌火锅",
    contact: "", phone: "", address: "", remark: "", status: "enabled", prices: [
      { id: "restaurant-price-1", menuName: "地道野生菌火锅 40", unit: "per-person", price: 40, dinerCount: 10, remark: "另有 8 人桌菜单", isGroundOperatorProvided: false, groundOperatorId: "" },
      { id: "restaurant-price-2", menuName: "地道野生菌火锅 50", unit: "per-person", price: 50, dinerCount: 10, remark: "另有 8 人桌菜单", isGroundOperatorProvided: false, groundOperatorId: "" },
      { id: "restaurant-price-3", menuName: "地道野生菌火锅 60", unit: "per-person", price: 60, dinerCount: 10, remark: "另有 8 人桌菜单", isGroundOperatorProvided: false, groundOperatorId: "" },
      { id: "restaurant-price-4", menuName: "地道野生菌火锅 70", unit: "per-person", price: 70, dinerCount: 10, remark: "另有 8 人桌菜单", isGroundOperatorProvided: false, groundOperatorId: "" },
      { id: "restaurant-price-5", menuName: "地道野生菌火锅 80", unit: "per-person", price: 80, dinerCount: 10, remark: "另有 8 人桌菜单", isGroundOperatorProvided: false, groundOperatorId: "" },
    ],
  },
  {
    id: "restaurant-2", code: "RES-002", name: "云南人家", city: "昆明", cuisine: "云南特色风味宴",
    contact: "", phone: "", address: "", remark: "", status: "enabled", prices: [
      { id: "restaurant-price-6", menuName: "昆明特色风味宴", unit: "per-table", price: 400, dinerCount: 10, remark: "", isGroundOperatorProvided: false, groundOperatorId: "" },
      { id: "restaurant-price-7", menuName: "昆明特色风味宴", unit: "per-table", price: 500, dinerCount: 10, remark: "", isGroundOperatorProvided: false, groundOperatorId: "" },
      { id: "restaurant-price-8", menuName: "九歌寨风味宴", unit: "per-table", price: 650, dinerCount: 10, remark: "", isGroundOperatorProvided: false, groundOperatorId: "" },
      { id: "restaurant-price-9", menuName: "昆明特色风味宴", unit: "per-table", price: 800, dinerCount: 10, remark: "", isGroundOperatorProvided: false, groundOperatorId: "" },
      { id: "restaurant-price-10", menuName: "昆明特色风味宴", unit: "per-table", price: 1000, dinerCount: 10, remark: "", isGroundOperatorProvided: false, groundOperatorId: "" },
    ],
  },
  {
    id: "restaurant-3", code: "RES-003", name: "昆明芳呈酒楼", city: "昆明", cuisine: "粤式风味合菜",
    contact: "", phone: "", address: "", remark: "", status: "enabled", prices: [
      { id: "restaurant-price-11", menuName: "粤式风味合菜", unit: "per-person", price: 50, dinerCount: 10, remark: "", isGroundOperatorProvided: false, groundOperatorId: "" },
      { id: "restaurant-price-12", menuName: "粤式风味合菜", unit: "per-table", price: 600, dinerCount: 12, remark: "", isGroundOperatorProvided: false, groundOperatorId: "" },
      { id: "restaurant-price-13", menuName: "粤式风味合菜", unit: "per-table", price: 800, dinerCount: 10, remark: "", isGroundOperatorProvided: false, groundOperatorId: "" },
      { id: "restaurant-price-14", menuName: "粤式风味合菜", unit: "per-table", price: 1000, dinerCount: 10, remark: "", isGroundOperatorProvided: false, groundOperatorId: "" },
    ],
  },
  {
    id: "restaurant-4", code: "RES-004", name: "昆明万兴建新园", city: "昆明", cuisine: "过桥米线、野生菌火锅",
    contact: "", phone: "", address: "", remark: "", status: "enabled", prices: [
      { id: "restaurant-price-15", menuName: "过桥米线", unit: "per-person", price: 40, dinerCount: 10, remark: "", isGroundOperatorProvided: false, groundOperatorId: "" },
      { id: "restaurant-price-16", menuName: "过桥米线+汽锅鸡", unit: "per-person", price: 50, dinerCount: 10, remark: "", isGroundOperatorProvided: false, groundOperatorId: "" },
      { id: "restaurant-price-17", menuName: "过桥米线（汽锅鸡）+野生菌火锅", unit: "per-person", price: 60, dinerCount: 10, remark: "", isGroundOperatorProvided: false, groundOperatorId: "" },
      { id: "restaurant-price-18", menuName: "野生菌火锅", unit: "per-table", price: 600, dinerCount: 10, remark: "", isGroundOperatorProvided: false, groundOperatorId: "" },
    ],
  },
  {
    id: "restaurant-5", code: "RES-005", name: "大理六合云燕酒店", city: "大理", cuisine: "中式合菜、白族风味",
    contact: "", phone: "", address: "", remark: "", status: "enabled", prices: [
      { id: "restaurant-price-19", menuName: "中式合菜", unit: "per-table", price: 400, dinerCount: 10, remark: "", isGroundOperatorProvided: false, groundOperatorId: "" },
      { id: "restaurant-price-20", menuName: "中式合菜/清新养生宴", unit: "per-table", price: 500, dinerCount: 10, remark: "", isGroundOperatorProvided: false, groundOperatorId: "" },
      { id: "restaurant-price-21", menuName: "中式合菜", unit: "per-table", price: 800, dinerCount: 10, remark: "", isGroundOperatorProvided: false, groundOperatorId: "" },
    ],
  },
  {
    id: "restaurant-6", code: "RES-006", name: "四方宏源", city: "大理", cuisine: "白族砂锅鱼",
    contact: "", phone: "", address: "", remark: "", status: "enabled", prices: [
      { id: "restaurant-price-22", menuName: "白族风味合菜", unit: "per-person", price: 50, dinerCount: 10, remark: "另有 13 人桌菜单", isGroundOperatorProvided: false, groundOperatorId: "" },
      { id: "restaurant-price-23", menuName: "白族砂锅鱼风味", unit: "per-table", price: 400, dinerCount: 10, remark: "", isGroundOperatorProvided: false, groundOperatorId: "" },
      { id: "restaurant-price-24", menuName: "白族砂锅鱼风味", unit: "per-table", price: 500, dinerCount: 10, remark: "", isGroundOperatorProvided: false, groundOperatorId: "" },
    ],
  },
  {
    id: "restaurant-7", code: "RES-007", name: "丽江小南国", city: "丽江", cuisine: "中式精品合菜",
    contact: "", phone: "", address: "", remark: "", status: "enabled", prices: [
      { id: "restaurant-price-25", menuName: "精品合菜", unit: "per-table", price: 400, dinerCount: 10, remark: "", isGroundOperatorProvided: false, groundOperatorId: "" },
      { id: "restaurant-price-26", menuName: "精品合菜", unit: "per-table", price: 500, dinerCount: 10, remark: "", isGroundOperatorProvided: false, groundOperatorId: "" },
      { id: "restaurant-price-27", menuName: "精品合菜", unit: "per-table", price: 550, dinerCount: 10, remark: "", isGroundOperatorProvided: false, groundOperatorId: "" },
      { id: "restaurant-price-28", menuName: "精品合菜", unit: "per-table", price: 700, dinerCount: 10, remark: "", isGroundOperatorProvided: false, groundOperatorId: "" },
      { id: "restaurant-price-29", menuName: "精品合菜", unit: "per-table", price: 800, dinerCount: 10, remark: "4 桌可安排包间", isGroundOperatorProvided: false, groundOperatorId: "" },
      { id: "restaurant-price-30", menuName: "精品合菜", unit: "per-table", price: 950, dinerCount: 10, remark: "4 桌可安排包间", isGroundOperatorProvided: false, groundOperatorId: "" },
    ],
  },
  {
    id: "restaurant-8", code: "RES-008", name: "桑堆藏宴", city: "香格里拉", cuisine: "土司宴、藏餐",
    contact: "", phone: "", address: "", remark: "含歌舞表演", status: "enabled", prices: [
      { id: "restaurant-price-31", menuName: "土司宴+歌舞表演", unit: "per-person", price: 50, dinerCount: 10, remark: "", isGroundOperatorProvided: false, groundOperatorId: "" },
      { id: "restaurant-price-32", menuName: "土司宴+歌舞表演", unit: "per-person", price: 60, dinerCount: 10, remark: "", isGroundOperatorProvided: false, groundOperatorId: "" },
      { id: "restaurant-price-33", menuName: "土司宴+歌舞表演", unit: "per-person", price: 80, dinerCount: 10, remark: "", isGroundOperatorProvided: false, groundOperatorId: "" },
      { id: "restaurant-price-34", menuName: "土司宴+歌舞表演", unit: "per-person", price: 100, dinerCount: 10, remark: "", isGroundOperatorProvided: false, groundOperatorId: "" },
    ],
  },
  {
    id: "restaurant-9", code: "RES-009", name: "弥勒食府", city: "弥勒", cuisine: "本地农家菜、卤鸡风味",
    contact: "", phone: "", address: "", remark: "", status: "enabled", prices: [
      { id: "restaurant-price-35", menuName: "本地农家菜卤鸡风味", unit: "per-person", price: 60, dinerCount: 10, remark: "", isGroundOperatorProvided: false, groundOperatorId: "" },
      { id: "restaurant-price-36", menuName: "本地农家菜卤鸡风味", unit: "per-person", price: 80, dinerCount: 10, remark: "", isGroundOperatorProvided: false, groundOperatorId: "" },
      { id: "restaurant-price-37", menuName: "本地农家菜卤鸡风味", unit: "per-table", price: 700, dinerCount: 10, remark: "", isGroundOperatorProvided: false, groundOperatorId: "" },
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
    hasLaborContract: true, isGroundOperatorProvided: false, groundOperatorId: "", licensePhotoUrl: "", remark: "", status: "enabled",
  },
  {
    id: "guide-2", code: "GDE-002", certificateNo: "YH45374S", name: "陈其霞", gender: "female", age: 39,
    languages: ["英文"], employmentType: "full-time", identityNumber: "500225198610231926", phone: "13211601119",
    hasLaborContract: true, isGroundOperatorProvided: false, groundOperatorId: "", licensePhotoUrl: "", remark: "", status: "enabled",
  },
  {
    id: "guide-3", code: "GDE-003", certificateNo: "KOA2050L", name: "黄雪璇", gender: "male", age: 34,
    languages: ["中文"], employmentType: "full-time", identityNumber: "530102199201130016", phone: "18669119205",
    hasLaborContract: true, isGroundOperatorProvided: false, groundOperatorId: "", licensePhotoUrl: "", remark: "", status: "enabled",
  },
  {
    id: "guide-4", code: "GDE-004", certificateNo: "YJJ3539H", name: "郑淑君", gender: "female", age: 45,
    languages: ["中文"], employmentType: "full-time", identityNumber: "130702198107170621", phone: "13619699003",
    hasLaborContract: false, isGroundOperatorProvided: true, groundOperatorId: "supplier-1", licensePhotoUrl: "", remark: "", status: "enabled",
  },
];

/** 酒店价格表原型数据；早餐与设施属于酒店资料，不作为报价维度。 */
export const hotels: HotelRecord[] = [
  {
    id: "hotel-1", code: "HTL-001", name: "盘龙温德姆花园", province: "云南省", city: "昆明市", rating: "五星", status: "enabled",
    facilities: "洗衣房、健身房、儿童游乐园（酒店 4 楼）", breakfast: "单标间双早，三人间三早", address: "云南省昆明市北京路1110号",
    phone: "0871-68057777", nearby: "欣都龙城、北辰财富中心、霖雨桥地铁站", roomTypes: [
      { id: "room-1", name: "城景大床/双床房", rackRate: 880, pricePlans: [
        { id: "price-1", periodName: "常规期", startDate: "", endDate: "", individualPrice: 400, groupPrice: 400, minimumRooms: 5, isGroundOperatorProvided: false, groundOperatorId: "" },
        { id: "price-1-ground-operator", periodName: "常规期", startDate: "", endDate: "", individualPrice: 380, groupPrice: 380, minimumRooms: 5, isGroundOperatorProvided: true, groundOperatorId: "supplier-1" },
      ] },
      { id: "room-2", name: "三人间", rackRate: 1080, pricePlans: [{ id: "price-2", periodName: "常规期", startDate: "", endDate: "", individualPrice: 600, groupPrice: 600, minimumRooms: 5, isGroundOperatorProvided: false, groundOperatorId: "" }] },
    ],
  },
  {
    id: "hotel-2", code: "HTL-002", name: "华美达安可", province: "云南省", city: "昆明市", rating: "四星", status: "enabled",
    facilities: "酒店一楼洗衣房", breakfast: "中西式自助早餐", address: "昆明市五华区中铁云时代广场5幢",
    phone: "0871-68127333", nearby: "吾悦广场、宜家、耍街", roomTypes: [
      { id: "room-3", name: "豪华大床/双床房", rackRate: 568, pricePlans: [{ id: "price-3", periodName: "常规期", startDate: "", endDate: "", individualPrice: 428, groupPrice: 200, minimumRooms: 5, isGroundOperatorProvided: false, groundOperatorId: "" }] },
      { id: "room-4", name: "精英大床/双床房", rackRate: 668, pricePlans: [{ id: "price-4", periodName: "常规期", startDate: "", endDate: "", individualPrice: 488, groupPrice: 260, minimumRooms: 5, isGroundOperatorProvided: false, groundOperatorId: "" }] },
    ],
  },
  {
    id: "hotel-3", code: "HTL-003", name: "昆明香格里拉 JEN", province: "云南省", city: "昆明市", rating: "五星", status: "enabled",
    facilities: "二楼水疗健身区、三楼宴会厅", breakfast: "一楼 OpenHouse", address: "云南省昆明市盘龙区东风东路88号",
    phone: "0871-63639999", nearby: "万象城、恒隆广场、钱王街", roomTypes: [
      { id: "room-5", name: "高级大床/双床房", rackRate: 892, pricePlans: [{ id: "price-5", periodName: "常规期", startDate: "", endDate: "", individualPrice: 750, groupPrice: 600, minimumRooms: 5, isGroundOperatorProvided: false, groundOperatorId: "" }] },
    ],
  },
];

/** 景区门票原型数据；每条价格记录代表一个可售票价项目。 */
export const attractions: AttractionRecord[] = [
  {
    id: "attraction-1", code: "ATT-001", name: "云南民族村", area: "昆明", category: "scenic", status: "enabled",
    restroomLocation: "民族村广场右侧旁", remark: "70周岁以上老人、6周岁以下或1.2米以下儿童免票", prices: [
      { id: "attraction-price-1", itemType: "ticket", itemName: "景区门票", audience: "成人", periodName: "常规期", startDate: "", endDate: "", rackPrice: 80, settlementPrice: 60, isFree: false, priceNote: "", isGroundOperatorProvided: false, groundOperatorId: "" },
      { id: "attraction-price-2", itemType: "ticket", itemName: "景区门票", audience: "老人", periodName: "常规期", startDate: "", endDate: "", rackPrice: 45, settlementPrice: 45, isFree: false, priceNote: "", isGroundOperatorProvided: false, groundOperatorId: "" },
      { id: "attraction-price-3", itemType: "ticket", itemName: "景区门票", audience: "儿童", periodName: "常规期", startDate: "", endDate: "", rackPrice: 45, settlementPrice: 45, isFree: false, priceNote: "", isGroundOperatorProvided: false, groundOperatorId: "" },
      { id: "attraction-price-4", itemType: "transport", itemName: "观光火车", audience: "通用", periodName: "常规期", startDate: "", endDate: "", rackPrice: 0, settlementPrice: 30, isFree: false, priceNote: "原表仅提供结算价", isGroundOperatorProvided: false, groundOperatorId: "" },
    ],
  },
  {
    id: "attraction-2", code: "ATT-002", name: "崇圣寺三塔", area: "大理", category: "scenic", status: "enabled",
    restroomLocation: "景区大门电瓶车乘车处、三塔博物馆旁、崇圣寺正门左侧", remark: "", prices: [
      { id: "attraction-price-5", itemType: "ticket", itemName: "景区门票", audience: "成人", periodName: "常规期", startDate: "", endDate: "", rackPrice: 75, settlementPrice: 60, isFree: false, priceNote: "", isGroundOperatorProvided: false, groundOperatorId: "" },
      { id: "attraction-price-6", itemType: "transport", itemName: "电瓶车", audience: "成人", periodName: "常规期", startDate: "", endDate: "", rackPrice: 35, settlementPrice: 20, isFree: false, priceNote: "", isGroundOperatorProvided: false, groundOperatorId: "" },
      { id: "attraction-price-7", itemType: "ticket", itemName: "景区门票", audience: "老人", periodName: "常规期", startDate: "", endDate: "", rackPrice: 0, settlementPrice: 0, isFree: true, priceNote: "70周岁以上免票", isGroundOperatorProvided: false, groundOperatorId: "" },
      { id: "attraction-price-8", itemType: "ticket", itemName: "景区门票", audience: "儿童", periodName: "常规期", startDate: "", endDate: "", rackPrice: 0, settlementPrice: 0, isFree: true, priceNote: "1.2米以下免票", isGroundOperatorProvided: false, groundOperatorId: "" },
    ],
  },
  {
    id: "attraction-3", code: "ATT-003", name: "洗马潭索道", area: "大理", category: "transport", status: "enabled",
    restroomLocation: "进站口、出站口及观景平台", remark: "原表淡旺季月份存在重叠，暂保留时段名称，待业务确认具体有效日期", prices: [
      { id: "attraction-price-9", itemType: "transport", itemName: "洗马潭索道", audience: "成人", periodName: "旺季", startDate: "", endDate: "", rackPrice: 335, settlementPrice: 320, isFree: false, priceNote: "原表：1-2月、4-10月为旺季", isGroundOperatorProvided: true, groundOperatorId: "supplier-1" },
      { id: "attraction-price-10", itemType: "transport", itemName: "洗马潭索道", audience: "成人", periodName: "淡季", startDate: "", endDate: "", rackPrice: 335, settlementPrice: 260, isFree: false, priceNote: "原表：3月、10月、12月为淡季", isGroundOperatorProvided: false, groundOperatorId: "" },
    ],
  },
  {
    id: "attraction-4", code: "ATT-004", name: "石林风景区", area: "石林", category: "scenic", status: "enabled",
    restroomLocation: "售票处", remark: "", prices: [
      { id: "attraction-price-11", itemType: "ticket", itemName: "景区门票", audience: "成人", periodName: "常规期", startDate: "", endDate: "", rackPrice: 130, settlementPrice: 130, isFree: false, priceNote: "", isGroundOperatorProvided: false, groundOperatorId: "" },
      { id: "attraction-price-12", itemType: "transport", itemName: "观光车", audience: "通用", periodName: "常规期", startDate: "", endDate: "", rackPrice: 25, settlementPrice: 25, isFree: false, priceNote: "", isGroundOperatorProvided: false, groundOperatorId: "" },
    ],
  },
];

/** 旅游资源前端原型数据，按业务实体分开维护。 */
export const tourismResources: Record<TourismResourceType, TourismResourceRecord[]> = {
  supplier: [
    { id: "supplier-1", code: "SUP-001", name: "云南云途地接社", city: "昆明", contact: "李经理", phone: "13800000001", status: "enabled", remark: "云南线路综合地接社" },
  ],
  hotel: [
    { id: "hotel-1", code: "HTL-001", name: "昆明翠湖酒店", city: "昆明", starRating: "五星", roomTypes: "豪华双床房、家庭房", contact: "王经理", phone: "13800000002", status: "enabled", remark: "市中心酒店" },
  ],
  restaurant: [
    { id: "restaurant-1", code: "RES-001", name: "滇味人家", city: "昆明", cuisine: "云南菜", mealStandard: "10 人/桌", contact: "张经理", phone: "13800000003", status: "enabled", remark: "团队餐" },
  ],
  attraction: [
    { id: "attraction-1", code: "ATT-001", name: "石林风景区", city: "昆明", ticketPrice: 130, visitDuration: "3 小时", openingHours: "08:00-18:00", contact: "票务中心", phone: "13800000004", status: "enabled", remark: "" },
  ],
  transport: [
    { id: "transport-1", code: "VEH-001", name: "别克 GL8", city: "昆明", plateNumber: "云A00001", seats: 7, contact: "赵师傅", phone: "13800000005", status: "enabled", remark: "商务车" },
  ],
  guide: [
    { id: "guide-1", code: "GDE-001", name: "刘晓燕", city: "昆明", languages: "中文、英文", certificateNo: "YN-GDE-001", contact: "刘晓燕", phone: "13800000006", status: "enabled", remark: "云南线路" },
  ],
};
