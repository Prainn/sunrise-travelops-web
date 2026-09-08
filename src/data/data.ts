import type { PrototypeUserRecord } from "@/types/user";
import type { VisitOverviewDetail, VisitTrendDetail } from "@/types/dashboard";

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
    roles: ["INQUIRY_COORDINATOR"],
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
    roles: ["INQUIRY_COORDINATOR"],
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
    roles: ["INQUIRY_COORDINATOR"],
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
