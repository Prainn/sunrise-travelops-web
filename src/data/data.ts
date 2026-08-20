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
  id: string;
  code: string;
  name: string;
  city: string;
  contact: string;
  phone: string;
  status: "enabled" | "disabled";
  remark: string;
}

/** 旅游资源前端原型数据，按业务实体分开维护。 */
export const tourismResources: Record<TourismResourceType, TourismResourceRecord[]> = {
  supplier: [
    { id: "supplier-1", code: "SUP-001", name: "云南云途地接社", city: "昆明", contact: "李经理", phone: "13800000001", status: "enabled", remark: "云南线路综合供应商" },
  ],
  hotel: [
    { id: "hotel-1", code: "HTL-001", name: "昆明翠湖酒店", city: "昆明", contact: "王经理", phone: "13800000002", status: "enabled", remark: "含豪华双床房、家庭房" },
  ],
  restaurant: [
    { id: "restaurant-1", code: "RES-001", name: "滇味人家", city: "昆明", contact: "张经理", phone: "13800000003", status: "enabled", remark: "云南菜，团队餐" },
  ],
  attraction: [
    { id: "attraction-1", code: "ATT-001", name: "石林风景区", city: "昆明", contact: "票务中心", phone: "13800000004", status: "enabled", remark: "建议游览 3 小时" },
  ],
  transport: [
    { id: "transport-1", code: "VEH-001", name: "别克 GL8 / 云A00001", city: "昆明", contact: "赵师傅", phone: "13800000005", status: "enabled", remark: "7 座商务车" },
  ],
  guide: [
    { id: "guide-1", code: "GDE-001", name: "刘晓燕", city: "昆明", contact: "刘晓燕", phone: "13800000006", status: "enabled", remark: "中文、英文导游" },
  ],
};
